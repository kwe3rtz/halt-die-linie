# AP6-06 — Spieltest-Reibung: automatische Testwaffe + glatte Rampen + Nacht heller

**Status:** offen — **wird als Nächstes gebaut** (vor AP6-01b / AP6-02b)
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**Referenz:** 4. Spieltest 2026-09-08 (Nutzer, Nacht-Sektor auf `arbeitspaket-6`).
`src/data/waffen.ts` (`langgewehrM98`, `standardWaffe`), `src/data/schema.ts`
(`FeuerModus`, `feuerModus: "vollauto"` wird von `src/sim/weapon.ts` schon
bedient), `src/main.ts:24` (`createSim(SEED, sektorGreybox, { waves: true })` —
übergibt **keine** Waffe → Sim-Default), `src/sim/index.ts:314` (`options.weapon`),
`src/data/module.ts:193` (`rampe()` — baut aktuell 4 Einzelstufen),
`src/sim/collision.ts:70` (`STEP_HEIGHT = 0.5`, kein Slope-Primitiv),
`src/render/index.ts` (Nacht-Licht aus AP6-01: Fog 22–68, Mond-Ambient ~0,34,
PointLights aus `meta.lichter`).

## Ausgangslage — drei Reibungspunkte aus dem Spieltest

Der Nacht-Sektor „geht in die richtige Richtung", aber drei Dinge machen jedes
Anspielen mühsam und trüben das Urteil über Map und Gegner:

1. **Waffe zu zäh.** Startwaffe ist das Langgewehr M98 (Repetierer, 5 Schuss,
   Ladestreifen) — eine Welle zu töten dauert ewig. Der Nutzer will eine Runde
   mit *etwas Automatischem* spielen.
2. **Gegner bleiben an „Treppen" hängen**, besonders wenn sie in der Ecke davor
   stehen. Die `rampe()` ist wörtlich eine 4-Stufen-Treppe (4 Quader à 0,45 m).
3. **Nacht etwas zu dunkel** — Orientierung leidet, „okayish, aber nicht
   perfekt".

Dieses Ticket räumt nur diese Reibung weg. **Kein** Verhaltenswechsel an der
Sim-Kernschleife, **keine** neuen Systeme.

## 1 — Automatische Testwaffe

- Neue `WeaponDef` in `src/data/waffen.ts`, z. B. **`sturmMp18`** (WAFFEN.md
  „Sturm-MP 18", Wandwaffe im Zielbild — hier als spielbare Startwaffe für den
  Spieltest): `feuerModus: "vollauto"`, `nachladeArt: "magazin"`, Magazin ~20,
  Reserve ~120, `kadenz` ~450, `basisSchaden` ~28, kurze `reichweiteOptimal`
  (~22) / `reichweiteMax` (~55), etwas mehr `streuung`/`rueckstoss` als das
  Gewehr. Zahlen sind Platzhalter fürs *Feel*, nicht Balance.
- **`src/main.ts`**: `createSim(SEED, sektorGreybox, { waves: true, weapon:
  sturmMp18 })` — nur der Spielpfad bekommt die MP.
- **`standardWaffe` bleibt `langgewehrM98`.** Sim-Default und alle Tests
  (`sim.test.ts`, `sektor.test.ts`, `gegner-klassen.test.ts` hängen an
  `standardWaffe`/`basisSchaden 85`) unverändert → **Golden-Anker unberührt**,
  der idealisierte Schütze in den Headless-Einsätzen feuert weiter das Gewehr.
- HUD zeigt Magazin/Reserve der neuen Waffe korrekt (sollte generisch aus
  `WeaponState` kommen — prüfen, nicht hartkodiert).
- **Kein** Waffen-Wechsel / Loadout-UI (das ist AP7, `WAFFEN.md`). Nur: der
  Spieler startet mit der MP.
- Ein `weapon.test.ts`-Fall für `vollauto` existiert — kurz prüfen, dass die
  neue Def da mitläuft (Kadenz-Cooldown bei gedrückter Taste).

## 2 — Glatte Rampen (Stuck-Fix)

- **Zuerst reproduzieren + Ursache benennen** (Datei:Zeile): einen Gegner-
  Kapsel-Lauf die Home-Flankenrampe hoch (`modul("rampe", { x: 31, … }, 180)`,
  x ≈ 31, direkt an Kartengrenze x = 34 + Parapet-Ende) headless fahren und
  zeigen, wo/warum sie hängenbleibt — Stufenkante, Ecke, Separations-Schub von
  Nachrückenden, oder Kombination. Der `navgraph-begehbarkeit.test.ts` begeht
  die Kanten schon; hier geht es um den **Aufenthalt an/neben** der Rampe unter
  Gegnerdruck.
- **Fix im `rampe()`-Modul**, im Box-Kollisionsmodell bleibend (kein neues
  Slope-Primitiv in `collision.ts` — das ist Golden-Anker-nah und zu groß für
  dieses Ticket): mehr, flachere Stufen (z. B. 8–12 statt 4, Stufenhöhe ~0,15–
  0,25 m) **und** die Rampe spürbar breiter, damit eine Kapsel neben einer
  anderen hochkommt. Falls die Ursache primär die *Ecke* ist (Rampe + Grenze +
  Parapet-Ende): die Rampe von der Wand wegrücken / die Ecke im Sektor
  entschärfen (Sektor-Daten).
- `module.test.ts` an die neue Stufenzahl anpassen. Begehbarkeits-Test grün.
- **Merkposten:** die neue `rampe()` erbt AP6-01b (Map-Neubau) — dort werden
  alle Rampen-Platzierungen sowieso neu gesetzt.

## 3 — Nacht heller

- Reiner Renderer-Dreh (`src/render/index.ts`), **keine** Sim, **keine** Tests.
- Mond-Ambient hoch (~0,34 → ~0,45–0,55), Fog-Ende etwas weiter (68 → ~80–90)
  oder Fog-Farbe minimal heller, ggf. die statischen PointLights (`meta.lichter`)
  eine Spur heller/größer. **Ziel bleibt:** klar „Nacht", nicht „Tag mit Fog" —
  die Grabenstruktur soll ~20–30 m lesbar sein statt ~15.
- Im Headless-Screenshot (Frontgraben, Hinterland, Home-Line) gegenchecken.

## Akzeptanzkriterien

- `npm run dev`: Spieler startet mit einer automatischen Waffe, Wellen sind in
  vernünftiger Zeit tötbar; Gegner bleiben an den Rampen/Ecken nicht mehr
  sichtbar hängen; die Nacht ist lesbarer, aber klar Nacht. Screenshots/
  Beschreibung im Bericht.
- Repro + Ursache (Datei:Zeile) für den Rampen-Stuck im Bericht, plus Gegenprobe
  gegen den alten Zustand.
- **Golden-Anker unverändert** (kein Sim-Default-Wechsel). Falls doch ein Anker
  wackelt: stopp, zurück an den Planer.
- `typecheck` / `lint` / `format:check` / `test:coverage` / `build` grün.

## Ausdrücklich NICHT in diesem Ticket

Map-Neubau (AP6-01b) · Bresche→Durchbruch (AP6-02b) · Waffen-Loadout/-Wechsel-UI
· Waffen-Balance · Gegner-KI / Roaming (AP6-05) · neues Kollisions-Primitiv ·
Art/Materialien.
