# AP4-02 — Feind-Navigation: semantischer Graph

**Status:** erledigt · `20bf9a0` · reviewed 2026-09-04
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

---

## Bericht — AP4-02

COMMIT: <wird beim Merge/Archiv ergänzt> (Branch arbeitspaket-4)
CI: grün / grün (Hash in der Nachricht an die Planer-Session)
TODO(Rückfrage):

1. **Labyrinth-Geometrie in AP4-02 justiert** (`src/data/sektor.ts`): der
   AP4-01-Stub (4 volle Zickzack-Wälle + breiter Landmark-Hulk) hatte eine
   Sackgasse — Landmark + Wälle dichteten das Band z 38–44 quer ab, Gegner
   krochen mit ~0,7 m/s. Jetzt: 3 versetzte Wälle mit ~4-m-Versatz-Lücke,
   schmaler+hoher Landmark-Turm nördlich davon, `feindAnmarsch` von z 48 auf
   z 44 vorgezogen (Marschzeit an die Front jetzt ~15–20 s). Zonen-Bounds
   unverändert. Reine Greybox-Anpassung — bitte beim Spieltest querchecken.
2. **Feld-Tiefe / Verbindungsgraben-Länge** bleiben wie in AP4-01 (Greybox).
3. **Feindzone weiterhin nicht für den Spieler gesperrt** — der leere Raum
   nördlich von `feindAnmarsch` (z 44–53) ist begehbar. Zutritts-Sperre ist
   Gameplay; kann mit der `feindAnmarsch`-Korridor-Geometrie kommen (AP4-05 /
   eigenes Ticket).
4. **`aktiveAchsen` = alle Abschnitte im Greybox** (statt „solo ~2 aktiv") —
   die spielerzahl-abhängige Auswahl gehört zum Wave-Director-Ausbau (AP4-04).
   `SimOptions.aktiveAchsen` steht bereit; Tests nutzen es.
5. **Wegpunkt-Feinschliff:** seitlicher Versatz je Gegner (× Distanz-Faktor,
   läuft zur Engstelle wieder zusammen) + gedämpfte Separation im Fern-Anmarsch,
   damit die Kette am gemeinsamen Wegpunkt nicht staut. Kein Steering-Framework.
   Kann im Spieltest nachjustiert werden (`WEGPUNKT_*`, `MARSCH_SEPARATION` in
   `src/sim/enemies.ts`).

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓
> vitest run --coverage            ✓  16 Dateien, 139 Tests (vorher 116)
    Coverage src/sim: 96,32 % Stmts / 94,69 % Branch / 100 % Funcs
    src/sim/navgraph.ts 93,33 %  ·  src/sim/enemies.ts 90,47 %  ·  sektor.ts 100 %
> vite build                       ✓  dist/assets/index-*.js 6.883 kB │ gzip 1.525 kB
```

Tests: 139 (16 Dateien, +23) · Coverage src/sim **96,32 %** · Bundle ~6,88 MB /
~1,52 MB gzip (Δ ~+6 kB, ~760 Zeilen TS, kein neuer Import).

### Umsetzung

- **`src/sim/navgraph.ts`** (neu) — reine, deterministische Helfer:
  `kuerzesterPfad(graph, von, ziel)` (BFS Welle-für-Welle über **offene**
  Kanten, Nachbarn alphabetisch → deterministisch; `[]` wenn kein Weg),
  `naechsterKnoten(graph, pos)` (X/Z-Abstand, Gleichstand nach Id),
  `imSichtkegel(pos, yaw, punkt, …)` (Infiltrations-Guard). Kein Babylon/Zeit.
- **`src/sim/sektor.ts`** — `NavKnoten` / `NavKante` / `NavGraph`-Typen +
  `SektorMeta.navGraph`.
- **`src/data/sektor.ts`** — der handgepflegte Graph: ~30 Knoten (Anmarsch,
  Labyrinth-Serpentine `lab-tor1..3` + `lab-vorfront`, je Abschnitt `front-<id>`
  + `bresche-<id>`, `reinforcement-<id>` (verdeckt, im Labyrinth), Sap-Zugänge,
  Parados/Feld/Verbindungsgraben/Home, `home-ziel`), ~40 Kanten. Labyrinth→Front
  `offen: true`; die drei Front→hinten-Tore + Labyrinth→Bresche `offen: false`
  (AP4-03 öffnet sie). Plus die Labyrinth-Justierung (TODO 1).
- **`src/sim/collision.ts`** — `sichtlinie(world, von, nach)` (Raycast, reine
  Funktion) für den Nahkampf-Umschalter.
- **`src/sim/enemies.ts`** — `EnemyEntity` um `abschnitt` / `ziel` / `pfad` /
  `pfadIndex`. `updateEnemies(…, nav?)`: ohne `nav` unverändert (gerader Weg,
  alter Golden-Anker hält); mit `nav` folgt der Gegner den Wegpunkten
  (`kuerzesterPfad` von `naechsterKnoten` zum Ziel, **Neuberechnung nur bei
  Zielwechsel**), Wegpunkt gilt ab 3 m als erreicht (Engstellen 1,4 m). Ziel =
  `front-<abschnitt>`, bzw. `home-ziel` sobald der Abschnitt „verloren" ist.
  Umschalten aufs direkte Anmarsch-/Nahkampf-Verhalten am Zielknoten **oder**
  bei Spieler < 6 m + grober Sichtlinie.
- **`src/sim/index.ts`** — eigene Graph-Kopie je Sim (die exportierte
  `sektorGreybox` wird nie mutiert), `verloreneAbschnitte`-Set, `abschnittRng`
  (eigener Strom → alter Golden-Anker bleibt stabil). `spawnEnemyById` zieht den
  Abschnitt aus `aktiveAchsen` und **relokiert** bei verlorenem Abschnitt auf
  `reinforcement-<id>` — mit `imSichtkegel`-Guard „nie im Feld im Sichtkegel".
  Neue Sim-Eingänge `_setKanteOffen` + `_setAbschnittVerloren` (Testeingang,
  AP4-03 ersetzt ihn). `EnemyView` um `abschnitt` / `zielKnoten` (Beobachtbarkeit
  für Tests + späteren Kompass/Debug).
- **Tests:** `navgraph.test.ts` (12) — Pfadsuche, geschlossene Kanten gemieden,
  Abkürzung sobald offen, `[]` ohne Weg, Determinismus, `naechsterKnoten`,
  `imSichtkegel`. `enemies.test.ts` (+4) — Wegpunkt-Folgen (monoton entlang der
  Kette, nicht quer), Zielwechsel bei „verloren" + Flut nach hinten, Nahkampf in
  Reichweite+Sicht, ohne Graph unverändert. `sektor.test.ts` (+5) — Graph
  wohlgeformt (Kanten referenzieren existierende Knoten, Pflichtknoten da,
  reinforcement nie im Feld), jeder Anmarsch erreicht jeden Abschnitt / Front
  hält vor Durchbruch dicht, `_setAbschnittVerloren` lenkt auf Home + flutet,
  Infiltration spawnt am verdeckten Knoten (nie im Feld), `_setKanteOffen`
  mutiert die Singleton nicht. `sim.test.ts` (+2) — **neuer Golden-/Replay-Anker
  mit dem Sektor-Graphen** (Seed 40404, 600 Ticks → stabile Gegnerpositionen,
  Abschnitte, Ziele; Determinismus). **Der alte Golden-Anker (Inline-Testlevel)
  ist unverändert grün.**

### Entscheidungen / Abweichungen vom Ticket

1. **`updateEnemies` bekommt `nav` als optionalen Trailing-Parameter** statt
   einer Signatur-Umstellung — hält alle AP2/AP3-Tests + den alten Golden-Anker
   ohne Änderung grün (ohne `nav` = exakt altes Verhalten).
2. **Zwei Testeingänge statt einem:** `_setKanteOffen(von, nach, offen)` wie im
   Ticket + die Komfort-Variante `_setAbschnittVerloren(id, verloren)`, die
   Kante-öffnen + Infiltration + Zielwechsel zusammenfasst — genau das, was
   AP4-03 als `onVerloren(id)` braucht.
3. **`bresche-<id>` als Leaf am Graben** (Kante Labyrinth→Bresche `offen:
   false`): in AP4-02 nicht auf dem Anmarschweg (der läuft über die realen
   Sap-Lücken), öffnet sich mit dem Parapet-Durchbruch in AP4-03.
4. **Ende-Rampen-Routen nicht im Graph** — die Sap-Lücken + Grabenkette reichen
   für AP4-02; End-Zugänge kann AP4-03/-05 ergänzen.
5. Labyrinth-Geometrie-Justierung: TODO(Rückfrage) 1.

### Manuell geprüft (`npm run dev`, headless Chrome + CDP)

- Lädt fehlerfrei (0 Errors), Sim tickt konstant 60/s, ~55 fps.
- Gegner **spawnen an den Anmarschpunkten, folgen der Serpentine durchs
  Labyrinth** (nicht quer durch die Wälle), erreichen nach ~15–20 s die
  Frontlinie und **greifen den Spieler an** (Screenshot: „Gefallen — Respawn"
  an Abschnitt A). Nahkampf trifft wie gehabt.
- `_setAbschnittVerloren("B")` (Skript + Test): neu marschierende Gegner nehmen
  den Verbindungsgraben Richtung Home-Line bis z < 0.
- Kein Gegner-Spawn im offenen Feld (reinforcement-Knoten liegen alle in der
  Zone `labyrinth`; `imSichtkegel`-Guard zusätzlich).

---

## Review — AP4-02 · 2026-09-04

Verdikt: **grünes Licht**.

Geprüft: lokal typecheck / lint / format:check / test:coverage / build alle grün
(139 Tests, +23; Coverage src/sim 96,32 % — über der Schwelle; `navgraph.ts`
93 %, `enemies.ts` 90 %, `sektor.ts` 100 %). CI + Pages-Preview grün auf
`20bf9a0`. Gelesen:

- `src/sim/navgraph.ts` — BFS über offene Kanten, Nachbarn sortiert →
  deterministisch, reine Funktionen, kein Babylon/Zeit/Zufall. Sauber.
- `src/sim/collision.ts` `sichtlinie()` — dünner Raycast-Wrapper, rein.
- `src/sim/enemies.ts` — `nav` als optionaler Trailing-Param: ohne `nav` exakt
  altes Verhalten (alter Golden-Anker unverändert). Pfad-Neuberechnung nur bei
  Zielwechsel. Wegpunkt-Radius eng an Sap-/Bresche-Knoten (verhindert
  „Knoten von der falschen Seite erreicht"). Deterministischer seitlicher
  Versatz `(id % 7) − 3` gegen Conga-Stau, konvergiert am Wegpunkt.
- `src/sim/index.ts` — eigene Graph-Kopie je Sim (Kanten frisch gemappt, die
  exportierte `sektorGreybox` bleibt unmutiert; Test `_setKanteOffen` mutiert die
  Singleton nicht — geprüft). Eigener `abschnittRng`-Strom → alter Golden-Anker
  stabil. Infiltration relokiert auf `reinforcement-<id>` mit `imSichtkegel`-
  Guard.
- `src/data/sektor.ts` — ~30 Knoten / ~40 Kanten, handgepflegt entlang der
  begehbaren Route. Front→hinten + Labyrinth→Bresche `offen: false` (AP4-03
  öffnet). Neuer Golden-/Replay-Anker (Seed 40404) mit konkreten Ankern auf
  Gegner-Positionen/-Abschnitten/-Zielen.

Anmerkungen (nicht blockierend):

1. **Geometrie-Churn aus AP4-01:** Labyrinth-Wälle, Landmark, `feindAnmarsch`
   (z 48 → z 44) **und** Parapet A/C (x −8/20 → −11/23) verschoben, weil der
   AP4-01-Stub eine Sackgasse hatte. Alles Greybox, Tests + Pathing headless
   verifiziert. Beim Spieltest mitchecken, dass die Sap-Lücken zu den
   Parapet-Enden passen. → in die Spieltest-Notiz aufgenommen.
2. **`imSichtkegel`-Guard greift aktuell nie** — alle `reinforcement-*`-Knoten
   liegen in Zone `labyrinth`, nie `feld`. Der Guard ist defensiv/zukunftssicher.
   Ok.
3. `aktiveAchsen` = alle Abschnitte im Greybox (statt „~2 solo"). Die
   spielerzahl-/Director-abhängige Auswahl gehört zu AP4-04. `SimOptions.
   aktiveAchsen` steht bereit. Ok.
4. Coverage src/sim von 98,6 % auf 96,3 % — die neuen unabgedeckten Zeilen sind
   Rand-Branches in `navgraph`/`enemies` (kein Weg, Wegpunkt fehlt). Vertretbar.

Zu den 5 `TODO(Rückfrage)` — Planer-Entscheidung: alle akzeptiert als
Greybox-Verschiebungen bzw. Folgeticket-Arbeit (Labyrinth-Justierung → Spieltest;
Feld/Graben → wie AP4-01; Feindzone-Sperre → eigenes kleines Ticket / AP4-05;
`aktiveAchsen` → AP4-04; Wegpunkt-Feinschliff → Spieltest via `WEGPUNKT_*` /
`MARSCH_SEPARATION`).

Abweichungen (a)–(d): alle vertretbar. `_setAbschnittVerloren` ist genau das, was
AP4-03 als `onVerloren(id)` braucht — gute Vorarbeit.

Folge-Ticket: **AP4-03** (Frontabschnitte: Besitz, Bresche, Fall).
