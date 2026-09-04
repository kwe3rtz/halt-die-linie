// Graph-Begehbarkeits-Test (AP4-06): jede Kante des Sektor-Nav-Graphen muss
// für eine Gegner-Kapsel tatsächlich begehbar sein — in beide Richtungen, in
// der Ist-Konfiguration (offene Kanten, Breschen zu) UND in der Konfiguration
// „alles offen" (jede Kante offen, jede Bresche aufgerissen = Kollider aus).
// Fängt die Bugklasse „Nav sagt begehbar, Kollision sagt Wand" (Audit H1) und
// ist das Sicherheitsnetz für den späteren Labyrinth-Generator.
import { describe, expect, it } from "vitest";
import {
  createCollisionWorld,
  moveCapsule,
  setKolliderAktiv,
  type CollisionWorld,
} from "./collision";
import type { Vec3 } from "./math";
import { ENEMY_HEIGHT, ENEMY_RADIUS } from "./enemies";
import { brescheTag, type NavGraph } from "./sektor";
import { sektorGreybox } from "../data/sektor";

const DT = 1 / 60;
/** Marschtempo der Kapsel (wie Linieninfanterie). */
const TEMPO = 2.6;
/**
 * Ankunft: X/Z-Abstand zum Zielknoten unter dieser Toleranz — bewusst enger
 * als `WEGPUNKT_RADIUS_ENG` (1,4 m) in `enemies.ts`, und kleiner als
 * Wandstärke + Kapselradius (0,55 m), damit „vor der Wand stehen" nie als
 * Ankunft zählt.
 */
const TOLERANZ = 0.5;
/** Zeitbudget je Kante — die längste Kante im Greybox ist ~20 m. */
const MAX_SEKUNDEN = 40;

interface Lauf {
  ok: boolean;
  /** Verbleibender X/Z-Abstand zum Ziel. */
  rest: number;
  pos: Vec3;
}

/** Lässt eine Gegner-Kapsel geradeaus von `von` nach `nach` laufen. */
function laufe(world: CollisionWorld, von: Vec3, nach: Vec3): Lauf {
  let pos: Vec3 = { x: von.x, y: von.y + 0.05, z: von.z };
  let vel: Vec3 = { x: 0, y: 0, z: 0 };
  let rest = Infinity;
  for (let t = 0; t < MAX_SEKUNDEN / DT; t += 1) {
    const dx = nach.x - pos.x;
    const dz = nach.z - pos.z;
    rest = Math.hypot(dx, dz);
    if (rest < TOLERANZ) {
      return { ok: true, rest, pos };
    }
    vel = { x: (dx / rest) * TEMPO, y: vel.y, z: (dz / rest) * TEMPO };
    const r = moveCapsule(world, pos, vel, ENEMY_RADIUS, ENEMY_HEIGHT, DT);
    pos = r.pos;
    vel = r.vel;
  }
  return { ok: false, rest, pos };
}

/**
 * Steckt der Knoten in einem aktiven Kollider? Liefert das Etikett der Box
 * (`""` ohne Tag) oder `null`, wenn frei. Ein Knoten in einem **getaggten**
 * (schaltbaren) Segment ist ein Kontaktpunkt (geschlossene Bresche) — im
 * Ist-Zustand erlaubt, aber nicht begehbar; in einem ungetaggten Kollider ist
 * er immer ein Datenfehler.
 */
function steckt(world: CollisionWorld, p: Vec3): string | null {
  const y = p.y + 0.05;
  for (let i = 0; i < world.boxes.length; i += 1) {
    const b = world.boxes[i];
    if (!b || !world.aktiv[i]) {
      continue;
    }
    if (
      p.x > b.minX &&
      p.x < b.maxX &&
      p.z > b.minZ &&
      p.z < b.maxZ &&
      y >= b.minY &&
      y < b.maxY
    ) {
      return world.tags[i] ?? "";
    }
  }
  return null;
}

/** Prüft alle (ggf. gefilterten) Kanten in beide Richtungen, sammelt Fehler. */
function pruefeKanten(
  world: CollisionWorld,
  graph: NavGraph,
  nurOffene: boolean,
): string[] {
  const knoten = new Map(graph.knoten.map((k) => [k.id, k.pos]));
  const fehler: string[] = [];
  const kontakt = new Set<string>();
  for (const k of graph.knoten) {
    const tag = steckt(world, k.pos);
    if (tag === null) {
      continue;
    }
    if (tag === "") {
      fehler.push(`Knoten ${k.id} steckt in einem festen Kollider`);
    } else {
      kontakt.add(k.id); // geschlossene Bresche: Kontaktpunkt, nicht begehbar
    }
  }
  for (const k of graph.kanten) {
    if (nurOffene && !k.offen) {
      continue;
    }
    if (kontakt.has(k.von) || kontakt.has(k.nach)) {
      continue;
    }
    const a = knoten.get(k.von);
    const b = knoten.get(k.nach);
    if (!a || !b) {
      fehler.push(`${k.von} → ${k.nach}: Knoten fehlt`);
      continue;
    }
    for (const [von, nach, vonId, nachId] of [
      [a, b, k.von, k.nach],
      [b, a, k.nach, k.von],
    ] as const) {
      const r = laufe(world, von, nach);
      if (!r.ok) {
        fehler.push(
          `${vonId} → ${nachId}: hängt bei (${r.pos.x.toFixed(2)}, ${r.pos.z.toFixed(2)}), Rest ${r.rest.toFixed(2)} m`,
        );
      }
    }
  }
  return fehler;
}

describe("Nav-Graph — Begehbarkeit gegen die Kollisionswelt (AP4-06)", () => {
  const { meta } = sektorGreybox;

  it("Ist-Zustand: jede offene Kante ist in beide Richtungen begehbar", () => {
    const world = createCollisionWorld(sektorGreybox);
    expect(pruefeKanten(world, meta.navGraph, true)).toEqual([]);
  });

  const alleOffen: NavGraph = {
    knoten: meta.navGraph.knoten,
    kanten: meta.navGraph.kanten.map((k) => ({ ...k, offen: true })),
  };

  it("alles offen (jede Bresche aufgerissen, jeder Abschnitt gefallen): jede Kante ist begehbar", () => {
    const world = createCollisionWorld(sektorGreybox);
    for (const ab of [...meta.frontAbschnitte, ...meta.homeAbschnitte]) {
      ab.parapetBreschen.forEach((_, i) => {
        expect(setKolliderAktiv(world, brescheTag(ab.id, i), false)).toBe(1);
      });
    }
    expect(pruefeKanten(world, alleOffen, false)).toEqual([]);
  });

  it("Gegenprobe: mit stehendem Parapet sind die Bresche-Kanten NICHT begehbar (das war Audit-Befund H1)", () => {
    // Kein Kollider abgeschaltet, aber alle Kanten offen — genau der Zustand,
    // den AP4-03 erzeugt hat (Nav offen, Wand steht). Muss rot sein.
    const world = createCollisionWorld(sektorGreybox);
    // Die Bresche-Knoten stecken im (aktiven) Parapet-Segment → im Ist-Zustand
    // Kontaktpunkte; hier verlangen wir ausdrücklich, dass der Weg vom
    // Labyrinth zu ihnen ohne Abschalten des Segments NICHT begehbar ist.
    for (const ab of meta.frontAbschnitte) {
      const tag = brescheTag(ab.id, 0);
      expect(
        steckt(
          world,
          meta.navGraph.knoten.find((k) => k.id === `bresche-${ab.id}`)!.pos,
        ),
      ).toBe(tag);
      const p = meta.navGraph.knoten.find((k) => k.id === `bresche-${ab.id}`);
      const lv = meta.navGraph.knoten.find((k) => k.id === "lab-vorfront");
      expect(p && lv && laufe(world, lv.pos, p.pos).ok).toBe(false);
    }
  });

  it("jede Bresche hat ein getaggtes Parapet-Segment, das sie umschließt", () => {
    for (const ab of [...meta.frontAbschnitte, ...meta.homeAbschnitte]) {
      ab.parapetBreschen.forEach((b, i) => {
        const tag = brescheTag(ab.id, i);
        const segment = sektorGreybox.boxes.find((box) => box.tag === tag);
        expect(segment, `Segment ${tag} fehlt`).toBeDefined();
        if (!segment) return;
        expect(Math.abs(segment.center.x - b.x)).toBeLessThanOrEqual(
          segment.size.x / 2,
        );
        expect(Math.abs(segment.center.z - b.z)).toBeLessThanOrEqual(
          segment.size.z / 2,
        );
      });
    }
  });
});
