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

## Arbeitspaket 5 — Boxhead-Kern (Moment-zu-Moment-Loop reparieren) · ✅ komplett

Zweiter Spieltest (2026-09-04): Kern-Bogen läuft bugfrei durch, trug als
Gefühl aber noch nicht (zu wenige/dumme Gegner, Teleport-Bug im
Verbindungsgraben, Munition nur durch Sterben, Karte fühlte sich wie eine Box
an). Vorbild **Boxhead** — Loop repariert, bevor das Graben-Konzept weiter
vertieft wird. Branch `arbeitspaket-5` von `main`, PR #8 gemergt, Nachzügler
AP5-05/06 in PR #9.

| Ticket | Status |
|---|---|
| AP5-01 Mittelgang-Teleport-Bug | ✅ `erledigt/` |
| AP5-02 Munitions-Nachschub im Einsatz | ✅ `erledigt/` |
| AP5-03 Kartengrenze öffnen | ✅ `erledigt/` |
| AP5-04 Gegner-Druck & Wellen-Eskalation | ✅ `erledigt/` |

Nachzügler nach dem (unvollständigen) dritten Spieltest — Nutzer hat nur die
ersten Wellen gespielt, aber zwei Punkte sofort gemeldet:

| Ticket | Status |
|---|---|
| AP5-05 Leit-Spines: komplett unsichtbar (Linien + Pfosten + Symbole) | ✅ `erledigt/` |
| AP5-06 Gegner-Klassen (Normal/Schnell-Schwach/Langsam-Stark) | ✅ `erledigt/` |

## Arbeitspaket 6 — Neuer Sektor + neuer Kern-Bogen (Nacht, handgebaut)

Der dritte Spieltest (2026-09-07) zeigte den Loop technisch laufend, aber
„statisch/unlebendig", und die A/B/C-Sektor-Struktur ist nicht, was der Nutzer
will. Design-Runde 2026-09-07 → `KONZEPT.md` §3/§5/§6 neu gefasst: **eine
Frontlinie + eine Home-Line**, größeres frei begehbares WW1-Grabennetz,
Spawn folgt der vordersten gehaltenen Linie, „Instand setzen" als
Rückeroberung, **Nacht zuerst** mit roamenden Toten. Skirmish-Rahmen bleibt.
Sim-Technik aus AP4/AP5 wird umgebaut, nicht weggeworfen. Branch
`arbeitspaket-6` von `main` (nach PR-#9-Merge). Details `AUFGABEN.md`.

| Ticket | Status |
|---|---|
| AP6-01 Neuer Greybox-Sektor: verzweigtes Grabennetz + Nacht-Beleuchtung | ✅ `erledigt/` (`c4d21f5`) |
| AP6-02 Kern-Bogen auf eine Frontlinie + eine Home-Line umstellen | offen (nächstes) |
| AP6-03 Dynamische Feind-Spawn-Verlagerung (Linie fällt → Spawn rückt vor) | offen |
| AP6-04 „Instand setzen" — gefallene Linie zurückerobern | offen |
| AP6-05 Roamende Nacht-Gegner (wandern / sammeln / losbrechen) | offen |

**Reihenfolge:** AP6-01 zuerst. AP6-02…05 werden verfeinert, sobald AP6-01
steht.

## Arbeitspaket 7+

Nach AP6: Tag-Modus / Fernkampf-KI (menschliche Soldaten mit Schusswaffen +
Deckung), prozeduraler Generator fürs *ganze* Grabennetz, Gegner-Roster-
Ausbau, ein Politur-Ticket aus den Audit-Medium-Befunden, Klassen/Fähigkeiten,
Nachschub-Ökonomie, Quartier.
