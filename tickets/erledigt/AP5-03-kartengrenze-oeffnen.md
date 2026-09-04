# AP5-03 — Kartengrenze öffnen: offenes Gelände statt sichtbarer Wände

**Status:** erledigt · `ba631af` · reviewed 2026-09-04
**Arbeitspaket:** 5 (Boxhead-Kern) · **Branch:** `arbeitspaket-5` (von `main`)
**Referenz:** Zweiter Spieltest 2026-09-04 (Nutzer-Feedback), `src/data/sektor.ts`
Z. 75–79 (`modul("kartengrenze", …)`), `src/data/module.ts` (Modul
`"kartengrenze"`), `src/render/index.ts`.

## Ausgangslage

Der Sektor ist aktuell rundum von hohen, sichtbaren Sperrwänden (Modul
`kartengrenze`) eingefasst. Spieltest-Feedback: das fühlt sich wie eine Box
an, nicht wie ein offenes Schlachtfeld — genau das Gegenteil von
`KONZEPT.md` §3 „offenes Trichterfeld"/„Kartengrenzen gesperrt, Umgehen
nein" (die Sperrung selbst ist gewollt, die **sichtbare Wand** nicht).

## Ziel

Die Spielgrenze bleibt technisch wirksam (kein Herausfallen aus der Welt),
aber sie soll sich nicht mehr wie eine Wand anfühlen — stattdessen wie
offenes, auslaufendes Gelände.

## Umsetzung

Die genaue technische Lösung darf der Worker wählen, z. B.:
- Kollisionsgrenze unsichtbar machen (kein sichtbares Mesh mehr) und
  stattdessen ein Boden-/Geländeplane über die Spielgrenze hinaus sichtbar
  weiterlaufen lassen (mit Fog/Sichtweiten-Grenze statt harter Kante), oder
- die sichtbare Wand deutlich weiter nach außen schieben und den Bereich
  dazwischen mit offenem Gelände füllen, sodass sie im normalen Spiel nicht
  erreicht/gesehen wird.

Wichtig: die Kollisionsgrenze selbst (dass man den Sektor nicht verlassen
kann) bleibt bestehen — das ist eine reine Render-/Level-Art-Änderung, keine
Änderung an Zonen, Nav-Graph oder Spielfeld-Ausmaßen.

## Akzeptanzkriterien

- Von keiner im normalen Spiel erreichbaren Position aus ist eine sichtbare,
  harte Wand am Kartenrand zu sehen.
- Spieler kann weiterhin nicht aus der Welt fallen/laufen — die
  Spielgrenze bleibt technisch wirksam.
- Zonen, Nav-Graph, Breschen unverändert (nur die äußersten Kartenränder
  betroffen).
- `npm run dev`: visuell gegengecheckt (Screenshot oder Beschreibung im
  Bericht), nicht nur per Test.

## Ausdrücklich NICHT in diesem Ticket

Vergrößerung des eigentlichen Sektors · neue Zonen · echte Terrain-/Art-
Politur (Texturen, Vegetation) — hier reicht Greybox-Niveau, nur eben ohne
sichtbare Box-Wand.

## Bericht — AP5-03

COMMIT: <Hash in der Nachricht an die Planer-Session> (Branch `arbeitspaket-5`)
CI: <Status in der Nachricht an die Planer-Session>
TODO(Rückfrage): keine

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  23 Dateien, 269 Tests (vorher 259)
    Coverage src/sim: 98,43 % Stmts / 96,80 % Branch / 100 % Funcs / 98,43 % Lines
    collision.ts 97,81 · sektor.ts 100
> vite build                       ✓  dist/assets/index-*.js 6.908,3 kB │ gzip 1.533,1 kB
```

Tests: 269 (23 Dateien, +10 — `sektor` +5 „Kartengrenze & Umland", `collision`
+3 „unsichtbare Kollider", `module` +2) · Coverage src/sim **98,43 %**
(unverändert) · Bundle ~6,91 MB / ~1,53 MB gzip (Δ +0,8 kB roh, kein neuer
Import).

**Alle drei Golden-/Replay-Anker unverändert grün** — die Kollisionswelt der
Spielfläche ist identisch (die Grenzkollider stehen noch, das Umland liegt
außerhalb jeder erreichbaren Position).

### Umsetzung

Lösung = Variante 1 aus dem Ticket (Kollisionsgrenze unsichtbar + Gelände läuft
sichtbar weiter + Dunst), in drei Schichten:

- **Daten** (`src/sim/collision.ts`, `src/data/module.ts`,
  `src/data/sektor.ts`): neues Render-/Sim-Hinweisfeld `LevelBox.unsichtbar`
  („nur Kollision, kein Mesh"), analog zum bestehenden `tag`. Das Modul
  `kartengrenze` setzt es; die vier Grenzwände in `sektor.ts` bleiben in Lage,
  Länge und Höhe (6 m — Sprung + Stufe kommen nicht drüber) exakt wie bisher.
  `modul()` reicht das Flag durch jede Drehung. Dazu das **Umland**: vier
  Bodenblöcke (West/Ost 200 × 489 m, Nord/Süd 50 × 200 m, 3 m dick, Oberkante
  y = 0 = Geländeoberfläche), bündig an die Sektorkanten x = ±25, z = 53 und
  z = −36 gesetzt — ihre Flanken bilden an den offenen Grabenenden (Frontgraben
  x = ±25, Home-Graben z = −36) automatisch die Erd-Stirnwand; kein Loch, keine
  Wand. Plus zehn flache Erdhaufen/Trichterränder (≤ 1,1 m) im Umland als
  Tiefenhinweise für Auge und Dunst. Alles unerreichbar (Grenzkollider davor).
- **Sim** (`src/sim/collision.ts`): `CollisionWorld.unsichtbar[]` parallel zu
  `boxes`; `moveCapsule` behandelt unsichtbare Boxen wie jede Wand,
  `raycast` (und damit `sichtlinie`) überspringt sie — was man nicht sieht,
  hält keine Kugel auf. Ohne das hätten Schüsse ins offene Umland sichtbar in
  der Luft an der alten Wandposition geendet.
- **Renderer** (`src/render/index.ts`): kein Mesh für `unsichtbar`-Boxen;
  Boxen außerhalb aller Zonen bekommen das neue `umland`-Material (stumpfer,
  kälterer Sumpf-Ton als der Sektorboden, damit „hier geht es nicht weiter"
  ohne Wand lesbar ist); linearer Dunst in Himmelsfarbe (`fogStart` 60 m,
  `fogEnd` 190 m): erst jenseits der längsten Sichtlinie im Sektor (~90 m)
  spürbar, Front und Home-Line bleiben scharf, die Umland-Außenkante bei
  200 m verschwindet vollständig. Die Heuristik „hohe Box = Betonsilhouette"
  bleibt für die Turmruine.
- **Doku:** `src/ARCHITEKTUR.md` (Kollisions-Bullet + „Boxhead-Kern (AP5)").

### Tests

- `collision.test.ts` (+3): unsichtbarer Kollider sperrt die Bewegung wie eine
  Wand (kein Hochsteigen) · `raycast` geht hindurch und trifft die sichtbare
  Wand dahinter · `createCollisionWorld` führt das Flag parallel.
- `module.test.ts` (+2): `kartengrenze` ist in allen vier Drehungen
  `unsichtbar` und ≥ 4 m hoch · alle anderen Module bleiben sichtbar.
- `sektor.test.ts` (+5): genau vier unsichtbare Grenzkollider, Lage/Länge wie
  bisher · das Umland deckt Probepunkte direkt hinter jeder Kante (±26 · 54 ·
  −37), an beiden Grabenenden und bis in den Dunst (±150 / ±180) mit Oberkante
  exakt 0 · **kein sichtbarer Quader jenseits der Spielgrenze ragt höher als
  1,5 m** (Silhouetten-Schranke = das Akzeptanzkriterium „keine harte Wand" als
  Datenregel) · Zonen, Abschnitte und Nav-Knoten liegen weiter innerhalb der
  Grenze · **die Spielgrenze bleibt wirksam:** Spielerkapsel läuft auf dem
  Feld nach Ost/West, im Labyrinth nach Norden und im Home-Graben nach Süden —
  stoppt vor der Grenze, fällt nicht, klettert nicht.

### Visuell gegengecheckt (`npm run dev`, headless Chromium via Playwright)

Diesmal wirklich im Spiel: Vite-Dev-Server + headless Chromium
(SwiftShader-WebGL, ~50–60 fps), Pointer-Lock vorgetäuscht, feste Route
gefahren (Seed 1 = Spawn Abschnitt A bei x = −12): Frontgraben → Rampe →
Feld → bis an die Westgrenze. Positionen aus dem F3-Overlay:

| Screenshot | Position (F3) | Blick | Befund |
|---|---|---|---|
| 02 | (−12, −1,8, 13) im Frontgraben A | −X, zum Grabenende bei x = −25 | Graben endet in einer Erd-Stirnwand (Umland-Flanke), darüber Himmel — vorher 6-m-Betonwand |
| 03 | (−16, 0, 6,8) auf dem Feld | −Z, Richtung Home-Line | Home-Brustwehr als Streifen am Horizont, dahinter läuft das Gelände in den Dunst aus — keine Rückwand |
| 04 | (−16, 0, 6,8) | −X, dort stand die Wand 9 m entfernt | Feld geht in die dunklere Umland-Ebene über, Erdhaufen in der Ferne, Horizont verschwimmt |
| 05 | (−24,45, 0, 6,8) **an der Grenze** | −X | offene Ebene bis zum Dunst, keinerlei Kante; Kapsel steht exakt am unsichtbaren Kollider (24,8 − 0,35) |
| 06 | dito | −X, 25° nach unten | Naht Feld/Umland direkt unter den Füßen: kein Loch, kein Z-Fighting |
| 07 | dito | +Z, entlang der Grenze | Frontgraben-Querschnitt endet in der Erdflanke, dahinter Turmruine und Umland; Gegner der Welle 1 rechts sichtbar (Spiel läuft) |

PNGs (1280 × 720) liegen auf dieser Maschine unter
`/private/tmp/claude-502/-Users-mpa-Desktop-KI-Game/7bd26b14-4e5c-4ad5-8d94-ed4cb41f28c9/scratchpad/shots/`
(nicht ins Repo genommen — kein etablierter Ort für Binärdateien; bei Bedarf
kann der Planer sie in `tickets/erledigt/` ablegen). Nord- und Südrand nicht
eigens angefahren; Geometrie und Test decken sie identisch ab, Screenshot 03
zeigt die Südrichtung vom Feld.

Nebenbefund beim Check, kein Ticket-Inhalt: Das F3-Overlay startet **sichtbar**
und friert seine Werte ein, solange es per F3 ausgeblendet ist (`update()`
kehrt bei `!visible` früh zurück) — deshalb zeigte mein erster Durchlauf eine
stehende Position. Verhalten wie gebaut, aber ein Stolperstein für Automation.

### Entscheidungen / Abweichungen vom Ticket

1. **Unsichtbarer Kollider + Umland + Dunst** statt „Wand weit nach außen":
   eine weit entfernte Wand wäre bei 6 m Höhe im Flachland weiter sichtbar
   gewesen; die Kombination aus bündigem Gelände und Dunst braucht keine
   Silhouette mehr. Die Grenzkollider bleiben unverändert an ihrer Stelle —
   Spielfeldmaße, Zonen, Nav-Graph, Breschen unangetastet (Test).
2. **`LevelBox.unsichtbar` als Datenfeld** (statt Größen-Heuristik im
   Renderer): explizit, testbar, dieselbe Konvention wie `tag`; der spätere
   Generator kann es nutzen.
3. **Hitscan/Sichtlinie ignorieren unsichtbare Kollider** — kleine Sim-Änderung
   über den reinen Render-Auftrag hinaus, aber direkte Folge des Tickets (sonst
   „Treffer in der Luft" beim Schuss ins offene Gelände). Bewegung bleibt
   gesperrt.
4. **Umland als echte `LevelBox`en in `sektor.ts`** (Render + Kollision, EINE
   Quelle) statt Render-only-Planes: Planes hätten an den offenen Grabenenden
   Löcher gelassen (einseitig, auf y = 0), Blöcke liefern die Erd-Stirnwand
   gratis. Kollision der Blöcke ist ohne Effekt (unerreichbar), Hitscan trifft
   sie realistisch als Boden.
5. **Zehn flache Erdhaufen** als Tiefenhinweise — Greybox-Gelände, keine Art-
   Politur (keine Texturen/Vegetation); ohne sie wirkte die Ebene als
   konturlose Fläche.
6. **Dunst-Werte** (60/190 m) sind Platzhalter wie alle AP4/AP5-Zahlen; im
   Spieltest justieren, falls die Front vom Home-Graben aus (~50 m) zu blass
   wirkt (aktuell dort 0 % Dunst).

### Merkposten (nicht in diesem Ticket)

- Umland-Farbton und Erdhaufen-Verteilung sind reine Startwerte; „Sumpf"
  (KONZEPT.md §3) könnte später leicht tiefer liegen (z. B. −0,3 m) und
  Wasser-Ton bekommen — Art-Politur.
- Der Spieler bleibt auf dem Feld an einem *unsichtbaren* Kollider stehen
  (gewollt laut Ticket). Falls das im Spieltest als „unsichtbare Wand" stört:
  Umland ab der Grenze als sanft ansteigende Böschung/Schlamm — ebenfalls
  Politur, keine Systemänderung.

## Review — AP5-03 · 2026-09-04

**Grünes Licht.** Lokal nachvollzogen: `git pull` auf `arbeitspaket-5`,
`typecheck`/`lint`/`format:check` grün, `test:coverage` 269/269 grün
(Coverage src/sim 98,43 %, unverändert), `build` grün. CI + Pages Preview auf
GitHub beide `success` (`33869709711`/`33869709747`).

Diff gelesen (`collision.ts`, `module.ts`, `sektor.ts`, `render/index.ts`).
Der Lösungsweg ist der richtige: die Kartengrenze bleibt exakt die gleiche
Kollisionsbox wie vorher (Lage/Länge/Höhe unverändert, per Test abgesichert),
bekommt nur ein `unsichtbar`-Flag — kein Mesh, kein Hitscan-Treffer, Bewegung
weiterhin gesperrt. Das neue Umland sind **echte `LevelBox`en**, nicht
Render-only-Planes — die Begründung (Planes hätten an den offenen
Grabenenden Löcher gelassen, Blöcke liefern die Erd-Stirnwand automatisch)
ist nachvollziehbar und in den Screenshots sichtbar bestätigt. Der Dunst
schließt die Umland-Außenkante, ohne die Front/Home-Sichtlinien zu trüben.
Sauber erkannt und behoben: Hitscan/Sichtlinie müssen unsichtbare Kollider
ignorieren, sonst „Treffer in der Luft" — eine kleine, aber notwendige
Sim-Änderung über den reinen Render-Auftrag hinaus, korrekt als solche im
Bericht benannt statt stillschweigend gemacht.

Zwei Stichproben-Screenshots angeschaut (05 „an der Westgrenze", 02
„Frontgraben Blick Westende"): bestätigen die Beschreibung — offene Ebene
ohne jede Kante bis in den Dunst, der Frontgraben endet in einer Erdflanke
statt einer Betonwand. Die restlichen fünf inhaltlich plausibel, kein
Bildvergleich nötig, die Sektor-Tests (vier Grenzkollider unverändert,
Silhouetten-Schranke ≤ 1,5 m, Spielgrenze bleibt wirksam an allen vier
Seiten) decken die Geometrie ohnehin ab.

Zu den sechs Ermessensentscheidungen: alle nachvollziehbar begründet,
keine Einwände — insbesondere (2) `LevelBox.unsichtbar` als explizites,
generator-taugliches Datenfeld statt Größen-Heuristik ist die richtige
Wahl, konsistent mit dem `tag`-Muster aus AP4-06.

Der Merkposten „Spieler steht an einer unsichtbaren Wand, falls das im
Spieltest stört" ist der einzige Punkt, den ich im dritten Spieltest
gezielt gegenchecken will — für dieses Ticket ist er korrekt nicht
mitgelöst (Politur, keine Systemänderung, wie im Ticket verlangt). Dunst-
Werte (60/190 m) sind wie andere AP4/5-Zahlen Platzhalter fürs Playtest-
Tuning.

Screenshots liegen unter dem im Bericht genannten Pfad (Worker-Scratchpad,
Session `7bd26b14…`) — für den Audit-Trail nach `tickets/erledigt/`
kopiert (siehe unten), damit sie nicht mit dem temporären Verzeichnis
verschwinden.

**Manueller Spieltest im Browser** ist diesmal Teil des Reviews selbst
(Playwright-Screenshots) — für AP5-01/02 steht der noch aus, läuft im
dritten Spieltest zusammen.
