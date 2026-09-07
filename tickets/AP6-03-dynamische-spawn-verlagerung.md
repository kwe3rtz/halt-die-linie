# AP6-03 — Dynamische Feind-Spawn-Verlagerung (Linie fällt → Spawn rückt vor)

**Status:** offen (wird nach AP6-02/02b verfeinert)
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**Referenz:** `KONZEPT.md` §3 („Die Linie fällt — der Feind rückt vor") + §6,
`AUDIT-2026-09-07-ap5.md` **Befund H4** (der Wave-API fehlt heute jeder Ort
für Spawn-Verlagerung — `enemySpawnPunkte` wird einmal gelesen, `WaveContext`
kennt nur die Punktliste, nicht die gehaltene Linie), `src/sim/wave.ts`
(`starteWelle`, Spawn-Knoten-Wahl, `WaveContext` ~Z. 118–129),
`src/sim/index.ts` (~359, 798–819), `src/sim/enemies.ts` (`spawnEnemy`,
Nav-Ziel), `src/sim/navgraph.ts`, `src/sim/sektor.ts` (`feindAnmarsch`,
Spawn-Rollen aus AP6-02), `src/sim/front.ts` (Linienzustände aus AP6-02b).

## Audit-Vorgabe (H4)

Der `WaveContext` muss die **aktive Spawn-Staffel** kennen, nicht nur eine
statische Punktliste. Die Staffel wird **vor** dem Wellen-Tick aus dem
Front-/Home-Zustand bestimmt. Die Auswahl **muss deterministisch bleiben und
darf den Wave-RNG nicht unkontrolliert verschieben** (eigener Pfad, kein
`rng.int` in der Staffel-Wahl).

## Ausgangslage

Heute spawnen Gegner immer an denselben Feind-Anmarsch-Knoten, egal wie der
Einsatz steht. `KONZEPT.md` §3 will: **der Spawn folgt der vordersten noch
gehaltenen Linie.**

- Frontlinie steht → Spawn auf der **Feindseite** (weit vorn, langer Anmarsch
  durchs Niemandsland).
- Frontlinie gefallen → Spawn rückt nach vorn Richtung Home-Line (in die
  vorderen Hinterland-/Niemandsland-Knoten), Anmarsch kürzer, Druck höher,
  Front-Depot ist ohnehin weg (AP6-02).
- Home-Line gefallen → Spawn direkt davor (Endphase).

## Ziel

Eine kleine Zuordnung „aktueller Linienzustand → welche Spawn-Knoten-Gruppe
ist aktiv", die der Wave-Director bei jedem `starteWelle` abfragt. Keine neue
KI, kein neues System — nur die Spawn-Knoten-Auswahl wird zustandsabhängig.

## Umsetzung (Richtung — Details nach AP6-01/02)

- **`sektor.ts`:** Nav-Knoten für Feind-Spawn in **benannte Staffeln**
  gruppieren: `spawnStaffel: "feindseite" | "vorgeschoben" | "davor"` (oder
  Analoges). AP6-01 legt die Knoten-Positionen an; hier nur die Gruppierung
  + Auswahl.
- **`wave.ts`:** `starteWelle` wählt die aktive Staffel aus dem Front-/Home-
  Zustand (`front.ts`). Frontlinie `verloren` → `vorgeschoben`; Home-Line
  `bedraengt`/`gebrochen` → `davor`.
- Bereits gespawnte Gegner bleiben, wo sie sind — nur **neue** Wellen
  verlagern sich. Kein Teleport laufender Gegner.
- Uhr-Beschleunigung bei gefallener Frontlinie kommt aus AP6-02; hier nur
  sicherstellen, dass der kürzere Anmarsch nicht zusätzlich die Wellenkurve
  sprengt (kurz messen, ggf. Spawn-Intervall in der vorgeschobenen Staffel
  leicht strecken).

## Tests

- Neuer Sim-Test: Frontlinie künstlich auf `verloren` setzen (Testhook),
  eine Welle starten, prüfen dass die Spawn-Positionen in der vorgeschobenen
  Staffel liegen und der Nav-Pfad ans Ziel begehbar ist.
- Golden-Anker „die Uhr" / „Sektor-Nav-Graph": prüfen ob betroffen; wenn ja
  bewusst neu baselinieren mit Begründung + Gegenprobe.
- Headless-Einsatz: Front absichtlich fallen lassen, weiterspielen bis
  „gewonnen" oder „verloren" — kein Stuck, keine Watchdog-Despawns.

## Akzeptanzkriterien

- Frontlinie gefallen → sichtbar kürzerer Anmarschweg / vorgeschobene
  Spawn-Positionen (Screenshot oder Trace im Bericht).
- Begehbarkeits-Test grün für alle Spawn-Staffeln.
- Alle Checks grün.

## Ausdrücklich NICHT

„Instand setzen" (AP6-04) · Roam (AP6-05) · neue Gegnertypen · Generator.
