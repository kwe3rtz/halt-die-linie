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
