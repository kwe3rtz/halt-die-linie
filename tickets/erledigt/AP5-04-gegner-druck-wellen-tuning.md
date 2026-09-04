# AP5-04 — Gegner-Druck & Wellen-Eskalation

**Status:** erledigt · `525716a` · reviewed 2026-09-04
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

## Bericht — AP5-04

COMMIT: <Hash in der Nachricht an die Planer-Session> (Branch `arbeitspaket-5`)
CI: <Status in der Nachricht an die Planer-Session>
TODO(Rückfrage): keine im Code — drei Merkposten für die Balance nach dem
Spieltest, siehe unten.

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  24 Dateien, 284 Tests (vorher 269)
    Coverage src/sim: 98,58 % Stmts / 97,10 % Branch / 100 % Funcs / 98,58 % Lines
    wave.ts 100 · enemies.ts 97,73 · index.ts 98,55 · sektor.ts 100
> vite build                       ✓  dist/assets/index-*.js 6.909,1 kB │ gzip 1.533,4 kB
```

Tests: 284 (24 Dateien, +15 — `enemies` +8, `wave` +4, `wave-eskalation` 3 neu)
· Coverage src/sim **98,58 %** (vorher 98,43 %) · Bundle ~6,91 MB / ~1,53 MB
gzip (Δ +0,8 kB roh, kein neuer Import).

**Golden-Anker:** alle drei sind **bewusst neu baseliniert** (Begründung in
Entscheidung 9) — die neuen Zahlen ändern jeden Lauf mit Wave-Director.
Spieler-Werte (Position, Blick, HP, Munition) sind in beiden Replay-Ankern
unverändert; die Uhr zieht weiterhin 2 an stehender / 1 an gefallener Front.

### Ausgangsmessung (warum die alten Zahlen nicht trugen)

Headless „Spieltest-Simulator" (Scratch-Skript, nicht im Repo): echte Sim +
echter Sektor + Wave-Director, Seed 1 wie `main.ts`, dazu ein idealisierter
Schütze, der im Frontgraben A steht, auf den nächsten sichtbaren Gegner zielt,
alle 1,6 s feuert und bei leerem Magazin nachlädt. Vorher:

| | vorher (`3dd6fd4`) |
|---|---|
| Hauptwellen | 4 · 6 · 8 · 10 — dann Finale |
| max. gleichzeitig lebende Gegner | **9** |
| Einsatzdauer bis „gewonnen" | 3,5 min |
| Anteil der Zeit mit Gegnern an der Front | **~28 %** (Anmarsch durchs Labyrinth: Median 16 s, plus 5 s Pause) |
| Gegner gesamt | 34 (Budget 60: 1 je Spawn + 2 je Front-Kill → ~20 Gegner reichen) |

Das erklärt das Feedback vollständig: mit Budget 60 und der Uhr (3 Angriffskraft
je an der Front getöteten Gegner) ist nach ~20 Gegnern Schluss — Welle 4 kommt
schon gekappt, eine Eskalation ist arithmetisch unerreichbar; und 72 % der Zeit
steht niemand vor dem Spieler.

### Umsetzung

**(a) Wave-Director** (`src/sim/wave.ts`, alle Zahlen weiter Platzhalter):

| Größe | vorher | jetzt |
|---|---|---|
| `START_ANGRIFFSKRAFT` | 60 | **150** |
| Wellengröße `wellenGroesse(w)` | 4 + 2·(w−1) | **5 + 3·(w−1)** → 5 · 8 · 11 · 14 · 17 |
| Spawn-Takt `spawnIntervall(w)` | 1,4 s konstant | **1,4 s − 0,15 s je Welle, min 0,6 s** (Welle 5: 0,8 s) |
| Spawn-Jitter | — | **±25 %** aus dem Director-Rng (kein Metronom) |
| `PAUSE_DAUER` | 5 s | **3 s** |
| Reservewellen (Finale) | 3 + 2·Stufe | **6 + 3·Stufe** |
| `HP_FAKTOR_PRO_WELLE` | 0,12 | 0,12 (unverändert — bis Welle 6 bleiben es zwei Treffer) |

`wellenGroesse` / `spawnIntervall` sind reine, exportierte Helfer (Tests, Doku).

**(b) Linieninfanterie** (`src/sim/enemies.ts`): je Gegner ein
`tempoFaktor` (1 ± 15 %) und eine stufenlose Marschspur `spur` (−1..1 ×
`SPREIZUNG_MAX` 2,4 m; ersetzt das feste `id % 7`-Raster mit sieben Bahnen).
Beides sind Würfelwerte (`GegnerStreuung`), die `createSim` aus einem eigenen
`gegnerRng`-Strom zieht; Aufrufer ohne Angabe (Tests) bekommen exakt das alte
Verhalten. Die Kette zieht sich damit im Anmarsch auseinander statt im
Gleichschritt zu laufen — gemessen auf dem echten Labyrinth (17 Gegner im
Welle-5-Takt): Spanne der Marschzeiten **5,3 s mit** Streuung gegen **2,1 s
ohne**, alle 17 kommen an, kein Watchdog-Eingriff.

**(c) Drei Korrekturen am bestehenden Verhalten**, die erst mit mehr Gegnern
und gestreuten Spuren zuschlugen — im ersten Lauf mit den neuen Zahlen blieben
**7 von 84** Gegnern hängen und wurden vom Watchdog despawnt (vorher 0, weil
die Fälle selten waren). Alle drei per Trace bis zur Ursache verfolgt, keine
neue Verhaltensweise:

1. **Engstellen-Ebene senkrecht zur Anmarschrichtung** (`wegpunkt()`). AP4-06
   nahm die Richtung zum *nächsten* Wegpunkt; knickt der Pfad an der Engstelle
   rechtwinklig ab (`lab-vorfront → bresche-B` läuft 45° südwest,
   `bresche-B → front-B` 45° südost), liegt diese Ebene *parallel* zum
   Anmarsch — ein Gegner, der 1,4 m schräg vor der Wand ankam, galt als
   „durch" und steuerte `front-B` quer durchs Parapet an (Trace: von
   (−1,9, 16,7) an der Wand entlang nach (+0,5, 16,6), Stillstand, Watchdog).
   Mit dem alten Raster kam Gegner Nr. 1 immer von der Westseite; die
   gestreute Spur schickt die Hälfte von Osten.
2. **Nahkampf-Sicht auf Kniehöhe** statt Augenhöhe (dieselbe `KNIE`-Linie
   wie die Erreichbarkeits-Prüfung des Watchdogs). Auf Augenhöhe sah ein
   Gegner auf der Oberfläche den Spieler über das Parapet hinweg im Graben
   (3,6 m Luftlinie) und lief geradewegs in die Wand — bis zum Despawn nach
   dreimal 4 s. Kniehöhe: das Parapet blockt, der Gegner bleibt auf dem
   Pfad zur Sap-Lücke und kommt durch sie in den Graben.
3. **Am Zielknoten weiter navigieren.** Erreichte ein Gegner sein
   strategisches Ziel (`front-X`, nach Abschnittsverlust `home-ziel`), lief er
   in Luftlinie auf den Spieler zu, egal wo der war — von der Home-Line
   zurück quer durchs Home-Parapet auf den Feuertritt (Trace ids 28/29/42).
   Genau das reparierte bisher der Watchdog nach 4 s Stillstand mit einer
   Neuplanung. Jetzt passiert die Neuplanung sofort: Spieler außer
   Nahkampf-Sicht → Graph-Weg zum Knoten beim Spieler; gibt es keinen (Front
   steht, Spieler hinten), bleibt es wie bisher bei der Luftlinie.

**(d) Nav-Daten** (`src/data/sektor.ts`): `home-feld-links/-rechts` liegen jetzt
als Engstellen am **Rampenfuß** (±20, −23,5, Sohle) statt oben an der
Rampenkante (±18, −21, Feldniveau). Vom Grabenboden aus galten sie im 3-m-
Radius als „erreicht", der nächste Wegpunkt `feld-*` lag quer hinter dem
Home-Parapet — die letzten zwei Despawns (Seed 1, ids 42/53 auf dem Feuertritt
bei x ≈ 15). Der Begehbarkeitstest (AP4-06) prüft die verschobenen Kanten in
beide Richtungen.

**(e) F3-Overlay** (`src/ui/debug.ts`, `main.ts`): neue Zeile
`gegner  N lebend` — das Messinstrument des Akzeptanzkriteriums.

**Doku:** `src/ARCHITEKTUR.md` → „Boxhead-Kern (AP5)" um AP5-04 ergänzt.

### Ergebnis (derselbe Simulator, Seeds 1–5)

| | vorher | nachher (Seed 1) | Seeds 2–5 |
|---|---|---|---|
| Hauptwellen | 4 · 6 · 8 · 10 | **5 · 8 · 11 · 14 · 17** (+ 6. Welle gekappt) | identisch, 6. Welle 4–5 gekappt |
| max. gleichzeitig lebend | 9 | **14** | **15** |
| Einsatzdauer | 3,5 min | 7,7 min | 6,6–7,0 min |
| Zeit mit Gegnern an der Front | ~28 % | **~70 %** | — |
| Watchdog-Despawns | 0 | **0** (vor den Korrekturen: 7) | 0 |
| Gegner gesamt | 34 | 75 | 65–73 |
| Tode des stehenden Schützen | 2 | 5 (4× in Welle 4, 1× in Welle 5) | 3–8 |

Der Kern-Bogen taucht dabei von selbst auf: B fällt in Welle 2 (67 s), C in
Welle 3 (106 s), A ist ab Welle 4 bedrängt mit offener Bresche; die Home-Line
wird mehrfach bedrängt und hält. Wellen 1–3 (5/8/11) übersteht der stehende
Schütze ohne Tod, ab Welle 4 (14) muss man sich bewegen — siehe Merkposten.

### Tests

- **`src/sim/wave-eskalation.test.ts`** (neu, 3): 17 Gegner im Welle-5-Takt
  kommen alle ohne Watchdog-Eingriff an der Front an · die Streuung zieht die
  Marschzeiten auseinander (> 4 s), ohne Streuung enge Formation (< 3 s) ·
  **ganzer Einsatz** (Seed 1, idealisierter Schütze, ~0,7 s Laufzeit): Wellen
  exakt 5·8·11·14·17, Peak ≥ 12 lebend, 0 Despawns, gewonnen in < 12 min.
- **`src/sim/wave.test.ts`** (+4): Wellengröße linear ab 5 · Spawn-Takt fällt
  bis zur Untergrenze · Jitter im Band ±25 % und nicht metronomisch · **Budget:
  mit 1 je Spawn + `zermuerbungProKill("frontlinie")` trägt die Angriffskraft
  genau fünf volle Wellen**. Bestehende Tests auf die neuen Zahlen angepasst
  (Queue 5, Welle 2 = 8, Pause 3 s, Reserve 6/12, Welle-1-Spawnfenster 12 s).
- **`src/sim/enemies.test.ts`** (+8): Rückwärtskompatibilität ohne Streuung ·
  Abbildung der Würfelwerte · Tempo wirkt (1,15/0,85) · Spur fächert auf ·
  **Kniehöhe** (Gegner hinter dem Parapet nimmt die Sap-Lücke, 0 Watchdog) ·
  **Engstelle mit rechtwinklig abknickendem Pfad** (alle fünf Spuren durch die
  2,6-m-Lücke, 0 Watchdog) · **am Ziel weiter navigieren** (Durchgang statt
  Wand, 0 Watchdog) · ohne Graph-Weg bleibt die Luftlinie.
- **Gegenprobe gegen den alten Code** (Worktree auf `3dd6fd4`, altes
  `enemies.ts` + neue Tests/Daten): **8 Tests rot** — die vier Streuungs-
  Tests, Kniehöhe, am-Ziel-navigieren, Nav-Anker, Formations-Gegenprobe.
  Der Engstellen-Test war gegen komplett altes `enemies.ts` grün (das alte
  Raster schickt Nr. 1 von Westen), deshalb zusätzlich geprüft gegen das
  **neue `enemies.ts` mit nur der alten Engstellen-Ebene**: Engstellen-Test
  und Kniehöhe-Test rot. Jeder der drei Fixes hat damit einen Test, der ohne
  ihn fällt.
- `src/sim/sektor.test.ts`: „die Uhr" rechnet den Abbau jetzt gegen
  `angriffskraftMax` statt gegen das Literal 60; die AP4-06-Gegenprobe
  „geschlossene Bresche bleibt eine Wand" prüft jetzt die Bresche-Spur (nie
  durch das geschlossene Segment) statt nur „z bleibt nördlich" — der
  Watchdog darf den Gegner über die Sap-Lücke in den Graben schicken.
- `src/ui/debug.test.ts`: F3-Zeile.

### Entscheidungen / Abweichungen vom Ticket

1. **Budget 60 → 150.** Ohne das gibt es keine „höheren Wellen": bei
   unverändertem Uhr-Preis (1 je Spawn + 2 je Front-Kill, `einsatz.ts` nicht
   angefasst) sind mit 60 nach ~20 Gegnern Feld und Finale erreicht. 150 trägt
   für den Front-Halter genau fünf volle Wellen (55 Gegner); wer sich an die
   Home-Line zurückzieht (1,5 je Gegner), bekommt ~100 Gegner und sieben
   Wellen bis 23 — die Uhr bleibt die Belohnung fürs Halten.
2. **Kurve 5 + 3 je Welle, Takt −0,15 s je Welle, Pause 3 s, Jitter ±25 %.**
   „Stärker staffeln" als klar größere Schritte (+3 statt +2) und dichtere
   Spawns; die Pause verkürzt, weil der Anmarsch (~16 s) ohnehin die Ruhe
   liefert. HP-Faktor bewusst gelassen: bis Welle 6 bleibt es bei zwei
   Treffern, der Druck kommt aus der Zahl (Boxhead), nicht aus Schwämmen.
3. **Reservewellen 6 (+3 je `verlaengern`)** statt 3 (+2): das Finale ist der
   Höhepunkt, drei Nachzügler alle 8 s wirkten nach Welle 5 wie ein Nachklapp.
   Zahlen in `wave.ts`, kein Eingriff in Countdown/Uhr (`einsatz.ts`).
4. **Streuung als Würfelwerte aus einem eigenen Rng-Strom** (`gegnerRng`):
   kein Verschieben der Spawnpunkt-Wahl (`waveRng`) oder Abschnitts-Zuweisung
   (`abschnittRng`) — die Abschnitte der ersten vier Anker-Gegner blieben so
   unverändert. `spawnEnemy` ohne Streuung = altes Verhalten.
5. **`SPREIZUNG_MAX` bleibt 2,4 m** (= alte Hüllkurve ±3 × 0,8 m). 3,0 m
   ausprobiert: zielt an den 2,6-m-Breschen vorbei. „Ausbauen" heißt hier
   stufenlos statt sieben Bahnen, plus Tempo.
6. **Drei Verhaltenskorrekturen über „Zahlen" hinaus** (c) — bewusst gemacht,
   weil die neuen Zahlen sie sichtbar machten (8 % Despawns) und ein
   Wave-Tuning nichts bringt, wenn die Gegner an Wänden kleben. Keine neue
   KI-Rolle; jede Änderung ist die Reparatur einer vorhandenen Regel, mit
   Trace, Test und Gegenprobe. Nebeneffekt von (3): Gegner, die an der
   Home-Line ankommen, laufen jetzt sofort statt nach 4 s Wandkontakt zurück
   zum Spieler — dasselbe, was der Watchdog vorher tat, nur ohne Kleben.
7. **Nav-Knoten `home-feld-*` verschoben** (d) — Datenkorrektur außerhalb der
   Ticket-Dateien, aber die Ursache der letzten zwei Despawns; ohne sie wäre
   „Rückweg von der Home-Line" ein Watchdog-Fall. Zonen, Abschnitte, Breschen
   unverändert.
8. **F3 zeigt lebende Gegner** — das Ticket nennt „F3 + Lagekarte" als
   Messinstrument, das Overlay zeigte aber keine Gegnerzahl.
9. **Golden-Anker neu baseliniert** (`sim.test.ts`), jeweils mit Kommentar:
   Inline-Anker `angriffskraftRest` 57 → **148**, `enemies.length` 3 → **2**
   (150 statt 60; gestreuter Takt: im 6-s-Fenster zwei statt drei Spawns).
   Nav-Anker 56 → **145**, 4 → **5** Gegner (Welle 1 hat 5), Positionen der
   Gegner 0/3 neu (Tempo-/Spur-Streuung), Abschnitte/Ziele der ersten vier
   identisch (eigener Rng-Strom). Uhr-Anker 58/59 → **148/149** — nur das
   Budget, die Uhr selbst (−2 / −1) ist unverändert.
10. **Nicht angefasst:** `einsatz.ts`, `front.ts` (Uhr-, Bresche-, Front-
    Zahlen — ausdrücklich nicht im Ticket), Gegner-Def (`hp/tempo/schaden`),
    Waffe, Renderer.

### Manuell geprüft (`npm run dev`, headless Chromium via Playwright)

Ohne zielenden Spieler stirbt headless kein Gegner — Welle 1 endet dann nie.
Deshalb eine **temporäre Prüfseite** im Vite-Dev-Server (nicht committet), die
die echten Module fährt — `createSim` (Seed 1 wie `main.ts`), `createRenderer`,
`createHud`, `createDebugOverlay` — und statt Tastatur/Maus den idealisierten
Schützen aus `wave-eskalation.test.ts` einspeist, Sim dreifach beschleunigt
(3 feste Ticks je Frame), Renderer zeichnet den aktuellen State. Ergebnis
(SwiftShader, 1280 × 720; Log in `tickets/erledigt/AP5-04-screenshots/
browser-check-log.txt`):

| Sim-Zeit | Welle | lebende Gegner (F3) | Render-fps | Front |
|---|---|---|---|---|
| 45 s | 2 | 7 (max 8) | 47 | A/B/C stabil |
| 84 s | 3 | **10** (max 11) | 47 | B verloren |
| 143 s | 4 | **13** | 49 | B/C verloren |
| 161 s | 4 | 12 | 40 | A bedrängt |
| 267 s | 5 | 13 (max 14) | 50 | — |
| 379 s | 6 (gekappt) | 11 | 46 | Finale läuft |
| 463 s | Finale | 6 | 49 | **vorbei / gewonnen** |

Wellen `[5, 8, 11, 14, 17, 14]`, Peak 14, **0 Watchdog-Despawns, 0 Konsolen-
fehler**, identischer Verlauf wie der Sim-Test (deterministisch). Die fps
liegen mit 13–14 Gegnern (je Kapsel + zwei Billboard-Planes) im selben Band
wie mit 5 — kein Render-Engpass durch die größeren Wellen (GPU-loser
Referenzwert, echte Hardware liegt darüber).

Screenshots (`tickets/erledigt/AP5-04-screenshots/`):

| Datei | Befund |
|---|---|
| `01-welle3-lebend10-sim84s.png` | Welle 3, F3 „gegner 10 lebend", Blick vom Spawn A nach Osten durch den Frontgraben: Gegnerkette kommt durch die Sap-Lücke A/B, HP-Balken, HUD „Welle 3 · Angriff" |
| `02-welle4-lebend13-sim143s.png` | Welle 4, „gegner 13 lebend": mehrere Gegner gleichzeitig im Graben und auf dem Feuertritt, Spieler bei 90/100 HP im Nahkampf |
| `99-ende.png` | Einsatzende nach der Extraktion |

Nicht headless prüfbar: das Gefühl — ob 14–17 Gegner für einen bewegten
Solo-Spieler mit Repetierer „bedrohlich" oder „unfair" sind (Merkposten). Für
den Spieltest: F3 zeigt jetzt die Gegnerzahl; ab Welle 3 sollten spürbar mehr
Gegner gleichzeitig kommen als je zuvor (vorher maximal 8–9).

### Merkposten (nach dem dritten Spieltest, nicht in diesem Ticket)

- **Solo-Balance ab Welle 4:** der stehende Schütze stirbt mit dem
  Repetierer ab 14 Gegnern mehrfach; dazu kommt der Respawn am Front-Spawn
  mitten in den Gegnern (Todesspirale möglich). Ein bewegter Spieler kitet
  (4,5/7 m/s gegen 2,6), aber falls zu hart: `ZUWACHS` 3 → 2 oder `START` 150
  → 120; Respawn-Punkt an der Home-Line wäre die konsequente Lösung.
- **Totzeit je Welle** (~16 s Anmarsch + 3 s Pause) bleibt, weil der Director
  die nächste Welle erst bei „alle tot" startet. Wenn der Kontaktanteil
  (~70 %) im Spieltest noch nicht reicht: Nachzügler-Toleranz oder zeit-
  basierte Wellen-Überlappung — das ist eine Regeländerung, keine Zahl,
  darum hier nicht gemacht.
- **Finale-Pacing:** Reservewellen kommen erst nach leerem Feld + 8 s + ~30 s
  Marsch bis zur Home-Line → im 90-s-Finale zwei bis drei Wellen. Gehört zum
  Uhr-/Finale-Politur-Ticket.
- `festVersuche` wird nie zurückgesetzt: ein Gegner, dem der Watchdog früher
  zweimal half, despawnt beim dritten Hänger Minuten später sofort. Ein
  Abklingen wäre sinnvoll (Politur).

## Review — AP5-04 · 2026-09-04

**Grünes Licht — letztes AP5-Ticket, damit ist Arbeitspaket 5 komplett.**

Lokal nachvollzogen: `git pull` auf `arbeitspaket-5`, `typecheck`/`lint`/
`format:check` grün, `test:coverage` 284/284 grün (Coverage src/sim
98,58 %), `build` grün. CI + Pages Preview auf GitHub beide `success`
(`33875188411`/`33875188532`).

Das ist die mit Abstand größte AP5-Änderung und trotzdem sauber begründet:
die **Ausgangsmessung vor dem Tuning** (headless Simulator mit
idealisiertem Schützen) liefert genau die Erklärung fürs Spieltest-Feedback
— Budget 60 bei Uhr-Preis 3/Kill ist arithmetisch nach ~20 Gegnern leer,
„Eskalation" war mit den alten Zahlen gar nicht erreichbar. Das ist der
Unterschied zwischen Tuning nach Bauchgefühl und Tuning mit Diagnose — genau
richtig für ein Ticket, dessen Akzeptanzkriterium „spürbar mehr Gegner
gleichzeitig" ist.

**Wave-Director-Diff** (`wave.ts`) gelesen: Budget 150, Wellenkurve 5+3,
gestaffelter Spawn-Takt mit Jitter, kürzere Pause, größere Reservewellen —
alle als benannte, exportierte Konstanten/Helfer (`wellenGroesse`,
`spawnIntervall`), gute Testbarkeit, `einsatz.ts`/`front.ts` unangetastet
wie im Ticket verlangt.

**Die drei Verhaltenskorrekturen (c)** habe ich mir besonders genau
angeschaut, weil sie über reines Zahlen-Tuning hinausgehen. Bewertung:
gerechtfertigt, gleiche Kategorie wie die AP4-06-Audit-Fixes — echte Bugs im
Bestand, die bei niedriger Dichte selten genug waren, um nicht aufzufallen,
und die ein Wave-Tuning ohne sie sinnlos gemacht hätten (Gegner kleben an
Wänden statt Druck zu erzeugen). Jeder der drei Fixes ist eine Reparatur
einer bestehenden Regel, keine neue Verhaltensweise — die Engstellen-Ebene
war immer als „senkrecht zum Anmarsch" gedacht (AP4-06), sie war nur falsch
berechnet für abknickende Pfade; die Kniehöhe-Vereinheitlichung nutzt exakt
die Konstante, die der Watchdog schon hatte; „am Ziel weiter navigieren" ist
das, was der Watchdog ohnehin nach 4 s tat, nur ohne den Wandkontakt davor.
Die Gegenprobe-Methodik (Worktree gegen alten Code, zusätzlich gegen neuen
Code mit nur der alten Engstellen-Ebene, um die drei Fixes einzeln
zuzuordnen) ist genau die Sorgfalt, die ich hier sehen will.

**Golden-Anker:** alle drei bewusst neu baseliniert, mit Kommentar direkt am
`expect()` (nicht nur im Ticket-Bericht) — das ist wichtig, damit die
Begründung bei der nächsten Änderung noch am richtigen Ort steht. Diff in
`sim.test.ts` geprüft: die Zahlen passen zur Ursache (Budget 60→150 erklärt
57→148/58→148/59→149 exakt; Welle 1 hat jetzt 5 statt 4 Gegner, deshalb
56→145 mit einem Gegner mehr; die neuen Positionen sind durch Tempo-/Spur-
Streuung erklärt, Abschnitts-Zuweisung der ersten vier Gegner bewusst
unverändert, weil ein eigener Rng-Strom für die Streuung verwendet wird,
nicht `waveRng`/`abschnittRng`). Kein Fall, in dem eine Zahl „einfach
nachgezogen" wurde, ohne dass die Änderung sie erklärt.

**Nav-Datenkorrektur** (`home-feld-links/-rechts` an den Rampenfuß, als
Engstelle markiert) ist die dritte in Folge, die ein Ticket in diesem
Bereich nebenbei findet (nach den 3 aus AP4-06 und den Bresche-Positionen
aus AP5-02/03) — der Begehbarkeitstest aus AP4-06 zahlt sich hier wieder
aus, indem er die verschobenen Kanten mitprüft.

Testabdeckung: `wave-eskalation.test.ts` mit dem kompletten Einsatz als
Regressionstest (Wellenzahlen exakt, Peak, 0 Despawns, Zeitbudget) ist
genau die richtige Flughöhe für ein Tuning-Ticket — sie hätte eine künftige
Zahlenänderung, die wieder „zu wenig Druck" produziert, gefangen. Die
`enemies.test.ts`-Erweiterungen decken jeden der drei Verhaltensfixes
einzeln mit einer fallenden Gegenprobe ab.

**Visueller Nachweis:** Playwright-Lauf mit demselben idealisierten Schützen
im echten Renderer, F3-Zeile „gegner N lebend" jetzt als Messinstrument,
Screenshot 02 stichprobenartig angeschaut — 13 Gegner im Frontgraben A/B,
HUD „Welle 4 · Angriff", Spieler bei 90/100 HP, deckt sich exakt mit der
Tabelle im Bericht. 0 Konsolenfehler, fps stabil auch bei Peak-Last.

**Für den dritten Spieltest wichtig:** die vier Merkposten (Solo-Balance ab
Welle 4, Totzeit je Welle, Finale-Pacing, `festVersuche` ohne Abklingen)
sind der richtige Fahrplan für die Nachjustierung — bewusst nicht in diesem
Ticket gelöst, weil es entweder Zahlen sind, die erst der Spieltest
beantwortet, oder Regeländerungen, die eigene Ticket-Entscheidungen
brauchen. Besonders der Respawn-Punkt-Hinweis (Todesspirale am
Front-Spawn) ist ein guter Kandidat für die erste Politur-Runde nach dem
Spieltest.

**Damit ist Arbeitspaket 5 „Boxhead-Kern" komplett** (AP5-01…04, alle
reviewed). Nächster Schritt ist der dritte Spieltest mit dem Nutzer — kein
weiteres Ticket automatisch angeschlossen.

