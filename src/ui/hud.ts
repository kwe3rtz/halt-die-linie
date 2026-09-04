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
  /** Einsatzbogen (AP4-04) — Finale-Countdown / Ergebnis. Optional. */
  einsatz?: SimState["einsatz"];
  /** Letzter Schuss (Signal für die Trefferbestätigung). */
  lastShot: SimState["lastShot"];
}

// Sichtbare Dauer der Trefferbestätigung.
const HITMARKER_MS = 120;

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
.hdl-hud__einsatz { margin-top: 4px; color: #e6c66a; font-size: 12px; font-weight: 600; }
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
.hdl-hud__crosshair {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%);
}
.hdl-hud__crosshair::before,
.hdl-hud__crosshair::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  background: rgba(230, 236, 224, 0.82);
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.85);
}
.hdl-hud__crosshair::before { width: 2px; height: 20px; transform: translate(-50%, -50%); }
.hdl-hud__crosshair::after { width: 20px; height: 2px; transform: translate(-50%, -50%); }
.hdl-hud__crosshair--hidden { display: none; }
.hdl-hud__hit {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%) rotate(45deg);
  opacity: 0;
}
.hdl-hud__hit > span {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2px;
  height: 8px;
  margin: -4px 0 0 -1px;
  background: #e9efe1;
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.9);
}
.hdl-hud__hit > span:nth-child(1) { transform: translateY(-9px); }
.hdl-hud__hit > span:nth-child(2) { transform: translateY(9px); }
.hdl-hud__hit > span:nth-child(3) { transform: rotate(90deg) translateY(-9px); }
.hdl-hud__hit > span:nth-child(4) { transform: rotate(90deg) translateY(9px); }
.hdl-hud__hit--on { opacity: 1; }
.hdl-hud__hit--kill > span { background: #ff6a4d; width: 3px; height: 10px; margin: -5px 0 0 -1.5px; }
@media (prefers-reduced-motion: no-preference) {
  .hdl-hud__hit { transition: opacity 90ms linear; }
}
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
  reserve: "Reservewellen",
  vorbei: "Angriff gebrochen",
};

function einsatzText(e: NonNullable<HudData["einsatz"]>): string {
  if (e.phase === "vorbei") {
    return e.ergebnis === "gewonnen" ? "Einsatz gewonnen" : "Einsatz verloren";
  }
  if (e.phase === "finale") {
    return e.ergebnis === "gewonnen"
      ? "Entsatz eingetroffen — E extrahieren · Q verlängern"
      : `Home-Line halten — Entsatz in ${Math.max(0, Math.ceil(e.finaleRest))} s`;
  }
  return "";
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
  const einsatzLine = el("div", "hdl-hud__einsatz");
  einsatzLine.hidden = true;
  wavePanel.append(waveText, akBar, nachschubText, einsatzLine);

  // Fadenkreuz + Trefferbestätigung (exakte Bildmitte)
  const crosshair = el("div", "hdl-hud__crosshair");
  const hit = el("div", "hdl-hud__hit");
  hit.append(el("span"), el("span"), el("span"), el("span"));

  // Tod-Overlay
  const death = el("div", "hdl-hud__death");
  const deathTitle = el("div", "hdl-hud__death-title");
  deathTitle.textContent = "Gefallen";
  const deathSub = el("div", "hdl-hud__death-sub");
  death.append(deathTitle, deathSub);

  root.append(hpPanel, ammoPanel, wavePanel, crosshair, hit, death);
  parent.appendChild(root);

  let hitSeenTick = -1;
  let hitTimer: ReturnType<typeof setTimeout> | undefined;

  const zeigeHitmarker = (toedlich: boolean): void => {
    if (hitTimer !== undefined) {
      clearTimeout(hitTimer);
    }
    hit.classList.add("hdl-hud__hit--on");
    hit.classList.toggle("hdl-hud__hit--kill", toedlich);
    hitTimer = setTimeout(() => {
      hit.classList.remove("hdl-hud__hit--on");
    }, HITMARKER_MS);
  };

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

      const et = data.einsatz ? einsatzText(data.einsatz) : "";
      einsatzLine.hidden = et === "";
      if (et !== "") {
        einsatzLine.textContent = et;
      }

      death.classList.toggle("hdl-hud__death--on", data.tot);
      if (data.tot) {
        deathSub.textContent = `Respawn in ${Math.max(0, Math.ceil(data.respawnRest))} s`;
      }

      // Fadenkreuz verschwindet im Tod (nichts zu zielen).
      crosshair.classList.toggle("hdl-hud__crosshair--hidden", data.tot);

      // Trefferbestätigung: nur bei Gegner-Treffern, jeder Schuss nur einmal.
      const s = data.lastShot;
      if (s && s.gegnerTreffer && s.tick !== hitSeenTick) {
        hitSeenTick = s.tick;
        zeigeHitmarker(s.toedlich);
      }
    },
    dispose: () => {
      if (hitTimer !== undefined) {
        clearTimeout(hitTimer);
      }
      root.remove();
    },
  };
}
