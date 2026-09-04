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
}

export const ENEMY_RADIUS = 0.35;
export const ENEMY_HEIGHT = 1.8;
export const NAHKAMPF_REICHWEITE = 1.6;
export const NACHSCHUB_PRO_KILL = 5;

const BASIS_TEMPO = 2.6; // m/s bei EnemyDef.tempo = 1 (Platzhalter)
const ANGRIFF_INTERVALL = 1.1; // s zwischen Nahkampftreffern
const LEICHE_LIEGEZEIT = 1.4; // s

// Nav (AP4-02).
const AUGE = 1.55; // Augenhöhe für Sichtlinien-Checks
const WEGPUNKT_RADIUS = 3.0; // ab hier gilt ein Wegpunkt als erreicht (Ecken schneiden)
const WEGPUNKT_RADIUS_ENG = 1.4; // Engstellen (Sap-Lücke, Bresche) genau treffen
const WEGPUNKT_SPREIZUNG = 0.8; // seitl. Versatz je Gegner (× -3..3) gegen Stau
const NAHKAMPF_SICHT = 6; // in dieser Nähe + Sichtlinie: direkt auf den Spieler
const MARSCH_SEPARATION = 0.35; // Separation ist im Fern-Anmarsch schwächer

/** Nav-Kontext, den `updateEnemies` je Tick bekommt (fehlt → gerader Weg). */
export interface NavKontext {
  graph: NavGraph;
  /** Abschnitts-Ids, die als „verloren" gelten → Gegner fluten zur Home-Line. */
  verloren: ReadonlySet<string>;
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
): EnemyEntity {
  const hp = Math.round(def.hp * hpFaktor);
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
    // Engstellen (Sap-Lücke, Bresche) müssen wirklich durchlaufen werden —
    // sonst „erreicht" ein Gegner den Knoten von der falschen Seite und
    // steuert das nächste Ziel quer durchs Parapet an.
    const radius =
      id !== undefined && (id.startsWith("sap-") || id.startsWith("bresche-"))
        ? WEGPUNKT_RADIUS_ENG
        : WEGPUNKT_RADIUS;
    if (Math.hypot(dx, dz) < radius) {
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
    // erreicht ist, oder der Spieler nah und in grober Sichtlinie steht.
    const amZiel = !nav || e.pfadIndex >= e.pfad.length;
    const direkt =
      amZiel ||
      (dist <= NAHKAMPF_SICHT &&
        sichtlinie(
          world,
          { x: e.pos.x, y: e.pos.y + AUGE, z: e.pos.z },
          { x: playerPos.x, y: playerPos.y + AUGE, z: playerPos.z },
        ));

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
          // Deterministischer seitlicher Versatz je Gegner: fächert die Kette
          // während des Transits auf (gegen Stau), läuft zum Wegpunkt hin aber
          // wieder zusammen — sonst zielt der Versatz neben die enge Sap-Lücke.
          const seit =
            ((e.id % 7) - 3) * WEGPUNKT_SPREIZUNG * Math.min(1, rl / 8);
          zielX = rl > 1e-3 ? wp.x + (-rz / rl) * seit : wp.x;
          zielZ = rl > 1e-3 ? wp.z + (rx / rl) * seit : wp.z;
        }
      }
      const zdx = zielX - e.pos.x;
      const zdz = zielZ - e.pos.z;
      const zd = Math.hypot(zdx, zdz);
      const speed = BASIS_TEMPO * e.def.tempo;
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
    e.pos = moved.pos;
    e.vel = moved.vel;
    survivors.push(e);
  }

  return survivors;
}
