# AP6-01d — Graben-Look: ganzer Sektor + geschrumpfter Grundriss

**Status:** review — gebaut, Bericht unten.
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
Runde 2026-09-09.

## Korrekturen aus dem AP6-01c-Spieltest (2026-09-09)

Der Nutzer hat `?probe` angespielt: **„das ist sehr gut so, genau so kanns
sein"** — Look, Tiefe, Holzverkleidung, gezähnte Bewegung abgenommen. Vier
Nachbesserungen, hier verbindlich:

1. **Verkleidung + Sandsack-Krone kollidieren nicht mehr.** Im Probe-Bau sind
   die Formdetail-Boxen (Pfosten 0,12 m / Bohlen 0,06 m vorstehend, Sandsäcke)
   echte Kollider → man „glitcht" beim Entlanglaufen an den Kanten. **Lösung:**
   ein neues `LevelBox`-Flag `nurRender?: boolean` (Analogon zu `unsichtbar` =
   Kollider-ohne-Mesh; `nurRender` = Mesh-ohne-Kollider). `createCollisionWorld`
   filtert `nurRender`-Boxen raus. Alle `verkleidung()`- / `sandsackKrone()`- /
   Laterne- / `laufrost`-Querstege-Boxen kriegen `nurRender: true`. Der
   **Kollider ist die Erd-Basiswand**, und ihre grabenseitige Fläche liegt
   **bündig mit der Verkleidungs-Vorderkante** (Basiswand ~0,12 m weiter in den
   Graben, damit Sicht-Wand = Lauf-Wand). Reine Daten-Durchreiche, goldene
   Regel bleibt.
2. **Gänge etwas breiter.** Lichte Weite an der Sohle: Feuernische + Laufgang
   **~2,4 m** (statt 2,0), Seiten-Verbindungsgräben **~2,6 m**, Express-
   Laufgraben Mitte **~2,0 m** (bleibt der engste). Im Spieltest justierbar.
3. **Abstieg flacher.** Die 8 Stufen über 2,2 m waren zu steil (Verhältnis
   ~0,9). Neu: **~12 Stufen, Anstieg ~0,20 m, Auftritt ~0,30 m** → längerer
   Treppenschacht (`US_SCHACHT_T` ~3,6 statt 2,4).
4. **Mehr Kopffreiheit im Unterstand.** Lichte Raumhöhe **~2,3 m** (statt 2,0):
   `US_TIEFE` 2,2 → **2,5** (Raumboden −5,2), `US_KOPF` 2,0 → **2,3**
   (Deckenunterkante −2,9, Auge −3,6 → ~0,7 m Luft über dem Auge).

`abstiegUnterstand()` + die Verkleidungs-Helfer in `module.ts` entsprechend
anpassen (weiter additiv nutzbar — die Probe-Szene darf mitwandern oder
eingefroren bleiben, egal, sie ist Dev-only).

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
  **Alle Formdetail-Boxen `nurRender: true`** (Korrektur 1) — Kollider ist die
  bündig gesetzte Erd-Basiswand. `laufrost`-Querstege ebenfalls `nurRender`.
- **Nacht-Licht (Korrektur 2 aus dem Spieltest):** die „Feuertonne" (0,5-m-
  Würfel im Renderer) → eine **einfache Petroleum-/Sturmlaterne als Greybox**:
  ~4 Boxen (Fuß-Tank + Glaszylinder emissiv + Deckel + Bügel), auf einem Pfosten
  oder an der Wand hängend, ~0,25 × 0,5 m. Noch Greybox, keine Textur (echtes
  Laternen-Modell → Backlog). Im Renderer, nicht als Kollider.
- `unterstand()` → auf `abstiegUnterstand()` umstellen (echter Abstieg steht
  schon, nur noch nicht im Sektor verdrahtet — das ist der AP6-01b-Rückstand).
  **Mit den Spieltest-Korrekturen 3+4** (flachere Treppe ~12 Stufen, Raumhöhe
  ~2,3 m). Die 3 Home-Unterstände brauchen je eine `abstiegUnterstandLoch()`-
  Aussparung im Sohle-Auffangboden.
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
- **Kein Glitchen an der Verkleidung:** Test — Kapsel läuft an einer verkleideten
  Wand entlang (Pfosten + Bohlen), bleibt an keiner Formdetail-Kante hängen
  (`nurRender`-Boxen nicht im Kollider; Basiswand bündig). Unter Gegnerdruck
  gegenchecken.
- **Abstieg:** ~12 Stufen, Anstieg ≤ ~0,22 m; Raumhöhe ≥ 2,25 m (Auge clippt
  klar nicht in die Decke). Sim-Test wie AP6-01c.
- Kein sichtbarer Jank. Begehbarkeits-Test grün (Ist + alles-offen).
- Headless-Einsatz Seed 1/2/7 bis „gewonnen", 0 Despawns.
- Runback Feuergraben → Home-Line für Solo ~15–22 s Gehen ohne Feinddruck
  (kleinerer Footprint → etwas kürzer als AP6-01b).
- Golden-Anker sauber neu (Uhr-Regel bitgleich, Gegenprobe da).
- Alle Checks grün. Perf-Zahl im Bericht.

## Ausdrücklich NICHT in AP6-01d

- Echte Texturen / Normal-Maps / PBR (`KONZEPT.md` §9.10) · **echtes Laternen-
  Modell** (hier nur die 4-Box-Greybox — Backlog) · der Seed-/Schwierigkeits-
  Schalter für `VG_ANZAHL` (Backlog) · MG-Stände + Front-Wandkammern (Backlog) ·
  Stützgraben (Backlog) · Bresche→Durchbruch (AP6-02b) · Spawn-Verlagerung
  (AP6-03) · „Instand setzen" (AP6-04, hier nur Marker) · Roam (AP6-05) ·
  Gegner-KI-Verhalten (eigene Design-Runde nach diesem Ticket).

---

## Bericht — AP6-01d

COMMIT: `caa554c` (Branch `arbeitspaket-6`)
CI: **success** (Workflow "CI") / **success** (Workflow "Pages Preview") auf `def6bca`
TODO(Rückfrage): keine im Code. Fünf Entscheidungen unten (1–5) an den Planer.

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**
Tests: **339** (+25: `sektor-grabenlook.test.ts` neu mit 18, `module.test.ts` 8 → 15) ·
Coverage src/sim: **98,59 % Stmts / 97,48 % Branch** (vorher 98,43 / 97,02) ·
Bundle: 6 924,08 kB roh / 1 538,79 kB gzip (Δ +3,0 kB roh / +1,6 kB gzip)

### Umsetzung — was gebaut wurde

1. **`src/sim/collision.ts`** — neues `LevelBox.nurRender`-Flag (Gegenstück zu
   `unsichtbar`); `createCollisionWorld` filtert diese Boxen heraus, bevor die
   parallelen Arrays entstehen. Reine Daten-Durchreiche, **keine Sim-Logik** —
   `moveCapsule` / `raycast` / `sichtlinie` sind unverändert und sehen die
   Formdetail-Boxen schlicht nicht. Goldene Regel gewahrt.
2. **`src/data/module.ts`** — der Graben-Look ist **global**:
   `GRABEN_SOHLE −2,7` · `FEUERTRITT_OBERKANTE −0,90` (4 Stufen à 0,45) ·
   `BRUSTWEHR_OBERKANTE 0,58` · `PARAPET_OBERKANTE 0,70` (Sandsack-Krone) ·
   `PARADOS_OBERKANTE 0,30`. Die lokalen `*_TIEF`-Konstanten aus AP6-01c sind
   damit weg (eine Quelle statt zwei).
   - **Neu:** `grabenWand()` (Basiswand = Kollider + Verkleidung + Sandsack-
     Krone + Lücken mit optionalem `tag`), `traverseBlock()`, `bodenPlatten()`
     (Rechteck-Subtraktion, aus `probe-graben.ts` hochgezogen).
   - `verkleidung` / `sandsackKrone` / Laufrost-Querstege liefern jetzt
     ausschließlich `nurRender`-Boxen; Pfosten stehen mittig im Feld statt auf
     den Segmentgrenzen (sonst Z-Fighting an jeder Wandnaht im gemergten Mesh).
   - `abstiegUnterstand()`: **12 Stufen** (Anstieg 0,208 m, Auftritt 0,30 m,
     Schacht 3,6 m) und **2,3 m Kopffreiheit** (`US_TIEFE` 2,5 / `US_KOPF` 2,3)
     → Raumboden −5,20, Deckenunterkante −2,90, Auge −3,60 = 0,70 m Luft.
     Exportiert als `ABSTIEG_STUFEN` / `ABSTIEG_KOPFFREIHEIT`.
   - `rampe()` 10 → **14 Stufen** (Sohle 0,9 m tiefer → Anstieg bleibt 0,19 m).
   - **Aufgeräumt:** `grabengerade` / `grabenknick` / `parapet` / `sap` /
     `traverse` / `unterstand` sind als `modul()`-Typen **entfallen** — der
     Sektor baut sie jetzt aus den achsen-generischen Weltkoordinaten-Helfern.
     `modul()` trägt nur noch die drei rotations-freien Reste (`rampe`,
     `kartengrenze`, `geschuetzstellung`).
3. **`src/data/sektor.ts`** — komplett neu (Details unten unter „Grundriss").
4. **`src/render/index.ts`** —
   - **Merge je Material *und* Zonen-Band** für die statische Welt-Geometrie
     (Zahlen unter „Perf"). `tag`-Boxen bleiben Einzel-Meshes.
   - `tagMeshes` ist jetzt `Map<string, Mesh[]>` — ein Bresche-Tag deckt Wand
     **und** Verkleidung **und** Sandsäcke ab; vorher überschrieb jede weitere
     Box denselben Map-Eintrag, sodass beim Aufreißen nur das letzte Stück
     verschwand (stiller Altbestand aus AP6-01b, hier mitgefixt).
   - **Petroleum-Laterne** statt Feuertonnen-Würfel: 4 Greybox-Boxen
     (Fuß-Tank · emissiver Glaszylinder · Deckel · Bügel), ~0,26 × 0,56 m, ohne
     Kollider; der Punktstrahler sitzt auf Glashöhe.
   - `dispose()`: die geteilten Welt-Materialien werden einmal aufgeräumt statt
     je Mesh (mit dem Merge sonst mehrfach).
5. **Tests** — neu `src/data/sektor-grabenlook.test.ts` (18): Tiefe, Feuertritt
   über die Kimme, Krone nicht begehbar, **Entlanglaufen an Brustwehr und
   Express-Wand ohne Hängenbleiben/Mikrostufe**, `nurRender` nicht im Kollider,
   die 3 Abstiegs-Unterstände (12 Stufen, Kopffreiheit, rein/raus, kein
   Durchfallen), durchgehender Boden an jeder Zonengrenze, ein Marsch über den
   ganzen Nav-Pfad Front → Home, Lichter kollisionsfrei + je Zone eins.
   Angepasst: `module.test.ts`, `probe-graben.test.ts`, `sektor.test.ts`,
   `navgraph-begehbarkeit.test.ts`, `collision-verbindungsgraben.test.ts`,
   `wave-eskalation.test.ts`, `gegner-klassen.test.ts`, `sim.test.ts`.

### Grundriss (as built)

Footprint **x ±32 · z −48 … 72** (vorher ±44 / −60…92 — ~27 % kleiner).
Zonen als lückenlose Z-Bänder: Home −48…−30 · Hinterland −30…12 · Frontlinie
12…28 · Niemandsland 28…58 (30 m) · Feindseite 58…72.

- **Feuergraben (z 17…26)** — Brustwehr z 24,2…26,0 (Erde bis 0,58 + Sandsack-
  Krone 0,70) · Feuertritt z 21,8…24,2 (4 Stufen) · **4 Feuernischen**
  x −21/−7/+7/+21 · **3 Erd-Traversen** x −14/0/+14 (z 19,4…26,0) · durch-
  gehender **Laufgang** z 17,0…19,4 (lichte Weite 2,4 m) · **Parados** z
  15,6…17,0 (Krone 0,30) mit 3 Verbindungsgraben-Mündungen + 2 Ausstiegs-
  treppen. Zwei **Sap-Rampen** (x −7 / +21, 14 Stufen aufs Feld) als permanente
  Anmarsch-Schleusen. Zwei **Breschen**: „Panzerwrack" (x −21, reines Loch, kein
  Nav-Knoten) und „Pumpenstand" (x +7, Nav-Knoten `bresche-front`). Depot im
  Laufgang (−3 · 18,2).
- **Niemandsland** — Trichter, Draht, Turmruine (Landmark, −9 · 39), quer
  laufende begehbare **Alt-Frontlinie** (Rinne z 42…46, 0,40 m tief — flacher
  als `STEP_HEIGHT`, also ohne Sprung rein **und** raus).
- **Hinterland** — **kein Stütz-, kein Reservegraben**. Drei Verbindungsgräben:
  Mitte = **Express-Laufgraben**, x 0, lichte Weite **2,0 m**, z 15,6 … −33,8
  **durchgehend gerade ohne einen Port**; West/Ost gewunden (Dog-Leg
  x ∓16 → ∓23 → ∓16, Knicke bei z 4 und −14), lichte Weite 2,6 m. Dazwischen
  Geländeinseln mit Ruinen/Trichtern, außen offene Flanken-Felder mit zwei
  Geschützstellungen.
- **Home-Line (z −42,2 … −32)** — der Bunker: Brustwehr z −33,8…−32,0 in
  **`beton`**-Verbau (nur x ±26, außen offene Flanken mit 2 Rampen bei x ±29) ·
  Feuertritt · **3 Feuernischen** x −16/0/+16 (aligned mit den VG-Mündungen) ·
  2 Beton-Traversen x ±8 · Laufgang z −40,8…−38,4 · Rückwand z −42,2…−40,8 mit
  **3 echten Abstiegs-Unterständen** dahinter (Munitionslager · Verbandsplatz ·
  Feldkommandeur). Jeder mit `abstiegUnterstandLoch()`-Aussparung im Auffang-
  boden, abgedichtet von der eigenen Bodenplatte — **nicht im Nav-Graph**.
- **Sohle-Auffangboden** durchgehend unter dem ganzen Sektor (Oberkante −2,7),
  nur unter den 3 Unterständen ausgespart.

**`VG_ANZAHL` ist ein echter Parameter:** `VG_SLOTS` (Express zuerst, dann die
zwei gewundenen) × `VG_ANZAHL`. Daraus folgen Geometrie, Parados-Mündungen,
Home-Brustwehr-Lücken, Feuertritt-Abschnitte, `hintenKanten`, Nav-Knoten/-Kanten
und die Verbindungsgraben-Lichter.

**Nav-Graph: 65 Knoten / 81 Kanten** (Feindseite 3 · Niemandsland 17 ·
Frontlinie 17 · Hinterland 17 · Home-Line 11) — in der Zielspanne 55–70.

### Golden-Anker — Neubaseline (bewusst, begründet)

Beide positionsabhängigen Anker in `sim.test.ts` brechen durch den neuen Sektor.
**Neu baseliniert mit Begründung direkt am `expect()`**:

- **„trifft den Nav-Golden-Anker":** neu sind nur `player.pos` (13,35 · 12,1298
  → **0,6891 · 17,3798**) und `nach[0].pos` (0,114 · 49,667 → **9,518 · 56,973**).
  **Unverändert:** `tick 600` · `wave.welle 1` · `angriffskraftRest 145`
  (150 − 5 Spawns) · `nachschub 0` · 5 Gegner · alle `abschnitt "front"` ·
  alle `zielKnoten "front-front"` · alle `zustand "anmarsch"` · Klassenmix
  `[schwer, schnell, normal, schwer, normal]` · `front ["front"]/["stabil"]` ·
  `breschenOffen 0` · `home ["home"]` · `einsatz wellen/offen/0`.
- **„trifft den Uhr-Golden-Anker":** nur die Gegner-Setup-Position wandert
  (−16 · 0 · 19 → **−7 · −2,3 · 21**, Seed-1-Spawn liegt jetzt im Laufgang vor
  der zweiten Nische). **`angriffskraftRest` 148 (stehende Front, −2) / 149
  (gefallene Front, −1) und `nachschub` 5 sind bitgleich** — die Uhr-Regel ist
  unverändert.
- **Inline-Testlevel-Anker unberührt** (eigene `LevelData`).

**Gegenprobe (AP6-01b-Disziplin):**

| Probe | Ergebnis |
| --- | --- |
| Determinismus-Doppellauf Nav-Anker | `replay()` `toEqual` `replay()` grün; per Wegwerf-Skript zusätzlich `JSON.stringify`-identisch |
| Determinismus-Doppellauf Uhr-Anker | grün, ebenso `JSON.stringify`-identisch |
| Uhr-Kill-Probe | stehende Front `ak 148`, gefallene `ak 149` — **exakt die alten Werte** |
| Voller Headless-Einsatz | siehe Tabelle unten, 3 Seeds gewonnen, 0 Despawns |

### Headless-Einsatz (idealisierter Schütze, `waves: true`)

| Seed | Ergebnis | Wellen | maxLebend | **Despawns** | Dauer | Gegner |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | gewonnen | 5·8·11·14·17 | 16 | **0** | 409 s | 61 |
| 2 | gewonnen | 5·8·11·14·17 | 17 | **0** | 435 s | 61 |
| 7 | gewonnen | 5·8·11·14·17 | 17 | **0** | 416 s | 61 |

Zusätzlich (`wave-eskalation.test.ts` / `gegner-klassen.test.ts`): alle 17
Gegner einer Welle-5-Kette kommen an der Front an, **ohne einen einzigen
Watchdog-Eingriff auf dem Anmarschweg** (`maxFest === 0`, vorher ≤ 1 bzw. ≤ 2).

### Perf — Merge je Material **und** Zonen-Band

Sektor: **1 701 Level-Boxen** (holz 697 · laufrost 362 · Zonen-Ton 236 ·
sandsack 233 · beton 164 · wellblech 15 · unsichtbar 5) — davon **1 324
`nurRender`**, also nur **391 Kollider** (AP6-01b hatte 1 Mesh je Box und
~190 Kollider; das Kollider-Budget der Sim verdoppelt sich, die Optik
vervierfacht sich).

Headless (Swiftshader-CPU, 1280 × 720, 150 Frames, Renderer-Bauzeit
85 → 106 ms):

| Blickpunkt | ohne Merge: aktive Meshes / Frame-Median | mit Band-Merge |
| --- | --- | --- |
| Feuergraben (Nische) | 161 / 29,6 ms | **29 / 28,2 ms** |
| Express-Laufgraben | 882 / 36,4 ms | **73 / 30,5 ms** |
| Home-Line | 115 / 21,4 ms | **22 / 21,0 ms** |

Szenen-Meshes gesamt 1 782 → **146**. **Wichtig für die Einordnung:**
Swiftshader rastert auf der CPU, dort kosten Draw-Calls wenig und Füllrate
alles — der Gewinn ist hier 5–16 %. Auf einer echten GPU ist der Faktor 5–12
bei den Draw-Calls die eigentliche Zahl. Gegenprobe „Merge nur je Material"
(ohne Bänder) war **schlechter als gar kein Merge** (32,8 ms im Feuergraben):
ein einziges Riesen-Mesh je Material kann das Frustum-Culling nie mehr
verwerfen. Deshalb die Bänder aus `meta.zonen`.

### `VG_ANZAHL = 2` — Gegenprobe

Mit einer Zeile (`const VG_ANZAHL = 2`) baut der Sektor sauber zwei
Verbindungsgräben: 1 478 Boxen · 349 Kollider · **58 Nav-Knoten / 71 Kanten** ·
`hintenKanten` = `[[parados-m, vg-m1], [parados-w, vg-w1]]` · Parados-Mündungen
nur bei x 0 / −16 · VG-Knoten nur `vg-m*` / `vg-w*` · Home-Brustwehr-Lücken und
Feuertritt-Abschnitte folgen · das VG-Licht wandert mit.
**Gesamte Testsuite mit `= 2`: 338/339 grün** — der einzige Fehlschlag ist
`sektor.test.ts` „hintenKanten.length === 3", also genau die Zusage für den
ausgelieferten 3-Graben-Grundriss. Danach wieder auf `3` (Commit-Stand).

### Runback Feuergraben → Home-Line (Solo, ohne Feinddruck)

| Route | Gehen | Sprint |
| --- | --- | --- |
| Express (Mitte-Spawn → Parados-Mündung → Express → `home-ziel`) | **12,2 s** | 7,9 s |
| West-Dog-Leg (derselbe Start, über den gewundenen Westgraben) | **23,9 s** | 15,4 s |

Der Express ist absichtlich die schnelle Linie, die Dog-Legs sind der lange Weg
— zusammen klammern sie das Zielband „~15–22 s". Siehe Entscheidung 4.

### Jank-Pass — Punkt für Punkt

| Vorgabe | Beleg |
| --- | --- |
| durchgehender Boden an allen Zonengrenzen | `sektor-grabenlook.test.ts` „an jeder Zonengrenze trägt der Boden" (6 x-Proben je Grenze) + „Marsch über den ganzen Nav-Pfad" |
| keine klemmenden Graben-Ecken unter Gegnerdruck | Dog-Leg-Knicke sind `engstelle`-Knoten; `navgraph-begehbarkeit` grün in beide Richtungen; Welle-5-Kette ohne Watchdog-Eingriff |
| jede Rampe endet auf tragendem Boden | Home-Flankenrampen-Test (x ±29, Spur ±26…±32) + Sap-Rampen im Begehbarkeits-Test |
| jede Zone ≥ 1 Licht in Reichweite | Test „jede Zone hat mindestens ein Licht in Reichweite" (Feindseite bewusst dunkel) |
| kein Licht in einem Kollider | Test „kein Licht steckt in einem Kollider" (16 Lichter) |
| keine schwebende Kulissen-Geometrie | Feindseiten-Silhouette als zusammenhängende Bodenmasse (wie AP6-01b), Deckung ab y −0,3 |
| Parapet-Krone keine Lauffläche | Test „Parapet-Krone ist keine Lauffläche" (echte `moveCapsule` vom Niemandsland) |
| kein Glitchen an der Verkleidung | zwei Entlanglauf-Tests (Brustwehr, Express-Wand): `fortschritt > 0,98`, `maxDy < 0,05` |

### Entscheidungen / Abweichungen vom Ticket

1. **Verkleidung steht 7 cm (Pfosten) bzw. 2,5 cm (Bohlen) vor dem Kollider —
   statt „Basiswand 0,12 m weiter in den Graben".** Beide Varianten lösen das
   eigentliche Problem (Formdetail ist kein Kollider mehr). Die Ticket-Variante
   hätte die Erd-Basiswand bündig auf die Pfosten-Vorderkante gezogen — dann
   liegen zwei Flächen exakt aufeinander (Z-Fighting im gemergten Mesh), und
   Bohlen wie Wandfläche dazwischen verschwinden *in* der Basiswand, das
   Formdetail wäre weg. Gebaut ist deshalb: Kollider = Basiswandfläche,
   Formdetail steht ≤ 7 cm davor (0,2 × Kapselradius) und ist damit
   wahrnehmungsfrei. Der Test pinnt die 8 cm.
2. **Parados-Ausstieg als 7-stufige Treppe *in* der Wandlücke** statt einer
   Rampe. Eine `rampe()` (3,4 m lang) hätte 2,7 m Höhe im Laufgang verbaut und
   ihn quer zugestellt (der Begehbarkeits-Test hat genau das gefangen). Die
   Treppe füllt nur die Parados-Stärke (1,4 m, Anstieg 0,386 m < `STEP_HEIGHT`)
   — das ist das „unter Druck rausklettern" aus KONZEPT §3, aber steiler als
   die dortige Skizze „1–2 flache Stufen" (die bei 2,7 m Tiefe nicht geht).
3. **Alte `modul()`-Typen entfernt** (`grabengerade`/`grabenknick`/`parapet`/
   `sap`/`traverse`/`unterstand`). Sie wären nach dem globalen Schnitt toter,
   parallel gepflegter Code gewesen; der Sektor nutzt ausschließlich den
   Weltkoordinaten-Baukasten. `modul()` bleibt für Rampe/Kartengrenze/
   Geschützstellung.
4. **Runback 12,2 s über den Express** — unter dem Zielband 15–22 s. Das ist die
   direkte Folge des −27 %-Footprints (AP6-01b: 17,1 s × 0,73 ≈ 12,5 s). Über
   die gewundenen Seitengräben sind es 23,9 s. Bewusst *nicht* nachjustiert:
   „gefährlicher, nicht schneller" hängt am Feinddruck, und die Distanz ist im
   Spieltest die billigste Stellschraube. Wenn der Runback zu kurz wirkt: den
   Express oben oder unten um einen Knick verlängern (eine Zeile in `VG_SLOTS`).
5. **`BRUSTWEHR_OBERKANTE` bleibt bei 0,58** (Marge 0,08 über `STEP_HEIGHT`).
   Der `?probe`-Spieltest hat keine kletternde Kapsel gezeigt, und alle Tests
   (auch Kapsel vom Feld gegen die Wand) bestätigen „nicht begehbar". Das
   Ticket nennt 0,62 als Fallback — ein Ein-Zeilen-Wechsel, wenn der Spieltest
   doch klettert.

**Merkposten (kein Ticket-Scope):** steht der Spieler im Feuergraben-Laufgang,
verkeilt sich die ganze Welle an ihm — der Laufgang ist der **einzige** Weg
zwischen den Feuernischen. Das ist Absicht (man hält den Graben), macht aber das
Gegner-Klumpen aus AP6-06 deutlicher sichtbar; nach der Ankunft drücken die
Gegner gegen den Parados und sammeln Stillstand (Watchdog Stufe 2 →
Relokation). Genau das Thema der **Gegner-KI-Design-Runde / AP6-05**. Zwei Tests
messen `festVersuche` deshalb nur noch **auf dem Anmarschweg**.

### Manuell geprüft

Headless (Playwright + Swiftshader, Wegwerf-Harness `hdl-tmp/` → gelöscht):
12 Screenshots in `tickets/AP6-01d-screenshots/`, **keine Konsolenfehler**:

| Datei | Blick |
| --- | --- |
| 01-feuergraben-von-unten | von der Sohle: 4-Stufen-Feuertritt, Pfosten + Bohlen beidseits, Sandsack-Krone gegen den Nachthimmel |
| 02-feuertritt-ueber-die-kimme | auf der Bank: Blick über die Brustwehr auf Turmruine + Feindsilhouette |
| 03-laufgang-traversen-zickzack | Laufgang längs, die Erd-Traversen als Zähne |
| 04-verkleidung-laufrost-nah | Wandecke nah: Pfosten, Bohlen-Kurse, Laufrost mit Querstegen |
| 05-verbindungsgraben-express | der lange gerade Express-Laufgraben mit HOME-Schild + Laterne am Ende |
| 06-verbindungsgraben-dogleg-west | der gewundene Westgraben im Dog-Leg-Stück |
| 07-home-line-beton | Home-Graben: Beton-Verbau, dahinter der Holz-Schacht des Unterstands |
| 08-abstieg-treppe-hinab | vom Laufgang die Treppe hinab |
| 09-im-unterstand | im Raum: Kopffreiheit, Blick die Treppe hinauf in den Graben |
| 10-uebersicht-feuergraben | Feuergraben von oben: Nischen, Traversen, Sandsack-Krone, FRONT-Schild |
| 11-niemandsland-altfrontlinie | die begehbare Alt-Frontlinien-Rinne quer |
| 12-bresche-pumpenstand | „Pumpenstand"-Bresche aufgerissen (Wand + Verkleidung + Sandsäcke zusammen weg, Trümmer da) |

**Merkposten Spieltest (echte GPU):** Nacht-Helligkeit und Fernsicht sind
headless (Swiftshader) nur bedingt aussagekräftig. Fokus beim Anspielen:
(a) trägt die Enge (Laufgang 2,4 m / Express 2,0 m) oder klemmt es beim
Ausweichen? (b) Läuft man an der Verkleidung wirklich glatt entlang?
(c) Abstieg + Unterstand — Kamera beim Treppab, Kopffreiheit. (d) Runback-
Gefühl (Express kurz, Dog-Leg lang). (e) Klettert eine Kapsel doch die
Brustwehr hoch (dann `BRUSTWEHR_OBERKANTE` 0,58 → 0,62)?
