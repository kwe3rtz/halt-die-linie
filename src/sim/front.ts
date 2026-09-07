// Frontlinie & Home-Line: Besitz, Bresche, Fall (AP4-03, auf eine Linie
// reduziert in AP6-02). Eine Zustandsmaschine je Linie über die Geometrie/Meta
// aus `src/data/sektor.ts`. Reine, in-place fortgeschriebene Logik — kein
// Babylon, kein Math.random, Zeit nur als `dt` (goldene Regel).
//
// Ablauf je Linie: stabil → bedraengt → gebrochen → verloren. Vorwärts durch
// Feinddruck und aufgerissene Parapet-Breschen; rückwärts (nur bis `stabil`, nie
// aus `verloren`) durch anhaltende Ruhe. Der Übergang nach `verloren` meldet sich
// per `onVerloren`-Callback — dort hängt die Sim das AP4-02-Verhalten an
// (Nav-Kanten nach hinten öffnen, Infiltrations-Spawn, Depot als verloren).
//
// Der Nacht-Sektor hat genau zwei Linien: die Frontlinie und die (befestigte)
// Home-Line. `updateFront` schreibt jeweils eine Linie fort — die Sim ruft es
// zweimal auf. Die „gehalten solange ein Spieler in den Linien-Bounds steht"-
// Logik ist bewusst noch die einfache Variante (AP6-01 TODO 2); der Umbau auf
// einen Druck-Radius ist AP6-02b.
import type { Vec3 } from "./math";
import type { EnemyEntity } from "./enemies";
import type { FrontLinie } from "./sektor";
import { inBoundsXZ } from "./sektor";

export type LinienZustand = "stabil" | "bedraengt" | "gebrochen" | "verloren";

const STUFEN = ["stabil", "bedraengt", "gebrochen", "verloren"] as const;

export interface BreschenZustand {
  /** Weltposition der aufreißbaren Parapet-Stelle. */
  pos: Vec3;
  /** Struktur-HP; bei 0 ist die Bresche offen. */
  hp: number;
  maxHp: number;
  offen: boolean;
}

export interface LinienFront {
  id: string;
  zustand: LinienZustand;
  breschen: BreschenZustand[];
  /** Feinddruck aus der Zahl lebender Gegner an der Linie, 0..`DRUCK_MAX`. */
  druck: number;
  /**
   * Sekunden „offene Bresche + Feind drückt an der Linie + ungehalten" —
   * bedraengt → gebrochen bei `T_GEBROCHEN`.
   */
  angriffTimer: number;
  /**
   * Sekunden „gebrochen + ungehalten" — gebrochen → verloren bei `T2_VERLOREN`.
   * (Ticket-Wortlaut „weiter ungehalten"; keine zusätzliche Feindbedingung.)
   */
  verlorenTimer: number;
  /**
   * Sekunden „kein Feind an der Linie + keine offene Bresche" — eine Stufe
   * zurück Richtung `stabil` bei `T3_ERHOLUNG`. Nie aus `verloren`.
   */
  ruheTimer: number;
  /** Depot der Linie verloren — Uhr-Effekt in AP4-04. */
  depotVerloren: boolean;
}

// --- Schwellen / Zeiten: PLATZHALTER (Spieltest — Ticket „Offene Rückfragen"). --
/** Obergrenze des Druck-Zählers. */
export const DRUCK_MAX = 12;
/** Druck-Anstieg pro lebendem Gegner an der Linie, pro Sekunde. */
const DRUCK_ANSTIEG = 1.0;
/** Druck-Abfall pro Sekunde ohne Gegner. */
const DRUCK_ABFALL = 2.0;
/** Ab diesem Druck gilt die Linie als `bedraengt`. */
const DRUCK_SCHWELLE = 3.0;
/** Sekunden bis `gebrochen` (offene Bresche + Feinddruck + ungehalten). */
const T_GEBROCHEN = 5;
/** Sekunden bis `verloren` (`gebrochen` + ungehalten). */
const T2_VERLOREN = 6;
/** Sekunden Ruhe bis eine Stufe Erholung. */
const T3_ERHOLUNG = 6;
/** Struktur-HP einer Bresche. */
const BRESCHE_MAX_HP = 60;
/** Bresche-Schaden pro Gegner in Reichweite, pro Sekunde. */
const BRESCHE_DPS = 8;
/** Gegner in diesem Radius zählen „an der Bresche". */
const BRESCHE_RADIUS = 3.5;
/** Steht ein Spieler so nah an der Bresche, reißt der Feind sie nicht auf. */
const BRESCHE_SPIELER_RADIUS = 3.5;

/** Kontext, den `updateFront` je Tick für **eine** Linie bekommt. */
export interface FrontKontext {
  enemies: readonly EnemyEntity[];
  /** Die Linien-Geometrie (Frontlinie **oder** Home-Line — dieselbe Maschine). */
  linie: FrontLinie;
  /** Positionen lebender Spieler (solo: eine, oder leer im Tod). */
  spielerPositionen: readonly Vec3[];
  /** Wird genau im Tick des Übergangs nach `verloren` aufgerufen. */
  onVerloren: (id: string) => void;
}

/**
 * Baut den Anfangszustand einer Linie (`stabil`, Breschen heil) aus ihrer Meta.
 * `brescheHpFaktor > 1` = befestigt (die Home-Line startet so, AP4-04).
 */
export function createFrontState(
  linie: FrontLinie,
  brescheHpFaktor = 1,
): LinienFront {
  const hp = BRESCHE_MAX_HP * brescheHpFaktor;
  return {
    id: linie.id,
    zustand: "stabil",
    breschen: linie.parapetBreschen.map((pos) => ({
      pos: { x: pos.x, y: pos.y, z: pos.z },
      hp,
      maxHp: hp,
      offen: false,
    })),
    druck: 0,
    angriffTimer: 0,
    verlorenTimer: 0,
    ruheTimer: 0,
    depotVerloren: false,
  };
}

function abstandXZ(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Schreibt **eine** Linie um `dt` fort. Mutiert `f` in-place.
 * `verloren` ist ein Endzustand — nur `rueckerobern` (Sim-Eingang) holt da raus.
 */
export function updateFront(
  f: LinienFront,
  ctx: FrontKontext,
  dt: number,
): void {
  if (f.zustand === "verloren") {
    return;
  }
  const ab = ctx.linie;
  const lebende = ctx.enemies.filter((e) => e.zustand !== "tot");
  const stufe = STUFEN.indexOf(f.zustand);

  const gegnerAnLinie = lebende.filter((e) => inBoundsXZ(ab.bounds, e.pos));
  const gehalten = ctx.spielerPositionen.some((p) => inBoundsXZ(ab.bounds, p));

  // --- Druck: steigt mit lebenden Gegnern an der Linie, fällt ohne. ---
  if (gegnerAnLinie.length > 0) {
    f.druck = Math.min(
      DRUCK_MAX,
      f.druck + DRUCK_ANSTIEG * gegnerAnLinie.length * dt,
    );
  } else {
    f.druck = Math.max(0, f.druck - DRUCK_ABFALL * dt);
  }

  // --- Breschen: ungehalten reißt der Feind sie auf. ---
  for (const b of f.breschen) {
    if (b.offen) {
      continue;
    }
    const spielerDeckt = ctx.spielerPositionen.some(
      (p) => abstandXZ(p, b.pos) <= BRESCHE_SPIELER_RADIUS,
    );
    if (spielerDeckt) {
      continue; // „steht ein Spieler dort, geht es nicht"
    }
    const gegnerAnBresche = lebende.filter(
      (e) => abstandXZ(e.pos, b.pos) <= BRESCHE_RADIUS,
    ).length;
    if (gegnerAnBresche > 0) {
      b.hp = Math.max(0, b.hp - BRESCHE_DPS * gegnerAnBresche * dt);
      if (b.hp === 0) {
        b.offen = true;
      }
    }
  }
  const brescheOffen = f.breschen.some((b) => b.offen);

  // --- Timer ---
  if (brescheOffen && gegnerAnLinie.length > 0 && !gehalten) {
    f.angriffTimer += dt;
  } else {
    f.angriffTimer = Math.max(0, f.angriffTimer - dt);
  }
  if (f.zustand === "gebrochen" && !gehalten) {
    f.verlorenTimer += dt;
  } else {
    f.verlorenTimer = Math.max(0, f.verlorenTimer - dt);
  }
  if (stufe > 0 && gegnerAnLinie.length === 0 && !brescheOffen) {
    f.ruheTimer += dt;
  } else {
    f.ruheTimer = 0;
  }

  // --- Übergänge: erst vorwärts, sonst Erholung. Einer je Tick. ---
  if (f.zustand === "stabil" && (f.druck >= DRUCK_SCHWELLE || brescheOffen)) {
    f.zustand = "bedraengt";
  } else if (
    f.zustand === "bedraengt" &&
    brescheOffen &&
    f.angriffTimer >= T_GEBROCHEN
  ) {
    f.zustand = "gebrochen";
    f.verlorenTimer = 0;
  } else if (f.zustand === "gebrochen" && f.verlorenTimer >= T2_VERLOREN) {
    f.zustand = "verloren";
    f.depotVerloren = true;
    for (const b of f.breschen) {
      b.offen = true;
    }
    ctx.onVerloren(f.id);
  } else if (f.ruheTimer >= T3_ERHOLUNG && stufe > 0) {
    f.zustand = STUFEN[stufe - 1] ?? "stabil";
    f.ruheTimer = 0;
    f.angriffTimer = 0;
    f.verlorenTimer = 0;
    if (f.zustand === "stabil") {
      f.druck = 0;
    }
  }
}
