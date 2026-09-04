// Wellen-Eskalation auf dem echten Sektor (AP5-04). Zwei Sicherheitsnetze:
//  1. Eine große Welle strömt komplett durchs Labyrinth an die Front — ohne
//     einen einzigen Watchdog-Eingriff — und die Tempo-/Spur-Streuung zieht die
//     Kette hörbar auseinander (Gegenprobe ohne Streuung: enge Formation).
//  2. Ein ganzer Einsatz (Seed 1 wie `main.ts`, idealisierter Schütze im
//     Frontgraben A) liefert die Eskalation 5 · 8 · 11 · 14 · 17, deutlich mehr
//     gleichzeitig lebende Gegner als vor AP5-04 (Peak 9) und endet gewonnen,
//     ohne dass ein Gegner irgendwo hängen bleibt.
import { describe, expect, it } from "vitest";
import { createCollisionWorld, sichtlinie } from "./collision";
import {
  spawnEnemy,
  updateEnemies,
  type EnemyEntity,
  type GegnerStreuung,
} from "./enemies";
import { createSim, type InputCommand } from "./index";
import { createRng } from "./rng";
import type { NavGraph } from "./sektor";
import { spawnIntervall, wellenGroesse } from "./wave";
import { linieninfanterie } from "../data/gegner";
import { sektorGreybox } from "../data/sektor";

const DT = 1 / 60;
const LOOK_SENSITIVITY = 0.0022; // wie in src/sim/index.ts

function command(
  buttons: Partial<InputCommand["buttons"]> = {},
  look = { dx: 0, dy: 0 },
): InputCommand {
  return {
    move: { x: 0, y: 0 },
    look,
    buttons: {
      fire: false,
      aim: false,
      sprint: false,
      interact: false,
      ability: false,
      jump: false,
      reload: false,
      ...buttons,
    },
  };
}

describe("Wellen-Eskalation — Labyrinth-Durchsatz einer großen Welle", () => {
  const world = createCollisionWorld(sektorGreybox);
  const graph: NavGraph = {
    knoten: sektorGreybox.meta.navGraph.knoten,
    kanten: sektorGreybox.meta.navGraph.kanten.map((k) => ({ ...k })),
  };
  const spieler = { x: -12, y: -1.4, z: 13 }; // Spawn A, außer Sicht der Anmarschroute

  /** Lässt `anzahl` Gegner im Welle-5-Takt anmarschieren; liefert Ankunftszeiten (z ≤ 17). */
  function strom(anzahl: number, mitStreuung: boolean) {
    const rng = createRng(4242);
    const punkte = sektorGreybox.meta.feindAnmarsch;
    const abschnitte = ["A", "B", "C"];
    const nav = {
      graph,
      verloren: new Set<string>(),
      onDespawn: (e: EnemyEntity) => despawned.push(e.id),
    };
    const despawned: number[] = [];
    const ankunft = new Map<number, number>();
    const spawnZeit = new Map<number, number>();
    let list: EnemyEntity[] = [];
    let naechsterSpawn = 0;
    let id = 1;
    let maxFest = 0;
    for (let tick = 0; tick < 60 * 90; tick += 1) {
      const t = tick * DT;
      if (id <= anzahl && t >= naechsterSpawn) {
        const p = punkte[rng.int(0, punkte.length - 1)] ?? punkte[0];
        const streuung: GegnerStreuung | undefined = mitStreuung
          ? { tempo: rng.next(), spur: rng.next() }
          : { tempo: 0.5, spur: 0.5 };
        if (p) {
          list.push(
            spawnEnemy(
              linieninfanterie,
              id,
              p,
              1,
              abschnitte[rng.int(0, 2)] ?? "B",
              streuung,
            ),
          );
          spawnZeit.set(id, t);
        }
        id += 1;
        naechsterSpawn = t + spawnIntervall(5) * rng.range(0.75, 1.25);
      }
      list = updateEnemies(
        list,
        world,
        spieler,
        true,
        () => undefined,
        DT,
        nav,
      );
      for (const e of list) {
        maxFest = Math.max(maxFest, e.festVersuche);
        if (!ankunft.has(e.id) && e.pos.z <= 17) ankunft.set(e.id, t);
      }
      if (id > anzahl && ankunft.size + despawned.length >= anzahl) break;
    }
    // Marschzeit je Gegner (Spawn → Front): bei gleichem Weg misst ihre Spanne,
    // wie weit die Kette auseinandergezogen ist.
    const marsch = [...ankunft.entries()]
      .map(([k, a]) => a - (spawnZeit.get(k) ?? a))
      .sort((a, b) => a - b);
    return {
      angekommen: ankunft.size,
      despawned,
      maxFest,
      spanne: marsch.length > 1 ? (marsch.at(-1) ?? 0) - (marsch[0] ?? 0) : 0,
    };
  }

  it("17 Gegner (Welle 5) kommen alle ohne Watchdog-Eingriff an der Front an", () => {
    const r = strom(wellenGroesse(5), true);
    expect(r.angekommen).toBe(17);
    expect(r.despawned).toEqual([]);
    expect(r.maxFest).toBe(0);
  });

  it("die Streuung zieht die Kette auseinander — ohne sie kommt die Welle als enge Formation", () => {
    const mit = strom(wellenGroesse(5), true);
    const ohne = strom(wellenGroesse(5), false);
    expect(ohne.angekommen).toBe(17);
    expect(ohne.maxFest).toBe(0);
    // Gleicher Weg, aber ±15 % Tempo und gestreute Spuren: die Marschzeiten
    // gehen um Sekunden auseinander (gemessen ~5,3 s vs. ~2,1 s).
    expect(ohne.spanne).toBeLessThan(3);
    expect(mit.spanne).toBeGreaterThan(4);
    expect(mit.spanne).toBeGreaterThan(ohne.spanne + 2);
  });
});

describe("Wellen-Eskalation — ganzer Einsatz mit idealisiertem Schützen (Seed 1)", () => {
  // Der Schütze steht im Frontgraben A (Seed 1 wie `main.ts`), zielt auf den
  // nächsten Gegner mit Sichtlinie und feuert alle 1,6 s (Kadenz 50/min plus
  // Zielen), lädt bei leerem Magazin nach — ein kompetenter, aber
  // unbeweglicher Spieler. Sterben und Respawn sind erlaubt.
  it("liefert fünf wachsende Hauptwellen 5·8·11·14·17, klar mehr gleichzeitig lebende Gegner als vorher, kein Watchdog-Despawn, gewonnen", () => {
    const world = createCollisionWorld(sektorGreybox);
    const sim = createSim(1, sektorGreybox, { waves: true });
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

    const gesehen = new Map<number, { tot: boolean; zuletzt: number }>();
    const proWelle = new Map<number, number>();
    let despawns = 0;
    let maxLebend = 0;
    let letzterSchuss = -99;
    let t = 0;
    for (let tick = 0; tick < 60 * 60 * 15; tick += 1) {
      const s = sim.getState();
      t = tick * DT;
      const lebend = s.enemies.filter((e) => e.zustand !== "tot");
      maxLebend = Math.max(maxLebend, lebend.length);
      for (const e of s.enemies) {
        const g = gesehen.get(e.id);
        if (!g) {
          gesehen.set(e.id, { tot: e.zustand === "tot", zuletzt: tick });
          if (s.wave.phase === "welle") {
            proWelle.set(s.wave.welle, (proWelle.get(s.wave.welle) ?? 0) + 1);
          }
        } else {
          g.tot = g.tot || e.zustand === "tot";
          g.zuletzt = tick;
        }
      }
      // Verschwunden, ohne je tot gewesen zu sein = Watchdog-Despawn.
      for (const [id, g] of gesehen) {
        if (g.zuletzt < tick && !g.tot && !s.enemies.some((e) => e.id === id)) {
          despawns += 1;
          g.tot = true;
        }
      }
      if (s.einsatz.phase === "vorbei") break;
      if (s.einsatz.phase === "finale" && s.einsatz.ergebnis === "gewonnen") {
        sim.tick(command({ interact: true }), DT);
        continue;
      }

      const eye = {
        x: s.player.pos.x,
        y: s.player.pos.y + 1.6,
        z: s.player.pos.z,
      };
      let ziel: (typeof lebend)[number] | undefined;
      let zielD = Infinity;
      for (const e of lebend) {
        const d = Math.hypot(e.pos.x - eye.x, e.pos.z - eye.z);
        if (
          d < zielD &&
          d < 45 &&
          sichtlinie(world, eye, { x: e.pos.x, y: e.pos.y + 1, z: e.pos.z })
        ) {
          ziel = e;
          zielD = d;
        }
      }
      let look = { dx: 0, dy: 0 };
      let fire = false;
      let reload = false;
      const w = s.player.weapon;
      if (!s.player.tot) {
        if (w.imLauf === 0 && !w.reloading) reload = true;
        if (ziel) {
          const dx = ziel.pos.x - eye.x;
          const dy = ziel.pos.y + 1 - eye.y;
          const dz = ziel.pos.z - eye.z;
          const len = Math.hypot(dx, dy, dz);
          look = {
            dx: wrap(Math.atan2(dx, dz) - s.player.yaw) / LOOK_SENSITIVITY,
            dy: -(Math.asin(dy / len) - s.player.pitch) / LOOK_SENSITIVITY,
          };
          if (!w.reloading && w.imLauf > 0 && t - letzterSchuss >= 1.6) {
            fire = true;
            letzterSchuss = t;
          }
        }
      }
      sim.tick(command({ fire, reload }, look), DT);
    }

    const s = sim.getState();
    expect(s.einsatz.phase).toBe("vorbei");
    expect(s.einsatz.ergebnis).toBe("gewonnen");
    expect(t).toBeLessThan(12 * 60); // Einsatzlänge in Sekunden
    const wellen = [...proWelle.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, n]) => n);
    expect(wellen.slice(0, 5)).toEqual([5, 8, 11, 14, 17]);
    expect(wellen.length).toBeGreaterThanOrEqual(5);
    expect(maxLebend).toBeGreaterThanOrEqual(12); // vor AP5-04: 9
    expect(despawns).toBe(0);
  });
});
