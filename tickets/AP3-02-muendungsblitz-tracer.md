# AP3-02 — Mündungsblitz & Tracer korrigieren

**Status:** review
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

---

## Bericht — AP3-02

COMMIT: <wird beim Merge/Archiv ergänzt> (Branch `arbeitspaket-3`)
CI: grün / grün (Hash in der Nachricht an die Planer-Session)
TODO(Rückfrage): keine neuen.

Checks: typecheck / lint / format:check / test:coverage / build — alle grün.
Tests: 99 (13 Dateien) · Coverage src/sim: **97,90 %** (index.ts 99,22 %) ·
Bundle index-\*.js ~6,87 MB / ~1,52 MB gzip (Δ vernachlässigbar).

### Fehlerursache

Der „helle Strich quer über den Bildschirm" war **Near-Plane-Clipping**: der
Tracer wurde als `LinesMesh` von `shot.von` (= Augpunkt) zu `shot.nach`
gezeichnet. `shot.von` liegt praktisch auf der Kameraposition (Differenz nur
durch die Interpolation, < ~0,08 m), also **innerhalb** von `camera.minZ`
(0,1). Der Near-Vertex wird geklippt; ist das Segment fast parallel zur
Blickrichtung und der nahe Punkt hinter der Near-Plane, ist der geklippte
Schnittpunkt numerisch instabil → projiziert an eine beliebige Bildschirm-
position, flackernd, „random Richtung". Keine echte Zufälligkeit in den Daten —
`von`/`nach`/Richtung waren immer korrekt.

Der Mündungsblitz saß als Kamera-Kind auf einem aus der Viewmodel-Position
abgeleiteten Offset (`0.17, -0.15, 1.15`) — kein Richtungsfehler möglich (ein
Würfel), aber die vom Ticket genannte „alte Berechnung aus der Viewmodel-
Position".

### Umsetzung

- **`src/sim/index.ts`** — `ShotEvent` um `richtung: Vec3` erweitert: die
  normierte Hitscan-Richtung (`dirFromYawPitch(yaw, pitch)`, exakt der Vektor,
  den `fire()` schon nutzt), eingefroren. Damit kennt der Renderer Ursprung
  (`von`), Richtung und Endpunkt (`nach`) und muss **keine eigene Herkunft**
  rechnen. (`von` = „origin", `nach` = „endpunkt" aus dem Ticket — schon da.)
- **`src/render/index.ts`**:
  - Tracer beginnt jetzt `min(0,6 m, Distanz·0,5)` **vor** dem Augpunkt auf dem
    Strahl (`von + richtung·d`), endet exakt an `nach`. 0,6 m ≫ `minZ` 0,1 →
    kein Clipping mehr. Bei Distanz ≤ 0,2 m (Point-blank) kein Tracer.
  - Mündungsblitz ist jetzt ein **Welt**-Quader (nicht mehr Kamera-Kind),
    pro Schuss auf `von + richtung·0,6` gesetzt — auf dem Strahl, vor der
    Kamera. Keine Viewmodel-Kopplung mehr. Sichtbar nur, wenn der Schuss
    weiter als 0,3 m reicht.
  - Der Effekt-Block läuft unverändert **nach** dem Kamera-Update im `sync` —
    Weltmatrizen sind aktuell.
  - Kommentar am Viewmodel korrigiert (nur noch das Viewmodel ist Kamera-Kind).
- **Tests**:
  - `src/sim/sim.test.ts` (+1, „lastShot trägt Ursprung, Richtung und
    Endpunkt konsistent zum Hitscan"): `von` = Fußpunkt + 1,6; `richtung` ==
    `dirFromYawPitch(yaw, pitch)` und normiert; `nach − von` parallel zu
    `richtung` (Endpunkt liegt auf dem Strahl).
  - `src/ui/hud.test.ts`: `schuss()`-Helfer um `richtung` ergänzt.
  - Renderer selbst bleibt ungetestet (Projekt-Konvention: kein Babylon-Unit-
    Test).

### Entscheidungen / Abweichungen vom Ticket

1. **`richtung` statt zusätzlichem `origin`/`endpunkt`.** `von`/`nach` trugen
   Ursprung und Endpunkt schon (Hinweis der Planer-Session). Es fehlte nur die
   belastbare Richtung für den Tracer-Start-Offset und den Mündungsblitz — ein
   Feld genügt. Ticket-Umsetzungspunkt 1 entsprechend gekürzt.
2. **Tracer-Start 0,6 m vor dem Auge**, nicht exakt an `von`. Exakt an `von`
   (= Kamera) ist die Fehlerursache (Near-Plane). Der Versatz ist entlang der
   Blickachse, also visuell unsichtbar (man schaut den Strahl entlang).
3. **Mündungsblitz als Welt-Mesh.** Bei 50 ms Sichtbarkeit ist die Drift durch
   Kamerabewegung vernachlässigbar (< ~0,35 m bei Sprint), dafür sitzt er
   deterministisch auf dem Schuss-Strahl statt an einem Viewmodel-Offset.

### Manuell geprüft

Headless Chrome (SwiftShader) via CDP, `npm run dev`: App bootet fehlerfrei
(0 Konsolen-Errors/Exceptions). Mausklick auf den Canvas löst einen Schuss aus
(Munition 5 → 4 im HUD). Kein „Strich quer über den Bildschirm", keine
Artefakte im Blickfeld; Fadenkreuz bleibt mittig. Der 50-ms-Effekt selbst ist
im Standbild nicht zuverlässig einzufangen — Tracer-Geometrie ist über den
Sim-Test + die Near-Plane-Analyse abgesichert.
