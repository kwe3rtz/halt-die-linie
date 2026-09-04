# Changelog

Kuratierte, lesbare Fassung — ein Eintrag pro Ticket, neueste oben, gruppiert
nach Arbeitspaket. Ground Truth ist die git-History; die vollen Ticket-Berichte
liegen in `tickets/erledigt/`.

## Arbeitspaket 4 — Verteidigung in der Tiefe · Branch `arbeitspaket-4` · in Arbeit

- **AP4-04** · `6af9326` · **Die Uhr, der Rückzug & das Home-Line-Finale.**
  `src/sim/einsatz.ts` (Phasenmaschine `aufbau → wellen → finale → vorbei`,
  `ergebnis offen/gewonnen/verloren`, `entscheide(extrahieren|verlaengern)`,
  `zermuerbungProKill(zone, verloren)`). **Die Uhr:** jeder Kill zermürbt die
  `angriffskraft` zonengewichtet (Front 2 · Labyrinth 1,5 · Feld/Graben 1 · Home
  0,5; verlorener Frontabschnitt = wie Feld) — im tödlichen Treffer verdrahtet.
  **Home-Line** über dieselbe `front.ts`-Maschine (`meta.homeAbschnitte` H-West/
  H-Ost, 2,5× Bresche-HP). Verlust: alle Home-Abschnitte `verloren` **oder**
  `_setTruppAus`, in jeder Phase. `wave.ts`: neue Phase `reserve` (Finale-
  Reservewellen, `reserveStufe`-skaliert). `SimState.home` + `SimState.einsatz`,
  Sim-Eingänge `entscheide` / `_setTruppAus`, `SimOptions.startAngriffskraft`.
  HUD-Textzeile für den Countdown. Neuer Uhr-Golden-Anker (Seed 1); Nav-Anker
  unverändert (kein Kill in seinem Fenster). 186 Tests (+26), Coverage src/sim
  97,26 %.
- **AP4-03** · `1701ff1` · **Frontabschnitte: Besitz, Bresche, Fall.**
  `src/sim/front.ts` (Zustandsmaschine je Abschnitt `stabil → bedraengt →
  gebrochen → verloren` aus Feinddruck + aufgerissenen Parapet-Breschen;
  Erholung eine Stufe, nie aus `verloren`; `updateFront` rein/in-place).
  `onVerloren(id)` verdrahtet in `createSim` das AP4-02-Verhalten (Nav-Kanten
  nach hinten, Infiltration, Depot verloren); eine offene Bresche öffnet
  `bresche-<id> ↔ lab-vorfront`. `SimState.front` (Zustand + offene Breschen).
  Neuer Sim-Eingang `rueckerobern(id)` (`verloren → gebrochen`, nur bei leerem
  Abschnitt). `_setAbschnittVerloren` bleibt als dünner Testeingang.
  Renderer: Trümmer je Bresche, Rauch je `gebrochen`/`verloren` (grob, Feinschliff
  AP4-05). Beide Golden-Anker unverändert. 160 Tests (+21), Coverage src/sim
  96,86 %.
- **AP4-02** · `20bf9a0` · **Feind-Navigation: semantischer Graph.**
  `src/sim/navgraph.ts` (`kuerzesterPfad` = deterministische BFS über offene
  Kanten, `naechsterKnoten`, `imSichtkegel` — reine Sim-Helfer).
  `SektorMeta.navGraph` handgepflegt in `src/data/sektor.ts` (~30 Knoten / ~40
  Kanten: Anmarsch → Labyrinth-Serpentine → `front-<id>`/`bresche-<id>`,
  verdeckte `reinforcement-<id>`, Parados/Feld/Verbindungsgraben/Home,
  `home-ziel`; Front→hinten + Labyrinth→Bresche starten `offen: false`).
  `enemies.ts`: `updateEnemies(…, nav?)` — ohne `nav` unverändert (alter
  Golden-Anker hält), mit `nav` Wegpunkt-Folgen (Neuberechnung nur bei
  Zielwechsel), Umschalten aufs direkte Nahkampf-Verhalten am Zielknoten oder
  bei Spieler < 6 m + Sichtlinie. `index.ts`: eigene Graph-Kopie je Sim, eigener
  `abschnittRng`-Strom, Infiltrations-Relokation mit Sichtkegel-Guard,
  Testeingänge `_setKanteOffen` / `_setAbschnittVerloren`. `collision.ts`:
  `sichtlinie()`. Neuer Golden-/Replay-Anker (Seed 40404, Sektor-Graph).
  Labyrinth-/Parapet-Geometrie leicht justiert (AP4-01-Stub hatte eine
  Sackgasse). 139 Tests (+23), Coverage src/sim 96,32 %.
- **AP4-01** · `a0badbf` · **Sektor-Geometrie (das „H") als Daten + Renderer.**
  `src/data/module.ts` (Rasterbaukasten `RASTER = 4`, `modul(typ, at, drehung,
  opt)` → `LevelBox[]`: grabengerade/-knick, parapet mit zweistufigem Feuertritt
  ohne Sprung, unterstand, rampe, kartengrenze; vertikale Greybox-Kennwerte).
  `src/data/sektor.ts` (`sektorGreybox: SektorData` — das H aus KONZEPT §3, 74
  Quader: Kartengrenze, Frontlinie A/B/C, Labyrinth-Stub + Landmark, offenes
  Feld, gerader Verbindungsgraben, Home-Line mit 3 Unterständen). `src/sim/
  sektor.ts` (`SektorData extends LevelData` + `SektorMeta`; reine Helfer
  `zoneAt`/`abschnittAt`, kein Babylon). Renderer färbt je Zone + Landmark-Akzent.
  `main.ts` fährt den Sektor; `testlevel.ts` bleibt für AP1–AP3-Tests.
  116 Tests (+16), Coverage src/sim 98,58 %.

## Arbeitspaket 3 — Basis solide machen · Branch `arbeitspaket-3` · komplett

- **AP3-05** · `d21cc08` · **Gegner stapeln sich nicht mehr ineinander.**
  Separation in `src/sim/enemies.ts` — Positions-Schnappschuss (deterministisch,
  reihenfolge-unabhängig), radialer Push zwischen nahen Gegnern + Mindestabstand
  zum Spieler (löst Überlappung in 1 Tick), nur auf den Bewegungswunsch vor
  `moveCapsule`. Nahkampf trifft weiter, kein Pathfinding. Golden-Replay grün.
  100 Tests.
- **AP3-04** · `24bbccd` · **Gegner-Lebensbalken aus jedem Blickwinkel.**
  Ursache: Hintergrund + Füllung je ein eigenes Billboard, Füllung im Weltraum
  versetzt. Fix: nur der Hintergrund billboardet, Füllung als Kind im lokalen
  Raum (linksbündig verankert), `zOffset` gegen Z-Fighting. Reiner Renderer-Job.
- **AP3-03** · `4999c6e` · **Viewmodel steckt nicht mehr in Wänden.**
  Depth-getrennter Render-Pass (`src/render/index.ts`): drei Rendering-Gruppen
  (Welt / Viewmodel+Mündungsblitz / Screen-FX), Tiefenpuffer vor Gruppe 1 & 2
  geleert. Reiner Renderer-Job. 98 Tests.
- **AP3-02** · `366ebe9` · **Mündungsblitz & Tracer korrigiert.**
  Ursache war Near-Plane-Clipping (Tracer-Start auf der Kameraposition).
  `ShotEvent.richtung` (normierte Hitscan-Richtung) dazu; Tracer startet 0,6 m
  vor dem Auge auf dem Strahl, Mündungsblitz als Welt-Mesh. 98 Tests.
- **AP3-01** · `9f28022` · **Fadenkreuz & Trefferbestätigung.**
  `src/ui/hud.ts` — dünnes CSS-„+" exakt mittig, Hitmarker (4 Speichen, ~120 ms)
  nur bei Gegner-Treffern, kräftiger bei tödlichem Treffer;
  `prefers-reduced-motion`, im Tod ausgeblendet. `ShotEvent` um `gegnerTreffer`
  + `toedlich` (Bool-Flags, keine Verhaltensänderung). 97 Tests.

## Arbeitspaket 2 — Erster Kampf-Loop · Branch `arbeitspaket-2` · komplett

- **AP2-05** · `4a4e7b1` · **Nachschub-Zähler & minimales HUD.**
  `src/ui/hud.ts` — reines DOM/CSS (kein Babylon-GUI), getrennt vom
  F3-Debug-Overlay, `pointer-events:none`, `prefers-reduced-motion`. HP-Balken +
  Zahl, Munition + „Nachladen…", Welle/Phase/Angriffskraft-Balken, Nachschub,
  Tod-Overlay mit Respawn-Countdown. `SimState` um `respawnRest` +
  `angriffskraftMax`. **Golden-/Replay-Test** etabliert (Seed + 360er-Sequenz →
  `toEqual` + ~13 Golden-Anker); `math.test.ts` → `math.ts` 100 %. 95 Tests,
  Coverage src/sim 97,65 %.
- **AP2-04** · `719537d` · **Wave-Director.**
  `src/sim/wave.ts` — Phasen `aufbau` (3 s) → `welle` → `pause` (5 s) →
  `welle+1` / `vorbei`. `4 + (welle-1)·2` Gegner gestaffelt alle 1,4 s aus
  neuen `enemySpawnPoints` (Parapet-Lücke); HP-Faktor `1 + (welle-1)·0,12`.
  Endliche Angriffskraft (Start 60, −1/Spawn) → bei 0 + leerem Feld `vorbei`.
  `SimOptions.waves` (Default aus; `main.ts` an), `SimState.wave` fürs HUD.
  Feste Start-Gegner raus. 82 Tests, Coverage src/sim 96,2 %.
- **AP2-03** · `30c70eb` · **Erster Gegner: Linieninfanterie.**
  `src/data/gegner.ts` (`EnemyDef`, Platzhalterzahlen), `src/sim/enemies.ts`
  (Zustandsmaschine anmarsch/angriff/tot, gerader Anmarsch via `moveCapsule`,
  Nahkampf alle 1,1 s in 1,6 m, Leiche 1,4 s; kein Pathing, keine Gegner-Gegner-
  Kollision). `raycastCylinder()` für Schüsse auf Gegner; `fire()` prüft Level
  **und** Gegner. Kill → `nachschub += 5`. Renderer: gepoolte Kapsel-Meshes +
  Billboard-HP-Balken + Trefferblitz. 73 Tests, Coverage src/sim 95,7 %.
- **AP2-02** · `c3cd6ab` · **Spieler-HP, Schaden, Tod/Respawn.**
  `src/sim/player.ts` (`PlayerCombat`, `applyDamage`, Respawn-Timer 3 s). Tod
  sperrt Look/Bewegung/Sprung/Feuern/Nachladen; Schwerkraft läuft weiter; voller
  Reset am Spawn. Renderer: roter Schaden-Flash + Abdunkeln im Tod (screenFx-
  Plane). Keine HP-Regeneration in AP2 (Merk-Posten). 55 Tests, Coverage
  src/sim 94,7 %.
- **AP2-01** · `35fe077` · **Waffen-Feuerlogik & Munition.**
  `src/sim/weapon.ts` — Kadenz-Cooldown (`60/kadenz`), Magazin + Reserve,
  Nachladen je `NachladeArt` (voller Wechsel = Rest verfällt; `ladestreifen`/
  `einzeln` blockweise & unterbrechbar), Hitscan über neues `raycast()` in
  `src/sim/collision.ts`. `src/data/waffen.ts`: Langgewehr M98 (v1, Platzhalter-
  zahlen). Input: Taste `R` = Nachladen. Renderer: grobes Viewmodel +
  Mündungsblitz + kurzlebiger Tracer. 49 Tests.

## Arbeitspaket 1 — Fundament & Kern-Infrastruktur · auf `main` (PR #1)

- **1.8** · Debug-Overlay (DOM/CSS, F3): fps, simTick, Spielerposition,
  yaw/pitch, aktuelles `InputCommand`. `onFrame`-Haken im Loop.
- **1.7** · Datenschema-Stubs: `src/data/schema.ts` — Typen für Waffen,
  Nationen, Klassen, Gegner (+ je ein Platzhalter-Beispiel, keine Logik).
- **1.6** · First-Person-Controller + Kamera + Test-Level:
  `src/sim/{index,collision,math,rng}.ts`, `src/render/`,
  `src/data/testlevel.ts`. Kapsel-gegen-AABB-Kollision, Step-Height, Schwerkraft,
  Fall-Respawn; Kamera folgt interpoliert dem Sim-State.
- **1.5** · Input-Layer: `createInput` → JSON-serialisierbares `InputCommand`
  pro Frame, Pointer-Lock, umbelegbare Tastenbelegung.
- **1.4** · Projekt-Hygiene, CI, Preview-Deploy: `.github/workflows/{ci,pages}.yml`,
  `LICENSE` (proprietär), `CONTRIBUTING.md`, `.editorconfig`/`.gitattributes`/
  `.nvmrc`/`.prettierignore`, `dependabot.yml`. `babylonjs` → `@babylonjs/core`.
  Sim-Grenze-Lint-Regel geschärft. Coverage nur auf `src/sim`.
- **1.3** · Sim-Skelett & State-Grenze: `Sim`/`SimState`-Schnittstelle,
  `math.ts` (handgerollter `Vec3`), `rng.ts` (mulberry32), eingefrorener State.
- **1.2** · Fester-Timestep-Loop: `src/loop.ts` — 60-Hz-Akkumulator, Render-
  Interpolation (`alpha`), 250-ms-Clamp gegen die Todesspirale.
- **1.1** · Scaffolding: Vite + TypeScript + Babylon, Ordnerstruktur
  (`src/{sim,render,input,ui,data,platform}`), ESLint (Flat) + Prettier +
  Vitest, Sim-Grenze per ESLint erzwungen.
