# Halt die Linie — Status

**Stand:** 2026-09-09 (AP6-01/01b/02/06 erledigt · Spieltest + **Grill-Runde**:
die Map liest sich weiter als „Rechtecke mit Wänden" — es fehlen Tiefe,
Material, Enge. Beschluss: **Graben-Look zuerst** → **AP6-01c** (Baukasten +
Probe-Ecke) ist als Nächstes, Kickoff an den Worker raus)

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
  - **AP6-02 erledigt** (`f427ef1`): mechanische A/B/C-Bereinigung, kein
    Verhaltenswechsel — `FrontLinie` mit Rollen-Feldern statt String-Ableitung,
    N=1-Lade-Assert, `abschnittRng` raus, tote Audio-Callouts weg. Golden-Anker
    bit-identisch. 292 Tests.
  - **4. Spieltest (2026-09-08):** „geht in die richtige Richtung", aber die
    Map ist **zu abstrakt** (Box-Korridore statt Grabensystem) **und jank**
    (Löcher, an Kanten hängen); Gegner kleben an den Stufen-Rampen; die
    Repetierer-Startwaffe macht jede Welle zäh; Nacht etwas zu dunkel.
  - **AP6-06 erledigt** (`a17e734`): automatische Testwaffe (`sturmMp18`, nur
    Spielpfad), Rampen glatt (10 Stufen) + Sohle-Loch gefixt (Gegner fielen
    an der Home-Flankenrampe durch die Welt), Nacht-Licht neu abgestimmt
    (kein Washout, kein reines Schwarz). Golden-Anker bit-identisch.
  - **AP6-01b erledigt** (`e9aaeca`): Sektor als **echtes Grabensystem** neu.
    Gezähnter Feuergraben (5 Nischen + 4 Erd-Traversen + Laufgang), begehbare
    Alt-Frontlinie + 2 Sap-Köpfe im Niemandsland, 3 Verbindungsgräben (Mitte =
    Express-Laufgraben) + Stütz-/Reservegraben statt leerem Feld, gezähnte
    Home-Line mit 3 begehbaren Unterständen. Durchgehender Sohle-Auffangboden.
    ~30 % größer (x±44, z−60…92), Nav 72 Knoten. Golden-Anker neu (Uhr-Regel
    bitgleich). 303 Tests.
  - **Spieltest AP6-01b + Grill-Runde 2026-09-09:** die Map trägt *immer noch
    nicht* — funktional ein Grabensystem, liest sich aber weiter als „Rechtecke
    mit dünnen Wänden". Es fehlen **Tiefe** (man steht nicht *drin*),
    **Material** (glatte Farbe pro Zone) und **Enge** (3-m-Korridore).
    Strukturierte Design-Baum-Runde (`grilling`, 5 Runden) → **der Graben-*Look*
    ist ein eigener Brocken und kommt zuerst**, vor Gegner-KI und Kern-Bogen.
  - **AP6-01c** (**als Nächstes**, Kickoff an den Worker): Baukasten —
    Grabentiefe −2,7, Wand-Verkleidung (Holz-Pfosten + Bohlen-Kurse + Sandsack-
    Krone), `oberflaeche`-Materialfeld auf `LevelBox` + flache Material-Farben
    im Renderer, Laufrost-Boden, **echter Abstiegs-Unterstand** (Treppe hinab,
    Raum unter der Sohle — löst den AP6-01b-`unterstand()`-Rückstand) +
    **isolierte Probe-Ecke** (`?probe`-Dev-Szene). Echter Sektor unberührt,
    kein Golden-Risiko. → Nutzer-Spieltest der Probe-Ecke.
  - **AP6-01d** (nach dem Spieltest): ganzer Sektor im neuen Look +
    geschrumpfter „schlanke Front"-Grundriss (x ±32 / z ~120, 4 Front-Nischen,
    2 Breschen, Home = Bunker mit 3 echten Abstiegs-Unterständen, 3 gewundene
    Verbindungsgräben — Anzahl als Parameter, kein Stützgraben). Golden-Anker
    brechen bewusst (Uhr-Regel bitgleich).
  - **Dann:** Gegner-KI-Design-Runde (mit `SPARRING-ANTWORTEN.md` Runde 3) →
    **AP6-05** (Roam + Perf) → **AP6-02b** (Bresche → Durchbruch) → **AP6-03**
    (Spawn-Verlagerung) → **AP6-04** („Instand setzen").

## Spielbar

`npm run dev`. Auf `main` (bis AP6 gemergt ist) der alte Greybox-Sektor „H"
mit A/B/C-Front + Verbindungsgraben. Auf `arbeitspaket-6` der neue **Nacht-
Sektor** (seit AP6-01b ein echtes Grabensystem): gezähnter Feuergraben mit
Erd-Traversen + Laufgang, begehbare Alt-Frontlinie + Sap-Köpfe im Niemandsland,
3 Verbindungsgräben (Mitte = Express-Laufgraben) + Stütz-/Reservegraben,
gezähnte Home-Line mit 3 begehbaren Unterständen; Nacht, enger Dunst, statische
Leuchtfeuer, FRONT/HOME-Schilder. Start mit der automatischen Sturm-MP 18.
Gegner folgen dem Nav-Graphen an die Front, reißen Parapet-Breschen auf; fällt
die Front, öffnet sich der Weg ins Hinterland. Jeder Kill zermürbt die Angriffskraft
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

1. **AP6-01c — Graben-Look-Baukasten + Probe-Ecke** (Kickoff raus an den Worker,
   `/clear` vorher). Grabentiefe −2,7, Wand-Verkleidung als Formdetail-Geometrie
   + `oberflaeche`-Materialfeld + flache Material-Farben, Laufrost, echter
   Abstiegs-Unterstand, isolierte `?probe`-Szene. Echter Sektor unberührt →
   **kein Golden-Risiko**. Zielvorlage (Querschnitt + Maße + Palette + Plan)
   liegt im Ticket. → **Nutzer spielt die Probe-Ecke an.**
2. **AP6-01d — ganzer Sektor** im neuen Look + geschrumpfter Grundriss
   („schlanke Front", Home = Bunker, 3 gewundene Verbindungsgräben mit
   parametrisierter Anzahl, kein Stützgraben). Golden-Anker brechen bewusst
   (Uhr-Regel bitgleich, Gegenprobe wie AP6-01b). `/clear` vorher.
3. **Gegner-KI-Design-Runde** — eigene Runde wie die Grill-Runde, Input
   `SPARRING-ANTWORTEN.md` Runde 3 (wenige persistente Roam-Gruppen, 4 Zustände,
   gemeinsames Intensitäts-Budget mit dem Wave-Director). Ergebnis: aktualisierte
   **AP6-05**-Spec. **„Gegner-KI deutlich besser" (Spieltest)** fällt hierunter:
   heute laufen alle stur auf `front-front` und klumpen (auch am Laufgraben-
   Mund, AP6-06-Fund).
4. **AP6-05** (Roam + Perf-Broadphase, Audit H1/M5/M6) → **AP6-02b** (Bresche →
   Durchbruch → Linienfall + Uhr-Regel; Golden hier bewusst neu + Stub-
   Gegenprobe; Spec fertig inkl. Copilot-Härtung) → **AP6-03** (Spawn-
   Verlagerung, Audit H4) → **AP6-04** („Instand setzen").
5. Ende AP6: PR `arbeitspaket-6` → `main`.

## Offene Fäden — nicht vergessen

- **AP7-Politur-/Perf-Ticket** aus beiden Audits (`AUFGABEN.md` AP7+):
  Perf-Broadphase (O(E²)-Separation, Pfad-Cache), `dt≤0`-Guard, `festVersuche`
  ohne Abklingen, leere Spawn-Liste als Fehler, `spawn`-Erfolg-Vertrag, zweite
  Bresche voll ins Nav-Modell, hartkodiertes Sektor-Wissen, `createSim`-Größe,
  Respawn-Punkt an der Home-Line (statt Front-Spawn mitten in der Welle),
  **`FALL_LIMIT` auch für Gegner** (AP6-06-Fund).
- **Solo-Balance ab Welle 4** (AP5-Merkposten): Zahlen im Spieltest justieren.
- **Multi-Seed-Replay-Harness** mit semantischen Assertions — vor AP6-05.
- **Variable Verbindungsgraben-Anzahl** (`BACKLOG.md` → „Sektor & Generator"):
  ab AP6-01d ist die Anzahl ein Parameter (`VG_ANZAHL`, fest 3). Der Schalter
  — Variante 1 Seed-abgeleitet, Variante 2 je Schwierigkeitsgrad — plus ein
  **Schwierigkeits-System** (existiert nicht) sind Backlog, Entscheid am
  Generator bzw. Schwierigkeits-System.
- **Perf: Verkleidungs-Box-Zahl** — AP6-01c/d vervielfachen die Level-Boxen
  (Formdetail). AP6-01c misst die Probe-Szene, AP6-01d ggf. Merge je Material
  im Renderer. Im Auge behalten.
- **Prozeduraler Generator** (KONZEPT §9.6): jetzt fürs *ganze* Grabennetz,
  nach AP6, wenn der handgebaute Nacht-Sektor trägt. Nutzt denselben
  Modul-Baukasten (inkl. Verkleidung ab AP6-01c).
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

- **2026-09-09** — **Grill-Runde: Graben-Look zuerst.** Spieltest des AP6-01b-
  Sektors + strukturierte Design-Baum-Runde (`grilling`-Skill, 5 Runden, mit
  Nutzer-Referenzbildern WW1-Grabenfoto + historische Schnitt-Karte). Kern:
  zwei fehlgeschlagene Greybox-Neubauten (AP6-01, AP6-01b) — ein *funktional*
  korrekter Sektor trägt nicht, wenn er die Fiktion räumlich nicht
  kommuniziert. Es fehlen **Tiefe** (man steht nicht *drin*), **Material**
  (glatte Farbe pro Zone), **Enge** (3-m-Korridore). **Beschlüsse:** (1) Der
  Graben-*Look* ist ein eigener Brocken und kommt **zuerst** — vor Gegner-KI,
  vor dem Kern-Bogen. **AP6-01c** (Baukasten: Tiefe −2,7, Wand-Verkleidung als
  Formdetail-Geometrie, `oberflaeche`-Materialfeld + flache Farben, Laufrost,
  echter Abstiegs-Unterstand; + isolierte `?probe`-Szene) → Nutzer-Spieltest →
  **AP6-01d** (ganzer Sektor + geschrumpfter „schlanke Front"-Grundriss
  x ±32 / z ~120; Front 4 Nischen + 2 Breschen + Depot + Parados; Home = Bunker
  mit 3 echten Abstiegs-Unterständen; 3 gewundene Verbindungsgräben, Anzahl als
  Parameter; **kein** Stützgraben). (2) Material = **flache Farben + Formdetail,
  keine Texturen** (die später, §9.10). (3) Abstimm-Prozess: Planer-Zielvorlage
  → Nutzer ok → Worker-Probe-Ecke → Nutzer ok → ganzer Sektor. (4) Reihenfolge
  danach: **Gegner-KI-Design-Runde** (mit `SPARRING-ANTWORTEN.md` Runde 3) →
  **AP6-05** (Roam + Perf) → **AP6-02b** → AP6-03 → AP6-04. (5) Breite-zuerst-
  Strategie bleibt — der Graben-Look-Pass ist die *eine* bewusste Ausnahme; das
  5-Minuten-Gefühl bleibt bis ~AP6-05 flach, akzeptiert. (6) Variable
  Verbindungsgraben-Anzahl (Seed- **oder** Schwierigkeits-gesteuert) + ein
  Schwierigkeits-System → `BACKLOG.md`. AP6-01b-Rückstand `unterstand()` wird
  in AP6-01c gelöst. Doku: `KONZEPT.md` §3 (neuer Abschnitt „Der Graben-Look")
  + §9.10, `AUFGABEN.md`, `BACKLOG.md`, Tickets `AP6-01c`/`AP6-01d`.

- **2026-09-08** — **AP6-01b erledigt** (`e9aaeca`, reviewed, 303 Tests, CI
  grün). Sektor als echtes WW1-Grabensystem neu: gezähnter Feuergraben (5
  Nischen + 4 Erd-Traversen + Laufgang), begehbare Alt-Frontlinie + 2 Sap-Köpfe,
  3 Verbindungsgräben (Mitte = Express-Laufgraben) + Stütz-/Reservegraben statt
  leerem Feld, gezähnte Home-Line + 3 begehbare Unterstände, durchgehender
  Sohle-Auffangboden, ~30 % größer (x±44, z−60…92), Nav 72 Knoten. Neue Module
  `traverse`/`sap`/`geschuetzstellung`. `PARAPET_OBERKANTE` 0,55→0,62 (Krone
  nicht mehr begehbar). Golden-Anker neu baseliniert — **Uhr-Regel bitgleich**
  (148/149), Gegenprobe Determinismus + Seed 1/2/7 gewonnen 0 Despawns.
  **Offen an den Nutzer:** `unterstand()` = flacher Fallback statt „Raum unter
  Flur" (Worker: Sohle-Auffangplatte nicht durchbrechen = Jank-Risiko) →
  eigenes Ticket oder Art-Pass? Und: Nacht-Helligkeit auf echter GPU prüfen
  (Headless-Screenshots dunkel = Swiftshader).
- **2026-09-08** — **AP6-06 erledigt** (`a17e734`, reviewed, 303 Tests).
  Automatische Testwaffe (`sturmMp18`, nur Spielpfad — `standardWaffe` +
  Golden-Anker unberührt) · Rampen glatt (4→10 Stufen) · dabei ein echter Bug
  gefunden: die Home-Grabensohle war x ±32, die Flankenrampen x ±31 reichen
  bis x ±33,5 → Gegner-Kapseln fielen an der Kante durch die Welt (kein
  `FALL_LIMIT` für Gegner) → Sohle auf volle Breite. Nacht-Licht neu: kein
  Washout mehr (PointLight 14→2,4), kein reines Schwarz (Hemispheric
  0,34→0,9). Golden-Anker bit-identisch (voller Präzisionsvergleich).
- **2026-09-08** — **4. Spieltest → Map wird neu gebaut.** Nacht-Sektor
  (AP6-01/02) auf `arbeitspaket-6` angespielt: Richtung stimmt, aber die Map
  ist **zu abstrakt** (gerade Box-Korridore + leere Flächen, liest sich nicht
  als Grabensystem) **und jank** (Löcher, Hängenbleiben). Weiter: Gegner
  kleben an den Stufen-Rampen, Repetierer-Startwaffe macht Wellen zäh, Nacht
  zu dunkel. **Beschlüsse** (AskUserQuestion): (1) Map „richtig neu bauen" als
  echtes Grabensystem, noch Greybox → **AP6-01b** (Design-Runde läuft).
  (2) Zuerst ein schnelles Reibungs-Ticket **AP6-06** (autom. Testwaffe,
  glatte Rampen, Nacht heller), damit das nächste Anspielen taugt. (3)
  **AP6-02b pausiert**, bis der neue Sektor steht. Grafik/Punkte/Upgrades/
  Fähigkeiten bleiben Zukunftsmusik (KONZEPT §4/§7/§8/§9.10). **AP6-01b-Layout
  (2. AskUserQuestion):** gezähnter Feuergraben + Home-Line (Nischen +
  Traversen), Hinterland lockerer · echte Unterstände (Raum unter Flur,
  Treppe hinab) · Sektor ~30 % größer.
- **2026-09-08** — **Design-Runde nach Sparring Runde 3 (AP6-Kern).** Drei
  externe KIs deckungsgleich: der binäre „ganze Linie fällt bei Drucksumme X"
  ist der Hauptfehler (unfair/unlesbar für Solo). **Beschlüsse:** (1) Frontfall
  als sichtbare Kette **Bresche → Durchbruch → Fall** (lokaler Druck öffnet
  eine Bresche = Krise; Gegner müssen physisch durch und einen Fleck hinter
  der Linie halten → „DURCHBRUCH" mit letzter Reaktionschance → dann Fall).
  AP6-02b darauf umgeschrieben (`tickets/AP6-02b-bresche-durchbruch-*.md`).
  (2) **Frontfall = gefährlicher, nicht schneller** — ChatGPT + Gemini
  flaggten unabhängig einen Speedrun-Exploit in „Uhr läuft schneller".
  KONZEPT §3/§6 entsprechend geschärft (v0.3, Stand 8. Sept). (3) „Instand
  setzen" (§9.5) + Roam-Details später — eigene Design-Runde direkt vor
  AP6-04, mit dem Sparring-Input (`SPARRING-ANTWORTEN.md` Runde 3 +
  Konvergenz-Analyse).
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
