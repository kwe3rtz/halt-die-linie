import type { Vec3 } from "./math";
import { dirFromYawPitch } from "./math";
import { createRng } from "./rng";
import {
  createCollisionWorld,
  moveCapsule,
  type Aabb,
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
import type { NavGraph, SektorData } from "./sektor";
import { inBoundsXZ, zoneAt, abschnittAt } from "./sektor";
import {
  createFrontState,
  updateFront,
  type AbschnittFront,
  type AbschnittZustand,
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
  FrontAbschnitt,
  HomeZugang,
  SektorMeta,
  SektorData,
  NavKnoten,
  NavKante,
  NavGraph,
} from "./sektor";
export { zoneAt, abschnittAt, inBoundsXZ } from "./sektor";
export { kuerzesterPfad, naechsterKnoten, imSichtkegel } from "./navgraph";
export type {
  AbschnittZustand,
  AbschnittFront,
  BreschenZustand,
} from "./front";
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
   * Frontabschnitte: Besitz-/Bruchzustand je Abschnitt (AP4-03) für HUD/Render.
   * Leer ohne Sektor-Meta.
   */
  front: readonly {
    id: string;
    zustand: AbschnittZustand;
    /** Anzahl offener Breschen im Abschnitt. */
    breschenOffen: number;
    /** Offen-Status je Bresche in Abschnitts-Reihenfolge (Render). */
    breschen: readonly boolean[];
  }[];
  /**
   * Home-Line-Abschnitte (AP4-04) — gleiche Form wie `front`. Leer ohne
   * Sektor-Meta. Alle `verloren` = Einsatz verloren.
   */
  home: readonly {
    id: string;
    zustand: AbschnittZustand;
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
  /** Zugewiesener Frontabschnitt ("A"/"B"/"C" oder "") — AP4-02. */
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
   * nutzt ihn. `defId` unbekannt → No-op. `abschnitt` = Ziel-Frontabschnitt
   * (Default: zufällig aus den aktiven Angriffsachsen).
   */
  spawnEnemy: (defId: string, pos: Vec3, abschnitt?: string) => void;
  /**
   * AP4-02-Testeingang: eine Nav-Kante direkt öffnen/schließen. Ungerichtet.
   * Kein Effekt ohne Sektor-Graph.
   */
  _setKanteOffen: (von: string, nach: string, offen: boolean) => void;
  /**
   * AP4-03: einen verlorenen Frontabschnitt zurückerobern — nur wenn gerade
   * **kein Gegner** im Abschnitt steht. Setzt `verloren → gebrochen`, schließt
   * die Nav-Kante nach hinten wieder und macht das Depot wieder verfügbar.
   * Kosten / KI-Trupp kommen mit der Nachschub-Ökonomie (späteres Paket).
   * Kein automatisches Zurückflippen.
   */
  rueckerobern: (abschnittId: string) => void;
  /**
   * AP4-04: Spieler-Entscheidung nach „Entsatz eingetroffen" (`einsatz.phase
   * === "finale"`, `ergebnis === "gewonnen"`). `extrahieren` beendet den Einsatz,
   * `verlaengern` startet einen weiteren, kürzeren Countdown mit härteren
   * Reservewellen. Sonst wirkungslos.
   */
  entscheide: (wahl: EinsatzWahl) => void;
  /**
   * Testeingang (dünn über der AP4-03-Zustandsmaschine): erzwingt für einen
   * Front- **oder** Home-Line-Abschnitt direkt den End-/Ausgangszustand.
   * `true` = `verloren`, `false` = zurück auf `stabil`.
   */
  _setAbschnittVerloren: (abschnittId: string, verloren: boolean) => void;
  /**
   * AP4-04-Testeingang: der Trupp ist ausgeschaltet (Koop-Verlustbedingung;
   * solo respawnt der Spieler ewig). Setzt den Einsatz auf `verloren`.
   */
  _setTruppAus: (aus: boolean) => void;
}

// First-Person-Controller — Platzhalterwerte, Balancing kommt später.
const PLAYER_RADIUS = 0.35;
const PLAYER_HEIGHT = 1.8;
const PLAYER_EYE = 1.6;
const WALK_SPEED = 4.5;
const SPRINT_SPEED = 7.0;
const JUMP_SPEED = 7.2;
const LOOK_SENSITIVITY = 0.0022; // Radiant pro Maus-Pixel
const PITCH_LIMIT = (89 * Math.PI) / 180;
const FALL_LIMIT = -40; // darunter: zurück zum Spawn

const EMPTY_LEVEL: LevelData = { boxes: [], spawnPoints: [] };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Eingefrorene HUD/Render-Sicht auf einen Front-/Home-Abschnitt (AP4-03/04). */
function abschnittView(f: AbschnittFront) {
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
   * Aktive Angriffsachsen (Frontabschnitte), aus denen der Anmarsch beim Spawn
   * zufällig zieht. Default: alle Abschnitte des Sektors (Greybox; die
   * „~2 aktiv solo"-Auswahl je Spielerzahl macht der Wave-Director in AP4-04).
   */
  aktiveAchsen?: readonly string[];
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
  let lastShot: Readonly<ShotEvent> | null = null;
  let nachschub = 0;
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
  const enemySpawnPunkte = level.enemySpawnPoints ?? level.spawnPoints;

  const player = {
    pos: { x: spawn.x, y: spawn.y, z: spawn.z },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    onGround: false,
  };

  // --- Nav (AP4-02) ---------------------------------------------------------
  // Eigene Graph-Kopie: die Kanten-Offen-Flags sind pro Sim veränderlich, die
  // exportierte `sektorGreybox` darf nicht mutiert werden.
  const sektorMeta = (level as Partial<SektorData>).meta;
  const navGraph: NavGraph | undefined = sektorMeta
    ? {
        knoten: sektorMeta.navGraph.knoten,
        kanten: sektorMeta.navGraph.kanten.map((k) => ({ ...k })),
      }
    : undefined;
  const verloreneAbschnitte = new Set<string>();
  const abschnittRng = createRng((seed ^ 0x3c3c3c3c) >>> 0);
  // Frontabschnitts-Zustandsmaschine (AP4-03). Leer ohne Sektor-Meta.
  const frontState: AbschnittFront[] = sektorMeta
    ? createFrontState(sektorMeta.frontAbschnitte)
    : [];
  // Home-Line über dieselbe Maschine, aber befestigt (AP4-04).
  const HOME_BRESCHE_FAKTOR = 2.5;
  const homeState: AbschnittFront[] = sektorMeta
    ? createFrontState(sektorMeta.homeAbschnitte, HOME_BRESCHE_FAKTOR)
    : [];
  const alleAbschnitte: readonly { id: string; bounds: Aabb }[] = sektorMeta
    ? [...sektorMeta.frontAbschnitte, ...sektorMeta.homeAbschnitte]
    : [];
  // Einsatzbogen (AP4-04). Ohne Sektor-Meta bleibt der Einsatz im `aufbau`.
  const einsatzState: EinsatzState = createEinsatzState();
  let truppAus = false;
  const aktiveAchsen: readonly string[] =
    options.aktiveAchsen ?? sektorMeta?.frontAbschnitte.map((a) => a.id) ?? [];
  const navKontext: NavKontext | undefined = navGraph
    ? { graph: navGraph, verloren: verloreneAbschnitte }
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
  const HINTEN_KANTE: Record<string, readonly [string, string]> = {
    A: ["front-A", "parados-A"],
    B: ["front-B", "graben-mund"],
    C: ["front-C", "parados-C"],
  };
  const setAbschnittVerloren = (id: string, verloren: boolean): void => {
    if (verloren) {
      verloreneAbschnitte.add(id);
    } else {
      verloreneAbschnitte.delete(id);
    }
    const paar = HINTEN_KANTE[id];
    if (paar) {
      setKanteOffen(paar[0], paar[1], verloren);
    }
    // Zurückgesetzt: auch den Bresche-Zugang aus dem Labyrinth wieder sperren.
    if (!verloren) {
      setKanteOffen(`bresche-${id}`, "lab-vorfront", false);
    }
  };

  // AP4-03: Übergang nach `verloren` verdrahtet das AP4-02-Verhalten (für
  // Front-Ids; Home-Ids haben keine Nav-Kante nach hinten → No-op-Zweig).
  const onAbschnittVerloren = (id: string): void => {
    setAbschnittVerloren(id, true);
  };

  const abschnittState = (id: string): AbschnittFront | undefined =>
    frontState.find((a) => a.id === id) ?? homeState.find((a) => a.id === id);

  const abschnittBesetzt = (id: string): boolean => {
    const ab = alleAbschnitte.find((a) => a.id === id);
    if (!ab) {
      return false;
    }
    return enemies.some(
      (e) => e.zustand !== "tot" && inBoundsXZ(ab.bounds, e.pos),
    );
  };

  const rueckerobern = (abschnittId: string): void => {
    const f = abschnittState(abschnittId);
    if (!f || f.zustand !== "verloren" || abschnittBesetzt(abschnittId)) {
      return;
    }
    f.zustand = "gebrochen";
    f.verlorenTimer = 0;
    f.ruheTimer = 0;
    f.depotVerloren = false;
    setAbschnittVerloren(abschnittId, false);
  };

  const forceAbschnittVerloren = (id: string, verloren: boolean): void => {
    const f = abschnittState(id);
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
    setAbschnittVerloren(id, verloren);
  };

  const waehleAbschnitt = (): string => {
    if (aktiveAchsen.length === 0) {
      return "";
    }
    const i = abschnittRng.int(0, aktiveAchsen.length - 1);
    return aktiveAchsen[i] ?? aktiveAchsen[0] ?? "";
  };

  const spawnEnemyById = (
    defId: string,
    pos: Vec3,
    hpFaktor = 1,
    abschnitt?: string,
  ): void => {
    const def = gegnerDefs[defId];
    if (!def) {
      return;
    }
    const a = abschnitt ?? waehleAbschnitt();
    let p = pos;
    // Infiltration: verlorener Abschnitt → verdeckter Verstärkungs-Knoten,
    // aber nie im offenen Feld im Sichtkegel des Spielers.
    if (a !== "" && verloreneAbschnitte.has(a) && navGraph) {
      const rk = navGraph.knoten.find((k) => k.id === `reinforcement-${a}`);
      if (
        rk &&
        !(rk.zone === "feld" && imSichtkegel(player.pos, player.yaw, rk.pos))
      ) {
        p = rk.pos;
      }
    }
    enemies.push(spawnEnemy(def, nextEnemyId, p, hpFaktor, a));
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
            // vorn desto mehr. Ein schon verlorener Frontabschnitt zählt wie
            // offenes Feld.
            if (sektorMeta) {
              const zone = zoneAt(sektorMeta, getroffen.pos);
              const aId =
                zone === "frontlinie"
                  ? abschnittAt(sektorMeta, getroffen.pos)
                  : null;
              const verloren =
                aId !== null && abschnittState(aId)?.zustand === "verloren";
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

    // Frontabschnitte + Home-Line (AP4-03/04): Druck, Breschen, stabil→…→verloren.
    if (sektorMeta) {
      const spielerPositionen: Vec3[] = combat.tot ? [] : [player.pos];
      updateFront(
        frontState,
        {
          enemies,
          abschnitte: sektorMeta.frontAbschnitte,
          spielerPositionen,
          onVerloren: onAbschnittVerloren,
        },
        dt,
      );
      updateFront(
        homeState,
        {
          enemies,
          abschnitte: sektorMeta.homeAbschnitte,
          spielerPositionen,
          onVerloren: onAbschnittVerloren,
        },
        dt,
      );
      // Eine aufgerissene Bresche öffnet den Labyrinth-Zugang (KONZEPT.md §3:
      // „durch eine Bresche strömt der Feind") — die Kante steht in sektor.ts
      // bereit (offen: false). Nur öffnen; Schließen macht `rueckerobern` /
      // der Reset-Testeingang.
      for (const f of frontState) {
        if (f.breschen.some((b) => b.offen)) {
          setKanteOffen(`bresche-${f.id}`, "lab-vorfront", true);
        }
      }
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
        },
        dt,
      );
    }

    // Einsatzbogen (AP4-04): aufbau → wellen → finale → vorbei + die Uhr.
    if (sektorMeta) {
      updateEinsatz(
        einsatzState,
        {
          wavePhase: wave.phase,
          angriffskraftGebrochen: wave.angriffskraft <= 0,
          spawnQueueLeer: wave.spawnQueue.length === 0,
          homeVerloren:
            homeState.length > 0 &&
            homeState.every((f) => f.zustand === "verloren"),
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
      front: Object.freeze(frontState.map(abschnittView)),
      home: Object.freeze(homeState.map(abschnittView)),
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
    spawnEnemy: (defId, pos, abschnitt) =>
      spawnEnemyById(defId, pos, 1, abschnitt),
    _setKanteOffen: setKanteOffen,
    rueckerobern,
    entscheide: (wahl) => entscheide(einsatzState, wahl),
    _setAbschnittVerloren: forceAbschnittVerloren,
    _setTruppAus: (aus) => {
      truppAus = aus;
    },
  };
}
