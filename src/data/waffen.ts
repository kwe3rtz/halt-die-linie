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

/** Standard-Startwaffe des Spielers in AP2. */
export const standardWaffe: WeaponDef = langgewehrM98;
