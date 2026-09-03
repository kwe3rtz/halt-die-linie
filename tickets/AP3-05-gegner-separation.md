# AP3-05 — Gegner stapeln sich nicht mehr ineinander

**Status:** offen
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
