# AP6-01d — Graben-Look: ganzer Sektor + geschrumpfter Grundriss

**Status:** offen — **erst nach Nutzer-Spieltest + grünem Licht für die
AP6-01c-Probe-Ecke.** Kickoff schreibt der Planer dann.
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**`/clear` vor dem Start:** ja (großer Brocken, Golden-Anker, ganzer Sektor).

**Referenz:** `tickets/erledigt/AP6-01c-graben-look-baukasten.md` (die **Zielvorlage**
dort ist verbindlich — Querschnitt, Verkleidung, Materialien, Abstiegs-Unterstand,
Grundriss-Skizze), `tickets/erledigt/AP6-01b-sektor-neubau-grabensystem.md`
(der Sektor, der ersetzt wird — Nav-Disziplin + Jank-Pass + Golden-Rebaseline-
Muster), `KONZEPT.md` §3, `src/data/sektor.ts`, `src/data/module.ts`,
`src/sim/navgraph-begehbarkeit.test.ts`, `src/sim/sim.test.ts` (Golden-Anker).

---

## Warum

AP6-01c hat den Baukasten (Tiefe, Verkleidung, Material, Laufrost, echter
Abstiegs-Unterstand) gebaut und an einer isolierten `?probe`-Szene belegt (Code
`41635d9`, reviewed). Dieses Ticket **baut den ganzen Sektor damit neu** — im
neuen Look **und** im geschrumpften, „schlanke Front"-Grundriss aus der Grill-
Runde 2026-09-09. Der Kickoff kommt erst, wenn der Nutzer die Probe-Ecke
angespielt und den Look abgenommen hat (ggf. mit Zielvorlage-Korrekturen).

## Auftrag — der ganze Sektor

### 1. Baukasten global schalten (`src/data/module.ts`)

Der Look-Baukasten steht schon (AP6-01c, `module.ts` Abschnitt „Graben-Look").
Hier: die lokalen `*_TIEF`-Kennwerte + Helfer global in die vom Sektor genutzten
Module ziehen und die alten Werte ersetzen.

- `GRABEN_SOHLE` → **−2,7** (`SOHLE_TIEF` aus AP6-01c — im Probe-Bau bestätigt).
- `PARAPET_OBERKANTE`: Erd-Brustwehr **0,58** (`BRUSTWEHR_TIEF`) + Sandsack-Krone
  **0,70** (`PARAPET_KRONE_TIEF`). **Zeigt der Probe-Spieltest eine kletternde
  Kapsel an der Brustwehr → `BRUSTWEHR_TIEF` auf ≥ 0,62 heben** (STEP_HEIGHT-
  Marge ist bei 0,58 nur 0,08).
- `FEUERTRITT_OBERKANTE` → **−0,90** (`FEUERTRITT_TIEF`), **4 Stufen** à 0,45.
- `PARADOS`-Krone → **0,30** (`PARADOS_KRONE_TIEF`).
- `verkleidung()` / `sandsackKrone()` / `laufrost()` in `grabengerade` /
  `parapet` / die Nischen-Komposita einziehen — **jede** Grabenwand verkleidet.
  `laufrost` **ohne** Querstege-Kollider (nur Render-Detail, AP6-01c-Fund).
- `unterstand()` → auf `abstiegUnterstand()` umstellen (echter Abstieg steht
  schon, nur noch nicht im Sektor verdrahtet — das ist der AP6-01b-Rückstand).
  Die 3 Home-Unterstände brauchen je eine `abstiegUnterstandLoch()`-Aussparung
  im Sohle-Auffangboden.
- Nav-`IN_GRABEN` / Spawn-Y / Rampen folgen der neuen Sohle (−2,7).

### 2. Geschrumpfter Grundriss (`src/data/sektor.ts` — Neubau)

**Footprint:** x ±32 · z −48 … 72 (Tiefe ~120, Breite ~64) — von x ±44 /
z −60…92 herunter (~27 % kleiner). Zonen bleiben lückenlose Z-Bänder über die
volle Breite.

- **Feuergraben (Front, z ~14…26)** — **schlank**: 4 Feuernischen + 3 Erd-
  Traversen + Laufgang dahinter. Feuertritt + Brustwehr durchgehend.
  **2 Bresche-Punkte**, Landmark-benannt: „Panzerwrack" (West-Nische, reines
  Loch, kein Nav-Knoten — wie AP6-01b) + „Pumpenstand" (Mitte-Ost, Nav-Knoten
  `bresche-front`). **Nachschub-Depot** im Laufgang. **Parados** mit den
  3 Verbindungsgraben-Mündungen. **Keine** MG-Stände, **keine** Wandkammern
  (Backlog).
- **Home-Line (z ~−34…−48)** — **der Bunker**: tiefer + schwerer verbaut
  (`beton`-Material an den Hauptwänden), 3 Feuernischen + 2 Traversen,
  Feuertritt + Brustwehr. **3 echte Abstiegs-Unterstände** an der Rückwand
  (`unterstand()` aus AP6-01c): **Munitionslager · Verbandsplatz ·
  Feldkommandeur-Bunker** (Finale-Fixpunkt). Home-Depot. Enger als die Front.
  Unterstände **nicht im Nav-Graph**.
- **3 Verbindungsgräben** Front↔Home, **gewunden** (kurze Dog-Legs aus
  `grabenknick`, 2–3 Knicke je Graben) — **Ausnahme Mitte**: der Express-
  Laufgraben bleibt gerade (schneller Runback + AP5-01-Gegenprobe in
  `collision-verbindungsgraben.test.ts` braucht die lange gerade Wand).
- **Anzahl Verbindungsgräben = Parameter.** `const VG_ANZAHL = 3` +
  Layout-Schleife, sodass 1/2/3 eine Ein-Zeilen-Änderung ist. Der echte
  Schalter (Seed- oder Schwierigkeits-gesteuert) ist **Backlog** — hier nur
  das Datenmodell parametrisieren, **fest 3 bauen**. `frontLinie.hintenKanten`
  / Parados-Mündungen / Nav aus `VG_ANZAHL` ableiten.
- **Kein Stützgraben, kein Reservegraben.** Das Hinterland zwischen den
  Verbindungsgräben = Geländeinseln mit Deckung (Geschützstellungen, Ruinen)
  + offene Flanken-Felder außen (Feind steigt dort ein).
- **Niemandsland** (~30 m Tiefe) — Trichter, Draht, quer laufende begehbare
  Alt-Frontlinie, 1–2 Sap-Köpfe. Wie AP6-01b, an den kleineren Footprint
  angepasst.
- **Feindseite** — Kulisse, wie AP6-01b (eine zusammenhängende Bodenmasse).
- **Durchgehender Sohle-Auffangboden** bleibt — mit lokalen Aussparungen unter
  den 3 Home-Unterständen (abgedichtet durch deren Bodenplatten, Zielvorlage §4).

### 3. Nav-Graph

Neu, ~55–70 Knoten (schlankere Front, kleinerer Footprint, gleiche Netz-
Struktur). Jede Nische = Knoten, jeder Traversen-Durchgang = `engstelle`, jeder
Verbindungsgraben = Knotenkette, Home-Unterstände **nicht** im Graph. Nav-Wissen
in den Rollen-Feldern von `SektorMeta` (AP6-02), nicht in `index.ts`.
`navgraph-begehbarkeit.test.ts` auf den neuen Graphen (Ist + „alles offen" +
Bresche-Gegenprobe).

### 4. Golden-Anker

„Sektor-Nav-Graph" + „die Uhr" brechen (neuer Sektor + tiefere Sohle). **Bewusst
neu baselinieren** mit Begründung direkt am `expect()` + Gegenprobe — **exakt
die AP6-01b-Disziplin**:
- Determinismus-Doppellauf (`replay() toEqual replay()`).
- Voller Headless-Einsatz Seed 1/2/7 → „gewonnen", 0 Despawns, Wellenkurve
  im Bericht.
- Uhr-Kill-Probe: die `angriffskraftRest`-Werte (−2 stehende Front / −1
  gefallene Front) **müssen bitgleich bleiben** — die Uhr-*Regel* ändert sich
  nicht, nur Positionen. Bricht ein `ak`-Wert → Fehler, beim Planer melden.
- Inline-Testlevel-Anker (eigene `LevelData`) **unberührt**.

### 5. Perf — Merge je Material ist Pflicht

AP6-01c-Messung: Probe = 164 Boxen → ~64 aktive Meshes/Blick, ein Draw-Call je
Mesh. Schätzung ganzer Sektor: **700–900 Boxen**. Ein Mesh/Draw-Call je Box wird
auf schwacher Hardware spürbar → **`Mesh.MergeMeshes` (bzw. Thin-Instances) für
die statische Welt-Geometrie, gruppiert je Material/Zone**, ist in diesem Ticket
**verpflichtend**, nicht „ggf.". Bresche-Segmente + andere zur Laufzeit
schaltbare (`tag`) Boxen bleiben Einzel-Meshes (der Merge darf sie nicht
schlucken). N-Box-Frame-Benchmark headless im Bericht (vorher/nachher).

### 6. Jank-Pass (weiter gültig aus AP6-01b)

Durchgehender Boden an allen Zonengrenzen · keine klemmenden `grabenknick`-Ecken
(unter Gegnerdruck gegenchecken) · jede Rampe endet auf tragendem Boden · jede
Zone ≥ 1 Licht in Reichweite · keine schwebende Kulissen-Geometrie · Parapet-
Krone keine Lauffläche.

## Akzeptanzkriterien

- `npm run dev`: man bewegt sich nachts durch ein **Grabensystem, das sich wie
  eines anfühlt** — tief (Wände überragen), verkleidet (Holz/Sandsack/Wellblech/
  Laufrost, flache Farben + Formdetail), eng + gewunden. Screenshots im Bericht.
- Front schlank (4 Nischen, 2 Breschen, Depot, Parados) · Home = Bunker (3
  Nischen, `beton`, 3 echte Abstiegs-Unterstände) · 3 gewundene Verbindungs-
  gräben (Mitte Express gerade) · kein Stützgraben.
- `VG_ANZAHL` ist ein Parameter — mit `= 2` gesetzt baut der Sektor sauber 2
  Verbindungsgräben (Nav + Mündungen folgen). Im Bericht kurz gezeigt, dann
  wieder auf 3.
- Kein sichtbarer Jank. Begehbarkeits-Test grün (Ist + alles-offen).
- Headless-Einsatz Seed 1/2/7 bis „gewonnen", 0 Despawns.
- Runback Feuergraben → Home-Line für Solo ~15–22 s Gehen ohne Feinddruck
  (kleinerer Footprint → etwas kürzer als AP6-01b).
- Golden-Anker sauber neu (Uhr-Regel bitgleich, Gegenprobe da).
- Alle Checks grün. Perf-Zahl im Bericht.

## Ausdrücklich NICHT in AP6-01d

- Echte Texturen / Normal-Maps / PBR (`KONZEPT.md` §9.10) · der Seed-/
  Schwierigkeits-Schalter für `VG_ANZAHL` (Backlog) · MG-Stände + Front-
  Wandkammern (Backlog) · Stützgraben (Backlog) · Bresche→Durchbruch (AP6-02b)
  · Spawn-Verlagerung (AP6-03) · „Instand setzen" (AP6-04, hier nur Marker) ·
  Roam (AP6-05) · Gegner-KI-Verhalten (eigene Design-Runde nach diesem Ticket).
