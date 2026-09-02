# Halt die Linie — Technik & Architektur

**Stand 2. September 2026.** Ergänzt [`KONZEPT.md`](KONZEPT.md). Ergebnis der
Konzeptarbeit §1 (Tech-Stack).

## Zielbilder — mehrere Ausbaustufen

1. **Browser-Version (jetzt)** — läuft gut im Browser.
2. **Standalone-Desktop-App (später)** — `.exe` / `.app` via Wrapper.
   Tauri (leicht, OS-WebView) oder Electron (konsistenteres GPU-Verhalten bei
   3D/WebGPU). Entscheidung später.
3. **3D ist „ziemlich sicher"** — die 2D-artige Draufsicht ist *kein*
   Zwischenprodukt. Es wird von Anfang an in 3D gebaut.

## Stack — `BESCHLOSSEN`

| | |
|---|---|
| Sprache | **TypeScript** (strict) |
| Build | **Vite** |
| Engine / Renderer | **Babylon.js** (`@babylonjs/core`, tree-shakebar) — volle 3D-Web-Engine, TS-nativ, Havok-Physik, Inspector, WebGPU-Pfad |
| Qualität | ESLint (Flat Config) + Prettier + Vitest; CI (GitHub Actions) prüft typecheck/lint/format/test/build bei jedem Push; Preview-Deploy auf GitHub Pages |
| Dimensionalität | **3D von Tag eins**, Platzhalter-Geometrie (Boxen / Kapseln / Ebenen) |
| Kamera | **First Person** |
| UI | **HTML/CSS-Overlay** über dem Canvas (HUD, Menüs, Lobby, Quartier) — nicht in der Engine gezeichnet |

Gameplay, Simulation, Netcode und UI werden **einmal** gebaut; Art (Modelle,
Texturen, Animationen) kommt schrittweise dazu.

## Architektur-Prinzipien — `BESCHLOSSEN`

- **Headless, netcode-fähige Simulation von Anfang an.** Die Sim ist ein
  eigenständiges TS-Modul ohne Zugriff auf `window`, `document`, `Date.now()`,
  `Math.random()` — alles nur über definierte Eingänge (Input-Kommandos, Seed,
  dt). Kein Wegwerf-Refactoring später.
- **Rendering und Input sind strikt getrennt** und kommunizieren nur über diese
  Grenze. Der Renderer liest Sim-State und zeichnet; er fasst Spiellogik nie an.
- **Renderer ist dadurch austauschbar** (Konsequenz, kein Selbstzweck).
- **Netcode-Modell (Zielbild):** server-autoritativ mit State-Replikation +
  Client-Prediction. **Kein** deterministischer Lockstep — Determinismus ist
  damit keine harte Anforderung, die Sim-Trennung schon.
- **Kein Server in Phase 1.** Solo läuft die Sim lokal im Browser. Koop später =
  dieselbe Sim wandert auf einen Node-Server, Clients verbinden sich.

## Physik — `BESCHLOSSEN`

- **Gameplay-Kollision als eigener, portabler Code in der Sim:** Bewegung über
  Kapseln, Geschosse über Raycasts, Abschnitts- und Trigger-Volumen über AABB.
- **Havok nur kosmetisch, rein client-seitig:** Trümmer, Ragdolls, einstürzende
  Sandsäcke, Debris. Nie gameplay-relevant, nie in der Sim.

## Persistenz — `BESCHLOSSEN`

- **localStorage** in Phase 1: Kompanie-Kader, Freischaltungen, Ressourcen.
- Datenmodell so entworfen, dass ein Server-Backend (Accounts + DB) es später
  1:1 ersetzt. Kein Account-System jetzt.

## Projektstruktur — Vorschlag

```
/src
  /sim        headless simulation — keine Engine-, keine DOM-Importe
  /render     Babylon-Anbindung: liest Sim-State, zeichnet
  /input      Eingabe → abstrakte Kommandos für die Sim
  /ui         HTML/CSS-Overlay (HUD, Menüs, Lobby, Quartier)
  /data       datengetriebene Defs (Waffen, Gegner, Klassen) + Schema
  /platform   Persistenz-Adapter (localStorage jetzt, Backend später)
/assets       Platzhalter jetzt
```

Später ggf. Monorepo mit zusätzlichem `/server`, das `/sim` importiert.

## Offen

- Wrapper für Desktop: Tauri vs Electron — später.
- Node-Server-Aufbau + Hosting — wenn Koop drankommt.
- Asset-Pipeline (glTF, Texture-Atlas) — zusammen mit dem Art-Stil (KONZEPT §9.9).
- Default-Target: WebGPU vs WebGL2.

## Aufgaben für die VS Code KI

Gut delegierbar — enge Spezifikation, klare Schnittstelle, testbar, nicht
design-tragend:

- **Projekt-Scaffolding** — Vite + TS + Babylon, Ordnerstruktur, Lint/Format,
  fester-Timestep-Loop-Stub mit Akkumulator
- **Input-Layer** — Tastatur / Maus / Gamepad → Kommando-Objekte für die Sim
- **First-Person-Controller** — Kapsel-Bewegung, Kollision gegen Level-Collider,
  Kamera, Mauslook
- **Spatial-Hash / Grid** — Nachbarschaftsabfragen bei vielen Gegnern
- **Object-Pool** — Geschosse, Partikel, Gegner
- **Daten-Loader + Schema-Validierung** — Waffen / Gegner / Klassen aus JSON/TS
- **HTML/CSS-UI-Screens nach Vorgabe** — Lobby, Quartier, HUD, Endscreen, mit
  Mock-Daten
- **localStorage-Persistenz-Adapter** — nach vorgegebenem Schema
- **Unit-Tests** für die Sim-Module

**Bei uns bleibt:** Architektur, die Sim/Render-Grenze, Wave-Director & Tempo,
das Breschen- und Rückzugssystem, Ökonomie-Tuning, Klassen- und Balance-Design,
Tag/Nacht-Logik, prozedurale Sektor-Erzeugung.
