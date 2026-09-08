# AP6-01b — Sektor-Neubau: echtes Grabensystem (kein Box-Labyrinth)

**Status:** WORKER FERTIG (2026-09-08) — Bericht unten, wartet auf Planer-Review.
Design-Runde durch (Layout-Beschlüsse + Jank-Beobachtungen unten). Gebaut nach
AP6-06, **vor** AP6-02b.
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

**Konkrete Spieltest-Beobachtungen (2026-09-08, 2 Screenshots vom Nutzer,
Einsatz nach Home-Line-Fall verloren, Spieler fliegt danach frei umher — die
Screenshots liegen nicht im Repo, die Positionen unten sind aus dem
Debug-Overlay abgelesen):**

- **Schwebende / zusammenhanglose Geometrie.** Boxen und Balken hängen in der
  Luft, nichts darunter (an einer Stelle eine Box hoch oben, an anderer ein
  freistehender Balken in der Luft). Vermutlich Umland-Füllquader /
  Feindseiten-Silhouette / Ruinen aus schrägem Blickwinkel gegen den dunklen
  Hintergrund — liest sich als kaputt. Im Neubau: keine freistehenden Quader
  ohne sichtbare Verankerung im begehbaren Bereich; Kulissen-Geometrie klar als
  Masse lesbar, nicht als einzelne schwebende Klötze.
- **Man steht auf der Brustwehr.** Spieler-Overlay zeigte x −7 / **y 0,55** /
  z −31 — das ist die Parapet-Oberkante (`PARAPET_OBERKANTE`). Die Brustwehr
  ist oben begehbar, man landet auf Wänden. Im Neubau: Parapet-Oberkanten nicht
  als Lauffläche (schmaler / abgeschrägt / höher), oder Kapsel-Steighöhe prüfen.
- **Trümmer-Box wirkt verglitcht.** Die Bresche-Trümmer (`src/render/index.ts`,
  Box 2,6×1,3×1,7 an `parapetBreschen`) liest sich in der Greybox wie eine
  umgefallene / verdrehte Box. Dezenter / klarer als „Schutt".
- **Stufen-Rampe endet im Leeren.** Ost-Flankenrampe (x ≈ 31, z ≈ −28) — die
  Stufen führen abwärts in einen dunklen Bereich ohne erkennbaren Boden. **Das
  ist AP6-06s Sohle-Loch** (Home-Grabensohle war x ±32, Rampe bis x ±33,5) —
  in AP6-06 gefixt (Sohle auf volle Breite), im Neubau von vornherein
  vermeiden: jede Rampe endet auf tragendem Boden.
- **Licht-Extreme** (ausgebrannt neben pechschwarz) → in **AP6-06** behoben
  (Renderer). Im Neubau nur darauf achten: jede Zone hat eine Lichtquelle
  (`meta.lichter`) in Reichweite.

**Sicherheitsnetz-Checks:**

- **Durchgehender Boden** — keine Lücken/Kanten zwischen Bodenplatten. Sim-Test:
  Kapsel an jeder Zonengrenze über den Übergang laufen, kein Absacken, kein Stopp.
- **Grabenecken** (`grabenknick`) — die Kapsel darf an keiner Innen-/Außenecke
  klemmen; unter Gegnerdruck gegenchecken.
- **`navgraph-begehbarkeit.test.ts`** auf den neuen Graphen: jede Kante
  beidseitig per echter `moveCapsule`, Ist-Zustand **und** „alles offen".
- **AP6-06-Funde, die hier landen:** (a) Gegner überschießen `home-ziel` am
  zentralen Laufgraben-Mund (x ±2 / Parapet-Gap x ±4) und klumpen — das neue
  Home-Layout so bauen, dass der Zielknoten sauber erreichbar ist ohne engen
  Flaschenhals dahinter (KI-seitig ggf. AP6-05). (b) Der Front-Graben hat
  dieselbe „Sohle x ±32 vs. Sektorbreite x ±34"-Lücke wie die Home-Sohle vor
  AP6-06 — im Neubau alle Grabensohlen bis an tragenden Boden führen.

## Golden-Anker

„Sektor-Nav-Graph" + „die Uhr" brechen erneut (neuer Sektor). **Bewusst neu
baselinieren** mit Begründung direkt am Test + Gegenprobe wie AP6-01
(Determinismus-Doppellauf + voller Headless-Einsatz Seed 1 bis „gewonnen",
0 Despawns). Die Sim-**Regeln** ändern sich nicht. Inline-Testlevel-Anker
(eigene `LevelData`) bleibt unberührt.

## Akzeptanzkriterien

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
   Feintuning festzurren. Nav-Graph wächst auf ~80–100 Knoten; der
   Begehbarkeits-Test wird entsprechend teurer (in Kauf genommen — er ist das
   Sicherheitsnetz). Runback trotz Zickzack + Größe für Solo machbar halten
   (Zielwert ~20–25 s ohne Feinddruck).
4. **Der Jank** — Nutzer-Screenshots ausgewertet, konkrete Punkte im Abschnitt
   „Jank-Pass" oben.

## Ausdrücklich NICHT

Art / Materialien / Texturen (KONZEPT §9.10, später) · Bresche→Durchbruch-
Mechanik (AP6-02b) · Spawn-Verlagerung (AP6-03) · „Instand setzen" (AP6-04,
hier nur die Marker-Punkte) · Roam-Verhalten (AP6-05) · prozeduraler Generator ·
Tag-Modus.

---

## Worker-Bericht (2026-09-08)

**Status: FERTIG.** `src/data/sektor.ts` neu gebaut, `src/data/module.ts` um
`traverse` / `sap` / `geschuetzstellung` erweitert + `unterstand()` neu, ein
Renderer-Feinschliff (Bresche-Trümmer). **Sim-Regeln unangetastet**, der
Inline-Testlevel-Anker in `sim.test.ts` unangetastet. EIN Commit, Message
beginnt „AP6-01b …".

### Was gebaut wurde

- **Gezähnter Feuergraben** (z 12…30): 5 Feuernischen (x −32/−16/0/16/32), 4
  Erd-Traversen dazwischen (`traverse()`, ragen bis z 20 in den Graben), ein
  durchgehender Laufgang dahinter (z 12…20). Bewegung zickt Nische↔Laufgang↔
  Nische. Parapet + 3-Stufen-Feuertritt an der Nordkante, 2 Sap-Lücken bei
  x ±16.
- **Niemandsland** (z 30…56): Trichterfeld, Beobachtungsturm-Ruine (Landmark),
  eine quer laufende **verfallene Alt-Frontlinie** (flache begehbare Rinne
  z ≈ 45…49, ~0,6 m — ohne Sprung hinein/heraus) mit gebrochener Brustwehr an
  den 3 Anmarsch-Bahnen, 2 **Sap-Köpfe** (`sap()`) durch die Parapet-Lücken.
- **Hinterland** (z −42…12): **kein offenes Feld** — 3 Verbindungsgräben längs
  (Mitte gerade = **Express-Laufgraben**, lichte Breite ±1,8, sonst
  durchgehende Wand bis auf 2 schmale Sally-Ports; West/Ost ±2,6), **Stützgraben**
  quer (z −1), **Reservegraben** quer (z −22), dazwischen 6 Geländeinseln mit
  2 Geschützstellungen (`geschuetzstellung()`) + Baracken-Ruinen als Deckung,
  2 offene Flanken-Felder außen, 2 Parados-Rampen Laufgang↔Insel.
- **Home-Line** (z −60…−42): gezähnt (3 Nischen x −24/0/24, 2 Traversen),
  **3 begehbare Unterstände** an der Rückwand (Munitionslager / Verbandsplatz /
  Feldkommandeur), 2 Flankenrampen (x ±38), offene Flanken.
- **Ein durchgehender Sohle-Auffangboden** unter dem ganzen Sektor (Oberkante
  `GRABEN_SOHLE`) — keine Lücke, durch die eine Kapsel aus der Welt fällt.
- **Größe:** x ±44 · z −60…92 (vorher ±34 · −46…72), ~+30 %.
- **Nav-Graph:** 72 Knoten (Feindseite 3 · Niemandsland 19 · Frontlinie 20 ·
  Hinterland 19 · Home-Line 11), 96 Kanten (4 `zu`), 14 `engstelle`. Bewusst am
  unteren Rand der Spanne „~80–100" geblieben — die Ticket-Komponentenrechnung
  (5 Nischen + Traversen-Durchgänge + 3 VG-Ketten + Quergräben + Home) trägt
  ~72, und **jede Kante schuldet dem Begehbarkeits-Test**; lieber knapp und
  jede Kante belegt als aufgebläht. Aufstocken jederzeit möglich, wenn AP6-03/05
  mehr Auflösung brauchen.

### Screenshots

`tickets/AP6-01b-screenshots/` (12 PNG, headless Playwright/Swiftshader, 1280×720,
Nacht — Struktur bis ~20 m lesbar, dunkler als auf echter GPU):

| Datei | Blick |
| --- | --- |
| 01-feuergraben-laufgang | Laufgang hinter den Nischen, Traversen-Zähne, Depot, FRONT-Schild |
| 02-feuergraben-nische-parapet | aus einer Nische nach Norden: Traverse mittig, Parapet, 3-Stufen-Feuertritt |
| 03-feuertritt-blick-ueber-parapet | auf dem Feuertritt stehend — Parapet auf Brusthöhe, drüber schießbar, **Krone keine Lauffläche** |
| 04-niemandsland-altfrontlinie | die begehbare Alt-Frontlinie-Rinne quer |
| 05-express-laufgraben-blick-home | der lange gerade Express-Laufgraben Richtung Home |
| 06-hinterland-stuetzgraben | Stützgraben quer, Kreuzung mit einem Verbindungsgraben |
| 07-hinterland-feld-blick-front | von einer Geländeinsel zurück zur Front |
| 08-hinterland-reservegraben | Reservegraben quer |
| 09-home-line-gezaehnt | Home-Graben, Feuertritt + Parapet-Lücke |
| 10-home-line-blick-hinterland | über die Home-Brustwehr ins Hinterland |
| 11-unterstand-innen | im Unterstand, Blick zur Graben-Öffnung (HOME-Schild, Depot) |
| 12-home-flanke-rampe | 10-Stufen-Flankenrampe, endet auf der Grabensohle |

### Begehbarkeits-Test

`navgraph-begehbarkeit.test.ts` **grün** (auf den neuen Graphen umgestellt):
- Ist-Zustand: jede offene Kante beidseitig per echter `moveCapsule` begehbar.
- „alles offen" (jede Bresche auf, jede Linie gefallen): jede Kante begehbar.
- Gegenprobe: mit stehendem Parapet ist die Bresche-Kante NICHT begehbar (H1).
- jede Bresche hat ihr umschließendes getaggtes Parapet-Segment.
- Home-Flankenrampen (AP6-06): keine Kapsel fällt an der Kante durch (x ±38,
  Spur ±35…±41, Sohle-Auffangboden trägt).

Zusätzlich per Wegwerf-Skript geprüft: alle **3 Unterstände** begehbar rein
**und** raus (Kapsel läuft aus dem Home-Graben hinein bis an die Rückwand und
wieder heraus).

### Headless-Einsatz (idealisierter Schütze, `waves: true`)

| Seed | Ergebnis | Wellen | maxLebend | **Despawns** | Dauer |
| --- | --- | --- | --- | --- | --- |
| 1 | gewonnen | 5·8·11·14·17 | 16 | **0** | 428 s |
| 2 | gewonnen | 5·8·11·14·17 | 16 | **0** | 434 s |
| 7 | gewonnen | 5·8·11·14·17 | 17 | **0** | 464 s |

67 Gegner/Einsatz, alle laufen durch den gezähnten Graben + das Verbindungs-
graben-Netz bis an die Front, **kein Watchdog-Despawn**. (`wave-eskalation.test.ts`
deckt Seed 1 als Test ab.)

### Runback Feuergraben → Home-Line (Solo, ohne Feinddruck)

Seed-1-Spawn (−16, 16) → `home-ziel` (0, −46) über den Express-Laufgraben:
**Gehen 17,1 s · Sprint 11,1 s** — im Zielband „~20–25 s" trotz Zickzack + 30 %
Größe.

### Jank-Pass — Punkt für Punkt

| Beobachtung (Spieltest 2026-09-08) | Repro / Ursache | Fix im Neubau |
| --- | --- | --- |
| **Man steht auf der Brustwehr** (Overlay y 0,55 = `PARAPET_OBERKANTE`) | 0,55 lag nur 0,05 m über der Feldfläche = `STEP_HEIGHT` 0,5 → Kapsel stieg mühelos hinauf | `PARAPET_OBERKANTE` 0,55 → **0,62** (> `STEP_HEIGHT` über jeder angrenzenden Lauffläche: Feld 0, Feuertritt −0,85). Deckung steht mit Abstand zu den Parapets und ≤ 1,1 m — kein Aufstieg über einen Deckungsklotz. Screenshot 03 zeigt: auf dem Feuertritt stehend liegt das Auge (−0,85 + 1,6 = 0,75) knapp über der Krone, drüber schießbar; die Krone selbst ist nicht begehbar. Golden-Anker „die Uhr" unverändert (−2/−1). |
| **Schwebende / zusammenhanglose Geometrie** | Umland-/Silhouetten-Quader aus schrägem Blick gegen den dunklen Hintergrund | Feindseiten-Silhouette als **eine zusammenhängende Masse am Boden** (Berm + Kronenband + geerdete Hügel, kein einzelner schwebender Klotz). Alle Deckung sitzt auf dem Boden (`deckung()` von y −0,3 aufwärts, nicht von der Grabensohle). Nacht-Lichter sitzen auf Sohle (y −0,9) bzw. Feld (y 0,4/0,5) — keine schwebenden Glut-Klötze; per Skript: alle 12 Lichter kollisionsfrei (2 lagen im ersten Entwurf in einem Kollider → verschoben). |
| **Trümmer-Box wirkt verglitcht** (`render/index.ts` 2,6×1,3×1,7) | 1,3 m hoher Quader in der Bresche liest sich als umgefallene Box | jetzt **2,4×0,55×1,3, tief in der Lücke** (`pos.y − 0,55`) — flacher Schutthaufen. |
| **Stufen-Rampe endet im Leeren** (Ost-Flanke x ≈ 31) — AP6-06s Sohle-Loch | Grabensohle war x ±32, Rampe bis x ±33,5 | Neubau: **ein durchgehender Sohle-Auffangboden** unter dem ganzen Sektor. Jede Rampe (Parados x ±11, Home-Flanke x ±38) endet auf tragendem Boden; Screenshot 12 + der AP6-06-Rampentest belegen es. |
| **Licht-Extreme** (in AP6-06 renderer-seitig behoben) | — | Neubau: 12 `meta.lichter`, **jede Zone ≥ 1 in Reichweite** (Skript-Check: Frontlinie/Hinterland/Home-Line überall ≤ ~17 m; Niemandsland/Feindseite-Spawns bewusst dunkler = Nacht-Überquerung). West-Feuernische + beide äußeren Verbindungsgräben haben eigene Lichter bekommen. |
| **Durchgehender Boden an Zonengrenzen** | — | Sohle-Auffangboden + Feld-Platten über die volle Sektorbreite; `sektor.test.ts` „Kapsel läuft über jede Zonengrenze" grün. |
| **`home-ziel` erreichbar ohne engen Riegel dahinter** (AP6-06-Fund a) | Gegner überschossen das alte Ziel am schmalen Laufgraben-Mund und verklumpten | `home-ziel` (0, −46) liegt frei im Home-Graben; dahinter die **breite Rückwand-Lücke** (4,6 m) zum mittleren Unterstand statt eines Flaschenhalses. `homeLinie.bounds` auf z −53…−42 verengt — die Unterstände dahinter zählen nicht als „Linie". |
| **Grabensohle vs. Sektorbreite** (AP6-06-Fund b) | Front-Graben hatte dieselbe „Sohle schmaler als Sektor"-Lücke | derselbe durchgehende Auffangboden; alle Grabenwände laufen bis an die Kartengrenze bzw. auf tragenden Boden. |

### Golden-Anker — Neubaseline (bewusst, begründet)

Beide positionsabhängigen Anker in `sim.test.ts` brechen durch den neuen Sektor
(anderer Spielerpfad, andere Feind-Spawnpunkte). **Neu baseliniert mit
Begründung direkt am `expect()`** (Zeilen 463–470 bzw. 519–523):

- **„trifft den Nav-Golden-Anker":** `pos.x` 13,35 · `pos.z` 12,1298 ·
  `angriffskraftRest` 145 (= 150 − 5 Spawns) · 5 Gegner, alle `abschnitt`
  „front", `zielKnoten` „front-front", `zustand` „anmarsch", Klassenmix
  `[schwer, schnell, normal, schwer, normal]` **unverändert** (Director-Rng).
- **„trifft den Uhr-Golden-Anker":** Gegner-Setup-Position auf (−16, 19)
  angepasst (Seed-1-Spawn liegt jetzt in der West-Nische). **Anker-Werte
  `ak 148` (stehende Front, −2) / `ak 149` (gefallene Front, −1) UNVERÄNDERT** —
  die Uhr-Regel ist bitgleich.

**Gegenprobe (wie AP6-01):**
- Determinismus-Doppellauf: `replay()` `toEqual` `replay()` grün; „die Uhr ist
  deterministisch" grün (beide per Wegwerf-Skript zusätzlich bestätigt:
  `JSON.stringify` identisch).
- Voller Headless-Einsatz Seed 1 → **gewonnen, 0 Despawns** (s. o.).
- Uhr-Kill-Probe: stehende Front `ak 148`, gefallene Front `ak 149` — exakt die
  Anker.

`collision-verbindungsgraben.test.ts` (AP5-01-Teleport-Gegenprobe) auf den
**südlichen ~24 m langen lückenlosen Abschnitt** des Express-Laufgrabens
umgezielt (Reservegraben-Port → Home-Graben; die Sally-Ports sind neu) — länger
als die 16,5 m des alten Bugs, reproduziert ihn also weiterhin.

### TODO(Rückfrage) im Code

- **`unterstand()` — „Raum unter Flur, Treppe hinab" nicht wörtlich umgesetzt.**
  Im Box-Kollisionsmodell steht der Spieler (1,8 m) auf der Grabensohle (−1,8),
  der Kopf also bei y = 0 = Geländeoberkante — ein Raum *unter* der Fläche mit
  Kopffreiheit bräuchte einen abgesenkten Boden, und die EINE durchgehende
  Sohle-Auffangplatte (Jank-Pass „kein Loch") dafür zu durchbrechen ist
  riskanter als der Nutzen. Gebaut ist der vom Ticket erlaubte **„flachste
  hinein-Verbau"**: ein niedriger gedeckter Raum am Grabenniveau, Erddecke
  Unterkante y ≈ +0,2 (~0,2 m über dem Scheitel), begehbar rein/raus, offen zum
  Graben. Wenn ein echter abgesenkter Raum gewünscht ist: eigenes Ticket, dann
  mit lokaler Sohle-Aussparung + Absturz-Test.

### Checks

| Check | Status |
| --- | --- |
| `npm run typecheck` | grün |
| `npm run lint` | grün |
| `npm run format:check` | grün |
| `npm test` | **303 / 303 grün** (26 Dateien) |
| `npm run test:coverage` | grün (98,43 % Stmts / 97,01 % Branch) |
| `npm run build` | grün (~6,92 MiB roh, unverändertes Babylon-Budget) |

CI-Status → separat an ki-game-f1 nach dem Push.
