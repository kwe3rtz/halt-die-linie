# AP5-05 — Leit-Spines: Linien entfernen (Nachzügler zu AP5)

**Status:** offen
**Arbeitspaket:** 5 (Nachzügler) · **Branch:** `arbeitspaket-5` (von `main`,
neu von `main` abzweigen — AP5-01…04 sind bereits gemergt, PR #8)
**Referenz:** Dritter Spieltest (Anspielen) 2026-09-04 (Nutzer-Feedback),
`src/render/index.ts` (Abschnitt „Lesbarkeit (AP4-05): Spine-Routen,
Abschnittsschilder, Zonen-Tore", ca. Z. 488–585), `src/data/sektor.ts`
(`spineRouten`, ca. Z. 407–450), `src/sim/sektor.ts` (`SpineRoute`-Typ).

## Ausgangslage

AP4-05 hat "Leit-Spines" gebaut: farbige Polylinien (gelb/weiß/cyan) von der
Front zur Home-Line, gedacht als "Kommunikationskabel an der Grabenwand" zur
Orientierung. Nutzer-Feedback beim Anspielen: die Linien wirken wie
verwirrende "Stricke/Seile" auf den Feldern (Abschnitte A/B/C), er versteht
nicht, was sie darstellen sollen — sie stören mehr, als sie helfen. Passt
auch zum Boxhead-Kurs: weniger erklärungsbedürftiges Lesbarkeits-Feature,
mehr Klarheit.

## Ziel

Die Polylinien (`MeshBuilder.CreateLines`, die "Stricke") aus dem Renderer
entfernen. Die Pfosten (`spineP_*`, kleine Boxen) und die geometrischen
Leitsymbole (`spineS_*`, Dreieck/Doppelstrich/Kreis) **bleiben** — die
sahen in den bisherigen Screenshots klar und wie platzierte Markierungen
aus, nicht wie Stricke, und tragen für sich schon Farbe + Symbol als
Orientierung. Falls der Nutzer beim nächsten Spieltest auch die
Pfosten/Symbole als störend empfindet, ist das ein eigener Folge-Schritt.

## Umsetzung

In `src/render/index.ts`: das `MeshBuilder.CreateLines(...)`-Mesh je Route
(`linie`, Variable `leitLinien`) nicht mehr erzeugen — Pfosten- und
Symbol-Erzeugung in derselben Schleife unverändert lassen. `leitLinien` als
Array kann entfallen, falls dadurch ungenutzt (inkl. Dispose-Aufruf
aufräumen). `SpineRoute.punkte` bleibt im Datenmodell bestehen (wird für
Pfosten-/Symbol-Positionen weiter gebraucht) — nur das gerenderte Linien-Mesh
verschwindet. Keine Änderung an `src/sim/**` nötig (reine Render-Änderung).

## Akzeptanzkriterien

- Im Spiel sind auf keinem Abschnitt (A/B/C, Feld, Home-Line) mehr die
  farbigen Linien/Stricke sichtbar.
- Pfosten + geometrische Symbole (Dreieck/Doppelstrich/Kreis) sind weiterhin
  sichtbar und an denselben Positionen wie vorher.
- `npm run dev` visuell gegengecheckt (Screenshot oder Beschreibung im
  Bericht, wie bei AP5-03/04).
- Alle Golden-/Replay-Anker unverändert (reine Render-Änderung, keine
  Sim-Logik betroffen).

## Ausdrücklich NICHT in diesem Ticket

Pfosten/Symbole entfernen · Zonensilhouetten/Kompass/Schilder anfassen ·
neue Wegfindungs-Hilfe bauen · Gegner-Klassen (→ AP5-06).
