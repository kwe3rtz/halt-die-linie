# AP6-04 — „Instand setzen": gefallene Linie zurückerobern

**Status:** offen (wird nach AP6-01/02 verfeinert)
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**Referenz:** `KONZEPT.md` §3 („Eine gefallene Linie zurückerobern — Instand
setzen") + §6 + §9 Punkt 5, `src/sim/front.ts` (`rueckerobern`,
Linienzustände aus AP6-02), `src/sim/index.ts` (`E`/`Q` als edge-getriggerte
`InputCommand`s aus AP4-06, `player.depotInReichweite`-Muster),
`src/sim/sektor.ts` (Instandsetzungs-Punkte aus AP6-01), `src/sim/wave.ts`.

## Ausgangslage

`front.ts` hat schon `rueckerobern` als Zustandsübergang. AP6-01 legt an
Frontlinie **und** Home-Line je einen **Instandsetzungs-Punkt** (feste
Marker-Position) an. Dieses Ticket baut die **Interaktion**: wie der Spieler
eine gefallene Linie tatsächlich zurückholt.

## Konzept (BESCHLOSSEN, `KONZEPT.md` §3)

Pionier-artige Interaktion an einem **festen Punkt** der gefallenen Linie:

- Kostet **Zeit** (mehrere Sekunden gehalten, nicht ein Tastendruck).
- **Exponiert** den Spieler: verlangsamt / bindet ihn, er kann nicht
  gleichzeitig kämpfen.
- **Zieht Gegner an**: während der Instandsetzung strömen Gegner gezielt
  zu diesem Punkt (erhöhter Spawn / Umleitung der aktuellen Welle).
- Jederzeit möglich, aber **jeder Versuch kostet echt** — Abbruch (Treffer,
  weglaufen) = Fortschritt verloren oder stark reduziert.
- Erfolg → Linie kippt zurück auf `stabil`/`bedraengt`, Spawn-Staffel rückt
  wieder nach vorn zur Feindseite (AP6-03), Depot der Linie ist wieder da.
- **Kein** ständiges Hin-und-Her-Erobern: nach erfolgreicher Instandsetzung
  kurze Immunität / die Linie fällt nicht sofort wieder.

## Umsetzung (Richtung — Details nach AP6-01/02)

- **`sektor.ts`:** `instandPunkt` je Linie (Position + Reichweite, analog
  `DEPOT_REICHWEITE`). AP6-01 hat die Marker schon; hier die Sim-Daten.
- **`index.ts`:** neuer Zustand `player.instandInReichweite` +
  `player.instandFortschritt` (0..1). `E` (oder eigene Taste) hält die
  Interaktion; Loslassen/Treffer/Distanz bricht ab. Fortschritt/s als
  Konstante. Bei 1.0 → `rueckerobern` auf der Linie auslösen.
- **`wave.ts`:** solange `instandFortschritt > 0`: laufende Welle zieht zum
  `instandPunkt` (Nav-Ziel-Override) + leicht erhöhter Spawn. Nach Erfolg
  oder Abbruch zurück auf normal.
- **`front.ts`:** kurze `geschuetzt`-Phase nach `rueckerobern` (Linie kann
  N Sekunden nicht auf `bedraengt` fallen).
- Bewusst **schlicht** halten: kein Werkzeug-Inventar, keine KI-Trupps (das
  ist §9.5 „offen", später). Ein Punkt, eine Taste, ein Fortschrittsbalken.

## Tests

- `front.test.ts`: `rueckerobern` + `geschuetzt`-Phase.
- Neuer Sim-Test: Linie fallen lassen, Spieler an den `instandPunkt` stellen,
  Interaktion halten → Linie kommt zurück; Interaktion mit Treffer abbrechen
  → Fortschritt verloren, Linie bleibt `verloren`.
- Golden-Anker prüfen; wenn betroffen bewusst neu baselinieren + Gegenprobe.
- Headless-Einsatz: Front fällt → instand setzen → weiter bis „gewonnen".

## Akzeptanzkriterien

- Gefallene Frontlinie ist am Instandsetzungs-Punkt per gehaltener Taste
  zurückzuerobern; währenddessen strömen Gegner dorthin; Abbruch kostet.
- HUD zeigt den Fortschritt.
- Alle Checks grün.

## Ausdrücklich NICHT

Werkzeug-/Ressourcenkosten, KI-Trupps, mehrere Instandsetzungs-Punkte pro
Linie (§9.5 offen) · Roam (AP6-05) · Generator · Tag-Modus.
