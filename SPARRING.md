# Halt die Linie — Sparring-Briefing v2: Der Sektor / die Map

**Zweck:** Dieses Dokument an eine KI geben (ChatGPT, Claude, Gemini, …), die
**keinen** Zugriff aufs Repo hat. Es enthält alles Nötige, um über **die
Map-Frage** mitzudenken. Bewusst redundant zu den internen Projektdoks.

**Kontext:** Dies ist die zweite Sparring-Runde. Die erste Runde ging breit übers
Gesamtkonzept; ihre Ergebnisse stehen unten unter „Schon geklärt". Diese Runde
ist eng: nur **der dreistufige Grabensektor** — Aufbau, Maße, Erzeugung,
Lesbarkeit. Wir haben einen konkreten Vorschlag (Straw-Man) und wollen ihn
zerlegen lassen.

---

## Deine Rolle

Sei mein **Sparringspartner**, kritisch statt bestätigend.

- Nimm den Straw-Man unten **auseinander**: wo bricht das Design, welche Zahlen
  sind falsch, welche Annahme ist naiv?
- Wo du etwas anders machen würdest: **konkrete** Alternative + Trade-off +
  Kosten. Referenzspiele nennen und sagen, *was* genau man von ihnen lernt.
- Sag direkt, wenn etwas eine schlechte Idee ist.
- Ich befrage mehrere KIs parallel und vergleiche. Antworte so, dass ich deine
  Position gut gegen die anderen abwägen kann.

**Antwortformat:** pro Leitfrage (1–8) → hält der Vorschlag / was ändern / warum.
Am Ende: die 3 wichtigsten Korrekturen am Straw-Man + eine Antwort auf die zwei
Grundsatzfragen (A und B unten).

---

## Das Spiel in Kürze

**Halt die Linie** — First-Person-Koop-Wave-Survival-Shooter im Grabenkrieg des
Ersten Weltkriegs. Browsergame (TypeScript + Babylon.js, 3D, First Person,
Platzhalter-Boxen). Solo dauerhaft spielbar, **Koop ist Fernziel** (noch kein
Netcode).

> Du führst einen Soldaten deiner Kompanie in einen Frontsektor und überstehst
> Wellen — **tagsüber** gegen die feindliche Armee (schießt zurück, nutzt
> Deckung), **nachts** gegen die Toten des Niemandslands (Horde). Fällt die
> vordere Grabenlinie, ziehst du dich fechtend zurück; die rückwärtige Linie ist
> die echte Verlustgrenze.

**Der Sektor (Verteidigung in der Tiefe, historisch):**
**Frontlinie** (mehrere Abschnitte, fallen einzeln, teuer rückeroberbar) →
**Verbindungsgraben** (enge Engstellen) → **Home-Line** (vorbefestigt, echte
Verlustgrenze). Flanken gesperrt — der Sektor ist ein Korridor.

**Einsatzbogen:** Wellen zermürben die *endliche* Angriffskraft des Feindes,
dabei wird man von der Front zurückgedrückt → wenn die Angriffskraft gebrochen
ist, Zeit-Hold-Finale an der Home-Line → extrahieren oder für mehr Beute
verlängern. Verlust = Home-Line komplett überrannt oder Trupp ausgeschaltet.
Frontlinie/Verbindungsgraben zu verlieren tut weh, beendet den Einsatz nicht.

**Aktueller Code-Stand:** spielbarer FP-Shooter auf einem **Boxen-Testgraben** —
Hitscan-Gewehr, Spieler-HP/Tod/Respawn, **ein** Gegnertyp (langsame
Nahkampf-Infanterie, gerader Anmarsch, kein Pathing), Wave-Director. **Es gibt
noch keinen echten Sektor**, keine prozedurale Erzeugung, keine Tag/Nacht-Logik,
keine Rückzugslogik, keinen Fernkampf-Gegner.

**Architektur-Grundregel:** `src/sim/**` ist eine headless Simulation — kein
Babylon, kein `window`/`Math.random`; alles wird übergeben (Kommandos, Seed,
`dt`). Der Renderer liest Sim-State und zeichnet, fasst Logik nie an. Grund:
dieselbe Sim wandert später unverändert auf einen autoritativen Node-Server für
Koop. Kollision ist eigener Code in der Sim (Kapsel-vs-AABB, Raycasts).

---

## Schon geklärt (erste Sparring-Runde — bitte darauf aufbauen, nicht neu aufrollen)

- **Map nicht vollprozedural.** Konsens: **authored Module + prozedurales
  Makrolayout**. Der Generator ordnet vorgefertigte Grabenbausteine an, erfindet
  keine Geometrie. Vollprozedural (Noise/Marching Cubes) gilt als Falle für
  FP-Orientierung und Balance.
- **Pathing = semantischer Graph** aus den Modulen
  (`spawn → approach lane → breach → trench segment → connector → home`), **kein
  NavMesh**. Der Graph fällt beim modularen System gratis ab und treibt später
  auch Wave-Director und Server-KI.
- **Gegner-KI: 3 Verhalten reichen** — Charger (rennt, ignoriert Deckung) ·
  Suppressor (MG, feuert aus Distanz) · Disruptor (greift Struktur/Platzierungen
  statt HP). „Klug" wirken Gegner durch Audio + Formation, nicht durch komplexe
  KI.
- **Rückzugs-Loop = Alleinstellungsmerkmal UND größter Risiko-Klumpen.** Jede
  Tiefenzone muss das Gefecht *anders* machen; Abschnittsverlust muss Kosten
  haben (Depots, Boni) ohne Todesspirale; Rückeroberung selten/teuer
  (`stabil → bedrängt → gebrochen → verloren`).
- **In-Mission-Quest als Dauermechanik gestrichen.** Fähigkeit: einmaliger Unlock
  / auto nach Welle X / Ladungen, die nur an der Home-Line nachladen.
- **Nachschub: eine Währung + Budgets/Slots** statt zwei Währungen.
- **Jetzt kein Netcode, keine Art-/Bundle-/LOD-Optimierung.** Nur
  netcode-freundlich bleiben.
- **Tag/Nacht ist der größte Scope-Multiplikator** — nicht beide Roster parallel
  bauen; ein überzeugender Tag- und ein Nacht-Gegner, derselbe Sektor zweimal.

**Bewusst entschieden, nicht neu aufrollen:** kein Tower-Defense · First Person ·
3D ab Tag eins · Einsatz ist Tag ODER Nacht · kein Permadeath · Kader-Modell ·
„Krieg"-Modus zurückgestellt.

---

## Der Straw-Man — unser aktueller Map-Vorschlag

Das ist ein **Planer-Vorschlag als Diskussionsgrundlage**, kein Beschluss. Alle
Zahlen sind erste Schätzungen. Zerlege ihn.

### Leitidee

Für die **erste spielbare Version** ein **einziger, komplett handgebauter
Greybox-Sektor** (keine prozedurale Erzeugung) — nur um zu beweisen, dass „Front
halten → Boden verlieren → geordnet zurückfallen → Home-Line halten" Spaß macht.
Der modulare Generator kommt erst, wenn dieser Kern trägt. Später: Sektor pro
Einsatz frisch aus Modulen erzeugt; **kein** Persistenz-/„entwickelt sich"-Layer
auf der Map — jeder Einsatz ist ein neuer Sektor.

### 1. Fix oder pro Einsatz neu?

- **Jetzt:** ein fixer handgebauter Sektor.
- **Später:** pro Einsatz neu aus authored Modulen (6–10 Frontmodule, 4–6
  Verbindungsgraben-Module, 3–4 Home-Line-Varianten). Kein sich entwickelnder
  Dauer-Sektor — der Wiederspielwert kommt aus Neuerzeugung + Tag/Nacht, nicht
  aus Meta-Zustand auf der Karte.

### 2. Die drei Ebenen

| Ebene | Maße (solo) | Inhalt |
|---|---|---|
| **Frontlinie** | 3 Abschnitte **A / B / C** nebeneinander, je ~25–30 m breit → Gesamtfront ~85 m | je Abschnitt 1–2 Parapet-Bresche-Punkte, ein Feuertritt-Abschnitt, 2–3 Deckungs-Slots, 1–2 Bau-Slots |
| **Verbindungsgraben** | **2 Connectoren** (hinter A↔B und B↔C), je ~40–50 m lang, 2–3 m breit, 1–2 Knicke | Engstellen, kaum Deckung, kaum Ressourcen, MG besonders stark |
| **Home-Line** | ~60 m breit, ~15 m tief, vorbefestigt (Beton/Sandsack) | 3 Zugänge (die 2 Connectoren + 1 Flanken-Notausgang), begehbare Unterstände: Munitionslager, Verbandsplatz, Feldkommandeur/Nachschub |

Abstand Front → Home-Line: ~90–110 m Luftlinie.

### 3. Niemandsland

- **Tiefe ~45–60 m** — weit genug für Feuer & Bewegung am Tag, kurz genug für
  Nacht-Horde-Druck.
- **Inhalt:** Granattrichter (Deckung + Sichtlinien-Brecher), 2–3
  Stacheldraht-Reihen quer, die den Anmarsch in **Lanes** kanalisieren
  (wichtig für Pathing-Graph und für Draht-schneidende Gegner), vereinzelte
  Gefallene/Wracks als Kleinlandmarken, **1 großes Landmark** pro Sektor
  (Panzerwrack o. Ä.).
- Nachts: einzelne Trichter werden zu Spawn-Löchern.

### 4. Woher kommt der Feind

- **Tag:** feste Ausstiegspunkte am gegnerischen Grabenrand — 3–5
  `enemyEntrances` gegenüber der Front, Anmarsch durch die Draht-Lanes. Keine
  „ganze Linie steht auf einmal auf".
- **Nacht:** aus dem Boden / aus den Trichtern im Niemandsland, näher an der
  Front, mehr gleichzeitig.
- **Infiltration (beide):** ein **gefallener** Frontabschnitt wird selbst zum
  Spawn-/Durchflutungspunkt Richtung Connector — das ist der Druckvektor nach
  hinten.

### 5. Vertikalität

- Grabensohle ~1,8–2 m unter Bodenniveau (volle Kopfdeckung im Graben).
- **Feuertritt** ~40 cm: draufsteigen → übers Parapet schauen/schießen, dabei
  exponiert. Das ist der einzige „Höhenwechsel"-Spielinhalt.
- **Parapet** ~0,5 m Sandsack-Brustwehr über Bodenniveau.
- Unterstände nur an der Home-Line begehbar; an der Front flache Nischen.
- Keine Mehrstöckigkeit, kein freies Klettern — hält Kollision und Pathing
  simpel.

### 6. Flanken

- **Harter Korridor.** Links/rechts durchgehend gesperrt (Sumpf, unpassierbares
  Trichterfeld, dichter Draht) — kein Umgehen der Home-Line übers offene Feld.
- Der einzige Weg Front → Home-Line führt durch die Connectoren.
- **1 Flanken-Notausgang** an der Home-Line, damit das Finale mehrere Zugänge
  hat (Drama), aber vorher nicht nutzbar.

### 7. Maßstab

- Front → Home-Line zu Fuß: ~20–30 s Sprint / ~40–50 s gehend unter Beschuss
  durch den engen Connector.
- Einsatzdauer gesamt: ~12–18 min (Aufbau + 4–6 Wellen + Finale). Ein Sektor =
  eine Belagerung, dann vorbei.

### 8. Lesbarkeit

Kein Minikarten-Zwang. In dieser Reihenfolge:

1. **Drei klar unterschiedliche Silhouetten** der Tiefenzonen: Front =
   weit/flach/Draht · Connector = eng/dunkel/überdacht · Home-Line =
   hoch/befestigt/Beton.
2. **Durchgehender „Spine":** Kommunikationsdraht + Laternenpfosten am Boden von
   jedem Frontabschnitt zur Home-Line, **pro Connector farbcodiert**. Panik →
   Blick auf den Boden → der Farbe folgen.
3. **Nummerierte Frontsektoren A / B / C** auf Holzschildern.
4. **Kompass im HUD** mit „HOME"-Marker + Markern für Abschnitte unter Angriff.
5. Eine **Lagekarte** (Tafel an der Home-Line) zeigt gefallene/gehaltene
   Abschnitte — als Status, nicht als Echtzeit-Navigation.

### Grundsatzfragen

- **A — Prozedural, ab wann?** Reicht *eine* handgebaute Greybox für die
  Kern-Validierung (Rückzugs-Loop), oder brauchen wir 2–3 Varianten / den
  Generator früher, um Wiederspielwert und „fühlt sich das prozedural gut an"
  überhaupt beurteilen zu können?
- **B — Skalierung mit Spielerzahl.** Die erste Runde war uneins: *Länge* skalieren
  (mehr Frontabschnitte, Geometrie sonst stabil) vs. *Breite* skalieren (breitere
  Abschnitte, mehr Front pro Spieler). Wir tendieren zu **mehr Abschnitten** (2
  aktiv solo → 4 aktiv bei 4 Spielern), Modulgröße konstant. Richtig?

---

## Wie ich mir die Antwort wünsche

- Pro Leitfrage 1–8: hält der Vorschlag / was ändern / warum (mit konkreten
  Zahlen, wenn du die unseren für falsch hältst).
- Referenzspiele nennen und sagen, *was* genau übertragbar ist.
- Am Ende: **3 wichtigste Korrekturen** am Straw-Man + klare Antwort auf A und B.
