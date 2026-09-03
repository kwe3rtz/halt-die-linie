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

## Planer-Notiz: was davon wir übernehmen / verwerfen

*Wird in der Design-Runde gefüllt — pro Punkt: übernommen / verworfen / offen,
mit kurzer Begründung. Beschlossenes wandert nach `KONZEPT.md` bzw. in die
AP-Spezifikation.*

Erste offene Konflikte, die die Runde klären muss:

- **Skalierung mit Spielerzahl:** Länge/Angriffsachsen (Gemini, ChatGPT) vs.
  Breite (Perplexity). → Tendenz Länge.
- **Nächste Arbeitspakete:** Map/Pathing zuerst (Gemini, Perplexity) vs.
  Rückzugs-Greybox zuerst (ChatGPT). → mit dem Nutzer-Map-Plan abgleichen.
- **In-Mission-Quest:** alle drei wollen sie als Dauermechanik weg — die im
  Konzept beschlossene Fassung (`KONZEPT.md` §4) muss überarbeitet werden.
- **Nations-Vertrautheit:** ChatGPT erster Streichkandidat; steht im Konzept
  (`KONZEPT.md` §4). → prüfen.
- **Netcode-Transport:** WebSocket (Perplexity) vs. UDP/WebRTC/Geckos.io
  (Gemini) — für später, aber notieren.
