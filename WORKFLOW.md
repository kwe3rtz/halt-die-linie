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

Egal welche Rolle, immer zuerst:

1. **`STATUS.md`** ganz lesen — Stand, offene Fäden, Entscheidungs-Log.
2. **`KONZEPT.md`** — was das Spiel ist. (`WAFFEN.md`/`TECHNIK.md` bei Bedarf.)
3. Bau-Stand: **`CHANGELOG.md`** + `tickets/` (offen) + `tickets/erledigt/`.
4. **Diese Datei** (Ablauf) + **`AUFGABEN.md`** (Regeln, Konventionen, goldene
   Regel).
5. `git log --oneline -20` für die letzten Schritte.

### Frische Planer-Session

Übernimmt Design-Runden mit dem Nutzer + Review. Nach der Lektüre oben:
`git status` / `git branch` prüfen, letzten offenen Punkt aus `STATUS.md`
aufgreifen. Wenn ein Ticket auf `review` steht: reviewen (Schritt 5 im
Ticket-Loop). Sonst mit dem Nutzer weiterplanen.

### Frische Worker-Session — Kickoff-Prompt

Der Nutzer gibt einer frischen Worker-Session diesen Prompt (Ticketnummer
anpassen):

```
Du bist die Worker-Session am Projekt "Halt die Linie" (Repo-Root ist das
aktuelle Verzeichnis).

LIES IN DIESER REIHENFOLGE, bevor du irgendetwas tust:
1. STATUS.md (ganz)
2. WORKFLOW.md (ganz — besonders "Der Ticket-Loop" und "Bericht-Vorlage")
3. AUFGABEN.md (Arbeitsweise + Projekt-Konventionen + goldene Regel)
4. KONZEPT.md §1/§2/§3/§5/§6 (§3 = der Sektor, für AP4 zentral),
   WAFFEN.md wenn Waffen/Daten dran sind
5. Für AP4: SPARRING-ANTWORTEN.md „Runde 2" quer lesen (Begründung der
   Sektor-Entscheidungen — Kontext, kein Auftrag)
6. git log --oneline -15  und  git branch --show-current

DEIN AUFTRAG: das nächste offene Ticket in tickets/ (siehe Tabelle in
AUFGABEN.md → aktuelles Arbeitspaket). Aktuell: AP4-01. Reihenfolge AP4-01 →
AP4-05 einhalten.

REGELN (aus AUFGABEN.md + WORKFLOW.md):
- Auf dem Arbeitspaket-Branch bleiben (git branch zeigt ihn). Zuerst git pull.
- NUR dieses eine Ticket. Kein Scope-Creep über die Ticket-Datei hinaus.
- Goldene Regel strikt: src/sim/** ohne Babylon, ohne window/document/
  performance/Date.now/Math.random/requestAnimationFrame. Per ESLint erzwungen.
- Determinismus: Zeit als dt-Parameter, Zufall nur über src/sim/rng.ts.
- Tests neben der Quelle (foo.ts -> foo.test.ts). Sim-Tests laufen node-env.
- Alle Akzeptanzkriterien des Tickets prüfen.
- Bei echter Unklarheit: // TODO(Rückfrage): ... an die Stelle + im Bericht
  auflisten, konservativ weiterbauen (nicht raten, keine Architektur-Alleingänge).

ABSCHLUSS:
- Status-Zeile der Ticket-Datei auf "review" setzen.
- Bericht nach der Vorlage in WORKFLOW.md unten an die Ticket-Datei hängen.
- Alles in EINEN Commit ("AP<x>-<nn> <Titel>"). git push. Auf CI warten.
- Dann kurze Nachricht an die Planer-Session (Peer-Name siehe unten) mit
  Commit-Hash + CI-Status + den TODO(Rückfrage), und WARTEN auf grünes Licht +
  das nächste Ticket. Nicht selbst weitermachen.

Ausgabe von: npm run typecheck && npm run lint && npm run format:check && npm run test:coverage && npm run build  gehört in den Bericht.
```

> Peer-Name der Planer-Session: per `/agents` bzw. der Agentenliste ermitteln
> (aktuell `ki-game-10` o. Ä.). Hakt das Session-Messaging, meldet sich der
> Worker beim Nutzer, der die Nachricht an die Planer-Session weiterreicht.
