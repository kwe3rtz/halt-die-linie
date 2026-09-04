# AP5-05 — Leit-Spines: Linien entfernen (Nachzügler zu AP5)

**Status:** review
**Arbeitspaket:** 5 (Nachzügler) · **Branch:** `arbeitspaket-5` (von `main`,
neu von `main` abzweigen — AP5-01…04 sind bereits gemergt, PR #8)
**Referenz:** Dritter Spieltest (Anspielen) 2026-09-04 (Nutzer-Feedback),
`src/render/index.ts` (Abschnitt „Lesbarkeit (AP4-05): Spine-Routen,
Abschnittsschilder, Zonen-Tore", ca. Z. 488–585), `src/data/sektor.ts`
(`spineRouten`, ca. Z. 407–450), `src/sim/sektor.ts` (`SpineRoute`-Typ).

## Ausgangslage

AP4-05 hat "Leit-Spines" gebaut: farbige Polylinien (gelb/weiß/cyan) von der
Front zur Home-Line, gedacht als "Kommunikationskabel an der Grabenwand" zur
Orientierung. Nutzer-Feedback beim Anspielen: die Linien wirken wie
verwirrende "Stricke/Seile" auf den Feldern (Abschnitte A/B/C), er versteht
nicht, was sie darstellen sollen — sie stören mehr, als sie helfen. Passt
auch zum Boxhead-Kurs: weniger erklärungsbedürftiges Lesbarkeits-Feature,
mehr Klarheit.

## Ziel

Die Polylinien (`MeshBuilder.CreateLines`, die "Stricke") aus dem Renderer
entfernen. Die Pfosten (`spineP_*`, kleine Boxen) und die geometrischen
Leitsymbole (`spineS_*`, Dreieck/Doppelstrich/Kreis) **bleiben** — die
sahen in den bisherigen Screenshots klar und wie platzierte Markierungen
aus, nicht wie Stricke, und tragen für sich schon Farbe + Symbol als
Orientierung. Falls der Nutzer beim nächsten Spieltest auch die
Pfosten/Symbole als störend empfindet, ist das ein eigener Folge-Schritt.

## Umsetzung

In `src/render/index.ts`: das `MeshBuilder.CreateLines(...)`-Mesh je Route
(`linie`, Variable `leitLinien`) nicht mehr erzeugen — Pfosten- und
Symbol-Erzeugung in derselben Schleife unverändert lassen. `leitLinien` als
Array kann entfallen, falls dadurch ungenutzt (inkl. Dispose-Aufruf
aufräumen). `SpineRoute.punkte` bleibt im Datenmodell bestehen (wird für
Pfosten-/Symbol-Positionen weiter gebraucht) — nur das gerenderte Linien-Mesh
verschwindet. Keine Änderung an `src/sim/**` nötig (reine Render-Änderung).

## Akzeptanzkriterien

- Im Spiel sind auf keinem Abschnitt (A/B/C, Feld, Home-Line) mehr die
  farbigen Linien/Stricke sichtbar.
- Pfosten + geometrische Symbole (Dreieck/Doppelstrich/Kreis) sind weiterhin
  sichtbar und an denselben Positionen wie vorher.
- `npm run dev` visuell gegengecheckt (Screenshot oder Beschreibung im
  Bericht, wie bei AP5-03/04).
- Alle Golden-/Replay-Anker unverändert (reine Render-Änderung, keine
  Sim-Logik betroffen).

## Ausdrücklich NICHT in diesem Ticket

Pfosten/Symbole entfernen · Zonensilhouetten/Kompass/Schilder anfassen ·
neue Wegfindungs-Hilfe bauen · Gegner-Klassen (→ AP5-06).

## Bericht — AP5-05

COMMIT: <Hash in der Nachricht an die Planer-Session> (Branch `arbeitspaket-5`, neu von `main` nach PR #8)
CI: <Status in der Nachricht an die Planer-Session>
TODO(Rückfrage): keine

**Nachtrag vor dem Review (Planer-Rückmeldung aus dem Anspielen):** nicht nur
die Linien, auch die Pfosten („stehen im Boden") und damit die Symbole sollen
weg — Symbole allein würden in der Luft schweben. Umgesetzt im selben Commit
(amendiert und mit `--force-with-lease` neu gepusht; der Branch trug nur diesen
einen Commit). Der Bericht beschreibt den Endstand: **die Leit-Spines sind
komplett unsichtbar, nur das Datenmodell bleibt.**

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  24 Dateien, 284 Tests (unverändert)
    Coverage src/sim: 98,58 % (unverändert — src/sim nicht angefasst)
> vite build                       ✓  dist/assets/index-*.js 6.907,9 kB │ gzip 1.533,0 kB
```

Tests: 284 (unverändert) · Coverage src/sim **98,58 %** (unverändert) · Bundle
~6,91 MB / ~1,53 MB gzip (Δ −1,2 kB roh — Linien-, Pfosten- und Symbol-Code
weg).

**Alle drei Golden-/Replay-Anker unverändert** — reine Render-Änderung, kein
Sim-Code berührt (`git diff --stat`: nur `src/render/index.ts`,
`src/ARCHITEKTUR.md`, Screenshots).

### Umsetzung

- `src/render/index.ts`: die gesamte Spine-Erzeugung entfällt — das
  `MeshBuilder.CreateLines`-Mesh je Route (die „Stricke"), die Pfosten
  (`spineP_*`), die Leitsymbole (`spineS_*`) samt `spineSymbol`-Helfer, die
  Materialien `spineMat_*`/`spinePfosten_*` und das `leitLinien`-Array mit
  seiner Dispose-Schleife. `leitMeshes`, `leitMats` und `emissivMat` bleiben,
  weil Abschnittsschilder und Zonen-Tore sie weiter nutzen; ihr Dispose ist
  unverändert. Ein Kommentar an der Stelle hält fest, warum nichts mehr
  gezeichnet wird. `LinesMesh` bleibt importiert (Tracer, AP3-02).
- `src/ARCHITEKTUR.md`: Renderer-Absatz (Spines nur noch Datenmodell) und ein
  AP5-05-Eintrag unter „Boxhead-Kern (AP5)".
- `src/sim/**`, `src/data/sektor.ts` (`spineRouten`), HUD, Kompass, Lagekarte,
  Schilder, Zonen-Tore: nicht angefasst. `SpineRoute`/`meta.spineRouten` bleiben
  als Daten für eine spätere Lesbarkeits-Lösung.

### Manuell geprüft (`npm run dev`, headless Chromium via Playwright)

Dieselbe Route wie bei AP5-03 (Seed 1, Spawn Frontgraben A), einmal **vor**
der Änderung und einmal mit dem **Endstand**, 0 Konsolenfehler; Bilder in
`tickets/erledigt/AP5-05-screenshots/`:

| Bild | Position (F3) | Blick | vorher | nachher |
|---|---|---|---|---|
| `*-01-frontgraben-A-blick-west` | (−12, −1,8, 13) | −X durch Graben A | weiße Linie schräg durch den Graben vor dem A-Schild, dazu Pfosten + weißer Doppelstrich (Route „feld-links", x −15,5) | **nur noch Graben, A-Schild und Zonen-Tor** — keine Linie, kein Pfosten, kein Symbol |
| `*-02-feld-blick-sued` | (−16, 0, 6,6) | −Z zur Home-Line | weiße Linie vom Pfosten diagonal übers Feld auf die Kamera zu (der „Strick"), Pfosten + Doppelstrich am Horizont | **leeres Feld** bis zur Home-Line-Silhouette; nur der Landmark-Pfosten des Zonen-Tors steht noch |
| `nachher-03-feld-blick-suedwest` | (−16, 0, 6,6) | −X/−Z, leicht nach unten | — | Feld und Home-Line ohne jede Markierung; Kompass oben zeigt weiter B/C/HOME |

Die gelbe Route „verbindungsgraben" lag innerhalb des Grabens (x 1,7) und die
cyanfarbene „feld-rechts" östlich — derselbe Code-Pfad, mit entfernt.

### Entscheidungen / Abweichungen vom Ticket

1. **Pfosten und Symbole ebenfalls entfernt** — auf Planer-Nachtrag nach dem
   Anspielen, im selben Commit (siehe oben). Der ursprüngliche Ticket-Wortlaut
   („Pfosten und Symbole bleiben") gilt damit nicht mehr; die Spines sind als
   Sichtbarkeit komplett weg.
2. **Keine Änderung in `src/sim/sektor.ts`**, obwohl der Doc-Kommentar zu
   `SpineRoute` weiter von „Kommunikationskabel … Polylinie" spricht: der Typ
   beschreibt Daten (Punkte, Farbe, Symbol), und die Kickoff-Vorgabe war
   `src/sim/**` unangetastet. Merkposten fürs nächste Ticket, das ohnehin in
   `sektor.ts` arbeitet.
3. **`leitMeshes`/`leitMats`/`emissivMat` behalten** — sie tragen weiterhin
   Schilder und Zonen-Tore; nur die spine-spezifischen Teile sind weg.
4. Screenshots vorher/nachher als Paar abgelegt, damit der Vergleich ohne
   Spielstart nachvollziehbar ist.

### Merkposten

- Orientierung ohne Spines: Kompass, A/B/C-Schilder, Zonen-Tore und
  Zonensilhouetten tragen jetzt allein. Ob das reicht, zeigt der Spieltest;
  `spineRouten` liegt für eine andere Darstellung (z. B. Bodenmarkierungen)
  bereit.
- Der `SpineRoute`-Doc-Kommentar in `src/sim/sektor.ts` beschreibt noch das
  Kabel (Entscheidung 2).
