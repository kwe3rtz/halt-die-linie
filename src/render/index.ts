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
  type Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { EnemyView, SimState } from "../sim";
import type { LevelData } from "../sim/collision";

const SHOT_EFFECT_MS = 50;
const ENEMY_HIT_FLASH_MS = 90;
const BILLBOARD_ALL = 7;

const EYE_HEIGHT = 1.6;
const ENEMY_RADIUS = 0.35;
const ENEMY_HEIGHT = 1.8;

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

  // Bildschirm-Effekt: roter Flash bei Schaden, Abdunkeln im Tod.
  const screenFxMat = new StandardMaterial("screenFx", scene);
  screenFxMat.disableLighting = true;
  screenFxMat.emissiveColor = new Color3(0.7, 0, 0);
  screenFxMat.alpha = 0;
  const screenFx = MeshBuilder.CreatePlane(
    "screenFx",
    { size: 4, sideOrientation: 2 /* DOUBLESIDE */ },
    scene,
  );
  screenFx.material = screenFxMat;
  screenFx.parent = camera;
  screenFx.position.set(0, 0, 0.25);
  screenFx.isPickable = false;
  screenFx.renderingGroupId = 1;

  const DAMAGE_FLASH_MS = 320;
  let prevHp = -1;
  let damageFlashUntil = 0;

  // Gegner-Visuals: pro Id einmal gebaut, wiederverwendet, beim Verschwinden
  // weggeräumt (nicht pro Frame neu gebaut).
  interface EnemyVisual {
    body: Mesh;
    bodyMat: StandardMaterial;
    barBg: Mesh;
    barFill: Mesh;
    barFillMat: StandardMaterial;
    lastHitTick: number;
    flashUntil: number;
  }
  const enemyVisuals = new Map<number, EnemyVisual>();

  const enemyBarBgMat = new StandardMaterial("enemyBarBg", scene);
  enemyBarBgMat.disableLighting = true;
  enemyBarBgMat.emissiveColor = new Color3(0.05, 0.05, 0.05);

  const makeEnemyVisual = (): EnemyVisual => {
    const bodyMat = new StandardMaterial("enemy", scene);
    bodyMat.specularColor = new Color3(0, 0, 0);
    const body = MeshBuilder.CreateCapsule(
      "enemy",
      { radius: ENEMY_RADIUS, height: ENEMY_HEIGHT },
      scene,
    );
    body.material = bodyMat;
    body.isPickable = false;

    const barBg = MeshBuilder.CreatePlane("enemyBarBg", { size: 1 }, scene);
    barBg.scaling.set(0.9, 0.12, 1);
    barBg.material = enemyBarBgMat;
    barBg.billboardMode = BILLBOARD_ALL;
    barBg.isPickable = false;

    const barFillMat = new StandardMaterial("enemyBarFill", scene);
    barFillMat.disableLighting = true;
    const barFill = MeshBuilder.CreatePlane("enemyBarFill", { size: 1 }, scene);
    barFill.material = barFillMat;
    barFill.billboardMode = BILLBOARD_ALL;
    barFill.isPickable = false;

    return {
      body,
      bodyMat,
      barBg,
      barFill,
      barFillMat,
      lastHitTick: -1,
      flashUntil: 0,
    };
  };

  const disposeEnemyVisual = (v: EnemyVisual): void => {
    v.body.dispose();
    v.bodyMat.dispose();
    v.barBg.dispose();
    v.barFill.dispose();
    v.barFillMat.dispose();
  };

  const syncEnemies = (list: readonly EnemyView[], now: number): void => {
    const alive = new Set<number>();
    for (const e of list) {
      alive.add(e.id);
      let v = enemyVisuals.get(e.id);
      if (!v) {
        v = makeEnemyVisual();
        enemyVisuals.set(e.id, v);
      }

      const hidden = e.zustand === "tot";
      v.body.setEnabled(!hidden);
      v.barBg.setEnabled(!hidden);
      v.barFill.setEnabled(!hidden);
      if (hidden) {
        continue;
      }

      v.body.position.set(e.pos.x, e.pos.y + ENEMY_HEIGHT / 2, e.pos.z);
      v.barBg.position.set(e.pos.x, e.pos.y + ENEMY_HEIGHT + 0.28, e.pos.z);
      v.barFill.position.copyFrom(v.barBg.position);

      const ratio = e.maxHp > 0 ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 0;
      v.barFill.scaling.set(0.9 * ratio, 0.12, 1);
      // von der Mitte aus links ausrichten
      v.barFill.position.x -= (0.9 * (1 - ratio)) / 2;
      v.barFillMat.emissiveColor.set(1 - ratio, ratio, 0.15);

      if (e.letzterTreffer !== v.lastHitTick) {
        v.lastHitTick = e.letzterTreffer;
        if (e.letzterTreffer >= 0) {
          v.flashUntil = now + ENEMY_HIT_FLASH_MS;
        }
      }
      if (now < v.flashUntil) {
        v.bodyMat.emissiveColor.set(0.9, 0.9, 0.9);
      } else if (e.zustand === "angriff") {
        v.bodyMat.emissiveColor.set(0.35, 0.12, 0.1);
        v.bodyMat.diffuseColor.set(0.5, 0.32, 0.28);
      } else {
        v.bodyMat.emissiveColor.set(0, 0, 0);
        v.bodyMat.diffuseColor.set(0.34, 0.36, 0.31); // gesichtsloses Feldgrau
      }
    }

    for (const [id, v] of enemyVisuals) {
      if (!alive.has(id)) {
        disposeEnemyVisual(v);
        enemyVisuals.delete(id);
      }
    }
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

      syncEnemies(state.enemies, now);

      // Schadens-Flash / Tod-Abdunkeln.
      const hp = state.player.hp;
      if (prevHp >= 0 && hp < prevHp) {
        damageFlashUntil = now + DAMAGE_FLASH_MS;
      }
      prevHp = hp;
      if (state.player.tot) {
        screenFxMat.emissiveColor.set(0.02, 0.02, 0.03);
        screenFxMat.alpha = 0.62;
      } else {
        screenFxMat.emissiveColor.set(0.7, 0, 0);
        screenFxMat.alpha =
          Math.max(0, (damageFlashUntil - now) / DAMAGE_FLASH_MS) * 0.4;
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
      screenFx.material?.dispose();
      screenFx.dispose();
      for (const v of enemyVisuals.values()) {
        disposeEnemyVisual(v);
      }
      enemyVisuals.clear();
      enemyBarBgMat.dispose();
      for (const mesh of meshes) {
        mesh.material?.dispose();
        mesh.dispose();
      }
      scene.dispose();
      engine.dispose();
    },
  };
}
