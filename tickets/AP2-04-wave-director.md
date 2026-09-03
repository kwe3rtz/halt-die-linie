# AP2-04 — Wave-Director

**Status:** review
**Arbeitspaket:** 2 · **Branch:** `arbeitspaket-2`
**Abhängigkeiten:** AP2-03
**Vorbedingung:** `AUFGABEN.md` gelesen. Goldene Regel gilt.
**Referenz:** `KONZEPT.md` §6 (Wellen zermürben eine endliche Angriffskraft).

## Ziel

Gegner kommen in Wellen: spawnen über Zeit, Welle gilt als geschafft wenn alle
tot, kurze Pause, nächste Welle etwas härter. Eine **endliche Angriffskraft**
als Zähler (Konzept-Kern) — ist sie aufgebraucht, ist der Einsatz „gewonnen"
(vorerst nur ein State-Flag, kein Zeit-Finale, keine Extraktion in AP2).

## Umsetzung

**Sim (`src/sim`):**
- `src/sim/wave.ts`:
  - Director-Zustand: `{ welle: number, phase: 'aufbau' | 'welle' | 'pause' | 'vorbei',
    spawnQueue: SpawnPlan[], spawnTimer: number, angriffskraft: number }`.
  - `angriffskraft` startet bei einem festen Wert (Platzhalter, z. B. 60
    „Mann"). Jeder gespawnte Gegner zieht davon ab. Bei `<= 0` und keine Gegner
    mehr → `phase = 'vorbei'`.
  - Pro Welle: `anzahl = basis + welle * zuwachs` Gegner (Platzhalter),
    gestaffelt gespawnt (`spawnTimer`), von den Spawnpunkten des Levels.
    Leichte Skalierung der Gegner-HP pro Welle (kleiner Faktor) — optional,
    sonst `// TODO(Rückfrage)`.
  - Welle geschafft wenn `spawnQueue` leer **und** keine lebenden Gegner →
    kurze `pause` → nächste `welle`.
  - `updateWave(state, dt)` treibt das; nutzt `spawnEnemy` aus AP2-03 und
    `src/sim/rng.ts` für Spawnpunkt-Auswahl.
- `SimState` um `wave: { welle, phase, angriffskraftRest }` erweitern (HUD liest
  das in AP2-05).
- Start: erste Welle nach kurzer `aufbau`-Phase automatisch (kein Button in
  AP2 — der „Welle starten"-Button kommt mit der echten Einsatzstruktur später).

**Render:** nichts Eigenes nötig (Gegner-Rendering ist AP2-03). Optional ein
dezenter Hinweis-Text bei Phasenwechsel — aber das ist eigentlich HUD (AP2-05),
hier weglassen.

## Akzeptanzkriterien

- Nach Spielstart spawnt Welle 1 gestaffelt; alle erledigt → Pause → Welle 2 mit
  mehr Gegnern.
- `angriffskraftRest` sinkt mit jedem Spawn; bei 0 + leerem Feld → `phase
  'vorbei'`.
- Kein Spawn während `pause`/`vorbei`.
- Vitest `src/sim/wave.test.ts`: Wellen-Fortschritt, Spawn-Staffelung (über
  simulierte Ticks), Angriffskraft-Abbau, `vorbei`-Bedingung, Skalierung.
- Alle Checks grün, goldene Regel gehalten.

## Offene Rückfragen

`// TODO(Rückfrage):` bei Unklarheit. Zahlen sind Platzhalter (Balance später,
`KONZEPT.md` §9.6).

---

## Bericht — AP2-04

COMMIT: <wird beim Commit ergänzt> (Branch `arbeitspaket-2`)
CI: grün / grün (siehe Nachricht an ki-game-10 mit Hash)
TODO(Rückfrage): keine neuen. HP-Skalierung pro Welle ist umgesetzt (Faktor
`1 + (welle-1)*0.12`), nicht als offene Frage gelassen.

Checks: typecheck / lint / format:check / test:coverage / build — alle grün.
Tests: 82 (11 Dateien) · Coverage src/sim: 96,23 % (wave.ts 100 %) · Bundle
index-\*.js ~6,87 MB / ~1,52 MB gzip (Δ ~+5 KB).

Umsetzung:

- `src/sim/wave.ts`: `WaveState { welle, phase, spawnQueue, spawnTimer,
  phaseTimer, angriffskraft }`, `WavePhase = 'aufbau' | 'welle' | 'pause' |
  'vorbei'`. `createWaveState()`, `updateWave(state, ctx, dt)`.
  - `aufbau` (3 s) → `welle` 1. Pro Welle `4 + (welle-1)*2` Gegner, gestaffelt
    alle 1,4 s von den Level-Spawnpunkten (rng-Auswahl). HP-Faktor
    `1 + (welle-1)*0,12`.
  - `angriffskraft` startet bei 60, −1 pro tatsächlichem Spawn; nie mehr planen
    als Angriffskraft übrig ist.
  - Welle geschafft = Queue leer **und** keine lebenden Gegner → `pause` (5 s)
    → nächste Welle. Bei `angriffskraft <= 0` + leerem Feld → `vorbei`.
- `src/sim/enemies.ts`: `spawnEnemy(def, id, pos, hpFaktor = 1)` skaliert HP.
- `src/sim/collision.ts`: `LevelData.enemySpawnPoints?` (Fallback: `spawnPoints`).
- `src/data/testlevel.ts`: 4 `enemySpawnPoints` in der Parapet-Lücke (freier
  gerader Weg zum Spieler — es gibt kein Pathing).
- `src/sim/index.ts`: `SimOptions.waves?: boolean` (Default aus), eigener
  `waveRng` (abgeleiteter Seed), `updateWave` im Tick nach `updateEnemies`.
  `SimState.wave = { welle, phase, angriffskraftRest }` (eingefroren, für das
  HUD in AP2-05). `Sim.spawnEnemy` unverändert.
- `src/main.ts`: `createSim(SEED, testLevel, { waves: true })` — die festen
  Start-Gegner sind weg.
- Tests: `src/sim/wave.test.ts` (6: Aufbau→Welle, Staffelung + Angriffskraft-
  Abbau, Welle→Pause→Welle 2 mit mehr Gegnern + HP-Faktor, kein Spawn in der
  Pause, `vorbei`-Bedingung). `sim.test.ts` +3 (ohne/mit `waves`,
  Determinismus).

Entscheidungen / Abweichungen vom Ticket:

1. **`waves`-Flag statt Auto-Start:** Der Director läuft nur mit
   `SimOptions.waves: true` (im echten Spiel via `main.ts` an). So bleiben die
   Tests der anderen Systeme (AP2-01..03) frei von Gegner-Spawns. „Nach
   Spielstart spawnt Welle 1" gilt damit im Spiel, Tests opten ein.
2. **`enemySpawnPoints` statt Spieler-`spawnPoints`:** Gegner an den
   Spieler-Startpunkten zu spawnen wäre unsinnig (mitten im Spieler). Neues
   optionales Feld; Fallback auf `spawnPoints`, wenn es fehlt.
3. **HP-Skalierung umgesetzt** (nicht als `TODO(Rückfrage)` gelassen) — kleiner
   Faktor `1 + (welle-1)*0,12`, klar als Platzhalter kommentiert.
4. **`angriffskraft` −1 nur bei echtem Spawn** (nicht beim Einreihen). So passt
   der Zähler auch, wenn eine Welle wegen erschöpfter Angriffskraft gekürzt wird.
5. **eigener `waveRng`** (Seed `seed ^ 0x5a5a5a5a`), damit die Spawnpunkt-Wahl
   `pickSpawn` (Spieler) nicht in der rng-Sequenz stört. Weiter deterministisch.

Manuell geprüft (headless Chromium): Aufbau ~3 s ohne Gegner, dann Welle 1 —
Gegner erscheinen gestaffelt aus der Parapet-Lücke, marschieren an, roter
Schadens-Flash bei Kontakt, HP-Balken, keine Konsolenfehler.
