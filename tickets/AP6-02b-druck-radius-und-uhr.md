# AP6-02b — Druck-Radius-Halte-Semantik + die Uhr an einer Linie

**Status:** offen · nach AP6-02
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**Referenz:** `KONZEPT.md` §3 („Die Linie fällt", „Parapet als lebendiges
Ziel") + §6, `tickets/erledigt/AP6-01-…md` (## Review TODO 2 + 4),
`AUDIT-2026-09-07-ap5.md` (H4-Kontext, Golden-Lücken §4), `src/sim/front.ts`
(`gegnerImAbschnitt`, `gehalten`, `angriffTimer`/`verlorenTimer`,
Breschen-Spielerradius ~Z. 156–195), `src/sim/einsatz.ts` (die Uhr),
`src/sim/wave.ts` (Skalierung), `src/sim/sim.test.ts` (Golden-Anker).

## Ausgangslage

Nach AP6-02 kennt die Sim **eine** Frontlinie + **eine** Home-Line, aber die
Halte-Bedingung ist noch die alte: die Linie gilt als „gehalten", solange
**irgendein** Spieler irgendwo in den Linien-Bounds lebt (`gehalten`
~`front.ts:160`, `angriffTimer`/`verlorenTimer` an `!gehalten` ~186–195). Bei
einer Linie über die ganze Sektorbreite (~68 m) heißt das: sie kann faktisch
nur fallen, wenn der Spieler sich zurückzieht oder stirbt — das Halten fühlt
sich nicht wie Halten an.

Copilot-Spec-Review: das ist **kein kleiner Austausch**. Eine einzelne globale
`LinienFront` hat heute *einen* Druckwert und *einen* Angriffstimer. Mit zwei
Breschen (und mehreren Parapet-Segmenten) braucht es ein **explizites
Datenmodell mit Aggregationsregel**.

## Ziel

Die Frontlinie hat mehrere **Halte-Punkte** (je Bresche einer, optional je
Parapet-Segment einer). Jeder hat lokalen Druck 0..1: er steigt, wenn dort
Gegner am Parapet stehen und **kein** Spieler in Reichweite ist; er fällt,
wenn ein Spieler in Reichweite ist oder keine Gegner da sind. Der
**Zustand der ganzen Linie** wird aus den lokalen Drücken aggregiert — die
Linie hält oder fällt weiter **als Ganzes** (`KONZEPT.md` §3), aber ein
einzelner ungedeckter, hart bedrängter Punkt reicht, um sie zu bedrohen.

## Umsetzung (Richtung — Zahlen sind Greybox-Startwerte)

### Datenmodell

- `HaltePunkt { pos: Vec3; druck: number /*0..1*/ }` je Bresche der Linie
  (Positionen aus `parapetBreschen`); optional zusätzlich je Parapet-Segment
  ein Punkt an dessen Mitte. Im Bericht begründen, ob Segment-Punkte nötig
  sind oder Bresche-Punkte reichen (Greybox: erst nur Breschen probieren).
- `LinienFront` bekommt `haltePunkte: HaltePunkt[]` statt des einen skalaren
  Druckwerts.

### Regeln je Tick (alles über `dt`, deterministisch)

- **Druck rauf:** `+= DRUCK_RATE * dt`, solange ≥1 Gegner im Kontaktradius
  des Punktes steht **und** kein lebender Spieler im `HALTE_RADIUS` (Startwert
  ~8 m) ist. Skaliert optional mit der Gegnerzahl am Punkt (gedeckelt).
- **Druck runter:** `-= ENTLAST_RATE * dt`, wenn ein Spieler im
  `HALTE_RADIUS` ist **oder** kein Gegner am Punkt. `ENTLAST_RATE` >
  `DRUCK_RATE` (ein anwesender Spieler gewinnt).
- **Aggregation → Linienzustand:** `maxDruck = max(hp.druck)`.
  - `maxDruck > SCHWELLE_BEDRAENGT` → Linie `bedraengt`, `angriffTimer +=
    dt * (1 + BONUS_PRO_PUNKT * (#Punkte über Schwelle − 1))`.
  - `angriffTimer > T_GEBROCHEN` → `gebrochen`, die Bresche(n) am/an den
    Punkt(en) mit dem höchsten Druck reißen auf (`breschen[i].offen = true`,
    `syncBreschen` öffnet Kollision + Nav wie AP4-06).
  - weiter unter Druck → `verlorenTimer`, dann `verloren` (Linie als Ganzes,
    `HINTEN_KANTEN` gehen auf, Spawn-Staffel-Wechsel macht AP6-03).
  - `maxDruck` fällt wieder unter Schwelle → Timer klingen ab (nicht sofort
    resetten), Zustand erholt sich `gebrochen → bedraengt → stabil`, solange
    noch keine Bresche offen ist.
- **Home-Line** kriegt dasselbe Modell (ihre Breschen als Halte-Punkte),
  `HOME_BRESCHE_FAKTOR` gilt weiter. Home-Line `verloren` = Einsatz verloren.

### Die Uhr

- `einsatz.ts`: „Frontlinie `verloren` → Uhr schneller" bleibt (schon in
  AP6-02). Zusätzlich optional: Uhr läuft bei `bedraengt`/`gebrochen` leicht
  schneller als bei `stabil` (Zwischenstufe) — im Bericht begründen, ob das
  das Pacing verbessert oder nur Rauschen ist.

### Wave-Skalierung — „Anzahl bedrohter Zugänge"

- Definition (die in AP6-02 noch fehlte): **Anzahl Halte-Punkte mit `druck >
  SCHWELLE_BEDRAENGT`** an Front + Home. `wave.ts` nimmt diese Zahl als
  milden Multiplikator auf Spawn-Takt/Reservegröße (Wellenkurve selbst
  unverändert). Deterministisch, darf den Wave-Rng nicht verschieben.

## Tests

- **Golden-Anker „Sektor-Nav-Graph" + „die Uhr": jetzt bewusst neu
  baselinieren** — Begründung direkt am Test: *nur* die Halte-/Uhr-Semantik
  hat sich geändert (AP6-02 hat Verhalten identisch gelassen, hier ist der
  eine erklärte Bruch). **Gegenprobe:** Halte-Modell per Stub auf „alt" (jeder
  Spieler in Bounds = gehalten, ein globaler Druck) → die alten Golden-Werte
  müssen exakt zurückkommen.
- Neue gezielte `front.test.ts`-Fälle:
  - Gegner am Halte-Punkt, kein Spieler → Druck steigt, Linie `bedraengt`,
    dann `gebrochen`, dann `verloren`.
  - Gegner am Punkt, Spieler im Radius → Druck bleibt ~0, Linie `stabil`.
  - Spieler deckt Punkt A, Punkt B ungedeckt unter Druck → Linie fällt
    trotzdem (Aggregation greift).
  - Druck fällt weg → Timer klingen ab, Zustand erholt sich (solange keine
    Bresche offen).
- `einsatz.test.ts`: Uhr-Verhältnis stehende/gefallene Front unverändert;
  Zwischenstufe (falls eingebaut) testen.
- `navgraph-begehbarkeit.test.ts` grün.
- Headless-Einsatz: (a) Spieler hält aktiv an der Front → Linie hält lange,
  (b) Spieler zieht sich ins Hinterland zurück → Front fällt in plausibler
  Zeit, weiter bis „gewonnen"/„verloren".

## Akzeptanzkriterien

- Die Frontlinie fällt, wenn Gegner sie ungedeckt bedrängen — auch während
  der Spieler noch irgendwo an der Linie lebt (aber woanders).
- Ein Spieler an einem Halte-Punkt hält *diesen* Punkt zuverlässig frei.
- Die Linie fällt/hält als Ganzes, nicht abschnittsweise.
- Golden-Anker mit dokumentierter Begründung + bestandener Stub-Gegenprobe
  neu.
- Alle Checks grün.

## Ausdrücklich NICHT

Spawn-Verlagerung (AP6-03) · „Instand setzen"-Interaktion (AP6-04, hier nur
der Zustandsübergang `rueckerobern`) · Roam (AP6-05) · Perf (AP7) · zweite
Bresche voll ins Nav-Modell (AP7).
