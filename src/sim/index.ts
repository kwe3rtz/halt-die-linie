import type { Vec3 } from "./math";
import { createRng } from "./rng";
import {
  createCollisionWorld,
  moveCapsule,
  type CollisionWorld,
  type LevelData,
} from "./collision";

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
  };
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
  };
}

export interface Sim {
  tick: (cmd: InputCommand, dt: number) => void;
  getState: () => Readonly<SimState>;
}

// First-Person-Controller — Platzhalterwerte, Balancing kommt später.
const PLAYER_RADIUS = 0.35;
const PLAYER_HEIGHT = 1.8;
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

export function createSim(seed: number, level: LevelData = EMPTY_LEVEL): Sim {
  const world: CollisionWorld = createCollisionWorld(level);
  const spawn = pickSpawn(level, seed);

  let tickCount = 0;
  const player: SimState["player"] = {
    pos: { x: spawn.x, y: spawn.y, z: spawn.z },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    onGround: false,
  };

  const step = (cmd: InputCommand, dt: number): void => {
    tickCount += 1;

    // Blickrichtung aus dem Maus-Delta.
    player.yaw += cmd.look.dx * LOOK_SENSITIVITY;
    player.pitch = clamp(
      player.pitch - cmd.look.dy * LOOK_SENSITIVITY,
      -PITCH_LIMIT,
      PITCH_LIMIT,
    );

    // Gewünschte horizontale Geschwindigkeit relativ zu yaw.
    const sinY = Math.sin(player.yaw);
    const cosY = Math.cos(player.yaw);
    let wishX = cosY * cmd.move.x + sinY * cmd.move.y;
    let wishZ = -sinY * cmd.move.x + cosY * cmd.move.y;
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 1) {
      wishX /= wishLen;
      wishZ /= wishLen;
    }
    const speed = cmd.buttons.sprint ? SPRINT_SPEED : WALK_SPEED;
    player.vel.x = wishX * speed;
    player.vel.z = wishZ * speed;

    if (player.onGround && cmd.buttons.jump) {
      player.vel.y = JUMP_SPEED;
    }

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
      }),
    });

  return {
    tick: step,
    getState: snapshot,
  };
}
