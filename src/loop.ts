export const FIXED_DT = 1 / 60;

export interface SimLike {
  tick: (cmd: unknown, dt: number) => void;
  getState: () => unknown;
}

export interface RendererLike {
  sync: (state: unknown, alpha: number) => void;
}

export interface InputLike {
  poll: () => unknown;
}

export interface LoopOptions {
  sim: SimLike;
  renderer: RendererLike;
  input: InputLike;
}

export interface LoopApi {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getSimTickCount: () => number;
}

export function createLoop({ sim, renderer, input }: LoopOptions): LoopApi {
  let rafId: number | null = null;
  let accumulator = 0;
  let lastFrameTime = 0;
  let running = false;
  let paused = false;
  let simTickCount = 0;

  const stepFrame = (now: number) => {
    if (!running || paused) {
      lastFrameTime = now;
      rafId = window.requestAnimationFrame(stepFrame);
      return;
    }

    const frameDeltaMs = Math.min(now - lastFrameTime, 250);
    lastFrameTime = now;
    accumulator += frameDeltaMs;

    while (accumulator >= FIXED_DT * 1000) {
      sim.tick(input.poll(), FIXED_DT);
      simTickCount += 1;
      accumulator -= FIXED_DT * 1000;
    }

    const alpha = accumulator / (FIXED_DT * 1000);
    renderer.sync(sim.getState(), alpha);
    rafId = window.requestAnimationFrame(stepFrame);
  };

  return {
    start: () => {
      if (running) {
        return;
      }
      running = true;
      paused = false;
      lastFrameTime = performance.now();
      rafId = window.requestAnimationFrame(stepFrame);
    },
    stop: () => {
      running = false;
      paused = false;
      accumulator = 0;
      simTickCount = 0;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      if (!running) {
        running = true;
      }
      paused = false;
      lastFrameTime = performance.now();
    },
    getSimTickCount: () => simTickCount,
  };
}
