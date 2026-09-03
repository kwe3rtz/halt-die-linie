# Halt die Linie — Konzeptdokument

**Entwurf v0.2 · Stand 2. September 2026**

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
Soldaten deiner Kompanie in einen prozedural erzeugten **Frontsektor mit Tiefe**
und überstehst Wellen — **tagsüber** gegen die feindliche Armee, **nachts** gegen
die Toten des Niemandslands. Fällt die vordere Linie, ziehst du dich fechtend
zurück; die rückwärtige Linie ist die echte Verlustgrenze. Zwischen den
Einsätzen baust du das Kompanie-Quartier aus.

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

Ohne Türme ist der Graben trotzdem ein lebendiges Ziel: Die Linie hält oder
bricht abschnittsweise, und der Sektor hat Tiefe, in die man zurückweichen kann.
Grundriss in der Draufsicht: ein **H** — eine durchgehende Frontlinie oben, eine
durchgehende Home-Line unten, dazwischen ein zentraler Verbindungsgraben.

### Grundriss — `BESCHLOSSEN` (Design-Runde 2026-09-03)
Von der Feindseite nach hinten:

1. **Feindzone (nördlich)** — feindliche Gräben + zwei schräge Anmarsch-Korridore
   aus den vorderen Ecken. Der Feind spawnt hier (Tag). Für den Spieler nicht
   betretbar.
2. **Vorderes Grabenlabyrinth (Niemandsland)** — teils feindgehaltene
   Verzweigungsgräben zwischen den Anmarsch-Korridoren und der Frontlinie. Hier
   arbeitet sich der Tag-Feind an die Front heran, Nahkampf um Ecken. Trichter,
   versetzte Drahtfelder (kanalisieren, aber **keine** drei sauberen sichtbaren
   Gassen), ein großes Landmark (Panzerwrack o. Ä.). **Das ist der einzige Teil,
   den der spätere Generator würfelt** — der Rest ist handgebaut.
3. **Frontlinie** — *eine durchgehende* Grabenlinie über die volle Breite,
   unterteilt in benannte Abschnitte (A / B / C …). Feuertritt, Parapet, ein bis
   zwei Bresche-Punkte je Abschnitt, Bau-Slots, ein kleines Nachschubdepot je
   Abschnitt. Abschnitte fallen einzeln.
4. **Das offene Feld („die Wanne")** — offenes Trichtergelände zwischen Front und
   Home, beidseitig des Verbindungsgrabens. **Nicht** kanalisiert: fällt die
   Front, queren Gegner offenes Gelände Richtung Home-Line, unter Feuer von
   Front *und* Home. Links und rechts hart gesperrt (Kartengrenze: Sumpf,
   zerbombtes Gelände) — Weite ja, Umgehen der Home-Line nein.
5. **Verbindungsgraben** — zentral, die *gedeckte* Route zwischen Home und Front.
   Enge, ein paar Knicke mit kleinen defensiven Nischen, evtl. eine Sprengbarriere
   als Rückzugs-Notbremse. Eine Route von mehreren, nicht die einzige.
6. **Home-Line** — durchgehende rückwärtige Linie über die volle Breite, startet
   befestigt, begehbare Unterstände (Munitionslager, Verbandsplatz,
   Feldkommandeur). Zugänge: der Verbindungsgraben **und** das offene Feld
   beidseitig. Die echte Verlustgrenze.

### Die „Uhr" — warum die Front halten — `BESCHLOSSEN`
Die endliche Angriffskraft des Feindes (§6) wird dort zermürbt, wo der Trupp
hält. Die Front zu halten heißt: mehr Feindverluste pro Welle, bevor der Feind
die Home-Line erreicht — also Zeitgewinn bis zum Zeit-Finale. Fällt ein
Frontabschnitt, wird der Weg des Feindes nach hinten kürzer und die Uhr läuft
schneller; zusätzlich ist das Nachschubdepot des Abschnitts weg und die
Vorwarnzeit kürzer. Rückzug ist also eine echte Abwägung, kein reiner Verlust.

### Maßstab kompakt halten — `RICHTUNG`
Externes Sparring (alle drei KIs) + Planer: in First Person wirken Strecken
doppelt so lang. Frontbreite, Verbindungsgraben und das offene Feld bleiben
**kompakt** — der freie Rückweg Front → Home soll wenige Sekunden dauern; lang
wird der Rückzug, weil der Feind ihn verlängert, nicht weil der Weg weit ist.
Konkrete Maße stehen in den AP4-Tickets, nicht hier (Greybox-Startwerte,
im Spieltest justiert).

### Handgebaut zuerst, Generator später — `BESCHLOSSEN`
Erst ein **einziger, komplett handgebauter Greybox-Sektor** (das H), um den
Kern-Bogen — Front halten → Abschnitt verlieren → geordnet zurückfallen →
Home-Line halten — überhaupt zu beweisen. Aus modularen Rasterbausteinen gebaut,
damit derselbe Baukasten später der Generator nutzt. Die prozedurale Erzeugung
ist ein **eigenes späteres Arbeitspaket** und betrifft nur das vordere
Grabenlabyrinth (§9.5).

### Parapet als lebendiges Ziel — `BESCHLOSSEN`
Grabenwände haben Struktur. Gegner reißen an einzelnen Abschnitten Löcher; durch
eine Bresche strömt der Feind. Der Trupp muss die Lücke physisch stopfen oder
den Abschnitt aufgeben.

### Fechtender Rückzug, Boden wechselt — `BESCHLOSSEN`
Frontabschnitte durchlaufen `stabil → bedrängt → gebrochen → verloren`. Ein
verlorener Abschnitt öffnet dem Feind den Weg nach hinten (durch den Abschnitt
Richtung offenes Feld / Verbindungsgraben) — Gegner **materialisieren nie im
Sichtfeld**, Verstärkung kommt aus verdeckten Bereichen / hinter Rauch.
„Zurückziehen" ist eine Entscheidung des Spielers, kein Skript. Rückeroberung ist
möglich, aber **selten und teuer** (in Wellenpausen, mit KI-Trupps) — kein
ständiges Hin- und Hercapturen.

### Lesbarkeit im First-Person-Graben — `BESCHLOSSEN`
Keine Minikarte als Krücke für verwirrendes Layout. In dieser Reihenfolge:
klar unterschiedliche **Silhouetten** der Zonen (Front weit/flach, Labyrinth
eng, Home hoch/befestigt) · ein durchgehender **„Spine"** an der Grabenwand
(Kommunikationskabel + Pfosten) von jedem Frontabschnitt zur Home-Line, **redundant
codiert** (Farbe + geometrisches Symbol) · nummerierte Frontabschnitte auf
Schildern · **Kompass** im HUD mit „HOME"-Marker und Markern nur für strategische
Zustände (Abschnitt bedrängt / gebrochen) · eine **Lagekarte** an der Home-Line.
Dazu **direktionales Audio** als Pflicht — Signalhorn aus Richtung Home-Line beim
Abschnittsverlust, Truppen-Rufe. Eine feste Callout-Grammatik von Anfang an
(Front A/B/C, Route Verbindungsgraben / Feld links / Feld rechts).

### Platzierungen sind klassen-gebunden — `BESCHLOSSEN`
Kein Bau-Raster für alle. Sandsäcke, Stacheldraht, MG-Stellung, Sprengladungen,
Granatwerfer-Ruf — jeweils an bestimmte Klassen gebunden, bezahlt aus der
leichten Einsatz-Währung. Verbrauchsmaterial, keine Bauökonomie. Schwerpunkt:
Frontlinie und Verbindungsgraben.

### Zuweisbare KI-Trupps — `BESCHLOSSEN`
Geschützbesatzungen bzw. kleine Trupps sind rufbar und einem Abschnitt
zuweisbar. Sie halten die Stelle oder erobern zurück, während du woanders bist.
In der Solo-Variante sichern KI-Kameraden ohnehin die Linie mit.

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

### Tag — Die feindliche Armee
Sie schießt zurück. Nutzt Granattrichter als Deckung, unterdrückt dich, hat
eigene MG-Trupps und Scharfschützen, kriechendes Sperrfeuer. Deckungsgefecht um
Feuerüberlegenheit — spähen ohne sich zu zeigen, Vorstoß in Sprüngen.

### Nacht — Die Toten stehen auf
Horde, Nahdruck, Umzingelung — kein Deckungsspiel mehr. Drei Parteien: die
Untoten greifen auch die feindlichen Soldaten an. Chaos als Ventil, Grabenhorror
als Ton. First Person macht die Enge im Verbindungsgraben nachts maximal.

### Feind im Graben — `BESCHLOSSEN`
Gegner kommen übers offene Feld UND kämpfen IM Grabensystem — durchgebrochene
Soldaten infiltrieren die Gräben, Nahkampf um Ecken im Verbindungsgraben,
Handgemenge. Das prägt das Tag-Gefecht mit, nicht nur Fernkampf übers Feld. Ein
durchbrochener Frontabschnitt lässt den Feind den Verbindungsgraben hinab zur
Home-Line fluten — der Druckvektor nach hinten.

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

### Der Bogen eines Skirmish — `BESCHLOSSEN`
Wellen zermürben die *endliche* Angriffskraft des Feindes. Über den Einsatz wirst
du in der Regel von der Frontlinie zurückgedrückt und komprimiert. Ist die
Angriffskraft gebrochen, folgt als Höhepunkt der **Zeit-Hold an der Home-Line** —
„haltet die Stellung, bis der Entsatz eintrifft".

Danach die Entscheidung: sicher extrahieren mit gesicherter Beute, oder
freiwillig in eskalierende Reserve-Wellen für mehr Beute weiterspielen.

### Verlustbedingung — `BESCHLOSSEN`
Der Einsatz ist verloren, wenn die **Home-Line komplett überrannt** ist (eigene
Abschnitte + Struktur, alle gebrochen) — oder der gesamte Trupp ausgeschaltet
ist (im Koop mit Wiederbelebungs-Fenster). Frontlinie und Verbindungsgraben zu
verlieren tut weh, beendet den Einsatz aber nicht.

### Einsatz-Kurve — `BESCHLOSSEN`
Du kommst mit deinem Loadout auf brauchbarer Stärke rein — nicht bei null wie in
Zombies. Im Einsatz rüstest du mit erbeutetem Material auf: bessere Wandwaffe,
Munitionstyp, Platzierungen, KI-Trupp. Spürbare Kurve über den Einsatz.

### Sektor — `BESCHLOSSEN`
Grundriss + Zonen: §3. Handgebaut zuerst (ein Greybox-Sektor), Generator als
eigenes späteres Paket und nur für das vordere Grabenlabyrinth. Skalierung mit
der Spielerzahl über die **Anzahl gleichzeitig aktiver Frontabschnitte** (solo
~2, bei 4 Spielern ~4) und primär über den Wave-Director (Angriffsachsen,
Gleichzeitigkeit, Gegnerzahl) — **nicht** über breitere Gräben oder immer längere
Wege. Verbindungsgraben + Home-Line bleiben. Kurz — eine Belagerung, dann vorbei.

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
02 Einsatz      Tag oder Nacht, dreistufiger Sektor (Front → Feld → Home-Line)
03 Wellen       Endliche Angriffskraft zermürben, im Einsatz aufrüsten,
                fechtend von der Frontlinie zurückweichen
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
4. **Gegner-Roster je Modus** — `BESCHLOSSEN` (§5, 5+5 mit Konter-Karte). Offen:
   Zahlenbalance, KI-Verhalten (Feuer & Bewegung, Infiltration, Horde-Pathing).
5. **Prozedurale Sektor-Erzeugung** — Grundriss + Lesbarkeit `BESCHLOSSEN`
   (§3, Design-Runde 2026-09-03): das H handgebaut, Generator ein eigenes
   späteres Paket und nur für das vordere Grabenlabyrinth (authored Module +
   prozedurales Makrolayout, semantischer Nav-Graph, kein NavMesh). Offen: das
   konkrete Erzeugungsverfahren fürs Labyrinth — erst nachdem der handgebaute
   Kern-Bogen im Spieltest trägt (AP4).
6. **Einsatz-Währung Nachschub** — eine oder zwei getrennte Währungen;
   Verdienst-Raten, Kosten-Tabelle, Auffüll-Regeln.
7. **Onboarding / erste Stunde** — Wie sich „klein starten" konkret anfühlt: ein
   Soldat, eine Klasse, leichte Tag-Einsätze, dann Aufbau.
8. **Quartier-Ausbau** — Welche Räume, welche Upgrades, wie tief die Meta-Ebene
   reicht.
9. **Art- und Render-Stil in 3D** — Wie die Feldpost/Schlachtplan-Optik als
   stilisierte 3D-Umgebung aussieht (Platzhalter → Zielstil).
10. **„Krieg"-Modus** — Übergeordnete Struktur (Feldzugskarte, Dauerlauf,
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
- **Einzelne Grabenlinie ohne Tiefe** — ersetzt durch den dreistufigen Sektor
  (Frontlinie / Verbindungsgraben / Home-Line).
- **Sektor als harter Korridor** (Zugang zur Home-Line praktisch nur über den
  Verbindungsgraben, Flanken komplett gesperrt) — ersetzt durch das offene Feld
  zwischen Front und Home (§3); nur die Kartengrenzen sind gesperrt, umgangen
  wird die Home-Line trotzdem nicht.
- **Sektor pro Einsatz vollprozedural** — ersetzt durch handgebautes H +
  späterer Generator nur fürs vordere Labyrinth (§3, §9.5).
- **Reine 2D-Version** — verworfen, da 3D „ziemlich sicher" ist; direkt 3D mit
  Platzhalter-Geometrie.
- **Einmalige Klassenwahl bei Spielstart** — ersetzt durch das Kader-Modell.
- **Kampagne als Startumfang** — zurückgestellt, erst Skirmish.

---

## Verhältnis zum aktuellen Prototyp

Der frühere Prototyp liegt archiviert unter [`prototyp-td/`](prototyp-td/) und
ist ein reines **TD-Skelett** — entspricht **nicht mehr dem Konzept**. Bleibt
nur als Referenz für WW1-Gegner- und Waffenwerte sowie den Wellen-Loop.
