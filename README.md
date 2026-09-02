# Halt die Linie

Koop-Wave-Survival-Shooter im Grabenkrieg des Ersten Weltkriegs. Top-Down,
Browsergame. Solo dauerhaft spielbar, Koop ist das Fernziel.

> Du führst einen Soldaten deiner Kompanie in einen prozedural erzeugten
> Frontabschnitt und überstehst Wellen — tagsüber gegen die feindliche Armee,
> nachts gegen die Toten des Niemandslands. Zwischen den Einsätzen baust du das
> Kompanie-Quartier aus.

Perspektive: First-Person. 3D von Anfang an (Babylon.js). Dreistufiger Sektor —
Frontlinie, Verbindungsgraben, Home-Line —, fechtender Rückzug nach hinten.

## Status

**Konzeptphase.** Der Konzeptkern ist beschlossen und in **[`KONZEPT.md`](KONZEPT.md)**
festgehalten, Tech-Stack & Architektur in **[`TECHNIK.md`](TECHNIK.md)**. Als
Nächstes: die Detailsysteme aus `KONZEPT.md` §9 (Waffen, Klassen, Gegner-Roster).

Es gibt noch keinen Code für das eigentliche Spiel. Das frühere
Tower-Defense-Skelett liegt archiviert unter [`prototyp-td/`](prototyp-td/) und
entspricht nicht mehr dem Konzept.

## Struktur

| Pfad | Inhalt |
|---|---|
| `KONZEPT.md` | Maßgebliches Konzeptdokument — was das Spiel ist, was beschlossen/offen/verworfen ist |
| `TECHNIK.md` | Tech-Stack, Architektur-Prinzipien |
| `WAFFEN.md` | Waffenmodell, v1-Arsenal, WW1-Rohrecherche |
| `AUFGABEN.md` | Aufgabenboard für die VS Code KI — Arbeitspakete, Tickets, Konventionen |
| `BACKLOG.md` | Bewusst zurückgestellte Ideen für später |
| `prototyp-td/` | Archivierter TD-Prototyp, nur noch Referenz |

## Änderungen am Konzept

Nur im Gespräch. `KONZEPT.md` ist die einzige gültige Fassung.

## Entwicklung

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
```
