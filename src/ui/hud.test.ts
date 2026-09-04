// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDebugOverlay } from "./debug";
import { createHud, type Hud, type HudData } from "./hud";

const base: HudData = {
  hp: 100,
  maxHp: 100,
  tot: false,
  respawnRest: 0,
  weapon: { imLauf: 5, reserve: 45, reloading: false },
  wave: {
    welle: 1,
    phase: "welle",
    angriffskraftRest: 55,
    angriffskraftMax: 60,
  },
  nachschub: 0,
  lastShot: null,
};

const schuss = (
  over: Partial<NonNullable<HudData["lastShot"]>> = {},
): HudData["lastShot"] => ({
  tick: 1,
  von: { x: 0, y: 0, z: 0 },
  nach: { x: 0, y: 0, z: 1 },
  richtung: { x: 0, y: 0, z: 1 },
  treffer: true,
  gegnerTreffer: true,
  toedlich: false,
  ...over,
});

describe("hud", () => {
  let hud: Hud;

  beforeEach(() => {
    hud = createHud();
  });
  afterEach(() => {
    hud.dispose();
    document.querySelector(".hdl-debug")?.remove();
  });

  const root = () => document.querySelector<HTMLElement>(".hdl-hud");
  const q = (sel: string) => root()?.querySelector<HTMLElement>(sel);

  it("mountet ein durchlässiges Overlay unter dem Debug-Overlay", () => {
    const el = root();
    expect(el).not.toBeNull();
    const cs = getComputedStyle(el as HTMLElement);
    expect(cs.position).toBe("fixed");
    expect(cs.pointerEvents).toBe("none");
    expect(Number(cs.zIndex)).toBeLessThan(2147483647); // Debug-Overlay liegt drüber
  });

  it("zeigt HP, Munition, Welle und Nachschub", () => {
    hud.update({
      ...base,
      hp: 60,
      nachschub: 15,
      wave: { ...base.wave, welle: 2 },
    });
    expect(q(".hdl-hud__hp")?.textContent).toContain("60 / 100");
    expect(q(".hdl-hud__ammo-count")?.textContent).toBe("5 / 45");
    expect(q(".hdl-hud__wave")?.textContent).toContain("Welle 2");
    expect(q(".hdl-hud__wave")?.textContent).toContain("Angriff");
    expect(q(".hdl-hud__wave")?.textContent).toContain("Nachschub 15");
  });

  it("blendet 'Nachladen…' nur während des Reloads ein", () => {
    hud.update(base);
    expect(q(".hdl-hud__reload")?.hidden).toBe(true);
    hud.update({
      ...base,
      weapon: { imLauf: 0, reserve: 40, reloading: true },
    });
    expect(q(".hdl-hud__reload")?.hidden).toBe(false);
  });

  it("Aufbauphase zeigt keinen Wellen-Zähler", () => {
    hud.update({ ...base, wave: { ...base.wave, welle: 0, phase: "aufbau" } });
    expect(q(".hdl-hud__wave")?.textContent).toContain("Aufbau");
    expect(q(".hdl-hud__wave")?.textContent).not.toContain("Welle");
  });

  it("blendet die Einsatz-Zeile nur im Finale / bei Einsatz-Ende ein", () => {
    const line = () => q(".hdl-hud__einsatz");
    hud.update(base); // kein einsatz übergeben
    expect(line()?.hidden).toBe(true);

    hud.update({
      ...base,
      einsatz: { phase: "wellen", finaleRest: 0, ergebnis: "offen" },
    });
    expect(line()?.hidden).toBe(true);

    hud.update({
      ...base,
      einsatz: { phase: "finale", finaleRest: 42.7, ergebnis: "offen" },
    });
    expect(line()?.hidden).toBe(false);
    expect(line()?.textContent).toContain("Entsatz in 43 s");

    hud.update({
      ...base,
      einsatz: { phase: "finale", finaleRest: 0, ergebnis: "gewonnen" },
    });
    expect(line()?.textContent).toContain("extrahieren");

    hud.update({
      ...base,
      einsatz: { phase: "vorbei", finaleRest: 0, ergebnis: "verloren" },
    });
    expect(line()?.textContent).toBe("Einsatz verloren");
  });

  it("Tod-Overlay mit Countdown, verschwindet beim Respawn", () => {
    hud.update({ ...base, tot: true, respawnRest: 2.4 });
    const death = q(".hdl-hud__death");
    expect(death?.classList.contains("hdl-hud__death--on")).toBe(true);
    expect(q(".hdl-hud__death-sub")?.textContent).toBe("Respawn in 3 s");

    hud.update({ ...base, tot: false });
    expect(death?.classList.contains("hdl-hud__death--on")).toBe(false);
  });

  it("stört das F3-Debug-Overlay nicht", () => {
    const debug = createDebugOverlay();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "F3" }));
    expect(document.querySelector<HTMLElement>(".hdl-debug")?.hidden).toBe(
      true,
    );
    expect(root()?.hidden).toBe(false); // HUD reagiert nicht auf F3
    debug.dispose();
  });

  it("Fadenkreuz sitzt zentriert über dem Canvas, verschwindet im Tod", () => {
    hud.update(base);
    const cross = q(".hdl-hud__crosshair");
    expect(cross).not.toBeNull();
    const cs = getComputedStyle(cross as HTMLElement);
    expect(cs.position).toBe("absolute");
    expect(cs.left).toBe("50%");
    expect(cs.top).toBe("50%");

    hud.update({ ...base, tot: true });
    expect(cross?.classList.contains("hdl-hud__crosshair--hidden")).toBe(true);
    hud.update({ ...base, tot: false });
    expect(cross?.classList.contains("hdl-hud__crosshair--hidden")).toBe(false);
  });

  it("Trefferbestätigung toggelt auf ein Gegner-Treffer-Signal, nicht auf Wand", () => {
    const marker = q(".hdl-hud__hit");
    expect(marker?.classList.contains("hdl-hud__hit--on")).toBe(false);

    // Wand-Treffer: kein Hitmarker.
    hud.update({
      ...base,
      lastShot: schuss({ tick: 5, gegnerTreffer: false }),
    });
    expect(marker?.classList.contains("hdl-hud__hit--on")).toBe(false);

    // Gegner-Treffer: Hitmarker an.
    hud.update({ ...base, lastShot: schuss({ tick: 6 }) });
    expect(marker?.classList.contains("hdl-hud__hit--on")).toBe(true);
    expect(marker?.classList.contains("hdl-hud__hit--kill")).toBe(false);

    // Tödlicher Treffer: kräftigere Variante.
    hud.update({ ...base, lastShot: schuss({ tick: 7, toedlich: true }) });
    expect(marker?.classList.contains("hdl-hud__hit--kill")).toBe(true);
  });

  it("dispose entfernt den Knoten", () => {
    hud.dispose();
    expect(root()).toBeNull();
  });
});
