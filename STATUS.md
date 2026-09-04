# Halt die Linie — Status

**Stand:** 2026-09-03

Ein-Blick-Übersicht für Menschen und für frische Claude-Sessions.

**Neu hier?** Diese Datei ganz lesen → `KONZEPT.md` → für den Bau-Stand
`CHANGELOG.md` + `tickets/` (+ `tickets/erledigt/`) → `WORKFLOW.md` für den
Ablauf, `AUFGABEN.md` für die Konventionen. Dokumenten-Karte in `WORKFLOW.md`.

## Wo wir stehen

- **Konzept:** beschlossen. §3 (Sektor) am 2026-09-03 aus der Map-Design-Runde
  neu gefasst — H-Grundriss, offenes Feld statt hartem Korridor, „die Uhr",
  Generator später.
- **Code:** AP1–AP4 auf `main` (PR #1, #4, #5, #6). Nutzer hat AP4 gespielt;
  **unabhängiger Audit** (`AUDIT-2026-09-04-ap4.md`, Session `ki-game-c2`) fand
  danach 4 reproduzierte Gameplay-Bugs in der Verdrahtung zwischen den
  AP4-Maschinen (Bresche öffnet Kollision nicht → Gegner stecken vor der Wand;
  kein Stuck-Fallback; Tick-Reihenfolge Wave/Einsatz; „gewonnen" nicht
  abschließbar).
- **Als Nächstes:** **AP4-06 „Kern-Bogen-Fixes"** spezifiziert und an
  `ki-game-c2` übergeben (Branch `fix/ap4-06-kern-bogen`) — kommt vor AP5, weil
  der Kern-Bogen sonst nicht sauber durchspielbar ist.
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

1. **AP4-06 „Kern-Bogen-Fixes"** (`tickets/AP4-06-kern-bogen-fixes.md`) — bei
   `ki-game-c2`, Branch `fix/ap4-06-kern-bogen` von `main`. Behebt die 4
   Audit-Bugs (Bresche/Kollision, Stuck-Fallback, Tick-Reihenfolge Wave/
   Einsatz, „gewonnen" nicht abschließbar) + führt einen Graph-Begehbarkeits-
   Test ein (Pflicht vor dem Generator). Reviewe ich wie jedes Ticket.
2. **Danach: zweiter Spieltest** des Kern-Bogens (jetzt erst aussagekräftig,
   weil der Einsatz vorher solo nicht sauber zu Ende ging). F3 auf dem Mac:
   `fn+F3` oder Systemeinstellungen → Tastatur → Standard-Funktionstasten;
   sonst Tasten wie gehabt: **F3** Debug · **M** Lagekarte · **T** Ton.
   Restliche Checkliste (Zonen, Feuertritt-Marge, Sap-Lücken, Balance-Zahlen,
   Kompass-Überlappung) weiter gültig. **Kernfrage:** trägt „Front halten →
   Abschnitt verlieren → zurückfallen → Home-Line halten" als Spielgefühl?
3. Danach: ein Politur-Ticket aus den Audit-Medium-Befunden (priorisieren mit
   dem Nutzer), dann „Zwei Kampfsprachen" (Tag-Fernkampf + Nacht), dann der
   prozedurale Generator fürs vordere Labyrinth (`AUFGABEN.md` „Arbeitspaket
   5+").

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
