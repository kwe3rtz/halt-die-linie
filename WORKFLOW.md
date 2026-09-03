# Halt die Linie — Arbeitsweise

Wie an diesem Projekt gebaut wird. Für Menschen **und** für frische
Claude-Sessions ohne Vorwissen.

## Rollen

- **Planer-Claude** (Chat-Session, Peer-Name `ki-game-10` o. Ä.): führt
  Design-Runden mit dem Nutzer, schreibt `KONZEPT/WAFFEN/TECHNIK/BACKLOG.md` und
  die Ticket-Specs, **reviewt jedes gebaute Ticket**, pflegt `STATUS.md` +
  `CHANGELOG.md` + die Memory-Datei, archiviert erledigte Tickets.
- **Worker-Claude** (VS-Code-Session, Peer `ki-game-7e` o. Ä.): baut Ticket für
  Ticket, schreibt Code + Tests, committet, pusht.
- **Nutzer**: entscheidet Design-Fragen, spielt Meilensteine, mergt PRs, ist der
  Nachrichten-Bus, falls das Session-Messaging hakt.

## Der Ticket-Loop

1. Worker liest die Ticket-Datei `tickets/AP<x>-<nn>-*.md` + die dort genannten
   Doks. Baut **nur dieses eine Ticket**.
2. Worker: `git pull --rebase`, dann Code + Tests. Prüft alle
   Akzeptanzkriterien.
3. Worker hängt seinen **Bericht** (Vorlage unten) unten an die Ticket-Datei,
   setzt `Status: review`, committet alles zusammen (`AP<x>-<nn> <Titel>`),
   pusht, wartet auf CI.
4. Worker schickt eine kurze Nachricht an den Planer und **wartet**.
5. Planer: `git pull`, liest den Diff, lässt die Checks lokal laufen, prüft die
   CI auf GitHub, liest den kritischen Code.
   - **Grünes Licht:** Planer hängt einen `## Review`-Block an die Ticket-Datei,
     verschiebt sie per `git mv` nach `tickets/erledigt/`, ergänzt
     `CHANGELOG.md` und `STATUS.md`, committet
     (`docs: AP<x>-<nn> reviewed + archiviert`), pusht, schickt dem Worker das
     Go + den nächsten Ticket-Hinweis.
   - **Nachbesserung:** Planer schickt dem Worker die Punkte; Ticket bleibt
     liegen; zurück zu Schritt 2.
6. Während der Planer reviewt, ist der Worker **untätig** (wartet) — es schreibt
   also nie mehr als eine Session gleichzeitig ins Repo.

## Bericht-Vorlage (Worker)

```
## Bericht — AP<x>-<nn>

COMMIT: <hash> (Branch <branch>)
CI: <CI-Status> / <Pages-Status> auf <hash>
TODO(Rückfrage): <neue offene Fragen — oder "keine">

Checks: typecheck / lint / format:check / test:coverage / build — <Ergebnis>
Tests: <Anzahl> · Coverage src/sim: <Prozent> · Bundle: <Größe> (Δ <Änderung>)

Umsetzung: <was gebaut, welche Dateien>
Entscheidungen / Abweichungen vom Ticket: <nummeriert, mit Begründung>
Manuell geprüft: <was im Browser getestet — oder warum nicht>
```

## Review-Block (Planer)

```
## Review — AP<x>-<nn>  ·  <Datum>

Verdikt: grünes Licht / Nachbesserung
Geprüft: <Checks lokal, CI, kritischer Code>
Anmerkungen: <nicht blockierende Punkte, Merk-Posten>
Folge-Ticket: AP<x>-<nn+1>
```

## Dokumenten-Karte

| Datei | Zweck | Wer pflegt |
|---|---|---|
| `STATUS.md` | Ein-Blick-Stand, offene Fäden, Entscheidungs-Log | Planer |
| `CHANGELOG.md` | kuratiert, ein Eintrag pro Ticket (git = Ground Truth) | Planer |
| `KONZEPT.md` | Spielkonzept — beschlossen / offen / verworfen | Planer, in Design-Runden |
| `WAFFEN.md` | Waffenmodell + v1-Arsenal + WW1-Rohrecherche | Planer |
| `TECHNIK.md` | Stack, Architektur-Prinzipien, „warum kein Unity/C++" | Planer |
| `BACKLOG.md` | bewusst zurückgestellte Ideen | Planer |
| `AUFGABEN.md` | Regeln, Konventionen, Arbeitspaket-Übersicht | Planer |
| `tickets/AP*.md` | offene Ticket-Specs | Planer |
| `tickets/erledigt/AP*.md` | Spec + Worker-Bericht + Review, je erledigtem Ticket | Planer archiviert |
| `src/ARCHITEKTUR.md` | Code-Struktur, goldene Regel, offene Code-Rückfragen | Worker |
| git-History + CI | Ground Truth | Worker |
| Memory `halt-die-linie-konzept.md` | Auto-Briefing für neue Sessions | Planer |

## Neu hier? (frische Claude-Session)

1. **`STATUS.md`** ganz lesen — Stand, offene Fäden, Entscheidungs-Log.
2. **`KONZEPT.md`** — was das Spiel ist.
3. Bau-Stand: **`CHANGELOG.md`** + `tickets/` (offen) + `tickets/erledigt/`.
4. **Diese Datei** für den Ablauf, **`AUFGABEN.md`** für die Konventionen.
5. `git log --oneline -20` für die letzten Schritte.
