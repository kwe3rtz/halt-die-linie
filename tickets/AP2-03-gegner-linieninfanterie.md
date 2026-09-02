# AP2-03 — Erster Gegner: Linieninfanterie

**Status:** offen
**Arbeitspaket:** 2 · **Branch:** `arbeitspaket-2`
**Abhängigkeiten:** AP2-01, AP2-02
**Vorbedingung:** `AUFGABEN.md` gelesen. Goldene Regel gilt.
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

## Offene Rückfragen

`// TODO(Rückfrage):` bei Unklarheit. Erwartbar: Gegner-Kollision
untereinander (erstmal ignorieren/überlappen lassen ist ok), genaue
Reichweiten/Zahlen (Platzhalter, Balance später).
