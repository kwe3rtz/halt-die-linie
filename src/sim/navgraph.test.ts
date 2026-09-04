import { describe, expect, it } from "vitest";
import { imSichtkegel, kuerzesterPfad, naechsterKnoten } from "./navgraph";
import type { NavGraph } from "./sektor";
import { sektorGreybox } from "../data/sektor";

// Kleiner Testgraph: Kette a — b — c — d, plus die Abkürzung b — d (anfangs zu).
const graph: NavGraph = {
  knoten: [
    { id: "a", pos: { x: 0, y: 0, z: 0 }, zone: "feindzone" },
    { id: "b", pos: { x: 10, y: 0, z: 0 }, zone: "labyrinth" },
    { id: "c", pos: { x: 20, y: 0, z: 0 }, zone: "labyrinth" },
    { id: "d", pos: { x: 30, y: 0, z: 0 }, zone: "frontlinie" },
    { id: "e", pos: { x: 15, y: 0, z: 5 }, zone: "feld" },
  ],
  kanten: [
    { von: "a", nach: "b", offen: true },
    { von: "b", nach: "c", offen: true },
    { von: "c", nach: "d", offen: true },
    { von: "b", nach: "d", offen: false }, // Abkürzung, anfangs gesperrt
  ],
};

describe("navgraph — kuerzesterPfad", () => {
  it("findet den Weg über offene Kanten", () => {
    expect(kuerzesterPfad(graph, "a", "d")).toEqual(["a", "b", "c", "d"]);
  });

  it("gibt [start] bei start === ziel", () => {
    expect(kuerzesterPfad(graph, "b", "b")).toEqual(["b"]);
  });

  it("meidet die geschlossene Abkürzung (nimmt die offene Kette)", () => {
    expect(kuerzesterPfad(graph, "b", "d")).toEqual(["b", "c", "d"]);
  });

  it("nimmt die Abkürzung, sobald sie offen ist", () => {
    const offen: NavGraph = {
      knoten: graph.knoten,
      kanten: graph.kanten.map((k) => ({ ...k, offen: true })),
    };
    expect(kuerzesterPfad(offen, "b", "d")).toEqual(["b", "d"]);
  });

  it("liefert [] wenn kein Weg existiert", () => {
    expect(kuerzesterPfad(graph, "a", "e")).toEqual([]); // e ist isoliert
    expect(kuerzesterPfad(graph, "a", "gibtsnicht")).toEqual([]);
  });

  it("ist deterministisch (gleicher Graph → gleicher Pfad)", () => {
    expect(kuerzesterPfad(graph, "a", "d")).toEqual(
      kuerzesterPfad(graph, "a", "d"),
    );
    const g = sektorGreybox.meta.navGraph;
    expect(kuerzesterPfad(g, "anmarsch-west", "front-C")).toEqual(
      kuerzesterPfad(g, "anmarsch-west", "front-C"),
    );
  });
});

describe("navgraph — naechsterKnoten", () => {
  it("liefert den nächstgelegenen Knoten (X/Z)", () => {
    expect(naechsterKnoten(graph, { x: 9, y: 0, z: 1 })).toBe("b");
    expect(naechsterKnoten(graph, { x: 28, y: 3, z: 0 })).toBe("d");
  });

  it("bricht Gleichstand deterministisch nach Id", () => {
    // exakt zwischen a (x0) und b (x10)
    expect(naechsterKnoten(graph, { x: 5, y: 0, z: 0 })).toBe("a");
  });
});

describe("navgraph — imSichtkegel", () => {
  const auge = { x: 0, y: 1.6, z: 0 };
  it("Punkt vor dem Spieler (yaw 0 = +Z) liegt im Kegel", () => {
    expect(imSichtkegel(auge, 0, { x: 1, y: 0, z: 10 })).toBe(true);
  });
  it("Punkt hinter dem Spieler liegt nicht im Kegel", () => {
    expect(imSichtkegel(auge, 0, { x: 0, y: 0, z: -10 })).toBe(false);
  });
  it("Punkt außerhalb der Reichweite liegt nicht im Kegel", () => {
    expect(imSichtkegel(auge, 0, { x: 0, y: 0, z: 200 })).toBe(false);
  });
  it("dreht mit yaw mit (yaw +90° blickt nach +X)", () => {
    expect(imSichtkegel(auge, Math.PI / 2, { x: 10, y: 0, z: 0 })).toBe(true);
    expect(imSichtkegel(auge, Math.PI / 2, { x: 0, y: 0, z: 10 })).toBe(false);
  });
});
