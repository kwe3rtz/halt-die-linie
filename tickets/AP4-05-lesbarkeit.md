# AP4-05 — Lesbarkeit: Silhouetten, Spine, Schilder, Kompass, Audio

**Status:** review
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

---

## Bericht — AP4-05

COMMIT: <wird beim Merge/Archiv ergänzt> (Branch arbeitspaket-4)
CI: grün / grün (Hash in der Nachricht an die Planer-Session)
TODO(Rückfrage):

1. **`src/sim/sektor.ts` bekam ein reines Typ-Feld** `SektorMeta.spineRouten`
   (+ Typen `SpineRoute` / `SpineSymbol`) — keine Logik, kein Anker-Einfluss.
   Die Werte liegen in `src/data/sektor.ts` wie vom Ticket vorgesehen. Beide
   Golden-Anker sind unverändert grün (kein Sim-Verhalten berührt).
2. **Spine-Polylinien sind Greybox-Handarbeit** (`src/data/sektor.ts`
   `spineRouten`): 3 Routen `verbindungsgraben` (gelb / Dreieck),
   `feld-links` (weiß / Doppelstrich), `feld-rechts` (cyan / Kreis), je ~5
   Punkte Front→Home auf Brusthöhe (Graben y≈−0,5, Feld y≈1,0). Im Spieltest
   nachziehen, ob die Linie am Gelände „klebt".
3. **Zonensilhouette = Farbe + Zonen-Tore, keine Geometrieänderung.** `ZONEN_TON`
   kontrastreicher (Labyrinth erdig-dunkel, Front sandhell, Feld oliv,
   Verbindungsgraben/Home kühl); dazu render-only Pylon-„Tore" an den zwei
   Rückzugs-Übergängen (Front→Feld z≈10, Feld→Home z≈−20). Echte Höhen-/
   Formsprünge bräuchten Geometrie-Arbeit = Generator/eigenes Ticket.
4. **Schilder** = `DynamicTexture` mit dem Buchstaben auf einem Y-Billboard-Quad
   an der Grabenlinie je Abschnitt (`x = Abschnittsmitte, z ≈ 9,5`).
5. **Lagekarte gebaut** (nicht nur TODO) — statisches Schema, Taste **M**,
   Front-/Home-Zellen nach Zustand (Farbe + Text), Einsatzphase im Fuß. Kein
   Echtzeit-Nav.
6. **Kompass:** Peil-Band oben, HOME + je Frontabschnitt ein Marker, Zustand
   über `data-zustand`-Farbe **und** Glyph (▽ ▲ ◑ ✕). Marker außerhalb ±78°
   werden an den Rand gepinnt mit ‹ / › . **Keine Gegner-Marker.** Am Spawn
   (Blick nach Norden) landen B/C/HOME gemeinsam am rechten Rand — gepinnte
   Marker überlagern sich dort; vertikales Auffächern wäre Politik (`// TODO`).
7. **Audio** (`src/audio/`, reiner Client): `createAudio()` diffed den State
   (`beobachteEreignisse`, rein), spielt Oszillator-Töne — Abschnitt `verloren`
   → Signalhorn `StereoPanner` nach `panFuerPeilung(relPeilung(Spieler→Home))`,
   Phase `finale` → Signalhorn + Truppen-Ruf. Default `MASTER_GAIN 0,22` (leise),
   Taste **T** stummschaltbar (mit „🔇"-Badge). `AudioContext` wird lazy erzeugt
   und bei `suspended` `resume()`-t (Browser-Gesture-Regel). Callout-Grammatik
   `FRONT_CALLOUT` / `ROUTE_CALLOUT` als String-Konstanten.
8. **`prefers-reduced-motion`**: Kompass-Marker-Bewegung + HUD-Balken nur unter
   `@media (prefers-reduced-motion: no-preference)` animiert; sonst springt es.
9. **`entscheide`-Knopf bewusst nicht verdrahtet** (Ticket: „späteres UI-Paket");
   der HUD-Text aus AP4-04 zeigt „extrahieren oder verlängern".

Checks: typecheck / lint / format:check / test:coverage / build — **alle grün**.

```
> tsc --noEmit                     ✓
> eslint .                         ✓
> prettier --check .               ✓  All matched files use Prettier code style!
> vitest run --coverage            ✓  21 Dateien, 212 Tests (vorher 186)
    Coverage src/sim: 97,26 % Stmts / 96,28 % Branch / 100 % Funcs  (unverändert —
    src/sim nur um ein Typ-Feld ergänzt)
> vite build                       ✓  dist/assets/index-*.js 6.902,10 kB │ gzip 1.531,07 kB
```

Tests: 212 (21 Dateien, +26 — `kompass` 10 / `lagekarte` 5 / `audio` 11) ·
Coverage src/sim **97,26 %** (unverändert) · Bundle ~6,90 MB / ~1,53 MB gzip
(Δ ~+12 kB — `DynamicTexture` + UI-/Audio-Code, kein neuer npm-Import).

### Umsetzung

- **`src/sim/sektor.ts`** — `SpineSymbol` / `SpineRoute`-Typen + reines Feld
  `SektorMeta.spineRouten`. Keine Logik.
- **`src/data/sektor.ts`** — `meta.spineRouten` (3 handgepflegte Polylinien).
- **`src/render/index.ts`** — geschärfte `ZONEN_TON`; je Route Farb-Linie
  (`CreateLines`) + Pfosten + Leitsymbole (`CreateDisc` tess 3 / `CreateTorus` /
  Doppelbalken, alle billboardet, emissiv); A/B/C-Schilder (`DynamicTexture`);
  Zonen-Tor-Pylonen. Alles sauber disposed (`leitMeshes` / `leitMats` /
  `leitTexturen` / `leitLinien`).
- **`src/ui/kompass.ts`** (neu) — `createKompass()`, `relPeilung()` (rein),
  DOM-Band, Marker-Pooling, `data-zustand` + Glyph, Rand-Pinning.
- **`src/ui/lagekarte.ts`** (neu) — `createLagekarte()`, eigener `M`-Keydown
  (wie `debug.ts` F3), Front-/Home-Zellen, Einsatzphase.
- **`src/audio/index.ts`** (neu) — `createAudio()` + `beobachteEreignisse` /
  `relPeilung` / `panFuerPeilung` (rein) + Callout-Konstanten. `T`-Keydown für
  Stumm, `🔇`-Badge.
- **`src/main.ts`** — verdrahtet Kompass / Lagekarte / Audio in `onFrame`;
  `prevState` für den Audio-Diff; `homePos` aus `meta.homeZugaenge`.
- **Tests:** `kompass.test.ts` (jsdom, 10) — `relPeilung`-Vorzeichen, HOME + 3
  Marker / **keine Gegner-Marker**, Farbe+Glyph redundant, yaw verschiebt,
  Rand-Pinning, `setVisible`. `lagekarte.test.ts` (jsdom, 5) — `M`-Toggle,
  Zellen nach Zustand, Fuß-Text (inkl. Ergebnis), No-op wenn versteckt, dispose.
  `audio/index.test.ts` (jsdom + WebAudio-Mock, 11) — Peilung/Pan-Vorzeichen,
  `beobachteEreignisse` (Front/Home `verloren`, `finale`, einmalig), `beobachte`
  pannt mit korrektem Vorzeichen, `setStumm` erzeugt keinen Context, `T`-Toggle.
- **`src/ARCHITEKTUR.md`** — „UI / Overlays" + neuer Abschnitt „Audio" + Sektor-
  (AP4) / Renderer-Bullets.

### Entscheidungen / Abweichungen vom Ticket

1. **`SektorMeta.spineRouten` als Typ-Feld** (Ticket sagt „Neues Feld
   SektorMeta.spineRouten") — minimaler Eingriff in `src/sim`, rein Typ, im
   Bericht bestätigt: beide Golden-Anker trivial grün.
2. **Lagekarte voll gebaut** statt „nur Kompass + TODO" — der Umfang war da.
3. **Silhouette = Farbe + render-only Tore**, keine `src/data/sektor.ts`-
   Geometrieänderung (die AP4-01/-02-Boxen + Kollision bleiben unangetastet,
   damit auch die `sektor.test.ts`-Geometrietests stabil bleiben).
4. **Audio-Diff in `src/audio`**, `main.ts` reicht nur `prev`/`next` durch —
   `beobachteEreignisse` bleibt rein und testbar.
5. **Stumm-Taste `T`** (nicht im Ticket spezifiziert) — `M` ist die Lagekarte,
   `F3` das Debug-Overlay; `T` = „Ton", frei.

### Manuell geprüft (`npm run dev` + direktes Modul-Harness, headless Chrome + CDP)

- **`npm run dev`:** lädt ohne Konsolen-Errors (Render + UI + Audio), ~55–60 fps.
- **Kompass** rendert HOME + A/B/C mit Glyphen, **keine Gegner-Marker** (DOM
  geprüft: genau 4 Marker); am Spawn nach Norden liegen A links, B/C/HOME rechts
  am Rand gepinnt.
- **Lagekarte:** `M` blendet sie ein (Screenshot), zeigt A/B/C + H-West/H-Ost
  mit Zustand + „Wellenabwehr"; `M` schließt wieder.
- **Zonen-Farbtöne** deutlich kontrastreicher (Labyrinth dunkelbraun vs. Front
  sandhell im Screenshot).
- **`_setAbschnittVerloren("B")` + Rundgang:** `front` zeigt `["B","verloren",2]`,
  Renderer (Rauch/Trümmer aus AP4-03 + neue Leit-Meshes) 0 Errors.
- **Audio:** `T` toggelt den Stumm-Badge (Unit-Test); der Signalhorn-Pan folgt
  im Test dem Vorzeichen von `panFuerPeilung(relPeilung(Spieler→Home))`.
- **Nicht headless einzufangen:** Standbild von Spine-Linie + A/B/C-Schildern von
  vorn (keine Kameradrehung ohne Pointer-Lock) und der reale Signalhorn-Klang.
  Bitte im Spieltest: von einem Frontabschnitt der Spine (Farbe + Symbol) zur
  Home-Line folgen; bei Abschnittsverlust auf das Signalhorn aus Home-Richtung
  hören.
