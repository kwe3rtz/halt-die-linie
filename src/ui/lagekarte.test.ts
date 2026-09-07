// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createLagekarte,
  type Lagekarte,
  type LagekarteData,
} from "./lagekarte";

const base: LagekarteData = {
  front: [{ id: "front", zustand: "gebrochen" }],
  home: [{ id: "home", zustand: "bedraengt" }],
  einsatz: { phase: "wellen", ergebnis: "offen" },
};

describe("lagekarte", () => {
  let karte: Lagekarte;
  beforeEach(() => {
    karte = createLagekarte();
  });
  afterEach(() => {
    karte.dispose();
    document.querySelectorAll(".hdl-lagekarte").forEach((n) => n.remove());
  });

  const root = () => document.querySelector<HTMLElement>(".hdl-lagekarte");
  const cell = (id: string) =>
    [...document.querySelectorAll<HTMLElement>(".hdl-lagekarte__cell")].find(
      (c) => c.querySelector("b")?.textContent === id,
    );

  it("startet ausgeblendet und toggelt mit M", () => {
    expect(root()?.hidden).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyM" }));
    expect(root()?.hidden).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyM" }));
    expect(root()?.hidden).toBe(true);
  });

  it("rendert Frontlinie und Home-Line mit Zustand (Farbe + Text)", () => {
    karte.setVisible(true);
    karte.update(base);
    expect(cell("front")?.dataset.zustand).toBe("gebrochen");
    expect(cell("home")?.dataset.zustand).toBe("bedraengt");
    expect(cell("front")?.querySelector("span")?.textContent).toBe("gebrochen");
    // verlorene Linie: eigener Zustand
    karte.update({ ...base, front: [{ id: "front", zustand: "verloren" }] });
    expect(cell("front")?.dataset.zustand).toBe("verloren");
    expect(cell("front")?.querySelector("span")?.textContent).toBe("verloren");
  });

  it("zeigt die Einsatzphase im Fuß, inkl. Ergebnis bei 'vorbei'", () => {
    karte.setVisible(true);
    karte.update(base);
    expect(
      root()?.querySelector(".hdl-lagekarte__foot")?.textContent,
    ).toContain("Wellenabwehr");
    karte.update({
      ...base,
      einsatz: { phase: "vorbei", ergebnis: "verloren" },
    });
    expect(
      root()?.querySelector(".hdl-lagekarte__foot")?.textContent,
    ).toContain("verloren");
  });

  it("aktualisiert nicht, solange ausgeblendet (No-op)", () => {
    karte.update(base); // versteckt
    expect(cell("front")).toBeUndefined();
  });

  it("dispose entfernt den Knoten und den Key-Listener", () => {
    karte.dispose();
    expect(root()).toBeNull();
    // Kein Fehler / kein Wiederauftauchen beim Tastendruck.
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyM" }));
    expect(root()).toBeNull();
  });
});
