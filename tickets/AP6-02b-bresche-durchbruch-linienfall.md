# AP6-02b — Bresche → Durchbruch → Linienfall (physisch, telegraphiert)

**Status:** offen · **Bau-Reihenfolge (Grill-Runde 2026-09-09): nach AP6-01c →
AP6-01d → Gegner-KI-Design-Runde → AP6-05, dann dieses Ticket.** Setzt auf dem
neu gebauten Sektor (AP6-01d) + der stabilen Linien-Referenz auf.
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

Die Timer-/Bresche-Auswahl-/Randfall-Regeln unten sind nach einem
**Copilot-Spec-Review** geschärft: der Umbau des Übergangsblocks in `front.ts`
ist eine eigene Implementierungsaufgabe, `brescheIndex` ist Pflicht, und die
Wave-Skalierung darf **keine** Rng-Ziehung im Director hinzufügen/entfernen.

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
  brescheIndex /*PFLICHT — Index in parapetBreschen, nicht die Array-Position
  im haltePunkte-Feld*/, hatNavZugang /*bool*/ }`. `name` = Landmark-String
  für die HUD-Warnung (AP6-01 hat 2 Breschen „Mitte"/„West" — reicht für den
  Greybox; 4–5 benannte Punkte sind AP6-01-Politur / AP7).
  `brescheIndex` **muss** explizit sein — sobald optionale Parapet-Segment-
  Punkte dazukommen, ist die Array-Position nicht mehr stabil (Copilot-Review).
- **`LinienFront`** bekommt `haltePunkte: HaltePunkt[]`, `zustand` (die Kette
  oben), `durchbruchTimer`, `bruchGegner` (Zähler Gegner hinter der Linie).
  `angriffTimer`/`verlorenTimer` der alten Logik entfallen.
- **Home-Line:** dieselbe Kette. Unterschiede: **keine `HINTEN_KANTEN`**
  (nichts dahinter zu öffnen); `zustand === "verloren"` löst direkt
  `homeVerloren` aus (= Einsatz verloren). `HOME_BRESCHE_FAKTOR` weiter
  (Home-Breschen brauchen mehr Druck).

## Welche Bresche reißt auf — deterministische Regel

Beim Übergang nach `bresche-offen`:
- Kandidaten = Halte-Punkte mit `druck >= 1,0`, deren Bresche **noch nicht
  offen** ist.
- Es öffnet **die mit dem höchsten Druck**; bei Gleichstand die mit dem
  **kleinsten `brescheIndex`**. Genau eine pro Tick.
- Sind alle Breschen der Linie offen → keine weitere öffnet, der Druck läuft
  weiter in die Durchbruch-Messung.
- `syncBreschen()` (`index.ts`) schaltet Kollider + Nav wie AP4-06. **Nur die
  Mittel-Bresche hat einen Nav-Knoten** (`hatNavZugang`, AP6-01 TODO 1) — eine
  Flanken-Bresche reißt physisch auf (Kollisions-Loch), bekommt aber keine
  Nav-Kante. Das ist bekannt und bleibt so bis zum AP7-Politur-Ticket.

## Regeln je Tick (alles über `dt`, deterministisch, Zufall nur `rng.ts`)

- **Druck rauf:** `+= DRUCK_RATE * dt`, solange ≥1 Gegner im Kontaktradius des
  Halte-Punkts **und** kein lebender Spieler im `HALTE_RADIUS` (Startwert
  ~8 m). Skaliert mild mit der Gegnerzahl am Punkt (gedeckelt).
- **Druck runter:** `-= ENTLAST_RATE * dt` (`> DRUCK_RATE`), wenn ein Spieler
  im `HALTE_RADIUS` ist **oder** kein Gegner am Punkt.
- **Durchbruch-Messung:** `bruchGegner` = Zahl lebender Gegner mit `pos.z`
  zwischen `FRONT_MIN_Z` und `FRONT_MIN_Z - DURCHBRUCH_TIEFE` (~10 m hinter der
  Linie). (Vereinfachung: alle dort zählen — durch die stehende Wand kommen
  sie nicht, nur durch offene Bresche oder Sap-Lücke; ob eine offene Bresche
  Voraussetzung ist, im Bericht entscheiden.)

## Zustandsübergänge — präzise (vor dem Coding als kleines Diagramm in den Bericht)

Der alte Timer-/Übergangsblock (`front.ts` ~Z. 185–201: `angriffTimer`,
`verlorenTimer`, `ruheTimer` an `!gehalten` bzw. `gegnerImAbschnitt.length===0
&& !brescheOffen`) wird **substanziell umgebaut** — das ist eine eigene
Implementierungsaufgabe, nicht ein Ersetzen von `f.druck` durch `maxDruck`.

| von | nach | Bedingung |
|---|---|---|
| `stabil` | `bedrängt` | `max(haltePunkt.druck) > SCHWELLE_BEDRAENGT` |
| `bedrängt` | `stabil` | `max(druck) <= SCHWELLE_BEDRAENGT` für `T_ERHOLUNG` s, **und** keine Bresche offen |
| `bedrängt` | `bresche-offen` | ein Halte-Punkt erreicht `druck >= 1,0` → Bresche-Auswahl (oben) |
| `bresche-offen` | `bedrängt` | `bruchGegner < SCHWELLE_DURCHBRUCH` **und** `max(druck) <= SCHWELLE_BEDRAENGT` für `T_ERHOLUNG` s (Breschen bleiben physisch offen) |
| `bresche-offen` | `durchbruch` | `bruchGegner >= SCHWELLE_DURCHBRUCH` für `KARENZ` s |
| `durchbruch` | `bresche-offen` | `bruchGegner < SCHWELLE_DURCHBRUCH` (Timer zurück auf 0) |
| `durchbruch` | `verloren` | `durchbruchTimer >= T_DURCHBRUCH` (~12 s) |
| `verloren` | `bedrängt`/`stabil` | nur durch `rueckerobern` (AP6-04) — schließt Breschen, setzt Timer/Druck zurück, kurze Schutzphase |

Schwellen-Vergleiche: `>` für „drüber", `>=` für Bresche/Durchbruch-Auslöser
(im Code konsistent, im Bericht festhalten). Bei großen `dt` (Test-Ticks):
Timer-Akkumulation ist `+= dt`, keine Frame-Zählung — großer `dt` überspringt
keine Übergänge, kann aber mehrere in einem Tick auslösen (dokumentieren).

## Randfälle (im Ticket festlegen, mit Test)

- **Spieler tot / kein Spieler im Sektor:** `index.ts` gibt keine
  Spielerposition — alle Halte-Punkte dürfen Druck aufbauen. Respawn zählt ab
  dem Tick wieder als Spielerpräsenz (kein Sonderfall).
- **Alle Punkte gleichzeitig über Schwelle:** `bedrohteZugaenge` wird auf die
  Punktzahl gedeckelt; kein Timer-Bonus jenseits `MAX_BEDROHT`.
- **Keine Halte-Punkte (Linie ohne Bresche):** `max(druck) = 0`, Linie kann
  nur über den Durchbruch (Sap-Lücken) fallen — im Bericht sagen, ob das ein
  gültiger Sektor ist oder ein Konfig-Fehler.
- **Gleichstand beim Maximaldruck:** genau eine Bresche öffnet (kleinster
  `brescheIndex`), nicht mehrere.
- **Bereits offene Maximaldruck-Bresche:** die nächste geschlossene Bresche
  mit dem höchsten Druck ≥ 1,0 öffnet; sind alle offen, öffnet keine.
- **`bresche-offen` ist dauerhaft** bis `rueckerobern` — die *Erholung* der
  Bedrohung (`bresche-offen → bedrängt`) ändert nur den Zustand/Timer, die
  Bresche bleibt ein physisches Loch.
- **Home-Line:** dieselbe Drucklogik, aber `verloren` → `homeVerloren` direkt,
  keine `HINTEN_KANTEN`.

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
(Front + Home). Als **vorberechneter deterministischer Wert** (`bedrohteZugaenge:
number`) in `index.ts` **nach** `updateFront()` gebildet und in den
`WaveContext` gegeben — `wave.ts` würfelt ihn nicht selbst aus.

**Wirkt NUR auf den Spawn-Abstand** (`spawnIntervall`-Modifikator): das
verschiebt Tick-Zeitpunkte, aber **nicht die Rng-Sequenz**. Die Reservegröße
**nicht** über diesen Wert skalieren — eine geänderte Reservegröße ändert die
Anzahl `waehleGegner()`-Aufrufe und verschiebt damit den kompletten folgenden
Wave-Rng-Verlauf (Copilot-Review). „Kein Rng verschieben" heißt hier
ausdrücklich: **keine zusätzliche oder entfernte Ziehung im Director**, nicht
nur „kein eigener Rng-Strom".

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
  die Halte-/Fall-Auswertung als **injizierbare reine Strategie** bauen
  (`front.ts` bekommt sie als Parameter/Feld), nicht fest verdrahtet. Der Test
  injiziert die **alte** Strategie (globaler Druck, `gehalten` = Spieler in
  Linien-Bounds, alte Timerkopplung, `bedrohteZugaenge` = 0) → die alten
  Golden-Werte kommen **exakt** zurück, inkl. identischer Wave-Rng-Anzahl und
  -Reihenfolge (Copilot-Review: nachträgliches Überschreiben einzelner Werte
  im Test wäre zu fragil und kein belastbarer Beweis). Inline-Testlevel-Anker
  unverändert.
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
