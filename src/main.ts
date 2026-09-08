// Einstiegspunkt: verdrahtet Input -> Loop -> Sim -> Renderer + HUD + Debug-Overlay
// + Kompass / Lagekarte / Audio (AP4-05).
// Die Sektor-Daten sind die eine Quelle für Sim-Collider und Render-Meshes.
import { sektorGreybox } from "./data/sektor";
import { probeGraben, probeGrabenLichter } from "./data/probe-graben";
import { sturmMp18 } from "./data/waffen";
import { createInput } from "./input";
import { createLoop } from "./loop";
import { createRenderer } from "./render";
import { createSim, type SimState } from "./sim";
import { createDebugOverlay } from "./ui/debug";
import { createHud } from "./ui/hud";
import { createKompass } from "./ui/kompass";
import { createLagekarte } from "./ui/lagekarte";
import { createAudio } from "./audio";

const SEED = 1;

function starteProbe(el: HTMLCanvasElement): void {
  // `?probe` (nur Dev, AP6-01c): die isolierte Graben-Look-Probe-Szene statt
  // des Sektors — kein SektorMeta, keine Wellen, kein HUD/Kompass. Der echte
  // Sektor bleibt unberührt.
  const sim = createSim(SEED, probeGraben);
  const renderer = createRenderer(el, probeGraben, undefined, {
    lichter: probeGrabenLichter,
  });
  const input = createInput(el);
  const overlay = createDebugOverlay();

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
        lebendeGegner: 0,
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
}

function starteSektor(el: HTMLCanvasElement): void {
  // Der Wave-Director spawnt die Gegner (Spawnpunkte aus dem Sektor).
  // AP6-06: nur der Spielpfad startet mit der automatischen Sturm-MP 18 (damit
  // sich der Nacht-Sektor flüssig anspielen lässt). `standardWaffe` (Langgewehr)
  // bleibt Sim-Default → Tests und Golden-Anker unberührt.
  const sim = createSim(SEED, sektorGreybox, {
    waves: true,
    weapon: sturmMp18,
  });
  const renderer = createRenderer(el, sektorGreybox, sektorGreybox.meta);
  const input = createInput(el);
  const overlay = createDebugOverlay();
  const hud = createHud();
  const kompass = createKompass();
  const lagekarte = createLagekarte();
  const audio = createAudio();

  const meta = sektorGreybox.meta;
  const homePos = (
    meta.homeZugaenge.find((z) => z.id === "mitte") ?? meta.homeZugaenge[0]
  )?.pos ?? { x: 0, y: 0, z: -35 };
  // Kompass-Marker für die eine Frontlinie — Mittelpunkt ihrer Bounds.
  const frontLinieMitte = {
    id: meta.frontLinie.id,
    pos: {
      x: (meta.frontLinie.bounds.minX + meta.frontLinie.bounds.maxX) / 2,
      z: (meta.frontLinie.bounds.minZ + meta.frontLinie.bounds.maxZ) / 2,
    },
  };

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
        lebendeGegner: state.enemies.filter((e) => e.zustand !== "tot").length,
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
        depotInReichweite: state.player.depotInReichweite,
      });
      kompass.update({
        playerPos: { x: state.player.pos.x, z: state.player.pos.z },
        yaw: state.player.yaw,
        homePos: { x: homePos.x, z: homePos.z },
        abschnitte: [
          {
            ...frontLinieMitte,
            zustand:
              state.front.find((f) => f.id === frontLinieMitte.id)?.zustand ??
              "stabil",
          },
        ],
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
}

const canvas = document.getElementById("gameCanvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas element not found.");
}

if (new URLSearchParams(window.location.search).has("probe")) {
  starteProbe(canvas);
} else {
  starteSektor(canvas);
}
