# Halt die Linie

Ein kleines, spielbares TD-Prototyp-Skelett im Stil eines Grabenkriegs-Defensespiels. Der Kern fokussiert sich auf eine horizontale Grabenlinie mit mehreren Abschnitten, die die Angreifer direkt durchbrechen wollen.

## Spielidee

- Gegner laufen aus mehreren Ausstiegspunkten direkt auf die Grabenabschnitte zu.
- Die Linie ist in einzelne Segmente unterteilt, die unabhängig beschädigt werden.
- Türme richten sich an WW1-ähnlichen Verteidigungsanlagen aus: MG-Nest, Artillerie, Scharfschütze, Stacheldraht, Scheinwerfer und Flak.
- Flieger sind nur mit Flak zu treffen, Kavallerie wird durch Stacheldraht hart gebremst.

## Ausführen

Im Projektordner:

```bash
python3 -m http.server 8000
```

Danach in einem Browser öffnen:

```text
http://localhost:8000
```

## Steuerung

- Gewählte Verteidigungsanlage anklicken, dann auf dem Schlachtfeld platzieren.
- Welle starten über den Button in der Seitenleiste.
- Pause zwischen Wellen oder im Spiel mit dem Pause-Button.

## Hinweis

Das Projekt ist bewusst ein kompaktes, funktionales Prototyp-Gerüst und kein fertig ausgebautes Vollspiel. Es zeigt die Kernmechanik der "Halt-die-Linie"-Idee mit klarer WW1-Gefechtslogik.
