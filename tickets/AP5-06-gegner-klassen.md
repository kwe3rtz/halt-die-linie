# AP5-06 — Gegner-Klassen: Normal / Schnell-Schwach / Langsam-Stark (Nachzügler zu AP5)

**Status:** offen
**Arbeitspaket:** 5 (Nachzügler) · **Branch:** `arbeitspaket-5` (von `main`)
**Referenz:** Dritter Spieltest (Anspielen) 2026-09-04 (Nutzer-Feedback),
`KONZEPT.md` §5 (Gegner-Roster — die *volle* Ausbaustufe mit KI-Rollen bleibt
`BACKLOG.md`/AP6+, hier NICHT gemeint), `src/data/gegner.ts` (`gegnerDefs`),
`src/data/schema.ts` (`EnemyDef`), `src/sim/wave.ts` (Spawn-Queue,
`STANDARD_GEGNER`), `src/sim/index.ts` (`spawnEnemyById`), `src/render/index.ts`
(`makeEnemyVisual`, Gegner-Material).

## Ausgangslage

Bisher gibt es genau einen Gegnertyp (Linieninfanterie, `src/data/gegner.ts`),
identisch in Tempo/HP/Schaden bis auf den AP5-04-Tempo-Jitter (±15 %, reiner
Zufall, keine Varianten). Nutzer-Feedback: mehr Abwechslung würde helfen —
konkret vorgeschlagen als 2–3 einfache Klassen statt neuer KI-Verhalten:
**normal**, **schnell, aber schwächer**, **langsam, aber stärker**.

## Ziel

Drei `EnemyDef`-Varianten der Linieninfanterie (gleiches Verhalten,
unterschiedliche Werte + Erkennbarkeit), zufällig gemischt in den Wellen.
Ausdrücklich **keine** neue KI-Rolle/kein neues Bewegungs- oder
Angriffsverhalten (das bleibt `verhaltensTag: "feuer-und-bewegung"` /
AP2-Nahkampf wie bisher) — nur Statistik-Varianten des bestehenden Gegners,
wie beim Nutzer angefragt. Der volle Roster-Ausbau mit eigenen KI-Rollen
(Charger/Suppressor/Disruptor) bleibt explizit spätere Arbeit.

## Umsetzung

**Daten** (`src/data/gegner.ts`): zwei weitere `EnemyDef`-Einträge neben
`linieninfanterie`, z. B. `id: "linieninfanterie-schnell"` (Tempo hoch,
HP/Schaden niedriger) und `id: "linieninfanterie-schwer"` (Tempo niedrig,
HP/Schaden höher) — Ausgangswerte relativ zur Basis (`tempo: 1, hp: 100,
schaden: 10`), z. B. schnell ≈ `tempo 1.5, hp 70, schaden 7`, schwer ≈
`tempo 0.65, hp 160, schaden 16` (Platzhalter wie alle Balance-Zahlen im
Projekt, im Spieltest justieren). Alle drei in `gegnerDefs` registrieren.
**Wichtig:** nicht zu schnell (Nutzer-Hinweis) — die schnelle Klasse soll
spürbar, aber nicht unfair schnell sein; bei `BASIS_TEMPO = 2,6 m/s`
(`enemies.ts`) und Spieler-Sprint 7 m/s bleibt deutlich Luft.

**Wave-Director** (`src/sim/wave.ts`): `STANDARD_GEGNER`-Konstante ersetzen
durch eine gewichtete Auswahl über die drei Ids (z. B. 60 % normal, 20 %
schnell, 20 % schwer — Platzhalter-Gewichte), gezogen aus dem bestehenden
Director-`Rng` (`ctx.rng`, goldene Regel: kein neuer globaler Zufall). Sowohl
Hauptwellen- als auch Reservewellen-Spawns nutzen dieselbe Auswahl.

**Render** (`src/render/index.ts`, `makeEnemyVisual`/Gegner-Material):
minimale visuelle Unterscheidung, damit die Klassen im Spiel erkennbar sind
(kein neues Modell nötig, reines Greybox-Niveau) — z. B. Materialfarbe je
`defId` (dezente Tönung, nicht grell) oder Kapsel-Radius/-Höhe leicht
skaliert. Sollte klar genug sein, dass ein Spieler mit etwas Übung "das ist
der schnelle" erkennt, ohne die HP-Balken-Anzeige zu ersetzen.

## Akzeptanzkriterien

- Drei Gegner-Varianten existieren als `EnemyDef`, mit klar unterschiedlichen
  Tempo-/HP-/Schaden-Werten (schnell = spürbar schneller aber schwächer,
  schwer = spürbar langsamer aber stärker als normal).
- Wellen mischen alle drei Klassen (Test: über eine ausreichend große
  Spawn-Stichprobe kommen alle drei Ids vor, Verteilung ungefähr im Rahmen
  der gewählten Gewichte).
- Visuell im Spiel unterscheidbar (Screenshot/Beschreibung im Bericht).
- Bestehendes Bewegungs-/Nahkampfverhalten (`enemies.ts`) unverändert — nur
  `def.tempo`/`def.hp`/`def.schaden` wirken unterschiedlich, keine neue
  Verzweigung nach Gegnertyp in der Bewegungslogik.
- Golden-/Replay-Anker: durch die neue Zufallsziehung (welche Klasse spawnt)
  wahrscheinlich erneut betroffen — wie in AP5-04 bewusst neu baselinieren,
  mit Begründung direkt am Test, keine stillschweigende Anpassung.

## Ausdrücklich NICHT in diesem Ticket

Neue KI-Rollen/-Verhalten (Charger/Suppressor/Disruptor, `BACKLOG.md`) ·
Fernkampf-Gegner · echte 3D-Modelle/Texturen · Elite-/Konter-Härte-System
(§5 „nur Spreng/AT") · Tag/Nacht · Balancing der Front-/Bresche-/Uhr-Zahlen.
