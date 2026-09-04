# AP5-01 — Mittelgang-Teleport-Bug

**Status:** erledigt · `f4231ac` · reviewed 2026-09-04
**Arbeitspaket:** 5 (Boxhead-Kern) · **Branch:** `arbeitspaket-5` (von `main`)
**Referenz:** Zweiter Spieltest 2026-09-04 (Nutzer-Feedback), `src/sim/collision.ts`
(`moveCapsule`), `src/data/sektor.ts` (Zone `verbindungsgraben`, `aabb(-3, -20,
3, 11)`, Rampen-/Grabengeometrie um den Übergang Feld → Verbindungsgraben),
`src/sim/index.ts` (`step`, Bewegungsauflösung pro Tick).

## Ausgangslage

Spieltest-Feedback: beim Durchqueren des zentralen Verbindungsgrabens (der
schmale Mittelgang zwischen offenem Feld und Home-Line) wird der Spieler
gelegentlich an eine andere Position „teleportiert". Kein reproduzierter
Repro-Schritt vom Nutzer, nur die Beobachtung „passiert manchmal beim
Durchlaufen".

## Ziel

Ursache finden und beheben — kein Pflaster (z. B. stumpfes Clamping ohne zu
wissen warum), sondern die tatsächliche Wurzel.

## Umsetzung

Naheliegendste Hypothese (nicht blind übernehmen, verifizieren): die
Kapsel-Kollisionsauflösung (`moveCapsule` in `src/sim/collision.ts`) löst pro
Tick gegen mehrere `LevelBox`en sequenziell auf. Wo Geometrie eng
zusammenläuft oder sich leicht überlappt (Rampe, Grabenwand, Boden am
Übergang), kann eine Kette von Einzelauflösungen in einem Tick zu einer
großen Netto-Verschiebung führen — das fühlt sich wie ein Sprung an. Das ist
eine Hypothese, kein Befund: zuerst reproduzieren (F3-Overlay:
Position/Tick beobachten, bei Bedarf einen temporären Log-Punkt einbauen),
die Stelle exakt lokalisieren, dann erst fixen.

Möglicher Fix, je nach Befund:
- Geometrie am Übergang bereinigen (Lücken/Überlappungen der `LevelBox`en in
  `src/data/sektor.ts` in diesem Bereich).
- Und/oder eine Plausibilitätsgrenze in der Kollisionsauflösung (max.
  Verschiebung pro Tick), als Sicherheitsnetz gegen diese Bugklasse generell.

**Regressionstest:** eine Kapsel den Verbindungsgraben mehrfach in beide
Richtungen durchlaufen lassen (ähnliches Muster wie
`src/sim/navgraph-begehbarkeit.test.ts`) und pro Tick die
Positionsänderung gegen eine Plausibilitätsgrenze prüfen (z. B. maximal
mögliche Bewegung bei Sprint-Tempo × `dt` × Sicherheitsfaktor). Der Test
muss den ursprünglichen Bug nachweislich fangen (Gegenprobe wie in
AP4-06, falls der Bug reproduzierbar ist).

## Akzeptanzkriterien

- Ursache im Bericht klar benannt (Datei:Zeile), nicht nur der Fix.
- Manuelles mehrfaches Durchlaufen des Verbindungsgrabens (F3-Position
  beobachten) zeigt keine Sprünge mehr.
- Neuer/erweiterter Test verhindert eine Regression.
- Alle drei golden anchors unverändert, sofern die Bewegungslogik außerhalb
  des Verbindungsgrabens nicht angefasst wird — falls doch, im Bericht
  begründen.

## Ausdrücklich NICHT in diesem Ticket

Änderungen an der Front-/Bresche-Mechanik, an der Kartengrenze (→ AP5-03),
an Munition (→ AP5-02) oder an Gegnerverhalten (→ AP5-04).

## Bericht — AP5-01

COMMIT: <Hash in der Nachricht an die Planer-Session> (Branch `arbeitspaket-5`)
CI: <Status in der Nachricht an die Planer-Session>
TODO(Rückfrage): keine

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  23 Dateien, 250 Tests (vorher 232)
    Coverage src/sim: 98,40 % Stmts / 96,74 % Branch / 100 % Funcs / 98,40 % Lines
    collision.ts 97,81 · enemies.ts 97,80 · index.ts 98,31
> vite build                       ✓  dist/assets/index-*.js 6.906,0 kB │ gzip 1.532,3 kB
```

Tests: 250 (23 Dateien, +18 — `collision-verbindungsgraben` 15 neu,
`collision` +3) · Coverage src/sim **98,40 %** (vorher 98,38 %) · Bundle
~6,91 MB / ~1,53 MB gzip (Δ ±0 kB, kein neuer Import).

**Alle drei Golden-/Replay-Anker unverändert grün** (Inline-Testlevel, Sektor-
Graph Seed 40404, Uhr Seed 1) — obwohl die Bewegungslogik global geändert ist,
siehe Entscheidung 4.

### Ursache

Der „Teleport" ist ein Fehler in der achsenweisen Kollisionsauflösung von
`moveCapsule` (`src/sim/collision.ts`, Zeilen nach Stand `main`):

1. **Rundungsrest nach dem X-Push** (`collision.ts:168`, `next.x = … box.minX -
   radius`). Für die Innenflächen der Verbindungsgraben-Wände (x = ±1,8, aus
   `src/data/sektor.ts:131-132`) und den Spielerradius 0,35 gilt in
   IEEE-754-Gleitkomma: `(1.8 - 0.35) + 0.35 = 1.8000000000000003`. Der
   Überlappungstest `overlaps()` (`collision.ts:116-125`, strikte
   Ungleichungen) sieht die Kapsel danach weiter **2,2e-16 m in der Wand**.
   Alle anderen geprüften Flächenkoordinaten des Sektors (±2,2 · 10,6 · 11,5 ·
   −21,5 · 10,95 · 10,45 · 0 · 0,55 · ±3 · ±14 · −19,8 · −20,2 …) runden exakt
   — darum trat der Bug *nur* im Mittelgang auf.
2. **Die Z-Achse löst den Rest als echte Kollision auf** (`collision.ts:174-193`,
   Push in `:190-191`): sie schiebt die Kapsel an die *nächstgelegene Z-Fläche*
   der 33 m langen Wand, `box.minZ - radius` bzw. `box.maxZ + radius` — also
   auf z = −21,85 (Home-Mündung) oder z = 11,85 (Front-Mündung), je nachdem,
   welches Wandende näher ist (Wandmitte z = −5). Bis zu 16,5 m in einem Tick.
3. Dieselbe Bugklasse steckte in der **Y-Achse** (`collision.ts:207-212`): jede
   überlappende Box mit `v.y ≤ 0` wurde als Boden behandelt (`next.y =
   box.maxY`) — ein seitlicher Rest hätte die Kapsel auf die Wandkrone
   (y = 0,7) gehoben. Im Repro kam die Z-Achse zuerst dran.

Strukturell: eine Achse löste **jede** Überlappung entlang ihrer Achse zur
nächsten Fläche auf — egal, ob ihre eigene Bewegung die Durchdringung verursacht
hatte. Bei einer winzigen fremden Durchdringung an einer langen Box ist die
„nächste Fläche" meterweit weg.

### Reproduktion (headless, echte Sim + echter Sektor, deterministisch)

Temporärer Test (`createSim(7, sektorGreybox)` = mittlerer Spawn vor der
Grabenmündung, dann `tick()` mit `InputCommand`s durch den FP-Controller):

```
1 s rückwärts in die Mündung, dann Sprint diagonal rückwärts + rechts (Ostwand):
  tick 77: (1.402, −1.800, 7.098) → (1.450, −1.800, 11.850)   Δ = 4,75 m in einem Tick
… + links (Westwand):
  tick 77: (−1.402, −1.800, 7.098) → (−1.450, −1.800, 11.850)
stehend nur seitlich gegen die Wand drücken:
  tick 79: (1.425, −1.800, 8.500) → (1.450, −1.800, 11.850)   Δ = 3,35 m
geradeaus ohne Wandkontakt: keine Sprünge (Ende 0, −1.8, −34.75)
direkt moveCapsule, Kapsel bei x = 1.4499999999999997 drückt nach +X:
  → x = 1.4500000000000002, z 0 → 11.85 (11,85 m); Westwand: z −10 → −21.85
```

Jede Wandberührung im Mittelgang löst den Sprung aus — beim Strafen, beim
Blick-Schwenk mit Seitendruck, beim Anlehnen. „Gelegentlich" aus Spielersicht =
immer dann, wenn die Kapsel eine der beiden Wände anfasst.

### Fix (`src/sim/collision.ts`, `moveCapsule`)

1. **Kontakt-Toleranz** `KONTAKT_EPS = 1e-6` im Überlappungstest: Berührung
   (Durchdringung < 1 µm) ist keine Kollision. Tötet den Rundungsrest an der
   Quelle.
2. **Eine Achse löst nur auf, was ihre eigene Bewegung verursacht haben kann:**
   je Pass `maxTiefe = |Δ_achse| + KONTAKT_EPS`; eine tiefere Durchdringung
   (`tiefe()`, die flachere Seite) überspringt die Achse — sie gehört einer
   anderen Achse oder ist ein Rest. Y-Pass analog: Landen nur, wenn die Füße die
   Oberkante in *diesem* Fall durchquert haben (`vonOben ≤ maxTiefeY`), Decke
   nur, wenn der Kopf die Unterkante durchquert hat (`vonUnten ≤ maxTiefeY`);
   seitliche Kontakte ignoriert Y.
3. Die Nächste-Fläche-Regel bleibt: mit der Tiefengrenze trifft sie für alle
   Boxen dicker als 2·|Δ| (hier ≥ 0,4 m vs. ≤ 0,117 m/Tick) immer die
   Eintrittsfläche, und der Weg jeder Einzelauflösung ist genau die
   Durchdringungstiefe ≤ |Δ| + EPS. **Die im Ticket vorgeschlagene
   Plausibilitätsgrenze ist damit von Haus aus eingebaut** — kein separates
   Clamping (das die Kapsel in der Geometrie stehen lassen oder Fehler
   verstecken würde).

Dokumentiert in `src/ARCHITEKTUR.md` (Abschnitt „Boxhead-Kern (AP5)").

### Regressionstests

- **`src/sim/collision-verbindungsgraben.test.ts`** (neu, 15 Tests): Spieler-
  kapsel (0,35 / 1,8) läuft den Verbindungsgraben auf der echten Geometrie
  Front → Home → Front — mittig, an Ost- und Westwand schleifend, leichter
  Seitendruck, Zickzack, gehend/sprintend, mit Sprüngen. Je Tick:
  horizontale Verschiebung ≤ |v|·dt + 1 mm, vertikal ≤ `STEP_HEIGHT`, im
  geschlossenen Korridor nie durch die Wand (|x| > 1,45) und nie auf Wand/Feld
  (y ≥ −0,3); Ankunft ist Pflicht (fängt auch „steckt fest"). Dazu „stehend
  gegen jede Wand drücken: keinerlei Drift", die **Gegenprobe am exakten
  Ursachen-Zustand** (Kapsel bei `1.8 − 0.35`, drückt weiter; Gleitkomma-Rest
  dokumentiert) und ein **Spieler-Sim-Lauf** (`createSim` + `tick`, Sprint an
  der Ostwand nach Süden, an der Westwand zurück nach Norden: kein Tick über
  Sprint·dt, wirklich bis in den Home-Graben und zurück).
- **`src/sim/collision.test.ts`** +3 (Mechanismus, synthetische Geometrie):
  Rundungsrest an einer 40-m-Wand schiebt nicht entlang der Wand; eine fremde
  (seitliche) Durchdringung wird von der bewegten Achse nicht ans Boxende
  gesetzt (Verschiebung ≤ eigener Tick-Weg); seitlicher Kontakt hebt die
  fallende Kapsel nicht auf die Wandkrone.
- **Gegenprobe gegen den alten Code** (`git stash` nur `collision.ts`, beide
  Testdateien laufen lassen): **14 von 30 Tests rot** — alle Wandkontakt-
  Durchläufe, „stehend drücken", beide Ursachen-Gegenproben, der Spieler-Sim-
  Lauf und 2 der 3 Mechanismus-Tests. Beispiel „Ostwand schleifend, gehen":
  `Tick 70 bei (1.43, −1.80, 8.34): horizontaler Sprung 3.507 m (erlaubt
  0.076) → (1.45, 11.85)` — und dann alle 62 Ticks wieder (zurücklaufen,
  anlehnen, Wurf), der Durchlauf kommt nie an.

### Entscheidungen / Abweichungen vom Ticket

1. **Keine Geometrieänderung in `src/data/sektor.ts`.** Die Hypothese des
   Tickets („Lücken/Überlappungen am Übergang Feld → Verbindungsgraben")
   bestätigt sich nicht: Boden, Wände und Mündungen sind konsistent, der Fehler
   liegt allein in der Auflösungsarithmetik; die Wandflächen x = ±1,8 sind
   lediglich die Koordinaten, bei denen die Rundung zuschlägt. Koordinaten zu
   verschieben wäre ein Pflaster.
2. **Plausibilitätsgrenze als Tiefengrenze je Achse statt als stumpfes
   Verschiebungs-Clamping** (siehe Fix 3).
3. **Kehrseite bewusst in Kauf genommen:** eine Kapsel, die *tief* in einer Box
   startet (Datenfehler — Spawn oder Nav-Knoten im Kollider), wird nicht mehr
   herausgeschoben, sondern fällt auf den Boden und steckt, bis Geometrie oder
   Watchdog (Gegner, AP4-06, 4 s) greifen. Im Spiel nach meinem Stand nicht
   erreichbar: Spieler-Spawns liegen frei, `rueckerobern` (würde ein Bresche-
   Segment unter einem Gegner wieder einschalten) hat keine Tastenbindung,
   Nav-Knoten prüft `navgraph-begehbarkeit.test.ts`. In `ARCHITEKTUR.md`
   festgehalten.
4. **Bewegungslogik außerhalb des Verbindungsgrabens ist mit-geändert**
   (`moveCapsule` ist global, auch für Gegner — gleicher Radius 0,35, gleicher
   Rest). Darum die Golden-Anker ausdrücklich geprüft: alle drei liefern
   identische Werte (Spieler (1,7787 · 4,149), (5,6891 · 11,3298), Uhr
   Nachschub 5 / Angriffskraft 58). Zusätzlich die drei Golden-Skripte unter
   dem *alten* Code mit Sprung-Logging nachgespielt: kein Wandkontakt-Wurf
   enthalten, für Spieler wie Gegner — der Fix ändert an diesen Läufen nichts,
   keine Neubaseline. Nav-Begehbarkeitstest (Gegnerkapsel über alle Kanten,
   inkl. `graben-mund → … → home-graben`) unverändert grün.
5. **Spieler-Sim-Test sucht den mittleren Spawn per Seed** (`mittlererSeed()`),
   weil `createSim` den Spawn aus `spielerSpawn` per Seed zieht (Seed 1 = A bei
   x = −12; im Repro anfangs deshalb kein Grabenkontakt).

### Merkposten (nicht in diesem Ticket)

- **Home-Brustwehr „Vault":** von der Feuertritt-Bank (−0,95) klettert man mit
  Sprung + Stufen-Hochsteigen über die Home-Brustwehr (0,55) aufs Feld — die
  `STEP_HEIGHT`-Regel greift auch im Sprung, und der Feld-Bodenquader ragt
  0,5 m in den z-Bereich des Home-Grabens (z −20,5…−20, y 0). Beim Entwurf des
  Tests aufgefallen, kein Teleport, Verhalten wie vor AP5-01 → Politur / AP5-03.

Manuell geprüft: **nicht im Browser** (in dieser Session keine Möglichkeit, das
Spiel zu fahren). Stattdessen der gleiche Pfad headless: echter Sektor, echte
Spieler-Sim (`createSim` → `tick` → FP-Controller → `moveCapsule`), die
Positionen, die auch das F3-Overlay anzeigt — vor dem Fix reproduzierbar mit
Sprung, nach dem Fix in allen Läufen ≤ Sprint·dt je Tick. Für den Spieltest:
im Mittelgang beim Laufen A/D gegen eine Wand halten (Strafe/Anlehnen) und F3
beobachten — vorher der Wurf ans Grabenende, jetzt keine Positionssprünge mehr.

## Review — AP5-01 · 2026-09-04

**Grünes Licht.** Lokal nachvollzogen: `git checkout arbeitspaket-5 && git pull`
(baut sauber auf `main` `6c835d0` auf, der zuvor noch nicht auf `origin` war —
selbst nachgeholt). `typecheck`/`lint`/`format:check` grün, `test:coverage`
250/250 grün (Coverage src/sim 98,40 %), `build` grün. CI + Pages Preview auf
GitHub beide `success` (Läufe `33864262067`/`33864262393`).

Diff gelesen (`collision.ts`, `collision-verbindungsgraben.test.ts`,
`collision.test.ts`, `ARCHITEKTUR.md`) — das ist die Wurzelursache, kein
Pflaster: die achsenweise AABB-Auflösung hatte keinen Begriff davon, *welche*
Durchdringung ihre eigene Bewegung verursacht hat, und hat jeden Rest (auch
einen 2e-16-m-Gleitkomma-Rest) als echte Kollision an die nächstgelegene
Fläche der Box gelöst — bei der 33 m langen Grabenwand meterweit entfernt. Die
Tiefengrenze `|Δ_achse| + KONTAKT_EPS` je Achse ist die richtige Antwort: sie
implementiert die im Ticket vorgeschlagene Plausibilitätsgrenze strukturell
(nicht als nachträgliches Clamping, das den eigentlichen Fehler nur versteckt
hätte) und behebt nebenbei dieselbe Bugklasse in der Y-Achse (Wandkontakt
hätte die Kapsel auf die Wandkrone gehoben), die im Feld noch nicht
aufgefallen war. Genau die Art Fix, die AP4-06 vorgemacht hat: Ursache vor
Symptom.

Besonders überzeugend: die **Gegenprobe gegen den alten Code** (`git stash`
nur `collision.ts`, 14 von 30 neuen Tests rot) beweist, dass die neuen Tests
den ursprünglichen Bug tatsächlich fangen — nicht nur grün beim neuen Code.
Golden-Anker sauber behandelt: `moveCapsule` ist global (auch für Gegner),
das wurde erkannt und **explizit** gegengecheckt statt stillschweigend
angenommen — alle drei Anker liefern identische Werte, zusätzlich die
Golden-Skripte unter dem alten Code mit Sprung-Logging nachgespielt, um zu
zeigen, dass diese konkreten Läufe nie Wandkontakt hatten (keine
Neubaselinierung nötig).

Die bewusst in Kauf genommene Kehrseite (eine tief in einer Box startende
Kapsel wird nicht mehr herausgeschoben) ist sauber begründet und nach
aktuellem Stand nicht erreichbar (Spawns frei, `rueckerobern` ohne
Tastenbindung, Nav-Knoten per Begehbarkeitstest geprüft) — akzeptiert, in
`ARCHITEKTUR.md` dokumentiert.

**Der Home-Brustwehr-„Vault"-Merkposten** (Feuertritt-Bank → Sprung + Stufen-
Hochsteigen über die Brustwehr aufs Feld) ist vorbestehendes Verhalten, kein
AP5-01-Regress — für AP5-03 (Kartengrenze/Gelände) vorgemerkt, siehe unten.

Organisatorisches: `main` (`6c835d0`) war beim Kickoff noch nicht auf
`origin` — jetzt gepusht, `arbeitspaket-5` bleibt sauber. CI-Node-Deprecation-
Hinweis (Actions auf Node 20, GitHub erzwingt Node 24) notiert für den
Infrastruktur-Backlog, nicht blockierend.

**Manueller Spieltest im Browser steht noch aus** (der Worker konnte in
dieser Session nicht spielen) — headless-Nachweis ist stichhaltig genug fürs
grüne Licht, der Browser-Check läuft im nächsten Spieltest mit den anderen
AP5-Tickets zusammen.
