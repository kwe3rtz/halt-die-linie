# Halt die Linie — Status

**Stand:** 2026-09-07

Ein-Blick-Übersicht für Menschen und für frische Claude-Sessions. Kurz halten —
Historie steht in `STATUS-ARCHIV.md`, Bau-Details in `CHANGELOG.md` +
`tickets/erledigt/`.

**Neu hier?** Diese Datei ganz lesen → `KONZEPT.md` → `WORKFLOW.md` (Ablauf) →
`AUFGABEN.md` (Konventionen, aktuelles Arbeitspaket). `CHANGELOG.md` nur den
Abschnitt des laufenden + vorigen Arbeitspakets. Dokumenten-Karte in
`WORKFLOW.md`.

## Wo wir stehen

- **Konzept:** beschlossen, `KONZEPT.md` Entwurf v0.3 (§1/§3/§5/§6/§9/§10 am
  2026-09-07 neu gefasst): **eine durchgehende Frontlinie + eine Home-Line**
  statt A/B/C-Abschnitte · größeres frei begehbares WW1-Grabennetz (Feindseite
  → Niemandsland → Frontlinie → Hinterland → Home-Line) · Feind-Spawn folgt
  der vordersten gehaltenen Linie · „Instand setzen" als Rückeroberung ·
  **Nacht zuerst** (roamende Tote) · Skirmish-Rahmen vereinfacht · Generator
  später fürs ganze Netz. Das kompakte „H" mit A/B/C ist verworfen (§10).
- **Code:** AP1–AP5 auf `main` (PR #1/#4/#5/#6/#7/#8/#9). AP4 = Kern-Bogen
  (Front-Zustandsmaschine, Bresche, die Uhr, Home-Line-Finale). AP5 = Boxhead-
  Kern (Kollisions-Fix, Munitions-Depots, offene Kartengrenze, Wellen-Tuning,
  Gegner-Klassen). Zwei unabhängige Audits gemacht (`AUDIT-2026-09-04-ap4.md`,
  `AUDIT-2026-09-07-ap5.md`).
- **Arbeitspaket 6 läuft** auf Branch `arbeitspaket-6` (Worker `ki-game-e6`):
  neuer Sektor + neuer Kern-Bogen für die eine Frontlinie, Nacht.
  - **AP6-01 erledigt** (`c4d21f5`): neuer handgebauter Nacht-Sektor
    (`src/data/sektor.ts` komplett neu, 34-Knoten-Nav-Graph, Zonen als
    lückenlose Z-Bänder, genau ein `frontAbschnitt`/`homeAbschnitt` → N=1,
    `front.ts` unverändert). Nur die Bühne.
  - **AP6-02** (nächstes, `ki-game-e6`): mechanische A/B/C-Bereinigung, kein
    Verhaltenswechsel, Golden-Anker bleiben grün.
  - **AP6-02b**: Druck-Radius-Halte-Semantik + Uhr an einer Linie (Golden-
    Rebaseline nur hier).
  - **AP6-03/04/05**: Spawn-Verlagerung · „Instand setzen" · Roam-Gegner +
    Perf-Broadphase.

## Spielbar

`npm run dev`. Auf `main` (bis AP6 gemergt ist) der alte Greybox-Sektor „H"
mit A/B/C-Front + Verbindungsgraben. Auf `arbeitspaket-6` der neue **Nacht-
Sektor**: eine durchgehende Frontlinie, Niemandsland davor, Hinterland mit
zentralem Laufgraben + 2 Seitenrouten, durchgehende Home-Line; dunkel, enger
Dunst, statische Leuchtfeuer, FRONT/HOME-Schilder. Gegner folgen dem Nav-
Graphen an die Front, reißen Parapet-Breschen auf; fällt die Front, öffnet
sich der Weg ins Hinterland. Jeder Kill zermürbt die Angriffskraft
(zonengewichtet) → Zeit-Finale an der Home-Line → extrahieren (`E`) oder
verlängern (`Q`). Tasten: F3 Debug · M Lagekarte · T Ton · E/Q.
Preview (main): <https://kwe3rtz.github.io/halt-die-linie/>

## Arbeitsweise gerade

Zwei Claude-Sessions (Planer = Chat `ki-game-f1`, Worker = VS Code) im
Ticket-Loop — voller Ablauf + Kickoff-Prompts in **`WORKFLOW.md`**. GitHub
Copilot als **rein lesender** dritter (Audits, Diff-Review, Spec-Checks —
kein Schreiber im Loop). Externe LLMs (`SPARRING*.md`) für Konzept-Sparring.
Nutzer greift nur ein, wenn der Planer sich meldet.

**Token sparen:** Planer + Worker `/clear` zwischen Tickets — jeder Review ist
self-contained über STATUS + Ticketdatei + `git diff`. Worker macht `/clear`
**vor** großen Tickets (der Kickoff-Prompt sagt es an). Im Review CI vertrauen
statt alles lokal nachzustellen; `git diff --stat` vor gezielten Diffs.

## Als Nächstes

1. **`ki-game-e6` baut AP6-02** (mechanische A/B/C-Bereinigung). Spec:
   `tickets/AP6-02-eine-frontlinie-eine-homeline.md`. Golden-Anker müssen grün
   bleiben — das ist die eigentliche Sorgfalt.
2. **AP6-02b** — Druck-Radius-Halte-Semantik (Halte-Punkte je Bresche, lokaler
   Druck, Aggregation → Linie fällt als Ganzes) + „Anzahl bedrohter Zugänge"
   für die Wave-Skalierung. Golden-Anker hier bewusst neu + Stub-Gegenprobe.
3. AP6-03 (Spawn-Verlagerung, Audit H4) → AP6-04 („Instand setzen") → AP6-05
   (Roam + Perf-Broadphase, Audit H1/M5/M6).
4. Nach AP6-02 kurz anspielen (`arbeitspaket-6`): quer durch den Nacht-Sektor.
   **Merkposten aus AP6-01-Review:** klumpen sich die Wellengegner sichtbar an
   den 2 Sap-Lücken? (dann Wellenziele über `front-w/-front/-e` streuen oder
   Saps verbreitern — Sektor-Daten, billig). Voller Spieltest, wenn AP6 steht.
5. Ende AP6: PR `arbeitspaket-6` → `main`.

## Offene Fäden — nicht vergessen

- **AP7-Politur-/Perf-Ticket** aus beiden Audits (`AUFGABEN.md` AP7+):
  Perf-Broadphase (O(E²)-Separation, Pfad-Cache), `dt≤0`-Guard, `festVersuche`
  ohne Abklingen, leere Spawn-Liste als Fehler, `spawn`-Erfolg-Vertrag, zweite
  Bresche voll ins Nav-Modell, hartkodiertes Sektor-Wissen, `createSim`-Größe,
  Respawn-Punkt an der Home-Line (statt Front-Spawn mitten in der Welle).
- **Solo-Balance ab Welle 4** (AP5-Merkposten): Zahlen im Spieltest justieren.
- **Multi-Seed-Replay-Harness** mit semantischen Assertions — vor AP6-05.
- **Prozeduraler Generator** (KONZEPT §9.6): jetzt fürs *ganze* Grabennetz,
  nach AP6, wenn der handgebaute Nacht-Sektor trägt.
- **Tag-Modus / Fernkampf-KI** (KONZEPT §5): eigenes Paket nach AP6 (= AP7).
- **Nachschub-Ökonomie** (KONZEPT §9.7): eine Währung + Budgets/Slots. Offen.
- **In-Mission-Quest / aktive Fähigkeit** (KONZEPT §4): als Dauermechanik
  streichen (Sparring-Konsens). §4 bei den Klassen überarbeiten.
- **„Instand setzen"-Details** (KONZEPT §9.5 offen): Werkzeug/Dauer/Kosten/
  KI-Trupps — vor AP6-04 klären.
- **Onboarding, Quartier-Ausbau, Art-Stil, „Krieg"-Modus** (KONZEPT §9.8–9.11).
- **Bundle ~6,9 MB** — Bundle-Budget-Gate im Infrastruktur-Backlog
  (`AUFGABEN.md`). **CI-Laufzeit** ~5–7 min, im Auge behalten.

## Entscheidungs-Log (neueste zuerst · ältere in `STATUS-ARCHIV.md`)

- **2026-09-07** — **Audit vor AP6-02 + AP6-02 geteilt.** GitHub Copilot
  (rein lesend) hat (a) den AP5-Stand auf `main` auditiert
  (`AUDIT-2026-09-07-ap5.md` — AP5-Kern lokal gut getestet, Risiken an den
  Integrationsgrenzen: O(E²)-Separation, `dt≤0`, hartkodiertes Sektor-Wissen,
  `festVersuche`) und (b) die AP6-02-Spec gegengelesen. Ergebnis: AP6-02 ist
  viel größer als „Listen → Objekte", und der Druck-Radius braucht ein
  Datenmodell mit Aggregationsregel. **→ AP6-02 geteilt:** AP6-02
  (mechanische A/B/C-Bereinigung, kein Verhaltenswechsel, Golden-Anker grün) +
  AP6-02b (Druck-Radius-Semantik, Golden-Rebaseline nur hier + Stub-Gegenprobe).
  Restliche Audit-Befunde → AP6-03 (H4), AP6-05 (H1/M5/M6), AP7-Politur.
- **2026-09-07** — **AP6-01 erledigt** (`c4d21f5`, reviewed, 286 Tests, Cov
  src/sim 98,54 %). Neuer Nacht-Sektor, nur die Bühne. `parapet()`-Modul:
  eine Bresche schaltet Wand+Feuertritt+Bank zusammen ab (echtes Loch).
  Zwei Golden-Anker bewusst neu (Sim-Regeln unverändert, Gegenprobe
  Determinismus + voller Einsatz). 4 TODO(Rückfrage) → AP6-02/AP7 eingearbeitet.
- **2026-09-07** — **Konzept-Design-Runde: Arbeitspaket 6** (`KONZEPT.md` v0.3).
  Dritter Spieltest „an sich ok, aber statisch/unlebendig", A/B/C-Struktur
  nicht gewollt. Nutzer-Vision: eine Frontlinie + Home-Line, größeres freies
  WW1-Grabennetz, Spawn rückt bei Linienfall vor, Rückeroberung per „Instand
  setzen", Nacht + roamende Tote. Zwei AskUserQuestion-Runden → 5 AP6-Tickets.
- **2026-09-07** — **PR #9 gemergt** (AP5-05/06 → `main`). `arbeitspaket-6`
  von `main` gezweigt.
- **2026-09-04** — **AP5 „Boxhead-Kern" komplett** (AP5-01…06). AP5-04 war der
  größte Schritt: Ausgangsdiagnose (headless Simulator) zeigte das alte
  Angriffskraft-Budget arithmetisch erschöpft; Wave-Director neu kalibriert +
  3 latente Nav-Bugs mit Trace/Test/Gegenprobe behoben. **Lehre:** ein reines
  Zahlen-Tuning deckt zuverlässig latente Wiring-Bugs auf — Messen vor dem
  Ändern + Gegenprobe je Fix ist der Standard.
