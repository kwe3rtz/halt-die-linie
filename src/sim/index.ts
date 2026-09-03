import type { Vec3 } from "./math";
import { dirFromYawPitch } from "./math";
import { createRng } from "./rng";
import {
  createCollisionWorld,
  moveCapsule,
  type CollisionWorld,
  type LevelData,
} from "./collision";
import { standardWaffe } from "../data/waffen";
import type { WeaponDef } from "../data/schema";
import {
  advanceWeapon,
  createWeaponState,
  fire,
  reload,
  type WeaponState,
} from "./weapon";
import {
  advancePlayerCombat,
  applyDamage,
  createPlayerCombat,
  respawnCombat,
  type PlayerCombat,
} from "./player";

export type { Vec3 } from "./math";
export type { LevelBox, LevelData, CollisionWorld, Aabb } from "./collision";

export interface SimState {
  tick: number;
  player: {
    /** Fußpunkt des Spielers in Weltkoordinaten. */
    pos: Vec3;
    vel: Vec3;
    /** Drehung um die Y-Achse, Radiant. 0 = Blick nach +Z. */
    yaw: number;
    /** Auf-/Ab-Blick, Radiant. Positiv = nach oben, geklemmt auf ±~89°. */
    pitch: number;
    onGround: boolean;
    hp: number;
    maxHp: number;
    tot: boolean;
    /** Waffenzustand für HUD/Render. */
    weapon: {
      defId: string;
      imLauf: number;
      reserve: number;
      reloading: boolean;
    };
  };
  /** Letzter abgegebener Schuss (Signal für Tracer/Mündungsblitz). */
  lastShot: ShotEvent | null;
}

export interface ShotEvent {
  tick: number;
  /** Mündung / Augpunkt. */
  von: Vec3;
  /** Trefferpunkt bzw. Punkt in maximaler Reichweite. */
  nach: Vec3;
  treffer: boolean;
}

/**
 * Kommando-Objekt, das der Sim pro Tick übergeben wird. Reines, JSON-fähiges
 * Objekt (siehe goldene Regel / `src/input`).
 */
export interface InputCommand {
  /** Lokale Bewegungsachsen, jeweils -1..1. `y` = vorwärts, `x` = rechts. */
  move: { x: number; y: number };
  /** Maus-Delta seit dem letzten `poll()` (Pixel). */
  look: { dx: number; dy: number };
  buttons: {
    fire: boolean;
    aim: boolean;
    sprint: boolean;
    interact: boolean;
    ability: boolean;
    jump: boolean;
    reload: boolean;
  };
}

export interface Sim {
  tick: (cmd: InputCommand, dt: number) => void;
  getState: () => Readonly<SimState>;
  /**
   * Fügt dem Spieler Schaden zu. Externer/Test-Eingang; ab AP2-03 rufen die
   * Gegner intern `applyDamage` auf dem Kampfzustand auf.
   */
  applyDamage: (menge: number, quelle?: string) => void;
}

// First-Person-Controller — Platzhalterwerte, Balancing kommt später.
const PLAYER_RADIUS = 0.35;
const PLAYER_HEIGHT = 1.8;
const PLAYER_EYE = 1.6;
const WALK_SPEED = 4.5;
const SPRINT_SPEED = 7.0;
const JUMP_SPEED = 7.2;
const LOOK_SENSITIVITY = 0.0022; // Radiant pro Maus-Pixel
const PITCH_LIMIT = (89 * Math.PI) / 180;
const FALL_LIMIT = -40; // darunter: zurück zum Spawn

const EMPTY_LEVEL: LevelData = { boxes: [], spawnPoints: [] };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickSpawn(level: LevelData, seed: number): Vec3 {
  const points = level.spawnPoints;
  if (points.length === 0) {
    return { x: 0, y: 2, z: 0 };
  }
  const rng = createRng(seed);
  const chosen = points[rng.int(0, points.length - 1)] ?? points[0];
  if (!chosen) {
    return { x: 0, y: 2, z: 0 };
  }
  return { x: chosen.x, y: chosen.y, z: chosen.z };
}

export interface SimOptions {
  /** Startwaffe des Spielers. Default: `standardWaffe` aus `src/data`. */
  weapon?: WeaponDef;
}

export function createSim(
  seed: number,
  level: LevelData = EMPTY_LEVEL,
  options: SimOptions = {},
): Sim {
  const world: CollisionWorld = createCollisionWorld(level);
  const spawn = pickSpawn(level, seed);
  const weaponDef = options.weapon ?? standardWaffe;

  let tickCount = 0;
  let firePrev = false;
  let lastShot: Readonly<ShotEvent> | null = null;
  const weapon: WeaponState = createWeaponState(weaponDef);
  const combat: PlayerCombat = createPlayerCombat();

  const player = {
    pos: { x: spawn.x, y: spawn.y, z: spawn.z },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    onGround: false,
  };

  const resetWeapon = (): void => {
    weapon.imLauf = weaponDef.magazin;
    weapon.reserve = weaponDef.reserve;
    weapon.cooldown = 0;
    weapon.reloadRest = 0;
    weapon.reloading = false;
  };

  const respawnPlayer = (): void => {
    player.pos = { x: spawn.x, y: spawn.y, z: spawn.z };
    player.vel = { x: 0, y: 0, z: 0 };
    player.yaw = 0;
    player.pitch = 0;
    resetWeapon();
    respawnCombat(combat);
  };

  const step = (cmd: InputCommand, dt: number): void => {
    tickCount += 1;
    const alive = !combat.tot;

    if (alive) {
      // Blickrichtung aus dem Maus-Delta.
      player.yaw += cmd.look.dx * LOOK_SENSITIVITY;
      player.pitch = clamp(
        player.pitch - cmd.look.dy * LOOK_SENSITIVITY,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      );
    }

    // Gewünschte horizontale Geschwindigkeit relativ zu yaw (0 im Tod).
    let wishX = 0;
    let wishZ = 0;
    if (alive) {
      const sinY = Math.sin(player.yaw);
      const cosY = Math.cos(player.yaw);
      wishX = cosY * cmd.move.x + sinY * cmd.move.y;
      wishZ = -sinY * cmd.move.x + cosY * cmd.move.y;
      const wishLen = Math.hypot(wishX, wishZ);
      if (wishLen > 1) {
        wishX /= wishLen;
        wishZ /= wishLen;
      }
      if (player.onGround && cmd.buttons.jump) {
        player.vel.y = JUMP_SPEED;
      }
    }
    const speed = cmd.buttons.sprint ? SPRINT_SPEED : WALK_SPEED;
    player.vel.x = wishX * speed;
    player.vel.z = wishZ * speed;

    // Integration + Kollision laufen immer (Schwerkraft gilt auch für die Leiche).
    const moved = moveCapsule(
      world,
      player.pos,
      player.vel,
      PLAYER_RADIUS,
      PLAYER_HEIGHT,
      dt,
    );
    player.pos = moved.pos;
    player.vel = moved.vel;
    player.onGround = moved.onGround;

    if (player.pos.y < FALL_LIMIT) {
      player.pos = { x: spawn.x, y: spawn.y, z: spawn.z };
      player.vel = { x: 0, y: 0, z: 0 };
    }

    // Waffen-Timer laufen immer; Nachladen/Feuern nur lebendig.
    advanceWeapon(weapon, weaponDef, dt);
    if (alive) {
      if (cmd.buttons.reload) {
        reload(weapon, weaponDef);
      }
      const flanke = cmd.buttons.fire && !firePrev;
      const eye: Vec3 = {
        x: player.pos.x,
        y: player.pos.y + PLAYER_EYE,
        z: player.pos.z,
      };
      const dir = dirFromYawPitch(player.yaw, player.pitch);
      const shot = fire(weapon, world, eye, dir, weaponDef, {
        gedrueckt: cmd.buttons.fire,
        flanke,
      });
      if (shot.schuss) {
        const reichweite = weaponDef.handling.reichweiteMax;
        const nach: Vec3 = shot.treffer
          ? shot.treffer.punkt
          : {
              x: eye.x + dir.x * reichweite,
              y: eye.y + dir.y * reichweite,
              z: eye.z + dir.z * reichweite,
            };
        lastShot = Object.freeze({
          tick: tickCount,
          von: Object.freeze({ ...eye }),
          nach: Object.freeze(nach),
          treffer: shot.treffer !== undefined,
        });
      }
    }
    // Flanke nie über den Tod hinweg aufstauen.
    firePrev = cmd.buttons.fire;

    // Tod / Respawn.
    if (advancePlayerCombat(combat, dt)) {
      respawnPlayer();
    }
  };

  const snapshot = (): Readonly<SimState> =>
    Object.freeze({
      tick: tickCount,
      player: Object.freeze({
        pos: Object.freeze({ ...player.pos }),
        vel: Object.freeze({ ...player.vel }),
        yaw: player.yaw,
        pitch: player.pitch,
        onGround: player.onGround,
        hp: combat.hp,
        maxHp: combat.maxHp,
        tot: combat.tot,
        weapon: Object.freeze({
          defId: weapon.defId,
          imLauf: weapon.imLauf,
          reserve: weapon.reserve,
          reloading: weapon.reloading,
        }),
      }),
      lastShot,
    });

  return {
    tick: step,
    getState: snapshot,
    applyDamage: (menge, quelle) => applyDamage(combat, menge, quelle),
  };
}
