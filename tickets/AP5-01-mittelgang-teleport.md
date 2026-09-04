# AP5-01 — Mittelgang-Teleport-Bug

**Status:** offen
**Arbeitspaket:** 5 (Boxhead-Kern) · **Branch:** `arbeitspaket-5` (von `main`)
**Referenz:** Zweiter Spieltest 2026-09-04 (Nutzer-Feedback), `src/sim/collision.ts`
(`moveCapsule`), `src/data/sektor.ts` (Zone `verbindungsgraben`, `aabb(-3, -20,
3, 11)`, Rampen-/Grabengeometrie um den Übergang Feld → Verbindungsgraben),
`src/sim/index.ts` (`step`, Bewegungsauflösung pro Tick).

## Ausgangslage

Spieltest-Feedback: beim Durchqueren des zentralen Verbindungsgrabens (der
schmale Mittelgang zwischen offenem Feld und Home-Line) wird der Spieler
gelegentlich an eine andere Position „teleportiert". Kein reproduzierter
Repro-Schritt vom Nutzer, nur die Beobachtung „passiert manchmal beim
Durchlaufen".

## Ziel

Ursache finden und beheben — kein Pflaster (z. B. stumpfes Clamping ohne zu
wissen warum), sondern die tatsächliche Wurzel.

## Umsetzung

Naheliegendste Hypothese (nicht blind übernehmen, verifizieren): die
Kapsel-Kollisionsauflösung (`moveCapsule` in `src/sim/collision.ts`) löst pro
Tick gegen mehrere `LevelBox`en sequenziell auf. Wo Geometrie eng
zusammenläuft oder sich leicht überlappt (Rampe, Grabenwand, Boden am
Übergang), kann eine Kette von Einzelauflösungen in einem Tick zu einer
großen Netto-Verschiebung führen — das fühlt sich wie ein Sprung an. Das ist
eine Hypothese, kein Befund: zuerst reproduzieren (F3-Overlay:
Position/Tick beobachten, bei Bedarf einen temporären Log-Punkt einbauen),
die Stelle exakt lokalisieren, dann erst fixen.

Möglicher Fix, je nach Befund:
- Geometrie am Übergang bereinigen (Lücken/Überlappungen der `LevelBox`en in
  `src/data/sektor.ts` in diesem Bereich).
- Und/oder eine Plausibilitätsgrenze in der Kollisionsauflösung (max.
  Verschiebung pro Tick), als Sicherheitsnetz gegen diese Bugklasse generell.

**Regressionstest:** eine Kapsel den Verbindungsgraben mehrfach in beide
Richtungen durchlaufen lassen (ähnliches Muster wie
`src/sim/navgraph-begehbarkeit.test.ts`) und pro Tick die
Positionsänderung gegen eine Plausibilitätsgrenze prüfen (z. B. maximal
mögliche Bewegung bei Sprint-Tempo × `dt` × Sicherheitsfaktor). Der Test
muss den ursprünglichen Bug nachweislich fangen (Gegenprobe wie in
AP4-06, falls der Bug reproduzierbar ist).

## Akzeptanzkriterien

- Ursache im Bericht klar benannt (Datei:Zeile), nicht nur der Fix.
- Manuelles mehrfaches Durchlaufen des Verbindungsgrabens (F3-Position
  beobachten) zeigt keine Sprünge mehr.
- Neuer/erweiterter Test verhindert eine Regression.
- Alle drei golden anchors unverändert, sofern die Bewegungslogik außerhalb
  des Verbindungsgrabens nicht angefasst wird — falls doch, im Bericht
  begründen.

## Ausdrücklich NICHT in diesem Ticket

Änderungen an der Front-/Bresche-Mechanik, an der Kartengrenze (→ AP5-03),
an Munition (→ AP5-02) oder an Gegnerverhalten (→ AP5-04).
