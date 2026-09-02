// PLATZHALTER-Beispiele — je eine Instanz pro Schema-Typ, damit die Typen gegen
// echte Werte kompilieren. KEINE Balance, keine Vollständigkeit. Zahlen grob
// geschätzt bzw. an WAFFEN.md orientiert.
import type { ClassDef, EnemyDef, NationTrait, WeaponDef } from "./schema";

/** WAFFEN.md „v1-Arsenal" — die Referenzwaffe (Gewehr 98). PLATZHALTER. */
export const langgewehrM98Stub: WeaponDef = {
  id: "langgewehr-m98",
  name: "Langgewehr M98",
  category: "repetiergewehr",
  feuerModus: "repetierer",
  basisSchaden: 85,
  kadenz: 40,
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

/** KONZEPT.md §4 „Schütze" — Anker, Körper 100/100/100. PLATZHALTER. */
export const schuetzeStub: ClassDef = {
  id: "schuetze",
  name: "Schütze",
  bonusKategorie: "repetiergewehr",
  koerper: { tempo: 1, hp: 1, ausdauer: 1 },
  signature: {
    id: "munitionsbeutel",
    name: "Munitionsbeutel",
    beschreibung:
      "Aufstellbar, Trupp-Nachschub (nur Primärmunition); direkt abgebbar.",
  },
  ability: {
    id: "zielmarke",
    name: "Zielmarke",
    nachschubKosten: 1,
    questHinweis:
      "Beim Feldkommandeur an der Home-Line melden, dann X markierte Ziele ausschalten.",
  },
  passive: {
    id: "kaltbluetig",
    name: "Kaltblütig",
    beschreibung:
      "Kein Flinch beim Zielen; Weakpoint-Treffer geben etwas Nachschub zurück.",
  },
};

/** KONZEPT.md §5 Tag-Roster — Basis-Gegner. PLATZHALTER. */
export const linieninfanterieStub: EnemyDef = {
  id: "linieninfanterie",
  name: "Linieninfanterie",
  mode: "tag",
  rolle: "Basis; Feuer & Bewegung, nutzt Deckung, infiltriert Gräben.",
  konterHaerte: "weich",
  hp: 100,
  tempo: 1,
  schaden: 12,
  verhaltensTag: "feuer-und-bewegung",
};

/** KONZEPT.md §4 / WAFFEN.md „Nationen" — Deutsches Kaiserreich. PLATZHALTER. */
export const kaiserreichStub: NationTrait = {
  id: "kaiserreich",
  name: "Das Kaiserreich",
  // realer Bezug: Deutsches Kaiserreich (WAFFEN.md „Nationen").
  passive: {
    id: "methodisch",
    name: "Methodisch",
    beschreibung:
      "Geringfügig geringere Überhitzung / stabileres Dauerfeuer mit MG-Kategorie.",
  },
  vertrauteWaffen: ["langgewehr-m98", "mg-15", "p08", "stielgranate"],
};
