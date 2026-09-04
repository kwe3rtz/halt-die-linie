# AP5-03 — Kartengrenze öffnen: offenes Gelände statt sichtbarer Wände

**Status:** offen
**Arbeitspaket:** 5 (Boxhead-Kern) · **Branch:** `arbeitspaket-5` (von `main`)
**Referenz:** Zweiter Spieltest 2026-09-04 (Nutzer-Feedback), `src/data/sektor.ts`
Z. 75–79 (`modul("kartengrenze", …)`), `src/data/module.ts` (Modul
`"kartengrenze"`), `src/render/index.ts`.

## Ausgangslage

Der Sektor ist aktuell rundum von hohen, sichtbaren Sperrwänden (Modul
`kartengrenze`) eingefasst. Spieltest-Feedback: das fühlt sich wie eine Box
an, nicht wie ein offenes Schlachtfeld — genau das Gegenteil von
`KONZEPT.md` §3 „offenes Trichterfeld"/„Kartengrenzen gesperrt, Umgehen
nein" (die Sperrung selbst ist gewollt, die **sichtbare Wand** nicht).

## Ziel

Die Spielgrenze bleibt technisch wirksam (kein Herausfallen aus der Welt),
aber sie soll sich nicht mehr wie eine Wand anfühlen — stattdessen wie
offenes, auslaufendes Gelände.

## Umsetzung

Die genaue technische Lösung darf der Worker wählen, z. B.:
- Kollisionsgrenze unsichtbar machen (kein sichtbares Mesh mehr) und
  stattdessen ein Boden-/Geländeplane über die Spielgrenze hinaus sichtbar
  weiterlaufen lassen (mit Fog/Sichtweiten-Grenze statt harter Kante), oder
- die sichtbare Wand deutlich weiter nach außen schieben und den Bereich
  dazwischen mit offenem Gelände füllen, sodass sie im normalen Spiel nicht
  erreicht/gesehen wird.

Wichtig: die Kollisionsgrenze selbst (dass man den Sektor nicht verlassen
kann) bleibt bestehen — das ist eine reine Render-/Level-Art-Änderung, keine
Änderung an Zonen, Nav-Graph oder Spielfeld-Ausmaßen.

## Akzeptanzkriterien

- Von keiner im normalen Spiel erreichbaren Position aus ist eine sichtbare,
  harte Wand am Kartenrand zu sehen.
- Spieler kann weiterhin nicht aus der Welt fallen/laufen — die
  Spielgrenze bleibt technisch wirksam.
- Zonen, Nav-Graph, Breschen unverändert (nur die äußersten Kartenränder
  betroffen).
- `npm run dev`: visuell gegengecheckt (Screenshot oder Beschreibung im
  Bericht), nicht nur per Test.

## Ausdrücklich NICHT in diesem Ticket

Vergrößerung des eigentlichen Sektors · neue Zonen · echte Terrain-/Art-
Politur (Texturen, Vegetation) — hier reicht Greybox-Niveau, nur eben ohne
sichtbare Box-Wand.
