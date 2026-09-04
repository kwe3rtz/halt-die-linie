// Der handgebaute Greybox-Sektor — das „H" aus KONZEPT.md §3 als reine Daten,
// aus den Rasterbausteinen von `./module` plus ein paar Roh-Quadern
// zusammengesetzt. EINE Quelle für Render-Meshes (`src/render`) und
// Sim-Collider (`src/sim/collision`).
//
// Von der Feindseite nach hinten: Feindzone → vorderes Labyrinth (Stub) →
// Frontlinie (Abschnitte A/B/C) → offenes Feld → Verbindungsgraben → Home-Line.
// Alle Maße sind Greybox-Startwerte (Ticket AP4-01), im Spieltest justiert.
// Kein Gameplay-Verhalten — nur die Bühne.
import type { Vec3 } from "../sim/math";
import type { Aabb, LevelBox } from "../sim/collision";
import type {
  NavGraph,
  NavKante,
  NavKnoten,
  SektorData,
  SektorMeta,
  ZonenId,
} from "../sim/sektor";
import { brescheTag } from "../sim/sektor";
import {
  modul,
  GRABEN_SOHLE,
  BRESCHE_BREITE,
  type ParapetLuecke,
} from "./module";

function raw(center: Vec3, size: Vec3): LevelBox {
  return { center, size };
}

// --- Breschen (AP4-03/06): EINE Quelle für Geometrie (getaggte Parapet-
//     Segmente) und Meta (`parapetBreschen`). Die Sim schaltet das Segment ab,
//     sobald die Bresche offen ist — dann ist die Bresche ein echtes Loch. ---
const BRESCHEN_A: Vec3[] = [{ x: -14, y: -0.4, z: 16 }];
const BRESCHEN_B: Vec3[] = [
  { x: -3, y: -0.4, z: 16 },
  { x: 3, y: -0.4, z: 16 },
];
const BRESCHEN_C: Vec3[] = [{ x: 14, y: -0.4, z: 16 }];
const BRESCHEN_H_WEST: Vec3[] = [{ x: -9, y: -0.4, z: -20 }];
const BRESCHEN_H_OST: Vec3[] = [{ x: 9, y: -0.4, z: -20 }];

/**
 * Lücken für `modul("parapet", at, 90, …)`: bei 90° zeigt die lokale
 * Längsachse nach −X (`drehXZ`), also `z_lokal = at.x − x_welt`.
 */
function breschenLuecken(
  id: string,
  at: Vec3,
  breschen: readonly Vec3[],
): ParapetLuecke[] {
  return breschen.map((b, i) => ({
    z: at.x - b.x,
    breite: BRESCHE_BREITE,
    tag: brescheTag(id, i),
  }));
}

function aabb(minX: number, minZ: number, maxX: number, maxZ: number): Aabb {
  // Zonen/Abschnitte sind Säulen über die volle Höhe — nur X/Z werden geprüft.
  return { minX, minY: -6, minZ, maxX, maxY: 10, maxZ };
}

const IN_GRABEN = GRABEN_SOHLE + 0.2; // Marker knapp über der Grabensohle
const AUF_FELD = 0.2; // Marker knapp über der Geländeoberkante
const FRONT_MIN_Z = 10;
const FRONT_MAX_Z = 17;

// ---------------------------------------------------------------------------
// Geometrie
// ---------------------------------------------------------------------------

const boxes: LevelBox[] = [
  // === Kartengrenze — hohe Sperrwände rundum ===============================
  ...modul("kartengrenze", { x: -25, y: 0, z: -38 }, 0, { laenge: 92 }),
  ...modul("kartengrenze", { x: 25, y: 0, z: -38 }, 0, { laenge: 92 }),
  ...modul("kartengrenze", { x: 25, y: 0, z: 53 }, 90, { laenge: 50 }), // Nordrand
  ...modul("kartengrenze", { x: 25, y: 0, z: -36.5 }, 90, { laenge: 50 }), // Home-Rückwand

  // === Vorderes Labyrinth (Stub) — Oberflächengelände + versetzte Wälle ====
  raw({ x: 0, y: -0.5, z: 34.5 }, { x: 50, y: 1, z: 37 }), // Boden (deckt Feindzone mit)
  // Drei versetzte Wälle mit ~4 m Versatz-Lücke (Wall 1/3 Lücke Ost, Wall 2
  // Lücke West) — leichtes Kanalisieren für den Nav-Graphen (AP4-02), kein
  // Irrgarten (KONZEPT.md §3 / Sparring R2: „keine sauberen Gassen").
  raw({ x: -13, y: 0.7, z: 42 }, { x: 22, y: 2.2, z: 1.5 }),
  raw({ x: 11, y: 0.7, z: 33 }, { x: 26, y: 2.2, z: 1.5 }),
  raw({ x: -13, y: 0.7, z: 24 }, { x: 22, y: 2.2, z: 1.5 }),
  // Trichter-Reste als Kanalisierungs-Boxen (abseits der Route).
  raw({ x: -20, y: 0.3, z: 29 }, { x: 3, y: 1.2, z: 3 }),
  raw({ x: 20, y: 0.3, z: 38 }, { x: 3, y: 1.2, z: 3 }),
  // Landmark — Beobachtungsturm-Ruine am Nordrand des Labyrinths, Fixpunkt
  // fürs Auge (schmal + hoch, damit es keine Nav-Gasse zunagelt).
  raw({ x: 0, y: 2, z: 45 }, { x: 2.4, y: 6, z: 2.4 }),

  // === Frontlinie =========================================================
  raw({ x: 0, y: GRABEN_SOHLE - 0.5, z: 13.65 }, { x: 50, y: 1, z: 6.7 }), // Grabensohle
  // Parapet je Abschnitt; ~5 m Sap-Lücken an den Abschnittsgrenzen + offene Enden.
  // Die Bresche-Stellen sind eigene, schaltbare Segmente (AP4-06).
  ...modul("parapet", { x: -11, y: 0, z: 16 }, 90, {
    laenge: 12,
    luecken: breschenLuecken("A", { x: -11, y: 0, z: 16 }, BRESCHEN_A),
  }), // Abschnitt A
  ...modul("parapet", { x: 6, y: 0, z: 16 }, 90, {
    laenge: 12,
    luecken: breschenLuecken("B", { x: 6, y: 0, z: 16 }, BRESCHEN_B),
  }), // Abschnitt B
  ...modul("parapet", { x: 23, y: 0, z: 16 }, 90, {
    laenge: 12,
    luecken: breschenLuecken("C", { x: 23, y: 0, z: 16 }, BRESCHEN_C),
  }), // Abschnitt C
  // Parados (Rückwand) — Lücken für 2 Rampen + die Verbindungsgraben-Mündung.
  raw({ x: -21.5, y: -0.6, z: 10.7 }, { x: 7, y: 2.4, z: 0.5 }),
  raw({ x: -8.5, y: -0.6, z: 10.7 }, { x: 11, y: 2.4, z: 0.5 }),
  raw({ x: 8.5, y: -0.6, z: 10.7 }, { x: 11, y: 2.4, z: 0.5 }),
  raw({ x: 21.5, y: -0.6, z: 10.7 }, { x: 7, y: 2.4, z: 0.5 }),
  // Rampen Feld → Frontgraben (ohne Sprung begehbar).
  ...modul("rampe", { x: -16, y: 0, z: 10.3 }, 0, { laenge: 4, breite: 4 }),
  ...modul("rampe", { x: 16, y: 0, z: 10.3 }, 0, { laenge: 4, breite: 4 }),
  // Endrampen Frontgraben → Labyrinth-Oberfläche (an den offenen Frontenden).
  ...modul("rampe", { x: -22, y: 0, z: 17 }, 180, { laenge: 4, breite: 4 }),
  ...modul("rampe", { x: 22, y: 0, z: 17 }, 180, { laenge: 4, breite: 4 }),

  // === Offenes Feld — ebener Boden, Schlitz für den Verbindungsgraben ======
  raw({ x: -13.6, y: -0.5, z: -4.95 }, { x: 22.8, y: 1, z: 31.1 }),
  raw({ x: 13.6, y: -0.5, z: -4.95 }, { x: 22.8, y: 1, z: 31.1 }),

  // === Verbindungsgraben — zentrale gedeckte Route (gerade; Knicke/Nischen
  //     aus KONZEPT.md §3 sind Feinschliff, siehe TODO(Rückfrage) unten) =====
  raw({ x: 0, y: GRABEN_SOHLE - 0.5, z: -5 }, { x: 3.6, y: 1, z: 33 }),
  raw({ x: -2.0, y: -0.55, z: -5 }, { x: 0.4, y: 2.5, z: 33 }),
  raw({ x: 2.0, y: -0.55, z: -5 }, { x: 0.4, y: 2.5, z: 33 }),

  // === Home-Line ==========================================================
  raw({ x: 0, y: GRABEN_SOHLE - 0.5, z: -28 }, { x: 50, y: 1, z: 16 }), // Grabensohle
  // Nach Norden gerichtetes Parapet über die Mitte — Lücke für den Graben,
  // Flanken offen (Feld-Zugänge links/rechts).
  ...modul("parapet", { x: -2, y: 0, z: -20 }, 90, {
    laenge: 14,
    luecken: breschenLuecken(
      "H-West",
      { x: -2, y: 0, z: -20 },
      BRESCHEN_H_WEST,
    ),
  }),
  ...modul("parapet", { x: 16, y: 0, z: -20 }, 90, {
    laenge: 14,
    luecken: breschenLuecken("H-Ost", { x: 16, y: 0, z: -20 }, BRESCHEN_H_OST),
  }),
  // Flankenrampen Feld → Home-Graben.
  ...modul("rampe", { x: -20, y: 0, z: -20 }, 180, { laenge: 4, breite: 4 }),
  ...modul("rampe", { x: 20, y: 0, z: -20 }, 180, { laenge: 4, breite: 4 }),
  // Drei begehbare Unterstände in der Süd-Grabenwand (Munition / Verband / Kdr.).
  ...modul("unterstand", { x: -12, y: GRABEN_SOHLE, z: -32 }, 180, {
    breite: 3.5,
    laenge: 3.5,
  }),
  ...modul("unterstand", { x: 0, y: GRABEN_SOHLE, z: -32 }, 180, {
    breite: 3.5,
    laenge: 3.5,
  }),
  ...modul("unterstand", { x: 12, y: GRABEN_SOHLE, z: -32 }, 180, {
    breite: 3.5,
    laenge: 3.5,
  }),
];

// ---------------------------------------------------------------------------
// Nav-Graph (AP4-02) — handgepflegt entlang der begehbaren Route
// ---------------------------------------------------------------------------

function nk(
  id: string,
  x: number,
  z: number,
  zone: ZonenId,
  y = AUF_FELD,
): NavKnoten {
  return { id, pos: { x, y, z }, zone };
}

/** Engstelle (AP4-06): exakt durchlaufen, keine Ecke schneiden. */
function eng(k: NavKnoten): NavKnoten {
  return { ...k, engstelle: true };
}

const navKnoten: NavKnoten[] = [
  // Anmarsch (Nordrand des Labyrinths — die zwei schrägen Korridore)
  nk("anmarsch-west", -10, 44, "labyrinth"),
  nk("anmarsch-ost", 10, 44, "labyrinth"),
  // Labyrinth-Serpentine durch die drei Wall-Lücken (1/3 Ost, 2 West)
  nk("lab-tor1", 2, 40, "labyrinth"),
  nk("lab-tor2", -8, 31, "labyrinth"),
  nk("lab-tor3", 2, 23, "labyrinth"),
  nk("lab-vorfront", 0, 19, "labyrinth"),
  // Verdeckte Verstärkungs-Knoten (Infiltration; aktiv bei „Abschnitt verloren").
  // reinforcement-A liegt frei nördlich des Trichter-Rests bei (−20, 29)
  // (AP4-06: der Begehbarkeits-Test fand den alten Knoten im Trichter-Quader).
  nk("reinforcement-A", -20, 33, "labyrinth"),
  nk("reinforcement-B", 6, 37, "labyrinth"),
  nk("reinforcement-C", 20, 30, "labyrinth"),
  // Front — Sap-Zugänge und Bresche-Kontaktpunkte liegen auf Geländeniveau
  // (der Feind tritt von der Oberfläche in die Lücke und fällt in den Graben),
  // Grabenknoten auf der Sohle.
  eng(nk("sap-ab", -8.5, 16, "frontlinie")),
  eng(nk("sap-bc", 8.5, 16, "frontlinie")),
  nk("front-A", -14, 13, "frontlinie", IN_GRABEN),
  nk("front-B", 0, 13, "frontlinie", IN_GRABEN),
  nk("front-C", 14, 13, "frontlinie", IN_GRABEN),
  // Je Abschnitt EIN Bresche-Knoten, auf der ersten Bresche des Abschnitts
  // (AP4-06: der Begehbarkeits-Test fand `bresche-B` bei x=0 in der festen
  // Wand zwischen B's zwei Breschen). Die Sim öffnet die Kante genau dann, wenn
  // die Bresche unter diesem Knoten offen ist.
  // TODO(Rückfrage): B's zweite Bresche (x=+3) hat keinen eigenen Nav-Knoten —
  // ein Knoten je Bresche braucht eine allgemeinere Id-Konvention als
  // `bresche-<abschnitt>` (Politur-Ticket „Sektor-Wissen aus der Sim").
  eng(nk("bresche-A", BRESCHEN_A[0]!.x, 16, "frontlinie")),
  eng(nk("bresche-B", BRESCHEN_B[0]!.x, 16, "frontlinie")),
  eng(nk("bresche-C", BRESCHEN_C[0]!.x, 16, "frontlinie")),
  // Rückwege: Parados-Rampen (Knoten auf der obersten Rampenstufe, −0,45),
  // Feld, Verbindungsgraben, Home. Rampen-Lücken und Grabenmündung sind
  // Engstellen (AP4-06: schräg „erreicht" landete der Gegner neben der Lücke).
  eng(nk("parados-A", -16, 11, "frontlinie", -0.4)),
  eng(nk("parados-C", 16, 11, "frontlinie", -0.4)),
  eng(nk("graben-mund", 0, 10, "verbindungsgraben", IN_GRABEN)),
  nk("feld-links", -14, -2, "feld"),
  nk("feld-rechts", 14, -2, "feld"),
  nk("graben-mitte", 0, -6, "verbindungsgraben", IN_GRABEN),
  nk("graben-sued", 0, -18, "verbindungsgraben", IN_GRABEN),
  nk("home-graben", 0, -22, "homeline", IN_GRABEN),
  nk("home-feld-links", -18, -21, "homeline"),
  nk("home-feld-rechts", 18, -21, "homeline"),
  nk("home-ziel", 0, -30, "homeline", IN_GRABEN),
];

const auf = (von: string, nach: string): NavKante => ({
  von,
  nach,
  offen: true,
});
const zu = (von: string, nach: string): NavKante => ({
  von,
  nach,
  offen: false,
});

const navKanten: NavKante[] = [
  // Anmarsch → Labyrinth-Serpentine
  auf("anmarsch-west", "lab-tor1"),
  auf("anmarsch-ost", "lab-tor1"),
  auf("lab-tor1", "lab-tor2"),
  auf("lab-tor2", "lab-tor3"),
  auf("lab-tor3", "lab-vorfront"),
  // Verstärkungs-Knoten an den Graphen hängen (immer offen — sind im Labyrinth)
  auf("reinforcement-A", "lab-tor2"),
  auf("reinforcement-A", "lab-tor3"),
  auf("reinforcement-B", "lab-tor1"),
  auf("reinforcement-B", "lab-tor2"),
  auf("reinforcement-C", "lab-tor3"),
  auf("reinforcement-C", "lab-tor2"),
  // Labyrinth → Front (Sap-Lücken; immer offen)
  auf("lab-vorfront", "sap-ab"),
  auf("lab-vorfront", "sap-bc"),
  auf("sap-ab", "front-A"),
  auf("sap-ab", "front-B"),
  auf("sap-bc", "front-B"),
  auf("sap-bc", "front-C"),
  auf("front-A", "front-B"),
  auf("front-B", "front-C"),
  // Bresche-Kontakte: an den Graben gehängt; die Kante Labyrinth→Bresche ist
  // zu und öffnet erst, wenn AP4-03 das Parapet aufreißt.
  auf("front-A", "bresche-A"),
  auf("front-B", "bresche-B"),
  auf("front-C", "bresche-C"),
  zu("bresche-A", "lab-vorfront"),
  zu("bresche-B", "lab-vorfront"),
  zu("bresche-C", "lab-vorfront"),
  // Front → hinten: die drei Tore (starten zu; AP4-03 öffnet sie beim Fall)
  zu("front-A", "parados-A"),
  zu("front-B", "graben-mund"),
  zu("front-C", "parados-C"),
  // Hinten: Feld / Verbindungsgraben / Home (Gelände immer begehbar)
  auf("parados-A", "feld-links"),
  auf("parados-C", "feld-rechts"),
  auf("feld-links", "home-feld-links"),
  auf("feld-rechts", "home-feld-rechts"),
  auf("graben-mund", "graben-mitte"),
  auf("graben-mitte", "graben-sued"),
  auf("graben-sued", "home-graben"),
  auf("home-graben", "home-ziel"),
  auf("home-feld-links", "home-ziel"),
  auf("home-feld-rechts", "home-ziel"),
];

const navGraph: NavGraph = { knoten: navKnoten, kanten: navKanten };

// ---------------------------------------------------------------------------
// Semantische Metadaten
// ---------------------------------------------------------------------------

const meta: SektorMeta = {
  // Reihenfolge = Priorität bei Überlappung (Verbindungsgraben vor Feld/Front).
  zonen: [
    { id: "feindzone", bounds: aabb(-25, 47, 25, 53) },
    { id: "labyrinth", bounds: aabb(-25, 16, 25, 47) },
    { id: "verbindungsgraben", bounds: aabb(-3, -20, 3, 11) },
    { id: "frontlinie", bounds: aabb(-25, FRONT_MIN_Z, 25, FRONT_MAX_Z) },
    { id: "homeline", bounds: aabb(-25, -36.5, 25, -20) },
    { id: "feld", bounds: aabb(-25, -20, 25, 10) },
  ],
  // Depots = Munitionskisten (AP5-02): an der Front hinter dem Feuertritt an
  // der Parados-Rückwand (aus der Schusslinie; A/C neben den Rampen, B neben
  // der Grabenmündung), an der Home-Line im Munitionslager-Unterstand. Ein
  // gefallener Abschnitt verliert sein Depot (`depotVerloren`).
  frontAbschnitte: [
    {
      id: "A",
      bounds: aabb(-25, FRONT_MIN_Z, -8, FRONT_MAX_Z),
      parapetBreschen: BRESCHEN_A,
      bauSlots: [
        { x: -15, y: IN_GRABEN, z: 13 },
        { x: -11, y: IN_GRABEN, z: 13 },
      ],
      depot: { x: -20, y: IN_GRABEN, z: 11.5 },
    },
    {
      id: "B",
      bounds: aabb(-8, FRONT_MIN_Z, 8, FRONT_MAX_Z),
      parapetBreschen: BRESCHEN_B,
      bauSlots: [
        { x: -3, y: IN_GRABEN, z: 13 },
        { x: 3, y: IN_GRABEN, z: 13 },
      ],
      depot: { x: 3, y: IN_GRABEN, z: 11.5 },
    },
    {
      id: "C",
      bounds: aabb(8, FRONT_MIN_Z, 25, FRONT_MAX_Z),
      parapetBreschen: BRESCHEN_C,
      bauSlots: [
        { x: 11, y: IN_GRABEN, z: 13 },
        { x: 15, y: IN_GRABEN, z: 13 },
      ],
      depot: { x: 20, y: IN_GRABEN, z: 11.5 },
    },
  ],
  // Home-Line: zwei Abschnitte um das Nordparapet (Lücke = Verbindungsgraben-
  // Mündung). Dieselbe front.ts-Maschine, aber befestigt (createFrontState-
  // Faktor in index.ts) — der Feind bricht hier nur nach langem Druck durch.
  homeAbschnitte: [
    {
      id: "H-West",
      bounds: aabb(-25, -36.5, 0, -19),
      parapetBreschen: BRESCHEN_H_WEST,
      bauSlots: [{ x: -9, y: IN_GRABEN, z: -23 }],
      depot: { x: -12, y: IN_GRABEN, z: -33.5 },
    },
    {
      id: "H-Ost",
      bounds: aabb(0, -36.5, 25, -19),
      parapetBreschen: BRESCHEN_H_OST,
      bauSlots: [{ x: 9, y: IN_GRABEN, z: -23 }],
      depot: { x: 12, y: IN_GRABEN, z: -33.5 },
    },
  ],
  feindAnmarsch: [
    { x: -10, y: AUF_FELD, z: 44 },
    { x: 10, y: AUF_FELD, z: 44 },
  ],
  homeZugaenge: [
    { id: "verbindungsgraben", pos: { x: 0, y: IN_GRABEN, z: -20 } },
    { id: "feld-links", pos: { x: -20, y: AUF_FELD, z: -20 } },
    { id: "feld-rechts", pos: { x: 20, y: AUF_FELD, z: -20 } },
  ],
  landmark: { x: 0, y: 0, z: 45 },
  // Leit-Spines (AP4-05): je Route eigene Farbe + geometrisches Symbol, damit
  // ein Tester von jedem Frontabschnitt der Wand/den Pfosten zur Home-Line
  // folgen kann. Polylinien Front → Home, ~Brusthöhe (im Graben y≈−0,5, im Feld
  // y≈1,0). Ids = Callout-Grammatik.
  spineRouten: [
    {
      id: "verbindungsgraben",
      farbe: [0.92, 0.78, 0.2], // gelb
      symbol: "dreieck",
      punkte: [
        { x: 1.7, y: -0.5, z: 12 },
        { x: 1.7, y: -0.5, z: 4 },
        { x: 1.7, y: -0.5, z: -6 },
        { x: 1.7, y: -0.5, z: -15 },
        { x: 1.7, y: -0.5, z: -21 },
      ],
    },
    {
      id: "feld-links",
      farbe: [0.9, 0.9, 0.86], // weiß
      symbol: "doppelstrich",
      punkte: [
        { x: -15.5, y: -0.4, z: 12 },
        { x: -16.5, y: 1.0, z: 6 },
        { x: -18, y: 1.0, z: -3 },
        { x: -19, y: 1.0, z: -13 },
        { x: -19, y: -0.4, z: -21 },
      ],
    },
    {
      id: "feld-rechts",
      farbe: [0.3, 0.72, 0.82], // cyan
      symbol: "kreis",
      punkte: [
        { x: 15.5, y: -0.4, z: 12 },
        { x: 16.5, y: 1.0, z: 6 },
        { x: 18, y: 1.0, z: -3 },
        { x: 19, y: 1.0, z: -13 },
        { x: 19, y: -0.4, z: -21 },
      ],
    },
  ],
  spielerSpawn: [
    { x: 0, y: -1.4, z: 13 },
    { x: -12, y: -1.4, z: 13 },
    { x: 12, y: -1.4, z: 13 },
  ],
  navGraph,
};

// TODO(Rückfrage): Der Verbindungsgraben ist im Greybox gerade ausgeführt; die
// „2 Knicke mit kleinen defensiven Nischen" (KONZEPT.md §3 / AP4-01-Tabelle) und
// die Feld-Tiefe ~40 m (hier ~31 m, an die ~28-m-Grabenlänge angeglichen) sind
// als Greybox-Startwerte bewusst konservativ — im Spieltest bzw. mit AP4-04
// (Sprengbarriere als Rückzugs-Notbremse) justieren.

export const sektorGreybox: SektorData = {
  boxes,
  spawnPoints: meta.spielerSpawn,
  enemySpawnPoints: meta.feindAnmarsch,
  meta,
};
