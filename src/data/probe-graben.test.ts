import { describe, expect, it } from "vitest";
import {
  createCollisionWorld,
  moveCapsule,
  STEP_HEIGHT,
  type CollisionWorld,
  type LevelBox,
} from "../sim/collision";
import type { Vec3 } from "../sim/math";
import {
  abstiegUnterstand,
  ABSTIEG_KOPFFREIHEIT,
  ABSTIEG_STUFEN,
  feuertrittTief,
  laufrost,
  sandsackKrone,
  verkleidung,
  BRUSTWEHR_OBERKANTE,
  FEUERTRITT_OBERKANTE,
  PARAPET_OBERKANTE,
  GRABEN_SOHLE,
  type WandSegment,
} from "./module";
import { probeGraben } from "./probe-graben";

const DT = 1 / 60;
const PLAYER_EYE = 1.6; // src/sim/index.ts (Platzhalter, nicht exportiert)
const R = 0.35;
const H = 1.8;

const oberkante = (b: LevelBox): number => b.center.y + b.size.y / 2;
const endlich = (b: LevelBox): boolean =>
  [b.center.x, b.center.y, b.center.z, b.size.x, b.size.y, b.size.z].every(
    Number.isFinite,
  ) &&
  b.size.x > 0 &&
  b.size.y > 0 &&
  b.size.z > 0;

/** Lässt eine Kapsel von `von` geradeaus nach `nach` laufen (X/Z). */
function laufe(
  world: CollisionWorld,
  von: Vec3,
  nach: { x: number; z: number },
  maxS = 25,
): { pos: Vec3; minY: number; ok: boolean } {
  let pos: Vec3 = { x: von.x, y: von.y, z: von.z };
  let vel: Vec3 = { x: 0, y: 0, z: 0 };
  let minY = pos.y;
  for (let t = 0; t < maxS / DT; t += 1) {
    const dx = nach.x - pos.x;
    const dz = nach.z - pos.z;
    const rest = Math.hypot(dx, dz);
    if (rest < 0.4) {
      return { pos, minY, ok: true };
    }
    vel = { x: (dx / rest) * 2.6, y: vel.y, z: (dz / rest) * 2.6 };
    const r = moveCapsule(world, pos, vel, R, H, DT);
    pos = r.pos;
    vel = r.vel;
    minY = Math.min(minY, pos.y);
  }
  return { pos, minY, ok: false };
}

/** Lässt eine Kapsel an Ort und Stelle fallen und liefert die Landehöhe. */
function falle(world: CollisionWorld, x: number, y: number, z: number): number {
  let pos: Vec3 = { x, y, z };
  let vel: Vec3 = { x: 0, y: 0, z: 0 };
  for (let t = 0; t < 4 / DT; t += 1) {
    const r = moveCapsule(world, pos, vel, R, H, DT);
    pos = r.pos;
    vel = r.vel;
  }
  return pos.y;
}

const seg = (
  a: { x: number; z: number },
  b: { x: number; z: number },
  krone: number,
  normale: { x: number; z: number },
): WandSegment => ({ a, b, sohle: GRABEN_SOHLE, krone, normale });

describe("Graben-Look-Baukasten (AP6-01c)", () => {
  it("verkleidung / sandsackKrone / laufrost liefern endliche Boxen mit Material", () => {
    const s = seg({ x: -5, z: 2 }, { x: 5, z: 2 }, BRUSTWEHR_OBERKANTE, {
      x: 0,
      z: -1,
    });
    const boxes = [
      ...verkleidung(s, { vonY: FEUERTRITT_OBERKANTE }),
      ...sandsackKrone(s, { oberkante: PARAPET_OBERKANTE }),
      ...laufrost({
        minX: -5,
        maxX: 5,
        minZ: -2,
        maxZ: 0,
        sohle: GRABEN_SOHLE,
      }),
    ];
    expect(boxes.length).toBeGreaterThan(6);
    expect(boxes.every(endlich)).toBe(true);
    expect(boxes.every((b) => b.oberflaeche !== undefined)).toBe(true);
    // Sandsack-Krone endet auf PARAPET_OBERKANTE.
    const saecke = boxes.filter((b) => b.oberflaeche === "sandsack");
    expect(saecke.length).toBeGreaterThan(3);
    for (const b of saecke) {
      expect(oberkante(b)).toBeCloseTo(PARAPET_OBERKANTE, 5);
    }
  });

  it("feuertrittTief: vier Stufen, jeder Anstieg < STEP_HEIGHT, Auge auf der Bank ≈ Kronenhöhe", () => {
    const stufen = feuertrittTief({
      minX: -4,
      maxX: 4,
      zToe: 0.6,
      zWand: 2.6,
    });
    expect(stufen.length).toBe(4);
    const tops = stufen.map(oberkante).sort((a, b) => a - b);
    const kette = [GRABEN_SOHLE, ...tops];
    for (let i = 1; i < kette.length; i += 1) {
      expect(kette[i]! - kette[i - 1]!).toBeLessThanOrEqual(STEP_HEIGHT + 1e-9);
    }
    // Bank = oberste Stufe.
    const bank = tops.at(-1)!;
    expect(bank).toBeCloseTo(FEUERTRITT_OBERKANTE, 5);
    expect(Math.abs(bank + PLAYER_EYE - PARAPET_OBERKANTE)).toBeLessThanOrEqual(
      0.15,
    );
  });

  it("abstiegUnterstand: geschlossene Kiste, 12 Treppenstufen < STEP_HEIGHT, 2,3 m Kopffreiheit", () => {
    const boxes = abstiegUnterstand({
      schacht: { x: 0, z: -9 },
      richtungZ: -1,
    });
    expect(boxes.every(endlich)).toBe(true);
    // Treppenstufen = holz-Boxen unterhalb der Grabensohle, ihre Oberkanten.
    const treppe = boxes
      .filter(
        (b) => b.oberflaeche === "holz" && oberkante(b) < GRABEN_SOHLE - 0.05,
      )
      .map(oberkante)
      .sort((a, b) => b - a);
    expect(treppe.length).toBe(ABSTIEG_STUFEN); // AP6-01d: 8 → 12 (flacher)
    const kette = [GRABEN_SOHLE, ...treppe];
    for (let i = 1; i < kette.length; i += 1) {
      expect(kette[i - 1]! - kette[i]!).toBeLessThanOrEqual(STEP_HEIGHT + 1e-9);
    }
    // Anstieg je Stufe ≤ ~0,22 m (Spieltest-Korrektur 3: „flacher").
    for (let i = 1; i < kette.length; i += 1) {
      expect(kette[i - 1]! - kette[i]!).toBeLessThanOrEqual(0.22);
    }
    // Raumboden (laufrost) → Deckenunterkante = lichte Höhe ~2,3 m.
    const boden = boxes.find((b) => b.oberflaeche === "laufrost")!;
    const decke = boxes
      .filter((b) => b.oberflaeche === "holz" && b.center.y > -4.2)
      .reduce((min, b) => Math.min(min, b.center.y - b.size.y / 2), Infinity);
    expect(decke - oberkante(boden)).toBeCloseTo(ABSTIEG_KOPFFREIHEIT, 5);
    expect(decke - oberkante(boden)).toBeGreaterThanOrEqual(2.25);
  });
});

describe("Probe-Szene — Geometrie & Begehbarkeit (AP6-01c)", () => {
  const world = createCollisionWorld(probeGraben);

  it("nur eine schlichte LevelData — kein SektorMeta", () => {
    expect("meta" in probeGraben).toBe(false);
    expect(probeGraben.boxes.every(endlich)).toBe(true);
  });

  it("Spieler-Spawn steht im Laufgang auf dem Laufrost", () => {
    const s = probeGraben.spawnPoints[0]!;
    const y = falle(world, s.x, s.y, s.z);
    expect(y).toBeGreaterThan(GRABEN_SOHLE - 0.2);
    expect(y).toBeLessThan(GRABEN_SOHLE + 0.3);
  });

  it("durchgehender Boden: die Kapsel fällt an keiner Laufgang-/Graben-Stelle aus der Welt", () => {
    const proben: [number, number][] = [
      [0, -0.4], // Laufgang Mitte (Spawn)
      [-5, 0], // Laufgang West
      [8, 0.3], // Laufgang Ost (hinter der Traverse)
      [-4.5, -3], // Verbindungsgraben oben
      [-4.5, -8], // Verbindungsgraben unten
      [-2, 1.5], // Feuertritt-Zone
    ];
    for (const [x, z] of proben) {
      const y = falle(world, x, 1, z);
      expect(y, `(${x}, ${z})`).toBeGreaterThan(GRABEN_SOHLE - 1);
      expect(y, `(${x}, ${z})`).toBeLessThan(0.2);
    }
  });

  it("Tiefe: von der Sohle sieht das Auge nicht über die Brustwehr, vom Feuertritt schon", () => {
    // Brustwehr-Erde (z 2,6…4,4) überragt das Auge auf der Sohle deutlich.
    const brustwehr = probeGraben.boxes.filter(
      (b) =>
        b.oberflaeche === undefined &&
        b.center.z > 2 &&
        b.center.z < 5 &&
        oberkante(b) > 0.4 &&
        oberkante(b) < 1,
    );
    expect(brustwehr.length).toBeGreaterThan(0);
    const bwTop = Math.max(...brustwehr.map(oberkante));
    expect(bwTop).toBeCloseTo(BRUSTWEHR_OBERKANTE, 5);
    // Auge auf der Sohle (−2,7 + 1,6 = −1,1) ≪ Brustwehr-Oberkante.
    expect(GRABEN_SOHLE + PLAYER_EYE).toBeLessThan(bwTop - 1);
    // Auge auf der Bank (−0,9 + 1,6 = +0,7) ≥ Brustwehr-Oberkante.
    expect(FEUERTRITT_OBERKANTE + PLAYER_EYE).toBeGreaterThan(bwTop);
  });

  it("Parapet-Krone ist von jeder angrenzenden Lauffläche > STEP_HEIGHT (nicht begehbar)", () => {
    // Vom Feindseiten-Feld (y = 0) nach Süden gegen die Brustwehr laufen —
    // die Kapsel landet nicht oben auf der Krone.
    const r = laufe(world, { x: 0, y: 0.1, z: 8 }, { x: 0, z: -1 });
    expect(r.pos.z).toBeGreaterThan(3.5); // vor der Brustwehr gestoppt
    expect(r.pos.y).toBeLessThan(0.2); // nicht hinaufgestiegen
    // Brustwehr-Oberkante (+0,58) und Sandsack-Krone (+0,70) je > STEP_HEIGHT
    // über dem Feld (0) und über der Feuertritt-Bank (−0,90).
    expect(BRUSTWEHR_OBERKANTE - 0).toBeGreaterThan(STEP_HEIGHT);
    expect(PARAPET_OBERKANTE - FEUERTRITT_OBERKANTE).toBeGreaterThan(
      STEP_HEIGHT,
    );
  });

  it("Feuertritt begehbar: die Kapsel steigt vom Laufgang über die Stufen auf die Bank", () => {
    const r = laufe(
      world,
      { x: -2, y: GRABEN_SOHLE + 0.3, z: -0.4 },
      { x: -2, z: 2.4 },
    );
    expect(r.pos.z).toBeGreaterThan(1.8); // an der Brustwehr
    expect(r.pos.y).toBeGreaterThan(FEUERTRITT_OBERKANTE - 0.15); // auf der Bank
    expect(r.minY).toBeGreaterThan(GRABEN_SOHLE - 0.5); // nie durchgefallen
  });

  it("Abstiegs-Unterstand: Treppe hinab → Raumboden mit Kopffreiheit → wieder hinauf", () => {
    const start: Vec3 = { x: -4.5, y: GRABEN_SOHLE + 0.3, z: -6 };
    // Hinab in den Raum.
    const rein = laufe(world, start, { x: -4.5, z: -14.8 });
    expect(rein.pos.y).toBeLessThan(-5.0); // auf dem Raumboden (−5,2)
    expect(rein.pos.y).toBeGreaterThan(-5.3);
    expect(rein.minY).toBeGreaterThan(-5.6); // nie durch die Bodenplatte

    // Kopffreiheit: Auge (−3,6) clippt nicht in die Decke (Unterkante −2,9),
    // 0,7 m Luft darüber.
    expect(rein.pos.y + PLAYER_EYE).toBeLessThan(-3.5);

    // Wieder hinauf in den Graben.
    const raus = laufe(
      world,
      { ...rein.pos, y: rein.pos.y + 0.1 },
      { x: -4.5, z: -3 },
    );
    expect(raus.pos.y).toBeGreaterThan(GRABEN_SOHLE - 0.3);
    expect(raus.pos.z).toBeGreaterThan(-4);
  });

  it("keine Kapsel fällt durch den Auffangboden-Ausschnitt unter dem Raum", () => {
    // Direkt über der Raum-Aussparung fallen lassen — die Raum-Bodenplatte fängt.
    for (const [x, z] of [
      [-4.5, -14],
      [-5.5, -15],
      [-3.5, -15],
    ] as [number, number][]) {
      const y = falle(world, x, GRABEN_SOHLE - 0.5, z);
      expect(y, `(${x}, ${z})`).toBeGreaterThan(-5.3);
    }
  });
});
