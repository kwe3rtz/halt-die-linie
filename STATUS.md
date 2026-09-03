# Halt die Linie — Status

**Stand:** 2026-09-03

Ein-Blick-Übersicht für Menschen und für frische Claude-Sessions.

**Neu hier?** Diese Datei ganz lesen → `KONZEPT.md` → für den Bau-Stand
`CHANGELOG.md` + `tickets/` (+ `tickets/erledigt/`) → `WORKFLOW.md` für den
Ablauf, `AUFGABEN.md` für die Konventionen. Dokumenten-Karte in `WORKFLOW.md`.

## Wo wir stehen

- **Konzept:** vollständig beschlossen. Nicht mehr im Fluss.
- **Code:** AP1 + AP2 auf `main` (PR #1, #4). **AP3 „Basis solide machen"
  komplett** (5 Fix-Tickets, alle reviewed) — **PR #5 offen, wartet auf Merge.**
- **Als Nächstes:** Design-Runde „Map / prozeduraler Sektor" (Nutzer + Planer),
  daraus AP4.
- Details zum Gebauten: `CHANGELOG.md` + `tickets/erledigt/`.

## Spielbar

`npm run dev` → in First Person durch einen Boxen-Test-Graben laufen, schießen
(Langgewehr M98, Hitscan). Nach ~3 s Aufbau starten **Wellen** aus der
Parapet-Lücke — Linieninfanterie marschiert an, schlägt im Nahkampf zu, Kills
geben Nachschub; Wellen werden größer, bis die endliche Angriffskraft leer ist.
Debug-Overlay per F3. Preview: <https://kwe3rtz.github.io/halt-die-linie/>

## Arbeitsweise gerade

Zwei Claude-Sessions (Planer = Chat, Worker = VS Code) im Ticket-Loop — voller
Ablauf in **`WORKFLOW.md`**. Kurz: Worker baut ein Ticket, committet, pusht,
meldet sich; Planer reviewt (Checks + CI + Code), archiviert nach
`tickets/erledigt/`, pflegt `CHANGELOG.md` + `STATUS.md`, gibt grünes Licht.
Nutzer greift nur ein, wenn der Planer sich meldet. Modell/Effort pro Ticket
angesagt.

## Als Nächstes

1. Nutzer: PR #5 (`arbeitspaket-3` → `main`) reviewen + mergen, AP3 kurz
   nachspielen (v. a. HP-Balken-Teilfüllung aus schrägem Winkel, siehe unten).
2. **Design-Runde „Map / prozeduraler Sektor"** — der Nutzer hat einen Plan im
   Kopf, will ihn schildern. Am besten frische Planer-Session; die 8
   Leitfragen stehen unten. → daraus AP4.
3. **Design-Runde „Gegner-Roster-Ausbau"** — Charger, Anschleicher, Fernkampf …
4. Danach: Rückzugslogik, Klassen, Nachschub-Ökonomie, Quartier.

### Leitfragen für die Map-Design-Runde

1. Immer derselbe handgebaute Sektor (der sich „entwickelt") oder jeder Einsatz
   neu? (Konzept sagt bisher „prozedural".)
2. Die drei Ebenen — Abstand, Größe je, Anzahl Frontabschnitte?
3. Niemandsland — Tiefe, Inhalt (Trichter, Draht, Gefallene)?
4. Woher kommt der Feind — feste Ausstiegspunkte / ganze Gegnerlinie / aus dem
   Boden (Nacht)?
5. Vertikalität — Graben unter Bodenniveau, Feuertritt, Unterstände,
   Parapet-Höhe?
6. Flanken — wie dicht gesperrt, wie „Korridor"?
7. Maßstab — Laufzeit Front → Home-Line?
8. Lesbarkeit — Minikarte/Kompass ja/nein, oder nur Landmarken + Grabenschilder?

**Externes KI-Sparring:** `SPARRING.md` (aktuelle Fassung, **v2 — Map-Straw-Man**,
2026-09-03, Antworten ausstehend) · `SPARRING-LOG.md` (Chronik) ·
`SPARRING-ANTWORTEN.md` (Antworten v1 + Konvergenz-Analyse).

## Spieltest-Feedback (2026-09-03, AP2)

- **Bugs → AP3, alle behoben** (Fadenkreuz, Tracer/Mündungsblitz, Viewmodel in
  Wänden, HP-Balken je Winkel, Gegner-Stacking). PR #5.
- **Map stimmt noch nicht** — kein Beinbruch, wird in der Map-Design-Runde
  geklärt (Nutzer hat einen konkreten Plan).
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

- **Prozedurale Sektor-Erzeugung** (KONZEPT §9.5): vollprozedural vs.
  handgebaute Grabenstücke zusammensetzen; Biome/Abwechslung; Lesbarkeit in
  First Person (Schilder, Kompass, Minikarte). Noch nicht entschieden.
- **Nachschub-Ökonomie** (KONZEPT §9.6): eine oder zwei Währungen, Verdienst-/
  Kosten-Zahlen.
- **Onboarding, Quartier-Ausbau, Art-/Render-Stil in 3D, „Krieg"-Modus**
  (KONZEPT §9.7–9.10) — offen.
- **Kamera-Pitch-Vorzeichen** beim manuellen Spielen gegenchecken
  (`src/ARCHITEKTUR.md` → Offene Rückfragen).
- **Golden-/Replay-Test** fürs Sim noch nicht etabliert (`AUFGABEN.md`
  Konventionen) — `math.ts` hängt bei 63 % Coverage. In AP2-05 / am AP2-Ende
  nachziehen.
- **Bundle 6,8 MB** — Bundle-Budget-Gate im Infrastruktur-Backlog.
- Weiteres siehe `AUFGABEN.md` → „Infrastruktur-Backlog".

## Entscheidungs-Log (neueste zuerst)

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
  Viewmodel-Wandkollision, HP-Balken-Fix, Gegner-Separation. PR #5 offen.
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
