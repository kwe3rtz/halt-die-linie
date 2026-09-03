# AP3-04 — Gegner-Lebensbalken korrekt aus jedem Blickwinkel

**Status:** offen
**Arbeitspaket:** 3 · **Branch:** `arbeitspaket-3`
**Feedback-Bezug:** Spieltest — „der rote Balken ist je nach Blickwinkel mal
rechts in der schwarzen Bar, mal dahinter".

## Ziel

Der HP-Balken über einem Gegner steht immer korrekt: Hintergrund + Füllung
zueinander ausgerichtet, links beginnend, und aus jeder Kameraposition sauber
lesbar.

## Analyse-Hinweis

Der beschriebene Fehler (Füllung mal versetzt, mal „dahinter") deutet auf:
- den Balken nicht (korrekt) zur Kamera ausgerichtet (kein echtes Billboard),
  oder
- Hintergrund und Füllung als getrennte Quads mit eigener Ausrichtung /
  Tiefensortierung, die je nach Winkel auseinanderlaufen.

## Umsetzung — eine der beiden Varianten

**A) Ein sauberes Billboard-Quad.** Ein einziges Mesh pro Gegner, jedes Frame
zur Kamera ausgerichtet (`billboardMode = BILLBOARDMODE_ALL`), Füllung als
Skalierung/UV eines Kind-Quads am linken Rand des Hintergrunds (gemeinsame
Ausrichtung, kein eigenes Billboard fürs Füll-Quad). Tiefentest so, dass der
Balken nicht in der Gegner-Mesh verschwindet (kleiner Y-Offset + ggf.
`renderingGroupId`).

**B) Screen-Space-Balken (DOM).** HP-Balken im HUD, pro Gegner die Weltposition
in Bildschirmkoordinaten projizieren und ein kleines `<div>` dort platzieren.
Immer perfekt ausgerichtet, skaliert gut, aber Projektion + Sichtbarkeitscheck
(hinter Kamera / verdeckt) selbst machen.

Variante A umsetzen (bleibt im Renderer, kein HUD-Umbau), außer sie wird zu
fummelig — dann B und `// TODO(Rückfrage)`.

- Reiner Renderer-Job. Gegner-Pooling aus AP2-03 beibehalten.

## Akzeptanzkriterien

- HP-Balken ist aus allen Winkeln korrekt: Füllung linksbündig im Hintergrund,
  Verhältnis stimmt, nichts „dahinter".
- Balken verdeckt sich nicht selbst in der Gegner-Mesh.
- Bei Gegner-Tod verschwindet der Balken mit dem Gegner.
- Manuell im Browser aus mehreren Winkeln geprüft (Screenshots).
- Alle Checks grün.
