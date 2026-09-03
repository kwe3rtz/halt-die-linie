# AP3-01 — Fadenkreuz & Trefferbestätigung

**Status:** offen
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
