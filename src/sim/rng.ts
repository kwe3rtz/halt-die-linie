export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
};

export function createRng(seed: number): Rng {
  let value = seed >>> 0;

  const next = () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
  };
}
