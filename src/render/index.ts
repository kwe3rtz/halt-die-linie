// Babylon-Renderer: liest den Sim-State und zeichnet. Keine Spiellogik.
// Die Kamera folgt strikt der (interpolierten) Spielerposition aus der Sim —
// kein `attachControl`, keine Babylon-eigene Steuerung.
import {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  FreeCamera,
  HemisphericLight,
  type LinesMesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { SimState } from "../sim";
import type { LevelData } from "../sim/collision";

const SHOT_EFFECT_MS = 50;

const EYE_HEIGHT = 1.6;

export interface Renderer {
  sync(state: Readonly<SimState>, alpha: number): void;
  dispose(): void;
}

interface PlayerSnapshot {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

function toSnapshot(state: Readonly<SimState>): PlayerSnapshot {
  const p = state.player;
  return { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, pitch: p.pitch };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  level: LevelData,
): Renderer {
  const engine = new Engine(canvas, true, { stencil: true });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.63, 0.66, 0.69, 1); // diesiger Himmel

  const sky = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.75;
  const sun = new DirectionalLight("sun", new Vector3(-0.4, -1, 0.6), scene);
  sun.intensity = 0.7;

  const camera = new FreeCamera("player", new Vector3(0, EYE_HEIGHT, 0), scene);
  camera.minZ = 0.1;
  camera.fov = 1.15;

  // Grobes Viewmodel + Mündungsblitz, als Kamera-Kinder positioniert.
  const viewmodelMat = new StandardMaterial("viewmodel", scene);
  viewmodelMat.diffuseColor = new Color3(0.14, 0.14, 0.16);
  viewmodelMat.specularColor = new Color3(0, 0, 0);
  const viewmodel = MeshBuilder.CreateBox(
    "viewmodel",
    { width: 0.035, height: 0.045, depth: 0.34 },
    scene,
  );
  viewmodel.material = viewmodelMat;
  viewmodel.parent = camera;
  viewmodel.position.set(0.17, -0.15, 0.95);
  viewmodel.isPickable = false;

  const muzzleMat = new StandardMaterial("muzzle", scene);
  muzzleMat.emissiveColor = new Color3(1, 0.86, 0.5);
  muzzleMat.disableLighting = true;
  const muzzle = MeshBuilder.CreateBox("muzzleFlash", { size: 0.06 }, scene);
  muzzle.material = muzzleMat;
  muzzle.parent = camera;
  muzzle.position.set(0.17, -0.15, 1.15);
  muzzle.isPickable = false;
  muzzle.isVisible = false;

  let lastShotTick = -1;
  let effectUntil = 0;
  let tracer: LinesMesh | null = null;

  const clearShotEffect = () => {
    muzzle.isVisible = false;
    tracer?.dispose();
    tracer = null;
  };

  const groundMat = new StandardMaterial("ground", scene);
  groundMat.diffuseColor = new Color3(0.46, 0.43, 0.37);
  groundMat.specularColor = new Color3(0, 0, 0);

  const parapetMat = new StandardMaterial("parapet", scene);
  parapetMat.diffuseColor = new Color3(0.52, 0.49, 0.34);
  parapetMat.specularColor = new Color3(0, 0, 0);

  const meshes = level.boxes.map((box, i) => {
    const mesh = MeshBuilder.CreateBox(
      `level_${i}`,
      { width: box.size.x, height: box.size.y, depth: box.size.z },
      scene,
    );
    mesh.position.set(box.center.x, box.center.y, box.center.z);
    mesh.material = box.center.y > 0.25 ? parapetMat : groundMat;
    return mesh;
  });

  const resize = () => engine.resize();
  window.addEventListener("resize", resize);
  engine.runRenderLoop(() => scene.render());

  let prev: PlayerSnapshot | null = null;
  let curr: PlayerSnapshot | null = null;
  let lastTick = -1;

  return {
    sync: (state, alpha) => {
      const incoming = toSnapshot(state);
      if (curr === null || state.tick !== lastTick) {
        prev = curr ?? incoming;
        curr = incoming;
        lastTick = state.tick;
      }
      if (prev === null || curr === null) {
        return;
      }

      const t = Math.max(0, Math.min(1, alpha));
      camera.position.set(
        lerp(prev.x, curr.x, t),
        lerp(prev.y, curr.y, t) + EYE_HEIGHT,
        lerp(prev.z, curr.z, t),
      );
      // Babylon: rotation.x positiv blickt nach unten -> pitch invertieren.
      camera.rotation.set(
        -lerp(prev.pitch, curr.pitch, t),
        lerpAngle(prev.yaw, curr.yaw, t),
        0,
      );

      // „Letzter Schuss"-Signal: Mündungsblitz + kurzlebige Tracer-Linie.
      const shot = state.lastShot;
      const now = performance.now();
      if (shot && shot.tick !== lastShotTick) {
        lastShotTick = shot.tick;
        effectUntil = now + SHOT_EFFECT_MS;
        muzzle.isVisible = true;
        tracer?.dispose();
        tracer = MeshBuilder.CreateLines(
          "tracer",
          {
            points: [
              new Vector3(shot.von.x, shot.von.y, shot.von.z),
              new Vector3(shot.nach.x, shot.nach.y, shot.nach.z),
            ],
          },
          scene,
        );
        tracer.color = new Color3(1, 0.9, 0.65);
        tracer.isPickable = false;
      } else if (now > effectUntil) {
        clearShotEffect();
      }
    },
    dispose: () => {
      window.removeEventListener("resize", resize);
      engine.stopRenderLoop();
      clearShotEffect();
      viewmodel.material?.dispose();
      viewmodel.dispose();
      muzzle.material?.dispose();
      muzzle.dispose();
      for (const mesh of meshes) {
        mesh.material?.dispose();
        mesh.dispose();
      }
      scene.dispose();
      engine.dispose();
    },
  };
}
