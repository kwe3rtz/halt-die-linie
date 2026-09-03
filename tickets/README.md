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

Alle Tickets in `erledigt/`. PR `arbeitspaket-2` → `main` offen.

| AP2-01 Waffen-Feuerlogik · AP2-02 Spieler-HP · AP2-03 Linieninfanterie ·
AP2-04 Wave-Director · AP2-05 HUD + Golden-Replay-Test |

## Arbeitspaket 3

Noch nicht spezifiziert — kommt nach der Design-Runde „prozedurale
Sektor-Erzeugung".
