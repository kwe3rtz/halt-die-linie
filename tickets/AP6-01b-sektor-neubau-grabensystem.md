# AP6-01b — Sektor-Neubau: echtes Grabensystem (kein Box-Labyrinth)

**Status:** ENTWURF — Design-Runde mit dem Nutzer läuft. Noch **kein**
Worker-Ticket. Wird nach AP6-06 gebaut, **vor** AP6-02b.
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**Referenz:** 4. Spieltest 2026-09-08 — Nutzer: die Map ist „zu abstrakt" (gerade
Box-Korridore als Gräben, dünne Wände, leere Flächen — liest sich als
Heckenlabyrinth, nicht als Grabensystem) **und** „kaputt / jank" (Löcher,
Clipping, man bleibt an Kanten hängen). `KONZEPT.md` §3 (Grundriss),
`tickets/erledigt/AP6-01-neuer-sektor-grabennetz.md` (der aktuelle Sektor —
wird ersetzt), `src/data/sektor.ts`, `src/data/module.ts` (Baukasten — wird
erweitert), `src/sim/navgraph.ts`, `src/sim/navgraph-begehbarkeit.test.ts`
(Pflicht-Sicherheitsnetz), `src/render/index.ts`.

## Warum

AP6-01 hat die Bühne funktional gebaut (Zonen, Nav-Graph, Nacht, N=1), aber
**zu schematisch**: die „Gräben" sind gerade Quader-Korridore mit dünnen
Wänden, das Hinterland sind zwei große leere Flächen mit ein paar
Deckungsklötzen. Im Spieltest trägt das nicht — es fühlt sich nicht wie ein
WW1-Grabensystem an. Dieses Ticket baut denselben Grundriss (KONZEPT.md §3)
**als echtes Grabensystem** neu — noch Greybox (keine Art), aber mit der
richtigen Raumstruktur.

## Zielbild — was ein Grabensystem ausmacht

Von der Feindseite nach hinten (KONZEPT.md §3-Grundriss bleibt):

1. **Feindseite** — unverändert Kulisse (Feind-Grabensilhouette, 3 Spawns
   hinter der unsichtbaren Sperrwand, 3 Anmarsch-Bahnen).
2. **Niemandsland** — Trichterfeld + Drahtgürtel + **eine quer laufende
   verfallene Alt-Frontlinie**, in die man (und später die Roamer, AP6-05)
   hineinsteigen und sich darin bewegen kann. Die 3 Anmarsch-Bahnen schlängeln
   sich durch die Trichter. 1–2 **Sap-Köpfe**: kurze Stichgräben, die vom
   Feuergraben nach vorn in den Trichterbereich stoßen (Horchposten).
3. **Feuergraben (Frontlinie)** — **gestaffelt / gezähnt**, nicht gerade:
   5–6 **Feuernischen** (~8 m) mit **Traversen** (dicke Erd-Dog-Legs)
   dazwischen. Man bewegt sich im Zickzack durch die Linie: Nische → um die
   Traverse versetzt → nächste Nische. Feuertritt + Parapet an der Nordkante
   jeder Nische. **Bresche-Punkte = bestimmte Nischen**, nach Landmarks benannt
   (Panzerwrack, Pumpenstand …), nicht A/B/C — passt zu KONZEPT.md §3
   „Bresche → Durchbruch". Hinten der **Parados** mit Eingängen zu 2–3
   **begehbaren Unterständen** (das Front-Depot liegt in einem) und den
   Mündungen von 2–3 **Verbindungsgräben**.
4. **Hinterland** — **kein offenes Feld**: ein **Stützgraben** quer (leichter
   gezähnt), über 2–3 **Verbindungsgräben** (Zickzack, vorn↔hinten) mit dem
   Feuergraben verbunden — das sind die „mehreren Wege" aus KONZEPT.md §3, der
   Spieler wählt eine Bahn. Dazwischen Geschützstellungen (Sandsackringe),
   ein Baracken-Ruinen-Cluster, weitere Trichter. Ein **Reservegraben**
   dahinter.
5. **Home-Line** — die stärkste Linie: tiefer, breiter, kräftigere Wände
   (Holz-/Beton-Verbau-Look über die Greybox-Proportionen), gezähnt. **3
   begehbare Unterstände** an der Rückwand: Munitionslager, Verbandsplatz,
   Feldkommandeur (funktionaler Fixpunkt). Home-Depot. Die Verbindungsgräben
   münden an 2–3 Punkten; die Flanken jenseits der Parapet-Enden bleiben offen
   (Feind steigt dort ein, wie jetzt).

## Baukasten — neue / überarbeitete Module (`src/data/module.ts`)

- **`traverse`** — Erd-Dog-Leg, erzeugt den Versatz zwischen zwei Feuernischen.
- **Feuergraben-Komposition** — Nische + Traverse + Feuertritt + Parapet als
  ein gezähnter Lauf (Helfer, der die Nischen/Traversen aus einer Zähler-Liste
  setzt), oder sauber aus `grabengerade` + `grabenknick` + `traverse` + `parapet`
  komponiert.
- **`verbindungsgraben`** — Zickzack-Kommunikationsgraben (Kette aus
  `grabengerade` + `grabenknick`), Länge/Anzahl-Knicke als Parameter.
- **`unterstand`-Überarbeitung** — echter Unterstand: Treppe/Rampe **hinab**,
  kleiner Raum unter Flur, begehbar mit Kopffreiheit. Der aktuelle
  Oberflächen-„Bunker mit Dach" trägt das Gefühl nicht. (Falls die
  Kollisions-/Kamera-Marge das nicht hergibt: flacher Halb-Unterstand, aber
  klar „hinein", nicht „obendrauf".)
- **`geschuetzstellung`** — Sandsackring / MG-Stellungs-Stub (Deckung + Landmark).
- **`sap`** — kurzer Stichgraben mit kleinem Posten am Kopf.

`RASTER`/`einrasten` beibehalten — der spätere Generator (KONZEPT §9.6) nutzt
denselben Kasten fürs *ganze* Netz.

## Nav-Graph

Wächst deutlich (grob 60–80 Knoten). Jede Feuernische = ein Knoten, jeder
Traversen-Durchgang = `engstelle`, jeder Verbindungsgraben = eine Knotenkette,
Stütz-/Reservegraben = Knoten. Die 3 `frontLinie.hintenKanten` werden die 3
Verbindungsgraben-Mündungen (starten `zu`, öffnen beim Linienfall — wie jetzt).
`frontLinie.brescheZugang` / `parapetBreschen` zeigen auf die benannten
Bresche-Nischen. Nav-Wissen bleibt in den Rollen-Feldern von `SektorMeta`
(AP6-02), nicht zurück in `index.ts`.

## Jank-Pass (der „kaputt"-Teil)

- **Durchgehender Boden** — keine Lücken/Kanten zwischen Bodenplatten (der
  Spieler meldete Löcher/Hängenbleiben). Ein Sim-Test: Kapsel an jeder
  Zonengrenze über den Übergang laufen, kein Absacken, kein Stopp.
- **Grabenecken** (`grabenknick`) — die Kapsel darf an keiner Innen-/Außenecke
  klemmen; unter Gegnerdruck gegenchecken.
- **`navgraph-begehbarkeit.test.ts`** auf den neuen Graphen: jede Kante
  beidseitig per echter `moveCapsule`, Ist-Zustand **und** „alles offen".
- Konkrete Spieltest-Beobachtungen des Nutzers hier eintragen, sobald da
  (Screenshot / Stelle).

## Golden-Anker

„Sektor-Nav-Graph" + „die Uhr" brechen erneut (neuer Sektor). **Bewusst neu
baselinieren** mit Begründung direkt am Test + Gegenprobe wie AP6-01
(Determinismus-Doppellauf + voller Headless-Einsatz Seed 1 bis „gewonnen",
0 Despawns). Die Sim-**Regeln** ändern sich nicht. Inline-Testlevel-Anker
(eigene `LevelData`) bleibt unberührt.

## Akzeptanzkriterien (Entwurf)

- `npm run dev`: man bewegt sich nachts durch ein **erkennbares Grabensystem** —
  gezähnter Feuergraben mit Traversen, Zickzack-Verbindungsgräben nach hinten,
  begehbare Unterstände, Stütz-/Reservegraben statt leerem Feld. Screenshots
  im Bericht.
- Kein sichtbarer Jank: durchgehender Boden, keine klemmenden Ecken, kein
  Durchfallen. Begehbarkeits-Test grün (Ist + „alles offen").
- Headless-Einsatz bis „gewonnen" spielbar, 0 Despawns.
- Runback Feuergraben → Home-Line für Solo in überschaubarer Zeit trotz Zickzack
  (Zielwert im Ticket festzurren — grob ≤ 20 s ohne Feinddruck).
- Alle Checks grün.

## Offen — Design-Runde (vor Finalisierung zu klären)

1. **Wie stark gezähnt / wie labyrinthisch?** Voll-Zickzack überall (am
   authentischsten, am langsamsten zu durchqueren) · **gezähnt an Feuergraben +
   Home-Line, lockerer im Hinterland** (Vorschlag) · nur sanfte Dog-Legs
   (schnellste Navigation, am wenigsten „Graben").
2. **Unterstände** — echte Räume unter Flur mit Treppe hinab (mehr Modul-Arbeit)
   · vorerst einfache Halb-Unterstände, echte Dugouts später.
3. **Größe** — aktueller Footprint (x ±34, z −46…72) mit mehr Dichte · ~30 %
   größer für echtes „System"-Gefühl.
4. **Der Jank** — was genau sah kaputt aus? (Nutzer-Screenshot / Stelle.)

## Ausdrücklich NICHT

Art / Materialien / Texturen (KONZEPT §9.10, später) · Bresche→Durchbruch-
Mechanik (AP6-02b) · Spawn-Verlagerung (AP6-03) · „Instand setzen" (AP6-04,
hier nur die Marker-Punkte) · Roam-Verhalten (AP6-05) · prozeduraler Generator ·
Tag-Modus.
