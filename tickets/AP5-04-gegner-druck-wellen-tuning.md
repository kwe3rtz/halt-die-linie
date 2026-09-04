# AP5-04 — Gegner-Druck & Wellen-Eskalation

**Status:** offen
**Arbeitspaket:** 5 (Boxhead-Kern) · **Branch:** `arbeitspaket-5` (von `main`)
**Referenz:** Zweiter Spieltest 2026-09-04 (Nutzer-Feedback), `src/sim/wave.ts`
(Wave-Director), `src/sim/enemies.ts` (Bewegungs-/Zielverhalten,
Anti-Clump-Spreizung aus AP4-06), `KONZEPT.md` §5 (Gegner-Roster — Ausbau
bewusst NICHT hier).

## Ausgangslage

Spieltest-Feedback: zu wenige Gegner, zu „dumm"/eintönig (spawnen, laufen
ihre Route, gehen bei Nähe auf den Spieler zu), keine spürbare Eskalation in
höheren Wellen — das Kern-Gefühl trägt noch nicht. Das ist erwartbar (alle
AP2/AP4-Zahlen waren bewusst Platzhalter), jetzt ist die erste echte
Balance-/Tuning-Iteration fällig — **kein** neues System, **kein** neuer
Gegnertyp (Roster-Ausbau bleibt eigenes späteres Paket, `BACKLOG.md`).

## Ziel

Höhere Wellen fühlen sich spürbar bedrohlicher an: mehr gleichzeitig aktive
Gegner, echte Eskalation über die Wellen, ein bisschen weniger eintöniges
Verhalten am bestehenden Gegnertyp (Linieninfanterie) — nicht neues
Verhalten, sondern das vorhandene besser genutzt.

## Umsetzung

**(a) Wave-Director-Tuning** (`src/sim/wave.ts`): Spawn-Dichte/-Tempo über
die Wellen erhöhen und stärker staffeln, sodass spätere Wellen klar mehr
gleichzeitig aktive Gegner bringen als frühere — aktuell sind das noch
AP2/AP4-Platzhalterzahlen.

**(b) Verhaltens-Feinschliff** (`src/sim/enemies.ts`): am bestehenden
Verhalten der Linieninfanterie leicht variieren — z. B. die vorhandene
Anti-Clump-Spreizung ausbauen, Tempo-/Timing-Streuung, sodass nicht alle
Gegner exakt synchron denselben Pfad in Formation laufen. Ausdrücklich
**kein** neues Verhaltensmuster/keine KI-Rolle (Charger/Suppressor/
Disruptor bleibt Backlog).

## Akzeptanzkriterien

- Im manuellen Spieltest (F3 + Lagekarte) sind in höheren Wellen klar mehr
  Gegner gleichzeitig aktiv als vorher.
- Bestehende Wave-/Enemy-Tests angepasst; wo golden anchors sich durch die
  neuen Zahlen ändern, ist das im Bericht **begründet**, nicht einfach
  `toEqual` stillschweigend nachgezogen.
- Kein neuer Gegnertyp, keine neue KI-Rolle, keine neue Waffe.

## Ausdrücklich NICHT in diesem Ticket

Gegner-Roster-Ausbau (`BACKLOG.md`) · neue KI-Rollen · Fernkampf-Gegner ·
Tag/Nacht · Balancing der Front-/Bresche-/Uhr-Zahlen (das ist ein eigenes,
späteres Politur-Ticket aus dem Audit).
