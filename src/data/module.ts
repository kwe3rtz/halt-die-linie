// Rasterbaukasten für den handgebauten Greybox-Sektor (AP4-01). Jedes Modul
// liefert achsenparallele Quader (`LevelBox`) — die EINE Quelle für Render-
// Meshes (`src/render`) und Sim-Collider (`src/sim/collision`). Grobe
// Platzhalter-Geometrie, kein Balancing, keine Art.
//
// Bewusst klein und datengetrieben: derselbe Baukasten soll später der
// prozedurale Generator fürs vordere Labyrinth nutzen (KONZEPT.md §3 / §9.5).
// Keine Abstraktion über das hier Gebrauchte hinaus.
import type { Vec3 } from "../sim/math";
import type { LevelBox, Oberflaeche } from "../sim/collision";

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

// ===========================================================================
// AP6-01c — Graben-Look-Baukasten (Tiefe · Verkleidung · echter Abstieg)
// ===========================================================================
//
// Additiv zum Bestand: die alten Module (`parapet`, `unterstand`, `traverse`,
// die Kennwerte `GRABEN_SOHLE` / `PARAPET_OBERKANTE` / `FEUERTRITT_OBERKANTE`)
// bleiben **unverändert** — der echte Sektor (`sektor.ts`) und damit die
// Golden-Anker in `sim.test.ts` sind nicht betroffen. Diese Helfer bauen den
// tiefen, verkleideten Graben-Look; genutzt wird er in AP6-01c nur von der
// isolierten Probe-Szene (`probe-graben.ts`). AP6-01d rollt ihn auf den ganzen
// Sektor aus und macht den globalen Schnitt (Golden-Rebaseline).
//
// Umsetzung des Materials: **flache Farben + Formdetail-Geometrie**, keine
// Texturen (KONZEPT.md §3 „Der Graben-Look", §9.10). Das Material trägt jede
// Box als `oberflaeche`-Feld — reine Renderer-Durchreiche.

/**
 * Grabensohle im neuen Look: 2,7 m unter Feld (war 1,8). Man steht *unten
 * drin*, die Wände überragen einen. Lokal für die Probe-Module — AP6-01d
 * ersetzt damit global `GRABEN_SOHLE`.
 */
export const SOHLE_TIEF = -2.7;
/**
 * Feuertritt-Bank im neuen Look: −0,90. Auge (Fuß + 1,6) = +0,70 ≈ Kronenhöhe
 * → über die Kimme schießbar, Kopf gedeckt. Vier flache Stufen von der tiefen
 * Sohle (je 0,45 m < STEP_HEIGHT).
 */
export const FEUERTRITT_TIEF = -0.9;
/** Oberkante Erd-Brustwehr (ohne Sandsack-Krone). > STEP_HEIGHT übers Feld. */
export const BRUSTWEHR_TIEF = 0.58;
/** Oberkante Sandsack-Krone (Orientierungslinie, hellster Ton). */
export const PARAPET_KRONE_TIEF = 0.7;
/** Oberkante Parados (Rückwand) — flach, unter Druck rausklettern. */
export const PARADOS_KRONE_TIEF = 0.3;

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

/** Box aus Min/Max-Ecken mit Oberflächen-Material (für den Probe-Bau bequem). */
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
 * sind die Enden in der XZ-Ebene (die Wandfläche), `normale` zeigt als
 * Einheitsvektor in den Graben hinein ((±1,0) oder (0,±1)).
 */
export interface WandSegment {
  a: { x: number; z: number };
  b: { x: number; z: number };
  /** Welt-Y Wandfuß (Grabensohle). */
  sohle: number;
  /** Welt-Y Wandkrone (Oberkante Erdwand). */
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
 * §3): senkrechte Holz-Stützpfosten alle ~1,2 m + vier waagerechte
 * Bohlen-Kurse, beide ragen ein Stück in den Graben. Zusätzlich zur (separat
 * gebauten) Erd-Basiswand. `opt.vonY` hebt den Ansatz an (z. B. über den
 * Feuertritt, damit die Pfosten die Bank nicht verstellen).
 */
export function verkleidung(
  seg: WandSegment,
  opt: { vonY?: number; pfostenAbstand?: number } = {},
): LevelBox[] {
  const { entlangX, min, max, laenge, face, nq } = segAchsen(seg);
  const vonY = opt.vonY ?? seg.sohle;
  const abstand = opt.pfostenAbstand ?? 1.2;
  const hoehe = seg.krone - vonY;
  if (hoehe <= 0 || laenge <= 0) {
    return [];
  }
  const midY = (vonY + seg.krone) / 2;
  const out: LevelBox[] = [];

  // Stützpfosten 0,15 × H × 0,15, ~0,12 m vor der Wandfläche.
  const n = Math.max(1, Math.round(laenge / abstand));
  for (let i = 0; i <= n; i += 1) {
    const p = min + (i / n) * laenge;
    const q = face + nq * 0.06;
    out.push(
      entlangX
        ? obx(p, midY, q, 0.15, hoehe, 0.15, "holz")
        : obx(q, midY, p, 0.15, hoehe, 0.15, "holz"),
    );
  }
  // Bohlen-Kurse: vier Leisten 0,20 hoch × 0,06 vorstehend über die ganze Länge.
  const mid = (min + max) / 2;
  for (const relY of [0.4, 1.1, 1.8, 2.5]) {
    const y = vonY + relY;
    if (y + 0.1 >= seg.krone) {
      continue;
    }
    const q = face + nq * 0.03;
    out.push(
      entlangX
        ? obx(mid, y, q, laenge, 0.2, 0.06, "holz")
        : obx(q, y, mid, 0.06, 0.2, laenge, "holz"),
    );
  }
  return out;
}

/**
 * Sandsack-Krone auf einem Segment — Reihe Klötze (0,50 × 0,35 × 0,45) mit
 * kleinen Lücken (die „Kimme"), Oberkante = `oberkante`. Hellster Ton im Sektor
 * → dient der Orientierung (Horizontlinie).
 */
export function sandsackKrone(
  seg: WandSegment,
  opt: { oberkante?: number; luecke?: number } = {},
): LevelBox[] {
  const { entlangX, min, max, laenge, face, nq } = segAchsen(seg);
  const oberkante = opt.oberkante ?? PARAPET_KRONE_TIEF;
  const luecke = opt.luecke ?? 0.15;
  const sack = 0.5;
  const hoehe = 0.35;
  const cy = oberkante - hoehe / 2;
  const q = face + nq * (0.45 / 2 - 0.08); // leicht in den Graben gerückt
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
        ? obx(c, cy, q, sack, hoehe, 0.45, "sandsack")
        : obx(q, cy, c, 0.45, hoehe, sack, "sandsack"),
    );
  }
  return out;
}

/**
 * Laufrost über der Grabensohle — dünne Deckplatte (Oberkante `sohle + 0,04`)
 * als begehbare Fläche. `querStege` legt optional schmale Querleisten (0,03 m
 * vorstehend) alle ~0,5 m darüber.
 */
export function laufrost(bereich: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  sohle: number;
  querStege?: boolean;
}): LevelBox[] {
  const top = bereich.sohle + 0.04;
  const cx = (bereich.minX + bereich.maxX) / 2;
  const cz = (bereich.minZ + bereich.maxZ) / 2;
  const sx = bereich.maxX - bereich.minX;
  const sz = bereich.maxZ - bereich.minZ;
  const out: LevelBox[] = [obx(cx, top - 0.02, cz, sx, 0.04, sz, "laufrost")];
  if (bereich.querStege) {
    const n = Math.max(1, Math.round(sz / 0.5));
    for (let i = 1; i < n; i += 1) {
      out.push(
        obx(
          cx,
          top + 0.015,
          bereich.minZ + (i / n) * sz,
          sx,
          0.03,
          0.05,
          "laufrost",
        ),
      );
    }
  }
  return out;
}

/**
 * Feuertritt als vier flache Stufen von der tiefen Sohle zur Bank an der
 * Brustwehr. Die Stufen stapeln sich Richtung Wand (jede höhere reicht weniger
 * weit in den Graben), jede < STEP_HEIGHT. Riser + Tritt in `holz`.
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
  const sohle = opt.sohle ?? SOHLE_TIEF;
  const bank = opt.bank ?? FEUERTRITT_TIEF;
  const stufen = opt.stufen ?? 4;
  const cx = (opt.minX + opt.maxX) / 2;
  const sx = opt.maxX - opt.minX;
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

// Feste Maße des Abstiegs-Unterstands (auch von `abstiegUnterstandLoch` genutzt).
const US_SCHACHT_B = 1.6; // lichte Breite Treppenschacht (X)
const US_SCHACHT_T = 2.4; // Länge Treppenschacht (Z)
const US_STUFEN = 8;
const US_RAUM_B = 3.5; // lichte Breite Raum (X)
const US_RAUM_T = 3.2; // lichte Tiefe Raum (Z)
const US_WAND = 0.25;
const US_VESTIBUEL = 0.7; // offener Boden am Fuß der Treppe, vor der Decke
const US_TIEFE = 2.2; // Sohle → Raumboden (Raumboden = Auge − 1,6 unter Decke)
const US_KOPF = 2.0; // lichte Höhe Raum (Raumboden → Deckenunterkante)

/**
 * Echter Abstiegs-Unterstand (KONZEPT.md §3, Grill Q9): Treppe von der
 * Grabensohle **hinab** in einen Raum *unter* der Sohle mit Kopffreiheit
 * (lichte Höhe 2,0 m). Vollständig geschlossene Kiste — eigene Bodenplatte + 4
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
  const sohle = opt.sohle ?? SOHLE_TIEF;
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
  // Treppe hinab: diskrete Stufen (je ~0,3 m tief, ~0,28 m hoch < STEP_HEIGHT),
  // die letzte auf Raumboden-Niveau. Massiv bis zur Bodenplatte.
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
