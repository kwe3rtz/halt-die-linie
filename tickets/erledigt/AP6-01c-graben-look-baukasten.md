# AP6-01c — Graben-Look: Baukasten, Materialsystem & Probe-Ecke

**Status:** ✅ erledigt (`41635d9`, reviewed 2026-09-09). Code-Review grün — die
**visuelle Abnahme** macht der Nutzer im `?probe`-Spieltest; sein Urteil formt
die AP6-01d-Zielvorlage. **Vor** AP6-01d, AP6-02b, AP6-05.
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**`/clear` vor dem Start:** ja (neuer Baukasten, Renderer-Änderung, viel Fläche).

**Referenz:** Grill-Runde 2026-09-09 (Design-Baum Map + Projektrichtung — die
5 Runden in `SPARRING-ANTWORTEN.md` / dieser Datei unten zusammengefasst).
`KONZEPT.md` §3 (neuer Unterabschnitt „Der Graben-Look"), §9.10 (Art — teils
vorgezogen). `src/data/module.ts`, `src/render/index.ts`, `src/data/sektor.ts`
(im Ist gelassen — AP6-01d baut ihn um), `src/sim/collision.ts` (nur
Typ-Durchreiche), `tickets/erledigt/AP6-01b-sektor-neubau-grabensystem.md`.

---

## Warum

Der Sektor ist nach AP6-01/01b **funktional** ein Grabensystem (Zonen, Nav,
gezähnte Linien, durchgehender Boden), liest sich im Spieltest aber weiter als
„Rechtecke mit dünnen Wänden dazwischen" (Nutzer, 4. Spieltest + Grill-Runde
wörtlich: *„es ist einfach jz nur vierecke mit irgendwelchen wänden dazwischen"*).
Ein Graben liest sich über **drei Dinge**, die alle drei fehlen:

1. **Tiefe** — man steht *unten drin*, die Wände überragen einen.
2. **Material** — verkleidete Wände: Holzrippen, Sandsackreihen, Wellblech,
   Laufrost. Nicht eine glatte Farbfläche pro Zone.
3. **Enge** — schmaler, gewundener Lauf, nicht ein 3-m-Korridor.

Dieses Ticket baut den **Baukasten dafür** (Geometrie-Tiefe + Verkleidungs-
Formdetail + Materialfeld + echter Abstiegs-Unterstand + Laufrost) und **eine
voll detaillierte Probe-Ecke** als isolierte Dev-Szene. **Der echte Sektor
(`sektor.ts`) wird nicht angefasst** — kein Golden-Anker-Risiko, kein Seam-
Problem. Nach dem Nutzer-Spieltest der Probe-Ecke rollt **AP6-01d** den Look
auf den ganzen Sektor + den geschrumpften Grundriss aus.

**Prozess (vom Nutzer gewählt, Grill Q6):** Planer-Zielvorlage (diese Datei) →
Nutzer nickt ab → **Worker baut die Probe-Ecke** → Nutzer beurteilt *die* →
dann ganzer Sektor (AP6-01d). Wir kommen so vor dem großen Bau auf dieselbe
Seite — zwei fehlgeschlagene Map-Neubauten (AP6-01, AP6-01b) haben das nötig
gemacht.

---

## ZIELVORLAGE — verbindlich für AP6-01c **und** AP6-01d

### 1. Querschnitt Feuergraben (Welt-Y in Metern)

```
                       NIEMANDSLAND  (Feindseite)
                              │
   Sandsack-Krone  ▁▁▁▁▁  +0.70   ← PARAPET_OBERKANTE (neu; war 0,62)
     (sandsack)   ┌█████┐         Reihe kleiner Säcke, hellster Ton = Horizont/Orientierung
   Brustwehr      │█████│
   (erde, dick)   │█████│  0.00   ← OBERFLAECHE (Feld, beide Seiten)
  ───────────────┤│█████├──────────────────────────
   Feuertritt     │█████│▁▁▁▁▁  −0.90  ← FEUERTRITT_OBERKANTE (Bank, holz)
   4 flache       │█████│   ▟▛        Stufen je ~0,45 m  (< STEP_HEIGHT 0,5)
   Stufen         │█████│  ▟▛
                  │█████│ ▟▛    −1.80
   verkleidete    │█████│▟▛
   Grabenwand     │█████│              lichte Weite Sohle  ≈ 2,0 m  (Nische/Laufgang)
   (holz: Pfosten │█████│              ≈ 1,8 m  (Express-Laufgraben Mitte)
    alle ~1,2 m + ║█████║
    4 waagerechte ║█████║
    Bohlen-Kurse) ╚═════╩══════════════════════  −2.70  ← GRABEN_SOHLE (neu; war −1,8)
                  Laufrost (laufrost) über dem durchgehenden Sohle-Auffangboden

   Parados (Rückwand, Hinterland-Seite): Krone ~+0.30, 1–2 flache Stufen —
   unter Druck rausklettern; sonst über die Verbindungsgraben-Mündungen.
```

**Kern-Relationen (die Akzeptanzkriterien prüfen genau die):**

| Situation | Auge (Fuß + `PLAYER_EYE` 1,6) | vs. Parapet-Krone +0,70 | Ergebnis |
|---|---|---|---|
| auf der Grabensohle (−2,70) | −1,10 | 1,80 m darunter | **komplett eingeschlossen**, sieht nichts raus |
| auf dem Feuertritt (−0,90) | +0,70 | auf Kronenhöhe | **schießt über die Kimme**, Kopf gedeckt |
| Gegner auf dem Feuertritt | — | Krone 1,60 m über den Füßen | kann **nicht** übers Parapet (kommt durch Breschen) |
| vom Feld (0,00) aufs Parapet | — | Krone +0,70 > `STEP_HEIGHT` 0,5 | **nicht begehbar** (AP6-01b-Eigenschaft bleibt) |

- **Tiefe** GRABEN_SOHLE = **−2,7** (Wand Sohle→Krone = 3,4 m). Worker darf
  im Probe-Bau **−2,4 … −2,8** feinjustieren, wenn die Feuertritt-/Kamera-Marge
  es verlangt — das Ergebnis im Bericht festhalten, dann ist *dieser* Wert für
  AP6-01d fix.
- **Feuertritt** = 4 flache Stufen von der Sohle zur Bank bei −0,90. Jede Stufe
  < `STEP_HEIGHT`. Auge auf der Bank ≈ Kronenhöhe (±0,1 m).
- **Parapet-Krone** +0,70 (von 0,62 angehoben — mehr Marge über `STEP_HEIGHT`,
  Platz für den Sandsack-Kurs). Golden-Anker in `sim.test.ts` NICHT betroffen
  (Probe-Szene ist isoliert) — aber die Konstante ändert sich; AP6-01d trägt
  die Anker-Rebaseline.
- **Lichte Weite** an der Sohle: Nische + Laufgang ~2,0 m (von ~3,2 Modul-
  Default herunter), Express-Laufgraben Mitte ~1,8 m, Seiten-Verbindungsgräben
  ~2,2 m. Zwei Kapseln (Ø 0,7) kommen aneinander vorbei — knapp, „eng".

### 2. Verkleidung — Formdetail (Geometrie, keine Textur)

Jedes Grabenwand-Segment (Länge L, Höhe H = Sohle→Krone) bekommt **zusätzlich
zur Basiswand**:

| Element | Material | Maß / Muster |
|---|---|---|
| **Stützpfosten** | `holz` | 0,15 × H × 0,15, alle ~1,2 m entlang L, an der Grabenseite der Wandfläche (ragt 0,12 m vor) |
| **Bohlen-Kurse** | `holz` (Ton minimal heller als Pfosten) | 4 waagerechte Leisten, 0,20 hoch × 0,06 vorstehend × L, bei y ≈ −2,3 / −1,6 / −0,9 / −0,2; brechen an jeder Bresche-Lücke (gleiches Tag) |
| **Sandsack-Krone** | `sandsack` | Reihe Klötze 0,50 × 0,35 × 0,45 entlang der Krone, Oberkante = PARAPET_OBERKANTE bzw. Parados-Krone |
| **Feuertritt-Riser** | `holz` | die 4 Stufenflanken |
| **Laufrost** | `laufrost` | Deckplatte über der Grabensohle (Oberkante −2,66), optional Querstege alle 0,5 m (0,04 vorstehend) |

Umsetzung: ein Helfer `verkleidung(segment) → LevelBox[]`, aufgerufen von
`grabengerade` / `parapet` / den Nischen-Komposita. Kein Neubau der
Basismodule von Grund auf.

**Box-Zahl steigt stark** (ein 12-m-Wandsegment: ~3 → ~40 Boxen). In der
Probe-Ecke ist das egal. **Für AP6-01d im Bericht messen** (Draw-Calls /
Frame-Zeit headless) und ggf. Merge-je-Material vorbereiten — hier nur ein
Merkposten.

### 3. Materialien — neues Feld `oberflaeche` auf `LevelBox`

```ts
// src/sim/collision.ts (Typ) — reine Durchreiche, keine Sim-Logik
export type Oberflaeche =
  | "erde"      // Default: fällt auf den Zonen-Ton zurück (heutiges Verhalten)
  | "holz"      // Verkleidungs-Pfosten/Bohlen, Feuertritt, Unterstand-Rahmen
  | "sandsack"  // Parapet-/Parados-Kronenkurs
  | "wellblech" // Unterstand-Auskleidung, kühles Grau, feine Rippe
  | "laufrost"  // Grabenboden
  | "beton";    // nur Home-Line (schwerer Verbau) — kommt erst in AP6-01d zum Einsatz

interface LevelBox { /* … */ oberflaeche?: Oberflaeche; }
```

`src/render/index.ts`: eine `Map<Oberflaeche, StandardMaterial>`, flache
`Color3`, `specularColor` 0. Ist `box.oberflaeche` gesetzt → dieses Material,
sonst **exakt das heutige Verhalten** (Zonen-Ton / `grenzeMat` / `umlandMat`).
Keine Texturen, keine Normal-Maps, kein PBR. Nacht-Palette, entsättigt, nichts
nahe Schwarz, `sandsack` der hellste Ton (Orientierung):

| Material | `Color3` (Startwerte, im Spieltest justierbar) |
|---|---|
| `erde` | Zonen-Ton (unverändert) |
| `holz` | `(0.30, 0.23, 0.15)` |
| `sandsack` | `(0.46, 0.44, 0.34)` |
| `wellblech` | `(0.27, 0.29, 0.31)` |
| `laufrost` | `(0.22, 0.19, 0.14)` |
| `beton` | `(0.32, 0.33, 0.35)` |

### 4. Echter Abstiegs-Unterstand (`unterstand()` neu)

Der AP6-01b-Fallback (flacher gedeckter Raum auf Grabenniveau) wird **ersetzt**
durch den in der Design-Runde gewählten echten Abstieg (Grill Q9 = c):

```
   Grabensohle −2,70 ═══════╗              ╔═══  (Laufrost)
                            ║   Treppe     ║
                            ╚══╗  hinab    ║      6 Stufen je ~0,33 m
   Raumdecke −2,90  ┌──────────╨───────────┐      (Unterkante Deckenplatte)
                    │          ▼           │
                    │     Unterstand       │      lichte Höhe 2,0 m
                    │   Boden −4,90        │      (Auge −3,30 → Decke −2,90)
   Raumboden −4,90  └──────────────────────┘
   Bodenplatte −5,40 (0,5 dick) — dichtet die Aussparung im Auffangboden ab
```

- **Treppenschacht** in der Grabensohle: ~1,6 (X) × 2,4 (Z), 6 Stufen −2,70 →
  −4,70, jede < `STEP_HEIGHT`. Oben offen zum Graben (kein niedriger Sturz).
- **Raum** ~3,5 × 3,5 m licht, Boden −4,90, Deckenplatte Unterkante −2,90 →
  Kopffreiheit 2,0 m.
- **Vollständig geschlossene Kiste:** eigener Bodenplatte + 4 Wände + Decke +
  Treppe. Der **durchgehende Sohle-Auffangboden bekommt exakt unter dem Raum
  ein Loch**, das die Raum-Bodenplatte (Oberkante −4,90) abdichtet. Es gibt
  **keinen Spalt**, durch den eine Kapsel die Welt verlässt — der Raum ist eine
  zu, die Treppe der einzige Weg rein, und der ist bewandet.
- **Nicht im Nav-Graph.** Unterstände sind Spieler-Schutzraum, **nie eine
  Feind-Route** (wie die Geländeinseln). Gegner laufen nie hinein → das fehlende
  `FALL_LIMIT` für Gegner (AP7) ist hier irrelevant.
- Material: `wellblech` Wände + `holz` Rahmen + `laufrost` Boden. Ein Licht rein
  (`meta.lichter` in AP6-01d; in der Probe hart platziert).
- **Falls die Kamera-/Kollisions-Marge einen 2,0-m-Raum nachweislich nicht
  hergibt** (Kopf klemmt an der Decke, Kamera clippt beim Abstieg): als
  `// TODO(Rückfrage)` festhalten **mit dem gemessenen Grund**, den flachstmög-
  lichen echten Abstieg bauen (Raum tiefer/Decke höher iterieren), **nicht**
  auf den flachen Fallback zurückfallen. Der Nutzer hat den Abstieg zweimal
  bestätigt.

### 5. Grundriss-Kontext (für AP6-01d — hier nur Kontext)

Der ganze Sektor wird in **AP6-01d** hierauf umgebaut:

```
   z                          FEINDSEITE  (Kulisse, unverändert)
   ↑        z 56 ┌─────────────────────────────────────────────┐
   │             │        NIEMANDSLAND   (~30 m Nacht-Querung)  │
   │        z 26 ├──── Trichter · Draht · Alt-Frontlinie quer ──┤
   │             │  ┌──╥────╥────╥────╥──┐  FEUERGRABEN (Front)  │   4 Feuernischen
   │        z 14 │  │N1║ T1 ║ N2 ║ T2 ║N3│  gezähnt, schlank    │   + Laufgang dahinter
   │             │  └──╨────╨────╨────╨──┘  Depot · 2 Breschen   │   „Panzerwrack" / „Pumpenstand"
   │             │   Parados ──┬────┬────┬──  (3 VG-Mündungen)   │
   │             │   VG-West   VG-Mitte   VG-Ost                 │   3 Verbindungsgräben
   │             │   (dog-leg) (Express)  (dog-leg)              │   gewunden, Anzahl = Parameter
   │             │      Geländeinseln · Geschützstellungen       │   (fest 3), kein Stützgraben
   │       z −34 │  ┌──╥────╥────╥──┐  HOME-LINE  (der Bunker)   │   3 Nischen, beton-Verbau
   │             │  │H1║ HT ║ H2 ║ H3│  Feuertritt · Depot      │   tiefer + schwerer
   │       z −48 │  └──┴──┬──┴──┬──┴──┴──┐ 3 Abstiegs-Unterstände│   Munitionslager /
   │             │   Munlager Verbandspl. Feldkdr.-Bunker        │   Verbandsplatz /
   └──────────── x        (Finale-Fixpunkt)                      │   Feldkommandeur
       Footprint AP6-01d:  x ±32  ·  z −48 … 72   (Tiefe ~120, Breite ~64)
       (heute x ±44 · z −60 … 92 — ~27 % kleiner, „schlanke Front")
```

---

## Auftrag AP6-01c — nur das

1. **`src/data/module.ts`**
   - `GRABEN_SOHLE` **noch nicht global ändern** — AP6-01d macht den globalen
     Schnitt (Golden-Anker). Hier: die Probe-Module rechnen mit einem lokalen
     `SOHLE_TIEF = -2.7` (Konstante, klar kommentiert „AP6-01d macht das global").
   - `PARAPET_OBERKANTE` **noch nicht global ändern** — analog, lokaler Wert in
     den Probe-Modulen bzw. Parameter.
   - `verkleidung(...)`-Helfer (Pfosten + Bohlen-Kurse + Sandsack-Krone +
     Laufrost) nach der Zielvorlage §2.
   - Feuertritt 3 → 4 Stufen zur tiefen Sohle.
   - `unterstand()` neu = echter Abstieg (Zielvorlage §4).
   - `Oberflaeche`-Tag auf den erzeugten Boxen (durchgereicht wie `tag`).
2. **`src/sim/collision.ts`** — `Oberflaeche`-Typ + optionales `oberflaeche`-Feld
   auf `LevelBox`. **Keine Sim-Logik**, reine Durchreiche. Goldene Regel bleibt.
3. **`src/render/index.ts`** — Material-Map nach Zielvorlage §3. Ungesetzt =
   heutiges Verhalten (kein sichtbarer Unterschied am echten Sektor).
4. **`src/data/probe-graben.ts`** (neu) — eine isolierte `LevelData`:
   1 Feuernische (tief, verkleidet, 4-Stufen-Feuertritt, Parapet mit Sandsack-
   Krone, Laufrost) + 1 Erd-Traverse + ~6 m Verbindungsgraben-Stumpf + **1
   Abstiegs-Unterstand**. Voll im neuen Look. Kein Nav / keine Zonen nötig
   (oder ein Minimal-Meta, falls der Renderer eins braucht).
5. **`src/main.ts`** — lädt `probe-graben` statt des Sektors, wenn die URL
   `?probe` enthält (nur Dev). Kleiner, geguardeter Zweig. Spieler-Spawn im
   Laufgang der Probe-Nische.
6. **Screenshots** (headless Playwright, `?probe`) in den Bericht:
   Nische von unten (Wände überragen), auf dem Feuertritt (über die Kimme),
   Laufrost + Verkleidung nah, Abstieg in den Unterstand, im Unterstand
   (Kopffreiheit).

## Akzeptanzkriterien

- `npm run dev` **ohne** `?probe`: der echte Sektor sieht **exakt aus wie
  vorher** (Material-Feld nirgends gesetzt) — Gegenprobe im Bericht.
- `npm run dev?probe`: man steht in einem **tiefen, verkleideten Graben** —
  Wände überragen einen (auf der Sohle sieht man nicht raus), Feuertritt hoch,
  auf dem Feuertritt über die Kimme schießbar, Sandsack-Krone als heller
  Horizont, Laufrost unter den Füßen, Holz-Pfosten + Bohlen an den Wänden.
- **Abstiegs-Unterstand:** Treppe hinab begehbar, Raum mit Kopffreiheit (Auge
  clippt nicht in die Decke), zurück hinauf begehbar. Sim-Test: Kapsel die
  Treppe runter → landet auf dem Raumboden → wieder hoch. Keine Kapsel fällt
  durch den Auffangboden-Ausschnitt (Test wie AP6-06-Rampentest).
- Feuertritt: jede Stufe < `STEP_HEIGHT`; Auge auf der Bank innerhalb ±0,15 m
  der Kronenhöhe (im Bericht die Zahlen).
- Parapet-Krone von jeder angrenzenden Lauffläche > `STEP_HEIGHT` (nicht
  begehbar) — Gegenprobe wie AP6-01b.
- **Golden-Anker `sim.test.ts` unverändert** (Probe-Szene ist isoliert, echter
  Sektor unberührt). Falls doch ein Anker bricht: **stopp, beim Planer melden**
  — dann ist etwas am echten Sektor angefasst worden, was nicht sein soll.
- `navgraph-begehbarkeit.test.ts` unverändert grün (echter Sektor).
- Alle Checks grün (`typecheck` / `lint` / `format:check` / `test:coverage` /
  `build`).
- **Perf-Notiz** im Bericht: Draw-Calls / Frame-Zeit der Probe-Szene headless,
  als Anker für die AP6-01d-Entscheidung „Merge je Material nötig?".

## Ausdrücklich NICHT in AP6-01c

- **Der echte Sektor** (`sektor.ts`) — Geometrie, Grundriss, Footprint, Nav:
  alles AP6-01d.
- Globale `GRABEN_SOHLE` / `PARAPET_OBERKANTE`-Änderung + Golden-Rebaseline —
  AP6-01d.
- Echte Texturen / Normal-Maps / PBR (`KONZEPT.md` §9.10, späterer Schritt).
- MG-Stände, Front-Wandkammern (Backlog).
- Bresche→Durchbruch (AP6-02b) · Spawn-Verlagerung (AP6-03) · „Instand setzen"
  (AP6-04) · Roam (AP6-05) · Gegner-KI (eigene Design-Runde nach AP6-01d).

---

## Grill-Runde 2026-09-09 — die Beschlüsse (Kontext für frische Sessions)

Nach dem 4. Spieltest + zwei fehlgeschlagenen Map-Neubauten (AP6-01, AP6-01b)
eine strukturierte Design-Baum-Runde (`grilling`-Skill, 5 Runden). Nutzer-
Referenzbilder: ein WW1-Grabenfoto (tief, Holzverbau, Sandsäcke, Feuertritt,
Laufrost, gewunden) + eine historische deutsche Schnitt-Karte (Zickzack-Front,
schlängelnde Verbindungsgräben, mehrere Linien, Trichter, Draht, MG-Stellungen,
Unterstände, Minenkammer). Der volle Beschluss-Satz:

1. **Problem-Ursache:** Greybox = „Rechtecke mit dünnen Wänden" — fehlt Tiefe,
   Material, Enge.
2. **Vision:** 2 Hauptgräben (Frontline breiter/ausgebauter · Home-Line = Bunker
   mit unterirdischen Räumen) + wenige kleine Verbindungsgräben = Grabennetz.
   **Kein Stützgraben.** Footprint kleiner (~x ±32 / z ~120).
3. **Must-have-Elemente zuerst (Q4):** Tiefe 2,5–3 m, verkleidete Wände
   (Holz/Sandsack), eng + gewunden. Laufrost / Feuertritt / Unterstand-Münder
   danach.
4. **Material-Pass (Q8 = b):** flache Materialfarben + Formdetail (Bohlen-Rippen
   als dünne Leisten, Sandsackreihen als Klötze, Stützpfosten). Keine Texturen.
   Echte Texturen = späterer Schritt.
5. **Unterirdische Räume (Q9 = c):** Home-Line = echte Abstiegs-Unterstände
   (Treppe hinab, Raum unter Grabensohle → lokale Aussparung im Auffangboden +
   Absturz-Handling). Front-Line = Wandkammern auf Grabenniveau → **Backlog**
   (Q13: Front schlank).
6. **Abstimm-Methode (Q6 = a):** Planer-Zielvorlage → Nutzer ok → Worker
   Probe-Ecke → Nutzer ok → ganzer Sektor.
7. **Reihenfolge (Q7 = a):** Graben-Look zuerst (AP6-01c/d), dann Gegner-KI,
   dann AP6-02b ff.
8. **Gegner-KI (Q14 = a):** eigene Design-Runde direkt nach AP6-01d, mit
   `SPARRING-ANTWORTEN.md` Runde 3 (wenige persistente Roam-Gruppen, 4 Zustände,
   gemeinsames Intensitäts-Budget mit dem Wave-Director).
9. **Bau-Strategie (Q2 = b):** Breite weiterbauen / dem Plan vertrauen. Nutzer
   weiß: das 5-Minuten-Gefühl bleibt flach bis ~AP6-05, bewusst so gewählt.
10. **Umfang (Q11 = a):** AP6-01c/d ist ein eigener Brocken mit echtem
    „sieht/fühlt sich an wie ein Graben"-Budget (Geometrie + Formdetail-
    Material), zieht `KONZEPT.md` §9.10 „Art" teilweise vor.
11. **Variable Verbindungsgraben-Anzahl (Q12 = d):** Datenmodell jetzt
    parametrisieren (Anzahl als Variable, fest 3 in AP6-01d), der echte Schalter
    (Variante 1 Seed-abgeleitet / Variante 2 Schwierigkeit-abgeleitet) →
    `BACKLOG.md`, Entscheid am Generator/Schwierigkeits-System.
12. **Front-/Home-Inhalte (Q13 = a + b):** grob wie skizziert, aber Front
    schlank — Feuertritt + Brustwehr, 2 Bresche-Punkte, Depot, Parados mit 3
    VG-Mündungen; **keine** MG-Stände / Wandkammern jetzt (Backlog). Home-Line
    wie skizziert: Feuertritt + Brustwehr, 2–3 echte Abstiegs-Bunker
    (Munitionslager / Verbandsplatz / Feldkommandeur), Depot.

---

## Bericht — AP6-01c

COMMIT: 41635d9 (Branch arbeitspaket-6)
CI: <steht nach dem Push> / Pages <steht nach dem Push>
TODO(Rückfrage): keine im Code. Zwei Entscheidungen unten (Punkt 1 + 2) an den Planer.

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**
Tests: 314 (+11 neu in `src/data/probe-graben.test.ts`) · Coverage src/sim: 98,43 % Stmts / 97,02 % Branch (unverändert — `src/data/**` liegt außerhalb der Schwelle) · Bundle: 6 921,08 kB roh / 1 537,18 kB gzip (Δ ~0 — `probe-graben.ts` ist eine kleine Datendatei)

### Umsetzung — was gebaut wurde

**Alles additiv. Der echte Sektor (`sektor.ts`) ist nicht angefasst, die
Golden-Anker in `sim.test.ts` sind bit-identisch grün, `parapet()` /
`unterstand()` / `traverse()` / die globalen Kennwerte unverändert.**

1. **`src/sim/collision.ts`** — `Oberflaeche`-Typ
   (`erde|holz|sandsack|wellblech|laufrost|beton`) + optionales
   `LevelBox.oberflaeche`. Reine Durchreiche, keine Sim-Logik; `createCollisionWorld`
   unberührt, goldene Regel gewahrt. Re-Export über `src/sim/index.ts`.
2. **`src/render/index.ts`** — `Map<Oberflaeche, StandardMaterial>` (flache
   Nacht-`Color3` nach Ziellvorlage §3, `specularColor` 0). `boxMaterial()` prüft
   `box.oberflaeche` zuerst (außer `erde`), sonst **exakt der alte Pfad** →
   der echte Sektor sieht unverändert aus (kein Sektor-Box trägt das Feld).
   Vierter Parameter `probe?: { lichter }` + Feuertonnen-Bauer in
   `baueNachtLicht` herausgezogen (dient `meta.lichter` **und** der Probe-Szene).
   Materialien im `dispose()` mit aufgeräumt.
3. **`src/data/module.ts`** — neuer Abschnitt „Graben-Look-Baukasten", rein
   additiv:
   - Lokale Kennwerte `SOHLE_TIEF −2,7`, `BRUSTWEHR_TIEF 0,58`,
     `PARAPET_KRONE_TIEF 0,70`, `FEUERTRITT_TIEF −0,90`, `PARADOS_KRONE_TIEF 0,30`
     (klar kommentiert „AP6-01d macht das global").
   - `verkleidung(seg, opt)` — Holz-Stützpfosten (~1,2 m) + vier Bohlen-Kurse,
     achsen-generisch über eine `WandSegment`-Beschreibung.
   - `sandsackKrone(seg, opt)` — Klötze 0,50 × 0,35 × 0,45 mit ~0,15-Lücken
     („Kimme"), Oberkante = Krone.
   - `laufrost(bereich)` — dünne Deckplatte (Oberkante Sohle + 0,04),
     optionale Querstege.
   - `feuertrittTief(opt)` — vier Stufen von der tiefen Sohle zur Bank; jede
     Stufe 0,45 m < `STEP_HEIGHT`.
   - `abstiegUnterstand(opt)` — der **echte Abstieg** (Grill Q9): Bodenplatte +
     8 Treppenstufen (~0,275 m < `STEP_HEIGHT`) + Schacht-Seitenwände + Decke
     (erst hinter einem 0,7-m-Vestibül, damit der Kopf beim Abstieg frei bleibt)
     + Wellblech-Wände + Türwand mit 1,8-m-Öffnung + optionale Erd-Kappe
     (`kappeBis`). Raumboden −4,90, Deckenunterkante −2,90 → **2,0 m lichte
     Höhe** (Auge −3,30 → 0,40 m unter der Decke). `abstiegUnterstandLoch(opt)`
     gibt die XZ-Aussparung im Auffangboden zurück.
4. **`src/data/probe-graben.ts` (neu)** — eine isolierte `LevelData`, **kein
   `SektorMeta`** (`createSim` nimmt es als schlichtes Level, keine Zonen/Nav/
   Wellen/Uhr): 1 tiefe verkleidete Feuernische (4-Stufen-Feuertritt, Sandsack-
   Krone, Laufrost, Brustwehr + West-Stirnwand + Parados) · 1 Erd-Traverse, die
   die Feuerlinie in eine West- und Ost-Bucht teilt · ~7,6 m Verbindungsgraben-
   Stumpf (verkleidet, Laufrost) · 1 `abstiegUnterstand` am Grabenende ·
   Feindseiten-/Hinterland-Feld als Kulisse (mit Graben-Schlitz + Unterstand-
   Kappe). Rechteck-Subtraktion (`bodenPlatten`) für den Hinterland-Boden.
   `probeGrabenLichter` = 2 hart platzierte Lichter (Laufgang-Akzent + Unterstand).
5. **`src/main.ts`** — kleiner geguardeter Zweig: `?probe` → `starteProbe(canvas)`
   (Sim + Renderer + Input + Debug-Overlay, kein HUD/Kompass/Lagekarte/Audio).
   Der Normalpfad ist in `starteSektor()` gewandert, sonst unverändert.
6. **`src/data/probe-graben.test.ts` (neu, 11 Tests)** — Baukasten-Einheitstests
   + Begehbarkeit der Probe-Szene mit echter `moveCapsule`.

### Akzeptanzkriterien — geprüft

| Kriterium | Ergebnis |
| --- | --- |
| `npm run dev` **ohne** `?probe`: echter Sektor exakt wie vorher | ✅ Gegenprobe: Golden-Anker `sim.test.ts` bit-identisch, alle 41 `sektor.test.ts` + `navgraph-begehbarkeit.test.ts` grün; kein Sektor-Box trägt `oberflaeche`, `boxMaterial` fällt für ihn auf den alten Pfad zurück |
| `?probe`: tiefer verkleideter Graben — Wände überragen einen | ✅ Screenshot 01: von der Sohle (Auge −1,10) sieht man nur Wand + Sandsack-Krone gegen den Himmel; Test „Tiefe": Auge auf der Sohle 1,48 m unter der Brustwehr-Oberkante |
| Feuertritt hoch, über die Kimme schießbar | ✅ Screenshot 02: auf der Bank (Auge +0,70) Blick über die Brustwehr (Erde +0,58) ins Feld; Test: Auge−Krone = 0,00 m ≤ 0,15 |
| Sandsack-Krone als heller Horizont, Laufrost, Holz-Pfosten + Bohlen | ✅ Screenshots 01/03/04/05 — `sandsack` hellster Ton, Formdetail-Grid klar lesbar |
| Abstiegs-Unterstand: Treppe hinab, Raum mit Kopffreiheit, wieder hinauf | ✅ Screenshots 06/07; Sim-Test: Kapsel läuft die 8 Stufen hinab, landet auf −4,90, Auge (−3,30) clippt nicht in die Decke (−2,90), läuft wieder hinauf in den Graben |
| Kapsel fällt nicht durch den Auffangboden-Ausschnitt | ✅ Test „keine Kapsel fällt durch": drei Fallproben über der Raum-Aussparung → alle auf der Raum-Bodenplatte (> −5,3) |
| Feuertritt: jede Stufe < `STEP_HEIGHT`; Auge auf der Bank ±0,15 der Krone | ✅ Stufen-Oberkanten −2,25 / −1,80 / −1,35 / −0,90 (Δ 0,45 < 0,50); Auge auf der Bank +0,70 = Krone +0,70 |
| Parapet-Krone von jeder angrenzenden Lauffläche > `STEP_HEIGHT` | ✅ Test: Kapsel vom Feindseiten-Feld (y 0) gegen die Brustwehr → stoppt bei z ≈ 4,3, steigt nicht hinauf (Δ 0,58 > 0,50); von der Bank (−0,90) zur Krone Δ 1,60 |
| Golden-Anker `sim.test.ts` unverändert | ✅ bit-identisch (keine Rebaseline) |
| `navgraph-begehbarkeit.test.ts` unverändert grün | ✅ |
| alle Checks grün | ✅ |

### Perf-Notiz (Anker für AP6-01d)

Probe-Szene: **164 Level-Boxen** (erde 21 · holz 93 · sandsack 42 · laufrost 3 ·
wellblech 5) → 169 Meshes total, **~64 aktive Meshes je Blick** (Frustum-Cull),
19 Materialien. Headless (Swiftshader, 1280×720): **Median-Frame ~20,8 ms /
p95 ~22,5 ms** (~48 fps) — reine CPU-Rasterung, eine echte GPU liegt weit
darüber (vgl. AP6-06-Merkposten). Draw-Calls ≈ aktive Meshes (kein Batching).

**Für AP6-01d:** die Verkleidung vervielfacht die Box-Zahl. Der ganze Sektor im
neuen Look (~5 Front-Nischen + Parados + 3 Verbindungsgräben + Home-Line mit 3
Abstiegs-Unterständen) landet grob bei **700–900 Boxen** → ein Mesh/Draw-Call je
Box wird auf schwacher Hardware spürbar. Empfehlung: im Renderer **Merge je
Material** (`Mesh.MergeMeshes` bzw. Thin-Instances) für die statische Welt-
Geometrie, mit N-Box-Frame-Benchmark als Budget-Anker.

### Entscheidungen / Abweichungen vom Ticket

1. **Neue Helfer statt Änderung von `parapet()` / `unterstand()`.** Das Ticket
   (Auftrag §1) nennt „Feuertritt 3 → 4 Stufen" und „`unterstand()` neu". Die
   Akzeptanzkriterien fordern aber **Golden-Anker unverändert** und „echter
   Sektor unberührt" (und „Ausdrücklich NICHT: der echte Sektor"). Da `sektor.ts`
   `modul("parapet"/"unterstand"/"traverse", …)` aufruft, hätte jede Änderung
   dieser Funktionen den Sektor (und damit die positionsabhängigen Golden-Anker)
   verschoben. Deshalb: **neue, eigenständige Helfer** (`feuertrittTief`,
   `abstiegUnterstand`, `verkleidung`, …), die nur die Probe-Szene nutzt. Die
   alten Module + Kennwerte bleiben für den Sektor im Ist; **AP6-01d** verdrahtet
   den neuen Look global und trägt dort die Golden-Rebaseline (wie im Ticket
   „Ausdrücklich NICHT in AP6-01c" ohnehin vorgesehen). Der AP6-01b-`unterstand()`-
   Rückstand ist mit `abstiegUnterstand` **gelöst** — nur noch nicht im Sektor
   verdrahtet.
2. **`PARAPET_KRONE_TIEF` = 0,70 wie im Ticket, aber die Erd-Brustwehr endet bei
   0,58**, die Sandsäcke sitzen 0,58 → 0,70 mit Lücken darauf. So ist die
   Erdwand von der Feldseite > `STEP_HEIGHT` (nicht begehbar, Marge 0,08) und
   das Auge auf der Bank (+0,70) liegt 0,12 m über der Erde → sauber „über die
   Kimme". Das Ticket-Querschnitt-ASCII (§1) zeichnet die Brustwehr bis
   OBERFLAECHE 0,00; 0,58 ist die Feinjustierung, die die STEP_HEIGHT-Marge
   *und* die Schuss-Linie zugleich trägt. Für AP6-01d ist damit `BRUSTWEHR_TIEF`
   0,58 der Startwert (im Spieltest justierbar).
3. **Kleines offenes „Vestibül" (0,7 m) am Fuß der Treppe**, bevor die Decke
   ansetzt — ohne das stößt der absteigende Kopf an die Deckenkante, weil die
   letzten Stufen noch nicht auf Raumboden-Niveau sind. Der Treppenschacht ist
   dadurch (samt Vestibül) **oben offen zum Graben** (wie im Ziellvorlage-ASCII
   „oben offen zum Graben"), die eigentliche Kammer ist gedeckt + erd-bekappt.
4. **`querStege` beim `laufrost` per Default aus** — 0,03-m-Leisten alle 0,5 m
   lösten beim Gehen einen Mikro-Step-Up aus (Kamera-Zittern). Das Datenfeld
   bleibt für AP6-01d (dann als reines Render-Detail ohne Kollider zu bauen).

### Manuell geprüft

Headless (Playwright + Swiftshader, Wegwerf-`hdl-probe.html` → gelöscht):
7 Screenshots in `tickets/AP6-01c-screenshots/`:

| Datei | Blick |
| --- | --- |
| 01-nische-von-unten | von der Grabensohle: verkleidete Wand überragt, Sandsack-Krone gegen den Nachthimmel |
| 02-feuertritt-ueber-die-kimme | auf der Bank stehend, Blick über die Brustwehr ins Feld |
| 03-verkleidung-laufrost-nah | Wandecke: Pfosten + Bohlen + Laufrost-Boden + 4-Stufen-Feuertritt |
| 04-traverse-feuerbuchten | die Erd-Traverse teilt die Feuerlinie (Zickzack über den Laufgang) |
| 05-verbindungsgraben-eng | enger verkleideter Verbindungsgraben-Stumpf, am Ende der Abstiegs-Schacht |
| 06-abstieg-treppe-hinab | vom Grabenrand die Treppe hinab in den Unterstand |
| 07-im-unterstand-blick-hoch | im Raum: Kopffreiheit, Treppe + Grabenöffnung mit Krone dahinter |

**Merkposten Spieltest (echte GPU):** die Nacht-Helligkeit ist headless
(Swiftshader) nur bedingt aussagekräftig und in der engen Szene mit den
Reichweite-15-Lichtern warm-orange; die zwei Probe-Lichter sind bewusst sparsam
gesetzt, der offene Graben lebt vom Mond-Ambient. Auf echter GPU justieren (wie
AP6-01b-Merkposten). Fokus außerdem: fühlt sich die Nische *tief + eng* an,
trägt die Verkleidung, funktioniert der Abstieg flüssig (Kamera beim Treppab).

---

## Review — ki-game-63 (2026-09-09)

**Verdikt: grünes Licht (Code).** `41635d9` auf `arbeitspaket-6`, CI „CI" +
„Pages Preview" = success. Die **visuelle Abnahme** macht der Nutzer im
`?probe`-Spieltest (Prozess Grill Q6) — Code-Review und Ist-Bau sind sauber.

**Geprüft:**

- **Isolation (der kritische Punkt):** `sektor.ts` **nicht** im Diff, `sim.test.ts`
  **nicht** im Diff, `navgraph-begehbarkeit.test.ts` **nicht** im Diff. Golden-
  Anker also bit-identisch ohne Rebaseline — genau die Ticket-Vorgabe. `parapet()`
  / `unterstand()` / `traverse()` / `GRABEN_SOHLE` / `PARAPET_OBERKANTE`
  unverändert. Alles Neue additiv (`module.ts` +488 nur neuer Abschnitt,
  `probe-graben.ts` neu). Der `?probe`-Zweig in `main.ts` ist ein
  URLSearchParams-Guard; der Normalpfad wurde nur in `starteSektor()` gekapselt
  (Logik byte-gleich).
- **Goldene Regel:** `src/sim/collision.ts` bekommt `Oberflaeche` + optionales
  `LevelBox.oberflaeche` — reiner Typ, **keine** Sim/Kollisions-Logik liest das
  Feld (nur `boxMaterial()` im Renderer). `sim/index.ts` re-exportiert nur den
  Typ. Grenze gewahrt.
- **Renderer:** `boxMaterial()` prüft `oberflaeche` zuerst, sonst **exakt der
  alte Pfad** → kein Sektor-Box trägt das Feld, echter Sektor sieht unverändert
  aus (Gegenprobe im Bericht + `sektor.test.ts` grün). Material-Map flach,
  `specularColor` 0, im `dispose()` aufgeräumt.
- **`abstiegUnterstand`** = echter Abstieg (Grill Q9): Raumboden −4,90,
  Deckenunterkante −2,90 → 2,0 m Kopffreiheit; 8 Treppenstufen à 0,275 m
  < `STEP_HEIGHT`; vollständig geschlossene Kiste (eigene Bodenplatte −5,40) +
  `abstiegUnterstandLoch()` für die Auffangboden-Aussparung; **nicht im
  Nav-Graph** (Spieler-Schutzraum). **Der AP6-01b-`unterstand()`-Rückstand ist
  damit gelöst** — bleibt nur bis AP6-01d unverdrahtet.
- **Tests:** +11 in `probe-graben.test.ts` — Tiefe (Auge auf Sohle 1,5 m unter
  der Brustwehr / auf der Bank drüber), Feuertritt-Stufen < `STEP_HEIGHT` + Auge
  ≈ Kronenhöhe, Parapet-Krone nicht begehbar (echte `moveCapsule`), Abstieg
  hinab→Raumboden→Kopffreiheit→hinauf, keine Kapsel durch den Auffangboden-
  Ausschnitt, durchgehender Boden an 6 Stellen. 314 Tests gesamt, CI grün.
- **Screenshots 01/02/07:** lesen sich klar als **tiefer verkleideter Graben**
  (Pfosten + Bohlen-Kurse + Sandsack-Krone gegen den Nachthimmel) bzw. **echter
  Unterstand** (Treppe hinab, Kopffreiheit, Blick hoch durch den Schacht). Ton
  headless warm-orange (Swiftshader + Nahlicht) — auf echter GPU beurteilen.

**Die vier Worker-Entscheidungen — alle akzeptiert:**

1. **Neue Helfer statt `parapet()`/`unterstand()` ändern.** Richtig und
   sauberer als die Ticket-Formulierung: jede Änderung an den von `sektor.ts`
   genutzten Modulen hätte die Golden-Anker verschoben. AP6-01d macht den
   globalen Schnitt + die Rebaseline (ohnehin dort verortet).
2. **Erd-Brustwehr 0,58 + Sandsack-Krone 0,58→0,70.** Trägt STEP_HEIGHT-Marge
   (0,08) *und* Schuss-Linie (Auge +0,70 = 0,12 m über der Erde). **Merkposten:**
   0,08 m Marge ist knapp — zeigt der Spieltest eine kletternde Kapsel, in
   AP6-01d `BRUSTWEHR_TIEF` auf ≥ 0,62 heben.
3. **0,7-m-Vestibül am Treppenfuß** (Decke setzt erst danach an) — das ist der
   ticket-erlaubte „flachstmögliche echte Abstieg", *nicht* der flache
   Fallback. Raum bleibt voll 2,0 m.
4. **`laufrost`-Querstege per Default aus** (3-cm-Mikrostufe → Kamera-Zittern).
   Datenfeld bleibt, in AP6-01d als reines Render-Detail ohne Kollider.

**Für AP6-01d (in die Spec übernommen):**

- **Perf:** Probe = 164 Boxen, ~64 aktive Meshes/Blick, headless ~21 ms/Frame
  (Swiftshader-CPU). Schätzung ganzer Sektor 700–900 Boxen → **Merge je Material
  ist Pflicht, nicht „ggf."** (`Mesh.MergeMeshes`/Thin-Instances für die
  statische Welt), mit N-Box-Frame-Benchmark im Bericht.
- **As-built-Kennwerte sind der Startwert:** `SOHLE_TIEF −2,7`, `BRUSTWEHR_TIEF
  0,58` (→ ggf. 0,62), `PARAPET_KRONE_TIEF 0,70`, `FEUERTRITT_TIEF −0,90`
  (4 Stufen), `PARADOS_KRONE_TIEF 0,30`. Abstiegs-Unterstand-Maße aus
  `abstiegUnterstand()` übernehmen.

**Nächster Schritt:** Nutzer spielt `npm run dev` → `?probe`. Danach schreibt
der Planer den AP6-01d-Kickoff (mit etwaigen Zielvorlage-Korrekturen aus dem
Spieltest). Worker wartet bis dahin.

Folge-Ticket: AP6-01d (nach dem Spieltest).
