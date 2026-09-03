# AP2-02 — Spieler-HP, Schaden, Tod/Respawn

**Status:** erledigt · `c3cd6ab` · reviewed 2026-09-03
**Arbeitspaket:** 2 · **Branch:** `arbeitspaket-2`

## Ziel

Der Spieler hat Lebenspunkte, kann Schaden nehmen, stirbt und respawnt. Ein
klarer Schadens-Eingang, den AP2-03 (Gegner) nutzt.

## Spezifikation (Kurzfassung)

- `src/sim/player.ts`: `{ hp, maxHp, tot, respawnRest }`; `applyDamage(player,
  menge, quelle?)` (HP runter, `tot` bei ≤ 0, `respawnRest` starten). Im tick:
  Tod sperrt Bewegung/Feuern, Timer runter, bei 0 voller Respawn am Spawn.
  Konservativ: **keine** HP-Regeneration in AP2 (`// TODO(Rückfrage)`, Regen
  kommt später mit dem Sanitäter). `SimState.player` + `hp`/`maxHp`/`tot`.
- `src/render`: kurzer roter Flash bei Schaden, Abdunkeln bei `tot`.

## Akzeptanzkriterien

Schaden reduziert HP (Sim-State), `tot` bei 0. Im Tod keine Bewegung/kein
Feuern, nach `respawnRest` voller Respawn. `player.test.ts`: Schaden,
Tod-Schwelle, Respawn-Timer, Eingabe-Sperre. Alle Checks grün, goldene Regel.

---

## Bericht — AP2-02

COMMIT: `c3cd6ab` (Branch `arbeitspaket-2`)
CI: CI = success, Pages Preview = success — beide auf `c3cd6ab`.
TODO(Rückfrage): `src/sim/player.ts:16` — keine HP-Regeneration in AP2 (wie
vorgegeben); Regen kommt später mit Sanitäter-Konzept / Balance-Runde, bis dahin
heilt nur der Respawn.

Checks: typecheck / lint / format:check — ok. test:coverage — 9 Dateien, 55
Tests grün. Coverage src/sim 94,65 % lines (`player.ts` 100 %). build — ok,
Bundle 6,860 MB / 1,518 MB gzip (+1 KB durch screenFx-Plane).

Umsetzung: `src/sim/player.ts` (`PlayerCombat`, `applyDamage(combat, menge,
quelle?)` — No-op im Tod / bei `menge ≤ 0`; `advancePlayerCombat(dt) → boolean`
im Respawn-Tick; `respawnCombat`). `src/sim/index.ts` (`SimState.player` +
hp/maxHp/tot; `Sim.applyDamage` dünner Wrapper für Tests/externe Quellen; tick
mit alive-Gate — im Tod gesperrt: Look, Bewegung, Sprung, Feuern, Nachladen;
weiter aktiv: Schwerkraft + Kollision, Waffen-Timer; `firePrev` immer getrackt;
voller Reset bei Respawn). `src/render/index.ts` (screenFx-Plane als Kamera-Kind,
renderingGroupId 1; roter Flash bei HP-Abfall ~320 ms; Abdunkeln alpha 0,62 bei
`tot`; keine Logik im Renderer).

Entscheidungen / Abweichungen:
1. Schadens-Eingang zweistufig: `player.applyDamage(combat, ...)` ist der
   eigentliche Eingang für AP2-03; `Sim.applyDamage(menge, quelle?)` nur ein
   Wrapper für Tests / externe Quellen (kann weg, wenn AP2-03 Schaden über einen
   Welt-Events-Kanal reingibt).
2. `quelle: string` statt getipptem Objekt (Entities erst ab AP2-03).
3. Im Tod bleibt die Kamera stehen, wo man fiel (Look eingefroren) — „keine
   Bewegung" wörtlich. Kein Death-Cam-Schwenk (Scope).
4. Kein Debug-Schaden-Key: das Ticket verschiebt die Schadensquelle auf AP2-03;
   Tests treiben `applyDamage` direkt.

Manuell (headless Chromium): App startet mit unsichtbarer screenFx-Plane, keine
Konsolenfehler. Flash/Abdunkeln mangels Schadensquelle nicht auslösbar —
Render-Diff trivial, Zustandslogik per Unit-Test (inkl. Sim-Integration) gedeckt.

---

## Review — AP2-02 · 2026-09-03

Verdikt: **grünes Licht**.
Geprüft: lokal typecheck/lint/format/test grün (55 Tests), CI grün auf
`c3cd6ab`, Coverage src/sim 94,7 %, `player.ts` 100 %. `player.ts` gelesen —
`applyDamage` No-op im Tod / bei `menge ≤ 0`, `advancePlayerCombat` liefert
`true` genau im Respawn-Tick, alles in-place & deterministisch. HP-Regen-
`TODO(Rückfrage)` korrekt vermerkt.
Anmerkungen: Die 4 Entscheidungen sind alle ok. **Merk-Posten** (nicht
blockierend): `math.ts` hängt bei 63 % Coverage, der Golden-/Replay-Test aus den
Konventionen fehlt noch — in AP2-05 / am AP2-Ende einen kleinen sim-Replay-Test
nachziehen.
Folge-Ticket: AP2-03.
