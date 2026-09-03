// Spieler-Kampfzustand: Lebenspunkte, Tod, Respawn-Timer.
// Reine, in-place fortgeschriebene Logik — kein Babylon, kein Math.random,
// keine Browser-Globals (goldene Regel).

export interface PlayerCombat {
  hp: number;
  maxHp: number;
  tot: boolean;
  /** Sekunden bis zum Respawn (0, solange lebendig). */
  respawnRest: number;
}

export const DEFAULT_MAX_HP = 100;
export const RESPAWN_DELAY = 3; // Sekunden — Platzhalter

// TODO(Rückfrage): Keine HP-Regeneration in AP2. Kommt später mit dem
// Sanitäter-Konzept (KONZEPT.md §4) bzw. der Balance-Runde. Bis dahin heilt
// nur der Respawn.

export function createPlayerCombat(maxHp = DEFAULT_MAX_HP): PlayerCombat {
  return { hp: maxHp, maxHp, tot: false, respawnRest: 0 };
}

/**
 * Schadens-Eingang. Mutiert `combat`. Im Tod-Zustand und bei `menge <= 0` ein
 * No-op. `quelle` ist ein freies Etikett (z. B. "nahkampf", eine Gegner-Id) —
 * AP2-03 (Gegner) ruft diese Funktion direkt auf.
 */
export function applyDamage(
  combat: PlayerCombat,
  menge: number,
  quelle?: string,
): void {
  void quelle; // ab AP2-03 ausgewertet (Trefferfeedback / Statistik)
  if (combat.tot || menge <= 0) {
    return;
  }
  combat.hp = Math.max(0, combat.hp - menge);
  if (combat.hp <= 0) {
    combat.tot = true;
    combat.respawnRest = RESPAWN_DELAY;
  }
}

/**
 * Zählt den Respawn-Timer herunter. Liefert `true` in genau dem Tick, in dem
 * der Respawn fällig wird — der Aufrufer setzt dann Position/HP/Waffe zurück.
 */
export function advancePlayerCombat(combat: PlayerCombat, dt: number): boolean {
  if (!combat.tot) {
    return false;
  }
  combat.respawnRest -= dt;
  if (combat.respawnRest <= 0) {
    combat.respawnRest = 0;
    return true;
  }
  return false;
}

/** Setzt den Kampfzustand auf „frisch am Spawn". Mutiert `combat`. */
export function respawnCombat(combat: PlayerCombat): void {
  combat.hp = combat.maxHp;
  combat.tot = false;
  combat.respawnRest = 0;
}
