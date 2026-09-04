import { describe, expect, it } from "vitest";
import { createRng } from "./rng";
import {
  createWaveState,
  START_ANGRIFFSKRAFT,
  updateWave,
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

  it("nach der Aufbauphase beginnt Welle 1 mit einer Spawn-Queue von 4", () => {
    const s = createWaveState();
    const { ctx } = makeCtx();
    const t = runUntil(s, ctx, () => s.phase === "welle");
    expect(t).toBeGreaterThan(0);
    expect(s.welle).toBe(1);
    expect(s.spawnQueue.length).toBe(4);
  });

  it("spawnt gestaffelt und zieht pro Spawn Angriffskraft ab", () => {
    const s = createWaveState();
    const { ctx, spawns } = makeCtx(1); // ein Gegner „lebt" -> Welle endet nicht
    runUntil(s, ctx, () => spawns.length === 1);
    const t2 = runUntil(s, ctx, () => spawns.length === 2);
    const t3 = runUntil(s, ctx, () => spawns.length === 3);
    expect(t2).toBeGreaterThan(60); // ~1.4 s Abstand
    expect(t3).toBeGreaterThan(60);
    expect(s.angriffskraft).toBe(START_ANGRIFFSKRAFT - 3);
  });

  it("Welle geschafft -> Pause -> Welle 2: mehr Gegner, höherer HP-Faktor", () => {
    const s = createWaveState();
    const { ctx, spawns } = makeCtx(0);

    runUntil(s, ctx, () => s.phase === "pause");
    expect(spawns.length).toBe(4);
    expect(spawns.every((x) => x.hpFaktor === 1)).toBe(true);
    const nachWelle1 = spawns.length;

    runUntil(s, ctx, () => s.phase === "welle" && s.welle === 2);
    runUntil(s, ctx, () => s.spawnQueue.length === 0);
    const welle2 = spawns.slice(nachWelle1);
    expect(welle2.length).toBe(6);
    expect(welle2.every((x) => x.hpFaktor > 1)).toBe(true);
  });

  it("kein Spawn während der Pause", () => {
    const s = createWaveState();
    const { ctx, spawns } = makeCtx(0);
    runUntil(s, ctx, () => s.phase === "pause");
    const vorPause = spawns.length;
    tick(s, ctx, 240); // 4 s — Pause dauert 5 s
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

    // Nach ~8 s wird eine kleine Reservewelle (Basis 3) angesetzt.
    runUntil(s, ctx, () => s.spawnQueue.length > 0, 900);
    expect(s.spawnQueue.length).toBe(3);
    runUntil(s, ctx, () => s.spawnQueue.length === 0, 900);
    expect(spawns.length - vorReserve).toBe(3);
    expect(s.angriffskraft).toBe(0); // Reserve zehrt nicht an der Angriffskraft
  });

  it("reserveStufe eskaliert die Reservewellen-Größe", () => {
    const s = createWaveState();
    s.angriffskraft = 0;
    s.phase = "reserve";
    s.phaseTimer = 8;
    const { ctx } = makeCtx(0);
    ctx.finale = true;
    ctx.reserveStufe = 2; // Basis 3 + 2*2 = 7

    runUntil(s, ctx, () => s.spawnQueue.length > 0, 900);
    expect(s.spawnQueue.length).toBe(7);
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
