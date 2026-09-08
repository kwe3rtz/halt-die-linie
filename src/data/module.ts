// Rasterbaukasten für den handgebauten Greybox-Sektor. Jedes Modul liefert
// achsenparallele Quader (`LevelBox`) — die EINE Quelle für Render-Meshes
// (`src/render`) und Sim-Collider (`src/sim/collision`). Greybox-Geometrie,
// kein Balancing, keine Art.
//
// Bewusst klein und datengetrieben: derselbe Baukasten soll später der
// prozedurale Generator fürs ganze Grabennetz nutzen (KONZEPT.md §3 / §9.5).
// Keine Abstraktion über das hier Gebrauchte hinaus.
//
// AP6-01d: der **Graben-Look-Baukasten** (unten) ist jetzt der Hauptteil —
// tiefe Sohle, verkleidete Wände, Feuertritt, echter Abstiegs-Unterstand. Er
// rechnet in **Weltkoordinaten** (achsen-generisch über `WandSegment`) statt
// über lokale, gedrehte Module: das ist für Gräben, die aus geraden Stücken
// zusammengesetzt werden, kürzer und weniger fehleranfällig. `modul()` bleibt
// für die drei rotations-freien Restbausteine (Rampe, Kartengrenze,
// Geschützstellung).
import type { Vec3 } from "../sim/math";
import type { LevelBox, Oberflaeche } from "../sim/collision";

/** Rastermaß in Metern — das Modulmaß, auf das der Sektor aufgebaut ist. */
export const RASTER = 4;

// --- Vertikale Greybox-Kennwerte (Welt-Y). AP6-01d: der Graben-Look aus
//     AP6-01c ist jetzt global (vorher lokale `*_TIEF`-Konstanten neben den
//     alten Werten). Zielvorlage: `tickets/erledigt/AP6-01c-*.md` §1. ---

/** Geländeoberkante: Feld, Niemandsland, Parados-Rücken, Home-Feld. */
export const OBERFLAECHE = 0;
/**
 * Grabensohle: 2,7 m unter Feld (AP6-01d, war 1,8). Man steht *unten drin*,
 * die Wände überragen einen — auf der Sohle liegt das Auge bei −1,1 und sieht
 * nicht über die Brustwehr (KONZEPT.md §3 „Der Graben-Look", Punkt 1 Tiefe).
 */
export const GRABEN_SOHLE = -2.7;
/**
 * Feuertritt-Bank: −0,90, über **vier** flache Stufen à 0,45 m von der Sohle
 * (jede < `STEP_HEIGHT`). Auge auf der Bank = −0,90 + 1,6 = +0,70 = exakt
 * Kronenhöhe → über die Kimme schießbar, Kopf gedeckt.
 */
export const FEUERTRITT_OBERKANTE = -0.9;
/**
 * Oberkante der **Erd-Brustwehr** (ohne Sandsack-Krone). 0,58 > `STEP_HEIGHT`
 * (0,5) über der Feld-/Niemandsland-Oberfläche → die Krone ist keine
 * Lauffläche (die AP6-01b-Eigenschaft bleibt). Marge 0,08 m; zeigt ein
 * Spieltest eine kletternde Kapsel, ist der nächste Wert 0,62.
 */
export const BRUSTWEHR_OBERKANTE = 0.58;
/**
 * Oberkante der Sandsack-Krone auf der Brustwehr (reines Render-Detail,
 * `nurRender`). Hellster Ton im Sektor → die Horizontlinie, an der man sich
 * orientiert.
 */
export const PARAPET_OBERKANTE = 0.7;
/** Oberkante Parados (Rückwand des Feuergrabens) — flach, notfalls überklettern. */
export const PARADOS_OBERKANTE = 0.3;

const WAND = 0.4; // Wandstärke der Restbausteine
const GRENZE_HOEHE = 6; // Kartengrenze-Sperrwand (unsichtbar, AP5-03)
const LIP = 0.3; // wie weit ein Erdblock über die Oberfläche ragt

/**
 * Breite eines Bresche-Segments in der Brustwehr. Passt zu den Trümmern des
 * Renderers (AP4-03: 2,6 m) und lässt eine Gegner-Kapsel (Ø 0,7 m) durch.
 */
export const BRESCHE_BREITE = 2.6;

export type Drehung = 0 | 90 | 180 | 270;

export type ModulTyp = "rampe" | "kartengrenze" | "geschuetzstellung";

export interface ModulOpt {
  /** Länge entlang der lokalen +Z-Achse in Metern. Default: 1 Rasterzelle. */
  laenge?: number;
  /** Lichte Breite entlang der lokalen X-Achse. Default: Rasterzelle − Wände. */
  breite?: number;
}

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

/**
 * Anzahl Stufen einer `rampe()`. AP6-06: von 4 auf 10 — die 4-Stufen-Treppe
 * ließ Gegner-Kapseln an den Kanten hängen, besonders unter Nachrück-Druck.
 * AP6-01d: die Sohle ist 0,9 m tiefer, also 14 Stufen, damit der Anstieg bei
 * ~0,19 m bleibt (klar unter `STEP_HEIGHT`).
 */
const RAMPE_STUFEN = 14;

/** Stufenrampe: Oberfläche bei lokal z = 0 → Grabensohle bei lokal z = laenge. */
function rampe(laenge: number, breite: number): LevelBox[] {
  const dz = laenge / RAMPE_STUFEN;
  const dy = (OBERFLAECHE - GRABEN_SOHLE) / RAMPE_STUFEN; // 0,19 ≪ STEP_HEIGHT
  const boxes: LevelBox[] = [];
  for (let i = 0; i < RAMPE_STUFEN; i += 1) {
    const top = OBERFLAECHE - dy * (i + 1);
    boxes.push(box(0, top - 0.6, dz * (i + 0.5), breite, 1.2, dz));
  }
  return boxes;
}

/**
 * Geschützstellung: niedriger Sandsackring (Hufeisen, offen nach lokal −Z) auf
 * der Geländeoberfläche — Deckung + Landmark im Hinterland. Alles ≤ 0,95 m, kein
 * Aufstieg. `radius` = halbe lichte Weite.
 */
function geschuetzstellung(radius: number): LevelBox[] {
  const h = 0.95;
  const cy = OBERFLAECHE + h / 2;
  const d = 0.6; // Sandsackwall-Dicke
  const sack = (cx: number, cz: number, sx: number, sz: number): LevelBox => ({
    ...box(cx, cy, cz, sx, h, sz),
    oberflaeche: "sandsack",
  });
  return [
    sack(0, radius + d / 2, 2 * radius + 2 * d, d), // +Z (Rückwand)
    sack(-(radius + d / 2), 0, d, 2 * radius), // −X
    sack(radius + d / 2, 0, d, 2 * radius), // +X
  ];
}

/**
 * Kartengrenze: sperrt die Bewegung (hoch genug gegen Sprung + Stufe), ist
 * aber seit AP5-03 **unsichtbar** — kein Mesh, kein Hitscan-Treffer. Die
 * sichtbare Grenze bildet das auslaufende Umland (`src/data/sektor.ts`),
 * nicht eine Wand (KONZEPT.md §3: „Sumpf, zerbombtes Gelände").
 */
function kartengrenze(laenge: number): LevelBox[] {
  return [
    {
      ...box(
        0,
        OBERFLAECHE + GRENZE_HOEHE / 2 - 0.5,
        laenge / 2,
        WAND,
        GRENZE_HOEHE,
        laenge,
      ),
      unsichtbar: true,
    },
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

function bauLokal(typ: ModulTyp, laenge: number, breite: number): LevelBox[] {
  switch (typ) {
    case "geschuetzstellung":
      return geschuetzstellung(breite / 2);
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
  return bauLokal(typ, laenge, breite).map((b) => {
    const [cx, cz] = drehXZ(b.center.x, b.center.z, drehung);
    const welt: LevelBox = {
      center: { x: at.x + cx, y: at.y + b.center.y, z: at.z + cz },
      size: {
        x: swap ? b.size.z : b.size.x,
        y: b.size.y,
        z: swap ? b.size.x : b.size.z,
      },
    };
    if (b.oberflaeche !== undefined) {
      welt.oberflaeche = b.oberflaeche;
    }
    return b.unsichtbar ? { ...welt, unsichtbar: true } : welt;
  });
}

// ===========================================================================
// Graben-Look-Baukasten (AP6-01c, in AP6-01d global)
// ===========================================================================
//
// Umsetzung des Materials: **flache Farben + Formdetail-Geometrie**, keine
// Texturen (KONZEPT.md §3 „Der Graben-Look", §9.10). Das Material trägt jede
// Box als `oberflaeche`-Feld — reine Renderer-Durchreiche.
//
// **Formdetail kollidiert nicht** (AP6-01d, Spieltest-Korrektur 1): Pfosten,
// Bohlen, Sandsäcke und Laufrost-Querstege tragen `nurRender: true`. Der
// Kollider ist allein die Erd-/Beton-Basiswand; ihre grabenseitige Fläche ist
// die Ebene, an der man entlangläuft. Vorher waren die Formdetail-Boxen echte
// Kollider — man blieb beim Entlanglaufen an jeder Pfostenkante hängen.

/** Wie weit ein Stützpfosten vor der Basiswand-Fläche steht (reine Optik). */
const PFOSTEN_VOR = 0.07;
/** Wie weit ein Bohlen-Kurs vor der Basiswand-Fläche steht (reine Optik). */
const BOHLE_VOR = 0.025;

/** Box aus Mittelpunkt + Größe mit Oberflächen-Material. */
function obx(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  oberflaeche: Oberflaeche,
): LevelBox {
  return {
    center: { x: cx, y: cy, z: cz },
    size: { x: sx, y: sy, z: sz },
    oberflaeche,
  };
}

/** Dasselbe als reines Render-Detail (kein Kollider). */
function detail(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  oberflaeche: Oberflaeche,
): LevelBox {
  return { ...obx(cx, cy, cz, sx, sy, sz, oberflaeche), nurRender: true };
}

/** Box aus Min/Max-Ecken mit Oberflächen-Material (im Handbau bequemer). */
export function materialBox(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  oberflaeche: Oberflaeche,
): LevelBox {
  return obx(
    (x0 + x1) / 2,
    (y0 + y1) / 2,
    (z0 + z1) / 2,
    Math.abs(x1 - x0),
    Math.abs(y1 - y0),
    Math.abs(z1 - z0),
    oberflaeche,
  );
}

/**
 * Ein achsenparalleles Grabenwand-Segment für die Verkleidungs-Helfer. `a`/`b`
 * sind die Enden in der XZ-Ebene (die **Kollider-Fläche** der Basiswand),
 * `normale` zeigt als Einheitsvektor in den Graben hinein ((±1,0) oder (0,±1)).
 */
export interface WandSegment {
  a: { x: number; z: number };
  b: { x: number; z: number };
  /** Welt-Y Wandfuß (Grabensohle). */
  sohle: number;
  /** Welt-Y Wandkrone (Oberkante Basiswand). */
  krone: number;
  normale: { x: number; z: number };
}

interface SegAchsen {
  entlangX: boolean;
  min: number;
  max: number;
  laenge: number;
  /** Konstante Querkoordinate der Wandfläche. */
  face: number;
  /** Vorzeichen der Normale in Querrichtung (in den Graben). */
  nq: number;
}

function segAchsen(seg: WandSegment): SegAchsen {
  const entlangX = Math.abs(seg.b.x - seg.a.x) >= Math.abs(seg.b.z - seg.a.z);
  const av = entlangX ? seg.a.x : seg.a.z;
  const bv = entlangX ? seg.b.x : seg.b.z;
  return {
    entlangX,
    min: Math.min(av, bv),
    max: Math.max(av, bv),
    laenge: Math.abs(bv - av),
    face: entlangX ? seg.a.z : seg.a.x,
    nq: entlangX ? Math.sign(seg.normale.z) : Math.sign(seg.normale.x),
  };
}

/**
 * Verkleidung eines Grabenwand-Segments — **Formdetail-Geometrie** (KONZEPT.md
 * §3): senkrechte Stützpfosten alle ~1,2 m + waagerechte Bohlen-Kurse, beide
 * ein Stück vor der Basiswand-Fläche. Alles `nurRender` (AP6-01d): der
 * Kollider ist die Basiswand dahinter, hier hängt niemand mehr an einer Kante.
 * `opt.vonY` hebt den Ansatz an (z. B. über den Feuertritt, damit die Pfosten
 * die Bank nicht verstellen), `opt.material` schaltet auf den Beton-Verbau der
 * Home-Line um.
 */
export function verkleidung(
  seg: WandSegment,
  opt: {
    vonY?: number;
    pfostenAbstand?: number;
    material?: Extract<Oberflaeche, "holz" | "beton">;
  } = {},
): LevelBox[] {
  const { entlangX, min, max, laenge, face, nq } = segAchsen(seg);
  const vonY = opt.vonY ?? seg.sohle;
  const abstand = opt.pfostenAbstand ?? 1.2;
  const mat = opt.material ?? "holz";
  const hoehe = seg.krone - vonY;
  if (hoehe <= 0 || laenge <= 0) {
    return [];
  }
  const midY = (vonY + seg.krone) / 2;
  const out: LevelBox[] = [];

  // Stützpfosten 0,15 × H × 0,15, Vorderkante `PFOSTEN_VOR` vor der Wandfläche.
  // Sie sitzen in Feldmitte statt auf den Segmentgrenzen — sonst stehen an
  // jeder Wandstück-Naht (Bresche, Grabenmündung) zwei Pfosten deckungsgleich
  // ineinander (Z-Fighting im gemergten Mesh).
  const n = Math.max(1, Math.round(laenge / abstand));
  for (let i = 0; i < n; i += 1) {
    const p = min + ((i + 0.5) / n) * laenge;
    const q = face + nq * (PFOSTEN_VOR - 0.075);
    out.push(
      entlangX
        ? detail(p, midY, q, 0.15, hoehe, 0.15, mat)
        : detail(q, midY, p, 0.15, hoehe, 0.15, mat),
    );
  }
  // Bohlen-Kurse: waagerechte Leisten 0,20 hoch über die ganze Länge.
  const mid = (min + max) / 2;
  for (const relY of [0.4, 1.1, 1.8, 2.5]) {
    const y = vonY + relY;
    if (y + 0.1 >= seg.krone) {
      continue;
    }
    const q = face + nq * (BOHLE_VOR - 0.03);
    out.push(
      entlangX
        ? detail(mid, y, q, laenge, 0.2, 0.06, mat)
        : detail(q, y, mid, 0.06, 0.2, laenge, mat),
    );
  }
  return out;
}

/**
 * Sandsack-Krone auf einem Segment — Reihe Klötze (0,50 × 0,35 × 0,45) mit
 * kleinen Lücken (die „Kimme"), Oberkante = `oberkante`. Hellster Ton im Sektor
 * → dient der Orientierung (Horizontlinie). Reines Render-Detail: die Säcke
 * sitzen auf der Basiswand-Krone, die selbst schon > `STEP_HEIGHT` ist.
 */
export function sandsackKrone(
  seg: WandSegment,
  opt: { oberkante?: number; luecke?: number } = {},
): LevelBox[] {
  const { entlangX, min, max, laenge, face, nq } = segAchsen(seg);
  const oberkante = opt.oberkante ?? PARAPET_OBERKANTE;
  const luecke = opt.luecke ?? 0.15;
  const sack = 0.5;
  const hoehe = 0.35;
  const cy = oberkante - hoehe / 2;
  // Überwiegend auf der Wand, nur eine kleine Lippe ragt in den Graben.
  const q = face - nq * 0.1;
  const teilung = sack + luecke;
  const anzahl = Math.max(1, Math.floor(laenge / teilung));
  const rest = laenge - anzahl * teilung + luecke;
  const start = min + rest / 2;
  const out: LevelBox[] = [];
  for (let i = 0; i < anzahl; i += 1) {
    const c = start + sack / 2 + i * teilung;
    if (c > max) {
      break;
    }
    out.push(
      entlangX
        ? detail(c, cy, q, sack, hoehe, 0.45, "sandsack")
        : detail(q, cy, c, 0.45, hoehe, sack, "sandsack"),
    );
  }
  return out;
}

/**
 * Laufrost über der Grabensohle — dünne Deckplatte (Oberkante `sohle + 0,04`)
 * als begehbare Fläche (echter Kollider, 4 cm sind keine Stufe). Die
 * Querstege darüber sind seit AP6-01d **`nurRender`** und deshalb per Default
 * an: als Kollider lösten sie beim Gehen einen Mikro-Step-Up aus
 * (Kamera-Zittern, AP6-01c-Entscheidung 4).
 */
export function laufrost(bereich: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  sohle?: number;
  querStege?: boolean;
}): LevelBox[] {
  const sohle = bereich.sohle ?? GRABEN_SOHLE;
  const top = sohle + 0.04;
  const cx = (bereich.minX + bereich.maxX) / 2;
  const cz = (bereich.minZ + bereich.maxZ) / 2;
  const sx = bereich.maxX - bereich.minX;
  const sz = bereich.maxZ - bereich.minZ;
  if (sx <= 0 || sz <= 0) {
    return [];
  }
  const out: LevelBox[] = [obx(cx, top - 0.02, cz, sx, 0.04, sz, "laufrost")];
  if (bereich.querStege !== false) {
    const laengs = sz >= sx;
    const spanne = laengs ? sz : sx;
    const n = Math.max(1, Math.round(spanne / 1.2));
    for (let i = 1; i < n; i += 1) {
      const p = (laengs ? bereich.minZ : bereich.minX) + (i / n) * spanne;
      out.push(
        laengs
          ? detail(cx, top + 0.015, p, sx, 0.03, 0.06, "laufrost")
          : detail(p, top + 0.015, cz, 0.06, 0.03, sz, "laufrost"),
      );
    }
  }
  return out;
}

/**
 * Feuertritt als vier flache Stufen von der tiefen Sohle zur Bank an der
 * Brustwehr. Die Stufen stapeln sich Richtung Wand (jede höhere reicht weniger
 * weit in den Graben), jede < `STEP_HEIGHT`. Echte Kollider (man steht darauf).
 */
export function feuertrittTief(opt: {
  minX: number;
  maxX: number;
  /** Grabenseitige Kante der untersten Stufe. */
  zToe: number;
  /** An der Brustwehr (die Stufen enden hier). */
  zWand: number;
  sohle?: number;
  bank?: number;
  stufen?: number;
}): LevelBox[] {
  const sohle = opt.sohle ?? GRABEN_SOHLE;
  const bank = opt.bank ?? FEUERTRITT_OBERKANTE;
  const stufen = opt.stufen ?? 4;
  const cx = (opt.minX + opt.maxX) / 2;
  const sx = opt.maxX - opt.minX;
  if (sx <= 0) {
    return [];
  }
  const unten = sohle - 0.6;
  const spanZ = opt.zWand - opt.zToe;
  const out: LevelBox[] = [];
  for (let i = 0; i < stufen; i += 1) {
    const top = sohle + ((i + 1) / stufen) * (bank - sohle);
    const z0 = opt.zToe + (i / stufen) * spanZ;
    const zc = (z0 + opt.zWand) / 2;
    out.push(
      obx(
        cx,
        (unten + top) / 2,
        zc,
        sx,
        top - unten,
        Math.abs(opt.zWand - z0),
        "holz",
      ),
    );
  }
  return out;
}

/**
 * Eine komplette Grabenwand: massive Basiswand (der **Kollider**, ihre
 * grabenseitige Fläche = die Ebene, an der man entlangläuft) + Verkleidung +
 * optionale Sandsack-Krone. `a`/`b` beschreiben diese Fläche in der XZ-Ebene,
 * `normale` zeigt in den Graben.
 *
 * `luecken` unterbricht die Wand (Bresche / Grabenmündung / Sap-Lücke): jedes
 * Stück in einer Lücke bekommt deren `tag` (dann schaltet `setKolliderAktiv`
 * es zur Laufzeit ab) oder entfällt ganz (`tag: undefined` = permanentes Loch).
 */
export function grabenWand(opt: {
  a: { x: number; z: number };
  b: { x: number; z: number };
  normale: { x: number; z: number };
  /** Oberkante der Basiswand. */
  krone: number;
  /** Unterkante der Basiswand. Default: 0,6 m unter der Sohle. */
  unten?: number;
  /** Dicke der Basiswand (nach hinten, gegen die Normale). Default 1,4. */
  dicke?: number;
  sohle?: number;
  /** Ab dieser Höhe wird verkleidet (z. B. über der Feuertritt-Bank). */
  vonY?: number;
  /** Material von Basiswand + Verkleidung. `erde` = Zonen-Ton (Default). */
  verbau?: "erde" | "beton";
  /** Sandsack-Krone bis zu dieser Oberkante (fehlt = keine). */
  sandsack?: number;
  /** Unterbrechungen entlang der Wand (Mitte + Breite in Weltkoordinaten). */
  luecken?: readonly { mitte: number; breite: number; tag?: string }[];
}): LevelBox[] {
  const sohle = opt.sohle ?? GRABEN_SOHLE;
  const seg: WandSegment = {
    a: opt.a,
    b: opt.b,
    sohle,
    krone: opt.krone,
    normale: opt.normale,
  };
  const { entlangX, min, max, face, nq } = segAchsen(seg);
  const unten = opt.unten ?? sohle - 0.6;
  const dicke = opt.dicke ?? 1.4;
  const beton = opt.verbau === "beton";
  const q0 = face;
  const q1 = face - nq * dicke;
  const out: LevelBox[] = [];

  /** Ein Wandstück von `p0` bis `p1` entlang der Längsachse. */
  const stueck = (p0: number, p1: number, tag?: string): void => {
    if (p1 - p0 <= 1e-6) {
      return;
    }
    const roh = entlangX
      ? materialBox(p0, p1, unten, opt.krone, q0, q1, "beton")
      : materialBox(q0, q1, unten, opt.krone, p0, p1, "beton");
    // `erde` = kein Materialfeld → Renderer nimmt den Zonen-Ton (Greybox).
    const b: LevelBox = beton ? roh : { center: roh.center, size: roh.size };
    out.push(tag === undefined ? b : { ...b, tag });
    // Verkleidung + Krone folgen dem Stück (mit derselben Lücke).
    const teilSeg: WandSegment = entlangX
      ? {
          a: { x: p0, z: face },
          b: { x: p1, z: face },
          sohle,
          krone: opt.krone,
          normale: opt.normale,
        }
      : {
          a: { x: face, z: p0 },
          b: { x: face, z: p1 },
          sohle,
          krone: opt.krone,
          normale: opt.normale,
        };
    const verk = verkleidung(teilSeg, {
      ...(opt.vonY === undefined ? {} : { vonY: opt.vonY }),
      material: beton ? "beton" : "holz",
    });
    const krone =
      opt.sandsack === undefined
        ? []
        : sandsackKrone(teilSeg, { oberkante: opt.sandsack });
    for (const d of [...verk, ...krone]) {
      out.push(tag === undefined ? d : { ...d, tag });
    }
  };

  let cursor = min;
  for (const l of [...(opt.luecken ?? [])].sort((a, b) => a.mitte - b.mitte)) {
    const p0 = Math.max(cursor, Math.min(max, l.mitte - l.breite / 2));
    const p1 = Math.max(p0, Math.min(max, l.mitte + l.breite / 2));
    stueck(cursor, p0);
    if (l.tag !== undefined) {
      stueck(p0, p1, l.tag); // schaltbares Bresche-Segment
    }
    cursor = p1;
  }
  stueck(cursor, max);
  return out;
}

/**
 * Erd-Traverse: massiver, undurchgrabener Block, der zwei Feuernischen
 * versetzt (der „Zahn" im gezähnten Feuergraben). Voll bis über die
 * Geländeoberkante — Deckung gegen Längsfeuer, blockiert die Sicht durch die
 * Linie. Beide Längsseiten sind verkleidet (Formdetail, `nurRender`).
 */
export function traverseBlock(opt: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  sohle?: number;
  /** Oberkante. Default: Geländeoberkante + Lippe. */
  oben?: number;
  verbau?: "erde" | "beton";
}): LevelBox[] {
  const sohle = opt.sohle ?? GRABEN_SOHLE;
  const oben = opt.oben ?? OBERFLAECHE + LIP;
  const unten = sohle - 0.6;
  const beton = opt.verbau === "beton";
  const roh = materialBox(
    opt.minX,
    opt.maxX,
    unten,
    oben,
    opt.minZ,
    opt.maxZ,
    "beton",
  );
  const kern: LevelBox = beton ? roh : { center: roh.center, size: roh.size };
  const seite = (x: number, n: number): LevelBox[] =>
    verkleidung(
      {
        a: { x, z: opt.minZ },
        b: { x, z: opt.maxZ },
        sohle,
        krone: oben,
        normale: { x: n, z: 0 },
      },
      { material: beton ? "beton" : "holz" },
    );
  return [kern, ...seite(opt.minX, -1), ...seite(opt.maxX, 1)];
}

// Feste Maße des Abstiegs-Unterstands (auch von `abstiegUnterstandLoch` genutzt).
// AP6-01d (Spieltest-Korrekturen 3+4): flachere Treppe (12 statt 8 Stufen über
// einen längeren Schacht) und mehr Kopffreiheit (2,3 statt 2,0 m).
const US_SCHACHT_B = 1.6; // lichte Breite Treppenschacht (X)
const US_SCHACHT_T = 3.6; // Länge Treppenschacht (Z) — 12 × 0,30 m Auftritt
const US_STUFEN = 12;
const US_RAUM_B = 3.5; // lichte Breite Raum (X)
const US_RAUM_T = 3.2; // Tiefe ab Treppenfuß (inkl. Vestibül)
const US_WAND = 0.25;
const US_VESTIBUEL = 0.7; // offener Boden am Fuß der Treppe, vor der Decke
const US_TIEFE = 2.5; // Sohle → Raumboden (12 Stufen à ~0,208 m)
const US_KOPF = 2.3; // lichte Höhe Raum (Raumboden → Deckenunterkante)

/** Anzahl Treppenstufen eines `abstiegUnterstand` (für Tests/Bericht). */
export const ABSTIEG_STUFEN = US_STUFEN;
/** Lichte Raumhöhe eines `abstiegUnterstand` in Metern. */
export const ABSTIEG_KOPFFREIHEIT = US_KOPF;

/**
 * Echter Abstiegs-Unterstand (KONZEPT.md §3, Grill Q9): Treppe von der
 * Grabensohle **hinab** in einen Raum *unter* der Sohle mit Kopffreiheit
 * (lichte Höhe 2,3 m). Vollständig geschlossene Kiste — eigene Bodenplatte + 4
 * Wände + Decke + Treppe; die einzige Öffnung nach oben ist der Treppenschacht
 * (offen in den Graben). **Nicht im Nav-Graph** (Spieler-Schutzraum, nie
 * Feind-Route) → das fehlende `FALL_LIMIT` für Gegner ist hier irrelevant.
 *
 * Der Aufrufer stanzt den durchgehenden Sohle-Auffangboden über
 * `abstiegUnterstandLoch(...)` aus (die eigene Bodenplatte dichtet ab). Mit
 * `kappeBis` legt der Helfer selbst die Erd-Kappe über die Decke (bis Welt-Y
 * `kappeBis`, i. d. R. `OBERFLAECHE`).
 */
export function abstiegUnterstand(opt: {
  /** Grabensohle = Oberkante Treppenschacht. */
  sohle?: number;
  /** Zentrum des Treppenschachts in der Grabensohle (XZ). */
  schacht: { x: number; z: number };
  /** Der Raum liegt in dieser Z-Richtung vom Schacht (−1 = nach −Z). */
  richtungZ: 1 | -1;
  /** Welt-Y, bis zu dem die Erd-Kappe über die Decke reicht (z. B. 0). */
  kappeBis?: number;
}): LevelBox[] {
  const sohle = opt.sohle ?? GRABEN_SOHLE;
  const dir = opt.richtungZ;
  const { x: sx, z: sz } = opt.schacht;
  const W = US_WAND;

  const raumBoden = sohle - US_TIEFE;
  const deckeUnten = raumBoden + US_KOPF;
  const bodenPlatte = raumBoden - 0.5;

  const schachtEndZ = sz + dir * US_SCHACHT_T;
  const deckeNahZ = schachtEndZ + dir * US_VESTIBUEL; // hier beginnt die Decke
  const fernZ = schachtEndZ + dir * US_RAUM_T; // Innenkante Rückwand
  const fernAussen = fernZ + dir * W;

  const raumMinX = sx - US_RAUM_B / 2;
  const raumMaxX = sx + US_RAUM_B / 2;
  const schMinX = sx - US_SCHACHT_B / 2;
  const schMaxX = sx + US_SCHACHT_B / 2;
  const zSpanne = (a: number, b: number): [number, number] => [
    Math.min(a, b),
    Math.max(a, b),
  ];
  const [footMinZ, footMaxZ] = zSpanne(sz, fernAussen);

  const out: LevelBox[] = [];

  // Bodenplatte über die ganze Aussparung (dichtet den Auffangboden ab).
  out.push(
    materialBox(
      raumMinX - W,
      raumMaxX + W,
      bodenPlatte,
      raumBoden,
      footMinZ,
      footMaxZ,
      "laufrost",
    ),
  );
  // Treppe hinab: 12 diskrete Stufen (Auftritt 0,30 m, Anstieg ~0,21 m <
  // STEP_HEIGHT), die letzte auf Raumboden-Niveau. Massiv bis zur Bodenplatte.
  const tread = US_SCHACHT_T / US_STUFEN;
  for (let i = 0; i < US_STUFEN; i += 1) {
    const top = sohle - ((i + 1) / US_STUFEN) * US_TIEFE;
    const [z0, z1] = zSpanne(sz + dir * i * tread, sz + dir * (i + 1) * tread);
    out.push(materialBox(schMinX, schMaxX, bodenPlatte, top, z0, z1, "holz"));
  }
  // Schacht-Seitenwände (Holz-Verbau), Bodenplatte → Sohle.
  {
    const [z0, z1] = zSpanne(sz, schachtEndZ);
    out.push(
      materialBox(schMinX - W, schMinX, bodenPlatte, sohle, z0, z1, "holz"),
      materialBox(schMaxX, schMaxX + W, bodenPlatte, sohle, z0, z1, "holz"),
    );
  }
  // Decke (Holz-Rahmen) — erst ab `deckeNahZ` (der Vestibül-Bereich am Fuß der
  // Treppe bleibt oben offen, sonst stößt der absteigende Kopf an).
  {
    const [z0, z1] = zSpanne(deckeNahZ, fernAussen);
    out.push(
      materialBox(
        raumMinX - W,
        raumMaxX + W,
        deckeUnten,
        deckeUnten + 0.4,
        z0,
        z1,
        "holz",
      ),
    );
  }
  // Seitenwände Raum + Vestibül (Wellblech), Bodenplatte → Decke.
  {
    const [z0, z1] = zSpanne(schachtEndZ, fernAussen);
    out.push(
      materialBox(
        raumMinX - W,
        raumMinX,
        bodenPlatte,
        deckeUnten,
        z0,
        z1,
        "wellblech",
      ),
      materialBox(
        raumMaxX,
        raumMaxX + W,
        bodenPlatte,
        deckeUnten,
        z0,
        z1,
        "wellblech",
      ),
    );
  }
  // Rückwand (fern vom Schacht).
  {
    const [z0, z1] = zSpanne(fernZ, fernAussen);
    out.push(
      materialBox(
        raumMinX - W,
        raumMaxX + W,
        bodenPlatte,
        deckeUnten,
        z0,
        z1,
        "wellblech",
      ),
    );
  }
  // Türwand am Deckenansatz mit ~1,8 m Öffnung.
  {
    const [z0, z1] = zSpanne(deckeNahZ - W / 2, deckeNahZ + W / 2);
    out.push(
      materialBox(
        raumMinX - W,
        sx - 0.9,
        bodenPlatte,
        deckeUnten,
        z0,
        z1,
        "wellblech",
      ),
      materialBox(
        sx + 0.9,
        raumMaxX + W,
        bodenPlatte,
        deckeUnten,
        z0,
        z1,
        "wellblech",
      ),
    );
  }
  // Erd-Kappe über der Decke (optional) — nur über dem gedeckten Raum.
  if (opt.kappeBis !== undefined) {
    const [z0, z1] = zSpanne(deckeNahZ, fernAussen);
    out.push(
      materialBox(
        raumMinX - W,
        raumMaxX + W,
        deckeUnten + 0.4,
        opt.kappeBis,
        z0,
        z1,
        "erde",
      ),
    );
  }

  return out;
}

/**
 * Die XZ-Aussparung, die der Aufrufer im durchgehenden Sohle-Auffangboden für
 * einen `abstiegUnterstand` frei lassen muss (Schacht + Vestibül + Raum) — die
 * eigene Bodenplatte des Unterstands dichtet sie ab. Auch fürs Hinterland-Feld
 * (offener Treppenschacht) brauchbar.
 */
export function abstiegUnterstandLoch(opt: {
  schacht: { x: number; z: number };
  richtungZ: 1 | -1;
}): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const dir = opt.richtungZ;
  const { x: sx, z: sz } = opt.schacht;
  const fernAussen = sz + dir * (US_SCHACHT_T + US_RAUM_T + US_WAND);
  return {
    minX: sx - US_RAUM_B / 2 - US_WAND,
    maxX: sx + US_RAUM_B / 2 + US_WAND,
    minZ: Math.min(sz, fernAussen),
    maxZ: Math.max(sz, fernAussen),
  };
}

/** Achsenparalleles Rechteck in der XZ-Ebene. */
export interface Rechteck {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Deckt `aussen` mit achsenparallelen Platten [y0, y1] ab und lässt jedes
 * Rechteck in `loecher` frei — für Geländeflächen mit Graben-Schlitzen und den
 * Auffangboden mit den Unterstands-Aussparungen. Zerlegt entlang aller
 * Loch-Kanten in ein Gitter und lässt die Zellen weg, deren Mitte in einem Loch
 * liegt.
 */
export function bodenPlatten(
  aussen: Rechteck,
  loecher: readonly Rechteck[],
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
      const roh = materialBox(
        xs[i]!,
        xs[i + 1]!,
        y0,
        y1,
        zs[j]!,
        zs[j + 1]!,
        oberflaeche ?? "erde",
      );
      out.push(
        oberflaeche === undefined
          ? { center: roh.center, size: roh.size }
          : roh,
      );
    }
  }
  return out;
}
