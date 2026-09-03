# Halt die Linie — Status

**Stand:** 2026-09-03

Ein-Blick-Übersicht für Menschen und für frische Claude-Sessions.

**Neu hier?** Diese Datei ganz lesen → `KONZEPT.md` → für den Bau-Stand
`CHANGELOG.md` + `tickets/` (+ `tickets/erledigt/`) → `WORKFLOW.md` für den
Ablauf, `AUFGABEN.md` für die Konventionen. Dokumenten-Karte in `WORKFLOW.md`.

## Wo wir stehen

- **Konzept:** vollständig beschlossen. Nicht mehr im Fluss.
- **Code:** Arbeitspaket 1 (Fundament) fertig, auf `main` gemergt (PR #1).
  Arbeitspaket 2 (erster Kampf-Loop) läuft auf Branch `arbeitspaket-2`.
- **AP2-Fortschritt:** AP2-01…AP2-04 ✅ (Waffen, Spieler-HP, Linieninfanterie,
  Wave-Director). **AP2-05 (Nachschub-Zähler + HUD) ist das letzte AP2-Ticket.**
  Details: `CHANGELOG.md` + `tickets/erledigt/`.

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

1. AP2 fertigbauen (AP2-02 Spieler-HP → AP2-03 Linieninfanterie → AP2-04
   Wave-Director → AP2-05 Nachschub + HUD).
2. Nutzer spielt AP2, gibt Feedback.
3. **Design-Runde: prozedurale Sektor-Erzeugung** — braucht Nutzer-Input.
4. Arbeitspaket 3.

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

- **2026-09-03** — Doku-System aufgesetzt gegen Kontextverlust: `STATUS.md`
  (dies), `CHANGELOG.md`, `WORKFLOW.md` (inkl. Onboarding-Prompts für frische
  Planer- **und** Worker-Sessions), `tickets/erledigt/` (Audit-Trail: Spec +
  Worker-Bericht + Review je Ticket).
- **2026-09-03** — AP1 → `main` gemergt (PR #1). AP2 auf Branch `arbeitspaket-2`,
  Ticket-Ordner `tickets/`. AP2-01 (Waffen), AP2-02 (Spieler-HP), AP2-03
  (Linieninfanterie), AP2-04 (Wave-Director) fertig, je reviewed.
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
