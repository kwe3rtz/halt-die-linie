# AP2-02 — Spieler-HP, Schaden, Tod/Respawn

**Status:** offen
**Arbeitspaket:** 2 · **Branch:** `arbeitspaket-2`
**Abhängigkeiten:** AP2-01
**Vorbedingung:** `AUFGABEN.md` gelesen. Goldene Regel gilt.

## Ziel

Der Spieler hat Lebenspunkte, kann Schaden nehmen, stirbt und respawnt. Ein
klarer Schadens-Eingang, den AP2-03 (Gegner) nutzt.

## Umsetzung

**Sim (`src/sim`):**
- `src/sim/player.ts` (oder in `index.ts`, wenn klein): Spielerzustand um
  `{ hp: number, maxHp: number, tot: boolean, respawnRest: number }`.
- Funktion `applyDamage(player, menge, quelle?)` — reduziert HP, setzt `tot`
  bei `hp <= 0`, startet `respawnRest`.
- Im `tick`:
  - Wenn `tot`: Bewegung/Feuern gesperrt, `respawnRest` runterzählen; bei 0 →
    Respawn am Spawnpunkt (Position, HP voll, Waffe voll, `tot = false`).
  - Optional: langsame HP-Regeneration außerhalb „kürzlich Schaden genommen"
    (kleiner Timer). Konservativ: erstmal **keine** Regen, nur Respawn — als
    `// TODO(Rückfrage)` vermerken, dass Regen später (Sanitäter-Konzept) kommt.
- `SimState.player` um `hp`, `maxHp`, `tot` erweitern.
- Kein Babylon, kein `Math.random`.

**Render (`src/render`):**
- Kurzer roter Vignette-/Flash-Effekt bei Schaden (Sim liefert ein „gerade
  Schaden genommen"-Signal oder Render vergleicht HP zwischen Frames).
- Bei `tot`: Bildschirm abdunkeln + „Gefallen — Respawn in Ns" ist Sache des
  HUD (AP2-05); hier reicht das Abdunkeln.

## Akzeptanzkriterien

- Schaden reduziert HP sichtbar (Sim-State); bei 0 `tot = true`.
- Im Tod-Zustand keine Bewegung, kein Feuern; nach `respawnRest` voller Respawn
  am Spawnpunkt.
- Vitest `src/sim/player.test.ts`: Schaden, Tod-Schwelle, Respawn-Timer,
  Eingabe-Sperre im Tod.
- Alle Checks grün, goldene Regel gehalten.

## Offene Rückfragen

`// TODO(Rückfrage):` bei Unklarheit, im Bericht auflisten.
