# AP3-01 — Fadenkreuz & Trefferbestätigung

**Status:** review
**Arbeitspaket:** 3 · **Branch:** `arbeitspaket-3`
**Feedback-Bezug:** Spieltest — „kein Crosshair, wusste nicht wohin ich schieße".

## Ziel

Ein Fadenkreuz in der Bildmitte und eine kurze Rückmeldung, wenn ein Schuss
einen Gegner trifft. Rein visuell — keine Sim-Änderung außer ggf. einem
„Treffer war tödlich / war Gegner"-Flag, das es schon gibt (`SimState.lastShot`,
`WeaponHit.enemyId`).

## Umsetzung

- **Fadenkreuz** in `src/ui/hud.ts` (oder ein kleines eigenes Element): schlichtes
  statisches Kreuz/Punkt in der exakten Bildmitte, DOM/CSS, `pointer-events:
  none`. Dezent, zum schematischen Ton passend (dünn, gedeckte Farbe, leichter
  Schatten für Lesbarkeit auf hellem Grund).
- **Hitmarker:** wenn `lastShot` einen Gegner-Treffer meldet, kurz (~120 ms) ein
  kleines „X"/Spreizen am Fadenkreuz einblenden. Bei tödlichem Treffer optisch
  etwas kräftiger.
- `prefers-reduced-motion` respektieren (kein Zappeln — dann nur hart ein/aus).

## Akzeptanzkriterien

- Fadenkreuz sitzt exakt mittig, auf jeder Fenstergröße, über dem Canvas, unter
  dem F3-Overlay.
- Trefferbestätigung erscheint nur bei Gegner-Treffern, nicht bei Wand-Treffern.
- Vitest (`src/ui/*.test.ts`, jsdom): Fadenkreuz vorhanden, Hitmarker toggelt
  auf ein Treffer-Signal.
- Alle Checks grün, goldene Regel gehalten.

---

## Bericht — AP3-01

COMMIT: <wird beim Merge/Archiv ergänzt> (Branch `arbeitspaket-3`)
CI: grün / grün (Hash in der Nachricht an die Planer-Session)
TODO(Rückfrage): keine neuen.

Checks: typecheck / lint / format:check / test:coverage / build — alle grün.
Tests: 97 (13 Dateien) · Coverage src/sim: **97,66 %** (index.ts 99,22 %) ·
Bundle index-\*.js ~6,87 MB / ~1,52 MB gzip (Δ vernachlässigbar, nur Sim-Flags).

Umsetzung:

- **`src/ui/hud.ts`** — Fadenkreuz + Trefferbestätigung ins bestehende HUD-Root
  (kein neues Overlay, damit die z-Index-/`pointer-events`-Regeln von AP2-05
  gelten):
  - `.hdl-hud__crosshair`: schlichtes dünnes „+" (2 px, gedeckt `rgba(230,236,224,
    .82)`, 1 px Schatten) exakt in Bildmitte (`left/top: 50%` + `translate(-50%,
    -50%)`), rein CSS über `::before`/`::after`. Verschwindet im Tod
    (`--hidden`).
  - `.hdl-hud__hit`: vier Speichen (um 45° gedreht) am Fadenkreuz, `opacity: 0`
    im Ruhezustand. Bei Gegner-Treffer `--on` für **120 ms** (`setTimeout`,
    danach hart aus), bei tödlichem Treffer zusätzlich `--kill` (kräftiger,
    rot-orange). Opacity-Transition nur unter `prefers-reduced-motion:
    no-preference` — sonst hartes Ein/Aus.
  - Neue Erkennung: `HudData.lastShot` (= `SimState["lastShot"]`); ein Schuss
    wird über seinen `tick` genau einmal ausgewertet (`hitSeenTick`).
    `dispose()` räumt den Timer ab.
- **`src/sim/index.ts`** — `ShotEvent` um zwei reine Bool-Flags erweitert:
  `gegnerTreffer` (Strahl traf eine Gegner-Kapsel, nicht nur Level-Geometrie)
  und `toedlich` (dieser Treffer hat den Gegner gelegt — aus dem Rückgabewert
  von `damageEnemy`). Reihenfolge im `fire`-Block minimal umgestellt, damit die
  Flags vor dem `Object.freeze` feststehen. Keine Verhaltensänderung an
  Schaden/Nachschub.
- **`src/main.ts`** — `state.lastShot` in die `hud.update(...)`-Daten
  aufgenommen (ein `sim.getState()` pro Frame, schon vorhanden).
- Tests `src/ui/hud.test.ts` (+2, jetzt 9): Fadenkreuz zentriert + `position:
  absolute` + verschwindet/kommt mit `tot`; Trefferbestätigung geht **nur** bei
  `gegnerTreffer` an (Wand-Treffer → aus), `--kill` nur bei `toedlich`; jeder
  Schuss-`tick` triggert einmal.

Entscheidungen / Abweichungen vom Ticket:

1. **`ShotEvent` statt neuem `SimState`-Feld.** Das Ticket nannte `WeaponHit.
   enemyId` als „gibt es schon" — die trug der nach außen sichtbare `ShotEvent`
   aber nicht. Zwei Bool-Flags am bestehenden Event sind minimal-invasiv und
   deterministisch; keine neue Sim-Mechanik.
2. **Fadenkreuz in `hud.ts`, nicht als eigenes Element.** Das Ticket ließ beides
   zu. So erben Crosshair + Hitmarker automatisch `pointer-events: none`,
   `aria-hidden` und den z-Index knapp unter dem F3-Overlay.
3. **Fadenkreuz blendet im Tod aus.** Nicht gefordert, aber es gibt im
   Respawn-Overlay nichts zu zielen; eine Zeile, konsistent mit dem
   Render-Abdunkler.
4. **120-ms-Timer per `setTimeout`** (HUD hat kein `dt`). In `dispose()`
   abgeräumt.

Manuell geprüft (headless Chrome, SwiftShader, `npm run dev`): Fadenkreuz sitzt
mittig auf 1280×800 exakt auf dem Canvas-Mittelpunkt, dünn und dezent, unter dem
F3-Overlay, über dem Canvas. Hitmarker/tödlich nur über die jsdom-Tests geprüft
(braucht Pointer-Lock + Gegner-Treffer, headless nicht steuerbar).
