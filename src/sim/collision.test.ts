import { describe, expect, it } from "vitest";
import {
  createCollisionWorld,
  moveCapsule,
  STEP_HEIGHT,
  type LevelData,
} from "./collision";

const RADIUS = 0.35;
const HEIGHT = 1.8;
const DT = 1 / 60;

function world(boxes: LevelData["boxes"]) {
  return createCollisionWorld({ boxes, spawnPoints: [] });
}

// Ein Boden mit Oberkante y = 0, x/z jeweils -10..10.
const floor = { center: { x: 0, y: -0.5, z: 0 }, size: { x: 20, y: 1, z: 20 } };

describe("moveCapsule", () => {
  it("applies gravity and lands on top of a box", () => {
    const w = world([floor]);
    let pos = { x: 0, y: 3, z: 0 };
    let vel = { x: 0, y: 0, z: 0 };
    let onGround = false;

    for (let i = 0; i < 120; i += 1) {
      const r = moveCapsule(w, pos, vel, RADIUS, HEIGHT, DT);
      pos = r.pos;
      vel = r.vel;
      onGround = r.onGround;
    }

    expect(pos.y).toBeCloseTo(0, 5);
    expect(onGround).toBe(true);
    expect(vel.y).toBe(0);
  });

  it("does not let the capsule pass through a wall", () => {
    const wall = {
      center: { x: 0, y: 1, z: 3 },
      size: { x: 10, y: 2, z: 1 },
    };
    const w = world([floor, wall]);
    let pos = { x: 0, y: 0, z: 0 };
    let vel = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < 180; i += 1) {
      vel = { x: 0, y: vel.y, z: 6 }; // konstant nach +z drücken
      const r = moveCapsule(w, pos, vel, RADIUS, HEIGHT, DT);
      pos = r.pos;
      vel = r.vel;
    }

    expect(pos.z).toBeLessThan(2.5 - RADIUS + 0.01); // vor der Wand (minZ = 2.5)
    expect(pos.z).toBeGreaterThan(2.0);
  });

  it("steps up a ledge no taller than STEP_HEIGHT", () => {
    const ledgeTop = STEP_HEIGHT - 0.05;
    const ledge = {
      center: { x: 0, y: ledgeTop - 0.5, z: 12 }, // size.y = 1 => Oberkante = ledgeTop
      size: { x: 10, y: 1, z: 20 }, // z 2..22, breit genug für den Lauf
    };
    const w = world([floor, ledge]);
    let pos = { x: 0, y: 0, z: 0 };
    let vel = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < 120; i += 1) {
      vel = { x: 0, y: vel.y, z: 4 };
      const r = moveCapsule(w, pos, vel, RADIUS, HEIGHT, DT);
      pos = r.pos;
      vel = r.vel;
    }

    expect(pos.z).toBeGreaterThan(3.5); // hat die Kante überwunden
    expect(pos.y).toBeCloseTo(ledgeTop, 2); // steht oben auf der Kante
  });

  it("is blocked by a wall taller than STEP_HEIGHT", () => {
    const highStep = {
      center: { x: 0, y: 0.5, z: 3 }, // Oberkante y = 1.5
      size: { x: 10, y: 3, z: 2 },
    };
    const w = world([floor, highStep]);
    let pos = { x: 0, y: 0, z: 0 };
    let vel = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < 120; i += 1) {
      vel = { x: 0, y: vel.y, z: 4 };
      const r = moveCapsule(w, pos, vel, RADIUS, HEIGHT, DT);
      pos = r.pos;
      vel = r.vel;
    }

    expect(pos.z).toBeLessThan(2); // vor der hohen Stufe (minZ = 2)
    expect(pos.y).toBeCloseTo(0, 2); // nicht hochgeklettert
  });

  it("stops upward motion at a ceiling", () => {
    const ceiling = {
      center: { x: 0, y: 4, z: 0 },
      size: { x: 10, y: 1, z: 10 }, // Unterkante y = 3.5
    };
    const w = world([floor, ceiling]);
    // Aus dem Stand (Kopf bei 2.8, klar unter der Decke) kräftig nach oben.
    const r = moveCapsule(
      w,
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 60, z: 0 },
      RADIUS,
      HEIGHT,
      DT,
    );

    expect(r.pos.y).toBeCloseTo(3.5 - HEIGHT, 5);
    expect(r.vel.y).toBe(0);
  });

  it("does not mutate the inputs", () => {
    const w = world([floor]);
    const pos = { x: 0, y: 3, z: 0 };
    const vel = { x: 1, y: 0, z: 0 };
    moveCapsule(w, pos, vel, RADIUS, HEIGHT, DT);
    expect(pos).toEqual({ x: 0, y: 3, z: 0 });
    expect(vel).toEqual({ x: 1, y: 0, z: 0 });
  });
});
