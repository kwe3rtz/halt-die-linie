# AP6-01b — Sektor-Neubau: echtes Grabensystem (kein Box-Labyrinth)

**Status:** ENTWURF — Design-Runde durch (Layout-Beschlüsse + konkrete
Jank-Beobachtungen unten). Planer schreibt den Kickoff, sobald AP6-06 durch
ist. Wird nach AP6-06 gebaut, **vor** AP6-02b. Worker `/clear` davor (großer
Brocken).
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

Wächst deutlich (grob 80–100 Knoten bei +30 % Größe). Jede Feuernische = ein Knoten, jeder
Traversen-Durchgang = `engstelle`, jeder Verbindungsgraben = eine Knotenkette,
Stütz-/Reservegraben = Knoten. Die 3 `frontLinie.hintenKanten` werden die 3
Verbindungsgraben-Mündungen (starten `zu`, öffnen beim Linienfall — wie jetzt).
`frontLinie.brescheZugang` / `parapetBreschen` zeigen auf die benannten
Bresche-Nischen. Nav-Wissen bleibt in den Rollen-Feldern von `SektorMeta`
(AP6-02), nicht zurück in `index.ts`.

## Jank-Pass (der „kaputt"-Teil)

**Konkrete Spieltest-Beobachtungen (2026-09-08, 2 Screenshots, Einsatz nach
Home-Line-Fall verloren, Spieler fliegt danach frei umher):**

- **Schwebende / zusammenhanglose Geometrie.** Boxen und Balken hängen in der
  Luft, nichts darunter (Screenshot 1: Box oben links; Screenshot 2: Balken
  oben rechts frei in der Luft). Vermutlich Umland-Füllquader / Feindseiten-
  Silhouette / Ruinen aus schrägem Blickwinkel gegen den schwarzen Hintergrund
  — liest sich als kaputt. Im Neubau: keine freistehenden Quader ohne sichtbare
  Verankerung im begehbaren Bereich; Kulissen-Geometrie klar als Masse lesbar.
- **Man steht auf der Brustwehr.** Screenshot 1: Spieler bei x −7 / **y 0,55**
  / z −31 — das ist die Parapet-Oberkante (`PARAPET_OBERKANTE`). Die Brustwehr
  ist oben begehbar, man landet auf Wänden. Im Neubau: Parapet-Oberkanten nicht
  als Lauffläche (schmaler / abgeschrägt / höher), oder Kapsel-Steighöhe prüfen.
- **Trümmer-Box wirkt verglitcht.** Die Bresche-Trümmer (`render` Box
  2,6×1,3×1,7 an `parapetBreschen`) liest sich in der Greybox wie eine
  umgefallene / verdrehte Box. Dezenter / klarer als „Schutt".
- **Stufen-Rampe endet im Leeren.** Screenshot 2: Ost-Flankenrampe (x ≈ 31,
  z ≈ −28) — die 4 Stufen führen abwärts in einen schwarzen Bereich ohne
  erkennbaren Boden. Prüfen ob dort wirklich Boden fehlt (Home-Graben-Kante
  jenseits der Parapet-Enden) oder nur unbeleuchtet.
- **Licht-Extreme** (ausgebrannt neben pechschwarz) → **AP6-06** (Renderer),
  nicht hier. Aber im Neubau darauf achten, dass jede Zone eine Lichtquelle in
  Reichweite hat.

**Sicherheitsnetz-Checks:**

- **Durchgehender Boden** — keine Lücken/Kanten zwischen Bodenplatten. Sim-Test:
  Kapsel an jeder Zonengrenze über den Übergang laufen, kein Absacken, kein Stopp.
- **Grabenecken** (`grabenknick`) — die Kapsel darf an keiner Innen-/Außenecke
  klemmen; unter Gegnerdruck gegenchecken.
- **`navgraph-begehbarkeit.test.ts`** auf den neuen Graphen: jede Kante
  beidseitig per echter `moveCapsule`, Ist-Zustand **und** „alles offen".

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
  + 30 % Größe (Zielwert ~20–25 s ohne Feinddruck — im Ticket festzurren).
- Alle Checks grün.

## Design-Runde — Beschlüsse (2026-09-08, AskUserQuestion)

1. **Gezähnt vorn + hinten, Hinterland lockerer.** Feuergraben und Home-Line
   richtig gezähnt (Feuernischen ~8 m, Erd-Traversen dazwischen — Zickzack-
   Bewegung). Hinterland-Verbindungsgräben nur leicht dog-legged, damit der
   Runback zügig bleibt.
2. **Echte Unterstände** — Raum unter Flur, Treppe hinab, Kopffreiheit. Das
   `unterstand()`-Modul wird dafür neu gebaut. Falls die Kamera-/Kollisions-
   Marge einen vollen Raum nicht hergibt: als `// TODO(Rückfrage)` festhalten
   und den flachsten Verbau wählen, der noch klar „hinein" ist.
3. **~30 % größer.** Grob x ±44 (Breite ~88), z −60…92 (Tiefe ~152) — im
   Ticket-Feintuning festzurren. Nav-Graph wächst auf ~80–100 Knoten; der
   Begehbarkeits-Test wird entsprechend teurer (in Kauf genommen — er ist das
   Sicherheitsnetz). Runback trotz Zickzack + Größe für Solo machbar halten
   (Zielwert ~20–25 s ohne Feinddruck).

4. **Der Jank** — Nutzer-Screenshots ausgewertet, konkrete Punkte im Abschnitt
   „Jank-Pass" unten.

## Ausdrücklich NICHT

Art / Materialien / Texturen (KONZEPT §9.10, später) · Bresche→Durchbruch-
Mechanik (AP6-02b) · Spawn-Verlagerung (AP6-03) · „Instand setzen" (AP6-04,
hier nur die Marker-Punkte) · Roam-Verhalten (AP6-05) · prozeduraler Generator ·
Tag-Modus.
