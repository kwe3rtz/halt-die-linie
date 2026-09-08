import { describe, expect, it } from "vitest";
import { createCollisionWorld, STEP_HEIGHT } from "../sim/collision";
import type { LevelBox } from "../sim/collision";
import {
  einrasten,
  feuertrittTief,
  grabenWand,
  laufrost,
  modul,
  sandsackKrone,
  traverseBlock,
  verkleidung,
  BRUSTWEHR_OBERKANTE,
  FEUERTRITT_OBERKANTE,
  GRABEN_SOHLE,
  OBERFLAECHE,
  PARAPET_OBERKANTE,
  RASTER,
  type ModulTyp,
  type WandSegment,
} from "./module";

const ORIGIN = { x: 0, y: 0, z: 0 };
const PLAYER_EYE = 1.6; // src/sim/index.ts (Platzhalter, nicht exportiert)

const oberkante = (b: LevelBox): number => b.center.y + b.size.y / 2;

const endlich = (b: LevelBox): boolean =>
  [b.center.x, b.center.y, b.center.z, b.size.x, b.size.y, b.size.z].every(
    (n) => Number.isFinite(n),
  );

const seg = (
  a: { x: number; z: number },
  b: { x: number; z: number },
  krone: number,
  normale: { x: number; z: number },
): WandSegment => ({ a, b, sohle: GRABEN_SOHLE, krone, normale });

describe("module — Rasterbaukasten", () => {
  it("RASTER ist 4 m; einrasten() snappt darauf", () => {
    expect(RASTER).toBe(4);
    expect(einrasten(5)).toBe(4);
    expect(einrasten(7)).toBe(8);
    expect(einrasten(-3)).toBe(-4);
  });

  it("jeder Modultyp liefert mindestens einen endlichen Quader", () => {
    const typen: ModulTyp[] = ["rampe", "kartengrenze", "geschuetzstellung"];
    for (const typ of typen) {
      const boxes = modul(typ, ORIGIN, 0, { laenge: 8, breite: 3 });
      expect(boxes.length).toBeGreaterThan(0);
      expect(boxes.every(endlich)).toBe(true);
      expect(
        boxes.every((b) => b.size.x > 0 && b.size.y > 0 && b.size.z > 0),
      ).toBe(true);
    }
  });

  it("drehung tauscht Längs-/Querausdehnung (0° vs. 90°)", () => {
    const gerade = modul("kartengrenze", ORIGIN, 0, { laenge: 12 })[0];
    const gedreht = modul("kartengrenze", ORIGIN, 90, { laenge: 12 })[0];
    expect(gerade?.size.z).toBeCloseTo(12, 5);
    expect(gerade?.size.x ?? 99).toBeLessThan(1);
    expect(gedreht?.size.x).toBeCloseTo(12, 5);
    expect(gedreht?.size.z ?? 99).toBeLessThan(1);
  });

  it("rampe: 14 flache Stufen bis auf die tiefe Sohle, jeder Anstieg ≪ STEP_HEIGHT", () => {
    const boxes = modul("rampe", ORIGIN, 0, { laenge: 5, breite: 4 });
    expect(boxes.length).toBe(14); // AP6-01d: 10 → 14 (Sohle 0,9 m tiefer)
    const tops = boxes.map(oberkante).sort((a, b) => b - a);
    const stufen = [0, ...tops.map((t) => -t)]; // Abfall ab OBERFLAECHE (0)
    for (let i = 1; i < stufen.length; i += 1) {
      const anstieg = (stufen[i] ?? 0) - (stufen[i - 1] ?? 0);
      expect(anstieg).toBeLessThanOrEqual(STEP_HEIGHT + 1e-9);
      expect(anstieg).toBeLessThanOrEqual(0.25 + 1e-9);
    }
    // Unterste Stufe endet exakt auf der Grabensohle.
    expect(Math.min(...tops)).toBeCloseTo(GRABEN_SOHLE, 5);
  });
});

describe("Graben-Look — die Kennwerte hängen zusammen (AP6-01d)", () => {
  it("Sohle tief genug: Auge auf der Sohle sieht nicht über die Brustwehr", () => {
    expect(GRABEN_SOHLE).toBeCloseTo(-2.7, 6);
    expect(GRABEN_SOHLE + PLAYER_EYE).toBeLessThan(BRUSTWEHR_OBERKANTE - 1);
  });

  it("Auge auf der Feuertritt-Bank liegt auf Kronenhöhe (über die Kimme)", () => {
    expect(FEUERTRITT_OBERKANTE + PLAYER_EYE).toBeGreaterThan(
      BRUSTWEHR_OBERKANTE,
    );
    expect(
      Math.abs(FEUERTRITT_OBERKANTE + PLAYER_EYE - PARAPET_OBERKANTE),
    ).toBeLessThanOrEqual(0.15);
  });

  it("Brustwehr-Krone ist von Feld und Bank aus > STEP_HEIGHT (keine Lauffläche)", () => {
    expect(BRUSTWEHR_OBERKANTE - OBERFLAECHE).toBeGreaterThan(STEP_HEIGHT);
    expect(PARAPET_OBERKANTE - FEUERTRITT_OBERKANTE).toBeGreaterThan(
      STEP_HEIGHT,
    );
  });

  it("feuertrittTief: vier Stufen von der Sohle zur Bank, jede < STEP_HEIGHT", () => {
    const stufen = feuertrittTief({
      minX: -4,
      maxX: 4,
      zToe: 21.8,
      zWand: 24.2,
    });
    expect(stufen.length).toBe(4);
    const tops = stufen.map(oberkante).sort((a, b) => a - b);
    const kette = [GRABEN_SOHLE, ...tops];
    for (let i = 1; i < kette.length; i += 1) {
      expect(kette[i]! - kette[i - 1]!).toBeLessThanOrEqual(STEP_HEIGHT + 1e-9);
    }
    expect(tops.at(-1)).toBeCloseTo(FEUERTRITT_OBERKANTE, 5);
    // Stufen sind echte Kollider (man steht darauf).
    expect(stufen.every((b) => b.nurRender !== true)).toBe(true);
  });
});

describe("Formdetail kollidiert nicht (AP6-01d, Spieltest-Korrektur 1)", () => {
  const s = seg({ x: -6, z: 4 }, { x: 6, z: 4 }, BRUSTWEHR_OBERKANTE, {
    x: 0,
    z: -1,
  });

  it("verkleidung / sandsackKrone liefern ausschließlich nurRender-Boxen", () => {
    const boxes = [
      ...verkleidung(s, { vonY: FEUERTRITT_OBERKANTE }),
      ...sandsackKrone(s),
    ];
    expect(boxes.length).toBeGreaterThan(6);
    expect(boxes.every(endlich)).toBe(true);
    expect(boxes.every((b) => b.nurRender === true)).toBe(true);
    expect(boxes.every((b) => b.oberflaeche !== undefined)).toBe(true);
    for (const b of boxes.filter((x) => x.oberflaeche === "sandsack")) {
      expect(oberkante(b)).toBeCloseTo(PARAPET_OBERKANTE, 5);
    }
  });

  it("laufrost: Deckplatte ist Kollider, Querstege sind nurRender", () => {
    const boxes = laufrost({ minX: -3, maxX: 3, minZ: 0, maxZ: 9 });
    const platte = boxes.filter((b) => b.nurRender !== true);
    expect(platte.length).toBe(1);
    expect(oberkante(platte[0]!)).toBeCloseTo(GRABEN_SOHLE + 0.04, 6);
    expect(boxes.length).toBeGreaterThan(5); // Querstege dabei
    expect(boxes.slice(1).every((b) => b.nurRender === true)).toBe(true);
  });

  it("grabenWand: der Kollider ist allein die Basiswand — das Formdetail steht ≤ 8 cm davor", () => {
    const boxes = grabenWand({
      a: { x: -6, z: 4 },
      b: { x: 6, z: 4 },
      normale: { x: 0, z: -1 },
      krone: BRUSTWEHR_OBERKANTE,
      dicke: 1.8,
      vonY: FEUERTRITT_OBERKANTE,
      sandsack: PARAPET_OBERKANTE,
    });
    const kollider = boxes.filter((b) => b.nurRender !== true);
    expect(kollider.length).toBe(1);
    // Grabenseitige Fläche der Basiswand = die Ebene, an der man entlangläuft.
    const k = kollider[0]!;
    expect(k.center.z - k.size.z / 2).toBeCloseTo(4, 6);
    // Verkleidung ragt ≤ 8 cm davor (Pfosten 7 cm, Bohlen 2,5 cm) — weniger als
    // ein Viertel des Kapselradius (0,35), also nie sichtbar durchdrungen.
    for (const d of boxes.filter(
      (b) => b.nurRender === true && b.oberflaeche !== "sandsack",
    )) {
      expect(4 - (d.center.z - d.size.z / 2)).toBeLessThanOrEqual(0.08 + 1e-9);
    }
    // Die Sandsack-Krone sitzt oben auf der Wand und lippt 12,5 cm über —
    // auf Kronenhöhe (y 0,35…0,70), wo keine Kapsel steht.
    for (const d of boxes.filter((b) => b.oberflaeche === "sandsack")) {
      expect(4 - (d.center.z - d.size.z / 2)).toBeLessThanOrEqual(0.13);
      expect(d.center.y - d.size.y / 2).toBeGreaterThan(0.3);
    }
    // Und in der Kollisionswelt taucht wirklich nur die Basiswand auf.
    const world = createCollisionWorld({ boxes, spawnPoints: [] });
    expect(world.boxes.length).toBe(1);
  });

  it("grabenWand: eine getaggte Lücke schaltet Wand UND Formdetail zusammen ab", () => {
    const boxes = grabenWand({
      a: { x: -6, z: 4 },
      b: { x: 6, z: 4 },
      normale: { x: 0, z: -1 },
      krone: BRUSTWEHR_OBERKANTE,
      dicke: 1.8,
      luecken: [
        { mitte: 0, breite: 2.6, tag: "bresche" },
        { mitte: 4, breite: 2 }, // permanentes Loch
      ],
    });
    const getaggt = boxes.filter((b) => b.tag === "bresche");
    expect(getaggt.length).toBeGreaterThan(1); // Wandstück + Verkleidung
    expect(getaggt.some((b) => b.nurRender !== true)).toBe(true);
    // Im permanenten Loch steht gar nichts.
    const imLoch = boxes.filter(
      (b) => Math.abs(b.center.x - 4) < 0.9 && b.size.x < 2,
    );
    expect(imLoch).toEqual([]);
  });

  it("traverseBlock: ein massiver Kern, beide Flanken verkleidet (nurRender)", () => {
    const boxes = traverseBlock({
      minX: -2.5,
      maxX: 2.5,
      minZ: 19.4,
      maxZ: 26,
    });
    const kollider = boxes.filter((b) => b.nurRender !== true);
    expect(kollider.length).toBe(1);
    expect(oberkante(kollider[0]!)).toBeGreaterThan(OBERFLAECHE);
    expect(boxes.length).toBeGreaterThan(6);
  });
});

describe("kartengrenze — unsichtbarer Kollider (AP5-03)", () => {
  const O = { x: 0, y: 0, z: 0 };

  it("markiert ihre Box als unsichtbar — in jeder Drehung", () => {
    for (const d of [0, 90, 180, 270] as const) {
      const [b] = modul("kartengrenze", O, d, { laenge: 12 });
      expect(b?.unsichtbar).toBe(true);
      expect(b?.size.y).toBeGreaterThanOrEqual(4); // Sprung + Stufe kommen nicht drüber
    }
  });

  it("alle anderen Module bleiben sichtbar", () => {
    for (const typ of ["rampe", "geschuetzstellung"] as const) {
      for (const b of modul(typ, O)) {
        expect(b.unsichtbar, typ).toBeUndefined();
      }
    }
  });
});
