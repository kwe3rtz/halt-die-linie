// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createLagekarte,
  type Lagekarte,
  type LagekarteData,
} from "./lagekarte";

const base: LagekarteData = {
  front: [
    { id: "A", zustand: "stabil" },
    { id: "B", zustand: "gebrochen" },
    { id: "C", zustand: "verloren" },
  ],
  home: [
    { id: "H-West", zustand: "stabil" },
    { id: "H-Ost", zustand: "bedraengt" },
  ],
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

  it("rendert Front- und Home-Abschnitte mit Zustand (Farbe + Text)", () => {
    karte.setVisible(true);
    karte.update(base);
    expect(cell("A")?.dataset.zustand).toBe("stabil");
    expect(cell("B")?.dataset.zustand).toBe("gebrochen");
    expect(cell("C")?.dataset.zustand).toBe("verloren");
    expect(cell("H-Ost")?.dataset.zustand).toBe("bedraengt");
    expect(cell("C")?.querySelector("span")?.textContent).toBe("verloren");
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
    expect(cell("A")).toBeUndefined();
  });

  it("dispose entfernt den Knoten und den Key-Listener", () => {
    karte.dispose();
    expect(root()).toBeNull();
    // Kein Fehler / kein Wiederauftauchen beim Tastendruck.
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyM" }));
    expect(root()).toBeNull();
  });
});
