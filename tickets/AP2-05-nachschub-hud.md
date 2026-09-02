# AP2-05 — Nachschub-Zähler & minimales HUD

**Status:** offen
**Arbeitspaket:** 2 · **Branch:** `arbeitspaket-2`
**Abhängigkeiten:** AP2-01 … AP2-04
**Vorbedingung:** `AUFGABEN.md` gelesen. Goldene Regel gilt.
**Referenz:** `KONZEPT.md` §7 (Nachschub als Einsatz-Währung), Debug-Overlay
(`src/ui/debug.ts`) als Muster.

## Ziel

Ein kleines echtes HUD (getrennt vom F3-Debug-Overlay), das den Spielstand
zeigt. `Nachschub` als Sim-Wert. Damit ist AP2 spielbar und lesbar.

## Umsetzung

**Sim (`src/sim`):**
- `SimState` um `nachschub: number` (falls in AP2-03 noch nicht angelegt).
  Gutschrift pro Kill (Wert grob aus dem `EnemyDef` ableiten oder Platzhalter).
  Ausgeben kann man ihn in AP2 noch nicht — nur zählen.

**UI (`src/ui`):**
- `src/ui/hud.ts` — reines DOM + CSS, **kein** Babylon-GUI, eigene Komponente
  neben `debug.ts`. Zeigt:
  - HP-Balken (aktuell/max)
  - Munition: `imLauf / reserve`, plus „Nachladen…" während `reloading`
  - Welle: Nummer + Phase; `angriffskraftRest` als kleiner Balken
  - Nachschub: Zahl
  - Bei `player.tot`: „Gefallen — Respawn in Ns" mittig
- Wird in `main.ts` verdrahtet, bekommt den Sim-State pro Frame über den
  vorhandenen `onFrame`-Haken (nicht selbst pollen).
- Sichtbar auch bei aktivem Pointer-Lock. Dezent, oben/unten am Rand, stört die
  Bildmitte nicht.
- `prefers-reduced-motion` respektieren (keine pulsierenden Effekte dann).

## Akzeptanzkriterien

- HUD zeigt HP, Munition, Welle, Nachschub live und korrekt; „Nachladen"-Zustand
  erscheint während des Reloads.
- Nachschub steigt bei Kills.
- Tod-Overlay mit Countdown; verschwindet beim Respawn.
- HUD bleibt bei Pointer-Lock sichtbar; F3-Debug-Overlay funktioniert unabhängig
  weiter.
- Vitest `src/ui/hud.test.ts` (jsdom): rendert, aktualisiert Werte, Tod-Zustand.
- Alle Checks grün, goldene Regel gehalten.

## Nach AP2-05

Kurzer PR-Text-Vorschlag für `arbeitspaket-2` → `main`. Danach: Design-Runde
„prozedurale Sektor-Erzeugung" (mit dem Nutzer), dann AP3.
