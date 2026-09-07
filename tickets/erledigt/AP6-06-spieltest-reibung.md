# AP6-06 — Spieltest-Reibung: automatische Testwaffe + glatte Rampen + Nacht heller

**Status:** erledigt (`a17e734`)
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

---

## Bericht — AP6-06 (Worker `ki-game-e6`)

COMMIT `a17e734` (`arbeitspaket-6`, gepusht) · CI + Pages Preview grün ·
303 Tests (+11) · typecheck/lint/format:check/test:coverage/build lokal + CI grün.

**Teil 1 — Testwaffe**
- `sturmMp18` (`src/data/waffen.ts`): Vollauto, Magazin 20 / Reserve 120,
  Kadenz 450, Schaden 28, kurze Reichweite, mehr Streuung/Rückstoß
  (WAFFEN.md „Sturm-MP 18"). Nur `src/main.ts` → `createSim(…, { weapon:
  sturmMp18 })`. `standardWaffe` = Langgewehr unverändert → Sim-Default +
  Tests + Golden-Anker unberührt.
- `hud.ts` liest `weapon.imLauf/.reserve` generisch, kein Change. Headless:
  MP startet 20/120, zählt bei Dauerfeuer runter (~Kadenz 450); Default-Sim
  weiter 5/45.
- `weapon.test.ts`: neuer Fall mit der echten Def (Vollauto + Kadenz-Cooldown
  + Magazin-Nachladen).

**Teil 2 — Rampen-Stuck: Repro + Ursache**
- Headless über die echte Sim reproduziert (`updateEnemies` + `moveCapsule`).
- **Ursache:** `src/data/sektor.ts:204` — Home-Grabensohle war `{ x: 64 }`
  (nur x ±32 breit). Die Flankenrampen (`sektor.ts:192–193`,
  `modul("rampe", { x: ±31 }, 180, { breite: 5 })`) reichen bis x ±33,5 —
  1,5 m über die Sohlenkante. Eine Kapsel in der äußeren Rampenspur lief
  südlich der untersten Stufe (z < −33,5) ins Leere und fiel durch die Welt.
  **Kein `FALL_LIMIT` für Gegner** (nur der Spieler hat es) → freier Fall,
  aus Spielersicht „an der Ecke verschwunden". Beleg: Kapsel gerade die
  Ost-Rampe runter bei x = 33,4 → y = −2,84 statt −1,80, stürzt weiter; unter
  Druck (8 Gegner) fiel einer auf y = −27510.
- **Fix 1 (Sektor-Daten):** Home-Grabensohle `{ x: 68 }` = volle Sektorbreite
  x ±34 — die ganze Rampe hat jetzt Boden.
- **Fix 2 (`rampe()` in `module.ts`):** 4 → 10 Stufen, Δy 0,45 → 0,18 m
  (`RAMPE_STUFEN = 10`). `module.test.ts` angepasst.
- **Gegenprobe:** neue Regressionsfälle in `navgraph-begehbarkeit.test.ts`
  (Kapsel über die ganze Rampenbreite x = ±31 ± 2 runter). Alt `{ x: 64 }` →
  x = ±33 rot (fällt durch), neu `{ x: 68 }` → grün.
- **Rampe breiter: NICHT gemacht** — kein Side-by-Side-Jam im Druck-Repro
  (breite 4–5 reicht), breitere Platzierungen überlappen Parados-Lücke /
  Parapet-Enden. AP6-01b setzt alle Rampen neu → dort die Breiten.

**Golden-Anker: bit-identisch** (kein Rebaseline). Voller Präzisionsvergleich
mit/ohne Diff (Nav-Replay Seed 40404, 600 Ticks; Uhr-Replay Seed 1): Spielerpos,
alle 5 Gegnerpos, Angriffskraft, Nachschub — jede Stelle identisch. Grund: die
Golden-Gegner erreichen in 600/500 Ticks nie die Home-Flankenrampen / die
verbreiterte Sohle; `moveCapsule`/`raycast` sind ordnungsunabhängig auf flachem
Boden.

**Teil 3 — Nacht heller** (`src/render/index.ts`, reiner Renderer-Dreh):
- PointLight-Feuer: Intensität 14 → 2,4, Reichweite 26 → 15, `FALLOFF_GLTF`
  (Akzent statt Scheinwerfer — Washout weg).
- Hemispheric („globaler Boden"): 0,34 → 0,9 + `groundColor` 0,06 → 0,26;
  Directional 0,22 → 0,4; Fog-Ende 68 → 88; `ZONEN_TON` je Kanal ~+0,06
  (Relativabstände bleiben → Zonen weiter unterscheidbar).
- Vorher/Nachher-Headless-Screenshots an 6 Positionen:
  `tickets/AP6-06-screenshots/`. Vorher: Home-West Washout mean ~105/max 250,
  Rampe/Niemandsland mean ~13–18 (fast schwarz). Nachher: überall mean 25–48,
  **0 % reines Schwarz**, warme Akzente erhalten, klar Nacht.

**Adjazent gefunden (NICHT in diesem Ticket):**
1. Zentraler Laufgraben-Mund (x ±2 / Parapet-Gap x ±4): Gegner überschießen
   `home-ziel`, klumpen ~10 am Engpass, Watchdog relokiert 2× — vorbestehend,
   von AP6-06 unberührt. → AP6-01b (Layout) / AP6-05 (KI).
2. Front-Graben hat dieselbe x ±32-vs-±34-Lücke, aber ohne Rampe/Nav an der
   Kante → gelassen, → AP6-01b.
3. Kein `FALL_LIMIT` für Gegner in `enemies.ts` → durchgefallener Gegner fällt
   unendlich statt Despawn/Reset. → AP7-Politur (Watchdog-Umfeld).

---

## Review — ki-game-f1 (2026-09-08)

**Grünes Licht.** `a17e734` auf `arbeitspaket-6`, CI grün, Scope deckt sich mit
dem Ticket (`git diff --stat`: 8 Code-/Test-Dateien + 12 Screenshots).

**Geprüft:**

- **Teil 1 (Waffe):** `sturmMp18` isoliert im Spielpfad (`main.ts`), Sim-Default
  `standardWaffe` = Langgewehr unverändert. `weapon.test.ts` deckt Vollauto +
  Kadenz-Cooldown + Magazin-Nachladen mit der echten Def ab. Korrekt kein
  Loadout-/Wechsel-Scope.
- **Teil 2 (Rampen):** Repro + Ursache exakt (`sektor.ts:204` Sohle x ±32,
  Rampe bis x ±33,5, kein `FALL_LIMIT` für Gegner). Zwei-Teil-Fix (Sohle volle
  Breite + 10 Stufen). Gegenprobe stichhaltig: neuer
  `navgraph-begehbarkeit`-Test failt mit dem alten `{ x: 64 }` an x = ±33,
  grün mit `{ x: 68 }` — echter Regressions-Anker, keine Aufweichung.
  Entscheidung „Rampe nicht breiter" mitgetragen (Überlappung Parados/Parapet;
  AP6-01b macht alle Rampen neu).
- **Golden-Anker:** unverändert im Repo (`sim.test.ts` nicht im Diff), CI grün.
  Worker hat zusätzlich einen vollen Präzisionsvergleich (Seed 40404 / Seed 1)
  gefahren — bit-identisch. Der Sektor-Daten-Eingriff (Sohle x64→68, Rampen
  4→10 Stufen) ist damit als anker-neutral belegt.
- **Teil 3 (Licht):** `render/index.ts` — PointLight 14→2,4 / range 26→15 /
  `FALLOFF_GLTF`, Hemispheric 0,34→0,9 + groundColor hoch, Fog-Ende 68→88,
  `ZONEN_TON` +0,06/Kanal. Screenshots geprüft (`home-west`, `home-ost-rampe`,
  `frontgraben`): Washout weg, kein reines Schwarz mehr, Grabenstruktur ~25 m
  lesbar, klar Nacht. **Merkposten:** der Frontgraben ist noch am dunkleren
  Ende — Licht-Platzierung in AP6-01b mit prüfen.
- **Adjazente Funde:** alle 3 korrekt außerhalb des Scopes gehalten und
  einsortiert (Laufgraben-Mund → AP6-01b/05, Front-Kante → AP6-01b,
  `FALL_LIMIT` Gegner → AP7). In die Tickets / `AUFGABEN.md` übernommen.

**Nicht getan (bewusst):** Waffen-Balance, Rampenbreite, das Kollisions-Slope-
Primitiv — alles korrekt aufgeschoben.
