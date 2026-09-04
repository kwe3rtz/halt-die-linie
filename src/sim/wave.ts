// Wave-Director: Gegner kommen in Wellen. Eine endliche Angriffskraft (Zähler,
// KONZEPT.md §6) zermürbt sich mit jedem Spawn; ist sie leer und das Feld frei,
// gilt der Hauptangriff als „vorbei" — es sei denn, der Einsatz ist im Finale
// (AP4-04): dann folgen kleine Reservewellen (`reserve`), bis das Finale endet.
// Deterministisch: injizierte Zeit (`dt`) und `Rng`, kein Babylon/Math.random.
import type { Vec3 } from "./math";
import type { Rng } from "./rng";

export type WavePhase = "aufbau" | "welle" | "pause" | "reserve" | "vorbei";

interface SpawnPlan {
  defId: string;
  /** Wellen-Skalierung der HP. */
  hpFaktor: number;
}

export interface WaveState {
  /** 0 während `aufbau`, danach 1..n. */
  welle: number;
  phase: WavePhase;
  spawnQueue: SpawnPlan[];
  /** Sekunden bis zum nächsten gestaffelten Spawn. */
  spawnTimer: number;
  /** Sekunden bis zum Ende der `aufbau`/`pause`-Phase bzw. zur nächsten Reservewelle. */
  phaseTimer: number;
  /** Verbleibende endliche Angriffskraft. */
  angriffskraft: number;
}

// Alle Zahlen PLATZHALTER (Balance: KONZEPT.md §9.6).
export const START_ANGRIFFSKRAFT = 60;
const AUFBAU_DAUER = 3; // s bis Welle 1
const PAUSE_DAUER = 5; // s zwischen Wellen
const SPAWN_INTERVALL = 1.4; // s zwischen gestaffelten Spawns
const BASIS_ANZAHL = 4;
const ZUWACHS = 2; // Gegner mehr pro Welle
const HP_FAKTOR_PRO_WELLE = 0.12;
const STANDARD_GEGNER = "linieninfanterie";
// Finale-Reservewellen (AP4-04).
const RESERVE_INTERVALL = 8; // s zwischen Reservewellen
const RESERVE_BASIS = 3; // Gegner je Reservewelle bei reserveStufe 0
const RESERVE_ZUWACHS = 2; // + pro reserveStufe (je „verlaengern")

export interface WaveContext {
  /** Anzahl lebender (nicht toter) Gegner. */
  lebendeGegner: number;
  /** Mögliche Gegner-Startpositionen. */
  spawnPunkte: readonly Vec3[];
  rng: Rng;
  spawn: (defId: string, pos: Vec3, hpFaktor: number) => void;
  /** Einsatz ist im Finale → Reservewellen statt `vorbei` (AP4-04). */
  finale?: boolean;
  /** Eskalationsstufe der Reservewellen (0 = erstes Finale). */
  reserveStufe?: number;
}

export function createWaveState(): WaveState {
  return {
    welle: 0,
    phase: "aufbau",
    spawnQueue: [],
    spawnTimer: 0,
    phaseTimer: AUFBAU_DAUER,
    angriffskraft: START_ANGRIFFSKRAFT,
  };
}

function starteWelle(state: WaveState, welle: number): void {
  state.welle = welle;
  state.phase = "welle";
  const geplant = BASIS_ANZAHL + (welle - 1) * ZUWACHS;
  // Nie mehr planen, als Angriffskraft übrig ist.
  const anzahl = Math.max(0, Math.min(geplant, state.angriffskraft));
  const hpFaktor = 1 + (welle - 1) * HP_FAKTOR_PRO_WELLE;
  state.spawnQueue = Array.from({ length: anzahl }, () => ({
    defId: STANDARD_GEGNER,
    hpFaktor,
  }));
  state.spawnTimer = 0; // erster Spawn sofort
}

/** Zieht den nächsten geplanten Spawn (gestaffelt). Läuft in `welle` + `reserve`. */
function leereQueue(state: WaveState, ctx: WaveContext, dt: number): void {
  if (state.spawnQueue.length === 0) {
    return;
  }
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) {
    return;
  }
  const plan = state.spawnQueue.shift();
  if (plan && ctx.spawnPunkte.length > 0) {
    const idx = ctx.rng.int(0, ctx.spawnPunkte.length - 1);
    const p = ctx.spawnPunkte[idx] ?? ctx.spawnPunkte[0];
    if (p) {
      ctx.spawn(plan.defId, p, plan.hpFaktor);
      state.angriffskraft = Math.max(0, state.angriffskraft - 1);
    }
  }
  state.spawnTimer = SPAWN_INTERVALL;
}

/** Treibt den Director um `dt` weiter. Mutiert `state`. */
export function updateWave(
  state: WaveState,
  ctx: WaveContext,
  dt: number,
): void {
  switch (state.phase) {
    case "aufbau":
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) {
        starteWelle(state, 1);
      }
      return;

    case "pause":
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) {
        starteWelle(state, state.welle + 1);
      }
      return;

    case "vorbei":
      return;

    case "welle": {
      leereQueue(state, ctx, dt);

      if (state.spawnQueue.length === 0 && ctx.lebendeGegner === 0) {
        if (state.angriffskraft <= 0) {
          if (ctx.finale) {
            // Hauptangriff verbraucht, aber der Einsatz läuft ins Finale:
            // auf Reservewellen umschalten.
            state.phase = "reserve";
            state.phaseTimer = RESERVE_INTERVALL;
          } else {
            state.phase = "vorbei";
          }
        } else {
          state.phase = "pause";
          state.phaseTimer = PAUSE_DAUER;
        }
      }
      return;
    }

    case "reserve": {
      // Finale zu Ende (extrahiert / verloren) → Director aus.
      if (!ctx.finale) {
        state.phase = "vorbei";
        return;
      }
      leereQueue(state, ctx, dt);
      // Nächste Reservewelle erst, wenn die letzte durch und das Feld frei ist.
      if (state.spawnQueue.length === 0 && ctx.lebendeGegner === 0) {
        state.phaseTimer -= dt;
        if (state.phaseTimer <= 0) {
          const anzahl =
            RESERVE_BASIS + (ctx.reserveStufe ?? 0) * RESERVE_ZUWACHS;
          const hpFaktor = 1 + state.welle * HP_FAKTOR_PRO_WELLE;
          for (let i = 0; i < anzahl; i += 1) {
            state.spawnQueue.push({ defId: STANDARD_GEGNER, hpFaktor });
          }
          state.phaseTimer = RESERVE_INTERVALL;
        }
      }
      return;
    }
  }
}
