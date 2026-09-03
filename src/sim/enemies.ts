// Gegner-Simulation: Liste von Entitäten, Anmarsch auf den Spieler, Nahkampf.
// AP2: kein Fernkampf, keine Pfadfindung (gerader Weg), keine Gegner-Gegner-
// Kollision (Überlappen ist ok). Deterministisch, kein Babylon/Math.random.
import type { Vec3 } from "./math";
import { moveCapsule, type CollisionWorld } from "./collision";
import type { EnemyDef } from "../data/schema";

export type EnemyZustand = "anmarsch" | "angriff" | "tot";

export interface EnemyEntity {
  id: number;
  /** Fußpunkt in Weltkoordinaten. */
  pos: Vec3;
  vel: Vec3;
  hp: number;
  maxHp: number;
  def: EnemyDef;
  zustand: EnemyZustand;
  /** Sekunden bis zum nächsten Nahkampftreffer. */
  angriffCooldown: number;
  /** Sekunden, die die Leiche noch liegen bleibt. */
  totRest: number;
  /** Tick des letzten HP-Rückgangs (für den Render-Trefferblitz). */
  letzterTreffer: number;
}

export const ENEMY_RADIUS = 0.35;
export const ENEMY_HEIGHT = 1.8;
export const NAHKAMPF_REICHWEITE = 1.6;
export const NACHSCHUB_PRO_KILL = 5;

const BASIS_TEMPO = 2.6; // m/s bei EnemyDef.tempo = 1 (Platzhalter)
const ANGRIFF_INTERVALL = 1.1; // s zwischen Nahkampftreffern
const LEICHE_LIEGEZEIT = 1.4; // s

export function spawnEnemy(
  def: EnemyDef,
  id: number,
  pos: Vec3,
  hpFaktor = 1,
): EnemyEntity {
  const hp = Math.round(def.hp * hpFaktor);
  return {
    id,
    pos: { x: pos.x, y: pos.y, z: pos.z },
    vel: { x: 0, y: 0, z: 0 },
    hp,
    maxHp: hp,
    def,
    zustand: "anmarsch",
    angriffCooldown: 0,
    totRest: 0,
    letzterTreffer: -1,
  };
}

/**
 * Fügt einem Gegner Schaden zu. Liefert `true`, wenn dieser Treffer ihn tötet
 * (Aufrufer schreibt dann Nachschub gut). Mutiert `enemy`.
 */
export function damageEnemy(
  enemy: EnemyEntity,
  menge: number,
  tick: number,
): boolean {
  if (enemy.zustand === "tot" || menge <= 0) {
    return false;
  }
  enemy.hp = Math.max(0, enemy.hp - menge);
  enemy.letzterTreffer = tick;
  if (enemy.hp <= 0) {
    enemy.zustand = "tot";
    enemy.totRest = LEICHE_LIEGEZEIT;
    enemy.vel.x = 0;
    enemy.vel.z = 0;
    return true;
  }
  return false;
}

/**
 * Schreibt alle Gegner um `dt` fort (Anmarsch/Angriff/Leiche) und liefert die
 * überlebenden zurück (verwehte Leichen fallen raus). Mutiert die Entitäten.
 * `onHitPlayer` wird bei jedem Nahkampftreffer aufgerufen.
 */
export function updateEnemies(
  enemies: readonly EnemyEntity[],
  world: CollisionWorld,
  playerPos: Vec3,
  spielerLebt: boolean,
  onHitPlayer: (menge: number) => void,
  dt: number,
): EnemyEntity[] {
  const survivors: EnemyEntity[] = [];

  for (const e of enemies) {
    if (e.zustand === "tot") {
      e.totRest -= dt;
      e.vel.x = 0;
      e.vel.z = 0;
      const moved = moveCapsule(
        world,
        e.pos,
        e.vel,
        ENEMY_RADIUS,
        ENEMY_HEIGHT,
        dt,
      );
      e.pos = moved.pos;
      e.vel = moved.vel;
      if (e.totRest > 0) {
        survivors.push(e);
      }
      continue;
    }

    const dx = playerPos.x - e.pos.x;
    const dz = playerPos.z - e.pos.z;
    const dist = Math.hypot(dx, dz);

    if (e.angriffCooldown > 0) {
      e.angriffCooldown = Math.max(0, e.angriffCooldown - dt);
    }

    if (dist <= NAHKAMPF_REICHWEITE) {
      e.zustand = "angriff";
      e.vel.x = 0;
      e.vel.z = 0;
      if (e.angriffCooldown <= 0 && spielerLebt) {
        onHitPlayer(e.def.schaden);
        e.angriffCooldown = ANGRIFF_INTERVALL;
      }
    } else {
      e.zustand = "anmarsch";
      const speed = BASIS_TEMPO * e.def.tempo;
      if (dist > 1e-6) {
        e.vel.x = (dx / dist) * speed;
        e.vel.z = (dz / dist) * speed;
      } else {
        e.vel.x = 0;
        e.vel.z = 0;
      }
    }

    const moved = moveCapsule(
      world,
      e.pos,
      e.vel,
      ENEMY_RADIUS,
      ENEMY_HEIGHT,
      dt,
    );
    e.pos = moved.pos;
    e.vel = moved.vel;
    survivors.push(e);
  }

  return survivors;
}
