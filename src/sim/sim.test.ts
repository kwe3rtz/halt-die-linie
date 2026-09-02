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
}

function command(parts: CommandParts = {}): InputCommand {
  return {
    move: parts.move ?? { x: 0, y: 0 },
    look: parts.look ?? { dx: 0, dy: 0 },
    buttons: {
      fire: false,
      aim: false,
      sprint: parts.sprint ?? false,
      interact: false,
      ability: false,
      jump: parts.jump ?? false,
    },
  };
}

// Kleiner Testgraben: Boden (Oberkante y = 0), eine Wand bei z = 4.5..5.5.
const testWorld: LevelData = {
  boxes: [
    { center: { x: 0, y: -0.5, z: 0 }, size: { x: 40, y: 1, z: 40 } },
    { center: { x: 0, y: 1, z: 5 }, size: { x: 40, y: 2, z: 1 } },
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
