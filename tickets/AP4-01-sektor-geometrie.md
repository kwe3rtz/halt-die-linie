# AP4-01 — Sektor-Geometrie (das „H") als Daten + Renderer

**Status:** offen
**Arbeitspaket:** 4 · **Branch:** `arbeitspaket-4`
**Referenz:** `KONZEPT.md` §3 (Grundriss, Zonen, Maßstab kompakt halten),
`TECHNIK.md` (eine Datenquelle für Render + Sim), `src/data/testlevel.ts` (Vorbild).

## Ziel

Der handgebaute Greybox-Sektor als **reine Daten**, aus modularen Bausteinen
zusammengesetzt, als *eine* Quelle für Render-Meshes und Sim-Collider. Am Ende
läuft man in First Person durch das ganze H: Feindzonen-Rand → vorderes Labyrinth
(Stub) → Frontlinie mit benannten Abschnitten → offenes Feld → Verbindungsgraben
→ Home-Line. **Kein** neues Gameplay-Verhalten — nur die Bühne. Der Wave-Loop aus
AP2/AP3 läuft weiter (Gegner noch Geradeauslauf, Pathing kommt in AP4-02).

## Umsetzung

**Daten (`src/data`):**

- `src/data/module.ts`: kleiner Baukasten. `modul(typ, at, drehung)` → `LevelBox[]`.
  Typen (Platzhalter-Geometrie, Boxen): `grabengerade`, `grabenknick`,
  `parapet` (inkl. Feuertritt als **begehbare Rampe/Stufe — kein Sprung nötig**),
  `unterstand`, `rampe`, `kartengrenze` (hohe Sperrwand). Festes Rastermaß
  (`RASTER = 4` m), Blöcke rasten darauf ein. Kommentiert: **derselbe Baukasten
  wird später vom Generator genutzt**.
- `src/data/sektor.ts`: der Greybox-Sektor. Setzt das H aus `modul(...)` zusammen,
  exportiert `sektorGreybox: SektorData`.
- `SektorData` (neuer Typ, neben `LevelData`): **ist** ein `LevelData` (boxes,
  spawnPoints, enemySpawnPoints) **plus** semantische Metadaten:
  ```ts
  type ZonenId =
    | "feindzone" | "labyrinth" | "frontlinie"
    | "feld" | "verbindungsgraben" | "homeline";
  interface SektorMeta {
    zonen: { id: ZonenId; bounds: Aabb }[];
    frontAbschnitte: {
      id: string;                    // "A" | "B" | "C"
      bounds: Aabb;
      parapetBreschen: Vec3[];       // Stellen, an denen das Parapet aufreißbar ist
      bauSlots: Vec3[];
      depot: Vec3;
    }[];
    feindAnmarsch: Vec3[];           // Spawn/Startpunkte am Nordrand (die 2 schrägen Korridore)
    homeZugaenge: { id: string; pos: Vec3 }[];   // Verbindungsgraben + Feld links/rechts
    landmark: Vec3;
    spielerSpawn: Vec3[];            // an der Frontlinie
  }
  interface SektorData extends LevelData { meta: SektorMeta; }
  ```
- `src/sim/sektor.ts`: reine Helfer `zoneAt(meta, pos): ZonenId | null`,
  `abschnittAt(meta, pos): string | null` (für AP4-03/04).

**Maße — Greybox-Startwerte, im Spieltest justiert** (`KONZEPT.md` §3 „Maßstab
kompakt halten"; alle 3 Sparring-KIs: in FP wirken Strecken doppelt so lang):

| | Startwert |
|---|---|
| Frontlinie Breite | ~48 m = 3 Abschnitte à ~16 m |
| Labyrinth-Tiefe (Stub) | ~36 m |
| offenes Feld, Tiefe | ~40 m |
| Verbindungsgraben | ~28 m lang, 2 Knicke, ~2,6 m breit |
| Home-Line | volle Breite, ~14 m tief |
| Grabensohle / Parapet-Oberkante / Feuertritt-Oberkante | −1,8 m / +0,4 m / ~+0,75 m über Sohle |
| freier Sprint Front → Home | ~11–15 s |

Feuertritt-Höhe gegen `PLAYER_EYE` prüfen (Kamera soll knapp über der Brustwehr
liegen) — sonst `// TODO(Rückfrage)`.

Das **vordere Labyrinth ist in AP4-01 nur ein Stub**: 3–4 kurze
Verzweigungsgräben + Trichter-Boxen + das Landmark. Der echte Generator ist ein
späteres Paket.

**Sim:** `createSim(seed, level, options)` nimmt weiter `LevelData` — `SektorData`
erfüllt das, keine Logik-Änderung. `enemySpawnPoints` = `meta.feindAnmarsch`.

**Render (`src/render`):** Boxen wie gehabt, aber **pro Zone ein eigenes Material**
(grobe, klar unterscheidbare Farbtöne) — erste Stufe der Zonensilhouette
(Feinschliff AP4-05). Landmark als grobes Platzhalter-Mesh.

**`main.ts`:** `testLevel` → `sektorGreybox` fürs laufende Spiel. `testLevel`
bleibt für die bestehenden AP1–AP3-Tests.

## Akzeptanzkriterien

- `npm run dev`: man läuft in FP durch alle Zonen des H, ohne durch Wände/Boden
  zu fallen; über den Feuertritt kommt man **ohne Sprung** ans Parapet und sieht
  ins Labyrinth; Zonen sind farblich unterscheidbar.
- Gegner spawnen an `meta.feindAnmarsch` und marschieren an (noch Geradeauslauf).
- `SektorData` enthält keine Babylon-Typen; `src/sim` importiert nichts aus
  render/ui/input.
- Vitest `sektor.test.ts`: `sektorGreybox` ist wohlgeformt (jede Zone hat Bounds;
  3 Frontabschnitte mit je ≥1 Bresche + Depot; `feindAnmarsch` nicht leer);
  `zoneAt`/`abschnittAt` liefern für Stichproben das Erwartete.
- Golden-/Replay-Test (`sim.test.ts`) weiter grün (nutzt `testLevel`).
- Alle Checks grün, goldene Regel gehalten.

## Offene Rückfragen

Zahlen sind Greybox-Startwerte. Wenn `SektorData extends LevelData` unsauber wird
(z. B. weil der Renderer die Meta doch anders braucht): Komposition
(`{ level, meta }`) — `// TODO(Rückfrage)`, konservativ die einfachere Variante.
