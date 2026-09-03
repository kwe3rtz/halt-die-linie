# Changelog

Kuratierte, lesbare Fassung — ein Eintrag pro Ticket, neueste oben, gruppiert
nach Arbeitspaket. Ground Truth ist die git-History; die vollen Ticket-Berichte
liegen in `tickets/erledigt/`.

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
