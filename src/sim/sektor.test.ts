import { describe, expect, it } from "vitest";
import { createSim, type InputCommand } from "./index";
import { abschnittAt, zoneAt, type ZonenId } from "./sektor";
import { sektorGreybox } from "../data/sektor";

const DT = 1 / 60;

function command(parts: Partial<{ x: number; y: number }> = {}): InputCommand {
  return {
    move: { x: parts.x ?? 0, y: parts.y ?? 0 },
    look: { dx: 0, dy: 0 },
    buttons: {
      fire: false,
      aim: false,
      sprint: false,
      interact: false,
      ability: false,
      jump: false,
      reload: false,
    },
  };
}

const p = (x: number, z: number) => ({ x, y: 0, z });

describe("Greybox-Sektor — Wohlgeformtheit", () => {
  const { meta, boxes } = sektorGreybox;

  it("hat Geometrie ohne NaN und mit positiven Ausdehnungen", () => {
    expect(boxes.length).toBeGreaterThan(20);
    for (const b of boxes) {
      for (const n of [
        b.center.x,
        b.center.y,
        b.center.z,
        b.size.x,
        b.size.y,
        b.size.z,
      ]) {
        expect(Number.isFinite(n)).toBe(true);
      }
      expect(b.size.x).toBeGreaterThan(0);
      expect(b.size.y).toBeGreaterThan(0);
      expect(b.size.z).toBeGreaterThan(0);
    }
  });

  it("führt alle sechs Zonen mit gültigen Bounds", () => {
    const ids = meta.zonen.map((z) => z.id).sort();
    expect(ids).toEqual(
      [
        "feindzone",
        "feld",
        "frontlinie",
        "homeline",
        "labyrinth",
        "verbindungsgraben",
      ].sort(),
    );
    for (const z of meta.zonen) {
      expect(z.bounds.maxX).toBeGreaterThan(z.bounds.minX);
      expect(z.bounds.maxZ).toBeGreaterThan(z.bounds.minZ);
    }
  });

  it("hat drei Frontabschnitte A/B/C mit Bresche, Depot und Bau-Slots", () => {
    expect(meta.frontAbschnitte.map((a) => a.id)).toEqual(["A", "B", "C"]);
    for (const a of meta.frontAbschnitte) {
      expect(a.bounds.maxX).toBeGreaterThan(a.bounds.minX);
      expect(a.parapetBreschen.length).toBeGreaterThanOrEqual(1);
      expect(a.bauSlots.length).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(a.depot.x)).toBe(true);
    }
  });

  it("hat Feind-Anmarsch, Home-Zugänge, Landmark und Spieler-Spawns", () => {
    expect(meta.feindAnmarsch.length).toBeGreaterThanOrEqual(1);
    expect(meta.spielerSpawn.length).toBeGreaterThanOrEqual(1);
    const zugaenge = meta.homeZugaenge.map((z) => z.id);
    expect(zugaenge).toContain("verbindungsgraben");
    expect(zugaenge).toContain("feld-links");
    expect(zugaenge).toContain("feld-rechts");
    expect(zoneAt(meta, meta.landmark)).toBe("labyrinth");
  });

  it("LevelData-Spawns spiegeln die Meta wider", () => {
    expect(sektorGreybox.spawnPoints).toBe(meta.spielerSpawn);
    expect(sektorGreybox.enemySpawnPoints).toBe(meta.feindAnmarsch);
  });
});

describe("Greybox-Sektor — zoneAt / abschnittAt", () => {
  const { meta } = sektorGreybox;

  it("zoneAt trifft Stichproben je Zone", () => {
    const proben: [ReturnType<typeof p>, ZonenId | null][] = [
      [p(0, 50), "feindzone"],
      [p(-15, 30), "labyrinth"],
      [p(20, 24), "labyrinth"],
      [p(0, 0), "verbindungsgraben"],
      [p(0, 13), "frontlinie"],
      [p(18, -6), "feld"],
      [p(-18, -8), "feld"],
      [p(0, -28), "homeline"],
      [p(60, 0), null],
    ];
    for (const [pos, erwartet] of proben) {
      expect(zoneAt(meta, pos)).toBe(erwartet);
    }
  });

  it("abschnittAt trifft die Frontabschnitte, sonst null", () => {
    expect(abschnittAt(meta, p(-14, 13))).toBe("A");
    expect(abschnittAt(meta, p(0, 13))).toBe("B");
    expect(abschnittAt(meta, p(16, 13))).toBe("C");
    expect(abschnittAt(meta, p(0, -5))).toBeNull();
    expect(abschnittAt(meta, p(0, 40))).toBeNull();
  });
});

describe("Greybox-Sektor — in der Sim", () => {
  it("createSim nimmt SektorData als LevelData; Spieler steht im Frontgraben", () => {
    const sim = createSim(1, sektorGreybox);
    for (let i = 0; i < 240; i += 1) {
      sim.tick(command(), DT);
    }
    const pl = sim.getState().player;
    // Auf der Grabensohle gelandet (nicht durch den Boden, nicht ausgeworfen).
    expect(pl.pos.y).toBeGreaterThan(-2.2);
    expect(pl.pos.y).toBeLessThan(0.2);
    expect(pl.onGround).toBe(true);
    expect(zoneAt(sektorGreybox.meta, pl.pos)).toBe("frontlinie");
  });

  it("bei einem 900-Tick-Marsch fällt der Spieler nie aus der Welt", () => {
    const sim = createSim(3, sektorGreybox);
    const skript = [
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];
    for (let i = 0; i < 900; i += 1) {
      const s = skript[Math.floor(i / 180) % skript.length] ?? { x: 0, y: 0 };
      sim.tick(command(s), DT);
      const y = sim.getState().player.pos.y;
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeGreaterThan(-3);
    }
  });

  it("der Wave-Director spawnt Gegner an den Anmarschpunkten und sie marschieren an", () => {
    const sim = createSim(1, sektorGreybox, { waves: true });
    for (let i = 0; i < 300; i += 1) {
      sim.tick(command(), DT);
    }
    const nachSpawn = sim.getState().enemies;
    expect(nachSpawn.length).toBeGreaterThan(0);
    // Frisch gespawnt: nahe an einem feindAnmarsch-Punkt (Nordrand).
    for (const e of nachSpawn) {
      const nah = sektorGreybox.meta.feindAnmarsch.some(
        (a) => Math.hypot(e.pos.x - a.x, e.pos.z - a.z) < 6,
      );
      expect(nah || e.pos.z < 48).toBe(true);
    }
    // Nach weiterem Marsch: mindestens ein Gegner ist Richtung Front vorgerückt.
    for (let i = 0; i < 600; i += 1) {
      sim.tick(command(), DT);
    }
    const zMin = Math.min(...sim.getState().enemies.map((e) => e.pos.z));
    expect(zMin).toBeLessThan(44);
  });
});
