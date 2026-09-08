// AP6-01d — der Sektor im Graben-Look: die Eigenschaften, die den Look tragen
// (Tiefe, Verkleidung ohne Glitch, Feuertritt, echte Abstiegs-Unterstände,
// durchgehender Boden) direkt an `sektorGreybox` geprüft. Ergänzt
// `src/sim/sektor.test.ts` (Semantik/Nav) und `navgraph-begehbarkeit.test.ts`
// (Kanten) um die *räumlichen* Zusagen aus dem Ticket.
import { describe, expect, it } from "vitest";
import {
  createCollisionWorld,
  moveCapsule,
  STEP_HEIGHT,
  type CollisionWorld,
  type LevelBox,
} from "../sim/collision";
import type { Vec3 } from "../sim/math";
import { kuerzesterPfad } from "../sim/navgraph";
import type { NavGraph } from "../sim/sektor";
import {
  ABSTIEG_KOPFFREIHEIT,
  ABSTIEG_STUFEN,
  BRUSTWEHR_OBERKANTE,
  FEUERTRITT_OBERKANTE,
  GRABEN_SOHLE,
  OBERFLAECHE,
  PARAPET_OBERKANTE,
} from "./module";
import { sektorGreybox } from "./sektor";

const DT = 1 / 60;
const PLAYER_EYE = 1.6; // src/sim/index.ts (Platzhalter, nicht exportiert)
const R = 0.35;
const H = 1.8;
const TEMPO = 4.5; // WALK_SPEED

const world: CollisionWorld = createCollisionWorld(sektorGreybox);
const oberkante = (b: LevelBox): number => b.center.y + b.size.y / 2;

interface Lauf {
  pos: Vec3;
  minY: number;
  maxY: number;
  /** Größter Y-Sprung zwischen zwei Ticks (Stufen-/Klemm-Detektor). */
  maxDy: number;
  /** Anteil der Ticks, in denen die Kapsel spürbar vorankam. */
  fortschritt: number;
}

/** Lässt eine Kapsel von `von` nach `nach` laufen (X/Z), mit Messwerten. */
function laufe(von: Vec3, nach: { x: number; z: number }, maxS = 30): Lauf {
  let pos: Vec3 = { x: von.x, y: von.y, z: von.z };
  let vel: Vec3 = { x: 0, y: 0, z: 0 };
  let minY = pos.y;
  let maxY = pos.y;
  let maxDy = 0;
  let bewegt = 0;
  let ticks = 0;
  for (let t = 0; t < maxS / DT; t += 1) {
    const dx = nach.x - pos.x;
    const dz = nach.z - pos.z;
    const rest = Math.hypot(dx, dz);
    if (rest < 0.4) {
      break;
    }
    vel = { x: (dx / rest) * TEMPO, y: vel.y, z: (dz / rest) * TEMPO };
    const r = moveCapsule(world, pos, vel, R, H, DT);
    const dh = Math.hypot(r.pos.x - pos.x, r.pos.z - pos.z);
    maxDy = Math.max(maxDy, Math.abs(r.pos.y - pos.y));
    if (dh > TEMPO * DT * 0.5) {
      bewegt += 1;
    }
    ticks += 1;
    pos = r.pos;
    vel = r.vel;
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  }
  return {
    pos,
    minY,
    maxY,
    maxDy,
    fortschritt: ticks === 0 ? 1 : bewegt / ticks,
  };
}

/** Lässt eine Kapsel an Ort und Stelle fallen und liefert die Landehöhe. */
function falle(x: number, y: number, z: number, s = 4): number {
  let pos: Vec3 = { x, y, z };
  let vel: Vec3 = { x: 0, y: 0, z: 0 };
  for (let t = 0; t < s / DT; t += 1) {
    const r = moveCapsule(world, pos, vel, R, H, DT);
    pos = r.pos;
    vel = r.vel;
  }
  return pos.y;
}

describe("Graben-Look — Tiefe & Feuertritt (AP6-01d)", () => {
  it("auf der Sohle im Feuergraben sieht das Auge nicht über die Brustwehr", () => {
    // Laufgang hinter der zweiten Feuernische.
    const y = falle(-7, 0, 18.2);
    expect(y).toBeCloseTo(GRABEN_SOHLE + 0.04, 2); // Laufrost-Oberkante
    expect(y + PLAYER_EYE).toBeLessThan(BRUSTWEHR_OBERKANTE - 1.5);
  });

  it("über den Feuertritt steigt die Kapsel ohne Sprung auf Kimmen-Höhe", () => {
    // Aus der zweiten Feuernische (z 20,6) nach Norden gegen die Brustwehr.
    // x −4: klar zwischen Sap-Schleuse (x −7) und Traverse (x 0).
    const r = laufe(
      { x: -4, y: GRABEN_SOHLE + 0.3, z: 20.6 },
      { x: -4, z: 24 },
    );
    expect(r.pos.z).toBeGreaterThan(23); // an der Wand angekommen
    expect(r.pos.y).toBeCloseTo(FEUERTRITT_OBERKANTE, 1); // auf der Bank
    expect(r.maxDy).toBeLessThanOrEqual(STEP_HEIGHT + 1e-6);
    // Auge auf der Bank ≈ Sandsack-Kronenhöhe → über die Kimme schießbar.
    expect(
      Math.abs(r.pos.y + PLAYER_EYE - PARAPET_OBERKANTE),
    ).toBeLessThanOrEqual(0.15);
  });

  it("die Parapet-Krone ist keine Lauffläche — vom Niemandsland aus nicht begehbar", () => {
    const r = laufe({ x: -14, y: 0.1, z: 30 }, { x: -14, z: 18 });
    expect(r.pos.z).toBeGreaterThan(26); // vor der Brustwehr gestoppt
    expect(r.maxY).toBeLessThan(0.3); // nie hinaufgestiegen
    expect(BRUSTWEHR_OBERKANTE - OBERFLAECHE).toBeGreaterThan(STEP_HEIGHT);
  });
});

describe("Verkleidung kollidiert nicht (AP6-01d, Spieltest-Korrektur 1)", () => {
  it("kein Formdetail steckt in der Kollisionswelt", () => {
    const detail = sektorGreybox.boxes.filter((b) => b.nurRender === true);
    expect(detail.length).toBeGreaterThan(500); // Pfosten, Bohlen, Sandsäcke …
    expect(createCollisionWorld(sektorGreybox).boxes.length).toBe(
      sektorGreybox.boxes.length - detail.length,
    );
  });

  it("an der verkleideten Brustwehr entlanglaufen: kein Hängenbleiben, keine Stufe", () => {
    // Dicht an der Wand (Kapselrand 1 cm davor) quer durch die zweite
    // Feuernische — vor AP6-01d hing man hier an jeder Pfostenkante.
    const start: Vec3 = { x: -11, y: GRABEN_SOHLE + 0.3, z: 21.8 - R - 0.01 };
    const r = laufe(start, { x: -3, z: start.z });
    expect(r.pos.x).toBeGreaterThan(-3.5); // durchgelaufen
    expect(r.fortschritt).toBeGreaterThan(0.98); // fast jeder Tick bringt Weg
    expect(r.maxDy).toBeLessThan(0.05); // keine Mikro-Stufe (Kamera-Zittern)
  });

  it("an der Express-Laufgraben-Wand entlanglaufen: kein Hängenbleiben", () => {
    // Lichte Weite 2,0 m → Kapsel an der Ostwand (x = 1,0 − 0,35).
    const start: Vec3 = { x: 1 - R - 0.01, y: GRABEN_SOHLE + 0.3, z: 10 };
    const r = laufe(start, { x: start.x, z: -28 });
    expect(r.pos.z).toBeLessThan(-27.5);
    expect(r.fortschritt).toBeGreaterThan(0.98);
    expect(r.maxDy).toBeLessThan(0.05);
  });
});

describe("Abstiegs-Unterstände der Home-Line (AP6-01d, Korrekturen 3+4)", () => {
  const SCHACHT_Z = -40.8;

  it("12 Stufen, Anstieg ≤ 0,22 m, Raumhöhe ≥ 2,25 m", () => {
    expect(ABSTIEG_STUFEN).toBe(12);
    expect(ABSTIEG_KOPFFREIHEIT).toBeGreaterThanOrEqual(2.25);
    // Treppenstufen des mittleren Unterstands (Verbandsplatz, x = 0).
    const stufen = sektorGreybox.boxes
      .filter(
        (b) =>
          b.oberflaeche === "holz" &&
          Math.abs(b.center.x) < 1 &&
          b.center.z < SCHACHT_Z &&
          b.center.z > SCHACHT_Z - 4 &&
          oberkante(b) < GRABEN_SOHLE - 0.05,
      )
      .map(oberkante)
      .sort((a, b) => b - a);
    expect(stufen.length).toBe(ABSTIEG_STUFEN);
    const kette = [GRABEN_SOHLE, ...stufen];
    for (let i = 1; i < kette.length; i += 1) {
      expect(kette[i - 1]! - kette[i]!).toBeLessThanOrEqual(0.22);
    }
  });

  for (const [name, x] of [
    ["Munitionslager", -16],
    ["Verbandsplatz", 0],
    ["Feldkommandeur", 16],
  ] as const) {
    it(`${name}: Treppe hinab → Raumboden mit Kopffreiheit → wieder hinauf`, () => {
      const start: Vec3 = { x, y: GRABEN_SOHLE + 0.3, z: SCHACHT_Z + 1.5 };
      const rein = laufe(start, { x, z: SCHACHT_Z - 6.2 });
      // Auf dem Raumboden (Sohle − 2,5 = −5,2) angekommen.
      expect(rein.pos.y).toBeCloseTo(GRABEN_SOHLE - 2.5, 1);
      expect(rein.minY).toBeGreaterThan(GRABEN_SOHLE - 2.9); // nie durchgefallen
      // Auge (−3,6) clippt nicht in die Decke (Unterkante −2,9): 0,7 m Luft.
      expect(rein.pos.y + PLAYER_EYE).toBeLessThan(
        rein.pos.y + ABSTIEG_KOPFFREIHEIT - 0.6,
      );
      // Und wieder hinauf in den Laufgang.
      const raus = laufe(
        { ...rein.pos, y: rein.pos.y + 0.1 },
        { x, z: SCHACHT_Z + 1.5 },
      );
      expect(raus.pos.z).toBeGreaterThan(SCHACHT_Z);
      expect(raus.pos.y).toBeGreaterThan(GRABEN_SOHLE - 0.2);
    });

    it(`${name}: keine Kapsel fällt durch die Auffangboden-Aussparung`, () => {
      for (const dz of [-1, -3, -5, -6.5]) {
        const y = falle(x, GRABEN_SOHLE - 0.6, SCHACHT_Z + dz);
        expect(y, `${name} dz=${dz}`).toBeGreaterThan(GRABEN_SOHLE - 2.9);
      }
    });
  }

  it("die Unterstände stehen nicht im Nav-Graph (Spieler-Schutzraum)", () => {
    for (const k of sektorGreybox.meta.navGraph.knoten) {
      expect(k.pos.y, k.id).toBeGreaterThan(GRABEN_SOHLE - 0.5);
    }
  });
});

describe("Durchgehender Boden (Jank-Pass, AP6-01d)", () => {
  it("an jeder Zonengrenze trägt der Boden über die volle Breite", () => {
    const grenzen = sektorGreybox.meta.zonen.flatMap((z) => [
      z.bounds.minZ,
      z.bounds.maxZ,
    ]);
    for (const z of new Set(grenzen)) {
      for (const x of [-30, -18, -6, 6, 18, 30]) {
        const y = falle(x, 1.5, z, 3);
        expect(y, `Zonengrenze z=${z}, x=${x}`).toBeGreaterThan(
          GRABEN_SOHLE - 1.2,
        );
      }
    }
  });

  it("ein Marsch quer durch den Sektor bleibt immer auf tragendem Boden", () => {
    // Der Weg folgt dem Nav-Graphen (mit allen Kanten offen) von der äußersten
    // Feuernische bis zur Home-Line — also durch Laufgang, Parados-Mündung,
    // Verbindungsgraben-Dog-Leg und Home-Brustwehr. Anders als
    // `navgraph-begehbarkeit.test.ts`, das jede Kante einzeln prüft, läuft die
    // Kapsel hier **eine** durchgehende Strecke: kein Zurücksetzen, keine
    // Höhe, die zwischendurch verloren geht.
    const g = sektorGreybox.meta.navGraph;
    const alleOffen: NavGraph = {
      knoten: g.knoten,
      kanten: g.kanten.map((k) => ({ ...k, offen: true })),
    };
    const pfad = kuerzesterPfad(alleOffen, "front-fw", "home-ziel");
    expect(pfad.length).toBeGreaterThan(8);
    const knoten = new Map(g.knoten.map((k) => [k.id, k.pos]));
    let pos: Vec3 = { ...knoten.get(pfad[0]!)!, y: GRABEN_SOHLE + 0.3 };
    let tiefstes = pos.y;
    for (const id of pfad.slice(1)) {
      const ziel = knoten.get(id)!;
      const r = laufe(pos, { x: ziel.x, z: ziel.z }, 40);
      tiefstes = Math.min(tiefstes, r.minY);
      expect(
        Math.hypot(r.pos.x - ziel.x, r.pos.z - ziel.z),
        `Etappe ${id} nicht erreicht`,
      ).toBeLessThan(1.2);
      pos = r.pos;
    }
    expect(tiefstes).toBeGreaterThan(GRABEN_SOHLE - 1.0);
  });
});

describe("Nacht-Lichter (AP6-01d)", () => {
  it("kein Licht steckt in einem Kollider", () => {
    for (const l of sektorGreybox.meta.lichter) {
      const drin = sektorGreybox.boxes.filter(
        (b) =>
          b.nurRender !== true &&
          Math.abs(l.x - b.center.x) < b.size.x / 2 &&
          Math.abs(l.z - b.center.z) < b.size.z / 2 &&
          l.y >= b.center.y - b.size.y / 2 &&
          l.y < b.center.y + b.size.y / 2,
      );
      expect(drin, `Licht (${l.x}, ${l.y}, ${l.z}) steckt im Kollider`).toEqual(
        [],
      );
    }
  });

  it("jede Zone hat mindestens ein Licht in Reichweite", () => {
    const reichweite = 22;
    for (const z of sektorGreybox.meta.zonen) {
      if (z.id === "feindseite") {
        continue; // bewusst dunkel: die Nacht-Überquerung
      }
      const mitte = {
        x: (z.bounds.minX + z.bounds.maxX) / 2,
        z: (z.bounds.minZ + z.bounds.maxZ) / 2,
      };
      const nah = sektorGreybox.meta.lichter.some(
        (l) => Math.hypot(l.x - mitte.x, l.z - mitte.z) < reichweite,
      );
      expect(nah, `Zone ${z.id} ohne Licht in Reichweite`).toBe(true);
    }
  });
});
