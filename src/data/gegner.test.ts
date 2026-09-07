import { describe, expect, it } from "vitest";
import {
  gegnerDefs,
  linieninfanterie,
  linieninfanterieSchnell,
  linieninfanterieSchwer,
} from "./gegner";

// AP5-06: drei Klassen der Linieninfanterie als reine Statistik-Varianten.
describe("Gegner-Defs — Klassen der Linieninfanterie (AP5-06)", () => {
  const klassen = [
    linieninfanterie,
    linieninfanterieSchnell,
    linieninfanterieSchwer,
  ];

  it("alle drei Klassen sind unter ihrer eigenen Id registriert", () => {
    for (const def of klassen) {
      expect(gegnerDefs[def.id]).toBe(def);
    }
    expect(new Set(klassen.map((k) => k.id)).size).toBe(3);
    expect(Object.keys(gegnerDefs)).toHaveLength(3);
  });

  it("Statistik-Varianten: gleiches Verhalten (Tag, weich, feuer-und-bewegung), nur Tempo/HP/Schaden anders", () => {
    for (const v of [linieninfanterieSchnell, linieninfanterieSchwer]) {
      expect(v.verhaltensTag).toBe(linieninfanterie.verhaltensTag);
      expect(v.mode).toBe(linieninfanterie.mode);
      expect(v.konterHaerte).toBe(linieninfanterie.konterHaerte);
    }
  });

  it("schnell = spürbar schneller, aber schwächer; schwer = spürbar langsamer, aber stärker", () => {
    // „Spürbar" = mindestens ein Viertel Unterschied zur Basis.
    expect(linieninfanterieSchnell.tempo).toBeGreaterThanOrEqual(
      1.25 * linieninfanterie.tempo,
    );
    expect(linieninfanterieSchnell.hp).toBeLessThan(linieninfanterie.hp);
    expect(linieninfanterieSchnell.schaden).toBeLessThan(
      linieninfanterie.schaden,
    );
    expect(linieninfanterieSchwer.tempo).toBeLessThanOrEqual(
      0.75 * linieninfanterie.tempo,
    );
    expect(linieninfanterieSchwer.hp).toBeGreaterThan(linieninfanterie.hp);
    expect(linieninfanterieSchwer.schaden).toBeGreaterThan(
      linieninfanterie.schaden,
    );
  });
});
