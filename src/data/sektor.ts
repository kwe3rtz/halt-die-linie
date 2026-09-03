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
import type { SektorData, SektorMeta } from "../sim/sektor";
import { modul, GRABEN_SOHLE } from "./module";

function raw(center: Vec3, size: Vec3): LevelBox {
  return { center, size };
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
  // Vier versetzte Wälle (keine sauberen Gassen, KONZEPT.md §3 / Sparring R2).
  raw({ x: 8, y: 0.7, z: 44 }, { x: 28, y: 2.2, z: 1.5 }),
  raw({ x: -8, y: 0.7, z: 38 }, { x: 28, y: 2.2, z: 1.5 }),
  raw({ x: 9, y: 0.7, z: 30 }, { x: 26, y: 2.2, z: 1.5 }),
  raw({ x: -9, y: 0.7, z: 23 }, { x: 26, y: 2.2, z: 1.5 }),
  // Trichter-Reste als Kanalisierungs-Boxen.
  raw({ x: -16, y: 0.3, z: 26 }, { x: 3.5, y: 1.2, z: 3.5 }),
  raw({ x: 17, y: 0.3, z: 34 }, { x: 3.5, y: 1.2, z: 3.5 }),
  // Landmark — Panzerwrack-Hulk, Fixpunkt fürs Auge.
  raw({ x: 0, y: 1.5, z: 41 }, { x: 5, y: 5, z: 5 }),

  // === Frontlinie =========================================================
  raw({ x: 0, y: GRABEN_SOHLE - 0.5, z: 13.65 }, { x: 50, y: 1, z: 6.7 }), // Grabensohle
  ...modul("parapet", { x: -8, y: 0, z: 16 }, 90, { laenge: 12 }), // Abschnitt A
  ...modul("parapet", { x: 6, y: 0, z: 16 }, 90, { laenge: 12 }), // Abschnitt B
  ...modul("parapet", { x: 20, y: 0, z: 16 }, 90, { laenge: 12 }), // Abschnitt C
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
  ...modul("parapet", { x: -2, y: 0, z: -20 }, 90, { laenge: 14 }),
  ...modul("parapet", { x: 16, y: 0, z: -20 }, 90, { laenge: 14 }),
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
  frontAbschnitte: [
    {
      id: "A",
      bounds: aabb(-25, FRONT_MIN_Z, -8, FRONT_MAX_Z),
      parapetBreschen: [{ x: -14, y: -0.4, z: 16 }],
      bauSlots: [
        { x: -15, y: IN_GRABEN, z: 13 },
        { x: -11, y: IN_GRABEN, z: 13 },
      ],
      depot: { x: -16, y: IN_GRABEN, z: 12 },
    },
    {
      id: "B",
      bounds: aabb(-8, FRONT_MIN_Z, 8, FRONT_MAX_Z),
      parapetBreschen: [
        { x: -3, y: -0.4, z: 16 },
        { x: 3, y: -0.4, z: 16 },
      ],
      bauSlots: [
        { x: -3, y: IN_GRABEN, z: 13 },
        { x: 3, y: IN_GRABEN, z: 13 },
      ],
      depot: { x: 0, y: IN_GRABEN, z: 12 },
    },
    {
      id: "C",
      bounds: aabb(8, FRONT_MIN_Z, 25, FRONT_MAX_Z),
      parapetBreschen: [{ x: 14, y: -0.4, z: 16 }],
      bauSlots: [
        { x: 11, y: IN_GRABEN, z: 13 },
        { x: 15, y: IN_GRABEN, z: 13 },
      ],
      depot: { x: 16, y: IN_GRABEN, z: 12 },
    },
  ],
  feindAnmarsch: [
    { x: -22, y: AUF_FELD, z: 48 },
    { x: 22, y: AUF_FELD, z: 48 },
  ],
  homeZugaenge: [
    { id: "verbindungsgraben", pos: { x: 0, y: IN_GRABEN, z: -20 } },
    { id: "feld-links", pos: { x: -20, y: AUF_FELD, z: -20 } },
    { id: "feld-rechts", pos: { x: 20, y: AUF_FELD, z: -20 } },
  ],
  landmark: { x: 0, y: 0, z: 41 },
  spielerSpawn: [
    { x: 0, y: -1.4, z: 13 },
    { x: -12, y: -1.4, z: 13 },
    { x: 12, y: -1.4, z: 13 },
  ],
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
