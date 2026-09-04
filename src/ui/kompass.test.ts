// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createKompass, relPeilung, type Kompass } from "./kompass";

describe("kompass — relPeilung", () => {
  it("0 wenn das Ziel geradeaus vor dem Spieler liegt (yaw 0 = +Z)", () => {
    expect(relPeilung(0, 0, 0, 0, 10)).toBeCloseTo(0, 5);
  });
  it("positiv = rechts, negativ = links", () => {
    expect(relPeilung(0, 0, 0, 5, 0)).toBeCloseTo(Math.PI / 2, 5); // +X = rechts
    expect(relPeilung(0, 0, 0, -5, 0)).toBeCloseTo(-Math.PI / 2, 5);
  });
  it("dreht mit dem yaw mit", () => {
    // Ziel bei +X; mit yaw +90° blickt der Spieler nach +X → Ziel geradeaus.
    expect(relPeilung(0, 0, Math.PI / 2, 5, 0)).toBeCloseTo(0, 5);
  });
  it("hinter dem Spieler ~±π", () => {
    expect(Math.abs(relPeilung(0, 0, 0, 0, -10))).toBeCloseTo(Math.PI, 5);
  });
});

describe("kompass — DOM", () => {
  let kompass: Kompass;
  beforeEach(() => {
    kompass = createKompass();
  });
  afterEach(() => {
    kompass.dispose();
  });

  const root = () => document.querySelector<HTMLElement>(".hdl-kompass");
  const marker = (label: string) =>
    [...document.querySelectorAll<HTMLElement>(".hdl-kompass__marker")].find(
      (m) => m.querySelector(".hdl-kompass__label")?.textContent === label,
    );

  const data = (over: Partial<Parameters<Kompass["update"]>[0]> = {}) => ({
    playerPos: { x: 0, z: 0 },
    yaw: 0,
    homePos: { x: 0, z: -30 },
    abschnitte: [
      { id: "A", pos: { x: -14, z: 13 }, zustand: "stabil" as const },
      { id: "B", pos: { x: 0, z: 13 }, zustand: "bedraengt" as const },
      { id: "C", pos: { x: 14, z: 13 }, zustand: "verloren" as const },
    ],
    ...over,
  });

  it("mountet ein durchlässiges Band unter dem Debug-Overlay", () => {
    const el = root();
    expect(el).not.toBeNull();
    const cs = getComputedStyle(el as HTMLElement);
    expect(cs.position).toBe("fixed");
    expect(cs.pointerEvents).toBe("none");
  });

  it("zeigt den HOME-Marker und je Frontabschnitt einen — keine Gegner-Marker", () => {
    kompass.update(data());
    expect(marker("HOME")).toBeTruthy();
    expect(marker("A")).toBeTruthy();
    expect(marker("B")).toBeTruthy();
    expect(marker("C")).toBeTruthy();
    // genau 4 Marker (HOME + A/B/C), nichts für Gegner.
    expect(document.querySelectorAll(".hdl-kompass__marker").length).toBe(4);
  });

  it("codiert den Zustand redundant über Farbe UND Symbol", () => {
    kompass.update(data());
    expect(marker("A")?.dataset.zustand).toBe("stabil");
    expect(marker("C")?.dataset.zustand).toBe("verloren");
    expect(marker("B")?.querySelector(".hdl-kompass__glyph")?.textContent).toBe(
      "▲",
    );
    expect(marker("C")?.querySelector(".hdl-kompass__glyph")?.textContent).toBe(
      "✕",
    );
  });

  it("verschiebt einen Marker, wenn sich der yaw dreht", () => {
    kompass.update(data());
    const vorher = marker("HOME")?.style.left;
    // HOME liegt bei -Z; mit yaw = π blickt der Spieler nach -Z → HOME mittig.
    kompass.update(data({ yaw: Math.PI }));
    const nachher = marker("HOME")?.style.left;
    expect(nachher).not.toBe(vorher);
    expect(parseFloat(nachher ?? "0")).toBeCloseTo(50, 0);
  });

  it("pinnt Marker außerhalb des Sichtwinkels an den Rand mit Richtungspfeil", () => {
    // yaw 0: HOME ist hinter dem Spieler → außerhalb, links oder rechts gepinnt.
    kompass.update(data());
    const home = marker("HOME");
    const off =
      home?.classList.contains("hdl-kompass__marker--offL") ||
      home?.classList.contains("hdl-kompass__marker--offR");
    expect(off).toBe(true);
  });

  it("setVisible blendet aus und stoppt Updates", () => {
    kompass.setVisible(false);
    expect(root()?.hidden).toBe(true);
  });
});
