# AP6-01c — Graben-Look: Baukasten, Materialsystem & Probe-Ecke

**Status:** offen — Kickoff folgt vom Planer. **Vor** AP6-01d, AP6-02b, AP6-05.
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
