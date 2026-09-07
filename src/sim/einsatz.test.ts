import { describe, expect, it } from "vitest";
import {
  createEinsatzState,
  entscheide,
  updateEinsatz,
  zermuerbungProKill,
  FINALE_COUNTDOWN,
  VERLAENGERN_COUNTDOWN,
  type EinsatzKontext,
} from "./einsatz";

const DT = 1 / 60;

function ctx(over: Partial<EinsatzKontext> = {}): EinsatzKontext {
  return {
    wavePhase: "welle",
    angriffskraftGebrochen: false,
    spawnQueueLeer: false,
    homeVerloren: false,
    truppAus: false,
    ...over,
  };
}

function tick(state = createEinsatzState(), c: EinsatzKontext, n: number) {
  for (let i = 0; i < n; i += 1) updateEinsatz(state, c, DT);
  return state;
}

describe("einsatz — zermuerbungProKill", () => {
  it("Frontlinie zählt am meisten, Home-Line am wenigsten", () => {
    const front = zermuerbungProKill("frontlinie", false);
    const hinterland = zermuerbungProKill("hinterland", false);
    const home = zermuerbungProKill("homeline", false);
    expect(front).toBeGreaterThan(hinterland);
    expect(hinterland).toBeGreaterThan(home);
  });

  it("verlorene Frontlinie zählt nur noch wie Hinterland", () => {
    expect(zermuerbungProKill("frontlinie", true)).toBe(
      zermuerbungProKill("hinterland", false),
    );
  });

  it("Niemandsland/Feindseite zwischen Front und Hinterland, außerhalb wie Hinterland", () => {
    expect(zermuerbungProKill("niemandsland", false)).toBeGreaterThan(
      zermuerbungProKill("hinterland", false),
    );
    expect(zermuerbungProKill("feindseite", false)).toBe(
      zermuerbungProKill("niemandsland", false),
    );
    expect(zermuerbungProKill(null, false)).toBe(
      zermuerbungProKill("hinterland", false),
    );
  });
});

describe("einsatz — Phasenmaschine", () => {
  it("aufbau → wellen, sobald der Director die Aufbauphase verlässt", () => {
    const s = createEinsatzState();
    updateEinsatz(s, ctx({ wavePhase: "aufbau" }), DT);
    expect(s.phase).toBe("aufbau");
    updateEinsatz(s, ctx({ wavePhase: "welle" }), DT);
    expect(s.phase).toBe("wellen");
  });

  it("wellen → finale bei gebrochener Angriffskraft + leerer Queue", () => {
    const s = tick(createEinsatzState(), ctx({ wavePhase: "welle" }), 1);
    updateEinsatz(
      s,
      ctx({ angriffskraftGebrochen: true, spawnQueueLeer: false }),
      DT,
    );
    expect(s.phase).toBe("wellen"); // Queue noch nicht leer
    updateEinsatz(
      s,
      ctx({ angriffskraftGebrochen: true, spawnQueueLeer: true }),
      DT,
    );
    expect(s.phase).toBe("finale");
    expect(s.finaleRest).toBeCloseTo(FINALE_COUNTDOWN, 5);
  });

  it("finale-Countdown abgelaufen → ergebnis gewonnen", () => {
    const s = createEinsatzState();
    s.phase = "finale";
    s.finaleRest = 2;
    tick(s, ctx({}), 60 * 2 + 5);
    expect(s.finaleRest).toBe(0);
    expect(s.ergebnis).toBe("gewonnen");
    expect(s.phase).toBe("finale"); // wartet auf entscheide
  });

  it("entscheide('extrahieren') nach gewonnen → phase vorbei, ergebnis gewonnen", () => {
    const s = createEinsatzState();
    s.phase = "finale";
    s.ergebnis = "gewonnen";
    entscheide(s, "extrahieren");
    expect(s.phase).toBe("vorbei");
    expect(s.ergebnis).toBe("gewonnen");
  });

  it("entscheide('verlaengern') → zweiter Countdown, reserveStufe hoch", () => {
    const s = createEinsatzState();
    s.phase = "finale";
    s.ergebnis = "gewonnen";
    entscheide(s, "verlaengern");
    expect(s.phase).toBe("finale");
    expect(s.ergebnis).toBe("offen");
    expect(s.finaleRest).toBeCloseTo(VERLAENGERN_COUNTDOWN, 5);
    expect(s.reserveStufe).toBe(1);

    // läuft wieder ab → wieder gewonnen; nochmal verlaengern eskaliert
    tick(s, ctx({}), 60 * VERLAENGERN_COUNTDOWN + 5);
    expect(s.ergebnis).toBe("gewonnen");
    entscheide(s, "verlaengern");
    expect(s.reserveStufe).toBe(2);
  });

  it("entscheide vor 'gewonnen' ist wirkungslos", () => {
    const s = createEinsatzState();
    s.phase = "finale";
    s.ergebnis = "offen";
    s.finaleRest = 50;
    entscheide(s, "extrahieren");
    expect(s.phase).toBe("finale");
    entscheide(s, "verlaengern");
    expect(s.reserveStufe).toBe(0);
  });

  it("alle Home-Abschnitte verloren → ergebnis verloren, in jeder Phase", () => {
    for (const start of ["aufbau", "wellen", "finale"] as const) {
      const s = createEinsatzState();
      s.phase = start;
      updateEinsatz(s, ctx({ homeVerloren: true }), DT);
      expect(s.phase).toBe("vorbei");
      expect(s.ergebnis).toBe("verloren");
    }
  });

  it("Trupp aus → ergebnis verloren", () => {
    const s = tick(createEinsatzState(), ctx({ wavePhase: "welle" }), 1);
    updateEinsatz(s, ctx({ truppAus: true }), DT);
    expect(s.phase).toBe("vorbei");
    expect(s.ergebnis).toBe("verloren");
  });

  it("vorbei ist terminal", () => {
    const s = createEinsatzState();
    s.phase = "vorbei";
    s.ergebnis = "gewonnen";
    updateEinsatz(s, ctx({ homeVerloren: true }), DT);
    expect(s.ergebnis).toBe("gewonnen");
  });

  it("ist deterministisch", () => {
    const run = () => {
      const s = createEinsatzState();
      for (let i = 0; i < 400; i += 1) {
        updateEinsatz(
          s,
          ctx({
            wavePhase: i < 50 ? "aufbau" : "welle",
            angriffskraftGebrochen: i > 200,
            spawnQueueLeer: i > 220,
          }),
          DT,
        );
      }
      return JSON.stringify(s);
    };
    expect(run()).toBe(run());
  });
});

describe("einsatz — 'gewonnen' ist geschützt (AP4-06, Audit H4)", () => {
  it("Home-Verlust / Trupp aus kippen ein erreichtes 'gewonnen' nicht mehr", () => {
    const s = createEinsatzState();
    s.phase = "finale";
    s.ergebnis = "gewonnen";
    updateEinsatz(s, ctx({ homeVerloren: true }), DT);
    updateEinsatz(s, ctx({ truppAus: true }), DT);
    expect(s.phase).toBe("finale");
    expect(s.ergebnis).toBe("gewonnen");
    // Extrahieren bleibt möglich und behält das Ergebnis.
    entscheide(s, "extrahieren");
    expect(s.phase).toBe("vorbei");
    expect(s.ergebnis).toBe("gewonnen");
  });

  it("nach 'verlaengern' ist der Einsatz wieder verlierbar", () => {
    const s = createEinsatzState();
    s.phase = "finale";
    s.ergebnis = "gewonnen";
    entscheide(s, "verlaengern");
    expect(s.ergebnis).toBe("offen");
    updateEinsatz(s, ctx({ homeVerloren: true }), DT);
    expect(s.phase).toBe("vorbei");
    expect(s.ergebnis).toBe("verloren");
  });
});
