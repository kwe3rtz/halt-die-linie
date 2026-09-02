# Halt die Linie — Waffen

**Stand 2. September 2026.** Ergänzt [`KONZEPT.md`](KONZEPT.md) §4. Legt das
Waffenmodell und das v1-Arsenal fest. Zahlen sind Platzhalter für den Spieltest.

Rohrecherche (echte WW1-Waffen aller Nationen) am Ende als Anhang.

---

## Modell (aus KONZEPT.md §4)

- **Hybrid-Arsenal.** Jede Klasse hat eine Waffenkategorie mit Bonus + ihre
  Signatur-Ausrüstung. Off-Class-Waffen tragbar, aber ohne Klassen-Bonus.
- **Feel gemischt nach Waffe.** Gewehre hoher Schaden / langsam. MP schnell /
  schwach / wenig Munition. LMG Dauerfeuer / schwer.
- **Loadout minimal:** Primär + Sekundär. Sekundär leer lassen = +1 Perk-Slot.
  Wurfwaffen sind eine eigene Ressource, Nahkampf ist immer dabei. 1–2 Perk-Slots.
- **Implizites Gewicht:** jede Waffe bringt eine feste, begrenzte
  Reservemunition mit. Kein Gewichts-Zahlenwert.
- **Benennung:** mittel fiktionalisiert — erkennbar, aber eigenes Vokabular.

### Zwei Bonus-Ebenen (stapeln unabhängig)

| Ebene | Gilt für | Effekt (Platzhalter) |
|---|---|---|
| **Klassen-Kategorie-Bonus** (stärker) | Waffen der Bonus-Kategorie deiner Klasse | +Schaden (klein), +Reservemunition, schnelleres Nachladen, weniger Rückstoß |
| **Nations-Vertrautheit** (schwächer) | Waffen deiner Nation | −15% Nachladezeit, −15% ADS-Zeit, −10% Streuung/Rückstoß. **Kein** Schaden |

Beispiel: Ein Albion-MG-Schütze mit dem **Lewin-MG** bekommt beide Boni. Mit dem
**MG 15** (Kaiserreich) nur den Klassen-Bonus. Mit einem Gewehr keinen von beiden.

---

## Nationen (v1: zwei)

| Nation | Reales Vorbild | Soldaten | Doktrin-Textur |
|---|---|---|---|
| **Das Kaiserreich** | Deutsches Kaiserreich | „Kaiserliche" | wuchtig, methodisch, bestes Dauerfeuer-MG |
| **Albion** | Großbritannien | „Albioner" | schnelles Gewehrfeuer, Mobilität, Trommel-LMG |

**Der Feind** (Tag-Roster) ist **gesichtslos** — generische feldgraue/khaki
Uniformen ohne Abzeichen, keine benannte Nation.

Dritte Nation (slawisch / „Zarenreich") → Backlog.

---

## v1-Arsenal

### Primär — Repetiergewehr · Klassen-Bonus: Schütze

| Waffe | Nation | Feuerart | Schuss | Nachladen | Profil |
|---|---|---|---|---|---|
| **Langgewehr M98** | Kaiserreich | Repetierer | 5 | Ladestreifen (5) | Höchster Basisschaden, langsamer Kammerstängel, sehr präzise, lange Reichweite. Die Referenzwaffe. |
| **Enfeld-Kurzgewehr Mk III** | Albion | Repetierer | 10 | Ladestreifen (2×5) | Etwas weniger Schaden, deutlich schnellerer Repetiervorgang, schnelleres Nachsetzen. |

### Primär — Karabiner · Klassen-Bonus: Pionier, Sanitäter

| Waffe | Nation | Feuerart | Schuss | Nachladen | Profil |
|---|---|---|---|---|---|
| **Karabiner M98** | neutral | Repetierer | 5 | Ladestreifen (5) | Kürzer, handlicher, schnelleres Ziehen/Zielen, weniger Schaden & Reichweite als das Langgewehr. Hand frei fürs Werkzeug. |

### Primär — Leichtes MG · Klassen-Bonus: MG-Schütze

| Waffe | Nation | Feuerart | Schuss | Nachladen | Profil |
|---|---|---|---|---|---|
| **Lewin-MG** | Albion | Vollauto | 47 (Trommel) | Trommel | Obenliegende Trommel, schnelleres Handling, kurze Anlaufzeit, gute Dauergenauigkeit. |
| **MG 15** | Kaiserreich | Vollauto | 100 (Gurt) | Gurt | Mehr Schaden/Schuss, sehr schwer (hohe Tempo-Strafe), langsames Nachladen. Am besten aufgestellt. |

### Sekundär — Pistole / Revolver · universell

| Waffe | Nation | Feuerart | Schuss | Nachladen | Profil |
|---|---|---|---|---|---|
| **P08** | Kaiserreich | Halbauto | 8 | Magazin | Schnelles Nachladen, zuverlässig. |
| **Webbley-Revolver Mk VI** | Albion | Halbauto (DA) | 6 | Revolver (einzeln, oder Schnelllader-Perk) | Höherer Schaden pro Schuss, langsameres Nachladen. |

### Wurfwaffen · eigene Ressource (2–3 pro Einsatz, an Nachschubpunkten auffüllen)

| Waffe | Nation | Profil |
|---|---|---|
| **Stielgranate** | Kaiserreich | Große Wurfweite, Zeitzünder, Druckwelle. |
| **Splittergranate** | Albion | Kürzere Wurfweite, Splitterwirkung (stärker gegen weiche Ziele), man trägt mehr. |
| **Gasgranate** | neutral | Erzeugt eine Giftwolke — Zonenkontrolle, Konter gegen dichte Horde. Ohne Maske Selbstgefährdung. |

### Nahkampf · universell, immer dabei

| Waffe | Profil |
|---|---|
| **Grabendolch** | Schneller Nahkampf, Stich von hinten = hoher Schaden. |

Grabenkeule / geschärfter Spaten → mit dem Sturmtruppler (Backlog).

### Wandwaffen · nicht im Loadout wählbar

Nur **Fund oder Kauf mit Nachschub im Einsatz.** Feste Startmunition, **kein
laufender Nachschub** (oder nur an einem seltenen Depot). Ein Schub Macht, kein
dauerhafter Ersatz — die exotische WW1-Tech.

| Waffe | Feuerart | Schuss | Profil |
|---|---|---|---|
| **Sturm-MP 18** | Vollauto | 32 (Schneckentrommel) | Schnelles Feuer, wenig Schaden, kurze Reichweite, hoher Rückstoß. Der Grabenräumer. |
| **Maser-Selbstlader M16** | Halbauto | 10 | Halbautomatisches Gewehr, gewehrnaher Schaden, schnelles Nachsetzen. Selten. |
| **Fjodorow-Sturmgewehr M16** | Vollauto | 25 | Kontrollierbarer Vollautomat, 6,5 mm. Bester Allrounder, sehr selten. „Beute-Prototyp", keine Nation. Die Wunder-Tech. |

---

## Vertrautheit je Nation

| Nation | Vertraute Waffen |
|---|---|
| **Kaiserreich** | Langgewehr M98 · MG 15 · P08 · Stielgranate |
| **Albion** | Enfeld-Kurzgewehr Mk III · Lewin-MG · Webbley Mk VI · Splittergranate |
| **neutral** (kein Bonus für irgendwen) | Karabiner M98 · Gasgranate · Grabendolch · alle Wandwaffen |

Nicht-vertraute Waffen sind voll nutzbar — nur ohne den Handhabungs-Bonus.

---

## Nachlade-Arten (KONZEPT.md §9 „Nachlade-Handling")

| Art | Verhalten | Waffen |
|---|---|---|
| `ladestreifen` | Streifen à 5, teilweises Nachladen möglich (Streifen für Streifen), langsam pro Streifen, unterbrechbar | Langgewehr M98, Enfeld (2 Streifen), Karabiner M98 |
| `magazin` | kompletter Wechsel, **Restmunition im alten Magazin verfällt** | Sturm-MP 18, Maser-Selbstlader, Fjodorow, P08 |
| `trommel` | wie Magazin, aber sehr langsam | Lewin-MG |
| `gurt` | MG-Gurt, sehr langsam, am besten in Deckung | MG 15 |
| `revolver` | 6 einzeln, oder alle mit Schnelllader-Perk | Webbley Mk VI |
| `einzeln` | Schuss für Schuss, jederzeit unterbrechbar | Grabenflinte (Backlog) |

---

## Munition & Auffüllen (Platzhalter-Zahlen)

| Waffe | Geladen + Reserve | Auffüllen |
|---|---|---|
| Langgewehr M98 | 5 + 45 | Nachschubpunkt, Munitionsbeutel (Schütze), Feldkommandeur |
| Enfeld Mk III | 10 + 50 | ″ |
| Karabiner M98 | 5 + 40 | ″ |
| Lewin-MG | 47 + 141 | Nachschubpunkt, Feldkommandeur |
| MG 15 | 100 + 200 | ″ |
| P08 | 8 + 40 | jeder Nachschubpunkt |
| Webbley Mk VI | 6 + 30 | ″ |
| Wurfwaffen | 2–3 | Nachschubpunkt |
| Sturm-MP 18 | 32 + 64 | — (kein Nachschub) |
| Maser-Selbstlader M16 | 10 + 30 | — |
| Fjodorow M16 | 25 + 50 | — |

Der **Munitionsbeutel des Schützen** füllt nur Primärmunition.

---

## Perks (Stub — Feinbau in der Nachschub-Ökonomie-Runde)

1–2 Perk-Slots im Loadout, dauerhaft im Quartier freigeschaltet. Zuordnung
universell vs. klassenspezifisch folgt.

- **Bandelier** — +50% Reservemunition Primär
- **Schnelllader** — −30% Nachladezeit
- **Ruhiger Atem** — −40% Schwanken beim Zielen (Gewehr)
- **Gasmaske** — immun gegen Giftwolken *(der Gas-Konter)*
- **Schwerlast** — keine Tempo-Strafe durch schwere Waffen, darf 2 schwere tragen
- **Beutegänger** — Wandwaffen kosten weniger Nachschub / mehr Startmunition
- **Handgranaten-Gurt** — +1 Wurfwaffe, schnelleres Werfen

---

## Backlog (WW1-Waffen für später)

- **Sturmtruppler-Arsenal:** Grabenflinte M97 (pump, `einzeln`), Kleif-
  Flammenwerfer, Grabenkeule, Sturm-MP als Signatur statt Wandwaffe.
- **Scharfschützengewehr** — mit Zielfernrohr / Periskop-Aufsatz für Schüsse aus
  der Deckung (mit dem Scharfschützen).
- **Dritte Nation** (slawisch / „Zarenreich") — Mossin-Nagant-Äquivalent,
  Nagant-Revolver, Fjodorow wird dann nations-gebunden.
- **Chauchat-Äquivalent** — Ladehemmungs-Risikowaffe, billiges frühes LMG.
- **Grabenkanone 37 mm** — zerlegbares leichtes Geschütz, Anti-Panzer, evtl.
  Home-Line-Fixpunkt oder Pionier-Schwergerät.
- **Gewehrgranate / VB-Werfer** — Aufsatz-Granatwerfer, Schützen-nah.
- **Villar-Perosa / frühe Doppel-MP**, **BAR-Äquivalent**.
- **Weitere Pistolen:** Maser C96 (`ladestreifen`-Pistole), Revolver-Varianten.
- **Nahkampf:** Schlagring-Griffe, Seitengewehr/Bajonett am Gewehr.
- **Gas-Varianten:** Maskenbrecher (zwingt Maske ab), Senfgas (wirkt trotz Maske).

---

## Anhang — Rohrecherche (echte WW1-Waffen)

> Vom Nutzer per Recherche zusammengestellt. Vorlage für die Fiktionalisierung
> und spätere Nationen/Waffen. Nicht 1:1 der Spielstand.

### 🇩🇪 Deutsches Kaiserreich
**Primär:** Gewehr 98 (bolt-action, 7,92 mm Mauser) · Karabiner 98a (kürzere
Kavallerie-/Pionierversion) · Gewehr 88/05 Kommissionsgewehr (älter, verbreitet)
· MG 08 Maxim (schwer, wassergekühlt) · MG 08/15 (leichter, mobil) · Bergmann MG
15nA (leicht, luftgekühlt) · Mauser M1916 Selbstlader (experimentell halbauto,
selten)
**Sekundär:** Luger P08 (9 mm Parabellum) · Mauser C96 „Broomhandle" (halbauto) ·
Reichsrevolver M1879/83 (älter)
**Special:** Kleif Kleinflammenwerfer (18–35 m) · MP18 Bergmann (erste echte MP,
1918, Sturmtruppen)

### 🇦🇹 Österreich-Ungarn
**Primär:** Mannlicher M1895 (straight-pull) · Mannlicher M1886/88 · Mannlicher
M1890 Karabiner · Schwarzlose MG M.07/12 · Škoda M1909 (schwer) · Madsen M1902
(leicht) · DWM MG 08 (übernommen)
**Sekundär:** Roth-Steyr M1907 (halbauto) · Steyr M1912 (9 mm Steyr) · Gasser
M1870/73 (Revolver)
**Special:** Standschütze Hellriegel M1915 (experimentelle MP, 160-Schuss-Magazin,
extrem selten) · Eierhandgranate M1915

### 🇹🇷 Osmanisches Reich
**Primär:** Mauser M1903 (7,65 mm) · Mauser M1887 · Gewehr 98 (dt. Lieferung) ·
Martini-Henry M1874 (Einzelschuss) · Winchester Karabiner · MG09 Maxim (7,65 mm)
· MG08 Maxim (dt. Lieferung)
**Sekundär:** Mauser C96 · Nagant M1895 · Smith & Wesson Revolver
**Special:** Kayakamalı Top M1912 (improvisierte 12-cm-Haubitze) · Gaza Burshiba
M1914 (95 mm improvisiert)

### 🇧🇬 Bulgarien
**Primär:** Mannlicher M1895 · Mannlicher M1888/90 · Mosin-Nagant M1891 (russ.) ·
Mauser Gewehr 98 (Beute) · Berdan II · Maxim MG · Madsen MG
**Sekundär:** Parabellum P08 · Smith & Wesson Revolver · Nagant M1895
**Special:** Stielhandgranate (dt.) · Rosenberg 37 mm Grabenkanone (russ.,
zerlegbar)

### 🇫🇷 Frankreich
**Primär:** Lebel M1886/93 (8 mm Lebel) · Berthier M1892/1907/15 · Chauchat CSRG
M1915 (leichtes MG) · Hotchkiss M1909 · Hotchkiss M1914 · Lewis Gun M1917 ·
Madsen M1902
**Sekundär:** M1892 Revolver · Ruby-Pistole (7,65 mm) · Star M1914
**Special:** Arbalète Sauterelle Type A („Grasshopper", Granaten-Schleuder,
110–140 m) · Viven-Bessières VB Granatwerfer (Aufsatz für Lebel, 190 m)

### 🇬🇧 Großbritannien
**Primär:** Lee-Enfield SMLE Mk III (.303) · Pattern 1914 Enfield · Vickers MG ·
Lewis Gun Mk I · Hotchkiss M1909 · Maxim MG · Colt-Browning M1895/14 „Potato
Digger"
**Sekundär:** Webley Mk IV/Mk VI (.455) · Colt M1911 · Smith & Wesson Triple Lock
**Special:** Mills Bomb Mk V („Pineapple") · Livens Projector (Gas-/Flammenwerfer,
~1.700 yd)

### 🇷🇺 Russland
**Primär:** Mosin-Nagant M1891 (7,62×54 mmR) · Mosin-Nagant Karabiner M1907 ·
Maxim M1910 · Fedorov Avtomat M1916 (automatisch, 6,5 mm, selten) · Lewis Gun
M1917 · Chauchat M1915 · Madsen M1902
**Sekundär:** Nagant M1895 Revolver · Mauser C96 · Browning M1900
**Special:** Fedorov Avtomat M1916 (erstes echtes Sturmgewehr, nur Elite) ·
Rosenberg 37 mm Grabenkanone (zerlegbar)

### Weitere Nationen (Kurz)
- **🇷🇸 Serbien:** Mauser M1899/1910 · Beute (Mannlicher, Mosin) · Maxim/Madsen/
  Hotchkiss · Nagant/C96/Gasser · Trench Periscope Rifle
- **🇧🇪 Belgien:** Mauser M1889 (+Karabiner) · Maxim/Lewis/Hotchkiss/Chauchat ·
  Nagant/Browning M1900/FN M1903 · Sniper-Schilde, Periskop-Gewehr
- **🇮🇹 Italien:** Carcano M1891 (+TS, 6,5 mm) · Fiat-Revelli M1914/15 · Villar
  Perosa M1915 (Zwillings-MP, 3.000 Schuss/min) · Bodeo M1889/Glisenti M1910/
  Beretta M1915 · Beretta OVP M1918 (echte SMG)
- **🇷🇴 Rumänien:** Mannlicher M1893/95 · Mosin (russ.) · Gras/Lebel (frz.) ·
  Maxim/Schwarzlose · Nagant/C96/Ruby · Rosenberg-Grabenkanone · VB-Werfer
- **🇯🇵 Japan:** Arisaka Type 38/30/44 (6,5 mm) · Taisho Type 3 MG · Maxim/
  Hotchkiss/Lewis · Nambu Type A/B · 7,5-cm-Grabenmörser
- **🇺🇸 USA:** Springfield M1903 (.30-06) · M1917 Enfield · Browning M1917 · Lewis
  M1917 · Chauchat M1918 · Colt M1911 (.45 ACP) · S&W M1917 Revolver · M1918 BAR
  (spät, selten) · VB-Werfer

### Allgemeine Special Weapons (mehrere Nationen)
- **Flammenwerfer:** dt. Kleif / Flammenwerfer M.16 (18–35 m) · brit. Livens
  Large Gallery Flame Projector (unterirdisch, ~100 ft)
- **Gas:** Chlorgas (ab April 1915, gelbgrün) · Phosgen (ab Dez. 1915, farblos,
  verzögert, 85% der Gastoten) · Senfgas (ab Juli 1917, ölig, blasenbildend,
  wirkt trotz Maske) · Tränengas (ab 1914) · Maskenbrecher / Chlorpikrin (zwingt
  Maske ab)
- **Granatwerfer / Gewehrgranaten:** Viven-Bessières VB (Cup-Aufsatz, 175–200 m)
  · Babbitt-Granate (US, Rod-type) · Granatenwerfer 16 (dt., „Priesterwerfer")
- **Sauterelle-Armbrust** (FR/UK) — Granaten-Schleuder, 110–140 m, bis 4/min
- **Nahkampf:** Grabenmesser (US M1917/18 Dreikant + Knuckle-Duster; dt.
  Einhanddolch teils mit Sägeschneide) · Grabenkeule (improvisiert; dt. Bleikopf;
  brit. „Spearhead"; US-Tomahawks) · Schlagring · Spaten/Schanzzeug als Keule ·
  Beile · Bajonett
- **Periskop-Gewehr** (ab Mai 1915) — Zielen aus dem Graben ohne Sichtbarkeit
- **Sniper-Schild / Panzerplatte** — mobile Stahlschilde
- **Handgranaten:** Stielhandgranate (DE, 25–30 m) · Mills Bomb (UK) · F1 (FR) ·
  Eierhandgranate (ÖU)
- **Sonstige:** Signalpistolen · Drahtschneider (improvisierte Nahkampfwaffe)
