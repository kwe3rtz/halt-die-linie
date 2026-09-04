// Entwickler-Overlay: reines DOM + CSS über dem Canvas (kein Babylon-GUI).
// Bekommt seine Werte pro Frame übergeben (`update`), pollt nichts selbst.
// Umschalten mit F3.
import type { InputCommand, SimState } from "../sim";

export interface DebugData {
  simTick: number;
  fps: number;
  player: Readonly<SimState["player"]>;
  command: InputCommand;
  /** Lebende Gegner im Sektor (AP5-04 — Messgröße für den Wellen-Druck). */
  lebendeGegner: number;
}

export interface DebugOverlay {
  /** Pro Frame aufrufen. Bei ausgeblendetem Overlay ein No-op. */
  update(data: DebugData): void;
  setVisible(visible: boolean): void;
  toggle(): void;
  dispose(): void;
}

const STYLE_ID = "hdl-debug-style";

const CSS = `
.hdl-debug {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 2147483647;
  margin: 0;
  padding: 6px 9px;
  font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre;
  color: #d8e2d0;
  background: rgba(16, 18, 15, 0.72);
  border: 1px solid rgba(216, 226, 208, 0.18);
  border-radius: 4px;
  pointer-events: none;
  user-select: none;
}
`;

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) {
    return;
  }
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

function round(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function heldButtons(buttons: InputCommand["buttons"]): string {
  const held = Object.entries(buttons)
    .filter(([, on]) => on)
    .map(([name]) => name);
  return held.length > 0 ? held.join(" ") : "–";
}

export function createDebugOverlay(
  parent: HTMLElement = document.body,
): DebugOverlay {
  const doc = parent.ownerDocument;
  ensureStyle(doc);

  const el = doc.createElement("div");
  el.className = "hdl-debug";
  el.setAttribute("aria-hidden", "true"); // rein informativ, kein Screenreader-Ziel
  parent.appendChild(el);

  let visible = true;
  const apply = () => {
    el.hidden = !visible;
  };
  apply();

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === "F3") {
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
      const p = data.player;
      el.textContent = [
        `tick    ${data.simTick}`,
        `fps     ${round(data.fps, 0)}`,
        `pos     ${round(p.pos.x)} ${round(p.pos.y)} ${round(p.pos.z)}`,
        `yaw/pit ${round(p.yaw)} / ${round(p.pitch)}`,
        `ground  ${p.onGround ? "ja" : "nein"}`,
        `gegner  ${data.lebendeGegner} lebend`,
        `move    ${round(data.command.move.x, 1)} ${round(data.command.move.y, 1)}`,
        `look    ${round(data.command.look.dx, 0)} ${round(data.command.look.dy, 0)}`,
        `btn     ${heldButtons(data.command.buttons)}`,
      ].join("\n");
    },
    setVisible: (next) => {
      visible = next;
      apply();
    },
    toggle: () => {
      visible = !visible;
      apply();
    },
    dispose: () => {
      win.removeEventListener("keydown", onKeyDown);
      el.remove();
    },
  };
}
