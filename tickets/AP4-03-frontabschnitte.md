# AP4-03 — Frontabschnitte: Besitz, Bresche, Fall

**Status:** review
**Arbeitspaket:** 4 · **Branch:** `arbeitspaket-4`
**Referenz:** `KONZEPT.md` §3 (`stabil → bedrängt → gebrochen → verloren`,
Parapet als lebendiges Ziel, „Verlust öffnet den Weg", Rückeroberung
selten/teuer).

## Ziel

Die Frontlinie wird ein lebendiges Ziel: jeder Abschnitt hat einen Besitz-/
Druckzustand, Parapet-Breschen, die der Feind aufreißt, und einen klaren
Fall-Trigger. Ein verlorener Abschnitt öffnet die Nav-Kanten nach hinten (AP4-02)
und schaltet den Infiltrations-Spawn frei.

## Umsetzung

**Sim (`src/sim/front.ts`, neu):**

- `AbschnittZustand = "stabil" | "bedraengt" | "gebrochen" | "verloren"`.
- Pro Abschnitt: `{ id, zustand, breschen: { pos, hp, offen }[], druck: number }`.
- `updateFront(frontState, ctx, dt)` mit
  `ctx = { enemies, sektorMeta, spielerPositionen, onVerloren(id) }`:
  - **Bresche:** Gegner in Reichweite einer noch geschlossenen Bresche und **kein
    Spieler in der Nähe** → `bresche.hp` sinkt; bei 0 `offen = true`.
    (Pionier-Reparatur ist ein späteres Paket — hier gilt nur „ungehalten fällt
    sie".)
  - **Druck:** steigt mit der Zahl lebender Gegner im `bounds` des Abschnitts,
    sinkt ohne Gegner. Übergänge:
    - `druck` über Schwelle **oder** ≥1 Bresche offen → `bedraengt`
    - Bresche offen **und** Gegner drücken seit `T` s am `front-<id>`-Knoten →
      `gebrochen`
    - `gebrochen` + weiter ungehalten für `T2` s → `verloren`
  - **Erholung:** kein Gegner im Abschnitt für `T3` s und keine offene Bresche →
    eine Stufe zurück Richtung `stabil` — **nicht** aus `verloren` heraus.
  - **`verloren` →** `onVerloren(id)` ruft (a) Nav-Kanten des Abschnitts nach
    hinten öffnen (AP4-02), (b) `reinforcement-<id>` aktivieren, (c) Depot des
    Abschnitts als „verloren" markieren (Uhr-Effekt in AP4-04).
  - **Rückeroberung:** nur über einen expliziten, teuren Eingang
    `rueckerobern(abschnittId)` auf dem Sim-Interface (Kosten / KI-Trupp kommen
    mit der Nachschub-Ökonomie), setzt `verloren → gebrochen` **nur wenn gerade
    kein Gegner im Abschnitt ist**. Kein automatisches Zurückflippen.
- `SimState` um `front: { id, zustand, breschenOffen: number }[]` (HUD/Render).

**Render:** Bresche offen = sichtbare Lücke/Trümmer im Parapet-Mesh. Abschnitts-
Zustand grob visuell (z. B. Rauch über `gebrochen`/`verloren`) — Feinschliff
AP4-05.

## Akzeptanzkriterien

- Gegner reißen eine ungehaltene Bresche auf; steht ein Spieler dort, geht es
  nicht (bzw. deutlich langsamer).
- Ein Abschnitt läuft unter Dauerdruck sauber `stabil → bedraengt → gebrochen →
  verloren`; ohne Gegner erholt er sich (außer aus `verloren`).
- `verloren` öffnet die Nav-Kanten nach hinten (AP4-02-Verhalten sichtbar:
  Gegner fluten Richtung Home) und aktiviert den Infiltrations-Spawn.
- `rueckerobern()` greift nur bei leerem Abschnitt.
- Vitest `front.test.ts`: Zustandsmaschine (alle Übergänge + Erholung + kein
  Selbst-Zurückflip aus `verloren`), Bresche-HP, `onVerloren`-Callback.
- Golden-/Replay grün bzw. neuer Anker. Goldene Regel gehalten.

## Offene Rückfragen

Schwellenzeiten `T / T2 / T3` und die Druck-Schwelle sind Platzhalter
(Spieltest). Ob `bedraengt` schon einen Gameplay-Effekt hat oder nur Anzeige ist:
vorerst nur Anzeige.

---

## Bericht — AP4-03

COMMIT: <wird beim Merge/Archiv ergänzt> (Branch arbeitspaket-4)
CI: grün / grün (Hash in der Nachricht an die Planer-Session)
TODO(Rückfrage):

1. **`T / T2 / T3` + Druck-Schwelle sind Platzhalter** (`src/sim/front.ts`,
   Block „Schwellen / Zeiten"): `DRUCK_SCHWELLE 3`, `T_GEBROCHEN 5 s`,
   `T2_VERLOREN 6 s`, `T3_ERHOLUNG 6 s`, `BRESCHE_MAX_HP 60`, `BRESCHE_DPS 8`
   je Gegner/s, `BRESCHE_RADIUS 3,5 m`. So gewählt, dass **ein** kleiner Wellen-
   Stoß die Front nicht knackt (AP4-02-Nav-Test bleibt grün), ein ungehaltener
   Dauerdruck sie in ~15 s durchläuft. Balance im Spieltest.
2. **`gebrochen → verloren` läuft, sobald der Abschnitt *ungehalten* ist**
   (kein Spieler im `bounds`) — **ohne** zusätzliche Feindbedingung, streng nach
   Ticket-Wortlaut „gebrochen + weiter ungehalten für T2 s". Wer einen
   gebrochenen Abschnitt nicht physisch besetzt, verliert ihn. Der Timer klingt
   ab, sobald ein Spieler im Abschnitt steht. Falls sich das zu hart anfühlt:
   `!gehalten` in `updateFront` um `&& gegnerImAbschnitt.length > 0` ergänzen.
3. **„Gegner drücken am `front-<id>`-Knoten" = „Gegner im `bounds` des
   Abschnitts"** — der `front-<id>`-Knoten liegt im `bounds`; die feinere
   Knoten-Distanz bringt im Greybox keinen Gameplay-Wert und spart `front.ts`
   die `navGraph`-Abhängigkeit.
4. **Eine offene Bresche öffnet `bresche-<id> ↔ lab-vorfront`** (die Kante steht
   seit AP4-02 als `offen: false` bereit; die AP4-02-Review nannte das als
   AP4-03-Aufgabe). Umsetzung: nur öffnen, nie eine Route sperren — schon
   marschierende Gegner rechnen nicht um, neue Pfade nehmen die Bresche
   (gleiche Hop-Zahl, alphabetisch vor `sap-*`). KONZEPT.md §3 „durch eine
   Bresche strömt der Feind".
5. **Render ist grob** (Ticket: „Feinschliff AP4-05"): Trümmerquader je offener
   Bresche, ein Rauch-Billboard je `gebrochen`/`verloren`-Abschnitt (Alpha nach
   Stufe). Kein Partikelsystem, kein Verstecken echter Parapet-Segmente.
6. **`bedraengt` ist nur Anzeige** (Ticket-Vorgabe). `SimState.front` liefert
   `zustand` + `breschenOffen` + `breschen[]` — HUD-Kompass/Marker sind AP4-05.

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  17 Dateien, 160 Tests (vorher 139)
    Coverage src/sim: 96,86 % Stmts / 95,50 % Branch / 100 % Funcs
    src/sim/front.ts 98,42 %  ·  src/sim/index.ts 98,53 %  ·  sektor.ts 100 %
> vite build                       ✓  dist/assets/index-*.js 6.886,96 kB │ gzip 1.526,67 kB
```

Tests: 160 (17 Dateien, +21) · Coverage src/sim **96,86 %** · Bundle ~6,89 MB /
~1,53 MB gzip (Δ ~+4 kB, ~330 Zeilen TS, kein neuer Import).

### Umsetzung

- **`src/sim/front.ts`** (neu) — `AbschnittZustand`, `BreschenZustand`,
  `AbschnittFront`, `createFrontState(abschnitte)`, `updateFront(front, ctx, dt)`
  (rein, in-place, kein Babylon/Zeit/Zufall). Je Abschnitt: `druck` (steigt mit
  lebenden Gegnern im `bounds`, fällt ohne), Breschen-HP (ungehalten −
  `BRESCHE_DPS` je Gegner in `BRESCHE_RADIUS`; Spieler in Reichweite → blockiert),
  drei Timer (`angriffTimer`/`verlorenTimer`/`ruheTimer`). Übergänge einer je
  Tick, vorwärts vor Erholung; Erholung eine Stufe, nie aus `verloren`.
  `onVerloren(id)` beim Übergang, `depotVerloren` gesetzt.
- **`src/sim/sektor.ts`** — `imXZ` → exportiert als `inBoundsXZ` (von `front.ts`
  + `createSim` genutzt, `zoneAt`/`abschnittAt` bauen darauf auf).
- **`src/sim/index.ts`** — `frontState` je Sim aus `sektorMeta.frontAbschnitte`;
  `updateFront` im `step` nach `updateEnemies` mit
  `spielerPositionen = tot ? [] : [player.pos]`. `onVerloren` → bestehendes
  `setAbschnittVerloren(id, true)` (Nav-Kante nach hinten + Infiltration).
  Offene Bresche → `setKanteOffen("bresche-<id>", "lab-vorfront", true)`.
  `SimState.front` (id/zustand/breschenOffen/breschen[]). Neuer Sim-Eingang
  `rueckerobern(id)` (nur bei leerem `bounds`: `verloren → gebrochen`, Kanten
  wieder zu). `_setAbschnittVerloren` reimplementiert als dünner Testeingang
  über `frontState` (erzwingt `verloren` bzw. `stabil`) — die AP4-02-Tests
  laufen unverändert.
- **`src/render/index.ts`** — `syncFront(state.front)`: Trümmerquader je Bresche
  (`setEnabled` nach `breschen[i]`), Rauch-Billboard je Abschnitt
  (`gebrochen` → α 0,26, `verloren` → α 0,44). Sauber disposed.
- **Tests:** `front.test.ts` (17) — `createFrontState`; Bresche auf/gehalten/
  mehr Gegner schneller/Leiche zählt nicht; Druck rauf-runter/weit weg;
  `stabil→bedraengt` (Druck **und** Bresche), `bedraengt→gebrochen` (T, hält der
  Spieler → nicht), `gebrochen→verloren` (T2, `onVerloren` genau einmal mit Id,
  terminal), `verloren` auch ohne Feind sobald ungehalten; Erholung
  `bedraengt→stabil`, keine Erholung bei offener Bresche, nie aus `verloren`;
  Determinismus. `sektor.test.ts` (+4) — `SimState.front` A/B/C stabil;
  **24 Gegner strömen ungehalten auf C → durchläuft sauber
  `bedraengt→gebrochen→verloren`, Bresche reißt auf, Gegner zielen auf
  `home-ziel`**; `rueckerobern` No-op bei besetztem / greift bei leerem
  Abschnitt (danach zielt ein frischer C-Gegner wieder auf `front-C`);
  `_setAbschnittVerloren(false)` setzt vollständig zurück. `sim.test.ts` (+3
  asserts im Nav-Golden-Anker: `front` = 3× `stabil`, keine Bresche offen).
- **`src/ARCHITEKTUR.md`** — `front.ts` im Abschnitt „Sektor (AP4)".

### Entscheidungen / Abweichungen vom Ticket

1. **`_setAbschnittVerloren` bleibt** (als dünner Testeingang über der Maschine)
   statt ersatzlos zu verschwinden — sonst müssten die AP4-02-Tests in
   `sektor.test.ts` umgeschrieben werden. Es erzwingt jetzt direkt den
   End-/Ausgangszustand in `frontState` und ruft dieselbe Nav-Verdrahtung.
2. **`ctx` bekommt `sektorMeta`** (wie im Ticket), `front.ts` liest daraus nur
   `frontAbschnitte` — keine `navGraph`-Abhängigkeit (siehe TODO 3).
3. **`SimState.front[]` um `breschen: readonly boolean[]`** über die Ticket-Form
   `{ id, zustand, breschenOffen }` hinaus — der Renderer braucht *welche*
   Bresche offen ist, nicht nur wie viele. `breschenOffen` bleibt fürs HUD.
4. **`verlorenTimer` ohne Feindbedingung** (TODO 2), **Bresche-Zugang zum
   Labyrinth** (TODO 4) — beides bewusst, begründet oben.
5. **Golden-Anker:** kein neuer nötig — `updateFront` fasst weder `enemies`,
   `player`, `wave`, `nachschub` noch die RNG-Ströme an; die AP4-02-Anker
   (Inline-Testlevel **und** Sektor-Graph, Seed 40404) sind unverändert grün,
   nur um `front`-Asserts ergänzt.

### Manuell geprüft (`npm run dev` + direktes Modul-Harness, headless Chrome + CDP)

- **`npm run dev` ~100 s idle:** lädt ohne Konsolen-Errors, stabile 57–60 fps,
  Sim tickt konstant. Der neue Render-Pfad (`syncFront`) wirft nichts.
- **Direktes Harness** (`createSim` + `createRenderer`, Sektor-Daten, in der
  Seite gefahren): `sim.getState().front` durchläuft real
  `[["A","stabil",0],["B","gebrochen",2],["C","verloren",1]]` bzw. bei längerem
  Druck `["B","verloren",2]` — die Zustandsmaschine greift **durch die Sim**
  (nicht nur im Unit-Test), `onVerloren` verdrahtet die Nav-Kanten, 0
  Konsolen-Errors über alle Läufe.
- **Nicht sauber headless einzufangen:** ein Standbild der Trümmer/Rauch-Meshes
  von vorn — ohne Pointer-Lock dreht die Kamera nicht, und der bedrängte Spieler
  stirbt wiederholt (Screen-FX überdeckt die Front). Wie in AP4-01/-02: bitte
  beim Spieltest gegenchecken (Bresche = Trümmer im Parapet, `gebrochen`/
  `verloren` = Rauch über dem Abschnitt).
