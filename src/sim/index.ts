import type { Vec3 } from "./math";
import { dirFromYawPitch } from "./math";
import { createRng } from "./rng";
import {
  createCollisionWorld,
  moveCapsule,
  setKolliderAktiv,
  type CollisionWorld,
  type LevelData,
} from "./collision";
import { standardWaffe } from "../data/waffen";
import type { WeaponDef } from "../data/schema";
import {
  advanceWeapon,
  createWeaponState,
  fire,
  reload,
  type WeaponState,
} from "./weapon";
import {
  advancePlayerCombat,
  applyDamage,
  createPlayerCombat,
  respawnCombat,
  type PlayerCombat,
} from "./player";
import {
  damageEnemy,
  ENEMY_HEIGHT,
  ENEMY_RADIUS,
  NACHSCHUB_PRO_KILL,
  spawnEnemy,
  updateEnemies,
  type EnemyEntity,
  type EnemyZustand,
  type NavKontext,
} from "./enemies";
import { imSichtkegel } from "./navgraph";
import type { FrontLinie, NavGraph, SektorData } from "./sektor";
import {
  inBoundsXZ,
  zoneAt,
  frontLinieAt,
  brescheTag,
  naechstesDepot,
  pruefeSektorMeta,
  DEPOT_REICHWEITE,
} from "./sektor";
import {
  createFrontState,
  updateFront,
  type LinienFront,
  type LinienZustand,
} from "./front";
import {
  createEinsatzState,
  entscheide,
  updateEinsatz,
  zermuerbungProKill,
  type EinsatzPhase,
  type EinsatzErgebnis,
  type EinsatzState,
  type EinsatzWahl,
} from "./einsatz";
import { gegnerDefs } from "../data/gegner";
import {
  createWaveState,
  updateWave,
  type WavePhase,
  type WaveState,
} from "./wave";

export type { Vec3 } from "./math";
export type { LevelBox, LevelData, CollisionWorld, Aabb } from "./collision";
export type { EnemyZustand } from "./enemies";
export type { WavePhase } from "./wave";
export type {
  ZonenId,
  ZonenEintrag,
  FrontLinie,
  HomeZugang,
  SektorMeta,
  SektorData,
  NavKnoten,
  NavKante,
  NavGraph,
} from "./sektor";
export { zoneAt, frontLinieAt, inBoundsXZ, brescheTag } from "./sektor";
export { kuerzesterPfad, naechsterKnoten, imSichtkegel } from "./navgraph";
export type { LinienZustand, LinienFront, BreschenZustand } from "./front";
export type { EinsatzPhase, EinsatzErgebnis, EinsatzWahl } from "./einsatz";

export interface SimState {
  tick: number;
  player: {
    /** Fußpunkt des Spielers in Weltkoordinaten. */
    pos: Vec3;
    vel: Vec3;
    /** Drehung um die Y-Achse, Radiant. 0 = Blick nach +Z. */
    yaw: number;
    /** Auf-/Ab-Blick, Radiant. Positiv = nach oben, geklemmt auf ±~89°. */
    pitch: number;
    onGround: boolean;
    hp: number;
    maxHp: number;
    tot: boolean;
    /** Sekunden bis zum Respawn (0, solange lebendig). */
    respawnRest: number;
    /**
     * Linien-Id, deren Munitionsdepot gerade in Reichweite und verfügbar ist
     * (AP5-02) — `E` füllt dort die Reserve auf. `null` sonst, auch im Tod und
     * ohne Sektor-Meta.
     */
    depotInReichweite: string | null;
    /** Waffenzustand für HUD/Render. */
    weapon: {
      defId: string;
      imLauf: number;
      reserve: number;
      reloading: boolean;
    };
  };
  /** Gegner, eingefroren nach außen (wie `player`). */
  enemies: readonly EnemyView[];
  /** Einsatz-Währung (`KONZEPT.md` §7). Gutschrift pro Kill. */
  nachschub: number;
  /** Wave-Director-Stand fürs HUD. */
  wave: {
    welle: number;
    phase: WavePhase;
    angriffskraftRest: number;
    angriffskraftMax: number;
  };
  /**
   * Die Frontlinie: Besitz-/Bruchzustand (AP4-03) für HUD/Render. Als
   * Ein-Element-Liste (genau eine Linie) — leer ohne Sektor-Meta.
   */
  front: readonly {
    id: string;
    zustand: LinienZustand;
    /** Anzahl offener Breschen der Linie. */
    breschenOffen: number;
    /** Offen-Status je Bresche in Daten-Reihenfolge (Render). */
    breschen: readonly boolean[];
  }[];
  /**
   * Die Home-Line (AP4-04) — gleiche Form wie `front`, als Ein-Element-Liste.
   * Leer ohne Sektor-Meta. `verloren` = Einsatz verloren.
   */
  home: readonly {
    id: string;
    zustand: LinienZustand;
    breschenOffen: number;
    breschen: readonly boolean[];
  }[];
  /**
   * Einsatzbogen (AP4-04): Phase, Finale-Countdown, Ergebnis. Ohne Sektor-Meta
   * bleibt der Einsatz im `aufbau` (die Uhr braucht die Zonen).
   */
  einsatz: {
    phase: EinsatzPhase;
    /** Sekunden bis „Entsatz eingetroffen" (nur im `finale`). */
    finaleRest: number;
    ergebnis: EinsatzErgebnis;
  };
  /** Letzter abgegebener Schuss (Signal für Tracer/Mündungsblitz). */
  lastShot: ShotEvent | null;
}

export interface EnemyView {
  id: number;
  pos: Vec3;
  hp: number;
  maxHp: number;
  zustand: EnemyZustand;
  defId: string;
  /** Tick des letzten HP-Rückgangs (Render-Trefferblitz). */
  letzterTreffer: number;
  /** Zugewiesene Linie ("front", oder "" bei manuellem Spawn ohne Sektor) — AP4-02. */
  abschnitt: string;
  /** Aktueller Nav-Ziel-Knoten ("" ohne Sektor-Graph) — AP4-02. */
  zielKnoten: string;
}

export interface ShotEvent {
  tick: number;
  /** Augpunkt im Moment des Schusses (= Schuss-Ursprung des Hitscans). */
  von: Vec3;
  /** Trefferpunkt bzw. Punkt in maximaler Reichweite. */
  nach: Vec3;
  /**
   * Normierte Schuss-Richtung (`dirFromYawPitch(yaw, pitch)`) — dieselbe
   * Richtung, die der Hitscan nutzt. Der Renderer setzt Tracer/Mündungsblitz
   * damit auf, ohne eigene Geometrie-Annahmen.
   */
  richtung: Vec3;
  treffer: boolean;
  /** Der Schuss traf einen Gegner (nicht nur Level-Geometrie). */
  gegnerTreffer: boolean;
  /** Der Gegner-Treffer war tödlich. */
  toedlich: boolean;
}

/**
 * Kommando-Objekt, das der Sim pro Tick übergeben wird. Reines, JSON-fähiges
 * Objekt (siehe goldene Regel / `src/input`).
 */
export interface InputCommand {
  /** Lokale Bewegungsachsen, jeweils -1..1. `y` = vorwärts, `x` = rechts. */
  move: { x: number; y: number };
  /** Maus-Delta seit dem letzten `poll()` (Pixel). */
  look: { dx: number; dy: number };
  buttons: {
    fire: boolean;
    aim: boolean;
    sprint: boolean;
    interact: boolean;
    ability: boolean;
    jump: boolean;
    reload: boolean;
  };
}

export interface Sim {
  tick: (cmd: InputCommand, dt: number) => void;
  getState: () => Readonly<SimState>;
  /**
   * Fügt dem Spieler Schaden zu. Externer/Test-Eingang; die Gegner rufen intern
   * `applyDamage` auf dem Kampfzustand auf.
   */
  applyDamage: (menge: number, quelle?: string) => void;
  /**
   * Spawnt einen Gegner. Externer/Test-Eingang; der Wave-Director (AP2-04)
   * nutzt ihn. `defId` unbekannt → No-op. `linie` = zugewiesene Linie
   * (Default: die Frontlinie; ohne Sektor-Meta `""`).
   */
  spawnEnemy: (defId: string, pos: Vec3, linie?: string) => void;
  /**
   * AP4-02-Testeingang: eine Nav-Kante direkt öffnen/schließen. Ungerichtet.
   * Kein Effekt ohne Sektor-Graph.
   */
  _setKanteOffen: (von: string, nach: string, offen: boolean) => void;
  /**
   * AP4-03: eine verlorene Linie zurückerobern — nur wenn gerade **kein
   * Gegner** an der Linie steht. Setzt `verloren → gebrochen`, schließt die
   * Nav-Kanten nach hinten wieder und macht das Depot wieder verfügbar.
   * Kosten / KI-Trupp kommen mit der Nachschub-Ökonomie (späteres Paket).
   * Kein automatisches Zurückflippen. `linieId` = `"front"` | `"home"`.
   */
  rueckerobern: (linieId: string) => void;
  /**
   * AP4-04: Spieler-Entscheidung nach „Entsatz eingetroffen" (`einsatz.phase
   * === "finale"`, `ergebnis === "gewonnen"`). `extrahieren` beendet den Einsatz,
   * `verlaengern` startet einen weiteren, kürzeren Countdown mit härteren
   * Reservewellen. Sonst wirkungslos.
   */
  entscheide: (wahl: EinsatzWahl) => void;
  /**
   * Testeingang (dünn über der AP4-03-Zustandsmaschine): erzwingt für die
   * Frontlinie (`"front"`) oder die Home-Line (`"home"`) direkt den
   * End-/Ausgangszustand. `true` = `verloren`, `false` = zurück auf `stabil`.
   */
  _setLinieVerloren: (linie: "front" | "home", verloren: boolean) => void;
  /**
   * AP4-04-Testeingang: der Trupp ist ausgeschaltet (Koop-Verlustbedingung;
   * solo respawnt der Spieler ewig). Setzt den Einsatz auf `verloren`.
   */
  _setTruppAus: (aus: boolean) => void;
  /** AP5-02-Testeingang: Reservemunition direkt setzen (≥ 0, ganzzahlig). */
  _setReserve: (menge: number) => void;
}

// First-Person-Controller — Platzhalterwerte, Balancing kommt später.
const PLAYER_RADIUS = 0.35;
const PLAYER_HEIGHT = 1.8;
const PLAYER_EYE = 1.6;
export const WALK_SPEED = 4.5;
export const SPRINT_SPEED = 7.0;
const JUMP_SPEED = 7.2;
const LOOK_SENSITIVITY = 0.0022; // Radiant pro Maus-Pixel
const PITCH_LIMIT = (89 * Math.PI) / 180;
const FALL_LIMIT = -40; // darunter: zurück zum Spawn

const EMPTY_LEVEL: LevelData = { boxes: [], spawnPoints: [] };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Eingefrorene HUD/Render-Sicht auf eine Linie (Front oder Home, AP4-03/04). */
function linieView(f: LinienFront) {
  return Object.freeze({
    id: f.id,
    zustand: f.zustand,
    breschenOffen: f.breschen.filter((b) => b.offen).length,
    breschen: Object.freeze(f.breschen.map((b) => b.offen)),
  });
}

function pickSpawn(level: LevelData, seed: number): Vec3 {
  const points = level.spawnPoints;
  if (points.length === 0) {
    return { x: 0, y: 2, z: 0 };
  }
  const rng = createRng(seed);
  const chosen = points[rng.int(0, points.length - 1)] ?? points[0];
  if (!chosen) {
    return { x: 0, y: 2, z: 0 };
  }
  return { x: chosen.x, y: chosen.y, z: chosen.z };
}

export interface SimOptions {
  /** Startwaffe des Spielers. Default: `standardWaffe` aus `src/data`. */
  weapon?: WeaponDef;
  /** Gegner, die beim Start schon stehen (für Tests / gezieltes Debugging). */
  enemies?: ReadonlyArray<{ defId: string; pos: Vec3; abschnitt?: string }>;
  /** Wave-Director aktivieren (im echten Spiel an; Tests opten ein). */
  waves?: boolean;
  /**
   * Start-Angriffskraft (Uhr). Default `START_ANGRIFFSKRAFT`. Tests setzen sie
   * klein, um das Finale schnell zu erreichen.
   */
  startAngriffskraft?: number;
}

export function createSim(
  seed: number,
  level: LevelData = EMPTY_LEVEL,
  options: SimOptions = {},
): Sim {
  const world: CollisionWorld = createCollisionWorld(level);
  const spawn = pickSpawn(level, seed);
  const weaponDef = options.weapon ?? standardWaffe;

  let tickCount = 0;
  let firePrev = false;
  // Flanken für die Finale-Entscheidung (AP4-06): E = extrahieren, Q = verlängern.
  let interactPrev = false;
  let abilityPrev = false;
  let lastShot: Readonly<ShotEvent> | null = null;
  let nachschub = 0;
  let depotInReichweite: string | null = null;
  let nextEnemyId = 1;
  let enemies: EnemyEntity[] = [];
  const weapon: WeaponState = createWeaponState(weaponDef);
  const combat: PlayerCombat = createPlayerCombat();
  const wave: WaveState = createWaveState();
  if (options.startAngriffskraft !== undefined) {
    wave.angriffskraft = Math.max(0, options.startAngriffskraft);
  }
  const angriffskraftMax = wave.angriffskraft;
  const waveRng = createRng((seed ^ 0x5a5a5a5a) >>> 0);
  // Individuelle Tempo-/Spur-Streuung je Gegner (AP5-04) aus einem eigenen
  // Strom, damit die Spawnpunkt-Wahl (`waveRng`) nicht verschoben wird.
  const gegnerRng = createRng((seed ^ 0x2b2b2b2b) >>> 0);
  const enemySpawnPunkte = level.enemySpawnPoints ?? level.spawnPoints;

  const player = {
    pos: { x: spawn.x, y: spawn.y, z: spawn.z },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    onGround: false,
  };

  // --- Nav + Linien (AP4-02/03, auf eine Frontlinie reduziert AP6-02) --------
  // Eigene Graph-Kopie: die Kanten-Offen-Flags sind pro Sim veränderlich, die
  // exportierte `sektorGreybox` darf nicht mutiert werden.
  const sektorMeta = (level as Partial<SektorData>).meta;
  // Audit N2: genau eine wohlgeformte Front- + Home-Linie beim Laden erzwingen.
  if (sektorMeta) {
    pruefeSektorMeta(sektorMeta);
  }
  const frontMeta: FrontLinie | undefined = sektorMeta?.frontLinie;
  const homeMeta: FrontLinie | undefined = sektorMeta?.homeLinie;
  const navGraph: NavGraph | undefined = sektorMeta
    ? {
        knoten: sektorMeta.navGraph.knoten,
        kanten: sektorMeta.navGraph.kanten.map((k) => ({ ...k })),
      }
    : undefined;
  const verloreneLinien = new Set<string>();
  // Frontlinie-Zustandsmaschine (AP4-03). `undefined` ohne Sektor-Meta.
  const frontLinieState: LinienFront | undefined = frontMeta
    ? createFrontState(frontMeta)
    : undefined;
  // Home-Line über dieselbe Maschine, aber befestigt (AP4-04).
  const HOME_BRESCHE_FAKTOR = 2.5;
  const homeLinieState: LinienFront | undefined = homeMeta
    ? createFrontState(homeMeta, HOME_BRESCHE_FAKTOR)
    : undefined;
  const linien: readonly FrontLinie[] =
    frontMeta && homeMeta ? [frontMeta, homeMeta] : [];
  const linieMeta = (id: string): FrontLinie | undefined =>
    linien.find((l) => l.id === id);
  // Einsatzbogen (AP4-04). Ohne Sektor-Meta bleibt der Einsatz im `aufbau`.
  const einsatzState: EinsatzState = createEinsatzState();
  let truppAus = false;
  const navKontext: NavKontext | undefined =
    navGraph && frontMeta && homeMeta
      ? {
          graph: navGraph,
          verloren: verloreneLinien,
          // Ziel-Nav-Knoten aus den Linien-Metadaten (Audit H2): solange die
          // Frontlinie hält, laufen die Gegner auf `frontZiel`; fällt sie,
          // fluten sie zu `homeZiel`. `reinfKnoten` = verdeckter Reloc-Knoten.
          frontZiel: frontMeta.zielKnoten,
          homeZiel: homeMeta.zielKnoten,
          reinfKnoten: frontMeta.reinfKnoten,
          // Watchdog-Despawn (AP4-06): der Gegner war nie zu erreichen — seine
          // Angriffskraft geht an den Director zurück, kein Nachschub, keine Uhr.
          onDespawn: () => {
            wave.angriffskraft = Math.min(
              angriffskraftMax,
              wave.angriffskraft + 1,
            );
          },
        }
      : undefined;

  const setKanteOffen = (von: string, nach: string, offen: boolean): void => {
    if (!navGraph) {
      return;
    }
    for (const k of navGraph.kanten) {
      if (
        (k.von === von && k.nach === nach) ||
        (k.von === nach && k.nach === von)
      ) {
        k.offen = offen;
      }
    }
  };

  const setLinieVerloren = (id: string, verloren: boolean): void => {
    if (verloren) {
      verloreneLinien.add(id);
    } else {
      verloreneLinien.delete(id);
    }
    const meta = linieMeta(id);
    // Rückwege nach hinten öffnen/schließen (AP4-03) — aus `hintenKanten`.
    for (const [von, nach] of meta?.hintenKanten ?? []) {
      setKanteOffen(von, nach, verloren);
    }
    // Zurückgesetzt: auch den Bresche-Zugang aus dem Niemandsland wieder sperren.
    if (!verloren && meta?.brescheZugang) {
      setKanteOffen(
        meta.brescheZugang.davor,
        meta.brescheZugang.bresche,
        false,
      );
    }
  };

  // AP4-03: Übergang nach `verloren` verdrahtet das AP4-02-Verhalten (die
  // Home-Line hat keine `hintenKanten` → der Kanten-Loop läuft leer).
  const onLinieVerloren = (id: string): void => {
    setLinieVerloren(id, true);
  };

  const linieState = (id: string): LinienFront | undefined => {
    if (frontLinieState?.id === id) {
      return frontLinieState;
    }
    if (homeLinieState?.id === id) {
      return homeLinieState;
    }
    return undefined;
  };

  // Welche Bresche (Index) hängt am Nav-Zugang der Linie? Die Kante ins
  // Niemandsland öffnet nur für genau diese Bresche (AP4-06, Audit M7) — die
  // Position des `brescheZugang.bresche`-Knotens entscheidet.
  const brescheAmZugang = new Map<string, number>();
  if (navGraph) {
    for (const l of linien) {
      if (!l.brescheZugang || l.parapetBreschen.length === 0) {
        continue;
      }
      const knoten = navGraph.knoten.find(
        (k) => k.id === l.brescheZugang?.bresche,
      );
      if (!knoten) {
        continue;
      }
      let best = 0;
      let bestD = Infinity;
      l.parapetBreschen.forEach((b, i) => {
        const d = Math.hypot(b.x - knoten.pos.x, b.z - knoten.pos.z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      brescheAmZugang.set(l.id, best);
    }
  }

  // AP4-06: eine offene Bresche ist ein echtes Loch — das getaggte Parapet-
  // Segment (`brescheTag`) verschwindet aus der Kollisionswelt, eine wieder
  // geschlossene (Reset-Testeingang) kommt zurück. Gleichzeitig öffnet die
  // Bresche am `brescheZugang` den Zugang aus dem Niemandsland im Nav-Graph
  // (KONZEPT.md §3: „durch eine Bresche strömt der Feind") — genau diese
  // Bresche, sonst führt die Kante in eine stehende Wand (Audit H1). Nur
  // öffnen; Schließen macht `setLinieVerloren(id, false)`. Idempotent, läuft
  // nach jedem `updateFront` und nach den direkten Zustandsänderungen, damit
  // Kollision und Nav nie auseinanderlaufen.
  const syncBreschen = (): void => {
    for (const f of [frontLinieState, homeLinieState]) {
      if (!f) {
        continue;
      }
      f.breschen.forEach((b, i) =>
        setKolliderAktiv(world, brescheTag(f.id, i), !b.offen),
      );
      const zugang = linieMeta(f.id)?.brescheZugang;
      const i = brescheAmZugang.get(f.id);
      if (zugang && i !== undefined && f.breschen[i]?.offen) {
        setKanteOffen(zugang.davor, zugang.bresche, true);
      }
    }
  };

  const linieBesetzt = (id: string): boolean => {
    const meta = linieMeta(id);
    if (!meta) {
      return false;
    }
    return enemies.some(
      (e) => e.zustand !== "tot" && inBoundsXZ(meta.bounds, e.pos),
    );
  };

  const rueckerobern = (linieId: string): void => {
    const f = linieState(linieId);
    if (!f || f.zustand !== "verloren" || linieBesetzt(linieId)) {
      return;
    }
    f.zustand = "gebrochen";
    f.verlorenTimer = 0;
    f.ruheTimer = 0;
    f.depotVerloren = false;
    setLinieVerloren(linieId, false);
    syncBreschen();
  };

  const forceLinieVerloren = (id: string, verloren: boolean): void => {
    const f = linieState(id);
    if (f && verloren) {
      f.zustand = "verloren";
      f.depotVerloren = true;
      for (const b of f.breschen) {
        b.offen = true;
      }
    } else if (f) {
      f.zustand = "stabil";
      f.depotVerloren = false;
      f.druck = 0;
      f.angriffTimer = 0;
      f.verlorenTimer = 0;
      f.ruheTimer = 0;
      for (const b of f.breschen) {
        b.offen = false;
        b.hp = b.maxHp;
      }
    }
    setLinieVerloren(id, verloren);
    syncBreschen();
  };

  const spawnEnemyById = (
    defId: string,
    pos: Vec3,
    hpFaktor = 1,
    linie?: string,
  ): void => {
    const def = gegnerDefs[defId];
    if (!def) {
      return;
    }
    // Jeder Sektor-Gegner gehört zu „der Frontlinie" (kein Abschnitts-Würfeln
    // mehr, AP6-02); ohne Sektor-Meta bleibt die Zuweisung leer.
    const a = linie ?? frontMeta?.id ?? "";
    let p = pos;
    // Infiltration: verlorene Linie → verdeckter Verstärkungs-Knoten, aber nie
    // im Hinterland im Sichtkegel des Spielers.
    const reinf = linieMeta(a)?.reinfKnoten;
    if (a !== "" && verloreneLinien.has(a) && navGraph && reinf) {
      const rk = navGraph.knoten.find((k) => k.id === reinf);
      if (
        rk &&
        !(
          rk.zone === "hinterland" &&
          imSichtkegel(player.pos, player.yaw, rk.pos)
        )
      ) {
        p = rk.pos;
      }
    }
    enemies.push(
      spawnEnemy(def, nextEnemyId, p, hpFaktor, a, {
        tempo: gegnerRng.next(),
        spur: gegnerRng.next(),
      }),
    );
    nextEnemyId += 1;
  };

  for (const s of options.enemies ?? []) {
    spawnEnemyById(s.defId, s.pos, 1, s.abschnitt);
  }

  const resetWeapon = (): void => {
    weapon.imLauf = weaponDef.magazin;
    weapon.reserve = weaponDef.reserve;
    weapon.cooldown = 0;
    weapon.reloadRest = 0;
    weapon.reloading = false;
  };

  const respawnPlayer = (): void => {
    player.pos = { x: spawn.x, y: spawn.y, z: spawn.z };
    player.vel = { x: 0, y: 0, z: 0 };
    player.yaw = 0;
    player.pitch = 0;
    resetWeapon();
    respawnCombat(combat);
  };

  const step = (cmd: InputCommand, dt: number): void => {
    tickCount += 1;
    const alive = !combat.tot;

    if (alive) {
      // Blickrichtung aus dem Maus-Delta.
      player.yaw += cmd.look.dx * LOOK_SENSITIVITY;
      player.pitch = clamp(
        player.pitch - cmd.look.dy * LOOK_SENSITIVITY,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      );
    }

    // Gewünschte horizontale Geschwindigkeit relativ zu yaw (0 im Tod).
    let wishX = 0;
    let wishZ = 0;
    if (alive) {
      const sinY = Math.sin(player.yaw);
      const cosY = Math.cos(player.yaw);
      wishX = cosY * cmd.move.x + sinY * cmd.move.y;
      wishZ = -sinY * cmd.move.x + cosY * cmd.move.y;
      const wishLen = Math.hypot(wishX, wishZ);
      if (wishLen > 1) {
        wishX /= wishLen;
        wishZ /= wishLen;
      }
      if (player.onGround && cmd.buttons.jump) {
        player.vel.y = JUMP_SPEED;
      }
    }
    const speed = cmd.buttons.sprint ? SPRINT_SPEED : WALK_SPEED;
    player.vel.x = wishX * speed;
    player.vel.z = wishZ * speed;

    // Integration + Kollision laufen immer (Schwerkraft gilt auch für die Leiche).
    const moved = moveCapsule(
      world,
      player.pos,
      player.vel,
      PLAYER_RADIUS,
      PLAYER_HEIGHT,
      dt,
    );
    player.pos = moved.pos;
    player.vel = moved.vel;
    player.onGround = moved.onGround;

    if (player.pos.y < FALL_LIMIT) {
      player.pos = { x: spawn.x, y: spawn.y, z: spawn.z };
      player.vel = { x: 0, y: 0, z: 0 };
    }

    // Waffen-Timer laufen immer; Nachladen/Feuern nur lebendig.
    advanceWeapon(weapon, weaponDef, dt);
    if (alive) {
      if (cmd.buttons.reload) {
        reload(weapon, weaponDef);
      }
      const flanke = cmd.buttons.fire && !firePrev;
      const eye: Vec3 = {
        x: player.pos.x,
        y: player.pos.y + PLAYER_EYE,
        z: player.pos.z,
      };
      const dir = dirFromYawPitch(player.yaw, player.pitch);
      const ziele = enemies
        .filter((e) => e.zustand !== "tot")
        .map((e) => ({
          id: e.id,
          pos: e.pos,
          radius: ENEMY_RADIUS,
          height: ENEMY_HEIGHT,
        }));
      const shot = fire(
        weapon,
        world,
        eye,
        dir,
        weaponDef,
        { gedrueckt: cmd.buttons.fire, flanke },
        ziele,
      );
      if (shot.schuss) {
        const reichweite = weaponDef.handling.reichweiteMax;
        const nach: Vec3 = shot.treffer
          ? shot.treffer.punkt
          : {
              x: eye.x + dir.x * reichweite,
              y: eye.y + dir.y * reichweite,
              z: eye.z + dir.z * reichweite,
            };
        const gegnerTreffer = shot.treffer?.enemyId !== undefined;
        let toedlich = false;
        if (gegnerTreffer) {
          const getroffen = enemies.find((e) => e.id === shot.treffer?.enemyId);
          if (
            getroffen &&
            damageEnemy(getroffen, weaponDef.basisSchaden, tickCount)
          ) {
            toedlich = true;
            nachschub += NACHSCHUB_PRO_KILL;
            // Die Uhr (AP4-04): der Tod zermürbt die Angriffskraft, je weiter
            // vorn desto mehr. Eine schon verlorene Frontlinie zählt wie
            // offenes Feld.
            if (sektorMeta) {
              const zone = zoneAt(sektorMeta, getroffen.pos);
              const aId =
                zone === "frontlinie"
                  ? frontLinieAt(sektorMeta, getroffen.pos)
                  : null;
              const verloren =
                aId !== null && linieState(aId)?.zustand === "verloren";
              wave.angriffskraft = Math.max(
                0,
                wave.angriffskraft - zermuerbungProKill(zone, verloren),
              );
            }
          }
        }
        lastShot = Object.freeze({
          tick: tickCount,
          von: Object.freeze({ ...eye }),
          nach: Object.freeze(nach),
          richtung: Object.freeze({ ...dir }),
          treffer: shot.treffer !== undefined,
          gegnerTreffer,
          toedlich,
        });
      }
    }
    // Flanke nie über den Tod hinweg aufstauen.
    firePrev = cmd.buttons.fire;

    // Gegner bewegen / angreifen; verwehte Leichen fallen raus.
    enemies = updateEnemies(
      enemies,
      world,
      player.pos,
      !combat.tot,
      (menge) => applyDamage(combat, menge, "nahkampf"),
      dt,
      navKontext,
    );

    // Frontlinie + Home-Line (AP4-03/04): Druck, Breschen, stabil→…→verloren.
    if (frontMeta && homeMeta && frontLinieState && homeLinieState) {
      const spielerPositionen: Vec3[] = combat.tot ? [] : [player.pos];
      updateFront(
        frontLinieState,
        {
          enemies,
          linie: frontMeta,
          spielerPositionen,
          onVerloren: onLinieVerloren,
        },
        dt,
      );
      updateFront(
        homeLinieState,
        {
          enemies,
          linie: homeMeta,
          spielerPositionen,
          onVerloren: onLinieVerloren,
        },
        dt,
      );
      // Aufgerissene Breschen: Parapet-Segment raus, Niemandsland-Zugang auf (AP4-06).
      syncBreschen();
    }

    // Wave-Director: spawnt neue Gegner (erst ab nächstem Tick aktiv).
    if (options.waves) {
      updateWave(
        wave,
        {
          lebendeGegner: enemies.filter((e) => e.zustand !== "tot").length,
          spawnPunkte: enemySpawnPunkte,
          rng: waveRng,
          spawn: spawnEnemyById,
          finale: einsatzState.phase === "finale",
          reserveStufe: einsatzState.reserveStufe,
          eingefroren: einsatzState.ergebnis === "gewonnen",
        },
        dt,
      );
    }

    // Munitionsdepot in Reichweite (AP5-02)? Nur lebendig — nach den Gegner-
    // Treffern dieses Ticks geprüft, damit HUD-Hinweis und Tod nie zusammen
    // stehen. Eine gefallene Linie hat ihr Depot verloren (`depotVerloren`,
    // KONZEPT.md §3 „die Uhr"); `rueckerobern` gibt es zurück.
    depotInReichweite = combat.tot
      ? null
      : naechstesDepot(
          linien,
          player.pos,
          DEPOT_REICHWEITE,
          (id) => linieState(id)?.depotVerloren === false,
        );

    // Finale-Entscheidung als Eingabe-Kommando (AP4-06, Audit H4): nach
    // „Entsatz eingetroffen" beendet `interact` (E) den Einsatz, `ability` (Q)
    // verlängert. Flanken, damit ein gehaltener Knopf nicht mehrfach zündet;
    // auch im Tod erlaubt (eine Entscheidung, keine Bewegung). Die Extraktion
    // hat Vorrang vor dem Munitionsdepot — sonst ist E am Depot „auffüllen".
    const interactFlanke = cmd.buttons.interact && !interactPrev;
    const abilityFlanke = cmd.buttons.ability && !abilityPrev;
    interactPrev = cmd.buttons.interact;
    abilityPrev = cmd.buttons.ability;
    if (
      sektorMeta &&
      einsatzState.phase === "finale" &&
      einsatzState.ergebnis === "gewonnen"
    ) {
      if (interactFlanke) {
        entscheide(einsatzState, "extrahieren");
      } else if (abilityFlanke) {
        entscheide(einsatzState, "verlaengern");
      }
    } else if (interactFlanke && depotInReichweite !== null) {
      // Munition auffüllen (AP5-02): volle Reserve, keine Kosten — die
      // Nachschub-Ökonomie (KONZEPT.md §9.6) kommt als eigenes Paket. Ein
      // laufendes Nachladen läuft weiter und liest die Reserve beim nächsten
      // Block; das Magazin bleibt, wie es ist.
      weapon.reserve = weaponDef.reserve;
    }

    // Einsatzbogen (AP4-04): aufbau → wellen → finale → vorbei + die Uhr.
    if (sektorMeta) {
      updateEinsatz(
        einsatzState,
        {
          wavePhase: wave.phase,
          angriffskraftGebrochen: wave.angriffskraft <= 0,
          spawnQueueLeer: wave.spawnQueue.length === 0,
          homeVerloren: homeLinieState?.zustand === "verloren",
          truppAus,
        },
        dt,
      );
    }

    // Tod / Respawn.
    if (advancePlayerCombat(combat, dt)) {
      respawnPlayer();
    }
  };

  const snapshot = (): Readonly<SimState> =>
    Object.freeze({
      tick: tickCount,
      player: Object.freeze({
        pos: Object.freeze({ ...player.pos }),
        vel: Object.freeze({ ...player.vel }),
        yaw: player.yaw,
        pitch: player.pitch,
        onGround: player.onGround,
        hp: combat.hp,
        maxHp: combat.maxHp,
        tot: combat.tot,
        respawnRest: combat.respawnRest,
        depotInReichweite,
        weapon: Object.freeze({
          defId: weapon.defId,
          imLauf: weapon.imLauf,
          reserve: weapon.reserve,
          reloading: weapon.reloading,
        }),
      }),
      enemies: Object.freeze(
        enemies.map((e) =>
          Object.freeze({
            id: e.id,
            pos: Object.freeze({ ...e.pos }),
            hp: e.hp,
            maxHp: e.maxHp,
            zustand: e.zustand,
            defId: e.def.id,
            letzterTreffer: e.letzterTreffer,
            abschnitt: e.abschnitt,
            zielKnoten: e.ziel,
          }),
        ),
      ),
      nachschub,
      wave: Object.freeze({
        welle: wave.welle,
        phase: wave.phase,
        angriffskraftRest: wave.angriffskraft,
        angriffskraftMax,
      }),
      // Als Ein-Element-Liste (genau eine Linie) — leer ohne Sektor-Meta.
      front: Object.freeze(frontLinieState ? [linieView(frontLinieState)] : []),
      home: Object.freeze(homeLinieState ? [linieView(homeLinieState)] : []),
      einsatz: Object.freeze({
        phase: einsatzState.phase,
        finaleRest: einsatzState.finaleRest,
        ergebnis: einsatzState.ergebnis,
      }),
      lastShot,
    });

  return {
    tick: step,
    getState: snapshot,
    applyDamage: (menge, quelle) => applyDamage(combat, menge, quelle),
    spawnEnemy: (defId, pos, linie) => spawnEnemyById(defId, pos, 1, linie),
    _setKanteOffen: setKanteOffen,
    rueckerobern,
    entscheide: (wahl) => entscheide(einsatzState, wahl),
    _setLinieVerloren: forceLinieVerloren,
    _setTruppAus: (aus) => {
      truppAus = aus;
    },
    _setReserve: (menge) => {
      weapon.reserve = Math.max(0, Math.floor(menge));
    },
  };
}
