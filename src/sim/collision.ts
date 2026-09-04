// Gameplay-Kollision: statische, achsenparallele Quader (AABB) und die
// Auflösung einer Spieler-„Kapsel" (senkrechter Zylinder) dagegen.
//
// Bewusst simpel gehalten (TECHNIK.md: portabler Kollisionscode in der Sim,
// keine Physik-Engine). Achsenweise Auflösung: erst X, dann Z, dann die
// Schwerkraft-Achse Y — das ist stabil genug für Boxen-Geometrie und liefert
// nebenbei den Bodenkontakt.
import type { Vec3 } from "./math";

/** Ein Level-Baustein als reine Daten — kein Babylon-Typ. */
export interface LevelBox {
  /** Mittelpunkt in Weltkoordinaten. */
  center: Vec3;
  /** Volle Kantenlänge je Achse. */
  size: Vec3;
  /**
   * Optionales Etikett (z. B. `brescheTag(id, i)` aus `./sektor`). Getaggte
   * Boxen kann die Sim zur Laufzeit ab-/anschalten (`setKolliderAktiv`) — so
   * wird eine aufgerissene Bresche ein echtes Loch (AP4-06). Der Renderer
   * blendet das Segment über dasselbe Etikett aus.
   */
  tag?: string;
}

export interface LevelData {
  /** Statische Kollisions- und Render-Geometrie. */
  boxes: readonly LevelBox[];
  /** Mögliche Startpositionen (Fußpunkt des Spielers). */
  spawnPoints: readonly Vec3[];
  /**
   * Mögliche Gegner-Startpositionen (Wave-Director). Fehlt sie, fällt die Sim
   * auf `spawnPoints` zurück.
   */
  enemySpawnPoints?: readonly Vec3[];
}

/** Achsenparalleler Kasten über Min/Max-Ecken. */
export interface Aabb {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface CollisionWorld {
  readonly boxes: readonly Aabb[];
  /** Etikett je Box, parallel zu `boxes` (`undefined` ohne Tag). */
  readonly tags: readonly (string | undefined)[];
  /**
   * Aktiv-Flag je Box, parallel zu `boxes`. Inaktive Boxen sind für Bewegung,
   * Hitscan und Sichtlinie nicht vorhanden. Nur über `setKolliderAktiv` ändern.
   */
  readonly aktiv: boolean[];
}

/** Wie hoch eine Kante sein darf, damit der Spieler sie hochsteigt statt anzustoßen. */
export const STEP_HEIGHT = 0.5;

const GRAVITY = -22;

export function aabbFromBox(box: LevelBox): Aabb {
  const hx = box.size.x / 2;
  const hy = box.size.y / 2;
  const hz = box.size.z / 2;
  return {
    minX: box.center.x - hx,
    minY: box.center.y - hy,
    minZ: box.center.z - hz,
    maxX: box.center.x + hx,
    maxY: box.center.y + hy,
    maxZ: box.center.z + hz,
  };
}

export function createCollisionWorld(level: LevelData): CollisionWorld {
  return {
    boxes: level.boxes.map(aabbFromBox),
    tags: level.boxes.map((b) => b.tag),
    aktiv: level.boxes.map(() => true),
  };
}

/**
 * Schaltet alle Boxen mit dem Etikett `tag` an oder ab. Liefert die Anzahl
 * der betroffenen Boxen (0 = Tag unbekannt). Mutiert `world.aktiv` — die
 * einzige veränderliche Stelle der Kollisionswelt (AP4-06, Bresche = Loch).
 */
export function setKolliderAktiv(
  world: CollisionWorld,
  tag: string,
  aktiv: boolean,
): number {
  let n = 0;
  for (let i = 0; i < world.tags.length; i += 1) {
    if (world.tags[i] === tag) {
      world.aktiv[i] = aktiv;
      n += 1;
    }
  }
  return n;
}

function capsuleAabb(pos: Vec3, radius: number, height: number): Aabb {
  return {
    minX: pos.x - radius,
    minY: pos.y,
    minZ: pos.z - radius,
    maxX: pos.x + radius,
    maxY: pos.y + height,
    maxZ: pos.z + radius,
  };
}

function overlaps(a: Aabb, b: Aabb): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

export interface MoveResult {
  pos: Vec3;
  vel: Vec3;
  onGround: boolean;
}

/**
 * Bewegt eine Kapsel (Fußpunkt `pos`, `radius`, `height`) um `vel * dt`,
 * wendet Schwerkraft an und löst die Durchdringung statischer Boxen auf.
 * Reine Funktion: Eingaben werden nicht mutiert.
 */
export function moveCapsule(
  world: CollisionWorld,
  pos: Vec3,
  vel: Vec3,
  radius: number,
  height: number,
  dt: number,
): MoveResult {
  const next: Vec3 = { x: pos.x, y: pos.y, z: pos.z };
  const v: Vec3 = { x: vel.x, y: vel.y, z: vel.z };

  // --- X-Achse ---
  next.x += v.x * dt;
  for (let i = 0; i < world.boxes.length; i += 1) {
    const box = world.boxes[i];
    if (!box || !world.aktiv[i]) {
      continue;
    }
    if (!overlaps(capsuleAabb(next, radius, height), box)) {
      continue;
    }
    const ledge = box.maxY - next.y;
    if (ledge <= 0) {
      continue; // Boden / Stufe abwärts — kein horizontales Hindernis
    }
    if (ledge <= STEP_HEIGHT) {
      next.y = box.maxY; // kleine Stufe: hochsteigen statt blockieren
      continue;
    }
    const center = (box.minX + box.maxX) / 2;
    next.x = next.x < center ? box.minX - radius : box.maxX + radius;
    v.x = 0;
  }

  // --- Z-Achse ---
  next.z += v.z * dt;
  for (let i = 0; i < world.boxes.length; i += 1) {
    const box = world.boxes[i];
    if (!box || !world.aktiv[i]) {
      continue;
    }
    if (!overlaps(capsuleAabb(next, radius, height), box)) {
      continue;
    }
    const ledge = box.maxY - next.y;
    if (ledge <= 0) {
      continue;
    }
    if (ledge <= STEP_HEIGHT) {
      next.y = box.maxY;
      continue;
    }
    const center = (box.minZ + box.maxZ) / 2;
    next.z = next.z < center ? box.minZ - radius : box.maxZ + radius;
    v.z = 0;
  }

  // --- Y-Achse (Schwerkraft + Bodenkontakt) ---
  v.y += GRAVITY * dt;
  next.y += v.y * dt;
  let onGround = false;
  for (let i = 0; i < world.boxes.length; i += 1) {
    const box = world.boxes[i];
    if (!box || !world.aktiv[i]) {
      continue;
    }
    if (!overlaps(capsuleAabb(next, radius, height), box)) {
      continue;
    }
    if (v.y > 0 && box.minY > next.y) {
      next.y = box.minY - height; // Kopf an einer echten Decke anstoßen
    } else {
      next.y = box.maxY; // auf der Oberseite landen
      onGround = true;
    }
    v.y = 0;
  }

  return { pos: next, vel: v, onGround };
}

export interface RayHit {
  /** Weltpunkt des Treffers. */
  punkt: Vec3;
  /** Entfernung vom Ursprung entlang der (normalisierten) Richtung. */
  distanz: number;
}

/**
 * Grobe Sichtlinie zwischen zwei Weltpunkten: `true`, wenn kein statischer
 * Quader dazwischen liegt (AP4-02: Gegner sieht Spieler). Reine Funktion.
 */
export function sichtlinie(
  world: CollisionWorld,
  von: Vec3,
  nach: Vec3,
): boolean {
  const dx = nach.x - von.x;
  const dy = nach.y - von.y;
  const dz = nach.z - von.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 1e-6) {
    return true;
  }
  const hit = raycast(
    world,
    von,
    { x: dx / dist, y: dy / dist, z: dz / dist },
    dist,
  );
  return hit === undefined || hit.distanz >= dist - 0.05;
}

/**
 * Hitscan: nächster Schnittpunkt eines Strahls mit den statischen AABBs.
 * `richtung` muss normalisiert sein. Liefert `undefined`, wenn innerhalb von
 * `maxDistanz` nichts getroffen wird. Slab-Verfahren pro Box; Strahlen, die
 * innerhalb einer Box starten, werden ignoriert (Eintritts-`t` < 0).
 */
export function raycast(
  world: CollisionWorld,
  origin: Vec3,
  richtung: Vec3,
  maxDistanz: number,
): RayHit | undefined {
  let nearest = maxDistanz;
  let hit = false;

  for (let i = 0; i < world.boxes.length; i += 1) {
    const box = world.boxes[i];
    if (!box || !world.aktiv[i]) {
      continue;
    }
    let tNear = 0;
    let tFar = maxDistanz;

    const axes: Array<[number, number, number, number]> = [
      [origin.x, richtung.x, box.minX, box.maxX],
      [origin.y, richtung.y, box.minY, box.maxY],
      [origin.z, richtung.z, box.minZ, box.maxZ],
    ];

    let miss = false;
    for (const [o, d, lo, hi] of axes) {
      if (Math.abs(d) < 1e-9) {
        if (o < lo || o > hi) {
          miss = true;
          break;
        }
        continue;
      }
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) {
        [t1, t2] = [t2, t1];
      }
      tNear = Math.max(tNear, t1);
      tFar = Math.min(tFar, t2);
      if (tNear > tFar) {
        miss = true;
        break;
      }
    }

    if (miss || tNear <= 0 || tNear >= nearest) {
      continue;
    }
    nearest = tNear;
    hit = true;
  }

  if (!hit) {
    return undefined;
  }
  return {
    punkt: {
      x: origin.x + richtung.x * nearest,
      y: origin.y + richtung.y * nearest,
      z: origin.z + richtung.z * nearest,
    },
    distanz: nearest,
  };
}

/**
 * Hitscan gegen einen stehenden Zylinder (Näherung für eine Gegner-Kapsel:
 * Achse senkrecht, `feet` = Fußpunkt, Höhe `height`, Radius `radius`).
 * Liefert die Trefferdistanz `t` oder `undefined`. `richtung` muss normalisiert
 * sein. Trichter durch die Deckflächen wird nicht behandelt (für Schüsse auf
 * Augenhöhe irrelevant).
 */
export function raycastCylinder(
  origin: Vec3,
  richtung: Vec3,
  feet: Vec3,
  radius: number,
  height: number,
  maxDistanz: number,
): number | undefined {
  const ox = origin.x - feet.x;
  const oz = origin.z - feet.z;
  const a = richtung.x * richtung.x + richtung.z * richtung.z;
  const c = ox * ox + oz * oz - radius * radius;

  let t: number;
  if (a < 1e-9) {
    // Strahl läuft senkrecht — nur ein Treffer, wenn er in der Säule startet.
    if (c > 0) {
      return undefined;
    }
    t = 0;
  } else {
    const b = 2 * (ox * richtung.x + oz * richtung.z);
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      return undefined;
    }
    const sq = Math.sqrt(disc);
    const tEnter = (-b - sq) / (2 * a);
    const tExit = (-b + sq) / (2 * a);
    if (tEnter >= 0) {
      t = tEnter;
    } else if (tExit >= 0) {
      t = tExit;
    } else {
      return undefined;
    }
  }

  if (t > maxDistanz) {
    return undefined;
  }
  const y = origin.y + richtung.y * t;
  if (y < feet.y || y > feet.y + height) {
    return undefined;
  }
  return t;
}
