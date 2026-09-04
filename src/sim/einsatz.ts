// Einsatzbogen (AP4-04): die Phasenmaschine über dem Wave-Director + „die Uhr".
//
// Bogen (KONZEPT.md §6): `aufbau → wellen → finale → vorbei`. Die endliche
// Angriffskraft (`wave.ts`) wird zermürbt — je weiter vorn der Feind stirbt,
// desto mehr (die gehaltene Front „gewinnt" Zeit). Ist sie gebrochen und keine
// Welle mehr in der Queue, läuft an der Home-Line ein Countdown („Entsatz in
// N s"); abgelaufen → gewonnen. Alle Home-Abschnitte verloren oder Trupp aus →
// verloren, in jeder Phase.
//
// Rein/in-place, kein Babylon, Zeit nur als `dt` (goldene Regel).
import type { WavePhase } from "./wave";
import type { ZonenId } from "./sektor";

export type EinsatzPhase = "aufbau" | "wellen" | "finale" | "vorbei";
export type EinsatzErgebnis = "offen" | "gewonnen" | "verloren";
export type EinsatzWahl = "extrahieren" | "verlaengern";

export interface EinsatzState {
  phase: EinsatzPhase;
  ergebnis: EinsatzErgebnis;
  /** Sekunden bis „Entsatz eingetroffen" (nur im `finale`, sonst 0). */
  finaleRest: number;
  /** 0 = erstes Finale; +1 je `verlaengern` — eskaliert die Reservewellen. */
  reserveStufe: number;
}

// --- Zahlen: PLATZHALTER (Spieltest — Ticket „Offene Rückfragen"). -------------
/** Fester Countdown des Home-Line-Finales. */
export const FINALE_COUNTDOWN = 90;
/** Kürzerer Countdown je „verlaengern". */
export const VERLAENGERN_COUNTDOWN = 45;
/** Zermürbung der Angriffskraft pro getötetem Gegner, je Todeszone. */
const FRONT_ZERMUERBUNG = 2;
const LAB_ZERMUERBUNG = 1.5;
const FELD_ZERMUERBUNG = 1;
const HOME_ZERMUERBUNG = 0.5;

/** Kontext, den `updateEinsatz` je Tick bekommt. */
export interface EinsatzKontext {
  wavePhase: WavePhase;
  /** `wave.angriffskraft <= 0`. */
  angriffskraftGebrochen: boolean;
  /** `wave.spawnQueue.length === 0`. */
  spawnQueueLeer: boolean;
  /** Alle Home-Line-Abschnitte `verloren`. */
  homeVerloren: boolean;
  /** Trupp ausgeschaltet (Koop; solo nie — Testeingang). */
  truppAus: boolean;
}

export function createEinsatzState(): EinsatzState {
  return { phase: "aufbau", ergebnis: "offen", finaleRest: 0, reserveStufe: 0 };
}

/**
 * Zermürbung der Angriffskraft für **einen** getöteten Gegner. Tod an der
 * `frontlinie` zählt am meisten — es sei denn, der Abschnitt ist schon
 * `verloren` (dann wie offenes Feld). `homeline` am wenigsten.
 */
export function zermuerbungProKill(
  zone: ZonenId | null,
  abschnittVerloren: boolean,
): number {
  if (zone === "frontlinie") {
    return abschnittVerloren ? FELD_ZERMUERBUNG : FRONT_ZERMUERBUNG;
  }
  if (zone === "labyrinth" || zone === "feindzone") {
    return LAB_ZERMUERBUNG;
  }
  if (zone === "homeline") {
    return HOME_ZERMUERBUNG;
  }
  // feld, verbindungsgraben, außerhalb
  return FELD_ZERMUERBUNG;
}

/** Schreibt den Einsatzzustand um `dt` fort. Mutiert `state` in-place. */
export function updateEinsatz(
  state: EinsatzState,
  ctx: EinsatzKontext,
  dt: number,
): void {
  if (state.phase === "vorbei") {
    return;
  }

  // Verlust schlägt jede Phase — außer ein erreichtes „gewonnen" (der Entsatz
  // ist da; AP4-06, Audit H4): das ist geschützt, bis der Spieler entscheidet.
  // `verlaengern` setzt das Ergebnis zurück auf `offen` → wieder verlierbar.
  if (ctx.homeVerloren || ctx.truppAus) {
    if (state.ergebnis === "gewonnen") {
      return;
    }
    state.phase = "vorbei";
    state.ergebnis = "verloren";
    state.finaleRest = 0;
    return;
  }

  switch (state.phase) {
    case "aufbau":
      if (ctx.wavePhase !== "aufbau") {
        state.phase = "wellen";
      }
      return;

    case "wellen":
      if (ctx.angriffskraftGebrochen && ctx.spawnQueueLeer) {
        state.phase = "finale";
        state.finaleRest = FINALE_COUNTDOWN;
      }
      return;

    case "finale":
      // Countdown abgelaufen → gewonnen; wartet dann auf `entscheide`.
      if (state.ergebnis === "gewonnen") {
        return;
      }
      state.finaleRest = Math.max(0, state.finaleRest - dt);
      if (state.finaleRest === 0) {
        state.ergebnis = "gewonnen";
      }
      return;
  }
}

/**
 * Spieler-Entscheidung nach „Entsatz eingetroffen". Nur wirksam im `finale` mit
 * `ergebnis === "gewonnen"`. `extrahieren` beendet den Einsatz (gewonnen),
 * `verlaengern` startet einen weiteren, kürzeren Countdown mit härteren
 * Reservewellen.
 */
export function entscheide(state: EinsatzState, wahl: EinsatzWahl): void {
  if (state.phase !== "finale" || state.ergebnis !== "gewonnen") {
    return;
  }
  if (wahl === "extrahieren") {
    state.phase = "vorbei";
    return;
  }
  state.ergebnis = "offen";
  state.finaleRest = VERLAENGERN_COUNTDOWN;
  state.reserveStufe += 1;
}
