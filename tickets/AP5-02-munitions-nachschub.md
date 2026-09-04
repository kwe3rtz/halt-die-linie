# AP5-02 — Munitions-Nachschub im Einsatz

**Status:** review
**Arbeitspaket:** 5 (Boxhead-Kern) · **Branch:** `arbeitspaket-5` (von `main`)
**Referenz:** Zweiter Spieltest 2026-09-04 (Nutzer-Feedback), `WAFFEN.md`,
`src/sim/weapon.ts`, `src/sim/index.ts` (`resetWeapon`, `respawnPlayer`),
`KONZEPT.md` §9.6 (Nachschub-Ökonomie — dort die *volle* spätere Währung,
hier NICHT gemeint), AP4-06 `entscheide()`/`InputCommand.buttons.interact`
als Vorbild für „Aktion am Ort per Taste".

## Ausgangslage

Aktuell wird Reservemunition ausschließlich in `respawnPlayer()`
(`src/sim/index.ts`) zurückgesetzt — d. h. die einzige Möglichkeit, wieder
Munition zu bekommen, ist zu sterben. Spieltest-Feedback: das fühlt sich
falsch an, insbesondere weil aktuell nur eine Waffe existiert.

## Ziel

Reservemunition im laufenden Einsatz auffüllbar machen, ohne dass der
Spieler dafür sterben muss — schlank, kein Vorgriff auf die volle
Nachschub-Ökonomie (§9.6, eigenes späteres Paket).

## Umsetzung

Ein oder mehrere feste Munitions-Nachfüllpunkte im Sektor (Boxhead-Vorbild:
Munitionskiste). Vorschlag: mindestens einer an der Home-Line (dort ist der
Spieler ohnehin im Finale), ggf. ein zweiter näher an der Front für den
regulären Wellen-Loop — genaue Platzierung darf der Worker im Greybox
festlegen. Auslösung per `interact` (`E`), analog zum bestehenden
`entscheide()`-Muster aus AP4-06 (edge-getriggert, kein Dauerfeuer bei
gehaltener Taste). Auffüllmenge: volle Reserve (Platzhalter, wie andere
AP4-Zahlen). Kein Nachschub-Kosten-/Budget-System.

Die Sim-Grenze gilt wie überall: die Nachfüllpunkte sind Daten (Position +
ggf. Reichweite), keine neue Babylon-Abhängigkeit in `src/sim/**`.

## Akzeptanzkriterien

- Spieler kann im laufenden Einsatz, ohne zu sterben, an einem
  Nachfüllpunkt die Reservemunition auffüllen.
- Test: Reserve künstlich auf 0 setzen, `interact` am Nachfüllpunkt
  auslösen → Reserve wieder voll.
- Außerhalb der Reichweite eines Nachfüllpunkts löst `interact` keine
  Auffüllung aus.
- HUD zeigt minimal an, dass ein Nachfüllpunkt in der Nähe ist (Stil
  konsistent zu bestehendem HUD).

## Ausdrücklich NICHT in diesem Ticket

Volle Nachschub-Ökonomie/-Währung (§9.6) · zweite Waffe/Waffenwechsel ·
Munitionskosten oder Budgets · Nachfüllung durch Gegner-Drops.

## Bericht — AP5-02

COMMIT: <Hash in der Nachricht an die Planer-Session> (Branch `arbeitspaket-5`)
CI: <Status in der Nachricht an die Planer-Session>
TODO(Rückfrage): keine

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  23 Dateien, 259 Tests (vorher 250)
    Coverage src/sim: 98,43 % Stmts / 96,79 % Branch / 100 % Funcs / 98,43 % Lines
    sektor.ts 100 · weapon.ts 100 · index.ts 98,36
> vite build                       ✓  dist/assets/index-*.js 6.907,5 kB │ gzip 1.532,9 kB
```

Tests: 259 (23 Dateien, +9 — `sektor` +8 „Munitions-Nachschub (AP5-02)",
`hud` +1) · Coverage src/sim **98,43 %** (vorher 98,40 %) · Bundle
~6,91 MB / ~1,53 MB gzip (Δ +1,5 kB roh / +0,5 kB gzip — Kisten-Meshes +
HUD-Zeile, kein neuer Import).

**Alle drei Golden-/Replay-Anker unverändert grün** — die Skripte drücken nie
`E`, und die verschobenen Depot-Marker haben außer dem Auffüllen keine
Spielwirkung.

### Umsetzung

- **Nachfüllpunkte = die vorhandenen Abschnitts-Depots** (`FrontAbschnitt.depot`,
  seit AP4-04 als „Uhr"-Datum im Schema): drei an der Front (A/B/C), zwei an
  der Home-Line (H-West/H-Ost) — also mindestens einer an der Home-Line und
  einer je Frontabschnitt für den Wellen-Loop, wie im Ticket vorgeschlagen.
  Positionen in `src/data/sektor.ts` neu gesetzt (Greybox, Worker-Ermessen):
  Front an der **Parados-Rückwand** hinter dem Feuertritt, aus der Schusslinie
  — A (−20, 11,5) und C (20, 11,5) neben den Rampen, B (3, 11,5) direkt neben
  der Verbindungsgraben-Mündung; Home **im Munitionslager-Unterstand**
  (±12, −33,5), 1,5 m hinter dem Eingang (KONZEPT.md §3: „begehbare Unterstände
  (Munitionslager …)"). Die alten Marker A/C lagen *in* den Rampenstufen, B
  mitten in der Grabenmündung — als sichtbare Kiste unbrauchbar. Sonst nutzt
  niemand die Depot-Position (nur das Flag `depotVerloren`).
- **Sim** (`src/sim/sektor.ts`): reiner Helfer `naechstesDepot(abschnitte,
  pos, reichweite, verfuegbar)` → Id des nächsten Depots im 3D-Abstand ≤
  `DEPOT_REICHWEITE` (2 m, Platzhalter), das `verfuegbar` ist; `null` sonst.
  3D statt X/Z, damit die Parados-Oberkante direkt über Depot B (Δy ≈ 2,2 m)
  nicht zählt.
- **`createSim`** (`src/sim/index.ts`): je Tick `depotInReichweite` (nur
  lebendig, nach den Gegner-Treffern des Ticks berechnet — HUD-Hinweis und
  Tod stehen nie zusammen); Verfügbarkeit = `!depotVerloren` des Abschnitts.
  `E` als Flanke wie `entscheide()`: im Finale nach `gewonnen` weiterhin die
  Extraktion (Vorrang), sonst am Depot `weapon.reserve = weaponDef.reserve`.
  Nur die Reserve (Ticket), das Magazin bleibt; ein laufendes Nachladen läuft
  weiter. Keine Kosten, kein Budget. `SimState.player.depotInReichweite`
  (Abschnitts-Id | null) nach außen; Testeingang `_setReserve(menge)` nach
  der `_set…`-Konvention.
- **HUD** (`src/ui/hud.ts`): neue Zeile unter dem Munitionszähler,
  `.hdl-hud__depot`, „E · Munition auffüllen (Depot B)", nur sichtbar, wenn
  `depotInReichweite` gesetzt ist — gleiche Bauart wie „Nachladen…" (kleine
  Zeile in der Munitions-Kachel), grün statt gelb, damit es nicht wie ein
  Nachlade-Zustand aussieht. `main.ts` reicht das Feld durch.
- **Renderer** (`src/render/index.ts`): je Depot eine Munitionskiste (0,7 ×
  0,5 × 0,5, Holzton) mit emissivem Deckelstreifen, damit sie im Graben-
  schatten lesbar bleibt. Reine Markierung ohne Kollision — dasselbe Muster
  wie Landmark-Pfosten und Spine-Deko; Meshes/Materialien werden im
  `dispose` freigegeben.
- **Doku:** `src/ARCHITEKTUR.md` → „Boxhead-Kern (AP5)" ergänzt.

### Tests (`src/sim/sektor.test.ts` „Munitions-Nachschub (AP5-02)", `src/ui/hud.test.ts`)

- Wohlgeformtheit: jedes Depot liegt in den Bounds seines Abschnitts, 0,2 m
  über der Sohle und steckt in keinem Kollider (Kontrolle der verschobenen
  Marker).
- `naechstesDepot`: in Reichweite (1,9 m) / außerhalb (2,1 m) / direkt
  darüber auf der Parados (Δy 2,2) / nicht verfügbar / „nächstes gewinnt"
  mit zwei synthetischen Depots.
- Akzeptanz-Kern: Spieler läuft vom Spawn zu Depot B, Reserve künstlich 0
  (`_setReserve`), `E` → Reserve = `standardWaffe.reserve` (45), Spieler
  lebt, HP voll. Vom Spawn aus (3,35 m) ist noch kein Depot in Reichweite.
- Flanke: gehaltenes `E` füllt nicht erneut (Reserve bleibt 3), erst
  loslassen + neue Flanke.
- Außerhalb der Reichweite (im Verbindungsgraben) ist `E` wirkungslos.
- Gefallener Abschnitt (`_setAbschnittVerloren("B")`): kein Depot in
  Reichweite, `E` füllt nicht; `rueckerobern("B")` → `gebrochen`, Depot
  zurück, `E` füllt.
- Im Tod: kein Depot in Reichweite, `E` füllt nicht.
- Finale nach `gewonnen` (Seed mit mittlerem Spawn, `startAngriffskraft: 3`,
  H4-Schleife): am Depot B ist `E` die Extraktion (`vorbei`), die Reserve
  bleibt 0 — Vorrang gesichert.
- HUD: Depot-Zeile ohne Feld/`null` versteckt, mit `"B"` sichtbar und enthält
  „E", „Munition", „B".
- Test-Helfer `laufeZu(sim, ziel)` rechnet die Wunschrichtung aus dem
  aktuellen yaw zurück (funktioniert nach beliebigem Drehen, z. B. nach der
  H4-Schleife).

### Entscheidungen / Abweichungen vom Ticket

1. **Vorhandene Depots statt neuer Datenstruktur.** Kein neues Schema-Feld,
   konzeptgleich (KONZEPT.md §3: „ein kleines Nachschubdepot je Abschnitt",
   Home-Unterstand „Munitionslager") — Positionen verschoben, siehe oben.
2. **Verfügbarkeit hängt an `depotVerloren`.** Das Ticket spricht von festen
   Nachfüllpunkten; ich habe die seit AP4-04 vorhandene Depot-Semantik
   („fällt ein Frontabschnitt, ist sein Depot weg", KONZEPT.md §3 „die Uhr")
   übernommen — ein Prädikat, kein neues System. Damit hat der Rückzug eine
   spürbare zweite Konsequenz (Munition an der Front weg, Home bleibt).
   Falls unerwünscht: `verfuegbar` in `createSim` auf `() => true` — ein
   Einzeiler, Tests „gefallener Abschnitt" anpassen.
3. **Sichtbare Kiste im Renderer** — das Ticket verlangt nur den HUD-Hinweis;
   ohne Marker wären die Punkte im Greybox nicht auffindbar (Boxhead-Vorbild
   „Munitionskiste"). Render-only, kein Kollider, bewährtes Deko-Muster.
4. **3D-Reichweite 2 m** statt X/Z, Konstante `DEPOT_REICHWEITE` in
   `src/sim/sektor.ts` (exportiert, damit Tests dieselbe Zahl nutzen).
5. **`E`-Vorrang:** Extraktion vor Auffüllen (das bestehende AP4-06-Verhalten
   bleibt exakt; Auffüllen ist der `else`-Zweig).
6. **`alleAbschnitte`** in `createSim` jetzt `readonly FrontAbschnitt[]` (vorher
   nur `{ id, bounds }`), damit die Depots mitkommen; `Aabb`-Import entfällt.
7. Der Respawn füllt weiterhin auf (nicht Teil des Tickets, nichts
   zurückgebaut).

Manuell geprüft: **nicht im Browser** (auch in dieser Session kein Spiel-
start möglich). Die Sim-Seite ist headless über denselben Pfad geprüft, den
das Spiel nimmt (`createSim` → `tick` → FP-Controller → `E`-Flanke); die
Kisten-Meshes und die HUD-Zeile sind nur per Typecheck/Build bzw. jsdom-Test
abgedeckt (Babylon-Rendering wird laut Konvention nicht unit-getestet). Fürs
Gegenchecken im Spieltest: zur Kiste an der Rückwand rechts neben der
Grabenmündung (Depot B) gehen — unter dem Munitionszähler erscheint grün
„E · Munition auffüllen (Depot B)", `E` setzt die Reserve auf 45; im
Unterstand links/rechts an der Home-Line dasselbe.
