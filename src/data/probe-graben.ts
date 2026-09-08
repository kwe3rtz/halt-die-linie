// AP6-01c — isolierte Probe-Szene für den Graben-Look (`?probe`-Dev-Szene).
//
// Zweck: den tiefen, verkleideten Graben-Look **einmal voll ausdetailliert**
// zeigen, damit der Nutzer ihn anspielt, bevor AP6-01d ihn auf den ganzen
// Sektor rollt. Bewusst KEIN `SektorMeta` (keine Zonen, kein Nav, keine
// Wellen) — `createSim` nimmt das als schlichtes `LevelData`, der echte Sektor
// (`sektor.ts`) bleibt unberührt, kein Golden-Anker-Risiko.
//
// Enthält (Ticket AP6-01c §4): 1 tiefe Feuernische (verkleidet, 4-Stufen-
// Feuertritt, Parapet mit Sandsack-Krone, Laufrost) · 1 Erd-Traverse ·
// ~7 m Verbindungsgraben-Stumpf · 1 echter Abstiegs-Unterstand (Treppe hinab,
// Raum unter der Sohle mit Kopffreiheit).
//
// Achsen wie im Sektor: +Z = Feindseite (Norden), −Z = Hinterland (Süden).
import type { Vec3 } from "../sim/math";
import type { LevelBox, LevelData, Oberflaeche } from "../sim/collision";
import {
  abstiegUnterstand,
  abstiegUnterstandLoch,
  feuertrittTief,
  laufrost,
  materialBox,
  sandsackKrone,
  verkleidung,
  BRUSTWEHR_TIEF,
  FEUERTRITT_TIEF,
  PARADOS_KRONE_TIEF,
  PARAPET_KRONE_TIEF,
  SOHLE_TIEF,
  type WandSegment,
} from "./module";

const SOHLE = SOHLE_TIEF; // −2,7
const CATCH_UNTEN = SOHLE - 0.6; // −3,3

/** Erd-/Kulissenblock ohne Materialfeld (Renderer-Greybox-Fallback). */
function erde(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): LevelBox {
  return {
    center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2 },
    size: {
      x: Math.abs(x1 - x0),
      y: Math.abs(y1 - y0),
      z: Math.abs(z1 - z0),
    },
  };
}

interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Deckt `aussen` mit achsenparallelen Platten [y0, y1] ab und lässt jedes
 * Rechteck in `loecher` frei — für den Hinterland-Boden mit Graben-Schlitz +
 * Unterstand-Aussparung.
 */
function bodenPlatten(
  aussen: Rect,
  loecher: Rect[],
  y0: number,
  y1: number,
  oberflaeche?: Oberflaeche,
): LevelBox[] {
  const uniq = (ns: number[]): number[] =>
    [...new Set(ns.map((n) => Number(n.toFixed(4))))].sort((a, b) => a - b);
  const xs = uniq(
    [
      aussen.minX,
      aussen.maxX,
      ...loecher.flatMap((l) => [l.minX, l.maxX]),
    ].filter((x) => x >= aussen.minX - 1e-6 && x <= aussen.maxX + 1e-6),
  );
  const zs = uniq(
    [
      aussen.minZ,
      aussen.maxZ,
      ...loecher.flatMap((l) => [l.minZ, l.maxZ]),
    ].filter((z) => z >= aussen.minZ - 1e-6 && z <= aussen.maxZ + 1e-6),
  );
  const out: LevelBox[] = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    for (let j = 0; j < zs.length - 1; j += 1) {
      const cx = (xs[i]! + xs[i + 1]!) / 2;
      const cz = (zs[j]! + zs[j + 1]!) / 2;
      const imLoch = loecher.some(
        (l) => cx > l.minX && cx < l.maxX && cz > l.minZ && cz < l.maxZ,
      );
      if (imLoch) {
        continue;
      }
      out.push(
        oberflaeche
          ? materialBox(
              xs[i]!,
              xs[i + 1]!,
              y0,
              y1,
              zs[j]!,
              zs[j + 1]!,
              oberflaeche,
            )
          : erde(xs[i]!, xs[i + 1]!, y0, y1, zs[j]!, zs[j + 1]!),
      );
    }
  }
  return out;
}

// --- Feuernische (Feuergraben-Stück) ---------------------------------------
// Laufgang x −5,5…9 · Brustwehr z 2,6…4,4 · Parados z −2,6…−1,4 · lichte Weite
// an der Sohle (Feuertritt-Fuß z 0,6 → Parados z −1,4) = 2,0 m.
const NISCHE_X0 = -5.5;
const NISCHE_X1 = 9.0;
const BW_Z0 = 2.6; // Brustwehr-Innenkante (Feuertritt lehnt hier an)
const BW_Z1 = 4.4;
const PARADOS_Z0 = -2.6;
const PARADOS_Z1 = -1.4;
const FEUERTRITT_Z0 = 0.6; // grabenseitige Kante der untersten Stufe

// Traverse teilt die Feuerlinie in eine West- und eine Ost-Feuerbucht.
const TRAV_X0 = 1.0;
const TRAV_X1 = 3.0;

// Verbindungsgraben-Stumpf: zweigt am West-Ende nach −Z ab.
const VG_X0 = -5.5;
const VG_X1 = -3.5;
const VG_Z_MUND = PARADOS_Z1; // −1,4
const VG_Z_ENDE = -9.0; // hier der Treppenschacht

// Abstiegs-Unterstand: Schacht in der VG-Sohle, Raum weiter nach −Z. Der Helfer
// legt die Erd-Kappe über die Decke selbst (`kappeBis: 0`).
const US_SCHACHT: Vec3 = { x: (VG_X0 + VG_X1) / 2, y: SOHLE, z: VG_Z_ENDE };
const us = abstiegUnterstand({
  schacht: US_SCHACHT,
  richtungZ: -1,
  kappeBis: 0,
});
const usLoch = abstiegUnterstandLoch({ schacht: US_SCHACHT, richtungZ: -1 });

const wand = (
  a: { x: number; z: number },
  b: { x: number; z: number },
  krone: number,
  normale: { x: number; z: number },
): WandSegment => ({ a, b, sohle: SOHLE, krone, normale });

const boxes: LevelBox[] = [
  // === Sohle-Auffangboden (nur unter den offenen Kanälen) ===================
  // Feuernische (Laufgang + Feuertritt-Zone).
  erde(NISCHE_X0 - 0.5, NISCHE_X1 + 0.5, CATCH_UNTEN, SOHLE, PARADOS_Z1, BW_Z1),
  // Verbindungsgraben-Stumpf bis an den Schacht (der Schacht z < −9 wird von der
  // Treppe getragen, oben offen).
  erde(
    VG_X0 - 0.6,
    VG_X1 + 0.6,
    CATCH_UNTEN,
    SOHLE,
    VG_Z_ENDE - 0.2,
    FEUERTRITT_Z0,
  ),

  // === Feuernische: Erd-Basiswände ========================================
  // Brustwehr (Erde, dick) — Oberkante BRUSTWEHR_TIEF (> STEP_HEIGHT übers Feld).
  erde(
    NISCHE_X0 - 0.5,
    NISCHE_X1 + 0.5,
    CATCH_UNTEN,
    BRUSTWEHR_TIEF,
    BW_Z0,
    BW_Z1,
  ),
  // Parados (Rückwand, flach) — unter Druck rausklettern. Lücke x −5,5…−3,0
  // ist die Verbindungsgraben-Mündung.
  erde(
    -3.0,
    NISCHE_X1 + 0.5,
    CATCH_UNTEN,
    PARADOS_KRONE_TIEF,
    PARADOS_Z0,
    PARADOS_Z1,
  ),
  // West-Stirnwand + Ost-Stirnwand der Nische.
  erde(
    NISCHE_X0 - 0.5,
    NISCHE_X0,
    CATCH_UNTEN,
    BRUSTWEHR_TIEF,
    PARADOS_Z0,
    BW_Z1,
  ),
  erde(
    NISCHE_X1,
    NISCHE_X1 + 0.5,
    CATCH_UNTEN,
    BRUSTWEHR_TIEF,
    PARADOS_Z0,
    BW_Z1,
  ),
  // Erd-Traverse (der „Zahn") — teilt die Feuerlinie.
  erde(TRAV_X0, TRAV_X1, CATCH_UNTEN, 0.45, FEUERTRITT_Z0, BW_Z1),

  // === Feuernische: Verkleidung + Feuertritt + Krone + Laufrost ============
  // Brustwehr-Innenseite verkleidet (erst über der Bank, damit die Pfosten
  // die Feuertritt-Fläche nicht verstellen).
  ...verkleidung(
    wand(
      { x: NISCHE_X0, z: BW_Z0 },
      { x: NISCHE_X1, z: BW_Z0 },
      BRUSTWEHR_TIEF,
      { x: 0, z: -1 },
    ),
    { vonY: FEUERTRITT_TIEF },
  ),
  ...sandsackKrone(
    wand(
      { x: NISCHE_X0, z: BW_Z0 },
      { x: NISCHE_X1, z: BW_Z0 },
      BRUSTWEHR_TIEF,
      { x: 0, z: -1 },
    ),
    { oberkante: PARAPET_KRONE_TIEF },
  ),
  // West-Stirnwand verkleidet.
  ...verkleidung(
    wand(
      { x: NISCHE_X0, z: PARADOS_Z1 },
      { x: NISCHE_X0, z: BW_Z0 },
      BRUSTWEHR_TIEF,
      { x: 1, z: 0 },
    ),
  ),
  // Traverse beidseitig verkleidet.
  ...verkleidung(
    wand({ x: TRAV_X0, z: FEUERTRITT_Z0 }, { x: TRAV_X0, z: BW_Z0 }, 0.45, {
      x: -1,
      z: 0,
    }),
  ),
  ...verkleidung(
    wand({ x: TRAV_X1, z: FEUERTRITT_Z0 }, { x: TRAV_X1, z: BW_Z0 }, 0.45, {
      x: 1,
      z: 0,
    }),
  ),
  // Parados-Innenseite verkleidet + niedrige Sandsackreihe.
  ...verkleidung(
    wand(
      { x: -3.0, z: PARADOS_Z1 },
      { x: NISCHE_X1, z: PARADOS_Z1 },
      PARADOS_KRONE_TIEF,
      { x: 0, z: 1 },
    ),
  ),
  ...sandsackKrone(
    wand(
      { x: -3.0, z: PARADOS_Z1 },
      { x: NISCHE_X1, z: PARADOS_Z1 },
      PARADOS_KRONE_TIEF,
      { x: 0, z: 1 },
    ),
    { oberkante: PARADOS_KRONE_TIEF, luecke: 0.1 },
  ),
  // Feuertritt: vier flache Stufen je Feuerbucht (West / Ost der Traverse).
  ...feuertrittTief({
    minX: NISCHE_X0,
    maxX: TRAV_X0,
    zToe: FEUERTRITT_Z0,
    zWand: BW_Z0,
  }),
  ...feuertrittTief({
    minX: TRAV_X1,
    maxX: NISCHE_X1,
    zToe: FEUERTRITT_Z0,
    zWand: BW_Z0,
  }),
  // Laufrost über der Laufgang-Sohle.
  ...laufrost({
    minX: NISCHE_X0,
    maxX: NISCHE_X1,
    minZ: PARADOS_Z1,
    maxZ: FEUERTRITT_Z0,
    sohle: SOHLE,
  }),

  // === Verbindungsgraben-Stumpf ==========================================
  // Wände (Erde) + Verkleidung; Laufrost.
  erde(
    VG_X0 - 0.5,
    VG_X0,
    CATCH_UNTEN,
    BRUSTWEHR_TIEF,
    VG_Z_ENDE - 0.5,
    VG_Z_MUND + 0.2,
  ),
  erde(
    VG_X1,
    VG_X1 + 0.5,
    CATCH_UNTEN,
    BRUSTWEHR_TIEF,
    VG_Z_ENDE - 0.5,
    VG_Z_MUND + 0.2,
  ),
  ...verkleidung(
    wand(
      { x: VG_X0, z: VG_Z_ENDE },
      { x: VG_X0, z: VG_Z_MUND },
      BRUSTWEHR_TIEF,
      { x: 1, z: 0 },
    ),
  ),
  ...verkleidung(
    wand(
      { x: VG_X1, z: VG_Z_ENDE },
      { x: VG_X1, z: VG_Z_MUND },
      BRUSTWEHR_TIEF,
      { x: -1, z: 0 },
    ),
  ),
  ...laufrost({
    minX: VG_X0,
    maxX: VG_X1,
    minZ: VG_Z_ENDE,
    maxZ: VG_Z_MUND,
    sohle: SOHLE,
  }),

  // === Abstiegs-Unterstand (inkl. eigener Erd-Kappe über der Decke) =======
  ...us,

  // === Umland / Kulisse ==================================================
  // Feindseiten-Feld (y = 0) — Blickziel „über die Kimme".
  erde(-11, 13, -2.0, 0.0, BW_Z1, 12),
  // Hinterland-Feld (y = 0) mit Verbindungsgraben-Schlitz + Unterstand-
  // Aussparung (der Helfer deckt den gedeckten Raum-Teil per Kappe wieder ab).
  ...bodenPlatten(
    { minX: -11, maxX: 13, minZ: -17, maxZ: PARADOS_Z0 },
    [{ minX: VG_X0, maxX: VG_X1, minZ: -17, maxZ: PARADOS_Z0 }, usLoch],
    -2.0,
    0.0,
  ),
];

/**
 * Statische Orientierungs-Lichter — in AP6-01d aus `meta.lichter`, hier hart
 * platziert (Ticket §4). Der Renderer setzt je Punkt einen kleinen Strahler
 * (Reichweite 15 m) + eine „Feuertonne". Sparsam gesetzt: der offene Graben
 * lebt vom globalen Mond-Ambient, nur der geschlossene Unterstand + ein
 * Laufgang-Akzent brauchen echtes Licht (Reichweite 15 m füllt in der engen
 * Probe-Szene sonst schnell alles aus).
 */
export const probeGrabenLichter: readonly Vec3[] = [
  { x: -1.5, y: -2.3, z: -0.6 }, // Laufgang-Akzent (Spawn)
  { x: -4.5, y: -4.3, z: -12.6 }, // im Unterstand (geschlossen — Pflicht)
];

export const probeGraben: LevelData = {
  boxes,
  // Spawn im Laufgang der Feuernische, klar zwischen Traverse und West-Ende.
  spawnPoints: [{ x: -1.5, y: SOHLE + 0.6, z: -0.4 }],
};
