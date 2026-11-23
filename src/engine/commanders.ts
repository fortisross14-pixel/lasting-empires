// Rival commanders with names. A realm of some size keeps one general, whom the player meets again and again
// until he falls, is taken, or grows old. Smaller realms send a captain nobody remembers.
import type { GameState, BattleGeneral, BattleSide, Commander } from '../types';
import { provsOf, rand } from './core';
import { later } from './eventkit';
import { FIRST_NAMES, SURNAMES, TRAITS } from '../data/characters';
import { poolFor } from '../data/names';

/** Provinces a realm needs before its general has a name. */
export const COMMANDER_MIN = 8;
/** Years a commander serves before a younger man takes the baton. */
export const COMMANDER_YEARS = 25;
/** After a battle the player wins against him: the chance that he falls, and that he is taken. */
export const COMMANDER_FALLS = 0.12, COMMANDER_TAKEN = 0.12;

const hash = (t: string) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const GENERAL_TRAITS = Object.values(TRAITS).filter(t => t.role === 'general').map(t => t.id);

/** A new commander for a realm. Worked out from the realm and the year alone (no dice), so the world's other
 *  rolls fall as they did before commanders had names. */
function appoint(s: GameState, id: string): Commander {
  const n = s.nations[id], pool = poolFor(n.culture);
  const first = FIRST_NAMES[n.culture] ?? pool?.first ?? FIRST_NAMES.castilian, last = SURNAMES[n.culture] ?? pool?.last ?? SURNAMES.castilian;
  const h = hash(id + ':' + s.year);
  return { name: `${first[h % first.length]} ${last[(h >>> 8) % last.length]}`, skill: 2 + ((h >>> 16) % 4), traits: [GENERAL_TRAITS[(h >>> 20) % GENERAL_TRAITS.length]], since: s.year };
}

/** The named general who leads this realm's armies against the player, or null for a realm too small to have one
 *  (or whose general is the player's prisoner). */
export function commanderOf(s: GameState, id: string): BattleGeneral | null {
  const n = s.nations[id];
  if (!n?.alive || provsOf(s, id).length < COMMANDER_MIN) return null;
  if (n.general?.captive) return null;
  if (!n.general || s.year - n.general.since > COMMANDER_YEARS) n.general = appoint(s, id);
  return { name: n.general.name, skill: n.general.skill, traits: [...n.general.traits] };
}
/** Who would lead them, for the screens (no new appointment is made by looking). */
export const knownCommander = (s: GameState, id: string): Commander | null => { const g = s.nations[id]?.general; return g && !g.captive ? g : null; };

/** After a battle against the player: a beaten commander may fall or be taken. Returns a line for the report. */
export function commanderFate(s: GameState, enemy: BattleSide, playerWon: boolean): string | null {
  const n = s.nations[enemy.nation], g = n?.general;
  if (!playerWon || !g || g.captive || enemy.general?.name !== g.name) return null;
  const r = rand(s);
  if (r < COMMANDER_FALLS) { delete n.general; return `${g.name}, who led them, fell on the field.`; }
  if (r < COMMANDER_FALLS + COMMANDER_TAKEN) {
    g.captive = true;
    later(s, 'captive_general', 0, 0, { nation: n.id, name: g.name });
    return `${g.name}, who led them, is your prisoner.`;
  }
  return null;
}
