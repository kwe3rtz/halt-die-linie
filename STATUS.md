# Halt die Linie — Status

**Stand:** 2026-09-07

Ein-Blick-Übersicht für Menschen und für frische Claude-Sessions.

**Neu hier?** Diese Datei ganz lesen → `KONZEPT.md` → für den Bau-Stand
`CHANGELOG.md` + `tickets/` (+ `tickets/erledigt/`) → `WORKFLOW.md` für den
Ablauf, `AUFGABEN.md` für die Konventionen. Dokumenten-Karte in `WORKFLOW.md`.

## Wo wir stehen

- **Konzept:** beschlossen. §3/§5/§6/§9/§10 am **2026-09-07** in der
  Design-Runde neu gefasst (Entwurf v0.3): **eine Frontlinie statt
  A/B/C-Abschnitte**, größeres frei begehbares WW1-Grabennetz (Feindseite →
  Niemandsland → Frontlinie → Hinterland → Home-Line), Feind-Spawn folgt der
  vordersten gehaltenen Linie, „Instand setzen" als Rückeroberung, **Nacht
  zuerst** (roamende Tote), Skirmish-Rahmen vereinfacht, Generator später
  fürs ganze Netz. Das kompakte „H" mit A/B/C ist verworfen (§10).
- **Code:** AP1–AP4 (inkl. Nachzügler AP4-06) auf `main`, PR #7 gemergt. Der
  Kern-Bogen läuft jetzt Ende-zu-Ende bugfrei durch.
- **Zweiter Spieltest (2026-09-04):** Finale erreicht, „E" extrahiert →
  gewonnen — technisch sauber. Aber: das Gefühl trägt noch nicht. Feedback im
  Detail unten unter „Spieltest-Feedback (2026-09-04, AP5-Anlass)".
- **Entscheidung:** bevor das Graben-Konzept (Front/Bresche/Uhr) weiter
  vertieft wird, muss der Moment-zu-Moment-Loop für sich stehen — Vorbild
  **Boxhead**. Neues **Arbeitspaket 5 „Boxhead-Kern"** spezifiziert (4
  Tickets, `tickets/AP5-*`), AP4-System bleibt bestehen, wird aber vorerst
  nicht weiter ausgebaut.
- **Code:** **Arbeitspaket 5 „Boxhead-Kern" ist vollständig komplett**
  (AP5-01…04, alle reviewed, 284 Tests, Coverage src/sim 98,58 %). PR #8
  gemergt nach `main`.
- **Anspielen (nicht der volle dritte Spieltest):** Nutzer hat nur die
  ersten Wellen gespielt, noch kein Eindruck zur AP5-04-Eskalation. Zwei
  Nachzügler daraus, **beide erledigt:** AP5-05 (`a4f1f1a`) — Leit-Spines
  (AP4-05) komplett unsichtbar, Kompass + Schilder + Zonen-Tore tragen die
  Orientierung jetzt allein. AP5-06 (`e878a64`) — drei Gegner-Klassen
  (normal/schnell-schwach/langsam-stark, reine Statistik-Varianten, farblich
  unterscheidbar), Wave-Director mischt sie gewichtet (60/20/20).
- **Arbeitspaket 5 (inkl. Nachzügler AP5-05/06) ist damit vollständig
  komplett** — 296 Tests, Coverage src/sim 98,59 %. PR #9
  (`arbeitspaket-5` → `main`) **noch offen — muss vor AP6 gemergt werden**
  (AP6 zweigt von `main` und braucht den AP5-05/06-Code).
- **Dritter Spieltest (2026-09-07, nur erste Wellen):** „an sich in Ordnung",
  aber weiter „sehr statisch und unlebendig" — und die Sektor-Struktur mit
  A/B/C ist nicht das gewünschte Spiel. → **Konzept-Design-Runde** (oben) →
  **Arbeitspaket 6** spezifiziert (5 Tickets, `tickets/AP6-*`).
- **AP6-01 erledigt** (`c4d21f5`, reviewed, 286 Tests, Coverage src/sim
  98,54 %): neuer handgebauter **Nacht-Sektor** auf `arbeitspaket-6` —
  Feindseite → Niemandsland → Frontlinie → Hinterland → Home-Line, größeres
  verzweigtes Grabennetz (34-Knoten-Nav-Graph, 3 Wege vorn↔hinten), genau
  eine Front-/Home-„Linie" (N=1, `front.ts` unverändert). Nur die Bühne —
  der Kern-Bogen-Umbau ist AP6-02.
- **Als Nächstes:** `ki-game-e6` baut **AP6-02** (Kern-Bogen auf eine
  Frontlinie + eine Home-Line: A/B/C-Mechanik raus, Halte-Bedingung als
  Druck-Radius, Uhr an eine Linie, stale Audio-Callouts).
- Details zum Gebauten: `CHANGELOG.md` + `tickets/erledigt/`.

## Spielbar

`npm run dev` → First Person im **Greybox-Sektor „H"** (`arbeitspaket-4`, nach
Merge auf `main`): Frontlinie A/B/C · offenes Feld · zentraler Verbindungsgraben ·
Home-Line, vorderes Grabenlabyrinth. Gegner folgen dem Nav-Graphen durchs
Labyrinth an die Front, reißen Parapet-Breschen auf; ein verlorener Abschnitt
öffnet den Weg nach hinten. Jeder Kill zermürbt die Angriffskraft
(zonengewichtet). Ist sie gebrochen → **Zeit-Finale an der Home-Line**
(Countdown + Reservewellen) → gewonnen, oder alle Home-Abschnitte verloren →
verloren. Kompass + Spine + Schilder + Signalhorn zur Orientierung.
Tasten: F3 Debug · M Lagekarte · T Ton. Preview:
<https://kwe3rtz.github.io/halt-die-linie/>

## Arbeitsweise gerade

Zwei Claude-Sessions (Planer = Chat, Worker = VS Code) im Ticket-Loop — voller
Ablauf in **`WORKFLOW.md`**. Kurz: Worker baut ein Ticket, committet, pusht,
meldet sich; Planer reviewt (Checks + CI + Code), archiviert nach
`tickets/erledigt/`, pflegt `CHANGELOG.md` + `STATUS.md`, gibt grünes Licht.
Nutzer greift nur ein, wenn der Planer sich meldet. Modell/Effort pro Ticket
angesagt.

## Als Nächstes

1. **`ki-game-e6` baut AP6-02** — Kern-Bogen auf **eine** Frontlinie + **eine**
   Home-Line: A/B/C-Mechanik aus `src/sim/**` + HUD raus, Halte-Bedingung als
   Druck-Radius statt Linien-Bounds (AP6-01 TODO 2), die Uhr an eine Linie,
   stale Audio-Callouts (AP6-01 TODO 3). Spec: `tickets/AP6-02-*.md`.
2. Danach AP6-03…05:
   - AP6-03 Spawn-Verlagerung (Linie fällt → Spawn rückt vor).
   - AP6-04 „Instand setzen" (gefallene Linie zurückerobern).
   - AP6-05 roamende Nacht-Gegner.
3. Nach AP6-02 kurz anspielen (`arbeitspaket-6` auschecken): quer durch den
   neuen Nacht-Sektor — Front → Laufgraben → Hinterland-Seitenrouten →
   Home-Line → zurück. Merkposten aus AP6-01-Review: klumpen sich die
   Wellengegner an den 2 Sap-Lücken sichtbar? (dann Wellenziele streuen oder
   Saps verbreitern). Voller Spieltest, wenn AP6 steht — trägt „eine
   Frontlinie + Nacht + Roam" das Gefühl?
4. Am Ende von AP6: PR `arbeitspaket-6` → `main`.

**AP5-Merkposten** (fließen in AP6 ein bzw. AP7-Politur-Ticket): Solo-Balance
ab Welle 4 / Respawn-Punkt an der Home-Line statt am Front-Spawn,
`festVersuche` ohne Abklingen, Finale-Pacing.

## Spieltest-Feedback (2026-09-04, AP5-Anlass)

Zweiter Spieltest, nach AP4-06. Finale technisch sauber erreicht (E =
extrahieren → „gewonnen"). Inhaltliches Feedback:

- **Teleport-Bug:** beim Durchqueren des zentralen Verbindungsgrabens
  („Mittelgang") wird der Spieler gelegentlich an eine andere Position
  versetzt. → AP5-01.
- **Munition:** nur eine Waffe, Reserve nur durch Sterben nachfüllbar — fühlt
  sich falsch an. → AP5-02.
- **Karte:** fühlt sich noch nicht richtig an, wirkt wie eine geschlossene
  Box (sichtbare Kartengrenz-Wände). → AP5-03.
- **Gegner/Wellen:** zu wenige, zu dumme Gegner, keine spürbare Eskalation in
  höheren Wellen — das Kern-Gefühl „Front halten" kam noch nicht rüber.
  → AP5-04 (Tuning, kein neues System).
- Der Nutzer kannte die Begriffe „Bresche"/„Loch" (Lesbarkeit AP4-05) nicht —
  Merkposten fürs nächste Onboarding/HUD, kein eigenes Ticket.
- **Nutzer-Entscheidung:** erst den Boxhead-Kern-Loop reparieren (offene
  Fläche, Trenches, Zombies strömen, Munition/Deckung stimmig), dann wieder
  richtig ans Graben-Konzept (Front einnehmen/verlieren).

**Audit-Report (2026-09-04):** `AUDIT-2026-09-04-ap4.md` — unabhängiger
Voll-Kontext-Audit von `ki-game-c2` nach dem AP4-Merge. Architektur sauber, 4
High-Bugs reproduziert (→ AP4-06), plus Medium-/Low-Befunde für später
(hartkodiertes Sektor-Wissen in der Sim, `createSim`-Größe, Zonen-Überlappung,
Perf-Vorbereitung für Horden, u. a.).

### Map-Design-Runde — Ergebnis (2026-09-03)

Durch. Grundriss = **H**: durchgehende Frontlinie (Abschnitte A/B/C), zentraler
Verbindungsgraben, durchgehende Home-Line. Dazwischen **offenes Trichterfeld**
(„breiter offener Schlauch" — Kartengrenzen gesperrt, Umgehen nein). Feind kommt
von den vorderen Ecken durch ein **vorderes Grabenlabyrinth** (das ist der Teil,
den der Generator später würfelt). Front halten lohnt über **„die Uhr"**
(Angriffskraft wird an der gehaltenen Linie zermürbt). Maße = KI-Startwerte,
im Greybox justiert. Voll in `KONZEPT.md` §3, Tickets `tickets/AP4-*`.

**Externes KI-Sparring:** `SPARRING.md` (aktuell v2 — Map) · `SPARRING-LOG.md`
(Chronik) · `SPARRING-ANTWORTEN.md` (Runde 1 Gesamtkonzept + Runde 2 Sektor/Map,
je mit Konvergenz-Analyse).

## Spieltest-Feedback (2026-09-03, AP2)

- **Bugs → AP3, alle behoben** (Fadenkreuz, Tracer/Mündungsblitz, Viewmodel in
  Wänden, HP-Balken je Winkel, Gegner-Stacking). PR #5 gemergt.
- **Map stimmt noch nicht** — geklärt: Map-Design-Runde durch, AP4 baut den
  echten Sektor.
- **Erinnerung (kein Bug):** Gegner bewusst noch langsam/eintönig. Später
  gemischt — Bajonett-Charger, Anschleicher, Rusher etc. Roster in `KONZEPT.md`
  §5, Ausbau als eigenes Paket (`BACKLOG.md` → Gegner).
- Positiv: Pitch-Richtung stimmt, Wellen-Tempo ok.

### Beim nächsten Spieltest gegenchecken

- **AP3-04:** Gegner anschießen + um ihn herumlaufen → HP-Balken-Teilfüllung
  bleibt aus jedem Winkel linksbündig (headless konnte nur volle Balken zeigen).
- **AP3-05:** Gegner-Pulk verteilt sich, keiner clippt in die Kamera.
- **AP3-02:** kein „heller Strich quer über den Bildschirm" mehr beim Feuern.

## Offene Fäden — nicht vergessen

- **Prozeduraler Generator** (KONZEPT §9.5): Grundriss + Lesbarkeit sind
  entschieden (§3). Offen: das Erzeugungsverfahren fürs **vordere Labyrinth** —
  eigenes Paket nach AP4, ggf. mit einem zweiten handgebauten Sektor als
  Gegenprobe.
- **Nachschub-Ökonomie** (KONZEPT §9.6): Sparring-Konsens = *eine* Währung +
  Budgets/Slots pro Kategorie (statt zwei Währungen). Zahlen offen. Nach AP4.
- **In-Mission-Quest** (KONZEPT §4): Sparring-Konsens = als Dauermechanik
  streichen (einmaliger Unlock / auto nach Welle X / Ladungen nur an der
  Home-Line). §4 muss bei den Klassen überarbeitet werden.
- **Tag/Nacht** — größter Scope-Multiplikator; nicht beide Roster parallel. Nach
  AP4 als „zwei Kampfsprachen"-Paket (ein Tag-Fernkampf-, ein Nacht-Gegner).
- **Onboarding, Quartier-Ausbau, Art-/Render-Stil in 3D, „Krieg"-Modus**
  (KONZEPT §9.7–9.10) — offen.
- **Kamera-Pitch-Vorzeichen** beim manuellen Spielen gegenchecken
  (`src/ARCHITEKTUR.md` → Offene Rückfragen).
- **Bundle ~6,9 MB** (`@babylonjs/core` + AP4-UI/Audio) — Bundle-Budget-Gate im
  Infrastruktur-Backlog.
- **AP4-Balance-Platzhalter** (im Spieltest justieren): Zermürbung je Zone,
  Finale-/Verlängern-Countdown, Reservewellen-Kurve, `T/T2/T3` + Druck-Schwelle
  (`front.ts`), `HOME_BRESCHE_FAKTOR`, Sektor-Maße (`module.ts`/`sektor.ts`),
  Spine-Polylinien, Kompass-Marker-Überlappung.
- **CI-Laufzeit** ~5–7 min (lange Tick-Tests in `sektor.test.ts`) — im Limit,
  aber im Auge behalten.
- Weiteres siehe `AUFGABEN.md` → „Infrastruktur-Backlog".

## Entscheidungs-Log (neueste zuerst)

- **2026-09-07** — **AP6-01 „Neuer Greybox-Nacht-Sektor" erledigt** (`c4d21f5`,
  reviewed, 286 Tests, Coverage src/sim 98,54 %). `src/data/sektor.ts` komplett
  neu nach `KONZEPT.md` §3: größeres verzweigtes Grabennetz (Feindseite →
  Niemandsland → Frontlinie → Hinterland m. zentralem Laufgraben + 2
  Seitenrouten → Home-Line), 34-Knoten-Nav-Graph, Zonen als lückenlose
  Z-Bänder (`ZonenId` neu). Genau ein `frontAbschnitt` + ein `homeAbschnitt`
  → `front.ts` mit N=1 unverändert. `module.ts` `parapet()`: eine Bresche
  schaltet Wand+Feuertritt+Bank zusammen ab (echtes Loch), `unterstand()`
  bekommt Boden — echte Bühne-Fixes, keine neuen Modultypen. Renderer Nacht
  (dunkler Himmel, Fog 22–68, statische PointLights aus `meta.lichter`,
  FRONT/HOME-Schilder). Begehbarkeits-Test umgestellt (grün), zwei Golden-
  Anker bewusst neu baseliniert (Sim-Regeln unverändert, Gegenprobe
  Determinismus + voller Einsatz). 4 TODO(Rückfrage): (1) ein Bresche-Nav-
  Knoten/Linie → AP7-Politur; (2) Halte-Semantik + (3) stale Audio-Callouts
  → in AP6-02 aufgenommen; (4) Watchdog repathed (kein Despawn), weil alle
  Wellengegner auf `front-front` durch 2 Sap-Lücken zulaufen → Merkposten
  Spieltest/AP6-02.
- **2026-09-07** — **PR #9 gemergt** (`arbeitspaket-5` → `main`, AP5-05/06).
  `main` bei `c2d4b44`. Danach `arbeitspaket-6` von `main` gezweigt.
- **2026-09-07** — **Konzept-Design-Runde: neuer Sektor + neuer Kern-Bogen
  (Arbeitspaket 6).** Der dritte Spieltest (nur erste Wellen) war „an sich in
  Ordnung", fühlte sich aber weiter „sehr statisch und unlebendig" an — und
  die A/B/C-Abschnitts-Struktur ist nicht das gewünschte Spiel. Nutzer-Vision:
  Gegner sollen nicht stur ihre Route ablaufen und angreifen; nachts sollen
  Tote **roamen**; die Karte soll **größer, freier, begehbarer, echter WW1**
  sein (verzweigtes Grabennetz, eigene und Feindgräben getrennt); **keine
  A/B/C-Sektoren** — nur **eine Frontlinie**, dahinter eine **Home-Line** als
  echte Verlustgrenze; fällt eine Linie, spawnt der Feind weiter vorn; es
  braucht eine Mechanik, eine gefallene Linie **zurückzuerobern**. Zwei
  AskUserQuestion-Runden → Beschlüsse: **(1)** größerer Neuschnitt, Karte
  zuerst (handgebaut), Generator viel später fürs *ganze* Netz. **(2)**
  Skirmish-Rahmen behalten, vereinfacht (endliche Angriffskraft → Zeit-Finale
  an der Home-Line → extrahieren/verlängern; Verlust = Home-Line verloren oder
  Trupp aus; jetzt mit *einer* Linie + Rückeroberung). **(3)** Rückeroberung
  = „**Instand setzen**": exponierte, zeitkostende Pionier-Interaktion an einem
  festen Punkt, zieht Gegner an, jeder Versuch kostet echt. **(4)** **Nacht
  zuerst** — näher am aktuellen Stand als der Tag-Fernkampf. `KONZEPT.md`
  §1/§3/§5/§6/§9/§10 neu gefasst (Entwurf v0.3). **Arbeitspaket 6** = 5
  Tickets (`tickets/AP6-01…05`, Branch `arbeitspaket-6` von `main` nach
  PR-#9-Merge): neuer Nacht-Sektor · eine Frontlinie/Home-Line · Spawn-
  Verlagerung · „Instand setzen" · Roam-Gegner. Reihenfolge: AP6-01 (Karte)
  zuerst, Rest danach verfeinern. AP4/AP5-Sim-Technik wird umgebaut, nicht
  weggeworfen. Tag-Fernkampf-KI + Generator fürs ganze Netz = AP7. Worker-
  Session `ki-game-e6`.
- **2026-09-07** — **Nachzügler AP5-05/06 komplett** (296 Tests, Coverage
  src/sim 98,59 %). Nach dem AP5-Merge (PR #8) hat der Nutzer kurz angespielt
  (nicht der volle dritte Spieltest) und zwei Punkte sofort gemeldet: die
  AP4-05-„Leit-Spines" (Polylinie + Pfosten + Symbole als Wegweiser) wirkten
  wie verwirrende „Stricke" — **AP5-05** entfernt ihre komplette Sichtbarkeit
  (nicht nur die Linie, sonst hätten die Symbol-Billboards frei geschwebt),
  das Datenmodell bleibt für später bestehen. Zweitens wünschte er mehr
  Gegner-Varianz — **AP5-06** baut das als reine Statistik-Varianten der
  Linieninfanterie (normal/schnell-schwach/langsam-stark, farblich
  unterscheidbar), gewichtet gemischt über den bestehenden Wave-Director-Rng,
  ausdrücklich ohne neue KI-Rolle. Beide Tickets mit der inzwischen
  etablierten Sorgfalt gebaut: AP5-06 hat die im Ticket vorgeschlagenen
  HP-Werte anhand des echten Waffenschadens korrigiert (sonst wäre der
  Trefferzahl-Unterschied unsichtbar geblieben) und die Golden-Anker wieder
  mit Gegenprobe neu baseliniert. Ein zusätzlicher Watchdog-Despawn (1/40
  Seeds) ist sauber auf den bekannten AP5-04-Merkposten (`festVersuche` klingt
  nie ab) zurückgeführt, nicht neu. **Damit ist Arbeitspaket 5 (AP5-01…06)
  vollständig komplett** — als Nächstes der erste **echte** dritte Spieltest
  über mehrere Wellen (das bisherige Anspielen deckte nur Welle 1 ab).
- **2026-09-04** — **Arbeitspaket 5 „Boxhead-Kern" komplett** (AP5-01…04,
  alle reviewed, 284 Tests, Coverage src/sim 98,58 %, PR #8 offen). AP5-04
  war der größte Einzelschritt: Diagnose vor dem Tuning (headless Simulator)
  zeigte, dass das alte Angriffskraft-Budget (60) arithmetisch nach ~20
  Gegnern erschöpft war — Eskalation war mit den alten Zahlen unerreichbar,
  nicht nur schlecht getroffen. Wave-Director neu kalibriert
  (`START_ANGRIFFSKRAFT` 150, Wellenkurve 5+3, gestaffelter Spawn-Takt mit
  Jitter, größere Reservewellen) + individuelle Marsch-Streuung (Tempo +
  Spur) an der Linieninfanterie. Dabei durch die höhere Dichte sichtbar
  geworden und mit Trace/Test/Gegenprobe behoben: drei latente Nav-Bugs
  (Engstellen-Ebene bei abknickenden Pfaden falsch orientiert, Nahkampf-
  Sicht auf Augen- statt Kniehöhe, kein Re-Pathing am erreichten Zielknoten)
  — Watchdog-Despawns 7/84 → 0/84 über fünf Seeds. Alle drei Golden-/Replay-
  Anker bewusst neu baseliniert, Begründung direkt am Test. Ergebnis: Peak
  gleichzeitiger Gegner 9 → 14–17, Kontaktzeit an der Front 28 % → 70 %.
  **Lehre (Fortsetzung von AP4-06):** ein Tuning-Ticket, das nur Zahlen
  ändert, deckt zuverlässig latente Wiring-Bugs auf, die bei niedriger
  Systemlast unbeobachtet blieben — Messen vor dem Ändern (Ausgangsdiagnose)
  und Gegenprobe je Fix bleiben der richtige Standard dafür.
- **2026-09-04** — **Pivot: Arbeitspaket 5 „Boxhead-Kern".** Zweiter
  Spieltest zeigt: der Kern-Bogen läuft bugfrei, trägt aber als Gefühl noch
  nicht (zu wenige/dumme Gegner, keine Eskalation, Teleport-Bug im
  Verbindungsgraben, Munition nur durch Sterben, Karte wirkt wie eine Box).
  Nutzer-Entscheidung: bevor das Graben-Konzept (Front/Bresche/Uhr) weiter
  vertieft wird, muss der Moment-zu-Moment-Loop für sich stehen — Vorbild
  **Boxhead** (offene Fläche, Trenches, Zombies strömen kontinuierlich),
  übertragen auf die bestehende 3D-First-Person-Basis. AP4-System bleibt
  bestehen (kein Rückbau), wird nur vorerst nicht weiter ausgebaut. AP5 = 4
  Tickets (`tickets/AP5-01…04`): Teleport-Bugfix, Munitions-Nachschub,
  Kartengrenze visuell öffnen, Gegner-Druck/Wellen-Tuning. Bisheriges
  „Arbeitspaket 5" (zwei Kampfsprachen) → „Arbeitspaket 6+".
- **2026-09-04** — **AP4-06 „Kern-Bogen-Fixes" komplett** (`7688452`, reviewed,
  232 Tests, Coverage src/sim 98,38 %, alle drei Golden-Anker unverändert).
  H1 als echte Lösung: Bresche ist jetzt ein physisches Loch (schaltbare
  Kollider, `CollisionWorld.tags`/`aktiv`), nicht nur ein offener Nav-Pfad. H2:
  dreistufiger Stuck-Watchdog + Engstellen-Flag im Nav-Graph. H3: Wave-Director
  geht bei erschöpfter Angriffskraft immer zuerst auf `reserve`. H4: `E`/`Q`
  (extrahieren/verlängern) als echte `InputCommand`s, `gewonnen` gegen
  Home-Verlust geschützt. Neuer Graph-Begehbarkeits-Test fand dabei 3 echte
  Datenfehler im Nav-Graph und wird zum Sicherheitsnetz für den späteren
  Generator. Damit ist AP4 (inkl. Nachzügler) vollständig komplett — zweiter
  Spieltest fällig.
- **2026-09-04** — **Unabhängiger Audit nach AP4-Merge** (`ki-game-c2`, Firmen-
  Account, hoher Effort, voller Projektkontext): Architektur/goldene Regel
  sauber, aber 4 reproduzierte Gameplay-Bugs in der Verdrahtung zwischen den
  AP4-Maschinen (nicht in den Maschinen selbst) — Bresche öffnet nur den
  Nav-Pfad, nicht die Kollision (Gegner stecken vor der Wand); kein
  Stuck-Fallback (blockiert den Wellen-Loop); Tick-Reihenfolge Wave vor Einsatz
  (Finale kann ohne Reservewellen laufen); „gewonnen" ohne Tastenbindung nicht
  abschließbar, kann danach noch auf „verloren" kippen. Report:
  `AUDIT-2026-09-04-ap4.md`. Daraus **AP4-06 „Kern-Bogen-Fixes"** spezifiziert
  (die 4 Bugs + ein Graph-Begehbarkeits-Test), **vor** AP5 eingeschoben.
  Medium-/Low-Befunde (hartkodiertes Sektor-Wissen in der Sim, `createSim`-
  Größe, Zonen-Bounds-Überlappung, Konstanten-Duplikate, Perf-Vorbereitung)
  zurückgestellt für ein späteres Politur-Ticket.
- **2026-09-04** — **AP4 „Verteidigung in der Tiefe" komplett** (AP4-01…05, alle
  reviewed, 212 Tests, Coverage src/sim 97,3 %): Greybox-Sektor „H" aus
  modularen Bausteinen · semantischer Feind-Nav-Graph (kein NavMesh) ·
  Frontabschnitts-Zustandsmaschine (`stabil→…→verloren`, Breschen, `rueckerobern`)
  · die Uhr (zonengewichtete Zermürbung) + Home-Line-Finale + Verlustbedingung ·
  Lesbarkeit (Zonensilhouetten, Wand-Spine, Kompass, Lagekarte, direktionales
  Audio). PR `arbeitspaket-4` → `main` offen. Alle Zahlen Platzhalter → Spieltest.
- **2026-09-03** — **Map-Design-Runde abgeschlossen + AP4 spezifiziert.**
  Sektor-Grundriss = H (durchgehende Front / zentraler Verbindungsgraben /
  durchgehende Home-Line), **offenes Feld** statt hartem Korridor (Kartengrenzen
  gesperrt), Feind durch ein **vorderes Grabenlabyrinth** (= späterer
  Generator-Scope), Front-Anreiz über **„die Uhr"**. `KONZEPT.md` §3/§6/§9
  umgeschrieben, §10 zwei Verworfen-Einträge. AP4 = 5 Tickets (`tickets/AP4-*`),
  Branch `arbeitspaket-4`. Generator/Tag-Nacht/Klassen bewusst dahinter
  (`AUFGABEN.md` AP5+).
- **2026-09-03** — Map-Design-Runde gestartet. Statt offener Fragerunde ein
  **Straw-Man** (Planer-Vorschlag zu allen 8 Leitfragen) formuliert und als
  `SPARRING.md` v2 an die externen KIs gegeben — konkreter Vorschlag zum Zerlegen
  statt Brainstorm. Antworten → `SPARRING-ANTWORTEN.md`, dann Design-Runde mit dem
  Nutzer. Bisherige Briefings in `SPARRING-LOG.md` archiviert.
- **2026-09-03** — Doku-System aufgesetzt gegen Kontextverlust: `STATUS.md`
  (dies), `CHANGELOG.md`, `WORKFLOW.md` (inkl. Onboarding-Prompts für frische
  Planer- **und** Worker-Sessions), `tickets/erledigt/` (Audit-Trail: Spec +
  Worker-Bericht + Review je Ticket).
- **2026-09-03** — **AP3 „Basis solide machen" komplett** (AP3-01…05, alle
  reviewed, 100 Tests): Fadenkreuz+Hitmarker, Tracer/Mündungsblitz-Fix,
  Viewmodel-Wandkollision, HP-Balken-Fix, Gegner-Separation. PR #5 gemergt.
- **2026-09-03** — Erster Spieltest (AP2). Feedback → AP3 vorgezogen;
  prozedurale Map + Gegner-Roster-Ausbau dahinter. `SPARRING.md` angelegt.
- **2026-09-03** — **Arbeitspaket 2 komplett** (AP2-01…AP2-05, alle reviewed,
  95 Tests): Waffen-Feuerlogik, Spieler-HP/Tod/Respawn, Linieninfanterie,
  Wave-Director, HUD, Golden-Replay-Test. Nach `main` gemergt (PR #4).
- **2026-09-03** — AP1 → `main` gemergt (PR #1). AP2 auf Branch `arbeitspaket-2`,
  Ticket-Ordner `tickets/`.
- **2026-09-02** — Tech festgezurrt: TypeScript + Vite + **Babylon.js**, **3D +
  First Person ab Tag eins** (keine 2D-Zwischenstufe), headless Sim strikt
  getrennt vom Rendering, `@babylonjs/core`. Kein Unity/Godot/C++. Desktop
  später via Tauri/Electron. CI + GitHub-Pages-Preview.
- **2026-09-02** — Waffen-/Klassenmodell: Hybrid-Arsenal (Klassen-Kategorie +
  Nations-Vertrautheit), Minimal-Loadout, 4 Startklassen (Schütze, MG-Schütze,
  Pionier, Sanitäter), aktive Fähigkeit per In-Mission-Quest freischalten.
  Fiktionalisierte Nationen (Kaiserreich, Albion), gesichtsloser Feind.
- **2026-09-02** — Gegner-Roster v1: 5 Tag / 5 Nacht mit Konter-Karte,
  Elite-Gegner brauchen Spreng/AT.
- **2026-09-02** — **Konzept-Pivot**: von Tower-Defense zu
  **First-Person-Koop-Wave-Shooter** im WW1-Grabenkrieg. Dreistufiger Sektor
  (Frontlinie → Verbindungsgraben → Home-Line), fechtender Rückzug. Tag = feind-
  liche Armee, Nacht = Untote. Skirmish: Wellen → Zeit-Finale → Extraktion.
  Hub = Kompanie-Quartier. Alter TD-Prototyp → `prototyp-td/` archiviert.
