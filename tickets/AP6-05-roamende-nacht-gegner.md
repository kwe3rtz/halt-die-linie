# AP6-05 — Roamende Nacht-Gegner (wandern / sammeln / losbrechen)

**Status:** offen (letztes AP6-Ticket — nach AP6-02/02b/03/04)
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**Referenz:** `KONZEPT.md` §3 („materialisieren nie im Sichtfeld", Roam-Raum
Niemandsland/Hinterland) + §5 („Nacht — Roaming, BESCHLOSSEN 2026-09-07"),
`src/sim/enemies.ts` (`EnemyEntity`, `wegpunkt()`, Nav-Verhalten,
`NAHKAMPF_SICHT`, Stuck-Watchdog), `src/sim/wave.ts`, `src/sim/navgraph.ts`,
`src/sim/sektor.ts` (Roam-/Infiltrations-Knoten aus AP6-01),
`src/data/gegner.ts` (Linieninfanterie-Klassen aus AP5-06).

## Ausgangslage

Heute laufen Gegner nach dem Spawn stur den Nav-Pfad zur Front / zum Spieler
und greifen an — das ist das „statisch/unlebendig", das der dritte Spieltest
bemängelt hat. `KONZEPT.md` §5 will für die **Nacht** (die zuerst gebaut
wird) roamende Tote: „die Gräben sind nie ganz leer."

## Audit-Vorgabe (`AUDIT-2026-09-07-ap5.md`)

Dauerhafte Roamer **zusätzlich** zu den Wellengegnern machen die bekannten
Skalierungskosten dauerhaft statt selten. **Vor diesem Ticket** (oder als
erster Teil davon):

- **Befund H1** — die Gegner-Separation ist O(E²) pro Tick
  (`enemies.ts:390–395, 524–551`, Snapshot + Voll-Scan + neue Arrays/Tick).
  Deterministischen X/Z-Spatial-Hash / Grid einführen, nur Nachbarzellen
  prüfen, Scratch-Buffer wiederverwenden.
- **Befund M5/M6** — `kuerzesterPfad` baut pro Aufruf eine neue Adjazenz-Map
  + sortiert (`navgraph.ts:22–61`); `erreichbarerKnoten`/`sichtlinie` scannen
  linear. Roam-Zielwechsel häufen das. Adjazenz pro Graph-Revision
  vorbereiten, Pfade nach `(start, ziel, revision)` cachen.
- **Zuerst ein N-Gegner-Tick-Benchmark als Budget-Anker** (deterministisch),
  damit „Roam macht's langsam" messbar ist statt Bauchgefühl.

Ob H1/M5/M6 in dieses Ticket gehören oder in ein vorgezogenes AP7-Perf-Ticket:
mit dem Planer klären, sobald AP6-02…04 stehen.

## Ziel

Ein zusätzlicher **Verhaltens-Zustand** `roam` für Nacht-Gegner, *vor* dem
bestehenden „marschiere zur Linie / zum Spieler". Kein neuer Gegnertyp, keine
neue Klasse — dieselben AP5-06-Statistik-Varianten, nur ein anderes
Bewegungs-Frontend.

## Verhalten (`KONZEPT.md` §3/§5)

- Ein Teil der Gegner spawnt (verdeckt, in Niemandsland-/Hinterland-Knoten,
  nie im Sichtfeld) im Zustand `roam`: wandert zwischen nahen Nav-Knoten,
  langsames Tempo, kein festes Ziel.
- **Sammeln:** Reize ziehen roamende Gegner an — Schüsse (Lärm), Licht
  (Leuchtkugeln), Spielernähe. Genug Reiz / genug Zeit → Gruppe **bricht
  los** und wechselt in den normalen Marsch-/Angriffs-Zustand.
- Der reguläre Wellen-Anteil (Feindseite-Spawn, AP6-03) marschiert weiter
  direkt — Roam ist ein *Zusatz*, nicht der Ersatz.
- Anteil Roam vs. direkt = Konstante im Wave-Director, nachtspezifisch.

## Umsetzung (Richtung — Details nach AP6-01/02)

- **`enemies.ts`:** `verhalten: "roam" | "marsch" | "nahkampf"` (Nahkampf
  gibt's implizit schon). `roam`: `wegpunkt()` zieht ein zufälliges
  Nachbar-Knoten-Ziel (Rng-Stream!), Tempo × Roam-Faktor. Übergang
  `roam → marsch` bei Reizschwelle.
- **Reize:** einfacher „Lärm/Licht-Wert" pro Nav-Knoten, der bei Schuss/
  Spielernähe steigt und abklingt (`dt`). Roamende Gegner steuern den
  lautesten Knoten in Reichweite an; über Schwelle → `marsch`.
- **`wave.ts`:** beim Spawn entscheiden `roam` vs. `marsch` (gewichtet,
  Rng). Roam-Spawns nur an verdeckten Knoten.
- Stuck-Watchdog aus AP4-06 muss `roam` mit abdecken (roamende Gegner
  dürfen nicht als „fest" gelten und despawnen).
- Golden-Regel beachten: alles über `dt` + injizierte Rng-Streams, kein
  `Math.random`.

## Tests

- Neuer Sim-Test: Seed mit Roam-Spawns, N Ticks simulieren → Gegner bewegen
  sich (nicht statisch), bleiben im begehbaren Netz, keiner despawnt als
  „fest". Schuss-/Nähe-Reiz setzen → Gruppe wechselt nach `marsch` und
  erreicht die Linie.
- Begehbarkeits-Test grün (Roam nutzt dieselben Kanten).
- Golden-/Replay-Anker: durch das neue Verhalten betroffen —
  **bewusst neu baselinieren** mit Begründung + Gegenprobe. Inline-Anker
  unverändert.
- Headless-Einsatz bis „gewonnen" — Peak-Gegnerzahl / Kontaktzeit messen
  (vorher/nachher, wie AP5-04), Roam darf die Eskalation nicht verwässern.

## Akzeptanzkriterien

- `npm run dev` nachts: im Niemandsland/Hinterland bewegen sich Gestalten,
  auch wenn keine Welle „aktiv" ist; ein Schuss zieht sie zusammen, dann
  brechen sie los. Screenshot/Beschreibung im Bericht.
- Keine Watchdog-Despawns, Begehbarkeit grün.
- Alle Checks grün, Golden-Anker dokumentiert neu.

## Ausdrücklich NICHT

Tag-Fernkampf-KI (AP7) · neue Gegnertypen/Klassen · Generator · Pathfinding-
Rewrite (weiter semantischer Graph, kein NavMesh).
