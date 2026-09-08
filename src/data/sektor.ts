// Der handgebaute Nacht-Sektor aus KONZEPT.md §3 als reine Daten — in AP6-01d
// im **Graben-Look** und im geschrumpften „schlanke Front"-Grundriss neu
// gebaut. EINE Quelle für Render-Meshes (`src/render`) und Sim-Collider
// (`src/sim/collision`).
//
// Von der Feindseite nach hinten (KONZEPT.md §3):
//   Feindseite → Niemandsland → Frontlinie → Hinterland → Home-Line.
//
// Aufbau (AP6-01d):
//  - **Feuergraben (Front, z 17…26)** — schlank und gezähnt: 4 Feuernischen,
//    3 Erd-Traversen dazwischen (der „Zahn"), durchgehender Laufgang dahinter,
//    Parados mit den 3 Verbindungsgraben-Mündungen + 2 Ausstiegsrampen.
//    Sohle −2,7 · Feuertritt −0,90 (4 Stufen) · Brustwehr 0,58 + Sandsack-Krone
//    0,70. Zwei Bresche-Punkte: „Panzerwrack" (West-Nische, reines Loch) und
//    „Pumpenstand" (Mitte-Ost, mit Nav-Knoten). Zwei Sap-Rampen als permanente
//    Anmarsch-Schleusen.
//  - **Niemandsland (z 28…58)** — Trichter, Draht, Turmruine, eine quer
//    laufende begehbare Alt-Frontlinie.
//  - **Hinterland (z −30…12)** — kein offenes Feld, aber auch **kein Stütz-
//    oder Reservegraben** mehr: 3 Verbindungsgräben Front↔Home, die beiden
//    äußeren **gewunden** (Dog-Legs), der mittlere gerade (Express-Laufgraben,
//    der zügige Runback). Dazwischen Geländeinseln mit Deckung, außen offene
//    Flanken-Felder. Die Anzahl ist ein Parameter (`VG_ANZAHL`).
//  - **Home-Line (z −42…−32)** — der **Bunker**: Beton-Verbau, 3 Feuernischen
//    + 2 Traversen, Feuertritt + Brustwehr, offene Flanken mit 2 Rampen und
//    **3 echte Abstiegs-Unterstände** (Munitionslager · Verbandsplatz ·
//    Feldkommandeur) unter der Rückwand. Unterstände sind Spieler-Schutzraum
//    und stehen **nicht** im Nav-Graph.
//  - **Ein durchgehender Sohle-Auffangboden** unter dem ganzen Sektor, mit
//    lokalen Aussparungen unter den 3 Unterständen (deren Bodenplatten dichten
//    ab): keine Lücke, durch die eine Kapsel aus der Welt fällt (Jank-Pass).
//
// Der Sektor liefert genau EINE `frontLinie` (id "front") + EINE `homeLinie`
// (id "home"). Die Rollen-Felder tragen das Nav-Wissen (AP6-02).
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
  abstiegUnterstand,
  abstiegUnterstandLoch,
  bodenPlatten,
  feuertrittTief,
  grabenWand,
  laufrost,
  modul,
  traverseBlock,
  BRESCHE_BREITE,
  BRUSTWEHR_OBERKANTE,
  FEUERTRITT_OBERKANTE,
  GRABEN_SOHLE,
  OBERFLAECHE,
  PARADOS_OBERKANTE,
  PARAPET_OBERKANTE,
  type Rechteck,
} from "./module";

function raw(center: Vec3, size: Vec3): LevelBox {
  return { center, size };
}

// ---------------------------------------------------------------------------
// Grundmaße
// ---------------------------------------------------------------------------

// Kartengrenze (unsichtbare Sperrwände, AP5-03). AP6-01d: von x ±44 / z −60…92
// auf x ±32 / z −48…72 geschrumpft („größer heißt tiefer und gewundener, nicht
// weiter" — KONZEPT.md §3 Maßstab).
const GRENZE_X = 32;
const GRENZE_NORD = 72;
const GRENZE_SUED = -48;

// Zonen-Grenzen (lückenlose Z-Bänder über die volle Breite).
const HOME_MAX_Z = -30;
const HINTER_MIN_Z = -30;
const FRONT_MIN_Z = 12;
const FRONT_MAX_Z = 28;
const NL_MIN_Z = 28;
const NL_MAX_Z = 58;

const SOHLE = GRABEN_SOHLE; // −2,7
const CATCH_UNTEN = SOHLE - 0.8;
const IN_GRABEN = SOHLE + 0.2; // Marker knapp über der Grabensohle (−2,5)
const AUF_FELD = 0.2; // Marker knapp über der Geländeoberkante

/** Oberkante einer Verbindungsgraben-/Sap-Wand: niedrige Lippe über dem Feld. */
const VG_LIPPE = OBERFLAECHE + 0.25;

// --- Feuergraben (Front) ---------------------------------------------------
const BW_Z0 = 24.2; // Brustwehr-Innenfläche (Kollider-Ebene, Graben bei kleinerem z)
const BW_DICKE = 1.8; // → Außenkante z 26,0
const FT_TOE = 21.8; // grabenseitige Kante der untersten Feuertritt-Stufe
const NISCHE_Z0 = 19.4; // Südkante der Feuernischen = Nordkante Laufgang
const LG_Z0 = 17.0; // Südkante Laufgang = Parados-Innenfläche
const PARADOS_DICKE = 1.4; // → Parados-Außenkante z 15,6
const PARADOS_Z_AUSSEN = LG_Z0 - PARADOS_DICKE; // 15,6

/** x-Mitten der vier Feuernischen (die Traversen liegen dazwischen). */
const NISCHEN_X = [-21, -7, 7, 21];
/** x-Mitten der drei Erd-Traversen, halbe Breite 2,5. */
const TRAVERSEN_X = [-14, 0, 14];
const TRAVERSE_HALB = 2.5;

// --- Home-Line (der Bunker) ------------------------------------------------
const HOME_BW_Z0 = -33.8; // Brustwehr-Innenfläche (Graben bei kleinerem z)
const HOME_BW_DICKE = 1.8; // → Außenkante z −32,0
const HOME_FT_TOE = -36.2;
const HOME_NISCHE_Z0 = -38.4;
const HOME_LG_Z0 = -40.8; // Südkante Laufgang = Rückwand-Innenfläche
const HOME_RUECK_DICKE = 1.4; // → Rückwand-Außenkante z −42,2
const HOME_RUECK_AUSSEN = HOME_LG_Z0 - HOME_RUECK_DICKE; // −42,2
/** Halbe Länge der Home-Brustwehr — außen bleiben die Flanken offen. */
const HOME_WAND_X = 26;
const HOME_TRAVERSEN_X = [-8, 8];
const HOME_TRAVERSE_HALB = 2.2;
/** x-Mitte der beiden Home-Flankenrampen (jenseits der Brustwehr-Enden). */
const HOME_FLANKE_X = 29;

// ---------------------------------------------------------------------------
// Verbindungsgräben — Anzahl als Parameter (Grill Q12 / BACKLOG)
// ---------------------------------------------------------------------------

interface VgSlot {
  /** Kurz-Id (Nav-Knoten heißen `vg-<id><n>`, Parados-Mündung `parados-<id>`). */
  id: string;
  /** x-Mitte an der Front- und an der Home-Mündung. */
  x: number;
  /** Halbe lichte Weite an der Sohle. */
  halb: number;
  /** Nav-Knoten im Front-Laufgang, der auf die Parados-Mündung zeigt. */
  paradosNachbar: string;
  /** Dog-Leg: x-Mitte des versetzten Mittelstücks (fehlt = gerade). */
  versatzX?: number;
  /** z der beiden Knicke (nur mit `versatzX`). */
  knickZ?: [number, number];
}

/**
 * Die verfügbaren Verbindungsgraben-Plätze in Prioritätsreihenfolge. Der
 * Express-Laufgraben (gerade, der zügige Runback) ist immer dabei, die beiden
 * gewundenen Seitengräben kommen danach. `VG_ANZAHL` nimmt die ersten N —
 * eine Ein-Zeilen-Änderung baut 1, 2 oder 3 Gräben, Parados-Mündungen,
 * Home-Parapet-Lücken und Nav-Graph folgen automatisch.
 *
 * Der **echte** Schalter (Seed- oder Schwierigkeits-abgeleitet) ist Backlog —
 * hier wird nur das Datenmodell parametrisiert und fest 3 gebaut.
 */
const VG_SLOTS: readonly VgSlot[] = [
  // Mitte: der gerade Express-Laufgraben, der engste (2,0 m lichte Weite). Die
  // lange durchgehende Wand ist zugleich die AP5-01-Teleport-Gegenprobe
  // (`collision-verbindungsgraben.test.ts`).
  { id: "m", x: 0, halb: 1.0, paradosNachbar: "rl-b" },
  {
    id: "w",
    x: -16,
    halb: 1.3,
    paradosNachbar: "rl-a",
    versatzX: -23,
    knickZ: [4, -14],
  },
  {
    id: "e",
    x: 16,
    halb: 1.3,
    paradosNachbar: "rl-c",
    versatzX: 23,
    knickZ: [4, -14],
  },
];
const VG_ANZAHL = 3;
const VGS = VG_SLOTS.slice(0, VG_ANZAHL);

/** Ein gerades Grabenstück (Kanal) in Weltkoordinaten. */
interface Kanal {
  /** Achse: `true` = längs X (Querstück), `false` = längs Z. */
  entlangX: boolean;
  /** Lichter Bereich (die begehbare Sohle). */
  klar: Rechteck;
}

/** Zerlegt einen Verbindungsgraben in seine geraden Kanäle (Dog-Legs inklusive). */
function vgKanaele(vg: VgSlot, vonZ: number, bisZ: number): Kanal[] {
  const h = vg.halb;
  const laengs = (x: number, z0: number, z1: number): Kanal => ({
    entlangX: false,
    klar: {
      minX: x - h,
      maxX: x + h,
      minZ: Math.min(z0, z1),
      maxZ: Math.max(z0, z1),
    },
  });
  const quer = (z: number, x0: number, x1: number): Kanal => ({
    entlangX: true,
    klar: {
      minX: Math.min(x0, x1) - h,
      maxX: Math.max(x0, x1) + h,
      minZ: z - h,
      maxZ: z + h,
    },
  });
  if (vg.versatzX === undefined || vg.knickZ === undefined) {
    return [laengs(vg.x, bisZ, vonZ)];
  }
  const [zA, zB] = vg.knickZ;
  return [
    laengs(vg.x, zA - h, vonZ),
    quer(zA, vg.x, vg.versatzX),
    laengs(vg.versatzX, zB - h, zA + h),
    quer(zB, vg.versatzX, vg.x),
    laengs(vg.x, bisZ, zB + h),
  ];
}

/**
 * Baut die Wände eines Grabennetzes aus seinen Kanälen: je Kanal beide
 * Seitenwände, unterbrochen überall dort, wo ein **anderer** Kanal die
 * Wandfläche kreuzt (die Knicke der Dog-Legs). Dazu je Kanal ein Laufrost.
 */
function kanalNetz(kanaele: readonly Kanal[]): LevelBox[] {
  const out: LevelBox[] = [];
  for (const k of kanaele) {
    const { klar } = k;
    out.push(...laufrost({ ...klar }));
    // Für beide Seiten: Wandfläche + Normale in den Graben.
    const seiten: { face: number; n: number }[] = k.entlangX
      ? [
          { face: klar.minZ, n: 1 },
          { face: klar.maxZ, n: -1 },
        ]
      : [
          { face: klar.minX, n: 1 },
          { face: klar.maxX, n: -1 },
        ];
    const von = k.entlangX ? klar.minX : klar.minZ;
    const bis = k.entlangX ? klar.maxX : klar.maxZ;
    for (const s of seiten) {
      // Lücken: wo ein anderer Kanal genau diese Wandfläche schneidet.
      const luecken = kanaele
        .filter((o) => o !== k)
        .flatMap((o) => {
          const querMin = k.entlangX ? o.klar.minZ : o.klar.minX;
          const querMax = k.entlangX ? o.klar.maxZ : o.klar.maxX;
          if (s.face <= querMin + 1e-6 || s.face >= querMax - 1e-6) {
            return [];
          }
          const a = Math.max(von, k.entlangX ? o.klar.minX : o.klar.minZ);
          const b = Math.min(bis, k.entlangX ? o.klar.maxX : o.klar.maxZ);
          return b - a > 1e-6 ? [{ mitte: (a + b) / 2, breite: b - a }] : [];
        });
      out.push(
        ...grabenWand({
          a: k.entlangX ? { x: von, z: s.face } : { x: s.face, z: von },
          b: k.entlangX ? { x: bis, z: s.face } : { x: s.face, z: bis },
          normale: k.entlangX ? { x: 0, z: s.n } : { x: s.n, z: 0 },
          krone: VG_LIPPE,
          dicke: 1.2,
          luecken,
        }),
      );
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Breschen (AP4-03/06): EINE Quelle für Geometrie (getaggte Wand-Segmente) und
// Meta (`parapetBreschen`). Reihenfolge = Tag-Index:
//   [0] „Pumpenstand"  — Mitte-Ost-Nische, mit Nav-Knoten `bresche-front`,
//   [1] „Panzerwrack"  — West-Nische, nur physisches Loch (Audit M7 → AP7).
// Die Home-Line hat gar keinen Bresche-Nav-Zugang.
// ---------------------------------------------------------------------------
const BRESCHE_Y = -1.9; // Mitte der Lücke — der Renderer setzt darauf die Trümmer
const BRESCHEN_FRONT: Vec3[] = [
  { x: 7, y: BRESCHE_Y, z: BW_Z0 + BW_DICKE / 2 },
  { x: -21, y: BRESCHE_Y, z: BW_Z0 + BW_DICKE / 2 },
];
const BRESCHEN_HOME: Vec3[] = [
  { x: 20, y: BRESCHE_Y, z: HOME_BW_Z0 + HOME_BW_DICKE / 2 },
  { x: -20, y: BRESCHE_Y, z: HOME_BW_Z0 + HOME_BW_DICKE / 2 },
];

/** Permanente Sap-Lücken in der Brustwehr (x-Mitten) — die Anmarsch-Schleusen. */
const SAP_X = [-7, 21];
const SAP_HALB = 1.3;
const SAP_LAENGE = 6.5; // Rampe Feld → Sohle, nördlich der Brustwehr

/** x-Mitten der beiden Parados-Ausstiegsrampen (Laufgang ↔ Hinterland-Feld). */
const PARADOS_RAMPE_X = [-11, 11];
const PARADOS_RAMPE_B = 4;

function aabb(minX: number, minZ: number, maxX: number, maxZ: number): Aabb {
  // Zonen/Linien sind Säulen über die volle Höhe — nur X/Z werden geprüft.
  return { minX, minY: -8, minZ, maxX, maxY: 10, maxZ };
}

// ---------------------------------------------------------------------------
// Geometrie-Helfer
// ---------------------------------------------------------------------------

/** Unterkante aller Geländeplatten — überlappt den Sohle-Auffangboden. */
const FELD_UNTEN = SOHLE - 0.3;

/** Geländeplatte, Oberkante y = 0 (liegt über dem Sohle-Auffangboden). */
function feld(rect: Rechteck): LevelBox {
  return raw(
    {
      x: (rect.minX + rect.maxX) / 2,
      y: (FELD_UNTEN + OBERFLAECHE) / 2,
      z: (rect.minZ + rect.maxZ) / 2,
    },
    {
      x: rect.maxX - rect.minX,
      y: OBERFLAECHE - FELD_UNTEN,
      z: rect.maxZ - rect.minZ,
    },
  );
}

function feldRoh(cx: number, cz: number, sx: number, sz: number): LevelBox {
  return raw({ x: cx, y: -1.0, z: cz }, { x: sx, y: 2.0, z: sz });
}

/**
 * Niedrige Deckung / Trümmer / Trichterrand auf der Geländeoberfläche —
 * Unterkante ~−0,3, Oberkante `top` (Greybox: hoch = echte Deckung, ≤ 0,45 =
 * überschreitbar). Steht mit Abstand zu allen Nav-Kanten und den Brustwehren.
 */
function deckung(
  cx: number,
  cz: number,
  sx: number,
  sz: number,
  top: number,
): LevelBox {
  const unten = -0.3;
  return raw(
    { x: cx, y: (unten + top) / 2, z: cz },
    { x: sx, y: top - unten, z: sz },
  );
}

// ---------------------------------------------------------------------------
// Geometrie
// ---------------------------------------------------------------------------

/** Die lichten Kanäle aller Verbindungsgräben (auch für die Feld-Aussparung). */
const VG_KANAELE: Kanal[] = VGS.flatMap((vg) =>
  vgKanaele(vg, PARADOS_Z_AUSSEN, HOME_BW_Z0),
);

/** Die drei Abstiegs-Unterstände der Home-Line (Schacht-Mitten in der Sohle). */
const UNTERSTAENDE = [
  { id: "munlager", x: -16 },
  { id: "verbandsplatz", x: 0 },
  { id: "feldkommandeur", x: 16 },
] as const;
const US_SCHACHT_Z = HOME_LG_Z0;
const US_LOECHER: Rechteck[] = UNTERSTAENDE.map((u) =>
  abstiegUnterstandLoch({
    schacht: { x: u.x, z: US_SCHACHT_Z },
    richtungZ: -1,
  }),
);

/** Die begehbare Rinne der verfallenen Alt-Frontlinie im Niemandsland. */
const ALT_RINNE: Rechteck = { minX: -30, maxX: 30, minZ: 42, maxZ: 46 };
// 0,4 m tief — flacher als STEP_HEIGHT (0,5), also ohne Sprung hinein UND heraus.
const ALT_RINNE_SOHLE = -0.4;

/** Die zwei Sap-Rampen (Feld → Grabensohle) als lichte Rechtecke. */
const SAP_KLAR: Rechteck[] = SAP_X.map((x) => ({
  minX: x - SAP_HALB,
  maxX: x + SAP_HALB,
  minZ: BW_Z0 + BW_DICKE,
  maxZ: BW_Z0 + BW_DICKE + SAP_LAENGE,
}));

const boxes: LevelBox[] = [
  // === Sohle-Auffangboden — EINE durchgehende Platte unter dem ganzen Sektor
  //     (Oberkante = GRABEN_SOHLE), nur unter den drei Abstiegs-Unterständen
  //     ausgespart (deren eigene Bodenplatten dichten ab). Jeder Graben läuft
  //     darauf; keine Lücke, durch die eine Kapsel aus der Welt fällt. =========
  ...bodenPlatten(
    {
      minX: -GRENZE_X - 6,
      maxX: GRENZE_X + 6,
      minZ: GRENZE_SUED - 8,
      maxZ: GRENZE_NORD + 8,
    },
    US_LOECHER,
    CATCH_UNTEN,
    SOHLE,
  ),

  // === Kartengrenze — unsichtbare Sperrwände rundum (AP5-03) ================
  ...modul("kartengrenze", { x: -GRENZE_X, y: 0, z: GRENZE_SUED }, 0, {
    laenge: GRENZE_NORD - GRENZE_SUED,
  }),
  ...modul("kartengrenze", { x: GRENZE_X, y: 0, z: GRENZE_SUED }, 0, {
    laenge: GRENZE_NORD - GRENZE_SUED,
  }),
  ...modul("kartengrenze", { x: GRENZE_X, y: 0, z: GRENZE_NORD }, 90, {
    laenge: 2 * GRENZE_X,
  }),
  ...modul("kartengrenze", { x: GRENZE_X, y: 0, z: GRENZE_SUED }, 90, {
    laenge: 2 * GRENZE_X,
  }),

  // === Umland (AP5-03) — offenes, auslaufendes Gelände jenseits der Grenze,
  //     Oberkante bündig mit y = 0, bis in den Nacht-Dunst. Unerreichbar. =====
  feldRoh(-185, 12, 300, 760), // West (x −335 … −35)
  feldRoh(185, 12, 300, 760), // Ost (x 35 … 335)
  feldRoh(0, 274, 96, 400), // Nord (ab z = 74)
  feldRoh(0, -250, 96, 400), // Süd (bis z = −50)
  // Flache Trichterränder / Erdhaufen im Umland (≤ 1,1 m — keine Wand).
  deckung(-42, 34, 8, 6, 0.8),
  deckung(-48, -16, 9, 7, 1.0),
  deckung(43, 28, 7, 6, 0.8),
  deckung(48, -22, 10, 7, 1.1),
  deckung(-14, 84, 9, 6, 0.8),
  deckung(18, 90, 7, 5, 0.7),
  deckung(-12, -60, 7, 5, 0.7),
  deckung(20, -66, 8, 6, 1.0),

  // === Feindseite (z 58…72) — feindliches Grabenstück + Anmarschwege. Für den
  //     Spieler nicht betretbar: unsichtbare Sperrwand bei z = 64 (nördlich der
  //     Spawn-Punkte z ≈ 60–61). =============================================
  {
    ...raw({ x: 0, y: 2, z: 64 }, { x: 2 * GRENZE_X + 4, y: 8, z: 0.6 }),
    unsichtbar: true,
  },
  // Feind-Grabenlinie + Silhouette — EINE zusammenhängende Masse am Boden (keine
  // einzelnen schwebenden Klötze, Jank-Pass): Brustwehr-Berm + Kronenband +
  // geerdete Unterstands-Hügel.
  raw({ x: 0, y: -0.7, z: 67 }, { x: 56, y: 2.2, z: 4 }),
  raw({ x: 0, y: 0.9, z: 69.4 }, { x: 56, y: 2.8, z: 0.8 }),
  raw({ x: -20, y: 1.0, z: 71 }, { x: 11, y: 3.0, z: 4 }),
  raw({ x: 1, y: 1.0, z: 71 }, { x: 12, y: 3.0, z: 4 }),
  raw({ x: 21, y: 1.0, z: 71 }, { x: 11, y: 3.0, z: 4 }),

  // === Niemandsland + Feindseite: Geländefläche (z 26…76) mit Aussparungen
  //     für die zwei Sap-Rampen und die Alt-Frontlinien-Rinne. ===============
  ...bodenPlatten(
    {
      minX: -GRENZE_X - 4,
      maxX: GRENZE_X + 4,
      minZ: BW_Z0 + BW_DICKE,
      maxZ: GRENZE_NORD + 4,
    },
    [...SAP_KLAR, ALT_RINNE],
    FELD_UNTEN,
    OBERFLAECHE,
  ),
  // Die Rinne selbst: Sohle ~0,55 m unter Feld — ohne Sprung hinein/heraus.
  raw(
    {
      x: 0,
      y: (FELD_UNTEN + ALT_RINNE_SOHLE) / 2,
      z: (ALT_RINNE.minZ + ALT_RINNE.maxZ) / 2,
    },
    {
      x: ALT_RINNE.maxX - ALT_RINNE.minX,
      y: ALT_RINNE_SOHLE - FELD_UNTEN,
      z: ALT_RINNE.maxZ - ALT_RINNE.minZ,
    },
  ),
  // Verfallene Brustwehr der Alt-Frontlinie (Oberkante 0,4 — überschreitbar),
  // mit Lücken an den drei Anmarsch-Bahnen (x ≈ −16 / 0 / +16).
  deckung(-24, 46.6, 12, 0.8, 0.4),
  deckung(-8, 46.6, 12, 0.8, 0.4),
  deckung(8, 46.6, 12, 0.8, 0.4),
  deckung(24, 46.6, 12, 0.8, 0.4),
  deckung(-24, 41.4, 12, 0.8, 0.35),
  deckung(-8, 41.4, 12, 0.8, 0.35),
  deckung(8, 41.4, 12, 0.8, 0.35),
  deckung(24, 41.4, 12, 0.8, 0.35),
  // Landmark — Beobachtungsturm-Ruine (schmal + hoch), westlich der Mittelbahn.
  raw({ x: -9, y: 3.6, z: 39 }, { x: 2.6, y: 9, z: 2.6 }),
  // Ruinen-Cluster + Trichter (Deckung, in den Taschen ZWISCHEN Bahnen/Kanten).
  deckung(-25, 36, 6, 5, 1.6),
  deckung(26, 36, 6, 5, 1.6),
  deckung(-25, 51, 6, 5, 1.4),
  deckung(26, 51, 6, 5, 1.4),
  deckung(7, 50, 5, 5, 1.5),
  // Deckung, hinter der der verdeckte `reinforcement-front`-Knoten liegt
  // (westlich davon, außerhalb aller Nav-Kanten).
  deckung(-2, 33.5, 5, 3, 1.6),
  // Draht / flache Trichter (≤ 0,45 m — überschreitbar, dürfen auf Bahnen).
  deckung(-16, 32, 4, 3, 0.4),
  deckung(0, 33, 4, 3, 0.4),
  deckung(16, 32, 4, 3, 0.4),
  // Zwei Sap-Rampen: von der Feldkante (z 32,5) hinab auf die Grabensohle an
  // der Brustwehr-Lücke — permanente Anmarsch-Schleuse UND Ausstieg für den
  // Spieler. 14 flache Stufen (`modul("rampe")`).
  ...SAP_X.flatMap((x) => [
    ...modul("rampe", { x, y: 0, z: BW_Z0 + BW_DICKE + SAP_LAENGE }, 180, {
      laenge: SAP_LAENGE,
      breite: 2 * SAP_HALB,
    }),
    // Seitenwände der Sap-Rampe (niedrige Lippe, man steigt notfalls hinein).
    ...grabenWand({
      a: { x: x - SAP_HALB, z: BW_Z0 + BW_DICKE },
      b: { x: x - SAP_HALB, z: BW_Z0 + BW_DICKE + SAP_LAENGE },
      normale: { x: 1, z: 0 },
      krone: VG_LIPPE,
      dicke: 1.2,
    }),
    ...grabenWand({
      a: { x: x + SAP_HALB, z: BW_Z0 + BW_DICKE },
      b: { x: x + SAP_HALB, z: BW_Z0 + BW_DICKE + SAP_LAENGE },
      normale: { x: -1, z: 0 },
      krone: VG_LIPPE,
      dicke: 1.2,
    }),
  ]),

  // === Frontlinie (z 17…26) — der gezähnte Feuergraben ======================
  // Brustwehr: Erd-Basiswand (der Kollider) + Verkleidung über der Feuertritt-
  // Bank + Sandsack-Krone. Lücken: 2 Sap-Schleusen (permanent) und die zwei
  // Bresche-Segmente (getaggt — `setKolliderAktiv` reißt sie auf).
  ...grabenWand({
    a: { x: -GRENZE_X, z: BW_Z0 },
    b: { x: GRENZE_X, z: BW_Z0 },
    normale: { x: 0, z: -1 },
    krone: BRUSTWEHR_OBERKANTE,
    dicke: BW_DICKE,
    vonY: FEUERTRITT_OBERKANTE,
    sandsack: PARAPET_OBERKANTE,
    luecken: [
      ...SAP_X.map((x) => ({ mitte: x, breite: 2 * SAP_HALB })),
      {
        mitte: BRESCHEN_FRONT[0]!.x,
        breite: BRESCHE_BREITE,
        tag: brescheTag("front", 0),
      },
      {
        mitte: BRESCHEN_FRONT[1]!.x,
        breite: BRESCHE_BREITE,
        tag: brescheTag("front", 1),
      },
    ],
  }),
  // Feuertritt: vier flache Stufen je Abschnitt zwischen den Lücken. Eine
  // Bresche ist ein **echtes Loch** durch die ganze Brustwehr — der Feuertritt
  // ist dort unterbrochen (sonst blockiert die Bank den Feind, AP6-01).
  ...feuertrittAbschnitte(),
  // Drei Erd-Traversen zwischen den vier Feuernischen: jede reicht von der
  // Brustwehr (z 26,0) nach Süden bis an den Laufgang (z 19,4).
  ...TRAVERSEN_X.flatMap((x) =>
    traverseBlock({
      minX: x - TRAVERSE_HALB,
      maxX: x + TRAVERSE_HALB,
      minZ: NISCHE_Z0,
      maxZ: BW_Z0 + BW_DICKE,
    }),
  ),
  // Laufrost: durchgehend im Laufgang, dazu je Feuernische.
  ...laufrost({
    minX: -GRENZE_X,
    maxX: GRENZE_X,
    minZ: LG_Z0,
    maxZ: NISCHE_Z0,
  }),
  ...nischenLaufrost(),
  // Parados (Südwand) — flache Krone, Lücken für die Verbindungsgraben-
  // Mündungen und die zwei Ausstiegsrampen.
  ...grabenWand({
    a: { x: -GRENZE_X, z: LG_Z0 },
    b: { x: GRENZE_X, z: LG_Z0 },
    normale: { x: 0, z: 1 },
    krone: PARADOS_OBERKANTE,
    dicke: PARADOS_DICKE,
    sandsack: PARADOS_OBERKANTE,
    luecken: [
      ...VGS.map((vg) => ({ mitte: vg.x, breite: 2 * vg.halb })),
      ...PARADOS_RAMPE_X.map((x) => ({ mitte: x, breite: PARADOS_RAMPE_B })),
    ],
  }),
  // Zwei Ausstiegstreppen in den Parados-Lücken (KONZEPT §3: „unter Druck
  // rausklettern"). Sieben Stufen à 0,39 m füllen die Wandstärke — sie liegen
  // **in** der Lücke, der Laufgang dahinter bleibt frei.
  ...PARADOS_RAMPE_X.flatMap((x) =>
    feuertrittTief({
      minX: x - PARADOS_RAMPE_B / 2,
      maxX: x + PARADOS_RAMPE_B / 2,
      zToe: LG_Z0,
      zWand: PARADOS_Z_AUSSEN,
      bank: OBERFLAECHE,
      stufen: 7,
    }),
  ),

  // === Hinterland (z −30…12) — Geländeinseln + die Verbindungsgräben ========
  ...hinterlandFeld(),
  ...kanalNetz(VG_KANAELE),
  // Geschützstellungen (Sandsackringe) + Baracken-Ruinen als Deckung auf den
  // Inseln — mit Abstand zu den Grabenkanten.
  ...modul("geschuetzstellung", { x: -28, y: 0, z: 6 }, 0, { breite: 5 }),
  ...modul("geschuetzstellung", { x: 28, y: 0, z: -16 }, 0, { breite: 5 }),
  deckung(-8, 8, 6, 4, 1.6), // Baracken-Ruine Mittelinsel Nord
  deckung(8, -8, 6, 4, 1.6), // Baracken-Ruine Mittelinsel Mitte
  deckung(-8, -24, 6, 4, 1.4), // Trichter SW
  deckung(9, -26, 6, 4, 1.4), // Trichter SE
  deckung(-28, -26, 5, 5, 1.6), // West-Flanke Süd
  deckung(28, 8, 5, 5, 1.6), // Ost-Flanke Nord
  deckung(-19, -4, 3.2, 6, 1.2), // Dog-Leg-Insel West
  deckung(19, -4, 3.2, 6, 1.2), // Dog-Leg-Insel Ost

  // === Home-Line (z −42…−32) — der Bunker ==================================
  // Brustwehr in Beton-Verbau, nur x −26…26 (die Flanken bleiben offen — dort
  // steigt der Feind über die zwei Rampen ein). Permanente Lücken an den
  // Verbindungsgraben-Mündungen, dazu die zwei getaggten Bresche-Segmente.
  ...grabenWand({
    a: { x: -HOME_WAND_X, z: HOME_BW_Z0 },
    b: { x: HOME_WAND_X, z: HOME_BW_Z0 },
    normale: { x: 0, z: -1 },
    krone: BRUSTWEHR_OBERKANTE,
    dicke: HOME_BW_DICKE,
    vonY: FEUERTRITT_OBERKANTE,
    verbau: "beton",
    sandsack: PARAPET_OBERKANTE,
    luecken: [
      ...VGS.map((vg) => ({ mitte: vg.x, breite: 2 * vg.halb })),
      {
        mitte: BRESCHEN_HOME[0]!.x,
        breite: BRESCHE_BREITE,
        tag: brescheTag("home", 0),
      },
      {
        mitte: BRESCHEN_HOME[1]!.x,
        breite: BRESCHE_BREITE,
        tag: brescheTag("home", 1),
      },
    ],
  }),
  ...homeFeuertrittAbschnitte(),
  // Zwei Beton-Traversen zwischen den drei Home-Nischen.
  ...HOME_TRAVERSEN_X.flatMap((x) =>
    traverseBlock({
      minX: x - HOME_TRAVERSE_HALB,
      maxX: x + HOME_TRAVERSE_HALB,
      minZ: HOME_NISCHE_Z0,
      maxZ: HOME_BW_Z0 + HOME_BW_DICKE,
      verbau: "beton",
    }),
  ),
  ...laufrost({
    minX: -GRENZE_X,
    maxX: GRENZE_X,
    minZ: HOME_LG_Z0,
    maxZ: HOME_NISCHE_Z0,
  }),
  ...homeNischenLaufrost(),
  // Rückwand mit den drei Abstiegs-Schächten (Lücken so breit wie der Schacht
  // samt Verbau).
  ...grabenWand({
    a: { x: -GRENZE_X, z: HOME_LG_Z0 },
    b: { x: GRENZE_X, z: HOME_LG_Z0 },
    normale: { x: 0, z: 1 },
    krone: PARADOS_OBERKANTE,
    dicke: HOME_RUECK_DICKE,
    verbau: "beton",
    luecken: UNTERSTAENDE.map((u) => ({ mitte: u.x, breite: 2.4 })),
  }),
  // Die drei echten Abstiegs-Unterstände (Treppe hinab, Raum unter der Sohle,
  // 2,3 m Kopffreiheit) — Munitionslager · Verbandsplatz · Feldkommandeur.
  ...UNTERSTAENDE.flatMap((u) =>
    abstiegUnterstand({
      schacht: { x: u.x, z: US_SCHACHT_Z },
      richtungZ: -1,
      kappeBis: OBERFLAECHE,
    }),
  ),
  // Geländefläche südlich der Rückwand (die Unterstände liegen darunter).
  ...bodenPlatten(
    {
      minX: -GRENZE_X - 4,
      maxX: GRENZE_X + 4,
      minZ: GRENZE_SUED - 4,
      maxZ: HOME_RUECK_AUSSEN,
    },
    US_LOECHER,
    FELD_UNTEN,
    OBERFLAECHE,
  ),
  // Zwei Flankenrampen Hinterland-Feld → Home-Graben (x ±29, jenseits der
  // Brustwehr-Enden — hier steigt auch der Feind ein).
  ...[-HOME_FLANKE_X, HOME_FLANKE_X].flatMap((x) =>
    modul("rampe", { x, y: 0, z: HOME_BW_Z0 + HOME_BW_DICKE }, 180, {
      laenge: 6,
      breite: 6,
    }),
  ),
];

/**
 * Feuertritt der Frontlinie, in Abschnitten zwischen den Brustwehr-Lücken
 * (Sap-Schleusen + Breschen): an einer Lücke ist auch der Feuertritt weg.
 */
function feuertrittAbschnitte(): LevelBox[] {
  const luecken = [
    ...SAP_X.map((x) => ({ von: x - SAP_HALB, bis: x + SAP_HALB })),
    ...BRESCHEN_FRONT.map((b) => ({
      von: b.x - BRESCHE_BREITE / 2,
      bis: b.x + BRESCHE_BREITE / 2,
    })),
  ].sort((a, b) => a.von - b.von);
  const out: LevelBox[] = [];
  let cursor = -GRENZE_X;
  for (const l of [...luecken, { von: GRENZE_X, bis: GRENZE_X }]) {
    if (l.von - cursor > 0.05) {
      out.push(
        ...feuertrittTief({
          minX: cursor,
          maxX: l.von,
          zToe: FT_TOE,
          zWand: BW_Z0,
        }),
      );
    }
    cursor = Math.max(cursor, l.bis);
  }
  return out;
}

/** Dasselbe für die Home-Line (Lücken: VG-Mündungen + Breschen). */
function homeFeuertrittAbschnitte(): LevelBox[] {
  const luecken = [
    ...VGS.map((vg) => ({ von: vg.x - vg.halb, bis: vg.x + vg.halb })),
    ...BRESCHEN_HOME.map((b) => ({
      von: b.x - BRESCHE_BREITE / 2,
      bis: b.x + BRESCHE_BREITE / 2,
    })),
  ].sort((a, b) => a.von - b.von);
  const out: LevelBox[] = [];
  let cursor = -HOME_WAND_X;
  for (const l of [...luecken, { von: HOME_WAND_X, bis: HOME_WAND_X }]) {
    if (l.von - cursor > 0.05) {
      out.push(
        ...feuertrittTief({
          minX: cursor,
          maxX: l.von,
          zToe: HOME_FT_TOE,
          zWand: HOME_BW_Z0,
        }),
      );
    }
    cursor = Math.max(cursor, l.bis);
  }
  return out;
}

/** Laufrost in den vier Feuernischen (zwischen den Traversen). */
function nischenLaufrost(): LevelBox[] {
  const kanten = [
    -GRENZE_X,
    ...TRAVERSEN_X.flatMap((x) => [x - TRAVERSE_HALB, x + TRAVERSE_HALB]),
    GRENZE_X,
  ];
  const out: LevelBox[] = [];
  for (let i = 0; i < kanten.length; i += 2) {
    out.push(
      ...laufrost({
        minX: kanten[i]!,
        maxX: kanten[i + 1]!,
        minZ: NISCHE_Z0,
        maxZ: FT_TOE,
      }),
    );
  }
  return out;
}

/** Laufrost in den drei Home-Nischen. */
function homeNischenLaufrost(): LevelBox[] {
  const kanten = [
    -GRENZE_X,
    ...HOME_TRAVERSEN_X.flatMap((x) => [
      x - HOME_TRAVERSE_HALB,
      x + HOME_TRAVERSE_HALB,
    ]),
    GRENZE_X,
  ];
  const out: LevelBox[] = [];
  for (let i = 0; i < kanten.length; i += 2) {
    out.push(
      ...laufrost({
        minX: kanten[i]!,
        maxX: kanten[i + 1]!,
        minZ: HOME_NISCHE_Z0,
        maxZ: HOME_FT_TOE,
      }),
    );
  }
  return out;
}

/**
 * Das Hinterland-Feld: eine Handzerlegung in wenige große Platten statt einer
 * Gitter-Subtraktion — die Verbindungsgräben schneiden sonst hunderte
 * Mini-Platten heraus (Kollider-Budget). Die Streifen ergeben sich aus den
 * lichten Kanälen; zwischen ihnen liegen die Geländeinseln.
 */
function hinterlandFeld(): LevelBox[] {
  const minZ = HOME_BW_Z0 + HOME_BW_DICKE; // −32
  const maxZ = PARADOS_Z_AUSSEN; // 15,6
  // In X an allen Längskanal-Kanten aufteilen; je Streifen schneiden die
  // Kanäle, die ihn überdecken, Z-Stücke heraus.
  const kanten = [
    -GRENZE_X - 4,
    ...VG_KANAELE.filter((k) => !k.entlangX).flatMap((k) => [
      k.klar.minX,
      k.klar.maxX,
    ]),
    GRENZE_X + 4,
  ].sort((a, b) => a - b);
  const out: LevelBox[] = [];
  for (let i = 0; i < kanten.length - 1; i += 1) {
    const x0 = kanten[i]!;
    const x1 = kanten[i + 1]!;
    if (x1 - x0 < 0.05) {
      continue;
    }
    const mitteX = (x0 + x1) / 2;
    const schnitte = VG_KANAELE.filter(
      (k) => mitteX > k.klar.minX && mitteX < k.klar.maxX,
    )
      .map((k) => k.klar)
      .sort((a, b) => a.minZ - b.minZ);
    let cursor = minZ;
    for (const s of [...schnitte, { minZ: maxZ, maxZ }]) {
      if (s.minZ - cursor > 0.05) {
        out.push(feld({ minX: x0, maxX: x1, minZ: cursor, maxZ: s.minZ }));
      }
      cursor = Math.max(cursor, s.maxZ);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Nav-Graph (AP4-02) — handgepflegt entlang der begehbaren Route, 65 Knoten.
// Das Nav-Netz deckt bewusst nur die Grabenrouten ab (die Feind-KI läuft
// darin); die Geländeinseln sind Deckung/Roam-Raum (Roam-Nav → AP6-05). Jede
// Kante schuldet dem Begehbarkeits-Test (`navgraph-begehbarkeit.test.ts`).
// Die drei Abstiegs-Unterstände stehen **nicht** im Graphen — Spieler-
// Schutzraum, nie Feind-Route.
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

const LAUFGANG_Z = (LG_Z0 + NISCHE_Z0) / 2; // 18,2
const NISCHE_Z = (NISCHE_Z0 + FT_TOE) / 2; // 20,6
const PARADOS_Z = (PARADOS_Z_AUSSEN + LG_Z0) / 2; // 16,3
const LUECKE_Z = BW_Z0 + BW_DICKE / 2; // 25,1
const HOME_NISCHE_Z = (HOME_NISCHE_Z0 + HOME_FT_TOE) / 2; // −37,3
const HOME_LAUFGANG_Z = (HOME_LG_Z0 + HOME_NISCHE_Z0) / 2; // −39,6
const HOME_LUECKE_Z = HOME_BW_Z0 + HOME_BW_DICKE / 2; // −32,9

/** Nav-Knoten der Verbindungsgräben, aus `VG_SLOTS` abgeleitet. */
function vgKnoten(): NavKnoten[] {
  return VGS.flatMap((vg) => {
    const id = (n: number) => `vg-${vg.id}${n}`;
    if (vg.versatzX === undefined || vg.knickZ === undefined) {
      // Gerader Express-Laufgraben: gleichmäßige Kette.
      const zs = [13, 3, -9, -21, -29];
      return zs.map((z, i) => nk(id(i + 1), vg.x, z, "hinterland", IN_GRABEN));
    }
    const [zA, zB] = vg.knickZ;
    return [
      nk(id(1), vg.x, 13, "hinterland", IN_GRABEN),
      eng(nk(id(2), vg.x, zA, "hinterland", IN_GRABEN)),
      eng(nk(id(3), vg.versatzX, zA, "hinterland", IN_GRABEN)),
      eng(nk(id(4), vg.versatzX, zB, "hinterland", IN_GRABEN)),
      eng(nk(id(5), vg.x, zB, "hinterland", IN_GRABEN)),
      nk(id(6), vg.x, -29, "hinterland", IN_GRABEN),
    ];
  });
}

const navKnoten: NavKnoten[] = [
  // --- Feindseite: Spawn-/Anmarschknoten (verdeckt hinter Silhouette + Distanz)
  nk("spawn-w", -18, 60, "feindseite"),
  nk("spawn-m", 0, 61, "feindseite"),
  nk("spawn-e", 18, 60, "feindseite"),

  // --- Niemandsland: drei Bahnen (x −16 / 0 / +16), die Alt-Frontlinie quer
  //     (z ≈ 44, begehbare Rinne) und die zwei Sap-Schleusen.
  nk("nm-w1", -16, 54, "niemandsland"),
  nk("nm-m1", 0, 54, "niemandsland"),
  nk("nm-e1", 16, 54, "niemandsland"),
  nk("cr-w", -26, 47, "niemandsland"), // Flanken-Trichter (verzweigte Route)
  nk("cr-e", 26, 47, "niemandsland"),
  nk("alt-w", -16, 44, "niemandsland"),
  nk("alt-mw", -8, 44, "niemandsland"),
  nk("alt-m", 0, 44, "niemandsland"),
  nk("alt-me", 8, 44, "niemandsland"),
  nk("alt-e", 16, 44, "niemandsland"),
  nk("nm-w2", -16, 37, "niemandsland"),
  nk("nm-m2", 0, 37, "niemandsland"),
  nk("nm-e2", 16, 37, "niemandsland"),
  // Verdeckter Verstärkungs-/Watchdog-Reloc-Knoten (nie im Sichtfeld) — hinter
  // der Deckungsruine bei (−15, 34,5).
  // Nah an der „Pumpenstand"-Bresche: nach einem Linienfall infiltriert der
  // Feind genau dort, wo die Krise sitzt (KONZEPT.md §3 „materialisieren nie
  // im Sichtfeld" — der Knoten liegt hinter der Ruine bei (−2 · 33,5)).
  nk("reinforcement-front", 2, 34, "niemandsland"),
  // Direkt vor der Frontlinie: die zwei Sap-Köpfe (Horchposten am Rampenkopf)
  // und der Anmarschpunkt vor der Pumpenstand-Bresche.
  nk("vorfront-w", SAP_X[0]!, 34.5, "niemandsland"),
  nk("vorfront", BRESCHEN_FRONT[0]!.x, 29.5, "niemandsland"),
  nk("vorfront-e", SAP_X[1]!, 34.5, "niemandsland"),

  // --- Frontlinie: Sap-Schleusen (eng), vier Feuernischen, Laufgang mit den
  //     Traversen-Durchgängen (eng), Bresche, Parados-Mündungen (eng).
  eng(nk("sap-w", SAP_X[0]!, LUECKE_Z, "frontlinie", IN_GRABEN)),
  eng(nk("sap-e", SAP_X[1]!, LUECKE_Z, "frontlinie", IN_GRABEN)),
  nk("front-fw", NISCHEN_X[0]!, NISCHE_Z, "frontlinie", IN_GRABEN),
  nk("front-w", NISCHEN_X[1]!, NISCHE_Z, "frontlinie", IN_GRABEN),
  nk("front-front", NISCHEN_X[2]!, NISCHE_Z, "frontlinie", IN_GRABEN),
  nk("front-e", NISCHEN_X[3]!, NISCHE_Z, "frontlinie", IN_GRABEN),
  // Bresche-Kontaktknoten in der „Pumpenstand"-Lücke (x 7). Er liegt **im**
  // getaggten Brustwehr-Segment (Kontaktpunkt: mit stehender Wand nicht
  // begehbar, siehe Begehbarkeits-Gegenprobe) und dort auf Feldhöhe an der
  // Außenkante — von dort strömt der Feind durch die Lücke in den Graben, und
  // umgekehrt kommt eine Kapsel auch wieder aufs Feld hinaus. Die West-Bresche
  // („Panzerwrack", x −21) hat keinen Knoten — reines Loch (Audit M7 → AP7).
  eng(nk("bresche-front", BRESCHEN_FRONT[0]!.x, BW_Z0 + 1.2, "frontlinie")),
  nk("rl-1", NISCHEN_X[0]!, LAUFGANG_Z, "frontlinie", IN_GRABEN),
  nk("rl-2", NISCHEN_X[1]!, LAUFGANG_Z, "frontlinie", IN_GRABEN),
  nk("rl-3", NISCHEN_X[2]!, LAUFGANG_Z, "frontlinie", IN_GRABEN),
  nk("rl-4", NISCHEN_X[3]!, LAUFGANG_Z, "frontlinie", IN_GRABEN),
  eng(nk("rl-a", TRAVERSEN_X[0]!, LAUFGANG_Z, "frontlinie", IN_GRABEN)),
  eng(nk("rl-b", TRAVERSEN_X[1]!, LAUFGANG_Z, "frontlinie", IN_GRABEN)),
  eng(nk("rl-c", TRAVERSEN_X[2]!, LAUFGANG_Z, "frontlinie", IN_GRABEN)),
  ...VGS.map((vg) =>
    eng(nk(`parados-${vg.id}`, vg.x, PARADOS_Z, "frontlinie", IN_GRABEN)),
  ),

  // --- Hinterland: die Verbindungsgräben (Mitte gerade, außen gewunden).
  ...vgKnoten(),

  // --- Home-Line (Feind über die VG-Mündungen, die Breschen und die zwei
  //     Flankenrampen x ±29).
  eng(nk("home-graben", 0, HOME_LUECKE_Z, "homeline", IN_GRABEN)),
  nk("hb-w", -16, HOME_NISCHE_Z, "homeline", IN_GRABEN),
  nk("home-ziel", 0, HOME_NISCHE_Z, "homeline", IN_GRABEN),
  nk("hb-e", 16, HOME_NISCHE_Z, "homeline", IN_GRABEN),
  nk("hrl-w", -16, HOME_LAUFGANG_Z, "homeline", IN_GRABEN),
  nk("hrl-m", 0, HOME_LAUFGANG_Z, "homeline", IN_GRABEN),
  nk("hrl-e", 16, HOME_LAUFGANG_Z, "homeline", IN_GRABEN),
  eng(nk("hrl-a", -8, HOME_LAUFGANG_Z, "homeline", IN_GRABEN)),
  eng(nk("hrl-b", 8, HOME_LAUFGANG_Z, "homeline", IN_GRABEN)),
  eng(nk("home-w", -HOME_FLANKE_X, -39, "homeline", IN_GRABEN)),
  eng(nk("home-e", HOME_FLANKE_X, -39, "homeline", IN_GRABEN)),
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

/** Kanten der Verbindungsgräben + ihre Anbindung vorn und hinten. */
function vgKanten(): NavKante[] {
  const out: NavKante[] = [];
  for (const vg of VGS) {
    const id = (n: number) => `vg-${vg.id}${n}`;
    const n = vg.versatzX === undefined ? 5 : 6;
    for (let i = 1; i < n; i += 1) {
      out.push(auf(id(i), id(i + 1)));
    }
    // Frontlinie → Hinterland: startet zu; AP4-03 öffnet sie beim Linienfall
    // (`frontLinie.hintenKanten`).
    out.push(zu(`parados-${vg.id}`, id(1)));
    // Hinterland → Home-Line.
    out.push(auf(id(n), vg.id === "m" ? "home-graben" : `hb-${vg.id}`));
  }
  return out;
}

const navKanten: NavKante[] = [
  // Spawns → Niemandsland
  auf("spawn-w", "nm-w1"),
  auf("spawn-m", "nm-m1"),
  auf("spawn-e", "nm-e1"),
  auf("spawn-m", "nm-w1"),
  auf("spawn-m", "nm-e1"),
  // Niemandsland-Bahnen → Alt-Frontlinie (quer begehbar) → weiter nach Süden
  auf("nm-w1", "alt-w"),
  auf("nm-m1", "alt-m"),
  auf("nm-e1", "alt-e"),
  auf("nm-w1", "cr-w"),
  auf("cr-w", "alt-w"),
  auf("cr-w", "nm-w2"),
  auf("nm-e1", "cr-e"),
  auf("cr-e", "alt-e"),
  auf("cr-e", "nm-e2"),
  auf("alt-w", "alt-mw"),
  auf("alt-mw", "alt-m"),
  auf("alt-m", "alt-me"),
  auf("alt-me", "alt-e"),
  auf("alt-w", "nm-w2"),
  auf("alt-m", "nm-m2"),
  auf("alt-e", "nm-e2"),
  auf("nm-w2", "nm-m2"),
  auf("nm-e2", "nm-m2"),
  // Niemandsland → die drei Anmarschpunkte vor der Linie. Bewusst KEINE
  // Querkante zwischen ihnen: die drei Bahnen bleiben getrennt, und der Raum
  // dazwischen kann Deckung tragen.
  auf("nm-m2", "reinforcement-front"),
  auf("reinforcement-front", "vorfront"),
  auf("nm-w2", "vorfront-w"),
  auf("nm-m2", "vorfront"),
  auf("nm-e2", "vorfront-e"),
  // Niemandsland → Frontlinie (Sap-Schleusen; immer offen)
  auf("vorfront-w", "sap-w"),
  auf("vorfront-e", "sap-e"),
  auf("sap-w", "front-w"),
  auf("sap-e", "front-e"),
  // Bresche-Kontakt („Pumpenstand", x 7): an die Nische gehängt; die Kante ins
  // Niemandsland ist zu und öffnet erst, wenn AP4-03 das Parapet aufreißt.
  auf("front-front", "bresche-front"),
  zu("bresche-front", "vorfront"),
  // Feuernischen ↔ Laufgang (Zickzack um die Traversen)
  auf("front-fw", "rl-1"),
  auf("front-w", "rl-2"),
  auf("front-front", "rl-3"),
  auf("front-e", "rl-4"),
  auf("rl-1", "rl-a"),
  auf("rl-a", "rl-2"),
  auf("rl-2", "rl-b"),
  auf("rl-b", "rl-3"),
  auf("rl-3", "rl-c"),
  auf("rl-c", "rl-4"),
  // Laufgang → Parados-Mündungen: je über den Traversen-Durchgang direkt
  // davor — nur dort führt eine gerade Linie sauber durch die Wandlücke.
  ...VGS.map((vg) => auf(vg.paradosNachbar, `parados-${vg.id}`)),
  // Verbindungsgräben (inkl. `hintenKanten` und Home-Anschluss)
  ...vgKanten(),
  // Home-Line
  auf("home-graben", "home-ziel"),
  auf("hb-w", "hrl-w"),
  auf("home-ziel", "hrl-m"),
  auf("hb-e", "hrl-e"),
  auf("hrl-w", "hrl-a"),
  auf("hrl-a", "hrl-m"),
  auf("hrl-m", "hrl-b"),
  auf("hrl-b", "hrl-e"),
  auf("home-w", "hb-w"),
  auf("home-e", "hb-e"),
  auf("home-w", "hrl-w"),
  auf("home-e", "hrl-e"),
];

const navGraph: NavGraph = { knoten: navKnoten, kanten: navKanten };

// ---------------------------------------------------------------------------
// Semantische Metadaten
// ---------------------------------------------------------------------------

const meta: SektorMeta = {
  // Lückenlose Z-Bänder über die volle Breite (Feindseite nach hinten).
  zonen: [
    {
      id: "feindseite",
      bounds: aabb(-GRENZE_X, NL_MAX_Z, GRENZE_X, GRENZE_NORD),
    },
    {
      id: "niemandsland",
      bounds: aabb(-GRENZE_X, NL_MIN_Z, GRENZE_X, NL_MAX_Z),
    },
    {
      id: "frontlinie",
      bounds: aabb(-GRENZE_X, FRONT_MIN_Z, GRENZE_X, FRONT_MAX_Z),
    },
    {
      id: "hinterland",
      bounds: aabb(-GRENZE_X, HINTER_MIN_Z, GRENZE_X, FRONT_MIN_Z),
    },
    {
      id: "homeline",
      bounds: aabb(-GRENZE_X, GRENZE_SUED, GRENZE_X, HOME_MAX_Z),
    },
  ],
  frontLinie: {
    id: "front",
    bounds: aabb(-GRENZE_X, FRONT_MIN_Z, GRENZE_X, FRONT_MAX_Z),
    parapetBreschen: BRESCHEN_FRONT,
    bauSlots: NISCHEN_X.slice(0, 3).map((x) => ({
      x,
      y: IN_GRABEN,
      z: NISCHE_Z,
    })),
    // Depot im Laufgang hinter der zweiten Nische (aus der Schusslinie).
    depot: { x: -3, y: IN_GRABEN, z: LAUFGANG_Z },
    zielKnoten: "front-front",
    reinfKnoten: "reinforcement-front",
    brescheZugang: { bresche: "bresche-front", davor: "vorfront" },
    hintenKanten: VGS.map(
      (vg) => [`parados-${vg.id}`, `vg-${vg.id}1`] as const,
    ),
  },
  homeLinie: {
    id: "home",
    // Enger als das Zonen-Band (z −48…−30): der eigentliche Home-Graben
    // (Brustwehr z −32 … Rückwand z −42,2). Die Unterstände dahinter zählen
    // nicht als „Linie" (Druck / „gehalten" / Gegner-an-Linie).
    bounds: aabb(
      -GRENZE_X,
      HOME_RUECK_AUSSEN,
      GRENZE_X,
      HOME_BW_Z0 + HOME_BW_DICKE,
    ),
    parapetBreschen: BRESCHEN_HOME,
    bauSlots: [
      { x: -8, y: IN_GRABEN, z: HOME_NISCHE_Z },
      { x: 8, y: IN_GRABEN, z: HOME_NISCHE_Z },
    ],
    depot: { x: -5, y: IN_GRABEN, z: HOME_LAUFGANG_Z },
    zielKnoten: "home-ziel",
    reinfKnoten: "",
    hintenKanten: [],
  },
  feindAnmarsch: [
    { x: -18, y: AUF_FELD, z: 60 },
    { x: 0, y: AUF_FELD, z: 61 },
    { x: 18, y: AUF_FELD, z: 60 },
  ],
  homeZugaenge: [
    { id: "mitte", pos: { x: 0, y: IN_GRABEN, z: HOME_LUECKE_Z } },
    { id: "west", pos: { x: -HOME_FLANKE_X, y: IN_GRABEN, z: -39 } },
    { id: "ost", pos: { x: HOME_FLANKE_X, y: IN_GRABEN, z: -39 } },
  ],
  landmark: { x: -9, y: 0, z: 39 },
  instandPunkte: [
    {
      linie: "front",
      pos: { x: BRESCHEN_FRONT[0]!.x, y: IN_GRABEN, z: NISCHE_Z },
    },
    // Seitlich im Home-Laufgang — nicht mittig vor dem Unterstands-Schacht.
    { linie: "home", pos: { x: 5, y: IN_GRABEN, z: HOME_LAUFGANG_Z } },
  ],
  // Statische Orientierungs-Lichter für die Nacht (Petroleum-Laternen auf der
  // Grabensohle bzw. dem Feld) — je Zone mindestens eins in Reichweite
  // (Jank-Pass „Licht-Extreme": keine ganz dunkle Zone; y sitzt am Boden, keine
  // schwebenden Glut-Klötze). Die drei Unterstände sind geschlossene Räume und
  // brauchen je eins.
  lichter: [
    { x: -8, y: IN_GRABEN, z: HOME_LAUFGANG_Z }, // Home-Laufgang West
    { x: 8, y: IN_GRABEN, z: HOME_LAUFGANG_Z }, // Home-Laufgang Ost
    { x: 0, y: IN_GRABEN, z: HOME_NISCHE_Z }, // Home-Nische Mitte (Ziel)
    { x: -16, y: SOHLE - 2.3, z: -45.5 }, // Munitionslager (unter Tage)
    { x: 0, y: SOHLE - 2.3, z: -45.5 }, // Verbandsplatz
    { x: 16, y: SOHLE - 2.3, z: -45.5 }, // Feldkommandeur-Bunker
    // Je Verbindungsgraben eins — aus `VGS` abgeleitet, damit `VG_ANZAHL`
    // auch die Beleuchtung mitzieht (gerader Graben: auf der Mittellinie,
    // gewundener: im versetzten Dog-Leg-Stück).
    ...VGS.map((vg) => ({
      x: vg.versatzX ?? vg.x,
      y: IN_GRABEN,
      z: vg.versatzX === undefined ? -14 : -5,
    })),
    { x: 28, y: 0.4, z: -16 }, // Hinterland-Ost-Flanke (Geschützstellung)
    { x: -28, y: 0.4, z: 6 }, // Hinterland-West-Flanke
    { x: -3, y: IN_GRABEN, z: LAUFGANG_Z }, // Feuergraben-Laufgang (Depot)
    { x: -21, y: IN_GRABEN, z: NISCHE_Z }, // West-Nische (deckt „Panzerwrack" mit ab)
    { x: 14, y: IN_GRABEN, z: LAUFGANG_Z }, // Feuergraben Ost
    { x: -9, y: 8.4, z: 39 }, // Landmark-Turm (Leuchtkugel oben auf der Ruine)
    { x: 0, y: ALT_RINNE_SOHLE + 0.3, z: 44 }, // Alt-Frontlinie im Niemandsland
  ],
  // Leit-„Spines" (AP4-05) — seit AP5-05 nicht mehr gezeichnet (KONZEPT.md §10).
  spineRouten: [],
  // Spieler-Startpunkte im Feuergraben-Laufgang, klar zwischen den Traversen.
  spielerSpawn: [
    { x: 0, y: SOHLE + 0.4, z: LAUFGANG_Z },
    { x: NISCHEN_X[1]!, y: SOHLE + 0.4, z: LAUFGANG_Z },
    { x: NISCHEN_X[2]!, y: SOHLE + 0.4, z: LAUFGANG_Z },
  ],
  navGraph,
};

export const sektorGreybox: SektorData = {
  boxes,
  spawnPoints: meta.spielerSpawn,
  enemySpawnPoints: meta.feindAnmarsch,
  meta,
};
