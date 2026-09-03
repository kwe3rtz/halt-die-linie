# AP2-05 — Nachschub-Zähler & minimales HUD

**Status:** erledigt · `4a4e7b1` · reviewed 2026-09-03
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

---

## Bericht — AP2-05

COMMIT: `4a4e7b1` (Branch `arbeitspaket-2`)
CI: CI = success, Pages Preview = success — beide auf `4a4e7b1`.
TODO(Rückfrage): keine neuen. (Bestehend: `player.ts:16` HP-Regen aus AP2-02,
Pages-Hinweis in `ARCHITEKTUR.md` aus AP1.)

Checks: typecheck / lint / format:check / test:coverage / build — alle grün.
Tests: 95 (13 Dateien) · Coverage src/sim: **97,65 %** (math.ts jetzt 100 %,
alle Module ≥ 92 %) · Bundle index-\*.js ~6,87 MB / ~1,52 MB gzip (Δ ~+3 KB).

Umsetzung:

- `src/ui/hud.ts` (`createHud`): reines DOM + injizierter `<style>`, kein
  Babylon-GUI, eigene Komponente neben `debug.ts`. `position: fixed; inset: 0;
  pointer-events: none`, `z-index` 2147483646 (knapp unter dem F3-Overlay).
  Zeigt: HP-Balken + Zahl (unten links), Munition `imLauf / reserve` + „Nachladen…"
  bei `reloading` (unten rechts), Welle + Phase + `angriffskraft`-Balken +
  Nachschub (oben Mitte), Tod-Overlay „Gefallen / Respawn in N s" (mittig, nur
  bei `player.tot`). Bar-Übergänge nur unter
  `@media (prefers-reduced-motion: no-preference)`.
- `src/sim/index.ts`: `SimState.player.respawnRest` und
  `SimState.wave.angriffskraftMax` ergänzt (HUD braucht Countdown + Balken-Maß).
- `src/main.ts`: HUD im vorhandenen `onFrame`-Haken verdrahtet (ein
  `sim.getState()` pro Frame für Debug-Overlay + HUD).
- `src/ui/index.ts`: Barrel um `hud` ergänzt.
- Tests:
  - `src/ui/hud.test.ts` (7, jsdom): Mount + `pointer-events`, Werte-Update,
    „Nachladen…"-Zustand, Aufbau ohne Wellen-Zähler, Tod-Overlay + Countdown +
    Verschwinden beim Respawn, Unabhängigkeit vom F3-Debug-Overlay, `dispose`.
  - `src/sim/math.test.ts` (4): alle Vektor-Helfer inkl. `dirFromYawPitch` →
    math.ts 100 %.
  - **Golden-/Replay-Test** in `sim.test.ts` (`describe("golden replay")`):
    Seed 20260903 + fixe 360er-Kommandosequenz (Bewegung/Look/Fire/Reload/Jump)
    auf einem Welt-mit-`waves`-Setup. Zwei Läufe → `toEqual` (Determinismus) +
    Golden-Anker auf ~10 Kennwerte (Position, yaw/pitch, Munition, Welle,
    Angriffskraft, Gegnerzahl) — bricht bei stiller Verhaltensänderung.

Entscheidungen / Abweichungen vom Ticket:

1. **`respawnRest` + `angriffskraftMax` neu im `SimState`.** Das HUD braucht den
   Countdown-Wert und das Balken-Maximum; beides war noch nicht exponiert.
   Eingefroren wie der Rest.
2. **Golden-Anker zusätzlich zum `toEqual`.** Reine Determinismus-Prüfung fängt
   keine gleichmäßige Verhaltensänderung — der Anker mit konkreten Zahlen (aus
   einem echten Lauf) schon. Kein Snapshot-File (Prettier/Parser-Fragen), sondern
   `toBeCloseTo`/`toBe`.
3. **Tod-Overlay hat einen eigenen dezenten Abdunkler.** Der Renderer dunkelt im
   Tod ohnehin ab; das HUD-Overlay bleibt trotzdem selbst-tragend (falls der
   Render-Effekt sich ändert). Zusammen etwas dunkel, Text klar lesbar.
4. **HUD hört auf keine Tasten.** Immer sichtbar (auch bei Pointer-Lock), F3
   steuert nur `debug.ts`. Test deckt die Unabhängigkeit ab.

Manuell geprüft (headless Chromium): HUD live — Aufbau „HP 100/100 · Aufbau ·
Nachschub 0", dann „Welle 1 · Angriff", HP sinkt unter Beschuss auf 0 →
„Gefallen / Respawn in 3 s" mittig; F3 blendet das Debug-Overlay aus, HUD bleibt.
Keine Konsolenfehler.

---

## Review — AP2-05 · 2026-09-03

Verdikt: **grünes Licht**. Damit ist **Arbeitspaket 2 komplett**.
Geprüft: lokal typecheck/lint/format/test grün (95 Tests, 13 Dateien), CI grün
auf `4a4e7b1`, Coverage src/sim 97,65 % (alle Module ≥ 92 %, `math.ts` jetzt
100 %). `hud.ts` gelesen — reines DOM/CSS, `pointer-events:none`, `aria-hidden`,
`prefers-reduced-motion` korrekt (opt-in zur Transition), `update()` bekommt
alles übergeben, keine Tasten. Golden-Replay-Test gelesen — zwei Läufe `toEqual`
plus ~13 konkrete Golden-Anker (`toBeCloseTo(…,3)`), bricht bei
Verhaltensänderung. Der `math.ts`-Coverage-/Replay-Test-Merk-Posten ist damit
erledigt.
Anmerkungen: Die 4 Abweichungen sind alle vertretbar. Keine offenen Punkte.
Folge: PR `arbeitspaket-2` → `main` (`--no-ff`), dann Design-Runde „prozedurale
Sektor-Erzeugung" mit dem Nutzer, dann AP3.
