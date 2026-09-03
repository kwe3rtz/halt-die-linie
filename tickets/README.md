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

## Arbeitspaket 2 — Erster Kampf-Loop

| Ticket | Status |
|---|---|
| AP2-01 Waffen-Feuerlogik & Munition | ✅ `erledigt/` |
| AP2-02 Spieler-HP, Schaden, Tod/Respawn | ✅ `erledigt/` |
| AP2-03 Erster Gegner: Linieninfanterie | ✅ `erledigt/` |
| AP2-04 Wave-Director | ✅ `erledigt/` |
| AP2-05 Nachschub-Zähler & minimales HUD | offen (letztes AP2-Ticket) |
