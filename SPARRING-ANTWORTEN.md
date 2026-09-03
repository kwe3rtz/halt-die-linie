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
