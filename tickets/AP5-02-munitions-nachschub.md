# AP5-02 — Munitions-Nachschub im Einsatz

**Status:** offen
**Arbeitspaket:** 5 (Boxhead-Kern) · **Branch:** `arbeitspaket-5` (von `main`)
**Referenz:** Zweiter Spieltest 2026-09-04 (Nutzer-Feedback), `WAFFEN.md`,
`src/sim/weapon.ts`, `src/sim/index.ts` (`resetWeapon`, `respawnPlayer`),
`KONZEPT.md` §9.6 (Nachschub-Ökonomie — dort die *volle* spätere Währung,
hier NICHT gemeint), AP4-06 `entscheide()`/`InputCommand.buttons.interact`
als Vorbild für „Aktion am Ort per Taste".

## Ausgangslage

Aktuell wird Reservemunition ausschließlich in `respawnPlayer()`
(`src/sim/index.ts`) zurückgesetzt — d. h. die einzige Möglichkeit, wieder
Munition zu bekommen, ist zu sterben. Spieltest-Feedback: das fühlt sich
falsch an, insbesondere weil aktuell nur eine Waffe existiert.

## Ziel

Reservemunition im laufenden Einsatz auffüllbar machen, ohne dass der
Spieler dafür sterben muss — schlank, kein Vorgriff auf die volle
Nachschub-Ökonomie (§9.6, eigenes späteres Paket).

## Umsetzung

Ein oder mehrere feste Munitions-Nachfüllpunkte im Sektor (Boxhead-Vorbild:
Munitionskiste). Vorschlag: mindestens einer an der Home-Line (dort ist der
Spieler ohnehin im Finale), ggf. ein zweiter näher an der Front für den
regulären Wellen-Loop — genaue Platzierung darf der Worker im Greybox
festlegen. Auslösung per `interact` (`E`), analog zum bestehenden
`entscheide()`-Muster aus AP4-06 (edge-getriggert, kein Dauerfeuer bei
gehaltener Taste). Auffüllmenge: volle Reserve (Platzhalter, wie andere
AP4-Zahlen). Kein Nachschub-Kosten-/Budget-System.

Die Sim-Grenze gilt wie überall: die Nachfüllpunkte sind Daten (Position +
ggf. Reichweite), keine neue Babylon-Abhängigkeit in `src/sim/**`.

## Akzeptanzkriterien

- Spieler kann im laufenden Einsatz, ohne zu sterben, an einem
  Nachfüllpunkt die Reservemunition auffüllen.
- Test: Reserve künstlich auf 0 setzen, `interact` am Nachfüllpunkt
  auslösen → Reserve wieder voll.
- Außerhalb der Reichweite eines Nachfüllpunkts löst `interact` keine
  Auffüllung aus.
- HUD zeigt minimal an, dass ein Nachfüllpunkt in der Nähe ist (Stil
  konsistent zu bestehendem HUD).

## Ausdrücklich NICHT in diesem Ticket

Volle Nachschub-Ökonomie/-Währung (§9.6) · zweite Waffe/Waffenwechsel ·
Munitionskosten oder Budgets · Nachfüllung durch Gegner-Drops.
