# Prototyp — Tower-Defense-Skelett (archiviert)

Der ursprüngliche „Halt die Linie"-Prototyp: ein spielbares TD-Grundgerüst
(Vanilla JS + Canvas). Entspricht **nicht mehr dem aktuellen Konzept** (siehe
[`../KONZEPT.md`](../KONZEPT.md)) — der Tower-Defense-Kern wurde verworfen.

Bleibt als Referenz für:

- Canvas-Rendering und den Wellen-/Spawn-Loop
- WW1-Gegner- und Waffenwerte (`game.js`, Objekte `enemyTypes` / `towerDefs`)
- die „Linie in Abschnitten mit eigener HP"-Mechanik

## Starten

```bash
python3 -m http.server 8000
# http://localhost:8000/prototyp-td/
```
