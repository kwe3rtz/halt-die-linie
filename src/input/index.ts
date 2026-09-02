// Input-Layer: übersetzt Tastatur- und Maus-Ereignisse in ein pro Frame
// abgeholtes, JSON-serialisierbares Kommando-Objekt für die Sim.
//
// Der Kommando-Typ ist Teil der öffentlichen Sim-Schnittstelle (die goldene
// Regel: die Sim bekommt alles übergeben) und lebt daher in `src/sim`. Dieser
// Layer erzeugt nur Werte, die diesem Vertrag entsprechen.
import type { InputCommand } from "../sim";

export type { InputCommand } from "../sim";

/** Über Tasten steuerbare Aktionen (Maustasten sind separat, siehe unten). */
export type InputAction =
  | "moveForward"
  | "moveBack"
  | "moveLeft"
  | "moveRight"
  | "sprint"
  | "interact"
  | "ability"
  | "jump";

/** Aktion → `KeyboardEvent.code`. Datengetrieben, zur Laufzeit umbelegbar. */
export type KeyBindings = Record<InputAction, string>;

export const defaultBindings: KeyBindings = {
  moveForward: "KeyW",
  moveBack: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  sprint: "ShiftLeft",
  interact: "KeyE",
  ability: "KeyQ",
  jump: "Space",
};

/**
 * Maustasten sind fest verdrahtet (nicht per `code` umbelegbar):
 * linke Taste = feuern, rechte Taste = zielen.
 */
const MOUSE_BUTTON_FIRE = 0;
const MOUSE_BUTTON_AIM = 2;

export interface Input {
  /** Schnappschuss des aktuellen Zustands; setzt die `look`-Deltas zurück. */
  poll(): InputCommand;
  /** Belegt eine Aktion auf einen anderen `KeyboardEvent.code`. */
  setBinding(action: InputAction, code: string): void;
  /** Entfernt alle Event-Listener. */
  dispose(): void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param target Element, das den Pointer-Lock hält und Maus-Ereignisse liefert
 *   (in der Regel das Spiel-`<canvas>`). `move.y > 0` ist vorwärts,
 *   `move.x > 0` ist rechts (lokale Achsen, jeweils -1..1).
 */
export function createInput(target: HTMLElement): Input {
  const bindings: KeyBindings = { ...defaultBindings };

  const pressedKeys = new Set<string>();
  const pressedMouseButtons = new Set<number>();
  let lookDx = 0;
  let lookDy = 0;

  const isLocked = () => target.ownerDocument.pointerLockElement === target;

  const onKeyDown = (event: KeyboardEvent) => {
    pressedKeys.add(event.code);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    pressedKeys.delete(event.code);
  };
  const onBlur = () => {
    // Fokusverlust: sonst „klemmt“ eine Taste, deren keyup wir nie sehen.
    pressedKeys.clear();
    pressedMouseButtons.clear();
  };

  const onMouseDown = (event: MouseEvent) => {
    pressedMouseButtons.add(event.button);
  };
  const onMouseUp = (event: MouseEvent) => {
    pressedMouseButtons.delete(event.button);
  };
  const onContextMenu = (event: Event) => {
    // Rechtsklick = zielen, kein Browser-Kontextmenü über dem Canvas.
    event.preventDefault();
  };
  const onMouseMove = (event: MouseEvent) => {
    if (!isLocked()) {
      return;
    }
    lookDx += event.movementX;
    lookDy += event.movementY;
  };
  const onClick = () => {
    if (!isLocked()) {
      target.requestPointerLock();
    }
  };
  const onPointerLockChange = () => {
    if (!isLocked()) {
      // Lock verloren: aufgelaufene Deltas verwerfen, Buttons zurücksetzen.
      lookDx = 0;
      lookDy = 0;
      pressedMouseButtons.clear();
    }
  };

  const win = target.ownerDocument.defaultView ?? window;
  win.addEventListener("keydown", onKeyDown);
  win.addEventListener("keyup", onKeyUp);
  win.addEventListener("blur", onBlur);
  target.addEventListener("mousedown", onMouseDown);
  target.addEventListener("mouseup", onMouseUp);
  target.addEventListener("contextmenu", onContextMenu);
  target.addEventListener("mousemove", onMouseMove);
  target.addEventListener("click", onClick);
  target.ownerDocument.addEventListener(
    "pointerlockchange",
    onPointerLockChange,
  );

  const axis = (negative: InputAction, positive: InputAction): number => {
    const neg = pressedKeys.has(bindings[negative]) ? 1 : 0;
    const pos = pressedKeys.has(bindings[positive]) ? 1 : 0;
    return pos - neg;
  };

  return {
    poll: (): InputCommand => {
      const command: InputCommand = {
        move: {
          x: clamp(axis("moveLeft", "moveRight"), -1, 1),
          y: clamp(axis("moveBack", "moveForward"), -1, 1),
        },
        look: { dx: lookDx, dy: lookDy },
        buttons: {
          fire: pressedMouseButtons.has(MOUSE_BUTTON_FIRE),
          aim: pressedMouseButtons.has(MOUSE_BUTTON_AIM),
          sprint: pressedKeys.has(bindings.sprint),
          interact: pressedKeys.has(bindings.interact),
          ability: pressedKeys.has(bindings.ability),
          jump: pressedKeys.has(bindings.jump),
        },
      };
      lookDx = 0;
      lookDy = 0;
      return command;
    },
    setBinding: (action, code) => {
      bindings[action] = code;
    },
    dispose: () => {
      win.removeEventListener("keydown", onKeyDown);
      win.removeEventListener("keyup", onKeyUp);
      win.removeEventListener("blur", onBlur);
      target.removeEventListener("mousedown", onMouseDown);
      target.removeEventListener("mouseup", onMouseUp);
      target.removeEventListener("contextmenu", onContextMenu);
      target.removeEventListener("mousemove", onMouseMove);
      target.removeEventListener("click", onClick);
      target.ownerDocument.removeEventListener(
        "pointerlockchange",
        onPointerLockChange,
      );
      pressedKeys.clear();
      pressedMouseButtons.clear();
    },
  };
}
