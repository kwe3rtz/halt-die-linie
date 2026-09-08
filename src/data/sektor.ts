// Der handgebaute Greybox-Sektor — der Nacht-Sektor aus KONZEPT.md §3 als reine
// Daten, in AP6-01b als **echtes WW1-Grabensystem** neu gebaut (der AP6-01-Bau
// war zu schematisch: gerade Box-Korridore statt Gräben, leere Flächen). Noch
// Greybox, keine Art. EINE Quelle für Render-Meshes (`src/render`) und
// Sim-Collider (`src/sim/collision`).
//
// Von der Feindseite nach hinten (KONZEPT.md §3):
//   Feindseite → Niemandsland → Frontlinie → Hinterland → Home-Line.
//
// Aufbau (AP6-01b, Layout beschlossen 2026-09-08):
//  - **Gezähnter Feuergraben**: 5 Feuernischen (z 20…30) mit dicken Erd-
//    Traversen dazwischen (der „Zahn"), ein durchgehender Laufgang dahinter
//    (z 12…20) — man bewegt sich im Zickzack: Nische → um die Traverse →
//    nächste Nische.
//  - **Niemandsland**: Trichterfeld + eine quer laufende verfallene Alt-
//    Frontlinie (begehbare flache Rinne) + 2 Sap-Köpfe (Stichgräben nach vorn,
//    Horchposten, zugleich Anmarsch-Schleuse).
//  - **Hinterland**: kein offenes Feld — 3 Verbindungsgräben vorn↔hinten (der
//    mittlere gerade = Express-Laufgraben, lichte Breite ±1,8), ein Stützgraben
//    quer, ein Reservegraben dahinter, dazwischen Geländeinseln mit
//    Geschützstellungen + Baracken-Ruinen als Deckung.
//  - **Home-Line**: die stärkste Linie, ebenfalls gezähnt (3 Nischen, aligned
//    mit den 3 Verbindungsgraben-Mündungen), 3 begehbare Unterstände (Raum
//    unter Flur) an der Rückwand, offene Flanken.
//  - **Ein durchgehender Sohle-Auffangboden** unter dem ganzen Sektor: keine
//    Lücke, durch die eine Kapsel aus der Welt fällt (Jank-Pass).
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
  modul,
  GRABEN_SOHLE,
  OBERFLAECHE,
  BRESCHE_BREITE,
  type ParapetLuecke,
} from "./module";

function raw(center: Vec3, size: Vec3): LevelBox {
  return { center, size };
}

// --- Breschen (AP4-03/06): EINE Quelle für Geometrie (getaggte Parapet-
//     Segmente) und Meta (`parapetBreschen`). Reihenfolge = Tag-Index:
//     [0] = zentrale Feuernische („Pumpenstand") — die Frontlinie hängt hier
//          ihren `brescheZugang` ein (Nav-Knoten `bresche-front`),
//     [1] = West-Nische („Panzerwrack") — nur physisches Loch, kein Nav-Knoten
//          (Audit M7 → AP7). Die Home-Line hat gar keinen Bresche-Nav-Zugang. ---
const BRESCHEN_FRONT: Vec3[] = [
  { x: 0, y: -0.4, z: 30 },
  { x: -32, y: -0.4, z: 30 },
];
const BRESCHEN_HOME: Vec3[] = [
  { x: 16, y: -0.4, z: -44 },
  { x: -16, y: -0.4, z: -44 },
];

/**
 * Eine Parapet-Lücke für `modul("parapet", at, 90, …)`: bei 90° zeigt die
 * lokale Längsachse nach −X (`drehXZ`), also `z_lokal = at.x − x_welt`.
 */
function luecke(
  linie: string,
  atX: number,
  bresche: Vec3,
  tagIndex: number,
): ParapetLuecke {
  return {
    z: atX - bresche.x,
    breite: BRESCHE_BREITE,
    tag: brescheTag(linie, tagIndex),
  };
}

function aabb(minX: number, minZ: number, maxX: number, maxZ: number): Aabb {
  // Zonen/Linien sind Säulen über die volle Höhe — nur X/Z werden geprüft.
  return { minX, minY: -6, minZ, maxX, maxY: 10, maxZ };
}

const IN_GRABEN = GRABEN_SOHLE + 0.2; // Marker knapp über der Grabensohle (−1,6)
const AUF_FELD = 0.2; // Marker knapp über der Geländeoberkante

// Zonen-Grenzen (lückenlose Z-Bänder, volle Breite).
const FRONT_MIN_Z = 12;
const FRONT_MAX_Z = 30;
const NL_MIN_Z = 30;
const NL_MAX_Z = 56;
const HINTER_MIN_Z = -42;
const HOME_MAX_Z = -42;

// Kartengrenze (unsichtbare Sperrwände, AP5-03) — ~30 % größer als AP6-01.
const GRENZE_X = 44;
const GRENZE_NORD = 92;
const GRENZE_SUED = -60;

const WAND_TOP = OBERFLAECHE + 0.6; // Oberkante Erd-/Betonwand (> STEP_HEIGHT übers Feld)
const WAND_UNTEN = GRABEN_SOHLE - 0.6;

// ---------------------------------------------------------------------------
// Geometrie-Helfer
// ---------------------------------------------------------------------------

/** Geländeplatte, Oberkante y = 0 (liegt über dem Sohle-Auffangboden). */
function feld(cx: number, cz: number, sx: number, sz: number): LevelBox {
  return raw({ x: cx, y: -1.0, z: cz }, { x: sx, y: 2.0, z: sz });
}

/**
 * Niedrige Deckung / Trümmer / Trichterrand auf der Geländeoberfläche —
 * Unterkante ~−0,3, Oberkante `top` (Greybox: hoch = echte Deckung, ≤ 0,45 =
 * überschreitbar). Steht mit Abstand zu allen Nav-Kanten und den Parapets.
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

/**
 * Querwand (entlang X bei festem z) von `von` bis `bis`, mit Lücken (je
 * `{ x, breite }`) für Grabenmündungen / Rampen. Reicht von WAND_UNTEN bis
 * `top` (Default WAND_TOP), Dicke 0,5 m.
 */
function querwand(
  zc: number,
  von: number,
  bis: number,
  luecken: { x: number; breite: number }[] = [],
  top = WAND_TOP,
): LevelBox[] {
  const kanten: number[] = [von];
  for (const l of [...luecken].sort((a, b) => a.x - b.x)) {
    kanten.push(l.x - l.breite / 2, l.x + l.breite / 2);
  }
  kanten.push(bis);
  const out: LevelBox[] = [];
  for (let i = 0; i < kanten.length; i += 2) {
    const a = kanten[i]!;
    const b = kanten[i + 1]!;
    if (b - a > 0.05) {
      out.push(
        raw(
          { x: (a + b) / 2, y: (WAND_UNTEN + top) / 2, z: zc },
          { x: b - a, y: top - WAND_UNTEN, z: 0.5 },
        ),
      );
    }
  }
  return out;
}

/**
 * Längswand (entlang Z bei festem x) von `von` bis `bis`, mit Lücken (je
 * `{ z, breite }`) für Quergraben-Kreuzungen. Grabenwand längs, Dicke 0,5 m.
 */
function laengswand(
  xc: number,
  von: number,
  bis: number,
  luecken: { z: number; breite: number }[] = [],
  top = WAND_TOP,
): LevelBox[] {
  const kanten: number[] = [von];
  for (const l of [...luecken].sort((a, b) => a.z - b.z)) {
    kanten.push(l.z - l.breite / 2, l.z + l.breite / 2);
  }
  kanten.push(bis);
  const out: LevelBox[] = [];
  for (let i = 0; i < kanten.length; i += 2) {
    const a = kanten[i]!;
    const b = kanten[i + 1]!;
    if (b - a > 0.05) {
      out.push(
        raw(
          { x: xc, y: (WAND_UNTEN + top) / 2, z: (a + b) / 2 },
          { x: 0.5, y: top - WAND_UNTEN, z: b - a },
        ),
      );
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Geometrie
// ---------------------------------------------------------------------------

// Feuergraben: vier Erd-Traversen zwischen fünf Feuernischen (x −32/−16/0/16/32).
const TRAVERSEN_X = [-24, -8, 8, 24];
// Home-Line: zwei Traversen zwischen drei Nischen (x −24/0/24).
const HOME_TRAVERSEN_X = [-12, 12];
// Verbindungsgräben im Hinterland: x-Zentren (Mitte = Express-Laufgraben).
const VG_X = [-24, 0, 24];
// Kreuzungs-Höhen der Quergräben (Stützgraben / Reservegraben).
const STG_Z = -1;
const RSV_Z = -22;

const boxes: LevelBox[] = [
  // === Sohle-Auffangboden — EINE durchgehende Platte unter dem ganzen Sektor
  //     (Oberkante = GRABEN_SOHLE). Jeder Graben läuft darauf; keine Lücke, durch
  //     die eine Kapsel aus der Welt fällt (Jank-Pass „durchgehender Boden"). ===
  raw(
    { x: 0, y: GRABEN_SOHLE - 0.5, z: (GRENZE_NORD + GRENZE_SUED) / 2 },
    { x: 2 * GRENZE_X + 8, y: 1, z: GRENZE_NORD - GRENZE_SUED + 16 },
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
  raw({ x: -190, y: -1.5, z: 16 }, { x: 300, y: 3, z: 760 }), // West
  raw({ x: 190, y: -1.5, z: 16 }, { x: 300, y: 3, z: 760 }), // Ost
  raw({ x: 0, y: -1.5, z: 292 }, { x: 96, y: 3, z: 400 }), // Nord (ab z = 92)
  raw({ x: 0, y: -1.5, z: -260 }, { x: 96, y: 3, z: 400 }), // Süd (ab z = −60)
  // Flache Trichterränder / Erdhaufen im Umland (≤ 1,1 m — keine Wand).
  raw({ x: -54, y: 0.4, z: 34 }, { x: 8, y: 0.8, z: 6 }),
  raw({ x: -60, y: 0.5, z: -16 }, { x: 9, y: 1.0, z: 7 }),
  raw({ x: 55, y: 0.4, z: 28 }, { x: 7, y: 0.8, z: 6 }),
  raw({ x: 60, y: 0.55, z: -22 }, { x: 10, y: 1.1, z: 7 }),
  raw({ x: -16, y: 0.4, z: 104 }, { x: 9, y: 0.8, z: 6 }),
  raw({ x: 20, y: 0.35, z: 110 }, { x: 7, y: 0.7, z: 5 }),
  raw({ x: -12, y: 0.35, z: -78 }, { x: 7, y: 0.7, z: 5 }),
  raw({ x: 24, y: 0.5, z: -84 }, { x: 8, y: 1.0, z: 6 }),

  // === Feindseite (z 56…92) — feindliches Grabenstück + Anmarschwege. Für den
  //     Spieler nicht betretbar: unsichtbare Sperrwand bei z = 64 (nördlich der
  //     Spawn-Punkte z ≈ 58–60). =============================================
  feld(0, 76, 2 * GRENZE_X + 4, 40), // Feindseiten-Feld (z 56…96)
  {
    ...raw({ x: 0, y: 2, z: 64 }, { x: 2 * GRENZE_X + 4, y: 8, z: 0.6 }),
    unsichtbar: true,
  },
  // Feind-Grabenlinie + Silhouette — EINE zusammenhängende Masse am Boden (keine
  // einzelnen schwebenden Klötze, Jank-Pass): Brustwehr-Berm + Kronen-Silhouette
  // + geerdete Unterstands-Hügel.
  raw({ x: 0, y: -0.7, z: 68 }, { x: 74, y: 2.2, z: 4 }),
  raw({ x: 0, y: 0.9, z: 70.4 }, { x: 74, y: 2.8, z: 0.8 }),
  raw({ x: -26, y: 1.0, z: 74 }, { x: 12, y: 3.0, z: 4 }),
  raw({ x: 2, y: 1.0, z: 74 }, { x: 14, y: 3.0, z: 4 }),
  raw({ x: 28, y: 1.0, z: 74 }, { x: 12, y: 3.0, z: 4 }),

  // === Niemandsland (z 30…56) — Trichterfeld, Draht, Ruinen + eine quer
  //     laufende verfallene Alt-Frontlinie (begehbar). =======================
  feld(0, 43, 2 * GRENZE_X + 4, NL_MAX_Z - NL_MIN_Z), // Niemandsland-Feld (z 30…56)
  // Verfallene Alt-Frontlinie: flache begehbare Rinne quer (z ≈ 45…49, ~0,6 m
  // tief — ohne Sprung hinein/heraus), niedrige gebrochene Brustwehr mit Lücken
  // für die drei Anmarsch-Bahnen (x ≈ −22 / 0 / +22).
  raw({ x: 0, y: -0.8, z: 47 }, { x: 84, y: 0.6, z: 4.2 }), // Rinnensohle (Oberkante −0,5)
  // Verfallene Brustwehr, Oberkante 0,4 (überall überschreitbar — man bewegt
  // sich frei durch die Alt-Frontlinie), mit Lücken an den drei Anmarsch-Bahnen.
  raw({ x: -33, y: -0.15, z: 49.6 }, { x: 18, y: 1.1, z: 0.6 }),
  raw({ x: -10, y: -0.15, z: 49.6 }, { x: 16, y: 1.1, z: 0.6 }),
  raw({ x: 13, y: -0.15, z: 49.6 }, { x: 16, y: 1.1, z: 0.6 }),
  raw({ x: 34, y: -0.15, z: 49.6 }, { x: 16, y: 1.1, z: 0.6 }),
  raw({ x: -30, y: -0.25, z: 44.6 }, { x: 24, y: 1.0, z: 0.6 }),
  raw({ x: 0, y: -0.25, z: 44.6 }, { x: 22, y: 1.0, z: 0.6 }),
  raw({ x: 30, y: -0.25, z: 44.6 }, { x: 24, y: 1.0, z: 0.6 }),
  // Landmark — Beobachtungsturm-Ruine (schmal + hoch), westlich der Mittelbahn.
  raw({ x: -10, y: 3.6, z: 42 }, { x: 2.6, y: 9, z: 2.6 }),
  // Ruinen-Cluster + Trichter (Deckung, in den Taschen ZWISCHEN Bahnen/Kanten).
  deckung(-30, 38, 7, 5, 1.6),
  deckung(30, 38, 7, 5, 1.6),
  deckung(-30, 53, 7, 5, 1.4),
  deckung(30, 53, 7, 5, 1.4),
  deckung(8, 52, 6, 5, 1.5),
  // Deckung, hinter der der verdeckte `reinforcement-front`-Knoten liegt.
  deckung(-11, 37, 5, 4, 1.6),
  // Draht / flache Trichter (≤ 0,45 m — überschreitbar, dürfen auf Bahnen).
  deckung(-22, 43, 4, 3, 0.4),
  deckung(22, 43, 4, 3, 0.4),
  deckung(0, 36, 4, 3, 0.4),
  // Zwei Sap-Köpfe (Stichgräben nach vorn, Horchposten): vom Feuergraben durch
  // die Parapet-Lücken bei x = ±16 nach Norden in den Trichterbereich.
  ...modul("sap", { x: -16, y: 0, z: NL_MIN_Z }, 0, { laenge: 7, breite: 3 }),
  ...modul("sap", { x: 16, y: 0, z: NL_MIN_Z }, 0, { laenge: 7, breite: 3 }),

  // === Frontlinie (z 12…30) — gezähnter Feuergraben ========================
  // Parapet (Nordwand, Blick nach Niemandsland) bei z = 30, in drei Segmenten
  // mit zwei Sap-Lücken (x −17,5…−14,5 / 14,5…17,5) dazwischen. Bresche [0]
  // „Pumpenstand" in der zentralen Nische (x = 0, Nav-Knoten), Bresche [1]
  // „Panzerwrack" in der West-Nische (x = −32, reines Loch).
  ...modul("parapet", { x: -17.5, y: 0, z: 30 }, 90, {
    laenge: GRENZE_X - 17.5, // x −44 … −17,5
    luecken: [luecke("front", -17.5, BRESCHEN_FRONT[1]!, 1)],
  }),
  ...modul("parapet", { x: 14.5, y: 0, z: 30 }, 90, {
    laenge: 29, // x −14,5 … 14,5
    luecken: [luecke("front", 14.5, BRESCHEN_FRONT[0]!, 0)],
  }),
  ...modul("parapet", { x: GRENZE_X, y: 0, z: 30 }, 90, {
    laenge: GRENZE_X - 17.5, // x 17,5 … 44
  }),
  // Vier Erd-Traversen zwischen den fünf Feuernischen: jede ragt von der
  // Brustwehr (z 30) nach Süden bis z ≈ 20 in den Graben — der Laufgang dahinter
  // (z 12…20) bleibt frei, der Weg zickt Nische↔Laufgang↔Nische.
  ...TRAVERSEN_X.flatMap((x) =>
    modul("traverse", { x, y: 0, z: 20 }, 0, { laenge: 11, breite: 5 }),
  ),
  // Parados (Südwand) bei z = 11,5 — Lücken für die drei Verbindungsgraben-
  // Mündungen (x −24 / 0 / +24) + zwei Rampen ins Hinterland-Feld (x ±11).
  ...querwand(11.5, -GRENZE_X, GRENZE_X, [
    { x: -24, breite: 5.4 },
    { x: -11, breite: 4 },
    { x: 0, breite: 5.4 },
    { x: 11, breite: 4 },
    { x: 24, breite: 5.4 },
  ]),
  // Zwei Rampen Feuergraben-Laufgang ↔ Hinterland-Feld (x ±11, z 11,5…16).
  ...modul("rampe", { x: -11, y: 0, z: 11.5 }, 0, { laenge: 4.5, breite: 4 }),
  ...modul("rampe", { x: 11, y: 0, z: 11.5 }, 0, { laenge: 4.5, breite: 4 }),

  // === Hinterland (z −42…12) — kein offenes Feld ===========================
  // Drei Verbindungsgräben längs (x −24 / 0 / +24). Mitte lichte Breite ±1,8
  // (Express-Laufgraben, gerade), West/Ost ±2,6. Wände z −44 … 11, Lücken an den
  // Quergraben-Kreuzungen (Stützgraben z −1, Reservegraben z −22).
  ...VG_X.flatMap((xc) => {
    const halb = xc === 0 ? 1.8 : 2.6;
    // Der mittlere Express-Laufgraben bekommt nur schmale Quergraben-Durchlässe
    // (Sally-Ports) — der Rest bleibt eine lange durchgehende Wand (die
    // AP5-01-Gegenprobe in `collision-verbindungsgraben.test.ts` braucht sie).
    const breite = xc === 0 ? 3.4 : 6;
    const luecken = [
      { z: STG_Z, breite },
      { z: RSV_Z, breite },
    ];
    return [
      ...laengswand(xc - halb - 0.25, -44, 11, luecken),
      ...laengswand(xc + halb + 0.25, -44, 11, luecken),
    ];
  }),
  // Stützgraben quer bei z ≈ −1 (Sohle), x −25 … 25 — Nord-/Südwand, Lücken an
  // den drei Verbindungsgräben.
  ...querwand(
    STG_Z + 2,
    -25,
    25,
    VG_X.map((x) => ({ x, breite: 6.4 })),
  ),
  ...querwand(
    STG_Z - 2,
    -25,
    25,
    VG_X.map((x) => ({ x, breite: 6.4 })),
  ),
  // Reservegraben quer bei z ≈ −22 (Sohle), x −25 … 25.
  ...querwand(
    RSV_Z + 2,
    -25,
    25,
    VG_X.map((x) => ({ x, breite: 6.4 })),
  ),
  ...querwand(
    RSV_Z - 2,
    -25,
    25,
    VG_X.map((x) => ({ x, breite: 6.4 })),
  ),
  // Geländeinseln (Oberkante y = 0) — füllen die Flächen zwischen den Gräben.
  // Innentaschen (zwischen den Verbindungsgräben, gedeckt von Wänden — Deckung).
  feld(-13, 5.5, 15, 10), // NW-Innentasche (x −20,5…−5,5, z 0,5…10,5)
  feld(13, 5.5, 15, 10), // NE
  feld(-13, -11.5, 15, 18), // MW-Innentasche (z −20,5…−2,5)
  feld(13, -11.5, 15, 18),
  feld(-13, -33, 15, 16), // SW-Innentasche (z −41…−25)
  feld(13, -33, 15, 16),
  // Flanken-Felder (x ±27…44, laufen die ganze Hinterland-Tiefe) — offene Route
  // außen an den Gräben, mit Geschützstellungen; an den Home-Flankenrampen
  // angebunden.
  feld(-35, -15, 18, 54), // West-Flanke (x −44…−26, z −42…12)
  feld(35, -15, 18, 54), // Ost-Flanke
  // Zwei Rampen Feuergraben-Laufgang ↔ NW/NE-Innentasche liegen schon oben
  // (Parados-Rampen x ±11).
  // Geschützstellungen (Sandsackringe) + Baracken-Ruinen (Deckung, auf den
  // Inseln — nicht in den Grabenlinien, mit Abstand zu den Nav-Kanten).
  ...modul("geschuetzstellung", { x: -35, y: 0, z: 4 }, 0, { breite: 5 }),
  ...modul("geschuetzstellung", { x: 35, y: 0, z: -14 }, 0, { breite: 5 }),
  deckung(-13, 5, 6, 4, 1.6), // Baracken-Ruine NW-Insel
  deckung(13, -12, 6, 4, 1.6), // Baracken-Ruine NE/ME-Insel
  deckung(-13, -33, 6, 4, 1.4), // Trichter SW
  deckung(13, -33, 6, 4, 1.4), // Trichter SE
  deckung(-35, -33, 6, 5, 1.6), // West-Flanke Süd
  deckung(35, 4, 6, 5, 1.6), // Ost-Flanke Nord

  // === Home-Line (z −60…−42) — die stärkste Linie, gezähnt =================
  // Parapet (Nordwand, Blick ins Hinterland) bei z = −44 — vier Segmente:
  // permanente Lücken an den drei Verbindungsgraben-Mündungen (x −24 / 0 / +24),
  // Breschen [0] Ost (x = 16) / [1] West (x = −16) je als getaggtes Segment,
  // offene Flanken x < −32 / x > 32.
  ...modul("parapet", { x: -26.5, y: 0, z: -44 }, 90, { laenge: 5.5 }), // x −32…−26,5
  ...modul("parapet", { x: -2.5, y: 0, z: -44 }, 90, {
    laenge: 19, // x −21,5…−2,5
    luecken: [luecke("home", -2.5, BRESCHEN_HOME[1]!, 1)],
  }),
  ...modul("parapet", { x: 21.5, y: 0, z: -44 }, 90, {
    laenge: 19, // x 2,5…21,5
    luecken: [luecke("home", 21.5, BRESCHEN_HOME[0]!, 0)],
  }),
  ...modul("parapet", { x: 32, y: 0, z: -44 }, 90, { laenge: 5.5 }), // x 26,5…32
  // Zwei Erd-Traversen zwischen den drei Home-Nischen (x ±12): ragen von der
  // Brustwehr (z −44) nach Süden bis z ≈ −48.
  ...HOME_TRAVERSEN_X.flatMap((x) =>
    modul("traverse", { x, y: 0, z: -48 }, 0, { laenge: 4.5, breite: 5 }),
  ),
  // Rückwand (Süd) bei z = −52,5 — drei Lücken für die Unterstände (x −24/0/24).
  ...querwand(-52.5, -GRENZE_X, GRENZE_X, [
    { x: -24, breite: 4.6 },
    { x: 0, breite: 4.6 },
    { x: 24, breite: 4.6 },
  ]),
  // Drei begehbare Unterstände (Raum unter Flur) hinter der Rückwand:
  // Munitionslager / Verbandsplatz / Feldkommandeur. `drehung 180` → der Raum
  // liegt SÜDLICH der Rückwand (z < −52,5), die Öffnung zeigt nach Norden in den
  // Home-Graben.
  ...modul("unterstand", { x: -24, y: GRABEN_SOHLE, z: -52.5 }, 180, {
    breite: 4,
    laenge: 4,
  }),
  ...modul("unterstand", { x: 0, y: GRABEN_SOHLE, z: -52.5 }, 180, {
    breite: 4,
    laenge: 4,
  }),
  ...modul("unterstand", { x: 24, y: GRABEN_SOHLE, z: -52.5 }, 180, {
    breite: 4,
    laenge: 4,
  }),
  // Zwei Flankenrampen Hinterland-Flanke → Home-Graben (jenseits der Parapet-
  // Enden, x ≈ ±38 — hier steigt auch der Feind ein).
  ...modul("rampe", { x: -38, y: 0, z: -42 }, 180, { laenge: 5, breite: 6 }),
  ...modul("rampe", { x: 38, y: 0, z: -42 }, 180, { laenge: 5, breite: 6 }),
];

// ---------------------------------------------------------------------------
// Nav-Graph (AP4-02) — handgepflegt entlang der begehbaren Route. ~75 Knoten
// (AP6-01b: +30 % Größe, gezähnter Feuergraben, Verbindungsgraben-Netz). Das
// Nav-Netz deckt bewusst nur die Grabenrouten ab (die Feind-KI läuft darin);
// die Geländeinseln sind Deckung/Roam-Raum (Roam-Nav → AP6-05). Jede Kante
// schuldet dem Begehbarkeits-Test (`navgraph-begehbarkeit.test.ts`).
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
  // --- Feindseite: Spawn-/Anmarschknoten (verdeckt hinter Silhouette + Distanz)
  nk("spawn-w", -24, 59, "feindseite"),
  nk("spawn-m", 0, 60, "feindseite"),
  nk("spawn-e", 24, 59, "feindseite"),

  // --- Niemandsland: drei Bahnen (x −22 / 0 / +22), die Alt-Frontlinie quer
  //     (z ≈ 47, begehbar) und zwei Sap-Köpfe.
  nk("nm-w1", -22, 53, "niemandsland"),
  nk("nm-m1", 0, 53, "niemandsland"),
  nk("nm-e1", 22, 53, "niemandsland"),
  nk("cr-w", -33, 44, "niemandsland"), // Flanken-Trichter (verzweigte Route)
  nk("cr-e", 33, 44, "niemandsland"),
  nk("alt-w", -22, 47, "niemandsland"),
  nk("alt-mw", -11, 47, "niemandsland"),
  nk("alt-m", 0, 47, "niemandsland"),
  nk("alt-me", 11, 47, "niemandsland"),
  nk("alt-e", 22, 47, "niemandsland"),
  nk("nm-w2", -22, 40, "niemandsland"),
  nk("nm-m2", 0, 40, "niemandsland"),
  nk("nm-e2", 22, 40, "niemandsland"),
  // Verdeckter Verstärkungs-/Watchdog-Reloc-Knoten (nie im Sichtfeld) — hinter
  // der Deckungsruine bei (−11, 37).
  nk("reinforcement-front", -8, 35, "niemandsland"),
  // Sap-Köpfe (Horchposten, vorn im Trichterbereich).
  nk("sapkopf-w", -16, 37, "niemandsland"),
  nk("sapkopf-e", 16, 37, "niemandsland"),
  // Direkt vor der Frontlinie (`vorfront` = `frontLinie.brescheZugang.davor`).
  nk("vorfront-w", -16, 33, "niemandsland"),
  nk("vorfront", 0, 33, "niemandsland"),
  nk("vorfront-e", 16, 33, "niemandsland"),

  // --- Frontlinie: Sap-Lücken (eng), fünf Feuernischen, Laufgang, Bresche,
  //     Parados-Mündungen (eng).
  eng(nk("sap-w", -16, 30, "frontlinie")),
  eng(nk("sap-e", 16, 30, "frontlinie")),
  nk("front-fw", -32, 25, "frontlinie", IN_GRABEN),
  nk("front-w", -16, 25, "frontlinie", IN_GRABEN),
  nk("front-front", 0, 25, "frontlinie", IN_GRABEN),
  nk("front-e", 16, 25, "frontlinie", IN_GRABEN),
  nk("front-fe", 32, 25, "frontlinie", IN_GRABEN),
  nk("rl-1", -32, 16, "frontlinie", IN_GRABEN),
  nk("rl-2", -16, 16, "frontlinie", IN_GRABEN),
  nk("rl-3", 0, 16, "frontlinie", IN_GRABEN),
  nk("rl-4", 16, 16, "frontlinie", IN_GRABEN),
  nk("rl-5", 32, 16, "frontlinie", IN_GRABEN),
  // Traversen-Durchgänge (eng): der Weg zwängt sich im Laufgang an jeder Traverse
  // vorbei — exakt durchlaufen, keine Ecke schneiden.
  eng(nk("rl-a", -24, 16, "frontlinie", IN_GRABEN)),
  eng(nk("rl-b", -8, 16, "frontlinie", IN_GRABEN)),
  eng(nk("rl-c", 8, 16, "frontlinie", IN_GRABEN)),
  eng(nk("rl-d", 24, 16, "frontlinie", IN_GRABEN)),
  // Bresche-Kontaktknoten auf der zentralen Nische (x = 0) =
  // `frontLinie.brescheZugang.bresche`. Die West-Bresche (x = −32) hat keinen
  // Knoten — reines Loch (Audit M7 → AP7).
  eng(nk("bresche-front", 0, 30, "frontlinie")),
  eng(nk("parados-w", -24, 12, "frontlinie", IN_GRABEN)),
  eng(nk("parados-m", 0, 12, "frontlinie", IN_GRABEN)),
  eng(nk("parados-e", 24, 12, "frontlinie", IN_GRABEN)),

  // --- Hinterland: drei Verbindungsgräben (Mitte gerade = Express-Laufgraben),
  //     Stützgraben quer (z −1), Reservegraben quer (z −22).
  nk("vg-m1", 0, 7, "hinterland", IN_GRABEN),
  nk("vg-m2", 0, -1, "hinterland", IN_GRABEN),
  nk("vg-m3", 0, -12, "hinterland", IN_GRABEN),
  nk("vg-m4", 0, -22, "hinterland", IN_GRABEN),
  nk("vg-m5", 0, -34, "hinterland", IN_GRABEN),
  nk("vg-w1", -24, 7, "hinterland", IN_GRABEN),
  nk("vg-w2", -24, -1, "hinterland", IN_GRABEN),
  nk("vg-w3", -24, -12, "hinterland", IN_GRABEN),
  nk("vg-w4", -24, -22, "hinterland", IN_GRABEN),
  nk("vg-w5", -24, -34, "hinterland", IN_GRABEN),
  nk("vg-e1", 24, 7, "hinterland", IN_GRABEN),
  nk("vg-e2", 24, -1, "hinterland", IN_GRABEN),
  nk("vg-e3", 24, -12, "hinterland", IN_GRABEN),
  nk("vg-e4", 24, -22, "hinterland", IN_GRABEN),
  nk("vg-e5", 24, -34, "hinterland", IN_GRABEN),
  nk("stg-w", -12, -1, "hinterland", IN_GRABEN),
  nk("stg-e", 12, -1, "hinterland", IN_GRABEN),
  nk("rsv-w", -12, -22, "hinterland", IN_GRABEN),
  nk("rsv-e", 12, -22, "hinterland", IN_GRABEN),

  // --- Home-Line (Feind über die Flankenrampen x ±38 + die Mittel-Lücke +
  //     die West/Ost-Verbindungsgraben-Mündungen)
  nk("home-graben", 0, -43, "homeline", IN_GRABEN),
  nk("hb-w", -24, -46, "homeline", IN_GRABEN),
  nk("home-ziel", 0, -46, "homeline", IN_GRABEN),
  nk("hb-e", 24, -46, "homeline", IN_GRABEN),
  nk("hrl-w", -24, -50, "homeline", IN_GRABEN),
  nk("hrl-m", 0, -50, "homeline", IN_GRABEN),
  nk("hrl-e", 24, -50, "homeline", IN_GRABEN),
  eng(nk("hrl-a", -12, -50, "homeline", IN_GRABEN)), // Home-Traversen-Durchgang
  eng(nk("hrl-b", 12, -50, "homeline", IN_GRABEN)),
  eng(nk("home-w", -38, -46, "homeline", IN_GRABEN)),
  eng(nk("home-e", 38, -46, "homeline", IN_GRABEN)),
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
  // Niemandsland → Sap-Köpfe / reinforcement / vorfront
  auf("nm-w2", "sapkopf-w"),
  auf("nm-m2", "reinforcement-front"),
  auf("nm-e2", "sapkopf-e"),
  auf("sapkopf-w", "vorfront-w"),
  auf("sapkopf-e", "vorfront-e"),
  auf("reinforcement-front", "vorfront"),
  auf("nm-m2", "vorfront"),
  auf("vorfront-w", "vorfront"),
  auf("vorfront-e", "vorfront"),
  // Niemandsland → Frontlinie (Sap-Lücken; immer offen)
  auf("vorfront-w", "sap-w"),
  auf("vorfront", "sap-w"),
  auf("vorfront", "sap-e"),
  auf("vorfront-e", "sap-e"),
  auf("sap-w", "front-w"),
  auf("sap-e", "front-e"),
  // Feuernischen ↔ Laufgang (Zickzack um die Traversen — Nische und Laufgang
  // liegen auf derselben x, die Traversen sitzen dazwischen)
  auf("front-fw", "rl-1"),
  auf("front-w", "rl-2"),
  auf("front-front", "rl-3"),
  auf("front-e", "rl-4"),
  auf("front-fe", "rl-5"),
  auf("rl-1", "rl-a"),
  auf("rl-a", "rl-2"),
  auf("rl-2", "rl-b"),
  auf("rl-b", "rl-3"),
  auf("rl-3", "rl-c"),
  auf("rl-c", "rl-4"),
  auf("rl-4", "rl-d"),
  auf("rl-d", "rl-5"),
  // Bresche-Kontakt (zentrale Nische x = 0): an die Nische gehängt; die Kante
  // ins Niemandsland ist zu und öffnet erst, wenn AP4-03 das Parapet aufreißt.
  auf("front-front", "bresche-front"),
  zu("bresche-front", "vorfront"),
  // Laufgang → Parados-Mündungen
  auf("rl-1", "parados-w"),
  auf("rl-2", "parados-w"),
  auf("rl-3", "parados-m"),
  auf("rl-4", "parados-e"),
  auf("rl-5", "parados-e"),
  // Frontlinie → Hinterland: starten zu; AP4-03 öffnet sie beim Linienfall
  // (`frontLinie.hintenKanten`). Drei parallele Rückwege.
  zu("parados-w", "vg-w1"),
  zu("parados-m", "vg-m1"),
  zu("parados-e", "vg-e1"),
  // Hinterland — drei Verbindungsgräben (Gelände immer begehbar)
  auf("vg-m1", "vg-m2"),
  auf("vg-m2", "vg-m3"),
  auf("vg-m3", "vg-m4"),
  auf("vg-m4", "vg-m5"),
  auf("vg-w1", "vg-w2"),
  auf("vg-w2", "vg-w3"),
  auf("vg-w3", "vg-w4"),
  auf("vg-w4", "vg-w5"),
  auf("vg-e1", "vg-e2"),
  auf("vg-e2", "vg-e3"),
  auf("vg-e3", "vg-e4"),
  auf("vg-e4", "vg-e5"),
  // Stützgraben quer verbindet die drei (bei z ≈ −1)
  auf("vg-w2", "stg-w"),
  auf("stg-w", "vg-m2"),
  auf("vg-m2", "stg-e"),
  auf("stg-e", "vg-e2"),
  // Reservegraben quer verbindet die drei (bei z ≈ −22)
  auf("vg-w4", "rsv-w"),
  auf("rsv-w", "vg-m4"),
  auf("vg-m4", "rsv-e"),
  auf("rsv-e", "vg-e4"),
  // Hinterland → Home-Line
  auf("vg-w5", "hb-w"),
  auf("vg-e5", "hb-e"),
  auf("vg-m5", "home-graben"),
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
    bauSlots: [
      { x: -16, y: IN_GRABEN, z: 25 },
      { x: 0, y: IN_GRABEN, z: 25 },
      { x: 16, y: IN_GRABEN, z: 25 },
    ],
    // Depot im Laufgang hinter der zentralen Nische (aus der Schusslinie).
    depot: { x: -4, y: IN_GRABEN, z: 14 },
    zielKnoten: "front-front",
    reinfKnoten: "reinforcement-front",
    brescheZugang: { bresche: "bresche-front", davor: "vorfront" },
    hintenKanten: [
      ["parados-w", "vg-w1"],
      ["parados-m", "vg-m1"],
      ["parados-e", "vg-e1"],
    ],
  },
  homeLinie: {
    id: "home",
    // Enger als das Zonen-Band (z −60…−42): der eigentliche Home-Graben
    // (Parapet z −44 … Rückwand z −53). Die Unterstände dahinter zählen nicht
    // als „Linie" (Druck / „gehalten" / Gegner-an-Linie).
    bounds: aabb(-GRENZE_X, -53, GRENZE_X, HOME_MAX_Z),
    parapetBreschen: BRESCHEN_HOME,
    bauSlots: [
      { x: -12, y: IN_GRABEN, z: -47 },
      { x: 12, y: IN_GRABEN, z: -47 },
    ],
    depot: { x: -6, y: IN_GRABEN, z: -50 },
    zielKnoten: "home-ziel",
    reinfKnoten: "",
    hintenKanten: [],
  },
  feindAnmarsch: [
    { x: -24, y: AUF_FELD, z: 59 },
    { x: 0, y: AUF_FELD, z: 60 },
    { x: 24, y: AUF_FELD, z: 59 },
  ],
  homeZugaenge: [
    { id: "mitte", pos: { x: 0, y: IN_GRABEN, z: -44 } },
    { id: "west", pos: { x: -38, y: IN_GRABEN, z: -45 } },
    { id: "ost", pos: { x: 38, y: IN_GRABEN, z: -45 } },
  ],
  landmark: { x: -10, y: 0, z: 42 },
  instandPunkte: [
    { linie: "front", pos: { x: 0, y: IN_GRABEN, z: 25 } },
    { linie: "home", pos: { x: 0, y: IN_GRABEN, z: -47 } },
  ],
  // Statische Orientierungs-Lichter für die Nacht (Feuertonnen auf der
  // Grabensohle bzw. dem Feld) — je Zone mindestens eins in Reichweite
  // (Jank-Pass „Licht-Extreme": keine ganz dunkle Zone; y sitzt am Boden, keine
  // schwebenden Glut-Klötze).
  lichter: [
    { x: 0, y: -0.9, z: -46 }, // Home-Graben Mitte
    { x: -22, y: -0.9, z: -47 }, // Home West
    { x: 22, y: -0.9, z: -47 }, // Home Ost
    { x: 0, y: -0.9, z: -22 }, // Reservegraben
    { x: -24, y: -0.9, z: -6 }, // West-Verbindungsgraben (sonst dunkel)
    { x: 24, y: -0.9, z: -6 }, // Ost-Verbindungsgraben
    { x: 35, y: 0.5, z: -14 }, // Hinterland-Ost-Flanke (Geschützstellung)
    { x: -4, y: -0.9, z: 15 }, // Feuergraben-Laufgang (Depot)
    { x: -30, y: -0.9, z: 24 }, // Feuernische West (deckt die West-Bresche mit ab)
    { x: 20, y: -0.9, z: 25 }, // Feuernische Ost
    { x: -10, y: 8.4, z: 42 }, // Landmark-Turm (Leuchtkugel oben auf der Ruine)
    { x: 0, y: 0.4, z: 47 }, // Alt-Frontlinie im Niemandsland
  ],
  // Leit-„Spines" (AP4-05) — seit AP5-05 nicht mehr gezeichnet (KONZEPT.md §10).
  spineRouten: [],
  // Spieler-Startpunkte im Feuergraben-Laufgang, klar zwischen den Traversen.
  spielerSpawn: [
    { x: 0, y: -1.4, z: 16 },
    { x: -16, y: -1.4, z: 16 },
    { x: 16, y: -1.4, z: 16 },
  ],
  navGraph,
};

export const sektorGreybox: SektorData = {
  boxes,
  spawnPoints: meta.spielerSpawn,
  enemySpawnPoints: meta.feindAnmarsch,
  meta,
};
