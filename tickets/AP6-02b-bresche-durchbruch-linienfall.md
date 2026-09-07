# AP6-02b — Bresche → Durchbruch → Linienfall (physisch, telegraphiert)

**Status:** offen · nach AP6-02
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**Referenz:** `KONZEPT.md` §3 („Die Linie fällt", „Parapet als lebendiges
Ziel") + §6 (neu gefasst 2026-09-08), `SPARRING-ANTWORTEN.md` „Konvergenz
Runde 3" (Begründung — bitte lesen), `AUDIT-2026-09-07-ap5.md` §4,
`src/sim/front.ts` (`gegnerImAbschnitt`, `gehalten`, `angriffTimer`/
`verlorenTimer`, Breschen-Spielerradius ~Z. 140–200), `src/sim/einsatz.ts`
(die Uhr), `src/sim/wave.ts`, `src/sim/index.ts` (`syncBreschen`,
`updateFront`-Aufrufe), `src/sim/sim.test.ts` (Golden-Anker).

## Ausgangslage

Nach AP6-02 kennt die Sim **eine** Frontlinie + **eine** Home-Line, aber die
Halte-Bedingung ist noch die alte: „gehalten", solange irgendein Spieler
irgendwo in den Linien-Bounds lebt.

**Design-Runde 2026-09-08** (nach Sparring Runde 3 — alle drei externen KIs
deckungsgleich): das binäre „ganze Linie fällt, wenn eine unsichtbare
Drucksumme eine Schwelle reißt" ist der Hauptfehler — unfair und unlesbar für
Solo. Der Fall muss **ein sichtbares Ereignis im Raum** sein.

## Ziel — die Zustandskette

```
stabil → bedrängt → BRESCHE OFFEN → DURCHBRUCH → verloren
                         ↑______________↓ (Spieler räumt den Einbruch)
```

- **`stabil`** — kein nennenswerter Druck.
- **`bedrängt`** — an ≥1 Bresche-Punkt stehen Gegner am Parapet, lokaler
  Druck steigt. **Warnstufe 1** (Audio: vereinzelte Schüsse, Rufe,
  Untoten-Geräusch aus der Richtung). Ein Spieler in Reichweite entlastet.
- **`bresche-offen`** — lokaler Druck an einem Punkt hat 1,0 erreicht → **die
  Bresche reißt physisch auf** (`breschen[i].offen = true`; `syncBreschen`
  öffnet Kollisions-Loch + Nav-Kante wie AP4-06). Krise, **keine Niederlage**.
  Gegner strömen jetzt durch. **Warnstufe 2** (HUD-Kompass:
  `BRESCHE — <Landmark>`).
- **`durchbruch`** — Gegner sind **physisch durch eine offene Bresche hinter
  die Frontlinie** gekommen (Position südlich `FRONT_MIN_Z`, nördlich einer
  `DURCHBRUCH_TIEFE`) und halten den Fleck: ≥ `SCHWELLE_DURCHBRUCH` Gegner
  dort für länger als `KARENZ` (~2 s). Startet `durchbruchTimer` (~12 s).
  **Warnstufe 3** (HUD-Banner `DURCHBRUCH — N SEK`, andere Audiolage).
  - Spieler **räumt den Einbruch** (Gegnerzahl dort fällt unter die Schwelle)
    → `durchbruchTimer` pausiert/setzt zurück, zurück auf `bresche-offen`.
  - `durchbruchTimer` läuft ab → **`verloren`**.
- **`verloren`** — die ganze Linie fällt. `HINTEN_KANTEN` gehen auf,
  Spawn-Staffel-Wechsel (AP6-03), Front-Depot verloren.
- **Erholung:** fällt der Druck an allen Punkten + kein Gegner mehr hinter der
  Linie → `durchbruch → bresche-offen → bedrängt → stabil` (nur die
  *Bedrohung* erholt sich). **Eine einmal geöffnete Bresche bleibt physisch
  offen** (Narben-Effekt, `KONZEPT.md` §3) — sie schließt nur per
  `rueckerobern` (AP6-04). TODO(Rückfrage): ist „bleibt offen" im
  Greybox-Test zu hart? Alternative Stellschraube: geöffnete Bresche flickt
  sich nach `T_FLICK` s ohne Gegner selbst — im Bericht messen.

## Datenmodell

- **`HaltePunkt`** je Bresche der Linie: `{ pos, name, druck /*0..1*/,
  brescheIndex }`. Positionen aus `parapetBreschen`. `name` = Landmark-String
  für die HUD-Warnung (AP6-01 hat 2 Breschen: „Mitte"/„West" — für den
  Greybox reicht das; 4–5 benannte Punkte sind AP6-01-Politur / AP7).
- **`LinienFront`** bekommt `haltePunkte: HaltePunkt[]`, `zustand` (die Kette
  oben), `durchbruchTimer`. `angriffTimer`/`verlorenTimer` der alten Logik
  entfallen bzw. werden zu `durchbruchTimer`.
- **Home-Line:** dieselbe Kette (ihre Breschen als Halte-Punkte),
  `HOME_BRESCHE_FAKTOR` weiter (Home-Breschen brauchen mehr Druck).
  Home-Line `verloren` = Einsatz verloren.

## Regeln je Tick (alles über `dt`, deterministisch, Zufall nur `rng.ts`)

- **Druck rauf:** `+= DRUCK_RATE * dt`, solange ≥1 Gegner im Kontaktradius des
  Halte-Punkts **und** kein lebender Spieler im `HALTE_RADIUS` (Startwert
  ~8 m). Skaliert mild mit der Gegnerzahl am Punkt (gedeckelt).
- **Druck runter:** `-= ENTLAST_RATE * dt` (`> DRUCK_RATE`), wenn ein Spieler
  im `HALTE_RADIUS` ist **oder** kein Gegner am Punkt.
- **Durchbruch-Messung:** Gegner mit `pos.z` zwischen `FRONT_MIN_Z` und
  `FRONT_MIN_Z - DURCHBRUCH_TIEFE` (~10 m hinter der Linie), die durch eine
  offene Bresche kamen (oder einfach: alle dort — die kommen ja nur durch die
  Bresche/Sap-Lücke). Zählung, Schwelle, Karenz wie oben.

## Die Uhr — Frontfall macht es GEFÄHRLICHER, nicht SCHNELLER

Design-Entscheidung 2026-09-08 (ChatGPT + Gemini flaggten den Speedrun-
Exploit): **ein freiwilliger Frontverlust darf nie mehr Fortschritt pro
Minute erzeugen als erfolgreiches Halten.**

- Frontlinie `verloren` →
  - Spawn-Staffel rückt vor (kürzerer Anmarsch, mehr Druck) — AP6-03.
  - Front-Depot verloren (`depotVerloren`) — weniger Nachschub.
  - `zermuerbungProKill`: an der Frontlinie-Zone ist der Kill jetzt nur noch
    `HINTERLAND_ZERMUERBUNG` wert (schon so in `einsatz.ts`) — d. h. die
    Angriffskraft baut sich **langsamer** ab, das Finale kommt **später**,
    nicht früher.
- **Die Angriffskraft-Abbaurate wird durch den Frontfall NICHT erhöht.** Wenn
  `einsatz.ts` heute irgendwo „Front gefallen → Uhr schneller" im Sinne von
  schnellerem Abbau hat: entfernen. Der Effekt eines Frontfalls ist reine
  Erschwernis (Gegnerdruck, Nachschub), kein Zeitgewinn.
- Im Bericht: nachrechnen, dass „Front halten" ≥ „Front fallen lassen" in
  Fortschritt/Minute ist (headless, idealisierter Schütze, beide Strategien).

## Wave-Skalierung — „Anzahl bedrohter Zugänge"

= Anzahl Halte-Punkte, die `offen` **oder** über `SCHWELLE_BEDRAENGT` sind
(Front + Home). `wave.ts` nimmt das als milden Multiplikator auf
Spawn-Takt/Reservegröße (Wellenkurve unverändert). Deterministisch, darf den
Wave-Rng nicht verschieben.

## HUD / Audio — die drei Warnstufen (gehört dazu, sonst ist der Durchbruch unsichtbar)

- Stufe 1: `beobachteEreignisse` (`src/audio/`) meldet Druck an einem
  Halte-Punkt richtungsbasiert.
- Stufe 2: `src/ui/kompass.ts` zeigt einen Marker `BRESCHE — <name>` für jede
  offene Bresche.
- Stufe 3: HUD-Banner `DURCHBRUCH — <Sekunden>` solange `zustand ===
  "durchbruch"`. Klein, aber unmissverständlich.

## Tests

- **Golden-Anker „Sektor-Nav-Graph" + „die Uhr": jetzt bewusst neu
  baselinieren** — Begründung am Test: das Fall-Modell ist neu (Bresche →
  Durchbruch → Fall statt „Gegner im Anmarsch, Linie hält"). **Gegenprobe:**
  Fall-Modell per Stub auf „alt" (jeder Spieler in Bounds = gehalten) → die
  alten Golden-Werte kommen exakt zurück. Inline-Testlevel-Anker unverändert.
- Neue `front.test.ts`-Fälle:
  - Gegner am Halte-Punkt, kein Spieler → Druck steigt → Bresche öffnet
    (`breschen[i].offen`), Zustand `bresche-offen`.
  - Spieler am Punkt → Druck bleibt ~0, Bresche zu.
  - Bresche offen, Gegner strömen hinter die Linie, Spieler weg →
    `durchbruch`, Timer läuft, dann `verloren`.
  - `durchbruch`, Spieler räumt den Einbruch vor Timer-Ablauf → zurück auf
    `bresche-offen`, Linie hält.
  - Druck fällt weg → Zustand erholt sich, aber geöffnete Bresche bleibt
    physisch offen.
- `einsatz.test.ts`: „Front halten ≥ Front fallen lassen" in Fortschritt/Min
  (headless, beide Strategien).
- `navgraph-begehbarkeit.test.ts` grün.
- Headless-Einsatz: (a) Spieler hält aktiv → Linie hält lange, (b) Spieler
  zieht sich zurück → Bresche → Durchbruch → Fall in plausibler Zeit → weiter
  bis „gewonnen"/„verloren".

## Akzeptanzkriterien

- Der Frontfall ist eine sichtbare Ereigniskette (Bresche öffnet physisch →
  DURCHBRUCH-Banner → Fall), kein Schwellwert im Hintergrund.
- Ein Durchbruch ist abwendbar, solange der Spieler den Einbruch räumt.
- Ein Spieler an einem Halte-Punkt hält *diesen* Punkt zuverlässig frei.
- Front halten bringt ≥ so viel Fortschritt/Minute wie Front fallen lassen.
- Golden-Anker mit dokumentierter Begründung + bestandener Stub-Gegenprobe neu.
- Alle Checks grün.

## Ausdrücklich NICHT

Spawn-Verlagerung (AP6-03, hier nur die `HINTEN_KANTEN` beim Fall) · „Instand
setzen"-Interaktion (AP6-04 — `rueckerobern` schließt hier nur schematisch die
Breschen + setzt den Zustand zurück, die exponierte Interaktion + Kosten +
Narben-Effekt macht AP6-04) · Roam (AP6-05) · vorbereitete Verteidigung
(Draht/Barrikade — Backlog) · 4–5 benannte Bresche-Punkte (AP6-01-Politur/AP7)
· Perf (AP7).
