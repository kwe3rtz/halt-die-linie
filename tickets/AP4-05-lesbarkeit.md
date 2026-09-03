# AP4-05 — Lesbarkeit: Silhouetten, Spine, Schilder, Kompass, Audio

**Status:** offen
**Arbeitspaket:** 4 · **Branch:** `arbeitspaket-4`
**Referenz:** `KONZEPT.md` §3 („Lesbarkeit im First-Person-Graben"),
`SPARRING-ANTWORTEN.md` → „Runde 2" (Spine an die **Wand** + redundant codiert;
direktionales Audio Pflicht; Kompass nur strategische Zustände, keine
Gegner-Marker).

## Ziel

Man findet sich im Sektor zurecht, ohne Minikarte: unterscheidbare Zonen, ein
Leit-„Spine" an der Wand, Schilder, ein Kompass mit den Frontzuständen und
richtungsgebundenes Audio bei Abschnittsverlust und im Finale.

## Umsetzung

**Render (`src/render`):**

- **Zonensilhouetten** schärfen: klare Höhen-/Formsprünge zwischen Labyrinth
  (eng, niedrig), Front (Parapet-Linie), Feld (offen, weit), Home (hohe
  Betonsilhouette). Weiter Platzhalter-Geometrie, aber auf Wiedererkennung
  gebaut.
- **Spine:** an der Grabenwand auf ~Brusthöhe ein durchgehendes Band (Kabel +
  Pfosten) von jedem Frontabschnitt zur Home-Line — **je Route eigene Farbe UND
  eigenes geometrisches Symbol** (Dreieck / Doppelstrich / Kreis), für Nacht /
  Farbsehschwäche / gedämpfte Palette. Polylinien je Route aus `SektorMeta`
  (neues Feld `spineRouten: { id, farbe, symbol, punkte: Vec3[] }[]`).
- **Schilder:** Frontabschnitt-Nummern (A/B/C) an den Zugängen — Platzhalter-Quads
  mit Text-Textur oder einfaches Mesh.
- **Landmark** bleibt der Fixpunkt fürs Auge.

**UI (`src/ui`):**

- **Kompass**-Band oben: „HOME"-Marker + je Frontabschnitt ein Marker, dessen
  Zustand (`bedraengt` / `gebrochen` / `verloren`) über Farbe **und** Symbol
  codiert ist. **Keine Gegner-Marker.**
- **Lagekarte** (Taste `M`): statisches Sektor-Schema mit Abschnitts-Zuständen —
  Status, keine Echtzeit-Navigation. Wenn der Umfang knapp wird: `// TODO` und
  nur den Kompass liefern.
- Rückzug-/Finale-Texte aus AP4-04 ins richtige HUD gießen (Countdown, „Home-Line
  hält/fällt").

**Audio (`src/audio`, neu — minimal):**

- Kleiner WebAudio-Wrapper, **rein Client, außerhalb der Sim**. Reagiert auf
  Sim-Events (Abschnitt `verloren`, Phase `finale`): **Signalhorn aus Richtung
  Home-Line** (Panning grob nach relativer Richtung Spieler→Home), Truppen-Ruf-
  Stub. Platzhalter-Töne genügen. Stummschaltbar.
- Feste **Callout-Grammatik** als String-Konstanten: Front `A`/`B`/`C`, Route
  `verbindungsgraben` / `feld-links` / `feld-rechts` — später von echtem
  Funk/VO genutzt.

## Akzeptanzkriterien

- Ein Tester findet ohne Erklärung von einem beliebigen Frontabschnitt zur
  Home-Line zurück, indem er dem Spine folgt.
- Die Zonen sind auf einen Blick auseinanderzuhalten.
- Kompass zeigt live die Frontabschnitt-Zustände; keine Gegner-Marker.
- Bei Abschnittsverlust ertönt das Signalhorn erkennbar aus Richtung Home.
- `prefers-reduced-motion` respektiert (Kompass/Overlay); Audio stummschaltbar.
- Vitest: `src/ui`-Kompass/Lagekarte (jsdom) rendert die Zustände korrekt;
  Audio-Wrapper mit gemocktem WebAudio (Event → richtiger Aufruf, richtiges
  Panning-Vorzeichen).
- `src/sim` unangetastet bzw. nur lesend; goldene Regel gehalten.

## Offene Rückfragen

Echte VO, Musik, Sounddesign-Politur = späteres Paket. Ob die Lagekarte schon in
AP4 nötig ist oder erst mit Koop: wenn knapp, nur Kompass + `// TODO(Rückfrage)`.
