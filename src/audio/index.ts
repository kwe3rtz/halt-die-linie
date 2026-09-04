// Direktionales Audio (AP4-05, minimal) — reiner Client, **außerhalb der Sim**.
// Darf `window` / `AudioContext` benutzen, importiert aus `src/sim` nur Typen und
// liest den State. Reagiert auf strategische Sim-Ereignisse:
//   - Abschnitt verloren  → Signalhorn aus Richtung Home-Line (Panning)
//   - Phase `finale`       → Signalhorn + Truppen-Ruf
// Platzhalter-Töne (Oszillatoren), stummschaltbar (Taste `T`), Default leise.
// Echte VO / Funk / Musik ist ein späteres Paket.
import type { SimState } from "../sim";

/** Feste Callout-Grammatik — später von echtem Funk/VO genutzt. */
export const FRONT_CALLOUT: Record<string, string> = {
  A: "Front A",
  B: "Front B",
  C: "Front C",
  "H-West": "Home-Line West",
  "H-Ost": "Home-Line Ost",
};

export const ROUTE_CALLOUT = {
  verbindungsgraben: "Route Verbindungsgraben",
  "feld-links": "Route Feld links",
  "feld-rechts": "Route Feld rechts",
} as const;

export type AudioEreignis =
  { typ: "abschnitt-verloren"; id: string; heim: boolean } | { typ: "finale" };

/**
 * Vergleicht zwei States und liefert die hörbaren Ereignisse. Rein — kein Audio,
 * kein `window`. `prev === undefined` (erster Frame) meldet nichts.
 */
export function beobachteEreignisse(
  prev: Readonly<SimState> | undefined,
  next: Readonly<SimState>,
): AudioEreignis[] {
  const out: AudioEreignis[] = [];
  if (!prev) {
    return out;
  }
  const wurdeVerloren = (
    vor: Readonly<SimState>["front"],
    jetzt: Readonly<SimState>["front"],
    heim: boolean,
  ): void => {
    for (const f of jetzt) {
      const alt = vor.find((x) => x.id === f.id);
      if (f.zustand === "verloren" && alt && alt.zustand !== "verloren") {
        out.push({ typ: "abschnitt-verloren", id: f.id, heim });
      }
    }
  };
  wurdeVerloren(prev.front, next.front, false);
  wurdeVerloren(prev.home, next.home, true);
  if (prev.einsatz.phase !== "finale" && next.einsatz.phase === "finale") {
    out.push({ typ: "finale" });
  }
  return out;
}

/** Relativer Peilwinkel Spieler→Ziel, [-π, π]. 0 = geradeaus, + = rechts. */
export function relPeilung(
  from: { x: number; z: number },
  yaw: number,
  to: { x: number; z: number },
): number {
  let rel = Math.atan2(to.x - from.x, to.z - from.z) - yaw;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  return rel;
}

/** Peilwinkel → Stereo-Pan [-1, 1]. Rechts vom Spieler = +. */
export function panFuerPeilung(rel: number): number {
  return Math.max(-1, Math.min(1, Math.sin(rel)));
}

export interface Audio {
  /** Pro Frame: Ereignisse zwischen `prev` und `next` abspielen. */
  beobachte(
    prev: Readonly<SimState> | undefined,
    next: Readonly<SimState>,
    playerPos: { x: number; z: number },
    yaw: number,
    homePos: { x: number; z: number },
  ): void;
  setStumm(stumm: boolean): void;
  dispose(): void;
}

const MASTER_GAIN = 0.22; // Default leise
type AudioCtor = new () => AudioContext;

export function createAudio(parent: HTMLElement = document.body): Audio {
  const doc = parent.ownerDocument;
  const win = doc.defaultView ?? window;

  let ctx: AudioContext | null = null;
  let stumm = false;

  // Kleiner Stumm-Indikator (nur sichtbar wenn stumm).
  const badge = doc.createElement("div");
  badge.textContent = "🔇 Ton aus (T)";
  badge.style.cssText =
    "position:fixed;right:14px;top:10px;z-index:2147483645;pointer-events:none;" +
    "font:11px/1 ui-sans-serif,system-ui,sans-serif;color:#e6ece0;opacity:0.75;" +
    "text-shadow:0 1px 2px rgba(0,0,0,0.8)";
  badge.hidden = true;
  parent.appendChild(badge);

  const ctor = (win as unknown as { AudioContext?: AudioCtor }).AudioContext;

  const sicherCtx = (): AudioContext | null => {
    if (stumm || !ctor) {
      return null;
    }
    if (!ctx) {
      try {
        ctx = new ctor();
      } catch {
        ctx = null;
        return null;
      }
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  };

  const ton = (
    freq: number,
    dauer: number,
    pan: number,
    typ: OscillatorType,
  ): void => {
    const ac = sicherCtx();
    if (!ac) {
      return;
    }
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = typ;
    osc.frequency.value = freq;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(MASTER_GAIN, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + dauer);
    const panner = ac.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    osc.connect(gain).connect(panner).connect(ac.destination);
    osc.start(now);
    osc.stop(now + dauer + 0.05);
  };

  const signalhorn = (pan: number): void => {
    ton(196, 0.5, pan, "sawtooth");
    ton(262, 0.45, pan, "sawtooth");
  };
  const truppenRuf = (): void => ton(440, 0.18, 0, "square");

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === "KeyT") {
      stumm = !stumm;
      badge.hidden = !stumm;
    }
  };
  win.addEventListener("keydown", onKeyDown);

  return {
    beobachte: (prev, next, playerPos, yaw, homePos) => {
      for (const ev of beobachteEreignisse(prev, next)) {
        const pan = panFuerPeilung(relPeilung(playerPos, yaw, homePos));
        if (ev.typ === "abschnitt-verloren") {
          signalhorn(pan);
        } else {
          signalhorn(pan);
          truppenRuf();
        }
      }
    },
    setStumm: (next) => {
      stumm = next;
      badge.hidden = !next;
    },
    dispose: () => {
      win.removeEventListener("keydown", onKeyDown);
      badge.remove();
      void ctx?.close();
      ctx = null;
    },
  };
}
