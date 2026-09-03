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
