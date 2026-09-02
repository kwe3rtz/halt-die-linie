# AP2-04 — Wave-Director

**Status:** offen
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
