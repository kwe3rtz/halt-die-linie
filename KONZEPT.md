# Halt die Linie — Konzeptdokument

**Entwurf v0.3 · Stand 7. September 2026** (§1/§3/§5/§6/§9/§10 in der
Design-Runde 2026-09-07 neu gefasst: eine Frontlinie statt A/B/C-Abschnitte,
größeres begehbares Grabennetz, „Instand setzen" als Rückeroberung, Nacht
zuerst)

Koop-Wave-Survival-Shooter im Grabenkrieg des Ersten Weltkriegs, First-Person.
Dieses Dokument hält den im Gespräch beschlossenen Konzeptkern fest — als
gemeinsame Referenz. Technik und Architektur stehen separat in
[`TECHNIK.md`](TECHNIK.md).

- **Umfang:** Konzeptkern — Detailsysteme folgen (siehe §9)
- **Spielart:** Solo dauerhaft spielbar · Koop als erklärtes Fernziel

**Legende:** `BESCHLOSSEN` = im Gespräch festgelegt · `RICHTUNG` = grobe Absicht,
noch nicht final · `OFFEN` = nächste Ebene, siehe §9

---

## §1 Der Kern in einem Satz

First-Person-Koop-Wave-Survival-Shooter im Ersten Weltkrieg. Du führst einen
Soldaten deiner Kompanie in einen **weitläufigen Frontsektor mit Tiefe** — ein
verzweigtes Grabensystem — und überstehst Wellen: **tagsüber** gegen die
feindliche Armee, **nachts** gegen die Toten des Niemandslands. Fällt die
Frontlinie, ziehst du dich fechtend zurück und versuchst, sie wieder instand
zu setzen; die Home-Line ist die echte Verlustgrenze. Zwischen den Einsätzen
baust du das Kompanie-Quartier aus.

---

## §2 Genre & Rahmen

### Genre — `BESCHLOSSEN`
Koop-Wave-Survival-Shooter, **First-Person**. Aktives Schießen ist das Kern-Verb;
die Figur, nicht eine Anlage, ist die Haupthandlungsmacht.

### Kein Tower-Defense — `BESCHLOSSEN`
Die ursprüngliche TD-Idee (Türme bauen und aufwerten als Hauptverb) ist
verworfen — im Koop zu sperrig.

### Plattform — `BESCHLOSSEN`
Browsergame zuerst. Später möglich: Standalone-Desktop-App. 3D ist „ziemlich
sicher" — es wird von Anfang an in 3D gebaut (siehe `TECHNIK.md`).

### Spielerzahl — `BESCHLOSSEN`
Solo zuerst — und dauerhaft möglich. Koop ist erklärtes Fernziel und späterer
Fokus. Die Architektur wird von Beginn an koop-tauglich gedacht
(server-autoritativ), aber in der ersten Phase gibt es keinen Netcode.

### Referenzrahmen — `RICHTUNG`
CoD-Zombies (Wellenstruktur, „du bist mittendrin") × Deep Rock Galactic
(Kompanie-Hub, Klassenrollen, First-Person-Koop) × Grabenkriegs-Setting.
*Nicht* Orcs Must Die / Sanctum — das war die verworfene Action-TD-Richtung.

---

## §3 Der Sektor — Verteidigung in der Tiefe

> **Neu gefasst in der Design-Runde 2026-09-07.** Das alte kompakte **H** mit
> in Abschnitte (A/B/C) unterteilter Frontlinie ist verworfen (§10): der
> Spieltest zeigte es als zu statisch, zu klein, zu abstrakt. Ersetzt durch
> ein **größeres, frei begehbares, verzweigtes WW1-Grabensystem** mit **einer
> durchgehenden Frontlinie** und **einer Home-Line**, die je als Ganzes halten
> oder fallen. Die Technik-Basis aus AP4/AP5 (Kollision, Nav-Graph,
> Zustandsmaschine `stabil→…→verloren`, fechtender Rückzug, Wave-Director)
> trägt weiter und wird auf die neue Struktur umgestellt.

Der Sektor ist ein **weitläufiges Grabennetz** mit Tiefe: viele verbundene
Gräben, Laufgräben, Trichterfelder und Ruinen, durch die der Spieler sich frei
bewegt. Von der Feindseite nach hinten:

### Grundriss — `BESCHLOSSEN` (Design-Runde 2026-09-07)

1. **Feindseite** — feindliches Grabensystem + Anmarschwege. Der Feind spawnt
   hier, **solange die Frontlinie steht**. Nicht mit den eigenen Gräben
   durchgängig verbunden (die Front trennt), für den Spieler nicht betretbar.
2. **Niemandsland** — Trichterfeld, Drahtreste, Ruinen, alte teils verfallene
   Gräben zwischen Feindseite und Frontlinie. Verzweigt, nicht kanalisiert,
   mit Deckung und Sichthindernissen. Nachts der Roam-Raum der Toten.
3. **Frontlinie** — *eine durchgehende* Grabenlinie über die Sektorbreite:
   Feuertritt, Parapet, Unterstände, ein bis zwei Bresche-Punkte, Bau-Slots,
   ein Nachschubdepot. Sie hält oder fällt **als Ganzes**
   (`stabil → bedrängt → gebrochen → verloren`) — **keine A/B/C-Abschnitte**.
4. **Hinterland** — größerer, frei begehbarer Bereich zwischen Frontlinie und
   Home-Line: Reserve- und Laufgräben, Geschützstellungen, Trichter,
   Baracken-Ruinen. **Mehrere Wege** nach vorn und hinten, alle irgendwie
   verbunden. Hier spielt sich der fechtende Rückzug ab.
5. **Home-Line** — durchgehende rückwärtige Linie, befestigt, begehbare
   Unterstände (Munitionslager, Verbandsplatz, Feldkommandeur). Hält oder
   fällt als Ganzes. **Die echte Verlustgrenze.**

### Die Linie fällt — der Feind rückt vor — `BESCHLOSSEN`

Der Feind-Spawn folgt der vordersten gehaltenen Linie:

- **Frontlinie steht** → Spawn auf der Feindseite, der Feind kämpft sich durchs
  Niemandsland heran (lange Vorwarnzeit).
- **Frontlinie gefallen** → Spawn rückt nach vorn, an/hinter die gefallene
  Front; der Feind drückt durchs Hinterland Richtung Home-Line. Kürzerer Weg,
  die Uhr läuft schneller, das Front-Depot ist weg.
- **Home-Line gefallen** → Spawn unmittelbar davor; jetzt nur noch Überleben
  bis zum Finale — oder bis eine Linie zurückerobert ist.

Gegner **materialisieren nie im Sichtfeld** — Spawns liegen in verdeckten
Bereichen (feindliche / verfallene Gräben, hinter Ruinen, im Rauch).

### Eine gefallene Linie zurückerobern — „Instand setzen" — `BESCHLOSSEN`

Rückeroberung ist jederzeit möglich, aber teuer und riskant. An der gefallenen
Linie gibt es einen (oder wenige) **Instandsetzungs-Punkte**. Dort hält der
Spieler eine **Pionier-artige Interaktion über mehrere Sekunden** — dabei
exponiert und langsam, und die Interaktion **zieht Gegner an / lässt
Verstärkung nachströmen**. Erfolgreich zu Ende gebracht: die Linie kippt zurück
(auf `bedrängt`/`stabil`), die Feind-Spawnzone rückt wieder nach vorn, das
Depot ist wieder da. Bricht die Interaktion ab (Tod, weglaufen), war der
Versuch umsonst. **Kein ständiges Hin- und Hercapturen** — jeder Versuch
kostet echt. *(Werkzeug, Dauer, Kosten, Fiktion — offen, §9.)*

### Die „Uhr" — warum die Front halten — `BESCHLOSSEN`

Die endliche Angriffskraft des Feindes (§6) wird dort am stärksten zermürbt,
wo der Trupp **an der Frontlinie** hält (weit vorne = teurer Anmarsch für den
Feind). Kills im Hinterland zermürben weniger, an der Home-Line am wenigsten.
Fällt die Frontlinie, läuft die Uhr schneller (kürzerer Feindweg). Die Front
halten heißt: mehr Feindverluste pro Zeit → schnelleres Ende. Rückzug ist eine
Abwägung, kein reiner Verlust — aber Zurückerobern lohnt.

### Maßstab — größer, aber lesbar — `RICHTUNG`

Die Karte darf deutlich größer und weitläufiger sein als das alte H — echtes
Grabensystem-Gefühl, mehrere Wege, Raum zum Ausweichen und für roamende
Gegner. Grenze: der freie Rückweg Frontlinie → Home-Line soll für einen
Solo-Spieler in überschaubarer Zeit machbar bleiben; lang wird der Rückzug
durch Feinddruck, nicht durch bloße Distanz. Konkrete Maße in den Tickets
(Greybox, im Spieltest justiert).

### Handgebaut zuerst, Generator später — `BESCHLOSSEN`

Erst **ein einziger, komplett handgebauter Greybox-Sektor** im neuen Stil, um
den überarbeiteten Kern-Bogen zu beweisen (Frontlinie halten → fällt →
zurückfallen → Home-Line halten → ggf. zurückerobern). Aus modularen
Rasterbausteinen, damit derselbe Baukasten später der Generator nutzt. Die
prozedurale Erzeugung ist ein **eigenes späteres Arbeitspaket** und darf dann
das **ganze Grabennetz** würfeln — aber erst, wenn der Handbau im Spieltest
trägt (§9.5).

### Parapet als lebendiges Ziel — `BESCHLOSSEN`

Grabenwände haben Struktur. Gegner reißen Löcher; durch eine Bresche strömt
der Feind. Der Trupp stopft die Lücke physisch oder gibt die Linie auf.

### Fechtender Rückzug — `BESCHLOSSEN`

Frontlinie und Home-Line durchlaufen je `stabil → bedrängt → gebrochen →
verloren` (als ganze Linie, nicht abschnittsweise). Eine verlorene Linie
öffnet dem Feind den Weg nach hinten. „Zurückziehen" ist eine Entscheidung
des Spielers, kein Skript.

### Lesbarkeit im First-Person-Graben — `BESCHLOSSEN`

Keine Minikarte. Klar unterschiedliche **Silhouetten** (Frontlinie flach/weit,
Hinterland verwinkelt, Home-Line hoch/befestigt) · **Kompass** im HUD mit
„HOME"-Marker + Zustand von Frontlinie / Home-Line · eine **Lagekarte** an der
Home-Line · **direktionales Audio** als Pflicht (Signalhorn bei Linienverlust,
Truppen-Rufe). Die farbigen Leit-„Spines" an der Grabenwand sind verworfen
(AP5-05, §10) — bei Bedarf eine andere Wegführung. Callout-Grammatik
vereinfacht: „die Front" / „die Home-Line" / Himmelsrichtungen, **kein**
A/B/C mehr.

### Platzierungen sind klassen-gebunden — `BESCHLOSSEN`

Kein Bau-Raster für alle. Sandsäcke, Stacheldraht, MG-Stellung, Sprengladungen,
Granatwerfer-Ruf — an bestimmte Klassen gebunden, bezahlt aus der leichten
Einsatz-Währung. Verbrauchsmaterial, keine Bauökonomie. Schwerpunkt: Frontlinie
und die Zugänge zur Home-Line.

### Zuweisbare KI-Trupps — `BESCHLOSSEN`

Geschützbesatzungen bzw. kleine Trupps sind rufbar, der Frontlinie oder der
Home-Line zuweisbar. Sie halten die Stelle oder unterstützen die
Rückeroberung, während du woanders bist. In der Solo-Variante sichern
KI-Kameraden ohnehin mit.

---

## §4 Spielfigur, Klassen & Waffen

### Kader-Modell — `BESCHLOSSEN`
Du besitzt eine Kompanie benannter Soldaten. Jeder hat eine Klasse und eigenen
Fortschritt. Pro Einsatz wählst du einen Soldaten; das Loadout wird in der Lobby
festgelegt. Im Koop bringt jeder Spieler einen seiner Soldaten mit.

### Kein Permadeath — `BESCHLOSSEN`
Ein im Einsatz ausgeschalteter Soldat kehrt ins Quartier zurück. Verluste sind
eine Einsatz-Statistik, kein dauerhafter Verlust von Figur oder Fortschritt.

### Nation als leichter Trait — `BESCHLOSSEN`
Fiktionalisierte Nationen (mittlere Fiktionalisierung — erkennbar, welche reale
Nation gemeint ist, aber eigenes Vokabular). Nation ist eine Eigenschaft des
einzelnen Soldaten, **keine Klasse**: kleiner Passiv-Bonus, Waffen-Vertrautheit
(Handhabungs-Bonus mit den eigenen Nationswaffen, kein Gate), Uniform-Look. Die
Kompanie darf gemischt sein.

- **v1: zwei Nationen** — **Das Kaiserreich** (Deutsches Kaiserreich) und
  **Albion** (Großbritannien).
- **Der Feind** (Tag-Roster) ist **gesichtslos** — generische Uniformen, keine
  benannte Nation.

### Waffenmodell — `BESCHLOSSEN`
Voll ausgearbeitet in **[`WAFFEN.md`](WAFFEN.md)** (Modell, v1-Arsenal,
Vertrautheit, Nachlade-Arten, Munition, Perk-Stubs, WW1-Rohrecherche). Kurz:

- **Hybrid-Arsenal:** Klasse hat eine Waffenkategorie mit Bonus + Signatur.
  Off-Class tragbar, aber ohne Bonus. Zwei Bonus-Ebenen stapeln unabhängig:
  Klassen-Kategorie (stärker, inkl. Schaden) + Nations-Vertrautheit (schwächer,
  nur Handhabung).
- **Feel gemischt nach Waffe.** Gewehre hoher Schaden / langsam · MP schnell /
  schwach / wenig Munition · LMG Dauerfeuer / schwer.
- **Loadout minimal + implizites Gewicht:** Primär + Sekundär. Feste
  Munitionsreserve pro Waffe. Sekundär weglassen = +1 Perk-Slot. 1–2 Perk-Slots.
- **Wandwaffen** (Sturm-MP 18, Selbstlader, Fjodorow-Sturmgewehr) — nicht im
  Loadout, nur Fund/Kauf im Einsatz, feste Munition.
- **Benennung:** mittel fiktionalisiert.

| Kategorie | Charakter | Klassen-Bonus |
|---|---|---|
| Repetiergewehr | hoher Basisschaden, langsam, Ladestreifen | Schütze |
| Karabiner | Kompromiss, Hand frei für Werkzeug | Pionier / Sanitäter |
| Leichtes MG | Dauerfeuer, aufstellbar, schwer | MG-Schütze |
| Pistole / Revolver | Sekundärwaffe | universell |
| Maschinenpistole | schnelles Feuer, wenig Schaden/Munition, nah | Sturmtruppler *(Backlog)* |
| Grabenflinte | verheerend nah, sehr kurze Reichweite | Sturmtruppler *(Backlog)* |
| Flammenwerfer | Flächenverwehrung, kurz | Sturmtruppler *(Backlog, Spezial)* |

### Startaufstellung: 4 Klassen — `BESCHLOSSEN`
**Schütze, MG-Schütze, Pionier, Sanitäter** zum Start. **Sturmtruppler** wird
nachgeschoben (Backlog). Später denkbar: Scharfschütze, Artilleriebeobachter,
Melder.

Jede Klasse = **Signatur-Ausrüstung + 1 aktive Fähigkeit + 1 Passiv**, dazu
leichte Körper-Stat-Unterschiede (Tempo / HP / Ausdauer).

**Schütze** — Anker, Körper 100/100/100
- *Signatur:* Munitionsbeutel (aufstellbar, Trupp-Nachschub; direkt abgeben)
- *Aktiv:* Zielmarke — Ziel markieren, nimmt mehr Schaden aus allen Quellen,
  durch Rauch/Dunkelheit für den Trupp sichtbar. Eine gleichzeitig.
- *Passiv:* Kaltblütig — kein Flinch beim Zielen; Weakpoint-Treffer geben etwas
  Nachschub zurück

**MG-Schütze** — bewegliche Stellung, Körper langsamer 85 / zäher 115 / wenig Ausdauer
- *Signatur:* Aufstellbares MG auf dem Parapet — brutaler Frontalbogen, feste
  Schwenkung, überhitzt, wertlos flankiert. Von KI-Besatzung bemannbar. Eins gleichzeitig.
- *Aktiv:* Sperrfeuer — Unterdrückungssalve im Kegel, Gegner verlangsamt/ungenau/
  in Deckung gezwungen (Tag) bzw. gestaggert (Nacht), ohne Sichtlinie
- *Passiv:* Lastesel — geringere Tempo-Strafe mit schweren Waffen, schnelleres
  Umsetzen des MG

**Pionier** — trägt die Sektor-Schicht, Körper 95 Tempo / viel Ausdauer / −Explosionsschaden
- *Signatur:* Schanzzeug — Sandsäcke, Stacheldraht, Grabensteg, Reparatur
  (einzige Art, einen Abschnitt ohne Warten zu heilen), Sprengladung (Panzer-Antwort)
- *Aktiv:* Notverbau — sofort ein schwerer Sperrbau ohne Bauzeit, um eine Bresche
  jetzt zu stopfen
- *Passiv:* Baumeister — baut/repariert schneller & billiger, Platzierungen halten
  mehr aus

**Sanitäter** — Überlebensanker fürs Zeit-Finale, Körper 90 HP / viel Ausdauer / schwache Offensive (gewollt)
- *Signatur:* Sanitätstasche — Heilen über Zeit, schnellere Wiederbelebung,
  Stimulanz-Spritze (Sofortheilung + kurz Tempo/Stagger-Resistenz)
- *Aktiv:* Verbandsplatz — stationäre Zone: heilt langsam alle darin,
  Wiederbelebung auf Distanz / einmal Selbst-Wiederbelebung
- *Passiv:* Ruhige Hand — Wiederbelebte kurz schadensresistent; eigene HP
  regenerieren langsam außerhalb des Gefechts

**Bau-Schicht verteilt:** Pionier = schwerer Baumeister; die anderen je *eine*
Signatur-Platzierung. KI-Trupps/Besatzungen bleiben davon getrennt rufbar.

### Aktive Fähigkeit: Quest-Freischaltung — `BESCHLOSSEN`
Die aktive Fähigkeit startet **gesperrt**. Eine kurze klassenspezifische Aufgabe
(1–2 Schritte, modus-tauglich formuliert) schaltet sie frei; du meldest dich
dafür beim **Feldkommandeur** an der Home-Line (vorerst funktionaler Fixpunkt,
auch Entsatz-Rufer / Nachschub-Zugang).

- Nach der Freischaltung kostet jede Nutzung **Nachschub-Ladungen** (die
  Einsatz-Währung; „selten & stark").
- **Sicherheitsnetz:** Ist sie beim Start des Zeit-Finales noch nicht frei,
  aktiviert sie sich automatisch.
- Erst mal nur die einfache einmalige Freischaltung (gestuft → Backlog).

---

## §5 Der Feind

### Einsatz ist Tag ODER Nacht — `BESCHLOSSEN`
Kein Mischen innerhalb eines Einsatzes, kein „Tag speist Nacht"-Mechanismus.
Jede Einsatzart ist klar profiliert und kürzer.

### Reihenfolge: Nacht zuerst — `BESCHLOSSEN` (Design-Runde 2026-09-07)
Der Nacht-Modus (roamende Tote) wird zuerst gebaut — er ist näher am aktuellen
Stand (Nahkampf-Gegner) und die KI ist schrittweise ausbaubar. Der Tag-Modus
(Fernkampf-Soldaten, Deckungsgefecht) ist der größere KI-Sprung und folgt als
eigenes Arbeitspaket danach.

### Nacht — Die Toten stehen auf
Horde, Nahdruck, Umzingelung — kein Deckungsspiel. Drei Parteien: die Untoten
greifen auch feindliche Soldaten an. Chaos als Ventil, Grabenhorror als Ton.
First Person macht die Enge der Gräben nachts maximal.

**Roaming — `BESCHLOSSEN` (2026-09-07):** die Toten laufen **nicht** stur auf
die Linie oder den Spieler zu. Sie wandern durchs Niemandsland und Hinterland,
sammeln sich an Geräusch / Licht / Nähe und brechen dann los. Weniger „eine
Welle marschiert", mehr „die Gräben sind nie ganz leer". Das ist der Kern von
„Lebendigkeit" für den Nacht-Modus.

### Tag — Die feindliche Armee *(nach dem Nacht-Modus)*
Sie schießt zurück. Nutzt Granattrichter als Deckung, unterdrückt dich, hat
eigene MG-Trupps und Scharfschützen, kriechendes Sperrfeuer. Deckungsgefecht um
Feuerüberlegenheit — spähen ohne sich zu zeigen, Vorstoß in Sprüngen.

**Stand:** die aktuelle „Linieninfanterie" (AP2–AP5) kann nur Nahkampf —
Platzhalter für 1.0. Zielbild: **Schusswaffen / Fernkampf**, Nahkampf **nur auf
kurze Distanz**. Das ist ein eigenes Arbeitspaket nach der Nacht.

### Feind im Graben — `BESCHLOSSEN`
Gegner kommen übers offene Gelände UND kämpfen IM Grabensystem —
durchgebrochene Feinde infiltrieren die Gräben, Nahkampf um Ecken, Handgemenge.
Eine gefallene Frontlinie lässt den Feind durchs Hinterland und die
Reservegräben zur Home-Line fluten — der Druckvektor nach hinten.

### v1-Roster — `BESCHLOSSEN` (Zahlen offen)

**Tag (5) — dominant: die feindliche Armee**

| Gegner | Rolle | Konter |
|---|---|---|
| Linieninfanterie | Basis, Feuer & Bewegung, Deckung, infiltriert Gräben | jede Waffe (weich) |
| Sturmtrupp | schnell/nah, jagt MG-Nest & Platzierungen, CQB im Graben | Nahwaffen, Draht, Sperrfeuer, Sturmtruppler (weich) |
| MG-Trupp | stellt MG auf, unterdrückt, nagelt Abschnitt fest | Schütze + Zielmarke, Flanke, Artillerie-Ruf (weich) |
| Grabenräumer | gepanzert, drückt aufs Parapet um es aufzureißen | Spreng, Fokusfeuer, Flanke; langsam (weich) |
| **Panzer** *(Elite, selten)* | hohe HP, ignoriert Kleinkaliber weitgehend, zerwalzt Platzierungen | **Pionier Sprengladung / AT (hart)** |

**Nacht (5) — dominant: die Toten**

| Gegner | Rolle | Konter |
|---|---|---|
| Wiedergänger | langsamer Schlurfer, Masse | jede Waffe (weich) |
| Läufer | Sprinter, bricht den Horde-Rhythmus | Nahwaffen, Draht-Trichter (weich) |
| Grabengänger | krallt an Grabenwänden, reißt Breschen | vor der Wand töten; Pionier repariert (weich) |
| Heuler | ruft Tote herbei / macht sie rasend; deckt die „Offizier"-Rolle ab | Schütze Zielmarke + Fokus, Prioritätsziel (weich) |
| **Koloss** *(Elite, selten)* | Schadensschwamm, wirft Barrikaden um | **Pionier Sprengladung / AT (hart)** |

- **Konter-Härte:** normale Gegner weiche Konter (richtiges Werkzeug 2–3×
  besser, falsches funktioniert trotzdem), Elite-Gegner harte.
- **Gas / Sperrfeuer** = geteilte Umweltgefahr in beiden Modi (Abschnitt räumen,
  Masken-Perk).
- **Cross-Spawns:** einzelne artfremde Gegner (Zombies am Tag, Soldaten nachts)
  sickern zufällig und unangekündigt in Wellen ein.
- **Backlog:** Scharfschütze, Gasleiche, Kavallerie (Draht-Konter), Flieger
  (braucht eigene Flak-Antwort).

---

## §6 Einsatzstruktur

### Der Bogen eines Skirmish — `BESCHLOSSEN` (vereinfacht 2026-09-07)
Wellen zermürben die *endliche* Angriffskraft des Feindes. Über den Einsatz
wirst du in der Regel von der Frontlinie zurückgedrückt. Ist die Angriffskraft
gebrochen, folgt als Höhepunkt der **Zeit-Hold an der Home-Line** — „haltet die
Stellung, bis der Entsatz eintrifft". Danach die Entscheidung: sicher
extrahieren mit gesicherter Beute, oder freiwillig in eskalierende
Reserve-Wellen für mehr Beute weiterspielen.

**Eine Frontlinie, eine Home-Line** (Design-Runde 2026-09-07): keine Abschnitte
mehr. Die Frontlinie hält oder fällt als Ganzes; fällt sie, rückt der Feind vor
(§3) und die Uhr läuft schneller. Zurückerobern per **„Instand setzen"** (§3) —
eine exponierte Pionier-Interaktion an einem festen Punkt, jederzeit möglich,
aber teuer. Der Bogen ist damit nicht mehr streng einbahnig: Front fällt →
Hinterland-Kampf → entweder Front zurückerobern oder weiter auf die Home-Line
zurückfallen.

### Verlustbedingung — `BESCHLOSSEN`
Der Einsatz ist verloren, wenn die **Home-Line als Linie verloren** ist — oder
der gesamte Trupp ausgeschaltet ist (im Koop mit Wiederbelebungs-Fenster). Die
Frontlinie zu verlieren tut weh, beendet den Einsatz aber nicht.

### Einsatz-Kurve — `BESCHLOSSEN`
Du kommst mit deinem Loadout auf brauchbarer Stärke rein — nicht bei null wie in
Zombies. Im Einsatz rüstest du mit erbeutetem Material auf: bessere Wandwaffe,
Munitionstyp, Platzierungen, KI-Trupp. Spürbare Kurve über den Einsatz.

### Sektor — `BESCHLOSSEN`
Grundriss: §3 (weitläufiges verzweigtes Grabennetz, eine Frontlinie + eine
Home-Line). Handgebaut zuerst (ein Greybox-Sektor im neuen Stil), Generator als
eigenes späteres Paket (dann fürs ganze Netz). Skalierung mit der Spielerzahl
**primär über den Wave-Director** (Angriffsachsen, Gleichzeitigkeit, Gegnerzahl)
und über die Zahl gleichzeitig bedrohter Zugänge — **nicht** über breitere
Gräben oder immer längere Wege. Kurz — eine Belagerung, dann vorbei.

---

## §7 Hub & Fortschritt

### Kompanie-Quartier — `BESCHLOSSEN`
Dein Kader als kleine Gruppe Charaktere, die man ausrüstet und weiterentwickelt,
plus ein Aufenthaltsraum als sozialer Koop-Treffpunkt. Kein
Grand-Strategy-Kommandostand, keine reine persönliche Waffenkammer — die Mitte.

### Beute-Schleife — `BESCHLOSSEN`
Aus jedem Einsatz: Kompanie-Ressourcen (Quartier-Ausbau), Soldaten-XP (für den
eingesetzten Soldaten), gelegentlich Waffen- und Ausrüstungs-Freischaltungen.
Alles dauerhaft.

Dazu die Einsatz-Währung **Nachschub** — aus Abschüssen + gehaltenem Boden,
auffüllbar an Nachschubpunkten (Home-Line, eroberte Frontabschnitte). Zahlt
taktische Rufe: Fähigkeits-Ladungen, Platzierungen, KI-Trupps, Wandwaffen.
Ob eine oder zwei getrennte Währungen — später (§9). Bei Extraktion ist die
Beute gesichert; bei Niederlage ist der ungesicherte Teil verloren.

### Wo der Fortschritt liegt — `BESCHLOSSEN`
Vor allem dauerhaft im Hub. Der einzelne Einsatz ist im Kern ein Ressourcen-Run
für die Kompanie.

### „Krieg" — der lange Modus — `BESCHLOSSEN`
Zurückgestellt. Erst den Skirmish-Modus bauen, bis der Kern trägt, dann über die
übergeordnete Struktur entscheiden.

---

## §8 Ton

### Schematisch-ernst — `BESCHLOSSEN`
Reduzierte, kartenhafte Optik — Schlachtplan- und Feldpost-Ästhetik. Keine
Blut-Grafik, keine Zelebrierung von Gewalt. Die 3D-Umsetzung des Stils ist noch
offen (§9).

### Verluste sind sichtbar — `BESCHLOSSEN`
Als Zahl und Symbol, sachlich geführt. Anspannung real spürbar. Nachts kippt der
Ton in Grabenhorror — Angst und Enge statt Splatter.

---

## Kern-Schleife

```
01 Lobby        Soldat aus dem Kader wählen, Loadout einstellen
02 Einsatz      Nacht (zuerst) oder Tag, weitläufiges Grabennetz
                (Frontlinie → Hinterland → Home-Line)
03 Wellen       Endliche Angriffskraft zermürben, im Einsatz aufrüsten,
                fechtend zurückweichen — gefallene Linie ggf. „instand setzen"
04 Zeit-Finale  Home-Line halten, bis der Entsatz eintrifft
05 Entscheidung Sicher extrahieren — oder für mehr Beute verlängern
06 Quartier     Beute: Ressourcen · Soldaten-XP · Freischaltungen
                        ↳ zurück zu 01
```

---

## §9 Offene Punkte — nächste Ebene

Systemdesign. In grober Reihenfolge der Dringlichkeit.

1. **Tech-Stack & Architektur** — `BESCHLOSSEN`, siehe [`TECHNIK.md`](TECHNIK.md).
2. **Waffenmodell** — `BESCHLOSSEN`, ausgearbeitet in `WAFFEN.md` (v1-Arsenal,
   Nachlade-Arten, Vertrautheit). Offen: nur Zahlenbalance.
3. **Klassen** — `BESCHLOSSEN` im Rahmen (§4, vier Startklassen). Offen:
   Zahlenbalance, Nachschub-Kosten, die genauen Quest-Bedingungen je Klasse.
4. **Gegner-Roster & KI je Modus** — Roster `BESCHLOSSEN` (§5, 5+5 mit
   Konter-Karte), Reihenfolge **Nacht zuerst** (2026-09-07). Offen und
   dringend: **Roam-Verhalten der Toten** (nicht stur zur Linie/zum Spieler —
   wandern, sammeln, losbrechen), dann **Fernkampf-KI der Tag-Soldaten**
   (Deckung, Sichtlinien, Unterdrückung; heute nur Nahkampf-Platzhalter).
   Zahlenbalance nachgelagert.
5. **„Instand setzen" — Rückeroberungs-Mechanik** (§3, 2026-09-07): Prinzip
   `BESCHLOSSEN` (exponierte Pionier-Interaktion an einem festen Punkt, zieht
   Gegner an, jederzeit möglich aber teuer). Offen: Werkzeug/Fiktion, Dauer,
   ob es Nachschub kostet, ob KI-Trupps es übernehmen können.
6. **Prozedurale Sektor-Erzeugung** — Grundriss-Prinzip `BESCHLOSSEN` (§3,
   2026-09-07): weitläufiges verzweigtes Grabennetz, eine Frontlinie + eine
   Home-Line. Generator ist ein eigenes späteres Paket und darf dann das
   **ganze Netz** würfeln (authored Module + prozedurales Makrolayout,
   semantischer Nav-Graph, kein NavMesh) — **erst**, wenn ein handgebauter
   Referenzsektor im neuen Stil im Spieltest trägt.
7. **Einsatz-Währung Nachschub** — eine oder zwei getrennte Währungen;
   Verdienst-Raten, Kosten-Tabelle, Auffüll-Regeln.
8. **Onboarding / erste Stunde** — Wie sich „klein starten" konkret anfühlt: ein
   Soldat, eine Klasse, leichte Einsätze, dann Aufbau.
9. **Quartier-Ausbau** — Welche Räume, welche Upgrades, wie tief die Meta-Ebene
   reicht.
10. **Art- und Render-Stil in 3D** — Wie die Feldpost/Schlachtplan-Optik als
    stilisierte 3D-Umgebung aussieht (Platzhalter → Zielstil). Nacht-Atmosphäre
    (Licht, Dunst, Sicht) rückt durch „Nacht zuerst" nach vorn.
11. **„Krieg"-Modus** — Übergeordnete Struktur (Feldzugskarte, Dauerlauf,
    Kapitel) — später.

---

## §10 Verworfen — zur Nachverfolgung

- **Tower-Defense als Kern.** Türme bauen und aufwerten als Hauptverb — im Koop
  zu sperrig.
- **Klassischer TD-Zweitmodus** (Verteidigung einer Nachschublinie) — mit dem
  TD-Kern gestrichen.
- **Action-TD** (Orcs Must Die / Sanctum) — kurz erwogen, dann als „zu komisch
  im Koop" verworfen.
- **„Tag speist Nacht"** — Gefallene des Tages werden zu den Untoten der Nacht.
  Verworfen zugunsten reiner Tag-ODER-Nacht-Einsätze.
- **Permadeath** — verworfen wegen Zugänglichkeit und Koop.
- **Top-Down- / 3rd-Person-Kamera** — verworfen zugunsten First Person.
- **Einzelne Grabenlinie ohne Tiefe** — ersetzt durch einen Sektor mit Tiefe
  (Frontlinie → Hinterland → Home-Line).
- **Sektor als harter Korridor** — ersetzt durch offenes/verzweigtes Gelände;
  nur die Kartengrenzen sind gesperrt, umgangen wird die Home-Line trotzdem
  nicht.
- **Reine 2D-Version** — verworfen, da 3D „ziemlich sicher" ist; direkt 3D mit
  Platzhalter-Geometrie.
- **Einmalige Klassenwahl bei Spielstart** — ersetzt durch das Kader-Modell.
- **Kampagne als Startumfang** — zurückgestellt, erst Skirmish.
- **Kompaktes H als Grundriss** (durchgehende Front + zentraler
  Verbindungsgraben + Home-Line, klein gehalten) — verworfen in der
  Design-Runde 2026-09-07: im Spieltest zu statisch, zu klein, zu abstrakt.
  Ersetzt durch ein größeres, frei begehbares, verzweigtes Grabennetz (§3).
  Der zentrale Verbindungsgraben als benanntes Einzel-Feature entfällt (viele
  verbundene Wege).
- **Frontlinie in benannte Abschnitte (A/B/C) unterteilt** — verworfen
  2026-09-07: zu abstrakt, „welchen Abschnitt halte ich" trug nicht. Ersetzt
  durch **eine** durchgehende Frontlinie, die als Ganzes hält oder fällt. Die
  abschnittsweise Zustandsmaschine, die Uhr-Kopplung an Abschnitte und die
  Skalierung über die Abschnittszahl entfallen.
- **Generator nur fürs vordere Labyrinth** — der spätere Generator darf das
  ganze Grabennetz würfeln, nachdem ein handgebauter Referenzsektor im neuen
  Stil im Spieltest trägt (§3, §9.6).
- **Rückeroberung nur selten, in Wellenpausen, mit KI-Trupps** — ersetzt durch
  „Instand setzen": jederzeit möglich per exponierte Pionier-Interaktion an
  einem festen Punkt, aber jeder Versuch kostet echt (§3).
- **Farbige Leit-„Spines" an der Grabenwand** (Polylinie + Pfosten + Symbol als
  Wegweiser Front → Home) — verworfen (AP5-05): im Spieltest als verwirrende
  „Stricke" wahrgenommen, kein Wegweiser. Datenmodell bleibt für eine andere
  Darstellung.

---

## Verhältnis zum aktuellen Prototyp

Der frühere Prototyp liegt archiviert unter [`prototyp-td/`](prototyp-td/) und
ist ein reines **TD-Skelett** — entspricht **nicht mehr dem Konzept**. Bleibt
nur als Referenz für WW1-Gegner- und Waffenwerte sowie den Wellen-Loop.
