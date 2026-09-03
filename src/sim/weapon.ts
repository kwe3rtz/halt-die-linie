// Waffen-Feuerlogik: Kadenz-Cooldown, Magazin + Reserve, Nachladen je
// Nachlade-Art. Hitscan gegen die statische Level-Geometrie.
//
// Getrieben von einem `WeaponDef` (`src/data`). Deterministisch: injizierte Zeit
// (`dt`), kein `Math.random`, kein Babylon, keine Browser-Globals (goldene Regel).
// Der Waffenzustand wird in-place fortgeschrieben (ein Objekt pro Spieler).
import type { Vec3 } from "./math";
import { raycast, type CollisionWorld, type RayHit } from "./collision";
import type { NachladeArt, WeaponDef } from "../data/schema";

export interface WeaponState {
  defId: string;
  /** Geladene Schuss. */
  imLauf: number;
  /** Mitgeführte Reservemunition. */
  reserve: number;
  /** Sekunden bis der nächste Schuss möglich ist. */
  cooldown: number;
  /** Sekunden bis der laufende Nachlade-Block fertig ist. */
  reloadRest: number;
  reloading: boolean;
}

const STREIFEN = 5;

// Dauer eines Nachlade-Blocks in Sekunden. PLATZHALTER (WAFFEN.md „Nachlade-Arten").
const BLOCK_DAUER: Record<NachladeArt, number> = {
  ladestreifen: 1.6, // pro Streifen à 5
  magazin: 2.2,
  trommel: 4.0,
  gurt: 6.0,
  revolver: 3.0,
  einzeln: 0.6, // pro Schuss
};

/** Ladestreifen und Einzelladen sind durch Feuern unterbrechbar. */
function istUnterbrechbar(art: NachladeArt): boolean {
  return art === "ladestreifen" || art === "einzeln";
}

/** Wie viele Schuss ein einzelner Nachlade-Block einlädt. */
function blockMenge(art: NachladeArt): number {
  if (art === "ladestreifen") return STREIFEN;
  if (art === "einzeln") return 1;
  return Number.POSITIVE_INFINITY; // voller Wechsel bis Magazin voll
}

export function createWeaponState(def: WeaponDef): WeaponState {
  return {
    defId: def.id,
    imLauf: def.magazin,
    reserve: def.reserve,
    cooldown: 0,
    reloadRest: 0,
    reloading: false,
  };
}

export interface FireButtons {
  /** Feuertaste ist in diesem Tick gedrückt. */
  gedrueckt: boolean;
  /** Feuertaste wurde in diesem Tick neu gedrückt (Flanke). */
  flanke: boolean;
}

export interface FireResult {
  schuss: boolean;
  treffer?: RayHit;
}

/**
 * Versucht zu feuern. Mutiert `state` (imLauf/cooldown, ggf. Nachlade-Abbruch).
 * `richtung` muss normalisiert sein.
 */
export function fire(
  state: WeaponState,
  world: CollisionWorld,
  origin: Vec3,
  richtung: Vec3,
  def: WeaponDef,
  buttons: FireButtons,
): FireResult {
  const wantShot =
    def.feuerModus === "vollauto" ? buttons.gedrueckt : buttons.flanke;
  if (!wantShot) {
    return { schuss: false };
  }

  if (state.reloading) {
    // Unterbrechbare Nachlade-Arten: Feuern bricht ab (dieser Tick ohne Schuss),
    // bereits fertig geladene Blöcke bleiben.
    if (istUnterbrechbar(def.nachladeArt)) {
      state.reloading = false;
      state.reloadRest = 0;
    }
    return { schuss: false };
  }

  if (state.cooldown > 0 || state.imLauf <= 0) {
    return { schuss: false };
  }

  state.imLauf -= 1;
  state.cooldown = 60 / def.kadenz;

  const treffer = raycast(world, origin, richtung, def.handling.reichweiteMax);
  return treffer ? { schuss: true, treffer } : { schuss: true };
}

/** Startet das Nachladen, falls sinnvoll. Mutiert `state`. */
export function reload(state: WeaponState, def: WeaponDef): void {
  if (state.reloading || state.imLauf >= def.magazin || state.reserve <= 0) {
    return;
  }
  // Voller Wechsel: Restmunition im „alten Magazin" verfällt (WAFFEN.md).
  if (!istUnterbrechbar(def.nachladeArt)) {
    state.imLauf = 0;
  }
  state.reloading = true;
  state.reloadRest = BLOCK_DAUER[def.nachladeArt];
}

/** Zählt Cooldown/Nachladen um `dt` herunter und schließt fertige Blöcke ab. */
export function advanceWeapon(
  state: WeaponState,
  def: WeaponDef,
  dt: number,
): void {
  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt);
  }
  if (!state.reloading) {
    return;
  }

  state.reloadRest -= dt;
  while (state.reloading && state.reloadRest <= 0) {
    const wollen = Math.min(
      blockMenge(def.nachladeArt),
      def.magazin - state.imLauf,
    );
    const geladen = Math.max(0, Math.min(wollen, state.reserve));
    state.imLauf += geladen;
    state.reserve -= geladen;

    const weiter =
      istUnterbrechbar(def.nachladeArt) &&
      state.imLauf < def.magazin &&
      state.reserve > 0;
    if (weiter) {
      state.reloadRest += BLOCK_DAUER[def.nachladeArt];
    } else {
      state.reloading = false;
      state.reloadRest = 0;
    }
  }
}
