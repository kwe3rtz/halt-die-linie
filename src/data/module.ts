// Rasterbaukasten für den handgebauten Greybox-Sektor (AP4-01). Jedes Modul
// liefert achsenparallele Quader (`LevelBox`) — die EINE Quelle für Render-
// Meshes (`src/render`) und Sim-Collider (`src/sim/collision`). Grobe
// Platzhalter-Geometrie, kein Balancing, keine Art.
//
// Bewusst klein und datengetrieben: derselbe Baukasten soll später der
// prozedurale Generator fürs vordere Labyrinth nutzen (KONZEPT.md §3 / §9.5).
// Keine Abstraktion über das hier Gebrauchte hinaus.
import type { Vec3 } from "../sim/math";
import type { LevelBox } from "../sim/collision";

/** Rastermaß in Metern — das Modulmaß, auf das der Sektor aufgebaut ist. */
export const RASTER = 4;

// --- Vertikale Greybox-Kennwerte (Welt-Y). Startwerte, im Spieltest justiert
//     (KONZEPT.md §3 „Maßstab kompakt halten"; AP4-01-Ticket-Tabelle). ---

/** Geländeoberkante: Feld, Labyrinth, Parados, Home-Boden. */
export const OBERFLAECHE = 0;
/** Grabensohle: Frontgraben, Verbindungsgraben, Home-Graben. */
export const GRABEN_SOHLE = -1.8;
/** Feuertritt-Oberkante — über zwei Stufen von der Sohle, ohne Sprung begehbar. */
export const FEUERTRITT_OBERKANTE = -0.95;
/**
 * Parapet-Oberkante. Auf dem Feuertritt stehend liegt das Auge bei
 * −0,95 + PLAYER_EYE(1,6) = +0,65 — also ~0,1 m über der Brustwehr.
 * // TODO(Rückfrage): enge Marge; PLAYER_EYE (src/sim/index.ts) ist Platzhalter
 * und nicht importierbar. Beim ersten Spieltest gegenchecken; ggf. Parapet
 * senken oder Feuertritt heben.
 */
export const PARAPET_OBERKANTE = 0.55;

const WAND = 0.4; // Wandstärke
const GRENZE_HOEHE = 6; // Kartengrenze-Sperrwand
const LIP = 0.3; // wie weit eine Grabenwand über die Oberfläche ragt

export type Drehung = 0 | 90 | 180 | 270;

export type ModulTyp =
  | "grabengerade"
  | "grabenknick"
  | "parapet"
  | "unterstand"
  | "rampe"
  | "kartengrenze";

export interface ModulOpt {
  /** Länge entlang der lokalen +Z-Achse in Metern. Default: 1 Rasterzelle. */
  laenge?: number;
  /** Lichte Breite entlang der lokalen X-Achse. Default: Rasterzelle − Wände. */
  breite?: number;
  /**
   * Nur `parapet`: Stellen, an denen die Brustwehr als **eigenes, getaggtes
   * Segment** gebaut wird (AP4-06). Die Sim schaltet den Kollider ab, sobald
   * die Bresche offen ist — die Bresche wird ein echtes Loch. Der Feuertritt
   * bleibt durchgehend.
   */
  luecken?: readonly ParapetLuecke[];
}

export interface ParapetLuecke {
  /** Mitte der Lücke entlang der lokalen Längsachse (0..laenge). */
  z: number;
  /** Breite der Lücke in Metern. */
  breite: number;
  /** Etikett des schaltbaren Segments (`brescheTag(id, i)` aus `src/sim/sektor`). */
  tag: string;
}

/**
 * Breite eines Bresche-Segments in der Brustwehr. Passt zu den Trümmern des
 * Renderers (AP4-03: 2,6 m) und lässt eine Gegner-Kapsel (Ø 0,7 m) durch.
 */
export const BRESCHE_BREITE = 2.6;

function box(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
): LevelBox {
  return { center: { x: cx, y: cy, z: cz }, size: { x: sx, y: sy, z: sz } };
}

/** Rastet einen Wert aufs Modulmaß ein (für den späteren Generator). */
export function einrasten(wert: number): number {
  return Math.round(wert / RASTER) * RASTER;
}

// --- Lokale Bauteile. Anker = (0,0,0); lokales +Z = „vorwärts" / Längsachse.
//     `modul()` dreht/verschiebt das Ergebnis an die Weltposition. ---

const grabenMitteY = (GRABEN_SOHLE + OBERFLAECHE + LIP) / 2;
const grabenWandHoehe = OBERFLAECHE + LIP - GRABEN_SOHLE;

function grabengerade(laenge: number, breite: number): LevelBox[] {
  const halbB = breite / 2;
  return [
    // Sohle, 1 m dick, Oberkante = GRABEN_SOHLE.
    box(0, GRABEN_SOHLE - 0.5, laenge / 2, breite + 2 * WAND, 1, laenge),
    // Seitenwände.
    box(
      -(halbB + WAND / 2),
      grabenMitteY,
      laenge / 2,
      WAND,
      grabenWandHoehe,
      laenge,
    ),
    box(
      halbB + WAND / 2,
      grabenMitteY,
      laenge / 2,
      WAND,
      grabenWandHoehe,
      laenge,
    ),
  ];
}

/** 90°-Ecke: offen nach lokal +Z (Eingang) und lokal −X (Ausgang). */
function grabenknick(breite: number): LevelBox[] {
  const halb = breite / 2;
  const seite = breite + 2 * WAND;
  return [
    box(0, GRABEN_SOHLE - 0.5, 0, seite, 1, seite),
    // Außenwände auf lokal −Z und lokal +X.
    box(0, grabenMitteY, -(halb + WAND / 2), seite, grabenWandHoehe, WAND),
    box(halb + WAND / 2, grabenMitteY, 0, WAND, grabenWandHoehe, seite),
  ];
}

function parapet(
  laenge: number,
  luecken: readonly ParapetLuecke[] = [],
): LevelBox[] {
  const wandHoehe = PARAPET_OBERKANTE - GRABEN_SOHLE;
  const wandY = (GRABEN_SOHLE + PARAPET_OBERKANTE) / 2;
  // Brustwehr-Wand bei lokal x = 0 — in Segmente geteilt: zwischen den Lücken
  // feste Wand, an jeder Lücke ein eigenes, getaggtes (schaltbares) Segment.
  const wand: LevelBox[] = [];
  const segment = (z0: number, z1: number, tag?: string): void => {
    if (z1 - z0 <= 1e-6) {
      return;
    }
    const b = box(0, wandY, (z0 + z1) / 2, WAND, wandHoehe, z1 - z0);
    wand.push(tag === undefined ? b : { ...b, tag });
  };
  let cursor = 0;
  for (const l of [...luecken].sort((a, b) => a.z - b.z)) {
    const z0 = Math.max(cursor, Math.min(laenge, l.z - l.breite / 2));
    const z1 = Math.max(z0, Math.min(laenge, l.z + l.breite / 2));
    segment(cursor, z0);
    segment(z0, z1, l.tag);
    cursor = z1;
  }
  segment(cursor, laenge);
  return [
    ...wand,
    // Feuertritt Stufe 1 (Oberkante −1,4; Δ0,4 von der Sohle), lokal −X.
    box(-0.7, GRABEN_SOHLE + 0.2, laenge / 2, 0.4, 0.4, laenge),
    // Feuertritt-Bank (Oberkante FEUERTRITT_OBERKANTE; Δ0,45), an der Wand.
    box(
      -0.25,
      (GRABEN_SOHLE + FEUERTRITT_OBERKANTE) / 2,
      laenge / 2,
      0.5,
      FEUERTRITT_OBERKANTE - GRABEN_SOHLE,
      laenge,
    ),
  ];
}

/** Stufenrampe: Oberfläche bei lokal z = 0 → Grabensohle bei lokal z = laenge. */
function rampe(laenge: number, breite: number): LevelBox[] {
  const stufen = 4;
  const dz = laenge / stufen;
  const dy = (OBERFLAECHE - GRABEN_SOHLE) / stufen; // 0,45 ≤ STEP_HEIGHT (0,5)
  const boxes: LevelBox[] = [];
  for (let i = 0; i < stufen; i += 1) {
    const top = OBERFLAECHE - dy * (i + 1);
    boxes.push(box(0, top - 0.5, dz * (i + 0.5), breite, 1, dz));
  }
  return boxes;
}

/** Kleiner begehbarer Unterstand: drei Wände + Dach, offen nach lokal −Z. */
function unterstand(breite: number, laenge: number): LevelBox[] {
  const h = 2.2;
  const cy = OBERFLAECHE + h / 2;
  const halbB = breite / 2;
  return [
    box(0, cy, laenge - WAND / 2, breite + 2 * WAND, h, WAND), // Rückwand +Z
    box(-(halbB + WAND / 2), cy, laenge / 2, WAND, h, laenge), // Wand −X
    box(halbB + WAND / 2, cy, laenge / 2, WAND, h, laenge), // Wand +X
    box(
      0,
      OBERFLAECHE + h + WAND / 2,
      laenge / 2,
      breite + 2 * WAND,
      WAND,
      laenge + WAND,
    ), // Dach
  ];
}

function kartengrenze(laenge: number): LevelBox[] {
  return [
    box(
      0,
      OBERFLAECHE + GRENZE_HOEHE / 2 - 0.5,
      laenge / 2,
      WAND,
      GRENZE_HOEHE,
      laenge,
    ),
  ];
}

function drehXZ(x: number, z: number, d: Drehung): [number, number] {
  switch (d) {
    case 0:
      return [x, z];
    case 90:
      return [-z, x];
    case 180:
      return [-x, -z];
    case 270:
      return [z, -x];
    default: {
      const erschoepft: never = d;
      return erschoepft;
    }
  }
}

function bauLokal(
  typ: ModulTyp,
  laenge: number,
  breite: number,
  luecken: readonly ParapetLuecke[],
): LevelBox[] {
  switch (typ) {
    case "grabengerade":
      return grabengerade(laenge, breite);
    case "grabenknick":
      return grabenknick(breite);
    case "parapet":
      return parapet(laenge, luecken);
    case "unterstand":
      return unterstand(breite, laenge);
    case "rampe":
      return rampe(laenge, breite);
    case "kartengrenze":
      return kartengrenze(laenge);
    default: {
      const erschoepft: never = typ;
      return erschoepft;
    }
  }
}

/**
 * Setzt ein Modul an seine Weltposition. `at` ist der Anker (lokaler Ursprung),
 * `drehung` dreht das Modul in 90°-Schritten um die Y-Achse.
 */
export function modul(
  typ: ModulTyp,
  at: Vec3,
  drehung: Drehung = 0,
  opt: ModulOpt = {},
): LevelBox[] {
  const laenge = opt.laenge ?? RASTER;
  const breite = opt.breite ?? RASTER - 2 * WAND;
  const swap = drehung === 90 || drehung === 270;
  return bauLokal(typ, laenge, breite, opt.luecken ?? []).map((b) => {
    const [cx, cz] = drehXZ(b.center.x, b.center.z, drehung);
    const welt: LevelBox = {
      center: { x: at.x + cx, y: at.y + b.center.y, z: at.z + cz },
      size: {
        x: swap ? b.size.z : b.size.x,
        y: b.size.y,
        z: swap ? b.size.x : b.size.z,
      },
    };
    return b.tag === undefined ? welt : { ...welt, tag: b.tag };
  });
}
