# Halt die Linie — Aufgabenboard für die VS Code KI

Dieses Dokument ist die **Arbeitsanweisung**. Es wird in Arbeitspaketen mit
durchnummerierten Tickets abgearbeitet. Jedes Ticket ist in sich geschlossen und
hat Akzeptanzkriterien.

---

## Arbeitsweise — bitte genau so

1. **Zuerst die Pflichtlektüre lesen** (siehe unten). Nicht mit dem Code
   anfangen, bevor `KONZEPT.md` und `TECHNIK.md` gelesen sind.
2. **Ein Ticket nach dem anderen.** Nicht vorgreifen, nicht mehrere Tickets in
   einem Rutsch. Reihenfolge einhalten.
3. **Pro Ticket ein Commit**, Commit-Message beginnt mit der Ticket-Nummer,
   z.B. `1.2 Fester-Timestep-Loop`.
4. **Arbeite auf einem Branch pro Arbeitspaket**, z.B. `arbeitspaket-1`. Kein PR
   nötig, aber sauber committen.
5. **Bei Unklarheit nicht raten.** Wenn eine Entscheidung im Ticket nicht
   eindeutig ist: in einem `// TODO(Rückfrage): …`-Kommentar an der betroffenen
   Stelle festhalten und im Zweifel die einfachere, konservativere Variante
   wählen. Keine großen Architektur-Alleingänge.
6. **Kein Scope-Creep.** Nur bauen, was im Ticket steht. Keine
   Gameplay-Inhalte (Waffen, Gegner, Klassen, Menüs) in diesem Arbeitspaket —
   nur Gerüst und Infrastruktur.
7. **Keine vorzeitige Abstraktion.** Kein ECS-Framework, keine generische
   Plugin-Architektur, keine Event-Bus-Systeme, solange kein Ticket das
   ausdrücklich verlangt. So einfach wie möglich.
8. **Diese Dateien NICHT verändern:** `KONZEPT.md`, `TECHNIK.md`, `BACKLOG.md`,
   `AUFGABEN.md`, alles unter `prototyp-td/`. `README.md` darf um einen
   Abschnitt „Entwicklung" (Setup/Start-Befehle) ergänzt werden.

---

## Pflichtlektüre (im Repo)

| Datei | Was drinsteht, warum relevant |
|---|---|
| `KONZEPT.md` | Das komplette Spielkonzept. Für dieses Arbeitspaket besonders **§1** (Kern), **§2** (Genre/Plattform), **§4** (Datenmodell Klassen/Waffen — die Schema-Stubs), **§5** (Gegner — Schema-Stubs), **§6** (Einsatzstruktur). |
| `TECHNIK.md` | **Komplett lesen.** Stack, die Architektur-Prinzipien (headless Sim!), die Physik-Aufteilung, der Projektstruktur-Vorschlag, und die Liste „Aufgaben für die VS Code KI" — dieses Dokument setzt sie um. |
| `WAFFEN.md` | Waffenmodell + v1-Arsenal. Für Ticket 1.7 (Datenschema-Stubs): Kategorien, Feuerarten, Nachlade-Arten, die zwei Bonus-Ebenen. |
| `README.md` | Kurzüberblick + Verweise. |

Wenn `KONZEPT.md` / `TECHNIK.md` und ein Ticket sich widersprechen: **die Doks
gewinnen**, Widerspruch als `// TODO(Rückfrage)` vermerken.

---

## Projekt-Konventionen (gelten für alle Arbeitspakete)

### Stack
- **TypeScript**, `strict: true`, `noUncheckedIndexedAccess: true`.
- **Vite** als Build/Dev-Server (Template `vanilla-ts`).
- **Babylon.js** als Renderer/Engine. **Aktuelle stabile Version, exakt pinnen**
  (keine `^`-Range) und die Versionsnummer in einem Kommentar in `package.json`
  oder `src/ARCHITEKTUR.md` festhalten.
- **Renderer-Paket:** `@babylonjs/core` (nicht `babylonjs` — tree-shakebar).
- **Tests:** Vitest.
- **Lint/Format:** ESLint (Flat Config, `eslint.config.js`) + `typescript-eslint`
  + Prettier.
- **Paketmanager:** npm.
- **Keine weiteren Runtime-Abhängigkeiten** ohne Rückfrage. `zod` ist erlaubt,
  falls für Schema-Validierung gewünscht — sonst handgeschrieben.

### Tests
- Test-Dateien **neben der Quelle**: `foo.ts` → `foo.test.ts`.
- `src/sim/**`-Tests laufen in `environment: 'node'` (rein, schnell). UI-Tests
  später mit `jsdom` (Vitest-Projects/Workspace, wenn der erste UI-Test kommt).
- **Nicht** unit-testen: Babylon-Rendering (flaky) — dafür kommt später ein
  Playwright-Smoke-Test.
- Coverage: Provider `v8`, weiche Schwelle **nur auf `src/sim/**`**.
- Sobald der FP-Controller steht: **Golden-/Replay-Test** fürs Sim etablieren
  (Seed + Kommandosequenz → State-Snapshot) als Regressionsschutz.

### Commit-Konvention
- Arbeitspaket-Tickets: Message beginnt mit der Ticket-Nummer — `1.5 Input-Layer`.
- Sonstiges: Conventional-Commits-leicht — `feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`, `test:`.
- Ein Commit pro Ticket. `main` bleibt jederzeit grün; Arbeit auf
  `arbeitspaket-*` bzw. `feat/*` / `fix/*`.

### CI
- Ab Ticket 1.4 prüft `.github/workflows/ci.yml` bei jedem Push/PR:
  typecheck → lint → format:check → test:coverage → build. Rot = nicht mergen.

### Die goldene Regel: die Sim-Grenze
Aus `TECHNIK.md` — **das wichtigste Prinzip im ganzen Projekt:**

> `/src/sim/**` ist eine **headless Simulation**. Code darunter darf **NICHT**:
> - aus `/src/render`, `/src/input`, `/src/ui` importieren
> - `babylonjs` importieren
> - `window`, `document`, `performance`, `Date.now()`, `Math.random()`,
>   `requestAnimationFrame` o.Ä. benutzen
>
> Alles, was die Sim braucht, wird ihr **übergeben**: Eingabe-Kommandos, ein
> Seed, `dt`. Der Renderer liest den Sim-State und zeichnet — er fasst
> Spiellogik nie an.

Diese Grenze wird per ESLint-Regel erzwungen (Ticket 1.1, fertig geschärft in 1.4).
Verstöße sind ein Fehler, kein Stilproblem.

### Loop & Zeit
- Die Sim tickt mit **festem Timestep (60 Hz)**, entkoppelt von der Render-Rate,
  über einen Akkumulator. Der Renderer interpoliert zwischen zwei Sim-States.
- Determinismus ist **nicht** hart gefordert (Netcode-Zielbild =
  State-Replikation, kein Lockstep). Trotzdem: alle Nichtdeterminismus-Quellen
  werden injiziert (Seed → eigener RNG, `dt` als Parameter). `Math.random` ist
  in der Sim verboten.

### Stil
- Deutsche Bezeichner für Domänenbegriffe sind ok, wo sie zum Konzept passen
  (`nachschub`, `parapet`, `frontlinie`), aber Standard-Technik englisch
  (`tick`, `state`, `renderer`). Konsistent bleiben.
- Kleine, benannte Funktionen. Kommentare erklären *warum*, nicht *was*.
- Kein `any`. Kein `// @ts-ignore` ohne Begründung daneben.

---

## Arbeitspaket 1 — Fundament & Kern-Infrastruktur

**Ziel:** Am Ende kann man in **First Person durch einen Test-Graben laufen**
(Boxen-Geometrie), mit einer sauberen Sim/Render-Trennung, festem Timestep,
Input-Layer und den Datenschema-Stubs — dazu ein ordentliches Projekt-Fundament
(CI, Hygiene, Preview-Deploy). **Kein** Schießen, **keine** Gegner, **keine**
Menüs, **keine** prozedurale Erzeugung, **kein** Netcode, **keine** Art.

Branch: `arbeitspaket-1`.

### Stand / Fortschritt (maßgeblich — Tickets unten stehen ggf. nicht in dieser Reihenfolge)

| Nr | Ticket | Status |
|---|---|---|
| 1.1 | Projekt-Scaffolding | ✅ erledigt (`8aea89e`) |
| 1.2 | Fester-Timestep-Loop | ✅ erledigt (`f623974`) |
| 1.3 | Sim-Skelett & State-Grenze | ✅ erledigt (`4e2076f`) |
| 1.4 | Projekt-Hygiene, CI & Preview-Deploy | ✅ erledigt (`arbeitspaket-1`) |
| 1.5 | Input-Layer | ✅ erledigt (`arbeitspaket-1`) |
| 1.6 | First-Person-Controller + Kamera + Test-Level | ✅ erledigt (`arbeitspaket-1`) |
| 1.7 | Datenschema-Stubs | ✅ erledigt (`arbeitspaket-1`) |
| 1.8 | Debug-Overlay (HTML/CSS) | ⬜ offen |

> Hinweis: Die VS-Code-KI hat 1.2/1.3 mit einer älteren Nummerierung committet
> („1.2 Fester-Timestep-Loop", „1.3 Sim-Skelett"). Die Commits sind inhaltlich
> ok; die Nummern oben sind jetzt die gültigen. Das Hygiene-Ticket ist dadurch
> von 1.2 auf **1.4** gerückt und teils schon angefangen.

---

### Ticket 1.1 — Projekt-Scaffolding

**Ziel:** Lauffähiges Vite-+-TS-+-Babylon-Projekt mit Ordnerstruktur,
Lint/Format/Test-Setup und der erzwungenen Sim-Grenze.

**Liefergegenstände:**
- Vite-Projekt (`vanilla-ts`), `package.json` mit Scripts:
  `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `lint`, `format`,
  `test`.
- `tsconfig.json` mit `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`.
- Abhängigkeiten: `babylonjs` (exakt gepinnt), `vitest`, ESLint + Prettier +
  `typescript-eslint`.
- Ordnerstruktur (leere `index.ts` mit kurzem Kopf-Kommentar je Ordner):
  ```
  src/
    sim/        headless Simulation — siehe goldene Regel
    render/     Babylon-Anbindung
    input/      Eingabe → Kommandos
    ui/         HTML/CSS-Overlay
    data/       Definitionen + Schema
    platform/   Persistenz-Adapter (später)
    main.ts     Einstiegspunkt: verdrahtet alles
  ```
- **ESLint-Regel für die Sim-Grenze:** In `src/sim/**` verboten: Imports aus
  `../render`, `../input`, `../ui`, `babylonjs`; verbotene globals `window`,
  `document`, `performance`, `Math.random`, `Date`, `requestAnimationFrame`.
  Umsetzung über `no-restricted-imports` + `no-restricted-globals` +
  `no-restricted-properties` in einem `overrides`-Block für `src/sim/**`.
  (Alternativ `eslint-plugin-boundaries`, falls sauberer.)
- `src/ARCHITEKTUR.md` (kurz, ~1 Seite): erklärt die Ordnergrenzen, die goldene
  Regel, den Loop-Ansatz. Verweist auf `../TECHNIK.md`.
- `.gitignore` (node_modules, dist, .DS_Store).
- `main.ts`: erzeugt eine Babylon-Engine + Scene auf einem Vollbild-`<canvas>`,
  leerer Hintergrund (eine ruhige Farbe), sonst nichts.

**Akzeptanzkriterien:**
- `npm run dev` zeigt eine leere, farbige Babylon-Fläche ohne Konsolenfehler.
- `npm run typecheck`, `npm run lint`, `npm run test` laufen fehlerfrei durch
  (Test darf leer/Platzhalter sein).
- Ein absichtlicher Test-Import von `babylonjs` in einer Datei unter `src/sim/`
  löst einen ESLint-Fehler aus (danach wieder entfernen).

---

### Ticket 1.4 — Projekt-Hygiene, CI & Preview-Deploy

**Ziel:** Das Fundament auf „ordentlich" bringen — reproduzierbare Umgebung,
automatische Prüfung bei jedem Push, ein spielbarer Link pro Branch.

**Schon erledigt (in Commit `f623974`), nur prüfen:**
- ✅ `babylonjs` → `@babylonjs/core` (Version in `src/ARCHITEKTUR.md` festhalten,
  falls noch nicht).
- ✅ Scripts `format:check`, `test:coverage`; `@vitest/coverage-v8`; Coverage
  `include: ['src/sim/**']`.
- ✅ Lint: `@babylonjs/*` in den Sim-`no-restricted-imports`.

**Noch zu tun — Sim-Grenze-Lint fertig schärfen:**
- Die `no-restricted-imports`-Pattern greifen nur bei `../render` (eine Ebene).
  Auf `**/render/**`, `**/input/**`, `**/ui/**` erweitern, damit auch tief
  verschachtelte Dateien unter `src/sim/` erfasst werden. Gegentest
  (absichtlicher Verstoß in `src/sim/tief/x.ts`) muss failen, danach entfernen.
- Weiche Coverage-Schwelle ergänzen (z.B. `lines: 60` auf `src/sim/**`).

**Liefergegenstände:**

*Reproduzierbarkeit*
- `package.json`: `engines.node` (aktuelle LTS-Major), `packageManager`
  (npm-Version, für Corepack), `"type": "module"` (ist schon da).
- `.nvmrc` mit der Node-Major.
- `package-lock.json` committen (ist schon da — sicherstellen).

*Repo-Hygiene*
- `.editorconfig` — UTF-8, LF, finale Leerzeile, 2 Spaces (TS/JS/JSON/MD),
  `trim_trailing_whitespace` (außer `*.md`).
- `.gitattributes` — `* text=auto eol=lf`; künftige Binärformate (`*.png`,
  `*.glb`, `*.ktx2`, `*.ogg`, …) als `binary` markieren.
- `.gitignore` erweitern: `coverage/`, `*.local`, `.env*`, `.idea/`, `.vscode/*`
  (mit Ausnahme `!.vscode/extensions.json`), `playwright-report/`, `test-results/`.
- `.prettierignore` (dist, coverage, package-lock, prototyp-td).
- `.vscode/extensions.json` — empfohlene Extensions (ESLint, Prettier, EditorConfig).
- `LICENSE` — **proprietär / „All rights reserved"** (kurzer Standardtext,
  Copyright-Zeile). Falls du etwas anderes willst: `// TODO(Rückfrage)`.
- `CONTRIBUTING.md` (kurz) — verweist auf `AUFGABEN.md` für die Arbeitsweise,
  hält die **Commit-Konvention** fest (siehe unten) und die Branch-Regel
  (`main` bleibt grün, Arbeit auf `arbeitspaket-*` / `feat/*` / `fix/*`).

*Scripts*
- `package.json`: `format:check` (`prettier --check .`), `test:coverage`
  (`vitest run --coverage`). `lint` bleibt, `build` bleibt.

*CI — `.github/workflows/ci.yml`*
- Trigger: `push` und `pull_request`.
- Ein Job, Node aus `.nvmrc`, `npm ci`, dann nacheinander:
  `npm run typecheck` → `npm run lint` → `npm run format:check` →
  `npm run test:coverage` → `npm run build`.
- npm-Cache aktivieren (`actions/setup-node` mit `cache: npm`).
- Coverage als Artifact hochladen.

*Preview-Deploy — `.github/workflows/pages.yml`*
- Auf `push` (jeder Branch): `npm ci && npm run build`, `dist/` per
  `actions/upload-pages-artifact` + `actions/deploy-pages` auf **GitHub Pages**.
- Vite `base` korrekt setzen (Repo-Subpfad) — per Env in der CI, lokal `'/'`.
- README-Abschnitt „Entwicklung" um die Preview-URL ergänzen (Platzhalter, bis
  das Repo auf GitHub liegt).

*PR-/Dependency-Hygiene*
- `.github/pull_request_template.md` — kurze Checkliste (Ticket-Bezug,
  Akzeptanzkriterien geprüft, CI grün, keine `TODO(Rückfrage)` offen ohne Notiz).
- `.github/dependabot.yml` — `npm`, wöchentlich, Updates gruppiert; `github-actions`
  ökosystem ebenfalls.

**Commit-Konvention (in `CONTRIBUTING.md` festhalten):**
- Arbeitspaket-Tickets: Message beginnt mit der Ticket-Nummer — `1.5 Input-Layer`.
- Sonstiges: Conventional-Commits-leicht — `feat: …`, `fix: …`, `chore: …`,
  `docs: …`, `refactor: …`, `test: …`.

**Akzeptanzkriterien:**
- `npm run typecheck && npm run lint && npm run format:check && npm run test:coverage && npm run build` läuft lokal komplett grün durch.
- Das Bundle ist durch `@babylonjs/core` spürbar kleiner als vorher (Größe im
  Commit oder in `ARCHITEKTUR.md` notieren).
- Gegentest der geschärften Sim-Grenze-Regel failt wie erwartet.
- CI-Workflow ist syntaktisch valide (z.B. `actionlint` oder Review) und würde
  dieselben Schritte fahren.
- Alle neuen Dateien vorhanden, `CONTRIBUTING.md` und `LICENSE` ausgefüllt.

**NICHT in diesem Ticket:** Pre-commit-Hooks (husky/lint-staged), Playwright,
Bundle-Budget-Gate, Tauri-Build, Release-Workflow — siehe Infrastruktur-Backlog.

---

### Ticket 1.2 — Fester-Timestep-Loop  ✅ erledigt (`f623974`)

Für Referenz / Nacharbeit. `src/loop.ts` + `src/loop.test.ts` sind da.
Bekannte Restpunkte: `SimLike`/`RendererLike`/`InputLike` nutzen `unknown` statt
der echten Typen aus `src/sim` — bei 1.6 anziehen.

**Ziel (Original):** Ein Loop, der die Sim mit 60 Hz tickt und den Renderer pro
Animationsframe synchronisiert, mit Interpolation.

**Liefergegenstände:**
- `src/loop.ts`: `class GameLoop` oder `createLoop({ sim, renderer, input })`.
  - Konstante `FIXED_DT = 1 / 60`.
  - Akkumulator-Muster: pro rAF-Frame reale Zeit messen, in den Akkumulator
    geben, solange `>= FIXED_DT` je einen `sim.tick(cmd, FIXED_DT)`.
  - **Spiral-of-death-Schutz:** Frame-Zeit auf z.B. 250 ms clampen.
  - Interpolations-`alpha` (Rest im Akkumulator / `FIXED_DT`) an
    `renderer.sync(state, alpha)` übergeben.
  - `start()`, `stop()`, `pause()`, `resume()`.
- Die reale Zeit kommt aus `performance.now()` — **in `loop.ts`, nicht in der
  Sim** (loop.ts liegt außerhalb von `src/sim`).
- Zähler: `simTick` (Anzahl Ticks), für das Debug-Overlay abrufbar.

**Akzeptanzkriterien:**
- Bei 144 fps wie bei 30 fps bleibt die Sim bei ~60 Ticks/s (±1).
- Pause stoppt Sim-Ticks, Renderer läuft weiter.
- Kein Rückstau/Freeze nach einem Tab-Wechsel (Clamp greift).

---

### Ticket 1.3 — Sim-Skelett & State-Grenze  ✅ erledigt (`4e2076f`)

Für Referenz / Nacharbeit. `src/sim/index.ts` (mit `InputCommand`-Typ),
`src/sim/math.ts`, `src/sim/rng.ts`, `src/sim/sim.test.ts` sind da.
Bekannte Restpunkte: `createSim(seed)` nimmt den Seed entgegen, nutzt `rng.ts`
aber noch nicht (`void safeSeed`) — ok solange keine Zufälligkeit in der Sim ist,
bei 1.6 sauber verdrahten. Bewegung ist Platzhalter (x/y statt x/z-Bodenebene).

**Ziel (Original):** Die Simulation als eigenständiges Modul mit klarer
öffentlicher Schnittstelle und einem minimalen State (nur ein steuerbarer
Spieler).

**Liefergegenstände:**
- `src/sim/index.ts`:
  ```ts
  export interface SimState {
    tick: number;
    player: {
      pos: Vec3; vel: Vec3;
      yaw: number; pitch: number;
      onGround: boolean;
    };
  }
  export interface Sim {
    tick(cmd: InputCommand, dt: number): void;
    getState(): Readonly<SimState>;
  }
  export function createSim(seed: number): Sim;
  ```
  (`InputCommand`-Typ wird in 1.5 final definiert; hier ein importierbarer
  Platzhalter-Typ, den 1.5 ersetzt/erweitert.)
- `src/sim/math.ts`: `Vec3` als `{ x, y, z }` + reine Helfer (`add`, `sub`,
  `scale`, `length`, `normalize`, `dot`, …). **Keine** Babylon-Typen. Handgeschrieben,
  keine Abhängigkeit.
- `src/sim/rng.ts`: deterministischer PRNG aus einem Seed (z.B. mulberry32),
  `next(): number` in `[0,1)`, `range(min,max)`, `int(min,max)`. Kein `Math.random`.
- Der State wird **kopiert oder eingefroren** herausgegeben (kein Zugriff auf
  interne, veränderliche Referenzen von außen).

**Akzeptanzkriterien:**
- `npm run lint` bestätigt: `src/sim/` importiert nichts aus
  render/input/ui/babylon, nutzt keine verbotenen globals.
- Vitest-Test: gleicher Seed + gleiche Kommando-Sequenz → identischer
  End-State (Deep-Equal).
- `getState()` liefert etwas, das der Aufrufer nicht versehentlich mutieren
  kann (Test: Mutationsversuch wirft oder bleibt wirkungslos).

---

### Ticket 1.5 — Input-Layer

**Ziel:** Tastatur + Maus → ein serialisierbares Kommando-Objekt pro Frame.

**Liefergegenstände:**
- `src/input/index.ts`:
  ```ts
  export interface InputCommand {
    move: { x: number; y: number };      // -1..1, lokale Achsen
    look: { dx: number; dy: number };    // Maus-Delta seit letztem Frame
    buttons: {
      fire: boolean; aim: boolean; sprint: boolean;
      interact: boolean; ability: boolean; jump: boolean;
    };
  }
  export function createInput(target: HTMLElement): {
    poll(): InputCommand;   // Schnappschuss + Deltas zurücksetzen
    dispose(): void;
  };
  ```
- **Pointer-Lock:** Klick auf den Canvas fordert Pointer-Lock an; `look`-Deltas
  nur bei aktivem Lock.
- **Rebind-fähige Tastenbelegung**, datengetrieben: eine `defaultBindings`-Map
  (Aktion → `KeyboardEvent.code`), Default WASD / Shift / E / Q / Space / Maus.
  Ein einfaches `setBinding(action, code)` reicht — kein UI dafür.
- Kommando ist ein **reines Objekt** (JSON-serialisierbar, keine Klassen,
  keine Funktionen) — es soll später übers Netz gehen können.

**Akzeptanzkriterien:**
- `poll()` liefert live die gedrückten Tasten; `look`-Delta ist nach jedem
  `poll()` wieder 0.
- Ohne Pointer-Lock bleibt `look` bei 0.
- `dispose()` entfernt alle Event-Listener.

---

### Ticket 1.6 — First-Person-Controller (Sim) + Kamera (Render) + Test-Level

**Ziel:** In First Person durch einen Test-Graben laufen. Bewegung und
Kollision in der Sim, Kamera und Meshes im Renderer, beides aus **einer**
Level-Datenquelle.

**Liefergegenstände:**
- `src/data/testlevel.ts`: ein handgebautes, einfaches Grabenstück als **Daten**
  (Liste von Quadern `{ center: Vec3, size: Vec3 }`), das grob die Sektor-Idee
  aus `KONZEPT.md` §3 andeutet:
  - ebener Boden
  - zwei parallele erhöhte Wälle (Parapet) mit einer Lücke
  - ein senkrechter „Verbindungsgraben" (Vertiefung / Gasse) nach hinten
  - eine schräge Rampe in den Graben
  Aus dieser Liste werden **sowohl** die Render-Meshes **als auch** die
  Sim-Collider erzeugt.
- Sim-Seite:
  - `src/sim/collision.ts`: `CollisionWorld` aus statischen AABBs; Funktion für
    Kapsel-gegen-AABB-Auflösung (Position + Radius + Höhe), plus Bodencheck.
  - Im `sim.tick`: Spielerbewegung aus `cmd.move` relativ zu `yaw`,
    Schwerkraft, `onGround`, Sprint-Faktor, Kollisionsauflösung gegen die
    `CollisionWorld`. `cmd.look` verändert `yaw`/`pitch` (pitch clampen auf
    ±~89°). Sprung optional bei `cmd.buttons.jump`.
  - Die `CollisionWorld` wird `createSim` übergeben oder direkt aus
    `testlevel`-Daten in einem sim-internen Adapter aufgebaut — aber **die
    Level-Daten selbst dürfen keine Babylon-Typen enthalten**.
- Render-Seite:
  - `src/render/index.ts`: `createRenderer(canvas)` → `{ sync(state, alpha), dispose() }`.
  - Baut die Test-Level-Meshes einmalig (Babylon-Boxen aus den Level-Daten).
  - `sync`: setzt eine `FreeCamera` (oder manuell gesteuerte Kamera) auf die
    **interpolierte** Spielerposition + Augenhöhe, Rotation aus `yaw`/`pitch`.
    Keine Babylon-eigene Kamerasteuerung (kein `attachControl` für Bewegung) —
    die Sim ist die Wahrheit.
- `main.ts` verdrahtet: `input` → `loop` → `sim` → `renderer`.

**Akzeptanzkriterien:**
- Man kann herumlaufen, sieht in First Person, `pitch` ist begrenzt.
- Man kann **nicht** durch Wände laufen und **nicht** durch den Boden fallen.
- Man kann über die Rampe in den Verbindungsgraben hinab und wieder heraus.
- Render-Framerate und Bewegungsgefühl sind glatt (Interpolation greift, kein
  Ruckeln bei hoher fps).

---

### Ticket 1.7 — Datenschema-Stubs

**Ziel:** Die TypeScript-Typen für die Gameplay-Definitionen anlegen, passend zu
`KONZEPT.md` §4/§5 und `WAFFEN.md` — **nur Typen + je ein Platzhalter-Beispiel**,
keine echten Inhalte, keine Logik.

**Liefergegenstände:**
- `src/data/schema.ts` mit Typen (jedes Feld mit kurzem Doc-Kommentar, der auf
  die Konzept-/Waffen-Stelle verweist):
  - `WeaponCategory` (Union: `repetiergewehr | karabiner | leichtes-mg | pistole |
    maschinenpistole | grabenflinte | flammenwerfer`) — `WAFFEN.md`.
  - `FeuerModus` (`repetierer | halbauto | vollauto | pump`).
  - `NachladeArt` (`ladestreifen | magazin | trommel | gurt | revolver | einzeln`)
    — `WAFFEN.md` „Nachlade-Arten".
  - `WeaponDef`: id, name, category, feuerModus, Basisschaden, Kadenz,
    Magazingröße, Reservemunition, nachladeArt, Reichweiten-/Streuungswerte
    (grob), `nation` (`kaiserreich | albion | neutral`), `wandwaffe: boolean`,
    Feel-Tags.
  - `NationId` (`kaiserreich | albion`), `NationTrait`: id, fiktiver Name,
    realer Bezug (Kommentar), Passiv-Effekt (Stub), vertraute Waffen-ids.
  - `ClassId` (Union: `schuetze | mg-schuetze | pionier | sanitaeter`) —
    Sturmtruppler bewusst noch nicht (Backlog).
  - `ClassDef`: id, name, Bonus-`WeaponCategory`, Körper-Stats
    (`tempo`, `hp`, `ausdauer` als relative Faktoren), Signatur-Ausrüstung
    (nur ein `signature: { id, name, beschreibung }`-Stub),
    aktive Fähigkeit (`ability: { id, name, nachschubKosten, questHinweis }`-Stub),
    Passiv (`passive: { id, name, beschreibung }`-Stub).
  - `EnemyMode` (`tag | nacht`), `EnemyDef`: id, name, mode, Rolle,
    `konterHaerte` (`weich | hart`), HP/Tempo/Schaden (grob),
    `verhaltensTag` (Union-Stub, z.B. `feuer-und-bewegung | rush-platzierungen |
    unterdruecken | parapet-brecher | schadensschwamm | schluerfer | sprinter |
    wand-kratzer | rufer`).
- `src/data/beispiele.ts`: **je ein** klar als Platzhalter markiertes Beispiel
  (`langgewehrM98Stub`, `schuetzeStub`, `linieninfanterieStub`,
  `kaiserreichStub`) das gegen die Typen kompiliert. Werte dürfen grob/geschätzt
  sein; für Waffen an `WAFFEN.md` orientieren.
- **Kein** Loader, **keine** Laufzeit-Validierung in diesem Ticket (späteres
  Arbeitspaket). Nur Typen + Beispiele.

**Akzeptanzkriterien:**
- `npm run typecheck` grün, Beispiele erfüllen die Typen.
- `schema.ts` importiert nichts außer ggf. aus `src/sim/math.ts`.

---

### Ticket 1.8 — Debug-Overlay (HTML/CSS)

**Ziel:** Das HTML-Overlay-Muster etablieren (UI ist DOM, nicht Babylon-GUI) und
ein Entwickler-Overlay bereitstellen.

**Liefergegenstände:**
- `src/ui/debug.ts`: erzeugt ein `<div>` fest in einer Bildschirmecke,
  zeigt live: `simTick`, Render-fps, Spieler-Position (gerundet), `yaw`/`pitch`,
  das aktuelle `InputCommand`.
- Umschalten mit **F3**.
- Reines DOM + CSS (eine kleine `<style>`-Injektion oder CSS-Datei), keine
  Framework-Abhängigkeit, kein Babylon-GUI.
- Wird in `main.ts` verdrahtet und bekommt seine Werte pro Frame übergeben
  (nicht selbst pollen).

**Akzeptanzkriterien:**
- Overlay liegt sichtbar über dem Canvas, F3 blendet es aus/ein.
- Werte aktualisieren sich flüssig, keine Konsolenfehler.

---

## Definition of Done — Arbeitspaket 1

- Alle Tickets 1.1–1.8 committet auf `arbeitspaket-1`, ein Commit pro Ticket.
- `npm run dev` → man läuft in First Person durch den Test-Graben, Kollision
  funktioniert, Debug-Overlay per F3.
- `npm run typecheck && npm run lint && npm run format:check && npm run test:coverage && npm run build` grün.
- CI läuft dieselben Schritte bei jedem Push; Preview-Deploy liefert einen
  spielbaren Link.
- Die goldene Regel ist per (geschärfter) Lint-Regel erzwungen und wird eingehalten.
- `src/ARCHITEKTUR.md` beschreibt Struktur, Grenze und Loop.
- `LICENSE`, `CONTRIBUTING.md`, `.editorconfig`, `.gitattributes`, `.nvmrc`,
  `.github/` vorhanden und ausgefüllt.
- Offene Rückfragen als `// TODO(Rückfrage): …` im Code, gesammelt am Ende in
  einem kurzen Kommentar in `src/ARCHITEKTUR.md` unter „Offene Rückfragen".

## Ausdrücklich NICHT in Arbeitspaket 1

Waffen-Feuerlogik · Gegner / KI · Wellen / Wave-Director · prozedurale
Sektor-Erzeugung · Menüs, Lobby, Quartier, HUD (außer Debug-Overlay) ·
Netcode / Server · Persistenz · Havok / Physik-Engine · Sound · jegliche Art
(Modelle, Texturen, Animationen — Boxen genügen) · Balancing.

---

## Infrastruktur-Backlog (später, eigene kleine Tickets)

Kommt nach Arbeitspaket 1, wenn Code da ist, der davon profitiert:

- **Pre-commit-Hooks** — husky + lint-staged (oder `simple-git-hooks`): prettier
  + eslint + `tsc --noEmit` auf staged Dateien. Hält die Historie sauber,
  gerade bei KI-Commits.
- **Playwright-Smoke-Test** in CI — App bootet, Canvas rendert, keine
  Konsolenfehler. Ein Test, hoher Wert, fängt Integrationsbrüche.
- **zod-Validierung** für die Daten-Defs — beim Laden im Dev laut scheitern
  (kommt mit dem „Daten-Loader"-Ticket).
- **Save-Data-Versionierung** — `schemaVersion` im localStorage, Migration beim
  Laden, damit Playtester-Stände nicht brechen (kommt mit dem Persistenz-Ticket).
- **`assets/ATTRIBUTIONS.md`** + Asset-Namens-/Format-Konventionen (glTF, ktx2,
  ogg) — bevor der erste Fremd-Asset reinkommt.
- **Bundle-Size-Budget** als CI-Gate — Babylon ist groß, Regression früh fangen.
- **Babylon Inspector** hinter Dev-Flag (`scene.debugLayer`).
- **`src/config.ts`** — Dev-Flags über `import.meta.env` (godmode, skip-to-wave,
  Collider sichtbar).
- **Globaler Error-Handler** (`window.onerror` + `unhandledrejection`) — im Dev
  sichtbar melden, später Prod-Reporting.
- **Struktur-Logger** (`src/debug/log.ts`) mit Leveln/Kategorien statt roher
  `console.log` (sim nutzt ihn nicht — Grenze).
- **Determinismus-/Replay-Harness** — aufgezeichnete Inputs + Seed → State
  vergleichen. Regressionsschutz *und* Netcode-Grundstein.
- **Tauri-Build in CI** (Desktop), **Release-Workflow** (Tag → Prod-Deploy) —
  wenn es Richtung Veröffentlichung geht.
- **Performance-Budget-Tests** — Frame-Zeit unter N ms bei X Entities.
- **ADRs** (`docs/adr/NNNN-*.md`) — leichte Architektur-Entscheidungs-Notizen,
  falls `KONZEPT.md` §10 / `TECHNIK.md` nicht mehr reichen.

## Arbeitspaket 2 und folgende

Wird nachgetragen, sobald Arbeitspaket 1 steht und die offenen Design-Punkte
(prozedurale Erzeugung, Nachschub-Ökonomie) geklärt sind. Voraussichtliche
Richtung: Waffen-Feuerlogik + Munitionshandling, dann ein erster Gegnertyp mit
simplem Verhalten, dann der Wave-Director.
