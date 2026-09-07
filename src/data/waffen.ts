// v1-Waffen — echte, spielbare Defs (im Gegensatz zu den Typ-Stubs in
// `beispiele.ts`). Alle Zahlen sind PLATZHALTER für den ersten Kampf-Loop
// (AP2), Balancing kommt später. Orientierung: WAFFEN.md „v1-Arsenal".
import type { WeaponDef } from "./schema";

/** Langgewehr M98 — Repetierer, Ladestreifen, die Referenzwaffe (WAFFEN.md). */
export const langgewehrM98: WeaponDef = {
  id: "langgewehr-m98",
  name: "Langgewehr M98",
  category: "repetiergewehr",
  feuerModus: "repetierer",
  basisSchaden: 85,
  kadenz: 50, // effektive Schuss/Minute inkl. Kammerstängel (Platzhalter)
  magazin: 5,
  reserve: 45,
  nachladeArt: "ladestreifen",
  handling: {
    reichweiteOptimal: 60,
    reichweiteMax: 140,
    streuung: 0.03,
    rueckstoss: 0.5,
  },
  nation: "kaiserreich",
  wandwaffe: false,
  feelTags: ["hoher-schaden", "langsam", "praezise", "lange-reichweite"],
};

/**
 * Sturm-MP 18 — Vollauto-Maschinenpistole (WAFFEN.md „Sturm-MP 18", dort eine
 * Wandwaffe). Im Zielbild NICHT die Startwaffe; AP6-06 reicht sie nur im
 * Spielpfad (`src/main.ts`) als Testwaffe an `createSim`, damit sich der
 * Nacht-Sektor mit etwas Automatischem anspielen lässt. Sim-Default und alle
 * Tests hängen weiter an `standardWaffe` (dem Langgewehr) → Golden-Anker
 * unberührt. Zahlen sind Platzhalter fürs Feel, kein Balancing.
 */
export const sturmMp18: WeaponDef = {
  id: "sturm-mp-18",
  name: "Sturm-MP 18",
  category: "maschinenpistole",
  feuerModus: "vollauto",
  basisSchaden: 28,
  kadenz: 450,
  magazin: 20,
  reserve: 120,
  nachladeArt: "magazin",
  handling: {
    reichweiteOptimal: 22,
    reichweiteMax: 55,
    streuung: 0.06,
    rueckstoss: 0.9,
  },
  nation: "kaiserreich",
  wandwaffe: true,
  feelTags: [
    "schnelles-feuer",
    "dauerfeuer",
    "niedriger-schaden",
    "kurze-reichweite",
    "hoher-rueckstoss",
  ],
};

/** Standard-Startwaffe des Spielers in AP2. */
export const standardWaffe: WeaponDef = langgewehrM98;
