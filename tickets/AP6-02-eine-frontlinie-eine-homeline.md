# AP6-02 — Kern-Bogen auf eine Frontlinie + eine Home-Line umstellen

**Status:** offen · nächstes Ticket (AP6-01 ist durch, `c4d21f5`)
**Arbeitspaket:** 6 · **Branch:** `arbeitspaket-6`
**Referenz:** `KONZEPT.md` §3 + §6 (neu gefasst 2026-09-07 — ganz lesen),
`src/sim/front.ts` (`AbschnittFront`, `createFrontState`, Zustände
`stabil→bedraengt→gebrochen→verloren`, `rueckerobern`), `src/sim/einsatz.ts`
(die Uhr, `zermuerbungProKill`, Phasen `aufbau→wellen→finale→vorbei`),
`src/sim/wave.ts` (Wave-Director), `src/sim/sektor.ts` (`SektorMeta`,
`frontAbschnitte`/`homeAbschnitte`), `src/sim/navgraph.ts`.

## Ausgangslage

AP6-01 liefert den neuen Sektor bereits mit **genau einem** `frontAbschnitt`
(`id: "front"`) und **genau einem** `homeAbschnitt` (`id: "home"`) — die
`front.ts`-Zustandsmaschine läuft damit ohne Code-Änderung (N=1). Dieses
Ticket macht die Vereinfachung **bewusst und explizit**: die A/B/C-Mechanik
raus, „die Front" / „die Home-Line" als singuläre Konzepte, und die Uhr an
**eine** Linie gekoppelt statt an eine Abschnitts-Menge.

## Ziel

Nach diesem Ticket kennt die Sim nur noch **die Frontlinie** und **die
Home-Line**. Kein `abschnittId`-Iterieren, keine „welcher Abschnitt ist
gefallen"-Logik, kein abschnittsweises Skalieren. Der Kern-Bogen aus
`KONZEPT.md` §6 („eine Frontlinie, eine Home-Line").

## Umsetzung (Richtung — Details nach AP6-01)

- **`front.ts`:** `createFrontState` nimmt nicht mehr eine Abschnitts-Liste,
  sondern die zwei Linien (Front, Home) als benannte Zustände. `AbschnittFront`
  → `LinienFront` o. ä. Zustände bleiben (`stabil→bedraengt→gebrochen→
  verloren`), `depotVerloren` bleibt, `rueckerobern` bleibt (Detail-Interaktion
  ist AP6-04, hier nur der Zustandsübergang). `HOME_BRESCHE_FAKTOR` bleibt.
- **`einsatz.ts` / die Uhr:** `zermuerbungProKill(zone, ...)` bleibt
  zonengewichtet (Frontlinie am teuersten, Hinterland mittel, Home-Line am
  billigsten — Zonen kommen aus AP6-01). Kopplung „Abschnitt gefallen → Uhr
  schneller" wird zu „**Frontlinie** gefallen → Uhr schneller". Verlust­bedingung:
  **Home-Line als Linie verloren** (nicht mehr „alle Home-Abschnitte gebrochen")
  oder Trupp aus.
- **`wave.ts`:** Skalierung nicht mehr über „Anzahl aktiver Abschnitte",
  sondern über den Wave-Director + Anzahl bedrohter Zugänge (`homeZugaenge`
  aus dem Sektor). Wellenkurve/Reserve unverändert lassen, nur die
  Abschnitts-Kopplung entfernen.
- **`sektor.ts` / `SektorMeta`:** `frontAbschnitte`/`homeAbschnitte` dürfen
  zu `frontLinie`/`homeLinie` (Einzelobjekte) werden, wenn das die Sim
  vereinfacht — oder als Ein-Element-Liste bleiben, falls billiger. Die
  bewusste Entscheidung im Ticket-Bericht begründen.
- **Nav-Graph:** Bresche-Tags + Engstellen bleiben; nur die Abschnitts-
  Zuordnung (`brescheTag(abschnittId, index)`) auf die eine Frontlinie
  reduzieren.
- **Tote Pfade löschen** statt auskommentieren: `_setAbschnittVerloren`-
  Testhook, A/B/C-spezifische Konstanten, Abschnitts-Iteration im HUD/Kompass.
- **Halte-Bedingung: Druck-Radius statt Linien-Bounds** (aus AP6-01 TODO 2).
  Heute gilt die Frontlinie als „gehalten", solange **irgendein** Spieler
  irgendwo in den Linien-Bounds lebt — bei einer Linie über die ganze
  Sektorbreite heißt das: sie kann nur fallen, wenn der Spieler sich
  zurückzieht/stirbt. Stattdessen: die Linie gerät nur dort unter Druck
  (`bedraengt`/`gebrochen`), wo gerade Gegner am Parapet stehen und **kein**
  Spieler in Reichweite (Radius) ist. Ein Spieler „hält" nur seinen Abschnitt
  der Linie, nicht die ganze Breite. Konkrete Radius-/Schwellenwerte =
  Greybox-Startwerte, im Spieltest justiert.
- **Stale Callout-Konstanten in `src/audio/index.ts`** (aus AP6-01 TODO 3):
  `FRONT_CALLOUT` (A/B/C, H-West/H-Ost) und `ROUTE_CALLOUT` (feld-links …)
  sind Platzhalter-Strings, nicht an den Sektor verdrahtet. Auf die neue
  Welt umstellen (FRONT / HOME / Zonen-Namen) oder — wenn ohne echten
  Funk/VO ohnehin ungenutzt — ersatzlos entfernen und mit AP7 neu aufsetzen.
  Im Bericht begründen, welcher Weg.

## Tests

- `front.test.ts` / `einsatz.test.ts` / `sektor.test.ts` auf die neue
  Ein-Linien-API umschreiben. Die Zustandsübergänge selbst
  (`stabil→…→verloren`, `rueckerobern`) müssen weiter getestet sein.
- Golden-/Replay-Anker „Sektor-Nav-Graph" + „die Uhr": brechen —
  **bewusst neu baselinieren** mit Begründung + Gegenprobe direkt am Test
  (wie AP5-04/06). Inline-Testlevel-Anker bleibt unverändert.
- `navgraph-begehbarkeit.test.ts` muss grün bleiben.
- Headless-Einsatz bis „gewonnen" + bis „verloren" (Home-Line fällt)
  spielbar (idealisierter Schütze).

## Akzeptanzkriterien

- Keine Referenz auf „Abschnitt A/B/C" mehr in `src/sim/**` und im HUD.
- Frontlinie fällt → Uhr messbar schneller; Home-Line fällt → `verloren`.
- Alle Checks grün, Golden-Anker mit dokumentierter Begründung neu.

## Ausdrücklich NICHT

Spawn-Verlagerung (AP6-03) · „Instand setzen"-Interaktion (AP6-04) · Roam
(AP6-05) · Generator · Tag-Modus.
