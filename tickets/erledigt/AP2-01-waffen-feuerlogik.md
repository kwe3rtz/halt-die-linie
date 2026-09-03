# AP2-01 — Waffen-Feuerlogik & Munition

**Status:** erledigt · `35fe077` · reviewed 2026-09-03
**Arbeitspaket:** 2 · **Branch:** `arbeitspaket-2`

## Ziel

Der Spieler kann eine Hitscan-Waffe abfeuern: Kadenz-Cooldown, Magazin +
Reserve, Nachladen. Getrieben von einem `WeaponDef` (aus `src/data`). Noch kein
Gegner — der Raycast trifft vorerst nur Level-Geometrie (Entities ab AP2-03).

## Spezifikation (Kurzfassung)

- `src/sim/weapon.ts`: Waffenzustand pro Spieler; `fire()` (Cooldown `60/kadenz`,
  `feuerModus`: repetierer/halbauto/pump = Flanke, vollauto = gehalten; Hitscan-
  Raycast gegen AABBs); `reload()` je `NachladeArt` (`ladestreifen` blockweise à
  5 & unterbrechbar; `magazin`/`trommel`/`gurt`/`revolver` = voller Wechsel, Rest
  verfällt; `einzeln` blockweise à 1 & unterbrechbar). Reine Funktionen,
  injizierte Zeit, kein `Math.random`/Babylon.
- `src/sim/index.ts`: Spieler-Waffenzustand, `fire`/`reload` im tick,
  `SimState.player.weapon` HUD-lesbar, Blickrichtung via `dirFromYawPitch`.
- `src/input`: Button + Taste `R` = `reload`.
- `src/data/waffen.ts`: `langgewehr-m98` (v1, Platzhalterzahlen).
- `src/render`: grobes Viewmodel, Mündungsblitz-Stub, kurzlebiger Tracer.

## Akzeptanzkriterien

Linksklick feuert (Kadenz), Magazin leert sich, `R` lädt nach, kein Feuern
während Nachladen, `ladestreifen` durch Feuern unterbrechbar (Teilfortschritt
bleibt), ohne Reserve kein Nachladen. `weapon.test.ts` deckt Cooldown,
Leerschießen, Nachlade-Arten, Unterbrechbarkeit ab. Alle Checks grün, goldene
Regel gehalten.

---

## Bericht — AP2-01

COMMIT: `35fe077` (Branch `arbeitspaket-2`, gepusht)
CI: CI = success, Pages Preview = success — beide auf `35fe077`.
Hinweis: die vorherige CI auf `a3eb53a` (docs-Commit) war ROT — `prettier
--check` bemängelte `tickets/*.md`. AP2-01 fixt das: `tickets/` in
`.prettierignore`.
TODO(Rückfrage): keine neuen.

Checks: typecheck / lint / format:check — ok. test:coverage — 8 Dateien, 49
Tests grün. Coverage src/sim 92,69 % lines (`weapon.ts` 100 %). build — ok,
Bundle 6,859 MB / 1,517 MB gzip (+5 KB durch Viewmodel/Tracer).

Umsetzung: `src/sim/weapon.ts` (`WeaponState`, `fire`/`reload`/`advanceWeapon`,
in-place, deterministisch), `src/sim/collision.ts` (`raycast()` Slab + `RayHit`),
`src/sim/math.ts` (`dirFromYawPitch`), `src/data/waffen.ts` (`langgewehrM98`,
`standardWaffe`), `src/sim/index.ts` (Waffenzustand, `InputCommand.buttons.reload`,
`SimState.player.weapon` + `SimState.lastShot`, Feuern/Nachladen im tick, Flanke
via `firePrev`), `src/input/index.ts` (Taste `KeyR`), `src/render/index.ts`
(Viewmodel als Kamera-Kind, Mündungsblitz-Box + Tracer beim `lastShot`-Signal).
Tests: `weapon.test.ts` (11) + `sim.test.ts` +3 Integration.

Entscheidungen / Abweichungen:
1. `fire()`-Signatur: statt `fire(..., def, dt)` umgesetzt als `fire(..., def,
   buttons)` + separates `advanceWeapon(state, def, dt)` fürs Runterzählen (so
   wie der Ticket-Text es für `src/sim/index.ts` selbst vorgibt).
2. `src/sim/{index,weapon}.ts` importieren aus `../data` (schema-Typen + die
   WeaponDef-Konstante). Vom ESLint-Sim-Guard erlaubt (nur render/input/ui/
   babylon verboten), vom Ticket verlangt, `src/data` ist reine Daten. Goldene
   Regel gewahrt.
3. `WeaponState` wird in-place mutiert (ein Objekt pro Spieler) — nicht immutable
   wie `moveCapsule`. „Rein" i. S. v. deterministisch/keine I/O.
4. Viewmodel wegen Near-Plane-Perspektive klobig → auf einen kleinen Lauf
   runtergetunt. Ein sauberer Viewmodel-Layer wäre Scope-Creep.

Manuell (headless Chromium): App startet, Viewmodel sichtbar, keine Konsolen-
fehler. Fire-Kette input→loop→sim→Overlay end-to-end verifiziert. Mündungsblitz/
Tracer (50 ms) headless nicht sauber im Screenshot — `lastShot`-Pfad per
Unit-Test abgedeckt.

---

## Review — AP2-01 · 2026-09-03

Verdikt: **grünes Licht**.
Geprüft: lokal typecheck/lint/format/test grün (49 Tests), CI grün auf
`35fe077`, Coverage src/sim 92,7 %. `weapon.ts` gelesen — feuerModus-Flanke,
Cooldown `60/kadenz`, Magazin-verfällt bei vollem Wechsel, `ladestreifen`/
`einzeln` chainen im `while`-Loop korrekt auch über große `dt`, keine Globals/
Babylon/`Math.random`.
Anmerkungen: Die 4 Abweichungen sind alle vertretbar und nicht blockierend.
`prettierignore`-Fix für `tickets/` passt. Merk-Posten (später): `math.ts` erst
63 % Coverage, Golden-/Replay-Test fehlt noch.
Folge-Ticket: AP2-02.
