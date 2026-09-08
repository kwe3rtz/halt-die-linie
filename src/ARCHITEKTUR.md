# Architektur

Babylon.js-Version: **9.23.0** (exakt gepinnt in `package.json`, Paket
`@babylonjs/core` — tree-shakebar, nicht das monolithische `babylonjs`).

Die Codebasis ist in klare Verantwortungsbereiche aufgeteilt: Simulation
(`src/sim`), Renderer (`src/render`), Input (`src/input`), UI (`src/ui`),
Daten/Schema (`src/data`), Persistenz (`src/platform`). `src/main.ts` verdrahtet
alles, `src/loop.ts` taktet.

## Goldene Regel

`src/sim/**` ist eine headless Simulation. Sie darf **nicht** aus `src/render`,
`src/input`, `src/ui` importieren, **nicht** Babylon.js importieren und **keine**
Browser-Globals benutzen (`window`, `document`, `performance`, `Date`,
`Date.now()`, `Math.random()`, `requestAnimationFrame`). Sie erhält alle Eingaben
als Daten — Kommandos, Seed, `dt` — und liefert Zustandsdaten zurück. Der State
wird kopiert/eingefroren herausgegeben, nie als mutierbare interne Referenz.

Der Renderer liest den Sim-State und zeichnet; er fasst Spiellogik nie an.

Diese Grenze ist per ESLint erzwungen (`eslint.config.js`, `overrides` für
`src/sim/**`: `no-restricted-imports` mit `**/render/**`, `**/input/**`,
`**/ui/**`, `@babylonjs/**`, `babylonjs`; `no-restricted-globals`;
`no-restricted-properties`; `no-restricted-syntax` für `Date`). Verstöße sind
Fehler, kein Stilproblem. Siehe auch `../TECHNIK.md`.

## Loop-Ansatz

Fester Timestep (`FIXED_DT = 1/60`), entkoppelt von der Render-Rate, über einen
Akkumulator (`src/loop.ts`). Pro `requestAnimationFrame` wird die reale Zeit
gemessen (auf 250 ms geclampt gegen die „spiral of death"), in den Akkumulator
gegeben und je `FIXED_DT` ein `sim.tick(cmd, FIXED_DT)` ausgeführt. Der Renderer
bekommt State + `alpha` (Rest im Akkumulator) und interpoliert.

`performance.now()` / `requestAnimationFrame` leben in `loop.ts` — außerhalb der
Sim-Grenze. `loop.ts` hängt nur an den Sim-Typen (`InputCommand`, `SimState`),
nicht an den `render`/`input`-Modulen. Ein optionaler `onFrame`-Haken liefert je
Frame `{ simTick, fps, alpha, command }` — daran hängt `main.ts` das Debug-Overlay.

## UI / Overlays

HUD und Menüs sind **DOM + CSS über dem Canvas**, nicht Babylon-GUI (`TECHNIK.md`).
`src/ui/debug.ts` (`createDebugOverlay`) ist das erste Beispiel: ein `position:
fixed`-`<div>` mit `pointer-events: none` (Canvas-Klick für Pointer-Lock bleibt
möglich) und maximalem `z-index`, Umschalten mit **F3**. Es bekommt seine Werte
pro Frame übergeben (`update()`), pollt nichts selbst. Bei aktivem Pointer-Lock
bleibt es sichtbar und lesbar — Pointer-Lock betrifft nur den Cursor und die
Maus-Deltas, nicht das DOM; F3 (`keydown` auf `window`) wird weiter zugestellt.

Dasselbe Muster: `src/ui/hud.ts` (HP / Munition / Welle / Nachschub / Finale-
Text), `src/ui/kompass.ts` (AP4-05 — Peil-Band oben: HOME-Marker + je Linie ein
Zustands-Marker, **Farbe UND Glyph** redundant, **keine Gegner-Marker**;
`relPeilung()` rein), `src/ui/lagekarte.ts` (AP4-05 — statisches Sektor-Schema
mit den Linien-Zuständen, Umschalten **M**; kein Echtzeit-Nav). Alle bekommen
den State pro Frame, pollen nichts.

## Audio

`src/audio/` (AP4-05) — reiner Client, **außerhalb der Sim** (goldene Regel:
darf `window` / `AudioContext`, importiert aus `src/sim` nur Typen und liest den
State). `createAudio()` diffed den State frame-zu-frame (`beobachteEreignisse` —
rein) und spielt Platzhalter-Töne (Oszillatoren) auf strategische Ereignisse:
`AudioEreignis` `linie-verloren` → **Signalhorn aus Richtung Home-Line**
(StereoPanner, `panFuerPeilung(relPeilung(...))`), Phase `finale` → Signalhorn +
Truppen-Ruf. Default leise, stummschaltbar mit **T**. Eine Callout-Grammatik
über die realen Linien-/Zonennamen kommt mit dem VO-Paket (AP7) — die alten
Platzhalter-Konstanten sind mit AP6-02 raus.

## First-Person-Controller, Kollision, Test-Level

- `src/data/testlevel.ts` beschreibt ein Grabenstück als reine Quader-Liste
  (`{ center, size }`, Vec3) plus Spawn-Punkte. **Eine Quelle** für Render-Meshes
  (`src/render`) und Sim-Collider (`src/sim/collision`). Keine Babylon-Typen.
  Render-Hinweise je Box: `tag` (schaltbar, AP4-06) und `unsichtbar` (nur
  Kollision, AP5-03).
- `src/sim/collision.ts`: statische AABBs, `moveCapsule()` löst die Bewegung
  achsenweise auf (X, Z, dann Schwerkraft-Y), mit Stufen-Hochsteigen bis
  `STEP_HEIGHT` und Bodenkontakt. Reine Funktion. Grundsatz seit AP5-01:
  **eine Achse löst nur Durchdringungen auf, die ihre eigene Bewegung
  verursacht haben kann** (höchstens `|Δ| + KONTAKT_EPS` tief) — siehe unten.
- `src/sim/index.ts`: `createSim(seed, level?)`. Der Seed speist `rng.ts` und
  wählt daraus deterministisch einen Spawn-Punkt. `tick()` dreht `yaw`/`pitch`
  aus dem Maus-Delta (Pitch geklemmt ±89°), bewegt den Spieler yaw-relativ auf
  der x/z-Bodenebene, wendet Sprint/Sprung an und kollidiert gegen die
  `CollisionWorld`.
- `src/render/index.ts`: `createRenderer(canvas, level, meta?)`. Baut die Boxen
  einmalig, `sync(state, alpha)` setzt eine `FreeCamera` auf die **interpolierte**
  Spielerposition (+ Augenhöhe) und Rotation aus `yaw`/`pitch` — kein
  `attachControl`, die Sim ist die Wahrheit. Mit `meta` (Sektor): Zonen-Material
  je Box (`zoneAt`), Landmark-Pfosten, `syncFront` (Trümmer/Rauch je Linie,
  AP4-03), FRONT/HOME-Schilder (`DynamicTexture`), Zonen-Tore an den zwei
  Rückzugs-Übergängen, geschärfte Zonen-Farbtöne. Die Leit-„Spines" aus
  AP4-05 (`meta.spineRouten`: Farb-Polylinie + Pfosten + geometrische Symbole
  je Route) werden seit AP5-05 nicht mehr gezeichnet — nur noch Datenmodell.
  Gegner: eine Kapsel je Id (Hitbox = Sichtbares), Tönung je `defId`
  (Gegner-Klasse, AP5-06), HP-Balken als Billboard.
- Regressionsschutz: Golden-/Replay-Test in `src/sim/sim.test.ts`
  (Seed + Kommandosequenz → identischer End-State; nutzt ein Inline-Testlevel,
  nicht den Sektor).

## Sektor (AP4)

- `src/data/module.ts` — Rasterbaukasten (`RASTER = 4`), `modul(typ, at, drehung,
opt)` → `LevelBox[]`. Typen: `grabengerade`, `grabenknick`, `parapet` (Wand +
  zweistufiger Feuertritt, ohne Sprung begehbar), `unterstand`, `rampe`,
  `kartengrenze`. Vertikale Kennwerte (`GRABEN_SOHLE` −1,8 / `PARAPET_OBERKANTE`
  +0,55 / `FEUERTRITT_OBERKANTE` −0,95) als Greybox-Startwerte. **Derselbe
  Baukasten ist für den späteren Labyrinth-Generator gedacht.**
- `src/data/sektor.ts` — `sektorGreybox: SektorData`, der handgebaute Sektor aus
  KONZEPT.md §3 (seit AP6-01 der Nacht-Sektor, s. u.), aus `modul(...)` +
  Roh-Quadern. EINE Quelle für Render + Sim. `main.ts` fährt den Sektor;
  `testlevel.ts` bleibt für AP1–AP3-Tests.
- `src/sim/sektor.ts` — Typen (`ZonenId`, `SektorMeta`,
  `SektorData extends LevelData`, `FrontLinie`, `NavGraph`, `SpineRoute` …) +
  reine Helfer `zoneAt` / `frontLinieAt` / `inBoundsXZ` / `pruefeSektorMeta`.
  Kein Babylon, keine Logik — `SektorMeta.spineRouten` (AP4-05) ist ein reines
  Datenfeld, Werte in `src/data/sektor.ts`, nur der Renderer liest es.
- `src/sim/navgraph.ts` (AP4-02) — `kuerzesterPfad` (BFS über offene Kanten,
  deterministisch), `naechsterKnoten`, `imSichtkegel`. Der `SektorMeta.navGraph`
  ist handgepflegt in `src/data/sektor.ts`. `updateEnemies` bekommt einen
  optionalen `nav`-Kontext: damit folgen Gegner Wegpunkten (Anmarsch →
  Niemandsland → Front, nach Durchbruch → Home), ohne = gerader Weg wie bisher.
  Neuberechnung
  nur bei Zielwechsel. `createSim` arbeitet auf einer Graph-Kopie (die
  exportierte `sektorGreybox` bleibt unmutiert).
- `src/sim/front.ts` (AP4-03, auf eine Linie reduziert AP6-02) —
  Zustandsmaschine je Linie: `stabil → bedraengt → gebrochen → verloren` aus
  Feinddruck (lebende Gegner im `bounds`) und aufgerissenen Parapet-Breschen
  (ungehalten sinkt die Bresche-HP, bei 0 offen). Erholung nur eine Stufe
  zurück Richtung `stabil`, nie aus `verloren`. `updateFront(f, ctx, dt)` ist
  rein/in-place und schreibt **eine** Linie fort — `createSim` ruft es je Tick
  **zweimal** (Frontlinie, dann Home-Line; `ctx.linie` sagt welche, die
  Home-Line startet befestigt, `createFrontState(linie, faktor)`). Der
  `onVerloren(id)`-Callback verdrahtet in `createSim` das AP4-02-Verhalten
  (Nav-Kanten nach hinten aus `frontLinie.hintenKanten`, Infiltrations-Spawn am
  `reinfKnoten`, Depot verloren); eine offene Bresche öffnet zusätzlich den
  `frontLinie.brescheZugang` (`vorfront ↔ bresche-front`). `SimState.front` /
  `SimState.home` sind Ein-Element-Listen (Zustand + offene Breschen) fürs
  HUD/Render. Sim-Eingänge: `rueckerobern(id)` (`verloren → gebrochen`, nur bei
  leerer Linie) und der Testeingang `_setLinieVerloren("front" | "home", bool)`
  (dünn über der Maschine, erzwingt den Endzustand).
- `src/sim/einsatz.ts` (AP4-04) — der Einsatzbogen über dem Wave-Director:
  `aufbau → wellen → finale → vorbei` mit `ergebnis: offen | gewonnen | verloren`.
  Ist die endliche `wave.angriffskraft` gebrochen und die Spawn-Queue leer, läuft
  im `finale` ein fester Countdown („Entsatz in N s"); abgelaufen → `gewonnen`,
  dann wartet die Maschine auf `entscheide("extrahieren" | "verlaengern")`
  (verlängern = zweiter, kürzerer Countdown, `reserveStufe++`). Home-Line
  `verloren` **oder** `truppAus` → `verloren`, in jeder Phase.
  **Die Uhr:** `zermuerbungProKill(zone, verloren)` — jeder Kill zieht
  zusätzlich Angriffskraft ab, je Todeszone (`frontlinie` am meisten, `homeline`
  am wenigsten; eine schon verlorene Frontlinie zählt wie offenes Feld).
  `createSim` ruft das im tödlichen Treffer. `SimState.einsatz`
  (`phase / finaleRest / ergebnis`).
- `src/sim/wave.ts` (AP4-04) — neue Phase `reserve`: statt `vorbei` schaltet der
  Director im Finale (`ctx.finale`) auf kleine Nachschub-Reservewellen
  (`RESERVE_*`, mit `ctx.reserveStufe` skaliert); `ctx.finale` false → `vorbei`.

### Kern-Bogen-Fixes (AP4-06, nach dem Audit `AUDIT-2026-09-04-ap4.md`)

- **Bresche = echtes Loch.** `LevelBox.tag` + `CollisionWorld.aktiv[]`:
  `setKolliderAktiv(world, tag, aktiv)` schaltet getaggte Boxen für Bewegung,
  Hitscan und Sichtlinie ab. Das Parapet-Modul baut je Bresche ein eigenes,
  getaggtes Segment (`ModulOpt.luecken`, `BRESCHE_BREITE` 2,6 m); Tag-Konvention
  `brescheTag(linieId, index)` in `src/sim/sektor.ts` — Daten, Sim und
  Renderer nutzen dieselbe. `createSim.syncBreschen()` hält nach jedem
  `updateFront` (und nach `rueckerobern` / Reset) Kollision **und** die Nav-Kante
  `frontLinie.brescheZugang` (`vorfront ↔ bresche-front`) synchron; die Kante
  öffnet nur für die Bresche, auf der der Knoten liegt. Renderer blendet das
  Segment über `brescheTag` aus, Trümmer/Rauch jetzt auch für die Home-Line.
- **Begehbarkeits-Test** `src/sim/navgraph-begehbarkeit.test.ts`: jede Kante des
  Sektor-Graphen wird in beide Richtungen mit einer Gegner-Kapsel begangen —
  Ist-Zustand (Breschen zu, Knoten in einem getaggten Segment gelten als
  Kontaktpunkte) und „alles offen" (alle Kanten + alle Bresche-Kollider aus).
  Knoten in einem festen Kollider sind ein Datenfehler. Pflicht-Sicherheitsnetz
  für den Generator.
- **Engstellen** sind ein Knoten-Flag (`NavKnoten.engstelle`, in den Daten:
  Sap-Lücken, Breschen, Grabenmündung, Parados-Rampen): enger Wegpunkt-Radius
  und erst „erreicht", wenn der Gegner die Engstelle in Richtung des nächsten
  Wegpunkts passiert hat (Ebenen-Test). Der seitliche Anti-Stau-Versatz ist im
  Graben (Fußpunkt < −0,5) auf ±1 m gekappt (3,6-m-Graben).
- **Stuck-Watchdog** (`enemies.ts`): `stillstand` zählt Sekunden ohne
  Fortschritt im Anmarsch (`FEST_ZEIT` 4 s); gestaffelt: 1. Pfad neu von einem in
  Kniehöhe sichtbaren Knoten, die blockierte Kante gesperrt · 2. Relokation auf
  `reinforcement-<abschnitt>` · 3. Despawn über `NavKontext.onDespawn` —
  `createSim` schreibt +1 Angriffskraft zurück (kein Nachschub, keine Uhr).
  Die Wave-Bedingung `lebendeGegner === 0` bleibt dadurch korrekt.
- **Tick-Reihenfolge Wave ↔ Einsatz:** `updateWave` läuft weiter vor
  `updateEinsatz`, aber bei erschöpfter Angriffskraft geht der Director immer
  zuerst auf `reserve` und fällt erst im nächsten Tick bei `!ctx.finale` auf
  `vorbei`; im Tick eines Spawns findet kein Phasenwechsel statt (der frische
  Gegner steckt noch nicht in `lebendeGegner`).
- **Finale-Entscheidung als Eingabe:** `interact` (E) = `extrahieren`,
  `ability` (Q) = `verlaengern`, flankengesteuert in `createSim.step`, nur bei
  `finale` + `gewonnen`. Solange `gewonnen` und nicht entschieden:
  `WaveContext.eingefroren` (keine Reservespawns) und die Verlustprüfung in
  `einsatz.ts` kippt das Ergebnis nicht mehr; `verlaengern` → `offen` → wieder
  verlierbar.

### Boxhead-Kern (AP5)

- **AP5-01 Mittelgang-Teleport.** Ursache in `moveCapsule`: der X-Push setzt
  die Kapsel auf `box.minX − radius`; für die Verbindungsgraben-Wände
  (Innenfläche x = ±1,8, Spielerradius 0,35) ergibt das in Gleitkomma einen
  Rest von 2e-16 m Durchdringung. Die Z-Achse behandelte diesen Rest als echte
  Kollision und löste ihn an der _nächsten Z-Fläche_ der 33-m-Wand auf — bis
  zu 16,5 m Sprung in einem Tick (die Y-Achse hätte die Kapsel analog auf die
  Wandkrone gehoben). Fix: (1) Kontakt-Toleranz `KONTAKT_EPS` (1 µm) im
  Überlappungstest — Berührung ist keine Kollision; (2) jede Achse löst nur
  Durchdringungen ≤ ihrem eigenen Tick-Weg auf, tiefere überspringt sie (die
  gehören einer anderen Achse). Damit ist jede Einzelauflösung von Haus aus
  auf den Tick-Weg begrenzt — kein separates Clamping. Kehrseite: eine Kapsel,
  die _tief_ in einer Box startet (Datenfehler), wird nicht mehr
  herausgeschoben; dagegen schützt `navgraph-begehbarkeit.test.ts`.
  Regressionstests: `collision-verbindungsgraben.test.ts` (Durchläufe auf
  der echten Geometrie inkl. Spieler-Sim, Gegenprobe am exakten Zustand) und
  Mechanismus-Tests in `collision.test.ts`.
- **AP5-02 Munitions-Nachschub.** Die Abschnitts-Depots (`FrontAbschnitt.depot`
  — Front A/B/C an der Parados-Rückwand, Home in den Munitionslager-
  Unterständen, Positionen in `src/data/sektor.ts`) sind Nachfüllpunkte:
  `naechstesDepot()` (`src/sim/sektor.ts`, rein) liefert den Abschnitt, dessen
  Depot in `DEPOT_REICHWEITE` (2 m, 3D) liegt und nicht `depotVerloren` ist;
  `SimState.player.depotInReichweite` trägt ihn ins HUD („E · Munition
  auffüllen"). `E` (Flanke, wie `entscheide`) setzt die Reserve auf
  `WeaponDef.reserve` — außer im Finale nach `gewonnen`, wo `E` weiter
  extrahiert. Ein gefallener Abschnitt hat sein Depot verloren (KONZEPT §3 „die
  Uhr"), `rueckerobern` gibt es zurück; im Tod kein Auffüllen (der Respawn
  füllt ohnehin). Renderer: Kiste je Depot, ohne Kollision. Testeingang
  `_setReserve`. Keine Kosten/Budgets — die Nachschub-Ökonomie (§9.6) bleibt
  ein eigenes Paket.
- **AP5-03 Kartengrenze öffnen.** Die vier `kartengrenze`-Kollider bleiben
  (Bewegungssperre, 6 m hoch gegen Sprung + Stufe), sind aber
  `LevelBox.unsichtbar`: der Renderer baut kein Mesh, `raycast`/`sichtlinie`
  gehen hindurch (`CollisionWorld.unsichtbar[]`; was man nicht sieht, hält
  keine Kugel auf), `moveCapsule` sperrt wie bisher. Sichtbar ist stattdessen
  das **Umland** (`src/data/sektor.ts`): vier Bodenblöcke jenseits der Grenze,
  Oberkante bündig mit der Geländeoberfläche (bilden an den offenen Graben-
  enden die Erd-Stirnwand), dazu flache Erdhaufen ≤ 1,1 m als Tiefenhinweise;
  der Renderer gibt Boxen außerhalb aller Zonen das `umland`-Material
  (Sumpf-Ton) und legt linearen Dunst in Himmelsfarbe darüber (`fogStart` 60 m,
  `fogEnd` 190 m — jenseits der längsten Sichtlinie im Sektor). Zonen, Nav-
  Graph, Breschen und Spielfeldmaße unverändert (Test in `sektor.test.ts`).
- **AP5-04 Gegner-Druck & Wellen-Eskalation.** Erste echte Tuning-Iteration,
  kein neues System. _Wave-Director_ (`wave.ts`): Wellengröße
  `wellenGroesse(w) = 5 + 3·(w−1)`, Spawn-Takt `spawnIntervall(w)` fällt von
  1,4 s je Welle um 0,15 s bis 0,6 s, dazu ±25 % Jitter aus dem Director-Rng;
  Pause 3 s; Start-Angriffskraft 150 (vorher 60 — bei unverändertem Uhr-Preis
  von 3 je Front-Kill trägt das fünf volle Wellen 5·8·11·14·17, an der Home-
  Line entsprechend mehr); Reservewellen 6 (+3 je `verlaengern`). _Linien-
  infanterie_ (`enemies.ts`): je Gegner `tempoFaktor` (1 ± 15 %) und eine
  stufenlose Marschspur `spur` (−1..1 × `SPREIZUNG_MAX` 2,4 m — dieselbe
  Hüllkurve wie das alte `id % 7`-Raster), beides als Würfelwerte aus einem
  eigenen `gegnerRng` in `createSim` (`GegnerStreuung`), Tests ohne Angabe
  bekommen das alte Verhalten. Drei Korrekturen am bestehenden Verhalten, die
  durch mehr Gegner und die gestreuten Spuren sichtbar wurden: (1) die
  Engstellen-Ebene liegt senkrecht zur **Anmarschrichtung** (vorher: Richtung
  zum nächsten Wegpunkt — bei abknickendem Pfad, Bresche-Knoten → Grabenknoten,
  galt ein Gegner schräg vor der Wand schon als „durch"); (2) die Nahkampf-
  Sicht prüft auf **Kniehöhe** wie die Erreichbarkeits-Sichtlinie des
  Watchdogs (auf Augenhöhe sah ein Gegner den Spieler über das Parapet und
  lief in die Wand); (3) am Zielknoten mit Spieler außer Reichweite wird
  sofort über den Graphen zum Knoten beim Spieler weiternavigiert (vorher
  Luftlinie durch die nächste Wand, bis der Watchdog nach 4 s dasselbe tat).
  Nav-Daten: `home-feld-links/-rechts` liegen jetzt als Engstellen am
  **Rampenfuß** (±20, −23,5) statt oben an der Rampenkante — von der Sohle aus
  galten sie sonst im 3-m-Radius als erreicht, der nächste Wegpunkt lag quer
  hinter dem Home-Parapet. F3-Overlay zeigt die lebenden Gegner. Regressions-
  netze: `wave-eskalation.test.ts` (große Welle ohne Watchdog durchs
  Labyrinth, Streuung zieht die Kette auseinander, ganzer Einsatz mit
  idealisiertem Schützen), Verhaltens-Tests in `enemies.test.ts`.
- **AP5-05 Leit-Spines unsichtbar.** Reine Render-Änderung: Polylinie,
  Pfosten und geometrische Symbole je Spine-Route werden nicht mehr erzeugt
  (die Linien wirkten im Spieltest wie Stricke auf den Feldern, die Pfosten
  „stehen im Boden", Symbole allein würden schweben). `SpineRoute` /
  `meta.spineRouten` bleiben als Daten für eine spätere Lesbarkeits-Lösung;
  A/B/C-Schilder, Zonen-Tore und Kompass sind unverändert.
- **AP5-06 Gegner-Klassen.** Drei `EnemyDef`s der Linieninfanterie in
  `src/data/gegner.ts` — normal (Tempo 1 / 100 HP / 10 Schaden), schnell
  (`linieninfanterie-schnell`: 1,5 / 60 / 7) und schwer
  (`linieninfanterie-schwer`: 0,65 / 180 / 16) — reine Statistik-Varianten:
  derselbe `verhaltensTag`, dieselbe Bewegungs-/Nahkampflogik in `enemies.ts`
  (dort wirkt nur `def.tempo`/`def.hp`/`def.schaden`, keine Verzweigung nach
  Klasse). HP auf das Langgewehr M98 (85) gerechnet: 1 · 2 · 3 Treffer bis
  Welle 4; die Tempo-Bänder überlappen auch mit ±15 % Marsch-Streuung nicht,
  und die schnellste schnelle (4,49 m/s) holt einen gehenden Spieler
  (`WALK_SPEED` 4,5) nicht ein. Der Wave-Director (`wave.ts`) zieht die Klasse
  je geplantem Gegner gewichtet aus `GEGNER_MISCHUNG` (60/20/20, Platzhalter)
  über `waehleGegner(ctx.rng)` — beim Planen der Haupt- **und** Reservewellen
  aus demselben Director-Rng (kein neuer Zufallsstrom); `wellenHpFaktor(w)`
  ist der bisherige HP-Faktor als exportierter Helfer. Renderer: Kapsel-
  Tönung je `defId` (Feldgrau / Sand / dunkles Blaugrau), im Angriff halb zum
  bisherigen Rotbraun gemischt; keine Kapsel-Skalierung, damit Hitbox und
  Sichtbares deckungsgleich bleiben. Regressionsnetze: `gegner.test.ts`
  (Daten), `wave.test.ts` (Mischung, Verteilung, Reserve),
  `gegner-klassen.test.ts` (Treffer-Tabelle, Tempo-Bänder, gemischte Welle
  durchs Labyrinth ohne Watchdog), Klassen-Anteile im Einsatz-Test von
  `wave-eskalation.test.ts`. Beide Wave-abhängigen Golden-Anker in
  `sim.test.ts` neu baseliniert (Klassenwahl verschiebt die Director-Würfe).

### Nacht-Sektor (AP6-01) — neue Bühne, gleiche Sim-Technik

- **`src/data/sektor.ts` komplett neu:** der Nacht-Sektor aus KONZEPT.md §3
  (neu gefasst 2026-09-07) statt des „H". Größer (x ±34 · z −46…72), verzweigt,
  von der Feindseite nach hinten: **Feindseite → Niemandsland → Frontlinie →
  Hinterland → Home-Line**. Genau **EINE** Frontlinie + **EINE** Home-Line
  (AP6-01 lieferte sie noch als Ein-Element-Listen `frontAbschnitte`; AP6-02
  hat daraus `SektorMeta.frontLinie` / `.homeLinie` gemacht). Nur die Bühne —
  Zustandsmaschine/Uhr/Spawn-Verlagerung sind AP6-02 ff.
- **Zonen** (`ZonenId` in `src/sim/sektor.ts`): `feindseite` · `niemandsland`
  · `frontlinie` · `hinterland` · `homeline` — lückenlose Z-Bänder über die
  volle Breite (die alten `feindzone`/`labyrinth`/`verbindungsgraben`/`feld`
  entfallen). `zermuerbungProKill` (`einsatz.ts`) mappt darauf: `frontlinie` 2,
  `niemandsland`/`feindseite` 1,5, `hinterland`/außerhalb 1, `homeline` 0,5.
- **Nav-Graph** 34 Knoten (alter Sektor ~30): drei Feind-Spawns
  (`spawn-w/-m/-e`), verzweigtes Niemandsland (`nm-*`, `vorfront{,-w,-e}`,
  verdeckter `reinforcement-front`), Frontlinie (`sap-w/-e`, `bresche-front`,
  `front-{w,front,e}`, `parados-{w,m,e}`), Hinterland (zentraler Laufgraben
  `hl-mitte/-sued` + zwei Seitenrouten `hl-{w,e}1..3`), Home-Line
  (`home-{graben,w,e,ziel}`). Der Zielknoten aller Wellengegner ist
  `front-front` (AP6-02: aus `frontLinie.zielKnoten`, nicht mehr
  `front-${abschnitt}`).
- **Instand-Punkte** (`SektorMeta.instandPunkte`, je Linie ein Marker — AP6-04
  nutzt sie) und **Nacht-Lichter** (`SektorMeta.lichter`) sind neue Datenfelder;
  `spineRouten` liefert `[]` (KONZEPT.md §10).
- **`parapet()` in `module.ts`:** eine Bresche schaltet jetzt **Wand +
  Feuertritt-Stufe + Bank** zusammen ab (drei Lücken-Stücke, dasselbe Etikett)
  — sonst blockiert die Bank den Feind, der durch die offene Bresche kommt.
  `unterstand()` hat jetzt einen Boden (man fällt nicht durch).
- **Renderer (`src/render/index.ts`) Nacht:** fast schwarzer Himmel, dichter
  dunkler Dunst (`fogStart` 14, `fogEnd` 58), Mond-Ambient ~0,16; je
  `meta.lichter` ein statischer `PointLight` + emissives „Feuertonne"-Mesh
  (keine dynamischen Lichter). Zonen-Farbtöne durchweg dunkel, aber
  unterscheidbar; Linien-Schilder FRONT/HOME, Zonen-Tore + Instand-Marker aus
  den Meta-Bounds abgeleitet.
- **Tests:** `navgraph-begehbarkeit.test.ts` auf den neuen Graphen umgestellt
  (Pflicht-Sicherheitsnetz — jede Kante beidseitig begehbar, Ist + „alles
  offen"). `sektor.test.ts` komplett neu (Wohlgeformtheit, `zoneAt`,
  Sim-Integration, Linien-Zustandsmaschine, die Uhr, AP4-06-Fixes,
  AP5-02/03). Beide Sektor-Golden-Anker in `sim.test.ts` bewusst neu
  baseliniert (Begründung am Test); `collision-verbindungsgraben.test.ts` auf
  den zentralen Laufgraben umgezielt; `wave-eskalation.test.ts` /
  `gegner-klassen.test.ts` / `einsatz.test.ts` auf die neuen Zonen/Ids.

### Eine Frontlinie, eine Home-Line (AP6-02) — A/B/C-Verdrahtung raus

Mechanische Bereinigung, **kein Verhaltenswechsel** (die beiden Golden-Anker
„Sektor-Nav-Graph" + „die Uhr" bleiben unverändert grün). Die Druck-Radius-
Halte-Semantik ist bewusst abgetrennt → AP6-02b.

- **`SektorMeta`:** `frontAbschnitte`/`homeAbschnitte` (Listen) →
  `frontLinie` / `homeLinie` (je **ein** `FrontLinie`-Objekt). N = 1 ist damit
  eine Typ-Invariante; `pruefeSektorMeta(meta)` wirft beim Laden bei
  fehlendem/unvollständigem Eintrag (Audit N2). `FrontLinie` trägt jetzt die
  Rollen-Felder (Audit H2), die früher in `index.ts` aus A/B/C-Strings
  abgeleitet wurden: `zielKnoten` (Frontziel bzw. `home-ziel`), `reinfKnoten`
  (verdeckter Infiltrations-/Watchdog-Reloc-Knoten, `""` = keiner),
  `brescheZugang { bresche, davor }`, `hintenKanten` (Rückwege bei Linienfall).
- **`front.ts`:** `AbschnittFront`→`LinienFront`, `AbschnittZustand`→
  `LinienZustand`. `createFrontState(linie)` und `updateFront(f, ctx, dt)`
  arbeiten je **eine** Linie (statt einer Liste); `ctx.linie` statt
  `ctx.abschnitte`. Zustände/Schwellen/`HOME_BRESCHE_FAKTOR` unverändert.
- **`enemies.ts`:** `zielKnoten(e, nav)` liefert `nav.homeZiel` (Linie verloren)
  bzw. `nav.frontZiel` — beide aus `NavKontext` (Sektor-Metadaten) statt aus der
  Linien-Id zusammengesetzt. Der Watchdog-Umzug (Stufe 2) nimmt
  `nav.reinfKnoten` statt des zusammengesetzten Knotennamens.
- **`index.ts`:** `aktiveAchsen` / `waehleAbschnitt` / `abschnittRng` **raus**
  (eigener, sonst ungenutzter Rng-Strom → das Entfernen verschiebt weder
  `waveRng` noch `gegnerRng`, Golden-Anker bit-identisch). Jeder Sektor-Gegner
  gehört zur Frontlinie. Der `HINTEN_KANTEN`-Record → `frontLinie.hintenKanten`.
  `frontState`/`homeState` (Listen) → `frontLinieState`/`homeLinieState`
  (einzelne `LinienFront`). `SimState.front`/`.home` bleiben Ein-Element-Listen
  (Golden-Anker + Kompass/Lagekarte/Audio/`main.ts` strukturell unverändert).
  Testeingang `_setAbschnittVerloren` → `_setLinieVerloren("front"|"home", …)`.
  Verlustbedingung „alle Home-Einträge verloren" → `homeLinieState.zustand ===
"verloren"`. `abschnittAt` → `frontLinieAt`.
- **`audio/index.ts`:** die toten Platzhalter-Konstanten (Callout-Strings, an
  nichts verdrahtet) **entfernt** — die Callout-Grammatik über die realen
  Linien-/Zonennamen kommt mit dem VO-Paket (AP7). `AudioEreignis`
  `abschnitt-verloren` → `linie-verloren`.
- **M7** (nur eine Bresche pro Linie am Nav-Zugang) bleibt bekannte
  Einschränkung → AP7-Politur (die Flanken-Bresche ist reines physisches Loch).

### Sektor-Neubau: echtes Grabensystem (AP6-01b) — nur Geometrie/Nav

**Kein Regelwechsel.** `src/sim/**` unangetastet; der Inline-Testlevel-Anker in
`sim.test.ts` (`eigene LevelData`) unangetastet. Nur `src/data/sektor.ts` (neu
gebaut), `src/data/module.ts` (neue Bauteile) und ein Renderer-Feinschliff.

- **`src/data/sektor.ts` neu:** der AP6-01-Bau war zu schematisch (gerade
  Box-Korridore statt Gräben, leere Flächen). Jetzt ein echtes WW1-Grabensystem,
  ~30 % größer (x ±44 · z −60…92, vorher ±34 · −46…72), noch Greybox:
  - **Gezähnter Feuergraben** (z 12…30): fünf Feuernischen (x −32/−16/0/16/32)
    mit vier dicken Erd-Traversen dazwischen (`traverse()` — der „Zahn"), ein
    durchgehender Laufgang dahinter. Bewegung im Zickzack Nische↔Laufgang.
  - **Niemandsland** (z 30…56): Trichterfeld + eine quer laufende verfallene
    Alt-Frontlinie (flache begehbare Rinne) + zwei Sap-Köpfe (`sap()` —
    Horchposten, zugleich Anmarsch-Schleuse durch die Parapet-Lücken bei x ±16).
  - **Hinterland** (z −42…12): kein offenes Feld mehr — drei Verbindungsgräben
    längs (Mitte gerade = „Express-Laufgraben", lichte Breite ±1,8, bis auf zwei
    schmale Sally-Ports durchgehende Wand; West/Ost ±2,6), Stützgraben quer
    (z −1), Reservegraben quer (z −22), dazwischen Geländeinseln mit
    Geschützstellungen (`geschuetzstellung()`) + Baracken-Ruinen als Deckung.
  - **Home-Line** (z −60…−42): die stärkste Linie, ebenfalls gezähnt (3 Nischen
    x −24/0/24, 2 Traversen), drei begehbare Unterstände an der Rückwand, offene
    Flanken mit je einer Rampe (x ±38 — hier steigt auch der Feind ein).
  - **Ein durchgehender Sohle-Auffangboden** unter dem ganzen Sektor (Oberkante
    `GRABEN_SOHLE`): keine Lücke, durch die eine Kapsel aus der Welt fällt.
- **`module.ts`:** neue Bauteile `traverse` (massiver Erdblock), `sap`
  (Stichgraben-Kopf, offen nach −Z), `geschuetzstellung` (Sandsack-Hufeisen
  ≤ 0,95 m). `PARAPET_OBERKANTE` 0,55 → **0,62** (Jank: 0,55 lag nur 0,05 m =
  `STEP_HEIGHT` über der Feldfläche, die Brustwehr war im Spieltest „oben
  begehbar"); `FEUERTRITT_OBERKANTE` −0,95 → −0,85, Feuertritt als drei flache
  Stufen (die Bank läge sonst > `STEP_HEIGHT` über der Sohle).
  `unterstand()` neu: kein Oberflächen-„Bunker" mehr, sondern ein niedriger
  gedeckter Raum am Grabenniveau (begehbar rein/raus, Erddecke dicht überm
  Kopf). `// TODO(Rückfrage)` am Code: ein Raum _unter_ Flur mit Kopffreiheit
  bräuchte einen abgesenkten Boden, und dafür die EINE Sohle-Auffangplatte zu
  durchbrechen ist riskanter als es wert ist → der vom Ticket erlaubte
  „flachste hinein-Verbau".
- **Nav-Graph** ~75 Knoten (vorher 34): Feindseite 3, Niemandsland 19,
  Frontlinie 20 (Traversen-Durchgänge `rl-a..d` als `engstelle`), Hinterland 19
  (drei Verbindungsgräben + zwei Quergräben), Home-Line 11 (`hrl-a/b` als
  `engstelle`). `home-ziel` liegt frei erreichbar im Graben, kein enger Riegel
  dahinter (AP6-06-Fund: Gegner überschossen das alte Ziel und verklumpten).
  Jede Kante beidseitig im Begehbarkeits-Test.
- **Zonen** unverändert als Konzept (lückenlose Z-Bänder), Koordinaten neu.
  `homeLinie.bounds` enger als das Zonen-Band (z −53…−42) — die Unterstände
  dahinter zählen nicht als „Linie".
- **Renderer:** Bresche-Trümmer jetzt flacher Schutthaufen (vorher ein 1,3 m
  hoher Quader, der im Greybox wie eine umgefallene Box las).
- **Golden-Anker:** „Sektor-Nav-Graph" + „die Uhr" in `sim.test.ts` **bewusst
  neu baseliniert** (neuer Sektor, andere Startpositionen) — rein positionell,
  Uhr-/Wave-Regeln bit-identisch (Begründung am `expect()`, Gegenprobe:
  Determinismus-Doppellauf + voller headless-Einsatz Seed 1 → gewonnen, 0
  Despawns). `collision-verbindungsgraben.test.ts` auf das südliche lückenlose
  Wandstück des Express-Laufgrabens umgezielt (die Sally-Ports sind neu).

## Bundle-Größe

Produktions-Build (`npm run build`), gemessen 2026-09-02, nur `src/main.ts`
(Engine + Scene + Licht):

| Paket                       | JS roh    | JS gzip   |
| --------------------------- | --------- | --------- |
| `babylonjs` (UMD, Referenz) | ~7,87 MiB | ~1,78 MiB |
| `@babylonjs/core` (aktuell) | ~6,61 MiB | ~1,55 MiB |

~16 % kleiner roh / ~15 % gzip, und vor allem strukturell tree-shakebar: solange
die App wenig von Babylon zieht, bleibt das Bundle klein. Ein echtes
Bundle-Budget-Gate kommt später (Infrastruktur-Backlog).

## Offene Rückfragen

- **Node-LTS-Major**: `.nvmrc`/`engines` auf `24` (aktuelle LTS zum Zeitpunkt
  1.4). Bei Bedarf anheben.
- **Pages-Preview pro Branch**: Der offizielle GitHub-Pages-Deploy kennt nur eine
  Live-Seite; jeder Push (egal welcher Branch) überschreibt den Preview unter
  <https://kwe3rtz.github.io/halt-die-linie/>. Für echte Branch-Previews
  bräuchte es einen anderen Mechanismus — siehe `TODO(Rückfrage)` in
  `.github/workflows/pages.yml`.
- **Dev-Dependency-Audit**: `npm audit` meldet Advisories in `esbuild`/`vite`/
  `vitest` (nur Dev-Server, kein Prod-Code). Fix = Vite 5→8 / Vitest 2→3, ein
  größerer Breaking-Change — bewusst nicht in 1.4.
- **Kamera-Pitch-Vorzeichen**: `src/render` invertiert `pitch` für Babylons
  `FreeCamera` (`rotation.x` positiv = nach unten). Logisch geprüft und per
  Screenshot grob bestätigt; beim ersten manuellen Spielen kurz gegenchecken,
  ob „Maus hoch = Blick hoch" stimmt.
- **`jsdom`** ist als Dev-Dependency dazugekommen (Tests für `src/input` und
  `src/loop`, jeweils per `// @vitest-environment jsdom` pro Datei). Eine
  Vitest-Workspace-Aufteilung (node vs. jsdom) kann später folgen, wenn es mehr
  UI-Tests gibt.
