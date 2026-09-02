import { describe, expect, it } from 'vitest';
import { createSim, type SimState } from './index';
import { add, scale, vec3 } from './math';
import { createRng } from './rng';

describe('sim state and utilities', () => {
  it('creates a deterministic PRNG from a seed', () => {
    const a = createRng(1234);
    const b = createRng(1234);

    expect([a.next(), a.range(0, 10), a.int(0, 5)]).toEqual([b.next(), b.range(0, 10), b.int(0, 5)]);
  });

  it('keeps the public sim state stable and copy-safe', () => {
    const sim = createSim(42);
    const first = sim.getState();
    const second = sim.getState();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);

    const candidate = first.player.pos;
    (candidate as { x: number }).x = 999;

    expect(sim.getState().player.pos.x).not.toBe(999);
  });

  it('provides pure math helpers for vector work', () => {
    const v1 = vec3(1, 2, 3);
    const v2 = vec3(4, 5, 6);

    expect(add(v1, v2)).toEqual({ x: 5, y: 7, z: 9 });
    expect(scale(v1, 2)).toEqual({ x: 2, y: 4, z: 6 });
  });

  it('tick advances the sim state deterministically', () => {
    const tickOne = createSim(7);
    const tickTwo = createSim(7);

    tickOne.tick({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 }, buttons: { fire: false, aim: false, sprint: false, interact: false, ability: false, jump: false } }, 1 / 60);
    tickTwo.tick({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 }, buttons: { fire: false, aim: false, sprint: false, interact: false, ability: false, jump: false } }, 1 / 60);

    const s1 = tickOne.getState() as SimState;
    const s2 = tickTwo.getState() as SimState;
    expect(s1).toEqual(s2);
  });
});
