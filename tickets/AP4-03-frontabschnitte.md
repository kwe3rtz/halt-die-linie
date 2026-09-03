# AP4-03 — Frontabschnitte: Besitz, Bresche, Fall

**Status:** offen
**Arbeitspaket:** 4 · **Branch:** `arbeitspaket-4`
**Referenz:** `KONZEPT.md` §3 (`stabil → bedrängt → gebrochen → verloren`,
Parapet als lebendiges Ziel, „Verlust öffnet den Weg", Rückeroberung
selten/teuer).

## Ziel

Die Frontlinie wird ein lebendiges Ziel: jeder Abschnitt hat einen Besitz-/
Druckzustand, Parapet-Breschen, die der Feind aufreißt, und einen klaren
Fall-Trigger. Ein verlorener Abschnitt öffnet die Nav-Kanten nach hinten (AP4-02)
und schaltet den Infiltrations-Spawn frei.

## Umsetzung

**Sim (`src/sim/front.ts`, neu):**

- `AbschnittZustand = "stabil" | "bedraengt" | "gebrochen" | "verloren"`.
- Pro Abschnitt: `{ id, zustand, breschen: { pos, hp, offen }[], druck: number }`.
- `updateFront(frontState, ctx, dt)` mit
  `ctx = { enemies, sektorMeta, spielerPositionen, onVerloren(id) }`:
  - **Bresche:** Gegner in Reichweite einer noch geschlossenen Bresche und **kein
    Spieler in der Nähe** → `bresche.hp` sinkt; bei 0 `offen = true`.
    (Pionier-Reparatur ist ein späteres Paket — hier gilt nur „ungehalten fällt
    sie".)
  - **Druck:** steigt mit der Zahl lebender Gegner im `bounds` des Abschnitts,
    sinkt ohne Gegner. Übergänge:
    - `druck` über Schwelle **oder** ≥1 Bresche offen → `bedraengt`
    - Bresche offen **und** Gegner drücken seit `T` s am `front-<id>`-Knoten →
      `gebrochen`
    - `gebrochen` + weiter ungehalten für `T2` s → `verloren`
  - **Erholung:** kein Gegner im Abschnitt für `T3` s und keine offene Bresche →
    eine Stufe zurück Richtung `stabil` — **nicht** aus `verloren` heraus.
  - **`verloren` →** `onVerloren(id)` ruft (a) Nav-Kanten des Abschnitts nach
    hinten öffnen (AP4-02), (b) `reinforcement-<id>` aktivieren, (c) Depot des
    Abschnitts als „verloren" markieren (Uhr-Effekt in AP4-04).
  - **Rückeroberung:** nur über einen expliziten, teuren Eingang
    `rueckerobern(abschnittId)` auf dem Sim-Interface (Kosten / KI-Trupp kommen
    mit der Nachschub-Ökonomie), setzt `verloren → gebrochen` **nur wenn gerade
    kein Gegner im Abschnitt ist**. Kein automatisches Zurückflippen.
- `SimState` um `front: { id, zustand, breschenOffen: number }[]` (HUD/Render).

**Render:** Bresche offen = sichtbare Lücke/Trümmer im Parapet-Mesh. Abschnitts-
Zustand grob visuell (z. B. Rauch über `gebrochen`/`verloren`) — Feinschliff
AP4-05.

## Akzeptanzkriterien

- Gegner reißen eine ungehaltene Bresche auf; steht ein Spieler dort, geht es
  nicht (bzw. deutlich langsamer).
- Ein Abschnitt läuft unter Dauerdruck sauber `stabil → bedraengt → gebrochen →
  verloren`; ohne Gegner erholt er sich (außer aus `verloren`).
- `verloren` öffnet die Nav-Kanten nach hinten (AP4-02-Verhalten sichtbar:
  Gegner fluten Richtung Home) und aktiviert den Infiltrations-Spawn.
- `rueckerobern()` greift nur bei leerem Abschnitt.
- Vitest `front.test.ts`: Zustandsmaschine (alle Übergänge + Erholung + kein
  Selbst-Zurückflip aus `verloren`), Bresche-HP, `onVerloren`-Callback.
- Golden-/Replay grün bzw. neuer Anker. Goldene Regel gehalten.

## Offene Rückfragen

Schwellenzeiten `T / T2 / T3` und die Druck-Schwelle sind Platzhalter
(Spieltest). Ob `bedraengt` schon einen Gameplay-Effekt hat oder nur Anzeige ist:
vorerst nur Anzeige.
