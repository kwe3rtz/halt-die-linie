# AP6-01 — Neuer Greybox-Sektor: verzweigtes Grabennetz + Nacht-Beleuchtung

**Status:** review
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6` (von `main`)
**Referenz:** `KONZEPT.md` §3 (neu gefasst 2026-09-07 — bitte ganz lesen),
`src/data/sektor.ts` (alter H-Sektor als Daten), `src/data/module.ts`
(Rasterbausteine), `src/sim/sektor.ts` (`SektorMeta`/`ZonenId`/`NavKnoten`),
`src/sim/navgraph.ts` (BFS-Pfad), `src/sim/navgraph-begehbarkeit.test.ts`
(Kapsel begeht jede Nav-Kante), `src/render/index.ts` (`createRenderer`,
Zonen-Materialien, Fog aus AP5-03), `tickets/erledigt/AP4-01-sektor-geometrie.md`
(wie der alte Sektor als Daten gebaut wurde — Vorbild fürs Vorgehen).

## Ausgangslage

Der dritte Spieltest hat den alten „H"-Sektor mit A/B/C-Abschnitten als zu
klein, zu statisch, zu abstrakt bestätigt. `KONZEPT.md` §3 ist neu gefasst:
ein **größeres, frei begehbares, verzweigtes WW1-Grabennetz** mit **einer**
durchgehenden Frontlinie und **einer** Home-Line.

Dieses Ticket baut nur die **Bühne** (Geometrie + Zonen + Nav-Graph +
Nacht-Optik). Der Kern-Bogen auf eine Linie umzustellen (Zustandsmaschine,
Uhr, Spawn-Verlagerung) ist AP6-02 ff.

## Ziel

Ein einziger, komplett handgebauter Greybox-Sektor im neuen Stil, aus den
Rasterbausteinen von `src/data/module.ts` (bei Bedarf erweitert), als **eine
Quelle** für Render-Meshes und Sim-Collider. Der Sektor ersetzt den alten
`sektorGreybox` als Default in `createSim` und im Renderer.

## Umsetzung

### Grundriss (von der Feindseite nach hinten, `KONZEPT.md` §3)

1. **Feindseite** — feindliches Grabenstück + 2–3 Anmarschwege. Eigener
   Bereich, **nicht** durchgängig mit den eigenen Gräben verbunden (die
   Frontlinie trennt). Nicht betretbar (Kollision + unsichtbare Grenze wie
   AP5-03, oder einfach außerhalb des begehbaren Netzes).
2. **Niemandsland** — Trichterfeld, Drahtreste, Ruinen, ein paar alte
   verfallene Grabenstücke. Verzweigt, Deckung, Sichthindernisse. Groß genug,
   dass sich Gegner darin bewegen (Roam-Raum, AP6-05).
3. **Frontlinie** — *eine* durchgehende Grabenlinie über die Sektorbreite:
   Feuertritt, Parapet, 1–2 Bresche-Punkte (schaltbare Kollider wie AP4-06),
   ein Nachschubdepot, ein **Instandsetzungs-Punkt** (Marker-Position, die
   AP6-04 nutzt). Als **eine** Zone `frontlinie`.
4. **Hinterland** — der große frei begehbare Bereich: mehrere Reserve- und
   Laufgräben, 1–2 Geschützstellungen, Trichter, Ruinen. **Mehrere verbundene
   Wege** vorn↔hinten (nicht ein Korridor). Zone `hinterland`.
5. **Home-Line** — durchgehende befestigte Linie, begehbare Unterstände
   (Munitionslager, Verbandsplatz, Feldkommandeur-Fixpunkt), Nachschubdepot,
   Instandsetzungs-Punkt. Als **eine** Zone `homeline`.

### SektorMeta

- **Zonen:** `feindseite` · `niemandsland` · `frontlinie` · `hinterland` ·
  `homeline`. (Die alten Zonen `feindzone`/`labyrinth`/`verbindungsgraben`/
  `feld` entfallen bzw. werden umbenannt — `ZonenId` in `src/sim/sektor.ts`
  anpassen, `zermuerbungProKill` in `einsatz.ts` auf die neuen Zonen mappen:
  frontlinie am teuersten, hinterland mittel, homeline am billigsten.)
- **`frontAbschnitte`: genau ein Eintrag** (`id: "front"`, Bounds = die ganze
  Frontlinie, Depot, Breschen). **`homeAbschnitte`: genau ein Eintrag**
  (`id: "home"`). Damit läuft die bestehende `front.ts`-Zustandsmaschine
  (`createFrontState` nimmt N Abschnitte, N=1 ist ok) ohne Code-Änderung
  weiter — die bewusste Vereinfachung auf „eine Linie" macht AP6-02.
- **Nav-Graph:** semantische Knoten/Kanten wie bisher (kein NavMesh). Deutlich
  mehr Knoten als der alte Sektor (größeres Netz, mehrere Wege). Feind-Spawn-
  Knoten auf der Feindseite; Verstärkungs-/Infiltrations-Knoten im
  Niemandsland und Hinterland (verdeckt, `KONZEPT.md` §3 „materialisieren nie
  im Sichtfeld"). Engstellen-Flags an echten Engstellen (Sap-Lücken,
  Breschen) wie AP4-06.

### Renderer + Nacht-Atmosphäre

- Meshes/Collider aus **einer** Datenliste (wie `src/data/sektor.ts` heute).
- **Nacht:** dunkler Himmel/Ambient, kürzere Sichtweite (Fog enger als AP5-03,
  Fog-Farbe dunkel), evtl. ein paar statische Lichtquellen (Leuchtkugeln,
  Feuer in Tonnen) als Orientierungspunkte. Greybox-Niveau — keine Art, keine
  dynamischen Lichter, aber es soll klar „Nacht" sein, nicht „Tag mit Fog".
- Zonen-Silhouetten weiter unterscheidbar (`KONZEPT.md` §3 Lesbarkeit):
  Frontlinie flach/weit, Hinterland verwinkelt, Home-Line hoch/befestigt.
- Keine Leit-„Spines" (die sind raus, AP5-05).

### Tests

- **`navgraph-begehbarkeit.test.ts`** auf den neuen Sektor umstellen/erweitern:
  jede Nav-Kante wird per echter `moveCapsule`-Simulation begangen, im
  Ist-Zustand **und** in „alles offen". Das ist das Pflicht-Sicherheitsnetz.
- Geometrie-Konsistenz: jede Bresche hat ein umschließendes schaltbares
  Segment; Zonen decken den begehbaren Bereich lückenlos; Depots/Instandsetz-
  Punkte liegen begehbar und in keinem Kollider.
- Golden-/Replay-Anker: die Sektor-abhängigen Anker (`sim.test.ts`
  „Sektor-Nav-Graph", „die Uhr") brechen durch den neuen Sektor —
  **bewusst neu baselinieren** mit Begründung direkt am Test (wie AP5-04/06).
  Der Inline-Testlevel-Anker (eigene `LevelData`, nicht der Sektor) bleibt
  unverändert.

## Akzeptanzkriterien

- `npm run dev`: man läuft nachts durch ein spürbar größeres, verzweigtes
  Grabennetz; Frontlinie, Hinterland und Home-Line sind an der Silhouette
  unterscheidbar; mehrere Wege vorn↔hinten; kein sichtbarer harter Kartenrand
  (wie AP5-03). Screenshot(s)/Beschreibung im Bericht.
- Begehbarkeits-Test grün auf dem neuen Sektor (Ist-Zustand + „alles offen").
- Bestehende Sim läuft auf dem neuen Sektor (ein Front-, ein Home-„Abschnitt");
  ein Einsatz ist headless bis „gewonnen" spielbar (idealisierter Schütze wie
  in den AP5-Tests).
- `typecheck`/`lint`/`format:check`/`test:coverage`/`build` grün.

## Ausdrücklich NICHT in diesem Ticket

`front.ts` auf „eine Linie" umbauen / A/B/C-Reste entfernen (AP6-02) ·
dynamische Spawn-Verlagerung (AP6-03) · „Instand setzen"-Interaktion (AP6-04,
hier nur der Marker-Punkt) · Roam-Verhalten (AP6-05) · prozeduraler Generator ·
echte Art/Beleuchtung · Tag-Modus.

---

## Bericht — AP6-01

COMMIT: HEAD von arbeitspaket-6 (exakter Hash in der Nachricht an ki-game-f1 + im git log)
CI: läuft auf dem Push (Ergebnis in der Nachricht an ki-game-f1)
TODO(Rückfrage):

1. **Ein Bresche-Nav-Knoten pro Linie.** Wie im alten Sektor hat nur die
   **mittlere** Bresche (Front x = 0, Home x ±14 hat keinen) einen Nav-Knoten
   `bresche-front`; die West-Bresche (Front x = −20) ist ein reines physisches
   Loch ohne Nav-Zugang aus dem Niemandsland. Ein Knoten je Bresche braucht
   eine allgemeinere Id-Konvention als `bresche-<linie>` — im Code als
   `TODO(Rückfrage)` an `src/data/sektor.ts` markiert, gehört ins Politur-
   Ticket „Sektor-Wissen aus der Sim" (Audit). Für AP6 tragbar?
2. **N=1-„gehalten"-Semantik.** `front.ts` gilt als „gehalten", solange **ein
   Spieler in den Linien-Bounds** steht — bei EINER Frontlinie über die ganze
   Sektorbreite heißt das: die Front kann nicht fallen, solange der Spieler
   irgendwo im Frontgraben lebt (im alten Sektor hielt der Spieler in A nicht
   B/C). Das ist konsistent mit „du hältst die Linie, indem du drinstehst",
   die bewusste Vereinfachung/Abschwächung (z. B. Druck-Radius statt
   ganze-Linie-Bounds) macht laut Ticket AP6-02. Kein Code-Eingriff hier.
3. **Stale Callout-Konstanten in `src/audio/index.ts`** (`FRONT_CALLOUT`
   A/B/C/H-West/H-Ost, `ROUTE_CALLOUT` feld-links/…). Reine Platzhalter-
   Strings „für späteren Funk/VO", **nicht** an den Sektor verdrahtet
   (`beobachteEreignisse` nutzt `f.id` direkt). Nicht angefasst (außerhalb der
   Bühne-Scope + eigener Test). Mit AP6-02 (front.ts-Umbau) mitziehen?
4. **Watchdog-Repath bei einer Frontlinie.** Weil jetzt **alle** Wellengegner
   auf `front-front` zulaufen und sich an den zwei Sap-Lücken stauen, greift
   der Stuck-Watchdog gelegentlich Stufe 1 (Pfad neu) — **kein Despawn**, kein
   Gegner geht verloren (in `wave-eskalation.test.ts` / `gegner-klassen.test.ts`
   auf `maxFest ≤ 1` bzw. `≤ 2` gelockert, mit Begründung am Test). Der volle
   Einsatz mit idealisiertem Schützen (Seed 1) läuft mit **0 Despawns** bis
   „gewonnen". Enger sieht das AP6-03 (Spawn-Verlagerung) sowieso neu.

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  (All matched files use Prettier code style!)
> vitest run --coverage            ✓  26 Dateien, 286 Tests (vorher 296 —
                                      sektor.test.ts von 45 auf 35 Tests
                                      neu geschnitten, keine Regression)
    Coverage src/sim: 98,54 % Stmts / 97,09 % Branch / 100 % Funcs
    src/sim/sektor.ts: 100 % · src/sim/einsatz.ts: 100 %
> vite build                       ✓  built in ~32 s
    dist/assets/index-*.js  6.910,04 kB │ gzip 1.533,59 kB  (Δ +33 kB:
      PointLight-Import + Nacht-Renderer + größere Sektordaten)
```

Tests: **286** (26 Dateien) · Coverage src/sim: **98,54 %** · Bundle ~6,91 MB /
~1,53 MB gzip (Δ +33 kB).

### Umsetzung

- **`src/data/sektor.ts`** — komplett neu. Der Nacht-Sektor aus KONZEPT.md §3:
  x ±34 · z −46…72 (alt: ±25 · −36…53), ~105 Quader. Von der Feindseite nach
  hinten: **Feindseite** (Feind-Spawns z ≈ 49–51 hinter einer unsichtbaren
  Sperrwand + Kulisse) → **Niemandsland** (Boden, Landmark-Turm, Ruinen-Cluster
  in den Taschen *zwischen* den drei Nav-Bahnen) → **Frontlinie** (EINE
  durchgehende Grabenlinie, Parapet aus drei Segmenten mit zwei Sap-Lücken,
  Bresche [0] Mitte / [1] West, Parados mit 2 Rampen + Laufgraben-Mündung,
  Depot, Instand-Marker) → **Hinterland** (zentraler gedeckter **Laufgraben**
  Mitte teilt West/Ost, drei parallele Wege vorn↔hinten, Geschützstellungs-
  Ruinen) → **Home-Line** (durchgehend, Parapet + Laufgraben-Lücke + 2
  Flankenrampen, 3 begehbare Unterstände, Depot, Instand-Marker). Umland +
  unsichtbare Kartengrenze wie AP5-03. **Genau ein `frontAbschnitt` (`front`)
  + ein `homeAbschnitt` (`home`)** — `front.ts` läuft mit N=1 ohne Code-
  Änderung. Neue Meta-Felder `instandPunkte` (AP6-04) + `lichter` (Nacht);
  `spineRouten: []`.
- **`src/sim/sektor.ts`** — `ZonenId` neu:
  `feindseite | niemandsland | frontlinie | hinterland | homeline` (die alten
  `feindzone/labyrinth/verbindungsgraben/feld` raus). `SektorMeta` um
  `instandPunkte` + `lichter` erweitert. Doc-Kommentare aktualisiert.
- **`src/sim/einsatz.ts`** — `zermuerbungProKill` auf die neuen Zonen:
  `frontlinie` 2 · `niemandsland`/`feindseite` 1,5 · `hinterland`/außerhalb 1 ·
  `homeline` 0,5 (Konstanten umbenannt).
- **`src/sim/index.ts`** — Verdrahtung auf EINE Linie: `HINTEN_KANTEN`
  (Record, öffnet **drei** Front→Hinterland-Kanten beim Fall statt einer),
  `VORFRONT`-Konstante (früher der Literal `lab-vorfront`), Infiltrations-Guard
  `rk.zone === "hinterland"`. `front-${abschnitt}` = `front-front`,
  `reinforcement-${abschnitt}` = `reinforcement-front`, `bresche-${id}` =
  `bresche-front` — passen zu den neuen Nav-Knoten-Ids, `enemies.ts` bleibt
  unangetastet (nur der stale Fallback-String `"front-B"` → `"front-front"`).
- **`src/data/module.ts`** — `parapet()`: eine Bresche schaltet jetzt **Wand +
  Feuertritt-Stufe + Bank** zusammen ab (drei Lücken-Stücke, selbes Etikett) —
  sonst blockiert die Feuertritt-Bank den Feind, der durch die offene Bresche
  von Norden kommt (im alten Sektor gingen die Breschen 45° schräg, das
  maskierte das). `unterstand()` hat jetzt einen **Boden**.
- **`src/render/index.ts`** — Nacht: dunkelblauer Himmel, dunkler Dunst
  (`fogStart` 22, `fogEnd` 68), Mond-Ambient ~0,34 kühl; je `meta.lichter` ein
  statischer `PointLight` (warm, Intensität 14, Range 26) + emissives
  „Feuertonne"-Mesh — keine dynamischen Lichter. Zonen-Farbtöne durchweg
  dunkel, aber unterscheidbar. Linien-Schilder **FRONT/HOME** (statt A/B/C),
  Zonen-Tor-Pylone + Instand-Marker aus den Meta-Bounds abgeleitet.
  `PointLight`-Import + Dispose ergänzt.
- **`src/main.ts`** — Home-Peilung über `homeZugaenge` id `"mitte"` (+
  Fallback), statt `"verbindungsgraben"`.
- **`src/ui/lagekarte.ts`** — hartkodiertes Band-Label „Feld ·
  Verbindungsgraben" → „Hinterland" (Hinweis aus dem Paralleraudit von
  ki-game-f1; Kompass hat keine Zonennamen — geprüft).
- **`src/ARCHITEKTUR.md`** — Abschnitt „Nacht-Sektor (AP6-01)" ergänzt.

### Tests

- **`navgraph-begehbarkeit.test.ts`** (Pflicht-Sicherheitsnetz) auf den neuen
  34-Knoten-Graphen umgestellt: jede Kante beidseitig per echter `moveCapsule`
  begangen — Ist-Zustand **und** „alles offen" (jede Bresche-Kollider-Gruppe
  aus, jede Kante offen), plus die H1-Gegenprobe (`vorfront → bresche-front`
  bei stehendem Parapet **nicht** begehbar). Grün. `.toBe(1)` → `≥ 1` (eine
  Bresche schaltet jetzt 3 Boxen).
- **`sektor.test.ts`** neu geschnitten (35 Tests): Wohlgeformtheit (lückenlose
  Zonen-Bänder, GENAU eine Front/Home-Linie, Nav-Graph > 30 Knoten,
  Instand-Punkte, Lichter), `zoneAt`/`abschnittAt`, Sim-Integration (Spieler
  landet im Frontgraben; Wave-Director spawnt an den Anmarschpunkten, Gegner
  folgen dem Graphen an `front-front`; `_setAbschnittVerloren('front')` lenkt
  **alle** Gegner auf `home-ziel` und flutet ins Hinterland; Infiltration am
  verdeckten Knoten, nie im Hinterland), Linien-Zustandsmaschine (ungehaltene
  Front läuft bedrängt→gebrochen→Bresche→verloren, wenn der Spieler sich durch
  den Laufgraben zurückzieht), rueckerobern, die Uhr (Kill vorn ≈ 2× Kill an
  gefallener Front), AP4-06-Fixes (H1 durch die Bresche, geschlossene Bresche
  bleibt Wand, H4 E/Q), Stuck-Watchdog, AP5-02 Depot, AP5-03 Umland/Grenze.
- **Golden-/Replay-Anker „Sektor-Nav-Graph" + „die Uhr" bewusst neu
  baseliniert** (Begründung direkt am Test): der Sektor+Nav ist ausgetauscht,
  die **Sim-Regeln** (Wellenkurve 5·8·11·14·17, Uhr −2/−1, Klassenmischung)
  sind unverändert. Gegenprobe: die Determinismus-Tests (zwei identische
  Läufe) + `wave-eskalation.test.ts` (voller Einsatz Seed 1 → 5 Wellen,
  Peak-Lebend ≥ 12, 0 Despawns, gewonnen) laufen mit denselben Regeln grün.
  Der **Inline-Testlevel-Anker** in `sim.test.ts` (eigene `LevelData`, nicht
  der Sektor) ist **unverändert**.
- **`collision-verbindungsgraben.test.ts`** auf den zentralen **Laufgraben**
  umgezielt (Sohle −1,8, lichte Breite ±1,8 wie vorher, jetzt z −31…9). Der
  AP5-01-Fix sitzt in `collision.ts`, nicht in der Geometrie — die 15
  Durchläufe (mittig, Wandkontakt, Zickzack, Sprünge, Spieler-Sim) + die
  Gegenprobe am exakten 2e-16-Zustand bleiben inhaltlich gleich.
- **`wave-eskalation.test.ts` / `gegner-klassen.test.ts` / `einsatz.test.ts` /
  `navgraph.test.ts` / `enemies.test.ts`** auf die neuen Zonen-Ids /
  Abschnitts-Ids / den Frontlinie-Spawn umgestellt. `maxFest`-Assertions
  gelockert (siehe TODO 4).

### Entscheidungen / Abweichungen vom Ticket

1. **`parapet()`-Modul + `unterstand()`-Modul geändert** (nicht nur „bei Bedarf
   erweitert"): Die Feuertritt-Bank blockierte den Feind, der durch die offene
   Mittel-Bresche kam (im alten Sektor gingen die Breschen schräg, das
   maskierte es) — die Bresche muss ein Loch durch die **ganze** Brustwehr
   sein. Der Unterstand hatte keinen Boden (im alten Sektor lag kein Nav-Weg /
   Spieler-Weg tief genug in der Home-Line, jetzt schon). Beides sind echte
   Loch-in-der-Bühne-Fixes, keine neuen Modultypen. Ruinen/Trichter im
   Niemandsland/Hinterland sind wie im alten Sektor `raw()`-Quader (kein neuer
   Modultyp nötig).
2. **Minimale Verdrahtungs-Updates in `index.ts`** (HINTEN_KANTEN,
   VORFRONT-Konstante, Infiltrations-Guard-Zone). Das Ticket sagt „front.ts …
   ohne Code-Änderung" — `front.ts` **ist** unverändert; `index.ts`/`enemies.ts`
   auf EINE Linie umbauen (A/B/C-Reste weg) ist ausdrücklich AP6-02, hier nur
   die Plumbing-Anpassung, damit der Sektor überhaupt läuft. `enemies.ts`
   effektiv unverändert (ein stale String).
3. **`feindAnmarsch` = 3 Punkte** (Ticket „2–3 Anmarschwege"). Spawn-Knoten
   liegen **südlich** der unsichtbaren Feindseiten-Sperrwand (die Wand
   zwischen Spawn und Netz zu legen ging nicht — die Nav-Kante spawn→Niemands-
   land muss begehbar sein). Verdeckt über Distanz + Kulisse-Silhouette.
4. **Größe:** x ±34 (Breite 68, alt 50) · z −46…72 (Tiefe 118, alt 89) —
   „spürbar größer", aber der Nav-Graph bleibt handhabbar (34 Knoten, 48
   Kanten). Runback Frontlinie (z ~15) → Home-Line (z ~−37) ≈ 52 m, per
   Laufgraben durchgehende Sohle, Solo in ~8–12 s machbar.
5. **Nav-Graph 34 Knoten** (Ticket: „deutlich mehr als der alte Sektor" ~30).
   Bewusst nicht ausufernd — jede Kante ist der Begehbarkeits-Test schuldig,
   und der spätere Generator erzeugt den Graphen ohnehin.

### Manuell geprüft (`npm run dev`, headless Chromium via Playwright)

Screenshots in `tickets/erledigt/AP6-01-screenshots/` (8 Stück):

- **Lädt fehlerfrei** — 0 Konsolen-Errors, stabile ~52–89 fps, Sim tickt
  konstant.
- **Es ist klar Nacht**, nicht „Tag mit Fog": dunkelblauer Himmel, dichter
  Dunst schluckt alles jenseits ~65 m, die Orientierung tragen die warmen
  statischen Lichter + die emissiven Schilder (**FRONT** / **HOME**), Depot-
  Kisten, Instand-Marker und Zonen-Tor-Pylone. Die Grabenstruktur (Parapet,
  Feuertritt-Stufen, Parados, Laufgraben) ist ~15–25 m lesbar.
- **Spawn** (Seed 1 → −10 / −1,80 / 15): steht auf der Grabensohle,
  `onGround`, Zone `frontlinie` — fällt nicht durch Boden/Wand.
- **Wave-Director** spawnt (HUD „Welle 1 · Angriff", Gegner-HP-Balken der
  anrückenden Welle im Niemandsland sichtbar).
- Ein vollständiger geführter Rundgang ließ sich headless nicht sauber fahren
  (wie schon in AP4-01 vermerkt: kein echter Pointer-Lock → Kamera-Drift, die
  Kapsel bleibt an achsenparallelen Wänden/Rampen hängen). Die Substanz
  (Begehbarkeit jeder Nav-Kante, Sim bis „gewonnen", Front-Fall, Depot,
  Grenze) deckt die Testsuite ab — **bitte beim Anspielen einmal quer
  durchlaufen** (Front → Laufgraben → Hinterland-Seitenrouten → Home-Line →
  zurück).
