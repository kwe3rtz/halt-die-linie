// Durchlauf-Test für den Verbindungsgraben (AP5-01): eine Spielerkapsel läuft
// den zentralen Verbindungsgraben des Greybox-Sektors mehrfach in beide
// Richtungen ab — mittig, an beiden Wänden schleifend (seitlicher Druck), im
// Zickzack, gehend, sprintend, springend, plus einmal durch die Spieler-Sim
// selbst. Pro Tick darf sich die Kapsel höchstens so weit bewegen, wie ihr
// Tempo × dt erlaubt; alles darüber ist ein „Teleport".
//
// Hintergrund (Spieltest 2026-09-04): beim Wandkontakt schleuderte
// `moveCapsule` die Kapsel in einem Tick an das Ende der 33-m-Grabenwand. Der
// X-Push auf `box.minX − radius` ließ in Gleitkomma einen Rest von 2e-16 m
// Durchdringung stehen, und die Z-Achse „löste" diesen Rest an der nächsten
// Z-Fläche der Wand — bis zu 16,5 m entfernt. Die Gegenprobe unten trifft
// genau diesen Zustand.
import { describe, expect, it } from "vitest";
import {
  createCollisionWorld,
  moveCapsule,
  STEP_HEIGHT,
  type CollisionWorld,
} from "./collision";
import type { Vec3 } from "./math";
import { createSim, type InputCommand } from "./index";
import { sektorGreybox } from "../data/sektor";

const DT = 1 / 60;
/** Spielerkapsel — `PLAYER_RADIUS` / `PLAYER_HEIGHT` in `index.ts` (nicht exportiert). */
const RADIUS = 0.35;
const HEIGHT = 1.8;
/** `WALK_SPEED` / `SPRINT_SPEED` / `JUMP_SPEED` in `index.ts`. */
const GEHEN = 4.5;
const SPRINT = 7.0;
const SPRUNG = 7.2;
/** Rundungsspielraum auf die Plausibilitätsgrenze. */
const TOLERANZ = 1e-3;
/** Zeitbudget je Durchlauf (~35 m mit Seitendruck bei Gehtempo ≈ 11 s). */
const MAX_SEKUNDEN = 30;

// Verbindungsgraben (src/data/sektor.ts): Sohle −1,8, lichte Breite
// x ∈ [−1,8, 1,8], Wände von z = −21,5 (Home-Graben) bis 11,5 (Frontgraben).
const SOHLE = -1.8;
const WAND_INNEN = 1.8;
const GRABEN_SUED = -21.5;
const GRABEN_NORD = 11.5;
/** Start-/Zielpunkte jenseits beider Mündungen (Frontgraben / Home-Graben). */
const FRONT_Z = 13;
const HOME_Z = -24;
/**
 * Nur hier ist der Graben beidseitig geschlossen: die Home-Sohle reicht bis
 * z = −20, die Frontgraben-Sohle beginnt bei z = 10,3 (dort münden die Wände in
 * die breiten Quergräben). Seitendruck, Sprünge und die Wand-Invarianten gelten
 * im Korridor; außerhalb steuert die Kapsel zur Mittellinie, um die Mündung zu
 * treffen.
 */
const KORRIDOR_SUED = -20 + 0.5;
const KORRIDOR_NORD = 10.3 - 0.5;
const imKorridor = (z: number): boolean =>
  z > KORRIDOR_SUED && z < KORRIDOR_NORD;

interface Durchlauf {
  /** Seitendruck −1 (Westwand) … +1 (Ostwand), fest oder zeitabhängig. */
  seite: number | ((sekunden: number) => number);
  tempo: number;
  /** Sprung-Intervall in Sekunden (0 = nie). */
  sprung?: number;
}

interface Ergebnis {
  fehler: string[];
  angekommen: boolean;
  ticks: number;
}

/**
 * Läuft von z = `von` nach z = `nach` (x startet mittig) und prüft je Tick
 * die Plausibilitätsgrenze — horizontal der eigene Weg (|v| · dt), vertikal
 * eine Stufe — sowie im Korridor, dass die Kapsel weder durch die Wand
 * (|x| > lichte Breite − Radius) noch auf die Wand / das Feld (y ≥ −0,3)
 * gerät. Sprünge erreichen im Graben höchstens y ≈ −0,62.
 */
function laufe(
  world: CollisionWorld,
  von: number,
  nach: number,
  opt: Durchlauf,
): Ergebnis {
  let pos: Vec3 = { x: 0, y: SOHLE + 0.05, z: von };
  let vel: Vec3 = { x: 0, y: 0, z: 0 };
  let onGround = false;
  const fehler: string[] = [];
  const sprungTicks = opt.sprung ? Math.round(opt.sprung / DT) : 0;
  for (let t = 0; t < MAX_SEKUNDEN / DT; t += 1) {
    if (Math.abs(pos.z - nach) < 0.5) {
      return { fehler, angekommen: true, ticks: t };
    }
    const seite =
      typeof opt.seite === "function" ? opt.seite(t * DT) : opt.seite;
    // Wunschrichtung wie der Controller: quer + längs, auf 1 normiert.
    let wx = imKorridor(pos.z) ? seite : Math.max(-1, Math.min(1, -pos.x * 2)); // außen: zur Mittellinie
    let wz = Math.sign(nach - pos.z);
    const len = Math.hypot(wx, wz);
    if (len > 1) {
      wx /= len;
      wz /= len;
    }
    vel = { x: wx * opt.tempo, y: vel.y, z: wz * opt.tempo };
    if (
      sprungTicks > 0 &&
      onGround &&
      imKorridor(pos.z) &&
      t % sprungTicks === 0
    ) {
      vel.y = SPRUNG;
    }
    const r = moveCapsule(world, pos, vel, RADIUS, HEIGHT, DT);

    const dh = Math.hypot(r.pos.x - pos.x, r.pos.z - pos.z);
    const grenze = Math.hypot(vel.x, vel.z) * DT + TOLERANZ;
    const wo = `Tick ${t} bei (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`;
    if (dh > grenze) {
      fehler.push(
        `${wo}: horizontaler Sprung ${dh.toFixed(3)} m (erlaubt ${grenze.toFixed(3)}) → (${r.pos.x.toFixed(2)}, ${r.pos.z.toFixed(2)})`,
      );
    }
    if (Math.abs(r.pos.y - pos.y) > STEP_HEIGHT + TOLERANZ) {
      fehler.push(
        `${wo}: vertikaler Sprung ${(r.pos.y - pos.y).toFixed(3)} m → y ${r.pos.y.toFixed(2)}`,
      );
    }
    const innen = imKorridor(r.pos.z);
    if (innen && Math.abs(r.pos.x) > WAND_INNEN - RADIUS + TOLERANZ) {
      fehler.push(`${wo}: durch die Wand → x ${r.pos.x.toFixed(3)}`);
    }
    if (innen && r.pos.y >= -0.3) {
      fehler.push(`${wo}: auf der Wand / dem Feld → y ${r.pos.y.toFixed(2)}`);
    }
    if (fehler.length >= 5) {
      break;
    }
    pos = r.pos;
    vel = r.vel;
    onGround = r.onGround;
  }
  return { fehler, angekommen: false, ticks: MAX_SEKUNDEN / DT };
}

describe("Verbindungsgraben — Durchlauf ohne Sprünge (AP5-01)", () => {
  const world = createCollisionWorld(sektorGreybox);
  const zickzack = (s: number): number =>
    Math.floor(s / 0.5) % 2 === 0 ? 1 : -1;

  const faelle: Array<[string, Durchlauf]> = [
    ["mittig, gehen", { seite: 0, tempo: GEHEN }],
    ["mittig, Sprint", { seite: 0, tempo: SPRINT }],
    ["an der Ostwand schleifend, gehen", { seite: 1, tempo: GEHEN }],
    ["an der Ostwand schleifend, Sprint", { seite: 1, tempo: SPRINT }],
    ["an der Westwand schleifend, gehen", { seite: -1, tempo: GEHEN }],
    ["an der Westwand schleifend, Sprint", { seite: -1, tempo: SPRINT }],
    ["leichter Seitendruck Ost, Sprint", { seite: 0.3, tempo: SPRINT }],
    [
      "Zickzack zwischen beiden Wänden, Sprint",
      { seite: zickzack, tempo: SPRINT },
    ],
    [
      "Ostwand schleifend mit Sprüngen",
      { seite: 1, tempo: GEHEN, sprung: 1.5 },
    ],
    [
      "Westwand schleifend mit Sprüngen, Sprint",
      { seite: -1, tempo: SPRINT, sprung: 1.0 },
    ],
  ];

  for (const [name, opt] of faelle) {
    it(`${name}: Front → Home → Front`, () => {
      const hin = laufe(world, FRONT_Z, HOME_Z, opt);
      expect(hin.fehler).toEqual([]);
      expect(
        hin.angekommen,
        `hin: nach ${hin.ticks} Ticks nicht angekommen`,
      ).toBe(true);
      const zurueck = laufe(world, HOME_Z, FRONT_Z, opt);
      expect(zurueck.fehler).toEqual([]);
      expect(
        zurueck.angekommen,
        `zurück: nach ${zurueck.ticks} Ticks nicht angekommen`,
      ).toBe(true);
    });
  }

  it("stehend gegen jede Wand drücken: die Kapsel bleibt auf der Stelle", () => {
    for (const seite of [1, -1]) {
      let pos: Vec3 = { x: 0, y: SOHLE, z: 2 };
      let vel: Vec3 = { x: 0, y: 0, z: 0 };
      let kontakt: Vec3 | undefined;
      for (let t = 0; t < 120; t += 1) {
        vel = { x: seite * GEHEN, y: vel.y, z: 0 };
        const r = moveCapsule(world, pos, vel, RADIUS, HEIGHT, DT);
        expect(
          Math.hypot(r.pos.x - pos.x, r.pos.z - pos.z),
        ).toBeLessThanOrEqual(GEHEN * DT + TOLERANZ);
        pos = r.pos;
        vel = r.vel;
        if (kontakt) {
          expect(pos).toEqual(kontakt); // anliegend: keinerlei Drift
        } else if (r.vel.x === 0) {
          kontakt = pos;
        }
      }
      expect(kontakt).toBeDefined();
      expect(Math.abs(pos.x)).toBeCloseTo(WAND_INNEN - RADIUS, 6);
      expect(pos.z).toBe(2);
      expect(pos.y).toBeCloseTo(SOHLE, 6);
    }
  });
});

describe("Verbindungsgraben — die Ursache (Gegenprobe, AP5-01)", () => {
  it("Gleitkomma: 1,8 − 0,35 + 0,35 ist nicht 1,8 — der X-Push ließ 2e-16 m Durchdringung stehen", () => {
    // Dokumentiert die Zahl, an der der Bug hing: Innenfläche der Ostwand
    // (x = 1,8) minus Spielerradius (0,35), zurückgerechnet auf die Kapselkante.
    expect(WAND_INNEN - RADIUS + RADIUS).toBeGreaterThan(WAND_INNEN);
    expect(-WAND_INNEN + RADIUS - RADIUS).toBeLessThan(-WAND_INNEN);
  });

  it("anliegend an der Ostwand weiter dagegen drücken: kein Sprung ans Wandende (vorher: z 0 → 11,85)", () => {
    const world = createCollisionWorld(sektorGreybox);
    // Exakt der Zustand nach dem X-Push des vorigen Ticks.
    let pos: Vec3 = { x: WAND_INNEN - RADIUS, y: SOHLE, z: 0 };
    for (let t = 0; t < 10; t += 1) {
      const r = moveCapsule(
        world,
        pos,
        { x: GEHEN, y: 0, z: 0 },
        RADIUS,
        HEIGHT,
        DT,
      );
      expect(r.pos.z).toBe(0);
      expect(r.pos.x).toBeLessThanOrEqual(WAND_INNEN - RADIUS + 1e-9);
      expect(r.pos.y).toBeCloseTo(SOHLE, 6);
      pos = r.pos;
    }
  });

  it("anliegend an der Westwand weiter dagegen drücken: kein Sprung ans Wandende (vorher: z −10 → −21,85)", () => {
    const world = createCollisionWorld(sektorGreybox);
    let pos: Vec3 = { x: -(WAND_INNEN - RADIUS), y: SOHLE, z: -10 };
    for (let t = 0; t < 10; t += 1) {
      const r = moveCapsule(
        world,
        pos,
        { x: -GEHEN, y: 0, z: 0 },
        RADIUS,
        HEIGHT,
        DT,
      );
      expect(r.pos.z).toBe(-10);
      expect(r.pos.x).toBeGreaterThanOrEqual(-(WAND_INNEN - RADIUS) - 1e-9);
      expect(r.pos.y).toBeCloseTo(SOHLE, 6);
      pos = r.pos;
    }
  });
});

// ---------------------------------------------------------------------------
// Durch die Spieler-Sim selbst (Controller + moveCapsule + FALL_LIMIT).
// ---------------------------------------------------------------------------

function cmd(mx: number, my: number, sprint: boolean): InputCommand {
  return {
    move: { x: mx, y: my },
    look: { dx: 0, dy: 0 },
    buttons: {
      fire: false,
      aim: false,
      sprint,
      interact: false,
      ability: false,
      jump: false,
      reload: false,
    },
  };
}

describe("Verbindungsgraben — Spieler-Sim, hin und zurück mit Wandkontakt (AP5-01)", () => {
  /** Seed, dessen Spawn der mittlere vor der Grabenmündung ist (0, −1,4, 13). */
  function mittlererSeed(): number {
    for (let seed = 1; seed < 100; seed += 1) {
      const p = createSim(seed, sektorGreybox, { waves: false }).getState()
        .player.pos;
      if (p.x === 0 && p.z === 13) {
        return seed;
      }
    }
    throw new Error("kein Seed mit mittlerem Spawn gefunden");
  }

  it("rückwärts an der Ostwand nach Süden, vorwärts an der Westwand nach Norden — kein Tick über Sprint × dt", () => {
    const sim = createSim(mittlererSeed(), sektorGreybox, { waves: false });
    // yaw 0: move.y = −1 → −Z (Richtung Home), move.x = +1 → +X (Ostwand).
    const plan = (t: number): InputCommand => {
      if (t < 60) return cmd(0, -1, false); // 1 s in die Mündung
      if (t < 60 * 9) return cmd(1, -1, true); // Sprint diagonal an der Ostwand nach Süden
      if (t < 60 * 10) return cmd(0, 0, false); // stehen
      return cmd(-1, 1, true); // Sprint diagonal an der Westwand zurück nach Norden
    };
    let prev = sim.getState().player.pos;
    let minZ = Infinity;
    let maxZDanach = -Infinity;
    const fehler: string[] = [];
    for (let t = 0; t < 60 * 19; t += 1) {
      sim.tick(plan(t), DT);
      const p = sim.getState().player.pos;
      const dh = Math.hypot(p.x - prev.x, p.z - prev.z);
      if (dh > SPRINT * DT + TOLERANZ) {
        fehler.push(
          `Tick ${t}: Sprung ${dh.toFixed(3)} m von (${prev.x.toFixed(2)}, ${prev.z.toFixed(2)}) nach (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`,
        );
      }
      if (Math.abs(p.y - prev.y) > STEP_HEIGHT + TOLERANZ) {
        fehler.push(`Tick ${t}: vertikaler Sprung → y ${p.y.toFixed(2)}`);
      }
      minZ = Math.min(minZ, p.z);
      if (t >= 60 * 10) maxZDanach = Math.max(maxZDanach, p.z);
      prev = p;
    }
    expect(fehler).toEqual([]);
    // Wirklich durchquert: bis in den Home-Graben und wieder zurück in den Frontgraben.
    expect(minZ).toBeLessThan(GRABEN_SUED);
    expect(maxZDanach).toBeGreaterThan(GRABEN_NORD);
  });
});
