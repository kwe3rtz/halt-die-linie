// Der handgebaute Greybox-Sektor — der Nacht-Sektor aus KONZEPT.md §3 (neu
// gefasst 2026-09-07) als reine Daten. Ein größeres, frei begehbares,
// verzweigtes WW1-Grabennetz mit EINER durchgehenden Frontlinie und EINER
// Home-Line. EINE Quelle für Render-Meshes (`src/render`) und Sim-Collider
// (`src/sim/collision`).
//
// Von der Feindseite nach hinten (KONZEPT.md §3):
//   Feindseite → Niemandsland → Frontlinie → Hinterland → Home-Line.
// Alle Maße sind Greybox-Startwerte (Ticket AP6-01), im Spieltest justiert.
// Der Sektor liefert genau EINE `frontLinie` (id "front") + EINE `homeLinie`
// (id "home"). Die Rollen-Felder (`zielKnoten`, `reinfKnoten`, `brescheZugang`,
// `hintenKanten`) tragen das Nav-Wissen, das früher in `index.ts` aus A/B/C-
// Strings abgeleitet wurde (AP6-02, Audit H2).
import type { Vec3 } from "../sim/math";
import type { Aabb, LevelBox } from "../sim/collision";
import type {
  NavGraph,
  NavKante,
  NavKnoten,
  SektorData,
  SektorMeta,
  ZonenId,
} from "../sim/sektor";
import { brescheTag } from "../sim/sektor";
import {
  modul,
  GRABEN_SOHLE,
  BRESCHE_BREITE,
  type ParapetLuecke,
} from "./module";

function raw(center: Vec3, size: Vec3): LevelBox {
  return { center, size };
}

// --- Breschen (AP4-03/06): EINE Quelle für Geometrie (getaggte Parapet-
//     Segmente) und Meta (`parapetBreschen`). Die Sim schaltet das Segment ab,
//     sobald die Bresche offen ist — dann ist die Bresche ein echtes Loch.
//     Reihenfolge = Tag-Index: [0] = Mitte (die Frontlinie hängt hier ihren
//     `brescheZugang` ein — Nav-Knoten `bresche-front`), [1] = Flanke (nur
//     physisches Loch, kein Nav-Knoten — Audit M7 → AP7). Die Home-Line hat
//     gar keinen Bresche-Nav-Zugang. ---
const BRESCHEN_FRONT: Vec3[] = [
  { x: 0, y: -0.4, z: 17.5 },
  { x: -20, y: -0.4, z: 17.5 },
];
const BRESCHEN_HOME: Vec3[] = [
  { x: 14, y: -0.4, z: -31 },
  { x: -14, y: -0.4, z: -31 },
];

/**
 * Eine Parapet-Lücke für `modul("parapet", at, 90, …)`: bei 90° zeigt die
 * lokale Längsachse nach −X (`drehXZ`), also `z_lokal = at.x − x_welt`. `linie`
 * ("front" | "home") + `tagIndex` bilden das Segment-Etikett (`brescheTag`).
 */
function luecke(
  linie: string,
  atX: number,
  bresche: Vec3,
  tagIndex: number,
): ParapetLuecke {
  return {
    z: atX - bresche.x,
    breite: BRESCHE_BREITE,
    tag: brescheTag(linie, tagIndex),
  };
}

function aabb(minX: number, minZ: number, maxX: number, maxZ: number): Aabb {
  // Zonen/Linien sind Säulen über die volle Höhe — nur X/Z werden geprüft.
  return { minX, minY: -6, minZ, maxX, maxY: 10, maxZ };
}

const IN_GRABEN = GRABEN_SOHLE + 0.2; // Marker knapp über der Grabensohle
const AUF_FELD = 0.2; // Marker knapp über der Geländeoberkante
const FRONT_MIN_Z = 10;
const FRONT_MAX_Z = 22;
const HOME_MIN_Z = -41;
const HOME_MAX_Z = -30;

// Kartengrenze (unsichtbare Sperrwände, AP5-03): x = ±34, z = +72 / −46.
const GRENZE_X = 34;
const GRENZE_NORD = 72;
const GRENZE_SUED = -46;

// ---------------------------------------------------------------------------
// Geometrie
// ---------------------------------------------------------------------------

const boxes: LevelBox[] = [
  // === Kartengrenze — unsichtbare Sperrwände rundum (AP5-03) ================
  ...modul("kartengrenze", { x: -GRENZE_X, y: 0, z: GRENZE_SUED }, 0, {
    laenge: GRENZE_NORD - GRENZE_SUED,
  }),
  ...modul("kartengrenze", { x: GRENZE_X, y: 0, z: GRENZE_SUED }, 0, {
    laenge: GRENZE_NORD - GRENZE_SUED,
  }),
  ...modul("kartengrenze", { x: GRENZE_X, y: 0, z: GRENZE_NORD }, 90, {
    laenge: 2 * GRENZE_X,
  }),
  ...modul("kartengrenze", { x: GRENZE_X, y: 0, z: GRENZE_SUED }, 90, {
    laenge: 2 * GRENZE_X,
  }),

  // === Umland (AP5-03) — offenes, auslaufendes Gelände jenseits der Grenze,
  //     Oberkante bündig mit y = 0, so weit, dass der Nacht-Dunst die Außen-
  //     kante schluckt. Unerreichbar (die Kartengrenze sperrt davor). =========
  raw({ x: -160, y: -1.5, z: 13 }, { x: 250, y: 3, z: 640 }), // West
  raw({ x: 160, y: -1.5, z: 13 }, { x: 250, y: 3, z: 640 }), // Ost
  raw({ x: 0, y: -1.5, z: 232 }, { x: 70, y: 3, z: 320 }), // Nord (ab z = 72)
  raw({ x: 0, y: -1.5, z: -206 }, { x: 70, y: 3, z: 320 }), // Süd (ab z = −46)
  // Flache Trichterränder / Erdhaufen im Umland (≤ 1,1 m — keine Wand).
  raw({ x: -46, y: 0.4, z: 30 }, { x: 8, y: 0.8, z: 6 }),
  raw({ x: -52, y: 0.5, z: -14 }, { x: 9, y: 1.0, z: 7 }),
  raw({ x: 44, y: 0.4, z: 26 }, { x: 7, y: 0.8, z: 6 }),
  raw({ x: 50, y: 0.55, z: -20 }, { x: 10, y: 1.1, z: 7 }),
  raw({ x: -14, y: 0.4, z: 86 }, { x: 9, y: 0.8, z: 6 }),
  raw({ x: 18, y: 0.35, z: 92 }, { x: 7, y: 0.7, z: 5 }),
  raw({ x: -10, y: 0.35, z: -60 }, { x: 7, y: 0.7, z: 5 }),
  raw({ x: 22, y: 0.5, z: -66 }, { x: 8, y: 1.0, z: 6 }),

  // === Feindseite — feindliches Grabenstück + Anmarschwege (KONZEPT.md §3:
  //     „Der Feind spawnt hier, solange die Frontlinie steht"). Für den
  //     Spieler nicht betretbar: eine unsichtbare Sperrwand bei z = 53 sperrt
  //     alles nördlich der Spawn-Punkte (z ≈ 49–51).
  raw({ x: 0, y: -0.5, z: 62 }, { x: 60, y: 1, z: 22 }), // Feindseiten-Boden (z 51..73)
  { ...raw({ x: 0, y: 2, z: 53 }, { x: 62, y: 8, z: 0.6 }), unsichtbar: true },
  // Feind-Grabenlinie + Silhouette (nur Kulisse, nördlich der Sperrwand) —
  // verdeckt die Spawn-Punkte von der Frontlinie aus.
  raw({ x: -22, y: 1, z: 55 }, { x: 9, y: 2, z: 3 }),
  raw({ x: 0, y: 1, z: 55 }, { x: 11, y: 2, z: 3 }),
  raw({ x: 22, y: 1, z: 55 }, { x: 9, y: 2, z: 3 }),
  raw({ x: 0, y: -0.9, z: 62 }, { x: 60, y: 1.8, z: 3.6 }),
  raw({ x: 0, y: 0.6, z: 64.2 }, { x: 60, y: 2.4, z: 0.5 }),

  // === Niemandsland — Trichterfeld, Drahtreste, Ruinen. Verzweigt, viel
  //     Deckung — aber alle Ruinen ≤ 1,8 m und in den Taschen ZWISCHEN den
  //     Nav-Bahnen (x ±22 / x 0 vertikal, z ≈ 44 / z ≈ 32 quer). =============
  // Boden stößt an die Frontgraben-Nordkante (z 18,5) — durchgehender Boden
  // Niemandsland ↔ Frontgraben, ohne Loch zwischen den beiden Flächen.
  raw({ x: 0, y: -0.5, z: 35.5 }, { x: 64, y: 1, z: 34 }), // Boden Niemandsland (z 18,5..52,5)
  // Landmark — Beobachtungsturm-Ruine (schmal + hoch), in der West-Tasche.
  raw({ x: -8, y: 3, z: 39 }, { x: 2.6, y: 8, z: 2.6 }),
  // Ruinen-Cluster in den vier Taschen (Deckung, klar abseits der Bahnen).
  raw({ x: -13, y: 0.9, z: 38 }, { x: 6, y: 1.8, z: 4 }),
  raw({ x: 13, y: 0.9, z: 38 }, { x: 6, y: 1.8, z: 4 }),
  raw({ x: -13, y: 0.7, z: 26 }, { x: 5, y: 1.4, z: 3 }),
  raw({ x: 13, y: 0.7, z: 26 }, { x: 5, y: 1.4, z: 3 }),
  // Deckung für den verdeckten Verstärkungs-Knoten (nördlich davon).
  raw({ x: -7, y: 0.85, z: 29 }, { x: 5, y: 1.7, z: 2.5 }),
  // Drahtreste / Trichter (reine Deckung, ≤ 0,9 m — blocken keine Kapsel).
  raw({ x: -18, y: 0.4, z: 37 }, { x: 3, y: 0.8, z: 3 }),
  raw({ x: 18, y: 0.4, z: 37 }, { x: 3, y: 0.8, z: 3 }),
  raw({ x: 4, y: 0.4, z: 27 }, { x: 3, y: 0.8, z: 3 }),

  // === Frontlinie — EINE durchgehende Grabenlinie über die Sektorbreite ====
  raw({ x: 0, y: GRABEN_SOHLE - 0.5, z: 15 }, { x: 64, y: 1, z: 7 }), // Grabensohle
  // Parapet, drei Segmente mit zwei ~5-m-Sap-Lücken (x ±5..±10) dazwischen.
  // Bresche [0] in der Mitte (Nav-Knoten), Bresche [1] im Westsegment (Loch).
  ...modul("parapet", { x: 30, y: 0, z: 17.5 }, 90, { laenge: 20 }), // Ost x 10..30
  ...modul("parapet", { x: 5, y: 0, z: 17.5 }, 90, {
    laenge: 10,
    luecken: [luecke("front", 5, BRESCHEN_FRONT[0]!, 0)],
  }), // Mitte x −5..5
  ...modul("parapet", { x: -10, y: 0, z: 17.5 }, 90, {
    laenge: 20,
    luecken: [luecke("front", -10, BRESCHEN_FRONT[1]!, 1)],
  }), // West x −10..−30
  // Parados (Rückwand) — Lücken für 2 Rampen (x ±16) + die Laufgraben-Mündung (x 0).
  raw({ x: -25, y: -0.6, z: 11.5 }, { x: 14, y: 2.4, z: 0.5 }),
  raw({ x: -8, y: -0.6, z: 11.5 }, { x: 12, y: 2.4, z: 0.5 }),
  raw({ x: 8, y: -0.6, z: 11.5 }, { x: 12, y: 2.4, z: 0.5 }),
  raw({ x: 25, y: -0.6, z: 11.5 }, { x: 14, y: 2.4, z: 0.5 }),
  // Rampen Hinterland → Frontgraben (ohne Sprung begehbar).
  ...modul("rampe", { x: -16, y: 0, z: 10.8 }, 0, { laenge: 4, breite: 4 }),
  ...modul("rampe", { x: 16, y: 0, z: 10.8 }, 0, { laenge: 4, breite: 4 }),

  // === Hinterland — großer frei begehbarer Bereich. Ein zentraler gedeckter
  //     Laufgraben (Mitte, x ±1,8) teilt den Bereich; zwei offene Seiten-
  //     routen (West / Ost) laufen über die Fläche. Drei verbundene Wege
  //     vorn↔hinten. =========================================================
  // Boden endet an der Home-Graben-Nordkante (z −29,5) — jenseits der
  // Parapet-Enden fällt der Feind hier 1,8 m in den Home-Graben.
  raw({ x: -18, y: -0.5, z: -9 }, { x: 32, y: 1, z: 41 }), // Boden West (x −34..−2, z −29,5..11,5)
  raw({ x: 18, y: -0.5, z: -9 }, { x: 32, y: 1, z: 41 }), // Boden Ost (x 2..34, z −29,5..11,5)
  // Zentraler Laufgraben (gedeckt, gerade) — Sohle z −32..12, Wände z −31..9.
  raw({ x: 0, y: GRABEN_SOHLE - 0.5, z: -10 }, { x: 3.6, y: 1, z: 44 }),
  raw({ x: -2.0, y: -0.55, z: -11 }, { x: 0.4, y: 2.5, z: 40 }),
  raw({ x: 2.0, y: -0.55, z: -11 }, { x: 0.4, y: 2.5, z: 40 }),
  // Flankenrampen Hinterland → Home-Graben (2-Wege, jenseits der Parapet-Enden).
  ...modul("rampe", { x: -31, y: 0, z: -29.5 }, 180, { laenge: 4, breite: 5 }),
  ...modul("rampe", { x: 31, y: 0, z: -29.5 }, 180, { laenge: 4, breite: 5 }),
  // Baracken-Ruinen / Geschützstellungen (Deckung, in den Taschen der
  // Seitenrouten — nicht auf x ±18..±30 / x 0).
  raw({ x: -12, y: 0.7, z: -18 }, { x: 5, y: 1.4, z: 4 }),
  raw({ x: 12, y: 0.7, z: -18 }, { x: 5, y: 1.4, z: 4 }),
  raw({ x: -31, y: 0.9, z: -6 }, { x: 5, y: 1.8, z: 4 }),
  raw({ x: 31, y: 0.9, z: -6 }, { x: 5, y: 1.8, z: 4 }),
  raw({ x: -12, y: 0.9, z: 6 }, { x: 5, y: 1.8, z: 4 }),
  raw({ x: 12, y: 0.9, z: 6 }, { x: 5, y: 1.8, z: 4 }),

  // === Home-Line — durchgehende befestigte rückwärtige Linie ================
  raw({ x: 0, y: GRABEN_SOHLE - 0.5, z: -35 }, { x: 64, y: 1, z: 11 }), // Grabensohle z −40,5..−29,5
  // Nach Norden gerichtetes Parapet, zwei Segmente + Laufgraben-Lücke (x −4..4).
  ...modul("parapet", { x: 28, y: 0, z: -31 }, 90, {
    laenge: 24,
    luecken: [luecke("home", 28, BRESCHEN_HOME[0]!, 0)],
  }), // Ost x 4..28
  ...modul("parapet", { x: -4, y: 0, z: -31 }, 90, {
    laenge: 24,
    luecken: [luecke("home", -4, BRESCHEN_HOME[1]!, 1)],
  }), // West x −4..−28
  // Jenseits der Parapet-Enden (x ±29..±33) bleibt die Grabenkante offen —
  // der Feind steigt dort in den Home-Graben (wie an den Sap-Lücken vorn).
  // Rückwand mit drei Lücken für die Unterstände (Munition / Verband / Kdr.).
  raw({ x: -25, y: -0.6, z: -40.5 }, { x: 14, y: 2.4, z: 0.5 }),
  raw({ x: -8, y: -0.6, z: -40.5 }, { x: 12, y: 2.4, z: 0.5 }),
  raw({ x: 8, y: -0.6, z: -40.5 }, { x: 12, y: 2.4, z: 0.5 }),
  raw({ x: 25, y: -0.6, z: -40.5 }, { x: 14, y: 2.4, z: 0.5 }),
  // Drei begehbare Unterstände (dugouts hinter der Rückwand, z ≤ −40,5).
  ...modul("unterstand", { x: -16, y: GRABEN_SOHLE, z: -40.5 }, 180, {
    breite: 3.5,
    laenge: 3.5,
  }),
  ...modul("unterstand", { x: 0, y: GRABEN_SOHLE, z: -40.5 }, 180, {
    breite: 3.5,
    laenge: 3.5,
  }),
  ...modul("unterstand", { x: 16, y: GRABEN_SOHLE, z: -40.5 }, 180, {
    breite: 3.5,
    laenge: 3.5,
  }),
];

// ---------------------------------------------------------------------------
// Nav-Graph (AP4-02) — handgepflegt entlang der begehbaren Route. Deutlich mehr
// Knoten als der alte „H"-Sektor: größeres Netz, mehrere Wege vorn↔hinten.
// ---------------------------------------------------------------------------

function nk(
  id: string,
  x: number,
  z: number,
  zone: ZonenId,
  y = AUF_FELD,
): NavKnoten {
  return { id, pos: { x, y, z }, zone };
}

/** Engstelle (AP4-06): exakt durchlaufen, keine Ecke schneiden. */
function eng(k: NavKnoten): NavKnoten {
  return { ...k, engstelle: true };
}

const navKnoten: NavKnoten[] = [
  // --- Feindseite: Spawn-/Anmarschknoten (KONZEPT.md §3: verdeckt — die
  //     Silhouette nördlich davon + die Distanz nehmen sie aus dem Sichtfeld)
  nk("spawn-w", -22, 49, "feindseite"),
  nk("spawn-m", 0, 50, "feindseite"),
  nk("spawn-e", 22, 49, "feindseite"),

  // --- Niemandsland: drei Bahnen (x −22 / 0 / +22) + zwei Querreihen (z ≈ 44
  //     / z ≈ 32). Die Ruinen stehen in den Taschen dazwischen.
  nk("nm-w1", -22, 44, "niemandsland"),
  nk("nm-w2", -22, 32, "niemandsland"),
  nk("nm-m1", 0, 45, "niemandsland"),
  nk("nm-m2", 0, 33, "niemandsland"),
  nk("nm-e1", 22, 44, "niemandsland"),
  nk("nm-e2", 22, 32, "niemandsland"),
  // Verdeckter Verstärkungs-/Watchdog-Reloc-Knoten (KONZEPT.md §3: „materiali-
  // sieren nie im Sichtfeld") — hinter der Deckungsruine bei (−7, 29).
  nk("reinforcement-front", -7, 26, "niemandsland"),
  // Direkt vor der Frontlinie (`vorfront` = `frontLinie.brescheZugang.davor`).
  nk("vorfront-w", -16, 22, "niemandsland"),
  nk("vorfront", 0, 22, "niemandsland"),
  nk("vorfront-e", 16, 22, "niemandsland"),

  // --- Frontlinie: Sap-Lücken, Bresche-Kontakt, Grabenknoten, Parados-Rückwege
  eng(nk("sap-w", -7.5, 18.5, "frontlinie")),
  eng(nk("sap-e", 7.5, 18.5, "frontlinie")),
  nk("front-w", -16, 14.5, "frontlinie", IN_GRABEN),
  nk("front-front", 0, 14.5, "frontlinie", IN_GRABEN),
  nk("front-e", 16, 14.5, "frontlinie", IN_GRABEN),
  // Bresche-Kontaktknoten auf der Mittel-Bresche (x = 0) =
  // `frontLinie.brescheZugang.bresche`. Die West-Bresche (x = −20) hat keinen
  // eigenen Knoten — sie bleibt reines physisches Loch (Audit M7, volle
  // Nav-Modellierung erst im AP7-Politur-Ticket „Sektor-Wissen aus der Sim").
  eng(nk("bresche-front", 0, 17.5, "frontlinie")),
  eng(nk("parados-w", -16, 10.5, "frontlinie")),
  eng(nk("parados-e", 16, 10.5, "frontlinie")),
  eng(nk("parados-m", 0, 9.5, "hinterland", IN_GRABEN)),

  // --- Hinterland: zentraler gedeckter Laufgraben (Mitte) + zwei offene
  //     Seitenrouten über die Fläche (West x ≈ −18…−30 / Ost x ≈ 18…30)
  nk("hl-mitte", 0, -8, "hinterland", IN_GRABEN),
  nk("hl-sued", 0, -24, "hinterland", IN_GRABEN),
  nk("hl-w1", -18, 2, "hinterland"),
  nk("hl-w2", -24, -12, "hinterland"),
  nk("hl-w3", -30, -25, "hinterland"),
  nk("hl-e1", 18, 2, "hinterland"),
  nk("hl-e2", 24, -12, "hinterland"),
  nk("hl-e3", 30, -25, "hinterland"),

  // --- Home-Line (Feind kommt über die Flankenrampen bei x ±31 in den Graben)
  nk("home-graben", 0, -33, "homeline", IN_GRABEN),
  eng(nk("home-w", -31, -33.5, "homeline", IN_GRABEN)),
  eng(nk("home-e", 31, -33.5, "homeline", IN_GRABEN)),
  nk("home-ziel", 0, -37, "homeline", IN_GRABEN),
];

const auf = (von: string, nach: string): NavKante => ({
  von,
  nach,
  offen: true,
});
const zu = (von: string, nach: string): NavKante => ({
  von,
  nach,
  offen: false,
});

const navKanten: NavKante[] = [
  // Spawns → Niemandsland
  auf("spawn-w", "nm-w1"),
  auf("spawn-m", "nm-m1"),
  auf("spawn-e", "nm-e1"),
  auf("spawn-m", "nm-w1"),
  auf("spawn-m", "nm-e1"),
  // Niemandsland-Bahnen nach Süden + quer
  auf("nm-w1", "nm-w2"),
  auf("nm-e1", "nm-e2"),
  auf("nm-m1", "nm-m2"),
  auf("nm-w1", "nm-m1"),
  auf("nm-e1", "nm-m1"),
  auf("nm-w2", "nm-m2"),
  auf("nm-e2", "nm-m2"),
  auf("nm-w2", "vorfront-w"),
  auf("nm-m2", "vorfront"),
  auf("nm-e2", "vorfront-e"),
  // Verstärkungs-Knoten als Spur an der Mittelbahn (verdeckt vom Süden).
  auf("nm-m2", "reinforcement-front"),
  auf("reinforcement-front", "vorfront"),
  auf("vorfront-w", "vorfront"),
  auf("vorfront-e", "vorfront"),
  // Niemandsland → Frontlinie (Sap-Lücken; immer offen)
  auf("vorfront-w", "sap-w"),
  auf("vorfront", "sap-w"),
  auf("vorfront", "sap-e"),
  auf("vorfront-e", "sap-e"),
  auf("sap-w", "front-w"),
  auf("sap-w", "front-front"),
  auf("sap-e", "front-front"),
  auf("sap-e", "front-e"),
  auf("front-w", "front-front"),
  auf("front-front", "front-e"),
  // Bresche-Kontakt (Mittel-Bresche x = 0): an den Graben gehängt; die Kante
  // ins Niemandsland ist zu und öffnet erst, wenn AP4-03 das Parapet aufreißt.
  auf("front-front", "bresche-front"),
  zu("bresche-front", "vorfront"),
  // Frontlinie → Hinterland: starten zu; AP4-03 öffnet sie beim Linienfall
  // (`frontLinie.hintenKanten`). Drei parallele Rückwege.
  zu("front-w", "parados-w"),
  zu("front-front", "parados-m"),
  zu("front-e", "parados-e"),
  // Hinterland (Gelände immer begehbar) — drei getrennte Wege vorn↔hinten,
  // die sich nur an der Frontlinie und an der Home-Line treffen.
  auf("parados-w", "hl-w1"),
  auf("parados-e", "hl-e1"),
  auf("parados-m", "hl-mitte"),
  auf("hl-w1", "hl-w2"),
  auf("hl-w2", "hl-w3"),
  auf("hl-e1", "hl-e2"),
  auf("hl-e2", "hl-e3"),
  auf("hl-mitte", "hl-sued"),
  // Hinterland → Home-Line
  auf("hl-w3", "home-w"),
  auf("hl-e3", "home-e"),
  auf("hl-sued", "home-graben"),
  auf("home-graben", "home-ziel"),
  auf("home-w", "home-ziel"),
  auf("home-e", "home-ziel"),
];

const navGraph: NavGraph = { knoten: navKnoten, kanten: navKanten };

// ---------------------------------------------------------------------------
// Semantische Metadaten
// ---------------------------------------------------------------------------

const meta: SektorMeta = {
  // Lückenlose Z-Bänder über die volle Breite (Feindseite nach hinten).
  zonen: [
    { id: "feindseite", bounds: aabb(-GRENZE_X, 46, GRENZE_X, GRENZE_NORD) },
    { id: "niemandsland", bounds: aabb(-GRENZE_X, 22, GRENZE_X, 46) },
    {
      id: "frontlinie",
      bounds: aabb(-GRENZE_X, FRONT_MIN_Z, GRENZE_X, FRONT_MAX_Z),
    },
    { id: "hinterland", bounds: aabb(-GRENZE_X, -30, GRENZE_X, FRONT_MIN_Z) },
    { id: "homeline", bounds: aabb(-GRENZE_X, GRENZE_SUED, GRENZE_X, -30) },
  ],
  // Genau EINE Frontlinie (`front`) + EINE Home-Line (`home`) — je ein Objekt,
  // die `front.ts`-Maschine läuft je Linie. Die Rollen-Felder ersetzen die alte
  // A/B/C-String-Ableitung in `index.ts`/`enemies.ts` (AP6-02, Audit H2).
  frontLinie: {
    id: "front",
    bounds: aabb(-GRENZE_X, FRONT_MIN_Z, GRENZE_X, FRONT_MAX_Z),
    parapetBreschen: BRESCHEN_FRONT,
    bauSlots: [
      { x: -18, y: IN_GRABEN, z: 14 },
      { x: 0, y: IN_GRABEN, z: 14 },
      { x: 18, y: IN_GRABEN, z: 14 },
    ],
    // Depot hinter dem Feuertritt an der Parados-Rückwand (aus der Schusslinie).
    depot: { x: -4, y: IN_GRABEN, z: 12.5 },
    // Anrückende Wellengegner steuern den Frontgraben-Mittelknoten an.
    zielKnoten: "front-front",
    // Verdeckte Verstärkung/Watchdog-Reloc bei Linienfall (im Niemandsland).
    reinfKnoten: "reinforcement-front",
    // Mittel-Bresche (x = 0) hat den Nav-Zugang; die West-Bresche bleibt reines
    // Loch (Audit M7 → AP7-Politur).
    brescheZugang: { bresche: "bresche-front", davor: "vorfront" },
    // Rückwege Frontlinie → Hinterland, die beim Fall aufgehen (drei parallel).
    hintenKanten: [
      ["front-w", "parados-w"],
      ["front-front", "parados-m"],
      ["front-e", "parados-e"],
    ],
  },
  homeLinie: {
    id: "home",
    bounds: aabb(-GRENZE_X, HOME_MIN_Z, GRENZE_X, HOME_MAX_Z),
    parapetBreschen: BRESCHEN_HOME,
    bauSlots: [
      { x: -12, y: IN_GRABEN, z: -33 },
      { x: 12, y: IN_GRABEN, z: -33 },
    ],
    depot: { x: -6, y: IN_GRABEN, z: -38 },
    // Fällt die Front, fluten die Gegner zu diesem Knoten (letzte Linie).
    zielKnoten: "home-ziel",
    // Keine Infiltration / kein Weg hinter die Home-Line.
    reinfKnoten: "",
    hintenKanten: [],
  },
  feindAnmarsch: [
    { x: -22, y: AUF_FELD, z: 49 },
    { x: 0, y: AUF_FELD, z: 50 },
    { x: 22, y: AUF_FELD, z: 49 },
  ],
  homeZugaenge: [
    { id: "mitte", pos: { x: 0, y: IN_GRABEN, z: -32 } },
    { id: "west", pos: { x: -31, y: IN_GRABEN, z: -32 } },
    { id: "ost", pos: { x: 31, y: IN_GRABEN, z: -32 } },
  ],
  landmark: { x: -8, y: 0, z: 39 },
  // Instandsetzungs-Punkte (AP6-04): je Linie ein exponierter Marker. Hier nur
  // Daten — die Interaktion baut AP6-04.
  instandPunkte: [
    { linie: "front", pos: { x: 0, y: IN_GRABEN, z: 16 } },
    { linie: "home", pos: { x: 0, y: IN_GRABEN, z: -33 } },
  ],
  // Statische Orientierungs-Lichter für die Nacht (Feuertonnen / Leuchtfeuer).
  lichter: [
    { x: 0, y: 1.2, z: -35 }, // Home-Graben Mitte
    { x: -20, y: 1.2, z: -34 }, // Home West
    { x: 20, y: 1.2, z: -34 }, // Home Ost
    { x: -4, y: -0.6, z: 13 }, // Frontgraben (Depot)
    { x: 18, y: -0.6, z: 14 }, // Frontgraben Ost
    { x: -8, y: 6, z: 39 }, // Landmark-Turm (Leuchtkugel)
  ],
  // Leit-„Spines" (AP4-05) — seit AP5-05 nicht mehr gezeichnet (KONZEPT.md §10).
  spineRouten: [],
  // Spawn im Frontgraben, klar zwischen den Rampen (x ±16) — auf der Sohle.
  spielerSpawn: [
    { x: 0, y: -1.4, z: 15 },
    { x: -10, y: -1.4, z: 15 },
    { x: 10, y: -1.4, z: 15 },
  ],
  navGraph,
};

export const sektorGreybox: SektorData = {
  boxes,
  spawnPoints: meta.spielerSpawn,
  enemySpawnPoints: meta.feindAnmarsch,
  meta,
};
