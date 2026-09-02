# Architektur

Babylon.js-Version: 9.23.0 (exakt gepinnt in `package.json`).

Die Codebasis ist in drei klare Verantwortungsbereiche aufgeteilt: Simulation (`src/sim`), Renderer (`src/render`) und Input/UI (`src/input`, `src/ui`).

## Goldene Regel

`src/sim/**` ist eine headless Simulation. Sie darf keine Abhängigkeiten zu Babylon.js, zu den Renderer- oder UI-Modulen und zu Browser-Globals wie `window`, `document`, `performance`, `Date.now()`, `Math.random()` oder `requestAnimationFrame` haben. Sie erhält alle benötigten Eingaben als Daten (z. B. Kommandos, Seed, `dt`) und liefert Zustandsdaten zurück.

Der Renderer liest den Sim-State, zeichnet die Szene und synchronisiert die Babylon-Objekte. Die Logik selbst bleibt in der Simulation und wird durch den Loop mit einem festen Timestep auf 60 Hz getaktet.

## Loop-Ansatz

Der Spiel-Loop läuft mit einem festen Timestep und einem Akkumulator. Der Renderer interpoliert zwischen zwei Sim-Zuständen, während die Simulation deterministisch mit diskreten Schritten läuft. Die erste Implementierung dient als sauberes Gerüst für spätere Controller, Gegner und Level-Logik.

Diese Struktur ist im Sinne von `TECHNIK.md` bewusst einfach und erweiterbar gehalten.
