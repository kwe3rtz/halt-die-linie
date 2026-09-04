# AP4-04 — Die Uhr, der Rückzug & das Home-Line-Finale

**Status:** review
**Arbeitspaket:** 4 · **Branch:** `arbeitspaket-4`
**Referenz:** `KONZEPT.md` §3 („die Uhr — warum die Front halten"), §6
(Einsatzbogen: Wellen → Zeit-Hold an der Home-Line → Extraktion/Verlängern;
Verlustbedingung: Home-Line überrannt oder Trupp aus).

## Ziel

Der Kern-Bogen wird spielbar: die gehaltene Linie zermürbt die Angriffskraft
(mehr, je weiter vorn man hält), bei gebrochener Angriffskraft beginnt das
**Zeit-Finale an der Home-Line**, und der Einsatz endet — gewonnen (Entsatz) oder
verloren (Home-Line überrannt / Trupp aus). Danach die Extraktions-/Verlängern-
Entscheidung (minimal).

## Umsetzung

**Sim (`src/sim/wave.ts` + `src/sim/einsatz.ts`, neu):**

- **Die Uhr:** die endliche `angriffskraft` (schon da) wird zusätzlich zur
  bisherigen −1/Spawn durch **Zermürbung** abgebaut: pro getötetem Gegner −X,
  **je nach Todeszone** (`zoneAt`): Tod an der `frontlinie` zählt mehr als im
  `feld`, an der `homeline` am wenigsten. Solange Frontabschnitte stehen, wird
  der Feind weiter vorn zermürbt → die Uhr „gewinnt" mehr Zeit. Fällt ein
  Abschnitt (`onVerloren` aus AP4-03), sinkt der Zermürbungs-Bonus dieses
  Abschnitts / steigt der Nachrück-Takt der Reservespawns.
- **Phasen (`einsatz.ts`):** `aufbau → wellen → finale → vorbei`, `vorbei` mit
  `ergebnis: "gewonnen" | "verloren"`. `finale` startet, wenn `angriffskraft`
  gebrochen **und** keine Welle mehr in der Queue: fester Countdown („Entsatz in
  N s"), währenddessen weiter Restgegner + kleine Nachschub-Reservewellen. Läuft
  der Countdown ab → `gewonnen`.
- **Verlustbedingung:** alle Home-Line-Abschnitte `verloren` **oder** Trupp
  ausgeschaltet → `verloren`, in jeder Phase. Die Home-Line nutzt **dieselbe**
  `front.ts`-Maschine wie die Frontlinie, startet aber befestigt (mehr
  Bresche-HP, kein Erholungs-Cap-Sonderfall nötig).
- **Extraktion/Verlängern (minimal):** nach `gewonnen` ein
  `entscheide("extrahieren" | "verlaengern")`-Eingang. `verlaengern` startet
  eskalierende Reservewellen mit einem zweiten, kürzeren Countdown; `extrahieren`
  → `vorbei`. Beute-/Ökonomie-Folgen sind ein späteres Paket — hier nur der
  Ablauf + State-Flag.
- `SimState` um `einsatz: { phase, finaleRest, ergebnis }`.

**Render/UI:** Countdown + „Entsatz" / „Home-Line hält/fällt" als HUD-Text (volles
HUD-Design in AP4-05 / später). Kein neues 3D.

## Akzeptanzkriterien

- Frontabschnitte halten → `angriffskraft` sinkt im Test spürbar schneller als
  wenn alle Abschnitte gefallen sind (messbar über simulierte Ticks).
- `angriffskraft` gebrochen + Queue leer → `finale` mit Countdown; Countdown
  abgelaufen → `gewonnen`.
- Alle Home-Line-Abschnitte `verloren` → `ergebnis "verloren"`, egal welche
  Phase; Trupp aus → ebenfalls.
- `entscheide("verlaengern")` startet Reservewellen; `"extrahieren"` → `vorbei`.
- Vitest `einsatz.test.ts` (Phasenmaschine, Uhr-Zermürbung mit/ohne stehende
  Front, beide Endbedingungen) + `wave.test.ts` erweitert.
- Golden-/Replay grün bzw. neuer Anker. Goldene Regel gehalten.

## Offene Rückfragen

Zahlen (Zermürbung pro Kill je Zone, Finale-Countdown, Reservewellen-Kurve) sind
Platzhalter (Spieltest, `KONZEPT.md` §9.6). Ob das Finale eine feste Zeit oder
„bis Reservekraft 0" ist: vorerst feste Zeit, `// TODO(Rückfrage)`.

---

## Bericht — AP4-04

COMMIT: <wird beim Merge/Archiv ergänzt> (Branch arbeitspaket-4)
CI: grün / grün (Hash in der Nachricht an die Planer-Session)
TODO(Rückfrage):

1. **Alle Zahlen Platzhalter** (`src/sim/einsatz.ts` / `src/sim/wave.ts`):
   Zermürbung je Kill `frontlinie 2` / `labyrinth 1,5` / `feld · graben 1` /
   `homeline 0,5`; `FINALE_COUNTDOWN 90 s`, `VERLAENGERN_COUNTDOWN 45 s`;
   Reservewellen `RESERVE_BASIS 3` `+2` je `reserveStufe`, alle 8 s. Home-Bresche
   `HOME_BRESCHE_FAKTOR 2,5` (befestigt). Balance im Spieltest.
2. **Finale = feste Zeit** (Ticket-Vorgabe „vorerst feste Zeit"). Countdown läuft
   **feldunabhängig** — auch wenn noch Restgegner leben; „gewonnen" heißt „Entsatz
   ist da", nicht „Feld leer". `// TODO(Rückfrage)` an `FINALE_COUNTDOWN`.
3. **`finale` startet, sobald `angriffskraft <= 0` UND Spawn-Queue leer** — die
   `wave.ts`-`welle → reserve/vorbei`-Umschaltung braucht zusätzlich das leere
   Feld, das Finale nicht. Kurze Phase, in der `einsatz.phase === "finale"` aber
   `wave.phase` noch `"welle"` ist (Rest wird geräumt). Gewollt.
4. **`entscheide` nach `gewonnen` lässt die Maschine im `finale` „warten"** (kein
   Auto-`vorbei`) — im echten Spiel klickt der Spieler den Knopf. `verlaengern`
   kann beliebig oft, `reserveStufe` eskaliert die Reservewellen.
5. **`_setTruppAus` ist ein Koop-Stub** — solo respawnt der Spieler ewig, die
   Verlustbedingung „Trupp aus" kommt echt mit dem Koop-Wiederbelebungsfenster.
6. **`SimOptions.startAngriffskraft`** (neu) — nur damit Tests das Finale in
   erträglicher Tickzahl erreichen; Default unverändert `START_ANGRIFFSKRAFT`.
7. **Home-Line-Geometrie unverändert** — `meta.homeAbschnitte` (2 Abschnitte
   `H-West` / `H-Ost` ums Nordparapet) sind reine Meta über der AP4-01-Geometrie,
   keine neuen Quader.
8. **HUD nur Text** (Ticket: „volles HUD-Design AP4-05"): eine Zeile im
   Wellen-Panel — „Home-Line halten — Entsatz in N s" / „Entsatz eingetroffen —
   extrahieren oder verlängern" / „Einsatz gewonnen|verloren". Der
   `entscheide`-Knopf selbst ist noch nicht verdrahtet (kein UI-Ticket hier).

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  18 Dateien, 186 Tests (vorher 160)
    Coverage src/sim: 97,26 % Stmts / 96,28 % Branch / 100 % Funcs
    src/sim/einsatz.ts 100 %  ·  src/sim/wave.ts 100 %  ·  front.ts 98,4 %  ·  index.ts 98,5 %
> vite build                       ✓  dist/assets/index-*.js 6.890,16 kB │ gzip 1.527,56 kB
```

Tests: 186 (18 Dateien, +26) · Coverage src/sim **97,26 %** · Bundle ~6,89 MB /
~1,53 MB gzip (Δ ~+3 kB, ~440 Zeilen TS, kein neuer Import).

### Umsetzung

- **`src/sim/einsatz.ts`** (neu) — `EinsatzState` (`phase` / `ergebnis` /
  `finaleRest` / `reserveStufe`), `createEinsatzState`, `updateEinsatz(state,
  ctx, dt)` (rein, in-place), `entscheide(state, wahl)`, `zermuerbungProKill(zone,
  abschnittVerloren)`. Kein Babylon/Zeit/Zufall.
- **`src/sim/wave.ts`** — `WavePhase` um `"reserve"`. `WaveContext` um
  `finale?` / `reserveStufe?`. Spawn-Drain in `leereQueue()` herausgezogen (läuft
  jetzt in `welle` **und** `reserve`). `welle`-Ende bei gebrochener Angriffskraft:
  `ctx.finale ? "reserve" : "vorbei"`. `reserve` spawnt kleine Wellen auf einem
  8-s-Takt (erst wenn die letzte durch + Feld frei), `ctx.finale` false →
  `"vorbei"`.
- **`src/sim/sektor.ts`** — `SektorMeta.homeAbschnitte: FrontAbschnitt[]`.
- **`src/sim/front.ts`** — `FrontKontext.sektorMeta` → `FrontKontext.abschnitte`
  (dieselbe Maschine für Front **und** Home). `createFrontState(abschnitte,
  brescheHpFaktor = 1)` — Home startet befestigt.
- **`src/data/sektor.ts`** — `meta.homeAbschnitte` = `H-West` (x[-25,0]) /
  `H-Ost` (x[0,25]) ums Nordparapet, je eine Bresche.
- **`src/sim/index.ts`** — `homeState` (2,5× Bresche-HP), `einsatzState`,
  `truppAus`. Im tödlichen Treffer: **die Uhr** (`wave.angriffskraft -=
  zermuerbungProKill(zoneAt(kill), abschnitt verloren?)`). Je Tick:
  `updateFront` ×2 (Front + Home), `updateWave` (+ `finale` / `reserveStufe` aus
  `einsatzState`), `updateEinsatz` (`homeVerloren` = alle Home `verloren`,
  `truppAus`). `SimState` um `home` + `einsatz`. Sim-Eingänge `entscheide` +
  `_setTruppAus`; `rueckerobern` / `_setAbschnittVerloren` wirken jetzt auch auf
  Home-Abschnitte. `SimOptions.startAngriffskraft` (Test-Affordanz).
- **`src/ui/hud.ts`** — `PHASE_LABEL` um `reserve`, `einsatzText()` + eine
  optionale Zeile im Wellen-Panel. `main.ts` reicht `state.einsatz` durch.
- **`src/render/index.ts`** — nicht angefasst (die Home-Abschnitte hätten Rauch/
  Trümmer wie die Front über `syncFront`, das liest aber `state.front`; Home-Line-
  Visuals sind Feinschliff → AP4-05).
- **Tests:** `einsatz.test.ts` (13) — `zermuerbungProKill` (Front > Feld > Home,
  verloren = Feld), Phasenmaschine (alle Übergänge, `entscheide` extrahieren /
  verlaengern / vor-gewonnen-No-op, Home-Verlust in jeder Phase, Trupp aus,
  `vorbei` terminal), Determinismus. `wave.test.ts` (+3) — Finale → `reserve`
  statt `vorbei`, `reserveStufe`-Eskalation, `finale` vorbei → `vorbei`.
  `sektor.test.ts` (+7) — `SimState.home`, die Uhr (Kill an stehender Front
  zermürbt ~2×, gefallen ~1×; gleich viele Kills), Finale-Countdown → gewonnen →
  extrahieren, verlaengern → zweiter Countdown, Reservewellen nach geräumtem
  Feld, alle Home verloren → Einsatz verloren, Trupp aus → verloren.
  `sim.test.ts` (+2) — **neuer Uhr-Golden-Anker** (Seed 1: ein Front-Kill zieht
  2, an gefallener Front 1) + `einsatz`/`home`-Asserts im Nav-Anker.
  `hud.test.ts` (+1) — Einsatz-Zeile nur im Finale / bei Einsatz-Ende.
- **`src/ARCHITEKTUR.md`** — `einsatz.ts` + `wave.ts`-`reserve` + die Uhr im
  Abschnitt „Sektor (AP4)".

### Entscheidungen / Abweichungen vom Ticket

1. **Nav-Golden-Anker (Seed 40404) unverändert.** Im 600-Tick-Fenster fällt kein
   Gegner (`nachschub 0`) → die Uhr feuert nicht → `angriffskraftRest` bleibt 56.
   Statt ihn künstlich zu verschieben: **neuer, eigener Uhr-Anker** in
   `sim.test.ts` mit echten Kills. Der alte Inline-Anker (kein Sektor-Meta → keine
   Uhr, kein Einsatzbogen) ist ebenfalls unverändert.
2. **`FrontKontext` nimmt `abschnitte` statt `sektorMeta`** — die Home-Line läuft
   über dieselbe `front.ts`-Maschine, die keine `navGraph`/Zonen braucht (AP4-03-
   Review hatte das schon so eingeordnet).
3. **`SimState.einsatz` genau `{ phase, finaleRest, ergebnis }`** wie im Ticket;
   `reserveStufe` bleibt intern (`einsatzState`), `createSim` reicht es an
   `updateWave` weiter.
4. **`SimState.home[]`** zusätzlich (Ticket nennt nur `einsatz`) — HUD/Render
   brauchen den Home-Zustand analog zu `front[]`.
5. **`zermuerbungProKill` bündelt die Uhr-Logik** (statt sie in `index.ts` zu
   verstreuen) — testbar, eine Stelle.
6. **`_setAbschnittVerloren("H-West", true)`** funktioniert für Home-Abschnitte
   (kein Nav-Effekt, nur `frontState`/`homeState` + `verloreneAbschnitte`-Set) —
   so lässt sich die Verlustbedingung deterministisch testen.

### Manuell geprüft (`npm run dev` + direktes Modul-Harness, headless Chrome + CDP)

- **`npm run dev`:** lädt ohne Konsolen-Errors, stabile ~58–60 fps, Sim tickt
  konstant. Der neue Pfad (Uhr, `updateEinsatz`, HUD-Text) wirft nichts.
- **Direktes Harness** (`createSim` + `createRenderer` + `createHud`,
  `startAngriffskraft: 4`, in der Seite gefahren): nach Aufbau + kleiner Welle
  `angriffskraftRest 0` → `einsatz.phase "finale"`, `finaleRest` zählt
  echtzeit-korrekt runter (78 → 48 in 30 s), das HUD zeigt **„Home-Line halten —
  Entsatz in 49 s"**. `home: ["stabil","stabil"]`, 0 Errors.
- **Sim-Tests** fahren den Bogen deterministisch bis zu Ende: Finale-Countdown →
  `gewonnen` → `extrahieren` → `vorbei`; `verlaengern` → zweiter Countdown;
  alle Home verloren / Trupp aus → `verloren`.
- **Nicht headless einzufangen:** die volle 90-s-Countdown-Auflösung in Echtzeit
  (zu langsam) und ein Standbild der Home-Line von vorn (keine Kameradrehung). Im
  Spieltest gegenchecken.
