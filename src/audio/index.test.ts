// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  beobachteEreignisse,
  createAudio,
  FRONT_CALLOUT,
  panFuerPeilung,
  relPeilung,
  ROUTE_CALLOUT,
  type Audio,
} from "./index";
import type { SimState } from "../sim";

type Zust = "stabil" | "bedraengt" | "gebrochen" | "verloren";
const st = (
  front: [string, Zust][],
  home: [string, Zust][],
  phase: SimState["einsatz"]["phase"] = "wellen",
): SimState =>
  ({
    front: front.map(([id, zustand]) => ({
      id,
      zustand,
      breschenOffen: 0,
      breschen: [],
    })),
    home: home.map(([id, zustand]) => ({
      id,
      zustand,
      breschenOffen: 0,
      breschen: [],
    })),
    einsatz: { phase, finaleRest: 0, ergebnis: "offen" },
  }) as unknown as SimState;

describe("audio — reine Helfer", () => {
  it("relPeilung: 0 geradeaus, + rechts, - links, dreht mit yaw", () => {
    expect(relPeilung({ x: 0, z: 0 }, 0, { x: 0, z: 10 })).toBeCloseTo(0, 5);
    expect(relPeilung({ x: 0, z: 0 }, 0, { x: 5, z: 0 })).toBeCloseTo(
      Math.PI / 2,
      5,
    );
    expect(relPeilung({ x: 0, z: 0 }, Math.PI / 2, { x: 5, z: 0 })).toBeCloseTo(
      0,
      5,
    );
  });

  it("panFuerPeilung: Vorzeichen folgt der Peilung, geklemmt auf [-1,1]", () => {
    expect(panFuerPeilung(0)).toBeCloseTo(0, 5);
    expect(panFuerPeilung(Math.PI / 2)).toBeCloseTo(1, 5);
    expect(panFuerPeilung(-Math.PI / 2)).toBeCloseTo(-1, 5);
    expect(panFuerPeilung(Math.PI)).toBeGreaterThanOrEqual(-1);
  });

  it("Callout-Grammatik ist fest definiert", () => {
    expect(FRONT_CALLOUT.A).toBe("Front A");
    expect(ROUTE_CALLOUT["feld-links"]).toBe("Route Feld links");
  });
});

describe("audio — beobachteEreignisse", () => {
  it("erster Frame (prev undefined) meldet nichts", () => {
    expect(beobachteEreignisse(undefined, st([["A", "stabil"]], []))).toEqual(
      [],
    );
  });

  it("Frontabschnitt → verloren meldet ein Ereignis (einmalig)", () => {
    const a = st([["A", "gebrochen"]], []);
    const b = st([["A", "verloren"]], []);
    expect(beobachteEreignisse(a, b)).toEqual([
      { typ: "abschnitt-verloren", id: "A", heim: false },
    ]);
    // schon verloren → kein erneutes Ereignis
    expect(beobachteEreignisse(b, b)).toEqual([]);
  });

  it("Home-Abschnitt → verloren wird als heim=true gemeldet", () => {
    const a = st([], [["H-West", "bedraengt"]]);
    const b = st([], [["H-West", "verloren"]]);
    expect(beobachteEreignisse(a, b)).toEqual([
      { typ: "abschnitt-verloren", id: "H-West", heim: true },
    ]);
  });

  it("Übergang in die Phase 'finale' meldet ein Ereignis", () => {
    const a = st([], [], "wellen");
    const b = st([], [], "finale");
    expect(beobachteEreignisse(a, b)).toEqual([{ typ: "finale" }]);
    expect(beobachteEreignisse(b, b)).toEqual([]);
  });
});

// --- WebAudio-Mock -----------------------------------------------------------
const panners: { pan: { value: number } }[] = [];
let ctxCount = 0;
class MockCtx {
  currentTime = 0;
  state = "running";
  destination = {};
  createOscillator() {
    return {
      type: "",
      frequency: { value: 0 },
      connect(n: unknown) {
        return n;
      },
      start() {},
      stop() {},
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect(n: unknown) {
        return n;
      },
    };
  }
  createStereoPanner() {
    const p = { pan: { value: 0 }, connect: (n: unknown) => n };
    panners.push(p);
    return p;
  }
  resume() {}
  close() {}
  constructor() {
    ctxCount += 1;
  }
}

describe("audio — createAudio (gemocktes WebAudio)", () => {
  let audio: Audio;
  beforeEach(() => {
    panners.length = 0;
    ctxCount = 0;
    (window as unknown as { AudioContext: unknown }).AudioContext = MockCtx;
    audio = createAudio();
  });
  afterEach(() => {
    audio.dispose();
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  const spieler = { x: 0, z: 13 };
  const home = { x: 0, z: -20 }; // genau hinter dem Spieler (yaw 0)

  it("spielt bei Abschnittsverlust ein Signal, gepannt Richtung Home", () => {
    const prev = st([["A", "gebrochen"]], []);
    const next = st([["A", "verloren"]], []);
    // yaw = π/2: Spieler blickt nach +X (Ost), Home liegt südlich → rechts → pan +.
    audio.beobachte(prev, next, spieler, Math.PI / 2, home);
    expect(panners.length).toBeGreaterThan(0);
    expect(panners[0]?.pan.value).toBeGreaterThan(0);

    panners.length = 0;
    // yaw = -π/2: Spieler blickt nach -X (West), Home südlich → links → pan −.
    audio.beobachte(prev, next, spieler, -Math.PI / 2, home);
    expect(panners[0]?.pan.value).toBeLessThan(0);
  });

  it("spielt beim Finale-Übergang (Signal + Truppen-Ruf)", () => {
    audio.beobachte(
      st([], [], "wellen"),
      st([], [], "finale"),
      spieler,
      0,
      home,
    );
    // Signalhorn (2 Töne) + Truppen-Ruf → mind. 3 Panner-Knoten.
    expect(panners.length).toBeGreaterThanOrEqual(3);
  });

  it("stummgeschaltet erzeugt keinen AudioContext / kein Signal", () => {
    audio.setStumm(true);
    audio.beobachte(
      st([["A", "gebrochen"]], []),
      st([["A", "verloren"]], []),
      spieler,
      0,
      home,
    );
    expect(ctxCount).toBe(0);
    expect(panners.length).toBe(0);
  });

  it("Taste T schaltet stumm und zeigt den Indikator", () => {
    const badge = document.body.querySelector("div:last-child") as HTMLElement;
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyT" }));
    expect(badge.hidden).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyT" }));
    expect(badge.hidden).toBe(true);
  });
});
