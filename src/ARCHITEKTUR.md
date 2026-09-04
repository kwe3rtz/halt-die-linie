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
Text), `src/ui/kompass.ts` (AP4-05 — Peil-Band oben: HOME-Marker + je
Frontabschnitt ein Zustands-Marker, **Farbe UND Glyph** redundant, **keine
Gegner-Marker**; `relPeilung()` rein), `src/ui/lagekarte.ts` (AP4-05 — statisches
Sektor-Schema mit Abschnitts-Zuständen, Umschalten **M**; kein Echtzeit-Nav).
Alle bekommen den State pro Frame, pollen nichts.

## Audio

`src/audio/` (AP4-05) — reiner Client, **außerhalb der Sim** (goldene Regel:
darf `window` / `AudioContext`, importiert aus `src/sim` nur Typen und liest den
State). `createAudio()` diffed den State frame-zu-frame (`beobachteEreignisse` —
rein) und spielt Platzhalter-Töne (Oszillatoren) auf strategische Ereignisse:
Abschnitt `verloren` → **Signalhorn aus Richtung Home-Line** (StereoPanner,
`panFuerPeilung(relPeilung(...))`), Phase `finale` → Signalhorn + Truppen-Ruf.
Default leise, stummschaltbar mit **T**. Feste Callout-Grammatik als
String-Konstanten (`FRONT_CALLOUT`, `ROUTE_CALLOUT`) für späteren echten Funk/VO.

## First-Person-Controller, Kollision, Test-Level

- `src/data/testlevel.ts` beschreibt ein Grabenstück als reine Quader-Liste
  (`{ center, size }`, Vec3) plus Spawn-Punkte. **Eine Quelle** für Render-Meshes
  (`src/render`) und Sim-Collider (`src/sim/collision`). Keine Babylon-Typen.
- `src/sim/collision.ts`: statische AABBs, `moveCapsule()` löst die Bewegung
  achsenweise auf (X, Z, dann Schwerkraft-Y), mit Stufen-Hochsteigen bis
  `STEP_HEIGHT` und Bodenkontakt. Reine Funktion.
- `src/sim/index.ts`: `createSim(seed, level?)`. Der Seed speist `rng.ts` und
  wählt daraus deterministisch einen Spawn-Punkt. `tick()` dreht `yaw`/`pitch`
  aus dem Maus-Delta (Pitch geklemmt ±89°), bewegt den Spieler yaw-relativ auf
  der x/z-Bodenebene, wendet Sprint/Sprung an und kollidiert gegen die
  `CollisionWorld`.
- `src/render/index.ts`: `createRenderer(canvas, level, meta?)`. Baut die Boxen
  einmalig, `sync(state, alpha)` setzt eine `FreeCamera` auf die **interpolierte**
  Spielerposition (+ Augenhöhe) und Rotation aus `yaw`/`pitch` — kein
  `attachControl`, die Sim ist die Wahrheit. Mit `meta` (Sektor): Zonen-Material
  je Box (`zoneAt`), Landmark-Pfosten, `syncFront` (Trümmer/Rauch je Abschnitt,
  AP4-03) und (AP4-05) die Leit-„Spines" je Route (`meta.spineRouten`:
  Farb-Polylinie + Pfosten + geometrische Symbole), A/B/C-Schilder
  (`DynamicTexture`), Zonen-Tore an den zwei Rückzugs-Übergängen, geschärfte
  Zonen-Farbtöne.
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
- `src/data/sektor.ts` — `sektorGreybox: SektorData`, das „H" aus KONZEPT.md §3,
  aus `modul(...)` + Roh-Quadern. EINE Quelle für Render + Sim. `main.ts` fährt
  den Sektor; `testlevel.ts` bleibt für AP1–AP3-Tests.
- `src/sim/sektor.ts` — Typen (`ZonenId`, `SektorMeta`,
  `SektorData extends LevelData`, `FrontAbschnitt`, `NavGraph`, `SpineRoute` …) +
  reine Helfer `zoneAt` / `abschnittAt` / `inBoundsXZ`. Kein Babylon, keine
  Logik — `SektorMeta.spineRouten` (AP4-05) ist ein reines Datenfeld, Werte in
  `src/data/sektor.ts`, nur der Renderer liest es.
- `src/sim/navgraph.ts` (AP4-02) — `kuerzesterPfad` (BFS über offene Kanten,
  deterministisch), `naechsterKnoten`, `imSichtkegel`. Der `SektorMeta.navGraph`
  ist handgepflegt in `src/data/sektor.ts`. `updateEnemies` bekommt einen
  optionalen `nav`-Kontext: damit folgen Gegner Wegpunkten (Anmarsch → Labyrinth
  → Front, nach Durchbruch → Home), ohne = gerader Weg wie bisher. Neuberechnung
  nur bei Zielwechsel. `createSim` arbeitet auf einer Graph-Kopie (die
  exportierte `sektorGreybox` bleibt unmutiert).
- `src/sim/front.ts` (AP4-03) — Zustandsmaschine je Abschnitt:
  `stabil → bedraengt → gebrochen → verloren` aus Feinddruck (lebende Gegner im
  `bounds`) und aufgerissenen Parapet-Breschen (ungehalten sinkt die Bresche-HP,
  bei 0 offen). Erholung nur eine Stufe zurück Richtung `stabil`, nie aus
  `verloren`. `updateFront(front, ctx, dt)` ist rein/in-place und läuft **zweimal
  je Tick** — einmal für die Frontlinie A/B/C, einmal für die Home-Line
  (`ctx.abschnitte` sagt welche; die Home-Line startet befestigt,
  `createFrontState(..., faktor)`). Der `onVerloren(id)`-Callback verdrahtet in
  `createSim` das AP4-02-Verhalten (Nav-Kanten nach hinten öffnen,
  Infiltrations-Spawn, Depot verloren); eine offene Bresche öffnet zusätzlich
  `bresche-<id> ↔ lab-vorfront`. `SimState.front` / `SimState.home` (Zustand +
  offene Breschen) fürs HUD/Render. Sim-Eingänge: `rueckerobern(id)`
  (`verloren → gebrochen`, nur bei leerem Abschnitt) und der Testeingang
  `_setAbschnittVerloren` (dünn über der Maschine, erzwingt den Endzustand).
- `src/sim/einsatz.ts` (AP4-04) — der Einsatzbogen über dem Wave-Director:
  `aufbau → wellen → finale → vorbei` mit `ergebnis: offen | gewonnen | verloren`.
  Ist die endliche `wave.angriffskraft` gebrochen und die Spawn-Queue leer, läuft
  im `finale` ein fester Countdown („Entsatz in N s"); abgelaufen → `gewonnen`,
  dann wartet die Maschine auf `entscheide("extrahieren" | "verlaengern")`
  (verlängern = zweiter, kürzerer Countdown, `reserveStufe++`). Alle
  Home-Abschnitte `verloren` **oder** `truppAus` → `verloren`, in jeder Phase.
  **Die Uhr:** `zermuerbungProKill(zone, abschnittVerloren)` — jeder Kill zieht
  zusätzlich Angriffskraft ab, je Todeszone (`frontlinie` am meisten, `homeline`
  am wenigsten; ein schon verlorener Frontabschnitt zählt wie offenes Feld).
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
  `brescheTag(abschnittId, index)` in `src/sim/sektor.ts` — Daten, Sim und
  Renderer nutzen dieselbe. `createSim.syncBreschen()` hält nach jedem
  `updateFront` (und nach `rueckerobern` / Reset) Kollision **und** Nav-Kante
  `bresche-<id> ↔ lab-vorfront` synchron; die Kante öffnet nur für die Bresche,
  auf der der Knoten liegt. Renderer blendet das Segment über `brescheTag` aus,
  Trümmer/Rauch jetzt auch für die Home-Line.
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
