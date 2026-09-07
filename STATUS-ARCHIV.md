# Halt die Linie — Status-Archiv

Ausgelagert aus `STATUS.md`, damit frische Sessions die Kurzfassung schnell
lesen. Hier: alte Spieltest-Feedbacks, abgeschlossene Design-Runden, ältere
Entscheidungs-Log-Einträge. Bei Bedarf nachschlagen, nicht standardmäßig lesen.

## Spieltest-Feedback (2026-09-04, AP5-Anlass)

Zweiter Spieltest, nach AP4-06. Finale technisch sauber erreicht (E =
extrahieren → „gewonnen"). Inhaltliches Feedback:

- **Teleport-Bug** im zentralen Verbindungsgraben → AP5-01 (behoben).
- **Munition:** nur eine Waffe, Reserve nur durch Sterben → AP5-02 (behoben).
- **Karte** wirkt wie eine geschlossene Box → AP5-03 (behoben).
- **Gegner/Wellen:** zu wenige/dumme Gegner, keine Eskalation → AP5-04 (Tuning).
- Nutzer kannte die Begriffe „Bresche"/„Loch" nicht — Onboarding/HUD-Merkposten.
- **Nutzer-Entscheidung:** erst den Boxhead-Kern-Loop reparieren, dann wieder
  ans Graben-Konzept.

## Spieltest-Feedback (2026-09-03, AP2)

- **Bugs → AP3, alle behoben** (Fadenkreuz, Tracer/Mündungsblitz, Viewmodel in
  Wänden, HP-Balken je Winkel, Gegner-Stacking). PR #5 gemergt.
- **Map stimmt noch nicht** — Map-Design-Runde durch, AP4 baute den Sektor.
- **Erinnerung (kein Bug):** Gegner bewusst noch langsam/eintönig. Roster-
  Ausbau als eigenes Paket (`BACKLOG.md` → Gegner).
- Positiv: Pitch-Richtung stimmt, Wellen-Tempo ok.

### Beim nächsten Spieltest gegenchecken (AP3, noch offen aus 2026-09-03)

- **AP3-04:** Gegner anschießen + umlaufen → HP-Balken-Teilfüllung bleibt aus
  jedem Winkel linksbündig (headless konnte nur volle Balken zeigen).
- **AP3-05:** Gegner-Pulk verteilt sich, keiner clippt in die Kamera.
- **AP3-02:** kein „heller Strich quer über den Bildschirm" mehr beim Feuern.

## Map-Design-Runde — Ergebnis (2026-09-03) — ÜBERHOLT durch die Design-Runde 2026-09-07

Grundriss war = **H**: durchgehende Frontlinie (Abschnitte A/B/C), zentraler
Verbindungsgraben, durchgehende Home-Line, dazwischen offenes Trichterfeld,
Feind durch ein vorderes Grabenlabyrinth, Front-Anreiz über „die Uhr". Am
2026-09-07 ersetzt durch: eine durchgehende Frontlinie, größeres verzweigtes
Grabennetz, Nacht. `KONZEPT.md` §10 „Verworfen".

## AP4-Balance-Platzhalter (Stand AP4, teils überholt)

Im Spieltest zu justieren waren: Zermürbung je Zone, Finale-/Verlängern-
Countdown, Reservewellen-Kurve, `T/T2/T3` + Druck-Schwelle (`front.ts`),
`HOME_BRESCHE_FAKTOR`, Sektor-Maße. Spine-Polylinien sind seit AP5-05 raus.
AP6-01 hat die Sektor-Maße + Zonen neu gesetzt. Kompass-Marker-Überlappung
weiter beobachten.

## Entscheidungs-Log — ältere Einträge (neueste zuerst)

- **2026-09-07** — **Nachzügler AP5-05/06 komplett** (296 Tests). Nach dem
  AP5-Merge kurz angespielt: die AP4-05-„Leit-Spines" wirkten wie „Stricke" →
  **AP5-05** entfernt ihre komplette Sichtbarkeit (Datenmodell bleibt).
  **AP5-06** = drei Gegner-Klassen (normal/schnell-schwach/langsam-stark,
  reine Statistik-Varianten, farblich unterscheidbar), gewichtet gemischt
  (60/20/20) über den bestehenden Wave-Director-Rng. HP-Werte gegen den echten
  Waffenschaden korrigiert. Golden-Anker mit Stub-Gegenprobe neu.
- **2026-09-04** — **Pivot: Arbeitspaket 5 „Boxhead-Kern".** Zweiter Spieltest:
  Kern-Bogen bugfrei, trägt aber als Gefühl nicht. Nutzer-Entscheidung: erst
  den Moment-zu-Moment-Loop für sich stehen lassen (Vorbild Boxhead), dann
  weiter am Graben-Konzept. AP4-System bleibt (kein Rückbau). Bisheriges
  „Arbeitspaket 5" (zwei Kampfsprachen) → „Arbeitspaket 6+".
- **2026-09-04** — **AP4-06 „Kern-Bogen-Fixes" komplett** (`7688452`, 232
  Tests). Aus dem Audit `AUDIT-2026-09-04-ap4.md`: 4 Verdrahtungs-Bugs
  zwischen den AP4-Maschinen. H1 Bresche = physisches Loch (schaltbare
  Kollider); H2 dreistufiger Stuck-Watchdog + Engstellen-Flag; H3 Wave-Director
  geht bei erschöpfter Angriffskraft zuerst auf `reserve`; H4 `E`/`Q` als echte
  `InputCommand`s, `gewonnen` gegen Home-Verlust geschützt. Neuer Graph-
  Begehbarkeits-Test (fand dabei 3 echte Nav-Datenfehler).
- **2026-09-04** — **Unabhängiger Audit nach AP4-Merge** (`ki-game-c2`, Firmen-
  Account, voller Kontext): Architektur/goldene Regel sauber, 4 reproduzierte
  Gameplay-Bugs in der Verdrahtung. → AP4-06 vor AP5 eingeschoben. Medium-/
  Low-Befunde zurückgestellt (jetzt Teil des AP7-Politur-Tickets).
- **2026-09-04** — **AP4 „Verteidigung in der Tiefe" komplett** (AP4-01…05,
  212 Tests): Greybox-Sektor „H", semantischer Nav-Graph (kein NavMesh),
  Frontabschnitts-Zustandsmaschine, die Uhr + Home-Line-Finale, Lesbarkeit
  (Zonensilhouetten, Kompass, Lagekarte, direktionales Audio). PR #6.
- **2026-09-03** — **Map-Design-Runde abgeschlossen + AP4 spezifiziert.**
  Grundriss = H, offenes Feld statt hartem Korridor, Feind durch vorderes
  Grabenlabyrinth, Front-Anreiz über „die Uhr". (Am 2026-09-07 verworfen.)
- **2026-09-03** — Map-Design-Runde als **Straw-Man** an die externen KIs
  (`SPARRING.md` v2). Antworten → `SPARRING-ANTWORTEN.md`.
- **2026-09-03** — **Doku-System aufgesetzt** gegen Kontextverlust: `STATUS.md`,
  `CHANGELOG.md`, `WORKFLOW.md` (inkl. Kickoff-Prompts), `tickets/erledigt/`.
- **2026-09-03** — **AP3 „Basis solide machen" komplett** (AP3-01…05, 100
  Tests): Fadenkreuz+Hitmarker, Tracer/Mündungsblitz-Fix, Viewmodel-
  Wandkollision, HP-Balken-Fix, Gegner-Separation. PR #5.
- **2026-09-03** — Erster Spieltest (AP2). Feedback → AP3 vorgezogen.
- **2026-09-03** — **Arbeitspaket 2 komplett** (AP2-01…05, 95 Tests): Waffen-
  Feuerlogik, Spieler-HP/Tod/Respawn, Linieninfanterie, Wave-Director, HUD,
  Golden-Replay-Test. PR #4.
- **2026-09-03** — AP1 → `main` (PR #1). AP2 auf Branch `arbeitspaket-2`.
- **2026-09-02** — Tech festgezurrt: TypeScript + Vite + Babylon.js, 3D + First
  Person ab Tag eins, headless Sim strikt getrennt vom Rendering. Kein Unity/
  Godot/C++. Desktop später via Tauri/Electron. CI + GitHub-Pages-Preview.
- **2026-09-02** — Waffen-/Klassenmodell: Hybrid-Arsenal (Klassen-Kategorie +
  Nations-Vertrautheit), Minimal-Loadout, 4 Startklassen (Schütze, MG-Schütze,
  Pionier, Sanitäter), aktive Fähigkeit per In-Mission-Quest.
- **2026-09-02** — Gegner-Roster v1: 5 Tag / 5 Nacht mit Konter-Karte,
  Elite-Gegner brauchen Spreng/AT.
- **2026-09-02** — **Konzept-Pivot**: von Tower-Defense zu First-Person-Koop-
  Wave-Shooter im WW1-Grabenkrieg. Alter TD-Prototyp → `prototyp-td/` archiviert.
