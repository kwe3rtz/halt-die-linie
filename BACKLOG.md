# Halt die Linie — Backlog / Später

Ideen und Systeme, die **bewusst nicht im ersten Stand** sind, aber später
dazukommen können. Kein Wegwurf — nur zurückgestellt. Reihenfolge ohne Bedeutung.

## Klassen & Fähigkeiten

- **Sturmtruppler** — die 5. Klasse. Nachschieben, sobald die 4 Startklassen
  (Schütze, MG-Schütze, Pionier, Sanitäter) stehen. Signatur/Aktive/Passiv in
  `KONZEPT.md` §4 schon skizziert.
- **Weitere Klassen:** Scharfschütze, Artilleriebeobachter (ruft Sperrfeuer),
  Melder (schnell, Objektive).
- **Gestufte Fähigkeits-Freischaltung** — erste Meldung beim Feldkommandeur =
  Basisversion, zweite Aufgabe + zweite Meldung = verbesserte Version. Erst mal
  nur die einfache einmalige Freischaltung.
- **Permanenter Klassen-Skilltree** im Quartier (either/or-Perks pro Klasse),
  getrennt von den Loadout-Perk-Slots. Form noch offen.

## Gegner

- **Gegner-Roster-Ausbau (eigenes Paket nach AP3).** AP2 hat nur
  Linieninfanterie als langsamen Nahkämpfer-Stub. Gebraucht: Bajonett-Charger
  (rennt gezielt an), Anschleicher, MG-Trupp (unterdrückt, nagelt fest),
  Grabenräumer (reißt Parapet auf), Sturmtrupp (jagt Platzierungen) — inkl.
  **Gegner-Fernkampf** und ggf. Pathing. Verhaltens-Tags stehen in `KONZEPT.md`
  §5, die `EnemyDef`-Typen in `src/data/schema.ts`.
- **Scharfschütze** (Tag) — bestraft Stillstand in First Person, schwer zu orten.
- **Gasleiche** (Nacht) — aufgedunsen, Giftwolke beim Tod, als echte Einheit
  statt nur Umweltgefahr.
- **Kavallerie** (Tag) — schneller Flankierer, harter Draht-Konter (Pionier hat
  den Draht schon). Aus dem Ur-Konzept.
- **Flieger / Luftangriff** — braucht eigene Antwort: AA-Stellung an der
  Home-Line oder eine Flak-Klasse.
- Weitere Elites, Nacht-Boss.

## Waffen

Vollständige Waffen-Backlog-Liste + die WW1-Rohrecherche stehen in
[`WAFFEN.md`](WAFFEN.md) (Abschnitt „Backlog" und Anhang). Kurz:

- Sturmtruppler-Arsenal (Grabenflinte, Flammenwerfer, Grabenkeule).
- Scharfschützengewehr mit Zielfernrohr / Periskop.
- Dritte Nation (slawisch / „Zarenreich").
- Grabenkanone 37 mm, Gewehrgranate / VB-Werfer, Chauchat-Risikowaffe.
- Gas-Varianten (Maskenbrecher, Senfgas).

## Ökonomie

- **Zweite Einsatz-Währung** — z.B. „Material" fürs Bauen/Reparieren vs.
  „Gefechtsbedarf" für Fähigkeiten/Munition. Nur einführen, falls die eine
  Währung zu flache oder zu überladene Entscheidungen erzeugt.

## Nation

- **Rolle × Nation als zweite echte Achse** — Nation gibt Statprofil + eigenen
  Waffen-Pool, statt nur leichter Trait. 5×N Balancing, Uniformen pro Nation.
- **Nationsspezifische Waffen-Pools** mit eigenen Fraktions-Boni.

## Sektor & Generator

- **Variable Verbindungsgraben-Anzahl.** Der Sektor-Datenmodell trägt die Anzahl
  ab AP6-01d als Parameter (`VG_ANZAHL`, fest 3 gebaut). Der echte Schalter,
  Entscheid am Generator- **oder** am Schwierigkeits-System:
  - **Variante 1 — Seed-abgeleitet:** jedes neue Spiel bekommt eine unsichtbare
    Session-ID; die letzte Ziffer o.Ä. bestimmt 1 / 2 / 3 Verbindungsgräben.
    Bringt Wiederspielwert + leichte Varianz in denselben handgebauten Sektor.
  - **Variante 2 — Schwierigkeit-abgeleitet:** leicht = 3 Gänge (viel Weg zum
    Rotieren), schwer = 1 Gang, kein Stützgraben. Braucht erst ein
    Schwierigkeits-System (siehe unten).
- **Schwierigkeits-System.** Existiert noch nicht. Voraussetzung für
  Verbindungsgraben-Variante 2 und für gestaffelte Wave-Director-Presets.
- **Quer laufender Stützgraben / zweite Reservelinie.** In AP6-01d bewusst
  rausgenommen (Vision = 2 Hauptgräben + wenige kleine). Wieder aufnehmen, wenn
  der Kern trägt und mehr Hinterland-Tiefe fehlt.
- **MG-Stände auf dem Parapet + Front-Wandkammern.** Aus der Grill-Skizze; die
  „schlanke Front" (AP6-01d) lässt sie weg. Nachziehen, wenn die Front mehr
  Struktur/Rollen braucht.
- **Echte Texturen / Material-Politur** (Holz, Sandsack, Schlamm, Wellblech) —
  der Schritt *nach* dem Formdetail-Material aus AP6-01c/d. Normal-Maps, ggf.
  eine WW1-Feldpost/Schlachtplan-Stilstudie (`KONZEPT.md` §9.10).

## Modi & Meta

- **„Krieg"-Modus** — langer Modus über mehrere Skirmishes. Struktur offen
  (Feldzugskarte / Dauerlauf / Kapitel mit Story). Erst Skirmish-Kern.
- **Feldkommandeur als wiederkehrende benannte Figur** — auch im
  Quartier-Aufenthaltsraum präsent, gibt dem Ton ein Gesicht. Vorerst nur
  funktionaler Fixpunkt an der Home-Line.
- **Gemischte Tag+Nacht-Einsätze / Übergänge** — vorerst ist ein Einsatz
  strikt Tag ODER Nacht.

## Technik

- **Standalone-Desktop-Wrapper** — Tauri oder Electron.
- **Koop-Netcode + Node-Server** — die headless Sim wandert auf den Server,
  Clients verbinden. Architektur ist schon darauf ausgelegt.
- **Backend (Accounts + DB)** statt localStorage — geräteübergreifender
  Fortschritt, Cheat-Schutz.
- **WebGPU** als Default-Target (statt WebGL2).

## Politur

- Ragdolls / Debris / einstürzende Sandsäcke (Havok, kosmetisch).
- Justierbare Kamera / Zoom-Optionen.
- Waffen-Aufsätze und -Varianten in die Tiefe.
- Grabenschilder mit generierten Namen, Sektor-Lore.

## Aus Sparring Runde 4 (2026-09-09) — nach dem Kern

Gesamtreview von ChatGPT / Perplexity / Gemini nach dem AP6-01b-Spieltest.
Volltext + Planer-Triage in `SPARRING-ANTWORTEN.md` „Runde 4". Alles hier ist
**nach** AP6 (erst Frontlinie + Nacht-Roaming + Rückzug zum Spaß bringen — von
allen drei KIs unabhängig betont). In grober Reihenfolge:

- **Feldanpassungen** — 2–3 In-Run-Waffenoptionen, die die *Spielweise* ändern
  (Schnellanschlag, Schützenstellung, verstärkte Patronierung …), nicht +Schaden.
  Die einzige akzeptierte Form von „Perks".
- **Seltenes Felddepot pro Sektor** — 1 zufälliger Top-Gegenstand (seltene
  Waffe / Sprengladung / Versorgung), Position + Inhalt variieren. Bonus, nie
  Pflichtlösung. Erweitert die Wandwaffen-Idee.
- **Nachschub-Investitionskonflikt** — „jetzt brauchen" (Munition/Draht) vs.
  „später stärker" (Depot reaktivieren, Kommunikationsgraben freiräumen =
  dauerhafter Shortcut, Map-als-Build). Max. 2–3 Infrastruktur-Entscheidungen
  pro Karte.
- **Optionale Feldaufträge** übers Feldtelefon — 1 pro Skirmish, echt
  ablehnbar. Belohnung Nachschub / einmalige Artillerie / seltene Ausrüstung.
- **Frontlagen / Modifier** (DRG Warnings & Anomalies) — Nebel, Munitionsknapp-
  heit, Unruhige Erde, Vollmond, Gasnester … Replayability ohne neue Assets.
  Verwandt: [[variable-verbindungsgraben]] und der Generator (Runde-4-Punkt #31:
  „Frontlagen statt Maps" — Einsatz = Sektor + Bedingungen + Gegnermix +
  optionaler Auftrag).
- **Gefechtsbericht** nach dem Einsatz (Feldpost-Ereignis-Timeline + Munition/
  Nachschub/Stellungsschäden/Soldaten-XP). Billig, hoher Ton-Wert, gute interne
  Telemetrie — **eher hoch priorisieren.**
- **Extraktion als hartes Push-your-Luck** — Grundbeute bleibt gesichert, nur
  der Verlängerungs-Bonus steht neu auf dem Spiel; Verlängerungen *mutieren*
  den Run (Licht aus / Heuler-Alarm / Koloss gemeldet). Max. 2–3. → gehört in
  die KONZEPT-§6-Revision.
- **„Instand setzen" mit Narben** — nach Rückeroberung Front aktiv, aber Draht
  weg / ein Bauplatz beschädigt / Depot leer. Kein kostenloser Reset. → in die
  AP6-04-Spec.
- **Notbergung statt Gratis-Respawn** (solo 1×, leicht 2×, dann Einsatz
  verloren — Soldat kommt verwundet zurück).
- **Kein Rarity-/Schaden-Treadmill** — keine Waffen-Rarity-Farben, kein
  „+240 % Schaden". Vertikale Progression aus Versorgung / taktischen Optionen /
  Zugriff auf seltene Waffen / Klassenkompetenz / Position. (Constraint, nicht
  Feature — gehört perspektivisch nach `WAFFEN.md` + KONZEPT §9.10.)
- **Quartier = horizontale Progression** (neue Optionen, nicht größere Zahlen).
- **Zweistufiger WW1-Nahkampf + Exekutions-Munition** als Munitions-Notbremse
  (relevant wegen „Solo, 1 Waffe").
- **Interaktive Grabenwerkzeuge** — Gas-/Brandventile, Signalfackel-Mörser als
  Roamer-Köder, einstürzende Barrikaden (Area-Denial an Engstellen).
- **No-Man's-Land-Scavenging** in Feuerpausen (Risiko/Ertrag), evtl. an das
  seltene Depot gekoppelt.
- **Umgebungs-Audio-Resonanz** Beton-Unterstand vs. offener Holzgraben —
  knüpft an das AP6-01c-Materialsystem an.

**Speist direkt die kommende Gegner-KI-/Nacht-Kern-Design-Runde** (kein
Backlog, sondern nächster Schritt): Feindreserve statt zonengewichteter Kills ·
Finale dort wo die Verteidigung steht (KONZEPT §6) · kleine statische Garnison
(1–2 Posten je Haltepunkt, 4 Zustände) · Aufmerksamkeit-an-Ort · Heuler als
Schrei-Reiz · L4D-Intensitätsphasen mit echtem Cooldown · dormant dead ·
Licht als taktisches System · Warn-Stolperdraht an Breschen.
