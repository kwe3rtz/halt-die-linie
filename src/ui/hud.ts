// Minimales HUD: reines DOM + CSS über dem Canvas (kein Babylon-GUI), getrennt
// vom F3-Debug-Overlay. Bekommt den Sim-State pro Frame übergeben (`update`),
// pollt nichts selbst. Sichtbar auch bei aktivem Pointer-Lock.
import type { SimState, WavePhase } from "../sim";

export interface HudData {
  hp: number;
  maxHp: number;
  tot: boolean;
  respawnRest: number;
  weapon: { imLauf: number; reserve: number; reloading: boolean };
  wave: SimState["wave"];
  nachschub: number;
}

export interface Hud {
  update(data: HudData): void;
  dispose(): void;
}

const STYLE_ID = "hdl-hud-style";

// z-index knapp unter dem Debug-Overlay (2147483647), damit F3 obendrauf liegt.
const CSS = `
.hdl-hud {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  user-select: none;
  font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #e6ece0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}
.hdl-hud__panel {
  position: absolute;
  padding: 7px 10px;
  background: rgba(16, 18, 15, 0.55);
  border: 1px solid rgba(216, 226, 208, 0.14);
  border-radius: 4px;
}
.hdl-hud__hp { left: 14px; bottom: 14px; width: 190px; }
.hdl-hud__ammo { right: 14px; bottom: 14px; text-align: right; min-width: 96px; }
.hdl-hud__wave { left: 50%; top: 12px; transform: translateX(-50%); text-align: center; min-width: 180px; }
.hdl-hud__row { display: flex; justify-content: space-between; gap: 12px; }
.hdl-hud__ammo-count { font-size: 20px; font-variant-numeric: tabular-nums; }
.hdl-hud__reload { color: #e6c66a; font-size: 12px; }
.hdl-hud__bar {
  height: 7px;
  margin-top: 5px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 2px;
  overflow: hidden;
}
.hdl-hud__bar > span { display: block; height: 100%; width: 0; }
.hdl-hud__bar--ak { height: 4px; }
.hdl-hud__death {
  position: absolute;
  inset: 0;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(8, 6, 6, 0.35);
}
.hdl-hud__death--on { display: flex; }
.hdl-hud__death-title { font-size: 30px; letter-spacing: 0.08em; }
.hdl-hud__death-sub { font-size: 15px; opacity: 0.85; }
@media (prefers-reduced-motion: no-preference) {
  .hdl-hud__bar > span { transition: width 120ms linear; }
}
`;

const PHASE_LABEL: Record<WavePhase, string> = {
  aufbau: "Aufbau",
  welle: "Angriff",
  pause: "Sammeln",
  vorbei: "Angriff gebrochen",
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

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function createHud(parent: HTMLElement = document.body): Hud {
  const doc = parent.ownerDocument;
  ensureStyle(doc);

  const el = (tag: string, cls = ""): HTMLElement => {
    const node = doc.createElement(tag);
    if (cls) {
      node.className = cls;
    }
    return node;
  };

  const root = el("div", "hdl-hud");
  root.setAttribute("aria-hidden", "true");

  // HP
  const hpPanel = el("div", "hdl-hud__panel hdl-hud__hp");
  const hpRow = el("div", "hdl-hud__row");
  const hpLabel = el("span");
  hpLabel.textContent = "HP";
  const hpText = el("span");
  hpRow.append(hpLabel, hpText);
  const hpBar = el("div", "hdl-hud__bar");
  const hpFill = el("span");
  hpBar.append(hpFill);
  hpPanel.append(hpRow, hpBar);

  // Munition
  const ammoPanel = el("div", "hdl-hud__panel hdl-hud__ammo");
  const ammoCount = el("div", "hdl-hud__ammo-count");
  const ammoReload = el("div", "hdl-hud__reload");
  ammoReload.textContent = "Nachladen…";
  ammoReload.hidden = true;
  ammoPanel.append(ammoCount, ammoReload);

  // Welle + Nachschub
  const wavePanel = el("div", "hdl-hud__panel hdl-hud__wave");
  const waveText = el("div");
  const akBar = el("div", "hdl-hud__bar hdl-hud__bar--ak");
  const akFill = el("span");
  akBar.append(akFill);
  const nachschubText = el("div");
  wavePanel.append(waveText, akBar, nachschubText);

  // Tod-Overlay
  const death = el("div", "hdl-hud__death");
  const deathTitle = el("div", "hdl-hud__death-title");
  deathTitle.textContent = "Gefallen";
  const deathSub = el("div", "hdl-hud__death-sub");
  death.append(deathTitle, deathSub);

  root.append(hpPanel, ammoPanel, wavePanel, death);
  parent.appendChild(root);

  return {
    update: (data) => {
      const hpRatio = data.maxHp > 0 ? clamp01(data.hp / data.maxHp) : 0;
      hpText.textContent = `${Math.ceil(data.hp)} / ${data.maxHp}`;
      hpFill.style.width = `${hpRatio * 100}%`;
      hpFill.style.background = `rgb(${Math.round(200 - hpRatio * 130)}, ${Math.round(60 + hpRatio * 110)}, 70)`;

      ammoCount.textContent = `${data.weapon.imLauf} / ${data.weapon.reserve}`;
      ammoReload.hidden = !data.weapon.reloading;

      const w = data.wave;
      waveText.textContent =
        w.phase === "aufbau" || w.phase === "vorbei"
          ? PHASE_LABEL[w.phase]
          : `Welle ${w.welle} · ${PHASE_LABEL[w.phase]}`;
      const akRatio =
        w.angriffskraftMax > 0
          ? clamp01(w.angriffskraftRest / w.angriffskraftMax)
          : 0;
      akFill.style.width = `${akRatio * 100}%`;
      akFill.style.background = "#b6402f";
      nachschubText.textContent = `Nachschub ${data.nachschub}`;

      death.classList.toggle("hdl-hud__death--on", data.tot);
      if (data.tot) {
        deathSub.textContent = `Respawn in ${Math.max(0, Math.ceil(data.respawnRest))} s`;
      }
    },
    dispose: () => {
      root.remove();
    },
  };
}
