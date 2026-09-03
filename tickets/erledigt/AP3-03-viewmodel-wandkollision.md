# AP3-03 — Viewmodel steckt nicht mehr in Wänden

**Status:** erledigt · `4999c6e` · reviewed 2026-09-03
**Arbeitspaket:** 3 · **Branch:** `arbeitspaket-3`
**Feedback-Bezug:** Spieltest — „wenn ich mit der Waffe in eine Wand gucke,
verschwindet die Waffe in der Wand".

## Ziel

Das Waffen-Viewmodel dringt nicht mehr sichtbar in Level-Geometrie ein, wenn man
nah an einer Wand steht oder hineinschaut.

## Umsetzung — zwei gängige Ansätze, einer reicht

**A) Depth-getrennter Render-Pass (bevorzugt, robust):** Das Viewmodel in einer
eigenen `renderingGroupId` mit geleertem Tiefenpuffer zeichnen (bzw. eine zweite
Kamera mit engem FOV nur fürs Viewmodel), sodass es immer *über* der Welt liegt.
Standardlösung in FPS. Kein Zusammenspiel mit der Sim nötig.

**B) Rückzug per Raycast:** Kurzer Raycast von der Kamera nach vorn; ist Geometrie
näher als die Viewmodel-Länge, Viewmodel entlang der Blickachse heranziehen /
absenken. Einfacher, aber „Waffe zuckt".

Ansatz A umsetzen, außer es spricht etwas dagegen (dann `// TODO(Rückfrage)`).

- Reiner Renderer-Job (`src/render/`). Keine Sim-Änderung.
- Viewmodel bleibt grob (Boxen) — es geht nur ums Nicht-Clippen.

## Akzeptanzkriterien

- Direkt vor einer Wand / beim Hineinschauen bleibt das Viewmodel sichtbar und
  vor der Wand.
- Kein Z-Fighting, keine Artefakte an Kanten.
- Der Rest der Szene rendert unverändert (Reihenfolge/Transparenz der HP-Balken
  etc. nicht kaputt).
- Manuell im Browser geprüft (Screenshots), keine Konsolenfehler.
- Alle Checks grün.

---

## Bericht — AP3-03

COMMIT: `4999c6e` (Branch `arbeitspaket-3`)
CI: CI = success, Pages Preview = success — beide auf `4999c6e`.
TODO(Rückfrage): keine neuen.

Checks: typecheck / lint / format:check / test:coverage / build — alle grün.
Tests: 98 (13 Dateien, unverändert — reiner Renderer-Job) · Coverage src/sim:
97,90 % · Bundle index-\*.js ~6,87 MB / ~1,52 MB gzip (Δ vernachlässigbar).

### Umsetzung — Ansatz A (Depth-getrennter Render-Pass)

`src/render/index.ts`, drei benannte Render-Gruppen:

| Gruppe | Inhalt | Tiefenpuffer |
|---|---|---|
| `GROUP_WORLD` (0) | Level-Boxen, Gegner, Gegner-HP-Balken, Tracer | normale Tiefenprüfung |
| `GROUP_VIEWMODEL` (1) | Viewmodel + Mündungsblitz | vor der Gruppe geleert → liegt immer über der Welt |
| `GROUP_SCREENFX` (2) | Bildschirm-Effekt (Schaden/Tod) | vor der Gruppe geleert → ganz oben |

- `scene.setRenderingAutoClearDepthStencil(1, true, true, true)` und `(2, …)` —
  Babylon leert den Tiefenpuffer vor Gruppe 1 und 2. Das Viewmodel bekommt
  damit seinen eigenen Tiefenraum und wird nach der Welt gezeichnet → kein
  Eindringen in Geometrie, kein Z-Fighting (die Welt schreibt gar nicht mehr in
  denselben Tiefenbereich).
- `viewmodel.renderingGroupId = 1`, `muzzle.renderingGroupId = 1` (sonst steckt
  der Blitz beim Schuss aus nächster Nähe in der beschossenen Wand),
  `screenFx.renderingGroupId = 2` (vorher `1` — der Tod-/Schaden-Effekt soll die
  Waffe mit-abdunkeln, also über dem Viewmodel liegen).
- Level-Meshes explizit auf `GROUP_WORLD` gesetzt (Dokumentation der Absicht;
  Default ist ohnehin 0).
- Tracer bleibt in Gruppe 0: er soll von echter Geometrie verdeckt werden.

Kein zweites Kamera-Objekt nötig — die eine Tiefenpuffer-Leerung reicht und ist
billiger. Keine Sim-Berührung.

### Entscheidungen / Abweichungen vom Ticket

1. **Mündungsblitz in dieselbe Gruppe wie das Viewmodel gehoben.** Nicht
   ausdrücklich gefordert, aber sonst hätte AP3-02 einen neuen Clip-Fall
   (Blitz in der Wand). Konsistent mit „Viewmodel liegt über der Welt".
2. **`screenFx` von Gruppe 1 auf 2.** Damit die drei Ebenen sauber gestapelt
   sind (Welt < Waffe < Bildschirm-Effekt). Vorher lag `screenFx` mit dem
   künftigen Viewmodel in derselben Gruppe — funktioniert wegen der
   Opak-vor-Transparent-Sortierung auch, ist aber weniger eindeutig.
3. **Kein Test.** Projekt-Konvention: Babylon-Rendering wird nicht unit-getestet
   (flaky). Verifikation über Screenshots (siehe unten).

### Manuell geprüft

Headless Chrome (SwiftShader) via CDP, `npm run dev`, Spieler per Tastatur an
den Parapet gefahren (Position 11.55 / 14.15, Blick frontal in die Wand):

- **Vorher** (Stand vor diesem Commit): Viewmodel komplett in der Wand
  verschwunden.
- **Nachher**: Viewmodel liegt sauber und vollständig vor der Wand, keine
  Kanten-Artefakte, kein Z-Fighting.
- Screenshots `ap3-03_vorher.png` / `ap3-03_nachher.png` an den Nutzer geschickt.
- Gegner-HP-Balken (Billboard, Gruppe 0) und Welt-Tiefensortierung unverändert
  korrekt; HUD/Fadenkreuz/Wellen-Leiste unberührt. 0 Konsolen-Errors/Exceptions
  über alle Testläufe.

---

## Review — AP3-03 · 2026-09-03

Verdikt: **grünes Licht**.
Geprüft: alle Checks grün (98 Tests, Renderer-only), CI grün auf `4999c6e`.
Render-Diff gelesen — Ansatz A sauber umgesetzt: drei Rendering-Gruppen (0 Welt/
Gegner/HP-Balken/Tracer · 1 Viewmodel+Mündungsblitz · 2 Screen-FX),
`setRenderingAutoClearDepthStencil` vor Gruppe 1 und 2. Standard-FPS-Lösung,
kein zweites Kamera-Objekt, keine Sim-Berührung. Tracer bewusst in Gruppe 0
(soll verdeckt werden), Mündungsblitz mit ins Viewmodel (sonst Clip in der
beschossenen Wand — Folge aus AP3-02).
Anmerkungen: Die 3 Abweichungen sind alle vertretbar und gut begründet.
Vorher/Nachher-Screenshots vom Worker an den Nutzer.
Folge-Ticket: AP3-04 (HP-Balken — HP-Balken liegen jetzt explizit in Gruppe 0,
das stört den AP3-04-Fix nicht).
