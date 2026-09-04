# Halt die Linie

Koop-Wave-Survival-Shooter im Grabenkrieg des Ersten Weltkriegs. First-Person,
Browsergame. Solo dauerhaft spielbar, Koop ist das Fernziel.

> Du führst einen Soldaten deiner Kompanie in einen prozedural erzeugten
> Frontabschnitt und überstehst Wellen — tagsüber gegen die feindliche Armee,
> nachts gegen die Toten des Niemandslands. Zwischen den Einsätzen baust du das
> Kompanie-Quartier aus.

Perspektive: First-Person. 3D von Anfang an (Babylon.js). Dreistufiger Sektor —
Frontlinie, Verbindungsgraben, Home-Line —, fechtender Rückzug nach hinten.

## Status

Aktueller Stand, offene Fäden und Entscheidungs-Log: **[`STATUS.md`](STATUS.md)**.

Der Konzeptkern ist in **[`KONZEPT.md`](KONZEPT.md)** festgehalten, Tech-Stack &
Architektur in **[`TECHNIK.md`](TECHNIK.md)**, das Aufgabenboard in
**[`AUFGABEN.md`](AUFGABEN.md)**.

Das frühere Tower-Defense-Skelett liegt archiviert unter
[`prototyp-td/`](prototyp-td/) und entspricht nicht mehr dem Konzept.

## Struktur

| Pfad                    | Inhalt                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `STATUS.md`             | Stand, offene Fäden, Entscheidungs-Log · **hier anfangen**                            |
| `CHANGELOG.md`          | Kuratiert, ein Eintrag pro Ticket                                                     |
| `WORKFLOW.md`           | Arbeitsweise: Ticket-Loop, Rollen, Bericht-Vorlage, Dokumenten-Karte                  |
| `KONZEPT.md`            | Maßgebliches Konzeptdokument — was das Spiel ist, was beschlossen/offen/verworfen ist |
| `TECHNIK.md`            | Tech-Stack, Architektur-Prinzipien                                                    |
| `WAFFEN.md`             | Waffenmodell, v1-Arsenal, WW1-Rohrecherche                                            |
| `AUFGABEN.md`           | Regeln, Konventionen, Arbeitspaket-Übersicht                                          |
| `tickets/`              | Ticket-Specs (offen) · `tickets/erledigt/` = Audit-Trail                              |
| `BACKLOG.md`            | Bewusst zurückgestellte Ideen für später                                              |
| `SPARRING.md`           | Self-contained Briefing zum Weitergeben an externe KI — **aktuelle** Fassung          |
| `SPARRING-LOG.md`       | Chronik der bisherigen Sparring-Briefings                                             |
| `SPARRING-ANTWORTEN.md` | Antworten der externen KIs + Konvergenz-Analyse                                       |
| `AUDIT-*.md`            | Unabhängige Code-Audits (voller Kontext, hoher Effort), Datum im Namen                |
| `prototyp-td/`          | Archivierter TD-Prototyp, nur noch Referenz                                           |

## Änderungen am Konzept

Nur im Gespräch. `KONZEPT.md` ist die einzige gültige Fassung.

## Entwicklung

Node-Version aus `.nvmrc` (aktuell 24). Siehe auch
[`CONTRIBUTING.md`](CONTRIBUTING.md) und [`src/ARCHITEKTUR.md`](src/ARCHITEKTUR.md).

```bash
nvm use              # oder Node >= 24
npm ci               # exakt nach package-lock.json
npm run dev          # Dev-Server
npm run build        # Produktions-Build nach dist/

npm run typecheck
npm run lint
npm run format:check # npm run format zum Autoformatieren
npm run test
npm run test:coverage
```

CI (`.github/workflows/ci.yml`) fährt bei jedem Push/PR dieselben Schritte.

### Preview-Deploy

Jeder Push baut die App und veröffentlicht sie auf GitHub Pages:
<https://kwe3rtz.github.io/halt-die-linie/>

(Aktiv, sobald GitHub Pages im Repo auf „GitHub Actions" gestellt ist. Der
offizielle Pages-Deploy hält nur eine Live-Seite — der letzte Push gewinnt.)
