# Halt die Linie — Arbeitsweise

Wie an diesem Projekt gebaut wird. Für Menschen **und** für frische
Claude-Sessions ohne Vorwissen.

## Rollen

- **Planer-Claude** (Chat-Session, Peer-Name z. B. `ki-game-f1`): führt
  Design-Runden mit dem Nutzer, schreibt `KONZEPT/WAFFEN/TECHNIK/BACKLOG.md` und
  die Ticket-Specs, **reviewt jedes gebaute Ticket**, pflegt `STATUS.md` +
  `CHANGELOG.md` + die Memory-Datei, archiviert erledigte Tickets.
- **Worker-Claude** (VS-Code-Session, Peer wechselt, z. B. `ki-game-e6`): baut
  Ticket für Ticket, schreibt Code + Tests, committet, pusht. `/clear` **vor**
  großen Tickets (der Kickoff-Prompt sagt es an).
- **GitHub Copilot** (im VS-Code-Editor des Nutzers): **rein lesend** —
  unabhängige Audits nach AP-Abschluss, Diff-Review vor dem Planer-Review,
  Spec-Checks gegen den echten Code. **Kein Schreiber im Ticket-Loop**, nichts
  was in `git log` oder `tickets/erledigt/` landet. Ergebnisse gehen an den
  Planer (über den Nutzer), der entscheidet, was Ticket wird.
- **Externe LLMs** (`SPARRING*.md`): Konzept-Sparring, Inspiration nicht Beschluss.
- **Nutzer**: entscheidet Design-Fragen, spielt Meilensteine, mergt PRs, ist der
  Nachrichten-Bus zwischen den Sessions.

**Achtung — geteiltes Arbeitsverzeichnis:** Planer, Worker und Copilot arbeiten
im selben Ordner mit *einem* git-Checkout. Es wechselt immer nur eine Session
den Branch / schreibt zur Zeit. Wer git anfasst, sagt's den anderen.

## Der Ticket-Loop

1. Worker liest die Ticket-Datei `tickets/AP<x>-<nn>-*.md` + die dort genannten
   Doks. Baut **nur dieses eine Ticket**.
2. Worker: `git pull --rebase`, dann Code + Tests. Prüft alle
   Akzeptanzkriterien.
3. Worker hängt seinen **Bericht** (Vorlage unten) unten an die Ticket-Datei,
   setzt `Status: review`, committet alles zusammen (`AP<x>-<nn> <Titel>`),
   pusht, wartet auf CI.
4. Worker schickt eine kurze Nachricht an den Planer und **wartet**.
5. Planer: `git pull`, `git diff --stat` dann gezielt die relevanten Diffs,
   prüft die **CI auf GitHub** (grün = Checks liefen schon — nicht alles lokal
   nachstellen, ein gezielter Spot-Check reicht), liest den kritischen Code.
   Fokus: Golden-Anker-Rebaselines (Begründung + Gegenprobe da?), Abweichungen
   vom Ticket, die TODO(Rückfrage).
   - **Grünes Licht:** Planer hängt einen `## Review`-Block an die Ticket-Datei,
     verschiebt sie per `git mv` nach `tickets/erledigt/`, ergänzt
     `CHANGELOG.md` und `STATUS.md`, committet
     (`docs: AP<x>-<nn> reviewed + archiviert`), pusht, schickt dem Worker das
     Go + den nächsten Ticket-Hinweis.
   - **Nachbesserung:** Planer schickt dem Worker die Punkte; Ticket bleibt
     liegen; zurück zu Schritt 2.
6. Während der Planer reviewt, ist der Worker **untätig** (wartet) — es schreibt
   also nie mehr als eine Session gleichzeitig ins Repo.

**Token sparen:** Planer **und** Worker `/clear` zwischen Tickets — jeder Review
und jedes Ticket ist self-contained über `STATUS.md` + die Ticketdatei +
`git diff`. Lange Sessions kosten auch gecacht viel. Der Worker-Kickoff-Prompt
ist bewusst so gebaut, dass eine frische Session alles Nötige liest.

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
| `STATUS.md` | Ein-Blick-Stand, offene Fäden, Entscheidungs-Log — **kurz halten** | Planer |
| `STATUS-ARCHIV.md` | ausgelagerte Historie (alte Spieltests, ältere Log-Einträge) — nicht standardmäßig lesen | Planer |
| `CHANGELOG.md` | kuratiert, ein Eintrag pro Ticket (git = Ground Truth) | Planer |
| `AUDIT-*.md` | unabhängige Voll-Kontext-Audits (Copilot / Firmen-Account) | wer den Audit fährt |
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

1. **`STATUS.md`** ganz lesen (ist kurz) — Stand, offene Fäden, Entscheidungs-
   Log. `STATUS-ARCHIV.md` nur bei Bedarf.
2. **`KONZEPT.md`** — was das Spiel ist. (`WAFFEN.md`/`TECHNIK.md` bei Bedarf.)
3. Bau-Stand: **`CHANGELOG.md`** (nur laufendes + voriges Arbeitspaket) +
   `tickets/` (offen) + das zuletzt erledigte Ticket in `tickets/erledigt/`.
4. **Diese Datei** (Ablauf) + **`AUFGABEN.md`** (Regeln, Konventionen, goldene
   Regel).
5. `git log --oneline -15` für die letzten Schritte.

### Frische Planer-Session

Übernimmt Design-Runden mit dem Nutzer + Review. Nach der Lektüre oben:
`git status` / `git branch` prüfen, letzten offenen Punkt aus `STATUS.md`
aufgreifen. Wenn ein Ticket auf `review` steht: reviewen (Schritt 5 im
Ticket-Loop). Sonst mit dem Nutzer weiterplanen.

### Frische Worker-Session — Kickoff

Der **Planer** schreibt den Kickoff-Prompt pro Ticket und schickt ihn dem
Worker (per Session-Message, oder der Nutzer reicht ihn weiter). Er ist
self-contained — die frische Session braucht kein Vorwissen. Muster:

```
Du bist die Worker-Session am Projekt "Halt die Linie" (Repo-Root = aktuelles
Verzeichnis). Frischer Context — lies dich neu ein.

LIES IN DIESER REIHENFOLGE:
1. STATUS.md (ganz — kurz gehalten)
2. WORKFLOW.md (ganz — "Der Ticket-Loop" + "Bericht-Vorlage")
3. AUFGABEN.md (Arbeitsweise + Konventionen + goldene Regel + aktuelles Arbeitspaket)
4. KONZEPT.md §1/§3/§5/§6 (§3 = der Sektor), WAFFEN.md wenn Waffen dran sind
5. tickets/AP<x>-<nn>-*.md — DEIN TICKET, ganz lesen
6. tickets/erledigt/AP<x>-<nn-1>-*.md (## Bericht + ## Review des Vorgänger-Tickets)
7. AUDIT-*.md soweit im Ticket referenziert
8. git log --oneline -10 && git branch --show-current

BRANCH: git checkout arbeitspaket-<x> && git pull  (NICHT neu branchen, außer das Ticket sagt es).

DEIN AUFTRAG: NUR AP<x>-<nn>. <2-3 Sätze Kurzfassung + was ausdrücklich NICHT
dazugehört (spätere Tickets / AP7).>

REGELN:
- NUR dieses eine Ticket. Kein Scope-Creep über die Ticket-Datei hinaus.
- Goldene Regel strikt: src/sim/** ohne Babylon/window/document/performance/
  Date.now/Math.random/requestAnimationFrame. Zeit via dt, Zufall via src/sim/rng.ts.
- Tests neben der Quelle (foo.ts -> foo.test.ts). Sim-Tests laufen node-env.
- Golden-/Replay-Anker (src/sim/sim.test.ts) nur mit Begründung am Test +
  Gegenprobe neu baselinen — nie stillschweigend.
- Alle Akzeptanzkriterien prüfen. Visuell verifizieren wenn UI/Render dran ist
  (Playwright/headless, Screenshots nach tickets/erledigt/AP<x>-<nn>-screenshots/).
- Bei echter Unklarheit: // TODO(Rückfrage): ... an die Stelle + im Bericht
  auflisten, konservativ weiterbauen (nicht raten, keine Architektur-Alleingänge).

ABSCHLUSS:
- Ticket-Status auf "review". Bericht nach der WORKFLOW.md-Vorlage anhängen.
- EIN Commit ("AP<x>-<nn> <Titel>"). git push. Auf CI warten.
- Kurze Nachricht an den Planer (<Peer-Name>) mit Commit-Hash + CI-Status +
  TODO(Rückfrage). Dann WARTEN auf grünes Licht + nächstes Ticket. Nicht selbst
  weitermachen.

Ausgabe von: npm run typecheck && npm run lint && npm run format:check &&
npm run test:coverage && npm run build  gehört in den Bericht.

<Modell/Effort-Ansage für dieses Ticket.>
```

**`/clear` vor großen Tickets:** Ist das Ticket groß (neue Subsysteme, viel
Fläche, Golden-Anker betroffen), sagt der Planer im Kickoff „mach zuerst
`/clear`" — bzw. der Nutzer löst es aus, bevor er den Kickoff-Prompt gibt.
Faustregel: nach jedem abgeschlossenen Ticket `/clear`, dann den nächsten
Kickoff.

> Peer-Namen per `/agents` bzw. der Agentenliste ermitteln. Hakt das
> Session-Messaging, ist der Nutzer der Nachrichten-Bus.
