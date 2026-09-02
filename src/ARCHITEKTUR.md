# Architektur

Babylon.js-Version: **9.23.0** (exakt gepinnt in `package.json`, Paket
`@babylonjs/core` — tree-shakebar, nicht das monolithische `babylonjs`).

Die Codebasis ist in klare Verantwortungsbereiche aufgeteilt: Simulation
(`src/sim`), Renderer (`src/render`), Input (`src/input`), UI (`src/ui`),
Daten/Schema (`src/data`), Persistenz (`src/platform`). `src/main.ts` verdrahtet
alles, `src/loop.ts` taktet.

## Goldene Regel

`src/sim/**` ist eine headless Simulation. Sie darf **nicht** aus `src/render`,
`src/input`, `src/ui` importieren, **nicht** Babylon.js importieren und **keine**
Browser-Globals benutzen (`window`, `document`, `performance`, `Date`,
`Date.now()`, `Math.random()`, `requestAnimationFrame`). Sie erhält alle Eingaben
als Daten — Kommandos, Seed, `dt` — und liefert Zustandsdaten zurück. Der State
wird kopiert/eingefroren herausgegeben, nie als mutierbare interne Referenz.

Der Renderer liest den Sim-State und zeichnet; er fasst Spiellogik nie an.

Diese Grenze ist per ESLint erzwungen (`eslint.config.js`, `overrides` für
`src/sim/**`: `no-restricted-imports` mit `**/render/**`, `**/input/**`,
`**/ui/**`, `@babylonjs/**`, `babylonjs`; `no-restricted-globals`;
`no-restricted-properties`; `no-restricted-syntax` für `Date`). Verstöße sind
Fehler, kein Stilproblem. Siehe auch `../TECHNIK.md`.

## Loop-Ansatz

Fester Timestep (`FIXED_DT = 1/60`), entkoppelt von der Render-Rate, über einen
Akkumulator (`src/loop.ts`). Pro `requestAnimationFrame` wird die reale Zeit
gemessen (auf 250 ms geclampt gegen die „spiral of death"), in den Akkumulator
gegeben und je `FIXED_DT` ein `sim.tick(cmd, FIXED_DT)` ausgeführt. Der Renderer
bekommt State + `alpha` (Rest im Akkumulator) und interpoliert.

`performance.now()` / `requestAnimationFrame` leben in `loop.ts` — außerhalb der
Sim-Grenze.

## Bundle-Größe

Produktions-Build (`npm run build`), gemessen 2026-09-02, nur `src/main.ts`
(Engine + Scene + Licht):

| Paket                       | JS roh    | JS gzip   |
| --------------------------- | --------- | --------- |
| `babylonjs` (UMD, Referenz) | ~7,87 MiB | ~1,78 MiB |
| `@babylonjs/core` (aktuell) | ~6,61 MiB | ~1,55 MiB |

~16 % kleiner roh / ~15 % gzip, und vor allem strukturell tree-shakebar: solange
die App wenig von Babylon zieht, bleibt das Bundle klein. Ein echtes
Bundle-Budget-Gate kommt später (Infrastruktur-Backlog).

## Offene Rückfragen

- **Node-LTS-Major**: `.nvmrc`/`engines` auf `24` (aktuelle LTS zum Zeitpunkt
  1.4). Bei Bedarf anheben.
- **Pages-Preview pro Branch**: Der offizielle GitHub-Pages-Deploy kennt nur eine
  Live-Seite; jeder Push überschreibt den Preview. Echte Branch-Previews
  bräuchten einen anderen Mechanismus — siehe `TODO(Rückfrage)` in
  `.github/workflows/pages.yml`.
- **Dev-Dependency-Audit**: `npm audit` meldet Advisories in `esbuild`/`vite`/
  `vitest` (nur Dev-Server, kein Prod-Code). Fix = Vite 5→8 / Vitest 2→3, ein
  größerer Breaking-Change — bewusst nicht in 1.4.
