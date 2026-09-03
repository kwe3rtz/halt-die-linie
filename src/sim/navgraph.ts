// Semantischer Navigations-Graph des Sektors (AP4-02). Reine, deterministische
// Helfer: kein NavMesh, kein A*-über-Gitter — nur BFS über einen handgepflegten
// Knoten-/Kantengraphen. Gehört zur headless Sim (goldene Regel).
import type { Vec3 } from "./math";
import type { NavGraph } from "./sektor";

/**
 * Kürzester Pfad (wenigste Kanten) von `vonId` nach `zielId` über die **offenen**
 * Kanten, ungerichtet. Liefert die Knoten-Id-Folge inkl. Start und Ziel, oder
 * `[]`, wenn kein Weg existiert. Deterministisch — Nachbarn werden alphabetisch
 * besucht.
 */
export function kuerzesterPfad(
  graph: NavGraph,
  vonId: string,
  zielId: string,
): string[] {
  if (vonId === zielId) {
    return [vonId];
  }

  const nachbarn = new Map<string, Set<string>>();
  const verbinde = (a: string, b: string): void => {
    const set = nachbarn.get(a);
    if (set) {
      set.add(b);
    } else {
      nachbarn.set(a, new Set([b]));
    }
  };
  for (const k of graph.kanten) {
    if (!k.offen) {
      continue;
    }
    verbinde(k.von, k.nach);
    verbinde(k.nach, k.von);
  }

  // Breitensuche Welle für Welle → der erste gefundene Weg ist der kürzeste.
  const vorgaenger = new Map<string, string>([[vonId, vonId]]);
  let welle = [vonId];
  while (welle.length > 0 && !vorgaenger.has(zielId)) {
    const naechste: string[] = [];
    for (const knoten of welle) {
      const nb = nachbarn.get(knoten);
      if (!nb) {
        continue;
      }
      for (const n of [...nb].sort()) {
        if (!vorgaenger.has(n)) {
          vorgaenger.set(n, knoten);
          naechste.push(n);
        }
      }
    }
    welle = naechste;
  }

  if (!vorgaenger.has(zielId)) {
    return [];
  }
  const pfad = [zielId];
  let cur = zielId;
  while (cur !== vonId) {
    const p = vorgaenger.get(cur);
    if (p === undefined) {
      return [];
    }
    cur = p;
    pfad.push(cur);
  }
  return pfad.reverse();
}

/**
 * Id des Graph-Knotens, der `pos` am nächsten liegt (X/Z-Abstand). Bei
 * Gleichstand gewinnt die lexikographisch kleinere Id (deterministisch).
 */
export function naechsterKnoten(graph: NavGraph, pos: Vec3): string {
  let best = "";
  let bestD = Infinity;
  for (const k of graph.knoten) {
    const dx = k.pos.x - pos.x;
    const dz = k.pos.z - pos.z;
    const d = dx * dx + dz * dz;
    if (d < bestD || (d === bestD && k.id < best)) {
      bestD = d;
      best = k.id;
    }
  }
  return best;
}

/**
 * Grober Sichtkegel-Test für die Infiltrations-Spawn-Wahl (AP4-02): liegt
 * `punkt` vor dem Spieler (X/Z) innerhalb `halbwinkel` und `reichweite`?
 * Blickrichtung aus `yaw` konsistent zu `dirFromYawPitch` (yaw 0 = +Z).
 */
export function imSichtkegel(
  spielerPos: Vec3,
  spielerYaw: number,
  punkt: Vec3,
  halbwinkel = Math.PI / 3,
  reichweite = 45,
): boolean {
  const dx = punkt.x - spielerPos.x;
  const dz = punkt.z - spielerPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-6) {
    return true;
  }
  if (dist > reichweite) {
    return false;
  }
  const cos = (dx * Math.sin(spielerYaw) + dz * Math.cos(spielerYaw)) / dist;
  return cos >= Math.cos(halbwinkel);
}
