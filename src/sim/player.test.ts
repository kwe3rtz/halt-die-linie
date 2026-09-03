import { describe, expect, it } from "vitest";
import { createSim, type InputCommand, type LevelData } from "./index";
import {
  advancePlayerCombat,
  applyDamage,
  createPlayerCombat,
  DEFAULT_MAX_HP,
  RESPAWN_DELAY,
  respawnCombat,
} from "./player";

const DT = 1 / 60;

const flatWorld: LevelData = {
  boxes: [{ center: { x: 0, y: -0.5, z: 0 }, size: { x: 60, y: 1, z: 60 } }],
  spawnPoints: [{ x: 0, y: 1, z: 0 }],
};

function command(
  parts: Partial<InputCommand["buttons"]> & {
    move?: { x: number; y: number };
  } = {},
): InputCommand {
  const { move, ...buttons } = parts;
  return {
    move: move ?? { x: 0, y: 0 },
    look: { dx: 0, dy: 0 },
    buttons: {
      fire: false,
      aim: false,
      sprint: false,
      interact: false,
      ability: false,
      jump: false,
      reload: false,
      ...buttons,
    },
  };
}

describe("player combat — pure helpers", () => {
  it("reduziert HP und tötet bei <= 0", () => {
    const c = createPlayerCombat();
    applyDamage(c, 30);
    expect(c.hp).toBe(70);
    expect(c.tot).toBe(false);

    applyDamage(c, 100, "nahkampf");
    expect(c.hp).toBe(0);
    expect(c.tot).toBe(true);
    expect(c.respawnRest).toBe(RESPAWN_DELAY);
  });

  it("ignoriert Schaden im Tod und nicht-positive Mengen", () => {
    const c = createPlayerCombat();
    applyDamage(c, 0);
    applyDamage(c, -5);
    expect(c.hp).toBe(DEFAULT_MAX_HP);

    applyDamage(c, 999);
    expect(c.tot).toBe(true);
    applyDamage(c, 50);
    expect(c.hp).toBe(0);
  });

  it("advancePlayerCombat zählt nur im Tod und meldet den Respawn-Tick", () => {
    const c = createPlayerCombat();
    expect(advancePlayerCombat(c, 10)).toBe(false); // lebendig -> nie

    applyDamage(c, 999);
    let fired = false;
    for (let i = 0; i < 10000 && !fired; i += 1) {
      fired = advancePlayerCombat(c, DT);
    }
    expect(fired).toBe(true);
    expect(c.respawnRest).toBe(0);
  });

  it("respawnCombat stellt vollen Zustand her", () => {
    const c = createPlayerCombat();
    applyDamage(c, 999);
    respawnCombat(c);
    expect(c).toEqual({
      hp: DEFAULT_MAX_HP,
      maxHp: DEFAULT_MAX_HP,
      tot: false,
      respawnRest: 0,
    });
  });
});

describe("player combat — über die Sim", () => {
  it("Schaden ist im Sim-State sichtbar, Spieler bleibt lebendig und beweglich", () => {
    const sim = createSim(1, flatWorld);
    for (let i = 0; i < 10; i += 1) sim.tick(command(), DT);
    const zVor = sim.getState().player.pos.z;

    sim.applyDamage(40);
    expect(sim.getState().player.hp).toBe(60);
    expect(sim.getState().player.tot).toBe(false);

    for (let i = 0; i < 30; i += 1)
      sim.tick(command({ move: { x: 0, y: 1 } }), DT);
    expect(sim.getState().player.pos.z).toBeGreaterThan(zVor + 0.5);
  });

  it("im Tod: keine Bewegung, kein Feuern; danach voller Respawn am Spawn", () => {
    const sim = createSim(1, flatWorld);
    for (let i = 0; i < 10; i += 1) sim.tick(command(), DT);

    // ein paar Schuss abgeben, dann sterben
    sim.tick(command({ fire: true }), DT);
    for (let i = 0; i < 80; i += 1) sim.tick(command(), DT);
    const ammoNachSchuss = sim.getState().player.weapon.imLauf;
    expect(ammoNachSchuss).toBeLessThan(5);

    sim.applyDamage(999);
    expect(sim.getState().player.tot).toBe(true);
    const posTot = { ...sim.getState().player.pos };
    const shotVorTod = sim.getState().lastShot?.tick ?? 0;

    // Bewegungs- und Feuerbefehle im Tod: wirkungslos
    for (let i = 0; i < 60; i += 1) {
      sim.tick(command({ move: { x: 1, y: 1 }, fire: true }), DT);
    }
    const s = sim.getState();
    expect(s.player.pos.x).toBeCloseTo(posTot.x, 4);
    expect(s.player.pos.z).toBeCloseTo(posTot.z, 4);
    expect(s.lastShot?.tick ?? 0).toBe(shotVorTod);
    expect(s.player.weapon.imLauf).toBe(ammoNachSchuss);

    // Respawn nach RESPAWN_DELAY
    const bisRespawn = Math.ceil(RESPAWN_DELAY / DT) + 5;
    for (let i = 0; i < bisRespawn; i += 1) sim.tick(command(), DT);
    const r = sim.getState().player;
    expect(r.tot).toBe(false);
    expect(r.hp).toBe(r.maxHp);
    expect(r.pos.x).toBeCloseTo(0, 4);
    expect(r.pos.z).toBeCloseTo(0, 4);
    expect(r.weapon.imLauf).toBe(5);
    expect(r.weapon.reserve).toBe(45);
  });
});
