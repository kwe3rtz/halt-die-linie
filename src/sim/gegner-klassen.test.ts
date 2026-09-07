// Gegner-Klassen (AP5-06): drei Statistik-Varianten der Linieninfanterie im
// Zusammenspiel mit Waffe, Marsch-Streuung und dem echten Labyrinth. Prüft,
// dass die Klassen spürbar sind (Treffer bis zum Tod, Tempo-Bänder ohne
// Überlappung), fair bleiben (kein Einholen eines gehenden Spielers) und die
// unveränderte Nav-Logik sie trägt (alle kommen an, kein Watchdog-Eingriff).
import { describe, expect, it } from "vitest";
import { createCollisionWorld } from "./collision";
import {
  BASIS_TEMPO,
  damageEnemy,
  spawnEnemy,
  TEMPO_STREUUNG,
  updateEnemies,
  type EnemyEntity,
} from "./enemies";
import { WALK_SPEED } from "./index";
import type { NavGraph } from "./sektor";
import { spawnIntervall, wellenHpFaktor } from "./wave";
import type { EnemyDef } from "../data/schema";
import {
  linieninfanterie,
  linieninfanterieSchnell,
  linieninfanterieSchwer,
} from "../data/gegner";
import { sektorGreybox } from "../data/sektor";
import { standardWaffe } from "../data/waffen";

const DT = 1 / 60;

describe("Gegner-Klassen — Werte im Zusammenspiel (AP5-06)", () => {
  it("Treffer bis zum Tod mit dem Langgewehr M98: normal 2 · schnell 1 · schwer 3 — in den Wellen 1 bis 4", () => {
    const treffer = (def: EnemyDef, welle: number): number => {
      const e = spawnEnemy(def, 1, { x: 0, y: 0, z: 0 }, wellenHpFaktor(welle));
      let n = 0;
      let tot = false;
      while (!tot) {
        n += 1;
        tot = damageEnemy(e, standardWaffe.basisSchaden, n);
      }
      return n;
    };
    for (const welle of [1, 2, 3, 4]) {
      expect(
        [linieninfanterie, linieninfanterieSchnell, linieninfanterieSchwer].map(
          (k) => treffer(k, welle),
        ),
      ).toEqual([2, 1, 3]);
    }
  });

  it("Tempo-Bänder überlappen nicht — auch mit ±15 % Marsch-Streuung ist jede schwere langsamer als jede normale, jede normale langsamer als jede schnelle", () => {
    const band = (def: EnemyDef) => ({
      min: BASIS_TEMPO * def.tempo * (1 - TEMPO_STREUUNG),
      max: BASIS_TEMPO * def.tempo * (1 + TEMPO_STREUUNG),
    });
    const schwer = band(linieninfanterieSchwer);
    const normal = band(linieninfanterie);
    const schnell = band(linieninfanterieSchnell);
    expect(schwer.max).toBeLessThan(normal.min);
    expect(normal.max).toBeLessThan(schnell.min);
  });

  it("fair: auch die schnellste schnelle Linieninfanterie holt einen gehenden Spieler nicht ein", () => {
    expect(
      BASIS_TEMPO * linieninfanterieSchnell.tempo * (1 + TEMPO_STREUUNG),
    ).toBeLessThan(WALK_SPEED);
  });
});

describe("Gegner-Klassen — gemischte Welle auf dem echten Sektor (AP5-06)", () => {
  const world = createCollisionWorld(sektorGreybox);
  const graph: NavGraph = {
    knoten: sektorGreybox.meta.navGraph.knoten,
    kanten: sektorGreybox.meta.navGraph.kanten.map((k) => ({ ...k })),
  };
  const spieler = { x: 0, y: -1.6, z: -20 }; // tief im Hinterland, außer Sicht der Anmarschroute

  it("17 Gegner (7 normal, 5 schnell, 5 schwer) kommen alle ohne Watchdog-Eingriff an — Marschzeit klar nach Klasse gestaffelt", () => {
    // Zusammensetzung fest statt gewürfelt und Streuung neutral (0,5/0,5):
    // der einzige Unterschied zwischen den Gegnern ist die Klasse.
    const reihe: EnemyDef[] = [];
    const muster = [
      linieninfanterie,
      linieninfanterieSchnell,
      linieninfanterieSchwer,
      linieninfanterie,
      linieninfanterieSchnell,
      linieninfanterieSchwer,
      linieninfanterie,
    ];
    for (let i = 0; i < 17; i += 1) {
      reihe.push(muster[i % muster.length] ?? linieninfanterie);
    }
    const punkte = sektorGreybox.meta.feindAnmarsch;
    const abschnitte = ["front"];
    const despawned: number[] = [];
    const nav = {
      graph,
      verloren: new Set<string>(),
      frontZiel: sektorGreybox.meta.frontLinie.zielKnoten,
      homeZiel: sektorGreybox.meta.homeLinie.zielKnoten,
      reinfKnoten: sektorGreybox.meta.frontLinie.reinfKnoten,
      onDespawn: (e: EnemyEntity) => despawned.push(e.id),
    };
    const spawnZeit = new Map<number, number>();
    const ankunft = new Map<number, number>();
    let list: EnemyEntity[] = [];
    let naechsterSpawn = 0;
    let id = 1;
    let maxFest = 0;
    for (let tick = 0; tick < 60 * 120; tick += 1) {
      const t = tick * DT;
      if (id <= reihe.length && t >= naechsterSpawn) {
        const p = punkte[(id - 1) % punkte.length] ?? punkte[0];
        const def = reihe[id - 1] ?? linieninfanterie;
        if (p) {
          list.push(
            spawnEnemy(def, id, p, 1, abschnitte[0] ?? "front", {
              tempo: 0.5,
              spur: 0.5,
            }),
          );
          spawnZeit.set(id, t);
        }
        id += 1;
        naechsterSpawn = t + spawnIntervall(5);
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
      if (id > reihe.length && ankunft.size + despawned.length >= reihe.length)
        break;
    }
    expect(ankunft.size).toBe(17);
    expect(despawned).toEqual([]);
    // AP6-01: alle 17 zielen auf `front-front` und stauen sich an den Sap-
    // Lücken — der Watchdog repathed ein paarmal (Stufe 1), aber kein Gegner
    // geht verloren.
    expect(maxFest).toBeLessThanOrEqual(2);

    const marsch = (def: EnemyDef) =>
      [...ankunft.entries()]
        .filter(([k]) => reihe[k - 1] === def)
        .map(([k, a]) => a - (spawnZeit.get(k) ?? a))
        .sort((a, b) => a - b);
    const median = (xs: number[]) => xs[Math.floor(xs.length / 2)] ?? NaN;
    const schnell = marsch(linieninfanterieSchnell);
    const normal = marsch(linieninfanterie);
    const schwer = marsch(linieninfanterieSchwer);
    expect(schnell).toHaveLength(5);
    expect(normal).toHaveLength(7);
    expect(schwer).toHaveLength(5);
    // Gemessen (Median): schnell ≈ 10–11 s · normal ≈ 15–17 s · schwer ≈ 22–25 s.
    expect(median(schnell)).toBeLessThan(median(normal) - 3);
    expect(median(schwer)).toBeGreaterThan(median(normal) + 4);
    // Keine Überschneidung: die langsamste schnelle ist vor der schnellsten
    // schweren da — die Klasse ist am Gang ablesbar.
    expect(schnell.at(-1) ?? Infinity).toBeLessThan(schwer[0] ?? -Infinity);
  });
});
