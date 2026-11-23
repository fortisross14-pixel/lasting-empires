// The history of the realm: the weighty moments of a campaign, kept apart from the running log (which forgets after
// 120 lines), and told reign by reign when the game ends.
import type { GameState } from '../types';
import { player } from './core';
import { reignOf } from './court';

/** What makes a line of the log worth remembering, and how much. Lines that match nothing are forgotten.
 *  Only what the realm itself did or suffered counts: the fall of a far kingdom is news, not this realm's history. */
const WEIGHTS: [RegExp, number][] = [
  [/^Ambition fulfilled|^Mission accomplished|revolution triumphs|crowns of .+ are united/, 6],
  [/^Civil war|^Revolution:|declares independence as ruler|declares bankruptcy|^Against all odds/, 5],
  [/^You open the /, 5],
  [/enters a personal union with your crown|is integrated into the realm/, 4],
  [/declares war on you|^You declare war on|^A coalition forms against/, 4],
  [/\((masterpiece|great work)\)/i, 4],
  [/^Peace with|court moves from|discovers |^Colony founded|conquers .+ from the| is taken!$/, 3],
  [/opens the .*Age/, 3],
  [/^Defeat at | holds!$|is lost at sea|leaves your court|^Trade post opened|^Research complete: /, 1],
];
export const momentWeight = (text: string) => WEIGHTS.find(([re]) => re.test(text))?.[1] ?? 0;
/** How many moments a save keeps. When full, the lightest and oldest goes. */
export const ANNALS_MAX = 90;

/** Called by log(): keep the line if it is one of the moments a history is made of. */
export function remember(s: GameState, text: string) {
  const w = momentWeight(text);
  if (!w) return;
  const a = (s.stats.annals ??= []);
  a.push({ year: s.year, text, w });
  if (a.length > ANNALS_MAX) { let drop = 0; for (let i = 1; i < a.length; i++) if (a[i].w < a[drop].w) drop = i; a.splice(drop, 1); }
}

export interface Chapter { ruler: string; epithet: string; from: number; to: number; moments: { year: number; text: string }[]; }
/** The campaign as a short history: one chapter a reign, the heaviest moments of each, fifteen in all at most. */
export function historyOf(s: GameState, max = 15): Chapter[] {
  const me = player(s), all = s.stats.annals ?? [];
  const reigns = [...s.stats.kings.map(k => ({ ruler: k.name, epithet: k.epithet ?? '', from: k.from, to: k.to })), { ruler: me.ruler.name, epithet: reignOf(s).epithet, from: me.ruler.from, to: s.year }];
  // the heaviest moments overall, then back into the order they happened
  const keep = new Set([...all].sort((a, b) => b.w - a.w || a.year - b.year).slice(0, max));
  return reigns.map((r, i) => ({ ...r, moments: all.filter(m => keep.has(m) && m.year >= (i === 0 ? -Infinity : r.from) && (i === reigns.length - 1 ? true : m.year < r.to)).map(m => ({ year: m.year, text: m.text })) }))
    .filter(c => c.moments.length || c.to - c.from >= 4);
}
