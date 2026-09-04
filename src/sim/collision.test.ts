import { describe, expect, it } from "vitest";
import {
  createCollisionWorld,
  moveCapsule,
  raycastCylinder,
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

  // --- AP5-01: eine Achse löst nur auf, was ihre eigene Bewegung verursacht ---

  it("Rundungsrest nach dem Wand-Push: Druck gegen eine lange Wand schiebt nicht entlang der Wand (AP5-01)", () => {
    // Lange dünne Wand entlang Z, Innenfläche x = 1,8 — wie die Wände des
    // Verbindungsgrabens. 1,8 − 0,35 + 0,35 ist in Gleitkomma > 1,8: nach dem
    // X-Push „steckt" die Kapsel 2e-16 m in der Wand. Vorher löste die Z-Achse
    // diesen Rest an der nächsten Z-Fläche auf — Sprung auf z = 20,35.
    const wall = {
      center: { x: 2.0, y: 1, z: 0 },
      size: { x: 0.4, y: 2, z: 40 },
    };
    const w = world([floor, wall]);
    let pos = { x: 1.8 - RADIUS, y: 0, z: 3 };
    let vel = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < 60; i += 1) {
      vel = { x: 4.5, y: vel.y, z: 0 };
      const r = moveCapsule(w, pos, vel, RADIUS, HEIGHT, DT);
      expect(r.pos.z).toBe(3);
      expect(r.pos.y).toBeCloseTo(0, 5); // und nicht auf die Wandkrone gehoben
      pos = r.pos;
      vel = r.vel;
    }
    expect(pos.x).toBeLessThanOrEqual(1.8 - RADIUS + 1e-9);
  });

  it("eine seitliche (fremde) Durchdringung wird nicht entlang der bewegten Achse gelöst", () => {
    // Die Kapsel steckt seitlich in einer 40 m langen Wand — das hat die
    // Z-Bewegung nicht verursacht. Die Z-Achse darf sie darum nicht an das
    // Wandende setzen; die Verschiebung bleibt beim eigenen Tick-Weg.
    const wall = {
      center: { x: 0, y: 1, z: 0 },
      size: { x: 0.4, y: 2, z: 40 },
    };
    const w = world([floor, wall]);
    const start = { x: 0, y: 0, z: 3 };
    const r = moveCapsule(w, start, { x: 0, y: 0, z: 4 }, RADIUS, HEIGHT, DT);
    expect(
      Math.hypot(r.pos.x - start.x, r.pos.z - start.z),
    ).toBeLessThanOrEqual(4 * DT + 1e-9);
  });

  it("seitlicher Wandkontakt hebt die fallende Kapsel nicht auf die Wandkrone (Y löst nur Y)", () => {
    const wall = { center: { x: 0, y: 1, z: 0 }, size: { x: 0.4, y: 2, z: 4 } };
    const w = world([floor, wall]);
    let pos = { x: 0, y: 0.5, z: 0 };
    let vel = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < 60; i += 1) {
      const r = moveCapsule(w, pos, vel, RADIUS, HEIGHT, DT);
      expect(r.pos.y - pos.y).toBeLessThanOrEqual(STEP_HEIGHT); // kein Sprung auf y = 2
      pos = r.pos;
      vel = r.vel;
    }
    expect(pos.y).toBeLessThan(1);
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

describe("raycastCylinder", () => {
  const feet = { x: 0, y: 0, z: 5 };

  it("trifft einen Zylinder auf Augenhöhe und liefert die Eintrittsdistanz", () => {
    const t = raycastCylinder(
      { x: 0, y: 1.6, z: 0 },
      { x: 0, y: 0, z: 1 },
      feet,
      0.4,
      1.8,
      100,
    );
    expect(t).toBeCloseTo(4.6, 5); // 5 - Radius 0.4
  });

  it("verfehlt seitlich vorbei", () => {
    const t = raycastCylinder(
      { x: 3, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
      feet,
      0.4,
      1.8,
      100,
    );
    expect(t).toBeUndefined();
  });

  it("verfehlt über den Kopf hinweg", () => {
    const t = raycastCylinder(
      { x: 0, y: 3, z: 0 },
      { x: 0, y: 0, z: 1 },
      feet,
      0.4,
      1.8,
      100,
    );
    expect(t).toBeUndefined();
  });

  it("respektiert die maximale Distanz", () => {
    const t = raycastCylinder(
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
      feet,
      0.4,
      1.8,
      3,
    );
    expect(t).toBeUndefined();
  });

  it("senkrechter Strahl: Treffer nur, wenn er innerhalb der Säule startet", () => {
    // Ursprung horizontal in der Säule und auf Körperhöhe -> Treffer bei t = 0.
    const drin = raycastCylinder(
      { x: 0.1, y: 1, z: 5 },
      { x: 0, y: -1, z: 0 },
      feet,
      0.4,
      1.8,
      100,
    );
    expect(drin).toBe(0);
    // horizontal daneben -> kein Treffer.
    const daneben = raycastCylinder(
      { x: 2, y: 1, z: 5 },
      { x: 0, y: -1, z: 0 },
      feet,
      0.4,
      1.8,
      100,
    );
    expect(daneben).toBeUndefined();
    // in der Säule, aber über dem Kopf -> kein Treffer (keine Deckflächen).
    const drueber = raycastCylinder(
      { x: 0.1, y: 5, z: 5 },
      { x: 0, y: -1, z: 0 },
      feet,
      0.4,
      1.8,
      100,
    );
    expect(drueber).toBeUndefined();
  });

  it("trifft von innen die Rückwand (tExit)", () => {
    const t = raycastCylinder(
      { x: 0, y: 1, z: 5 }, // im Zylinder
      { x: 0, y: 0, z: 1 },
      feet,
      0.4,
      1.8,
      100,
    );
    expect(t).toBeCloseTo(0.4, 5);
  });
});
