import { describe, expect, it } from "vitest";
import { createSim, type InputCommand, type LevelData } from "./index";
import { add, scale, vec3 } from "./math";
import { createRng } from "./rng";

const DT = 1 / 60;

interface CommandParts {
  move?: { x: number; y: number };
  look?: { dx: number; dy: number };
  sprint?: boolean;
  jump?: boolean;
  fire?: boolean;
  reload?: boolean;
}

function command(parts: CommandParts = {}): InputCommand {
  return {
    move: parts.move ?? { x: 0, y: 0 },
    look: parts.look ?? { dx: 0, dy: 0 },
    buttons: {
      fire: parts.fire ?? false,
      aim: false,
      sprint: parts.sprint ?? false,
      interact: false,
      ability: false,
      jump: parts.jump ?? false,
      reload: parts.reload ?? false,
    },
  };
}

// Kleiner Testgraben: Boden (Oberkante y = 0), eine hohe Wand bei z = 4.5..5.5.
const testWorld: LevelData = {
  boxes: [
    { center: { x: 0, y: -0.5, z: 0 }, size: { x: 40, y: 1, z: 40 } },
    { center: { x: 0, y: 2, z: 5 }, size: { x: 40, y: 4, z: 1 } },
  ],
  spawnPoints: [{ x: 0, y: 1, z: 0 }],
};

function run(script: InputCommand[], seed = 1) {
  const sim = createSim(seed, testWorld);
  for (const cmd of script) {
    sim.tick(cmd, DT);
  }
  return sim;
}

function repeat(n: number, cmd: InputCommand): InputCommand[] {
  return Array.from({ length: n }, () => cmd);
}

describe("sim state and utilities", () => {
  it("creates a deterministic PRNG from a seed", () => {
    const a = createRng(1234);
    const b = createRng(1234);
    expect([a.next(), a.range(0, 10), a.int(0, 5)]).toEqual([
      b.next(),
      b.range(0, 10),
      b.int(0, 5),
    ]);
  });

  it("provides pure math helpers for vector work", () => {
    expect(add(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual({ x: 5, y: 7, z: 9 });
    expect(scale(vec3(1, 2, 3), 2)).toEqual({ x: 2, y: 4, z: 6 });
  });

  it("hands out a frozen, copy-safe state", () => {
    const sim = createSim(42, testWorld);
    const first = sim.getState();
    const second = sim.getState();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(() => {
      (first.player.pos as { x: number }).x = 999;
    }).toThrow();
    expect(sim.getState().player.pos.x).toBe(0);
  });

  it("uses the seed to pick a spawn point deterministically", () => {
    const level: LevelData = {
      boxes: testWorld.boxes,
      spawnPoints: [
        { x: -3, y: 1, z: 0 },
        { x: 7, y: 1, z: 0 },
      ],
    };
    const xs = [11, 11, 12, 13, 14].map(
      (seed) => createSim(seed, level).getState().player.pos.x,
    );
    expect(xs[0]).toBe(xs[1]); // gleicher Seed -> gleicher Spawn
    for (const x of xs) {
      expect([-3, 7]).toContain(x);
    }
  });
});

describe("first-person controller", () => {
  it("settles on the ground under gravity", () => {
    const p = run(repeat(60, command())).getState().player;
    expect(p.pos.y).toBeCloseTo(0, 4);
    expect(p.onGround).toBe(true);
  });

  it("walks forward and is stopped by the wall, never through it", () => {
    const p = run(repeat(240, command({ move: { x: 0, y: 1 } }))).getState()
      .player;
    expect(p.pos.z).toBeGreaterThan(3.8);
    expect(p.pos.z).toBeLessThan(4.2); // Wand-minZ 4.5 minus Radius 0.35
    expect(p.onGround).toBe(true);
  });

  it("sprint covers more ground than walking in the same time", () => {
    const walk = run(repeat(30, command({ move: { x: 0, y: -1 } }))).getState()
      .player.pos.z;
    const sprint = run(
      repeat(30, command({ move: { x: 0, y: -1 }, sprint: true })),
    ).getState().player.pos.z;
    expect(Math.abs(sprint)).toBeGreaterThan(Math.abs(walk) + 0.5);
  });

  it("turns with look.dx and then moves relative to the new yaw", () => {
    const turn = command({ look: { dx: Math.PI / 2 / 0.0022, dy: 0 } });
    const sim = run([turn, ...repeat(120, command({ move: { x: 0, y: 1 } }))]);
    const p = sim.getState().player;
    expect(p.yaw).toBeCloseTo(Math.PI / 2, 1);
    expect(p.pos.x).toBeGreaterThan(3); // yaw +90° => vorwärts zeigt nach +x
    expect(Math.abs(p.pos.z)).toBeLessThan(1);
  });

  it("clamps pitch to just under 90 degrees", () => {
    const up = run([command({ look: { dx: 0, dy: -100000 } })]).getState()
      .player;
    const down = run([command({ look: { dx: 0, dy: 100000 } })]).getState()
      .player;
    expect(up.pitch).toBeLessThan(Math.PI / 2);
    expect(up.pitch).toBeGreaterThan(1.5);
    expect(down.pitch).toBeGreaterThan(-Math.PI / 2);
    expect(down.pitch).toBeLessThan(-1.5);
  });

  it("is deterministic for a fixed seed and command sequence (golden replay)", () => {
    const script: InputCommand[] = [];
    for (let i = 0; i < 300; i += 1) {
      script.push(
        command({
          move: { x: i % 3 === 0 ? 1 : 0, y: 1 },
          look: { dx: i % 20 === 0 ? 40 : 0, dy: 0 },
          jump: i % 50 === 0,
        }),
      );
    }
    expect(run(script).getState()).toEqual(run(script).getState());
  });

  it("respawns after falling out of the world", () => {
    const sim = createSim(1, {
      boxes: [],
      spawnPoints: [{ x: 2, y: 3, z: 2 }],
    });
    for (let i = 0; i < 600; i += 1) {
      sim.tick(command(), DT);
    }
    expect(sim.getState().player.pos.y).toBeGreaterThan(-40);
  });
});

describe("first-person controller — weapon", () => {
  it("linksklick feuert einen Schuss (Repetierer: nur Flanke) und meldet lastShot", () => {
    const sim = createSim(1, testWorld);
    const startAmmo = sim.getState().player.weapon.imLauf;

    // Taste halten: erster Tick = Flanke -> ein Schuss, danach kein weiterer.
    for (let i = 0; i < 40; i += 1) {
      sim.tick(command({ fire: true }), DT);
    }
    const s = sim.getState();
    expect(s.player.weapon.imLauf).toBe(startAmmo - 1);
    expect(s.lastShot).not.toBeNull();
    expect(s.lastShot?.tick).toBe(1);
    // die Wand bei z ~ 4.5 wird getroffen
    expect(s.lastShot?.treffer).toBe(true);
  });

  it("leert das Magazin über einzelne Klicks und lädt mit R nach", () => {
    const sim = createSim(1, testWorld);
    const def = sim.getState().player.weapon;
    // 5 Klicks (Loslassen dazwischen für die Flanke), Cooldown auslaufen lassen.
    for (let k = 0; k < def.imLauf + 2; k += 1) {
      sim.tick(command({ fire: true }), DT);
      for (let i = 0; i < 100; i += 1) {
        sim.tick(command(), DT);
      }
    }
    expect(sim.getState().player.weapon.imLauf).toBe(0);

    const reserveVor = sim.getState().player.weapon.reserve;
    for (let i = 0; i < 200; i += 1) {
      sim.tick(command({ reload: true }), DT);
    }
    const w = sim.getState().player.weapon;
    expect(w.imLauf).toBeGreaterThan(0);
    expect(w.reserve).toBeLessThan(reserveVor);
    expect(w.reloading).toBe(false);
  });

  it("kein Feuern während eines nicht abgeschlossenen Nachladens", () => {
    const sim = createSim(1, testWorld);
    for (let i = 0; i < 5; i += 1) {
      sim.tick(command({ fire: true }), DT);
      for (let j = 0; j < 100; j += 1) sim.tick(command(), DT);
    }
    expect(sim.getState().player.weapon.imLauf).toBe(0);

    sim.tick(command({ reload: true }), DT); // Nachladen startet
    const shotBefore = sim.getState().lastShot?.tick ?? 0;
    sim.tick(command({ fire: true }), DT); // bricht Ladestreifen ab, kein Schuss
    expect(sim.getState().lastShot?.tick ?? 0).toBe(shotBefore);
    expect(sim.getState().player.weapon.reloading).toBe(false);
  });
});

describe("first-person controller — enemies", () => {
  const clickAndWait = (sim: ReturnType<typeof createSim>) => {
    sim.tick(command({ fire: true }), DT);
    for (let i = 0; i < 90; i += 1) sim.tick(command(), DT);
  };

  it("Gegner marschiert an und fügt in Reichweite Schaden zu", () => {
    const sim = createSim(1, testWorld, {
      enemies: [{ defId: "linieninfanterie", pos: { x: 0, y: 0, z: 3 } }],
    });
    expect(sim.getState().enemies.length).toBe(1);

    for (let i = 0; i < 400; i += 1) sim.tick(command(), DT);
    const s = sim.getState();
    expect(s.player.hp).toBeLessThan(s.player.maxHp);
    expect(s.enemies[0]?.zustand).toBe("angriff");
  });

  it("Raycast-Feuer tötet den Gegner, er verschwindet, Nachschub steigt", () => {
    const sim = createSim(1, testWorld, {
      enemies: [{ defId: "linieninfanterie", pos: { x: 0, y: 0, z: 4 } }],
    });
    expect(sim.getState().nachschub).toBe(0);

    // langgewehr basisSchaden 85 -> 2 Treffer töten (hp 100)
    for (let k = 0; k < 4; k += 1) {
      clickAndWait(sim);
      if (sim.getState().enemies.length === 0) break;
    }

    // Leiche kurz liegen lassen
    for (let i = 0; i < 200; i += 1) sim.tick(command(), DT);
    const s = sim.getState();
    expect(s.enemies.length).toBe(0);
    expect(s.nachschub).toBeGreaterThan(0);
  });

  it("mehrere Gegner werden verwaltet (kein Hardcode auf 1)", () => {
    const sim = createSim(1, testWorld, {
      enemies: [
        { defId: "linieninfanterie", pos: { x: -3, y: 0, z: 8 } },
        { defId: "linieninfanterie", pos: { x: 3, y: 0, z: 8 } },
      ],
    });
    expect(sim.getState().enemies.length).toBe(2);
    sim.spawnEnemy("linieninfanterie", { x: 0, y: 0, z: 10 });
    expect(sim.getState().enemies.length).toBe(3);
    sim.spawnEnemy("gibtsnicht", { x: 0, y: 0, z: 1 });
    expect(sim.getState().enemies.length).toBe(3); // unbekannt -> No-op
  });

  it("Gegner-State ist eingefroren", () => {
    const sim = createSim(1, testWorld, {
      enemies: [{ defId: "linieninfanterie", pos: { x: 0, y: 0, z: 6 } }],
    });
    sim.tick(command(), DT);
    const e = sim.getState().enemies[0];
    expect(() => {
      (e as { hp: number }).hp = 1;
    }).toThrow();
  });
});
