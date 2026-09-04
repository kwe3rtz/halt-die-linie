import { describe, expect, it } from "vitest";
import { createRng } from "./rng";
import {
  BASIS_ANZAHL,
  createWaveState,
  RESERVE_BASIS,
  RESERVE_ZUWACHS,
  SPAWN_BESCHLEUNIGUNG,
  SPAWN_INTERVALL_MIN,
  SPAWN_INTERVALL_START,
  SPAWN_JITTER,
  spawnIntervall,
  START_ANGRIFFSKRAFT,
  updateWave,
  wellenGroesse,
  ZUWACHS,
  type WaveContext,
  type WaveState,
} from "./wave";

const DT = 1 / 60;

function makeCtx(lebende = 0) {
  const spawns: Array<{ defId: string; hpFaktor: number }> = [];
  const ctx: WaveContext = {
    lebendeGegner: lebende,
    spawnPunkte: [
      { x: 0, y: 1, z: 20 },
      { x: 2, y: 1, z: 20 },
    ],
    rng: createRng(1),
    spawn: (defId, _pos, hpFaktor) => {
      spawns.push({ defId, hpFaktor });
    },
  };
  return { ctx, spawns };
}

/** Tickt bis `pred` erfüllt ist; liefert die Anzahl Ticks (oder -1). */
function runUntil(
  s: WaveState,
  ctx: WaveContext,
  pred: () => boolean,
  max = 6000,
): number {
  for (let i = 0; i < max; i += 1) {
    updateWave(s, ctx, DT);
    if (pred()) return i;
  }
  return -1;
}

function tick(s: WaveState, ctx: WaveContext, n: number): void {
  for (let i = 0; i < n; i += 1) updateWave(s, ctx, DT);
}

describe("wave director", () => {
  it("startet mit aufbau und voller Angriffskraft", () => {
    const s = createWaveState();
    expect(s.phase).toBe("aufbau");
    expect(s.welle).toBe(0);
    expect(s.angriffskraft).toBe(START_ANGRIFFSKRAFT);
  });

  it("nach der Aufbauphase beginnt Welle 1 mit einer Spawn-Queue von BASIS_ANZAHL (5)", () => {
    const s = createWaveState();
    const { ctx } = makeCtx();
    const t = runUntil(s, ctx, () => s.phase === "welle");
    expect(t).toBeGreaterThan(0);
    expect(s.welle).toBe(1);
    expect(s.spawnQueue.length).toBe(5);
    expect(s.spawnQueue.length).toBe(BASIS_ANZAHL);
  });

  it("spawnt gestaffelt (Welle-1-Takt ± Jitter) und zieht pro Spawn Angriffskraft ab", () => {
    const s = createWaveState();
    const { ctx, spawns } = makeCtx(1); // ein Gegner „lebt" -> Welle endet nicht
    runUntil(s, ctx, () => spawns.length === 1);
    const t2 = runUntil(s, ctx, () => spawns.length === 2);
    const t3 = runUntil(s, ctx, () => spawns.length === 3);
    // 1,4 s ± 25 % → 1,05 … 1,75 s (63 … 105 Ticks, ±1 Tick Rundung).
    const minTicks = Math.floor(1.4 * (1 - SPAWN_JITTER) * 60) - 1;
    const maxTicks = Math.ceil(1.4 * (1 + SPAWN_JITTER) * 60) + 1;
    expect(t2).toBeGreaterThanOrEqual(minTicks);
    expect(t2).toBeLessThanOrEqual(maxTicks);
    expect(t3).toBeGreaterThanOrEqual(minTicks);
    expect(t3).toBeLessThanOrEqual(maxTicks);
    expect(s.angriffskraft).toBe(START_ANGRIFFSKRAFT - 3);
  });

  it("Welle geschafft -> Pause -> Welle 2: mehr Gegner (+ZUWACHS), höherer HP-Faktor", () => {
    const s = createWaveState();
    const { ctx, spawns } = makeCtx(0);

    runUntil(s, ctx, () => s.phase === "pause");
    expect(spawns.length).toBe(5);
    expect(spawns.every((x) => x.hpFaktor === 1)).toBe(true);
    const nachWelle1 = spawns.length;

    runUntil(s, ctx, () => s.phase === "welle" && s.welle === 2);
    runUntil(s, ctx, () => s.spawnQueue.length === 0);
    const welle2 = spawns.slice(nachWelle1);
    expect(welle2.length).toBe(8);
    expect(welle2.length).toBe(BASIS_ANZAHL + ZUWACHS);
    expect(welle2.every((x) => x.hpFaktor > 1)).toBe(true);
  });

  it("kein Spawn während der Pause", () => {
    const s = createWaveState();
    const { ctx, spawns } = makeCtx(0);
    runUntil(s, ctx, () => s.phase === "pause");
    const vorPause = spawns.length;
    tick(s, ctx, 120); // 2 s — Pause dauert 3 s
    expect(s.phase).toBe("pause");
    expect(spawns.length).toBe(vorPause);
  });

  it("Angriffskraft erschöpft + leeres Feld -> 'vorbei', kein weiterer Spawn", () => {
    const s = createWaveState();
    s.angriffskraft = 3;
    const { ctx, spawns } = makeCtx(0);

    runUntil(s, ctx, () => s.phase === "vorbei");
    expect(s.angriffskraft).toBe(0);
    expect(spawns.length).toBe(3);

    tick(s, ctx, 600);
    expect(spawns.length).toBe(3);
    expect(s.phase).toBe("vorbei");
  });
});

describe("wave director — Finale-Reservewellen (AP4-04)", () => {
  it("im Finale: statt 'vorbei' geht der Director auf 'reserve' und spawnt nach", () => {
    const s = createWaveState();
    s.angriffskraft = 2;
    const { ctx, spawns } = makeCtx(0);
    ctx.finale = true;

    runUntil(s, ctx, () => s.phase === "reserve");
    expect(spawns.length).toBe(2); // der Hauptangriff ist durch
    const vorReserve = spawns.length;

    // Nach ~8 s wird eine Reservewelle (RESERVE_BASIS = 6) angesetzt.
    runUntil(s, ctx, () => s.spawnQueue.length > 0, 900);
    expect(s.spawnQueue.length).toBe(6);
    expect(s.spawnQueue.length).toBe(RESERVE_BASIS);
    runUntil(s, ctx, () => s.spawnQueue.length === 0, 900);
    expect(spawns.length - vorReserve).toBe(6);
    expect(s.angriffskraft).toBe(0); // Reserve zehrt nicht an der Angriffskraft
  });

  it("reserveStufe eskaliert die Reservewellen-Größe", () => {
    const s = createWaveState();
    s.angriffskraft = 0;
    s.phase = "reserve";
    s.phaseTimer = 8;
    const { ctx } = makeCtx(0);
    ctx.finale = true;
    ctx.reserveStufe = 2; // Basis 6 + 2*3 = 12

    runUntil(s, ctx, () => s.spawnQueue.length > 0, 900);
    expect(s.spawnQueue.length).toBe(12);
    expect(s.spawnQueue.length).toBe(RESERVE_BASIS + 2 * RESERVE_ZUWACHS);
  });

  it("Finale vorbei (ctx.finale=false) → 'reserve' endet in 'vorbei'", () => {
    const s = createWaveState();
    s.angriffskraft = 0;
    s.phase = "reserve";
    s.phaseTimer = 8;
    const { ctx } = makeCtx(0);
    ctx.finale = false;

    updateWave(s, ctx, DT);
    expect(s.phase).toBe("vorbei");
  });
});

describe("wave director — Tick-Reihenfolge & Einfrieren (AP4-06)", () => {
  it("erschöpfte Angriffskraft geht immer zuerst auf 'reserve'; ohne finale fällt sie im nächsten Tick auf 'vorbei'", () => {
    const s = createWaveState();
    s.angriffskraft = 3;
    const { ctx, spawns } = makeCtx(0);
    // ctx.finale ist nicht gesetzt (kein Einsatzbogen) — trotzdem zuerst reserve.
    expect(
      runUntil(s, ctx, () => s.phase !== "welle" && s.welle === 1),
    ).toBeGreaterThan(0);
    expect(s.phase).toBe("reserve");
    updateWave(s, ctx, DT);
    expect(s.phase).toBe("vorbei");
    expect(spawns.length).toBe(3);
  });

  it("im Tick eines Spawns wechselt die Phase nicht (der frische Gegner zählt noch nicht als lebend)", () => {
    const s = createWaveState();
    s.angriffskraft = 1;
    const { ctx, spawns } = makeCtx(0);
    runUntil(s, ctx, () => spawns.length === 1);
    // Queue ist leer, „Feld leer", Angriffskraft 0 — aber der Spawn war gerade.
    expect(s.spawnQueue.length).toBe(0);
    expect(s.angriffskraft).toBe(0);
    expect(s.phase).toBe("welle");
    updateWave(s, ctx, DT);
    expect(s.phase).toBe("reserve");
  });

  it("eingefroren: im 'reserve'-Regime kommen keine neuen Spawns, bis die Sperre fällt", () => {
    const s = createWaveState();
    s.angriffskraft = 0;
    s.phase = "reserve";
    s.phaseTimer = 8;
    const { ctx, spawns } = makeCtx(0);
    ctx.finale = true;
    ctx.eingefroren = true;
    tick(s, ctx, 60 * 60);
    expect(spawns.length).toBe(0);
    expect(s.spawnQueue.length).toBe(0);
    expect(s.phase).toBe("reserve");
    ctx.eingefroren = false;
    expect(runUntil(s, ctx, () => spawns.length > 0, 1200)).toBeGreaterThan(-1);
  });
});

// Regressionstest gegen Audit H3: Reihenfolge wie in `createSim` (updateWave VOR
// updateEinsatz). Fällt die Angriffskraft durch den letzten Kill exakt auf 0,
// während das Feld im selben Tick leer wird, muss der Director trotzdem ins
// Reserve-Regime — vorher blieb er auf `vorbei` und das Finale lief ohne Wellen.
describe("wave ↔ einsatz — Verdrahtungsreihenfolge (AP4-06, Audit H3)", () => {
  it("letzter Kill bricht die Angriffskraft und leert das Feld im selben Tick → reserve, nicht vorbei", async () => {
    const { createEinsatzState, updateEinsatz } = await import("./einsatz");
    const wave = createWaveState();
    const einsatz = createEinsatzState();
    const { ctx, spawns } = makeCtx(0);
    let lebende = 0;
    ctx.spawn = () => {
      spawns.push({ defId: "x", hpFaktor: 1 });
      lebende += 1;
    };
    const step = () => {
      ctx.lebendeGegner = lebende;
      ctx.finale = einsatz.phase === "finale";
      ctx.eingefroren = einsatz.ergebnis === "gewonnen";
      updateWave(wave, ctx, DT);
      updateEinsatz(
        einsatz,
        {
          wavePhase: wave.phase,
          angriffskraftGebrochen: wave.angriffskraft <= 0,
          spawnQueueLeer: wave.spawnQueue.length === 0,
          homeVerloren: false,
          truppAus: false,
        },
        DT,
      );
    };
    // Welle 1 komplett spawnen (Aufbau 3 s + 5 Spawns à ≤ 1,75 s).
    for (let i = 0; i < 60 * 12; i += 1) step();
    expect(wave.phase).toBe("welle");
    expect(lebende).toBe(5);
    // „Die Uhr": 3 Front-Kills à −2 …
    wave.angriffskraft = Math.max(0, wave.angriffskraft - 6);
    lebende = 1;
    step();
    // … und der letzte Kill zieht die Angriffskraft exakt auf 0.
    wave.angriffskraft = 2;
    wave.angriffskraft = Math.max(0, wave.angriffskraft - 2);
    lebende = 0;
    step();
    expect(einsatz.phase).toBe("finale");
    expect(wave.phase).toBe("reserve");
    // Im Finale kommen Reservewellen.
    const vorher = spawns.length;
    for (let i = 0; i < 60 * 30; i += 1) step();
    expect(spawns.length).toBeGreaterThan(vorher);
  });
});

// AP5-04: erste echte Tuning-Iteration — größere, steiler wachsende, dichter
// gespawnte Wellen und ein Budget, das die höheren Wellen überhaupt erreicht.
describe("wave director — Eskalation (AP5-04)", () => {
  it("Wellengröße wächst linear ab BASIS_ANZAHL: 5 · 8 · 11 · 14 · 17", () => {
    expect([1, 2, 3, 4, 5].map(wellenGroesse)).toEqual([5, 8, 11, 14, 17]);
    for (let w = 1; w < 12; w += 1) {
      expect(wellenGroesse(w + 1) - wellenGroesse(w)).toBe(ZUWACHS);
    }
    expect(wellenGroesse(1)).toBe(BASIS_ANZAHL);
    expect(wellenGroesse(0)).toBe(BASIS_ANZAHL); // defensiv: „aufbau" zählt wie Welle 1
  });

  it("Spawn-Takt wird je Welle kürzer und bleibt an der Untergrenze stehen", () => {
    expect(spawnIntervall(1)).toBeCloseTo(SPAWN_INTERVALL_START, 6);
    expect(spawnIntervall(2)).toBeCloseTo(
      SPAWN_INTERVALL_START - SPAWN_BESCHLEUNIGUNG,
      6,
    );
    expect(spawnIntervall(5)).toBeCloseTo(0.8, 6);
    for (let w = 1; w < 15; w += 1) {
      expect(spawnIntervall(w + 1)).toBeLessThanOrEqual(spawnIntervall(w));
      expect(spawnIntervall(w)).toBeGreaterThanOrEqual(SPAWN_INTERVALL_MIN);
    }
    expect(spawnIntervall(20)).toBe(SPAWN_INTERVALL_MIN);
  });

  it("Spawn-Jitter: die Abstände einer Welle liegen im Band ±SPAWN_JITTER und sind nicht alle gleich", () => {
    const s = createWaveState();
    s.angriffskraft = 200; // reicht für eine große Welle
    s.phase = "pause";
    s.phaseTimer = 0.01;
    s.welle = 4; // → Welle 5 mit 17 Gegnern im 0,8-s-Takt
    const { ctx, spawns } = makeCtx(1); // Welle endet nicht (ein Gegner lebt)
    const zeiten: number[] = [];
    for (let i = 0; i < 60 * 40 && spawns.length < 17; i += 1) {
      updateWave(s, ctx, DT);
      if (spawns.length > zeiten.length) zeiten.push(i * DT);
    }
    expect(zeiten.length).toBe(17);
    const abstaende = zeiten.slice(1).map((t, i) => t - (zeiten[i] ?? 0));
    const basis = spawnIntervall(5);
    for (const a of abstaende) {
      expect(a).toBeGreaterThanOrEqual(basis * (1 - SPAWN_JITTER) - DT);
      expect(a).toBeLessThanOrEqual(basis * (1 + SPAWN_JITTER) + DT);
    }
    const min = Math.min(...abstaende);
    const max = Math.max(...abstaende);
    expect(max - min).toBeGreaterThan(0.15); // gestreut, kein Metronom
  });

  it("Budget: mit Front-Zermürbung (1 je Spawn + 2 je Kill) trägt die Angriffskraft genau fünf volle Wellen", async () => {
    const { zermuerbungProKill } = await import("./einsatz");
    const s = createWaveState();
    const { ctx } = makeCtx(0);
    const proWelle = new Map<number, number>();
    // Jeder Spawn stirbt sofort an der stehenden Front: −1 (Spawn) −2 (Uhr).
    ctx.spawn = () => {
      proWelle.set(s.welle, (proWelle.get(s.welle) ?? 0) + 1);
      s.angriffskraft = Math.max(
        0,
        s.angriffskraft - zermuerbungProKill("frontlinie", false),
      );
    };
    runUntil(
      s,
      ctx,
      () => s.phase === "reserve" || s.phase === "vorbei",
      60000,
    );
    expect([...proWelle.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [1, 5],
      [2, 8],
      [3, 11],
      [4, 14],
      [5, 17],
    ]);
    expect(s.angriffskraft).toBe(0);
    expect(START_ANGRIFFSKRAFT).toBe(150);
  });
});
