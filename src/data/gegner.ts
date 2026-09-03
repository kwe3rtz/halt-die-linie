// v1-Gegner — echte EnemyDefs (vs. den Typ-Stubs in `beispiele.ts`).
// Platzhalterzahlen für den ersten Kampf-Loop (AP2). Referenz: KONZEPT.md §5.
import type { EnemyDef } from "./schema";

/**
 * Linieninfanterie — Basis-Gegner des Tag-Rosters.
 * `verhaltensTag: "feuer-und-bewegung"` beschreibt das Zielverhalten; AP2 setzt
 * davon nur Anmarsch + Nahkampf um (kein Fernkampf, keine Deckung) — das kommt
 * in einem späteren Arbeitspaket.
 */
export const linieninfanterie: EnemyDef = {
  id: "linieninfanterie",
  name: "Linieninfanterie",
  mode: "tag",
  rolle: "Basis; Feuer & Bewegung, nutzt Deckung, infiltriert Gräben.",
  konterHaerte: "weich",
  hp: 100,
  tempo: 1, // relativer Faktor auf die Basisgeschwindigkeit
  schaden: 10, // Nahkampf pro Treffer
  verhaltensTag: "feuer-und-bewegung",
};

/** Nachschlag nach `defId`. */
export const gegnerDefs: Record<string, EnemyDef> = {
  linieninfanterie,
};
