// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLoop, FIXED_DT, type LoopApi } from "./loop";
import { createSim, type InputCommand } from "./sim";

const NEUTRAL: InputCommand = {
  move: { x: 0, y: 0 },
  look: { dx: 0, dy: 0 },
  buttons: {
    fire: false,
    aim: false,
    sprint: false,
    interact: false,
    ability: false,
    jump: false,
  },
};

describe("game loop", () => {
  let clock: number;
  let rafCb: FrameRequestCallback | null;

  beforeEach(() => {
    clock = 0;
    rafCb = null;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback) => {
        rafCb = cb;
        return 1;
      },
    );
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
      rafCb = null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function frame(advanceMs: number): void {
    clock += advanceMs;
    const cb = rafCb;
    rafCb = null;
    cb?.(clock);
  }

  function runFor(loop: LoopApi, totalMs: number, frames: number): void {
    loop.start();
    const perFrame = totalMs / frames;
    for (let i = 0; i < frames; i += 1) {
      frame(perFrame);
    }
  }

  it("exposes the fixed timestep", () => {
    expect(FIXED_DT).toBe(1 / 60);
  });

  it("holds ~60 ticks/s at both 144 and 30 fps", () => {
    const fast = createSim(1);
    const fastLoop = createLoop({
      sim: fast,
      renderer: { sync: () => undefined },
      input: { poll: () => NEUTRAL },
    });
    runFor(fastLoop, 1000, 144);
    expect(fast.getState().tick).toBeGreaterThanOrEqual(59);
    expect(fast.getState().tick).toBeLessThanOrEqual(61);
    fastLoop.stop();

    clock = 0;
    const slow = createSim(1);
    const slowLoop = createLoop({
      sim: slow,
      renderer: { sync: () => undefined },
      input: { poll: () => NEUTRAL },
    });
    runFor(slowLoop, 1000, 30);
    expect(slow.getState().tick).toBeGreaterThanOrEqual(59);
    expect(slow.getState().tick).toBeLessThanOrEqual(61);
    slowLoop.stop();
  });

  it("stops sim ticks while paused", () => {
    const sim = createSim(1);
    const loop = createLoop({
      sim,
      renderer: { sync: () => undefined },
      input: { poll: () => NEUTRAL },
    });
    loop.start();
    frame(100);
    const ticksBefore = sim.getState().tick;
    expect(ticksBefore).toBeGreaterThan(0);

    loop.pause();
    frame(500);
    frame(500);
    expect(sim.getState().tick).toBe(ticksBefore);

    loop.resume();
    frame(100);
    expect(sim.getState().tick).toBeGreaterThan(ticksBefore);
    loop.stop();
  });

  it("clamps a huge frame gap (no tick spiral after a tab switch)", () => {
    const sim = createSim(1);
    const loop = createLoop({
      sim,
      renderer: { sync: () => undefined },
      input: { poll: () => NEUTRAL },
    });
    loop.start();
    frame(5000);
    // 250 ms Clamp / 16.67 ms => höchstens 15 Ticks statt ~300.
    expect(sim.getState().tick).toBeLessThanOrEqual(15);
    loop.stop();
  });

  it("passes an interpolation alpha in [0,1) to the renderer", () => {
    const sync = vi.fn();
    const loop = createLoop({
      sim: createSim(1),
      renderer: { sync },
      input: { poll: () => NEUTRAL },
    });
    loop.start();
    frame(25);
    expect(sync).toHaveBeenCalled();
    for (const call of sync.mock.calls) {
      const alpha = call[1] as number;
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThan(1);
    }
    loop.stop();
  });

  it("reports per-frame info to onFrame (for the debug overlay)", () => {
    const frames: Array<{ simTick: number; fps: number; alpha: number }> = [];
    const loop = createLoop({
      sim: createSim(1),
      renderer: { sync: () => undefined },
      input: { poll: () => NEUTRAL },
      onFrame: (info) => {
        frames.push({
          simTick: info.simTick,
          fps: info.fps,
          alpha: info.alpha,
        });
        expect(info.command).toEqual(NEUTRAL);
      },
    });
    loop.start();
    for (let i = 0; i < 20; i += 1) {
      frame(1000 / 60);
    }
    expect(frames.length).toBe(20);
    const last = frames.at(-1);
    expect(last?.simTick).toBeGreaterThan(0);
    expect(last?.fps).toBeGreaterThan(30);
    expect(last?.fps).toBeLessThan(90);
    expect(last?.alpha).toBeGreaterThanOrEqual(0);
    expect(last?.alpha).toBeLessThan(1);
    loop.stop();
  });
});
