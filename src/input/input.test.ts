// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInput, defaultBindings, type Input } from "./index";

function press(code: string): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { code }));
}
function release(code: string): void {
  window.dispatchEvent(new KeyboardEvent("keyup", { code }));
}

// jsdom setzt movementX/movementY nicht aus dem Event-Init — manuell ergänzen.
function mouseMove(target: EventTarget, dx: number, dy: number): void {
  const event = new MouseEvent("mousemove");
  Object.defineProperty(event, "movementX", { value: dx });
  Object.defineProperty(event, "movementY", { value: dy });
  target.dispatchEvent(event);
}

describe("input layer", () => {
  let canvas: HTMLCanvasElement;
  let input: Input;
  let locked: Element | null;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    // jsdom kennt Pointer-Lock nicht — minimal nachbilden.
    locked = null;
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => locked,
    });
    canvas.requestPointerLock = vi.fn(() => {
      locked = canvas;
      document.dispatchEvent(new Event("pointerlockchange"));
    }) as unknown as typeof canvas.requestPointerLock;

    input = createInput(canvas);
  });

  afterEach(() => {
    input.dispose();
    canvas.remove();
  });

  it("reports pressed movement keys as local axes, -1..1", () => {
    press(defaultBindings.moveForward);
    expect(input.poll().move).toEqual({ x: 0, y: 1 });

    press(defaultBindings.moveLeft);
    expect(input.poll().move).toEqual({ x: -1, y: 1 });

    release(defaultBindings.moveForward);
    release(defaultBindings.moveLeft);
    expect(input.poll().move).toEqual({ x: 0, y: 0 });
  });

  it("maps buttons and honours rebinding", () => {
    press(defaultBindings.jump);
    expect(input.poll().buttons.jump).toBe(true);
    release(defaultBindings.jump);

    input.setBinding("jump", "KeyJ");
    press("Space");
    expect(input.poll().buttons.jump).toBe(false);
    press("KeyJ");
    expect(input.poll().buttons.jump).toBe(true);
  });

  it("ignores look movement until pointer lock is active", () => {
    mouseMove(canvas, 10, -4);
    expect(input.poll().look).toEqual({ dx: 0, dy: 0 });

    canvas.dispatchEvent(new MouseEvent("click"));
    expect(canvas.requestPointerLock).toHaveBeenCalled();

    mouseMove(canvas, 10, -4);
    mouseMove(canvas, 5, 2);
    expect(input.poll().look).toEqual({ dx: 15, dy: -2 });

    // Delta ist nach jedem poll() wieder 0.
    expect(input.poll().look).toEqual({ dx: 0, dy: 0 });
  });

  it("produces a plain, JSON-serialisable command", () => {
    const command = input.poll();
    expect(command).toEqual(JSON.parse(JSON.stringify(command)));
  });

  it("removes every listener on dispose", () => {
    input.dispose();
    press(defaultBindings.moveForward);
    expect(input.poll().move).toEqual({ x: 0, y: 0 });
  });
});
