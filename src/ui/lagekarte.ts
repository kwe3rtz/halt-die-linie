// Lagekarte (AP4-05): statisches Sektor-Schema mit den Abschnitts-Zuständen —
// Status, **keine** Echtzeit-Navigation. Umschalten mit `M`. Reines DOM + CSS.
// Bekommt den State pro Frame; bei ausgeblendeter Karte ein No-op.
import type { AbschnittZustand, EinsatzErgebnis, EinsatzPhase } from "../sim";

export interface LagekarteData {
  front: readonly { id: string; zustand: AbschnittZustand }[];
  home: readonly { id: string; zustand: AbschnittZustand }[];
  einsatz: { phase: EinsatzPhase; ergebnis: EinsatzErgebnis };
}

export interface Lagekarte {
  update(data: LagekarteData): void;
  toggle(): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

const STYLE_ID = "hdl-lagekarte-style";

const CSS = `
.hdl-lagekarte {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2147483645;
  pointer-events: none;
  user-select: none;
  width: min(420px, 88vw);
  padding: 16px 18px 12px;
  background: rgba(14, 16, 13, 0.9);
  border: 1px solid rgba(216, 226, 208, 0.24);
  border-radius: 6px;
  font: 13px/1.4 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
  color: #e6ece0;
}
.hdl-lagekarte__title {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 10px;
}
.hdl-lagekarte__band { font-size: 10px; opacity: 0.55; text-align: center; margin: 6px 0; letter-spacing: 0.08em; }
.hdl-lagekarte__row { display: flex; gap: 6px; }
.hdl-lagekarte__cell {
  flex: 1;
  padding: 10px 4px;
  text-align: center;
  border-radius: 4px;
  border: 1px solid rgba(216, 226, 208, 0.2);
  background: rgba(60, 64, 54, 0.4);
}
.hdl-lagekarte__cell b { display: block; font-size: 15px; }
.hdl-lagekarte__cell span { font-size: 10px; opacity: 0.85; }
.hdl-lagekarte__cell[data-zustand="stabil"] { border-color: rgba(160, 200, 160, 0.4); }
.hdl-lagekarte__cell[data-zustand="bedraengt"] { background: rgba(150, 110, 40, 0.42); border-color: #e6b23c; }
.hdl-lagekarte__cell[data-zustand="gebrochen"] { background: rgba(160, 80, 40, 0.45); border-color: #e07b3c; }
.hdl-lagekarte__cell[data-zustand="verloren"] { background: rgba(150, 45, 40, 0.5); border-color: #d1483a; }
.hdl-lagekarte__foot { margin-top: 10px; font-size: 11px; opacity: 0.8; text-align: center; }
.hdl-lagekarte__hint { margin-top: 4px; font-size: 10px; opacity: 0.5; text-align: center; }
`;

const ZUSTAND_LABEL: Record<AbschnittZustand, string> = {
  stabil: "stabil",
  bedraengt: "bedrängt",
  gebrochen: "gebrochen",
  verloren: "verloren",
};

const PHASE_LABEL: Record<EinsatzPhase, string> = {
  aufbau: "Aufbau",
  wellen: "Wellenabwehr",
  finale: "Home-Line-Finale",
  vorbei: "Einsatz beendet",
};

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) {
    return;
  }
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

export function createLagekarte(
  parent: HTMLElement = document.body,
): Lagekarte {
  const doc = parent.ownerDocument;
  ensureStyle(doc);

  const el = (tag: string, cls = ""): HTMLElement => {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  const root = el("div", "hdl-lagekarte");
  root.setAttribute("aria-hidden", "true");
  const title = el("div", "hdl-lagekarte__title");
  title.textContent = "Lagekarte — Sektor";
  const frontRow = el("div", "hdl-lagekarte__row hdl-lagekarte__front");
  const band = el("div", "hdl-lagekarte__band");
  band.textContent = "◇ Feld · Verbindungsgraben ◇";
  const homeRow = el("div", "hdl-lagekarte__row hdl-lagekarte__home");
  const foot = el("div", "hdl-lagekarte__foot");
  const hint = el("div", "hdl-lagekarte__hint");
  hint.textContent = "M schließt die Karte";
  root.append(title, frontRow, band, homeRow, foot, hint);
  parent.appendChild(root);

  const zellen = new Map<string, HTMLElement>();

  const syncRow = (
    row: HTMLElement,
    abschnitte: readonly { id: string; zustand: AbschnittZustand }[],
  ): void => {
    const lebende = new Set<string>();
    for (const ab of abschnitte) {
      lebende.add(ab.id);
      let zelle = zellen.get(ab.id);
      if (!zelle) {
        zelle = el("div", "hdl-lagekarte__cell");
        const name = el("b");
        name.textContent = ab.id;
        const lbl = el("span");
        zelle.append(name, lbl);
        zellen.set(ab.id, zelle);
        row.appendChild(zelle);
      }
      zelle.dataset.zustand = ab.zustand;
      const span = zelle.querySelector("span");
      if (span) span.textContent = ZUSTAND_LABEL[ab.zustand];
    }
    for (const [id, zelle] of zellen) {
      if (!lebende.has(id) && zelle.parentElement === row) {
        zelle.remove();
        zellen.delete(id);
      }
    }
  };

  let visible = false;
  const apply = () => {
    root.hidden = !visible;
  };
  apply();

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === "KeyM") {
      event.preventDefault();
      visible = !visible;
      apply();
    }
  };
  const win = doc.defaultView ?? window;
  win.addEventListener("keydown", onKeyDown);

  return {
    update: (data) => {
      if (!visible) {
        return;
      }
      syncRow(frontRow, data.front);
      syncRow(homeRow, data.home);
      const e = data.einsatz;
      foot.textContent =
        e.phase === "vorbei"
          ? `${PHASE_LABEL.vorbei} — ${e.ergebnis === "gewonnen" ? "gewonnen" : "verloren"}`
          : PHASE_LABEL[e.phase];
    },
    toggle: () => {
      visible = !visible;
      apply();
    },
    setVisible: (next) => {
      visible = next;
      apply();
    },
    dispose: () => {
      win.removeEventListener("keydown", onKeyDown);
      root.remove();
    },
  };
}
