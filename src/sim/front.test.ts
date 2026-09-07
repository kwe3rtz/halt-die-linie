import { describe, expect, it, vi } from "vitest";
import {
  createFrontState,
  updateFront,
  type LinienFront,
  type FrontKontext,
} from "./front";
import { spawnEnemy, damageEnemy, type EnemyEntity } from "./enemies";
import type { FrontLinie } from "./sektor";
import { linieninfanterie } from "../data/gegner";

const DT = 1 / 60;

// Minimal-Linie "front", Bounds x[-8,8] z[10,18], eine Bresche bei (0,16).
// Genug für die Zustandsmaschine — die Sim-Integration testet sektor.test.ts.
function linie(): FrontLinie {
  return {
    id: "front",
    bounds: { minX: -8, minY: -6, minZ: 10, maxX: 8, maxY: 10, maxZ: 18 },
    parapetBreschen: [{ x: 0, y: -0.4, z: 16 }],
    bauSlots: [],
    depot: { x: 0, y: 0, z: 12 },
    zielKnoten: "front-front",
    reinfKnoten: "reinforcement-front",
    hintenKanten: [],
  };
}

function gegner(x: number, z: number, id = 1): EnemyEntity {
  return spawnEnemy(linieninfanterie, id, { x, y: 0, z }, 1, "front");
}

interface Lauf {
  enemies?: readonly EnemyEntity[];
  spieler?: readonly { x: number; y: number; z: number }[];
  onVerloren?: (id: string) => void;
}

function laufe(f: LinienFront, ticks: number, over: Lauf = {}): void {
  const ctx: FrontKontext = {
    enemies: over.enemies ?? [],
    linie: linie(),
    spielerPositionen: over.spieler ?? [],
    onVerloren: over.onVerloren ?? (() => undefined),
  };
  for (let i = 0; i < ticks; i += 1) {
    updateFront(f, ctx, DT);
  }
}

describe("front — createFrontState", () => {
  it("legt die Linie stabil mit heilen Breschen an", () => {
    const f = createFrontState(linie());
    expect(f.id).toBe("front");
    expect(f.zustand).toBe("stabil");
    expect(f.druck).toBe(0);
    expect(f.depotVerloren).toBe(false);
    expect(f.breschen).toHaveLength(1);
    expect(f.breschen[0]?.offen).toBe(false);
    expect(f.breschen[0]?.hp).toBeGreaterThan(0);
  });

  it("brescheHpFaktor > 1 befestigt die Linie (Home-Line)", () => {
    const normal = createFrontState(linie());
    const fest = createFrontState(linie(), 2.5);
    expect(fest.breschen[0]?.hp ?? 0).toBeGreaterThan(
      normal.breschen[0]?.hp ?? 9,
    );
  });
});

describe("front — Bresche", () => {
  it("ungehalten reißt der Feind die Bresche auf", () => {
    const f = createFrontState(linie());
    const start = f.breschen[0]?.hp ?? 0;
    laufe(f, 60, { enemies: [gegner(0, 16)] });
    expect(f.breschen[0]?.hp).toBeLessThan(start);
    expect(f.breschen[0]?.offen).toBe(false);
    laufe(f, 600, { enemies: [gegner(0, 16)] });
    expect(f.breschen[0]?.hp).toBe(0);
    expect(f.breschen[0]?.offen).toBe(true);
  });

  it("steht ein Spieler an der Bresche, hält sie", () => {
    const f = createFrontState(linie());
    const start = f.breschen[0]?.hp ?? 0;
    laufe(f, 900, {
      enemies: [gegner(0, 16)],
      spieler: [{ x: 0, y: 0, z: 16 }],
    });
    expect(f.breschen[0]?.hp).toBe(start);
    expect(f.breschen[0]?.offen).toBe(false);
  });

  it("mehr Gegner reißen die Bresche schneller auf", () => {
    const einer = createFrontState(linie());
    laufe(einer, 120, { enemies: [gegner(0, 16, 1)] });
    const drei = createFrontState(linie());
    laufe(drei, 120, {
      enemies: [gegner(0, 16, 1), gegner(0.5, 16, 2), gegner(-0.5, 16, 3)],
    });
    expect(drei.breschen[0]?.hp ?? 9).toBeLessThan(einer.breschen[0]?.hp ?? 0);
  });

  it("tote Gegner an der Bresche zählen nicht", () => {
    const f = createFrontState(linie());
    const leiche = gegner(0, 16);
    damageEnemy(leiche, 999, 0);
    const start = f.breschen[0]?.hp ?? 0;
    laufe(f, 300, { enemies: [leiche] });
    expect(f.breschen[0]?.hp).toBe(start);
  });
});

describe("front — Druck", () => {
  it("steigt mit Gegnern an der Linie, fällt ohne", () => {
    const f = createFrontState(linie());
    // (0,11): an der Linie, aber außerhalb des Bresche-Radius.
    laufe(f, 120, { enemies: [gegner(0, 11)] });
    const hoch = f.druck;
    expect(hoch).toBeGreaterThan(0);
    laufe(f, 600);
    expect(f.druck).toBe(0);
    expect(f.druck).toBeLessThan(hoch);
  });

  it("ein Gegner weit weg erzeugt keinen Druck", () => {
    const f = createFrontState(linie());
    laufe(f, 300, { enemies: [gegner(40, 40)] });
    expect(f.druck).toBe(0);
    expect(f.zustand).toBe("stabil");
  });
});

describe("front — Zustandsmaschine", () => {
  it("stabil → bedraengt über die Druck-Schwelle", () => {
    const f = createFrontState(linie());
    laufe(f, 60, { enemies: [gegner(0, 11)] });
    expect(f.zustand).toBe("stabil"); // noch unter der Schwelle
    laufe(f, 300, { enemies: [gegner(0, 11)] });
    expect(f.zustand).toBe("bedraengt");
    expect(f.breschen[0]?.offen).toBe(false);
  });

  it("stabil → bedraengt allein durch eine offene Bresche (Druck egal)", () => {
    const f = createFrontState(linie());
    const b = f.breschen[0];
    if (b) {
      b.offen = true;
      b.hp = 0;
    }
    laufe(f, 1); // ein Tick, keine Gegner, kein Druck
    expect(f.druck).toBe(0);
    expect(f.zustand).toBe("bedraengt");
  });

  it("bedraengt → gebrochen: offene Bresche + Feinddruck + ungehalten für T", () => {
    const f = createFrontState(linie());
    f.zustand = "bedraengt";
    f.breschen[0]!.offen = true;
    f.breschen[0]!.hp = 0;
    // 3 s: noch nicht.
    laufe(f, 180, { enemies: [gegner(0, 12)] });
    expect(f.zustand).toBe("bedraengt");
    // insgesamt > 5 s.
    laufe(f, 180, { enemies: [gegner(0, 12)] });
    expect(f.zustand).toBe("gebrochen");
  });

  it("gebrochen hält nicht an, wenn ein Spieler die Linie hält", () => {
    const f = createFrontState(linie());
    f.zustand = "bedraengt";
    f.breschen[0]!.offen = true;
    f.breschen[0]!.hp = 0;
    laufe(f, 900, {
      enemies: [gegner(0, 12)],
      spieler: [{ x: 0, y: 0, z: 13 }],
    });
    expect(f.zustand).toBe("bedraengt");
  });

  it("gebrochen → verloren nach T2 ungehalten; onVerloren einmal mit der Id", () => {
    const f = createFrontState(linie());
    f.zustand = "gebrochen";
    f.breschen[0]!.offen = true;
    f.breschen[0]!.hp = 0;
    const onVerloren = vi.fn();
    laufe(f, 240, { enemies: [gegner(0, 12)], onVerloren });
    expect(f.zustand).toBe("gebrochen");
    laufe(f, 240, { enemies: [gegner(0, 12)], onVerloren });
    expect(f.zustand).toBe("verloren");
    expect(f.depotVerloren).toBe(true);
    expect(onVerloren).toHaveBeenCalledTimes(1);
    expect(onVerloren).toHaveBeenCalledWith("front");
    // bleibt terminal — kein weiterer Callback, kein Selbst-Zurückflip.
    laufe(f, 3000, { onVerloren });
    expect(f.zustand).toBe("verloren");
    expect(onVerloren).toHaveBeenCalledTimes(1);
  });

  it("gebrochen → verloren auch ohne Feind, sobald ungehalten (Ticket-Wortlaut)", () => {
    const f = createFrontState(linie());
    f.zustand = "gebrochen";
    f.breschen[0]!.offen = true;
    f.breschen[0]!.hp = 0;
    laufe(f, 600); // keine Gegner, kein Spieler
    expect(f.zustand).toBe("verloren");
  });
});

describe("front — Erholung", () => {
  it("bedraengt (nur Druck) erholt sich ohne Gegner zu stabil", () => {
    const f = createFrontState(linie());
    laufe(f, 360, { enemies: [gegner(0, 11)] });
    expect(f.zustand).toBe("bedraengt");
    laufe(f, 600); // > T3 Ruhe
    expect(f.zustand).toBe("stabil");
    expect(f.druck).toBe(0);
  });

  it("keine Erholung, solange eine Bresche offen ist", () => {
    const f = createFrontState(linie());
    f.zustand = "gebrochen";
    f.breschen[0]!.offen = true;
    f.breschen[0]!.hp = 0;
    // gehalten (kein verloren-Fortschritt), keine Gegner — aber Bresche offen.
    laufe(f, 900, { spieler: [{ x: 0, y: 0, z: 13 }] });
    expect(f.zustand).toBe("gebrochen");
    expect(f.ruheTimer).toBe(0);
  });

  it("nie aus verloren heraus", () => {
    const f = createFrontState(linie());
    f.zustand = "verloren";
    f.depotVerloren = true;
    laufe(f, 6000);
    expect(f.zustand).toBe("verloren");
  });
});

describe("front — Determinismus", () => {
  it("gleiche Eingaben → gleicher Verlauf", () => {
    const run = (): string => {
      const f = createFrontState(linie());
      for (let i = 0; i < 800; i += 1) {
        const enemies = i < 400 ? [gegner(0, 16, 1), gegner(1, 14, 2)] : [];
        const spieler = i > 600 ? [{ x: 0, y: 0, z: 13 }] : [];
        updateFront(
          f,
          {
            enemies,
            linie: linie(),
            spielerPositionen: spieler,
            onVerloren: () => undefined,
          },
          DT,
        );
      }
      return JSON.stringify(f);
    };
    expect(run()).toBe(run());
  });
});
