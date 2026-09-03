import { describe, expect, it } from "vitest";
import { createCollisionWorld, type CollisionWorld } from "./collision";
import {
  advanceWeapon,
  createWeaponState,
  fire,
  reload,
  type FireButtons,
} from "./weapon";
import type { WeaponDef } from "../data/schema";

const DT = 1 / 60;

function makeDef(over: Partial<WeaponDef> = {}): WeaponDef {
  return {
    id: "test",
    name: "Testwaffe",
    category: "repetiergewehr",
    feuerModus: "repetierer",
    basisSchaden: 50,
    kadenz: 60, // cooldown = 1 s
    magazin: 5,
    reserve: 20,
    nachladeArt: "ladestreifen",
    handling: {
      reichweiteOptimal: 30,
      reichweiteMax: 100,
      streuung: 0,
      rueckstoss: 0,
    },
    nation: "neutral",
    wandwaffe: false,
    feelTags: [],
    ...over,
  };
}

const emptyWorld: CollisionWorld = createCollisionWorld({
  boxes: [],
  spawnPoints: [],
});
const origin = { x: 0, y: 0, z: 0 };
const forward = { x: 0, y: 0, z: 1 };
const PRESS: FireButtons = { gedrueckt: true, flanke: true };
const HOLD: FireButtons = { gedrueckt: true, flanke: false };

function shoot(state: Parameters<typeof fire>[0], def: WeaponDef, btn = PRESS) {
  return fire(state, emptyWorld, origin, forward, def, btn);
}

describe("weapon — feuern & cooldown", () => {
  it("feuert bei der Flanke und sperrt bis der Cooldown abgelaufen ist", () => {
    const def = makeDef();
    const state = createWeaponState(def);

    expect(shoot(state, def).schuss).toBe(true);
    expect(state.imLauf).toBe(4);
    expect(state.cooldown).toBeCloseTo(1, 5);

    // Sofort nochmal: Cooldown blockt.
    expect(shoot(state, def).schuss).toBe(false);
    expect(state.imLauf).toBe(4);

    advanceWeapon(state, def, 1);
    expect(state.cooldown).toBe(0);
    expect(shoot(state, def).schuss).toBe(true);
    expect(state.imLauf).toBe(3);
  });

  it("Repetierer feuert nur auf Flanke, nicht im Halten", () => {
    const def = makeDef();
    const state = createWeaponState(def);
    expect(shoot(state, def, HOLD).schuss).toBe(false);
  });

  it("Vollauto feuert solange gehalten (nach Cooldown)", () => {
    const def = makeDef({ feuerModus: "vollauto", kadenz: 600 });
    const state = createWeaponState(def);
    expect(shoot(state, def, HOLD).schuss).toBe(true);
    advanceWeapon(state, def, 0.1);
    expect(shoot(state, def, HOLD).schuss).toBe(true);
    expect(state.imLauf).toBe(3);
  });

  it("leergeschossen: kein Schuss mehr ohne Nachladen", () => {
    const def = makeDef();
    const state = createWeaponState(def);
    for (let i = 0; i < 5; i += 1) {
      expect(shoot(state, def).schuss).toBe(true);
      advanceWeapon(state, def, 1);
    }
    expect(state.imLauf).toBe(0);
    expect(shoot(state, def).schuss).toBe(false);
  });
});

describe("weapon — nachladen", () => {
  function advanceUntilDone(
    state: ReturnType<typeof createWeaponState>,
    def: WeaponDef,
  ): void {
    for (let i = 0; i < 20000 && state.reloading; i += 1) {
      advanceWeapon(state, def, DT);
    }
  }

  it("ladestreifen: blockweise +5, unterbrechbar, Teilfortschritt bleibt", () => {
    const def = makeDef({
      nachladeArt: "ladestreifen",
      magazin: 10,
      reserve: 20,
    });
    const state = createWeaponState(def);
    state.imLauf = 0;

    reload(state, def);
    expect(state.reloading).toBe(true);

    // Ein Streifen fertig.
    advanceWeapon(state, def, 1.6);
    expect(state.imLauf).toBe(5);
    expect(state.reserve).toBe(15);
    expect(state.reloading).toBe(true); // zweiter Streifen läuft

    // Feuern unterbricht — die 5 geladenen bleiben.
    const res = shoot(state, def);
    expect(res.schuss).toBe(false);
    expect(state.reloading).toBe(false);
    expect(state.imLauf).toBe(5);

    // Erneut nachladen bis voll.
    reload(state, def);
    advanceUntilDone(state, def);
    expect(state.imLauf).toBe(10);
    expect(state.reserve).toBe(10);
  });

  it("magazin: ein Block, Restmunition im alten Magazin verfällt", () => {
    const def = makeDef({ nachladeArt: "magazin", magazin: 8, reserve: 20 });
    const state = createWeaponState(def);
    state.imLauf = 3;

    reload(state, def);
    expect(state.imLauf).toBe(0); // Rest verfällt sofort

    advanceWeapon(state, def, 2.2);
    expect(state.imLauf).toBe(8);
    expect(state.reserve).toBe(12);
    expect(state.reloading).toBe(false);
  });

  it("ohne Reserve kein Nachladen", () => {
    const def = makeDef({ reserve: 0 });
    const state = createWeaponState(def);
    state.imLauf = 0;
    reload(state, def);
    expect(state.reloading).toBe(false);
    expect(state.imLauf).toBe(0);
  });

  it("volles Magazin: reload ist ein No-op", () => {
    const def = makeDef();
    const state = createWeaponState(def);
    reload(state, def);
    expect(state.reloading).toBe(false);
    expect(state.reserve).toBe(def.reserve);
  });

  it("letzter Streifen lädt nur so viel wie die Reserve hergibt", () => {
    const def = makeDef({
      nachladeArt: "ladestreifen",
      magazin: 10,
      reserve: 3,
    });
    const state = createWeaponState(def);
    state.imLauf = 0;
    reload(state, def);
    advanceWeapon(state, def, 1.6);
    expect(state.imLauf).toBe(3);
    expect(state.reserve).toBe(0);
    expect(state.reloading).toBe(false);
  });
});

describe("weapon — hitscan", () => {
  it("trifft eine Wand und liefert Punkt + Distanz", () => {
    const world = createCollisionWorld({
      boxes: [{ center: { x: 0, y: 0, z: 10 }, size: { x: 4, y: 4, z: 1 } }],
      spawnPoints: [],
    });
    const def = makeDef();
    const state = createWeaponState(def);
    const res = fire(state, world, origin, forward, def, PRESS);
    expect(res.schuss).toBe(true);
    expect(res.treffer).toBeDefined();
    expect(res.treffer?.distanz).toBeCloseTo(9.5, 5); // Wand-minZ
    expect(res.treffer?.punkt.z).toBeCloseTo(9.5, 5);
  });

  it("trifft nichts jenseits der maximalen Reichweite", () => {
    const world = createCollisionWorld({
      boxes: [{ center: { x: 0, y: 0, z: 500 }, size: { x: 4, y: 4, z: 1 } }],
      spawnPoints: [],
    });
    const def = makeDef();
    const state = createWeaponState(def);
    const res = fire(state, world, origin, forward, def, PRESS);
    expect(res.schuss).toBe(true);
    expect(res.treffer).toBeUndefined();
  });
});
