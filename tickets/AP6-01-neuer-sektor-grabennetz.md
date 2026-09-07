# AP6-01 — Neuer Greybox-Sektor: verzweigtes Grabennetz + Nacht-Beleuchtung

**Status:** offen
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6` (von `main`)
**Referenz:** `KONZEPT.md` §3 (neu gefasst 2026-09-07 — bitte ganz lesen),
`src/data/sektor.ts` (alter H-Sektor als Daten), `src/data/module.ts`
(Rasterbausteine), `src/sim/sektor.ts` (`SektorMeta`/`ZonenId`/`NavKnoten`),
`src/sim/navgraph.ts` (BFS-Pfad), `src/sim/navgraph-begehbarkeit.test.ts`
(Kapsel begeht jede Nav-Kante), `src/render/index.ts` (`createRenderer`,
Zonen-Materialien, Fog aus AP5-03), `tickets/erledigt/AP4-01-sektor-geometrie.md`
(wie der alte Sektor als Daten gebaut wurde — Vorbild fürs Vorgehen).

## Ausgangslage

Der dritte Spieltest hat den alten „H"-Sektor mit A/B/C-Abschnitten als zu
klein, zu statisch, zu abstrakt bestätigt. `KONZEPT.md` §3 ist neu gefasst:
ein **größeres, frei begehbares, verzweigtes WW1-Grabennetz** mit **einer**
durchgehenden Frontlinie und **einer** Home-Line.

Dieses Ticket baut nur die **Bühne** (Geometrie + Zonen + Nav-Graph +
Nacht-Optik). Der Kern-Bogen auf eine Linie umzustellen (Zustandsmaschine,
Uhr, Spawn-Verlagerung) ist AP6-02 ff.

## Ziel

Ein einziger, komplett handgebauter Greybox-Sektor im neuen Stil, aus den
Rasterbausteinen von `src/data/module.ts` (bei Bedarf erweitert), als **eine
Quelle** für Render-Meshes und Sim-Collider. Der Sektor ersetzt den alten
`sektorGreybox` als Default in `createSim` und im Renderer.

## Umsetzung

### Grundriss (von der Feindseite nach hinten, `KONZEPT.md` §3)

1. **Feindseite** — feindliches Grabenstück + 2–3 Anmarschwege. Eigener
   Bereich, **nicht** durchgängig mit den eigenen Gräben verbunden (die
   Frontlinie trennt). Nicht betretbar (Kollision + unsichtbare Grenze wie
   AP5-03, oder einfach außerhalb des begehbaren Netzes).
2. **Niemandsland** — Trichterfeld, Drahtreste, Ruinen, ein paar alte
   verfallene Grabenstücke. Verzweigt, Deckung, Sichthindernisse. Groß genug,
   dass sich Gegner darin bewegen (Roam-Raum, AP6-05).
3. **Frontlinie** — *eine* durchgehende Grabenlinie über die Sektorbreite:
   Feuertritt, Parapet, 1–2 Bresche-Punkte (schaltbare Kollider wie AP4-06),
   ein Nachschubdepot, ein **Instandsetzungs-Punkt** (Marker-Position, die
   AP6-04 nutzt). Als **eine** Zone `frontlinie`.
4. **Hinterland** — der große frei begehbare Bereich: mehrere Reserve- und
   Laufgräben, 1–2 Geschützstellungen, Trichter, Ruinen. **Mehrere verbundene
   Wege** vorn↔hinten (nicht ein Korridor). Zone `hinterland`.
5. **Home-Line** — durchgehende befestigte Linie, begehbare Unterstände
   (Munitionslager, Verbandsplatz, Feldkommandeur-Fixpunkt), Nachschubdepot,
   Instandsetzungs-Punkt. Als **eine** Zone `homeline`.

### SektorMeta

- **Zonen:** `feindseite` · `niemandsland` · `frontlinie` · `hinterland` ·
  `homeline`. (Die alten Zonen `feindzone`/`labyrinth`/`verbindungsgraben`/
  `feld` entfallen bzw. werden umbenannt — `ZonenId` in `src/sim/sektor.ts`
  anpassen, `zermuerbungProKill` in `einsatz.ts` auf die neuen Zonen mappen:
  frontlinie am teuersten, hinterland mittel, homeline am billigsten.)
- **`frontAbschnitte`: genau ein Eintrag** (`id: "front"`, Bounds = die ganze
  Frontlinie, Depot, Breschen). **`homeAbschnitte`: genau ein Eintrag**
  (`id: "home"`). Damit läuft die bestehende `front.ts`-Zustandsmaschine
  (`createFrontState` nimmt N Abschnitte, N=1 ist ok) ohne Code-Änderung
  weiter — die bewusste Vereinfachung auf „eine Linie" macht AP6-02.
- **Nav-Graph:** semantische Knoten/Kanten wie bisher (kein NavMesh). Deutlich
  mehr Knoten als der alte Sektor (größeres Netz, mehrere Wege). Feind-Spawn-
  Knoten auf der Feindseite; Verstärkungs-/Infiltrations-Knoten im
  Niemandsland und Hinterland (verdeckt, `KONZEPT.md` §3 „materialisieren nie
  im Sichtfeld"). Engstellen-Flags an echten Engstellen (Sap-Lücken,
  Breschen) wie AP4-06.

### Renderer + Nacht-Atmosphäre

- Meshes/Collider aus **einer** Datenliste (wie `src/data/sektor.ts` heute).
- **Nacht:** dunkler Himmel/Ambient, kürzere Sichtweite (Fog enger als AP5-03,
  Fog-Farbe dunkel), evtl. ein paar statische Lichtquellen (Leuchtkugeln,
  Feuer in Tonnen) als Orientierungspunkte. Greybox-Niveau — keine Art, keine
  dynamischen Lichter, aber es soll klar „Nacht" sein, nicht „Tag mit Fog".
- Zonen-Silhouetten weiter unterscheidbar (`KONZEPT.md` §3 Lesbarkeit):
  Frontlinie flach/weit, Hinterland verwinkelt, Home-Line hoch/befestigt.
- Keine Leit-„Spines" (die sind raus, AP5-05).

### Tests

- **`navgraph-begehbarkeit.test.ts`** auf den neuen Sektor umstellen/erweitern:
  jede Nav-Kante wird per echter `moveCapsule`-Simulation begangen, im
  Ist-Zustand **und** in „alles offen". Das ist das Pflicht-Sicherheitsnetz.
- Geometrie-Konsistenz: jede Bresche hat ein umschließendes schaltbares
  Segment; Zonen decken den begehbaren Bereich lückenlos; Depots/Instandsetz-
  Punkte liegen begehbar und in keinem Kollider.
- Golden-/Replay-Anker: die Sektor-abhängigen Anker (`sim.test.ts`
  „Sektor-Nav-Graph", „die Uhr") brechen durch den neuen Sektor —
  **bewusst neu baselinieren** mit Begründung direkt am Test (wie AP5-04/06).
  Der Inline-Testlevel-Anker (eigene `LevelData`, nicht der Sektor) bleibt
  unverändert.

## Akzeptanzkriterien

- `npm run dev`: man läuft nachts durch ein spürbar größeres, verzweigtes
  Grabennetz; Frontlinie, Hinterland und Home-Line sind an der Silhouette
  unterscheidbar; mehrere Wege vorn↔hinten; kein sichtbarer harter Kartenrand
  (wie AP5-03). Screenshot(s)/Beschreibung im Bericht.
- Begehbarkeits-Test grün auf dem neuen Sektor (Ist-Zustand + „alles offen").
- Bestehende Sim läuft auf dem neuen Sektor (ein Front-, ein Home-„Abschnitt");
  ein Einsatz ist headless bis „gewonnen" spielbar (idealisierter Schütze wie
  in den AP5-Tests).
- `typecheck`/`lint`/`format:check`/`test:coverage`/`build` grün.

## Ausdrücklich NICHT in diesem Ticket

`front.ts` auf „eine Linie" umbauen / A/B/C-Reste entfernen (AP6-02) ·
dynamische Spawn-Verlagerung (AP6-03) · „Instand setzen"-Interaktion (AP6-04,
hier nur der Marker-Punkt) · Roam-Verhalten (AP6-05) · prozeduraler Generator ·
echte Art/Beleuchtung · Tag-Modus.
