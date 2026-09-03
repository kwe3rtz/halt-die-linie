# AP4-02 — Feind-Navigation: semantischer Graph

**Status:** offen
**Arbeitspaket:** 4 · **Branch:** `arbeitspaket-4`
**Referenz:** `KONZEPT.md` §3 (Zonen, „Gegner materialisieren nie im Sichtfeld"),
§5 (Feind im Graben, Infiltration), `SPARRING-ANTWORTEN.md` → „Runde 2" (Graph
statt NavMesh: `spawn → labyrinth → front → feld/connector → home`).

## Ziel

Gegner laufen nicht mehr stur auf den Spieler zu, sondern folgen einem
**semantischen Graphen** durch den Sektor: von den Anmarschpunkten durchs
Labyrinth an die Frontlinie, nach einem Durchbruch weiter übers Feld oder durch
den Verbindungsgraben zur Home-Line. Kein NavMesh, kein A*-über-Gitter — ein
handgepflegter Knoten-/Kantengraph, der aus `SektorData` fällt.

## Umsetzung

**Daten:**

- `SektorMeta.navGraph`:
  ```ts
  {
    knoten: { id: string; pos: Vec3; zone: ZonenId }[];
    kanten: { von: string; nach: string; offen: boolean }[];   // ungerichtet nutzbar
  }
  ```
  Für den Greybox **handgepflegt** in `sektor.ts` (der Generator erzeugt ihn
  später automatisch mit). Knoten an: Anmarschpunkten, Labyrinth-Kreuzungen, je
  Frontabschnitt ein `front-<id>`-Knoten + ein `bresche-<id>`-Knoten,
  Feld-links/-mitte/-rechts, Connector-Knicken, Home-Zugängen, einem
  `home-ziel`-Knoten.
- Kanten Labyrinth→Front: immer `offen: true`. Kanten Front→hinten (übers Feld,
  in den Connector): starten `offen: false`, werden von AP4-03 geöffnet, wenn der
  Abschnitt fällt. In AP4-02 dafür ein Test-Schalter auf dem Sim-Interface
  (`_setKanteOffen(von, nach, offen)` o. Ä., als Testeingang markiert).

**Sim (`src/sim`):**

- `src/sim/navgraph.ts`: `kuerzesterPfad(graph, vonId, zielId): string[]`
  (BFS über **offene** Kanten, rein, deterministisch), `naechsterKnoten(graph, pos): string`.
- `src/sim/enemies.ts`: `EnemyEntity` bekommt `pfad: string[]` + `pfadIndex`.
  `updateEnemies` folgt statt „direkt auf `playerPos`" den Wegpunkten
  (`moveCapsule` wie gehabt). Umschalten auf das **bestehende Nahkampf-Verhalten**,
  sobald der Spieler in Nahkampf-Reichweite **und** grober Sichtlinie ist, oder
  der Gegner den Zielknoten erreicht hat.
- Ziel-Logik:
  - Anmarsch-Abschnitt beim Spawn zufällig (`rng`) aus den **aktiven
    Angriffsachsen** (Director-Info; solo ~2 aktiv).
  - Steht die Frontlinie im Ziel-Abschnitt → Ziel = `front-<id>` (Gegner „drückt"
    gegen die Front).
  - Ist der Abschnitt `verloren` (AP4-03) → Ziel = `home-ziel` (Gegner flutet
    nach hinten, über die dann offenen Kanten).
- **Infiltration:** ein `verlorener` Abschnitt aktiviert einen verdeckten
  `reinforcement-<id>`-Knoten (im Labyrinth / hinter der Front, außerhalb
  typischer Sichtkegel) — neue Spawns dort. **Nie** im offenen Feld im Sichtkegel
  des Spielers. (Nur die Spawn-Ort-Wahl; der Rauchvorhang ist Render, AP4-05.)

**Render:** nichts Zwingendes. Optional hinter Dev-Flag: Graph als Debug-Linien.

## Akzeptanzkriterien

- Gegner laufen sichtbar durchs Labyrinth an die Frontlinie — nicht quer durch
  Geometrie, nicht schnurstracks durch Wände zum Spieler.
- Test-Schalter „Abschnitt B verloren" → neu gespawnte Gegner nehmen den Weg
  übers Feld / durch den Connector Richtung Home.
- Nahkampf trifft weiterhin (altes Verhalten greift in Reichweite + Sicht).
- Kein Gegner-Spawn im offenen Feld im Sichtkegel des Spielers.
- Vitest `navgraph.test.ts` (Pfadsuche, geschlossene Kanten werden gemieden,
  Determinismus) + `enemies.test.ts` erweitert (Wegpunkt-Folgen, Zielwechsel bei
  „verloren").
- Golden-/Replay: **neuer Anker** mit dem Sektor-Graphen (Seed + Sequenz →
  stabile Gegnerpositionen). Goldene Regel gehalten.

## Offene Rückfragen

Wenn Wegpunkt-Folgen im engen Graben eckig wirkt: leichtes Vorausschauen (2
Knoten) — aber **kein** Steering-Framework, keine vorzeitige Abstraktion.
Pfad-Neuberechnung nur bei Zielwechsel, nicht pro Tick.
