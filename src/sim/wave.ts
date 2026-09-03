// Wave-Director: Gegner kommen in Wellen. Eine endliche Angriffskraft (Zähler,
// KONZEPT.md §6) zermürbt sich mit jedem Spawn; ist sie leer und das Feld frei,
// gilt der Einsatz als „vorbei" (nur ein State-Flag in AP2 — kein Zeit-Finale).
// Deterministisch: injizierte Zeit (`dt`) und `Rng`, kein Babylon/Math.random.
import type { Vec3 } from "./math";
import type { Rng } from "./rng";

export type WavePhase = "aufbau" | "welle" | "pause" | "vorbei";

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
  /** Sekunden bis zum Ende der `aufbau`/`pause`-Phase. */
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

export interface WaveContext {
  /** Anzahl lebender (nicht toter) Gegner. */
  lebendeGegner: number;
  /** Mögliche Gegner-Startpositionen. */
  spawnPunkte: readonly Vec3[];
  rng: Rng;
  spawn: (defId: string, pos: Vec3, hpFaktor: number) => void;
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
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
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
      }

      if (state.spawnQueue.length === 0 && ctx.lebendeGegner === 0) {
        if (state.angriffskraft <= 0) {
          state.phase = "vorbei";
        } else {
          state.phase = "pause";
          state.phaseTimer = PAUSE_DAUER;
        }
      }
      return;
    }
  }
}
