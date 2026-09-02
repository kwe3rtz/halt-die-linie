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
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { SimState } from "../sim";
import type { LevelData } from "../sim/collision";

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
    },
    dispose: () => {
      window.removeEventListener("resize", resize);
      engine.stopRenderLoop();
      for (const mesh of meshes) {
        mesh.material?.dispose();
        mesh.dispose();
      }
      scene.dispose();
      engine.dispose();
    },
  };
}
