import { describe, expect, it } from "vitest";
import {
  add,
  dirFromYawPitch,
  dot,
  length,
  normalize,
  scale,
  sub,
  vec3,
} from "./math";

describe("math helpers", () => {
  it("vec3 / add / sub / scale", () => {
    expect(vec3(1, 2, 3)).toEqual({ x: 1, y: 2, z: 3 });
    expect(add(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual({ x: 5, y: 7, z: 9 });
    expect(sub(vec3(4, 5, 6), vec3(1, 2, 3))).toEqual({ x: 3, y: 3, z: 3 });
    expect(scale(vec3(1, -2, 3), 2)).toEqual({ x: 2, y: -4, z: 6 });
  });

  it("length / dot", () => {
    expect(length(vec3(3, 4, 0))).toBe(5);
    expect(dot(vec3(1, 2, 3), vec3(4, -5, 6))).toBe(4 - 10 + 18);
  });

  it("normalize", () => {
    expect(normalize(vec3(0, 0, 5))).toEqual({ x: 0, y: 0, z: 1 });
    expect(normalize(vec3(0, 0, 0))).toEqual({ x: 0, y: 0, z: 0 });
    const n = normalize(vec3(3, 4, 0));
    expect(length(n)).toBeCloseTo(1, 10);
  });

  it("dirFromYawPitch", () => {
    const f = dirFromYawPitch(0, 0);
    expect(f.x).toBeCloseTo(0, 10);
    expect(f.z).toBeCloseTo(1, 10);

    const right = dirFromYawPitch(Math.PI / 2, 0);
    expect(right.x).toBeCloseTo(1, 10);
    expect(right.z).toBeCloseTo(0, 10);

    const up = dirFromYawPitch(0, Math.PI / 2);
    expect(up.y).toBeCloseTo(1, 10);

    expect(length(dirFromYawPitch(0.7, -0.3))).toBeCloseTo(1, 10);
  });
});
