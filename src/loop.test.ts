import { describe, expect, it } from 'vitest';
import { FIXED_DT, createLoop } from './loop';

describe('game loop', () => {
  it('exposes a fixed timestep and loop factory', () => {
    const sim = {
      tick: () => undefined,
      getState: () => ({ tick: 0 }),
    };
    const renderer = {
      sync: () => undefined,
    };
    const input = {
      poll: () => ({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 }, buttons: { fire: false, aim: false, sprint: false, interact: false, ability: false, jump: false } }),
    };

    const loop = createLoop({ sim, renderer, input });

    expect(FIXED_DT).toBe(1 / 60);
    expect(loop).toBeDefined();
    expect(typeof loop.start).toBe('function');
    expect(typeof loop.stop).toBe('function');
    expect(typeof loop.pause).toBe('function');
    expect(typeof loop.resume).toBe('function');
  });
});
