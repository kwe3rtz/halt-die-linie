# AP2-03 — Erster Gegner: Linieninfanterie

**Status:** erledigt · `30c70eb` · reviewed 2026-09-03
**Arbeitspaket:** 2 · **Branch:** `arbeitspaket-2`
**Referenz:** `KONZEPT.md` §5 (Linieninfanterie), `src/data/schema.ts` (`EnemyDef`).

## Ziel

Ein Gegnertyp, den man erschießen kann und der zurückschlägt (Nahkampf). Die
Basis für Wellen (AP2-04). **Kein** Fernkampf, **keine** Pfadfindung in AP2 —
gerader Weg zum Spieler auf dem offenen Test-Level reicht.

## Umsetzung

**Sim (`src/sim`):**
- `src/sim/enemies.ts`:
  - Gegner-Entität: `{ id, pos: Vec3, vel: Vec3, hp: number, def: EnemyDef,
    zustand: 'anmarsch' | 'angriff' | 'tot', angriffCooldown: number }`.
  - Verwaltung als Liste im Sim-State: `SimState.enemies: readonly EnemyEntity[]`
    (eingefroren nach außen wie `player`).
  - `spawnEnemy(defId, pos)` / `updateEnemies(state, world, dt)`:
    - `anmarsch`: bewege dich Richtung Spieler (horizontale Richtung, `tempo`
      aus `EnemyDef`), simple Kollision gegen `world` (Kapsel-Helfer aus
      `src/sim/collision.ts` wiederverwenden — ggf. leicht verallgemeinern).
    - In Nahkampfreichweite (~1.5 m): `angriff` — alle `angriffCooldown`
      Sekunden `applyDamage(player, def.schaden)`.
    - `tot`: kurz liegen bleiben, dann aus der Liste entfernen; **Nachschub
      gutschreiben** (Zähler in AP2-05; hier schon ein `state.nachschub += X`
      vorsehen oder ein Event).
  - Treffer: die `fire`-Logik aus AP2-01 erweitern — Raycast auch gegen
    Gegner-Kapseln testen, nächster Treffer (Gegner vs. Level) gewinnt. Treffer
    → `enemy.hp -= weaponDef.basisSchaden` (Weakpoint/Multiplikatoren später).
- Kein Babylon, kein `Math.random` (Spawn-Auswahl über `src/sim/rng.ts`, Seed
  aus dem Sim).

**Daten (`src/data`):**
- `src/data/gegner.ts`: echte `EnemyDef` `linieninfanterie` (`mode: 'tag'`,
  `konterHaerte: 'weich'`, `verhaltensTag: 'feuer-und-bewegung'` — auch wenn AP2
  nur Anmarsch/Nahkampf umsetzt; Kommentar dazu). Platzhalterzahlen.

**Render (`src/render`):**
- Pro Gegner eine Kapsel-/Box-Mesh, Position/Zustand aus dem Sim-State
  (Pooling: Meshes wiederverwenden, nicht pro Frame neu bauen).
- Farbe/Signal nach Zustand (Anmarsch neutral, Angriff kurz hervorheben, Tod
  ausblenden). Kleiner HP-Balken über dem Kopf (Billboard oder simpler Quad).
- Treffer-Feedback: kurzes Aufblitzen der Mesh beim `hp`-Rückgang.

## Akzeptanzkriterien

- Gespawnter Gegner läuft auf den Spieler zu, bleibt nicht in Wänden stecken.
- In Reichweite fügt er periodisch Schaden zu (Spieler-HP sinkt, AP2-02).
- Raycast-Feuer trifft den Gegner; nach N Treffern stirbt er und verschwindet;
  `nachschub` erhöht sich.
- Mehrere Gegner gleichzeitig funktionieren (Liste, kein Hardcode auf 1).
- Vitest `src/sim/enemies.test.ts`: Anmarsch-Richtung, Angriff in Reichweite,
  Tod nach Schaden, Nachschub-Gutschrift, Entfernen aus der Liste.
- Alle Checks grün, goldene Regel gehalten.

---

## Bericht — AP2-03

COMMIT: `30c70eb` (Branch `arbeitspaket-2`)
CI: CI = success, Pages Preview = success — beide auf `30c70eb`.
TODO(Rückfrage): keine neuen.

Checks: typecheck / lint / format:check — ok. test:coverage — 10 Dateien, 73
Tests grün. Coverage src/sim 95,7 % lines (`enemies.ts` 97,2 %; `math.ts` noch
63 % — wird mit dem Golden-/Replay-Test in AP2-05 hochgezogen). build — ok,
Bundle ~6,87 MB / ~1,52 MB gzip.

Umsetzung: `src/data/gegner.ts` (`EnemyDef linieninfanterie`: tag/weich/
feuer-und-bewegung, hp 100, schaden 10, `BASIS_TEMPO` 2,6 m/s · tempo; +
`gegnerDefs`-Registry). `src/sim/enemies.ts` (`EnemyEntity`-Liste,
deterministisch; `spawnEnemy(def, id, pos)`, `damageEnemy(enemy, menge, tick) →
boolean` [true = tödlich], `updateEnemies(...)` — Anmarsch gerade Richtung
Spieler via `moveCapsule`, Angriff in 1,6 m alle 1,1 s über `onHitPlayer`, tot
1,4 s liegen dann raus; keine Gegner-Gegner-Kollision, kein Pathing).
`src/sim/collision.ts` (`raycastCylinder()` als Kapsel-Näherung).
`src/sim/weapon.ts` (`fire(..., ziele: AimTarget[] = [])` — Raycast gegen Level
UND Gegner-Kapseln, nächster Treffer gewinnt; `RayHit` → `WeaponHit` mit
`enemyId`). `src/sim/index.ts` (`SimState.enemies` eingefroren +
`SimState.nachschub`; Feuertreffer mit `enemyId` → `damageEnemy(basisSchaden)`,
Kill → `nachschub += 5`; `Sim.spawnEnemy(defId, pos)` für den Wave-Director;
`SimOptions.enemies` für Start-Gegner). `src/render/index.ts` (Gegner-Visuals
gepoolt per `Map<id>`, Kapsel-Mesh + Zustandsfarbe [Feldgrau / Angriff-Highlight
/ Tod → `setEnabled(false)`], HP-Balken als Billboard-Quad, Trefferblitz ~90 ms;
keine Logik). `src/main.ts` (drei feste Start-Gegner in der Feuerbucht — AP2-04
ersetzt das durch den Director).

Entscheidungen / Abweichungen:
1. `spawnEnemy(def, id, pos)` im Modul (stabile Id nötig, `enemies.ts`
   importiert keine Daten); `defId`-Auflösung + Id-Vergabe macht ein Closure
   `spawnEnemyById` in `index.ts`, das auch `Sim.spawnEnemy` bedient.
2. Nachschub-Gutschrift beim Kill-Moment (Rückgabe von `damageEnemy`), nicht
   beim Wegräumen der Leiche.
3. Feste Start-Gegner in der Feuerbucht (z 13–14) statt im Niemandsland: Seed 1
   spawnt den Spieler hinter dem rechten Parapet; Gegner von jenseits kämen ohne
   Pathing nicht durch. AP2-04 übernimmt das Spawnen ohnehin.
4. Gegner werden im Renderer nicht interpoliert (nur der Spieler) — langsam
   (2,6 m/s), Jitter minimal; bei Bedarf später nachziehbar.
5. Gegner-Kollision untereinander ignoriert (Ticket).

Manuell (headless Chromium): drei Kapsel-Gegner marschieren an, grüne HP-Balken,
roter Schadens-Flash bei Nahkampf-Kontakt, Raycast-Feuer tötet einen (3 → 2,
Mesh disposed). Keine Konsolenfehler. Screenshots vorhanden.

---

## Review — AP2-03 · 2026-09-03

Verdikt: **grünes Licht**.
Geprüft: lokal typecheck/lint/format/test grün (73 Tests), CI grün auf
`30c70eb`, Coverage src/sim 95,7 % (`enemies.ts` 97,2 %). `enemies.ts` +
`gegner.ts` gelesen — saubere Zustandsmaschine (anmarsch/angriff/tot),
`damageEnemy` liefert `true` beim tödlichen Treffer (Nachschub-Gutschrift beim
Aufrufer), `updateEnemies` gibt Überlebende zurück & mutiert die Entitäten,
`spielerLebt`-Guard, Leichen fallen weiter (`moveCapsule`). Deterministisch,
kein Babylon/`Math.random`. `../data`-Import erlaubt.
Anmerkungen: Die 5 Abweichungen sind alle vertretbar. Feste Start-Gegner in der
Feuerbucht ist ein sauberer Zwischenschritt (AP2-04 ersetzt es). `math.ts`-
Coverage + Golden-/Replay-Test bleiben Merk-Posten für AP2-05.
Folge-Ticket: AP2-04 (Wave-Director).
