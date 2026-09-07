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

// AP5-06: zwei Statistik-Varianten der Linieninfanterie — gleiches Verhalten
// (derselbe `verhaltensTag`, dieselbe Bewegungs-/Nahkampflogik), nur Tempo,
// HP und Schaden anders. Kein neuer KI-Typ: der Roster-Ausbau (Sturmtrupp,
// MG-Trupp, … KONZEPT.md §5) bleibt spätere Arbeit. HP sind auf das Langgewehr
// M98 (85 Schaden) gerechnet, damit die Klasse in Treffern spürbar ist:
// schnell 1 · normal 2 · schwer 3 Treffer bis Welle 4 (Wellen-HP-Faktor 0,12).

/**
 * Schnell, aber schwach: läuft der Kette voraus und stirbt am ersten Treffer.
 * Tempo so gewählt, dass auch das schnellste Exemplar (Marsch-Streuung +15 %)
 * einen gehenden Spieler (4,5 m/s) nicht einholt — spürbar, nicht unfair.
 */
export const linieninfanterieSchnell: EnemyDef = {
  id: "linieninfanterie-schnell",
  name: "Linieninfanterie (Vorausabteilung)",
  mode: "tag",
  rolle: "Leicht ausgerüstet; schnell voraus, fällt schnell.",
  konterHaerte: "weich",
  hp: 60,
  tempo: 1.5,
  schaden: 7,
  verhaltensTag: "feuer-und-bewegung",
};

/**
 * Langsam, aber stark: kommt als Letzter an, steckt drei Treffer weg und
 * schlägt härter zu.
 */
export const linieninfanterieSchwer: EnemyDef = {
  id: "linieninfanterie-schwer",
  name: "Linieninfanterie (schwer)",
  mode: "tag",
  rolle: "Schwer bepackt; langsam, zäh, hart im Handgemenge.",
  konterHaerte: "weich",
  hp: 180,
  tempo: 0.65,
  schaden: 16,
  verhaltensTag: "feuer-und-bewegung",
};

/** Nachschlag nach `defId`. */
export const gegnerDefs: Record<string, EnemyDef> = {
  [linieninfanterie.id]: linieninfanterie,
  [linieninfanterieSchnell.id]: linieninfanterieSchnell,
  [linieninfanterieSchwer.id]: linieninfanterieSchwer,
};
