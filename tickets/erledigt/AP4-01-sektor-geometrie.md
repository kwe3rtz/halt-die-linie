# AP4-01 — Sektor-Geometrie (das „H") als Daten + Renderer

**Status:** erledigt · `a0badbf` · reviewed 2026-09-03
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

---

## Bericht — AP4-01

COMMIT: <wird beim Merge/Archiv ergänzt> (Branch arbeitspaket-4)
CI: grün / grün (Hash in der Nachricht an die Planer-Session)
TODO(Rückfrage):

1. **Feuertritt-/Parapet-Marge** (`src/data/module.ts`, Kommentar an
   `PARAPET_OBERKANTE`): Auge auf dem Feuertritt liegt bei −0,95 + PLAYER_EYE(1,6)
   = +0,65, also nur ~0,1 m über der Parapet-Oberkante (+0,55). Funktioniert
   (man sieht drüber), aber knapp; `PLAYER_EYE` ist ein nicht exportierter
   Platzhalter in `src/sim/index.ts`. Beim ersten Spieltest gegenchecken.
2. **Verbindungsgraben gerade statt „2 Knicke mit Nischen"**
   (`src/data/sektor.ts`, `TODO(Rückfrage)` im Code): als Greybox konservativ
   gerade ausgeführt (überdeckungs-/Kollisionssicher). Knicke + defensive
   Nischen + Sprengbarriere kommen mit AP4-04 bzw. Greybox-Feinschliff.
3. **Feld-Tiefe ~31 m statt ~40 m**: an die ~28-m-Grabenlänge und den
   Sparring-Konsens „kompakt halten" angeglichen. Greybox-Startwert.
4. **Feindzone für den Spieler noch nicht gesperrt**: in AP4-01 kein
   Blocker — der Spieler kann bis an den Nordrand laufen. Zutritts-Sperre ist
   Gameplay (AP4-02+).

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  (All matched files use Prettier code style!)
> vitest run --coverage            ✓  15 Dateien, 116 Tests (vorher 100)
    Coverage src/sim: 98,58 % Stmts / 96,19 % Branch / 100 % Funcs
    src/sim/sektor.ts: 100 % / 100 % / 100 %
> vite build                       ✓  built in ~30 s
    dist/assets/index-*.js  6.877,05 kB │ gzip: 1.523,31 kB   (Δ vernachlässigbar)
```

Tests: 116 (15 Dateien, +16) · Coverage src/sim: **98,58 %** · Bundle ~6,87 MB /
~1,52 MB gzip (Δ ~0 — kein neuer Import, nur ~600 Zeilen TS + Daten).

### Umsetzung

- **`src/data/module.ts`** (neu) — Rasterbaukasten, `RASTER = 4`.
  `modul(typ, at, drehung, opt)` → `LevelBox[]`. Sechs Typen wie im Ticket:
  `grabengerade`, `grabenknick`, `parapet` (Wand + **zweistufiger Feuertritt**,
  Stufen 0,40 m / 0,45 m ≤ `STEP_HEIGHT` — kein Sprung), `unterstand` (3 Wände +
  Dach), `rampe` (4 Stufen ≤ 0,45 m), `kartengrenze`. 90°-Rotation über eine
  reine `drehXZ`-Tabelle; `opt.laenge` / `opt.breite` als konservative Erweiterung
  der Ticket-Signatur (spart Aufruf-/Box-Wildwuchs). Vertikale Kennwerte
  (`OBERFLAECHE` 0 / `GRABEN_SOHLE` −1,8 / `FEUERTRITT_OBERKANTE` −0,95 /
  `PARAPET_OBERKANTE` +0,55) exportiert. `einrasten()` für den späteren Generator.
  Keine Babylon-Typen; importiert nur `Vec3` / `LevelBox` (Typ) aus `src/sim`.
- **`src/data/sektor.ts`** (neu) — `sektorGreybox: SektorData`, das „H" aus
  `modul(...)` + Roh-Quadern (`raw()`): Kartengrenze rundum · Frontlinie
  (durchgehende Sohle, Parapet je Abschnitt A/B/C mit Sap-Lücken + offenen Enden,
  Parados mit Rampen-/Graben-Lücken, 2 Feld-Rampen, 2 End-Rampen zum Labyrinth) ·
  Labyrinth-Stub (Oberflächengelände, 4 versetzte Wälle, 2 Trichter, Landmark) ·
  offenes Feld (ebener Boden mit Schlitz für den Graben) · Verbindungsgraben
  (gerade, gedeckt) · Home-Line (Sohle, Nordparapet mit offenen Flanken, 2
  Flankenrampen, 3 begehbare Unterstände). 74 Quader. `SektorMeta` (Zonen,
  Frontabschnitte mit Bresche/Depot/Bau-Slots, `feindAnmarsch`, `homeZugaenge`,
  `landmark`, `spielerSpawn`); `spawnPoints`/`enemySpawnPoints` spiegeln die Meta.
- **`src/sim/sektor.ts`** (neu) — Typen (`ZonenId`, `ZonenEintrag`,
  `FrontAbschnitt`, `HomeZugang`, `SektorMeta`, `SektorData extends LevelData`)
  + reine Helfer `zoneAt(meta, pos)` / `abschnittAt(meta, pos)` (X/Z-Punkttest,
  Zonen sind Säulen über die Höhe; Listenreihenfolge = Priorität bei
  Überlappung). Kein Babylon, kein Zufall, keine Zeit → goldene Regel gehalten
  (ESLint grün). Re-Export der Typen + Helfer aus `src/sim/index.ts`.
- **`src/render/index.ts`** — `createRenderer(canvas, level, meta?)`: pro Box ein
  Zonen-Material (`zoneAt` auf den Box-Mittelpunkt), hohe Wände → `grenzeMat`,
  ohne `meta` das alte Verhalten (`testLevel`-kompatibel). Landmark-Akzent
  (leuchtender Pfosten über dem Wrack) als Auge-Fixpunkt. Sauber disposed.
- **`src/main.ts`** — `testLevel` → `sektorGreybox` (Sim **und** Renderer inkl.
  `meta`). `testlevel.ts` bleibt unangetastet für die AP1–AP3-Tests.
- **`src/data/index.ts`** — Barrel um `module` + `sektor` ergänzt.
- **`src/sim/sektor.test.ts`** (neu, 10 Tests) — Wohlgeformtheit (Geometrie ohne
  NaN, alle 6 Zonen mit Bounds, 3 Abschnitte mit Bresche/Depot/Slots,
  `feindAnmarsch`/`homeZugaenge`/`landmark`/Spawns), `zoneAt`/`abschnittAt`
  gegen Stichproben, `createSim(seed, sektorGreybox)` (Spieler landet auf der
  Sohle, Zone `frontlinie`, `onGround`), 900-Tick-Marsch fällt nie aus der Welt,
  Wave-Director spawnt an `feindAnmarsch` und die Gegner rücken vor.
- **`src/data/module.test.ts`** (neu, 6 Tests) — Raster/`einrasten`, jeder
  Modultyp liefert endliche positive Quader, `grabengerade`-Sohle auf
  `GRABEN_SOHLE`, `drehung` tauscht Längs-/Querausdehnung, Feuertritt- und
  Rampen-Stufen ≤ `STEP_HEIGHT`, Auge auf dem Feuertritt über dem Parapet.
- **`src/ARCHITEKTUR.md`** — Abschnitt „Sektor (AP4)".
- **`README.md`** — nur `prettier --write` (Tabellenspalten neu ausgerichtet);
  **war schon vor diesem Ticket kaputt formatiert** (Sparring-Commits) und ließ
  `format:check` / CI rot laufen. Reine Formatierung, kein Inhalt. Gehört
  eigentlich der Planer-Seite — Nachricht dazu unten.

### Entscheidungen / Abweichungen vom Ticket

1. **`SektorData extends LevelData` sauber** — keine Komposition nötig. Der
   Renderer bekommt `meta` als optionalen dritten Parameter (statt die Boxen zu
   taggen), das hält `LevelBox` frei von Render-Belangen.
2. **`modul`-Signatur um `opt` (laenge/breite) erweitert** — die Ticket-Form
   `modul(typ, at, drehung)` hätte für die 48-m-Front bzw. den 31-m-Graben
   Dutzende Einzelaufrufe + Quader gebraucht. Konservativ als optionales
   4. Argument, Default = 1 Rasterzelle.
3. **Labyrinth-Stub auf Oberflächen-Niveau** (versetzte Wälle) statt gegrabener
   Verzweigungsgräben — gegrabene Kreuzungen brauchen wandfreie Knoten, das ist
   Generator-Arbeit (AP4-02+). Die zwei Frontenden gehen per End-Rampe hoch ins
   Labyrinth; der Feind kommt per Sap-Lücke / End-Rampe an die Front.
4. **`grabenknick` im Kit gebaut + getestet, im Greybox ungenutzt** — der
   Verbindungsgraben ist gerade (Punkt 2 oben); der Knick bleibt für den
   Generator + AP4-04.
5. Verbindungsgraben-Länge / Feld-Tiefe: siehe TODO(Rückfrage) 2 + 3.

### Manuell geprüft (`npm run dev`, headless Chrome + CDP)

- Lädt fehlerfrei (0 Konsolen-Errors), stabile ~56 fps, Sim tickt konstant 60/s
  (headless drosselt rAF nach ~5 s ohne `Emulation.setFocusEmulationEnabled` —
  Harness-Eigenheit, nicht die App).
- **Spawn** (Seed 1 → Abschnitt A, `-12 / -1,80 / 13`): steht auf der
  Grabensohle, `onGround`, Zone `frontlinie` — **fällt nicht durch Boden/Wand**.
- **Feuertritt**: nach Norden laufen → Spieler steigt **ohne Sprung-Eingabe** auf
  exakt y = −0,95 (`FEUERTRITT_OBERKANTE`) und sieht über das Parapet ins
  Labyrinth (Landmark-Pfosten im Bild). AC „ohne Sprung ans Parapet" ✓.
- **Zonen** farblich klar unterscheidbar (Screenshots: Labyrinth braun, Front
  sandfarben, Feld/Home oliv-grau, Kartengrenze dunkel).
- Ein vollständiger Fußmarsch durch **alle** sechs Zonen ließ sich headless
  nicht fahren (kein Pointer-Lock → keine Kameradrehung → reines Strafen bleibt
  an achsenparallelen Wänden hängen). Die Substanz deckt `sektor.test.ts` ab
  (Landen auf der Sohle an jedem Spawn, 900-Tick-Marsch ohne Weltverlust,
  Gegner-Anmarsch). **Bitte beim nächsten Spieltest einmal quer durchlaufen.**

---

## Review — AP4-01 · 2026-09-03

Verdikt: **grünes Licht**.

Geprüft: lokal typecheck / lint / format:check / test:coverage / build alle grün
(116 Tests, +16; Coverage src/sim 98,58 %, `src/sim/sektor.ts` 100 %). CI +
Pages-Preview grün auf `a0badbf`. Golden-/Replay-Test unverändert grün (nutzt
Inline-Testlevel). Gelesen: `src/data/module.ts` (Rasterbaukasten, reine
Funktionen, nur `Vec3`/`LevelBox`-Typen aus `src/sim`), `src/data/sektor.ts`
(das H, 74 Quader + Meta), `src/sim/sektor.ts` (Typen + `zoneAt`/`abschnittAt`,
kein Babylon/Zufall/Zeit — goldene Regel gehalten), `src/render/index.ts`
(Zonen-Material via `zoneAt`, sauber disposed; `zoneAt` aus `src/sim`
re-exportiert = richtige Import-Richtung), `src/main.ts` (`sektorGreybox` in Sim
+ Renderer).

Anmerkungen (nicht blockierend):

1. **`feindAnmarsch` = 2 Punkte** (Ticket nannte 3–5). Deckt sich mit dem
   Nutzer-Map-Plan (2 schräge Ecken) — der Kandidaten-Pool + Director-Auswahl
   kommt in AP4-02. Ok.
2. **Landmark-Hulk bekommt `grenzeMat`** (dunkel), weil `center.y + size.y/2 > 2`.
   Der leuchtende Pfosten darüber kompensiert. Kosmetik → AP4-05.
3. **`spawnPoints`/`enemySpawnPoints` `toBe`-identisch mit den Meta-Arrays** —
   bewusst, Test hält es fest. Wenn AP4-02 den Anmarsch dynamisch macht, hier
   entkoppeln.
4. `grabenknick` gebaut + getestet, im Greybox ungenutzt — bewusst für
   AP4-02/04 (Connector-Knicke) + Generator. Ok.

Zu den 4 `TODO(Rückfrage)` — Planer-Entscheidung:

1. **Feuertritt-Marge ~0,1 m** — so lassen, beim Spieltest gegenchecken. Der
   Worker hat headless bestätigt, dass man übers Parapet sieht. Wenn es sich eng
   anfühlt: `PARAPET_OBERKANTE` leicht senken (Datenänderung, kein Struktur-
   eingriff).
2. **Verbindungsgraben gerade** — ok für AP4-01. Knicke + Nischen +
   Sprengbarriere gehören zu **AP4-04** (Rückzugs-Mechanik); `grabenknick` steht
   bereit.
3. **Feld-Tiefe ~31 m** — ok, Greybox-Startwert, passt zu „kompakt halten".
4. **Feindzone nicht gesperrt** — ok, Zutritts-Sperre ist Gameplay (**AP4-02**).

Nebenbefund (Planer-Seite): `README.md` war seit den Sparring-Commits kaputt
formatiert und ließ `format:check`/CI auf `main` rot laufen (`f8dfe54`). Der
Worker hat `prettier --write README.md` mitgenommen — richtig so; ich ziehe die
Formatierung zusätzlich direkt auf `main` nach.

Folge-Ticket: **AP4-02** (Feind-Navigation: semantischer Graph).
