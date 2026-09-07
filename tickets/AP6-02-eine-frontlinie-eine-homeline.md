# AP6-02 — Eine Frontlinie, eine Home-Line: A/B/C-Verdrahtung raus (Bereinigung)

**Status:** review (AP6-01 ist durch, `c4d21f5` + Review `05f6e65`)
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**Referenz:** `KONZEPT.md` §3 + §6 (neu gefasst 2026-09-07 — ganz lesen),
`tickets/erledigt/AP6-01-neuer-sektor-grabennetz.md` (## Bericht + ## Review),
`AUDIT-2026-09-07-ap5.md` (Befunde H2, H3, M7, N2 — direkt relevant),
`src/sim/front.ts` (`createFrontState`, Zustände, `rueckerobern`),
`src/sim/einsatz.ts` (`zermuerbungProKill`), `src/sim/wave.ts`,
`src/sim/index.ts`, `src/sim/sektor.ts`, `src/sim/navgraph.ts`.

## Ausgangslage

AP6-01 liefert den neuen Sektor mit **genau einem** `frontAbschnitt` (`front`)
+ **einem** `homeAbschnitt` (`home`). `front.ts` läuft damit mechanisch (N=1).
Aber quer durch die Sim + Integration stecken noch A/B/C-Annahmen und
String-Konventionen. **Copilot-Spec-Review (2026-09-07) hat die abhängigen
Stellen inventarisiert** — siehe unten.

Dieses Ticket ist die **mechanische Bereinigung: A/B/C raus, N=1 explizit im
Datenvertrag, KEIN Verhaltenswechsel.** Die neue „Druck-Radius"-Halte-Semantik
(AP6-01 TODO 2) ist bewusst **abgetrennt → AP6-02b**, damit die Golden-Anker
hier grün bleiben (kein Rebaseline) und der Rebaseline in AP6-02b dann *nur*
die tatsächlich geänderte Semantik erklärt.

## Ziel

Nach diesem Ticket:
- Keine `A`/`B`/`C`-Konvention mehr in `src/sim/**`, `src/main.ts`,
  `src/render/**`, `src/audio/**` — auch nicht in Kommentaren/Testfixtures.
- Ziel-Nav-Knoten, Rückkanten, Spawn-Rollen kommen aus **Sektor-Metadaten**,
  nicht aus String-Ableitung (`front-${id}`, `HINTEN_KANTE[A|B|C]`,
  `reinforcement-${id}`, Fallback `front-B`) — Audit H2.
- Sektor-Laden validiert **genau eine** Front- + **eine** Home-Linie
  (Audit N2) — leerer/mehrfacher Eintrag = Fehler, nicht stiller Fallback.
- **Verhalten bit-identisch zu vorher:** Golden-Anker „Sektor-Nav-Graph" +
  „die Uhr" bleiben **unverändert grün**. Wenn einer bricht → ein Verhalten
  hat sich geändert, das gehört gefunden und erklärt oder rückgängig gemacht.

## Umsetzung

### Kern-Sim

- **`front.ts`:** `AbschnittFront` → `LinienFront` (oder Feld umbenennen).
  API von „Liste von Abschnitten" auf **zwei benannte Linien** (Front, Home).
  Zustände (`stabil→bedraengt→gebrochen→verloren`), `depotVerloren`,
  `rueckerobern`, `HOME_BRESCHE_FAKTOR` bleiben **unverändert**. Die
  „gehalten solange Spieler in Bounds"-Logik (`gegnerImAbschnitt` ~Z. 156,
  `gehalten` ~Z. 160, `angriffTimer`/`verlorenTimer` an `!gehalten` ~Z.
  186–195) bleibt in diesem Ticket **wie sie ist** — nur auf die eine Linie
  reduziert. Umbau darauf ist AP6-02b.
- **`einsatz.ts`:** `zermuerbungProKill` ist durch AP6-01 schon auf die neuen
  Zonen gemappt (Audit H3 erledigt). Hier nur: `abschnittVerloren`-Parameter
  bleibt (bezieht sich jetzt auf *die* Frontlinie). Verlustbedingung:
  **Home-Linie `verloren`** statt „alle Home-Abschnitte gebrochen"
  (`homeState.every(...)` ~`index.ts:856`).
- **`index.ts`:** Die von Copilot genannten Stellen aufräumen:
  - `frontState`/`homeState`/`alleAbschnitte`/`aktiveAchsen` (~387–405) →
    zwei Linien, `aktiveAchsen` entfällt.
  - `waehleAbschnitt`/`abschnittRng`/`spawnEnemyById`/`reinforcement-${a}`
    (~552–594): kein Abschnitts-Würfeln mehr — jeder Gegner gehört zu „der
    Frontlinie". `abschnittRng` entfällt (Audit: prüfen ob das den
    Wave-/Klassen-Rng verschiebt → wenn ja, Golden-Anker-Bruch, dann *hier*
    erklären oder den Rng-Strom stabil halten).
  - `HINTEN_KANTEN` (~440–446): schon in AP6-01 auf `front` umgestellt —
    hier auf ein **Metadaten-Feld** des Sektors ziehen (`meta.frontLinie
    .hintenKanten` o. ä.) statt Record im Code.
  - beide `updateFront`-Aufrufe (~764–792), `homeState.every` (~856–866).
  - `_setAbschnittVerloren` (Testhook, ~266): → `_setLinieVerloren("front"
    |"home", bool)`. Sektortests, die den alten Hook nutzen, mitziehen.
- **`enemies.ts`:** `zielKnoten` (~201–220): Fallback `front-B` weg; Ziel
  kommt aus `meta` (Frontziel-Rolle). `festVersuche` NICHT hier anfassen
  (Audit M3 → AP7-Politur).
- **`sektor.ts` / `SektorMeta`:** `frontAbschnitte`/`homeAbschnitte` → je
  Einzelobjekt `frontLinie`/`homeLinie` **wenn** das die Sim klar
  vereinfacht; sonst Ein-Element-Liste mit Lade-Assert. Entscheidung im
  Bericht begründen. Neue Rollen-Felder: Frontziel-Knoten, Homeziel-Knoten,
  Hinten-Kanten, verdeckte Spawn-Knoten (Audit H2) — Daten liefert AP6-01
  schon, hier nur benennen/strukturieren.
- **Nav:** `brescheTag(abschnittId, i)` → `brescheTag("front", i)` bzw. auf
  die Linie fixiert. M7 (nur eine Bresche am Nav-Zugang) **ausdrücklich als
  bekannte Einschränkung dokumentieren** — die zweite Bresche bleibt reines
  physisches Loch (AP6-01 TODO 1), volle Modellierung ist AP7-Politur.

### Integration

- **`main.ts`** (~34–35, 66–80): Home-Peilung nicht mehr über
  `verbindungsgraben` (AP6-01 hat das provisorisch auf `"mitte"` gesetzt) —
  sauber aus `meta.homeZugaenge`. Kompass-Marker nicht mehr per Array-Index
  an den Frontzustand koppeln, sondern an die benannte Linie.
- **`render/index.ts`** (~433–477): Depot-/Rauch-/Breschen-Iteration auf die
  zwei Linien statt Abschnitts-Arrays. Schilder sind schon FRONT/HOME.
- **`audio/index.ts`** (~32–53): `FRONT_CALLOUT` (A/B/C, H-West/H-Ost),
  `ROUTE_CALLOUT` (feld-links …) sind Platzhalter, **nicht** an den Sektor
  verdrahtet. Entscheidung im Bericht: auf FRONT/HOME + Zonennamen umstellen
  **oder** ersatzlos entfernen (mit AP7 neu aufsetzen). `AudioEreignis` /
  `beobachteEreignisse` auf die Linien-Ids migrieren.

## Tests

- `front.test.ts` / `einsatz.test.ts` / `sektor.test.ts` / `enemies.test.ts`
  / Audio-/Kompass-/Lagekarten-Tests: Abschnitts-Fixtures + A/B/C-Namen raus,
  auf die Ein-Linien-API. Zustandsübergänge (`stabil→…→verloren`,
  `rueckerobern`) müssen weiter getestet sein.
- **Golden-Anker „Sektor-Nav-Graph" + „die Uhr": müssen unverändert grün
  bleiben.** Das ist das Sicherheitsnetz dieses Tickets. Bricht einer:
  Ursache finden, im Bericht als Verhaltensänderung ausweisen (dann gehört
  sie eigentlich nach AP6-02b) oder den Rng-Strom/die Logik so anpassen,
  dass das Verhalten wirklich identisch bleibt.
- `navgraph-begehbarkeit.test.ts` grün.
- Neuer **N=1-Lade-Assert-Test**: Sektor mit 0 / 2 Front- oder Home-Linien →
  Fehler beim Erzeugen (Audit N2).
- Headless-Einsatz bis „gewonnen" **und** bis „verloren" (Home-Linie fällt)
  spielbar (idealisierter Schütze).

## Akzeptanzkriterien

- `grep -rin "front-A\|front-B\|front-C\|abschnitt.*[ABC]\b\|H-West\|H-Ost"
  src/` findet nichts Funktionales mehr (Kommentare inklusive).
- Golden-Anker „Sektor-Nav-Graph" + „die Uhr" **unverändert**.
- Sektor-Laden lehnt ≠1 Front-/Home-Linie ab.
- `typecheck`/`lint`/`format:check`/`test:coverage`/`build` grün.

## Ausdrücklich NICHT

- **Druck-Radius-Halte-Semantik** (AP6-01 TODO 2) → **AP6-02b**.
- „Anzahl bedrohter Zugänge" als Wave-Skalierung → **AP6-02b**.
- Spawn-Verlagerung (AP6-03) · „Instand setzen" (AP6-04) · Roam (AP6-05).
- Perf-Broadphase / Spatial-Hash (Audit H1/M4/M5/M6) → **AP7**.
- `festVersuche`-Abklingen (Audit M3) · `dt≤0`-Guard (Audit N1) · leere
  Spawn-Liste (Audit M1) · `spawn`-Erfolg-Vertrag (Audit M2) → **AP7**.
- Zweite Bresche voll ins Nav-Modell (Audit M7) → **AP7**.

---

## Bericht — AP6-02

COMMIT: `<hash>` (Branch `arbeitspaket-6`) — exakter Hash in der Nachricht an
ki-game-f1 + im `git log`.
CI: läuft auf dem Push (Ergebnis in der Nachricht an ki-game-f1).
TODO(Rückfrage): **keine.**

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                 ✓
> eslint .                     ✓
> prettier --check .           ✓  (All matched files use Prettier code style!)
> vitest run --coverage        ✓  26 Dateien, 292 Tests (AP6-01: 286;
                                  +6 N=1-Lade-Assert-Tests, +1 front-Test,
                                  −1 toter Audio-Callout-Test)
    Coverage src/sim: 98,49 % Stmts / 97,32 % Branch / 100 % Funcs
    (AP6-01: 98,54 % — −0,05 pp, drei defensive TS-Narrowing-Guards in
    index.ts; sektor.ts + front.ts jetzt 100 %)
> vite build                   ✓  built in ~32 s
    dist/assets/index-*.js  6.910,51 kB │ gzip 1.533,88 kB  (Δ +0,47 kB —
      reiner Refactor, keine neue Runtime-Abhängigkeit)
```

Tests: **292** (26 Dateien) · Coverage src/sim: **98,49 %** · Bundle ~6,91 MB /
~1,53 MB gzip (Δ +0,47 kB).

### Umsetzung

Mechanische A/B/C-Bereinigung, **kein Verhaltenswechsel** — die beiden
Golden-Anker „Sektor-Nav-Graph" + „die Uhr" bleiben mit **unveränderten
Assertion-Werten** grün (nur zwei Testzeilen angepasst: `aktiveAchsen: ["front"]`
raus [war der Default], `_setAbschnittVerloren` → `_setLinieVerloren`).

- **`src/sim/sektor.ts`** — `FrontAbschnitt` → `FrontLinie` + Rollen-Felder
  (Audit H2): `zielKnoten`, `reinfKnoten` (`""` = keiner), `brescheZugang
  { bresche, davor }` (optional), `hintenKanten`. `SektorMeta.frontAbschnitte`
  /`homeAbschnitte` (Listen) → `frontLinie` / `homeLinie` (je **ein** Objekt).
  Neu: `pruefeSektorMeta(meta)` — wirft beim Laden bei fehlendem/unvollständigem
  Eintrag (Audit N2). `abschnittAt` → `frontLinieAt`. `brescheTag`-Param
  `abschnittId` → `linieId`.
- **`src/sim/front.ts`** — `AbschnittFront` → `LinienFront`, `AbschnittZustand`
  → `LinienZustand`. `createFrontState(linie)` + `updateFront(f, ctx, dt)`
  arbeiten je **eine** Linie (statt einer Liste); `FrontKontext.abschnitte`
  (Liste) → `.linie` (ein Objekt). Zustände, Schwellen, Timer-Logik,
  `HOME_BRESCHE_FAKTOR`, die „gehalten solange Spieler in Bounds"-Logik —
  **unverändert** (der Druck-Radius-Umbau ist AP6-02b). Der defensive
  „nicht gefundener Abschnitt"-Guard (im Listen-Loop nötig) entfällt.
- **`src/sim/enemies.ts`** — `zielKnoten(e, nav)` = `nav.verloren.has(e.abschnitt)
  ? nav.homeZiel : nav.frontZiel`; beide + `reinfKnoten` kommen aus dem
  `NavKontext` (Sektor-Metadaten), **keine `front-${abschnitt}`-Ableitung** und
  kein hartkodierter Fallback mehr. `loeseFest` Stufe 2 relokiert auf
  `nav.reinfKnoten` (`""` → übersprungen → Despawn). `EnemyEntity.abschnitt`
  bleibt (Golden-Anker), Doc ohne A/B/C.
- **`src/sim/index.ts`** — **`aktiveAchsen` / `waehleAbschnitt` / `abschnittRng`
  ersatzlos raus.** `abschnittRng` war ein eigener, sonst nirgends genutzter
  Rng-Strom (`seed ^ 0x3c3c3c3c`) — sein Wegfall verschiebt weder `waveRng`
  (`^0x5a5a5a5a`) noch `gegnerRng` (`^0x2b2b2b2b`); belegt durch die
  bit-identischen Golden-Anker (`angriffskraftRest` 145 bzw. 148/149,
  Positionen auf 4 Nachkommastellen, alle 5 defIds/Ziele). Jeder Sektor-Gegner
  gehört jetzt zur Frontlinie (`frontMeta.id`). `HINTEN_KANTEN`-Record →
  `frontLinie.hintenKanten`. `frontState`/`homeState`-Arrays →
  `frontLinieState`/`homeLinieState` (einzelne `LinienFront`).
  `SimState.front`/`.home` **bleiben Ein-Element-Listen** (siehe Abweichung 2).
  `_setAbschnittVerloren` → `_setLinieVerloren("front"|"home", bool)`.
  Verlustbedingung `homeState.every(verloren)` →
  `homeLinieState?.zustand === "verloren"`. `pruefeSektorMeta`-Aufruf beim
  Erzeugen.
- **`src/sim/einsatz.ts`** — unverändert (nur die aufrufende Bedingung in
  `index.ts`); `zermuerbungProKill`-Param `abschnittVerloren` bleibt wie im
  Ticket vorgegeben.
- **`src/data/sektor.ts`** — `frontLinie`/`homeLinie` mit den Rollen-Feldern
  belegt (`zielKnoten: "front-front"` / `"home-ziel"`, `reinfKnoten:
  "reinforcement-front"` / `""`, `brescheZugang: { bresche: "bresche-front",
  davor: "vorfront" }` / entfällt, `hintenKanten` = die 3 Front→Hinterland-
  Kanten / `[]`). Nav-Knoten/Kanten unverändert, nur Kommentare.
- **`src/main.ts`** — Kompass-Marker an die benannte Linie (`state.front.find(id
  === "front")`) statt Array-Index; Home-Peilung war schon `meta.homeZugaenge`
  id `"mitte"` (AP6-01), unverändert gelassen.
- **`src/render/index.ts`** — Depot-/Rauch-/Breschen-/Schilder-Iteration auf
  `[meta.frontLinie, meta.homeLinie]` statt Abschnitts-Arrays.
- **`src/audio/index.ts`** — **Entscheidung: `FRONT_CALLOUT` (A/B/C, H-West/
  H-Ost) + `ROUTE_CALLOUT` ersatzlos entfernt** — reine Platzhalter-Strings,
  an nichts verdrahtet (`beobachteEreignisse` nutzt `f.id` direkt). Eine
  Callout-Grammatik über die realen Linien-/Zonennamen setzt das VO-Paket (AP7)
  sauber neu auf. `AudioEreignis` `abschnitt-verloren` → `linie-verloren`.
- **`src/ui/kompass.ts` / `lagekarte.ts` / `hud.ts`** — `AbschnittZustand` →
  `LinienZustand`, Doc-Kommentare auf „Linie". Interface-Namen
  (`KompassAbschnitt`, Feld `abschnitte`) belassen (nur intern, sonst Ripple
  nach `main.ts` ohne Gewinn).
- **`src/ARCHITEKTUR.md`** — Abschnitt „Eine Frontlinie, eine Home-Line
  (AP6-02)" ergänzt; stale AP4/AP4-06-Stellen (A/B/C-Schilder, `FrontAbschnitt`,
  `lab-vorfront`, Callout-Konstanten …) nachgezogen.

### Golden-Anker — Gegenprobe

- **„golden replay — Sektor-Nav-Graph"** (`sim.test.ts`): alle Assertion-Werte
  unverändert grün — `player.pos` (3,6891 / 12,1298), `angriffskraftRest` 145,
  5 Gegner mit `abschnitt: "front"` + `zielKnoten: "front-front"`, defIds,
  Positionen, `s.front` = `[{id:"front"}]`, `s.home` = `[{id:"home"}]`. Nur
  Kommentar aktualisiert.
- **„golden replay — die Uhr (AP4-04)"** (`sim.test.ts` + `sektor.test.ts`):
  `nachschub` 5, `angriffskraftRest` 148 (stehende Front, −2) bzw. 149
  (gefallene Front, −1) — unverändert. Testcode: `aktiveAchsen: ["front"]`
  entfernt (war Default), `_setAbschnittVerloren` → `_setLinieVerloren`.
- **`navgraph-begehbarkeit.test.ts`** (Pflicht-Sicherheitsnetz): grün, nur
  `[meta.frontLinie, meta.homeLinie]` statt der Arrays.
- Der Inline-Testlevel-Golden-Anker (eigene `LevelData`) ist **unangetastet**.

### Tests

- **`front.test.ts`** komplett auf die Ein-Linien-API (`createFrontState(linie)`
  → ein Objekt, `updateFront(f, …)`); alle Zustandsübergänge (`stabil → … →
  verloren`, Erholung, Determinismus, Bresche, Druck) weiter abgedeckt +
  `brescheHpFaktor`-Test.
- **`sektor.test.ts`** — neuer `describe("N=1-Lade-Assert (Audit N2)")`: 5 Fälle
  (echter Sektor ok · Frontlinie fehlt · Home-Line ohne `zielKnoten` · Linie
  ohne `parapetBreschen` · geteilte Id · `createSim` wirft). `abschnittAt` →
  `frontLinieAt`, `_setLinieVerloren`, `meta.frontLinie`/`.homeLinie`,
  `aktiveAchsen` raus. Der Watchdog-Despawn-Test lag vorher auf `aktiveAchsen:
  []` (erzwang `abschnitt = ""` → keine Reloc) — jetzt liegt die versiegelte
  Kammer **auf** `reinforcement-front`, damit auch die Reloc (Stufe 2) im
  Käfig landet → Stufe 3 Despawn wie vorher.
- **`enemies.test.ts`** — die synthetischen Nav-Graphen bekommen `frontZiel` /
  `homeZiel` / `reinfKnoten` über ein `ZIELE`-Objekt; Fixture-Knoten `front-A`/
  `-B` → `front-x`, `reinforcement-A` → `reinforcement-x`.
- **`wave-eskalation.test.ts` / `gegner-klassen.test.ts`** — `nav` bekommt die
  Ziele aus `sektorGreybox.meta.frontLinie`/`.homeLinie`.
- **`audio/index.test.ts` / `kompass.test.ts` / `lagekarte.test.ts` /
  `hud.test.ts`** — Fixtures auf `front`/`home`-Ids (`A`/`B`/`C`/`H-West`/
  `H-Ost` raus), `linie-verloren`, toter `FRONT_CALLOUT`-Test entfernt.

### Entscheidungen / Abweichungen vom Ticket

1. **`SektorMeta.frontLinie`/`homeLinie` als Einzelobjekt** (nicht
   Ein-Element-Liste): N = 1 ist damit eine Typ-Invariante, die Audit-N2-Lücke
   („freies Array, leerer Eintrag = stiller Fallback") ist strukturell weg.
   `pruefeSektorMeta` fängt zusätzlich malformte/fehlende Einträge (Casts) beim
   Laden ab. Vom Planer vorab freigegeben.
2. **`SimState.front`/`.home` bleiben Arrays (Länge 1).** Golden-Anker
   (`s.front.map(f => f.id)`), Kompass, Lagekarte, Audio (`beobachteEreignisse`)
   und `main.ts` iterieren die — als Array-mit-1 bleibt jede Nahtstelle
   strukturell unverändert, kein Form-/Verhaltenswechsel nach außen. Vom Planer
   vorab freigegeben.
3. **`FRONT_CALLOUT`/`ROUTE_CALLOUT` entfernt statt umgestellt** (Ticket ließ
   die Wahl). Begründung oben.
4. **Zusatz-Renames** `AbschnittZustand` → `LinienZustand` (Konsistenz mit
   `LinienFront`), `abschnittAt` → `frontLinieAt` (der Helfer prüft jetzt genau
   die eine Frontlinie), `brescheTag`-Param `abschnittId` → `linieId`. `e.abschnitt`
   / `EnemyView.abschnitt` / `SimOptions.enemies[].abschnitt` **behalten**
   (Golden-Anker hängt dran; Wert immer `"front"`).
5. **M7** (nur die Mittel-Bresche hat einen Nav-Zugang, die Flanken-Bresche ist
   reines physisches Loch): als bekannte Einschränkung im Code + hier
   dokumentiert, **nicht gelöst** → AP7-Politur.

### Manuell geprüft

Nicht im Browser gefahren — reiner Refactor ohne Verhaltensänderung, das
Sicherheitsnetz ist die Testsuite (die beiden Golden-Anker + der
Begehbarkeits-Test + der volle Headless-Einsatz in `wave-eskalation.test.ts`
„liefert fünf wachsende Hauptwellen … gewonnen", alle unverändert grün). Der
volle Anspieltest steht laut STATUS.md ohnehin nach AP6-02 an (Merkposten
Sap-Lücken-Klumpen aus dem AP6-01-Review).
