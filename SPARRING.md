# Halt die Linie — Sparring-Briefing für externe KI

**Zweck:** Dieses Dokument an eine KI geben (ChatGPT, Claude, Gemini, …), die
**keinen** Zugriff aufs Repo hat. Hier steht alles Nötige, um über das Spiel zu
diskutieren. Es ist bewusst redundant zu den internen Projektdoks.

---

## Deine Rolle

Sei mein **Sparringspartner**. Ich baue ein Spiel und will laut mitdenken:

- Denk kritisch mit, nicht bestätigend. Wo ist das Konzept schwach, wo droht
  Scope-Creep, wo widersprechen sich Ziele?
- Zeig **Alternativen** auf — „wie hättest du das gemacht", mit den Trade-offs.
- Sei konkret. Keine Allgemeinplätze, sondern nennbare Mechaniken, Systeme,
  Referenzspiele, Reihenfolgen.
- Wenn du eine Empfehlung gibst, sag *warum* und was sie kostet.
- Es ist ok, wenn du mir widersprichst.

Ich befrage mehrere KIs parallel und vergleiche die Antworten. Antworte so, dass
ich deine Position gut gegen andere abwägen kann.

---

## Das Spiel in Kürze

**Halt die Linie** — First-Person-Koop-Wave-Survival-Shooter im Grabenkrieg des
Ersten Weltkriegs. Browsergame. Solo dauerhaft spielbar, **Koop ist das
Fernziel** (noch kein Netcode).

> Du führst einen Soldaten deiner Kompanie in einen Frontsektor und überstehst
> Wellen — **tagsüber** gegen die feindliche Armee (schießt zurück, nutzt
> Deckung), **nachts** gegen die Toten des Niemandslands (Horde). Fällt die
> vordere Grabenlinie, ziehst du dich fechtend zurück; die rückwärtige Linie
> ist die echte Verlustgrenze. Zwischen den Einsätzen baust du ein
> Kompanie-Quartier aus.

**Kern-Schleife:** Lobby (Soldat + Loadout) → Einsatz (Tag oder Nacht,
prozeduraler Sektor) → Wellen zermürben die endliche Angriffskraft des Feindes →
Zeit-Hold-Finale an der rückwärtigen Linie → sicher extrahieren oder für mehr
Beute verlängern → Quartier (Ressourcen, Soldaten-XP, Freischaltungen) → zurück.

**Struktur des Sektors (Verteidigung in der Tiefe, historisch):**
Frontlinie → Verbindungsgraben (Engstellen) → Home-Line (vorbefestigt).
Frontabschnitte fallen einzeln und sind (teuer) rückeroberbar. Verlust = Home-
Line komplett überrannt oder Trupp ausgeschaltet.

**Klassen (4 zum Start):** Schütze (Allrounder), MG-Schütze (aufstellbares MG,
bewegliche Stellung), Pionier (repariert Grabenwände, Draht/Sandsäcke, Spreng),
Sanitäter (Wiederbelebung, Verbandsplatz). Jede: Signatur-Ausrüstung + 1 aktive
Fähigkeit (per In-Mission-Quest freischalten) + 1 Passiv + leichte Körper-Stats.
Sturmtruppler ist die 5. Klasse (Backlog).

**Waffen:** Hybrid-Arsenal — jede Klasse hat eine Waffenkategorie mit Bonus +
Signatur; Off-Class tragbar ohne Bonus. Zwei Bonus-Ebenen (Klassen-Kategorie
stärker inkl. Schaden; Nations-Vertrautheit schwächer, nur Handhabung). Minimal-
Loadout (Primär + Sekundär), implizite Munitionslast. Waffen leicht
fiktionalisiert (Langgewehr M98, Enfeld-Kurzgewehr, Lewin-MG, …). „Wandwaffen"
(MP 18, Selbstlader, Fjodorow-Sturmgewehr) nur im Einsatz zu finden.

**Nationen:** fiktionalisiert, erkennbar (v1: „Das Kaiserreich", „Albion").
Nation = leichter Soldaten-Trait, keine Klasse. Feind ist gesichtslos.

**Gegner-Roster v1:** 5 Tag (Linieninfanterie, Sturmtrupp, MG-Trupp,
Grabenräumer, Panzer[Elite]) + 5 Nacht (Wiedergänger, Läufer, Grabengänger,
Heuler, Koloss[Elite]). Konter „gemischt": normale Gegner weiche Konter,
Elite-Gegner harte (Panzer/Koloss brauchen Spreng/AT). Gas/Sperrfeuer als
geteilte Umweltgefahr.

**Ton:** schematisch-ernst, Schlachtplan-/Feldpost-Ästhetik, keine Blut-Grafik.
Verluste sachlich sichtbar. Nachts Grabenhorror (Angst/Enge statt Splatter).

---

## Aktueller Stand (Code)

Zwei Arbeitspakete gebaut:

- **AP1 — Fundament:** Vite + TypeScript + Babylon.js (3D, First Person).
  Headless Simulation strikt getrennt vom Rendering. Fester 60-Hz-Timestep mit
  Interpolation. Input-Layer → serialisierbares Kommando-Objekt. Kapsel-gegen-
  AABB-Kollision. Datenschema-Stubs. Debug-Overlay (F3). CI + GitHub-Pages-
  Preview.
- **AP2 — Erster Kampf-Loop:** Hitscan-Waffe (Kadenz, Magazin/Reserve,
  Nachladen je Nachlade-Art), Spieler-HP/Tod/Respawn, **ein** Gegnertyp
  (Linieninfanterie, gerader Anmarsch + Nahkampf, kein Pathing), Wave-Director
  (Phasen, gestaffelte Spawns, endliche Angriffskraft), minimales HTML-HUD,
  Golden-/Replay-Test fürs Sim.

**Spielbar gerade:** auf einem Boxen-Test-Graben herumlaufen, schießen, Wellen
von langsamer Nahkampf-Infanterie abwehren, HUD zeigt HP/Munition/Welle/
Nachschub.

**Noch nicht:** echte Map / prozedurale Erzeugung · Gegner-Vielfalt · Tag/Nacht ·
der dreistufige Sektor + Rückzugslogik · Klassen + Fähigkeiten · Bauen/
Platzierungen · Nachschub ausgeben · Nachschub-Ökonomie · Quartier · Art (alles
Boxen/Kapseln) · Sound · Netcode.

---

## Tech-Stack & Architektur-Prinzipien

| | |
|---|---|
| Sprache | TypeScript (strict) |
| Build | Vite |
| Renderer | **Babylon.js** (`@babylonjs/core`) — 3D, First Person ab Tag eins, Platzhalter-Boxen |
| UI | HTML/CSS-Overlay über dem Canvas (kein Babylon-GUI) |
| Tests | Vitest; CI (GitHub Actions) prüft typecheck/lint/format/test/build je Push; Pages-Preview |
| Desktop später | dieselbe Web-App via Tauri/Electron gewickelt — kein Rewrite |

**Die goldene Regel:** `src/sim/**` ist eine **headless Simulation** — kein
Babylon, kein `window`/`document`/`Math.random`; alles wird übergeben
(Kommandos, Seed, `dt`). Der Renderer liest den Sim-State und zeichnet, fasst
Spiellogik nie an. Grund: das Sim-Modul soll später unverändert vom Client auf
einen autoritativen Node-Server für Koop wandern (State-Replikation, **kein**
Lockstep — Determinismus ist daher keine harte Anforderung).

**Physik:** eigene simple Kollision (Kapseln, Raycasts, AABB) in der Sim; eine
Physik-Engine (Havok) höchstens später für rein kosmetische Client-Effekte
(Trümmer, Ragdolls).

**Warum nicht Unity/Godot/C++:** Browser-first + Koop-Netcode + KI-gestützte
Entwicklung sprechen für eine schlanke TS-Codebasis mit einer Renderer-
Bibliothek statt einer Editor-Engine. Grafisch anspruchslos (schematischer
Stil), daher kein nativer Renderer nötig.

---

## Bewusst entschieden — bitte nicht neu aufrollen

- **Kein Tower-Defense.** War die Ursprungsidee, verworfen (im Koop zu sperrig).
- **First Person**, nicht Top-Down/3rd-Person.
- **3D von Anfang an** (keine 2D-Zwischenstufe).
- **Einsatz ist Tag ODER Nacht**, kein Mischen innerhalb eines Einsatzes; kein
  „Tag speist Nacht".
- **Kein Permadeath** für Soldaten.
- **Kader-Modell** (Kompanie benannter Soldaten, pro Einsatz einen wählen),
  nicht eine Einmalwahl.
- **„Krieg"-Modus** (langer Modus über mehrere Skirmishes) zurückgestellt, erst
  der Skirmish-Kern.
- Waffennamen **leicht fiktionalisiert**, Nationen fiktionalisiert.

---

## Themen, über die ich diskutieren will

Nimm dir raus, was dich reizt — oder frag, wo du mehr Kontext brauchst.

### Design / Gameplay

1. **Die Map / der Sektor.** Wie baut man einen First-Person-lesbaren
   Grabensektor mit Tiefe (Frontlinie / Verbindungsgraben / Home-Line)?
   Vollprozedural vs. handgebaute Grabenstücke modular zusammensetzen? Wie
   verhindert man Desorientierung (Schilder, Kompass, Minikarte)? Wie skaliert
   die Breite mit der Spielerzahl?
2. **Gegner-Vielfalt & KI.** Aktuell nur ein langsamer Nahkämpfer. Geplant:
   Bajonett-Charger (rennt gezielt), Anschleicher, MG-Trupp (unterdrückt),
   Grabenräumer (reißt Parapet auf), Sturmtrupp (jagt Platzierungen). Wie viel
   KI-Tiefe ist nötig, wie wenig genügt? Pathing ja/nein bei einem Graben-
   Sektor?
3. **Der Rückzugs-Loop.** „Fechtender Rückzug" von der Front zur Home-Line, Boden
   wechselt Besitzer, rückeroberbar. Wie macht man das lesbar und spannend statt
   frustig?
4. **Die aktive Fähigkeit per In-Mission-Quest freischalten** (beim Feld-
   kommandeur an der Home-Line melden). Trägt das? Alternativen?
5. **Nachschub-Ökonomie.** Eine Währung für alles (Fähigkeiten, Platzierungen,
   KI-Trupps, Wandwaffen) oder zwei getrennte? Wie verhindert man, dass die
   Entscheidungen flach werden?
6. **Onboarding.** „Klein starten" (ein Soldat, eine Klasse, leichte Tag-
   Einsätze) → wie fühlt sich die erste Stunde konkret an?
7. **Koop-Design.** Wie stellen 4 Rollen echtes Zusammenspiel sicher, ohne dass
   Solo darunter leidet?

### Technik

8. **Prozedurale Erzeugung eines 3D-Grabensektors** — Verfahren, Bausteine,
   Balance-Kontrolle, Kollisions-/Navigations-Daten aus einer Quelle.
9. **Koop-Netcode** — server-autoritativ + State-Replikation für einen Wave-
   Shooter mit ~50 Entities. Tick-Rate, Interpolation, Client-Prediction wie
   weit? Node-Server-Setup.
10. **Rendering-Skalierung** — viele Gegner (Nacht-Horde) in Babylon.js:
    Instancing, Thin Instances, LOD, Culling. Wo sind die Grenzen im Browser?
11. **Bundle-Größe** — Babylon `@babylonjs/core` bringt ~1,5 MB gzip. Wie klein
    bekommt man das, lohnt Code-Splitting?
12. **Art-Pipeline** für den schematischen Stil — flat-shaded / low-poly,
    gedämpfte Kartenpalette. glTF, Texture-Atlas, KTX2. Wie viel kann man mit
    Shadern statt Assets machen?

### Backlog / Priorisierung

13. Was von der geplanten Feature-Liste ist **überflüssig**? Was fehlt?
14. In welcher **Reihenfolge** würdest du nach dem jetzigen Stand weiterbauen?
15. Wo lauert der größte **Risiko-Klumpen** (das, was das Projekt kippen kann)?

---

## Wie ich mir die Antwort wünsche

- Pro Thema: kurze Einordnung → 2-3 Optionen mit Trade-offs → deine Empfehlung
  mit Begründung.
- Referenzspiele nennen, wo sie helfen (und sagen, *was* genau man von ihnen
  lernt).
- Wenn du etwas für eine schlechte Idee hältst: sag es direkt.
- Am Ende: die aus deiner Sicht **3 wichtigsten nächsten Schritte**.
