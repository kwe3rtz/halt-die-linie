import { describe, expect, it, vi } from "vitest";
import { createCollisionWorld, type CollisionWorld } from "./collision";
import {
  damageEnemy,
  NAHKAMPF_REICHWEITE,
  spawnEnemy,
  updateEnemies,
  type EnemyEntity,
} from "./enemies";
import { linieninfanterie } from "../data/gegner";

const DT = 1 / 60;

const world: CollisionWorld = createCollisionWorld({
  boxes: [{ center: { x: 0, y: -0.5, z: 0 }, size: { x: 200, y: 1, z: 200 } }],
  spawnPoints: [],
});

function enemyAt(x: number, z: number, id = 1): EnemyEntity {
  return spawnEnemy(linieninfanterie, id, { x, y: 0, z });
}

const player = { x: 0, y: 0, z: 0 };

describe("enemies — helpers", () => {
  it("spawnEnemy setzt Startwerte aus dem Def", () => {
    const e = enemyAt(5, 5);
    expect(e.hp).toBe(linieninfanterie.hp);
    expect(e.maxHp).toBe(linieninfanterie.hp);
    expect(e.zustand).toBe("anmarsch");
    expect(e.def).toBe(linieninfanterie);
  });

  it("damageEnemy reduziert HP, meldet den tödlichen Treffer", () => {
    const e = enemyAt(5, 5);
    expect(damageEnemy(e, 40, 10)).toBe(false);
    expect(e.hp).toBe(60);
    expect(e.letzterTreffer).toBe(10);

    expect(damageEnemy(e, 999, 11)).toBe(true);
    expect(e.zustand).toBe("tot");
    expect(e.totRest).toBeGreaterThan(0);

    // im Tod / bei <= 0 keine Wirkung
    expect(damageEnemy(e, 50, 12)).toBe(false);
    expect(damageEnemy(enemyAt(1, 1), 0, 12)).toBe(false);
  });
});

describe("enemies — updateEnemies", () => {
  it("Anmarsch: läuft auf den Spieler zu", () => {
    const e = enemyAt(0, 20);
    let list = [e];
    for (let i = 0; i < 120; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    expect(list[0]?.pos.z).toBeLessThan(20);
    expect(list[0]?.pos.z).toBeGreaterThan(NAHKAMPF_REICHWEITE - 0.5);
    expect(Math.abs(list[0]?.pos.x ?? 99)).toBeLessThan(0.5);
  });

  it("bleibt nicht in einer Wand stecken (stoppt davor)", () => {
    const wallWorld = createCollisionWorld({
      boxes: [
        { center: { x: 0, y: -0.5, z: 0 }, size: { x: 200, y: 1, z: 200 } },
        { center: { x: 0, y: 1.5, z: 5 }, size: { x: 20, y: 3, z: 1 } },
      ],
      spawnPoints: [],
    });
    let list = [enemyAt(0, 15)];
    for (let i = 0; i < 300; i += 1) {
      list = updateEnemies(list, wallWorld, player, true, () => undefined, DT);
    }
    // Wand-minZ 4.5; Gegner steht davor, nicht drin/dahinter.
    expect(list[0]?.pos.z).toBeGreaterThan(4.5);
  });

  it("Angriff: fügt in Reichweite periodisch Schaden zu", () => {
    const hit = vi.fn();
    let list = [enemyAt(0, 1)]; // schon in Reichweite
    for (let i = 0; i < 300; i += 1) {
      list = updateEnemies(list, world, player, true, hit, DT);
    }
    expect(list[0]?.zustand).toBe("angriff");
    expect(hit).toHaveBeenCalledWith(linieninfanterie.schaden);
    // 300 Ticks = 5 s, Intervall 1.1 s -> mind. 4 Treffer
    expect(hit.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("kein Schaden, wenn der Spieler tot ist", () => {
    const hit = vi.fn();
    let list = [enemyAt(0, 1)];
    for (let i = 0; i < 200; i += 1) {
      list = updateEnemies(list, world, player, false, hit, DT);
    }
    expect(hit).not.toHaveBeenCalled();
  });

  it("Leiche verschwindet nach der Liegezeit", () => {
    const e = enemyAt(0, 3);
    damageEnemy(e, 999, 0);
    let list = [e];
    for (let i = 0; i < 200; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    expect(list.length).toBe(0);
  });

  it("Separation: zwei am selben Punkt gespawnte Gegner driften auseinander", () => {
    let list = [enemyAt(0, 20, 1), enemyAt(0, 20, 2)];
    const abstand0 = Math.hypot(
      (list[0]?.pos.x ?? 0) - (list[1]?.pos.x ?? 0),
      (list[0]?.pos.z ?? 0) - (list[1]?.pos.z ?? 0),
    );
    expect(abstand0).toBe(0);
    for (let i = 0; i < 60; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    const abstand1 = Math.hypot(
      (list[0]?.pos.x ?? 0) - (list[1]?.pos.x ?? 0),
      (list[0]?.pos.z ?? 0) - (list[1]?.pos.z ?? 0),
    );
    // mindestens grob auf Körperbreite auseinander, nicht mehr im selben Punkt
    expect(abstand1).toBeGreaterThan(2 * 0.35 * 0.8);
  });

  it("Separation: ein Gegner im Spieler wird auf Mindestabstand geschoben", () => {
    let list = [enemyAt(0, 0, 1)]; // exakt auf dem Spieler
    for (let i = 0; i < 30; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    const d = Math.hypot(list[0]?.pos.x ?? 0, list[0]?.pos.z ?? 0);
    // ENEMY_RADIUS + PLAYER_RADIUS = 0.7; nicht mehr im Spieler steckend
    expect(d).toBeGreaterThan(0.7 - 0.05);
    // Nahkampf-Reichweite: steht trotzdem noch nah genug zum Zuschlagen
    expect(d).toBeLessThan(NAHKAMPF_REICHWEITE);
    expect(list[0]?.zustand).toBe("angriff");
  });

  it("mehrere Gegner gleichzeitig", () => {
    let list = [enemyAt(-6, 12, 1), enemyAt(6, 12, 2), enemyAt(0, 14, 3)];
    for (let i = 0; i < 120; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    expect(list.length).toBe(3);
    for (const e of list) {
      expect(Math.hypot(e.pos.x, e.pos.z)).toBeLessThan(14);
    }
  });
});
