# AP6-02 — Eine Frontlinie, eine Home-Line: A/B/C-Verdrahtung raus (Bereinigung)

**Status:** offen · nächstes Ticket (AP6-01 ist durch, `c4d21f5` + Review
`05f6e65`)
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
