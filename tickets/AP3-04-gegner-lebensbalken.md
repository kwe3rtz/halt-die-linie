# AP3-04 — Gegner-Lebensbalken korrekt aus jedem Blickwinkel

**Status:** review
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

---

## Bericht — AP3-04

COMMIT: <wird beim Merge/Archiv ergänzt> (Branch `arbeitspaket-3`)
CI: grün / grün (Hash in der Nachricht an die Planer-Session)
TODO(Rückfrage): keine neuen.

Checks: typecheck / lint / format:check / test:coverage / build — alle grün.
Tests: 98 (13 Dateien, unverändert — reiner Renderer-Job) · Coverage src/sim:
97,90 % · Bundle unverändert.

### Fehlerursache

`barBg` **und** `barFill` waren je ein eigenes Billboard (`billboardMode =
BILLBOARDMODE_ALL`). Die Füllung wurde zusätzlich per
`barFill.position.x -= (0.9 * (1 - ratio)) / 2` **im Weltraum** nach links
geschoben — und danach von ihrem eigenen Billboard um die Kamera-Achse gedreht.
Der Welt-x-Versatz zeigt so je nach Kamerawinkel in eine andere
Bildschirmrichtung → „mal rechts in der Bar, mal dahinter". Zwei koplanare
Billboards an derselben Position gaben zusätzlich Z-Fighting.

### Umsetzung — Variante A

`src/render/index.ts`, `makeEnemyVisual` / `syncEnemies`:

- **Nur `barBg` ist ein Billboard.** Maße (`BAR_W` 0,9 · `BAR_H` 0,12) sind in
  die Plane-Geometrie gebacken statt über `scaling`.
- **`barFill` ist Kind von `barBg`** (`barFill.parent = barBg`), kein eigenes
  Billboard mehr. Es erbt die Kamera-Ausrichtung des Hintergrunds — die beiden
  können aus keinem Winkel mehr auseinanderlaufen.
- Füllung pro Frame **im lokalen Raum** des Hintergrunds:
  `barFill.scaling.x = ratio`, `barFill.position.x = -(BAR_W * (1 - ratio)) / 2`.
  Damit bleibt die linke Kante fest bei `-BAR_W/2` (Herleitung: Quad-Mitte nach
  Skalierung bei `x_c`, Spannweite `[x_c - BAR_W·ratio/2, x_c + BAR_W·ratio/2]`
  = `[-BAR_W/2, -BAR_W/2 + BAR_W·ratio]`). „Von links" gilt jetzt in der
  gedrehten Balken-Ebene, nicht in Weltkoordinaten.
- **`barFillMat.zOffset = -4`** (Polygon-Offset): die Füllung gewinnt die
  Tiefenprüfung gegen den Hintergrund blickwinkelunabhängig, kein Z-Fighting.
- `barBg.position.y = e.pos.y + BAR_HOEHE` (= `ENEMY_HEIGHT + 0.28`, über dem
  Kopf) wie bisher — der Balken steckt nicht in der Kapsel.
- Pool aus AP2-03 unverändert (ein Visual pro Gegner-Id, wiederverwendet).
  `disposeEnemyVisual`: `barFill` zuerst, dann `barBg.dispose(true)`
  (nicht-rekursiv, das Kind ist schon weg).

### Entscheidungen / Abweichungen vom Ticket

1. **`zOffset` statt `renderingGroupId`** für das Balken-über-Hintergrund-
   Problem. Das Ticket nannte beides als Option; `renderingGroupId` ist durch
   AP3-03 belegt (0 = Welt inkl. Balken — soll so bleiben, sagt der Planer).
   Polygon-Offset löst nur das lokale bg/fill-Z-Fighting, ohne die Balken
   global vor die Welt zu heben.
2. **Kein Test** (Projekt-Konvention: Babylon-Rendering wird nicht
   unit-getestet).

### Manuell geprüft — und die Grenze davon

Headless Chrome (SwiftShader) via CDP, `npm run dev`, ~12 Screenshots aus
Kamerapositionen von x −7 bis x +11 auf Gegner um x 0 (Azimut-Versatz bis
~40°), teils 2–3 Gegner gleichzeitig im Bild:

- Hintergrund + Füllung immer **deckungsgleich**, waagerecht, zur Kamera
  gedreht — kein Versatz, nichts „dahinter", kein Z-Fighting-Flimmern.
- Balken sitzt über dem Kopf, steckt nicht in der Kapsel; verschwindet beim
  Tod mit dem Gegner (im „Gefallen"-Screenshot keine verwaisten Balken).
- Screenshots `ap3-04_drei-winkel.png` / `ap3-04_nah-und-fern.png` an den
  Nutzer geschickt.

**Grenze:** Headless-Chrome unterstützt **kein Pointer-Lock**, die Maus lässt
sich also nicht drehen — Blickwinkel nur per Seitwärtsgehen (yaw bleibt 0).
Und die Hitscan-Schüsse auf die im Bild stehenden Gegner gingen mangels
Pitch-Kontrolle meist daneben, darum ist auf den Screenshots **kein
angeschossener Balken aus schrägem Winkel** zu sehen — nur volle Balken. Das
Links-Anker-Verhalten für Teilfüllung ist oben hergeleitet; der Bug selbst
(Welt-x-Versatz + Eigen-Billboard) ist strukturell entfernt.
