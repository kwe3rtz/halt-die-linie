# Sparring-Antworten — externe KIs

Antworten, die der Nutzer über `SPARRING.md` von externen KIs eingeholt hat.
Rohmaterial für die Design-Runden. Der Planer-Claude liest das hier als Input,
übernimmt aber nichts ungeprüft — es ist Inspiration, nicht Beschluss.

Quelle: `Sparring - 1. Version.pdf` (2026-09-03). Tabellen aus dem PDF-Text
rekonstruiert, Ligatur-/Extraktionsfehler bereinigt; Inhalt unverändert.

---

## Konvergenz — Planer-Beobachtung (nicht von den KIs)

Alle drei Antworten decken sich bei mehreren Punkten auffällig stark:

- **Map: nicht vollprozedural.** Alle drei → authored/modulare Bausteine +
  prozedurales Makrolayout. Vollprozedural gilt einhellig als Falle für
  FP-Orientierung und Balance.
- **Pathing: kein NavMesh.** Alle drei → semantischer Graph aus den
  Grabenmodulen (`spawn → approach → breach → segment → connector → home`).
  Der Graph fällt beim modularen Map-System „gratis" ab und treibt später auch
  Director + Server-KI.
- **Gegner-KI: 3 Verhalten reichen.** Runner/Charger · Suppressor (MG) ·
  Disruptor/Breacher (greift Struktur statt HP). „Klug" wirken Gegner durch
  Audio-Signale + Formationen, nicht durch komplexe KI.
- **Der Rückzugs-Loop ist das Alleinstellungsmerkmal UND der größte
  Risiko-Klumpen** — nicht Netcode, nicht Performance. Rückzug darf sich nicht
  wie Fortschrittsverlust anfühlen: jede Tiefenzone muss das Gefecht *anders*
  machen, und der Verlust eines Abschnitts muss Kosten haben (Depots,
  Beobachter, Boni) — ohne Todesspirale. Rückeroberung selten/teuer.
- **In-Mission-Quest für die aktive Fähigkeit: streichen** (als Dauermechanik).
  Zu flow-brechend. Stattdessen: einmaliger Unlock / automatisch nach Welle X /
  Ladungen, die nur an der Home-Line nachladen.
- **Nachschub: eine Währung, aber mit Budgets/Slots** statt zwei Währungen.
  Tiefe entsteht durch „kann ich es bezahlen?" **und** „wofür verbrauche ich
  meinen knappen Slot?".
- **Jetzt keinen Netcode bauen** — nur netcode-freundlich bleiben (stabile
  Entity-IDs, serialisierbare Commands, explizite Spawn/Despawn, keine Logik im
  Renderer). Gilt schon.
- **Art / Bundle-Größe / LOD jetzt ignorieren** — „optimieren nach Messung",
  erst wenn der echte Sektor existiert.
- **Tag/Nacht ist der größte Scope-Multiplikator** (fast zwei Kampfsysteme).
  Nicht streichen, aber nicht beide Roster parallel entwickeln: je *ein*
  überzeugender Tag- und Nacht-Gegner, denselben Sektor zweimal spielen.

Divergenz: die Reihenfolge der nächsten Schritte (Gemini + Perplexity zuerst
Map/Pathing; ChatGPT zuerst der Rückzugs-Loop als Greybox). ChatGPT ist am
schärfsten beim „nicht zu viel bauen".

---

## Gemini — 2026-09-03

### 1. Map-Generierung: Vollprozedural vs. Modulare Bausteine

Vollprozedural generierte 3D-Gräben per Perlin-Noise oder Marching Cubes sind
eine Falle: hässliche Geometrie, kaputtes Pathing, verheerendes
FP-Leveldesign (Sichtlinien-Fehler, unspielbare Sackgassen).

| Option | Beschreibung | Bewertung |
|---|---|---|
| A — Fully Procedural (Mesh-Gen) | algorithmische Mesh-Erzeugung | maximaler Aufwand, hohes Risiko für Desorientierung und unfaire Sichtlinien |
| B — Modular Stacking (Snap-to-Grid / Tile-basiert) | vordefinierte Block-Typen (T-Stück, 90°-Kurve, Bunker, Parapet, Unterstand) auf fixem Rastersystem | Kontrolle über Lesbarkeit |

**Empfehlung: Option B (Modulares Tile-System).** Festes Grid (z. B. 4×4 m
Blöcke), Generator wählt aus vorgefertigten Bauzeichnungen.

- **Lesbarkeit:** 3-Farben-Kabel-Prinzip (wie Left 4 Dead, Deep Rock Galactic).
  Ein dickes Telefonkabel verläuft durchgehend am Boden/an der Grabenwand von
  der Front bis zur Home-Line. Spieler in Panik schauen auf den Boden und
  folgen der Kabelfarbe.
- **Skalierung 1–4 Spieler:** nicht die *Breite* des Sektors skalieren (zerstört
  Graben-Gefühl und Sichtachsen), sondern die *Länge der Front* (z. B. 2 aktive
  Abschnitte solo, 4 bei 4 Spielern) und die Dichte der Gegnerwellen.

### 2. Gegner-KI & Pathing

| Option | Beschreibung | Bewertung |
|---|---|---|
| A — Vollständiges NavMesh (A*) pro Gegner | — | teuer im Browser bei Horden (Nacht), komplexe Re-Calculations bei zerstörbarer Deckung |
| B — Hybrid: Graph-Waypoints im Graben + Directional Steering im Niemandsland | Niemandsland: direkt auf die Frontlinie zu (Raycast-Hindernisvermeidung reicht). Im Graben: vereinfachter Graph (Knoten an Grabenkreuzungen), kürzester Pfad zum nächsten Spieler/Ziel | — |

**Empfehlung: Option B.** Das Nav-Netzwerk automatisch aus dem modularen
Grid-System erzeugen (Map-Option B liefert die Graph-Knoten gratis mit).

**KI-Tiefe:** keine komplexe Verhaltensbaum-KI. Drei Basis-Verhalten reichen:

1. **Runner/Charger** — ignoriert Deckung, rennt zum Ziel (Wiedergänger,
   Bajonett-Charger).
2. **Suppressor** — läuft bis Sichtlinie, stützt sich ab, feuert Salven
   (MG-Trupp).
3. **Breacher** — sucht gezielt platzierte Verteidigung/Draht und zerstört sie
   mit Sprengstoff (Sturmtrupp, Grabenräumer).

Referenz: *Vermintide 2* — Gegner wirken klug durch auditive Signale (Heulen,
Rüstungsrascheln) und Formationen, nicht durch komplexe KI.

### 3. Rückzugs-Loop & In-Mission-Quests

Design-Dilemma: Der Rückzug ist exzellente Dynamik (*Hell Let Loose* Offensive,
*Helldivers 2*). Aber die Fähigkeiten-Quest beim Feldkommandeur zwingt Spieler
zurück zur Home-Line genau dann, wenn sie an der Front am nötigsten gebraucht
werden.

**Empfehlung: Hol-und-Bring-Quest beim Feldkommandeur streichen.** Fähigkeiten
dynamisch über Wellen-Fortschritt oder Leistung freischalten (z. B. „30 Gegner
besiegt", „Welle 2 überstanden").

**Rückzug lesbar machen:** Signalpfeife (Audio-Cue); Countdown, bevor die
Frontlinie von Sperrfeuer/Gas eingenommen wird (verhindert Bunkern);
Sperrfeuer-Vorhang, der nach hinten nachrückt — wer zu lange wartet, stirbt im
Artillerieregen.

### 4. Nachschub-Ökonomie

| Option | Beschreibung |
|---|---|
| A — Zwei Währungen (In-Game vs. Meta) | Munition im Einsatz für Barrikaden/Fähigkeiten, Ressourcen nach Extraktion fürs Quartier |
| B — Eine universelle In-Einsatz-Ressource | „Baumaterial/Nachschub" |

**Empfehlung: Option B im Einsatz, strikt getrennt vom Quartier.** Nur eine
In-Game-Währung: **Nachschubpunkte** (aus Kill-Boni, Wellenabschluss,
Versorgungskisten im Niemandsland).

- Tiefe durch Zielkonflikt: jetzt Munition/Heilung für mich ODER Stacheldraht an
  der Engstelle ODER sparen für das schwere MG der Home-Line.
- Referenz: *GTFO* — Ressourcen extrem knapp, müssen im Team verhandelt werden.

### 5. Technik: Babylon.js Performance & Netcode

**Horde-Rendering (Nacht):** 50+ individuelle glTF-Skelett-Animationen bringen
den Canvas zum Ruckeln. Lösung: **Thin Instances / Instanced Meshes** +
**Vertex Animation Textures (VAT)** (Animationen in Texturen, GPU-berechnet) →
500+ Gegner bei 60 FPS.

**Netcode:** Sim ist bereits entkoppelt (`src/sim/**`) — perfekte Basis. Kein
Lockstep → **Client-Prediction + Server-Reconciliation**. Bei 50 Entities nicht
jeden Tick den vollständigen Zustand replizieren, sondern Ziel-Punkte/Pfade der
KI + Korrekturen bei Abweichung (Snapshot Interpolation). **Geckos.io** (UDP über
WebRTC) statt WebSockets — TCP erzeugt Head-of-Line-Blocking.

### Größter Risiko-Klumpen

Das **„Niemandsland vs. Graben"-Sichtlinien-Problem in First-Person.** Im Graben
siehst du 5 m weit bis zur Kurve — toller Grabenhorror, aber keine Übersicht.
Schaust du übers Parapet und schießt auf Boxen/Kapseln, fühlt es sich flach an.
Wenn das Visuelle (Nebel, Mündungsfeuer, Silhouetten in Dunkel/Rauch) nicht von
Anfang an mitgedacht wird, scheitert das FP-Gefühl komplett.

### 3 wichtigste nächste Schritte (Gemini)

1. Modulares Grid-Layout prototypen (Tile-System Straight/Corner/T-Junction/
   Parapet) → simples Waypoint-Netzwerk. Löst Level-Gen und KI-Pathing
   gleichzeitig.
2. VAT / Instancing implementieren — früh testen, wie viele animierte Platzhalter
   die Pipeline auf einem Mittelklasse-Laptop schafft.
3. Rückzugs-Mechanismus als Graybox vertesten (Front → Verbindungsgraben →
   Home-Line) mit temporärem Artillerie-Sperrfeuer-Trigger.

---

## Perplexity — 2026-09-03

### 1. Der Grabensektor: Map-Design für First-Person

Orientierung im Graben ist das Hauptproblem. Zu viele Verzweigungen / zu wenig
Landmarks = Spieler verirrt sich.

| Ansatz | Wie | Trade-offs |
|---|---|---|
| Modulare Hand-Bausteine (vorgefertigte Grabensegmente, T-Kreuzungen, Ecken, Bunker) | Generator wählt aus einem Graphen (Frontlinie = Hauptachse, Verbindungsgräben = Äste, Home-Line = Rückgrat) Module aus und setzt sie zusammen | + Kontrolle über Lesbarkeit, Engstellen, Deckung. – Mehr Art-Arbeit upfront, aber wiederverwendbar |
| Vollprozedural mit Regeln (Noise + Constraints) | Grabenverläufe algorithmisch (Perlin-Noise für wellige Frontlinie), Verbindungsgräben im festen Rhythmus (alle 20–30 m), Home-Line parallel | + Hohe Varianz. – Risiko unspielbarer Layouts, mehr Debug |
| Hybrid (handgebaute „Sektor-Templates" + prozedurale Variation) | 5–10 Sektor-Archetypen (breit/schmal, viele/wenige Verbindungsgräben), prozedural nur Details (Draht, Sandsäcke, Trümmer) | + Beste Kontrolle bei guter Varianz. – Mehr Designarbeit zu Beginn |

**Empfehlung: Hybrid mit modularen Bausteinen.** FP braucht konsistente
Lesbarkeit: Schilder („A-7", „B-3"), Kompassrose im HUD, wiedererkennbare
Landmarks (umgekippter Panzer, ausgebrannter Bunker, besonderer Grabenknick).
Module erlauben gezielte Landmark-Platzierung. Referenz: *Arma Reforger*
Trench-Systeme.

**Skalierung:** Breite der Frontlinie dynamisch (mehr Spieler = breitere Front,
mehr Verbindungsgräben), ~15–20 m Frontbreite pro Spieler. Home-Line fix breit.
*(Anm. Planer: widerspricht Gemini, das Länge statt Breite skalieren will.)*

### 2. Gegner-Vielfalt & KI

| KI-Tiefe | Was | Trade-offs |
|---|---|---|
| Minimal (geradliniger Anmarsch, kein Pathing) | Gegner laufen in direkter Linie zum nächsten Spieler | + Einfach. – Wirkt dumm, v. a. bei MG/Grabengängern |
| Einfaches Pathing (NavMesh oder Wegpunkte entlang der Gräben) | Gegner folgen Grabenverläufen, weichen aus, nutzen Deckung opportunistisch | + Glaubwürdiger. – Mehr Aufwand |
| Verhaltensbäume (Anmarsch → Deckung → Sturm → Nahkampf) | Gegner reagieren auf Spieleraktionen (unterdrückt → Deckung, flankieren) | + Tiefes Gameplay. – Komplexität explodiert |

**Empfehlung: Einfaches Pathing mit Wegpunkten entlang der Grabenachsen.** Jeder
Grabenabschnitt = Node, Verbindungen = Kanten. Referenz: *Deep Rock Galactic*
(Graph-Pathing in Höhlen).

**Priorisierte Gegner-Reihenfolge:**
1. Bajonett-Charger (schnell, direkt) — erhöht Druck.
2. MG-Trupp (unterdrückt, zwingt in Deckung) — erzwingt Teamplay.
3. Grabenräumer (öffnet Parapet) — bedroht Platzierungen.
4. Sturmtrupp (jagt Platzierungen) — Konter gegen Bauen.

Pathing ist nötig für alle außer dem Charger. Ohne Pathing wirken MG-Trupps und
Grabengänger albern.

### 3. Fechtender Rückzug lesbar machen

| Mechanik | Wie | Trade-offs |
|---|---|---|
| Visuelle Marker (Frontlinie rote Zone auf Minikarte, Home-Line grün) | Spieler sehen live, welche Abschnitte gefallen sind | + Klar. – UI-Arbeit |
| Akustische Signale (Funk: „Abschnitt B-4 gefallen!", „Rückzug auf Home-Line!") | Audio-Feedback für Fortschritt | + Immersiv. – Kann untergehen |
| Progressive Zerstörung (Grabenwände brechen, Draht reißt, Bunker brennen) | Visuelles Feedback für Verlust | + Sehr lesbar. – Mehr Art/Shader |

**Empfehlung: Visuelle Marker + akustische Signale.** Minikarte mit Farbcode
(rot = gefallen, gelb = unter Angriff, grün = sicher) + Funkdurchsagen. Referenz:
*Helldivers 2*.

**Spannung statt Frust:** Rückzug *aktiv* machen. Spieler halten Engstellen
(Verbindungsgräben), um Zeit zu gewinnen — jeder gehaltene Verbindungsgraben
verzögert den Home-Line-Verlust um X Sekunden.

### 4. Aktive Fähigkeit per In-Mission-Quest

| Methode | Wie | Trade-offs |
|---|---|---|
| In-Mission-Quest (zur Home-Line laufen, melden) | Spieler müssen physisch zurücklaufen | + Immersiv, erzwingt Rückzug. – Unterbricht Combat-Flow |
| Automatisch nach Zeit/Wellen | schaltet nach Welle X / Y Minuten frei | + Kein Flow-Bruch. – Weniger immersiv |
| Ressourcen-basiert (Nachschub ausgeben) | Spieler kaufen Fähigkeit im Einsatz | + Strategische Entscheidung. – Ökonomie-Balance nötig |

**Empfehlung: Hybrid** — Fähigkeit schaltet automatisch nach Welle 3 frei, ABER
Spieler müssen einmal zur Home-Line laufen, um sie zu aktivieren (einmal pro
Einsatz, nicht jede Welle). Referenz: *Deep Rock Galactic* Call-Ins.
**Bevorzugte Alternative:** Fähigkeit von Anfang an verfügbar, 3 Ladungen, nur an
der Home-Line nachladbar → erzwingt Rückzug ohne Flow-Bruch.

### 5. Nachschub-Ökonomie

| Modell | Wie | Trade-offs |
|---|---|---|
| Eine Währung (Nachschub für alles) | eine Ressource für Fähigkeiten, Platzierungen, Wandwaffen | + Einfach. – Entscheidungen können flach werden |
| Zwei Währungen (Nachschub + Spezialressource) | Nachschub für Basis, „Pionier-Material" für Bauen/Spreng | + Tiefere Entscheidungen. – Mehr Balance |
| Klassenspezifische Ressourcen | Sanitäter: Verbandsmaterial, Pionier: Sprengstoff | + Rollenidentität. – Kann Solo bestrafen |

**Empfehlung: Eine Währung, aber mit „Budgets" pro Kategorie.** Z. B. 100
Nachschub/Einsatz, davon max. 40 für Platzierungen, 30 für Fähigkeiten, 30 für
Wandwaffen. Referenz: *Rainbow Six Siege* Gadget-Budget.

### 6. Onboarding — die erste Stunde

1. **Einsatz 1** (Tag, Welle 1–3): nur Schütze, nur Primärwaffe, nur
   Linieninfanterie. Überlebe 3 Wellen, extrahiere. (10 Min)
2. **Quartier:** Soldat bekommt XP, MG-Schütze freischalten. (2 Min)
3. **Einsatz 2** (Tag, Welle 1–5): Schütze oder MG-Schütze; + MG-Trupp. Halte
   Frontlinie, MG aufstellen lernen. (15 Min)
4. **Quartier:** Pionier freischalten, erste Platzierung (Sandsäcke). (2 Min)
5. **Einsatz 3** (Nacht, Welle 1–4): nur Wiedergänger. Überlebe mit
   Taschenlampe, Angst-Mechanik. (15 Min)
6. **Quartier:** erste aktive Fähigkeit (z. B. Pionier Grabenreparatur). (2 Min)
7. **Einsatz 4** (Tag, Welle 1–6): alle 3 Klassen, Platzierungen nutzbar.
   (20 Min)

Gesamt ~60–70 Min, alle Kernmechaniken gesehen, ohne Überforderung.

### 7. Koop-Design: 4 Rollen

| Ansatz | Wie | Trade-offs |
|---|---|---|
| Harte Rollen-Abhängigkeit | ohne richtige Rolle scheitert das Team | + Echtes Teamplay. – Kann Solo unmöglich machen |
| Weiche Synergien (jede Rolle kann alles, mit Bonus) | Schütze belebt (langsamer), Pionier schießt (ungenauer) | + Solo bleibt stark. – Rollenidentität leidet |
| Hybrid (Basis-Aktionen für alle, Signatur für Rolle) | jeder kann verbinden, nur Sanitäter hat schnelle Belebung | + Beste Balance. – Feine Balance nötig |

**Empfehlung: Hybrid.** Jeder kann jede Basis-Aktion, nur die Signatur-Klasse
hat volle Effizienz (Schütze belebt 10 s, Sanitäter 3 s + HP-Bonus; nur Pionier
platziert Draht/Sandsäcke). Referenz: *Deep Rock Galactic*. **Solo-Balance:**
Solo-Spieler bekommt 2–3 KI-Bot-Soldaten für Basis-Aktionen, keine Signature.

### 8. Prozedurale Grabengenerierung (Technik)

Graph-basierte Generierung mit modularen Segmenten:
1. Frontlinie: Perlin-Noise / Random-Walk (Länge = Spielerzahl × 20 m).
2. Home-Line parallel: Abstand 50–80 m, gleiche Länge.
3. Verbindungsgräben: alle 20–30 m senkrecht, leichte Kurven.
4. Module: pro Abschnitt zufällig aus Pool (gerade, Kurve, T-Kreuzung, Bunker).
5. Landmarks: 3–5 pro Sektor (Panzerwrack, Bunker, Krater).

Gleichzeitig ein **NavGraph** erzeugen (Nodes = Abschnitte, Kanten =
Verbindungen) — für KI-Pathing *und* Minikarte. Referenz: *Sammy's Trench System*
(Arma Reforger), Spline-basiert + modulare Segmente.

### 9. Koop-Netcode

Server-autoritativ + State-Replikation ist der richtige Weg (kein Lockstep).

| Komponente | Empfehlung |
|---|---|
| Tick-Rate | 30 Hz Server (60 Hz wenn Bandbreite es zulässt) |
| Client-Prediction | nur für Spieler-Input (Bewegung, Schießen), Server korrigiert |
| Entity-Interpolation | 100–150 ms Buffer für andere Spieler/Gegner |
| Snapshot-Delta | Server sendet nur geänderte Entities pro Tick |
| Input-Kompression | 4 Bytes pro Player-Input (Position + Rotation + Action-Bits) |

Node-Server: WebSocket (Socket.io oder `ws`), autoritativer Sim-Loop (gleicher
Code wie Client, ohne Rendering), State serialisieren (JSON/Binary), Client
interpoliert. Risiko: Bandbreite bei 4 Spielern + 50 Gegnern — früh mit
Entity-Culling testen. *(Anm. Planer: WebSocket hier, Gemini empfiehlt UDP/
WebRTC — offener Punkt.)*

### 10. Rendering-Skalierung in Babylon.js

| Technik | Wann |
|---|---|
| Thin Instances | 100+ identische Gegner (Nacht-Horde), Matrizen im Buffer, minimaler CPU-Overhead |
| Regular Instances | 10–100 Gegner mit Variation |
| LOD | ferne Gegner = niedrigeres Poly-Modell |
| Frustum-Culling | macht Babylon automatisch, auf korrekte Bounding-Boxes achten |

Grenze im Browser: ~500–1000 Thin-Instance-Gegner bei 60 FPS auf
Mittelklasse-PC. Früh auf schwacher Hardware (Laptop-iGPU) testen.

### 11. Bundle-Größe

| Methode | Einsparung | Aufwand |
|---|---|---|
| Tree-Shaking (nur genutzte Module) | 30–50 % | mittel |
| Code-Splitting (Lobby/Quartier separat) | 20–30 % | hoch |
| nur Core (kein GUI, kein Loader) | 40–60 % | mittel |

**Empfehlung: Tree-Shaking + minimale Core-Imports.** Nur genutzte
`@babylonjs/core`-Module (Mesh, Material, Camera, Light). `@babylonjs/loaders`
und `@babylonjs/gui` nicht ins Haupt-Bundle. Code-Splitting erst, wenn
Lobby/Quartier > 500 KB.

### 12. Art-Pipeline: Schematischer Stil

**Flat-Shaded Low-Poly + gedämpfte Palette.**

| Asset-Typ | Empfehlung |
|---|---|
| Modelle | glTF 2.0, 500–2000 Tris pro Charakter, 100–500 Tris pro Gegner |
| Texturen | 512×512 Atlas pro Klasse, KTX2 |
| Shader | Flat-Shading (kein Lighting), Farbvariation per Vertex-Color |

Viel per Shader statt Assets: Farbvariation, Abnutzung, schematisches Blut.
Referenz: *Battlefield 1* (schematischer Look in bestimmten Modi).

### 13–15. Backlog, Priorisierung, Risiken

**Überflüssig (vorerst):** Sturmtruppler-Klasse (erst die 4 Grundklassen
polieren) · Wandwaffen-Vielfalt (2–3 reichen für v1) · Nationen-Traits
(kosmetisch, kein Gameplay-Hebel).

**Fehlt:** Sound-Design (kritisch für Horror/Nacht) · UI/UX-Tests
(Onboarding-Flow) · Performance-Tests (schwache Hardware).

**Empfohlene Reihenfolge:**
1. Modulare Graben-Bausteine + Graph-Pathing
2. Gegner-Vielfalt (4 Typen) + einfaches KI-Pathing
3. Rückzugs-Loop + Home-Line-Mechanik
4. Klassen + Signature-Fähigkeiten
5. Quartier + Nachschub-Ökonomie
6. Koop-Netcode (2 Spieler)

**Größter Risiko-Klumpen: Koop-Netcode + State-Replikation.** Wenn das nicht
performant läuft, kippt das Fernziel. Früh testen (nach Schritt 3), nicht am
Ende.

**3 wichtigste nächste Schritte (Perplexity):** modulare Graben-Bausteine +
Graph-Pathing · 4 Gegner-Typen + einfaches Pathing · Koop-Netcode-Prototyp
(2 Spieler) früh.

**Wo Perplexity widerspricht (der ursprünglichen Idee):** In-Mission-Quest zu
flow-brechend (→ Hybrid) · vollprozedurale Map zu riskant (→ Templates +
Variation) · eine Währung für alles zu flach (→ Budget-Kategorien).

---

## ChatGPT — 2026-09-03

**Ausgangspunkt:** Die Grundidee trägt. Das größte Risiko ist *nicht* Babylon,
Netcode oder Bundle-Größe — es ist, dass der aktuelle Build noch nicht den
eigentlichen Kern von „Halt die Linie" testet (FPS-Bewegung, Hitscan,
Wave-Director gegen langsame Nahkämpfer; es fehlen echter Sektor, Rückzug,
Fernkampf, Tag/Nacht, taktische Ausgaben). Gefahr: technisch sauber sehr weit
bauen, bevor klar ist, ob das zentrale Versprechen — **Front halten, Boden
verlieren, geordnet zurückfallen, an der Home-Line überleben** — Spaß macht.

### 1. Sektor: nicht vollprozedural

Der dreistufige Aufbau ist richtig, aber in FP gefährlich (Schlauch oder
Labyrinth), zusätzlich müssen Frontabschnitte fallen und rückerobert werden
können.

- **Option A — komplett handgebaut:** + max. Kontrolle über Sichtlinien,
  Landmarken, Rückzugswege, Pacing. – wenig Wiederspielwert, hoher Aufwand.
- **Option B — vollständig prozedural:** + hohe Variation. – enormes
  Balancingproblem: Sichtlinien, Spawnpunkte, MG-Felder, Engstellen und
  Rückzugswege müssen *gleichzeitig* funktionieren. Ein formal gültiger Sektor
  ist noch kein guter FPS-Level.
- **Option C — authored modules + prozedurales Makrolayout:** → **das nehmen.**

Baue: 6–10 Frontmodule · 4–6 Verbindungsgrabenmodule · 3–4 Home-Line-Varianten ·
definierte Kreuzungen, Bunker, Traversen, Ausweichstellen. Jedes Modul bekommt
**semantische Metadaten:** `connections`, `coverSlots`, `enemyEntrances`,
`defenseAnchors`, `landmarks`, `navLanes`, `buildSlots`. Der Generator entscheidet
über die Anordnung, nicht über jedes Stück Geometrie. Lektion eher aus *Deep Rock
Galactic* als aus klassischen Roguelikes: Räume dürfen variieren, aber Spieler
brauchen markante Strukturen und verständliche Makrogeometrie.

**Navigation:** Minimap *nicht* als Reparatur für verwirrendes Leveldesign.
Stärker: deutlich unterschiedliche Silhouetten der drei Tiefenzonen · nummerierte
Frontsektoren A/B/C · farbige/typografische Feldschilder · Kommunikationsdraht /
Lampen / Pfosten als „Spine" zur Home-Line · extrem erkennbare
Home-Line-Silhouette · Kompass mit „HOME" und aktiven Sektor-Markern. *Wenn du
nach zehn Minuten eine Minimap brauchst, damit Tester zurückfinden, ist der
Sektor zu kompliziert.*

**Spielerzahl:** nicht über Mapbreite skalieren. Geometrie stabil halten,
stattdessen aktive Angriffsachsen, Spawnmenge und gleichzeitig bedrohte
Frontabschnitte skalieren. *(= Gemini, ≠ Perplexity.)*

### 2. Gegner-KI: weniger Intelligenz, mehr unterschiedliche Verben

Nicht zehn intelligente Typen — Gegner sollen den Spieler zu *unterschiedlichen
Entscheidungen* zwingen. Für den nächsten Prototyp nur **drei Verhaltensweisen:**

- **Linieninfanterist** — rückt von Deckung zu Deckung vor, bleibt gelegentlich
  stehen, schießt.
- **Stürmer** — ignoriert teilweise Deckung, versucht in den Graben zu kommen.
- **Disruptor** — greift nicht primär HP an, sondern die Verteidigungsstruktur
  (Grabenräumer, Platzierungsjäger).

Ergibt: Positionsdruck, Zeitdruck, Zielpriorisierung. Mehr braucht der Kern
zunächst nicht.

**Pathfinding:** noch kein allgemeines NavMesh. Das Grabensystem ist ein
Sonderfall mit klaren Korridoren → semantischer Graph:
`spawn → approach lane → breach → trench segment → connector → home`. Innerhalb
eines Moduls ein paar lokale Wegpunkte. Nebeneffekt: derselbe Datensatz treibt
später Director, Spawnlogik *und* serverseitige KI — passt zur strikten
Sim/Renderer-Trennung. Volles dynamisches Pathfinding erst, wenn ein konkreter
Gegnermechanismus es beweist.

### 3. Der Rückzug ist das eigentliche Alleinstellungsmerkmal

Hier den größten Designaufwand investieren. Der Rückzug darf sich nicht wie
verlorener Fortschritt anfühlen.

- **Schlecht:** Front hat 100 HP → fällt → Spieler verliert Gebiet → alles wird
  schwieriger. Dann ist jeder Rückzug ein Failure-State in Zeitlupe.
- **Besser:** jede Verteidigungstiefe verändert das Gefecht:
  - **Frontlinie:** beste Sichtlinien · max. Ressourcen-Ertrag · weit
    auseinanderliegende Angriffsachsen.
  - **Verbindungsgraben:** extreme Engstellen · Nahkampf gefährlicher · MG
    besonders stark · weniger Ressourcenquellen.
  - **Home-Line:** starke vorbereitete Verteidigung · Munitionslager ·
    Verbandsplatz · aber mehrere Zugänge gleichzeitig und **finale Uhr**.

→ Rückzug = „wir verlieren strategisch, gewinnen aber taktisch eine neue
Situation".

**Verlust muss Kosten verursachen.** Frontabschnitte enthalten: Nachschubdepots,
Beobachtungsposten, Munitionskisten, Artilleriebeobachter, Extraktionsboni. Dann
tut Aufgeben weh, ohne Todesspirale.

**Rückeroberung selten.** Modell: `stabil → bedrängt → gebrochen → verloren`.
Nach „verloren" ist Rückeroberung ein teures optionales Gegenmanöver — nicht
ständiges Hin- und Hercapturen (sonst Battlefield-Domination im Graben).

### 4. Designwiderspruch: harte Elite-Konter vs. dauerhaft spielbares Solo

Solo soll dauerhaft voll spielbar bleiben, aber Panzer/Koloss sollen harte
Konter + Spreng/AT verlangen. Mit Minimal-Loadout droht: Spieler trifft Elite →
falsche Klasse → Encounter faktisch unlösbar = **Loadout-Falle**, kein
taktischer Konter.

Unterscheiden:
- **Soft requirement:** Spezialist löst das Problem effizient.
- **Hard requirement:** die Spezialressource muss im Level *garantiert*
  verfügbar sein.

Panzer-Beispiel: Pionier hat Sprengladung (bester Konter) · andere Klassen holen
eine seltene AT-Wandwaffe / Feldladung · alternativ Umgebungskonter
(Artilleriesignal, Sprengstoffdepot). **Grundregel Koop:** Rollen sollen Krisen
*besser* lösen, nicht anderen Spielern die *Erlaubnis* geben, sie überhaupt zu
lösen.

### 5. Klassen: gut, aber zu funktionsgebunden

Nicht wie MMO-Klassen bauen. Struktur: **jeder kann** schießen, improvisiert
heilen, Munition aufnehmen, Basis-Interaktionen. **Spezialist kann es stark:**
Sanitäter revivet erheblich schneller + Verbandsplatz · Pionier repariert und
baut richtige Befestigungen · MG-Schütze kontrolliert eine Angriffslinie ·
Schütze bekommt Mobilität/Präzision/Aufklärung. → Solo funktioniert automatisch
besser.

**Aktive Fähigkeit über In-Mission-Quest:** als *Dauermechanik* schlecht. Erstes
Mal „melde dich beim Feldkommandeur" = schönes Onboarding; beim 47. Einsatz eine
Pflicht-Rennstrecke. Stattdessen: (1) einmaliger Klassen-Unlock, oder (2)
optionaler Feldauftrag, der die Fähigkeit *verbessert* statt sie verfügbar zu
machen. Die Basisklasse muss nach dem Loadout sofort vollständig funktionieren.

### 6. Nachschub: eine Währung, aber nicht ein einziger Entscheidungsraum

Zwei taktische Währungen vermeiden (wird zu Buchhaltung). Ein Nachschubpool, aber
nicht alles beliebig gegeneinander austauschbar:

- Sandsack: 15 · Munitionskiste: 30 · MG-Stellung: 50 · KI-Trupp: 60

Zusätzlich über **Slots + Verfügbarkeit** limitieren: nur 2 schwere Platzierungen
pro Frontabschnitt · 1 KI-Trupp gleichzeitig · Wandwaffe nur an bestimmten
Depots. → Knappheit durch zwei Achsen: „Kann ich es bezahlen?" und „Wofür
verbrauche ich meinen knappen Slot?" — stärker als eine zweite Währung.
Meta-Fortschritt im Quartier darf eine andere Ressource haben (eigener
Entscheidungskontext).

### 7. Erste Stunde — kleiner als die Feature-Liste

- **0–10 Min:** Schütze, Gewehr, ein Frontabschnitt. Schießen, Reload, Munition,
  Deckung.
- **10–25 Min:** drei Frontabschnitte, Gegner greifen an zwei Stellen an. Spieler
  lernt an Signalen: „Diese Linie bricht."
- **25–40 Min:** erster garantierter Rückzug. Verbindungsgraben, Home-Line
  verteidigen.
- **40–50 Min:** erste taktische Nachschubentscheidung: Munition oder
  Feldbefestigung.
- **50–60 Min:** erste Klassenalternative oder kurzer Nacht-Einsatz.

Noch kein Quartierbaum mit 12 Upgrades, keine 5 Klassen, keine 10 Gegner, keine
Nationenprogression. Danach muss der Spieler sagen können: *„Ich hielt eine
Front, verlor sie, zog mich zurück und rettete den Sektor."* Wenn *dieser Satz*
Spaß gemacht hat, lohnt sich der Rest.

### 8. Tag/Nacht = größter Scope-Multiplikator

Fast zwei Kampfsysteme:
- **Tag braucht:** ranged AI, Cover, Suppression, Sichtlinien, taktisches
  Vorrücken.
- **Nacht braucht:** Massenspawns, Nahkampfnavigation, Crowd Management,
  Lesbarkeit bei Dunkelheit, anderes Audio/Pacing.

Nicht streichen (Teil des Hooks), aber **nicht beide Roster parallel
entwickeln.** Baue einen überzeugenden Tag-Gegner + einen überzeugenden
Nacht-Gegner, dann denselben Sektor zweimal spielen. Fühlen sich die beiden Runs
wie zwei Seiten desselben Spiels an → wichtiger Risikopunkt geklärt.

### 9. Technik: Architektur ist vernünftig — kein Selbstzweck

Die `src/sim/**`-Grenze ist die richtige Vorbereitung. **Trotzdem jetzt keinen
Netcode bauen** — auch nicht „nur schon mal das Grundgerüst". Schwer wird später:
Ownership, Prediction, Hit-Validation, Reconciliation, Entity Lifetime,
Paketverlust/Latenz, Zustandskompression. Alles leichter mit klar definierten
Inputs/States. Jetzt nur **netcode-freundlich bleiben:** stabile Entity-IDs ·
serialisierbare Commands · keine Gameplay-Logik im Renderer · explizite
Spawn/Despawn-Ereignisse · klarer authoritative state. Mehr nicht. Dass Koop
Fernziel und noch ohne Netcode ist, ist kein Defizit.

### 10. Rendering / Art / Bundle: fast komplett ignorieren

Boxen-Testgraben + Platzhalter ist perfekt. Vorerst *kein* LOD-System, *keine*
KTX2-Pipeline, *keine* Shader-Art, *keine* Zeit für Babylon-Verkleinerung. Diese
Arbeit ist erst wertvoll, *nachdem* der echte Sektor existiert. „Optimieren nach
Messung" — du weißt noch nicht, welches Performanceproblem dein echtes Spiel
haben wird.

### Backlog — streichen / verschieben

Grundentscheidungen (FPS, 3D, kein TD, kein Permadeath, Kader-Modell) **nicht neu
aufrollen.** Nach *deutlich* später schieben: Sturmtruppler-Klasse · volles
5+5-Gegnerroster · Panzer · komplexes Quartier · Nations-Vertrautheit · seltene
exotische Wandwaffen · Art-Pipeline-Optimierung · Multiplayer · „Krieg"-Modus ·
ausgefeilte prozedurale Variation. **Nations-Vertrautheit** ist der erste
Streichkandidat — erzeugt Zahlen, aber noch keine spannende Entscheidung.

### Größter Risiko-Klumpen (ChatGPT)

**Der Rückzugs-Loop + Leveldesign** — nicht Netcode, nicht Performance, nicht
Contentmenge. Wenn der Spieler am Ende nur einen engeren Korridor nach hinten
läuft und dieselben Gegner an einer anderen Barrikade abschießt, ist das zentrale
Feature funktional da und spielerisch bedeutungslos. Du brauchst den Moment:
*„Links ist eingebrochen. Wir können noch zwei Minuten um den Abschnitt kämpfen —
oder Munition mitnehmen und die Kreuzung dahinter vorbereiten."* Das ist „Halt
die Linie". Funktioniert dieser Entscheidungsmoment, tragen Klassen, Koop,
Wirtschaft und Meta darauf auf.

### Die drei nächsten Arbeitspakete (ChatGPT-Vorschlag)

1. **AP „Verteidigung in der Tiefe"** — eine einzige handgebaute Greybox:
   Front A + B + C → zwei Connectoren → Home-Line. Dazu: Abschnittsbesitz,
   Breach-State, automatische Rückzugslogik, Verlust von Front-Boni,
   Home-Line-Finale.
   *Abnahme:* Ein Tester versteht ohne Erklärung, wann eine Stellung verloren ist
   und wohin er zurückfallen soll.
2. **AP „Zwei Kampfsprachen"** — nur: Tag = Rifleman mit Deckung + Schuss;
   Nacht = aggressiver Wiedergänger. Derselbe Sektor, derselbe Wave-Director,
   anderes Verhalten.
   *Abnahme:* Beide Einsätze verlangen sichtbar unterschiedliche Positionierung
   und Prioritäten.
3. **AP „erste echte Entscheidung"** — exakt eine Klasse jenseits des Schützen +
   drei Nachschubausgaben. Kandidat: Pionier (Sandsack, Draht, Munitionskiste
   oder Sprengladung).
   *Abnahme:* Spieler diskutieren nach dem Run, *wofür* sie Nachschub hätten
   ausgeben sollen — nicht *dass* ihnen welcher fehlte.

---

---

# Runde 2 — Sektor / Map (2026-09-03)

Briefing: `SPARRING.md` v2 (Straw-Man zu den 8 Map-Leitfragen). Voller Wortlaut
des Briefings in `SPARRING-LOG.md`. Wieder Gemini, Perplexity, ChatGPT.

## Konvergenz Runde 2 — Planer-Beobachtung (nicht von den KIs)

Alle drei sind sich bei den wichtigsten Punkten einig:

- **Struktur des Straw-Mans hält** (Front → Connector → Home, greybox zuerst,
  Generator später). Die **Zahlen sind durchweg zu groß.**
- **Alles lateral schrumpfen, ~25–40 %.** Grober Konsens-Korridor:
  - Frontabschnitt: **15–20 m** statt 25–30 m.
  - Gesamtfront solo: **35–60 m** statt 85 m (Gemini 35–40 · Perplexity ~36 ·
    ChatGPT 50–60).
  - Connector: **20–35 m** statt 40–50 m, mit 2–3 Knicken / kleinen Pockets.
  - Home-Line: **30–45 m** statt 60 m.
- **Transitzeit ist zu lang.** Freier Rückweg Front → Home soll **~8–15 s** sein,
  nicht 20–30 s. Designregel (ChatGPT/Gemini): *Transit ist kurz — der Rückzug
  wird lang, weil der Feind ihn verlängert*, nicht durch Distanz. (Perplexity
  will das *bekämpfte* Zurückweichen durch den Connector bei 45–60 s — Divergenz
  über die Dauer des Gefechts, Einigkeit über den freien Laufweg.)
- **Die eine Greybox von Tag 1 aus modularen Rasterbausteinen bauen**, nicht als
  Freiform-Mesh — dieselben Blocks, die später der Generator nutzt (Gemini:
  10×10-m-Grid). Alle drei explizit.
- **Grundsatzfrage B: mehr Abschnitte, nicht breitere.** Abschnittsbreite
  konstant (~15–20 m), solo 2 aktiv → 4 Spieler 4 aktiv. Primärer Skalierungs-
  Regler ist der **Director** (Gleichzeitigkeit der Angriffsachsen, Gegnerzahl),
  Geometrie wächst nur mild mit.
- **Feuertritt automatisieren** — nahtlose Stufe/Proximity-Rampe beim Herangehen
  an die Wand, **kein manuelles Anspringen** (Kollisionskapsel-Hakeln in FP).
  ChatGPT hält zusätzlich die 40 cm für zu niedrig (Auge bleibt unter dem
  Parapet) → eher Feuertritt +65–85 cm über Sohle; Perplexity hält die Maße
  historisch für ok. Einigkeit: kein Sprung.
- **Infiltration durch gefallene Abschnitte behalten** (starke Regel: Gebiet
  verlieren verändert den Graphen), aber **Gegner nie im Sichtfeld spawnen** —
  Rauch-/Sperrfeuer-Vorhang über dem verlorenen Abschnitt als visuelle Deckung
  fürs Spawnen (Gemini, ChatGPT). Perplexity: im gefallenen Abschnitt gar nicht
  neu spawnen, nur den Pfad öffnen, damit vorhandene Gegner durchfluten.
- **Semantische Routen dürfen deterministisch sein — ihre Darstellung nicht.**
  Keine drei sauberen sichtbaren Draht-Korridore (→ Tower-Defense-Gefühl).
  Statt fester Draht-Wände: versetzte Drahtfelder, unterbrochene Reihen,
  Trichtergruppen, Sichtblocker. Mehr Spawn-*Kandidaten* als aktive Spawns
  (ChatGPT: 7–9 Kandidaten, Director aktiviert 2–4 je Angriff).
- **Das eine große Landmark behalten** — Orientierung, Distanzschätzung,
  Koop-Callouts („links vom Panzer" statt „Lane 2").
- **Spine an die Wand, nicht auf den Boden** — im Shooter ist Blick-nach-unten
  die falsche Blickrichtung. Kommunikationskabel auf Brust-/Augenhöhe an der
  Grabenwand, **redundant codiert** (Farbe + geometrisches Symbol) für Nacht /
  Farbsehschwäche / gedämpfte Palette.
- **Direktionales Audio ist Pflicht**, nicht optional — Signalhorn/Trillerpfeife
  aus Richtung Home-Line beim Abschnittsverlust (akustischer Rückzugs-Kompass),
  Truppen-Rufe. In FP oft schneller als Auge oder HUD.
- **Grundsatzfrage A: Generator bewusst später.** Erst eine Greybox (Loop
  überhaupt validieren), dann eine **zweite, manuell gebaute, strukturell andere**
  Greybox (Sektor B — beweist, dass der Loop robust gegen andere Geometrie ist,
  nicht nur auf einer glücklichen Geometrie), **dann** den Modulvertrag
  festschreiben, **dann** den Generator. Gemini will Phase 1 strikt auf *einer*
  Map, warnt vor 2–3 frühen Varianten; ChatGPT/Perplexity wollen Sektor B vor dem
  Generator. Kein Widerspruch im Kern: Generator kommt spät.

### Divergenzen Runde 2

- **Flanken-Notausgang an der Home-Line:** ChatGPT — behalten, aber diegetisch
  (verschütteter Reservegraben, Artillerietreffer bricht ihn im Finale auf,
  vorher sichtbar). Perplexity — 3 Zugänge, Notausgang finale-freigeschaltet oder
  nur für Spieler passierbar. **Gemini — ganz streichen**, 2 Connectoren, Drama
  aus gleichzeitigem Durchbruch. → echter Konflikt.
- **Anzahl Connectoren solo:** Gemini 1 · ChatGPT/Perplexity/Straw-Man 2.
- **Home-Line-Breite vs. Front:** Perplexity — gleich breit (Konsistenz).
  ChatGPT/Straw-Man — Home kompakter als Front (Kompressionsgefühl).
- **Niemandsland nachts:** Perplexity — auf 30–40 m verkürzen (hintere 20 m
  spawn-gesperrt), sonst zu wenig Horde-Druck. Andere erwähnen es nicht.
- **Niemandsland-Neigung:** Gemini — Gelände steigt Richtung Feind (1–2 m auf
  50 m), damit anstürmende Silhouetten gegen den Horizont lesbar sind. Nur
  Gemini.
- **Kompass:** ChatGPT — behalten (nur strategische Zustände). Perplexity — erst
  weglassen, später bei Bedarf; Audio ist stärker.
- **Sektor B:** Gemini dagegen (erst *eine* Map beweisen), ChatGPT/Perplexity
  dafür (vor dem Generator).

## Gemini — Runde 2

**Einordnung:** Briefing v2 ist hervorragend fokussiert; Kern-Dynamik an einer
Greybox zu beweisen ist die richtige Vorgehensweise.

**1. Fix oder neu — hält, mit Einschränkung.** Handgebaute Greybox für Phase 1
notwendig (macht der Loop hier keinen Spaß, dann prozedural erst recht nicht).
Aber: von Tag 1 aus Baukasten-Modulen auf festem 10×10-m-Grid bauen, nicht als
Freiform-Mesh — dann testet man den Loop *und* validiert das Modul-Raster.

**2. Die drei Ebenen — bricht im Solo massiv, Zahlen viel zu groß für FP.**
- 85 m Front solo: Spieler sieht durch Biegungen/Parapets nur 10–15 m weit;
  Abschnitt C ist „jenseits von gut und böse", 10–15 s Dauerlauf um überhaupt zu
  sehen was los ist.
- 40–50 m Connector: 2 m breiter, 50 m langer Schlauch = 8–10 s „W-Taste
  halten" ohne Gameplay.
- **Konkrete Gegenwerte:** Front solo max. 2 Abschnitte (A & B) à 15–20 m =
  35–40 m gesamt · Connector 20–25 m mit Engstelle/Sprengbarriere in der Mitte
  (Notbremse beim Rückzug) · Home-Line 30–40 m breit, damit 1–2 Spieler alle
  2–3 Zugänge im Blick behalten.
- Referenz: *GTFO*, *Left 4 Dead* — Verteidigungszonen in FP extrem eng, um
  „dead walking space" zu vermeiden und Panik durch Enge zu erzeugen.

**3. Niemandsland — hält im Grundsatz, aber „Feuertritt-Paradoxon".** 45–60 m ist
die richtige WW1-Gewehrdistanz. Risiko: sind Trichter hoch genug für Deckung,
sieht der Spieler Stürmende erst auf 10 m (Jump-Scare/Frust); sind sie zu flach,
wird das Parapet zum Moorhuhn-Schießstand.
- Korrektur: Niemandsland steigt zum Feind hin leicht an (1–2 m auf 50 m) →
  Silhouetten zeichnen sich gegen den Horizont ab. Stacheldraht für den Spieler
  durchsichtig (Alpha-Cutout), blockiert Bewegung, nicht Sicht.

**4. Feind-Spawns — hält, Infiltration ist exzellent.** Verlorener Abschnitt als
Spawn-Vektor Richtung Connector erzeugt genau den dynamischen Druck.
- Korrektur: Gegner dürfen nie sichtbar im verlorenen Graben aufpoppen —
  feindlicher Rauch / Rauchgranate auf dem Abschnitt, *dann* spawnen Gegner
  darin. Historisch plausibel, verbirgt das Poppen, signalisiert „dieser Graben
  gehört jetzt dem Feind".

**5. Vertikalität — hält mathematisch.** Sohle −1,8 m, Feuertritt +0,4 m,
Augenhöhe ~1,6 m → Auge auf +0,2 m über Sohle, Parapet +0,4 m: auf dem Feuertritt
knapp übers Parapet, am Boden voll in Deckung — passt exakt.
- Gefahr: manuelles Anspringen einer 40-cm-Stufe im Gefecht ist hölzern
  (Collision-Jiggling). Lösung: Feuertritt als kontextuelle Rampe / breite Stufe,
  nahtlich hochlaufen, kein Springen.

**6. Flanken — bricht beim Notausgang.** Harter Korridor (Sumpf/Draht) richtig
für Performance, Pathing, Fokus. Notausgang ist Design-Falle: vorher gesperrt =
totes Dekor; im Finale geöffnet = warum nutzen ihn die Gegner nicht auch zum
Rückenangriff? → **Streichen.** Home-Line strikt 2 Hauptzugänge (die
Connectoren). Finale-Drama = Feind bricht gleichzeitig durch Connector 1 und 2,
Team muss die Linie spalten.

**7. Maßstab — bricht bei der Laufzeit.** 20–30 s Sprint Front → Home ist für ein
taktisches Rückzugsgefecht viel zu lang; in 30 s Dauerlauf verliert der Spieler
jede Kontrolle. → Sprintzeit Front → Home max. **8–10 s** (~35–45 m Gesamtweg
durch den Connector). 12–18 min Matchdauer ist der Sweetspot.

**8. Lesbarkeit — hält hervorragend, Spine-Konzept ist Gold.** Farbcodiertes
Telefonkabel + Silhouetten = Weltklasse (*Portal*, *Left 4 Dead*, *DRG*).
- Ergänzung zwingend: direktionales Audio — Trillerpfeife/Signalhorn aus Richtung
  Home-Line bei Abschnittsverlust (akustischer Kompass), Einheits-Rufe. Ohr ist
  in FP oft schneller als Auge/Kompass.

**A:** 100 % *eine* handgebaute Greybox für Phase 1, keine 2–3 Varianten, keinen
frühen Generator. Macht der Kern-Loop auf der ersten Map keinen Spaß, liegt es am
Regelwerk, nicht am Sektor. Aber: strikt aus modularen 10×10-m-Rasterbausteinen.

**B:** Ausschließlich über **Anzahl** der Abschnitte skalieren, nie über
Grabenbreite. Solo 2 Frontabschnitte / 1 Connector / kompakte Home; 4 Spieler
4 Abschnitte / 2–3 Connectoren / breitere Home. Ein doppelt so breiter Graben
verliert seine Deckungseigenschaft und fühlt sich wie eine Straße an.

**3 wichtigste Korrekturen:** (1) Maßstäbe drastisch schrumpfen — Front 85 → 35–40
m, Connector 50 → ~20 m (in FP wirken Strecken doppelt so lang; lange Wege =
Leerlauf statt Panik). (2) Feuertritt-Movement automatisieren (Proximity-Rampe,
kein Sprung). (3) Infiltrations-Spawns durch Rauchvorhang abdecken, nie im
Sichtfeld.

## Perplexity — Runde 2

**1. Fix oder neu — hält.** Handgebaute Greybox für Kern-Validierung ist der
günstigste Weg, den Rückzugs-Loop zu testen.
- Ändern: von Anfang an **modular** bauen (gerade Stücke, Ecken, T-Kreuzungen,
  Bunker), auch wenn nur ein Sektor. Kostet jetzt kaum mehr, spart später Wochen.
- Referenz: *Deep Rock Galactic* — Level aus handgefertigten Raum-Templates,
  prozedural zusammengesetzt. Dev-Team explizit: *„At first we tried to do true
  procedural… Then we decided to put up some simple shapes manually and generate
  the level out of that."*

**2. Die drei Ebenen — hält teilweise, Zahlen problematisch.**

| Maß | Straw-Man | Problem | Korrektur |
|---|---|---|---|
| Frontbreite/Abschnitt | 25–30 m | zu breit für Solo (~10 s Sprint end-to-end) | 15–20 m |
| Gesamtfront | ~85 m | zu groß für 1, zu klein für 4 | skalierbar 2 → 4 Abschnitte |
| Connector-Länge | 40–50 m | 25+ s reiner Laufweg, langweilig | 25–35 m, 2–3 Knicke |
| Home-Line-Breite | ~60 m | warum breiter als Front? | gleich breit wie Front |
| Abstand Front → Home | 90–110 m | mit Connector-Umweg 150+ m = 45+ s | 60–80 m Luftlinie |

- Greybox-Startwerte: Front 2 × 18 m = 36 m · Connector 30 m, 2 Knicke · Home
  36 m breit / 15 m tief · Abstand 70 m Luftlinie.
- Referenz: *Helldivers 2* Defense-Missionen 12–20 min — passt zur Einsatzdauer,
  aber nur wenn Laufwege nicht die Zeit fressen. Enge Gräben: Zeit = Spannung.

**3. Niemandsland — hält für Tag, zu groß für Nacht.** 45–60 m ok für Feuer &
Bewegung. Nachts bei 60 m verteilt sich die Horde zu dünn.
- Korrektur: Tag 50–60 m · **Nacht 30–40 m** (hintere ~20 m spawn-gesperrt).
  Nachts brauchst du Druck, nicht Raum.
- Draht-Lanes müssen exakt zu den `approach lane`-Nodes im Graph passen, sonst
  laufen Gegner in den Draht oder bleiben stecken.

**4. Feind-Spawns — hält.** Feste Ausstiegspunkte Tag, Trichter nachts = Kontrolle
über Anmarsch-Lanes.
- Problem: „gefallener Abschnitt spawnt Gegner" ist riskant — fühlt sich nach
  „eingekreist" statt „Rückzug" an.
- Korrektur: gefallene Abschnitte spawnen **keine** neuen Gegner, sondern öffnen
  den Pfad — Gegner spawnen weiter am Front-Edge, laufen aber nach dem Fall von B
  ungehindert durch B → Connector. Simuliert Durchflutung ohne Cheat-Gefühl.
- Referenz: *Helldivers 2* „Defend" — Gegner an festen Punkten, geöffnete Gates
  lassen sie durchströmen; keine neuen Spawns hinter der Linie.

**5. Vertikalität — hält vollständig.** Feuertritt ~40 cm + Parapet ~0,5 m +
Sohle ~1,8 m ist historisch korrekt und sinnvoll; mehr Vertikalität kompliziert
Kollision/Pathing unnötig. Tabletop-Trench-Regeln nutzen exakt diese Maße.
- Ergänzung: 1–2 erhöhte Positionen an der Home-Line (Beton-Plattform für MG) →
  „last stand on the high ground" fürs Finale.

**6. Flanken — hält, aber 1 Notausgang zu wenig für 4 Spieler.**
- Korrektur: 3 Zugänge (2 Connectoren + 1 Notausgang), Notausgang nur im Finale
  nutzbar (freigeschaltet wenn Home-Line unter Angriff) → Spieler können zwischen
  Zugängen rotieren. *Helldivers 2* öffnet Gates nacheinander.
- Alternative: Notausgang von Anfang an da, aber nur für Spieler passierbar
  (Gegner nicht) → Fluchtroute ohne die Verteidigung zu verwässern.

**7. Maßstab — 12–18 min hält.** *Helldivers 2* Defense 15–20 min, 4–6 Wellen +
Finale passt.
- Problem: 20–30 s Sprint Front → Home zu schnell — dann ist der Rückzug
  bedeutungslos.
- Korrektur: **45–60 s unter Beschuss** (Connector + Deckung suchen). Stopwatch-
  Test: durch den Connector laufen und dabei in Deckung gehen — unter 40 s =
  Connector zu kurz.

**8. Lesbarkeit — Reihenfolge perfekt.** Silhouetten → Spine → Schilder →
Kompass → Lagekarte.
- Kompass im HUD für ein Browsergame riskant (UI-Overhead) — erst Spine +
  Schilder (A/B/C), Kompass später falls Spieler sich verirren. *DRG* nutzt
  minimale UI, Orientierung über Landmarken + MULE.
- Zusatz: akustische Hinweise („Abschnitt B unter Angriff!" per Funk) — Audio
  stärker als UI für Orientierung.

**A:** Eine handgebaute Greybox reicht für die Kern-Validierung, aber modular
(wiederverwendbare Segmente) statt monolithisch. Generator nach dem ~5. Playtest,
wenn der Core-Loop sicher trägt; bis dahin 1–2 manuelle Varianten (Sektor A, B).
*DRG* hat Monate nur mit handgefertigten Templates getestet.

**B:** Mehr Abschnitte, nicht breitere. **2 (solo) → 4 (4 Spieler)**, nicht 3 → 6.
Abschnittsbreite konstant 15–20 m = die Einheit, die *ein* Spieler halten kann.
Formel: Frontbreite = Spielerzahl × 18 m.

**3 wichtigste Korrekturen:** (1) Frontabschnitte 25–30 → 15–20 m. (2) Connector
40–50 → 25–35 m. (3) Niemandsland nachts 60 → 30–40 m. Gesamturteil: Straw-Man zu
~80 % korrekt — Struktur, Lesbarkeit, Modularität sitzen; die Zahlen sind zu groß.

## ChatGPT — Runde 2

**Einordnung:** Straw-Man deutlich besser als die typische erste Version. Trifft
die entscheidende Frage: nicht „kann ich einen Graben generieren", sondern
„funktioniert Front halten → Abschnitt verlieren → Rückzug → Home-Line als
räumlicher Spielbogen". Drei deutliche Änderungen: Front kompakter, Rückzugsweg
kürzer, Spawn-/Orientierung weniger geometrisch deterministisch.

**1. Fix oder neu — hält, Generator bewusst später.** Invarianten eines guten
Sektors sind noch unbekannt — der Greybox-Test soll sie erst liefern.
- Zwischenstufe: Sektor A → **manuell umgebauter Sektor B** → Generator. Nicht
  drei neue Levels; Sektor B nutzt dieselben Bauteile, ändert bewusst: welcher
  Abschnitt zuerst gefährdet ist, Verhältnis der Connectoren, Position der
  Home-Line-Zugänge, dominante Sichtlinie im Niemandsland. Grund: funktioniert
  der Loop nur auf A, weißt du nicht ob du eine Mechanik oder zufällig eine gute
  Geometrie gebaut hast.
- Referenz *DRG* methodisch: prozedurale Tiefe aus einer *eingeschränkten
  Grammatik spielbarer Elemente*, nicht aus beliebiger Geometrie.

**2. Die drei Ebenen — größte Zahlenprobleme.**

| Element | Straw-Man | ChatGPT-Startwert |
|---|---|---|
| Abschnittsbreite | 25–30 m | 16–20 m |
| Gesamtfront A–C | ~85 m | 50–60 m |
| Home-Line | ~60 m | 35–45 m |
| Connector-Pfad | 40–50 m | 25–35 m |

- 85 m Front → Solospieler pendelt: Bedrohung sehen → 8–15 s laufen → bekämpfen →
  andere Seite bricht = Pendelarbeit statt Frontdruck. Drei *logische* Abschnitte
  bleiben, nur physisch kompakter. Ein Abschnitt ≠ 20 m gerade Feuerlinie —
  Traversen lassen 18 m räumlich groß wirken.
- Connectoren: nicht als 40–50-m-Röhren. 25–35 m, 2–3 Traversen, kleine
  Ausbuchtung → „Front → Knick → defensiver Pocket → Knick → Home", kleine
  temporäre Haltepunkte. Breite 2,4–2,8 m (unter 2 m wird's mit Koop / großen
  Gegnern / Leichen / Platzierungen nervig).
- Home-Line: 15 m Tiefe ok, 60 m Breite unnötig groß — soll sich *kompakt und
  mächtig* anfühlen. Verhältnis wichtig: Front = schwer alles zu kontrollieren,
  Home = weniger Raum, mehr Druck.
- Referenz *Battlefield 1 Operations*: fällt eine Linie, wird nicht derselbe
  Kampf 10 m weiter hinten wiederholt — neue Geometrie, neues Gefühl.

**3. Niemandsland — Tiefe hält, Draht-Lanes weniger sichtbar.** 45–60 m
plausibel. Gefahr: 2–3 quer verlaufende Drahtreihen → versehentlich Shooting
Lanes → „dort kommen sie immer" → Tower-Defense-Problem.
- Unterscheiden: **Navigationslane** (der Graph darf `left/center/right` kennen)
  vs. **sichtbare Lane** (die Landschaft soll das *nicht* als 3 saubere Korridore
  zeigen). Statt 3 Drahtwänden: versetzte Drahtfelder, unterbrochene Reihen,
  Trichtergruppen, niedrige Erdaufwürfe, 2 größere Sichtblocker.
- 1 großes Landmark unbedingt behalten (Orientierung, Distanz, Spawnreferenz,
  Koop-Callouts — „links vom Panzer" ≫ „bei Lane 2").
- Nacht-Spawns: harte Regel — **keine sichtbaren Night-Spawns vor dem Spieler**.
  Semantische Spawnpunkte mit Bedingungen: außerhalb Sichtkegel / okkludiert,
  Mindestabstand 18–25 m, Spawnloch vorab visuell kenntlich. Sonst wird Horror
  zum Cheap Shot.

**4. Feind-Spawns — Grundidee hält, feste Entrances → Kandidatenpool.** 3–5 feste
Tages-Einstiege für den Prototyp ok, als Endsystem zu vorhersehbar.
- **7–9 authored `enemyEntrance`-Kandidaten**, Director aktiviert je Angriff nur
  2 (klein) / 3 (normal) / 4 (breit). Spieler kennt die Front, nicht den nächsten
  Angriff. Telegraphing: Pfeife, Rufe, Mündungsfeuer, Bewegung am gegnerischen
  Graben, Artilleriesignal; nachts Schreie / Bodenbewegung. Einige Sekunden
  vorher: „da kommt gleich was von rechts" — ohne zu wissen wie viele.
- Referenz *Left 4 Dead*-Logik (nicht die Gegner): viele mögliche Spawnorte +
  Sichtbarkeits-/Situationsregeln = Variation ohne neue Geometrie.
- Infiltration: sehr gute Idee, aber semantisch trennen — „Gebiet passierbar" vs.
  „hier darf gespawnt werden". Nach dem Fall von B rücken Gegner *durch* B nach,
  materialisieren nicht 5 m hinter dem Spieler. Verlorener Abschnitt schaltet
  zusätzliche `reinforcementNodes` in *okkludierten* Bereichen frei.

**5. Vertikalität — konkreter geometrischer Fehler.** Sohle −1,8 m, Feuertritt
+0,4 m, Parapet +0,5 m passt nicht: bei −1,8 Sohle / −1,4 Feuertritt / +0,5
Parapet und ~1,6–1,7 m Augenhöhe ist das Auge auf dem Feuertritt nur bei
+0,2–0,3 m → Spieler schaut weiter gegen das Parapet.
- Greybox-Werte: Sohle −1,7 bis −1,9 m · Parapet +0,3 bis +0,5 m · **Feuertritt
  +0,65 bis +0,85 m über Sohle** → Kamera knapp über der Brustwehr. Gegen die
  konkrete Player-Capsule prüfen; 40 cm sind fast sicher zu wenig.
- v1 nur ein Höhenwechsel: ja. Kein Springen/Mantling/begehbare Dächer. Aber
  minimale Bodenvariation (Duckboards, leichte Rampen, Trichterränder, abgesackte
  Grabenstücke) — nicht als Plattforming, damit der Graben nicht wie ein
  extrudierter CAD-Kanal wirkt.
- Referenz *Verdun/Isonzo*: Traversen — Richtungswechsel + kurze Sichtlinien +
  kleine Feuerstellungen reichen für räumliche Tiefe, keine Vertikalität nötig.

**6. Flanken — harter Korridor hält, dritten Zugang diegetisch.** Für den
Prototyp harter Korridor absolut legitim. Langfristig soll der Spieler den
Korridor nicht als unsichtbare Spielregel wahrnehmen: überfluteter Graben,
zerbombtes Gelände, dichter Draht, eingestürzte Sappe, brennender Bereich, tiefer
Schlamm — Grenze hart, aber physisch plausibel.
- Notausgang: „vorher gesperrt, im Finale plötzlich Gegnerzugang" wirkt nach
  Director-Cheat. Schon vorher sichtbar machen — alter Kommunikationsgraben durch
  Barrikade/Einsturz verschlossen; im Finale: Artillerietreffer, Wand bricht,
  Warnruf, neue rote Route auf der Lagekarte. Spieler denkt „die haben den
  Reservegraben geöffnet" statt „das Spiel hat einen Spawnpunkt aktiviert".
- Zwei Connectoren richtig — drei wären für diese kleine Karte zu viel
  Parallelstruktur.

**7. Maßstab — Zahlen widersprechen sich.** 90–110 m Luftlinie + 20–30 s Sprint
passt physikalisch nicht (100 m unbehindert eher deutlich unter 30 s). Und
20–30 s reiner Rückweg ist zu lang.
- Ziel-Spielmaße: A→C-Wechsel 8–12 s · Frontposition → Connector 3–5 s ·
  Connector → Home 7–10 s · **kompletter Rückzug ideal 10–15 s**. Kämpfend
  (Magazine leeren, Verwundeten aufheben, Stellung kurz halten) werden daraus
  automatisch 20–30 s — *das* fühlt sich wie ein Rückzugsgefecht an, 30 s
  Shift+W nicht.
- Einsatzdauer: 12–18 min plausibel, für den ersten Test eher 12–15 min — vier
  14-min-Runs liefern mehr als zwei 25-min-Runs.

**8. Lesbarkeit — einer der stärksten Teile.** Hierarchie Zonensilhouette → Spine
→ Sektorschilder → Kompass → Lagekarte ist genau richtig.
- Widerspruch: „Panik → Blick auf den Boden → Farbe folgen" ist im Shooter die
  falsche Blickrichtung (verliert Gegner, Deckung, Mitspieler, Knick). **Spine an
  die Wand** auf Brust-/Augenhöhe, regelmäßige Pfeile, **plus geometrisches
  Symbol** (Connector 1 = gelbes Dreieck, Connector 2 = weißer Doppelstrich) →
  funktioniert nachts, bei Farbsehschwäche, bei gedämpfter Palette. Nicht nur
  Farbe.
- Callout-Grammatik von Anfang an festlegen: Front A/B/C · Route 1/2 · Home
  Left/Center/Right → später „B fällt, Route 2 zurück".
- Kompass: HOME-Marker ja; Marker pro Gegner/Spawn nein — nur strategische
  Zustände (B bedroht, C gebrochen, Home angegriffen).

**A:** Eine Greybox reicht, um den Loop *erstmals* zu validieren — nicht, um zu
beweisen dass er *robust gegen andere Geometrie* ist. Reihenfolge: Sektor A
handgebaut → Sektor B manuell aus denselben Prinzipien → Modulvertrag
festschreiben (was muss jedes Front-/Connector-/Home-Modul garantieren) →
Generator. Das Gate ist nicht „Map A macht Spaß", sondern „A und ein strukturell
anderes B erzeugen denselben Kampfablauf". Generator vor Sektor B = unbewiesene
Annahmen als Infrastruktur.

**B:** Modulgröße konstant, Zahl gleichzeitig relevanter Fronten erhöhen — aber
primär über **Aktivität** (Director), erst sekundär über Kartengröße:

| Spieler | physische Front | gleichzeitig ernsthaft bedroht |
|---|---|---|
| 1 | 3 Abschnitte | 1–2 |
| 2 | 3 Abschnitte | 2 |
| 3 | 3–4 Abschnitte | 2–3 |
| 4 | 4 Abschnitte | 3–4 |

Vier Spieler sollen mehr *parallel tun* können, nicht doppelt so lange laufen.
Großer Regler = Director (Angriffsachsen, Gleichzeitigkeit, Gegnerzahl,
Spezialgegner, Ressourcenverbrauch), nicht Meter. Vermeidet zwei getrennte
Balancing-Probleme „Solo-Map" / „Koop-Map".

**3 wichtigste Korrekturen:** (1) Alles lateral ~25–35 % kompakter (Front 85 →
50–60 m, Home 60 → 35–45 m) — sonst wird der Solospieler zum Laufboten; die Frage
soll „welche Stellung rette ich" sein, nicht „schaffe ich es rüber". (2)
Rückzugszeit aus Widerstand statt Weglänge — Transit kurz, der Feind verlängert
den Rückzug; Connectoren kürzer, aber durch Traversen + Pockets interessanter.
(3) Semantische Routen dürfen deterministisch sein, ihre Präsentation nicht —
mehr Spawn-Kandidaten, weniger sichtbare Draht-Lanes, unregelmäßige Hindernisse,
gute Telegraphs, verlorene Abschnitte verändern den Graphen.

---

## Planer-Notiz: was davon wir übernehmen / verwerfen

*Wird in der Design-Runde gefüllt — pro Punkt: übernommen / verworfen / offen,
mit kurzer Begründung. Beschlossenes wandert nach `KONZEPT.md` bzw. in die
AP-Spezifikation.*

Erste offene Konflikte, die die Runde klären muss:

- **Skalierung mit Spielerzahl:** Länge/Angriffsachsen (Gemini, ChatGPT) vs.
  Breite (Perplexity Runde 1). Runde 2: **alle drei** → mehr Abschnitte, nicht
  breitere; primär Director-gesteuert. → weitgehend geklärt, Tendenz „mehr
  Abschnitte".
- **Nächste Arbeitspakete:** Map/Pathing zuerst (Gemini, Perplexity) vs.
  Rückzugs-Greybox zuerst (ChatGPT). → mit dem Nutzer-Map-Plan abgleichen.
- **In-Mission-Quest:** alle drei wollen sie als Dauermechanik weg — die im
  Konzept beschlossene Fassung (`KONZEPT.md` §4) muss überarbeitet werden.
- **Nations-Vertrautheit:** ChatGPT erster Streichkandidat; steht im Konzept
  (`KONZEPT.md` §4). → prüfen.
- **Netcode-Transport:** WebSocket (Perplexity) vs. UDP/WebRTC/Geckos.io
  (Gemini) — für später, aber notieren.

Neue offene Konflikte aus Runde 2:

- **Flanken-Notausgang an der Home-Line:** Gemini streichen vs. ChatGPT/Perplexity
  behalten (diegetisch bzw. spieler-only). → mit Nutzer-Plan (offene Flanken?)
  abgleichen.
- **Sektor B vor dem Generator:** ChatGPT/Perplexity dafür, Gemini dagegen. →
  Tendenz: A bauen, dann entscheiden.
- **Feuertritt-Maß:** ChatGPT sagt +0,4 m ist zu niedrig (Auge unter Parapet),
  will +0,65–0,85 m über Sohle; Gemini/Perplexity halten ~0,4 m für ok. →
  Detail, gegen die echte Player-Capsule testen.
- **Contested-Retreat-Dauer:** Perplexity 45–60 s durch den Connector vs.
  Gemini 8–10 s Transit vs. ChatGPT 10–15 s frei / 20–30 s kämpfend. → im
  Greybox-Test einstellen.
- **Nutzer-Map-Plan weicht ab:** durchgehende Frontlinie (nicht 3 getrennte
  Abschnitte), 1 zentraler Connector, **offenes Trichterfeld zwischen Front und
  Home** (kein harter Korridor), Verzweigungsgräben gehen *nach vorn* ins
  Niemandsland. → das ist die eigentliche Design-Runde.

---

## Konvergenz Runde 3 — Planer-Beobachtung (nicht von den KIs)

Briefing: `SPARRING.md` Runde 3 — drei Fragen zum AP6-Kern (eine Frontlinie
halten / „Instand setzen" / Nacht-Roaming). Alle drei KIs sehr deckungsgleich:

**Frage 1 — Frontlinie halten:**
- **Der binäre „ganze Linie fällt auf einmal" ist der Hauptfehler.** Alle drei
  lehnen ihn ab: unfair + unlesbar für Solo („ich habe meinen Kampf gewonnen,
  aber eine unsichtbare Zahl am anderen Ende der Karte hat entschieden, dass
  wir verloren haben").
- **Lösung: der Fall wird physisch + telegraphiert, keine Buchhaltung.**
  Lokaler Druck öffnet eine **Bresche** (Krise, keine Niederlage). Die Linie
  fällt erst, wenn Gegner **physisch durch die Bresche in den Graben strömen
  und einen Fleck hinter der Linie ~10–15 s halten** → „DURCHBRUCH", mit
  letzter Reaktionschance für den Spieler. (Perplexity als Mittelweg:
  Integritäts-Balken pro unsichtbarer Zone, Zonen fallen einzeln, ganze Linie
  erst wenn alle → praktisch weiche A/B/C-Zonen.)
- **4–5 mögliche Bresche-Punkte, nach Landmarks benannt** (Panzerwrack,
  Pumpenstand, Mörserbucht, Unterstand) — nicht A/B/C. Natürliche Koop-
  Callouts. Solo: **höchstens eine echte Krise gleichzeitig** (Director
  skaliert, wie viele Meter gleichzeitig relevant sind, nicht die 70 m).
- **Handlungsmacht = der Spieler beeinflusst, wo er NICHT persönlich sein
  muss.** Drei Werkzeuge, konvergent: (1) **vorbereitete Verzögerung**
  (Draht/Barrikade/Stolperdraht zwischen Wellen — kauft Zeit, gewinnt keine
  Stelle; ungesichert ~10–15 s, vorbereitet ~20–30 s), (2) **Feind
  manipulieren** (Lärm/Licht, v. a. nachts — „wo will ich, dass sie
  kämpfen?"), (3) *später evtl.* begrenzte KI-Sicherung — **alle drei: für
  AP6 zunächst OHNE KI-Trupp testen.**
- **Dreifache Kommunikation „wo brennt's":** Stufe 1 Frühwarnung (Rufe,
  Pfeife, vereinzelte Schüsse, Untoten-Geräusch, Signallicht) → Stufe 2
  Richtung (HUD-Kompass „BRESCHE — PANZERWRACK", kein abstrakter Balken) →
  Stufe 3 Durchbruch (unmissverständlich, andere Mus-/Audiolage, „DURCHBRUCH
  — 12 SEK"). Nie nur HUD oder nur Audio.
- **Warnung: keine CoD-Zombies-Fenster** — „wenn mehrere Stellen ständig
  kleine Reparaturen verlangen, wird Verteidigung zur Hausmeisterarbeit".
  Halte-Punkte dürfen keine Balken-Auffüll-Objekte sein.

**Frage 2 — „Instand setzen":**
- **Strikte Trennung: Rückeroberung ≠ Reset.** „Instand setzen darf die
  taktische Position zurückgeben, den Fall der Linie nicht rückwirkend
  ungeschehen machen." → **Narben-Effekt:** Linie steht wieder, aber zerstörte
  Befestigungen / verbrauchter Nachschub / verlorene Frontressourcen /
  ein Teil der Widerstandsfähigkeit kommen **nicht** zurück.
- **Womit:** alle drei lehnen „bloße Zeit" ab (zu billig). Konsens:
  **Nachschub-Kosten + Material vor Ort** (keine Pflichtklasse — Pionier
  +20–25 % Tempo/−Kosten, aber jeder kann es). ChatGPT: Teil beim Start
  (~30 %), Rest bei Erfolg; Abbruch = alles weg. Perplexity ergänzt ein
  Loadout-Kit (max. 2), ChatGPT warnt davor (→ „Loadout-Steuer", Pionier wird
  Pflicht).
- **Dauer ~8–12 s** ununterbrochen. Der Skill ist NICHT die Taste halten,
  sondern sich das Fenster **schaffen** (Umgebung säubern, Horde weglocken,
  Barrikade setzen).
- **Solo vs. Koop:** Dauer + Kosten **gleich** (kein „schneller mit mehr
  Spielern"). Was skaliert: der ausgelöste Gegenangriff (mehr Gegner pro
  nahem Spieler). Erzeugt Rollen: „ich setze instand, haltet mir die Bresche
  frei." Max. ~25 % Bonus für einen zweiten Helfer.
- **Start = lauter Aggro-Reiz** → Mini-Horde aus dem Hinterland. Instand
  setzen ist gefährlicher als Halten.
- **Anti-„absichtlich fallen lassen":** (1) der Fall verursacht
  **irreversible Schäden** (Depot weg, nächster Fall schneller, 2. Reparatur
  teurer), (2) Spawn steht danach vorn → die Werkstelle muss **erkämpft**
  werden, (3) begrenzte Wiederholbarkeit — **Start-Test: 1 volle
  Instandsetzung pro Skirmish**, (4) kurze Schutzphase (~15–20 s).
- **KRITISCH (ChatGPT + Gemini unabhängig):** die „Uhr läuft schneller"-Regel
  gegenprüfen. Wenn „schneller" heißt, der Spieler kommt **früher** ans
  gewonnene Home-Line-Finale, ist das ein Speedrun-Exploit — unabhängig von
  Instand setzen. **Grundregel: ein freiwilliger Frontverlust darf nie mehr
  Fortschritt pro Minute erzeugen als erfolgreiches Halten.** Frontverlust
  muss den Skirmish *gefährlicher/ineffizienter* machen, nicht kürzer.

**Frage 3 — Nacht-Roaming:**
- **Gruppen bewegen, nicht Einzelne würfeln.** 2–4 Roaming-Gruppen im Sektor
  (je 2–5 Tote), können sich an Reizen vereinen; außerhalb der Wellen ≤1
  wirklich alarmierte Gruppe. „Selten leer, aber kein belangloser Zweikampf
  alle 20 s."
- **4 Gruppenzustände:** Wandern → Untersuchen (bewegt sich zum **Ort des
  Reizes**, nicht magisch zum Spieler) → Alarmiert → Abklingen. Über Audio +
  Animation lesbar. Ein Toter, der nach einem fernen Schuss exakt weiß, wo der
  Spieler ist, zerstört das System.
- **Reize = Stärke × Reichweite × Dauer** + **Erinnerungszeit** (Gruppe
  bleibt einige Sekunden bei ihrem Reiz, dreht nicht bei jedem Geräusch um).
- **Lärm ist ein Werkzeug, keine Strafe** — „Raumkontrolle durch
  Aufmerksamkeit", kein Schleichspiel. **Aber: Ablenken löscht keine Gegner** —
  10 Tote nach links gezogen sind danach *links* (weiter im Budget) → „ich
  löse mein aktuelles Problem, baue ein späteres". Interessanter als ein
  Decoy mit 10 s Crowd-Control.
- **KRITISCH: Roamer + reguläre Wellen dürfen nicht unabhängig eskalieren.**
  Gemeinsames **Intensitätsbudget** — bei Wellenbeginn schließen sich nahe
  Roaming-Gruppen an, während des Peaks kaum neue Ambient-Gruppen, danach
  fällt die Aktivität. „Die Horde, die im Hinterland wanderte, hat den Kampf
  gehört und kommt dazu" vs. „zwei Spawn-Systeme haben zufällig gleichzeitig
  ausgelöst".
- **Drei Spannungszustände:** Ruhe → Unsicherheit → Eskalation → danach muss
  Ruhe wieder möglich sein. „Grabenhorror braucht Leere."
- **Keine billigen Spawntricks** — Roamer nie sichtbar hinter dem Spieler;
  nur aus Spawnlöchern / Niemandsland / okkludierten Grabenenden.
- **Werkzeug: Leuchtkugel/Signalrakete** (kein Fantasy-Decoy) — Licht =
  Information + Aufmerksamkeit, passt zum Ton. Nacht zuerst OHNE speziellen
  Decoy testen.

**ChatGPTs stärkster Satz:** „Der Spieler sollte nicht dafür verantwortlich
sein, überall gleichzeitig zu verteidigen. Er sollte dafür verantwortlich
sein, zu erkennen, welcher lokale Zusammenbruch als Nächstes die gesamte
Stellung gefährdet — und mit Vorbereitung, Bewegung und Aufmerksamkeit genau
diesen Zusammenbruch zu verhindern."

**Divergenzen:** Perplexity hält an Integritäts-Zonen fest (weiche A/B/C),
die anderen wollen physische Bresche-Punkte. Instand-Setzen-Werkzeug:
Loadout-Kit (Perplexity/Gemini) vs. nur Nachschub + Material vor Ort
(ChatGPT). Zahlen variieren, aber alle im selben Rahmen (8–12 s, ~1 Reparatur/
Skirmish, 15–20 s Schutz).

**Planer-Konsequenz für die Tickets:** AP6-02b (aktuell „maxDruck-Aggregation →
Linie fällt") muss auf das **Bresche → Durchbruch → Linienfall**-Modell
umgeschrieben werden — genau das, wovor alle drei warnen. Die „Uhr schneller"-
Regel (KONZEPT §3/§6) ist vor AP6-02b/03 zu klären. AP6-04 (Instand setzen)
und AP6-05 (Roam) können von „offen" auf „Richtung beschlossen" — Details
unten in der Design-Runde.

---

ChatGPT
# Runde 3 — Frontlinie halten, Instand setzen, Nacht-Roaming

## Kurzposition vorweg

Die neue „eine durchgehende Frontlinie“-Variante kann funktionieren. Ich würde aber **nicht** modellieren:

> An mehreren Haltepunkten sammelt sich unsichtbarer Druck; die Summe überschreitet einen Wert; die gesamte Linie fällt.

Das ist für Solo zu schwer zu lesen und produziert genau das Gefühl von hilflosem Löcherstopfen.

Meine zentrale Änderung wäre:

> **Lokaler Druck öffnet Breschen. Die Frontlinie fällt erst, wenn Gegner eine geöffnete Bresche physisch ausnutzen und sich hinter der Linie festsetzen.**

Damit wird aus einem abstrakten Wartungsproblem ein First-Person-Problem: Der Spieler sieht und hört, wo etwas bricht, und bekommt nach dem Bruch noch eine letzte Reaktionschance.

Beim „Instand setzen“ sollte die Linie außerdem **nicht auf den Zustand vor dem Fall zurückgesetzt werden**. Man gewinnt die Position zurück, aber der Fall hinterlässt bleibende Kosten. Sonst entsteht fast zwangsläufig die Strategie „fallen lassen, bequem hinten kämpfen, später reparieren“.

---

# 1 — Wie fühlt sich „eine Frontlinie halten“ gut an?

## Hält der aktuelle Haltepunkte-Ansatz?

**Teilweise.**

Mehrere lokale Druckpunkte entlang einer etwa 70 m langen Linie sind sinnvoll. Sie geben dem Director Stellen, auf die er Angriffe konzentrieren kann.

Problematisch ist nur die globale Verlustbedingung:

> genug ungedeckter Druck irgendwo → ganze Linie fällt.

Das kann schnell passieren, während der Spieler 40 Meter entfernt gerade erfolgreich kämpft. Aus seiner Perspektive lautet das dann:

> „Ich habe meinen Kampf gewonnen, aber irgendeine unsichtbare Zahl am anderen Ende der Karte hat entschieden, dass wir verloren haben.“

Das ist nicht fair genug.

## Empfehlung: Bresche → Durchbruch → Linienfall

Ich würde jeden Haltepunkt nicht als kleines Stück Besitz behandeln, sondern als **mögliche Bresche in derselben Frontlinie**.

Ein lokaler Angriff durchläuft ungefähr diese Zustände:

**Hält → unter Druck → Bresche offen → Gegner im Graben → Durchbruch**

Wichtig ist der Unterschied zwischen „Bresche offen“ und „Front gefallen“.

Eine offene Bresche ist zunächst eine Krise, keine Niederlage.

Erst wenn Gegner durch sie hindurchkommen und einen kleinen Bereich **hinter** der Front für beispielsweise 10–15 Sekunden behaupten, kollabiert die Gesamtstellung.

Das erzeugt einen sehr guten dramatischen Ablauf:

1. Angriff wird angekündigt.
2. Haltepunkt gerät unter Druck.
3. Draht/Barrikade/Bresche fällt.
4. Gegner strömen tatsächlich in den Graben.
5. Spieler bekommt eine letzte Warnung: **DURCHBRUCH**.
6. Schafft er es, den Einbruch auszuräumen, hält die Linie.
7. Schafft er es nicht, folgt der Rückzug.

Damit ist der Fall der Linie ein **sichtbares Ereignis im Raum**, keine Buchhaltung.

---

## Wie viele Haltepunkte?

Für etwa 70 m Front würde ich mit **4–5 möglichen Druckpunkten** anfangen.

Aber:

**Nicht alle dürfen gleichzeitig echte Krisen sein.**

Der Director sollte mit Spielerzahl skalieren.

### Solo

Normalerweise:

* 1 primärer Angriffspunkt;
* eventuell 1 zweiter Punkt mit leichtem Druck;
* an den restlichen Stellen nur atmosphärische Gegner.

Ein zweiter ernsthafter Durchbruch sollte Solo eher ein besonderes Eskalationsereignis sein.

### Vier Spieler

Dann können durchaus:

* 2 primäre Angriffe;
* 1 Nebendruck;
* einzelne Roamer

parallel existieren.

Die 70 Meter selbst müssen also nicht kleiner werden. Entscheidend ist, wie viele Meter davon **gleichzeitig relevant** sind.

---

# „Wo brennt es?“ muss dreifach kommuniziert werden

Ich würde niemals nur HUD oder nur Audio verwenden.

## Stufe 1 — Frühwarnung

Noch bevor die Stellung wirklich gefährdet ist:

* Rufe aus der Stellung;
* Signalpfeife;
* vereinzelte Schüsse;
* charakteristisches Untoten-Geräusch;
* beim Nachtmodus eventuell Signallicht oder flackernde Lampe.

Der Spieler hört:

> „Da passiert etwas.“

## Stufe 2 — Richtungsinformation

Im HUD-Kompass erscheint kein abstrakter Balken, sondern beispielsweise:

**BRESCHE — PANZERWRACK**

oder:

**DRUCK — UNTERSTAND**

Die Haltepunkte sollten deshalb **Landmark-Namen** besitzen, keine A/B/C-Sektoren:

* Panzerwrack
* Pumpenstand
* Mörserbucht
* Unterstand
* Telefonposten

Das hilft später massiv im Koop:

> „Wrack bricht!“

ist ein natürlicher Callout.

## Stufe 3 — tatsächlicher Durchbruch

Wenn Gegner hinter der Front sind, muss das Spiel unmissverständlich eskalieren:

**DURCHBRUCH — 12 SEK.**

Dazu andere Musik-/Audiolage, Alarm, Frontstatus.

Das ist einer der wenigen Punkte, an denen ich eine klare UI-Warnung nicht für zu spielig halte. Der Spieler muss verstehen:

> Wenn ich jetzt nichts tue, verlieren wir die Front.

---

# Wie verhindert man Solo-Löcherstopfen?

Der wichtigste Hebel ist **nicht** mehr Laufgeschwindigkeit oder mehr Schaden.

Der wichtigste Hebel ist:

> Der Spieler muss beeinflussen können, **wo er für einige Zeit nicht persönlich sein muss**.

Dafür sehe ich drei gute Werkzeuge.

## Option A — vorbereitete Verzögerung

Der Spieler kann vor oder zwischen Wellen einen Haltepunkt verstärken:

* Draht erneuern;
* Barrikade aufstellen;
* Stolper-/Alarmdraht;
* Leuchtmittel;
* Sandsäcke;
* eventuell später Minen/Sprengmittel.

Diese Dinge sollen eine Stelle nicht alleine gewinnen.

Sie sollen Zeit kaufen.

Beispiel:

Ungesicherte Bresche hält ohne Spieler vielleicht 10–15 Sekunden ernsthaften Druck aus.

Vorbereitete Bresche:

20–30 Sekunden.

Dann hat Vorbereitung einen klaren Zweck:

> „Ich sichere links stärker, weil ich selbst rechts stehen will.“

Das ist Handlungsmacht.

## Option B — begrenzte KI-Sicherung

Falls KI-Trupps ohnehin geplant sind, ist genau hier ihr sinnvollster Einsatz.

Nicht:

> „KI-Soldat macht DPS.“

Sondern:

> „Dieser Posten kann für eine begrenzte Zeit ohne mich arbeiten.“

Ein kleiner Sicherungstrupp könnte einen Haltepunkt beispielsweise gegen normalen Druck stabilisieren, aber gegen einen großen Angriff irgendwann brechen.

Nachteil: deutlich mehr KI-/Präsentationsaufwand.

Für AP6 würde ich deshalb **zunächst ohne KI-Trupp** testen.

## Option C — Spieler manipuliert den Angriff

Das wird besonders nachts interessant.

Wenn Lärm und Licht tatsächlich Gegner lenken, kann der Spieler aktiv bestimmen:

> „Ich ziehe die nächste Gruppe nach links, weil dort die Stellung vorbereitet ist.“

Dann wird Frontverteidigung nicht:

> „Wo spawnt das Spiel jetzt Gegner?“

sondern:

> „Wo will ich, dass sie kämpfen?“

Das wäre für „Halt die Linie“ ein sehr starkes System.

---

# Was ich von Referenzspielen übernehmen würde

## Left 4 Dead

Nicht die Zombies, sondern den **Director-Gedanken**.

Eine gute Horde entsteht nicht dadurch, dass überall gleichzeitig Gegner erscheinen. Der Director erzeugt gezielt Intensität und lässt anschließend wieder Luft.

Für eure Front heißt das:

> Nicht fünf gleichberechtigte Probleme erzeugen. Ein bis zwei erkennbare Krisen erzeugen.

## Deep Rock Galactic

Übertragbar ist vor allem die Kombination aus:

* angekündigter Eskalation;
* kurzer Vorbereitungszeit;
* Werkzeugen, die Positionen verändern;
* Spieler entscheidet selbst, wo er den kommenden Angriff annehmen will.

Eine DRG-Schwarmwarnung fühlt sich gefährlich an, aber selten völlig willkürlich.

## GTFO

GTFO ist eine gute Referenz dafür, wie stark **Vorbereitung der Kampfzone** sein kann.

Spieler entscheiden vor einem Alarm:

* welche Tür;
* welche Route;
* welches Werkzeug;
* welcher Kill-Zone.

Das würde ich stärker übernehmen als klassische Tower-Defense-Mechaniken.

## CoD Zombies — eher als Warnung

Die klassischen Fenster zeigen das Gegenbeispiel:

Wenn mehrere Stellen ständig kleine Reparaturen verlangen, wird Verteidigung schnell zur Hausmeisterarbeit.

„Haltepunkte“ dürfen deshalb nicht primär Objekte sein, an denen der Spieler regelmäßig einen Balken wieder auffüllt.

---

# Empfehlung für Frage 1

**4–5 mögliche Breschen, aber solo höchstens eine echte Hauptkrise gleichzeitig.**

Lokaler Druck darf eine Bresche öffnen.

Die Gesamtfront fällt aber erst durch einen **sichtbaren physischen Durchbruch hinter die Linie**.

Der Spieler bekommt Handlungsmacht durch:

1. vorbereitete Verzögerung,
2. beeinflussbare Feindbewegung,
3. später eventuell KI-Sicherung.

So verteidigt er eine Linie, statt fünf Wartungsbalken zu betreuen.

---

# 2 — „Instand setzen“

Hier würde ich zwischen **Rückeroberung** und **Reset** sehr strikt unterscheiden.

> Instand setzen darf die taktische Position zurückgeben. Es darf den Fall der Linie nicht rückwirkend ungeschehen machen.

Das ist die wichtigste Regel des ganzen Systems.

---

## Womit?

### Option A — nur Zeit

Spieler erreicht den Punkt und hält Interaktion für zehn Sekunden.

**Vorteile:**

* sehr klar;
* kein zusätzliches System;
* einfach zu verstehen.

**Problem:**

Es ist kostenlos.

Damit wird Instandsetzen in jeder ruhigen Phase automatisch richtig. Es gibt praktisch keine strategische Entscheidung.

**Würde ich nicht nehmen.**

---

## Option B — spezielles mitgebrachtes Werkzeug

Beispielsweise ein Feldbaukasten.

**Vorteile:**

* sehr physisch;
* gut lesbar;
* man muss die Möglichkeit vorher einplanen.

**Probleme:**

* wird schnell zur Loadout-Steuer;
* besonders bei Solo problematisch;
* Pionier droht Pflichtklasse zu werden.

Als Klassenbonus okay, als Voraussetzung schlecht.

---

## Option C — Nachschub + exponierte Interaktion

**Meine Empfehlung.**

Am festen Instandsetzungspunkt befinden sich die nötigen Materialien grundsätzlich vor Ort beziehungsweise werden abstrakt aus dem Nachschub bezahlt.

Der Spieler braucht keine bestimmte Klasse.

Ablauf:

> Punkt erreichen → Nachschub investieren → mehrere Sekunden exponiert arbeiten → Gegner reagieren darauf → Erfolg.

Der Pionier darf dabei beispielsweise:

* 20–25 % schneller arbeiten;
* oder 20 % weniger Nachschub benötigen.

Aber jeder Soldat kann es.

Das erfüllt die Solo-Anforderung deutlich besser.

---

## Option D — KI-Trupp losschicken

Interessant als spätere Alternative.

Der Spieler könnte einen Pioniertrupp bezahlen, der selbst zum Punkt läuft und dort arbeitet.

Das erzeugt einen schönen Escort-/Verteidigungsmoment.

Als Basissystem würde ich es trotzdem nicht verwenden: Die eigentliche dramatische Handlung sollte zunächst beim Spieler liegen.

---

# Wie lange?

Ich würde für den ersten Test mit **8–10 Sekunden ununterbrochener Arbeit** anfangen.

Kürzer als etwa fünf Sekunden wird schnell zu:

> hinrennen → E drücken → erledigt.

15–20 Sekunden dagegen sind Solo extrem schwierig, wenn die Aktion Gegner anzieht.

Wichtig:

Der eigentliche Skill soll nicht sein, zehn Sekunden lang eine Taste zu halten.

Der Skill ist:

> **Kann ich mir ein Zehn-Sekunden-Fenster schaffen?**

Also vorher:

* Umgebung säubern;
* Horde weglocken;
* Barrikade setzen;
* Leuchtkörper woanders platzieren;
* im Koop einen Kameraden absichern lassen.

Dann beginnt die Interaktion.

---

# Sollte die Dauer mit Spielerzahl skalieren?

**Nein beziehungsweise nur sehr wenig.**

Ich würde keine Regel bauen wie:

> Solo 8 Sekunden, vier Spieler 24 Sekunden.

Das wirkt künstlich.

Die Arbeit dauert im Wesentlichen gleich lang.

Der Unterschied:

### Solo

Der Spieler muss sich **vorher** ein sicheres Zeitfenster schaffen.

### Koop

Einer arbeitet, die anderen verteidigen.

Dafür darf der ausgelöste Gegenangriff mit Spielerzahl skalieren.

Das erzeugt echtes Rollenverhalten:

> „Ich setze instand, haltet mir die Bresche frei.“

wesentlich besser als:

> „Vier Leute halten gleichzeitig E, dann geht der Balken viermal so schnell.“

Ich würde höchstens einen kleinen Mehrspielerbonus erlauben, etwa:

* ein zweiter Helfer beschleunigt um 25 %;
* weitere Spieler bringen nichts.

Dann bleibt das Verteidigen meistens wertvoller als vier Mann am selben Interaktionspunkt.

---

# Wie teuer?

Nicht in absoluten Zahlen festlegen, bevor die Nachschubökonomie steht.

Aber der Zielwert sollte ungefähr sein:

> **Ein Instandsetzungsversuch kostet so viel wie eine bedeutende taktische Ausgabe.**

Zum Beispiel den Gegenwert von:

* einer starken Stellung;
* einem KI-Trupp;
* mehreren wichtigen Verbrauchsgegenständen.

Als erste Balancegröße:

**ungefähr 20–30 % des Nachschubs, den ein Solospieler bis zum typischen ersten Frontfall verfügbar hat.**

Ein fehlgeschlagener Versuch muss weh tun.

Er darf aber nicht bedeuten:

> „Run vorbei, weil ich bei Sekunde 7 getroffen wurde.“

Ich würde deshalb eher einen **Teil des Preises bereits beim Start verbrauchen**.

Beispiel:

* 30 % des Preises beim Beginnen;
* 70 % bei erfolgreichem Abschluss.

Abbruch:

* Fortschritt komplett verloren;
* Startkosten ebenfalls verloren.

Damit kostet jeder Versuch tatsächlich etwas, aber ein einziger Treffer zerstört nicht die komplette Ökonomie.

---

# Ganz wichtig: Instandsetzen darf kein vollständiger Reset sein

Nach erfolgreichem Instandsetzen:

### Zurück kommt

* Frontlinie gilt wieder als gehalten;
* reguläre Spawns rücken wieder nach vorn;
* Frontposition kann wieder benutzt werden;
* kurze Schutz-/Neuordnungsphase.

### Nicht zurück kommt

* zerstörte Befestigungen;
* verbrauchter Nachschub;
* verlorene Munitions-/Versorgungsbestände;
* bereits verlorene Frontressourcen;
* eventuell ein Teil der ursprünglichen Widerstandsfähigkeit.

Das ist der **Narben-Effekt**.

Die Linie steht wieder.

Aber jeder sieht:

> Sie ist nicht mehr dieselbe Linie wie vorher.

---

# Wie verhindert man „absichtlich fallen lassen“?

Dafür braucht es mehrere Sicherungen gleichzeitig.

## 1. Der Fall verursacht irreversible Schäden

Beispielsweise:

* Frontdepot verloren;
* vorhandener Draht zerstört;
* eine befestigte Stellung permanent beschädigt;
* nächster Fall erfolgt schneller;
* zweite Instandsetzung kostet deutlich mehr.

Damit kann Fallenlassen nie neutral sein.

## 2. Die Rückeroberung muss wirklich eine Rückeroberung sein

Der Spieler darf nicht gemütlich an einem sicheren Punkt hinter der Front einen Reparaturknopf drücken.

Er muss:

> bis zur alten Front vorstoßen → Bereich säubern → dort exponiert arbeiten.

Sobald die Linie gefallen ist, spawnt der Gegner weiter vorn.

Der Spieler muss also **gegen den neuen Spawnraum anarbeiten**.

Das allein verhindert schon viel Missbrauch.

## 3. Instandsetzen sollte nur begrenzt wiederholbar sein

Ich würde für einen normalen 12–18-Minuten-Skirmish zunächst maximal:

**1 volle Instandsetzung**

testen.

Falls das zu hart ist:

zweite Instandsetzung möglich, aber beispielsweise **doppelte Kosten**.

Drei, vier oder fünf Wiederherstellungen würden das zentrale Ereignis entwerten.

## 4. Die Schutzphase ist kurz

Etwa **15–20 Sekunden** ohne neuen Großangriff auf die restaurierte Linie.

Genug für:

* Nachladen;
* Stellung beziehen;
* eventuell ein Stück Draht setzen.

Nicht genug, um gemütlich die gesamte Front neu aufzubauen.

## 5. Der Missionsfortschritt darf Fallenlassen nicht belohnen

Hier würde ich die genaue Bedeutung eurer „Uhr läuft schneller“-Regel nochmals sehr kritisch prüfen.

Falls „schneller“ bedeutet:

> Nach einem Frontfall kommt der Spieler schneller zum erfolgreichen Home-Line-Finale,

dann habt ihr unabhängig vom Instandsetzen bereits einen möglichen Speedrun-Exploit.

Ein Frontverlust darf den Skirmish **gefährlicher beziehungsweise ineffizienter** machen, nicht den Weg zum Erfolg verkürzen.

Grundregel:

> Ein freiwilliger Frontverlust darf niemals mehr Fortschritt pro Minute erzeugen als erfolgreiches Halten.

---

# Meine konkrete Startversion für „Instand setzen“

Für einen ersten Balance-Test:

**Voraussetzung:** Linie gefallen, Werkstelle an der alten Front freigekämpft.

**Kosten:** ungefähr Wert einer großen taktischen Anschaffung.

**Interaktion:** 8–10 Sekunden ununterbrochen.

**Abbruch:** Fortschritt weg, Startkosten weg.

**Reaktion:** Beginn erzeugt einen starken Lärm-/Aggroreiz.

**Solo:** Gegner brauchen genügend Anmarschzeit, dass ein gut vorbereitetes Zeitfenster tatsächlich reichen kann.

**Koop:** ein Spieler arbeitet, Rest verteidigt.

**Erfolg:** Spawn zurück zur Feindseite, 15–20 Sekunden Neuordnungsphase.

**Bleibender Schaden:** zerstörte Frontinfrastruktur bleibt zerstört.

**Häufigkeit:** zunächst eine Instandsetzung pro Skirmish.

Das wäre für mich der beste Startpunkt.

---

# 3 — Nacht-Roaming

Hier steckt möglicherweise eines der stärksten Systeme des Spiels.

Es kann aber ebenso leicht alles ruinieren.

Wenn Roamer einfach zufällig durch Spawnwürfe überall auftauchen, entsteht nicht:

> „Die Gräben leben.“

sondern:

> „Das Spiel nervt mich permanent mit Kleingegnern.“

Der wichtigste Unterschied ist deshalb:

> **Roamer sollten als Gruppen einen nachvollziehbaren Zustand und ein Ziel haben.**

---

# Nicht einzelne Zombies würfeln — Gruppen bewegen

Ich würde das Nachtleben hauptsächlich aus **kleinen wandernden Gruppen** bauen.

Beispiel für Solo als erster Test:

* 2–4 Roaming-Gruppen gleichzeitig im größeren Sektor;
* je etwa 2–5 normale Tote;
* Gruppen können sich durch Reize kurzzeitig vereinigen;
* außerhalb regulärer Wellen normalerweise höchstens eine wirklich alarmierte Gruppe gleichzeitig.

Damit ist die Karte selten völlig leer.

Aber der Spieler führt nicht alle zwanzig Sekunden einen belanglosen Zweikampf.

---

# Zustände einer Roaming-Gruppe

Vier Zustände reichen wahrscheinlich.

## 1. Wandern

Langsam durchs Grabennetz oder Niemandsland.

Keine konkrete Kenntnis vom Spieler.

## 2. Untersuchen

Ein Reiz wurde wahrgenommen.

Die Gruppe bewegt sich zum **Ort des Reizes**, nicht magisch zum Spieler.

## 3. Alarmiert

Spieler gesehen / sehr nah / massiver Reiz.

Jetzt aggressives Verhalten.

## 4. Abklingen

Spieler verloren.

Gruppe sucht noch kurz, danach kehrt sie zum Wandern zurück.

Diese Zustände müssen über Audio und Animation lesbar sein.

Ein Toter, der plötzlich exakt weiß, wo der Spieler ist, obwohl nur irgendwo ein Schuss gefallen ist, zerstört das System.

---

# Reize

Ich würde jedem Reiz drei Eigenschaften geben:

**Stärke × Reichweite × Dauer**

Keine komplizierte Simulation notwendig.

Beispielhaft:

| Reiz                     | Wirkung                                     |
| ------------------------ | ------------------------------------------- |
| einzelner Gewehrschuss   | kurzer, mittlerer Reiz                      |
| mehrere schnelle Schüsse | deutlich stärker                            |
| MG / Explosion           | großer Reiz                                 |
| normale Taschenlampe     | nur lokal und richtungsabhängig             |
| Leuchtkörper             | starker, länger anhaltender Reiz am Zielort |
| Spieler sehr nah         | starker lokaler Reiz                        |
| direkte Sicht            | sofortige Alarmierung                       |

Wichtig ist eine **Erinnerungszeit**.

Ein Pack darf nicht nach jedem neuen Geräusch um 180 Grad umdrehen.

Hat es sich für einen Reiz entschieden, verfolgt es diesen beispielsweise einige Sekunden, sofern kein deutlich stärkerer Reiz erscheint.

Sonst sieht die KI nervös und künstlich aus.

---

# Lärm muss ein Werkzeug sein, nicht nur eine Strafe

Der spannende Teil beginnt, wenn der Spieler Reize bewusst erzeugen kann.

Beispiel:

Vor ihm befindet sich eine Roaming-Gruppe im Connector.

Er könnte:

1. sie direkt bekämpfen;
2. warten, bis sie weiterzieht;
3. einen Leucht-/Signalgeber in eine Seitenstellung setzen;
4. dort Lärm verursachen und die Gruppe wegziehen.

Dann wird „Stealth“ nicht zu einem eigenen Schleichspiel.

Es wird zu **Raumkontrolle durch Aufmerksamkeit**.

Das passt hervorragend zu eurem Nachtmodus.

---

# Aber: Ablenken darf Gegner nicht löschen

Sehr wichtig.

Wenn ich zehn Tote mit einem Geräusch nach links ziehe, sind sie anschließend **links**.

Sie verschwinden nicht aus dem Director-Budget.

Dadurch entsteht ein interessanter Preis:

> Ich löse mein aktuelles Problem, baue aber möglicherweise ein späteres.

Wenn mehrere Gruppen demselben Reiz folgen, kann daraus sogar eine größere Ansammlung entstehen.

Der Spieler denkt dann:

> „Ich habe sie vom Frontgraben weggezogen — aber beim Pumpenstand steht jetzt eine ganze Meute.“

Das ist viel interessanter als ein klassischer Decoy-Gegenstand mit zehn Sekunden Crowd-Control.

---

# Roamer und reguläre Wellen dürfen nicht unabhängig voneinander eskalieren

Das ist der wahrscheinlich wichtigste Balancepunkt.

Wenn ihr zwei getrennte Systeme habt:

* Wave-Director erzeugt eine schwere Welle;
* Ambient-System würfelt gleichzeitig zufällig zwei Roamer-Gruppen;

bekommt der Spieler gelegentlich einen massiven Schwierigkeitspeak, für den niemand verantwortlich ist.

Ich würde deshalb ein gemeinsames **Intensitätsbudget** benutzen.

Wenn eine reguläre Welle beginnt:

* nahe Roaming-Gruppen dürfen sich der Welle anschließen;
* dafür entstehen während des Peaks kaum neue Ambient-Gruppen;
* nach der Welle fällt die Aktivität bewusst wieder ab.

So wirkt die Welt zusammenhängend:

> Die Horde, die eben im Hinterland herumwanderte, hat den Kampf gehört und kommt dazu.

anstatt:

> Zwei Spawn-Systeme haben zufällig gleichzeitig ausgelöst.

Das ist exakt die Art Director-Logik, die Left 4 Dead stark macht.

---

# „Nie ganz leer“ bedeutet nicht „ständig kämpfen“

Ich würde drei Spannungszustände anstreben:

### Ruhe

Man hört irgendwo etwas.

Vielleicht sieht man eine Silhouette.

Keine unmittelbare Bedrohung.

### Unsicherheit

Geräusche kommen näher.

Eine Gruppe untersucht etwas.

Spieler entscheidet, ob er reagiert.

### Eskalation

Gruppe wird alarmiert / vereinigt sich mit anderer Gruppe / reguläre Welle beginnt.

Danach muss wieder Ruhe möglich sein.

Grabenhorror braucht Leere.

Wenn immer etwas angreift, verschwindet Horror und übrig bleibt nur DPS-Arbeit.

---

# Sehr wichtig: keine billigen Spawntricks

Roamer sollten niemals sichtbar direkt hinter dem Spieler entstehen.

Neue Gruppen nur:

* aus bekannten Spawnlöchern;
* aus dem Niemandsland;
* aus okkludierten Grabenenden;
* aus Bereichen, in denen plausibel bereits Tote waren.

Idealerweise fühlt es sich so an, als wären sie **schon vorher Teil der Karte gewesen**.

Auch wenn technisch im Hintergrund abstrahiert wird, sollte ihre räumliche Geschichte konsistent bleiben.

---

# Ein besonders passendes Werkzeug: Leucht-/Signalkörper als Lockmittel

Ich würde das Nacht-System zunächst sogar **ohne speziellen Fantasy-Decoy** testen.

Ein vorhandenes, thematisch passendes Werkzeug kann beide Funktionen erfüllen:

**Leuchtkörper / Signalrakete**

Nutzen:

* Bereich beleuchten;
* Gegner sichtbar machen;
* gleichzeitig starken Reiz erzeugen.

Damit entsteht sofort ein Trade-off:

> Licht gibt Information, aber Aufmerksamkeit.

Und:

> Ich kann das Licht bewusst dort platzieren, wo ich die Toten haben will.

Das ist mechanisch klar und passt wesentlich besser zum Ton als eine moderne elektronische Ablenkungsgranate.

---

# Empfehlung für Frage 3

Roamer als **wenige persistente Gruppen**, nicht als konstant neu gewürfelte Einzelgegner.

Jede Gruppe:

* wandert;
* untersucht konkrete Reize;
* kann alarmiert werden;
* kann den Spieler wieder verlieren.

Lärm und Licht wirken auf **Orte**, nicht direkt als Aggro auf den Spieler.

Der Spieler kann diese Reize bewusst manipulieren.

Reguläre Wellen und Roaming teilen sich ein Intensitätsbudget, damit keine zufälligen Doppel-Peaks entstehen.

Und ganz wichtig:

> Die Karte darf nachts häufig gefährlich wirken, ohne häufig tatsächlich anzugreifen.

---

# Meine drei wichtigsten Entscheidungen für AP6

## 1. Frontfall physisch machen

Nicht:

> unsichtbare Drucksumme überschritten.

Sondern:

> Bresche entsteht → Gegner dringen ein → klar telegraphierter Durchbruch → erst dann fällt die Gesamtlinie.

Das löst den größten Fairnesskonflikt der 70-m-Front.

## 2. Instandsetzen gewinnt Raum zurück, löscht aber die Niederlage nicht

Gemeinsamer Nachschub + etwa 8–10 Sekunden exponierte Interaktion.

Keine Pflichtklasse.

Seltene Nutzung.

Der Fall hinterlässt dauerhafte Schäden.

Damit bleibt die Entscheidung interessant und kann nicht zuverlässig exploitet werden.

## 3. Nacht-Roaming über Aufmerksamkeit statt Zufall bauen

Wenige Gruppen mit nachvollziehbaren Zielen.

Schuss, Licht und Nähe erzeugen Reize an einem Ort.

Der Spieler kann diese Aufmerksamkeit bewusst verschieben.

Wenn dieses System trägt, habt ihr mit nur einem einfachen Untoten-Typ bereits einen Nachtmodus, der deutlich mehr kann als „Wave läuft zum Spieler“.

---

## Mein stärkster Design-Satz für diese Runde

**Der Spieler sollte nicht dafür verantwortlich sein, überall gleichzeitig zu verteidigen. Er sollte dafür verantwortlich sein, zu erkennen, welcher lokale Zusammenbruch als Nächstes die gesamte Stellung gefährdet — und mit Vorbereitung, Bewegung und Aufmerksamkeit genau diesen Zusammenbruch zu verhindern.**

Das ist für mich die Version von „eine Frontlinie halten“, die sowohl Solo als auch später im Koop funktionieren kann.


Perplexity

FRAGE 1 — Wie fühlt sich „eine Frontlinie halten" GUT an?
Aktueller Plan: Halte-Punkte an Breschen
Der Ansatz (Gegner bauen lokal Druck auf, Spieler entlastet, zu viel ungedeckter Druck irgendwo → ganze Linie fällt) ist grundsätzlich solide, aber es gibt drei Probleme:

„Ganze Linie fällt auf einmal" ist zu binär. Spieler verlieren alle Boni/Deckung auf einen Schlag — das fühlt sich frustrierend an, nicht wie ein organischer Rückzug.

70 m für einen Spieler sind zu viel, selbst mit Halte-Punkten. Wenn 3–4 Halte-Punkte gleichzeitig unter Druck geraten, kann ein Solo-Spieler nicht überall sein.

Kommunikation „wo brennt's" fehlt noch. Ohne klare Signale tappt der Spieler im Dunkeln.

Konkrete Vorschläge
A. Halte-Punkte mit „Integritäts-Balken" pro Abschnitt
Wie: Die Frontlinie ist in 3–4 Abschnitte unterteilt (nicht A/B/C wie früher, sondern unsichtbare Zonen). Jeder Abschnitt hat einen Integritäts-Wert (0–100%). Gegnerangriffe reduzieren lokal die Integrität. Spieler in der Nähe verlangsamen den Verlust (passiver Bonus). Fällt ein Abschnitt auf 0%, ist er „gefallen" (Gegner spawnen dahinter, Uhr läuft schneller), aber die restlichen Abschnitte halten weiter. Erst wenn alle Abschnitte gefallen sind → Frontlinie komplett gefallen.

Vorteile:

Spieler sehen konkret, wo der Druck ist (Integritäts-Balken im HUD).

Es fühlt sich organisch an, nicht binär.

Solo-Spieler kann Prioritäten setzen („Abschnitt 2 ist bei 30% — ich muss da hin").

Nachteile:

Mehr UI-Arbeit (Balken, Farbcodierung).

Balance: Wie schnell fällt Integrität ohne Spieler? Wie stark ist der Spieler-Bonus?

Referenz: Helldivers 2 Defense-Missionen nutzen ähnliche „Gate Integrity"-Mechaniken — Tore haben HP, Spieler müssen sie verteidigen, bis sie brechen.

B. „Brennpunkt"-Indikatoren (Audio + Visuell)
Wie: Abschnitte unter starkem Druck bekommen drei Signale:

Rote Partikel-Effekte am Boden (Staub wirbelt auf, wo Einschläge sind).

Audio-Cues (MG-Feuer, Schreie, Artillerie-Einschläge aus der Richtung).

HUD-Kompass zeigt rote Pfeile für Abschnitte <50% Integrität.

Vorteile:

Spieler hören/sehen den Druck, bevor sie hinschauen müssen.

Fühlt sich dynamisch an, nicht wie ein abstrakter Balken.

Nachteile:

Audio-Design-Aufwand (Richtungssound muss präzise sein).

Kann überladen wirken, wenn zu viele Signale gleichzeitig kommen.

Referenz: Left 4 Dead nutzt Audio-Cues für Horde-Angriffe (infiziertes Kreischen aus der Richtung). Spieler hören die Gefahr, bevor sie sie sehen.

C. Aktive Werkzeuge für Handlungsmacht (Solo)
Wie: Gib dem Solo-Spieler drei Optionen, um Druck zu entlasten, ohne überall sein zu müssen:

Werkzeug	Wirkung	Cooldown/Kosten
Signalrakete	Lockt Gegner für 15 s in eine andere Richtung (zieht Aggro von einem Abschnitt weg)	2 pro Einsatz
MG-Stellung (aufstellbar)	Automatisches Feuer auf einen Abschnitt (reduziert Druck für 30 s)	1 pro Einsatz
Draht-Reparatur	Stellt 20% Integrität eines Abschnitts sofort wieder her	3 min Cooldown
Vorteile:

Spieler fühlen sich nicht hilflos — sie haben Werkzeuge, um zu reagieren.

Erzwingt Positionierungs-Entscheidungen („Wo stelle ich das MG auf?").

Nachteile:

Balance: Zu stark → Spieler können Druck komplett negieren. Zu schwach → Werkzeuge fühlen sich nutzlos an.

Mehr UI (Cooldowns anzeigen).

Referenz: Helldivers 2 nutzt Stratagems (MG-Turrets, Mörser) für defensive Entlastung. Spieler können priorisieren, wo sie Hilfe brauchen.

D. Verbündete-KI (Solo-Bots)
Wie: Solo-Spieler bekommt 2 KI-Soldaten, die automatisch Abschnitte verteidigen. Sie sind dumm (laufen nicht zwischen Abschnitten hin und her), aber sie halten einen Abschnitt stabil, solange sie leben. Spieler kann ihnen Befehle geben („Verteidige Abschnitt 2").

Vorteile:

Reduziert das „Löcher-Stopfen"-Gefühl — Spieler müssen nicht überall sein.

KI gibt Grundschutz, Spieler kann aktiv werden, wo es brennt.

Nachteile:

KI-Pathing-Aufwand (müssen zuverlässig Abschnitte verteidigen).

Risiko: Spieler verlassen sich zu sehr auf KI, fühlen sich nicht selbst wirksam.

Referenz: Deep Rock Galactic Solo-Modus gibt Spielern KI-Dwarves, die helfen, aber nicht alles tragen .

Empfehlung
Kombiniere A + B + C:

Integritäts-Balken pro Abschnitt (visuelles Feedback).

Audio/Visuelle Brennpunkt-Signale (dynamisches Feedback).

2–3 aktive Werkzeuge (Signalrakete, MG-Stellung, Draht-Reparatur).

Warum? Das gibt dem Spieler Information (wo brennt's), Werkzeuge (was kann ich tun), und Handlungsmacht (ich kann die Lage beeinflussen). Solo fühlt sich nicht hilflos an, aber der Druck bleibt.

Nicht empfehlen: Nur KI-Bots ohne Werkzeuge. Das nimmt dem Spieler zu viel Kontrolle.

FRAGE 2 — „Instand setzen": Gefallene Linie zurückerobern
Aktueller Stand
Beschlossen: Exponierte, mehrere Sekunden dauernde Interaktion an festem Punkt. Zieht Gegner an, Abbruch = Fortschritt weg, kein ständiges Hin-und-Her. Erfolg → Linie steht wieder, Spawn rückt zurück, kurze Schutzphase.

Offen: Womit? Wie lange? Wie teuer? Solo vs. Koop? Wie verhindert man „absichtlich fallen lassen"?

Konkrete Vorschläge
A. Womit? — Verbrauchbare Ressource + Werkzeug
Option 1: Bloße Zeit (nur Interaktion)

Vorteile: Einfach, keine Ressourcen-Balance nötig.

Nachteile: Fühlt sich zu billig an — Spieler können es „nebenher" machen.

Option 2: Verbrauchbare Ressource (z.B. „Pionier-Material")

Vorteile: Echte Entscheidung — „Lohnt sich dieser Versuch?".

Nachteile: Ressourcen-Farmen könnte trivial sein.

Option 3: Mitgebrachtes Werkzeug (z.B. „Graben-Reparatur-Kit")

Vorteile: Loadout-Entcheidung — „Nehme ich Reparatur oder mehr Munition?".

Nachteile: Solo-Spieler haben nur 1 Kit — zu limitierend?

Option 4: KI-Trupp hinschicken

Vorteile: Koop-Spieler können sich aufteilen (einer repariert, andere decken).

Nachteile: KI-Pathing-Aufwand, kann zu „Bot schickt's allein" degenerieren.

Empfehlung: Kombination aus Option 2 + 3:

Spieler brauchen 1× Reparatur-Kit (im Loadout wählbar, max. 2 pro Einsatz).

Zusätzlich 50 Nachschub (verbraucht bei Erfolg, nicht bei Abbruch).

Warum? Das macht es zu einer echten Entscheidung: „Habe ich ein Kit dabei? Habe ich genug Nachschub? Lohnt sich dieser Abschnitt?"

Referenz: Helldivers 2 nutzt Stratagem-Limits (max. 1× MG-Turret pro Spieler) für ähnliche Entscheidungen.

B. Wie lange, wie teuer?
Dauer: 8–12 Sekunden (langsam genug, dass Gegner kommen können; schnell genug, dass es nicht unerträglich ist).

Kosten:

1 Reparatur-Kit (im Loadout, max. 2 pro Einsatz).

50 Nachschub (bei Erfolg verbraucht, bei Abbruch zurückerstattet).

Schutzphase nach Erfolg: 15 Sekunden (keine Gegner-Spawns im reparierten Abschnitt, Spieler können sich neu formieren).

Warum diese Zahlen? 8–12 s ist lang genug für Spannung (Gegner kommen, Spieler müssen decken), aber kurz genug, dass es sich machbar anfühlt. 50 Nachschub ist spürbar, aber nicht prohibitiv (ein Einsatz bringt ~200–300 Nachschub).

Referenz: Helldivers 2 Defense-Missionen nutzen ähnliche „Hold for X seconds"-Phasen nach Reparatur.

C. Solo vs. Koop — Skalierung
Solo:

Dauer: 10 s.

Kosten: 1 Kit + 50 Nachschub.

Gegner-Anziehung: 3–4 Gegner kommen während der Interaktion.

Koop (2–4 Spieler):

Dauer: 10 s (bleibt gleich — kein „schneller mit mehr Spielern").

Kosten: 1 Kit + 50 Nachschub (bleibt gleich).

Gegner-Anziehung: 3–4 Gegner pro Spieler in der Nähe (mehr Spieler = mehr Gegner, aber auch mehr Deckung).

Warum? Dauer und Kosten gleich zu halten verhindert, dass Koop sich wie „leichter Modus" anfühlt. Mehr Gegner bei mehr Spielern hält den Druck hoch.

Referenz: Deep Rock Galactic skaliert Gegnerzahl mit Spielern, aber nicht Missionsdauer .

D. Verhindern: „Frontlinie absichtlich fallen lassen, dann in Ruhe reparieren"
Problem: Wenn Spieler die Frontlinie absichtlich fallen lassen, um dann sicher zu reparieren, ist die Mechanik kaputt.

Lösungen:

Methode	Wie	Trade-off
Reparatur nur möglich, solange Linie <50% gefallen	Wenn >50% der Abschnitte gefallen sind, kann man nicht mehr reparieren.	+ Verhindert absichtliches Fallenlassen. – Kann frustrierend sein, wenn Spieler „zu spät" kommen.
Reparatur-Kosten steigen mit gefallenen Abschnitten	1 Abschnitt gefallen = 50 Nachschub · 3 Abschnitte = 150 Nachschub.	+ Macht spätes Reparieren teurer. – Mehr Balance-Aufwand.
„Uhr" läuft viel schneller bei gefallener Linie	Gefallene Abschnitte = 2× Uhr-Geschwindigkeit. Spieler haben weniger Zeit zum Reparieren.	+ Natürlicher Druck — zögern kostet. – Kann Solo überfordern.
Reparatur nur von der Home-Line aus möglich	Spieler müssen zur Home-Line laufen, um Reparatur zu starten (wie „Instand setzen"-Quest).	+ Erzwingt Rückzug. – Fühlt sich umständlich an.
Empfehlung: Kombination aus Methode 1 + 3:

Reparatur nur möglich, solange ≤2 Abschnitte gefallen (bei 4 Abschnitten).

Uhr läuft 2× schneller pro gefallenem Abschnitt.

Warum? Das macht absichtliches Fallenlassen unattraktiv (Uhr läuft zu schnell, Reparatur wird unmöglich), ohne es zu verbieten.

Referenz: Helldivers 2 Defense-Missionen: Wenn zu viele Tore brechen, wird die Mission unwinnable — Spieler müssen früh verteidigen.

Empfehlung (Zusammenfassung)
Womit: 1× Reparatur-Kit (Loadout) + 50 Nachschub (verbraucht bei Erfolg).

Dauer: 10 s, Gegner-Anziehung (3–4 pro Spieler).

Solo vs. Koop: Dauer/Kosten gleich, Gegnerzahl skaliert mit Spielern.

Verhindern von Missbrauch: Reparatur nur ≤2 gefallene Abschnitte + Uhr läuft 2× schneller pro gefallenem Abschnitt.

FRAGE 3 — Nacht-Roaming, das sich lebendig statt zufällig anfühlt
Aktueller Plan
Tote wandern im Niemandsland/Hinterland, sammeln sich an Reizen (Schüsse, Leuchtkugeln, Spielernähe), brechen dann als Gruppe los. Zusätzlich zu regulären Wellen.

Offen: Wie dosieren? Welche Reiz-/Gruppen-Mechanik macht es lesbar/ausnutzbar?

Konkrete Vorschläge
A. Reiz-System: „Lärm-Level" pro Abschnitt
Wie: Jeder Graben-Abschnitt hat ein Lärm-Level (0–100). Aktionen erhöhen es:

Schüsse: +10–20 pro Schuss (MG: +5 pro Sekunde).

Leuchtkugeln: +30 sofort.

Spieler läuft durch: +1 pro Sekunde.

Explosionen: +50 sofort.

Lärm-Level verfällt um 5 pro Sekunde (wenn keine neuen Reize).

Gegner-Reaktion:

Lärm-Level >50 → 2–3 Gegner wandern zum Abschnitt.

Lärm-Level >80 → 5–7 Gegner + 1 Elite (Heuler/Koloss).

Lärm-Level >100 → Mini-Horde (10–15 Gegner).

Vorteile:

Spieler verstehen die Regel (laut = mehr Gegner).

Sie können bewusst Lärm machen, um Gegner woanders zu locken.

Nachteile:

Balance: Wie schnell verfällt Lärm? Wie viele Gegner pro Level?

UI: Lärm-Level anzeigen oder verstecken?

Referenz: Left 4 Dead Common Infected reagieren auf Lärm (Schüsse, Alarme). Left 4 Dead's AI Director nutzt „Player Intensity" für ähnliche Dynamik.

B. „Horde-Richtung" anzeigen (Audio + Visuell)
Wie: Wenn sich eine Horde sammelt (Lärm-Level >80), gibt es drei Signale:

Audio: Heulen/Kreischen aus der Richtung (3D-Sound).

Visuell: Rote Partikel-Wolke am Himmel über dem Abschnitt.

HUD: Kompass zeigt roten Pfeil für 5 s.

Vorteile:

Spieler wissen, wo die Gefahr ist, bevor sie kommt.

Sie können vorbereiten (MG aufstellen, Draht reparieren).

Nachteile:

Audio-Design-Aufwand (Richtungssound muss präzise sein).

Kann zu „UI-Crutch" werden — Spieler schauen nur auf Kompass, nicht auf die Welt.

Referenz: Left 4 Dead nutzt Audio-Cues für Horde-Richtung (infiziertes Kreischen).

C. Aktive Täuschung: „Lärm woanders machen"
Wie: Gib Spielern Werkzeuge, um Lärm zu machen:

Leuchtkugel (wirft rotes Licht, +30 Lärm, 10 s Dauer).

Knallkörper (Explosion, +50 Lärm sofort, 5 s Dauer).

Lockpfeife (kontinuierliches Geräusch, +10 Lärm/s, 15 s Dauer).

Vorteile:

Spieler können bewusst Gegner locken („Ich werfe eine Leuchtkugel nach links, dann gehen wir rechts").

Fühlt sich taktisch an, nicht zufällig.

Nachteile:

Balance: Zu stark → Spieler können Gegner komplett manipulieren. Zu schwach → Werkzeuge fühlen sich nutzlos an.

Mehr UI (Cooldowns anzeigen).

Referenz: Left 4 Dead Pipe Bombs locken Infizierte an. Helldivers 2 nutzt Köder-Taktiken (Turrets woanders aufstellen).

D. Dosierung: „Nie ganz leer, nie überfüllt"
Wie: Nutze ein dynamisches Spawn-Budget:

Basis-Spawns: 5–10 Gegner wandern immer im Niemandsland (unabhängig von Lärm).

Lärm-Spawns: Bis zu 20 zusätzliche Gegner bei Lärm-Level >80.

Wellen-Spawns: Reguläre Wellen (von der Feindseite) kommen unabhängig davon.

Regel: Max. 30 Gegner gleichzeitig im Sektor (außer reguläre Wellen). Wenn 30 erreicht sind, keine Lärm-Spawns mehr.

Vorteile:

Gräben sind nie ganz leer (immer 5–10 Gegner).

Aber auch nie überfüllt (max. 30 + Wellen).

Spieler können Lärm-Spawns manipulieren, aber nicht komplett vermeiden.

Nachteile:

Balance: 30 Gegner — zu viel oder zu wenig?

Performance: 30 Gegner im Browsergame — machbar mit Instancing?

Referenz: Left 4 Dead nutzt AI Director für dynamische Gegnerzahl (basierend auf Spieler-Intensität). Helldivers 2 Defense-Missionen haben feste Wellen + ambient Spawns.

Empfehlung (Zusammenfassung)
Reiz-System: Lärm-Level pro Abschnitt (0–100), verfällt um 5/s.

Gegner-Reaktion: >50 = 2–3 Gegner, >80 = 5–7 + Elite, >100 = Mini-Horde (10–15).

Anzeige: Audio (Heulen) + Visuell (rote Wolke) + HUD (Kompass-Pfeil für 5 s).

Täuschung: Leuchtkugel (+30 Lärm), Knallkörper (+50 Lärm), Lockpfeife (+10 Lärm/s).

Dosierung: 5–10 Basis-Spawns + bis zu 20 Lärm-Spawns, max. 30 gleichzeitig.

Warum? Das macht Nacht-Roaming lesbar (Spieler verstehen die Regeln), ausnutzbar (sie können Lärm manipulieren), und spannend (nie ganz leer, nie überfüllt).

3 wichtigste Korrekturen / Empfehlungen
Frontlinie nicht binär fallen lassen — nutze Integritäts-Balken pro Abschnitt (3–4 Abschnitte). Spieler müssen sehen, wo der Druck ist, und Prioritäten setzen können.

Instand setzen = echte Entscheidung — 1× Reparatur-Kit (Loadout) + 50 Nachschub, 10 s Dauer, nur ≤2 gefallene Abschnitte möglich. Verhindert Missbrauch, fühlt sich gewichtig an.

Nacht-Roaming = Lärm-System — Lärm-Level pro Abschnitt (0–100), Gegner reagieren dynamisch, Spieler können mit Leuchtkugeln/Knallkörpern manipulieren. Macht es lesbar und taktisch.

Grundsatz: Alle drei Systeme (Frontlinie halten, Instand setzen, Nacht-Roaming) brauchen klare Regeln, die der Spieler verstehen und ausnutzen kann. Nichts fühlt sich schlechter an als „zufälliges Scheitern" — alles muss nachvollziehbar sein.


Gemini:
Die Aufteilung in eine durchgehende Frontlinie, ein verwinkeltes Hinterland und eine Home-Line schärft die Dramatik im Vergleich zu zerstückelten Sektoren massiv. Hier sind die konkreten Analysen, Schwachstellen und Empfehlungen für deine drei Kernfragen.

FRAGE 1 — Wie fühlt sich "eine Frontlinie halten" GUT an?

Eine 70-Meter-Linie solo abzudecken birgt die Gefahr von Dauer-Stress ohne Spieltiefe (reines "Löcher-Stopfen"). Damit das Halten nicht frustriert, muss die Frontlinie über Verzögerung, Sichtachsen und Informationsfluss geführt werden – nicht über reine Laufarbeit.

Lesbarkeit ("Wo brennt's?"):

Akustisch & Visuell: Breschen dürfen nicht lautlos fallen. Jede Bresche braucht ein physisches Warnsystem: Wenn eine Barrikade Bedenkzeit verliert, steigen gelbe/rote Leuchtsignale auf, und Holz/Sandsäcke krachen hörbar.

HUD/UI: Ein minimalistisches Kompass-Widget oder ein schematischer Front-Status am Bildrand (z. B. 3 Breschen-Knoten: Grün / Gelb / Blinkend Rot).

Handlungsmacht für Solo-Spieler:

Passive Verzögerung (Draht & Fallen): Der Spieler muss Breschen nicht mit seinem Körper sichern, sondern mit Vorbereitung. Ein Stacheldraht-Hindernis tötet Gegner nicht, kauft aber 10–15 Sekunden Zeit, um auf die andere Seite zu laufen.

Erhöhte Laufstiege / Erhöhte Sichtachse: Ein leicht erhöhter Laufsteg knapp unter der Grabenoberkante an der Rückseite des Grabenrands erlaubt es, über die Front zu blicken und 2 von 3 Breschen aus einer zentralen Position einzusehen.

Taktische Aufgabe statt Hilflosigkeit: Ein Solo-Spieler sichert nicht die komplette Linie, sondern managt die Breschen-Priorität.

Referenzspiele:

CoD Zombies (Barrikaden): Man steht nicht vor 4 Fenstern gleichzeitig, sondern hört/sieht, welche Barrikade nachgibt, repariert kurz und wechselt die Position.

Helldivers 2 (Tor-Verteidigung): Statische Barrieren halten die Masse auf, während man die Spitzen bricht.

FRAGE 2 — "Instand setzen": Die gefallene Linie zurückerobern (§9.5)

Womit? (Mechanik):

An einem zentralen Bau-Punkt der gefallenen Linie (Telegrafen- / Pionier-Kasten).

Ressource + Zeit: Erfordert ein mitgebrachtes Pionier-Material (im Quartier/an der Home-Line gekauft) plus 8–10 Sekunden Interaktion vor Ort.

Dauer, Kosten & Solo/Koop-Skalierung:

Problem: 10 Sekunden festgewurzelt stehen ist im Koop trivial (3 Mann decken), solo aber ein Todesurteil.

Lösung (Segmentierter Fortschritt / Deployable): Die Interaktion hat 3 Stufen (33% / 66% / 100%), die bei Unterbrechung nicht zurückfallen. Alternativ platziert man eine "Reparatur-Ladung", die nach der Aktivierung 15 Sekunden autonom arbeitet und währenddessen verteidigt werden muss.

Anti-Meta ("Frontlinie absichtlich fallen lassen"):

Doppelter Uhren-Tick: Solange die Frontlinie liegt, verfällt die feindliche "Angriffskraft" (eure Sieguhr) 50–100% schneller. Wer die Linie liegen lässt, verliert wertvolle Zeit für Beute/Skirmish-Fortschritt.

Das Reparatur-Signal: Das Anwerfen des Instandsetzungs-Kastens zündet ein lautes Knall-Signal. Es löst eine temporäre Mini-Horde aus dem Hinterland aus. Die Reparatur durchzuführen ist also gefährlicher als das Halten.

FRAGE 3 — Nacht-Roaming (Horde & Grabenhorror)

Nacht-Roaming darf kein zufälliges Dauer-Spawnen sein. Es muss als ein dynamisches Ökosystem aus Gefahr und Steuerung verstanden werden.

Dosierung & Druckventil:

Die Untoten im Hinterland/Niemandsland befinden sich initial im Trägheits-Zustand (schlurfend, blind, leises Stöhnen). Sie blockieren Wege als physische Hindernisse.

Sie reagieren auf drei Reize: Ungebündeltes Licht (Laternen), Lärm (Ungedämpfte Schüsse/Explosionen) und Proximity/Geruch (sehr nahes Vorbeilaufen).

Lesbarkeit & Ausnutzbarkeit (Spieler-Manipulation):

Ablenkungsmittel (Leuchtkugeln / Knallkörper): Eine geschossene Leuchtkugel ins Niemandsland zieht 80 % aller Roamer aus dem Hinterland ab. Der Spieler kann die Horde gezielt steuern, um sich den Rücken für eine Reparatur freizumachen.

Licht-Dilemma: Lampe an = volle Sicht im verwinkelten Graben, zieht aber Untote an. Lampe aus = Schleichen an der Horde vorbei ist möglich, aber die Sicht ist minimal (Grabenhorror).

---

# Runde 4 — Gesamtreview nach dem AP6-01b-Spieltest (2026-09-09)

Der Nutzer hat ChatGPT / Perplexity / Gemini den **aktuellen Stand** (Konzept
v0.3 — eine Frontlinie + Home-Line, fechtender Rückzug, Nacht-Roaming, der
AP6-01b-Sektor) zum **Gesamtreview** gegeben. Kein enges Briefing, offene Frage
„was würdet ihr am Konzept noch verfeinern". Rohmaterial unten dicht
zusammengefasst (die Vollantworten liegen im Nutzer-Chat 2026-09-09), danach
die **Planer-Triage** — was davon Beschluss-relevant ist und *wann*.

## ChatGPT — 32 Punkte + „idealer 15-min-Run" + Prioritäten

1. **Die „Uhr" wörtlicher modellieren: echte Feindreserve statt zonengewichteter
   Kills.** Der Feind hat z. B. 100 Reservepunkte; der Director gibt sie aus,
   wenn er Gegner schickt (Wiedergänger 1, Läufer 1,5, Grabengänger 2, Heuler 3,
   Koloss 10). Ein 3 m hinter der Front getöteter Gegner ist nicht „weniger
   wert" als 3 m davor — sonst optimiert der Spieler das abstrakte System statt
   die Stellung. Position ändert die **Kampf-Effizienz** (Anmarschkosten,
   Zugang), nicht den Kill-*Wert*. Kein künstlicher Multiplikator nötig, damit
   „an der Front sind wir im Vorteil" spürbar ist.
2. **Finale-Widerspruch:** Warum soll der Soldat 70–100 m zurücklaufen und
   ausgerechnet die Home-Line verteidigen, wenn er die Front *nie* verloren
   hat? Fühlt sich an wie „du hast gehalten — das Spiel gibt die Linie trotzdem
   auf, damit das geplante Finale stattfindet". Zwei saubere Lösungen:
   **A (bevorzugt): Finale dort, wo die Verteidigung gerade steht** — Front
   gehalten → schwereres vorgelagertes Finale + bessere Belohnung; Front
   gefallen → Home-Line-Finale + schlechtere Lage. **B:** befohlener Rückzug
   per Feldtelefon mit glaubwürdigem Grund („eigenes Sperrfeuer in 90 s"), die
   Bewegung selbst wird zum Finale.
3. **Kleine KI-Garnison (Stellungssoldaten).** Nicht Bots — 1–2 namenlose
   Kompaniesoldaten an Haltepunkten, fangen *kleinen* Druck auf, besiegen keine
   Welle. Job: Zeit kaufen + Zustand kommunizieren (stabil → kämpft → bedrängt
   → überrannt) + Welt beleben. Macht den Solospieler vom „einzigen
   Verteidiger" zum mobilen Krisenlöser. Bewusst simpel: kein Inventar, keine
   Befehle, kein ständiges Wiederbeleben. Später: Nachschub ausgeben, um einen
   Ersatztrupp an einen Posten zu schicken (besserer Einsatz für „KI-Trupps"
   als bloß mehr DPS).
4. **Frontfall noch physischer:** 4–5 benannte Breschen; eine Bresche allein ≠
   „Front verloren" — die Toten müssen *hineinkommen*. Zweite räumliche
   Schwelle: Parapet → Frontgraben → **Kommunikationsknoten hinter der Front**.
   Kritische Masse am rückwärtigen Sammelpunkt → Befehl „FRONT NICHT ZU HALTEN
   — ZURÜCK". Der Spieler versteht *warum* die Stellung aufgegeben wird: der
   Feind ist in die Struktur eingedrungen, nicht „ein Balken runter".
5. **2–3 In-Run-„Feldanpassungen"** statt Perks/+Schaden. Beispiel Langgewehr:
   Schnellanschlag (schneller aus Sprint/Ziel, mehr Schwanken), Schützenstellung
   (Stabilität auf Feuertritt, schwächer in Bewegung), verstärkte Patronierung
   (mehr Reserve, höhere Nachschubkosten), Bajonett-Routine. ~2 pro Einsatz →
   kleine Run-Build-Identität ohne „Diablo im Schützengraben".
6. **Ein seltenes Felddepot pro Sektor** (seltene Waffe / große Sprengladung /
   experimentelles Gerät / Top-Versorgung), Position + Inhalt variieren. **Bonus,
   nie Pflichtlösung.** Erzeugt Run-Geschichten („wir haben früh das Selbstlade-
   gewehr gefunden").
7. **KEINE Waffen-Rarity-Farben** (weiß→grün→…→orange) und **kein** „M98 +240 %
   Schaden" — beschädigt den Feldpost-/Schlachtplan-Ton. Vertikale Progression
   aus: bessere Versorgung, taktische Optionen, Zugriff auf seltene Waffen,
   Klassenkompetenz, Positionierung — nicht aus exponentiellen Zahlen.
8. **Nachschub braucht Investitionskonflikt:** „brauche ich jetzt" (Munition 20,
   Draht 15) vs. „macht uns später stärker" (Munitionsdepot reaktivieren 40).
   Interessanter als „Sandsack oder anderer Sandsack".
9. **„Türen kaufen" → Infrastruktur freimachen.** Eingestürzten Kommunikations-
   graben einmalig für Nachschub räumen → dauerhafter Shortcut für den Einsatz.
   Macht die Map zum Teil des Builds. Max. 2–3 solcher Entscheidungen pro Karte.
10. **Optionale Feldaufträge** übers Feldtelefon (Telefonleitung im Niemandsland
    verbinden, Munitionskiste bergen, Beobachtungspunkt 45 s besetzen …).
    Belohnung Nachschub / einmalige Artillerie / seltene Ausrüstung. Spieler
    kann „Nein, Front zu heiß" sagen. Anfangs max. 1 pro Skirmish.
11. **Modifier-System à la DRG (Mission-Warnings / Anomalies) = „Frontlagen".**
    Dichter Nebel, Munitionsknappheit, Unruhige Erde (mehr Roaming), Zerschossene
    Leitung (Warnungen verspätet), Schweres Sperrfeuer, Vollmond, Frischer
    Nachschub, Gasnester. Massiv Replayability ohne neue Gegner/Waffen/Karten,
    passt stilistisch besser als „Zombies +50 % Feuerresistenz".
12. **Nacht-Roaming: Aufmerksamkeit gehört einem ORT, nicht dem Spieler.**
    Schuss = starker kurzer Reiz an Position X; Laterne = schwacher dauerhafter;
    Signalrakete = starker langer. Roaming-Gruppen: „da drüben war etwas", nicht
    `targetPlayer = Max`. Ermöglicht echte Manipulation (aus Seitenbucht
    schießen → Tote laufen hin → durch den Kommunikationsgraben zurück).
13. **Heuler an dieses System koppeln:** er *schreit* statt zuzuschlagen →
    massiver Aufmerksamkeitsreiz an seiner Position → nahe Gruppen wechseln das
    Ziel. Automatisch Prioritätsziel, stark im Sounddesign.
14. **Nacht-Gegner nach Verben, nicht Statblöcken:** Wiedergänger = Raum füllen /
    Grunddruck · Läufer = Distanz schließen / schlechte Position bestrafen ·
    Grabengänger = vorbereitete Kill-Zones über Nebenwege umgehen · Heuler =
    weitere Gruppen in den Kampf ziehen · Koloss = Stellung/Barrikade brechen,
    Positionswechsel erzwingen.
15. **Koloss ≠ Bullet-Sponge.** Gefährlich, weil er *Geometrie verändert*
    (Draht, Sandsackstellung). Kugeln verlangsamen/verwunden, echtes Ziel:
    Schwachstelle / Sprengladung / Umgebungsexplosiv.
16. **Solo, 1 Waffe → jedem kritischen Problem 2–3 Lösungswege.** Koloss:
    Pionier-Sprengladung (effizient) / garantierte schwere Ladung aus einem
    Frontdepot / Schwachstelle mit Normalwaffe (langsam, gefährlich).
17. **Bauen kauft immer nur Verzögerung, ersetzt nie den Spieler** (Draht hält
    8 s länger auf; Autoturm, der eine Lane ohne Spieler tötet = schlecht).
    Vordefinierte Bauplätze bleiben (Pathing, FP-Lesbarkeit, Server-Sim,
    Balancing, KI). Pionier wählt *was* auf einen Slot kommt.
18. **„Instand setzen" hinterlässt sichtbare Narben.** Nach Rückeroberung:
    Front wieder aktiv, aber Draht weg, ein Bauplatz beschädigt, Depot leer.
    Erste Verteidigung = vorbereitet, zweite = improvisiert. Rückeroberung
    wertvoll, aber nie kostenloser Reset.
19. **Tod/Respawn: kein kostenloses Respawnen.** Solo: begrenzte Notbergung
    (Bild dunkel → Sekunden später an letzter sicherer Stellung, Munition
    teilweise weg, Zeit vergangen, Lage weiterentwickelt). Standard 1 Bergung,
    leicht 2, dann Einsatz verloren (Soldat kommt verwundet zurück, kein
    Permadeath).
20. **Quartier = überwiegend horizontale Progression** (Waffenkammer: neue
    Typen; Pionierschuppen: neue Bauoptionen; Funkposten: neue Supportbefehle;
    Lazarett: neue Heilung; Ausbildung: neue Feldanpassungen). Kein +Damage-
    Techbaum, der die Frontmechanik trivialisiert.
21. **Gefechtsbericht** nach dem Einsatz (Feldpost-Stil, Ereignis-Timeline:
    „23:17 Front durchbrochen · 23:22 Front instand gesetzt · 23:34 Gefr. Weber
    verwundet geborgen" + verschossene Patronen, Nachschub, Stellungsschäden,
    gerettete Infrastruktur, Soldaten-XP). Gibt Runs eine Geschichte, verstärkt
    die Kompaniefantasie, ist intern gute Telemetrie. **Hoch priorisieren.**
22. **Extraktion als hartes Push-your-Luck:** nach dem Hauptauftrag „RÜCKZUG
    FREIGEGEBEN — Beute teilweise gesichert". Abziehen = sicher; weiter halten =
    zusätzliche Feindreserve aktiv. **Kniff: die verdiente Grundbeute bleibt
    gesichert, nur der Verlängerungs-Bonus steht neu auf dem Spiel** → Spieler
    trauen sich „eine geht noch".
23. **Verlängerungen mutieren den Run** (Licht fällt aus / Heuler-Aktivität
    hoch / Frontdepot getroffen / Koloss gemeldet) statt „gleiche Welle +20 %".
    Max. 2–3 Verlängerungen.
24. **Nacht braucht echte Ruhe** — regelmäßig 20–40 s, in denen *nichts*
    angreift (Wind, ferne Artillerie, Holz knarzt). Nicht verlorene Spielzeit —
    das lässt den nächsten Angriff wirken. L4D-Director denkt in Spannungs-
    kurven, nicht in Gegneranzahl.
25. **Manche Tote sind schon auf der Karte** (regungslos in einer Nische, halb
    im Schlamm — „Leiche oder nicht?"), reagieren auf Licht/Nähe/Lärm. Nicht
    jede Leiche, kein billiger Jump-Scare (GTFO-Prinzip).
26. **Licht als fast zweite Waffe:** Dunkelheit = sicherer vor Aufmerksamkeit,
    schlechte Info; Licht = gute Info, evtl. Aufmerksamkeit. Signalrakete =
    Beleuchtung + Crowd-Control + Risiko in einem.
27. **Schwierigkeit über Parallelität skalieren, nicht HP.** Solo = eine
    Hauptkrise + Roamingdruck; 2 Spieler = zwei relevante Orte; 4 = zwei große
    Probleme + Spezialgegner + Hinterlanddruck. Erzeugt „du links, ich rechts".
28. **Klassen = unterschiedliche Antworten, nicht unterschiedliche
    Erlaubnisse.** Bresche: Schütze tötet schnell genug · MG unterdrückt den
    Eingang · Pionier baut Sperre · Sanitäter hält die Garnison kampffähig.
    Nie „Interaktion nicht möglich: Pionier erforderlich".
29. **Der Schütze braucht Identität = der Responder.** Nicht +Gewehrschaden:
    bessere Bewegung zwischen Stellungen, schneller Anschlag nach Sprint,
    bessere improvisierte Deckung, schnelleres Markieren von Bedrohungen. MG
    ankert · Pionier formt · Sanitäter erhält · **Schütze reagiert.**
30. **Generator würfelt später nicht nur Geometrie:** welche Infrastruktur
    funktioniert, wo das seltene Felddepot liegt, welche 2 Breschen anfällig
    sind, wo dormant dead liegen, welche Roaming-Routen bevorzugt, welche
    Verbindung blockiert/reparierbar ist.
31. **Meta-System produziert „Frontlagen" statt „Maps":** Einsatz = Sektor +
    Bedingungen + Gegnerzusammenstellung + optionaler Auftrag. Die Karte ist
    nur der physische Träger.
32. **Bewusst NICHT:** Crafting-Inventar · Loot-Rarity-Treadmill · Hunger/Durst/
    Waffenverschleiß · 50 frei platzierbare Bauobjekte · riesiger Skilltree pro
    Soldat · 10 Zombiespezies (5 reichen bei echten unterschiedlichen Problemen)
    · Pflicht-Boss nach jedem Run (Koloss bleibt *Ereignis*) · Zufalls-Spawns
    direkt hinter dem Spieler · permanente Maximal-Intensität · Pflicht-
    Sidequests · harte Klassenschranke für kritische Mechaniken · **weitere
    große Meta-Systeme, bevor Frontlinie + Nachtroaming + Rückzug Spaß machen.**

**ChatGPT-Prioritätsreihenfolge:** (1) AP6 nur auf Front + Nachtökologie —
Feindreserve statt Kill-Uhr, physischer Durchbruch, wenige Roaming-Gruppen,
Lärm/Licht, echte Ruhe, **kein** großes Progressionssystem. (2) Stellung als
Entscheidungsraum — Nachschub, 3–4 Bau-/Versorgungsoptionen, Instandsetzen mit
Narben, evtl. einfache Garnison. (3) Run-Dramaturgie — 2–3 Feldanpassungen,
seltenes Depot, 1 optionaler Auftrag, Extraktion/Verlängerung, Gefechtsbericht.

## Perplexity — Loop / Progression / Atmosphäre / KI / Meta

- **Pacing:** L4D-AI-Director-Intensitätsphasen (Build-up → Peak → Cooldown
  10–20 s) **kombiniert mit** CoD-Runden-Nummern für klare Meilensteine.
  Empfehlung Hybrid: Wellen 1–5 linear/strukturiert, ab Welle 6 Director
  dynamisch, jede 5. Welle fixer Elite + Bonus.
- **Progression:** Perks/Feld-Upgrades (CoD-Stil), Waffen-Mods/Overclocks
  (DRG-Stil, 2–3 Slots/Waffe), Wandwaffen als feste Drops mit limitierter
  Munition + zufälligem Run-Upgrade.
- **Atmosphäre:** Soldaten-Biografien + Feldpost + Traumata; Audio-Horror
  (Heulen fern / Flüstern nah / Stille); visuelle Landmarken (Panzerwrack,
  Bunker, Krater) — hat der Sektor teils schon.
- **KI:** Spezial-Gegner mit *Mechanik* nicht HP (Heuler/Tank/Schleicher/
  Brenner); einfaches KI-Flanking über Verbindungsgräben + Deckungsnutzung;
  Elite-Variation über Fähigkeiten (Koloss regeneriert ohne Feuer, Heuler ruft
  3–5 Normale).
- **Meta:** tägliche/wöchentliche Herausforderungen; Modifier (Warnings negativ
  / Anomalies positiv); Endgame „Kriegs-Modus" (mehrere Sektoren, persistente
  Verluste, DRG-Deep-Dive-artig).
- **QoL:** Replay-System, Statistiken, Loadout-Presets, Trainings-Modus,
  Farbenblind-Modus.
- **NICHT:** Permadeath, PvP, offene Welt, Fahrzeuge, Microtransactions.
- **Top-5:** AI-Director-Pacing · Feld-Upgrades · Spezialgegner-Mechaniken ·
  tägl./wöch. Herausforderungen · Audio-Horror Nacht.

## Gemini — interaktive Grabenwerkzeuge

- **Interaktive Graben-Fallen:** Gas-/Brand-Ventile (10 s tödliche Zone, aber
  vernebelt eigene Sicht, kostet Nachschub); Signalfackel-Mörser an der
  Home-Line (Leuchtkugel ins Niemandsland zieht nachts ~80 % der Roamer ab);
  Schlamm-/Barrikaden-Einsturz an Biegungen (bremst Gegner, versperrt aber auch
  den eigenen Durchgang).
- **Solo „Augen & Ohren":** Stolperdraht-/Glocken-Warnsystem an den Breschen
  („Abschnitt B wird überrannt" sofort hörbar); reparierbarer **KI-Beobachter**
  am Scherenfernrohr — schießt nicht, gibt Frühwarnung / kündigt Elite an
  (DRG-Bosco, aber rein passiv/defensiv).
- **High-Risk-Scavenging im Niemandsland** in Feuerpausen (Pionier-Material,
  seltene Wandwaffen, Munition — Risiko durch Roamer/Scharfschützen).
- **WW1-Nahkampf als Munitions-Notbremse:** zweistufig (leichter Stoß-Hieb vs.
  aufgeladener Stich), Exekution eines taumelnden Gegners lässt garantiert etwas
  Munition fallen.
- **Audio-Hierarchie (Egoperspektive, Sicht durch Biegungen begrenzt):**
  Signature-Sounds je Elite (Koloss Kettengerassel + Zischen; Sturmtrupp
  Granaten-Klacken; Heuler Schrei vor dem Losbrechen); Umgebungs-Resonanz
  (enger Betonunterstand klingt anders als offener Holzgraben).
- **3 Sofort-Fixes (Gemini):**
  1. **Stolperdraht-Warnsysteme an den Breschen** — löst das Solo-
     Orientierungsproblem sofort, ohne komplexes Minimap-UI.
  2. **Köder-Prinzip (Licht/Lärm) verankern** — der Nacht-Modus braucht
     zwingend ein Werkzeug, mit dem der Spieler die Horde aktiv weglockt, um
     die mehrsekündige Instandsetzung überhaupt zu überleben.
  3. **Ressourcen an Niemandsland-Scavenging koppeln** — verhindert Camping an
     der Home-Line, zwingt zu kalkulierten Vorstößen ins Feld.

---

## Planer-Triage Runde 4 (nicht von den KIs) — 2026-09-09

**Nichts davon berührt AP6-01c/01d (Graben-Look).** Der Worker baut ungestört
weiter. Das hier ist Konzept-Arbeit für *nach* dem Look-Pass.

### A — Bestätigt die aktuelle Richtung, keine Aktion

- **Physischer Frontfall** (Bresche → Eindringen → Rückraum → Fall) = exakt die
  AP6-02b-Spec. ChatGPT #4 fügt „Kommunikationsknoten hinter der Front als
  zweite Schwelle" hinzu — AP6-02b hat das im Kern („Gegner halten einen Fleck
  hinter der Linie → DURCHBRUCH"), die *benannte* Schwelle schärft die
  Telegraphie. In den AP6-02b-Kickoff aufnehmen.
- **Lärm/Licht → Ort, nicht Spieler · Roaming-Gruppen mit Zuständen · Signal-
  körper als Lockmittel · Gegner nach Verben · echte Ruhephasen · keine Spawns
  hinter dem Spieler** — alles schon in Sparring Runde 3, jetzt von 3 KIs
  unabhängig bestätigt. Direkt in die Gegner-KI-Design-Runde (Schritt 3 der
  neuen Reihenfolge).
- **„Keine großen Meta-Systeme, bevor der Kern Spaß macht"** — alle 3 KIs
  unabhängig, deckt sich mit der KONTER-Lehre + der „Breite, aber Kern zuerst"-
  Linie. Bestätigung, kein Kurswechsel.
- **Klassen = Antworten, nicht Erlaubnisse; Umwelt = garantierte Notlösung für
  harte Gegner** — schon KONZEPT §3/§4. ChatGPT #16/#28 schärfen die Regel
  („jedes kritische Problem 2–3 Wege, einer klassen-optimal, einer
  umwelt-garantiert"). Als expliziten Design-Grundsatz in KONZEPT §5 (Gegner-
  Roster) aufnehmen, wenn der Roster-Ausbau dran ist.

### B — Fordert eine Entscheidung heraus → eigene Design-Runde, VOR AP6-02b

1. **Die „Uhr": zonengewichtete Kills → echte Feindreserve** (ChatGPT #1, koppelt
   an #31 „Frontlagen" und an den Director). Der stärkste Einzelpunkt. Unser
   „Frontfall = gefährlicher, nicht schneller" (Sparring R3, KONZEPT §3) ist
   *derselbe Wille* — ChatGPTs Reserve-Modell ist die sauberere Mechanik dafür
   und entfernt die Exploit-Fläche ganz. **Aber:** Änderung an `front.ts` / der
   Uhr, und AP6-02b ist gegen das aktuelle Modell geschrieben. → gehört in die
   **Gegner-KI-/Nacht-Kern-Design-Runde** (die kommt eh vor AP6-02b), weil
   „Director gibt Reserve aus" = Wave-Director + Roaming-Budget in einem.
2. **Finale-Ort** (ChatGPT #2). Sehr scharfer Punkt: KONZEPT §6 nimmt heute das
   Home-Line-Finale *immer* an. Variante A (Finale, wo die Verteidigung gerade
   steht) ist systemischer und erhält die Spieler-Leistung. → KONZEPT-§6-
   Revision, dieselbe Design-Runde.
3. **Kleine statische Garnison** (ChatGPT #3, Gemini „Beobachter"). Löst 3
   Probleme auf einmal (Solo-Fiktion „1 Mann / 70 m", Löcherstopfer,
   Atmosphäre). KONZEPT §3 hat „Zuweisbare KI-Trupps — BESCHLOSSEN", aber als
   *anfordernde Verstärkung*, nicht als *ambiente Posten*. → Design-Runde:
   entscheiden, ob eine **minimale** Version (1–2 Posten je Haltepunkt, 4
   Zustände, kein Revive) noch in AP6 landet oder AP7 wird. Tendenz Planer:
   minimal in AP6, wenn die KI-Runde zeigt dass der Solo-Loop es *braucht*.

→ Vorschlag: **eine gebündelte Design-Runde „Nacht-Kern + Uhr"** nach AP6-01d,
die (a) das Reserve-Modell, (b) den Finale-Ort, (c) die Garnison-Frage und
(d) das Roam-/Reiz-System (Sparring R3) zusammen klärt — sie hängen alle am
selben Director-/Budget-Konzept. Danach AP6-05-Spec + AP6-02b-Anpassung.

### C — Speist die Gegner-KI-/Nacht-Kern-Design-Runde (schon geplant)

Aufmerksamkeit-an-Ort (#12) · Heuler als Schrei-Reiz (#13) · Gegner-Verben (#14)
· Koloss = Geometrie-Brecher nicht Sponge (#15) · L4D-Intensitätsphasen mit
echtem Cooldown (Perplexity, #24) · dormant dead auf der Karte (#25, GTFO) ·
Licht als taktisches System / „zweite Waffe" (#26) · Schwierigkeit über
Parallelität statt HP (#27, für späteren Koop) · Stolperdraht-/Glocken-Warnung
an Breschen (Gemini) · Audio-Signaturen je Elite (Gemini). Der Design-Runden-
Brief muss diese Liste explizit aufgreifen.

**Gemini schärft zwei Kopplungen:** (a) das **Köder-Werkzeug (Licht/Lärm) ist
Voraussetzung dafür, dass „Instand setzen" solo überhaupt überlebbar ist** —
nicht bloß ein nettes Extra; die Design-Runde muss Lockmittel + Instandsetzen
zusammen denken (betrifft AP6-04). (b) **Niemandsland-Scavenging als
Anti-Camping-Hebel** — ein Grund, die Home-Line-Deckung in Feuerpausen zu
verlassen; koppelt an die Ruhephasen (#24) und das seltene Depot (#6).

### D — Später (§7–§9, nach AP6). Hier geparkt, Backlog-Eintrag folgt

- Feldanpassungen / In-Run-Waffenoptionen (#5) — die *akzeptable* Form von
  „Perks", playstyle statt +Schaden.
- Seltenes Felddepot / „Mystery-Box-Moment" (#6) — erweitert die bestehende
  Wandwaffen-Idee.
- **Kein Rarity-/Schaden-Treadmill** (#7, #32, Perplexity) — als **Constraint
  jetzt** in KONZEPT §9.10 + WAFFEN.md festhalten (billig, verhindert Drift).
- Nachschub-Investitionskonflikt (#8) · Infrastruktur-Freimachen / Map-als-Build
  (#9) · optionale Feldaufträge (#10) · Frontlagen/Modifier (#11, Perplexity).
- **„Instand setzen" mit Narben** (#18) — billig, schärft eine schon
  beschlossene Mechanik → in die AP6-04-Spec, wenn sie geschrieben wird.
- Notbergung statt Gratis-Respawn (#19) · Quartier horizontal (#20, = KONZEPT §7).
- **Gefechtsbericht** (#21) — billig, hoher Atmosphäre-Wert, gute Telemetrie.
  Eigener Backlog-Eintrag, eher hoch.
- Extraktion als hartes Push-your-Luck: Grundbeute gesichert, nur Verlängerungs-
  Bonus im Risiko; Verlängerungen mutieren den Run (#22, #23) — für die
  KONZEPT-§6-Revision mitnehmen.
- Zweistufiger Nahkampf + Exekutions-Munition (Gemini #4) — relevant wegen
  „Solo, 1 Waffe" → WAFFEN-Backlog.
- Interaktive Grabenwerkzeuge: Gas-Ventile, Signalmörser, Flutbarrikaden
  (Gemini #1) · No-Man's-Land-Scavenging in Feuerpausen (Gemini #3, ChatGPT-
  Overlap) — Backlog, evtl. an das seltene Depot koppeln.
- Umgebungs-Audio-Resonanz Beton vs. Holzgraben (Gemini #5) — hängt am
  AP6-01c-Materialsystem (`wellblech`/`beton` vs. `holz`), schöner späterer
  Anschluss.
- Soldaten-Biografien / Feldpost / Traumata (Perplexity) — §7.
- Tägl./wöch. Herausforderungen, Replay, Loadout-Presets, Trainings-Modus,
  Farbenblind-Modus (Perplexity QoL) — Infrastruktur-/Meta-Backlog.
- „Kriegs-Modus" mit persistenten Verlusten (Perplexity Endgame) — steht schon
  im Backlog („Krieg"-Modus), ergänzt um DRG-Deep-Dive-Struktur.

### E — Verworfen / schon abgelehnt

Permadeath (§10) · Rarity-Farben + %-Schaden-Treadmill (von den KIs selbst
abgelehnt) · CoD-Perks mit flachen Statboni (ChatGPT warnt selbst; „Feldanpassung"
ist die gute Form) · frei platzierbares Bauen (schon vordefinierte Slots) ·
Pflicht-Boss pro Run · Hunger/Durst/Verschleiß · PvP / offene Welt /
Microtransactions (Perplexity) · Waffen-Mod-Menü im DRG-Umfang (zu viel
UI/Balance für einen 15-min-Run — die 2 Feldanpassungen decken den Bedarf).