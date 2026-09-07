# AP5-06 — Gegner-Klassen: Normal / Schnell-Schwach / Langsam-Stark (Nachzügler zu AP5)

**Status:** erledigt · `e878a64` · reviewed 2026-09-07
**Arbeitspaket:** 5 (Nachzügler) · **Branch:** `arbeitspaket-5` (von `main`)
**Referenz:** Dritter Spieltest (Anspielen) 2026-09-04 (Nutzer-Feedback),
`KONZEPT.md` §5 (Gegner-Roster — die *volle* Ausbaustufe mit KI-Rollen bleibt
`BACKLOG.md`/AP6+, hier NICHT gemeint), `src/data/gegner.ts` (`gegnerDefs`),
`src/data/schema.ts` (`EnemyDef`), `src/sim/wave.ts` (Spawn-Queue,
`STANDARD_GEGNER`), `src/sim/index.ts` (`spawnEnemyById`), `src/render/index.ts`
(`makeEnemyVisual`, Gegner-Material).

## Ausgangslage

Bisher gibt es genau einen Gegnertyp (Linieninfanterie, `src/data/gegner.ts`),
identisch in Tempo/HP/Schaden bis auf den AP5-04-Tempo-Jitter (±15 %, reiner
Zufall, keine Varianten). Nutzer-Feedback: mehr Abwechslung würde helfen —
konkret vorgeschlagen als 2–3 einfache Klassen statt neuer KI-Verhalten:
**normal**, **schnell, aber schwächer**, **langsam, aber stärker**.

## Ziel

Drei `EnemyDef`-Varianten der Linieninfanterie (gleiches Verhalten,
unterschiedliche Werte + Erkennbarkeit), zufällig gemischt in den Wellen.
Ausdrücklich **keine** neue KI-Rolle/kein neues Bewegungs- oder
Angriffsverhalten (das bleibt `verhaltensTag: "feuer-und-bewegung"` /
AP2-Nahkampf wie bisher) — nur Statistik-Varianten des bestehenden Gegners,
wie beim Nutzer angefragt. Der volle Roster-Ausbau mit eigenen KI-Rollen
(Charger/Suppressor/Disruptor) bleibt explizit spätere Arbeit.

## Umsetzung

**Daten** (`src/data/gegner.ts`): zwei weitere `EnemyDef`-Einträge neben
`linieninfanterie`, z. B. `id: "linieninfanterie-schnell"` (Tempo hoch,
HP/Schaden niedriger) und `id: "linieninfanterie-schwer"` (Tempo niedrig,
HP/Schaden höher) — Ausgangswerte relativ zur Basis (`tempo: 1, hp: 100,
schaden: 10`), z. B. schnell ≈ `tempo 1.5, hp 70, schaden 7`, schwer ≈
`tempo 0.65, hp 160, schaden 16` (Platzhalter wie alle Balance-Zahlen im
Projekt, im Spieltest justieren). Alle drei in `gegnerDefs` registrieren.
**Wichtig:** nicht zu schnell (Nutzer-Hinweis) — die schnelle Klasse soll
spürbar, aber nicht unfair schnell sein; bei `BASIS_TEMPO = 2,6 m/s`
(`enemies.ts`) und Spieler-Sprint 7 m/s bleibt deutlich Luft.

**Wave-Director** (`src/sim/wave.ts`): `STANDARD_GEGNER`-Konstante ersetzen
durch eine gewichtete Auswahl über die drei Ids (z. B. 60 % normal, 20 %
schnell, 20 % schwer — Platzhalter-Gewichte), gezogen aus dem bestehenden
Director-`Rng` (`ctx.rng`, goldene Regel: kein neuer globaler Zufall). Sowohl
Hauptwellen- als auch Reservewellen-Spawns nutzen dieselbe Auswahl.

**Render** (`src/render/index.ts`, `makeEnemyVisual`/Gegner-Material):
minimale visuelle Unterscheidung, damit die Klassen im Spiel erkennbar sind
(kein neues Modell nötig, reines Greybox-Niveau) — z. B. Materialfarbe je
`defId` (dezente Tönung, nicht grell) oder Kapsel-Radius/-Höhe leicht
skaliert. Sollte klar genug sein, dass ein Spieler mit etwas Übung "das ist
der schnelle" erkennt, ohne die HP-Balken-Anzeige zu ersetzen.

## Akzeptanzkriterien

- Drei Gegner-Varianten existieren als `EnemyDef`, mit klar unterschiedlichen
  Tempo-/HP-/Schaden-Werten (schnell = spürbar schneller aber schwächer,
  schwer = spürbar langsamer aber stärker als normal).
- Wellen mischen alle drei Klassen (Test: über eine ausreichend große
  Spawn-Stichprobe kommen alle drei Ids vor, Verteilung ungefähr im Rahmen
  der gewählten Gewichte).
- Visuell im Spiel unterscheidbar (Screenshot/Beschreibung im Bericht).
- Bestehendes Bewegungs-/Nahkampfverhalten (`enemies.ts`) unverändert — nur
  `def.tempo`/`def.hp`/`def.schaden` wirken unterschiedlich, keine neue
  Verzweigung nach Gegnertyp in der Bewegungslogik.
- Golden-/Replay-Anker: durch die neue Zufallsziehung (welche Klasse spawnt)
  wahrscheinlich erneut betroffen — wie in AP5-04 bewusst neu baselinieren,
  mit Begründung direkt am Test, keine stillschweigende Anpassung.

## Ausdrücklich NICHT in diesem Ticket

Neue KI-Rollen/-Verhalten (Charger/Suppressor/Disruptor, `BACKLOG.md`) ·
Fernkampf-Gegner · echte 3D-Modelle/Texturen · Elite-/Konter-Härte-System
(§5 „nur Spreng/AT") · Tag/Nacht · Balancing der Front-/Bresche-/Uhr-Zahlen.

## Bericht — AP5-06

COMMIT: <Hash in der Nachricht an die Planer-Session> (Branch `arbeitspaket-5`)
CI: <Status in der Nachricht an die Planer-Session>
TODO(Rückfrage): keine im Code — drei Merkposten für den Spieltest / die
Politur, siehe unten.

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  26 Dateien, 296 Tests (vorher 284)
    Coverage src/sim: 98,59 % Stmts / 96,84 % Branch / 100 % Funcs / 98,59 % Lines
    wave.ts 100 · enemies.ts 97,73 · index.ts 98,55
> vite build                       ✓  dist/assets/index-*.js 6.908,9 kB │ gzip 1.533,5 kB
```

Tests: 296 (26 Dateien, +12 — `gegner.test` 3 neu, `wave.test` +5,
`gegner-klassen.test` 4 neu) · Coverage src/sim **98,59 %** (vorher 98,58 %) ·
Bundle ~6,91 MB / ~1,53 MB gzip (Δ +1,0 kB roh — zwei Defs, Klassenwahl,
Farbtabelle).

**Golden-Anker:** die beiden Wave-abhängigen Anker (Inline-Anker Seed
20260903, Nav-Anker Seed 40404) sind **bewusst neu baseliniert**, der
Uhr-Anker ist unverändert (kein Director im Spiel). Begründung als Kommentar
direkt am `expect()` und in Entscheidung 6; die Gegenprobe unten zeigt, dass
die Verschiebung allein aus den verbrauchten Director-Würfen kommt.

### Umsetzung

**(a) Daten** (`src/data/gegner.ts`): zwei weitere `EnemyDef`s neben der
Basis, alle drei in `gegnerDefs` unter ihrer Id.

| Klasse | Id | Tempo | HP | Schaden | Treffer bis zum Tod (M98, Welle 1–4) |
|---|---|---|---|---|---|
| normal | `linieninfanterie` | 1 | 100 | 10 | 2 (unverändert) |
| schnell, schwach | `linieninfanterie-schnell` | **1,5** | **60** | **7** | **1** |
| langsam, stark | `linieninfanterie-schwer` | **0,65** | **180** | **16** | **3** |

Gleicher `verhaltensTag`, `mode`, `konterHaerte` — reine Statistik-Varianten.
Mit dem Wellen-HP-Faktor (+12 % je Welle) kippt schnell erst in Welle 5 auf
2 Treffer, schwer in Welle 5 auf 4; normal bleibt bis Welle 6 bei 2. Alle
Zahlen Platzhalter fürs Spieltest-Tuning.

**(b) Wave-Director** (`src/sim/wave.ts`): `STANDARD_GEGNER` ist weg.
`GEGNER_MISCHUNG` (60 / 20 / 20, exportiert) und `waehleGegner(rng)` ziehen je
geplantem Gegner **einen** Wert aus dem Director-Rng (`ctx.rng`) — beim
Planen der Hauptwelle (`starteWelle`, bekommt jetzt den Rng) und beim Füllen
der Reserve-Queue, beide aus derselben Mischung. `SpawnPlan.defId` trägt damit
die echte Klasse. Der bisherige HP-Faktor ist als `wellenHpFaktor(welle)`
exportiert (Reserve = Stufe über der letzten Hauptwelle, wie vorher).

**(c) Renderer** (`src/render/index.ts`): `makeEnemyVisual(defId)` legt je
Gegner die Klassen-Tönung fest — Feldgrau (0,34/0,36/0,31, unverändert) ·
Sand (0,60/0,54/0,34) für schnell · dunkles Blaugrau (0,20/0,21/0,26) für
schwer; unbekannte Ids fallen auf Feldgrau zurück. Im Angriff wird die
Klassenfarbe halb zum bisherigen Rotbraun gemischt (`Color3.Lerp`), das rote
Glühen (emissive) bleibt wie bisher. Kapselgröße unverändert (Entscheidung 5).

**(d) Sim**: `enemies.ts` ohne Logikänderung — `def.tempo`/`def.hp`/
`def.schaden` wirkten dort schon immer, es gibt keine Verzweigung nach Klasse.
Nur `BASIS_TEMPO` (enemies.ts) sowie `WALK_SPEED`/`SPRINT_SPEED` (index.ts)
sind jetzt exportiert, damit die Tests die Tempo-Garantien gegen die echten
Konstanten prüfen statt gegen Duplikate.

**(e) Doku:** `src/ARCHITEKTUR.md` — Renderer-Absatz (Tönung je `defId`) und
AP5-06-Eintrag unter „Boxhead-Kern (AP5)".

### Messung (headless, idealisierter Schütze wie in AP5-04, Seeds 1–40)

Derselbe Simulator wie in AP5-04 (stehender Schütze im Frontgraben A, zielt,
feuert alle 1,6 s), einmal auf `4cddcee` (Worktree) und einmal mit den
Klassen. Seeds 1–3 im Detail, 1–40 als Statistik:

| | vorher (`4cddcee`) | nachher |
|---|---|---|
| Klassenanteile (Seeds 1–3) | 100 % normal | **57–63 / 19–22 / 18–22 %** |
| Marschzeit Spawn→Front, Median | 15,5–16,9 s | normal 15,2–16,9 · **schnell 10,1–11,2** · **schwer 22,0–25,0 s** |
| Treffer bis zum Tod (Welle 1) | 2 | 2 · **1** · **3** |
| Hauptwellen | 5·8·11·14·17 | 5·8·11·14·17 (unverändert) |
| gewonnen | 40/40 | 40/40 |
| max. gleichzeitig lebend | 13–20 (Median 16) | 14–20 (Median 16) |
| Kontaktanteil an der Front | 60–80 % (Median 68) | 55–80 % (Median 72) |
| Einsatzdauer | 6,4–9,1 min (Median 7,5) | 6,3–11,1 min (Median 7,9) |
| Watchdog-Despawns | **0** in 40 Seeds | **1** in 40 Seeds (Seed 35, Merkposten 2) |
| Tode des stehenden Schützen, Summe / Median / Max | 707 / 9,5 / 43 | 708 / 13,5 / 54 |

Die Eskalation aus AP5-04 bleibt unangetastet; die Klassen ziehen jede Welle
zeitlich auseinander (Vorausabteilung ~5 s vor der Kette, die Schweren ~7 s
danach), deshalb steigt der Kontaktanteil leicht und die Einsätze dauern
etwas länger. Die Tode des **stehenden** Schützen sind in beiden Ständen von
der Respawn-Spirale dominiert (Respawn am Front-Spawn mitten in den Gegnern,
AP5-04-Merkposten): welche Seeds kippen, ist chaotisch (vorher Seeds 6/7/8
mit 40–43 Toden, nachher Seeds 10/24 mit 52/54), die Summe über 40 Seeds ist
identisch. Varianten der schweren Klasse (Schaden 12, HP 160), Gewichte
70/15/15 und schnell mit Tempo 1,4 über Seeds 1–8 gemessen: keine Variante
ändert das Bild (Summen 123 / 138 / 99 / 174 gegen 138 Basis, 151 vorher),
deshalb bleiben die Ticket-Werte.

### Tests

- **`src/data/gegner.test.ts`** (neu, 3): alle drei Klassen registriert ·
  gleiches Verhalten (Tag, weich, `feuer-und-bewegung`) · schnell ≥ +25 %
  Tempo und schwächer, schwer ≤ −25 % Tempo und stärker („spürbar").
- **`src/sim/wave.test.ts`** (+5): Mischung nennt drei registrierte Ids mit
  positiven Gewichten, Basis ≥ 50 % (eine unbekannte Id würde
  `spawnEnemyById` still verwerfen — die Welle käme nie voll) ·
  `waehleGegner` verteilt gewichtet (6000 Ziehungen, ±3 %-Punkte) und
  deterministisch · Hauptwellen 1–3 spawnen alle drei Klassen bei vollen
  Queues · Reservewellen ziehen aus derselben Mischung mit HP-Faktor eine
  Stufe über der letzten Hauptwelle · `wellenHpFaktor`.
- **`src/sim/gegner-klassen.test.ts`** (neu, 4): Treffer-Tabelle 2 · 1 · 3
  mit dem M98 in den Wellen 1–4 · **Tempo-Bänder überlappen nicht** (auch mit
  ±15 % Streuung ist jede schwere langsamer als jede normale, jede normale
  langsamer als jede schnelle — die Klasse ist am Gang ablesbar) · **fair:**
  die schnellste schnelle (4,49 m/s) holt einen gehenden Spieler
  (`WALK_SPEED` 4,5) nicht ein · **gemischte Welle auf dem echten Sektor:**
  17 Gegner (7/5/5, Streuung neutral) kommen alle ohne Watchdog-Eingriff an,
  Marsch-Median schnell < normal − 3 s < schwer − 4 s, die langsamste schnelle
  ist vor der schnellsten schweren da.
- `src/sim/wave-eskalation.test.ts`: der Einsatz-Test zählt jetzt zusätzlich
  die Klassen — alle drei kommen vor, jede ≥ 10 %, Basis ≥ 40 %. Wellen
  5·8·11·14·17, Peak ≥ 12, 0 Despawns, gewonnen bleiben wie in AP5-04.
- `src/sim/sim.test.ts`: zwei Anker neu baseliniert (Entscheidung 6), beide
  prüfen jetzt zusätzlich die Klassenfolge der gespawnten Gegner.
- **Gegenprobe** (Worktree auf `4cddcee` + alle geänderten Dateien, darin
  `waehleGegner` so gestubbt, dass es **ohne Rng-Wurf** immer die Basis
  liefert): beide Anker liefern exakt die **alten** Werte (148/2 Gegner,
  145/5 Gegner, Positionen −2,946/34,918 und −4,161/43,1) — die Neubaseline
  erklärt sich vollständig aus der zusätzlichen Ziehung, keine andere Regel
  hat sich bewegt. Im selben Worktree sind genau die Misch-Tests rot
  (Verteilung, Hauptwellen, Reservewellen, Klassenanteile im Einsatz-Test —
  6 rot / 54 grün); Daten- und Werte-Tests bleiben grün, weil sie die Ziehung
  nicht brauchen.

### Entscheidungen / Abweichungen vom Ticket

1. **HP 60 / 180 statt „≈ 70 / 160".** Mit dem Langgewehr (85 Schaden) ist
   „schwächer/stärker" nur als Trefferzahl spürbar: 70 HP wären ab Welle 3
   wieder 2 Treffer wie normal, 160 HP in Welle 1 ebenfalls 2. Mit 60 / 180
   heißt es bis Welle 4 durchgängig 1 · 2 · 3 Treffer (Tabelle oben, Test).
2. **Tempo 1,5 / 0,65 wie im Ticket.** Die Sorge „nicht zu schnell" ist
   quantifiziert: selbst mit +15 % Streuung bleibt die schnelle Klasse unter
   dem Gehtempo des Spielers (4,49 < 4,5 m/s) und Sprint hat 7 m/s; die
   Tempo-Bänder der drei Klassen überlappen nicht (Test). 1,4 ausprobiert —
   kein Vorteil in der Messung, weniger spürbar.
3. **Klasse beim Planen der Queue** (`starteWelle`, Reserve-Füllung) statt
   beim Spawn gezogen: ein Wurf je geplantem Gegner, `SpawnPlan.defId` bleibt
   „was kommt", Tests können die Queue direkt prüfen. Gleicher Rng wie
   Spawnpunkt und Jitter — kein neuer Strom (Ticket-Vorgabe).
4. **Gewichte 60 / 20 / 20** wie vorgeschlagen, exportiert als `GEGNER_MISCHUNG`
   (Stellschraube fürs Spieltest-Tuning, ein Ort). Die Mischung greift ab
   Welle 1 — eine „Lehr-Welle" nur mit Normalen wäre eine Regel, die das
   Ticket nicht nennt (Merkposten 3).
5. **Farbe statt Kapselgröße.** Eine skalierte Kapsel hätte Hitbox und
   Sichtbares auseinanderlaufen lassen (Schüsse, die den Rand treffen, gehen
   in der Sim vorbei — oder umgekehrt). Die Tönungen sind dezent, aber im
   Screenshot auf 3–10 m eindeutig; im Angriff dominiert wie bisher das rote
   Glühen, die Helligkeitsstufe (hell / mittel / dunkel) bleibt lesbar.
6. **Golden-Anker neu baseliniert** (`sim.test.ts`, Kommentar am Test):
   Inline-Anker `angriffskraftRest` 148 → **147**, `enemies.length` 2 → **3**
   (verschobene Jitter-Würfe: im 6-s-Fenster drei Spawns), Klassenfolge
   normal/schwer/normal. Nav-Anker: Angriffskraft 145, fünf Gegner,
   Abschnitte C/B/C/A/B und Zielknoten **unverändert** (eigener Rng-Strom),
   Klassenfolge schwer/schnell/normal/schwer/normal, Positionen der Gegner 0
   und 3 neu (Nr. 0 ist jetzt schwer und nach 10 s bei z 38,4 statt 34,9; der
   verschobene Strom wählt andere Spawnpunkte). Uhr-Anker 148/149 unverändert.
   Gegenprobe siehe Tests.
7. **Kleine Export-Erweiterungen** für Tests (`BASIS_TEMPO`, `WALK_SPEED`,
   `SPRINT_SPEED`, `wellenHpFaktor`, `GEGNER_MISCHUNG`, `waehleGegner`) statt
   Konstanten-Duplikaten in Testdateien (Audit-Medium „Konstanten-Duplikate").
8. **Nicht angefasst:** Bewegungs-/Nahkampflogik (`enemies.ts`), `einsatz.ts`,
   `front.ts`, HUD, F3, Lagekarte, Waffe, `sektor.ts`.

### Manuell geprüft (`npm run dev`, headless Chromium via Playwright)

Zwei temporäre Prüfseiten im Vite-Root (nicht committet): eine **Aufstellung**
(echte Sim + Renderer, je Klasse ein Gegner nebeneinander quer im Frontgraben
A vor dem Spieler, ein Tick zum Blickdrehen, dann Standbild) und der
**Einsatz mit Schützen** aus AP5-04 (Sim ×3), erweitert um die Klassen im
Blickfeld. 0 Konsolenfehler, fps 42–51 (SwiftShader). Bilder in
`tickets/erledigt/AP5-06-screenshots/`:

| Bild | Befund |
|---|---|
| `01-aufstellung-5m.png` | links Sand (schnell), Mitte Feldgrau (normal), rechts dunkles Blaugrau (schwer), 5 m, Anmarsch — drei klar verschiedene Tönungen, alle mit vollem HP-Balken |
| `03-aufstellung-3m-anmarsch.png` | dasselbe auf 3 m |
| `04-angriff-nach-90-ticks.png` | alle drei im Angriff auf Nahkampfdistanz: rotes Glühen dominiert, die Stufe hell / mittel / dunkel bleibt erkennbar (Spieler nimmt Schaden, 50/100) |
| `13-welle4-sim135s-li+schnell+schwer.png` | echter Einsatz, Welle 4, F3 „gegner 13 lebend": eine sandfarbene Vorausabteilung 5,8 m vor dem Spieler im Graben, Kette dahinter; `browser-check-log.txt` listet je Messpunkt die Klassen im Blickfeld |

Einsatz-Lauf: Wellen `[5, 8, 11, 14, 17, 10]`, Peak 14, 0 Despawns, gewonnen
nach 436 s Sim-Zeit — deckungsgleich mit dem Sim-Test (deterministisch).
Nicht headless prüfbar: ob die Tönungen auf echter Hardware mit Dunst auf
20–40 m noch unterscheidbar sind und ob 1,5 „unfair schnell" wirkt — dafür
der Spieltest; Stellschrauben: `tempo`/`hp`/`schaden` in `gegner.ts`,
Gewichte in `GEGNER_MISCHUNG`, Farben in `ENEMY_KLASSEN_FARBE`.

### Merkposten (nicht in diesem Ticket)

1. **Respawn-Spirale** (AP5-04-Merkposten, jetzt mit Zahlen): der stehende
   Schütze stirbt in ~1 von 5 Seeds 40–54× — vorher wie nachher. Ursache
   ist der Respawn am Front-Spawn mitten in der Welle, nicht die Klassen;
   der Respawn-Punkt an der Home-Line bleibt der konsequente Fix.
2. **Ein Watchdog-Despawn in 40 Seeds** (Seed 35, Welle 5, alle Fronten
   verloren): ein schwerer C-Gegner, der die Home-Line erreicht hat, navigiert
   (AP5-04-Fix 3) zurück zum Spieler an der Front, bleibt an der Rampe neben
   Graben A bei (−14,3 | 11,1) an der Parados hängen und despawnt beim dritten
   Hänger **sofort**, weil `festVersuche` nie abklingt (AP5-04-Merkposten).
   Gleicher Mechanismus bei zwei Schweren in der 70/15/15-Variante (Seed 7,
   Welle 6, Bresche-A-Bereich). Kein Klassen-Mechanismus — die Schweren leben
   nur länger und sammeln mehr Eingriffe. Politur: `festVersuche` abklingen
   lassen; Angriffskraft wird zurückgeschrieben, der Einsatz endet trotzdem
   gewonnen.
3. **Lesbarkeit der Klassen:** F3 könnte die Lebenden je Klasse zählen;
   Welle 1 könnte als „Lehr-Welle" nur Normale bringen; die Angriffs-Tönung
   könnte die Klassenfarbe stärker durchlassen (heute 50 % Rotbraun). Alles
   Spieltest-Fragen.

## Review — AP5-06 · 2026-09-07

**Grünes Licht — damit ist der aktuell bekannte AP5-Umfang fertig.**

Lokal nachvollzogen: `git pull` auf `arbeitspaket-5`, `typecheck`/`lint`/
`format:check` grün, `test:coverage` 296/296 grün (Coverage src/sim
98,59 %), `build` grün. CI + Pages Preview auf GitHub beide `success`.

Diff gelesen (`gegner.ts`, `wave.ts`, `enemies.ts`/`index.ts`-Exports,
`render/index.ts`, `sim.test.ts`). Genau im vorgegebenen Rahmen geblieben:
drei reine Statistik-Varianten (gleicher `verhaltensTag`, keine neue
Verzweigung in `enemies.ts`), `waehleGegner()` ist eine saubere gewichtete
Ziehung aus dem bestehenden Director-Rng (kein neuer Zufallsstrom), Farbe
statt Kapselgröße für die visuelle Unterscheidung war die richtige
Entscheidung — eine skalierte Hitbox hätte Sichtbares und Kollision
auseinanderlaufen lassen, genau das Risiko, das die Begründung benennt.

Die HP-Korrektur (60/180 statt der im Ticket vorgeschlagenen ≈70/160) ist
ein gutes Beispiel für „Vorschlag hinterfragen, wenn die Zahlen die
eigentliche Absicht nicht tragen": mit dem tatsächlichen Waffenschaden (M98,
85) wären 70 HP ab Welle 3 wieder zwei Treffer wie normal gewesen — die
Trefferzahl-Tabelle (1·2·3 bis Welle 4) ist konkret nachgewiesen, nicht nur
behauptet. Die Tempo-Sorge des Nutzers ("nicht zu schnell") ist ebenfalls
quantifiziert statt nur eingehalten: die schnellste Ausprägung bleibt mit
Streuung unter Gehtempo.

**Golden-Anker:** beide Wave-Anker erneut bewusst neu baseliniert, mit
Kommentar direkt am Test und einer Gegenprobe, die `waehleGegner` auf "immer
Basis" stubbt und zeigt, dass dann exakt die alten Werte herauskommen — das
isoliert die Ursache der Verschiebung sauber auf die neue Ziehung, keine
andere Regel hat sich mitbewegt. Genau die Sorgfalt, die ich hier sehen
will, und mittlerweile ein verlässliches Muster über AP5-04/06.

**Die 40-Seed-Messung** mit demselben Simulator wie AP5-04 ist wieder der
richtige Maßstab für ein Balance-Ticket: 40/40 gewonnen, Eskalation aus
AP5-04 unangetastet (Wellen unverändert), Klassenanteile im erwarteten
Rahmen. Der eine zusätzliche Watchdog-Despawn (1/40 statt 0/40) ist sauber
erklärt (schwere Gegner leben länger, sammeln eher die drei Watchdog-
Eingriffe, `festVersuche` klingt nie ab — bekannter AP5-04-Merkposten, kein
neuer Mechanismus) und zu Recht nicht in diesem Ticket gefixt.

Screenshot `01-aufstellung-5m` selbst angeschaut: drei klar unterscheidbare
Tönungen (Sand/Feldgrau/Dunkelblau) nebeneinander, alle mit vollem
HP-Balken — deckt sich exakt mit der Beschreibung.

Ticket archiviert (`tickets/erledigt/AP5-06-gegner-klassen.md`). Damit ist
der aktuell bekannte Umfang von Arbeitspaket 5 (inkl. Nachzügler AP5-05/06)
fertig — als Nächstes der eigentliche dritte Spieltest über mehrere Wellen.
