# AP2-01 — Waffen-Feuerlogik & Munition

**Status:** offen
**Arbeitspaket:** 2 · **Branch:** `arbeitspaket-2`
**Abhängigkeiten:** AP1 komplett (`src/sim`, `src/data/schema.ts`, `src/render`)
**Vorbedingung:** `AUFGABEN.md` (Arbeitsweise + Konventionen) gelesen. Goldene
Regel gilt.

## Ziel

Der Spieler kann eine Hitscan-Waffe abfeuern: Kadenz-Cooldown, Magazin +
Reserve, Nachladen. Die Waffe wird von einem `WeaponDef` (aus `src/data`)
getrieben. Noch **kein** Gegner zum Treffen — der Raycast trifft vorerst nur
Level-Geometrie; Treffer-auf-Entities kommt in AP2-03.

## Umsetzung

**Sim (`src/sim`):**
- Neues Modul `src/sim/weapon.ts`:
  - Waffenzustand pro Spieler: `{ defId, imLauf: number, reserve: number, cooldown: number, reloadRest: number }`.
  - `fire(state, world, origin, richtung, weaponDef, dt)` → Ergebnis
    `{ schuss: boolean, treffer?: { punkt: Vec3, distanz: number } }`.
    - Nur feuern wenn `cooldown <= 0`, `imLauf > 0`, nicht am Nachladen.
    - Cooldown nach Schuss = `60 / weaponDef.kadenz` Sekunden.
    - `feuerModus`: `repetierer`/`halbauto` = ein Schuss pro Tasten-Flanke
      (`fire` wurde in diesem Tick neu gedrückt); `vollauto` = solange gehalten;
      `pump` wie `repetierer`.
    - Hitscan: Raycast `origin` + `richtung` gegen `world` (AABBs) → nächster
      Trefferpunkt oder `undefined` (nichts getroffen, Reichweite
      `weaponDef.handling.reichweiteMax`).
  - `reload(state, weaponDef)` startet Nachladen; Dauer + Verhalten nach
    `weaponDef.nachladeArt`:
    - `ladestreifen`: pro Streifen (5 Schuss) ein Zeitblock, **unterbrechbar**
      (Feuern bricht ab, bereits geladene Streifen bleiben).
    - `magazin` / `trommel` / `gurt`: ein Block, Restmunition im „alten Magazin"
      **verfällt**.
    - `revolver`: ein Block (Schnelllader-Perk gibt's noch nicht — immer Block).
    - `einzeln`: pro Schuss ein kleiner Block, unterbrechbar.
  - Reine Funktionen / injizierte Zeit (`dt`), kein `Math.random`, kein Babylon.
- `src/sim/index.ts`:
  - Spieler bekommt einen Waffenzustand (Default-Waffe: siehe unten).
  - Im `tick`: `cmd.buttons.fire` → `fire(...)`, ein neuer Button `reload`
    (siehe Input unten) → `reload(...)`. Cooldown/Reload-Timer runterzählen.
  - `SimState.player` um `weapon: { defId, imLauf, reserve, reloading: boolean }`
    erweitern (für HUD/Render lesbar).
  - Blickrichtung als Vektor aus `yaw`/`pitch` (Helfer in `src/sim/math.ts`
    ergänzen, z. B. `dirFromYawPitch`).

**Input (`src/input`):**
- `InputCommand.buttons` um `reload: boolean` erweitern, Default-Taste `R`.
- `fire` bleibt Maustaste links.

**Daten (`src/data`):**
- `src/data/waffen.ts`: **eine** echte `WeaponDef` — `langgewehr-m98`
  (`repetiergewehr`, `repetierer`, `ladestreifen`, 5 Schuss, ~45 Reserve, Werte
  aus `WAFFEN.md`). Klar als „v1, Platzhalterzahlen" kommentiert.
- Die Sim nutzt diese Def als Default-Waffe.

**Render (`src/render`):**
- Grobes Viewmodel: ein kleiner Quader unten-rechts im Blickfeld (Kamera-Kind
  oder pro Frame relativ zur Kamera positioniert).
- Mündungsblitz-Stub bei Schuss (kurzer heller Punkt / Skalierung), Tracer-Linie
  vom Lauf zum Trefferpunkt für ~50 ms.
- Liest nur Sim-State + ein „letzter Schuss"-Signal; keine Feuerlogik im Renderer.

## Akzeptanzkriterien

- Linksklick feuert; Feuerrate entspricht `kadenz` (Repetierer: ein Schuss pro
  Klick, kein Dauerfeuer).
- Magazin leert sich, `R` lädt nach; während des Nachladens kein Feuern.
- `ladestreifen`-Nachladen ist durch Feuern unterbrechbar, Teilfortschritt
  bleibt.
- Ohne Reserve kein Nachladen (leer bleibt leer).
- Vitest: `src/sim/weapon.test.ts` deckt Cooldown, Leerschießen, Nachlade-Arten
  (mind. `ladestreifen` + `magazin`), Unterbrechbarkeit ab.
- `typecheck / lint / format:check / test:coverage / build` grün. Goldene Regel
  eingehalten (`src/sim/weapon.ts` importiert kein Babylon, kein `window`).

## Offene Rückfragen

Bei Unklarheit `// TODO(Rückfrage):` + im Bericht auflisten, konservativ
weiterbauen.
