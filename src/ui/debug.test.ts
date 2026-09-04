// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDebugOverlay, type DebugData, type DebugOverlay } from "./debug";

const sampleData: DebugData = {
  simTick: 123,
  fps: 60.4,
  player: {
    pos: { x: 1.234, y: 0, z: -3.456 },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0.35,
    pitch: -0.1,
    onGround: true,
    hp: 100,
    maxHp: 100,
    tot: false,
    respawnRest: 0,
    depotInReichweite: null,
    weapon: {
      defId: "langgewehr-m98",
      imLauf: 5,
      reserve: 45,
      reloading: false,
    },
  },
  command: {
    move: { x: 0, y: 1 },
    look: { dx: 4, dy: -2 },
    buttons: {
      fire: false,
      aim: false,
      sprint: true,
      interact: false,
      ability: false,
      jump: false,
      reload: false,
    },
  },
  lebendeGegner: 7,
};

function pressF3(): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "F3" }));
}

describe("debug overlay", () => {
  let overlay: DebugOverlay;

  beforeEach(() => {
    overlay = createDebugOverlay();
  });

  afterEach(() => {
    overlay.dispose();
  });

  const node = () => document.querySelector<HTMLElement>(".hdl-debug");

  it("mounts a visible fixed overlay that lets clicks pass through", () => {
    const el = node();
    expect(el).not.toBeNull();
    expect(el?.hidden).toBe(false);
    const style = getComputedStyle(el as HTMLElement);
    expect(style.position).toBe("fixed");
    expect(style.pointerEvents).toBe("none"); // Canvas-Klick (Pointer-Lock) bleibt möglich
  });

  it("renders the values it is handed", () => {
    overlay.update(sampleData);
    const text = node()?.textContent ?? "";
    expect(text).toContain("tick    123");
    expect(text).toContain("fps     60");
    expect(text).toContain("pos     1.23 0.00 -3.46");
    expect(text).toContain("ground  ja");
    expect(text).toContain("gegner  7 lebend");
    expect(text).toContain("btn     sprint");
  });

  it("toggles with F3 and stops updating while hidden", () => {
    overlay.update(sampleData);
    expect(node()?.textContent).toContain("tick    123");

    pressF3();
    expect(node()?.hidden).toBe(true);

    overlay.update({ ...sampleData, simTick: 999 });
    expect(node()?.textContent).not.toContain("999"); // no-op solange versteckt

    pressF3();
    expect(node()?.hidden).toBe(false);
  });

  it("removes the node and its listener on dispose", () => {
    overlay.dispose();
    expect(node()).toBeNull();
    // kein Fehler beim erneuten F3 nach dispose
    expect(() => pressF3()).not.toThrow();
  });
});
