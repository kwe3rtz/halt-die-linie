import { describe, expect, it, vi } from "vitest";
import { createCollisionWorld, type CollisionWorld } from "./collision";
import {
  damageEnemy,
  FEST_ZEIT,
  NAHKAMPF_REICHWEITE,
  spawnEnemy,
  SPREIZUNG_MAX,
  TEMPO_STREUUNG,
  updateEnemies,
  type EnemyEntity,
} from "./enemies";
import type { NavGraph } from "./sektor";
import { linieninfanterie } from "../data/gegner";

const DT = 1 / 60;

const world: CollisionWorld = createCollisionWorld({
  boxes: [{ center: { x: 0, y: -0.5, z: 0 }, size: { x: 200, y: 1, z: 200 } }],
  spawnPoints: [],
});

function enemyAt(x: number, z: number, id = 1): EnemyEntity {
  return spawnEnemy(linieninfanterie, id, { x, y: 0, z });
}

const player = { x: 0, y: 0, z: 0 };

describe("enemies — helpers", () => {
  it("spawnEnemy setzt Startwerte aus dem Def", () => {
    const e = enemyAt(5, 5);
    expect(e.hp).toBe(linieninfanterie.hp);
    expect(e.maxHp).toBe(linieninfanterie.hp);
    expect(e.zustand).toBe("anmarsch");
    expect(e.def).toBe(linieninfanterie);
  });

  it("damageEnemy reduziert HP, meldet den tödlichen Treffer", () => {
    const e = enemyAt(5, 5);
    expect(damageEnemy(e, 40, 10)).toBe(false);
    expect(e.hp).toBe(60);
    expect(e.letzterTreffer).toBe(10);

    expect(damageEnemy(e, 999, 11)).toBe(true);
    expect(e.zustand).toBe("tot");
    expect(e.totRest).toBeGreaterThan(0);

    // im Tod / bei <= 0 keine Wirkung
    expect(damageEnemy(e, 50, 12)).toBe(false);
    expect(damageEnemy(enemyAt(1, 1), 0, 12)).toBe(false);
  });
});

describe("enemies — updateEnemies", () => {
  it("Anmarsch: läuft auf den Spieler zu", () => {
    const e = enemyAt(0, 20);
    let list = [e];
    for (let i = 0; i < 120; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    expect(list[0]?.pos.z).toBeLessThan(20);
    expect(list[0]?.pos.z).toBeGreaterThan(NAHKAMPF_REICHWEITE - 0.5);
    expect(Math.abs(list[0]?.pos.x ?? 99)).toBeLessThan(0.5);
  });

  it("bleibt nicht in einer Wand stecken (stoppt davor)", () => {
    const wallWorld = createCollisionWorld({
      boxes: [
        { center: { x: 0, y: -0.5, z: 0 }, size: { x: 200, y: 1, z: 200 } },
        { center: { x: 0, y: 1.5, z: 5 }, size: { x: 20, y: 3, z: 1 } },
      ],
      spawnPoints: [],
    });
    let list = [enemyAt(0, 15)];
    for (let i = 0; i < 300; i += 1) {
      list = updateEnemies(list, wallWorld, player, true, () => undefined, DT);
    }
    // Wand-minZ 4.5; Gegner steht davor, nicht drin/dahinter.
    expect(list[0]?.pos.z).toBeGreaterThan(4.5);
  });

  it("Angriff: fügt in Reichweite periodisch Schaden zu", () => {
    const hit = vi.fn();
    let list = [enemyAt(0, 1)]; // schon in Reichweite
    for (let i = 0; i < 300; i += 1) {
      list = updateEnemies(list, world, player, true, hit, DT);
    }
    expect(list[0]?.zustand).toBe("angriff");
    expect(hit).toHaveBeenCalledWith(linieninfanterie.schaden);
    // 300 Ticks = 5 s, Intervall 1.1 s -> mind. 4 Treffer
    expect(hit.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("kein Schaden, wenn der Spieler tot ist", () => {
    const hit = vi.fn();
    let list = [enemyAt(0, 1)];
    for (let i = 0; i < 200; i += 1) {
      list = updateEnemies(list, world, player, false, hit, DT);
    }
    expect(hit).not.toHaveBeenCalled();
  });

  it("Leiche verschwindet nach der Liegezeit", () => {
    const e = enemyAt(0, 3);
    damageEnemy(e, 999, 0);
    let list = [e];
    for (let i = 0; i < 200; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    expect(list.length).toBe(0);
  });

  it("Separation: zwei am selben Punkt gespawnte Gegner driften auseinander", () => {
    let list = [enemyAt(0, 20, 1), enemyAt(0, 20, 2)];
    const abstand0 = Math.hypot(
      (list[0]?.pos.x ?? 0) - (list[1]?.pos.x ?? 0),
      (list[0]?.pos.z ?? 0) - (list[1]?.pos.z ?? 0),
    );
    expect(abstand0).toBe(0);
    for (let i = 0; i < 60; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    const abstand1 = Math.hypot(
      (list[0]?.pos.x ?? 0) - (list[1]?.pos.x ?? 0),
      (list[0]?.pos.z ?? 0) - (list[1]?.pos.z ?? 0),
    );
    // mindestens grob auf Körperbreite auseinander, nicht mehr im selben Punkt
    expect(abstand1).toBeGreaterThan(2 * 0.35 * 0.8);
  });

  it("Separation: ein Gegner im Spieler wird auf Mindestabstand geschoben", () => {
    let list = [enemyAt(0, 0, 1)]; // exakt auf dem Spieler
    for (let i = 0; i < 30; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    const d = Math.hypot(list[0]?.pos.x ?? 0, list[0]?.pos.z ?? 0);
    // ENEMY_RADIUS + PLAYER_RADIUS = 0.7; nicht mehr im Spieler steckend
    expect(d).toBeGreaterThan(0.7 - 0.05);
    // Nahkampf-Reichweite: steht trotzdem noch nah genug zum Zuschlagen
    expect(d).toBeLessThan(NAHKAMPF_REICHWEITE);
    expect(list[0]?.zustand).toBe("angriff");
  });

  it("mehrere Gegner gleichzeitig", () => {
    let list = [enemyAt(-6, 12, 1), enemyAt(6, 12, 2), enemyAt(0, 14, 3)];
    for (let i = 0; i < 120; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    expect(list.length).toBe(3);
    for (const e of list) {
      expect(Math.hypot(e.pos.x, e.pos.z)).toBeLessThan(14);
    }
  });
});

describe("enemies — Nav-Graph folgen (AP4-02)", () => {
  // Kette n1 → n2 → front-A → home-ziel (letzte Kante anfangs zu).
  const graph: NavGraph = {
    knoten: [
      { id: "n1", pos: { x: 0, y: 0, z: 30 }, zone: "labyrinth" },
      { id: "n2", pos: { x: 0, y: 0, z: 18 }, zone: "labyrinth" },
      { id: "front-A", pos: { x: 0, y: 0, z: 5 }, zone: "frontlinie" },
      { id: "home-ziel", pos: { x: 0, y: 0, z: -20 }, zone: "homeline" },
    ],
    kanten: [
      { von: "n1", nach: "n2", offen: true },
      { von: "n2", nach: "front-A", offen: true },
      { von: "front-A", nach: "home-ziel", offen: false },
    ],
  };
  const kopie = (): NavGraph => ({
    knoten: graph.knoten,
    kanten: graph.kanten.map((k) => ({ ...k })),
  });
  const spielerSued = { x: 0, y: 0, z: -10 }; // hinter der Front, außer Sicht

  it("folgt den Wegpunkten Richtung front-<abschnitt> statt schnurstracks", () => {
    let list = [spawnEnemy(linieninfanterie, 1, { x: 0, y: 0, z: 33 }, 1, "A")];
    const verloren = new Set<string>();
    const zVerlauf: number[] = [];
    for (let i = 0; i < 850; i += 1) {
      list = updateEnemies(
        list,
        world,
        spielerSued,
        true,
        () => undefined,
        DT,
        {
          graph,
          verloren,
        },
      );
      if (i % 50 === 0) zVerlauf.push(list[0]?.pos.z ?? 0);
    }
    expect(list[0]?.ziel).toBe("front-A");
    // Monoton nach Süden entlang der Kette (nicht schnurstracks quer).
    for (let i = 1; i < zVerlauf.length; i += 1) {
      expect(zVerlauf[i] ?? 0).toBeLessThanOrEqual(
        (zVerlauf[i - 1] ?? 0) + 0.1,
      );
    }
    expect(list[0]?.pos.z).toBeLessThan(3); // an der Front vorbei
    expect(Math.abs(list[0]?.pos.x ?? 9)).toBeLessThan(2.5);
  });

  it("wechselt bei „Abschnitt verloren“ auf home-ziel und flutet nach hinten", () => {
    const g = kopie();
    const verloren = new Set<string>();
    let list = [spawnEnemy(linieninfanterie, 1, { x: 0, y: 0, z: 22 }, 1, "A")];
    for (let i = 0; i < 150; i += 1) {
      list = updateEnemies(
        list,
        world,
        spielerSued,
        true,
        () => undefined,
        DT,
        {
          graph: g,
          verloren,
        },
      );
    }
    const zVorFall = list[0]?.pos.z ?? 0;
    expect(list[0]?.ziel).toBe("front-A");

    verloren.add("A");
    for (const k of g.kanten) {
      if (k.von === "front-A" && k.nach === "home-ziel") k.offen = true;
    }
    for (let i = 0; i < 700; i += 1) {
      list = updateEnemies(
        list,
        world,
        spielerSued,
        true,
        () => undefined,
        DT,
        {
          graph: g,
          verloren,
        },
      );
    }
    expect(list[0]?.ziel).toBe("home-ziel");
    expect(list[0]?.pos.z).toBeLessThan(zVorFall - 12);
  });

  it("in Nahkampf-Reichweite + Sichtlinie greift wieder das direkte Verhalten", () => {
    const hit = vi.fn();
    let list = [spawnEnemy(linieninfanterie, 1, { x: 0, y: 0, z: 3 }, 1, "A")];
    const verloren = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      list = updateEnemies(list, world, { x: 0, y: 0, z: 1.5 }, true, hit, DT, {
        graph,
        verloren,
      });
    }
    expect(list[0]?.zustand).toBe("angriff");
    expect(hit).toHaveBeenCalledWith(linieninfanterie.schaden);
  });

  it("ohne Nav-Kontext läuft der Gegner unverändert direkt auf den Spieler", () => {
    let list = [spawnEnemy(linieninfanterie, 1, { x: 0, y: 0, z: 20 }, 1, "A")];
    for (let i = 0; i < 520; i += 1) {
      list = updateEnemies(list, world, player, true, () => undefined, DT);
    }
    expect(list[0]?.ziel).toBe(""); // Abschnitt gesetzt, aber ohne Graph ignoriert
    expect(Math.hypot(list[0]?.pos.x ?? 9, list[0]?.pos.z ?? 9)).toBeLessThan(
      2,
    );
  });
});

describe("enemies — Stuck-Watchdog (AP4-06)", () => {
  // Boden + eine Wand bei z 10..11 über x -5..5; rechts davon ist frei.
  const wandWorld = createCollisionWorld({
    boxes: [
      { center: { x: 0, y: -0.5, z: 0 }, size: { x: 200, y: 1, z: 200 } },
      { center: { x: 0, y: 1.5, z: 10.5 }, size: { x: 10, y: 3, z: 1 } },
    ],
    spawnPoints: [],
  });
  // n1 liegt hinter der Wand, front-A davor; der direkte Weg n1 → front-A ist
  // im Graph „offen", geht aber durch die Wand (Datenfehler, wie Audit H1).
  // Über `seite` (rechts an der Wand vorbei, weit genug für den 3-m-Wegpunkt-
  // Radius) kommt man herum.
  const graph: NavGraph = {
    knoten: [
      { id: "n1", pos: { x: 0, y: 0, z: 20 }, zone: "labyrinth" },
      { id: "seite", pos: { x: 14, y: 0, z: 14 }, zone: "labyrinth" },
      { id: "front-A", pos: { x: 0, y: 0, z: 5 }, zone: "frontlinie" },
      { id: "reinforcement-A", pos: { x: 9, y: 0, z: 20 }, zone: "labyrinth" },
    ],
    kanten: [
      { von: "n1", nach: "front-A", offen: true },
      { von: "n1", nach: "seite", offen: true },
      { von: "seite", nach: "front-A", offen: true },
      { von: "reinforcement-A", nach: "seite", offen: true },
    ],
  };
  const spielerWeit = { x: 0, y: 0, z: -30 };

  it("1. Eingriff: nach FEST_ZEIT ohne Fortschritt wird der Pfad von einem erreichbaren Knoten neu geplant — der Gegner kommt herum", () => {
    let list = [spawnEnemy(linieninfanterie, 1, { x: 0, y: 0, z: 19 }, 1, "A")];
    const nav = { graph, verloren: new Set<string>() };
    let festNach = -1;
    for (let i = 0; i < 60 * 20; i += 1) {
      list = updateEnemies(
        list,
        wandWorld,
        spielerWeit,
        true,
        () => undefined,
        DT,
        nav,
      );
      const e = list[0];
      if (!e) break;
      if (festNach < 0 && e.festVersuche === 1) festNach = i;
      if (e.pos.z < 6) break;
    }
    const e = list[0];
    expect(e).toBeDefined();
    expect(festNach).toBeGreaterThan(FEST_ZEIT * 60 - 5);
    expect(e?.festVersuche).toBe(1);
    expect(e?.pos.z ?? 99).toBeLessThan(6); // an front-A angekommen — um die Wand herum
  });

  it("ohne Ausweg: 2. Eingriff relokiert auf reinforcement-<abschnitt>, 3. despawnt mit Callback", () => {
    // Graph ohne Umweg und ohne Reinforcement → Relokation entfällt, Despawn folgt.
    const sackgasse: NavGraph = {
      knoten: graph.knoten.filter((k) => k.id === "n1" || k.id === "front-A"),
      kanten: [{ von: "n1", nach: "front-A", offen: true }],
    };
    const despawned: number[] = [];
    let list = [spawnEnemy(linieninfanterie, 7, { x: 0, y: 0, z: 19 }, 1, "A")];
    const nav = {
      graph: sackgasse,
      verloren: new Set<string>(),
      onDespawn: (e: EnemyEntity) => despawned.push(e.id),
    };
    for (let i = 0; i < 60 * 30 && list.length > 0; i += 1) {
      list = updateEnemies(
        list,
        wandWorld,
        spielerWeit,
        true,
        () => undefined,
        DT,
        nav,
      );
    }
    expect(list.length).toBe(0);
    expect(despawned).toEqual([7]);
  });

  it("Relokation: mit reinforcement-Knoten landet der Gegner dort statt zu despawnen", () => {
    // Umweg-Knoten `seite` ist unsichtbar gemacht: nur n1/front-A/reinforcement.
    const g: NavGraph = {
      knoten: graph.knoten.filter((k) => k.id !== "seite"),
      kanten: [
        { von: "n1", nach: "front-A", offen: true },
        { von: "reinforcement-A", nach: "front-A", offen: true },
      ],
    };
    const despawned: number[] = [];
    let list = [spawnEnemy(linieninfanterie, 3, { x: 0, y: 0, z: 19 }, 1, "A")];
    const nav = {
      graph: g,
      verloren: new Set<string>(),
      onDespawn: (e: EnemyEntity) => despawned.push(e.id),
    };
    let relokiert = false;
    // Nach dem 1. Eingriff läuft der Gegner erst zurück zu n1 und dann wieder
    // in die Wand — der 2. Eingriff kommt daher erst nach ~16 s.
    for (let i = 0; i < 60 * 30; i += 1) {
      list = updateEnemies(
        list,
        wandWorld,
        spielerWeit,
        true,
        () => undefined,
        DT,
        nav,
      );
      const e = list[0];
      if (
        e &&
        e.festVersuche === 2 &&
        Math.hypot(e.pos.x - 9, e.pos.z - 20) < 1
      ) {
        relokiert = true;
        break;
      }
    }
    expect(relokiert).toBe(true);
    expect(despawned).toEqual([]);
  });

  it("ein normal marschierender Gegner löst den Watchdog nie aus", () => {
    let list = [spawnEnemy(linieninfanterie, 1, { x: 8, y: 0, z: 30 }, 1, "A")];
    const nav = { graph, verloren: new Set<string>() };
    for (let i = 0; i < 60 * 15; i += 1) {
      list = updateEnemies(
        list,
        world,
        spielerWeit,
        true,
        () => undefined,
        DT,
        nav,
      );
    }
    expect(list[0]?.festVersuche).toBe(0);
  });
});

// AP5-04: individuelle Tempo-/Spur-Streuung + drei Korrekturen am bestehenden
// Verhalten, die durch die Streuung sichtbar wurden (Engstellen-Ebene,
// Kniehöhen-Sicht, weiter navigieren statt Wandlauf am Zielknoten).
describe("enemies — Streuung & Feinschliff (AP5-04)", () => {
  it("ohne Streuung: Normaltempo und die alte id%7-Spur (Rückwärtskompatibilität)", () => {
    expect(enemyAt(0, 0, 1).tempoFaktor).toBe(1);
    // Alte Bahnen: ((id % 7) − 3) × 0,8 m, als Anteil an SPREIZUNG_MAX.
    expect(enemyAt(0, 0, 3).spur).toBeCloseTo(0, 9);
    expect(enemyAt(0, 0, 1).spur).toBeCloseTo((-2 * 0.8) / SPREIZUNG_MAX, 9);
    expect(enemyAt(0, 0, 6).spur).toBeCloseTo((3 * 0.8) / SPREIZUNG_MAX, 9);
    expect(enemyAt(0, 0, 7).spur).toBeCloseTo((-3 * 0.8) / SPREIZUNG_MAX, 9);
  });

  it("Würfelwerte 0..1 werden auf 1 ± TEMPO_STREUUNG bzw. Spur −1..1 abgebildet", () => {
    const p = { x: 0, y: 0, z: 0 };
    const langsamLinks = spawnEnemy(linieninfanterie, 1, p, 1, "", {
      tempo: 0,
      spur: 0,
    });
    const schnellRechts = spawnEnemy(linieninfanterie, 2, p, 1, "", {
      tempo: 1,
      spur: 1,
    });
    const mitte = spawnEnemy(linieninfanterie, 3, p, 1, "", {
      tempo: 0.5,
      spur: 0.5,
    });
    expect(langsamLinks.tempoFaktor).toBeCloseTo(1 - TEMPO_STREUUNG, 9);
    expect(langsamLinks.spur).toBe(-1);
    expect(schnellRechts.tempoFaktor).toBeCloseTo(1 + TEMPO_STREUUNG, 9);
    expect(schnellRechts.spur).toBe(1);
    expect(mitte.tempoFaktor).toBeCloseTo(1, 9);
    expect(mitte.spur).toBe(0);
  });

  it("das individuelle Tempo wirkt auf die Bewegung (schnell/langsam = 1,15/0,85)", () => {
    const fern = { x: 0, y: 0, z: 200 };
    let list = [
      spawnEnemy(linieninfanterie, 1, { x: -6, y: 0, z: 0 }, 1, "", {
        tempo: 0,
        spur: 0.5,
      }),
      spawnEnemy(linieninfanterie, 2, { x: 6, y: 0, z: 0 }, 1, "", {
        tempo: 1,
        spur: 0.5,
      }),
    ];
    for (let i = 0; i < 120; i += 1) {
      list = updateEnemies(list, world, fern, true, () => undefined, DT);
    }
    const langsam = list.find((e) => e.id === 1)?.pos.z ?? 0;
    const schnell = list.find((e) => e.id === 2)?.pos.z ?? 0;
    expect(langsam).toBeGreaterThan(4);
    expect(schnell / langsam).toBeCloseTo(
      (1 + TEMPO_STREUUNG) / (1 - TEMPO_STREUUNG),
      1,
    );
  });

  it("die Spur fächert den Anmarsch stufenlos auf: zwei Gegner mit Spur −1/+1 laufen auf getrennten Bahnen zum selben Wegpunkt", () => {
    const graph: NavGraph = {
      knoten: [
        { id: "n1", pos: { x: 0, y: 0, z: 30 }, zone: "labyrinth" },
        { id: "front-A", pos: { x: 0, y: 0, z: 0 }, zone: "frontlinie" },
      ],
      kanten: [{ von: "n1", nach: "front-A", offen: true }],
    };
    const spieler = { x: 0, y: 0, z: -40 }; // weit weg, außer Sicht
    const lauf = (spuren: number[]) => {
      let list = spuren.map((spur, i) =>
        spawnEnemy(linieninfanterie, i + 1, { x: 0, y: 0, z: 30 }, 1, "A", {
          tempo: 0.5,
          spur,
        }),
      );
      for (let i = 0; i < 60 * 6; i += 1) {
        list = updateEnemies(list, world, spieler, true, () => undefined, DT, {
          graph,
          verloren: new Set(),
        });
      }
      return list.map((e) => e.pos.x);
    };
    // Die Spur ist ein seitlich versetzter Zielpunkt (±SPREIZUNG_MAX am
    // Wegpunkt): auf halber Strecke liegen Spur −1 und +1 schon klar
    // auseinander, gleiche Spuren bleiben (bis auf die Separation) beisammen.
    const [links, rechts] = lauf([0, 1]);
    expect(Math.abs((rechts ?? 0) - (links ?? 0))).toBeGreaterThan(
      SPREIZUNG_MAX * 0.9,
    );
    expect(links ?? 0).toBeLessThan(-0.8);
    expect(rechts ?? 0).toBeGreaterThan(0.8);
    const [a, b] = lauf([0.5, 0.5]);
    expect(Math.abs((a ?? 0) - (b ?? 0))).toBeLessThan(1.0);
  });

  it("Nahkampf-Sicht auf Kniehöhe: ein Gegner hinter dem Parapet läuft nicht in die Wand, sondern durch die Sap-Lücke in den Graben", () => {
    // Oberfläche (y 0) nördlich, Graben (Sohle −1,8) südlich, dazwischen das
    // Parapet (Oberkante 0,55) mit einer Lücke bei x 8..10.
    const grabenWorld = createCollisionWorld({
      boxes: [
        { center: { x: 0, y: -0.5, z: 12 }, size: { x: 40, y: 1, z: 14 } },
        { center: { x: 0, y: -2.3, z: 0 }, size: { x: 40, y: 1, z: 10 } },
        {
          center: { x: -1, y: -0.625, z: 5 },
          size: { x: 18, y: 2.35, z: 0.5 },
        },
      ],
      spawnPoints: [],
    });
    const graph: NavGraph = {
      knoten: [
        { id: "n1", pos: { x: 0, y: 0, z: 8 }, zone: "labyrinth" },
        {
          id: "sap",
          pos: { x: 9, y: 0, z: 5 },
          zone: "frontlinie",
          engstelle: true,
        },
        { id: "front-A", pos: { x: 0, y: -1.6, z: 2 }, zone: "frontlinie" },
      ],
      kanten: [
        { von: "n1", nach: "sap", offen: true },
        { von: "sap", nach: "front-A", offen: true },
      ],
    };
    // Spieler im Graben, 5,5 m entfernt: auf Augenhöhe sichtbar (über das
    // Parapet hinweg), auf Kniehöhe nicht — der Weg dahin ist eine Wand.
    const spieler = { x: 0, y: -1.8, z: 2 };
    const hit = vi.fn();
    let list = [
      spawnEnemy(linieninfanterie, 3, { x: 0, y: 0, z: 7.5 }, 1, "A", {
        tempo: 0.5,
        spur: 0.5,
      }),
    ];
    let maxFest = 0;
    let angriffNach = -1;
    for (let i = 0; i < 60 * 15; i += 1) {
      list = updateEnemies(list, grabenWorld, spieler, true, hit, DT, {
        graph,
        verloren: new Set(),
      });
      const e = list[0];
      if (!e) break;
      maxFest = Math.max(maxFest, e.festVersuche);
      if (angriffNach < 0 && e.zustand === "angriff") angriffNach = i;
    }
    expect(list.length).toBe(1);
    expect(maxFest).toBe(0); // nie festgelaufen
    expect(angriffNach).toBeGreaterThan(0);
    expect(angriffNach).toBeLessThan(60 * 12);
    expect(hit).toHaveBeenCalled();
    expect(list[0]?.pos.y).toBeLessThan(-1.5); // steht im Graben, nicht davor
  });

  it("Engstelle mit rechtwinklig abknickendem Pfad (bresche-B-Fall): gilt erst als passiert, wenn der Gegner in Anmarschrichtung hindurch ist", () => {
    // Wie im Sektor: lab-vorfront → bresche-B ist ein 45°-Anmarsch (−3, −3),
    // bresche-B → front-B knickt rechtwinklig ab (+3, −3). Wand um z = 5 mit
    // 2,6-m-Lücke bei x = −3.
    const lueckeWorld = createCollisionWorld({
      boxes: [
        { center: { x: 0, y: -0.5, z: 0 }, size: { x: 200, y: 1, z: 200 } },
        { center: { x: -12.15, y: 1, z: 5 }, size: { x: 15.7, y: 2, z: 0.5 } },
        { center: { x: 9.15, y: 1, z: 5 }, size: { x: 21.7, y: 2, z: 0.5 } },
      ],
      spawnPoints: [],
    });
    const graph: NavGraph = {
      knoten: [
        { id: "n1", pos: { x: 0, y: 0, z: 8 }, zone: "labyrinth" },
        {
          id: "bresche-B",
          pos: { x: -3, y: 0, z: 5 },
          zone: "frontlinie",
          engstelle: true,
        },
        { id: "front-B", pos: { x: 0, y: 0, z: 2 }, zone: "frontlinie" },
      ],
      kanten: [
        { von: "n1", nach: "bresche-B", offen: true },
        { von: "bresche-B", nach: "front-B", offen: true },
      ],
    };
    const spieler = { x: 0, y: 0, z: -40 };
    // Alle Spuren von links bis rechts: keine darf hängen bleiben, jede muss
    // durch die Lücke. Mit der alten Ebene (Richtung zum nächsten Wegpunkt,
    // hier parallel zum Anmarsch) galt ein Gegner auf der Ostseite schon
    // schräg vor der Wand als „durch" und lief das Parapet entlang.
    for (const spur of [0, 0.25, 0.5, 0.75, 1]) {
      let list = [
        spawnEnemy(linieninfanterie, 1, { x: 1, y: 0, z: 9 }, 1, "B", {
          tempo: 0.5,
          spur,
        }),
      ];
      let durchDieLuecke = false;
      let maxFest = 0;
      for (let i = 0; i < 60 * 12; i += 1) {
        list = updateEnemies(
          list,
          lueckeWorld,
          spieler,
          true,
          () => undefined,
          DT,
          { graph, verloren: new Set() },
        );
        const e = list[0];
        if (!e) break;
        maxFest = Math.max(maxFest, e.festVersuche);
        if (Math.abs(e.pos.x + 3) < 1.3 && Math.abs(e.pos.z - 5) < 0.6) {
          durchDieLuecke = true;
        }
        if (e.pos.z < 2.5) break;
      }
      expect(durchDieLuecke, `Spur ${spur}: durch die Lücke`).toBe(true);
      expect(maxFest, `Spur ${spur}: Watchdog`).toBe(0);
      expect(list[0]?.pos.z ?? 99, `Spur ${spur}: angekommen`).toBeLessThan(
        2.5,
      );
    }
  });

  it("am Zielknoten angekommen, Spieler außer Reichweite: navigiert über den Graphen weiter statt in die Wand zu laufen", () => {
    // Wand um z = −5 mit Durchgang bei x 6..8; der Spieler steht dahinter.
    const wandWorld = createCollisionWorld({
      boxes: [
        { center: { x: 0, y: -0.5, z: 0 }, size: { x: 200, y: 1, z: 200 } },
        { center: { x: -7, y: 1, z: -5 }, size: { x: 26, y: 2, z: 0.5 } },
        { center: { x: 14, y: 1, z: -5 }, size: { x: 12, y: 2, z: 0.5 } },
      ],
      spawnPoints: [],
    });
    const graph: NavGraph = {
      knoten: [
        { id: "n1", pos: { x: 0, y: 0, z: 10 }, zone: "labyrinth" },
        { id: "front-A", pos: { x: 0, y: 0, z: 0 }, zone: "frontlinie" },
        {
          id: "durchgang",
          pos: { x: 7, y: 0, z: -5 },
          zone: "feld",
          engstelle: true,
        },
        { id: "hinten", pos: { x: 0, y: 0, z: -12 }, zone: "feld" },
      ],
      kanten: [
        { von: "n1", nach: "front-A", offen: true },
        { von: "front-A", nach: "durchgang", offen: true },
        { von: "durchgang", nach: "hinten", offen: true },
      ],
    };
    const spieler = { x: 0, y: 0, z: -12 };
    const hit = vi.fn();
    let list = [
      spawnEnemy(linieninfanterie, 1, { x: 0, y: 0, z: 9 }, 1, "A", {
        tempo: 0.5,
        spur: 0.5,
      }),
    ];
    let maxFest = 0;
    let angriffNach = -1;
    for (let i = 0; i < 60 * 20; i += 1) {
      list = updateEnemies(list, wandWorld, spieler, true, hit, DT, {
        graph,
        verloren: new Set(),
      });
      const e = list[0];
      if (!e) break;
      maxFest = Math.max(maxFest, e.festVersuche);
      if (angriffNach < 0 && e.zustand === "angriff") angriffNach = i;
    }
    expect(list.length).toBe(1);
    expect(maxFest).toBe(0); // kein Watchdog nötig — vorher: 4 s Wandkontakt
    expect(angriffNach).toBeGreaterThan(0);
    expect(hit).toHaveBeenCalled();
  });

  it("ohne Graph-Weg zum Spieler bleibt es beim bisherigen Verhalten (Luftlinie)", () => {
    // Zielknoten erreicht, Spieler hinter einer Wand ohne Durchgang im Graph.
    const wandWorld = createCollisionWorld({
      boxes: [
        { center: { x: 0, y: -0.5, z: 0 }, size: { x: 200, y: 1, z: 200 } },
        { center: { x: 0, y: 1, z: -5 }, size: { x: 40, y: 2, z: 0.5 } },
      ],
      spawnPoints: [],
    });
    const graph: NavGraph = {
      knoten: [
        { id: "n1", pos: { x: 0, y: 0, z: 10 }, zone: "labyrinth" },
        { id: "front-A", pos: { x: 0, y: 0, z: 0 }, zone: "frontlinie" },
        { id: "hinten", pos: { x: 0, y: 0, z: -12 }, zone: "feld" },
      ],
      kanten: [
        { von: "n1", nach: "front-A", offen: true },
        { von: "front-A", nach: "hinten", offen: false }, // Front steht
      ],
    };
    const spieler = { x: 0, y: 0, z: -12 };
    let list = [spawnEnemy(linieninfanterie, 1, { x: 0, y: 0, z: 9 }, 1, "A")];
    for (let i = 0; i < 60 * 7; i += 1) {
      list = updateEnemies(
        list,
        wandWorld,
        spieler,
        true,
        () => undefined,
        DT,
        {
          graph,
          verloren: new Set(),
        },
      );
    }
    // Steht vor der Wand (Luftlinie zum Spieler; 13,4 m in ~5,2 s), der
    // Watchdog greift erst nach weiteren 4 s Stillstand.
    expect(list[0]?.pos.z ?? 99).toBeLessThan(-4);
    expect(list[0]?.pos.z ?? -99).toBeGreaterThan(-4.8);
    expect(list[0]?.festVersuche).toBe(0);
  });
});
