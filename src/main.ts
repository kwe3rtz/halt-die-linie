// Einstiegspunkt: verdrahtet Input -> Loop -> Sim -> Renderer + Debug-Overlay.
// Die Level-Daten sind die eine Quelle für Sim-Collider und Render-Meshes.
import { testLevel } from "./data/testlevel";
import { createInput } from "./input";
import { createLoop } from "./loop";
import { createRenderer } from "./render";
import { createSim } from "./sim";
import { createDebugOverlay } from "./ui/debug";

const canvas = document.getElementById("gameCanvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas element not found.");
}

const SEED = 1;

// AP2-04 ersetzt die festen Start-Gegner durch den Wave-Director. Hier stehen
// sie bewusst in der Feuerbucht (freier gerader Weg — es gibt noch kein Pathing).
const sim = createSim(SEED, testLevel, {
  enemies: [
    { defId: "linieninfanterie", pos: { x: 3, y: 0, z: 14 } },
    { defId: "linieninfanterie", pos: { x: 0, y: 0, z: 14 } },
    { defId: "linieninfanterie", pos: { x: 6, y: 0, z: 13 } },
  ],
});
const renderer = createRenderer(canvas, testLevel);
const input = createInput(canvas);
const overlay = createDebugOverlay();

const loop = createLoop({
  sim,
  renderer,
  input,
  onFrame: (frame) => {
    overlay.update({
      simTick: frame.simTick,
      fps: frame.fps,
      player: sim.getState().player,
      command: frame.command,
    });
  },
});

loop.start();

window.addEventListener("beforeunload", () => {
  loop.stop();
  input.dispose();
  renderer.dispose();
  overlay.dispose();
});
