# tickets/

Eine Datei pro Ticket ab Arbeitspaket 2. Gemeinsame Regeln und Konventionen:
[`../AUFGABEN.md`](../AUFGABEN.md). Ablauf: [`../WORKFLOW.md`](../WORKFLOW.md).

- **`tickets/AP*.md`** — offene Ticket-Specs. `Status:`-Zeile im Kopf
  (`offen` / `in arbeit` / `review`).
- **`tickets/erledigt/AP*.md`** — abgeschlossene Tickets. Enthält die Spec-
  Kurzfassung + den Worker-Bericht + den Review-Block. Das ist der Audit-Trail:
  „was wurde in diesem Ticket gemacht und wie wurde es abgenommen".

Wenn ein Ticket grünes Licht bekommt, verschiebt der Planer es per `git mv`
hierher und ergänzt Bericht + Review.

## Arbeitspaket 2 — Erster Kampf-Loop · ✅ komplett

Alle Tickets in `erledigt/`. Nach `main` gemergt (PR #4).

## Arbeitspaket 3 — Basis solide machen (Politur & Fixes)

Fixes aus dem ersten Spieltest. Branch `arbeitspaket-3` von `main`.

| Ticket | Status |
|---|---|
| AP3-01 Fadenkreuz & Trefferbestätigung | ✅ `erledigt/` |
| AP3-02 Mündungsblitz & Tracer korrigieren | ✅ `erledigt/` |
| AP3-03 Viewmodel steckt nicht mehr in Wänden | ✅ `erledigt/` |
| AP3-04 Gegner-Lebensbalken aus jedem Blickwinkel | ✅ `erledigt/` |
| AP3-05 Gegner stapeln sich nicht mehr ineinander | ✅ `erledigt/` |

## Arbeitspaket 4 — Verteidigung in der Tiefe

Der handgebaute Greybox-Sektor (das „H", `KONZEPT.md` §3) + der Kern-Bogen:
Front halten → Abschnitt verlieren → zurückfallen → Home-Line halten. Kein
Generator, keine neuen Gegner, kein Tag/Nacht. **Komplett, inkl. Nachzügler
AP4-06** (nach unabhängigem Audit `../AUDIT-2026-09-04-ap4.md`, 4 reproduzierte
Gameplay-Bugs in der Verdrahtung zwischen den AP4-Maschinen).

| Ticket | Status |
|---|---|
| AP4-01 Sektor-Geometrie (das „H") als Daten + Renderer | ✅ `erledigt/` |
| AP4-02 Feind-Navigation: semantischer Graph | ✅ `erledigt/` |
| AP4-03 Frontabschnitte: Besitz, Bresche, Fall | ✅ `erledigt/` |
| AP4-04 Die Uhr, der Rückzug & das Home-Line-Finale | ✅ `erledigt/` |
| AP4-05 Lesbarkeit: Silhouetten, Spine, Schilder, Kompass, Audio | ✅ `erledigt/` |
| AP4-06 Kern-Bogen-Fixes (Nachzügler, Branch `fix/ap4-06-kern-bogen`) | ✅ `erledigt/` |

## Arbeitspaket 5 — Boxhead-Kern (Moment-zu-Moment-Loop reparieren)

Zweiter Spieltest (2026-09-04): Kern-Bogen läuft jetzt bugfrei durch, trägt
als Gefühl aber noch nicht (zu wenige/dumme Gegner, Teleport-Bug im
Verbindungsgraben, Munition nur durch Sterben, Karte fühlt sich wie eine Box
an). Vorbild **Boxhead** — Loop reparieren, bevor das Graben-Konzept weiter
vertieft wird. Branch `arbeitspaket-5` von `main`.

| Ticket | Status |
|---|---|
| AP5-01 Mittelgang-Teleport-Bug | offen |
| AP5-02 Munitions-Nachschub im Einsatz | offen |
| AP5-03 Kartengrenze öffnen | offen |
| AP5-04 Gegner-Druck & Wellen-Eskalation | offen |

## Arbeitspaket 6+

Nach AP5: ein Politur-Ticket aus den Audit-Medium-Befunden, dann „zwei
Kampfsprachen" (Tag-Fernkampf + Nacht), dann der prozedurale Generator fürs
vordere Labyrinth, dann Gegner-Roster-Ausbau.
