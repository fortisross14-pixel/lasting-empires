// The campaign arc (docs/PLAN-DIRECTION.md, M7): an ambition always in view, a turning point when a new age opens,
// and the decisive moments of the reign, kept for the chronicle at the end.
import type { GameState, DraftOption, Story, ReignMoment } from '../types';
import { AMBITIONS, type AmbitionDef } from './drafts';
import { provsOf, push, player } from './core';
import { ranking } from './turn';
import { overseasOf } from './rivals';
import { subjectsOf } from './diplo';

const share = (have: number, need: number) => Math.max(0, Math.min(1, have / need));
const startProvs = (s: GameState) => s.flags.start_provs ?? 3;

/** Grand ambitions, for the turning points: each scaled to the realm, with how far along it already is (`fit`),
 *  so the choice builds on what the realm has become. */
export const GRAND_AMBITIONS: (AmbitionDef & { fit: (s: GameState) => number })[] = [
  { id: 'g_empire', name: 'An Empire', text: 'Hold three times the provinces you started with (at least 15).', reward: 90,
    check: s => provsOf(s, s.player).length >= Math.max(15, 3 * startProvs(s)), fit: s => share(provsOf(s, s.player).length, Math.max(15, 3 * startProvs(s))) },
  { id: 'g_first', name: 'First Among the Powers', text: 'Stand among the three greatest realms of the world.', reward: 90,
    check: s => ranking(s).findIndex(x => x.id === s.player) < 3, fit: s => { const i = ranking(s).findIndex(x => x.id === s.player); return i < 0 ? 0 : Math.max(0, 1 - i / 20); } },
  { id: 'g_learning', name: 'A Realm of Learning', text: 'Know 30 technologies.', reward: 60, check: s => s.techs.length >= 30, fit: s => share(s.techs.length, 30) },
  { id: 'g_trade', name: 'Mistress of the Seas', text: 'Keep 8 trade routes and 3 trade posts at once.', reward: 60,
    check: s => s.routes.length >= 8 && s.posts.length >= 3, fit: s => (share(s.routes.length, 8) + share(s.posts.length, 3)) / 2 },
  { id: 'g_overseas', name: 'An Empire Overseas', text: 'Hold 8 provinces in lands across the sea.', reward: 80, check: s => overseasOf(s, s.player) >= 8, fit: s => share(overseasOf(s, s.player), 8) },
  { id: 'g_cities', name: 'A Realm of Cities', text: 'Have 8 cities or metropolises.', reward: 60,
    check: s => provsOf(s, s.player).filter(p => p.settlement >= 3).length >= 8, fit: s => share(provsOf(s, s.player).filter(p => p.settlement >= 3).length, 8) },
  { id: 'g_overlord', name: 'King of Kings', text: 'Hold 3 subject realms at once.', reward: 70, check: s => subjectsOf(s, s.player).length >= 3, fit: s => share(subjectsOf(s, s.player).length, 3) },
  { id: 'g_glory', name: 'Undying Glory', text: 'Reach 400 prestige.', reward: 0, check: s => player(s).prestige >= 400, fit: s => share(player(s).prestige, 400) },
];
/** How many ambitions a turning point offers (plus keeping the current one, if it is still open). */
export const PIVOT_CHOICES = 3;

/** The ambitions a turning point offers: the grand ones the realm is best placed for (not yet met, not done
 *  before), plus the one it holds now if that is still open. No dice: the realm's own state decides. */
export function pivotOptions(s: GameState): DraftOption[] {
  const tried = new Set((s.ambitions ?? []).map(a => a.id));
  const open = s.ambition && !s.ambitionDone ? s.ambition : null;
  const pool = GRAND_AMBITIONS.filter(a => !tried.has(a.id) && !a.check(s)).map(a => ({ a, f: a.fit(s) })).sort((x, y) => y.f - x.f || x.a.id.localeCompare(y.a.id));
  const out: DraftOption[] = open ? [{ t: 'ambition', id: open }] : [];
  for (const { a } of pool) { if (out.length >= PIVOT_CHOICES + (open ? 1 : 0)) break; out.push({ t: 'ambition', id: a.id }); }
  return out;
}

/** Ask for a new ambition: after one is met or failed, and when a new age opens. Not in mission mode, where the
 *  mission is the goal, and never twice at once. */
export function offerAmbition(s: GameState, why: 'done' | 'age') {
  if (s.scenario || s.over) return;
  if (s.queue.some(p => p.kind === 'draft' && p.draft === 'ambition')) return;
  const options = pivotOptions(s);
  const only = options.length === 1 && options[0].t === 'ambition' ? options[0].id : null;
  if (!options.length || only === s.ambition) return;
  push(s, { kind: 'draft', draft: 'ambition', options, pivot: why });
}

/** The player has chosen: the record of ambitions keeps how each ended. Keeping the same one changes nothing. */
export function beginAmbition(s: GameState, id: string) {
  s.ambitions ??= [];
  const cur = s.ambitions[s.ambitions.length - 1];
  if (cur && cur.id === id && !cur.result) return;
  if (cur && !cur.result) { cur.result = 'set aside'; cur.to = s.year; }
  s.ambitions.push({ id, from: s.year });
  s.ambition = id; s.ambitionDone = false;
}
export function endAmbition(s: GameState, result: 'won' | 'failed') {
  const cur = (s.ambitions ?? [])[(s.ambitions ?? []).length - 1];
  if (cur && !cur.result) { cur.result = result; cur.to = s.year; }
  const a = ambitionDef(s.ambition ?? '');
  if (result === 'won' && a) remember(s, { year: s.year, quarter: s.quarter ?? 0, because: `Your ambition, chosen in ${cur?.from ?? s.startYear}.`, title: `Ambition fulfilled: ${a.name}`, changes: [a.text], weight: 6 });
}
export const ambitionDef = (id: string) => AMBITIONS.find(a => a.id === id) ?? GRAND_AMBITIONS.find(a => a.id === id);

// ---------- the decisive moments of the reign ----------
/** How many moments are kept (oldest go first), and how many the final chronicle shows. */
export const REIGN_KEPT = 60;
export const CHRONICLE_SHOWN = 8;

function remember(s: GameState, m: ReignMoment) {
  s.reign = [...(s.reign ?? []), m].slice(-REIGN_KEPT);
}

/** How much a result weighs in the history of a reign: land changing hands most, then treaties, posts, studies,
 *  towns, and great prestige. Small things are not kept. */
export function weightOf(st: Story): number {
  let w = 0;
  for (const c of st.changes) {
    if (c.label === 'Provinces' || / held by$/.test(c.label)) w = Math.max(w, 5);
    else if (c.from != null && !/: (faith|people)$/.test(c.label)) w = Math.max(w, 4);
    else if (c.label === 'Trade posts' || c.label === 'Technologies known') w = Math.max(w, 3);
    else if (/: settlement$/.test(c.label) || (c.label === 'Prestige' && c.delta >= 5)) w = Math.max(w, 2);
    else if (/: (faith|people)$/.test(c.label)) w = Math.max(w, 2);
  }
  return w;
}

/** Keep a task's result if it was decisive (called by withStory with the result's title). */
export function rememberStory(s: GameState, st: Story, title: string, lines: string[]) {
  const w = weightOf(st);
  if (w < 2) return;
  remember(s, { year: s.year, quarter: s.quarter ?? 0, because: st.because, title, changes: lines.slice(0, 3), weight: w, place: st.place });
}

/** The moments the chronicle tells: the weightiest, in the order they happened. */
export function decisiveMoments(s: GameState, n = CHRONICLE_SHOWN): ReignMoment[] {
  const all = (s.reign ?? []).map((m, i) => ({ m, i }));
  const top = [...all].sort((a, b) => b.m.weight - a.m.weight || b.i - a.i).slice(0, n);
  return top.sort((a, b) => a.i - b.i).map(x => x.m);
}

/** A province taken or lost in a battle you fought. */
export function rememberBattle(s: GameState, b: { province: string; context: string }, name: string, won: boolean, title: string) {
  remember(s, { year: s.year, quarter: s.quarter ?? 0, because: won ? `Your army took ${name} by storm.` : `The enemy took ${name} from you.`, title: title || (won ? `${name} taken` : `${name} lost`), changes: [`${name}: ${won ? 'now yours' : 'lost'}`], weight: 5, place: b.province });
}
