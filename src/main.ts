// Einstiegspunkt: verdrahtet Input -> Loop -> Sim -> Renderer + HUD + Debug-Overlay.
// Die Sektor-Daten sind die eine Quelle für Sim-Collider und Render-Meshes.
import { sektorGreybox } from "./data/sektor";
import { createInput } from "./input";
import { createLoop } from "./loop";
import { createRenderer } from "./render";
import { createSim } from "./sim";
import { createDebugOverlay } from "./ui/debug";
import { createHud } from "./ui/hud";

const canvas = document.getElementById("gameCanvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas element not found.");
}

const SEED = 1;

// Der Wave-Director spawnt die Gegner (Spawnpunkte aus dem Sektor).
const sim = createSim(SEED, sektorGreybox, { waves: true });
const renderer = createRenderer(canvas, sektorGreybox, sektorGreybox.meta);
const input = createInput(canvas);
const overlay = createDebugOverlay();
const hud = createHud();

const loop = createLoop({
  sim,
  renderer,
  input,
  onFrame: (frame) => {
    const state = sim.getState();
    overlay.update({
      simTick: frame.simTick,
      fps: frame.fps,
      player: state.player,
      command: frame.command,
    });
    hud.update({
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      tot: state.player.tot,
      respawnRest: state.player.respawnRest,
      weapon: state.player.weapon,
      wave: state.wave,
      nachschub: state.nachschub,
      einsatz: state.einsatz,
      lastShot: state.lastShot,
    });
  },
});

loop.start();

window.addEventListener("beforeunload", () => {
  loop.stop();
  input.dispose();
  renderer.dispose();
  overlay.dispose();
  hud.dispose();
});
