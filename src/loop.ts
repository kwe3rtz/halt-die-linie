import type { InputCommand, SimState } from "./sim";

export const FIXED_DT = 1 / 60;

// Der Loop hängt nur an den Sim-Typen — nicht an den render/input-Modulen.
export interface SimLike {
  tick: (cmd: InputCommand, dt: number) => void;
  getState: () => Readonly<SimState>;
}

export interface RendererLike {
  sync: (state: Readonly<SimState>, alpha: number) => void;
}

export interface InputLike {
  poll: () => InputCommand;
}

/** Pro gerendertem Frame — u. a. für das Debug-Overlay (Ticket 1.8). */
export interface FrameInfo {
  simTick: number;
  /** Geglättete Render-Bilder pro Sekunde. */
  fps: number;
  /** Interpolations-Anteil im Akkumulator, [0,1). */
  alpha: number;
  /** Zuletzt an die Sim übergebenes Kommando. */
  command: InputCommand;
}

export interface LoopOptions {
  sim: SimLike;
  renderer: RendererLike;
  input: InputLike;
  /** Optionaler Haken, nach `renderer.sync` je aktivem Frame aufgerufen. */
  onFrame?: (info: FrameInfo) => void;
}

export interface LoopApi {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getSimTickCount: () => number;
}

const NEUTRAL_COMMAND: InputCommand = {
  move: { x: 0, y: 0 },
  look: { dx: 0, dy: 0 },
  buttons: {
    fire: false,
    aim: false,
    sprint: false,
    interact: false,
    ability: false,
    jump: false,
    reload: false,
  },
};

export function createLoop({
  sim,
  renderer,
  input,
  onFrame,
}: LoopOptions): LoopApi {
  let rafId: number | null = null;
  let accumulator = 0;
  let lastFrameTime = 0;
  let running = false;
  let paused = false;
  let simTickCount = 0;
  let fps = 0;
  let lastCommand: InputCommand = NEUTRAL_COMMAND;

  const stepFrame = (now: number) => {
    if (!running || paused) {
      lastFrameTime = now;
      rafId = window.requestAnimationFrame(stepFrame);
      return;
    }

    const frameDeltaMs = Math.min(now - lastFrameTime, 250);
    lastFrameTime = now;
    accumulator += frameDeltaMs;

    if (frameDeltaMs > 0) {
      const instantFps = 1000 / frameDeltaMs;
      fps = fps === 0 ? instantFps : fps * 0.9 + instantFps * 0.1;
    }

    while (accumulator >= FIXED_DT * 1000) {
      lastCommand = input.poll();
      sim.tick(lastCommand, FIXED_DT);
      simTickCount += 1;
      accumulator -= FIXED_DT * 1000;
    }

    const alpha = accumulator / (FIXED_DT * 1000);
    renderer.sync(sim.getState(), alpha);
    onFrame?.({ simTick: simTickCount, fps, alpha, command: lastCommand });
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
      fps = 0;
      lastCommand = NEUTRAL_COMMAND;
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
