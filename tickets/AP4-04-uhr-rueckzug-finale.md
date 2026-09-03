# AP4-04 — Die Uhr, der Rückzug & das Home-Line-Finale

**Status:** offen
**Arbeitspaket:** 4 · **Branch:** `arbeitspaket-4`
**Referenz:** `KONZEPT.md` §3 („die Uhr — warum die Front halten"), §6
(Einsatzbogen: Wellen → Zeit-Hold an der Home-Line → Extraktion/Verlängern;
Verlustbedingung: Home-Line überrannt oder Trupp aus).

## Ziel

Der Kern-Bogen wird spielbar: die gehaltene Linie zermürbt die Angriffskraft
(mehr, je weiter vorn man hält), bei gebrochener Angriffskraft beginnt das
**Zeit-Finale an der Home-Line**, und der Einsatz endet — gewonnen (Entsatz) oder
verloren (Home-Line überrannt / Trupp aus). Danach die Extraktions-/Verlängern-
Entscheidung (minimal).

## Umsetzung

**Sim (`src/sim/wave.ts` + `src/sim/einsatz.ts`, neu):**

- **Die Uhr:** die endliche `angriffskraft` (schon da) wird zusätzlich zur
  bisherigen −1/Spawn durch **Zermürbung** abgebaut: pro getötetem Gegner −X,
  **je nach Todeszone** (`zoneAt`): Tod an der `frontlinie` zählt mehr als im
  `feld`, an der `homeline` am wenigsten. Solange Frontabschnitte stehen, wird
  der Feind weiter vorn zermürbt → die Uhr „gewinnt" mehr Zeit. Fällt ein
  Abschnitt (`onVerloren` aus AP4-03), sinkt der Zermürbungs-Bonus dieses
  Abschnitts / steigt der Nachrück-Takt der Reservespawns.
- **Phasen (`einsatz.ts`):** `aufbau → wellen → finale → vorbei`, `vorbei` mit
  `ergebnis: "gewonnen" | "verloren"`. `finale` startet, wenn `angriffskraft`
  gebrochen **und** keine Welle mehr in der Queue: fester Countdown („Entsatz in
  N s"), währenddessen weiter Restgegner + kleine Nachschub-Reservewellen. Läuft
  der Countdown ab → `gewonnen`.
- **Verlustbedingung:** alle Home-Line-Abschnitte `verloren` **oder** Trupp
  ausgeschaltet → `verloren`, in jeder Phase. Die Home-Line nutzt **dieselbe**
  `front.ts`-Maschine wie die Frontlinie, startet aber befestigt (mehr
  Bresche-HP, kein Erholungs-Cap-Sonderfall nötig).
- **Extraktion/Verlängern (minimal):** nach `gewonnen` ein
  `entscheide("extrahieren" | "verlaengern")`-Eingang. `verlaengern` startet
  eskalierende Reservewellen mit einem zweiten, kürzeren Countdown; `extrahieren`
  → `vorbei`. Beute-/Ökonomie-Folgen sind ein späteres Paket — hier nur der
  Ablauf + State-Flag.
- `SimState` um `einsatz: { phase, finaleRest, ergebnis }`.

**Render/UI:** Countdown + „Entsatz" / „Home-Line hält/fällt" als HUD-Text (volles
HUD-Design in AP4-05 / später). Kein neues 3D.

## Akzeptanzkriterien

- Frontabschnitte halten → `angriffskraft` sinkt im Test spürbar schneller als
  wenn alle Abschnitte gefallen sind (messbar über simulierte Ticks).
- `angriffskraft` gebrochen + Queue leer → `finale` mit Countdown; Countdown
  abgelaufen → `gewonnen`.
- Alle Home-Line-Abschnitte `verloren` → `ergebnis "verloren"`, egal welche
  Phase; Trupp aus → ebenfalls.
- `entscheide("verlaengern")` startet Reservewellen; `"extrahieren"` → `vorbei`.
- Vitest `einsatz.test.ts` (Phasenmaschine, Uhr-Zermürbung mit/ohne stehende
  Front, beide Endbedingungen) + `wave.test.ts` erweitert.
- Golden-/Replay grün bzw. neuer Anker. Goldene Regel gehalten.

## Offene Rückfragen

Zahlen (Zermürbung pro Kill je Zone, Finale-Countdown, Reservewellen-Kurve) sind
Platzhalter (Spieltest, `KONZEPT.md` §9.6). Ob das Finale eine feste Zeit oder
„bis Reservekraft 0" ist: vorerst feste Zeit, `// TODO(Rückfrage)`.
