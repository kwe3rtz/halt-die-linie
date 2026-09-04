import { describe, expect, it } from "vitest";
import { createSim, type InputCommand } from "./index";
import { abschnittAt, zoneAt, type ZonenId } from "./sektor";
import { kuerzesterPfad } from "./navgraph";
import { sektorGreybox } from "../data/sektor";

const DT = 1 / 60;

function command(
  parts: Partial<{
    x: number;
    y: number;
    fire: boolean;
    dx: number;
  }> = {},
): InputCommand {
  return {
    move: { x: parts.x ?? 0, y: parts.y ?? 0 },
    look: { dx: parts.dx ?? 0, dy: 0 },
    buttons: {
      fire: parts.fire ?? false,
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
    const abbauSteht = 60 - sSteht.wave.angriffskraftRest;
    const abbauFiel = 60 - sFiel.wave.angriffskraftRest;
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
