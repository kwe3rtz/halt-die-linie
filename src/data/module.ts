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

/** Geländeoberkante: Feld, Niemandsland, Parados, Home-Boden. */
export const OBERFLAECHE = 0;
/** Grabensohle: Feuergraben, Verbindungsgraben, Home-Graben. */
export const GRABEN_SOHLE = -1.8;
/** Feuertritt-Oberkante — über drei flache Stufen von der Sohle, ohne Sprung. */
export const FEUERTRITT_OBERKANTE = -0.85;
/**
 * Parapet-Oberkante. AP6-01b: von 0,55 auf 0,62 gehoben — 0,55 lag nur 0,05 m
 * über der Feld-/Niemandsland-Oberfläche (Steighöhe 0,5), die Brustwehr war
 * praktisch bündig und im Spieltest „oben begehbar". Jetzt 0,62 > STEP_HEIGHT
 * über jeder angrenzenden Lauffläche: Feld (0 → 0,62), Feuertritt (−0,85 → 0,62
 * = 1,47). Auf dem Feuertritt stehend liegt das Auge bei −0,85 + PLAYER_EYE(1,6)
 * = +0,75 — 0,13 m über der Brustwehr, weiter über Kimme schießbar. Deckung im
 * Neubau steht mit Abstand zu den Parapets und ≤ 1,1 m (kein Aufstieg auf die
 * Brustwehr über einen Deckungsklotz). Ein bewusster Sprung (Apex ~1,15 m ab
 * Feld) kann die Krone erreichen — exponiert auf schmaler Wand, akzeptiert.
 */
export const PARAPET_OBERKANTE = 0.62;

const WAND = 0.4; // Wandstärke
const GRENZE_HOEHE = 6; // Kartengrenze-Sperrwand (unsichtbar, AP5-03)
const LIP = 0.3; // wie weit eine Grabenwand über die Oberfläche ragt

export type Drehung = 0 | 90 | 180 | 270;

export type ModulTyp =
  | "grabengerade"
  | "grabenknick"
  | "parapet"
  | "traverse"
  | "sap"
  | "geschuetzstellung"
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
  // Eine Bresche ist ein **echtes Loch** durch die ganze Brustwehr: Wand,
  // Feuertritt-Stufe und Feuertritt-Bank werden an jeder Lücke unterbrochen,
  // die drei Lücken-Stücke tragen dasselbe Etikett — `setKolliderAktiv` schaltet
  // sie zusammen ab (AP6-01: sonst blockiert die Bank den Feind, der durch die
  // offene Bresche kommt).
  const out: LevelBox[] = [];
  const streifen = (
    lokalX: number,
    cy: number,
    breite: number,
    hoehe: number,
    z0: number,
    z1: number,
    tag?: string,
  ): void => {
    if (z1 - z0 <= 1e-6) {
      return;
    }
    const b = box(lokalX, cy, (z0 + z1) / 2, breite, hoehe, z1 - z0);
    out.push(tag === undefined ? b : { ...b, tag });
  };
  const teil = (
    lokalX: number,
    cy: number,
    breite: number,
    hoehe: number,
  ): void => {
    let cursor = 0;
    for (const l of [...luecken].sort((a, b) => a.z - b.z)) {
      const z0 = Math.max(cursor, Math.min(laenge, l.z - l.breite / 2));
      const z1 = Math.max(z0, Math.min(laenge, l.z + l.breite / 2));
      streifen(lokalX, cy, breite, hoehe, cursor, z0);
      streifen(lokalX, cy, breite, hoehe, z0, z1, l.tag);
      cursor = z1;
    }
    streifen(lokalX, cy, breite, hoehe, cursor, laenge);
  };
  // Brustwehr-Wand bei lokal x = 0.
  teil(0, wandY, WAND, wandHoehe);
  // Feuertritt als drei flache Stufen (lokal −X = Grabenseite), von der Sohle
  // zur Bank an der Wand: −1,35 → −1,10 → FEUERTRITT_OBERKANTE. AP6-01b: dritte
  // Stufe ergänzt, weil die Bank mit dem gehobenen Parapet sonst > STEP_HEIGHT
  // über der Sohle läge.
  const stufe = (lokalX: number, breite: number, top: number): void =>
    teil(lokalX, (GRABEN_SOHLE + top) / 2, breite, top - GRABEN_SOHLE);
  stufe(-0.95, 0.4, GRABEN_SOHLE + 0.45); // −1,35
  stufe(-0.55, 0.4, GRABEN_SOHLE + 0.7); // −1,10
  stufe(-0.15, 0.35, FEUERTRITT_OBERKANTE); // −0,85
  return out;
}

/**
 * Erd-Traverse: massiver, undurchgrabener Erdblock, der zwei Feuernischen
 * versetzt (der „Zahn" im gezähnten Feuergraben). Voll bis über die
 * Geländeoberkante — Deckung gegen Längsfeuer, blockiert die Sicht durch die
 * Linie. Lokal: Block der Länge `laenge` (Z) × `breite` (X), Anker an der
 * Südkante.
 */
function traverse(laenge: number, breite: number): LevelBox[] {
  const unten = GRABEN_SOHLE - 0.5;
  const oben = OBERFLAECHE + LIP;
  return [box(0, (unten + oben) / 2, laenge / 2, breite, oben - unten, laenge)];
}

/**
 * Sap-Kopf: kurzer Stichgraben, der vom Feuergraben nach vorn (lokal +Z) in den
 * Trichterbereich stößt — Horchposten, zugleich Anmarsch-Schleuse für den Feind.
 * Sohle auf Grabenniveau, Wände auf −X/+X und am Kopf (+Z), offen nach −Z.
 */
function sap(laenge: number, breite: number): LevelBox[] {
  const halbB = breite / 2;
  return [
    box(0, GRABEN_SOHLE - 0.5, laenge / 2, breite + 2 * WAND, 1, laenge + WAND),
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
    box(
      0,
      grabenMitteY,
      laenge + WAND / 2,
      breite + 2 * WAND,
      grabenWandHoehe,
      WAND,
    ),
  ];
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
  return [
    box(0, cy, radius + d / 2, 2 * radius + 2 * d, h, d), // +Z (Rückwand)
    box(-(radius + d / 2), cy, 0, d, h, 2 * radius), // −X
    box(radius + d / 2, cy, 0, d, h, 2 * radius), // +X
  ];
}

/**
 * Anzahl Stufen einer `rampe()`. AP6-06: von 4 auf 10 — die 4-Stufen-Treppe
 * (Δy 0,45 m, knapp unter `STEP_HEIGHT`) ließ Gegner-Kapseln an den Kanten
 * hängen, besonders unter Nachrück-Druck. 10 Stufen → Δy 0,18 m, spürbar
 * glatter. Bleibt im Box-Kollisionsmodell (kein Slope-Primitiv). Die
 * Platzierungen erben das im Map-Neubau (AP6-01b).
 */
const RAMPE_STUFEN = 10;

/** Stufenrampe: Oberfläche bei lokal z = 0 → Grabensohle bei lokal z = laenge. */
function rampe(laenge: number, breite: number): LevelBox[] {
  const dz = laenge / RAMPE_STUFEN;
  const dy = (OBERFLAECHE - GRABEN_SOHLE) / RAMPE_STUFEN; // 0,18 ≪ STEP_HEIGHT (0,5)
  const boxes: LevelBox[] = [];
  for (let i = 0; i < RAMPE_STUFEN; i += 1) {
    const top = OBERFLAECHE - dy * (i + 1);
    boxes.push(box(0, top - 0.5, dz * (i + 0.5), breite, 1, dz));
  }
  return boxes;
}

/**
 * Begehbarer Unterstand (AP6-01b): kein Oberflächen-„Bunker" mehr, sondern ein
 * niedriger gedeckter Raum am Grabenniveau — der Anker liegt auf der Grabensohle
 * (`at.y = GRABEN_SOHLE`), man tritt vom Graben hinein (offen nach lokal −Z),
 * die Erddecke sitzt dicht über dem Kopf, über dem Eingang ein Sturz. `breite` ×
 * `laenge` = lichter Innenraum.
 *
 * // TODO(Rückfrage): Das Ticket wünscht „Raum UNTER Flur, Treppe hinab". Im
 * Box-Kollisionsmodell steht der Spieler (1,8 m) auf der Grabensohle (−1,8), der
 * Kopf also bei y = 0 = Geländeoberkante — ein Raum *unter* der Fläche mit
 * Kopffreiheit bräuchte einen abgesenkten Boden, und dafür die EINE durchgehende
 * Sohle-Auffangplatte (Jank-Pass „kein Loch, durch das eine Kapsel fällt") zu
 * durchbrechen ist riskanter als es wert ist. Gebaut ist deshalb der vom Ticket
 * erlaubte „flachste hinein-Verbau": Decke knapp über Flur (Unterkante Welt-y
 * ≈ +0,2 → ~0,2 m über dem Scheitel), begehbar, gedeckt, ohne Absenkung.
 */
function unterstand(breite: number, laenge: number): LevelBox[] {
  const LICHT = 2.0; // lichte Innenhöhe ab Grabensohle (Decke knapp über Flur)
  const halbB = breite / 2;
  const wandCy = LICHT / 2;
  const sturzOben = OBERFLAECHE + LIP - GRABEN_SOHLE; // 2,1 lokal (= Flurkante)
  return [
    // Boden (Oberkante = Grabensohle), etwas über den Eingang hinaus. Liegt auf
    // dem durchgehenden Sohle-Auffangboden auf — keine Absenkung.
    box(0, -0.5, laenge / 2, breite + 2 * WAND, 1, laenge + 2 * WAND),
    box(0, wandCy, laenge - WAND / 2, breite + 2 * WAND, LICHT, WAND), // Rückwand +Z
    box(-(halbB + WAND / 2), wandCy, laenge / 2, WAND, LICHT, laenge), // Wand −X
    box(halbB + WAND / 2, wandCy, laenge / 2, WAND, LICHT, laenge), // Wand +X
    // Erddecke über dem Raum (Unterkante lokal y = LICHT → Welt ≈ +0,2).
    box(
      0,
      LICHT + WAND / 2,
      laenge / 2,
      breite + 2 * WAND,
      WAND,
      laenge + WAND,
    ),
    // Sturz über dem Eingang (−Z): schließt die Lücke zwischen Decke und
    // Flurkante, sodass der Eingang eine niedrige Öffnung ist, kein offener Raum.
    box(
      0,
      (LICHT + sturzOben) / 2,
      -WAND / 2,
      breite + 2 * WAND,
      sturzOben - LICHT,
      WAND * 1.5,
    ),
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
    case "traverse":
      return traverse(laenge, breite);
    case "sap":
      return sap(laenge, breite);
    case "geschuetzstellung":
      return geschuetzstellung(breite / 2);
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
    const mitTag = b.tag === undefined ? welt : { ...welt, tag: b.tag };
    return b.unsichtbar ? { ...mitTag, unsichtbar: true } : mitTag;
  });
}
