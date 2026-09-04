// Gegner-Simulation: Liste von Entitäten, Anmarsch, Nahkampf.
// AP2: gerader Weg auf den Spieler. AP4-02: Wegpunkt-Folgen entlang des
// semantischen Nav-Graphen (src/sim/navgraph.ts) — durchs Labyrinth an die
// Front, nach einem Durchbruch Richtung Home. In Nahkampf-Reichweite + Sicht
// (oder am Zielknoten) greift wieder das direkte Anmarsch-/Nahkampf-Verhalten.
// Deterministisch, kein Babylon/Math.random.
import type { Vec3 } from "./math";
import { moveCapsule, sichtlinie, type CollisionWorld } from "./collision";
import { kuerzesterPfad, naechsterKnoten } from "./navgraph";
import type { NavGraph } from "./sektor";
import type { EnemyDef } from "../data/schema";

export type EnemyZustand = "anmarsch" | "angriff" | "tot";

export interface EnemyEntity {
  id: number;
  /** Fußpunkt in Weltkoordinaten. */
  pos: Vec3;
  vel: Vec3;
  hp: number;
  maxHp: number;
  def: EnemyDef;
  zustand: EnemyZustand;
  /** Sekunden bis zum nächsten Nahkampftreffer. */
  angriffCooldown: number;
  /** Sekunden, die die Leiche noch liegen bleibt. */
  totRest: number;
  /** Tick des letzten HP-Rückgangs (für den Render-Trefferblitz). */
  letzterTreffer: number;
  /** Zugewiesener Frontabschnitt ("A"/"B"/"C"); "" = keiner (manueller Spawn). */
  abschnitt: string;
  /** Aktuelle Ziel-Knoten-Id im Nav-Graphen ("" = noch keins). */
  ziel: string;
  /** Wegpunkt-Kette (Knoten-Ids) zum Ziel. */
  pfad: string[];
  /** Index des nächsten noch anzulaufenden Wegpunkts in `pfad`. */
  pfadIndex: number;
  /** Sekunden ohne nennenswerten Fortschritt im Anmarsch (Watchdog, AP4-06). */
  stillstand: number;
  /** Bisherige Watchdog-Eingriffe: 1 = Pfad neu, 2 = Relokation, 3 = Despawn. */
  festVersuche: number;
  /**
   * Individuelles Marschtempo als Faktor auf `BASIS_TEMPO × def.tempo`
   * (AP5-04, `1 ± TEMPO_STREUUNG`): die Kette zieht sich im Anmarsch
   * auseinander statt im Gleichschritt zu laufen.
   */
  tempoFaktor: number;
  /**
   * Seitliche Marschspur −1..1 (AP5-04): Anteil an `SPREIZUNG_MAX`, um den der
   * Gegner im Transit neben der Wegpunkt-Linie läuft. Ersetzt das feste
   * `id % 7`-Raster aus AP4-02 durch eine stufenlose Spur.
   */
  spur: number;
}

/**
 * Würfelwerte 0..1 für die individuelle Streuung eines Gegners (AP5-04). Der
 * Aufrufer zieht sie aus seinem `Rng` (goldene Regel: Zufall nur injiziert);
 * ohne Angabe läuft der Gegner mit Normaltempo auf der alten `id % 7`-Spur.
 */
export interface GegnerStreuung {
  tempo: number;
  spur: number;
}

export const ENEMY_RADIUS = 0.35;
export const ENEMY_HEIGHT = 1.8;
export const NAHKAMPF_REICHWEITE = 1.6;
export const NACHSCHUB_PRO_KILL = 5;

const BASIS_TEMPO = 2.6; // m/s bei EnemyDef.tempo = 1 (Platzhalter)
/** Tempo-Streuung je Gegner: Faktor 1 ± dieser Anteil (AP5-04, Platzhalter). */
export const TEMPO_STREUUNG = 0.15;
const ANGRIFF_INTERVALL = 1.1; // s zwischen Nahkampftreffern
const LEICHE_LIEGEZEIT = 1.4; // s

// Nav (AP4-02).
const WEGPUNKT_RADIUS = 3.0; // ab hier gilt ein Wegpunkt als erreicht (Ecken schneiden)
const WEGPUNKT_RADIUS_ENG = 1.4; // Engstellen (Sap-Lücke, Bresche) genau treffen
/**
 * Max. seitlicher Versatz zur Wegpunkt-Linie im Transit (× `spur` −1..1) gegen
 * Stau — dieselbe Hüllkurve wie das alte `id % 7`-Raster (±3 × 0,8 m), nur
 * stufenlos belegt (AP5-04). Breiter zielt an den 2,6-m-Breschen vorbei.
 */
export const SPREIZUNG_MAX = 2.4;
// Im Graben (Fußpunkt unter der Geländeoberkante) ist der Versatz gekappt:
// der Verbindungsgraben ist 3,6 m breit, ±2,4 m Versatz zielte in die Wand
// (AP4-06). Greybox-Heuristik über die Höhe; sauber wäre eine Korridorbreite
// am Knoten — TODO(Rückfrage): mit dem Generator als Knoten-/Kanten-Datum.
const GRABEN_Y = -0.5;
const SPREIZUNG_GRABEN_MAX = 1.0;
const NAHKAMPF_SICHT = 6; // in dieser Nähe + begehbarer Sichtlinie: direkt auf den Spieler
const MARSCH_SEPARATION = 0.35; // Separation ist im Fern-Anmarsch schwächer

// Stuck-Watchdog (AP4-06, Audit H2). Ein Gegner, der laufen will, aber nicht
// vom Fleck kommt, bekommt gestaffelt Hilfe — sonst friert ein einzelner
// hängender Gegner den Wellen-Loop ein (`lebendeGegner === 0` gatet Pause und
// Reservewellen). Zahlen sind Platzhalter.
/** Sekunden ohne Fortschritt bis zum nächsten Eingriff. */
export const FEST_ZEIT = 4;
/** Unter diesem Anteil des Soll-Wegs je Tick gilt „kein Fortschritt". */
const FEST_MIN_FORTSCHRITT = 0.2;
/**
 * Höhe über dem Fußpunkt für die Erreichbarkeits-Sichtlinie (Kniehöhe: Wände
 * blocken, Stufen nicht). Seit AP5-04 auch für die Nahkampf-Sicht: auf
 * Augenhöhe sah ein Gegner den Spieler über das Parapet hinweg im Graben und
 * lief geradewegs in die Wand — bis der Watchdog ihn nach 12 s despawnte.
 */
const KNIE = 0.3;

/** Nav-Kontext, den `updateEnemies` je Tick bekommt (fehlt → gerader Weg). */
export interface NavKontext {
  graph: NavGraph;
  /** Abschnitts-Ids, die als „verloren" gelten → Gegner fluten zur Home-Line. */
  verloren: ReadonlySet<string>;
  /**
   * Watchdog-Ausgang (AP4-06): der Gegner ist endgültig festgefahren und wird
   * aus der Liste entfernt — der Aufrufer schreibt die Angriffskraft zurück.
   */
  onDespawn?: (e: EnemyEntity) => void;
}

// Muss zu PLAYER_RADIUS in `src/sim/index.ts` passen (beides Platzhalter).
const SPIELER_RADIUS = 0.35;
// Mindestabstände.
const GEGNER_MINDESTABSTAND = 2 * ENEMY_RADIUS; // Gegner ↔ Gegner
const SPIELER_MINDESTABSTAND = ENEMY_RADIUS + SPIELER_RADIUS; // Gegner ↔ Spieler
// Wie schnell ein voll überlappendes Gegnerpaar auseinanderdriftet (m/s, Platzhalter).
const SEPARATION_TEMPO = 3.0;

export function spawnEnemy(
  def: EnemyDef,
  id: number,
  pos: Vec3,
  hpFaktor = 1,
  abschnitt = "",
  streuung?: GegnerStreuung,
): EnemyEntity {
  const hp = Math.round(def.hp * hpFaktor);
  const tempoFaktor =
    streuung === undefined
      ? 1
      : 1 - TEMPO_STREUUNG + 2 * TEMPO_STREUUNG * streuung.tempo;
  // Alte AP4-02-Spur (7 feste Bahnen, ±2,4 m bei 0,8 m Raster = ±0,8 Anteil).
  const spur =
    streuung === undefined
      ? (((id % 7) - 3) * 0.8) / SPREIZUNG_MAX
      : 2 * streuung.spur - 1;
  return {
    id,
    pos: { x: pos.x, y: pos.y, z: pos.z },
    vel: { x: 0, y: 0, z: 0 },
    hp,
    maxHp: hp,
    def,
    zustand: "anmarsch",
    angriffCooldown: 0,
    totRest: 0,
    letzterTreffer: -1,
    abschnitt,
    ziel: "",
    pfad: [],
    pfadIndex: 0,
    stillstand: 0,
    festVersuche: 0,
    tempoFaktor,
    spur,
  };
}

/**
 * Fügt einem Gegner Schaden zu. Liefert `true`, wenn dieser Treffer ihn tötet
 * (Aufrufer schreibt dann Nachschub gut). Mutiert `enemy`.
 */
export function damageEnemy(
  enemy: EnemyEntity,
  menge: number,
  tick: number,
): boolean {
  if (enemy.zustand === "tot" || menge <= 0) {
    return false;
  }
  enemy.hp = Math.max(0, enemy.hp - menge);
  enemy.letzterTreffer = tick;
  if (enemy.hp <= 0) {
    enemy.zustand = "tot";
    enemy.totRest = LEICHE_LIEGEZEIT;
    enemy.vel.x = 0;
    enemy.vel.z = 0;
    return true;
  }
  return false;
}

/** Ziel-Knoten-Id eines Gegners: `front-<abschnitt>`, solange die Front steht,
 *  sonst `home-ziel` (Abschnitt verloren). Ohne zugewiesenen Abschnitt der
 *  nächstgelegene Front-Knoten. */
function zielKnoten(e: EnemyEntity, nav: NavKontext): string {
  if (e.abschnitt !== "") {
    return nav.verloren.has(e.abschnitt) ? "home-ziel" : `front-${e.abschnitt}`;
  }
  let best = "front-B";
  let bestD = Infinity;
  for (const k of nav.graph.knoten) {
    if (!k.id.startsWith("front-")) {
      continue;
    }
    const dx = k.pos.x - e.pos.x;
    const dz = k.pos.z - e.pos.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = k.id;
    }
  }
  return best;
}

/**
 * Nächster Graph-Knoten, den der Gegner in Kniehöhe frei sieht — also einer,
 * den er ohne Wand dazwischen tatsächlich erreichen kann (`undefined`: keiner).
 */
function erreichbarerKnoten(
  world: CollisionWorld,
  graph: NavGraph,
  pos: Vec3,
): string | undefined {
  let best: string | undefined;
  let bestD = Infinity;
  const von = { x: pos.x, y: pos.y + KNIE, z: pos.z };
  for (const k of graph.knoten) {
    const dx = k.pos.x - pos.x;
    const dz = k.pos.z - pos.z;
    const d = dx * dx + dz * dz;
    if (d >= bestD) {
      continue;
    }
    if (sichtlinie(world, von, { x: k.pos.x, y: k.pos.y + KNIE, z: k.pos.z })) {
      bestD = d;
      best = k.id;
    }
  }
  return best;
}

/**
 * Watchdog-Eingriff, gestaffelt nach `festVersuche` (AP4-06):
 *  1. Pfad neu — von einem tatsächlich erreichbaren Knoten zum Ziel (bzw. zum
 *     Knoten beim Spieler, wenn der Gegner schon am Zielknoten war).
 *  2. Relokation auf den verdeckten `reinforcement-<abschnitt>`-Knoten (wie die
 *     Infiltration; alle liegen im Labyrinth, nie im Feld).
 *  3. Despawn (Aufrufer bekommt `onDespawn`, schreibt die Angriffskraft zurück).
 * Liefert `false`, wenn der Gegner entfernt wurde.
 */
function loeseFest(
  e: EnemyEntity,
  world: CollisionWorld,
  playerPos: Vec3,
  nav: NavKontext,
): boolean {
  e.stillstand = 0;
  e.festVersuche += 1;

  if (e.festVersuche === 1) {
    const start = erreichbarerKnoten(world, nav.graph, e.pos);
    const amZiel = e.pfadIndex >= e.pfad.length;
    const ziel = amZiel ? naechsterKnoten(nav.graph, playerPos) : e.ziel;
    // Die Kante, auf der der Gegner hängt (letzter erreichter → aktueller
    // Wegpunkt), ist offensichtlich nicht begehbar: für diese Planung sperren,
    // sonst liefert BFS denselben Weg noch einmal.
    const blockVon = e.pfad[e.pfadIndex - 1];
    const blockNach = e.pfad[e.pfadIndex];
    const graph: NavGraph =
      blockVon !== undefined && blockNach !== undefined
        ? {
            knoten: nav.graph.knoten,
            kanten: nav.graph.kanten.map((k) =>
              (k.von === blockVon && k.nach === blockNach) ||
              (k.von === blockNach && k.nach === blockVon)
                ? { ...k, offen: false }
                : k,
            ),
          }
        : nav.graph;
    if (start !== undefined && ziel !== "") {
      const pfad = kuerzesterPfad(graph, start, ziel);
      if (pfad.length > 0) {
        e.pfad = pfad;
        e.pfadIndex = 0;
      }
    }
    return true;
  }

  if (e.festVersuche === 2 && e.abschnitt !== "") {
    const rk = nav.graph.knoten.find(
      (k) => k.id === `reinforcement-${e.abschnitt}`,
    );
    if (rk) {
      e.pos = { x: rk.pos.x, y: rk.pos.y, z: rk.pos.z };
      e.vel = { x: 0, y: 0, z: 0 };
      e.ziel = ""; // Pfad im nächsten Tick frisch vom neuen Standort
      return true;
    }
  }

  nav.onDespawn?.(e);
  return false;
}

/** Konsumiert erreichte Wegpunkte und liefert den nächsten anzulaufenden. */
function wegpunkt(e: EnemyEntity, graph: NavGraph): Vec3 | undefined {
  while (e.pfadIndex < e.pfad.length) {
    const id = e.pfad[e.pfadIndex];
    const knoten = graph.knoten.find((k) => k.id === id);
    if (!knoten) {
      e.pfadIndex += 1;
      continue;
    }
    const dx = knoten.pos.x - e.pos.x;
    const dz = knoten.pos.z - e.pos.z;
    const dist = Math.hypot(dx, dz);
    // Engstellen (Sap-Lücke, Bresche, Grabenmündung, Rampen-Lücke — Flag in
    // den Sektor-Daten) müssen wirklich durchlaufen werden — sonst „erreicht"
    // ein Gegner den Knoten von der falschen Seite und steuert das nächste
    // Ziel quer durchs Parapet an. AP4-06: zusätzlich gilt eine Engstelle erst
    // als passiert, wenn der Gegner sie in Richtung des nächsten Wegpunkts
    // hinter sich hat (Ebenen-Test) — sonst schneidet er beim Abbiegen die
    // Ecke und rutscht an der Wand neben der Lücke fest.
    if (knoten.engstelle === true) {
      // Ebene der Engstelle = senkrecht zur Anmarschrichtung (vorheriger
      // Wegpunkt → Engstelle). AP4-06 nahm die Richtung zum *nächsten*
      // Wegpunkt; knickt der Pfad an der Engstelle ab (bresche-B → front-B
      // liegt 45° schräg), galt ein Gegner schon 1,4 m schräg *vor* der Wand
      // als „durch" und steuerte den nächsten Punkt quer durchs Parapet an
      // (AP5-04, sichtbar geworden durch die gestreuten Marschspuren). Ohne
      // Vorgänger (Pfadstart) bleibt die Richtung zum nächsten Wegpunkt.
      const vorherId = e.pfad[e.pfadIndex - 1];
      const naechsteId = e.pfad[e.pfadIndex + 1];
      const vorher = vorherId
        ? graph.knoten.find((k) => k.id === vorherId)
        : undefined;
      const naechste = naechsteId
        ? graph.knoten.find((k) => k.id === naechsteId)
        : undefined;
      const richtung = vorher
        ? { x: knoten.pos.x - vorher.pos.x, z: knoten.pos.z - vorher.pos.z }
        : naechste
          ? {
              x: naechste.pos.x - knoten.pos.x,
              z: naechste.pos.z - knoten.pos.z,
            }
          : undefined;
      const passiert =
        richtung === undefined ||
        (e.pos.x - knoten.pos.x) * richtung.x +
          (e.pos.z - knoten.pos.z) * richtung.z >=
          0;
      if (dist < WEGPUNKT_RADIUS_ENG && passiert) {
        e.pfadIndex += 1;
        continue;
      }
      return knoten.pos;
    }
    if (dist < WEGPUNKT_RADIUS) {
      e.pfadIndex += 1;
      continue;
    }
    return knoten.pos;
  }
  return undefined;
}

/**
 * Schreibt alle Gegner um `dt` fort (Anmarsch/Angriff/Leiche) und liefert die
 * überlebenden zurück (verwehte Leichen fallen raus). Mutiert die Entitäten.
 * `onHitPlayer` wird bei jedem Nahkampftreffer aufgerufen. Ohne `nav` (kein
 * Sektor-Graph) laufen die Gegner wie bisher direkt auf den Spieler zu.
 */
export function updateEnemies(
  enemies: readonly EnemyEntity[],
  world: CollisionWorld,
  playerPos: Vec3,
  spielerLebt: boolean,
  onHitPlayer: (menge: number) => void,
  dt: number,
  nav?: NavKontext,
): EnemyEntity[] {
  const survivors: EnemyEntity[] = [];

  // Positions-Schnappschuss vor der Bewegung: die Separation liest daraus, damit
  // der Push unabhängig von der Iterationsreihenfolge und deterministisch ist.
  const startPos = enemies
    .filter((e) => e.zustand !== "tot")
    .map((e) => ({ id: e.id, x: e.pos.x, z: e.pos.z }));

  for (const e of enemies) {
    if (e.zustand === "tot") {
      e.totRest -= dt;
      e.vel.x = 0;
      e.vel.z = 0;
      const moved = moveCapsule(
        world,
        e.pos,
        e.vel,
        ENEMY_RADIUS,
        ENEMY_HEIGHT,
        dt,
      );
      e.pos = moved.pos;
      e.vel = moved.vel;
      if (e.totRest > 0) {
        survivors.push(e);
      }
      continue;
    }

    const dx = playerPos.x - e.pos.x;
    const dz = playerPos.z - e.pos.z;
    const dist = Math.hypot(dx, dz);

    if (e.angriffCooldown > 0) {
      e.angriffCooldown = Math.max(0, e.angriffCooldown - dt);
    }

    // Ziel/Pfad pflegen — Neuberechnung nur bei Zielwechsel.
    if (nav) {
      const ziel = zielKnoten(e, nav);
      if (ziel !== e.ziel) {
        e.ziel = ziel;
        e.pfad = kuerzesterPfad(
          nav.graph,
          naechsterKnoten(nav.graph, e.pos),
          ziel,
        );
        e.pfadIndex = 0;
      }
    }

    // Direktes Anmarsch-/Nahkampf-Verhalten, wenn kein Graph, der Zielknoten
    // erreicht ist, oder der Spieler nah und auf Kniehöhe frei erreichbar ist.
    const nah =
      dist <= NAHKAMPF_SICHT &&
      sichtlinie(
        world,
        { x: e.pos.x, y: e.pos.y + KNIE, z: e.pos.z },
        { x: playerPos.x, y: playerPos.y + KNIE, z: playerPos.z },
      );
    let amZiel = !nav || e.pfadIndex >= e.pfad.length;
    if (nav && amZiel && !nah) {
      // Am strategischen Ziel, Spieler außer Reichweite: weiter über den
      // Graphen zum Knoten beim Spieler statt Luftlinie durch die nächste Wand
      // (AP5-04). Genau das tat bisher erst der Watchdog nach 4 s Stillstand —
      // mit 12 s Wandkontakt bis zum Despawn. Ohne Graph-Weg (z. B. Front
      // steht, Spieler hinten) bleibt es bei der Luftlinie wie bisher.
      const hier = naechsterKnoten(nav.graph, e.pos);
      const dort = naechsterKnoten(nav.graph, playerPos);
      if (hier !== dort && e.pfad[e.pfad.length - 1] !== dort) {
        const pfad = kuerzesterPfad(nav.graph, hier, dort);
        if (pfad.length > 1) {
          e.pfad = pfad;
          e.pfadIndex = 0;
          amZiel = false;
        }
      }
    }
    const direkt = amZiel || nah;

    const marschModus = nav !== undefined && !direkt;

    if (dist <= NAHKAMPF_REICHWEITE && direkt) {
      e.zustand = "angriff";
      e.vel.x = 0;
      e.vel.z = 0;
      if (e.angriffCooldown <= 0 && spielerLebt) {
        onHitPlayer(e.def.schaden);
        e.angriffCooldown = ANGRIFF_INTERVALL;
      }
    } else {
      e.zustand = "anmarsch";
      let zielX = playerPos.x;
      let zielZ = playerPos.z;
      if (marschModus) {
        const wp = wegpunkt(e, nav.graph);
        if (wp) {
          const rx = wp.x - e.pos.x;
          const rz = wp.z - e.pos.z;
          const rl = Math.hypot(rx, rz);
          // Deterministischer seitlicher Versatz je Gegner (seine `spur`):
          // fächert die Kette während des Transits auf (gegen Stau), läuft zum
          // Wegpunkt hin aber wieder zusammen — sonst zielt der Versatz neben
          // die enge Sap-Lücke.
          const roh = e.spur * SPREIZUNG_MAX * Math.min(1, rl / 8);
          const seit =
            e.pos.y < GRABEN_Y
              ? Math.max(
                  -SPREIZUNG_GRABEN_MAX,
                  Math.min(SPREIZUNG_GRABEN_MAX, roh),
                )
              : roh;
          zielX = rl > 1e-3 ? wp.x + (-rz / rl) * seit : wp.x;
          zielZ = rl > 1e-3 ? wp.z + (rx / rl) * seit : wp.z;
        }
      }
      const zdx = zielX - e.pos.x;
      const zdz = zielZ - e.pos.z;
      const zd = Math.hypot(zdx, zdz);
      const speed = BASIS_TEMPO * e.def.tempo * e.tempoFaktor;
      if (zd > 1e-6) {
        e.vel.x = (zdx / zd) * speed;
        e.vel.z = (zdz / zd) * speed;
      } else {
        e.vel.x = 0;
        e.vel.z = 0;
      }
    }

    // Separation: weicher radialer Push von zu nahen anderen Gegnern und ein
    // Mindestabstand zum Spieler. Nur der Bewegungswunsch wird verändert —
    // `moveCapsule` löst danach die Level-Kollision wie gehabt.
    let pushX = 0;
    let pushZ = 0;
    for (const o of startPos) {
      if (o.id === e.id) {
        continue;
      }
      const ox = e.pos.x - o.x;
      const oz = e.pos.z - o.z;
      const od = Math.hypot(ox, oz);
      if (od >= GEGNER_MINDESTABSTAND) {
        continue;
      }
      if (od > 1e-6) {
        const t = (GEGNER_MINDESTABSTAND - od) / GEGNER_MINDESTABSTAND; // 0..1
        pushX += (ox / od) * t;
        pushZ += (oz / od) * t;
      } else {
        // Exakt derselbe Punkt: deterministisch anhand der Id auf die x-Achse.
        pushX += e.id < o.id ? -1 : 1;
      }
    }
    // Im Fern-Anmarsch (Wegpunkt-Folgen, Spieler nicht in Sicht) darf die
    // Separation den Vortrieb nicht auffressen — der seitliche Versatz oben
    // hält die Kette ohnehin schon auseinander.
    const sepTempo = marschModus
      ? SEPARATION_TEMPO * MARSCH_SEPARATION
      : SEPARATION_TEMPO;
    e.vel.x += pushX * sepTempo;
    e.vel.z += pushZ * sepTempo;

    const sx = e.pos.x - playerPos.x;
    const sz = e.pos.z - playerPos.z;
    const sd = Math.hypot(sx, sz);
    if (sd < SPIELER_MINDESTABSTAND) {
      // In genau einem Tick auf Mindestabstand schieben (bounded: verschiebt nur
      // die Überlappung, kein Teleport). Nahkampf (1,6 m) greift weiter.
      const raus = (SPIELER_MINDESTABSTAND - Math.max(sd, 0)) / dt;
      if (sd > 1e-6) {
        e.vel.x += (sx / sd) * raus;
        e.vel.z += (sz / sd) * raus;
      } else {
        e.vel.x += raus; // Gegner exakt auf dem Spieler: feste Achse
      }
    }

    const moved = moveCapsule(
      world,
      e.pos,
      e.vel,
      ENEMY_RADIUS,
      ENEMY_HEIGHT,
      dt,
    );

    // Watchdog (AP4-06): will der Gegner laufen, kommt aber nicht vom Fleck?
    if (nav && e.zustand === "anmarsch") {
      const soll = BASIS_TEMPO * e.def.tempo * e.tempoFaktor * dt;
      const ist = Math.hypot(moved.pos.x - e.pos.x, moved.pos.z - e.pos.z);
      e.stillstand = ist < FEST_MIN_FORTSCHRITT * soll ? e.stillstand + dt : 0;
    } else {
      e.stillstand = 0;
    }
    e.pos = moved.pos;
    e.vel = moved.vel;

    if (
      nav &&
      e.stillstand >= FEST_ZEIT &&
      !loeseFest(e, world, playerPos, nav)
    ) {
      continue; // despawnt
    }
    survivors.push(e);
  }

  return survivors;
}
