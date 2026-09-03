# AP3-03 — Viewmodel steckt nicht mehr in Wänden

**Status:** offen
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
