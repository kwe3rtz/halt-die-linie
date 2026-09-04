import { describe, expect, it } from "vitest";
import { STEP_HEIGHT } from "../sim/collision";
import type { LevelBox } from "../sim/collision";
import {
  einrasten,
  FEUERTRITT_OBERKANTE,
  GRABEN_SOHLE,
  modul,
  PARAPET_OBERKANTE,
  RASTER,
  type ModulTyp,
} from "./module";

const ORIGIN = { x: 0, y: 0, z: 0 };
const PLAYER_EYE = 1.6; // src/sim/index.ts (Platzhalter, nicht exportiert)

const oberkante = (b: LevelBox): number => b.center.y + b.size.y / 2;

const endlich = (b: LevelBox): boolean =>
  [b.center.x, b.center.y, b.center.z, b.size.x, b.size.y, b.size.z].every(
    (n) => Number.isFinite(n),
  );

describe("module — Rasterbaukasten", () => {
  it("RASTER ist 4 m; einrasten() snappt darauf", () => {
    expect(RASTER).toBe(4);
    expect(einrasten(5)).toBe(4);
    expect(einrasten(7)).toBe(8);
    expect(einrasten(-3)).toBe(-4);
  });

  it("jeder Modultyp liefert mindestens einen endlichen Quader", () => {
    const typen: ModulTyp[] = [
      "grabengerade",
      "grabenknick",
      "parapet",
      "unterstand",
      "rampe",
      "kartengrenze",
    ];
    for (const typ of typen) {
      const boxes = modul(typ, ORIGIN, 0, { laenge: 8, breite: 3 });
      expect(boxes.length).toBeGreaterThan(0);
      expect(boxes.every(endlich)).toBe(true);
      expect(
        boxes.every((b) => b.size.x > 0 && b.size.y > 0 && b.size.z > 0),
      ).toBe(true);
    }
  });

  it("grabengerade: Sohle-Oberkante liegt auf GRABEN_SOHLE", () => {
    const boxes = modul("grabengerade", ORIGIN, 0, { laenge: 12 });
    const tiefste = Math.min(...boxes.map(oberkante));
    expect(tiefste).toBeCloseTo(GRABEN_SOHLE, 5);
  });

  it("drehung tauscht Längs-/Querausdehnung (0° vs. 90°)", () => {
    const gerade = modul("kartengrenze", ORIGIN, 0, { laenge: 12 })[0];
    const gedreht = modul("kartengrenze", ORIGIN, 90, { laenge: 12 })[0];
    expect(gerade?.size.z).toBeCloseTo(12, 5);
    expect(gerade?.size.x ?? 99).toBeLessThan(1);
    expect(gedreht?.size.x).toBeCloseTo(12, 5);
    expect(gedreht?.size.z ?? 99).toBeLessThan(1);
  });

  it("parapet: Feuertritt führt in Stufen (kein Sprung) knapp übers Parapet", () => {
    const tops = modul("parapet", ORIGIN, 0, { laenge: 8 })
      .map(oberkante)
      .sort((a, b) => a - b);
    // Von der Sohle über die Stufen hoch: jeder Anstieg <= STEP_HEIGHT.
    const stufen = [GRABEN_SOHLE, ...tops];
    for (let i = 1; i < stufen.length - 1; i += 1) {
      expect((stufen[i] ?? 0) - (stufen[i - 1] ?? 0)).toBeLessThanOrEqual(
        STEP_HEIGHT + 1e-9,
      );
    }
    expect(tops.some((t) => Math.abs(t - FEUERTRITT_OBERKANTE) < 1e-6)).toBe(
      true,
    );
    expect(tops.at(-1)).toBeCloseTo(PARAPET_OBERKANTE, 5);
    expect(FEUERTRITT_OBERKANTE + PLAYER_EYE).toBeGreaterThan(
      PARAPET_OBERKANTE,
    );
  });

  it("rampe: jede Stufe bleibt unter STEP_HEIGHT", () => {
    const tops = modul("rampe", ORIGIN, 0, { laenge: 4, breite: 4 })
      .map(oberkante)
      .sort((a, b) => b - a);
    const stufen = [0, ...tops.map((t) => -t)]; // Abfall ab OBERFLAECHE (0)
    for (let i = 1; i < stufen.length; i += 1) {
      expect((stufen[i] ?? 0) - (stufen[i - 1] ?? 0)).toBeLessThanOrEqual(
        STEP_HEIGHT + 1e-9,
      );
    }
  });
});
