# Mitarbeit

Die verbindliche Arbeitsanweisung ist [`AUFGABEN.md`](AUFGABEN.md) — dort stehen
Arbeitsweise, Pflichtlektüre, die goldene Regel (Sim-Grenze) und das
Ticket-Board. Diese Datei fasst nur die immer geltenden Regeln zusammen.

## Setup

```bash
nvm use            # Node-Version aus .nvmrc
npm ci             # exakt nach package-lock.json installieren
npm run dev
```

## Vor jedem Commit

```bash
npm run typecheck
npm run lint
npm run format:check   # bzw. npm run format zum Autoformatieren
npm run test
```

Die CI (`.github/workflows/ci.yml`) fährt bei jedem Push/PR dieselben Schritte
plus `npm run test:coverage` und `npm run build`. Rot = nicht mergen.

## Branches

- `main` bleibt jederzeit grün.
- Arbeit an einem Arbeitspaket: `arbeitspaket-<n>`.
- Sonstige Arbeit: `feat/<kurzname>` oder `fix/<kurzname>`.

## Commit-Konvention

- **Arbeitspaket-Tickets:** Message beginnt mit der Ticket-Nummer —
  `1.5 Input-Layer`.
- **Sonstiges:** Conventional-Commits-leicht — `feat: …`, `fix: …`,
  `chore: …`, `docs: …`, `refactor: …`, `test: …`.
- Ein Commit pro Ticket.

## Die goldene Regel

`src/sim/**` ist eine headless Simulation. Kein Import aus `render`/`input`/`ui`,
kein Babylon, keine Browser-Globals (`window`, `document`, `performance`,
`Date.now()`, `Math.random()`, `requestAnimationFrame`). Alles wird der Sim
übergeben (Kommandos, Seed, `dt`). Die Regel ist per ESLint erzwungen; Verstöße
sind Fehler. Details in [`src/ARCHITEKTUR.md`](src/ARCHITEKTUR.md).

## Offene Entscheidungen

Nicht raten. Unklare Punkte im Code als `// TODO(Rückfrage): …` markieren und in
`src/ARCHITEKTUR.md` unter „Offene Rückfragen“ sammeln.
