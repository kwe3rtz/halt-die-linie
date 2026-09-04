# AP4-06 — Kern-Bogen-Fixes (vor AP5)

**Status:** offen
**Arbeitspaket:** 4 (Nachzügler) · **Branch:** `fix/ap4-06-kern-bogen` (von `main`)
**Referenz:** `AUDIT-2026-09-04-ap4.md` (voller Audit-Report, `ki-game-c2`),
`KONZEPT.md` §3 (Bresche, Rückzug, Uhr, Finale), `tickets/erledigt/AP4-01…05`.

## Ausgangslage

Der Audit-Report einer unabhängigen Session (voller Projektkontext, hoher
Effort) hat nach dem Merge von AP4 vier reproduzierte Gameplay-Bugs gefunden,
die beim Ticket-für-Ticket-Review durchgerutscht sind, weil jedes Ticket für
sich grün war — die Bugs sitzen in der **Verdrahtung zwischen** den AP4-
Maschinen (Nav ↔ Kollision, Wave ↔ Einsatz, Einsatz ↔ Eingabe), nicht in den
Maschinen selbst. Ohne diese Fixes ist der Kern-Bogen nicht sauber spielbar
und nicht sauber testbar — **das hier kommt vor AP5.**

## Ziel

Die vier High-Befunde beheben + einen Graph-Begehbarkeits-Test einführen, der
diese Bugklasse künftig automatisch fängt (Pflicht, bevor der Generator kommt).
Kein neues Gameplay, keine neuen Zahlen-Feature — reine Korrektur bestehender
Mechanik.

## Die vier Befunde (Kurzfassung, Details im Audit-Report)

**H1 — Bresche öffnet Nav-Kante, aber nicht die Kollision.**
`index.ts` öffnet bei offener Bresche `bresche-<id> ↔ lab-vorfront` im
Nav-Graph; das Parapet-Segment in der `CollisionWorld` bleibt unverändert
stehen. `kuerzesterPfad` bevorzugt `bresche-*` alphabetisch vor `sap-*` bei
gleicher Hop-Zahl → sobald eine Bresche offen ist, laufen **alle** neuen
Gegner des Abschnitts frontal in die Wand und bleiben stecken (reproduziert,
auch nach Zielwechsel auf `home-ziel`). Widerspricht KONZEPT §3 „durch eine
Bresche strömt der Feind" direkt — das Gegenteil passiert.

**H2 — Kein Stuck-Fallback.**
Kein Fortschritts-Watchdog für Gegner, kein Despawn, kein
Angriffskraft-Refund. `wave.ts` gated Pause **und** Reservewellen auf
`lebendeGegner === 0` — ein einzelner unerreichbarer Gegner friert den
gesamten Wellen-Loop ein.

**H3 — Tick-Reihenfolge Wave vor Einsatz.**
`updateWave` bekommt `finale: einsatzState.phase === "finale"` aus dem
**vorigen** Tick (`updateWave` läuft vor `updateEinsatz`). Bricht die
Angriffskraft im selben Tick, in dem das Feld leer wird, geht der Director auf
`vorbei` statt `reserve` und bleibt dort — das Finale läuft dann ohne
Reservewellen (reproduziert).

**H4 — „Gewonnen" ist im Spiel nicht erreichbar/abschließbar.**
`entscheide` ist an keine Taste gehängt (bekannter TODO aus AP4-04/-05).
Zusätzlich, neu gefunden: Reservewellen laufen nach `ergebnis === "gewonnen"`
munter weiter (gemessen 12 Spawns/60 s), und ein danach eintretender
Home-Verlust kann `ergebnis` noch auf `"verloren"` kippen, obwohl `vorbei`
eigentlich terminal sein soll. Im Ergebnis kann ein Solo-Run aktuell faktisch
nie sauber mit „gewonnen, extrahiert" enden.

## Umsetzung

**Fix H1 — Bresche wird ein echtes physisches Loch:**
- `src/data/module.ts` / `src/data/sektor.ts`: das Parapet-Segment an jeder
  `parapetBreschen`-Position so aufteilen, dass es **abschaltbar** ist (z. B.
  ein separates `LevelBox` je Bresche-Feld statt einer durchgehenden Wand;
  oder ein `deaktivierbar: true`-Flag, das die Sim aus der `CollisionWorld`
  herausnimmt, wenn die Bresche offen ist).
- `src/sim/collision.ts` / `createSim`: `CollisionWorld` muss zur Laufzeit ein
  Segment deaktivieren können (offene Bresche → kein Kollider mehr an der
  Stelle). Golden-Regel beachten: rein, deterministisch, kein Zufall.
- Render: das deaktivierte Segment ausblenden bzw. durch die bestehenden
  Trümmer (AP4-03) ersetzen — Optik ist schon da, nur die Kollision fehlte.
- **Alternative, falls (a) zu groß wird:** `bresche-<id> ↔ lab-vorfront`
  vorerst **nicht öffnen** (Kante `zu` lassen) und stattdessen dokumentieren,
  dass die Bresche vorerst rein kosmetisch ist, bis die Kollisions-Lösung
  kommt. Nur als Notlösung — bevorzugt ist die echte Lösung, weil sie dem
  Konzept entspricht und der Begehbarkeits-Test (siehe unten) sie ohnehin
  einfordert.

**Fix H2 — Stuck-Watchdog + Wellen-Sicherheitsnetz:**
- `src/sim/enemies.ts`: je Gegner Fortschritt tracken (z. B. Distanz zum
  aktuellen Wegpunkt über ein Zeitfenster). Kein Fortschritt seit `N` s →
  Pfad von einem tatsächlich erreichbaren Knoten neu berechnen; hilft das
  nicht innerhalb eines zweiten Versuchs → Gegner auf einen
  `reinforcement-<id>`-Knoten relokieren (wie die Infiltration es schon tut)
  oder despawnen (dann mit `angriffskraft`-Refund, damit der Director nicht
  „Geister"-Gegner zählt).
- `src/sim/wave.ts`: Pause/Reserve dürfen nicht zwingend auf
  `lebendeGegner === 0` warten, wenn ein Teil davon nachweislich fest sitzt —
  entweder über den Watchdog-Despawn lösen (dann bleibt die bestehende
  Bedingung korrekt) oder einen Timeout ergänzen.

**Fix H3 — Tick-Reihenfolge:**
- `src/sim/index.ts`: `updateEinsatz` **vor** `updateWave` aufrufen (dann
  braucht `updateWave` den `finale`-Stand vom selben Tick), **oder**
  `wave.ts` bei erschöpfter Angriffskraft immer zuerst auf `reserve` schalten
  und `reserve` fällt im nächsten Tick bei `!finale` auf `vorbei` (das tut es
  laut Audit bereits). Die zweite Variante ist der kleinere Eingriff —
  bevorzugt, wenn sie die bestehenden Tests nicht verbiegt.

**Fix H4 — „Gewonnen" spielbar machen:**
- `src/input/index.ts` + `InputCommand`: eine Taste (Vorschlag `E` /
  `interact`, sofern frei) auf `entscheide("extrahieren")` legen, wenn
  `einsatz.phase === "finale" && ergebnis === "gewonnen"` — HUD zeigt den
  Hinweis schon (AP4-04). Eine zweite Taste oder dieselbe mit Modifier für
  `verlaengern` ist Ermessenssache; wenn unklar, `// TODO(Rückfrage)` und
  konservativ nur `extrahieren` verdrahten.
- `src/sim/wave.ts` / `src/sim/index.ts`: Reservespawns einfrieren, solange
  `einsatzState.ergebnis === "gewonnen"` (keine neuen Wellen mehr, bis der
  Spieler entscheidet).
- `src/sim/einsatz.ts`: Verlustprüfung darf ein bereits `"gewonnen"`-Ergebnis
  nicht mehr auf `"verloren"` kippen — `vorbei` bzw. ein erreichtes
  `"gewonnen"` ist ab da geschützt, bis `entscheide` läuft.

**Neu — Graph-Begehbarkeits-Test (Pflicht, kein Merk-Posten):**
- `src/sim/sektor.test.ts` (oder neue Datei `navgraph-begehbarkeit.test.ts`):
  für jede Kante des Sektor-Graphen — sowohl im Ist-Zustand als auch mit
  **allen** Kanten `offen: true` (simuliert „jede Bresche ist offen", „jeder
  Abschnitt ist verloren") — eine Kapsel per `moveCapsule` von Knoten A nach
  Knoten B laufen lassen und die Ankunft (Distanz unter einer Toleranz)
  assertieren. Muss H1 in der Ist-Konfiguration **und** in der „alles offen"-
  Konfiguration fangen (also erst nach dem H1-Fix grün werden).

## Akzeptanzkriterien

- Ein Gegner, der über eine offene Bresche geht, kommt nachweislich im
  Verbindungsgraben/Feld an (nicht nur `zielKnoten === "home-ziel"`, sondern
  tatsächliche Position dort) — für **alle** Frontabschnitte A/B/C, nicht nur
  B.
- Ein künstlich in eine unerreichbare Position gesetzter Gegner blockiert
  den Wellen-Loop nicht dauerhaft (Test: Pause/Reserve schaltet trotzdem
  irgendwann weiter).
- Bricht die Angriffskraft im selben Tick wie das leere Feld, schaltet der
  Director zuverlässig auf `reserve`, nicht `vorbei` (Regressionstest gegen
  H3).
- Im Spiel: nach Erreichen von `gewonnen` im Finale lässt sich der Einsatz
  über eine Taste tatsächlich beenden (`vorbei`, `ergebnis === "gewonnen"`
  bleibt stehen); vor dem Tastendruck laufen keine neuen Reservewellen mehr an.
- Neuer Graph-Begehbarkeits-Test ist grün und hätte H1 in der alten Fassung
  nachweislich rot gemacht (kurz im Bericht demonstrieren, z. B. per
  `git stash`/Kommentar-Vergleich).
- **Beide bestehenden Golden-/Replay-Anker + der Uhr-Anker** entweder
  unverändert grün, oder bewusst neu baseliniert mit Begründung im Bericht
  (die H1/H3/H4-Fixes ändern Sim-Verhalten — anders als AP4-05 ist hier eine
  Neubaseline wahrscheinlich nötig und ok, wenn begründet).
- Alle sonstigen Checks (typecheck/lint/format/build) grün, goldene Regel
  gehalten.

## Ausdrücklich NICHT in diesem Ticket

Die Medium-/Low-Befunde aus dem Audit (hartkodiertes Sektor-Wissen in der Sim,
`createSim`-Entflechtung, Zonen-Bounds-Überlappung, Konstanten-Duplikate,
Perf-Vorbereitung für Horden, ESLint-Grenze auf `src/data` ausdehnen, doppelte
`relPeilung`, tote Erholungs-Branch in `front.ts`, `rueckerobern` als
front.ts-Übergang) — die kommen in ein separates Politur-Ticket nach AP4-06,
priorisiert mit dem Nutzer. Keine neue Balance, keine neuen Gegner, kein
Tag/Nacht, kein UI-Feature über den `entscheide`-Knopf hinaus.

## Offene Rückfragen

Ob `verlaengern` in diesem Ticket eine eigene Taste bekommt oder erst mal nur
`extrahieren` verdrahtet wird: konservativ nur `extrahieren`, `// TODO
(Rückfrage)` für `verlaengern` falls Zeit knapp. Welche Taste für `entscheide`
frei ist (Input-Layer prüfen) — falls `E` kollidiert, naheliegende Alternative
wählen und im Bericht nennen.
