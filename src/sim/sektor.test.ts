import { describe, expect, it } from "vitest";
import { createSim, type InputCommand } from "./index";
import { createCollisionWorld, moveCapsule } from "./collision";
import {
  abschnittAt,
  inBoundsXZ,
  naechstesDepot,
  zoneAt,
  DEPOT_REICHWEITE,
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

  it("hat einen wohlgeformten Nav-Graphen (AP4-02)", () => {
    const g = meta.navGraph;
    const ids = new Set(g.knoten.map((k) => k.id));
    expect(ids.size).toBe(g.knoten.length); // eindeutige Ids
    for (const k of g.kanten) {
      expect(ids.has(k.von)).toBe(true);
      expect(ids.has(k.nach)).toBe(true);
    }
    for (const id of [
      "anmarsch-west",
      "anmarsch-ost",
      "front-A",
      "front-B",
      "front-C",
      "bresche-A",
      "bresche-B",
      "bresche-C",
      "reinforcement-A",
      "reinforcement-B",
      "reinforcement-C",
      "home-ziel",
    ]) {
      expect(ids.has(id)).toBe(true);
    }
    // Verstärkungs-Knoten liegen nie im offenen Feld (Infiltration-Regel).
    for (const k of g.knoten) {
      if (k.id.startsWith("reinforcement-")) {
        expect(k.zone).not.toBe("feld");
      }
    }
  });

  it("Nav: jeder Anmarsch erreicht jeden Frontabschnitt; die Front hält dicht", () => {
    const g = meta.navGraph;
    for (const start of ["anmarsch-west", "anmarsch-ost"]) {
      for (const ziel of ["front-A", "front-B", "front-C"]) {
        expect(kuerzesterPfad(g, start, ziel).length).toBeGreaterThan(0);
      }
    }
    // Vor einem Durchbruch führt kein offener Weg von der Front nach hinten.
    expect(kuerzesterPfad(g, "front-B", "home-ziel")).toEqual([]);
    expect(kuerzesterPfad(g, "front-A", "home-ziel")).toEqual([]);
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
    // Gegner folgen dem Graphen durchs Labyrinth an die Front (nicht quer).
    for (let i = 0; i < 1400; i += 1) {
      sim.tick(command(), DT);
    }
    const es = sim.getState().enemies;
    expect(Math.min(...es.map((e) => e.pos.z))).toBeLessThan(17); // an der Front
    for (const e of es) {
      expect(["A", "B", "C"]).toContain(e.abschnitt);
      expect(e.zielKnoten).toBe(`front-${e.abschnitt}`);
      // nicht quer durch die Geometrie zum Spieler durchgebrochen
      expect(zoneAt(sektorGreybox.meta, e.pos)).not.toBeNull();
    }
  });

  it("_setAbschnittVerloren lenkt die Gegner des Abschnitts auf die Home-Line", () => {
    const sim = createSim(2, sektorGreybox, {
      waves: true,
      aktiveAchsen: ["B"],
    });
    for (let i = 0; i < 320; i += 1) sim.tick(command(), DT);
    expect(
      sim.getState().enemies.every((e) => e.zielKnoten === "front-B"),
    ).toBe(true);

    sim._setAbschnittVerloren("B", true);
    for (let i = 0; i < 2200; i += 1) sim.tick(command(), DT);
    const es = sim.getState().enemies;
    expect(es.length).toBeGreaterThan(0);
    expect(es.every((e) => e.zielKnoten === "home-ziel")).toBe(true);
    // mindestens einer hat den Weg nach hinten bis ins Feld/Home genommen
    expect(Math.min(...es.map((e) => e.pos.z))).toBeLessThan(0);
  });

  it("Infiltration: bei verlorenem Abschnitt spawnen Gegner am verdeckten Knoten, nie im Feld", () => {
    const sim = createSim(5, sektorGreybox, {
      waves: true,
      aktiveAchsen: ["C"],
    });
    sim._setAbschnittVerloren("C", true);
    for (let i = 0; i < 400; i += 1) sim.tick(command(), DT);
    const rein = sektorGreybox.meta.navGraph.knoten.find(
      (k) => k.id === "reinforcement-C",
    );
    const es = sim.getState().enemies;
    expect(es.length).toBeGreaterThan(0);
    for (const e of es) {
      // frisch am Verstärkungs-Knoten oder schon Richtung Home unterwegs — nie
      // im offenen Feld (Zone „feld") gepoppt.
      expect(zoneAt(sektorGreybox.meta, e.pos)).not.toBe("feld");
    }
    // wenigstens einer ist nahe reinforcement-C gestartet
    const nahRein = es.some(
      (e) =>
        rein !== undefined &&
        Math.hypot(e.pos.x - rein.pos.x, e.pos.z - rein.pos.z) < 12,
    );
    expect(nahRein).toBe(true);
  });

  it("_setKanteOffen mutiert nicht die exportierte sektorGreybox", () => {
    const kanteVorher = sektorGreybox.meta.navGraph.kanten.find(
      (k) => k.von === "front-A" && k.nach === "parados-A",
    );
    const sim = createSim(1, sektorGreybox);
    sim._setKanteOffen("front-A", "parados-A", true);
    // Die Modul-Singleton-Kante ist unverändert (Sim arbeitet auf einer Kopie).
    expect(kanteVorher?.offen).toBe(false);
  });
});

describe("Greybox-Sektor — Frontabschnitte (AP4-03)", () => {
  it("SimState.front führt A/B/C, anfangs stabil und ohne offene Breschen", () => {
    const sim = createSim(1, sektorGreybox, { waves: true });
    for (let i = 0; i < 60; i += 1) sim.tick(command(), DT);
    const front = sim.getState().front;
    expect(front.map((f) => f.id)).toEqual(["A", "B", "C"]);
    for (const f of front) {
      expect(f.zustand).toBe("stabil");
      expect(f.breschenOffen).toBe(0);
      expect(f.breschen.every((b) => b === false)).toBe(true);
    }
  });

  it("ein ungehaltener Abschnitt läuft unter Dauerdruck bis „verloren“ und lenkt die Gegner nach hinten", () => {
    // 24 Gegner strömen gestaffelt auf Abschnitt C; der Spieler (Seed 1 → Spawn
    // an Abschnitt A) verteidigt C nicht.
    const strom: {
      defId: string;
      pos: { x: number; y: number; z: number };
      abschnitt: string;
    }[] = [];
    const cluster: [number, number][] = [
      [13, 15],
      [14, 16],
      [15, 15],
      [12, 14],
      [14, 14],
      [8, 16.5],
      [9, 16],
      [7, 17],
      [8.5, 15],
      [0, 19],
      [-1, 19],
      [1, 20],
      [0, 20],
      [2, 23],
      [3, 23],
      [1, 24],
      [2, 24],
      [-8, 31],
      [-7, 31],
      [-9, 30],
      [-8, 32],
      [2, 40],
      [1, 40],
      [3, 41],
    ];
    for (const [x, z] of cluster) {
      strom.push({
        defId: "linieninfanterie",
        pos: { x, y: 0, z },
        abschnitt: "C",
      });
    }
    const sim = createSim(1, sektorGreybox, {
      enemies: strom,
      aktiveAchsen: ["C"],
    });

    let sahBedraengt = false;
    let sahGebrochen = false;
    let brescheGingAuf = false;
    for (let i = 0; i < 2500; i += 1) {
      sim.tick(command(), DT);
      const c = sim.getState().front.find((f) => f.id === "C");
      if (c?.zustand === "bedraengt") sahBedraengt = true;
      if (c?.zustand === "gebrochen") sahGebrochen = true;
      if ((c?.breschenOffen ?? 0) >= 1) brescheGingAuf = true;
    }
    const end = sim.getState();
    const c = end.front.find((f) => f.id === "C");
    expect(brescheGingAuf).toBe(true); // Gegner reißen die Bresche auf
    expect(sahBedraengt).toBe(true);
    expect(sahGebrochen).toBe(true);
    expect(c?.zustand).toBe("verloren"); // sauber die ganze Kette durchlaufen
    expect(c?.breschenOffen).toBeGreaterThanOrEqual(1);
    // Die Gegner des gefallenen Abschnitts zielen jetzt auf die Home-Line.
    expect(end.enemies.some((e) => e.zielKnoten === "home-ziel")).toBe(true);
  });

  it("rueckerobern: No-op bei besetztem Abschnitt, verloren → gebrochen bei leerem", () => {
    // Besetzt: ein Gegner steht im Abschnitt C.
    const besetzt = createSim(1, sektorGreybox, {
      enemies: [
        {
          defId: "linieninfanterie",
          pos: { x: 14, y: -0.4, z: 14 },
          abschnitt: "C",
        },
      ],
    });
    besetzt._setAbschnittVerloren("C", true);
    besetzt.rueckerobern("C");
    expect(besetzt.getState().front.find((f) => f.id === "C")?.zustand).toBe(
      "verloren",
    );

    // Leer: kein Gegner in C.
    const leer = createSim(1, sektorGreybox);
    leer._setAbschnittVerloren("C", true);
    expect(leer.getState().front.find((f) => f.id === "C")?.zustand).toBe(
      "verloren",
    );
    leer.rueckerobern("C");
    const c = leer.getState().front.find((f) => f.id === "C");
    expect(c?.zustand).toBe("gebrochen");

    // Nav-Kante nach hinten ist wieder zu: ein frischer C-Gegner zielt auf front-C.
    leer.spawnEnemy("linieninfanterie", { x: 10, y: 0, z: 44 }, "C");
    leer.tick(command(), DT);
    const frisch = leer.getState().enemies.filter((e) => e.abschnitt === "C");
    expect(frisch.some((e) => e.zielKnoten === "front-C")).toBe(true);
  });

  it("_setAbschnittVerloren(false) setzt den Abschnitt vollständig zurück", () => {
    const sim = createSim(1, sektorGreybox, { aktiveAchsen: ["B"] });
    sim._setAbschnittVerloren("B", true);
    let b = sim.getState().front.find((f) => f.id === "B");
    expect(b?.zustand).toBe("verloren");
    expect(b?.breschenOffen).toBeGreaterThanOrEqual(1);

    sim._setAbschnittVerloren("B", false);
    b = sim.getState().front.find((f) => f.id === "B");
    expect(b?.zustand).toBe("stabil");
    expect(b?.breschenOffen).toBe(0);
    // Gegner des Abschnitts zielen wieder auf die Front, nicht auf Home.
    sim.spawnEnemy("linieninfanterie", { x: -10, y: 0, z: 44 }, "B");
    sim.tick(command(), DT);
    expect(
      sim
        .getState()
        .enemies.some((e) => e.abschnitt === "B" && e.zielKnoten === "front-B"),
    ).toBe(true);
  });
});

describe("Greybox-Sektor — Einsatzbogen & die Uhr (AP4-04)", () => {
  // Feuert grob geradeaus (Spieler blickt beim Spawn nach +Z = Anmarschrichtung).
  const feuerScript = (n: number, sim: ReturnType<typeof createSim>) => {
    for (let i = 0; i < n; i += 1) {
      sim.tick(command({ fire: i % 90 < 2 }), DT);
    }
  };

  it("SimState.home führt die zwei Home-Abschnitte, anfangs stabil", () => {
    const sim = createSim(1, sektorGreybox);
    for (let i = 0; i < 30; i += 1) sim.tick(command(), DT);
    const home = sim.getState().home;
    expect(home.map((f) => f.id)).toEqual(["H-West", "H-Ost"]);
    expect(home.every((f) => f.zustand === "stabil")).toBe(true);
    expect(sim.getState().einsatz.phase).toBe("aufbau");
  });

  it("die Uhr: Kills an der stehenden Front zermürben stärker als an gefallener", () => {
    const cluster = (): {
      defId: string;
      pos: { x: number; y: number; z: number };
      abschnitt: string;
    }[] =>
      Array.from({ length: 6 }, (_, i) => ({
        defId: "linieninfanterie",
        pos: { x: -12 + (i - 3) * 0.5, y: 0, z: 15.5 + (i % 2) * 0.4 },
        abschnitt: "A",
      }));

    // Front steht: Kill an der frontlinie zählt voll.
    const steht = createSim(1, sektorGreybox, { enemies: cluster() });
    feuerScript(1600, steht);
    const sSteht = steht.getState();

    // Front gefallen: derselbe Kill zählt nur noch wie offenes Feld.
    const fiel = createSim(1, sektorGreybox, { enemies: cluster() });
    for (const id of ["A", "B", "C"]) fiel._setAbschnittVerloren(id, true);
    feuerScript(1600, fiel);
    const sFiel = fiel.getState();

    // Gleich viele Kills (Nachschub = 5/Kill), aber steht zieht mehr Angriffskraft.
    expect(sSteht.nachschub).toBeGreaterThan(0);
    expect(sSteht.nachschub).toBe(sFiel.nachschub);
    const abbauSteht =
      sSteht.wave.angriffskraftMax - sSteht.wave.angriffskraftRest;
    const abbauFiel =
      sFiel.wave.angriffskraftMax - sFiel.wave.angriffskraftRest;
    expect(abbauSteht).toBeGreaterThan(abbauFiel);
    expect(abbauSteht).toBeCloseTo(abbauFiel * 2, 0);
  });

  it("Angriffskraft gebrochen + Queue leer → Finale mit Countdown → gewonnen → extrahieren", () => {
    const sim = createSim(2, sektorGreybox, {
      waves: true,
      startAngriffskraft: 4,
    });
    // Aufbau + eine kleine Welle spawnen lassen.
    for (let i = 0; i < 500; i += 1) sim.tick(command(), DT);
    expect(sim.getState().wave.angriffskraftRest).toBe(0);
    expect(sim.getState().einsatz.phase).toBe("finale");
    expect(sim.getState().einsatz.finaleRest).toBeGreaterThan(0);

    // Countdown ablaufen lassen (90 s + Puffer).
    for (let i = 0; i < 100 * 60; i += 1) sim.tick(command(), DT);
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
    expect(sim.getState().einsatz.phase).toBe("finale");

    sim.entscheide("extrahieren");
    sim.tick(command(), DT);
    expect(sim.getState().einsatz.phase).toBe("vorbei");
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
  });

  it("verlaengern startet einen zweiten, kürzeren Countdown", () => {
    const sim = createSim(3, sektorGreybox, {
      waves: true,
      startAngriffskraft: 3,
    });
    // Der Countdown läuft unabhängig vom Feld → reines Ticken reicht (Aufbau +
    // kleine Welle + 90 s Finale).
    for (let i = 0; i < 110 * 60; i += 1) sim.tick(command(), DT);
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");

    sim.entscheide("verlaengern");
    sim.tick(command(), DT);
    const s = sim.getState();
    expect(s.einsatz.ergebnis).toBe("offen");
    expect(s.einsatz.phase).toBe("finale");
    expect(s.einsatz.finaleRest).toBeGreaterThan(0);
    expect(s.einsatz.finaleRest).toBeLessThanOrEqual(45);

    // Zweiter Countdown läuft ebenfalls ab → wieder gewonnen.
    for (let i = 0; i < 50 * 60; i += 1) sim.tick(command(), DT);
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
  });

  it("nach geräumtem Feld im Finale laufen Reservewellen (Director-Regime)", () => {
    const sim = createSim(3, sektorGreybox, {
      waves: true,
      startAngriffskraft: 3,
    });
    // Drehen + feuern räumt die kleine Erstwelle (headless „zielt" der Spieler so).
    let sahReserve = false;
    for (let i = 0; i < 20000; i += 1) {
      sim.tick(command({ dx: 40, fire: i % 45 < 2 }), DT);
      if (sim.getState().wave.phase === "reserve") sahReserve = true;
    }
    expect(sahReserve).toBe(true);
    expect(sim.getState().einsatz.phase).toBe("finale");
  });

  it("alle Home-Abschnitte verloren → Einsatz verloren, in jeder Phase", () => {
    const sim = createSim(1, sektorGreybox, { waves: true });
    for (let i = 0; i < 240; i += 1) sim.tick(command(), DT);
    sim._setAbschnittVerloren("H-West", true);
    sim.tick(command(), DT);
    expect(sim.getState().einsatz.ergebnis).toBe("offen"); // erst einer
    sim._setAbschnittVerloren("H-Ost", true);
    sim.tick(command(), DT);
    expect(sim.getState().einsatz.phase).toBe("vorbei");
    expect(sim.getState().einsatz.ergebnis).toBe("verloren");
  });

  it("Trupp ausgeschaltet → Einsatz verloren", () => {
    const sim = createSim(1, sektorGreybox, { waves: true });
    for (let i = 0; i < 300; i += 1) sim.tick(command(), DT);
    sim._setTruppAus(true);
    sim.tick(command(), DT);
    expect(sim.getState().einsatz.ergebnis).toBe("verloren");
    expect(sim.getState().einsatz.phase).toBe("vorbei");
  });
});

// AP4-06: die Bresche ist ein echtes Loch, die Finale-Entscheidung eine Eingabe.
describe("Greybox-Sektor — Kern-Bogen-Fixes (AP4-06)", () => {
  const { meta } = sektorGreybox;

  it("H1: Gegner strömen durch die offene Bresche und kommen hinter der Front an — für A, B und C", () => {
    for (const ab of meta.frontAbschnitte) {
      // Seed so wählen, dass der Spieler NICHT in diesem Abschnitt spawnt —
      // sonst wechselt der Gegner an der Bresche in den Nahkampf-Beeline.
      const seed = [1, 2, 3, 4, 5, 6].find(
        (sd) =>
          abschnittAt(
            meta,
            createSim(sd, sektorGreybox).getState().player.pos,
          ) !== ab.id,
      );
      expect(seed).toBeDefined();
      const sim = createSim(seed ?? 1, sektorGreybox, {
        aktiveAchsen: [ab.id],
      });
      // Abschnitt gefallen: alle Breschen offen, Nav-Kanten nach hinten offen.
      sim._setAbschnittVerloren(ab.id, true);
      // Gegner startet vor der Front im Labyrinth (lab-vorfront) und zielt auf home-ziel.
      sim.spawnEnemy("linieninfanterie", { x: 0, y: 0.2, z: 21 }, ab.id);
      const brescheKnoten = meta.navGraph.knoten.find(
        (k) => k.id === `bresche-${ab.id}`,
      );
      expect(brescheKnoten).toBeDefined();
      let minZ = Infinity;
      let durchDieBresche = false;
      for (let i = 0; i < 60 * 45; i += 1) {
        sim.tick(command(), DT);
        const e = sim.getState().enemies[0];
        if (!e) break;
        minZ = Math.min(minZ, e.pos.z);
        if (
          brescheKnoten &&
          Math.hypot(
            e.pos.x - brescheKnoten.pos.x,
            e.pos.z - brescheKnoten.pos.z,
          ) < 1.0
        ) {
          durchDieBresche = true;
        }
        if (minZ < 5) break;
      }
      const e = sim.getState().enemies[0];
      expect(e?.zielKnoten, ab.id).toBe("home-ziel");
      expect(durchDieBresche, `${ab.id}: nie an der Bresche vorbei`).toBe(true);
      // Tatsächlich hinter der Front: im Feld / Verbindungsgraben (z < 8).
      expect(minZ, `${ab.id}: minZ`).toBeLessThan(8);
    }
  });

  it("H1: eine geschlossene Bresche bleibt eine Wand (Gegenprobe)", () => {
    const sim = createSim(1, sektorGreybox, { aktiveAchsen: ["B"] });
    // Kante offen, aber Bresche zu (kein Kollider aus) → wie Audit H1 vor dem Fix.
    sim._setKanteOffen("bresche-B", "lab-vorfront", true);
    sim.spawnEnemy("linieninfanterie", { x: -3, y: 0.2, z: 21 }, "B");
    // Die geschlossene Bresche (x = −3 ± 1,3, Wand um z = 16) darf nie
    // durchquert werden. Dass der Gegner nach dem Watchdog-Eingriff über die
    // Sap-Lücke (x = −8,5) in den Graben findet, ist erlaubt — deshalb wird
    // die Bresche-Spur geprüft, nicht bloß „z bleibt nördlich" (AP5-04).
    let durchDieBresche = false;
    let minZ = Infinity;
    for (let i = 0; i < 60 * 8; i += 1) {
      sim.tick(command(), DT);
      const e = sim.getState().enemies[0];
      if (!e) continue;
      minZ = Math.min(minZ, e.pos.z);
      if (Math.abs(e.pos.x + 3) < 1.3 + 0.35 && e.pos.z < 16.2) {
        durchDieBresche = true;
      }
    }
    expect(durchDieBresche).toBe(false);
    // Direkt vor der Wand kommt er nicht weiter als bis zur Wandfläche.
    expect(minZ).toBeGreaterThan(15.5);
  });

  it("H4: nach 'gewonnen' friert der Director ein; E extrahiert (vorbei, gewonnen bleibt)", () => {
    const sim = createSim(3, sektorGreybox, {
      waves: true,
      startAngriffskraft: 3,
    });
    const dreheUndFeuere = (i: number) => command({ dx: 40, fire: i % 45 < 2 });
    let i = 0;
    for (
      ;
      i < 30000 && sim.getState().einsatz.ergebnis !== "gewonnen";
      i += 1
    ) {
      sim.tick(dreheUndFeuere(i), DT);
    }
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
    expect(sim.getState().einsatz.phase).toBe("finale");

    // 40 s weiter ohne Entscheidung: keine neuen Gegner-Ids, Ergebnis bleibt.
    const maxId = () =>
      sim.getState().enemies.reduce((m, e) => Math.max(m, e.id), 0);
    const idVorher = maxId();
    let idMax = idVorher;
    for (let k = 0; k < 60 * 40; k += 1) {
      sim.tick(dreheUndFeuere(i + k), DT);
      idMax = Math.max(idMax, maxId());
    }
    expect(idMax).toBe(idVorher);
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");

    // Home-Verlust nach dem Gewinn kippt nichts mehr.
    sim._setAbschnittVerloren("H-West", true);
    sim._setAbschnittVerloren("H-Ost", true);
    sim.tick(command(), DT);
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");

    // E (interact) → Einsatz beendet, gewonnen.
    sim.tick(command({ interact: true }), DT);
    expect(sim.getState().einsatz.phase).toBe("vorbei");
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
  });

  it("H4: Q (ability) verlängert — zweiter Countdown, Director läuft weiter", () => {
    const sim = createSim(3, sektorGreybox, {
      waves: true,
      startAngriffskraft: 3,
    });
    for (let i = 0; i < 110 * 60; i += 1) sim.tick(command(), DT);
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
    // Gehaltene Taste zündet nur einmal (Flanke).
    for (let i = 0; i < 30; i += 1) sim.tick(command({ ability: true }), DT);
    const s = sim.getState();
    expect(s.einsatz.phase).toBe("finale");
    expect(s.einsatz.ergebnis).toBe("offen");
    expect(s.einsatz.finaleRest).toBeGreaterThan(44);
    expect(s.einsatz.finaleRest).toBeLessThanOrEqual(45);
  });

  it("H4: vor 'gewonnen' sind E und Q wirkungslos", () => {
    const sim = createSim(1, sektorGreybox, { waves: true });
    for (let i = 0; i < 300; i += 1) sim.tick(command(), DT);
    sim.tick(command({ interact: true }), DT);
    sim.tick(command({ ability: true }), DT);
    expect(sim.getState().einsatz.phase).toBe("wellen");
    expect(sim.getState().einsatz.ergebnis).toBe("offen");
  });
});

// AP4-06 H2: ein unerreichbar platzierter Gegner blockiert den Wellen-Loop nicht.
describe("Greybox-Sektor — Stuck-Watchdog im Wellen-Loop (AP4-06)", () => {
  it("eingemauerte Spawns werden despawnt (Angriffskraft zurück), der Director schaltet weiter", () => {
    // Sektor-Kopie mit einer geschlossenen Kammer im Labyrinth als einzigem
    // Gegner-Spawn — kein Weg hinaus.
    const kammer = { x: -18, z: 37 };
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
      aktiveAchsen: [], // kein Abschnitt → keine Relokation, nur Despawn
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
    // Beide Spawns sind verschwunden, die Angriffskraft ist zurückgeschrieben
    // und der Director ist nicht auf „lebendeGegner === 0" hängen geblieben.
    expect(sim.getState().enemies.length).toBe(0);
    expect(ak).toBe(2);
    expect(sahPause).toBe(true);
  });
});

describe("Greybox-Sektor — Munitions-Nachschub (AP5-02)", () => {
  const { meta } = sektorGreybox;
  const alle = [...meta.frontAbschnitte, ...meta.homeAbschnitte];
  const depotB = meta.frontAbschnitte.find((a) => a.id === "B")!.depot;
  const RESERVE = standardWaffe.reserve;

  /** Seed, dessen Spawn der mittlere ist (0, −1,4, 13) — nahe Depot B. */
  function mittlererSeed(): number {
    for (let seed = 1; seed < 100; seed += 1) {
      const p0 = createSim(seed, sektorGreybox).getState().player.pos;
      if (p0.x === 0 && p0.z === 13) return seed;
    }
    throw new Error("kein Seed mit mittlerem Spawn");
  }

  /**
   * Läuft den Spieler bis auf ~1 m an `ziel` (X/Z) heran. Die Wunschrichtung
   * ist yaw-relativ — hier aus dem aktuellen yaw zurückgerechnet, damit der
   * Helfer nach beliebigem Drehen funktioniert.
   */
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

  it("jedes Depot liegt in seinem Abschnitt, knapp über der Grabensohle und in keinem Kollider", () => {
    for (const ab of alle) {
      expect(inBoundsXZ(ab.bounds, ab.depot), ab.id).toBe(true);
      expect(ab.depot.y).toBeCloseTo(-1.6, 6);
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

  it("naechstesDepot: in Reichweite / außerhalb / darüber / nicht verfügbar / nächstes gewinnt", () => {
    expect(naechstesDepot(alle, depotB, DEPOT_REICHWEITE)).toBe("B");
    expect(
      naechstesDepot(alle, { ...depotB, x: depotB.x + 1.9 }, DEPOT_REICHWEITE),
    ).toBe("B");
    expect(
      naechstesDepot(alle, { ...depotB, x: depotB.x + 2.1 }, DEPOT_REICHWEITE),
    ).toBeNull();
    // Auf der Parados-Oberkante direkt darüber: 3D-Abstand zählt.
    expect(
      naechstesDepot(alle, { ...depotB, y: depotB.y + 2.2 }, DEPOT_REICHWEITE),
    ).toBeNull();
    expect(
      naechstesDepot(alle, depotB, DEPOT_REICHWEITE, (id) => id !== "B"),
    ).toBeNull();
    const zwei = [
      { id: "nah", depot: { x: 1, y: 0, z: 0 } },
      { id: "fern", depot: { x: -1.5, y: 0, z: 0 } },
    ];
    expect(naechstesDepot(zwei, { x: 0, y: 0, z: 0 }, 2)).toBe("nah");
    expect(
      naechstesDepot(zwei, { x: 0, y: 0, z: 0 }, 2, (id) => id !== "nah"),
    ).toBe("fern");
  });

  it("am Depot füllt E die Reserve auf — im laufenden Einsatz, ohne zu sterben", () => {
    const sim = createSim(mittlererSeed(), sektorGreybox);
    expect(depotNah(sim)).toBeNull(); // am Spawn noch nicht in Reichweite
    laufeZu(sim, depotB);
    sim._setReserve(0);
    sim.tick(command(), DT);
    expect(reserve(sim)).toBe(0);
    expect(depotNah(sim)).toBe("B");
    sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(RESERVE);
    expect(sim.getState().player.tot).toBe(false);
    expect(sim.getState().player.hp).toBe(sim.getState().player.maxHp);
  });

  it("E ist flankengesteuert: gehalten füllt nicht erneut, erst die nächste Flanke", () => {
    const sim = createSim(mittlererSeed(), sektorGreybox);
    laufeZu(sim, depotB);
    sim._setReserve(0);
    sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(RESERVE);
    sim._setReserve(3);
    for (let i = 0; i < 30; i += 1) sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(3);
    sim.tick(command(), DT); // loslassen
    sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(RESERVE);
  });

  it("außerhalb der Reichweite ist E wirkungslos", () => {
    const sim = createSim(mittlererSeed(), sektorGreybox);
    laufeZu(sim, { x: 0, z: 4 }); // in den Verbindungsgraben
    expect(zoneAt(meta, sim.getState().player.pos)).toBe("verbindungsgraben");
    expect(depotNah(sim)).toBeNull();
    sim._setReserve(0);
    sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(0);
  });

  it("ein gefallener Abschnitt hat sein Depot verloren; rueckerobern gibt es zurück", () => {
    const sim = createSim(mittlererSeed(), sektorGreybox);
    laufeZu(sim, depotB);
    sim._setAbschnittVerloren("B", true);
    sim._setReserve(0);
    sim.tick(command(), DT);
    expect(depotNah(sim)).toBeNull();
    sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(0);

    sim.rueckerobern("B"); // Abschnitt ist leer → verloren → gebrochen, Depot zurück
    sim.tick(command(), DT);
    expect(sim.getState().front.find((f) => f.id === "B")?.zustand).toBe(
      "gebrochen",
    );
    expect(depotNah(sim)).toBe("B");
    sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(RESERVE);
  });

  it("im Tod gibt es kein Depot in Reichweite und E füllt nicht", () => {
    const sim = createSim(mittlererSeed(), sektorGreybox);
    laufeZu(sim, depotB);
    sim._setReserve(0);
    sim.applyDamage(999);
    sim.tick(command(), DT);
    expect(sim.getState().player.tot).toBe(true);
    expect(depotNah(sim)).toBeNull();
    sim.tick(command({ interact: true }), DT);
    expect(reserve(sim)).toBe(0);
  });

  it("im Finale nach 'gewonnen' bleibt E die Extraktion — auch am Depot", () => {
    const sim = createSim(mittlererSeed(), sektorGreybox, {
      waves: true,
      startAngriffskraft: 3,
    });
    const dreheUndFeuere = (i: number) => command({ dx: 40, fire: i % 45 < 2 });
    for (
      let i = 0;
      i < 30000 && sim.getState().einsatz.ergebnis !== "gewonnen";
      i += 1
    ) {
      sim.tick(dreheUndFeuere(i), DT);
    }
    expect(sim.getState().einsatz.ergebnis).toBe("gewonnen");
    laufeZu(sim, depotB);
    sim._setReserve(0);
    sim.tick(command(), DT);
    expect(depotNah(sim)).toBe("B");
    sim.tick(command({ interact: true }), DT);
    expect(sim.getState().einsatz.phase).toBe("vorbei");
    expect(reserve(sim)).toBe(0); // E war die Extraktion, kein Auffüllen
  });
});

describe("Greybox-Sektor — Kartengrenze & Umland (AP5-03)", () => {
  const { boxes } = sektorGreybox;
  const oben = (b: (typeof boxes)[number]) => b.center.y + b.size.y / 2;
  const deckt = (b: (typeof boxes)[number], x: number, y: number, z: number) =>
    Math.abs(x - b.center.x) <= b.size.x / 2 &&
    Math.abs(z - b.center.z) <= b.size.z / 2 &&
    y >= b.center.y - b.size.y / 2 &&
    y <= oben(b);
  // Spielfeld = Innenseite der Kartengrenz-Kollider (x ±24,8 · z −36,3 … 52,8).
  const draussen = (b: (typeof boxes)[number]) =>
    b.center.x + b.size.x / 2 <= -24.8 ||
    b.center.x - b.size.x / 2 >= 24.8 ||
    b.center.z - b.size.z / 2 >= 52.8 ||
    b.center.z + b.size.z / 2 <= -36.3;

  it("die vier Kartengrenz-Kollider sind unsichtbar und umschließen den Sektor", () => {
    const grenze = boxes.filter((b) => b.unsichtbar);
    expect(grenze).toHaveLength(4);
    for (const b of grenze) expect(b.size.y).toBeGreaterThanOrEqual(4);
    const west = grenze.find((b) => Math.abs(b.center.x + 25) < 0.01);
    const ost = grenze.find((b) => Math.abs(b.center.x - 25) < 0.01);
    const nord = grenze.find((b) => Math.abs(b.center.z - 53) < 0.01);
    const sued = grenze.find((b) => Math.abs(b.center.z + 36.5) < 0.01);
    expect(west && ost && nord && sued).toBeTruthy();
    expect(west!.size.z).toBeGreaterThanOrEqual(89); // z −38 … 54
    expect(nord!.size.x).toBeGreaterThanOrEqual(50); // x −25 … 25
  });

  it("das Umland schließt an jede Sektorkante bündig an — Oberkante = Geländeoberfläche, bis in den Dunst", () => {
    const proben: [number, number][] = [
      [-26, 0],
      [26, 0],
      [0, 54],
      [0, -37],
      [-150, 100],
      [150, -100],
      [0, 180],
      [0, -180],
      [-26, 13.5], // Frontgraben-Ende: Erd-Stirnwand statt Loch
      [26, -28], // Home-Graben-Ende
    ];
    for (const [x, z] of proben) {
      const boden = boxes.filter((b) => !b.unsichtbar && deckt(b, x, -0.5, z));
      expect(boden.length, `Umland fehlt bei (${x}, ${z})`).toBeGreaterThan(0);
      expect(Math.max(...boden.map(oben))).toBeCloseTo(0, 6);
    }
  });

  it("jenseits der Spielgrenze ragt kein sichtbarer Quader höher als 1,5 m — keine Wand-Silhouette", () => {
    const aussen = boxes.filter((b) => !b.unsichtbar && draussen(b));
    expect(aussen.length).toBeGreaterThanOrEqual(4);
    for (const b of aussen) {
      expect(
        oben(b),
        `Quader bei (${b.center.x}, ${b.center.z})`,
      ).toBeLessThanOrEqual(1.5);
    }
  });

  it("Zonen, Abschnitte und Nav-Graph liegen weiter komplett innerhalb der Grenze", () => {
    const { meta } = sektorGreybox;
    for (const z of meta.zonen) {
      expect(z.bounds.minX).toBeGreaterThanOrEqual(-25);
      expect(z.bounds.maxX).toBeLessThanOrEqual(25);
      expect(z.bounds.minZ).toBeGreaterThanOrEqual(-36.5);
      expect(z.bounds.maxZ).toBeLessThanOrEqual(53);
    }
    for (const k of meta.navGraph.knoten) {
      expect(Math.abs(k.pos.x)).toBeLessThan(24.8);
      expect(k.pos.z).toBeGreaterThan(-36.3);
      expect(k.pos.z).toBeLessThan(52.8);
    }
  });

  it("die Spielgrenze bleibt wirksam: Kapsel bleibt auf Feld, Labyrinth und im Home-Graben vor der Grenze", () => {
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
        expect(pos.y).toBeGreaterThan(-3); // nicht aus der Welt gefallen
      }
      return pos;
    };
    const ost = laufe({ x: 10, y: 0.05, z: -5 }, 4.5, 0); // Feld → Osten
    expect(ost.x).toBeLessThanOrEqual(24.8 - 0.35 + 1e-6);
    expect(ost.x).toBeGreaterThan(24);
    expect(ost.y).toBeCloseTo(0, 3); // nicht über die Grenze geklettert
    const west = laufe({ x: -10, y: 0.05, z: -5 }, -4.5, 0);
    expect(west.x).toBeGreaterThanOrEqual(-24.8 + 0.35 - 1e-6);
    const nord = laufe({ x: 8, y: 0.05, z: 40 }, 0, 4.5); // Labyrinth → Norden (x = 8: frei von Turmruine und Wällen)
    expect(nord.z).toBeLessThanOrEqual(52.8 - 0.35 + 1e-6);
    expect(nord.z).toBeGreaterThan(52);
    const sued = laufe({ x: 6, y: -1.75, z: -30 }, 0, -4.5); // Home-Graben → Süden
    expect(sued.z).toBeGreaterThan(-36.3);
    expect(sued.y).toBeCloseTo(-1.8, 3); // im Graben geblieben
  });
});
