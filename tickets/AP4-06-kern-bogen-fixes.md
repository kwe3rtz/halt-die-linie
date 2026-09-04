# AP4-06 — Kern-Bogen-Fixes (vor AP5)

**Status:** review
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

---

## Bericht — AP4-06

COMMIT: <Hash in der Nachricht an die Planer-Session> (Branch `fix/ap4-06-kern-bogen`)
CI: <Status in der Nachricht an die Planer-Session>
TODO(Rückfrage):

1. **Ein Nav-Knoten je Abschnitt, aber B hat zwei Breschen** (`src/data/sektor.ts`,
   Kommentar bei `bresche-B`): Der Begehbarkeits-Test fand den alten Knoten
   `bresche-B` bei x=0 — in der **festen Wand zwischen** B's Breschen (x=±3).
   Jetzt liegt der Knoten auf B's erster Bresche, und die Sim öffnet die Kante
   `bresche-<id> ↔ lab-vorfront` nur, wenn genau diese Bresche offen ist
   (`brescheUnterKnoten` in `createSim`). B's zweite Bresche (x=+3) ist ein
   Loch ohne eigene Nav-Route — ein Knoten je Bresche braucht eine allgemeinere
   Id-Konvention als `bresche-<abschnitt>` → Politur-Ticket „Sektor-Wissen aus
   der Sim" (Audit M1).
2. **Seitlicher Anti-Stau-Versatz im Graben gekappt** (`src/sim/enemies.ts`,
   `GRABEN_Y` / `SPREIZUNG_GRABEN_MAX`): AP4-02 gab jedem Gegner je Id bis zu
   ±2,4 m seitlichen Versatz; im 3,6 m breiten Verbindungsgraben zielte das in
   die Wand — Gegner mit `id % 7 ∈ {0,1,5,6}` blieben schon vor AP4-06 am
   Grabeneingang hängen (Trace im Bericht unten). Kappung auf ±1 m, sobald der
   Fußpunkt unter der Geländeoberkante liegt (< −0,5). Greybox-Heuristik;
   sauber wäre eine Korridorbreite je Knoten/Kante (Generator-Datum).
3. **Verbindungsgraben-Knicke / Feld-Tiefe** unverändert (AP4-01 TODO 2/3).

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  22 Dateien, 232 Tests (vorher 212)
    Coverage src/sim: 98,38 % Stmts / 96,70 % Branch / 100 % Funcs / 98,38 % Lines
    einsatz.ts 100 · sektor.ts 100 · wave.ts 100 · front.ts 98,4 · index.ts 98,3 ·
    enemies.ts 97,8 · collision.ts 97,6 · navgraph.ts 95,6
> vite build                       ✓  dist/assets/index-*.js 6.905,7 kB │ gzip 1.532,3 kB
```

Tests: 232 (22 Dateien, +20 — `navgraph-begehbarkeit` 4 neu, `sektor` +6,
`enemies` +4, `wave` +4, `einsatz` +2) · Coverage src/sim **98,38 %** (vorher
97,26 %) · Bundle ~6,91 MB / ~1,53 MB gzip (Δ ~+4 kB, kein neuer Import).

**Alle drei Golden-/Replay-Anker sind unverändert grün** (Inline-Testlevel,
Sektor-Graph Seed 40404, Uhr Seed 1) — keine Neubaseline nötig: das Parapet
wird in Segmente geteilt, aber die Geometrie bleibt bis zum Öffnen einer
Bresche identisch; Engstellen-Regel, Watchdog und Versatz-Kappung greifen im
600-Tick-Fenster des Nav-Ankers nicht (kein Gegner erreicht dort eine
Engstelle oder den Graben); H3/H4 ändern nur Finale-Übergänge.

### Umsetzung

- **H1 — Bresche ist ein echtes Loch (echte Lösung, nicht die Notlösung).**
  - `src/sim/collision.ts`: `LevelBox.tag?`, `CollisionWorld.tags[]` +
    `aktiv[]` (parallel zu `boxes`), `setKolliderAktiv(world, tag, aktiv)`.
    `moveCapsule` / `raycast` / `sichtlinie` überspringen inaktive Boxen —
    Bewegung, Hitscan (Schüsse durch die Bresche) und Sicht sehen dasselbe Loch.
  - `src/data/module.ts`: `ModulOpt.luecken: ParapetLuecke[]` (lokale z-Mitte,
    Breite, Tag), `BRESCHE_BREITE` 2,6 m (= Trümmer-Breite des Renderers). Die
    Brustwehr wird in feste Segmente + ein getaggtes Segment je Lücke geteilt,
    der Feuertritt bleibt durchgehend. `modul()` reicht `tag` durch.
  - `src/sim/sektor.ts`: `brescheTag(abschnittId, index)` — eine Konvention für
    Daten, Sim, Render. `NavKnoten.engstelle?` (siehe Engstellen).
  - `src/data/sektor.ts`: Breschen-Positionen als Konstanten (`BRESCHEN_*`),
    eine Quelle für Geometrie (`breschenLuecken(...)` → `luecken`) und Meta
    (`parapetBreschen`), für A/B/C **und** H-West/H-Ost. Bresche-Knoten liegen
    auf der jeweils ersten Bresche (TODO 1); Sap-/Bresche-Knoten auf
    Geländeniveau, Parados-Knoten auf der obersten Rampenstufe (die alten
    y-Werte steckten in Boden-/Rampenquadern — vom neuen Test gemeldet);
    `reinforcement-A` von (−20, 30) auf (−20, 33), weil der alte Knoten **im
    Trichter-Quader** lag (auch das fand der Test).
  - `src/sim/index.ts`: `syncBreschen()` — schaltet je Bresche den Kollider
    (`!offen`) und öffnet die Nav-Kante `bresche-<id> ↔ lab-vorfront` für die
    Bresche unter dem Knoten. Läuft nach beiden `updateFront` sowie in
    `rueckerobern` / `_setAbschnittVerloren`, damit Kollision und Nav nie
    auseinanderlaufen (vorher plante ein im selben Tick gespawnter Gegner noch
    mit der geschlossenen Kante).
  - `src/render/index.ts`: `tagMeshes` (Tag → Mesh); `syncFront` blendet das
    Segment bei offener Bresche aus und läuft jetzt für `state.front` **und**
    `state.home`; Trümmer/Rauch werden auch für die Home-Abschnitte gebaut.
- **Begehbarkeits-Test** `src/sim/navgraph-begehbarkeit.test.ts` (4 Tests):
  Kapsel (Gegner-Maße, 2,6 m/s) läuft jede Kante in beide Richtungen, Toleranz
  0,5 m (kleiner als Wandstärke + Radius, damit „vor der Wand stehen" nie als
  Ankunft zählt). Ist-Zustand: nur offene Kanten; Knoten in einem getaggten
  (schaltbaren) Segment sind Kontaktpunkte einer geschlossenen Bresche und
  werden übersprungen, Knoten in einem festen Kollider sind ein Fehler. „Alles
  offen": alle Kanten offen + alle Bresche-Kollider aus. Dazu die Gegenprobe
  (stehendes Parapet → Weg zum Bresche-Knoten nicht begehbar) und ein Test,
  dass jede Bresche ein sie umschließendes getaggtes Segment hat.
- **H2 — Stuck-Watchdog** (`src/sim/enemies.ts`): `EnemyEntity.stillstand` /
  `festVersuche`; im Anmarsch zählt ein Tick mit < 20 % des Soll-Wegs als
  Stillstand; nach `FEST_ZEIT` (4 s) gestaffelt: **1.** Pfad neu von einem in
  Kniehöhe (0,3 m) sichtbaren Knoten (`erreichbarerKnoten`), dabei die Kante,
  auf der der Gegner hängt, für diese Planung gesperrt (sonst liefert BFS
  denselben Weg); war er schon am Zielknoten (Beeline-Modus), Ziel = Knoten beim
  Spieler. **2.** Relokation auf `reinforcement-<abschnitt>`. **3.** Despawn über
  `NavKontext.onDespawn` — `createSim` schreibt +1 Angriffskraft zurück (gekappt
  auf `angriffskraftMax`), kein Nachschub, keine Uhr. `wave.ts` braucht keinen
  Timeout: `lebendeGegner === 0` bleibt korrekt, weil Geister verschwinden.
- **Engstellen** (`NavKnoten.engstelle`, gesetzt für Sap-Lücken, Breschen,
  Grabenmündung, Parados-Rampen): enger Radius (1,4 m, wie bisher per
  Id-Präfix) **und** erst „erreicht", wenn der Gegner die Engstelle in Richtung
  des nächsten Wegpunkts passiert hat. Ohne das schnitt er nach der Bresche B
  (x=−3) auf dem Weg zu `front-B` (x=0) die Ecke und rutschte an der Wand neben
  der Lücke fest; an der Grabenmündung „erreichte" er den Knoten schräg und
  lief dann in die Grabenwand. Der Id-Präfix-Check (`sap-`/`bresche-`) ist damit
  durch Daten ersetzt.
- **H3 — Tick-Reihenfolge** (`src/sim/wave.ts`): bei erschöpfter Angriffskraft
  geht `welle` immer zuerst auf `reserve`; `reserve` fällt im nächsten Tick bei
  `!ctx.finale` auf `vorbei` (Variante 2 aus dem Ticket, kleinerer Eingriff).
  Nebenbefund behoben: `leereQueue` meldet einen Spawn, im Spawn-Tick gibt es
  keinen Phasenwechsel (der frische Gegner steckte noch nicht in
  `lebendeGegner` → `vorbei` mit lebendem Gegner).
- **H4 — „Gewonnen" spielbar** (`src/sim/index.ts`, `wave.ts`, `einsatz.ts`,
  `ui/hud.ts`): `interact` (**E**) = `extrahieren`, `ability` (**Q**) =
  `verlaengern`, flankengesteuert im `step`, nur bei `finale` + `gewonnen`, auch
  im Tod (Entscheidung, keine Bewegung) — als `InputCommand`, also
  netcode-tauglich; **keine** Input-Layer-Änderung nötig (E/Q waren frei
  belegt). `WaveContext.eingefroren` (= `ergebnis === "gewonnen"`): im
  `reserve`-Regime keine Spawns, bis entschieden ist. `updateEinsatz`: Home-
  Verlust / Trupp aus kippen ein erreichtes `gewonnen` nicht mehr; nach
  `verlaengern` (`ergebnis` → `offen`) ist der Einsatz wieder verlierbar.
  HUD-Zeile nennt die Tasten.
- **Tests:** `sektor.test.ts` +6 (H1: Gegner geht durch die offene Bresche und
  kommt hinter der Front an — für A, B **und** C, mit Positions-Nachweis an der
  Bresche und z < 8; Gegenprobe geschlossene Bresche = Wand; H2:
  eingemauerte Spawns werden despawnt, Angriffskraft zurück, Director geht in
  `pause`; H4: nach `gewonnen` 40 s keine neuen Gegner-Ids, Home-Verlust kippt
  nichts, E → `vorbei`/`gewonnen`; Q → zweiter Countdown ≤ 45 s, gehaltene
  Taste zündet einmal; E/Q vor `gewonnen` wirkungslos). `wave.test.ts` +4
  (reserve-zuerst, Spawn-Tick ohne Phasenwechsel, `eingefroren`, **H3-
  Regressionstest in `createSim`-Reihenfolge**: letzter Kill bricht Angriffskraft
  + leert Feld im selben Tick → `reserve`, Reservewellen folgen).
  `einsatz.test.ts` +2 (gewonnen geschützt, nach verlaengern verlierbar).
  `enemies.test.ts` +4 (1. Eingriff plant um die Wand herum; ohne Ausweg
  Despawn mit Callback; Relokation; normaler Marsch löst den Watchdog nie aus).
- `src/ARCHITEKTUR.md`: Abschnitt „Kern-Bogen-Fixes (AP4-06)".

### Entscheidungen / Abweichungen vom Ticket

1. **H1 als echte Lösung** (schaltbare Kollider), wie im Ticket bevorzugt.
   Umsetzung über getaggte Boxen + Aktiv-Flags statt Boxen aus dem Array zu
   entfernen — Indizes bleiben stabil, Renderer-Meshes hängen am Tag.
2. **`syncBreschen` öffnet auch die Nav-Kante** (vorher separater Block im
   `step`) — Kollision und Nav ändern sich jetzt im selben Aufruf, auch bei
   `_setAbschnittVerloren` / `rueckerobern`. Nötig, weil der Sim-Test sonst im
   Spawn-Tick noch über die Sap-Lücke plante.
3. **Bresche-Knoten B auf die erste Bresche verschoben** (Datenfehler, siehe
   TODO 1) — ohne das wäre der Begehbarkeits-Test nie grün geworden.
4. **Engstellen als Knoten-Flag statt Id-Präfix** — kleine Schema-Erweiterung
   (`NavKnoten.engstelle?`), aber nötig, damit Grabenmündung und Parados-Rampen
   dieselbe Regel bekommen; nebenbei ein Stück weniger hartkodiertes
   Sektor-Wissen in der Sim (Audit M1).
5. **Versatz-Kappung im Graben** (TODO 2) — ein latenter AP4-02-Fehler, den erst
   der neue Sim-Test sichtbar machte; ohne die Kappung despawnt der Watchdog die
   Gegner am Grabeneingang, was den Bug nur kaschiert hätte.
6. **`verlaengern` auf Q verdrahtet** statt nur `extrahieren` + TODO — beide
   Tasten waren frei, das HUD nannte ohnehin beide Optionen; flankengesteuert
   und nur im Gewonnen-Zustand, versehentliches Auslösen ist unkritisch.
7. **Kein Wave-Timeout** (Ticket: „oder Timeout ergänzen") — der Despawn macht
   die bestehende Bedingung korrekt; ein Timeout hätte legitime, langsame
   Restgegner übersprungen.
8. **Home-Abschnitte bekommen Trümmer/Rauch** im Renderer — eine Zeile im
   bestehenden Loop, nötig, weil ihr Bresche-Segment jetzt verschwindet (sonst
   ein unsichtbares Loch in einer sichtbaren Wand).

### Nachweis „Test hätte H1 rot gemacht"

Der Begehbarkeits-Test lief zuerst gegen den unveränderten Sektor (Kollision
schaltbar, aber noch keine getaggten Segmente): 3 von 3 Tests rot —
`Segment bresche:A:0 fehlt`, `lab-tor2 → reinforcement-A: hängt bei (−18.15,
30.00)` (Knoten im Trichter-Quader), `parados-A → feld-links: hängt … Rest
13.30 m` (Knoten in der Rampenstufe). Nach der Geometrie-Teilung: `Knoten
bresche-B steckt in einem festen Kollider` + `lab-vorfront → bresche-B: hängt
bei (0.00, 16.55), Rest 0.55 m` — exakt der Audit-Befund H1, bis der Knoten auf
die Bresche gelegt wurde. Die Gegenprobe im Test hält fest, dass der Weg zum
Bresche-Knoten mit stehendem Parapet unbegehbar bleibt. Der Sim-Test „H1 für
A/B/C" schlug zusätzlich für B fehl (Gegner despawnt) — Trace:
`(−3.07, 16.31)` → durch die Bresche → `(−1.56, −1.80, 11.85)` und dort
8 s fest (Versatz −1,6 m zielte in die Grabenwand bei x −2,2..−1,8), Watchdog
→ Relokation → erneut fest → Despawn nach 39,8 s. Das führte zu Engstellen-Flag
und Versatz-Kappung.

### Manuell geprüft

**Nicht im Browser geprüft** — in dieser Session steht kein Browser/CDP-Harness
zur Verfügung. `npm run build` ist grün; die Render-Änderung ist minimal
(`setEnabled` je getaggtem Segment, Home-Abschnitte im bestehenden
Trümmer-Loop). Bitte im Spieltest gegenchecken: (1) aufgerissene Bresche =
sichtbares Loch im Parapet mit Trümmern, Gegner strömen hindurch; (2) nach
„Entsatz eingetroffen" beendet **E** den Einsatz, **Q** verlängert; (3) kein
Gegner steht dauerhaft vor einer Wand (Watchdog: nach ~4 s neuer Weg, nach ~8 s
Relokation ins Labyrinth).
