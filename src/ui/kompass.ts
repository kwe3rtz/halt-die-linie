// Kompass-Band (AP4-05): oben am Bildschirm, zeigt den Peil-Winkel zur Home-Line
// und je Frontabschnitt einen Zustands-Marker (Farbe **und** Symbol — redundant
// codiert). **Keine Gegner-Marker** (KONZEPT.md §3 / Sparring R2: nur
// strategische Zustände). Reines DOM + CSS, bekommt den State pro Frame.
import type { AbschnittZustand } from "../sim";

/** Sichtbarer Halbwinkel des Bands (Grad). Marker außerhalb werden an den Rand
 *  gepinnt mit Richtungspfeil. */
const HALB_WINKEL = (78 * Math.PI) / 180;

export interface KompassAbschnitt {
  id: string;
  pos: { x: number; z: number };
  zustand: AbschnittZustand;
}

export interface KompassData {
  playerPos: { x: number; z: number };
  /** Blickrichtung, Radiant. 0 = +Z. */
  yaw: number;
  homePos: { x: number; z: number };
  abschnitte: readonly KompassAbschnitt[];
}

export interface Kompass {
  update(data: KompassData): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

const STYLE_ID = "hdl-kompass-style";

const CSS = `
.hdl-kompass {
  position: fixed;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: min(560px, 84vw);
  height: 26px;
  z-index: 2147483645;
  pointer-events: none;
  user-select: none;
  border-bottom: 1px solid rgba(216, 226, 208, 0.22);
}
.hdl-kompass__tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 6px;
  background: rgba(216, 226, 208, 0.28);
}
.hdl-kompass__marker {
  position: absolute;
  bottom: 2px;
  transform: translateX(-50%);
  font: 12px/1 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
  white-space: nowrap;
  text-align: center;
  color: #e6ece0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
}
.hdl-kompass__marker--home { color: #9fd8a6; font-weight: 700; }
.hdl-kompass__glyph { font-size: 13px; display: block; }
.hdl-kompass__label { font-size: 10px; opacity: 0.85; }
.hdl-kompass__marker[data-zustand="stabil"] { opacity: 0.45; }
.hdl-kompass__marker[data-zustand="bedraengt"] { color: #e6b23c; }
.hdl-kompass__marker[data-zustand="gebrochen"] { color: #e07b3c; }
.hdl-kompass__marker[data-zustand="verloren"] { color: #d1483a; font-weight: 700; }
.hdl-kompass__marker--offL::before { content: "‹ "; }
.hdl-kompass__marker--offR::after { content: " ›"; }
@media (prefers-reduced-motion: no-preference) {
  .hdl-kompass__marker { transition: left 120ms linear; }
}
`;

/** Zustands-Glyph — geometrisch, damit es ohne Farbe lesbar bleibt. */
const GLYPH: Record<AbschnittZustand, string> = {
  stabil: "▽",
  bedraengt: "▲",
  gebrochen: "◑",
  verloren: "✕",
};

/** Relativer Peilwinkel Spieler→Ziel, [-π, π]. 0 = geradeaus. */
export function relPeilung(
  px: number,
  pz: number,
  yaw: number,
  tx: number,
  tz: number,
): number {
  let rel = Math.atan2(tx - px, tz - pz) - yaw;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  return rel;
}

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) {
    return;
  }
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

export function createKompass(parent: HTMLElement = document.body): Kompass {
  const doc = parent.ownerDocument;
  ensureStyle(doc);

  const root = doc.createElement("div");
  root.className = "hdl-kompass";
  root.setAttribute("aria-hidden", "true");
  // Feste Peil-Ticks bei 0 / ±40 / ±78° (rein visuell).
  for (const frac of [0.09, 0.29, 0.5, 0.71, 0.91]) {
    const t = doc.createElement("div");
    t.className = "hdl-kompass__tick";
    t.style.left = `${frac * 100}%`;
    root.appendChild(t);
  }
  parent.appendChild(root);

  interface MarkerEls {
    wrap: HTMLElement;
    glyph: HTMLElement;
    label: HTMLElement;
  }
  const markers = new Map<string, MarkerEls>();

  const makeMarker = (id: string, home: boolean): MarkerEls => {
    const wrap = doc.createElement("div");
    wrap.className = home
      ? "hdl-kompass__marker hdl-kompass__marker--home"
      : "hdl-kompass__marker";
    const glyph = doc.createElement("span");
    glyph.className = "hdl-kompass__glyph";
    const label = doc.createElement("span");
    label.className = "hdl-kompass__label";
    wrap.append(glyph, label);
    root.appendChild(wrap);
    const els = { wrap, glyph, label };
    markers.set(id, els);
    return els;
  };

  const platziere = (els: MarkerEls, rel: number): void => {
    const clamped = Math.max(-HALB_WINKEL, Math.min(HALB_WINKEL, rel));
    const frac = clamped / (2 * HALB_WINKEL) + 0.5;
    els.wrap.style.left = `${frac * 100}%`;
    els.wrap.classList.toggle("hdl-kompass__marker--offL", rel < -HALB_WINKEL);
    els.wrap.classList.toggle("hdl-kompass__marker--offR", rel > HALB_WINKEL);
  };

  let visible = true;

  return {
    update: (data) => {
      if (!visible) {
        return;
      }
      const { playerPos: p, yaw } = data;

      const home = markers.get("__home") ?? makeMarker("__home", true);
      home.glyph.textContent = "⌂";
      home.label.textContent = "HOME";
      platziere(
        home,
        relPeilung(p.x, p.z, yaw, data.homePos.x, data.homePos.z),
      );

      const lebende = new Set(["__home"]);
      for (const ab of data.abschnitte) {
        lebende.add(ab.id);
        const m = markers.get(ab.id) ?? makeMarker(ab.id, false);
        m.wrap.dataset.zustand = ab.zustand;
        m.glyph.textContent = GLYPH[ab.zustand];
        m.label.textContent = ab.id;
        platziere(m, relPeilung(p.x, p.z, yaw, ab.pos.x, ab.pos.z));
      }
      for (const [id, m] of markers) {
        if (!lebende.has(id)) {
          m.wrap.remove();
          markers.delete(id);
        }
      }
    },
    setVisible: (next) => {
      visible = next;
      root.hidden = !next;
    },
    dispose: () => {
      root.remove();
    },
  };
}
