import { describe, expect, it, vi } from "vitest";
import {
  createFrontState,
  updateFront,
  type AbschnittFront,
  type FrontKontext,
} from "./front";
import { spawnEnemy, damageEnemy, type EnemyEntity } from "./enemies";
import type { FrontAbschnitt } from "./sektor";
import { linieninfanterie } from "../data/gegner";

const DT = 1 / 60;

// Minimal-Sektor: ein Abschnitt "A", Bounds x[-8,8] z[10,18], eine Bresche bei
// (0,16). Genug für die Zustandsmaschine — die Sim-Integration testet
// sektor.test.ts.
function abschnitte(): FrontAbschnitt[] {
  return [
    {
      id: "A",
      bounds: { minX: -8, minY: -6, minZ: 10, maxX: 8, maxY: 10, maxZ: 18 },
      parapetBreschen: [{ x: 0, y: -0.4, z: 16 }],
      bauSlots: [],
      depot: { x: 0, y: 0, z: 12 },
    },
  ];
}

function gegner(x: number, z: number, id = 1): EnemyEntity {
  return spawnEnemy(linieninfanterie, id, { x, y: 0, z }, 1, "A");
}

interface Lauf {
  enemies?: readonly EnemyEntity[];
  spieler?: readonly { x: number; y: number; z: number }[];
  onVerloren?: (id: string) => void;
}

function laufe(front: AbschnittFront[], ticks: number, over: Lauf = {}): void {
  const ctx: FrontKontext = {
    enemies: over.enemies ?? [],
    abschnitte: abschnitte(),
    spielerPositionen: over.spieler ?? [],
    onVerloren: over.onVerloren ?? (() => undefined),
  };
  for (let i = 0; i < ticks; i += 1) {
    updateFront(front, ctx, DT);
  }
}

describe("front — createFrontState", () => {
  it("legt jeden Abschnitt stabil mit heilen Breschen an", () => {
    const fs = createFrontState(abschnitte());
    expect(fs).toHaveLength(1);
    expect(fs[0]?.zustand).toBe("stabil");
    expect(fs[0]?.druck).toBe(0);
    expect(fs[0]?.depotVerloren).toBe(false);
    expect(fs[0]?.breschen).toHaveLength(1);
    expect(fs[0]?.breschen[0]?.offen).toBe(false);
    expect(fs[0]?.breschen[0]?.hp).toBeGreaterThan(0);
  });
});

describe("front — Bresche", () => {
  it("ungehalten reißt der Feind die Bresche auf", () => {
    const fs = createFrontState(abschnitte());
    const start = fs[0]?.breschen[0]?.hp ?? 0;
    laufe(fs, 60, { enemies: [gegner(0, 16)] });
    expect(fs[0]?.breschen[0]?.hp).toBeLessThan(start);
    expect(fs[0]?.breschen[0]?.offen).toBe(false);
    laufe(fs, 600, { enemies: [gegner(0, 16)] });
    expect(fs[0]?.breschen[0]?.hp).toBe(0);
    expect(fs[0]?.breschen[0]?.offen).toBe(true);
  });

  it("steht ein Spieler an der Bresche, hält sie", () => {
    const fs = createFrontState(abschnitte());
    const start = fs[0]?.breschen[0]?.hp ?? 0;
    laufe(fs, 900, {
      enemies: [gegner(0, 16)],
      spieler: [{ x: 0, y: 0, z: 16 }],
    });
    expect(fs[0]?.breschen[0]?.hp).toBe(start);
    expect(fs[0]?.breschen[0]?.offen).toBe(false);
  });

  it("mehr Gegner reißen die Bresche schneller auf", () => {
    const einer = createFrontState(abschnitte());
    laufe(einer, 120, { enemies: [gegner(0, 16, 1)] });
    const drei = createFrontState(abschnitte());
    laufe(drei, 120, {
      enemies: [gegner(0, 16, 1), gegner(0.5, 16, 2), gegner(-0.5, 16, 3)],
    });
    expect(drei[0]?.breschen[0]?.hp ?? 9).toBeLessThan(
      einer[0]?.breschen[0]?.hp ?? 0,
    );
  });

  it("tote Gegner an der Bresche zählen nicht", () => {
    const fs = createFrontState(abschnitte());
    const leiche = gegner(0, 16);
    damageEnemy(leiche, 999, 0);
    const start = fs[0]?.breschen[0]?.hp ?? 0;
    laufe(fs, 300, { enemies: [leiche] });
    expect(fs[0]?.breschen[0]?.hp).toBe(start);
  });
});

describe("front — Druck", () => {
  it("steigt mit Gegnern im Abschnitt, fällt ohne", () => {
    const fs = createFrontState(abschnitte());
    // (0,11): im Abschnitt, aber außerhalb des Bresche-Radius.
    laufe(fs, 120, { enemies: [gegner(0, 11)] });
    const hoch = fs[0]?.druck ?? 0;
    expect(hoch).toBeGreaterThan(0);
    laufe(fs, 600);
    expect(fs[0]?.druck).toBe(0);
    expect(fs[0]?.druck).toBeLessThan(hoch);
  });

  it("ein Gegner weit weg erzeugt keinen Druck", () => {
    const fs = createFrontState(abschnitte());
    laufe(fs, 300, { enemies: [gegner(40, 40)] });
    expect(fs[0]?.druck).toBe(0);
    expect(fs[0]?.zustand).toBe("stabil");
  });
});

describe("front — Zustandsmaschine", () => {
  it("stabil → bedraengt über die Druck-Schwelle", () => {
    const fs = createFrontState(abschnitte());
    laufe(fs, 60, { enemies: [gegner(0, 11)] });
    expect(fs[0]?.zustand).toBe("stabil"); // noch unter der Schwelle
    laufe(fs, 300, { enemies: [gegner(0, 11)] });
    expect(fs[0]?.zustand).toBe("bedraengt");
    expect(fs[0]?.breschen[0]?.offen).toBe(false);
  });

  it("stabil → bedraengt allein durch eine offene Bresche (Druck egal)", () => {
    const fs = createFrontState(abschnitte());
    const b = fs[0]?.breschen[0];
    if (b) {
      b.offen = true;
      b.hp = 0;
    }
    laufe(fs, 1); // ein Tick, keine Gegner, kein Druck
    expect(fs[0]?.druck).toBe(0);
    expect(fs[0]?.zustand).toBe("bedraengt");
  });

  it("bedraengt → gebrochen: offene Bresche + Feinddruck + ungehalten für T", () => {
    const fs = createFrontState(abschnitte());
    const f = fs[0];
    if (f) {
      f.zustand = "bedraengt";
      f.breschen[0]!.offen = true;
      f.breschen[0]!.hp = 0;
    }
    // 3 s: noch nicht.
    laufe(fs, 180, { enemies: [gegner(0, 12)] });
    expect(fs[0]?.zustand).toBe("bedraengt");
    // insgesamt > 5 s.
    laufe(fs, 180, { enemies: [gegner(0, 12)] });
    expect(fs[0]?.zustand).toBe("gebrochen");
  });

  it("gebrochen hält nicht an, wenn ein Spieler den Abschnitt hält", () => {
    const fs = createFrontState(abschnitte());
    const f = fs[0];
    if (f) {
      f.zustand = "bedraengt";
      f.breschen[0]!.offen = true;
      f.breschen[0]!.hp = 0;
    }
    laufe(fs, 900, {
      enemies: [gegner(0, 12)],
      spieler: [{ x: 0, y: 0, z: 13 }],
    });
    expect(fs[0]?.zustand).toBe("bedraengt");
  });

  it("gebrochen → verloren nach T2 ungehalten; onVerloren einmal mit der Id", () => {
    const fs = createFrontState(abschnitte());
    const f = fs[0];
    if (f) {
      f.zustand = "gebrochen";
      f.breschen[0]!.offen = true;
      f.breschen[0]!.hp = 0;
    }
    const onVerloren = vi.fn();
    laufe(fs, 240, { enemies: [gegner(0, 12)], onVerloren });
    expect(fs[0]?.zustand).toBe("gebrochen");
    laufe(fs, 240, { enemies: [gegner(0, 12)], onVerloren });
    expect(fs[0]?.zustand).toBe("verloren");
    expect(fs[0]?.depotVerloren).toBe(true);
    expect(onVerloren).toHaveBeenCalledTimes(1);
    expect(onVerloren).toHaveBeenCalledWith("A");
    // bleibt terminal — kein weiterer Callback, kein Selbst-Zurückflip.
    laufe(fs, 3000, { onVerloren });
    expect(fs[0]?.zustand).toBe("verloren");
    expect(onVerloren).toHaveBeenCalledTimes(1);
  });

  it("gebrochen → verloren auch ohne Feind, sobald ungehalten (Ticket-Wortlaut)", () => {
    const fs = createFrontState(abschnitte());
    const f = fs[0];
    if (f) {
      f.zustand = "gebrochen";
      f.breschen[0]!.offen = true;
      f.breschen[0]!.hp = 0;
    }
    laufe(fs, 600); // keine Gegner, kein Spieler
    expect(fs[0]?.zustand).toBe("verloren");
  });
});

describe("front — Erholung", () => {
  it("bedraengt (nur Druck) erholt sich ohne Gegner zu stabil", () => {
    const fs = createFrontState(abschnitte());
    laufe(fs, 360, { enemies: [gegner(0, 11)] });
    expect(fs[0]?.zustand).toBe("bedraengt");
    laufe(fs, 600); // > T3 Ruhe
    expect(fs[0]?.zustand).toBe("stabil");
    expect(fs[0]?.druck).toBe(0);
  });

  it("keine Erholung, solange eine Bresche offen ist", () => {
    const fs = createFrontState(abschnitte());
    const f = fs[0];
    if (f) {
      f.zustand = "gebrochen";
      f.breschen[0]!.offen = true;
      f.breschen[0]!.hp = 0;
    }
    // gehalten (kein verloren-Fortschritt), keine Gegner — aber Bresche offen.
    laufe(fs, 900, { spieler: [{ x: 0, y: 0, z: 13 }] });
    expect(fs[0]?.zustand).toBe("gebrochen");
    expect(fs[0]?.ruheTimer).toBe(0);
  });

  it("nie aus verloren heraus", () => {
    const fs = createFrontState(abschnitte());
    const f = fs[0];
    if (f) {
      f.zustand = "verloren";
      f.depotVerloren = true;
    }
    laufe(fs, 6000);
    expect(fs[0]?.zustand).toBe("verloren");
  });
});

describe("front — Determinismus", () => {
  it("gleiche Eingaben → gleicher Verlauf", () => {
    const run = (): string => {
      const fs = createFrontState(abschnitte());
      for (let i = 0; i < 800; i += 1) {
        const enemies = i < 400 ? [gegner(0, 16, 1), gegner(1, 14, 2)] : [];
        const spieler = i > 600 ? [{ x: 0, y: 0, z: 13 }] : [];
        updateFront(
          fs,
          {
            enemies,
            abschnitte: abschnitte(),
            spielerPositionen: spieler,
            onVerloren: () => undefined,
          },
          DT,
        );
      }
      return JSON.stringify(fs);
    };
    expect(run()).toBe(run());
  });
});
