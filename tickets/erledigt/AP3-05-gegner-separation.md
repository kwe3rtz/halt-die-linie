# AP3-05 — Gegner stapeln sich nicht mehr ineinander

**Status:** erledigt · `d21cc08` · reviewed 2026-09-03
**Arbeitspaket:** 3 · **Branch:** `arbeitspaket-3`
**Feedback-Bezug:** Spieltest — „Gegner waren, wenn sie mir gefolgt sind, alle
ineinander gestackt (keine Kollision untereinander)". Außerdem: Gegner clippen in
den Spieler / die Kamera, wenn sie angreifen.

## Ziel

Gegner halten einen Mindestabstand zueinander und zum Spieler. Kein Pulk, der zu
einem einzigen Klumpen verschmilzt; kein Gegner, der in die Kamera clippt.

## Umsetzung (in der Sim, `src/sim/enemies.ts`)

- **Separation zwischen Gegnern:** simple radiale Abstoßung — für jeden Gegner
  über die nahen anderen Gegner iterieren (Nachbarschaft; bei den erwarteten
  Zahlen reicht O(n²), sonst ein grobes Gitter), und bei Unterschreiten von
  `2·ENEMY_RADIUS` einen Ausweichvektor addieren. Keine harte Constraint-
  Auflösung nötig, ein weicher Push pro Tick genügt.
- **Abstand zum Spieler:** ist ein Gegner näher als `ENEMY_RADIUS +
  PLAYER_RADIUS`, aus der Spielerrichtung herausschieben. Der Nahkampf-Angriff
  (Reichweite 1,6 m) funktioniert weiterhin — der Gegner steht dann eben knapp
  außerhalb Körperkontakt.
- Deterministisch bleiben (kein `Math.random`; feste Iterationsreihenfolge über
  die Liste).
- Die Bewegung läuft weiterhin über `moveCapsule` gegen die Level-Geometrie —
  die Separation addiert nur zum Bewegungswunsch, bevor `moveCapsule` läuft.

Bewusst **nicht** in diesem Ticket: echtes Pathfinding, Formationen,
Gegner-drängeln-durch-Engstellen. Nur „nicht mehr im selben Punkt stehen".

## Akzeptanzkriterien

- Mehrere Gegner, die demselben Ziel folgen, verteilen sich sichtbar statt zu
  verschmelzen.
- Kein Gegner steckt im Spieler / in der Kamera; Nahkampf trifft trotzdem.
- Vitest `src/sim/enemies.test.ts`: zwei am selben Punkt gespawnte Gegner
  driften nach einigen Ticks auseinander; ein Gegner am Spieler wird auf
  Mindestabstand geschoben.
- Golden-Replay-Test bleibt grün (ggf. Anker anpassen, wenn sich Zahlen leicht
  verschieben — dann im Bericht vermerken).
- Alle Checks grün, goldene Regel gehalten.

---

## Bericht — AP3-05

COMMIT: `d21cc08` (Branch `arbeitspaket-3`)
CI: CI = success, Pages Preview = success — beide auf `d21cc08`.
TODO(Rückfrage): keine neuen.

Checks: typecheck / lint / format:check / test:coverage / build — alle grün.
Tests: 100 (13 Dateien, +2) · Coverage src/sim: siehe CI (enemies.ts steigt) ·
Bundle unverändert.

### Umsetzung — `src/sim/enemies.ts`, `updateEnemies`

- **Positions-Schnappschuss** `startPos` (nur lebende Gegner, `{id, x, z}`)
  **vor** der Bewegungsschleife. Die Separation liest ausschließlich daraus +
  aus der eigenen (noch nicht bewegten) Position → **iterationsreihenfolge-
  unabhängig und deterministisch**, kein `Math.random`.
- **Gegner ↔ Gegner:** für jeden Gegner über `startPos` iterieren; bei Abstand
  `< 2·ENEMY_RADIUS` (0,7 m) einen radialen Ausweichvektor aufaddieren, gewichtet
  mit `t = (min − d) / min` (0…1, stärker je tiefer die Überlappung). Summe ×
  `SEPARATION_TEMPO` (3,0 m/s Platzhalter) auf `e.vel`. Exakt gleicher Punkt
  (`d ≤ 1e-6`): deterministisch anhand `id`-Vergleich auf die x-Achse
  auseinander.
- **Gegner ↔ Spieler:** bei Abstand `< ENEMY_RADIUS + SPIELER_RADIUS` (0,7 m)
  aus der Spielerrichtung herausschieben, Geschwindigkeit `= Überlappung / dt`
  → `moveCapsule` legt den Gegner in genau diesem Tick auf Mindestabstand
  (bounded, kein Teleport). Spieler exakt im Gegner: feste Achse.
- Beides addiert **nur zum Bewegungswunsch**; `moveCapsule` gegen die
  Level-Geometrie läuft unverändert danach. Leichen (`zustand === "tot"`) sind
  ausgenommen. Nahkampf-Zweig (`dist <= 1.6`) unverändert — der Gegner steht
  bei 0,7 m, gut innerhalb Reichweite.
- Neue Konstanten: `SPIELER_RADIUS = 0.35` (mit Kommentar: muss zu
  `PLAYER_RADIUS` in `src/sim/index.ts` passen), `GEGNER_MINDESTABSTAND`,
  `SPIELER_MINDESTABSTAND`, `SEPARATION_TEMPO`.
- **O(n²)** über die Gegnerliste — bei den erwarteten Zahlen (Wave 1: 3, später
  Dutzende) unkritisch; ein Gitter wäre der nächste Schritt, wenn nötig
  (`// TODO` nicht nötig, im Ticket als ok vermerkt).

### Tests — `src/sim/enemies.test.ts` (+2)

- „zwei am selben Punkt gespawnte Gegner driften auseinander": Abstand startet
  bei 0, nach 60 Ticks `> 2·0,35·0,8`.
- „ein Gegner im Spieler wird auf Mindestabstand geschoben": Gegner exakt auf
  dem Spieler → nach 30 Ticks Abstand `> 0,65` und `< 1,6`, Zustand `angriff`
  (Nahkampf greift weiter).

### Golden-Replay

Beide Golden-Tests (`toEqual`-Determinismus + Anker) bleiben **grün, ohne
Anker-Änderung**. Grund: der Anker prüft Spieler-State, Waffe, Wave-Phase,
`enemies.length` und `nachschub` — die Separation bewegt nur Gegner und ändert
in dieser Replay (Gegner-Spawn bei z 18, Spieler endet bei z ~4, Gegner
erreichen den Spieler nicht) keinen dieser Werte. Die Gegner-Positionen im
State verschieben sich zwar, sind aber nicht Teil des Ankers; der
`toEqual`-Determinismus-Lauf bestätigt, dass sie deterministisch bleiben.

### Entscheidungen / Abweichungen vom Ticket

1. **Positions-Schnappschuss statt „einfach feste Reihenfolge".** Das Ticket
   ließ feste Iterationsreihenfolge genügen; der Schnappschuss macht den Push
   zusätzlich symmetrisch (Gegner A und B weichen einander gleich stark aus)
   und damit optisch ruhiger — gleicher Aufwand.
2. **Spieler-Push löst die Überlappung in einem Tick** (`/ dt`), Gegner-Push
   ist ein weicher Dauerdruck (`SEPARATION_TEMPO`). Der Spieler soll nie
   sichtbar im Gegner stecken; Gegner untereinander dürfen sich über ein paar
   Ticks entzerren.

### Manuell geprüft — headless Chrome via CDP, `npm run dev`

Still stehen, Gegner der 1. Welle heranlaufen lassen, gleiche Ticks/HP mit und
ohne die Änderung:

- **Vorher:** alle Gegner verschmelzen zu einem einzigen Klumpen auf der
  Spielerposition, die Kapseln durchdringen sich, die Masse füllt die Kamera.
- **Nachher:** die Gegner stehen als **getrennte Kapseln im Halbkreis** auf
  ~0,7 m Abstand, keiner clippt in die Kamera; die HP-Leiste sinkt weiter
  (Nahkampf trifft). Screenshots `ap3-05_vorher.png` / `ap3-05_nachher.png` an
  den Nutzer.
- 0 Konsolen-Errors.

---

## Review — AP3-05 · 2026-09-03

Verdikt: **grünes Licht**. Damit ist **Arbeitspaket 3 komplett**.
Geprüft: alle Checks grün (100 Tests, +2), CI grün auf `d21cc08`, Coverage
src/sim 97,77 %. Sim-Diff gelesen — Positions-Schnappschuss vor der Schleife
macht die Separation reihenfolge-unabhängig und deterministisch; Gegner↔Gegner
weicher Push (gewichtet, `SEPARATION_TEMPO`), Gegner↔Spieler löst die Überlappung
in genau einem Tick (`vel = overlap/dt`, `moveCapsule` clampt gegen Wände, kein
Teleport). Nahkampf (1,6 m) unberührt. Leichen ausgenommen. Golden-Replay bleibt
grün ohne Anker-Änderung — Begründung im Bericht plausibel (Anker prüft keine
Gegner-Positionen, `toEqual`-Determinismus bestätigt).
Anmerkungen: Kleiner DRY-Punkt (nicht blockierend): `SPIELER_RADIUS = 0.35` ist
in `enemies.ts` dupliziert (mit Kommentar „muss zu `PLAYER_RADIUS` passen") —
ein Import würde einen Zyklus riskieren, daher ok als Platzhalter. Die 2
Abweichungen sind vertretbar.
Folge: PR `arbeitspaket-3` → `main`.
