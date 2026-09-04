// Babylon-Renderer: liest den Sim-State und zeichnet. Keine Spiellogik.
// Die Kamera folgt strikt der (interpolierten) Spielerposition aus der Sim —
// kein `attachControl`, keine Babylon-eigene Steuerung.
import {
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
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
import type { EnemyView, SimState, SektorMeta, ZonenId } from "../sim";
import { brescheTag, zoneAt } from "../sim";
import type { LevelBox, LevelData } from "../sim/collision";

const SHOT_EFFECT_MS = 50;
const ENEMY_HIT_FLASH_MS = 90;
const BILLBOARD_ALL = 7;

const EYE_HEIGHT = 1.6;
const ENEMY_RADIUS = 0.35;
const ENEMY_HEIGHT = 1.8;

// Gegner-HP-Balken: Maße in Weltmetern, Höhe über dem Kopf.
const BAR_W = 0.9;
const BAR_H = 0.12;
const BAR_HOEHE = ENEMY_HEIGHT + 0.28;

// Render-Reihenfolge (Babylon leert den Tiefenpuffer vor jeder Gruppe > 0):
//  0 = Welt, Gegner, Tracer     — normale Tiefenprüfung
//  1 = Viewmodel + Mündungsblitz — eigener Tiefenraum, liegt immer über der Welt
//  2 = Bildschirm-Effekt (Schaden/Tod) — ganz oben, dimmt auch die Waffe
const GROUP_WORLD = 0;
const GROUP_VIEWMODEL = 1;
const GROUP_SCREENFX = 2;

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

// Zonen-Farbtöne — auf Wiedererkennung getrimmt (AP4-05): Labyrinth erdig-dunkel,
// Front sandhell, Feld oliv, Verbindungsgraben & Home kühl (Beton/Blau).
const ZONEN_TON: Record<ZonenId, [number, number, number]> = {
  feindzone: [0.24, 0.17, 0.17],
  labyrinth: [0.29, 0.23, 0.15],
  frontlinie: [0.54, 0.49, 0.37],
  feld: [0.35, 0.42, 0.27],
  verbindungsgraben: [0.22, 0.27, 0.36],
  homeline: [0.29, 0.31, 0.42],
};

export function createRenderer(
  canvas: HTMLCanvasElement,
  level: LevelData,
  meta?: SektorMeta,
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

  // Tiefenpuffer vor Gruppe 1 (Viewmodel) und 2 (Screen-FX) leeren, damit das
  // Viewmodel nie in Wänden steckt und der Screen-FX zuverlässig obenauf liegt.
  scene.setRenderingAutoClearDepthStencil(GROUP_VIEWMODEL, true, true, true);
  scene.setRenderingAutoClearDepthStencil(GROUP_SCREENFX, true, true, true);

  // Grobes Viewmodel, als Kamera-Kind positioniert.
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
  viewmodel.renderingGroupId = GROUP_VIEWMODEL;

  // Mündungsblitz: kurzlebiger Welt-Quader auf dem Schuss-Strahl, vor der Kamera
  // platziert (keine Viewmodel-/Kamera-Kind-Geometrie — die war die Fehlerquelle).
  const muzzleMat = new StandardMaterial("muzzle", scene);
  muzzleMat.emissiveColor = new Color3(1, 0.86, 0.5);
  muzzleMat.disableLighting = true;
  const muzzle = MeshBuilder.CreateBox("muzzleFlash", { size: 0.09 }, scene);
  muzzle.material = muzzleMat;
  muzzle.isPickable = false;
  muzzle.isVisible = false;
  // Wie das Viewmodel über der Welt — sonst steckt der Blitz beim Schuss aus
  // nächster Nähe in der Wand, in die man feuert.
  muzzle.renderingGroupId = GROUP_VIEWMODEL;

  // Abstand des Tracer-Starts / Mündungsblitzes vom Augpunkt entlang des Strahls.
  // Groß genug, dass die Linie nie an der Near-Plane (minZ 0.1) beschnitten wird —
  // genau der Bug „heller Strich quer über den Bildschirm".
  const MUZZLE_ABSTAND = 0.6;

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
  screenFx.renderingGroupId = GROUP_SCREENFX;

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

    // Nur der Hintergrund ist ein Billboard. Die Füllung hängt als Kind daran
    // und erbt dessen Ausrichtung — so laufen sie aus keinem Winkel auseinander.
    const barBg = MeshBuilder.CreatePlane(
      "enemyBarBg",
      { width: BAR_W, height: BAR_H },
      scene,
    );
    barBg.material = enemyBarBgMat;
    barBg.billboardMode = BILLBOARD_ALL;
    barBg.isPickable = false;

    const barFillMat = new StandardMaterial("enemyBarFill", scene);
    barFillMat.disableLighting = true;
    // Polygon-Offset: die Füllung gewinnt die Tiefenprüfung gegen den
    // Hintergrund unabhängig vom Blickwinkel (kein Z-Fighting).
    barFillMat.zOffset = -4;
    const barFill = MeshBuilder.CreatePlane(
      "enemyBarFill",
      { width: BAR_W, height: BAR_H },
      scene,
    );
    barFill.material = barFillMat;
    barFill.parent = barBg;
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
    v.barFill.dispose();
    v.barFillMat.dispose();
    v.barBg.dispose(true); // Kind (barFill) ist schon weg -> nicht rekursiv
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
      v.barBg.position.set(e.pos.x, e.pos.y + BAR_HOEHE, e.pos.z);

      const ratio = e.maxHp > 0 ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 0;
      // Füllung im lokalen Raum des (billboardenden) Hintergrunds: um `ratio`
      // schmaler, linke Kante bleibt bündig -> aus jedem Winkel „von links".
      v.barFill.scaling.set(ratio, 1, 1);
      v.barFill.position.set(-(BAR_W * (1 - ratio)) / 2, 0, 0);
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

  const flachMat = (name: string, r: number, g: number, b: number) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = new Color3(r, g, b);
    m.specularColor = new Color3(0, 0, 0);
    return m;
  };

  const groundMat = flachMat("ground", 0.46, 0.43, 0.37);
  const parapetMat = flachMat("parapet", 0.52, 0.49, 0.34);
  const grenzeMat = flachMat("grenze", 0.22, 0.22, 0.24); // hohe Sperrwände

  const zonenMat = new Map<ZonenId, StandardMaterial>();
  for (const id of Object.keys(ZONEN_TON) as ZonenId[]) {
    const [r, g, b] = ZONEN_TON[id];
    zonenMat.set(id, flachMat(`zone_${id}`, r, g, b));
  }

  const boxMaterial = (box: LevelBox): StandardMaterial => {
    if (box.center.y + box.size.y / 2 > 2) {
      return grenzeMat; // Kartengrenze / hohe Betonsilhouette
    }
    const zone = meta ? zoneAt(meta, box.center) : null;
    if (zone) {
      return zonenMat.get(zone) ?? groundMat;
    }
    return box.center.y > 0.25 ? parapetMat : groundMat;
  };

  // Getaggte Boxen (Bresche-Segmente, AP4-06) werden ausgeblendet, sobald die
  // Sim den Kollider abschaltet — dieselbe Konvention `brescheTag`.
  const tagMeshes = new Map<string, Mesh>();
  const meshes = level.boxes.map((box, i) => {
    const mesh = MeshBuilder.CreateBox(
      `level_${i}`,
      { width: box.size.x, height: box.size.y, depth: box.size.z },
      scene,
    );
    mesh.position.set(box.center.x, box.center.y, box.center.z);
    mesh.material = boxMaterial(box);
    mesh.renderingGroupId = GROUP_WORLD;
    if (box.tag !== undefined) {
      tagMeshes.set(box.tag, mesh);
    }
    return mesh;
  });

  // Landmark-Akzent: leuchtender Pfosten über dem Panzerwrack-Hulk, damit der
  // Fixpunkt fürs Auge aus jeder Zone lesbar bleibt (KONZEPT.md §3).
  let landmarkMesh: Mesh | null = null;
  let landmarkMat: StandardMaterial | null = null;
  if (meta) {
    landmarkMat = new StandardMaterial("landmark", scene);
    landmarkMat.emissiveColor = new Color3(0.9, 0.55, 0.2);
    landmarkMat.disableLighting = true;
    landmarkMesh = MeshBuilder.CreateBox(
      "landmark",
      { width: 1.2, height: 3, depth: 1.2 },
      scene,
    );
    landmarkMesh.position.set(
      meta.landmark.x,
      meta.landmark.y + 5.5,
      meta.landmark.z,
    );
    landmarkMesh.material = landmarkMat;
    landmarkMesh.isPickable = false;
    landmarkMesh.renderingGroupId = GROUP_WORLD;
  }

  // Munitionsdepots (AP5-02): eine Kiste je Abschnitts-Depot — Front an der
  // Parados, Home im Unterstand. Reine Markierung ohne Kollision; ob der
  // Spieler nah genug steht, entscheidet die Sim (`DEPOT_REICHWEITE`).
  const depotMeshes: Mesh[] = [];
  let depotMat: StandardMaterial | null = null;
  let depotDeckelMat: StandardMaterial | null = null;
  if (meta) {
    depotMat = new StandardMaterial("depot", scene);
    depotMat.diffuseColor = new Color3(0.42, 0.34, 0.18);
    depotMat.emissiveColor = new Color3(0.12, 0.09, 0.03);
    depotMat.specularColor = new Color3(0, 0, 0);
    // Deckelstreifen emissiv, damit die Kiste im Grabenschatten lesbar bleibt.
    depotDeckelMat = new StandardMaterial("depotDeckel", scene);
    depotDeckelMat.disableLighting = true;
    depotDeckelMat.emissiveColor = new Color3(0.9, 0.72, 0.25);
    for (const ab of [...meta.frontAbschnitte, ...meta.homeAbschnitte]) {
      // Depot-Marker liegt 0,2 m über der Sohle — Kiste (0,5 hoch) steht auf.
      const kiste = MeshBuilder.CreateBox(
        `depot_${ab.id}`,
        { width: 0.7, height: 0.5, depth: 0.5 },
        scene,
      );
      kiste.position.set(ab.depot.x, ab.depot.y + 0.05, ab.depot.z);
      kiste.material = depotMat;
      kiste.isPickable = false;
      kiste.renderingGroupId = GROUP_WORLD;
      const streifen = MeshBuilder.CreateBox(
        `depotS_${ab.id}`,
        { width: 0.72, height: 0.06, depth: 0.14 },
        scene,
      );
      streifen.position.set(ab.depot.x, ab.depot.y + 0.33, ab.depot.z);
      streifen.material = depotDeckelMat;
      streifen.isPickable = false;
      streifen.renderingGroupId = GROUP_WORLD;
      depotMeshes.push(kiste, streifen);
    }
  }

  // Front- und Home-Abschnitte (AP4-03/06): Trümmer je aufgerissener Bresche,
  // Rauch über gebrochenen/verlorenen Abschnitten. Grob — Feinschliff in AP4-05.
  interface FrontVisual {
    truemmer: Mesh[];
    rauch: Mesh;
    rauchMat: StandardMaterial;
  }
  const frontVisuals = new Map<string, FrontVisual>();
  let truemmerMat: StandardMaterial | null = null;
  if (meta) {
    truemmerMat = flachMat("truemmer", 0.2, 0.18, 0.16);
    for (const ab of [...meta.frontAbschnitte, ...meta.homeAbschnitte]) {
      const truemmer = ab.parapetBreschen.map((pos, i) => {
        const m = MeshBuilder.CreateBox(
          `bresche_${ab.id}_${i}`,
          { width: 2.6, height: 1.3, depth: 1.7 },
          scene,
        );
        m.position.set(pos.x, pos.y - 0.2, pos.z);
        m.material = truemmerMat;
        m.isPickable = false;
        m.renderingGroupId = GROUP_WORLD;
        m.setEnabled(false);
        return m;
      });
      const mx = (ab.bounds.minX + ab.bounds.maxX) / 2;
      const mz = (ab.bounds.minZ + ab.bounds.maxZ) / 2;
      const abRauchMat = new StandardMaterial(`rauch_${ab.id}`, scene);
      abRauchMat.disableLighting = true;
      abRauchMat.emissiveColor = new Color3(0.12, 0.12, 0.13);
      abRauchMat.alpha = 0.3;
      const rauch = MeshBuilder.CreatePlane(
        `rauch_${ab.id}`,
        { width: 11, height: 7 },
        scene,
      );
      rauch.position.set(mx, 4.5, mz);
      rauch.billboardMode = BILLBOARD_ALL;
      rauch.material = abRauchMat;
      rauch.isPickable = false;
      rauch.renderingGroupId = GROUP_WORLD;
      rauch.setEnabled(false);
      frontVisuals.set(ab.id, { truemmer, rauch, rauchMat: abRauchMat });
    }
  }

  const syncFront = (front: Readonly<SimState>["front"]): void => {
    for (const f of front) {
      // Offene Bresche: Parapet-Segment weg (die Sim hat den Kollider
      // abgeschaltet), Trümmer an.
      f.breschen.forEach((offen, i) => {
        tagMeshes.get(brescheTag(f.id, i))?.setEnabled(!offen);
      });
      const v = frontVisuals.get(f.id);
      if (!v) {
        continue;
      }
      v.truemmer.forEach((m, i) => m.setEnabled(f.breschen[i] === true));
      const rauchAn = f.zustand === "gebrochen" || f.zustand === "verloren";
      v.rauch.setEnabled(rauchAn);
      if (rauchAn) {
        v.rauchMat.alpha = f.zustand === "verloren" ? 0.44 : 0.26;
      }
    }
  };

  // --- Lesbarkeit (AP4-05): Spine-Routen, Abschnittsschilder, Zonen-Tore ------
  const leitMeshes: Mesh[] = [];
  const leitMats: StandardMaterial[] = [];
  const leitTexturen: DynamicTexture[] = [];
  const leitLinien: LinesMesh[] = [];

  const emissivMat = (
    name: string,
    farbe: readonly [number, number, number],
  ): StandardMaterial => {
    const m = new StandardMaterial(name, scene);
    m.disableLighting = true;
    m.emissiveColor = new Color3(farbe[0], farbe[1], farbe[2]);
    leitMats.push(m);
    return m;
  };

  const spineSymbol = (
    typ: "dreieck" | "doppelstrich" | "kreis",
    name: string,
    mat: StandardMaterial,
  ): Mesh => {
    let m: Mesh;
    if (typ === "dreieck") {
      m = MeshBuilder.CreateDisc(
        name,
        { radius: 0.26, tessellation: 3 },
        scene,
      );
    } else if (typ === "kreis") {
      m = MeshBuilder.CreateTorus(
        name,
        { diameter: 0.5, thickness: 0.12, tessellation: 18 },
        scene,
      );
    } else {
      // Doppelstrich: zwei kurze Balken.
      const a = MeshBuilder.CreateBox(
        `${name}_a`,
        { width: 0.5, height: 0.09, depth: 0.04 },
        scene,
      );
      const b = MeshBuilder.CreateBox(
        `${name}_b`,
        { width: 0.5, height: 0.09, depth: 0.04 },
        scene,
      );
      a.position.y = 0.09;
      b.position.y = -0.09;
      b.parent = a;
      m = a;
    }
    m.material = mat;
    m.isPickable = false;
    m.renderingGroupId = GROUP_WORLD;
    return m;
  };

  if (meta) {
    // Spine je Route: Polylinie (Farbe) + Pfosten + Leitsymbole an jedem Punkt.
    for (const route of meta.spineRouten) {
      const farbe = new Color3(route.farbe[0], route.farbe[1], route.farbe[2]);
      const pts = route.punkte.map((p) => new Vector3(p.x, p.y, p.z));
      const linie = MeshBuilder.CreateLines(
        `spine_${route.id}`,
        { points: pts },
        scene,
      );
      linie.color = farbe;
      linie.isPickable = false;
      linie.renderingGroupId = GROUP_WORLD;
      leitLinien.push(linie);

      const symMat = emissivMat(`spineMat_${route.id}`, route.farbe);
      const pfostenMat = emissivMat(`spinePfosten_${route.id}`, [
        route.farbe[0] * 0.4,
        route.farbe[1] * 0.4,
        route.farbe[2] * 0.4,
      ]);
      route.punkte.forEach((p, i) => {
        const pfosten = MeshBuilder.CreateBox(
          `spineP_${route.id}_${i}`,
          { width: 0.09, height: 1.0, depth: 0.09 },
          scene,
        );
        pfosten.position.set(p.x, p.y - 0.5, p.z);
        pfosten.material = pfostenMat;
        pfosten.isPickable = false;
        pfosten.renderingGroupId = GROUP_WORLD;
        leitMeshes.push(pfosten);

        const sym = spineSymbol(
          route.symbol,
          `spineS_${route.id}_${i}`,
          symMat,
        );
        sym.position.set(p.x, p.y + 0.3, p.z);
        sym.billboardMode = BILLBOARD_ALL;
        leitMeshes.push(sym);
      });
    }

    // Abschnittsschilder A/B/C an der Grabenlinie (Y-Billboard, immer lesbar).
    for (const ab of meta.frontAbschnitte) {
      const tex = new DynamicTexture(
        `schild_${ab.id}`,
        { width: 128, height: 128 },
        scene,
        false,
      );
      tex.hasAlpha = true;
      const ctx = tex.getContext();
      ctx.fillStyle = "#12140f";
      ctx.fillRect(0, 0, 128, 128);
      tex.drawText(ab.id, null, 96, "bold 88px sans-serif", "#e8e4c8", "");
      const mat = new StandardMaterial(`schildMat_${ab.id}`, scene);
      mat.diffuseTexture = tex;
      mat.emissiveColor = new Color3(0.5, 0.48, 0.4);
      mat.specularColor = new Color3(0, 0, 0);
      leitMats.push(mat);
      leitTexturen.push(tex);
      const mx = (ab.bounds.minX + ab.bounds.maxX) / 2;
      const schild = MeshBuilder.CreatePlane(
        `schild_${ab.id}`,
        { size: 1.3 },
        scene,
      );
      schild.position.set(mx, 0.9, 9.5);
      schild.billboardMode = 2; // BILLBOARDMODE_Y
      schild.material = mat;
      schild.isPickable = false;
      schild.renderingGroupId = GROUP_WORLD;
      leitMeshes.push(schild);
    }

    // Zonen-Tore: markieren die zwei Rückzugs-Übergänge (Front→Feld, Feld→Home).
    const torMat = emissivMat("zonentor", [0.6, 0.58, 0.5]);
    for (const z of [10, -19.5]) {
      for (const seite of [-23, 23]) {
        const pylon = MeshBuilder.CreateBox(
          `zonentor_${z}_${seite}`,
          { width: 0.5, height: 4.5, depth: 0.5 },
          scene,
        );
        pylon.position.set(seite, 1.2, z);
        pylon.material = torMat;
        pylon.isPickable = false;
        pylon.renderingGroupId = GROUP_WORLD;
        leitMeshes.push(pylon);
      }
    }
  }

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
      // Alles aus den belastbaren Sim-Werten (`von` = Augpunkt beim Schuss,
      // `richtung` = Hitscan-Richtung, `nach` = Trefferpunkt/Reichweitenende) —
      // der Renderer rechnet keine eigene Herkunft aus. Läuft nach dem
      // Kamera-Update, die Weltmatrizen sind also aktuell.
      const shot = state.lastShot;
      const now = performance.now();
      if (shot && shot.tick !== lastShotTick) {
        lastShotTick = shot.tick;
        effectUntil = now + SHOT_EFFECT_MS;

        const von = new Vector3(shot.von.x, shot.von.y, shot.von.z);
        const dir = new Vector3(
          shot.richtung.x,
          shot.richtung.y,
          shot.richtung.z,
        );
        const nach = new Vector3(shot.nach.x, shot.nach.y, shot.nach.z);
        const gesamt = Vector3.Distance(von, nach);
        // Tracer beginnt ein Stück vor dem Auge auf dem Strahl (nie an der
        // Near-Plane), endet exakt am Trefferpunkt.
        const startAbstand = Math.min(MUZZLE_ABSTAND, gesamt * 0.5);
        const start = von.add(dir.scale(startAbstand));

        muzzle.position.copyFrom(von.add(dir.scale(MUZZLE_ABSTAND)));
        muzzle.isVisible = gesamt > MUZZLE_ABSTAND * 0.5;

        tracer?.dispose();
        tracer =
          gesamt > 0.2
            ? MeshBuilder.CreateLines(
                "tracer",
                { points: [start, nach] },
                scene,
              )
            : null;
        if (tracer) {
          tracer.color = new Color3(1, 0.9, 0.65);
          tracer.isPickable = false;
        }
      } else if (now > effectUntil) {
        clearShotEffect();
      }

      syncEnemies(state.enemies, now);
      syncFront(state.front);
      syncFront(state.home);

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
      landmarkMesh?.dispose();
      landmarkMat?.dispose();
      for (const m of depotMeshes) {
        m.dispose();
      }
      depotMat?.dispose();
      depotDeckelMat?.dispose();
      for (const v of frontVisuals.values()) {
        for (const m of v.truemmer) {
          m.dispose();
        }
        v.rauch.dispose();
        v.rauchMat.dispose();
      }
      frontVisuals.clear();
      truemmerMat?.dispose();
      for (const m of leitLinien) {
        m.dispose();
      }
      for (const m of leitMeshes) {
        m.dispose();
      }
      for (const m of leitMats) {
        m.dispose();
      }
      for (const t of leitTexturen) {
        t.dispose();
      }
      for (const m of zonenMat.values()) {
        m.dispose();
      }
      grenzeMat.dispose();
      for (const mesh of meshes) {
        mesh.material?.dispose();
        mesh.dispose();
      }
      scene.dispose();
      engine.dispose();
    },
  };
}
