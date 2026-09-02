// Handgebautes Test-Grabenstück als reine Daten. Aus dieser Liste entstehen
// sowohl die Render-Boxen als auch die Sim-Collider — eine Quelle.
//
// Achsen: Y ist oben. +Z zeigt ins Niemandsland (Feindseite), -Z nach hinten.
// Deutet grob die Sektor-Idee aus KONZEPT.md §3 an (ebener Boden, Parapet mit
// Lücke, Verbindungsgraben nach hinten, Rampe hinab). Kein Balancing, keine Art.
import type { Vec3 } from "../sim/math";
import type { LevelBox, LevelData } from "../sim/collision";

function box(center: Vec3, size: Vec3): LevelBox {
  return { center, size };
}

// Alle Böden haben ihre Oberkante bei y = 0, außer dem 2 m tiefen Graben.
const boxes: LevelBox[] = [
  // --- Ebener Boden, um den Graben-Schlitz (x -3..3) herum ausgespart ---
  // Vorderfeld (Feuerbucht + Vorland Richtung Feind)
  box({ x: 0, y: -1, z: 13 }, { x: 40, y: 2, z: 14 }),
  // Boden links vom Graben
  box({ x: -11.5, y: -1, z: -5.5 }, { x: 17, y: 2, z: 23 }),
  // Boden rechts vom Graben
  box({ x: 11.5, y: -1, z: -5.5 }, { x: 17, y: 2, z: 23 }),

  // --- Verbindungsgraben: 2 m tiefer Schlitz, x -3..3, z -16..2 ---
  box({ x: 0, y: -3, z: -7 }, { x: 6, y: 2, z: 18 }),
  // Rückwand des Grabens
  box({ x: 0, y: -0.5, z: -16.5 }, { x: 6, y: 3, z: 1 }),

  // --- Schräge Rampe in den Graben: vier Stufen 0..-1.6 über z 6..2 ---
  box({ x: 0, y: -1.4, z: 5.5 }, { x: 6, y: 2, z: 1 }), // Oberkante -0.4
  box({ x: 0, y: -1.8, z: 4.5 }, { x: 6, y: 2, z: 1 }), // -0.8
  box({ x: 0, y: -2.2, z: 3.5 }, { x: 6, y: 2, z: 1 }), // -1.2
  box({ x: 0, y: -2.6, z: 2.5 }, { x: 6, y: 2, z: 1 }), // -1.6

  // --- Zwei parallele Wälle (Parapet) mit einer Lücke bei x -2..2 ---
  box({ x: -8.5, y: 1, z: 15 }, { x: 13, y: 2, z: 1 }),
  box({ x: 8.5, y: 1, z: 15 }, { x: 13, y: 2, z: 1 }),
  // Niedrige Brüstung in der Lücke — hält vom Absturz ab, man sieht darüber.
  box({ x: 0, y: 0, z: 15 }, { x: 4, y: 1.4, z: 1 }),

  // --- Umrandung, damit man nicht vom Rand fällt ---
  box({ x: -20.5, y: 0.5, z: 1.5 }, { x: 1, y: 5, z: 39 }),
  box({ x: 20.5, y: 0.5, z: 1.5 }, { x: 1, y: 5, z: 39 }),
  // Vordere Absperrung niedrig (Oberkante ~1.2): hält vom Absturz ab,
  // versperrt aber nicht den Blick ins Niemandsland.
  box({ x: 0, y: -0.4, z: 19.5 }, { x: 42, y: 3.2, z: 1 }),
  box({ x: 0, y: -0.4, z: -17.5 }, { x: 42, y: 3.2, z: 1 }),
];

export const testLevel: LevelData = {
  boxes,
  // Startpositionen in der Feuerbucht (Fußpunkt, fällt auf y = 0).
  spawnPoints: [
    { x: 0, y: 1, z: 10 },
    { x: 3, y: 1, z: 9 },
  ],
};
