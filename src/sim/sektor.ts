// Semantische Sektor-Schicht (AP4). Typen + reine Abfrage-Helfer über die
// Bounds, die der Sektor mitliefert — kein Babylon, kein Zufall, keine Zeit.
//
// Die konkreten Sektor-Daten (der handgebaute Greybox) liegen in
// `src/data/sektor.ts`. Dieses Modul definiert nur, was die Sim-/Gameplay-
// Schichten davon brauchen: die Zonen-/Abschnitts-Typen und `zoneAt` /
// `abschnittAt` für AP4-02/03/04.
import type { Vec3 } from "./math";
import type { Aabb, LevelData } from "./collision";

/** Die sechs Zonen des „H" von der Feindseite nach hinten (KONZEPT.md §3). */
export type ZonenId =
  | "feindzone"
  | "labyrinth"
  | "frontlinie"
  | "feld"
  | "verbindungsgraben"
  | "homeline";

export interface ZonenEintrag {
  id: ZonenId;
  bounds: Aabb;
}

/** Ein benannter Frontabschnitt (A / B / C …). Besitz/Bresche/Fall füllt AP4-03. */
export interface FrontAbschnitt {
  id: string;
  bounds: Aabb;
  /** Stellen, an denen der Feind das Parapet aufreißen kann (AP4-03). */
  parapetBreschen: Vec3[];
  /** Klassen-Platzierungen (späteres Paket): Sandsäcke, MG, Draht. */
  bauSlots: Vec3[];
  /** Kleines Nachschubdepot des Abschnitts — Uhr-Effekt bei Verlust (AP4-04). */
  depot: Vec3;
}

export interface HomeZugang {
  id: string;
  pos: Vec3;
}

/** Ein Knoten des semantischen Nav-Graphen (AP4-02). */
export interface NavKnoten {
  id: string;
  pos: Vec3;
  zone: ZonenId;
  /**
   * Engstelle (Sap-Lücke, Bresche, Grabenmündung, Parados-Rampe): muss vom
   * Gegner exakt durchlaufen werden — enger Wegpunkt-Radius und erst
   * „erreicht", wenn er sie in Richtung des nächsten Wegpunkts passiert hat
   * (AP4-06). Ohne Flag darf ein Gegner die Ecke schneiden.
   */
  engstelle?: boolean;
}

/**
 * Eine Kante, ungerichtet genutzt. `offen: false` heißt „noch gesperrt" —
 * die Front→hinten-Kanten öffnet AP4-03, wenn ein Abschnitt fällt.
 */
export interface NavKante {
  von: string;
  nach: string;
  offen: boolean;
}

export interface NavGraph {
  knoten: NavKnoten[];
  kanten: NavKante[];
}

/** Geometrisches Leitsymbol einer Spine-Route (redundant zur Farbe, AP4-05). */
export type SpineSymbol = "dreieck" | "doppelstrich" | "kreis";

/**
 * Eine Leit-„Spine" (Kommunikationskabel an der Grabenwand, ~Brusthöhe) von
 * einem Frontabschnitt zur Home-Line (KONZEPT.md §3). Je Route eine eigene
 * Farbe **und** ein eigenes Symbol — lesbar bei Nacht / Farbsehschwäche /
 * gedämpfter Palette. Nur Render — kein Sim-Verhalten hängt daran.
 */
export interface SpineRoute {
  /** Deckungsgleich mit der Callout-Grammatik (`verbindungsgraben` …). */
  id: string;
  /** RGB 0..1. */
  farbe: [number, number, number];
  symbol: SpineSymbol;
  /** Polylinie in Weltkoordinaten (Front → Home). */
  punkte: Vec3[];
}

/** Semantische Metadaten neben der reinen Geometrie eines `LevelData`. */
export interface SektorMeta {
  zonen: ZonenEintrag[];
  frontAbschnitte: FrontAbschnitt[];
  /**
   * Home-Line-Abschnitte (AP4-04) — dieselbe `front.ts`-Maschine wie die Front,
   * startet aber befestigt (mehr Bresche-HP). Alle `verloren` = Einsatz verloren.
   */
  homeAbschnitte: FrontAbschnitt[];
  /** Anmarsch-/Spawn-Punkte am Nordrand (die zwei schrägen Korridore). */
  feindAnmarsch: Vec3[];
  /** Zugänge zur Home-Line: Verbindungsgraben + Feld links/rechts. */
  homeZugaenge: HomeZugang[];
  /** Großes Orientierungs-Landmark im Labyrinth (Panzerwrack o. Ä.). */
  landmark: Vec3;
  /** Leit-„Spines" Front → Home, je Route Farbe + Symbol (AP4-05). */
  spineRouten: SpineRoute[];
  /** Spieler-Startpunkte an der Frontlinie. */
  spielerSpawn: Vec3[];
  /**
   * Semantischer Nav-Graph (AP4-02): von den Anmarschpunkten durchs Labyrinth
   * an die Front, nach einem Durchbruch weiter übers Feld / durch den
   * Verbindungsgraben zur Home-Line. Handgepflegt (der spätere Generator
   * erzeugt ihn mit).
   */
  navGraph: NavGraph;
}

/**
 * Ein `LevelData` (Boxen + Spawns) **plus** die semantische Sektor-Schicht.
 * Erfüllt `LevelData` — `createSim` nimmt es unverändert entgegen.
 */
export interface SektorData extends LevelData {
  meta: SektorMeta;
}

/**
 * Etikett des Parapet-Segments an der `index`-ten Bresche eines Abschnitts
 * (AP4-06). Dieselbe Konvention nutzen Daten (`LevelBox.tag`), Sim
 * (`setKolliderAktiv`) und Renderer (Segment ausblenden).
 */
export function brescheTag(abschnittId: string, index: number): string {
  return `bresche:${abschnittId}:${index}`;
}

/** Punkt-in-AABB, nur X/Z — Zonen und Abschnitte sind Säulen über die Höhe. */
export function inBoundsXZ(b: Aabb, p: Vec3): boolean {
  return p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ;
}

/**
 * Welche Zone deckt `pos` ab (X/Z)? Die Reihenfolge in `meta.zonen` entscheidet
 * bei Überlappung — speziellere Zonen (Verbindungsgraben) stehen vorn. `null`,
 * wenn keine Zone passt.
 */
export function zoneAt(meta: SektorMeta, pos: Vec3): ZonenId | null {
  for (const z of meta.zonen) {
    if (inBoundsXZ(z.bounds, pos)) {
      return z.id;
    }
  }
  return null;
}

/** Welcher Frontabschnitt deckt `pos` ab (X/Z)? `null` außerhalb der Front. */
export function abschnittAt(meta: SektorMeta, pos: Vec3): string | null {
  for (const a of meta.frontAbschnitte) {
    if (inBoundsXZ(a.bounds, pos)) {
      return a.id;
    }
  }
  return null;
}

/**
 * Reichweite eines Munitionsdepots in Metern (AP5-02) — 3D-Abstand vom
 * Fußpunkt des Spielers zur Depot-Markierung. Platzhalter wie die anderen
 * Greybox-Zahlen: groß genug, um vor der Kiste zu stehen, klein genug, dass
 * die Parados-Oberkante darüber (Δy ≈ 2,2 m) nicht mehr zählt.
 */
export const DEPOT_REICHWEITE = 2.0;

/**
 * Nächstes verfügbares Munitionsdepot in Reichweite (AP5-02): die Id des
 * Abschnitts, dessen `depot` höchstens `reichweite` (3D) entfernt liegt und
 * für den `verfuegbar(id)` gilt — ein gefallener Abschnitt hat sein Depot
 * verloren (`AbschnittFront.depotVerloren`, KONZEPT.md §3 „die Uhr").
 * `null`, wenn keins passt. Rein.
 */
export function naechstesDepot(
  abschnitte: readonly Pick<FrontAbschnitt, "id" | "depot">[],
  pos: Vec3,
  reichweite: number,
  verfuegbar: (id: string) => boolean = () => true,
): string | null {
  let best: string | null = null;
  let bestAbstand = reichweite;
  for (const a of abschnitte) {
    const d = Math.hypot(
      a.depot.x - pos.x,
      a.depot.y - pos.y,
      a.depot.z - pos.z,
    );
    if (d <= bestAbstand && verfuegbar(a.id)) {
      best = a.id;
      bestAbstand = d;
    }
  }
  return best;
}
