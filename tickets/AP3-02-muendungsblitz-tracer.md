# AP3-02 — Mündungsblitz & Tracer korrigieren

**Status:** offen
**Arbeitspaket:** 3 · **Branch:** `arbeitspaket-3`
**Feedback-Bezug:** Spieltest — „der Tracer ging manchmal random in irgendeine
Richtung, ein heller Strich quer über den Bildschirm".

## Ziel

Mündungsblitz und Tracer stimmen: Blitz an der Laufmündung, Tracer **von der
Mündung zum tatsächlichen Trefferpunkt** (oder entlang der Ziel-Richtung bis zur
Maximalreichweite, wenn nichts getroffen wurde). Kein Versatz, keine Zufalls-
Richtung.

## Analyse-Hinweis

Der Fehler kommt vermutlich daher, dass der Tracer im Weltraum gezeichnet wird,
aber aus einer veralteten/falschen Herkunft (z. B. Viewmodel-Position als
Kamera-Kind, deren Weltmatrix noch nicht aktuell ist) oder mit falscher
Richtung. Die Sim liefert die belastbaren Werte:

- Schuss-Ursprung = Kameraposition (Augenhöhe) im Moment des Schusses.
- Schuss-Richtung = `dirFromYawPitch(player.yaw, player.pitch)` (dieselbe
  Richtung, die die Sim für den Hitscan nutzt).
- `SimState.lastShot` trägt bereits Trefferinfo; ggf. um `origin` + `richtung`
  oder direkt `endpunkt` erweitern, damit der Renderer nicht selbst rechnen muss.

## Umsetzung

- `src/sim/index.ts`: `lastShot` um genug Daten erweitern, dass der Renderer
  Start- und Endpunkt des Tracers **ohne eigene Geometrie-Annahmen** kennt
  (`origin: Vec3`, `endpunkt: Vec3`).
- `src/render/index.ts`: Tracer als kurzlebige Linie exakt zwischen
  `lastShot.origin` und `lastShot.endpunkt`. Mündungsblitz an
  `lastShot.origin` (bzw. leicht davor entlang `richtung`), nach vorn
  orientiert. Alte Berechnung aus der Viewmodel-Position raus.
- Sicherstellen: die Kamera-/Weltmatrizen sind aktuell, wenn der Tracer gebaut
  wird (nach `camera` -Update im `sync`).

## Akzeptanzkriterien

- Tracer zeigt bei jedem Schuss von der Mitte des Blickfelds zum Trefferpunkt;
  bei Fehlschuss gerade nach vorn bis Reichweitenende.
- Kein Tracer „quer über den Bildschirm", keine Zufallsrichtung — auch beim
  schnellen Drehen währenddessen.
- Mündungsblitz sitzt an der Mündung, nicht irgendwo im Raum.
- Vitest: `lastShot` enthält `origin`/`endpunkt`, Werte konsistent mit der
  Hitscan-Richtung (Golden-Replay-Test ggf. um einen Anker ergänzen).
- Alle Checks grün, goldene Regel gehalten.
