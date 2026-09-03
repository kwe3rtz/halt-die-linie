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
| AP3-03 Viewmodel steckt nicht mehr in Wänden | offen |
| AP3-04 Gegner-Lebensbalken aus jedem Blickwinkel | offen |
| AP3-05 Gegner stapeln sich nicht mehr ineinander | offen |

## Arbeitspaket 4+

Nach den Design-Runden (Map / prozeduraler Sektor, dann Gegner-Roster-Ausbau).
