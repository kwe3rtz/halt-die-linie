// Einstiegspunkt: verdrahtet Input -> Loop -> Sim -> Renderer + HUD + Debug-Overlay
// + Kompass / Lagekarte / Audio (AP4-05).
// Die Sektor-Daten sind die eine Quelle für Sim-Collider und Render-Meshes.
import { sektorGreybox } from "./data/sektor";
import { createInput } from "./input";
import { createLoop } from "./loop";
import { createRenderer } from "./render";
import { createSim, type SimState } from "./sim";
import { createDebugOverlay } from "./ui/debug";
import { createHud } from "./ui/hud";
import { createKompass } from "./ui/kompass";
import { createLagekarte } from "./ui/lagekarte";
import { createAudio } from "./audio";

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
const kompass = createKompass();
const lagekarte = createLagekarte();
const audio = createAudio();

const meta = sektorGreybox.meta;
const homePos = meta.homeZugaenge.find((z) => z.id === "verbindungsgraben")
  ?.pos ?? { x: 0, y: 0, z: -20 };
const abschnittMitte = meta.frontAbschnitte.map((a) => ({
  id: a.id,
  pos: {
    x: (a.bounds.minX + a.bounds.maxX) / 2,
    z: (a.bounds.minZ + a.bounds.maxZ) / 2,
  },
}));

let prevState: SimState | undefined;

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
    kompass.update({
      playerPos: { x: state.player.pos.x, z: state.player.pos.z },
      yaw: state.player.yaw,
      homePos: { x: homePos.x, z: homePos.z },
      abschnitte: abschnittMitte.map((a, i) => ({
        ...a,
        zustand: state.front[i]?.zustand ?? "stabil",
      })),
    });
    lagekarte.update({
      front: state.front,
      home: state.home,
      einsatz: state.einsatz,
    });
    audio.beobachte(
      prevState,
      state,
      { x: state.player.pos.x, z: state.player.pos.z },
      state.player.yaw,
      { x: homePos.x, z: homePos.z },
    );
    prevState = state;
  },
});

loop.start();

window.addEventListener("beforeunload", () => {
  loop.stop();
  input.dispose();
  renderer.dispose();
  overlay.dispose();
  hud.dispose();
  kompass.dispose();
  lagekarte.dispose();
  audio.dispose();
});
