// Datenschema-Stubs für die Gameplay-Definitionen (Waffen, Nationen, Klassen,
// Gegner). NUR Typen — keine Logik, kein Loader, keine Laufzeit-Validierung
// (kommt in einem späteren Arbeitspaket). Beispiele in `./beispiele.ts`.
//
// Quellen: KONZEPT.md §4 (Klassen/Waffen/Nation), §5 (Gegner), WAFFEN.md
// (Waffenmodell, v1-Arsenal, Nachlade-Arten). Werte sind Platzhalter.

/** Freitext-Kennung, z. B. `"langgewehr-m98"`, `"schuetze"`. */
export type Id = string;

// ---------------------------------------------------------------------------
// Waffen — WAFFEN.md
// ---------------------------------------------------------------------------

/** Waffenkategorie. WAFFEN.md „v1-Arsenal" / KONZEPT.md §4 (Bonus-Tabelle). */
export type WeaponCategory =
  | "repetiergewehr"
  | "karabiner"
  | "leichtes-mg"
  | "pistole"
  | "maschinenpistole"
  | "grabenflinte"
  | "flammenwerfer";

/** Feuerart. WAFFEN.md „Feuerart"-Spalten. */
export type FeuerModus = "repetierer" | "halbauto" | "vollauto" | "pump";

/** Nachlade-Handling. WAFFEN.md „Nachlade-Arten". */
export type NachladeArt =
  "ladestreifen" | "magazin" | "trommel" | "gurt" | "revolver" | "einzeln";

/** Nation einer Waffe — inkl. `"neutral"` (kein Vertrautheits-Bonus). WAFFEN.md. */
export type WeaponNation = NationId | "neutral";

/** Grobe „Feel"-Etiketten. KONZEPT.md §4 „Feel gemischt nach Waffe". Wächst. */
export type FeelTag =
  | "hoher-schaden"
  | "niedriger-schaden"
  | "langsam"
  | "schnelles-feuer"
  | "dauerfeuer"
  | "praezise"
  | "lange-reichweite"
  | "kurze-reichweite"
  | "handlich"
  | "schwer"
  | "hoher-rueckstoss";

/** Grobe Reichweiten-/Streuungswerte. Feinbau in der Balance-Runde (§9.2). */
export interface WeaponHandling {
  /** Meter, innerhalb derer der volle Schaden greift. */
  reichweiteOptimal: number;
  /** Meter, ab denen der Schaden am Minimum ist. */
  reichweiteMax: number;
  /** Grobe Streuung 0..1 (0 = punktgenau). */
  streuung: number;
  /** Grober Rückstoß 0..1. */
  rueckstoss: number;
}

export interface WeaponDef {
  id: Id;
  /** Mittel fiktionalisierter Anzeigename. WAFFEN.md „Benennung". */
  name: string;
  category: WeaponCategory;
  feuerModus: FeuerModus;
  /** Basisschaden pro Treffer (Platzhalter-Einheit). */
  basisSchaden: number;
  /** Kadenz in Schuss/Minute. */
  kadenz: number;
  /** Kapazität geladen (Magazin/Streifen/Trommel/Gurt). */
  magazin: number;
  /** Mitgeführte Reservemunition. WAFFEN.md „Munition & Auffüllen". */
  reserve: number;
  nachladeArt: NachladeArt;
  handling: WeaponHandling;
  /** WAFFEN.md „Vertrautheit je Nation". */
  nation: WeaponNation;
  /** Nur im Einsatz zu finden/kaufen, nicht im Loadout. WAFFEN.md „Wandwaffen". */
  wandwaffe: boolean;
  feelTags: FeelTag[];
}

// ---------------------------------------------------------------------------
// Nationen — KONZEPT.md §4 „Nation als leichter Trait", WAFFEN.md „Nationen"
// ---------------------------------------------------------------------------

/** Spielbare Nationen v1. KONZEPT.md §4. */
export type NationId = "kaiserreich" | "albion";

/** Kleiner Passiv-Effekt-Stub. Feinbau später (§9.3). */
export interface PassiveStub {
  id: Id;
  name: string;
  beschreibung: string;
}

export interface NationTrait {
  id: NationId;
  /** Fiktionalisierter Name, z. B. „Das Kaiserreich" / „Albion". */
  name: string;
  // realer Bezug: siehe Kommentar am jeweiligen Beispiel (WAFFEN.md „Nationen").
  /** Kleiner Passiv-Bonus (Stub). */
  passive: PassiveStub;
  /** Waffen-`Id`s mit Handhabungs-Bonus. WAFFEN.md „Vertrautheit je Nation". */
  vertrauteWaffen: Id[];
}

// ---------------------------------------------------------------------------
// Klassen — KONZEPT.md §4 „Startaufstellung: 4 Klassen"
// ---------------------------------------------------------------------------

/** Startklassen. Sturmtruppler bewusst noch nicht (Backlog). KONZEPT.md §4. */
export type ClassId = "schuetze" | "mg-schuetze" | "pionier" | "sanitaeter";

/** Körper-Stats als relative Faktoren (1 = Referenz „Schütze 100/100/100"). */
export interface KoerperStats {
  tempo: number;
  hp: number;
  ausdauer: number;
}

/** Signatur-Ausrüstung (Stub). KONZEPT.md §4 je Klasse. */
export interface SignatureStub {
  id: Id;
  name: string;
  beschreibung: string;
}

/** Aktive Fähigkeit (Stub) — startet gesperrt, Quest-Freischaltung. KONZEPT.md §4. */
export interface AbilityStub {
  id: Id;
  name: string;
  /** Kosten je Nutzung nach Freischaltung, in Nachschub-Ladungen. */
  nachschubKosten: number;
  /** Kurzer Hinweis auf die Freischalt-Quest (1–2 Schritte). */
  questHinweis: string;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  /** Waffenkategorie mit Klassen-Bonus. KONZEPT.md §4 Bonus-Tabelle. */
  bonusKategorie: WeaponCategory;
  koerper: KoerperStats;
  signature: SignatureStub;
  ability: AbilityStub;
  passive: PassiveStub;
}

// ---------------------------------------------------------------------------
// Gegner — KONZEPT.md §5 „Der Feind"
// ---------------------------------------------------------------------------

/** Einsatz ist Tag ODER Nacht, kein Mischen. KONZEPT.md §5. */
export type EnemyMode = "tag" | "nacht";

/** Konter-Härte. KONZEPT.md §5: normal = weich, Elite = hart. */
export type KonterHaerte = "weich" | "hart";

/** Verhaltens-Etikett (Stub für die KI-Runde §9.4). KONZEPT.md §5. */
export type VerhaltensTag =
  | "feuer-und-bewegung"
  | "rush-platzierungen"
  | "unterdruecken"
  | "parapet-brecher"
  | "schadensschwamm"
  | "schluerfer"
  | "sprinter"
  | "wand-kratzer"
  | "rufer";

export interface EnemyDef {
  id: Id;
  name: string;
  mode: EnemyMode;
  /** Kurzbeschreibung der Rolle im Roster. KONZEPT.md §5 Roster-Tabellen. */
  rolle: string;
  konterHaerte: KonterHaerte;
  /** Grobe Werte (Platzhalter-Einheiten). Balance offen (§9.4). */
  hp: number;
  tempo: number;
  schaden: number;
  verhaltensTag: VerhaltensTag;
}
