import { describe, expect, it } from "vitest";
import { createSim, type InputCommand } from "./index";
import { createCollisionWorld, moveCapsule } from "./collision";
import {
  frontLinieAt,
  inBoundsXZ,
  naechstesDepot,
  pruefeSektorMeta,
  zoneAt,
  DEPOT_REICHWEITE,
  type SektorMeta,
  type ZonenId,
} from "./sektor";
import { standardWaffe } from "../data/waffen";
import { kuerzesterPfad } from "./navgraph";
import { sektorGreybox } from "../data/sektor";

const DT = 1 / 60;

function command(
  parts: Partial<{
    x: number;
    y: number;
    fire: boolean;
    dx: number;
    interact: boolean;
    ability: boolean;
  }> = {},
): InputCommand {
  return {
    move: { x: parts.x ?? 0, y: parts.y ?? 0 },
    look: { dx: parts.dx ?? 0, dy: 0 },
    buttons: {
      fire: parts.fire ?? false,
      aim: false,
      sprint: false,
      interact: parts.interact ?? false,
      ability: parts.ability ?? false,
      jump: false,
      reload: false,
    },
  };
}

const p = (x: number, z: number) => ({ x, y: 0, z });

describe("Nacht-Sektor — Wohlgeformtheit", () => {
  const { meta, boxes } = sektorGreybox;

  it("hat Geometrie ohne NaN und mit positiven Ausdehnungen", () => {
    expect(boxes.length).toBeGreaterThan(40);
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

  it("führt die fünf Zonen als lückenlose Z-Bänder mit gültigen Bounds", () => {
    expect(meta.zonen.map((z) => z.id).sort()).toEqual(
      [
        "feindseite",
        "frontlinie",
        "hinterland",
        "homeline",
        "niemandsland",
      ].sort(),
    );
    for (const z of meta.zonen) {
      expect(z.bounds.maxX).toBeGreaterThan(z.bounds.minX);
      expect(z.bounds.maxZ).toBeGreaterThan(z.bounds.minZ);
    }
    // Lückenlos von der Home-Line bis zur Feindseite (Bänder stoßen aneinander).
    const nachZ = [...meta.zonen].sort((a, b) => a.bounds.minZ - b.bounds.minZ);
    for (let i = 1; i < nachZ.length; i += 1) {
      expect(nachZ[i]!.bounds.minZ).toBeCloseTo(nachZ[i - 1]!.bounds.maxZ, 3);
    }
  });

  it("hat GENAU eine Frontlinie und eine Home-Line, je mit Bresche, Depot, Bau-Slot, Rollen-Feldern", () => {
    expect(meta.frontLinie.id).toBe("front");
    expect(meta.homeLinie.id).toBe("home");
    for (const a of [meta.frontLinie, meta.homeLinie]) {
      expect(a.bounds.maxX).toBeGreaterThan(a.bounds.minX);
      expect(a.parapetBreschen.length).toBeGreaterThanOrEqual(1);
      expect(a.bauSlots.length).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(a.depot.x)).toBe(true);
      // Ziel-Nav-Knoten existiert im Graphen (Rollen-Feld, Audit H2).
      expect(meta.navGraph.knoten.some((k) => k.id === a.zielKnoten)).toBe(
        true,
      );
    }
    // Die Frontlinie trägt Bresche-Zugang, Reinf-Knoten und drei Rückwege.
    expect(meta.frontLinie.brescheZugang?.bresche).toBe("bresche-front");
    expect(meta.frontLinie.reinfKnoten).toBe("reinforcement-front");
    expect(meta.frontLinie.hintenKanten.length).toBe(3);
    // Die Home-Line hat keinen Weg dahinter.
    expect(meta.homeLinie.hintenKanten).toEqual([]);
    expect(meta.homeLinie.reinfKnoten).toBe("");
  });

  it("hat Feind-Anmarsch, Home-Zugänge, Landmark, Instand-Punkte und Spieler-Spawns", () => {
    expect(meta.feindAnmarsch.length).toBeGreaterThanOrEqual(2);
    expect(meta.spielerSpawn.length).toBeGreaterThanOrEqual(1);
    expect(meta.homeZugaenge.length).toBeGreaterThanOrEqual(1);
    expect(meta.instandPunkte.map((i) => i.linie).sort()).toEqual([
      "front",
      "home",
    ]);
    expect(meta.lichter.length).toBeGreaterThanOrEqual(3);
    expect(meta.spineRouten).toEqual([]);
    expect(zoneAt(meta, meta.landmark)).toBe("niemandsland");
  });

  it("LevelData-Spawns spiegeln die Meta wider", () => {
    expect(sektorGreybox.spawnPoints).toBe(meta.spielerSpawn);
    expect(sektorGreybox.enemySpawnPoints).toBe(meta.feindAnmarsch);
  });

  it("hat einen wohlgeformten, deutlich größeren Nav-Graphen (AP4-02)", () => {
    const g = meta.navGraph;
    expect(g.knoten.length).toBeGreaterThan(30);
    const ids = new Set(g.knoten.map((k) => k.id));
    expect(ids.size).toBe(g.knoten.length); // eindeutige Ids
    for (const k of g.kanten) {
      expect(ids.has(k.von)).toBe(true);
      expect(ids.has(k.nach)).toBe(true);
    }
    for (const id of [
      "spawn-w",
      "spawn-m",
      "spawn-e",
      "vorfront",
      "front-front",
      "bresche-front",
      "reinforcement-front",
      "parados-m",
      "home-ziel",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
    // Der Verstärkungs-Knoten liegt nie im Hinterland (Infiltration-Regel).
    for (const k of g.knoten) {
      if (k.id.startsWith("reinforcement-")) {
        expect(k.zone).not.toBe("hinterland");
      }
    }
  });

  it("Nav: jeder Spawn erreicht die Frontlinie; die Front hält vor einem Durchbruch dicht", () => {
    const g = meta.navGraph;
    for (const start of ["spawn-w", "spawn-m", "spawn-e"]) {
      expect(kuerzesterPfad(g, start, "front-front").length).toBeGreaterThan(0);
    }
    // Vor einem Durchbruch führt kein offener Weg von der Front nach hinten.
    expect(kuerzesterPfad(g, "front-front", "home-ziel")).toEqual([]);
    expect(kuerzesterPfad(g, "front-w", "home-ziel")).toEqual([]);
  });
});

describe("Nacht-Sektor — N=1-Lade-Assert (Audit N2)", () => {
  const kaputt = (meta: Partial<SektorMeta>): SektorMeta =>
    ({ ...sektorGreybox.meta, ...meta }) as SektorMeta;

  it("pruefeSektorMeta akzeptiert den echten Sektor", () => {
    expect(() => pruefeSektorMeta(sektorGreybox.meta)).not.toThrow();
  });

  it("wirft, wenn die Frontlinie fehlt", () => {
    expect(() =>
      pruefeSektorMeta(
        kaputt({
          frontLinie: undefined as unknown as SektorMeta["frontLinie"],
        }),
      ),
    ).toThrow(/Frontlinie fehlt/);
  });

  it("wirft, wenn die Home-Line unvollständig ist (kein zielKnoten)", () => {
    expect(() =>
      pruefeSektorMeta(
        kaputt({
          homeLinie: { ...sektorGreybox.meta.homeLinie, zielKnoten: "" },
        }),
      ),
    ).toThrow(/ohne zielKnoten/);
  });

  it("wirft, wenn eine Linie ohne parapetBreschen/bounds kommt", () => {
    expect(() =>
      pruefeSektorMeta(
        kaputt({
          frontLinie: {
            ...sektorGreybox.meta.frontLinie,
            parapetBreschen: undefined as unknown as [],
          },
        }),
      ),
    ).toThrow(/unvollständig/);
  });

  it("wirft, wenn Front- und Home-Linie sich die Id teilen", () => {
    expect(() =>
      pruefeSektorMeta(
        kaputt({
          homeLinie: { ...sektorGreybox.meta.homeLinie, id: "front" },
        }),
      ),
    ).toThrow(/teilen sich die Id/);
  });

  it("createSim lehnt einen Sektor ohne genau eine Frontlinie ab", () => {
    const level = {
      ...sektorGreybox,
      meta: kaputt({
        frontLinie: undefined as unknown as SektorMeta["frontLinie"],
      }),
    };
    expect(() => createSim(1, level)).toThrow();
  });
});

describe("Nacht-Sektor — zoneAt / frontLinieAt", () => {
  const { meta } = sektorGreybox;

  it("zoneAt trifft Stichproben je Zone", () => {
    const proben: [ReturnType<typeof p>, ZonenId | null][] = [
      [p(0, 66), "feindseite"],
      [p(-15, 40), "niemandsland"],
      [p(0, 33), "niemandsland"],
      [p(0, 20), "frontlinie"],
      [p(18, -6), "hinterland"],
      [p(0, -25), "hinterland"],
      [p(0, -38), "homeline"],
      [p(44, 0), null],
    ];
    for (const [pos, erwartet] of proben) {
      expect(zoneAt(meta, pos)).toBe(erwartet);
    }
  });

  it("frontLinieAt trifft nur die Frontlinie", () => {
    expect(frontLinieAt(meta, p(-14, 14))).toBe("front");
    expect(frontLinieAt(meta, p(0, 20))).toBe("front");
    expect(frontLinieAt(meta, p(0, -5))).toBeNull();
    expect(frontLinieAt(meta, p(0, 40))).toBeNull();
    // AP6-01d: die Linie reicht über die volle (geschrumpfte) Breite.
    expect(frontLinieAt(meta, p(31, 18))).toBe("front");
  });
});

describe("Nacht-Sektor — in der Sim", () => {
  it("createSim nimmt SektorData als LevelData; Spieler steht im Frontgraben", () => {
    const sim = createSim(1, sektorGreybox);
    for (let i = 0; i < 240; i += 1) {
      sim.tick(command(), DT);
    }
    const pl = sim.getState().player;
    // AP6-01d: Grabensohle −2,7, Laufrost-Oberkante −2,66.
    expect(pl.pos.y).toBeGreaterThan(-3.0);
    expect(pl.pos.y).toBeLessThan(0.2);
    expect(pl.onGround).toBe(true);
    expect(zoneAt(sektorGreybox.meta, pl.pos)).toBe("frontlinie");
  });

  it("bei einem 900-Tick-Marsch quer durchs Netz fällt der Spieler nie aus der Welt", () => {
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
      expect(y).toBeGreaterThan(-6); // tiefster Punkt: Unterstands-Raumboden −5,2
    }
  });

  it("der Wave-Director spawnt an den Feind-Anmarschpunkten; die Gegner folgen dem Graphen an die Front", () => {
    const sim = createSim(2, sektorGreybox, { waves: true });
    for (let i = 0; i < 300; i += 1) sim.tick(command(), DT);
    const nachSpawn = sim.getState().enemies;
    expect(nachSpawn.length).toBeGreaterThan(0);
    for (const e of nachSpawn) {
      const nah = sektorGreybox.meta.feindAnmarsch.some(
        (a) => Math.hypot(e.pos.x - a.x, e.pos.z - a.z) < 8,
      );
      expect(nah || e.pos.z < 46).toBe(true);
    }
    for (let i = 0; i < 2400; i += 1) sim.tick(command(), DT);
    const es = sim.getState().enemies;
    expect(Math.min(...es.map((e) => e.pos.z))).toBeLessThan(20); // an der Front
    for (const e of es) {
      expect(e.abschnitt).toBe("front");
      expect(e.zielKnoten).toBe("front-front");
      // nicht quer durch die Geometrie zum Spieler durchgebrochen
      expect(zoneAt(sektorGreybox.meta, e.pos)).not.toBeNull();
    }
  });

  it("_setLinieVerloren('front') lenkt alle Gegner auf die Home-Line und öffnet den Weg nach hinten", () => {
    // AP6-01d: Seed 1 → Spieler-Spawn (−7 · 18,2), also nicht auf der Route
    // durch den Laufgang. Der Feuergraben hat genau EINEN Laufgang; steht der
    // Spieler mittendrin, verkeilt sich die Welle an ihm im Nahkampf (das ist
    // beabsichtigt — hier wollen wir aber die Wegfindung messen).
    const sim = createSim(1, sektorGreybox, { waves: true });
    for (let i = 0; i < 320; i += 1) sim.tick(command(), DT);
    expect(
      sim.getState().enemies.every((e) => e.zielKnoten === "front-front"),
    ).toBe(true);

    sim._setLinieVerloren("front", true);
    for (let i = 0; i < 3000; i += 1) sim.tick(command(), DT);
    const es = sim.getState().enemies;
    expect(es.length).toBeGreaterThan(0);
    expect(es.every((e) => e.zielKnoten === "home-ziel")).toBe(true);
    expect(Math.min(...es.map((e) => e.pos.z))).toBeLessThan(0); // ins Hinterland
  });

  it("Infiltration: bei verlorener Linie spawnen Gegner am verdeckten Knoten, nie im Hinterland", () => {
    const sim = createSim(5, sektorGreybox, { waves: true });
    sim._setLinieVerloren("front", true);
    for (let i = 0; i < 400; i += 1) sim.tick(command(), DT);
    const rein = sektorGreybox.meta.navGraph.knoten.find(
      (k) => k.id === "reinforcement-front",
    )!;
    const es = sim.getState().enemies;
    expect(es.length).toBeGreaterThan(0);
    for (const e of es) {
      expect(zoneAt(sektorGreybox.meta, e.pos)).not.toBe("hinterland");
    }
    const nahRein = es.some(
      (e) => Math.hypot(e.pos.x - rein.pos.x, e.pos.z - rein.pos.z) < 14,
    );
    expect(nahRein).toBe(true);
  });

  it("_setKanteOffen mutiert nicht die exportierte sektorGreybox", () => {
    const kanteVorher = sektorGreybox.meta.navGraph.kanten.find(
      (k) => k.von === "parados-m" && k.nach === "vg-m1",
    );
    const sim = createSim(1, sektorGreybox);
    sim._setKanteOffen("parados-m", "vg-m1", true);
    expect(kanteVorher?.offen).toBe(false);
  });
});

describe("Nacht-Sektor — Frontlinie & Home-Line (AP4-03/04)", () => {
  it("SimState.front / .home führen je genau eine Linie, anfangs stabil ohne offene Breschen", () => {
    const sim = createSim(1, sektorGreybox, { waves: true });
    for (let i = 0; i < 60; i += 1) sim.tick(command(), DT);
    const s = sim.getState();
    expect(s.front.map((f) => f.id)).toEqual(["front"]);
    expect(s.home.map((f) => f.id)).toEqual(["home"]);
    for (const f of [...s.front, ...s.home]) {
      expect(f.zustand).toBe("stabil");
      expect(f.breschenOffen).toBe(0);
      expect(f.breschen.every((b) => b === false)).toBe(true);
    }
    expect(s.einsatz.phase).toBe("aufbau");
  });

  it("eine ungehaltene Frontlinie läuft unter Dauerdruck die ganze Kette bis „verloren“ und lenkt die Gegner nach hinten", () => {
    const strom: {
      defId: string;
      pos: { x: number; y: number; z: number };
      abschnitt: string;
    }[] = [];
    // AP6-01d: die „Pumpenstand"-Nische liegt bei x 7 (bei x 0 steht jetzt eine
    // Erd-Traverse); die Anmarschbahn davor läuft übers Niemandsland.
    const cluster: [number, number][] = [
      [7, 20],
      [8, 21],
      [6, 20],
      [7, 22],
      [9, 23],
      [5, 22],
      [7, 24],
      [8, 25],
      [4, 27],
      [10, 28],
      [7, 29],
      [6, 30],
      [8, 31],
      [7, 33],
      [9, 34],
      [5, 35],
      [7, 37],
      [8, 38],
      [6, 40],
      [7, 43],
    ];
    for (const [x, z] of cluster) {
      strom.push({
        defId: "linieninfanterie",
        pos: { x, y: 0.2, z },
        abschnitt: "front",
      });
    }
    const sim = createSim(7, sektorGreybox, {
      enemies: strom,
    });
    // Der Spieler zieht sich durch den Laufgraben ins Hinterland zurück — die
    // Frontlinie ist ungehalten (die N=1-Maschine gilt als „gehalten“, solange
    // ein Spieler in den Linien-Bounds steht; die Vereinfachung baut AP6-02).
    for (let i = 0; i < 400; i += 1) sim.tick(command({ y: -1 }), DT);
    expect(sim.getState().player.pos.z).toBeLessThan(10);

    let sahBedraengt = false;
    let sahGebrochen = false;
    let brescheGingAuf = false;
    for (let i = 0; i < 4500; i += 1) {
      sim.tick(command(), DT);
      const f = sim.getState().front[0]!;
      if (f.zustand === "bedraengt") sahBedraengt = true;
      if (f.zustand === "gebrochen") sahGebrochen = true;
      if (f.breschenOffen >= 1) brescheGingAuf = true;
    }
    const end = sim.getState();
    expect(brescheGingAuf).toBe(true);
    expect(sahBedraengt).toBe(true);
    expect(sahGebrochen).toBe(true);
    expect(end.front[0]!.zustand).toBe("verloren");
    expect(end.enemies.some((e) => e.zielKnoten === "home-ziel")).toBe(true);
  });

  it("rueckerobern: No-op bei besetzter Linie, verloren → gebrochen bei leerer; Nav-Rückweg wieder zu", () => {
    const besetzt = createSim(1, sektorGreybox, {
      enemies: [
        {
          defId: "linieninfanterie",
          pos: { x: 6, y: -1.4, z: 14 },
          abschnitt: "front",
        },
      ],
    });
    besetzt._setLinieVerloren("front", true);
    besetzt.rueckerobern("front");
    expect(besetzt.getState().front[0]!.zustand).toBe("verloren");

    const leer = createSim(1, sektorGreybox, {});
    leer._setLinieVerloren("front", true);
    expect(leer.getState().front[0]!.zustand).toBe("verloren");
    leer.rueckerobern("front");
    expect(leer.getState().front[0]!.zustand).toBe("gebrochen");

    // Ein frischer Gegner zielt wieder auf die Front (Rückweg-Kanten wieder zu).
    leer.spawnEnemy("linieninfanterie", { x: 0, y: 0.2, z: 48 }, "front");
    leer.tick(command(), DT);
    expect(
      leer.getState().enemies.some((e) => e.zielKnoten === "front-front"),
    ).toBe(true);
  });

  it("_setLinieVerloren(false) setzt die Linie vollständig zurück", () => {
    const sim = createSim(1, sektorGreybox, {});
    sim._setLinieVerloren("front", true);
    expect(sim.getState().front[0]!.zustand).toBe("verloren");
    expect(sim.getState().front[0]!.breschenOffen).toBeGreaterThanOrEqual(1);
    sim._setLinieVerloren("front", false);
    const f = sim.getState().front[0]!;
    expect(f.zustand).toBe("stabil");
    expect(f.breschenOffen).toBe(0);
  });

  it("alle Home-Abschnitte verloren → Einsatz verloren; Trupp aus → Einsatz verloren", () => {
    const a = createSim(1, sektorGreybox, { waves: true });
    for (let i = 0; i < 240; i += 1) a.tick(command(), DT);
    a._setLinieVerloren("home", true);
    a.tick(command(), DT);
    expect(a.getState().einsatz.phase).toBe("vorbei");
    expect(a.getState().einsatz.ergebnis).toBe("verloren");

    const b = createSim(1, sektorGreybox, { waves: true });
    for (let i = 0; i < 300; i += 1) b.tick(command(), DT);
    b._setTruppAus(true);
    b.tick(command(), DT);
    expect(b.getState().einsatz.ergebnis).toBe("verloren");
  });

  it("Angriffskraft gebrochen + Queue leer → Finale → gewonnen → extrahieren", () => {
    const sim = createSim(2, sektorGreybox, {
      waves: true,
      startAngriffskraft: 4,
    });
    for (let i = 0; i < 500; i += 1) sim.tick(command(), DT);
    expect(sim.getState().wave.angriffskraftRest).toBe(0);
    expect(sim.getState().einsatz.phase).toBe("finale");
    for (let i = 0; i < 100 * 60; i += 1) sim.tick(command(), DT);
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
    sim.entscheide("extrahieren");
    sim.tick(command(), DT);
    expect(sim.getState().einsatz.phase).toBe("vorbei");
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
  });
});

describe("Nacht-Sektor — die Uhr (AP4-04)", () => {
  // AP6-01d: Seed 1 → Spawn im Laufgang vor der zweiten Feuernische
  // (−7 · 18,2); ein Gegner direkt davor (+Z) in der Nische, mit
  // Geradeausfeuer erlegt (der präzise Golden-Anker steht in sim.test.ts).
  const bau = () =>
    createSim(1, sektorGreybox, {
      enemies: [
        {
          defId: "linieninfanterie",
          pos: { x: -7, y: -2.3, z: 21 },
          abschnitt: "front",
        },
      ],
    });
  const feuere = (sim: ReturnType<typeof createSim>) => {
    for (let i = 0; i < 500; i += 1)
      sim.tick(command({ fire: i % 40 < 2 }), DT);
  };

  it("Kill an der stehenden Front zermürbt ~doppelt so stark wie an gefallener", () => {
    const steht = bau();
    feuere(steht);
    expect(steht.getState().nachschub).toBe(5); // genau ein Kill
    const abbauSteht =
      steht.getState().wave.angriffskraftMax -
      steht.getState().wave.angriffskraftRest;

    const fiel = bau();
    fiel._setLinieVerloren("front", true);
    feuere(fiel);
    expect(fiel.getState().nachschub).toBe(5);
    const abbauFiel =
      fiel.getState().wave.angriffskraftMax -
      fiel.getState().wave.angriffskraftRest;

    expect(abbauSteht).toBeGreaterThan(abbauFiel);
    expect(abbauSteht).toBeCloseTo(abbauFiel * 2, 5);
  });
});

describe("Nacht-Sektor — Kern-Bogen-Fixes (AP4-06)", () => {
  const { meta } = sektorGreybox;

  it("H1: nach dem Fall strömen Gegner durch die offene Bresche hinter die Front (zielen auf home-ziel)", () => {
    // Seed 1 → Spieler-Spawn (−7 · 18,2), weit genug von der „Pumpenstand"-
    // Bresche (x 7), damit der Gegner nicht schon im Laufgang in den Nahkampf
    // geht statt weiterzumarschieren.
    const sim = createSim(1, sektorGreybox, {});
    sim._setLinieVerloren("front", true);
    // Nördlich der Brustwehr, auf der Bahn vor der „Pumpenstand"-Bresche (x 7).
    sim.spawnEnemy("linieninfanterie", { x: 7, y: 0.2, z: 29 }, "front");
    const bk = meta.navGraph.knoten.find((k) => k.id === "bresche-front")!;
    let minZ = Infinity;
    let durchDieBresche = false;
    for (let i = 0; i < 60 * 45; i += 1) {
      sim.tick(command(), DT);
      const e = sim.getState().enemies[0];
      if (!e) break;
      minZ = Math.min(minZ, e.pos.z);
      if (Math.hypot(e.pos.x - bk.pos.x, e.pos.z - bk.pos.z) < 1.4) {
        durchDieBresche = true;
      }
      if (minZ < 5) break;
    }
    const e = sim.getState().enemies[0];
    expect(e?.zielKnoten).toBe("home-ziel");
    expect(durchDieBresche).toBe(true);
    expect(minZ).toBeLessThan(12); // wirklich hinter der Front
  });

  it("H1: eine geschlossene Bresche bleibt eine Wand (Gegenprobe)", () => {
    const sim = createSim(1, sektorGreybox, {});
    // Kante offen, aber Bresche zu (kein Kollider aus) → wie Audit H1 vor dem Fix.
    sim._setKanteOffen("bresche-front", "vorfront", true);
    sim.spawnEnemy("linieninfanterie", { x: 7, y: 0.2, z: 29 }, "front");
    let durchDieBresche = false;
    for (let i = 0; i < 60 * 8; i += 1) {
      sim.tick(command(), DT);
      const e = sim.getState().enemies[0];
      if (!e) continue;
      // Hinter die Brustwehr (z < 24,2) in der Lücke bei x 7 gekommen?
      if (Math.abs(e.pos.x - 7) < 1.3 + 0.35 && e.pos.z < 23.5) {
        durchDieBresche = true;
      }
    }
    expect(durchDieBresche).toBe(false);
  });

  it("H4: nach 'gewonnen' friert der Director ein; E extrahiert, Q verlängert", () => {
    const sim = createSim(3, sektorGreybox, {
      waves: true,
      startAngriffskraft: 3,
    });
    for (let i = 0; i < 110 * 60; i += 1) sim.tick(command(), DT);
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
    for (let i = 0; i < 30; i += 1) sim.tick(command({ ability: true }), DT);
    const s = sim.getState();
    expect(s.einsatz.ergebnis).toBe("offen");
    expect(s.einsatz.finaleRest).toBeGreaterThan(44);
    expect(s.einsatz.finaleRest).toBeLessThanOrEqual(45);
  });
});

describe("Nacht-Sektor — Stuck-Watchdog im Wellen-Loop (AP4-06)", () => {
  it("eingemauerte Spawns werden despawnt (Angriffskraft zurück), der Director schaltet weiter", () => {
    // Die Kammer liegt auf dem Verstärkungs-Knoten `reinforcement-front`: so
    // führt auch die Watchdog-Relokation (Stufe 2) zurück in die versiegelte
    // Kammer → der Gegner fährt sich final fest und wird despawnt.
    const rein = sektorGreybox.meta.navGraph.knoten.find(
      (k) => k.id === "reinforcement-front",
    )!;
    const kammer = { x: rein.pos.x, z: rein.pos.z };
    const wand = (cx: number, cz: number, sx: number, sz: number) => ({
      center: { x: cx, y: 1.2, z: cz },
      size: { x: sx, y: 2.4, z: sz },
    });
    const level = {
      ...sektorGreybox,
      boxes: [
        ...sektorGreybox.boxes,
        wand(kammer.x, kammer.z + 2, 4.4, 0.4),
        wand(kammer.x, kammer.z - 2, 4.4, 0.4),
        wand(kammer.x + 2, kammer.z, 0.4, 4.4),
        wand(kammer.x - 2, kammer.z, 0.4, 4.4),
      ],
      enemySpawnPoints: [{ x: kammer.x, y: 0.2, z: kammer.z }],
    };
    const sim = createSim(1, level, {
      waves: true,
      startAngriffskraft: 2,
    });
    let sahGegner = false;
    let sahPause = false;
    let ak = 0;
    for (let i = 0; i < 60 * 60; i += 1) {
      sim.tick(command(), DT);
      const s = sim.getState();
      if (s.enemies.length > 0) sahGegner = true;
      if (s.wave.phase === "pause") sahPause = true;
      ak = s.wave.angriffskraftRest;
      if (sahPause) break;
    }
    expect(sahGegner).toBe(true);
    expect(sim.getState().enemies.length).toBe(0);
    expect(ak).toBe(2);
    expect(sahPause).toBe(true);
  });
});

describe("Nacht-Sektor — Munitions-Nachschub (AP5-02)", () => {
  const { meta } = sektorGreybox;
  const alle = [meta.frontLinie, meta.homeLinie];
  const depotFront = meta.frontLinie.depot;
  const RESERVE = standardWaffe.reserve;

  /** Seed, dessen Spawn der mittlere ist (0 · 18,2) — nahe dem Front-Depot. */
  function mittlererSeed(): number {
    const mitte = sektorGreybox.meta.spielerSpawn[0]!;
    for (let seed = 1; seed < 100; seed += 1) {
      const p0 = createSim(seed, sektorGreybox).getState().player.pos;
      if (p0.x === mitte.x && p0.z === mitte.z) return seed;
    }
    throw new Error("kein Seed mit mittlerem Spawn");
  }

  function laufeZu(
    sim: ReturnType<typeof createSim>,
    ziel: { x: number; z: number },
    maxTicks = 600,
  ): void {
    for (let i = 0; i < maxTicks; i += 1) {
      const pl = sim.getState().player;
      const dx = ziel.x - pl.pos.x;
      const dz = ziel.z - pl.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 1) return;
      const wx = dx / d;
      const wz = dz / d;
      const c = Math.cos(pl.yaw);
      const sn = Math.sin(pl.yaw);
      sim.tick(command({ x: c * wx - sn * wz, y: sn * wx + c * wz }), DT);
    }
  }

  const reserve = (sim: ReturnType<typeof createSim>) =>
    sim.getState().player.weapon.reserve;
  const depotNah = (sim: ReturnType<typeof createSim>) =>
    sim.getState().player.depotInReichweite;

  it("jedes Depot liegt in seiner Linie, knapp über der Grabensohle und in keinem Kollider", () => {
    for (const ab of alle) {
      expect(inBoundsXZ(ab.bounds, ab.depot), ab.id).toBe(true);
      expect(ab.depot.y).toBeCloseTo(-2.5, 6); // AP6-01d: Sohle −2,7 + 0,2
      const y = ab.depot.y + 0.05;
      const drin = sektorGreybox.boxes.filter(
        (b) =>
          Math.abs(ab.depot.x - b.center.x) < b.size.x / 2 &&
          Math.abs(ab.depot.z - b.center.z) < b.size.z / 2 &&
          y >= b.center.y - b.size.y / 2 &&
          y < b.center.y + b.size.y / 2,
      );
      expect(drin, `Depot ${ab.id} steckt in einem Kollider`).toEqual([]);
    }
  });

  it("naechstesDepot: in Reichweite / außerhalb / nicht verfügbar", () => {
    expect(naechstesDepot(alle, depotFront, DEPOT_REICHWEITE)).toBe("front");
    expect(
      naechstesDepot(
        alle,
        { ...depotFront, x: depotFront.x + 2.1 },
        DEPOT_REICHWEITE,
      ),
    ).toBeNull();
    expect(
      naechstesDepot(
        alle,
        depotFront,
        DEPOT_REICHWEITE,
        (id) => id !== "front",
      ),
    ).toBeNull();
  });

  it("am Depot füllt E die Reserve auf — im laufenden Einsatz, ohne zu sterben", () => {
    const sim = createSim(mittlererSeed(), sektorGreybox);
    laufeZu(sim, depotFront);
    sim._setReserve(0);
    sim.tick(command(), DT);
    expect(depotNah(sim)).toBe("front");
    sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(RESERVE);
    expect(sim.getState().player.tot).toBe(false);
  });

  it("eine gefallene Linie hat ihr Depot verloren; rueckerobern gibt es zurück", () => {
    const sim = createSim(mittlererSeed(), sektorGreybox, {});
    laufeZu(sim, depotFront);
    sim._setLinieVerloren("front", true);
    sim._setReserve(0);
    sim.tick(command(), DT);
    expect(depotNah(sim)).toBeNull();

    sim.rueckerobern("front");
    sim.tick(command(), DT);
    expect(depotNah(sim)).toBe("front");
    sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(RESERVE);
  });
});

describe("Nacht-Sektor — Kartengrenze & Umland (AP5-03)", () => {
  const { boxes, meta } = sektorGreybox;
  const oben = (b: (typeof boxes)[number]) => b.center.y + b.size.y / 2;
  const deckt = (b: (typeof boxes)[number], x: number, y: number, z: number) =>
    Math.abs(x - b.center.x) <= b.size.x / 2 &&
    Math.abs(z - b.center.z) <= b.size.z / 2 &&
    y >= b.center.y - b.size.y / 2 &&
    y <= oben(b);

  it("die vier Kartengrenz-Kollider sind unsichtbar und umschließen den Sektor", () => {
    const grenze = boxes.filter((b) => b.unsichtbar);
    // 4 Kartengrenzen + eine Feindseiten-Sperrwand.
    expect(grenze.length).toBeGreaterThanOrEqual(4);
    for (const b of grenze) expect(b.size.y).toBeGreaterThanOrEqual(4);
  });

  it("das Umland schließt an jede Sektorkante bündig an — Oberkante = Geländeoberfläche, bis in den Dunst", () => {
    // AP6-01d: Sektor ±32 · z 72…−48. Proben an den Innenkanten (Feld y = 0) +
    // im auslaufenden Umland dahinter.
    const proben: [number, number][] = [
      [-34, 6],
      [34, 6],
      [0, 76],
      [6, -46],
      [-200, 100],
      [200, -100],
      [0, 300],
      [0, -300],
    ];
    for (const [x, z] of proben) {
      const boden = boxes.filter((b) => !b.unsichtbar && deckt(b, x, -0.5, z));
      expect(boden.length, `Umland fehlt bei (${x}, ${z})`).toBeGreaterThan(0);
      expect(Math.max(...boden.map(oben))).toBeCloseTo(0, 6);
    }
  });

  it("jenseits der Spielgrenze ragt kein sichtbarer Quader höher als 1,5 m — keine Wand-Silhouette", () => {
    const draussen = (b: (typeof boxes)[number]) =>
      b.center.x + b.size.x / 2 <= -32 ||
      b.center.x - b.size.x / 2 >= 32 ||
      b.center.z - b.size.z / 2 >= 72 ||
      b.center.z + b.size.z / 2 <= -48;
    const aussen = boxes.filter((b) => !b.unsichtbar && draussen(b));
    expect(aussen.length).toBeGreaterThanOrEqual(4);
    for (const b of aussen) {
      expect(
        oben(b),
        `Quader bei (${b.center.x}, ${b.center.z})`,
      ).toBeLessThanOrEqual(1.5);
    }
  });

  it("Zonen und Nav-Graph liegen komplett innerhalb der Grenze", () => {
    for (const z of meta.zonen) {
      expect(z.bounds.minX).toBeGreaterThanOrEqual(-32);
      expect(z.bounds.maxX).toBeLessThanOrEqual(32);
    }
    for (const k of meta.navGraph.knoten) {
      expect(Math.abs(k.pos.x)).toBeLessThan(31.7);
      expect(k.pos.z).toBeGreaterThan(-48);
      expect(k.pos.z).toBeLessThan(72);
    }
  });

  it("die Spielgrenze bleibt wirksam: Kapsel bleibt im Hinterland vor der Grenze", () => {
    const world = createCollisionWorld(sektorGreybox);
    const laufe = (
      start: { x: number; y: number; z: number },
      vx: number,
      vz: number,
    ) => {
      let pos = start;
      let vel = { x: 0, y: 0, z: 0 };
      for (let t = 0; t < 600; t += 1) {
        vel = { x: vx, y: vel.y, z: vz };
        const r = moveCapsule(world, pos, vel, 0.35, 1.8, DT);
        pos = r.pos;
        vel = r.vel;
        expect(pos.y).toBeGreaterThan(-3.6);
      }
      return pos;
    };
    const ost = laufe({ x: 20, y: 0.05, z: -20 }, 4.5, 0);
    expect(ost.x).toBeLessThanOrEqual(31.7);
    const west = laufe({ x: -20, y: 0.05, z: -20 }, -4.5, 0);
    expect(west.x).toBeGreaterThanOrEqual(-31.7);
  });
});
