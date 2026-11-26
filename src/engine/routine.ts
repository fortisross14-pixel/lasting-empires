// Less routine: tasks worth doing again, and the chancellor's routines (chores the player may hand over).
// Everything still goes through a card and a person (pillar 1): a routine only plays the card the player would
// have played, on the obvious target, and says what it did.
import type { GameState, MissionKind, RedoEntry } from '../types';
import { CARDS } from './cards';
import { launchMission, missionBlocked, cardRoles, MISSION_INFO, techCost } from './missions';
import { missionsLeft } from './realm';
import { partners, routeBlocked } from './trade';
import { TECHS, TECH } from '../data/techs';
import { GOODS } from '../data/goods';
import { nationName, ageIndex } from './core';
import { techOpenTo } from './technology';

/** Tasks that make sense to do again on the same target. */
export const REDO_KINDS: MissionKind[] = ['relations', 'develop', 'grow', 'convert', 'assimilate', 'artwork', 'pilgrimage', 'explore', 'patronage', 'route'];
/** How many are remembered. */
export const REDO_MAX = 6;

const keyOf = (e: RedoEntry) => [e.kind, e.target, e.building ?? '', e.good ?? '', e.dir ?? ''].join('|');

/** Remember a task that was done (or a route that was cut), newest first. */
export function rememberRedo(s: GameState, e: RedoEntry) {
  if (!REDO_KINDS.includes(e.kind)) return;
  s.redo = [e, ...(s.redo ?? []).filter(x => keyOf(x) !== keyOf(e))].slice(0, REDO_MAX);
}

/** A task that can be done again right now: the card in hand, a free person, and the target (for a cut route, the
 *  best partner still open). */
export interface RedoOption { entry: RedoEntry; card: number; char: number; target: string; title: string; }

const free = (s: GameState, cardId: string) => { const roles = cardRoles(cardId); return s.characters.filter(c => c.mission == null && roles.includes(c.role)).sort((a, b) => b.skill - a.skill)[0]; };
const cardFor = (s: GameState, kind: MissionKind, dir?: 'buy' | 'sell') => s.hand.find(h => { const d = CARDS[h.card]; return d?.kind === 'mission' && !d.permanent && !d.burden && d.missions?.includes(kind) && (!dir || !d.trade || d.trade === dir); });

/** The best partner for a route in a good: the cheapest to buy from, or the best to sell to, among those open. */
export function bestPartner(s: GameState, good: string, dir: 'buy' | 'sell', amount: number): string | null {
  const ps = partners(s, good, dir).filter(p => !p.why && !routeBlocked(s, good, dir, p.nation, amount));
  return ps[0]?.nation ?? null;
}

export function redoOptions(s: GameState): RedoOption[] {
  const out: RedoOption[] = [];
  for (const e of s.redo ?? []) {
    if (e.kind !== 'route' && missionsLeft(s) <= 0) continue;
    const hc = cardFor(s, e.kind, e.dir);
    if (!hc) continue;
    const ch = free(s, hc.card);
    if (!ch) continue;
    let target = e.target;
    if (e.kind === 'route') {
      const p = e.good && e.dir ? (routeBlocked(s, e.good, e.dir, e.target, e.amount ?? 1) ? bestPartner(s, e.good, e.dir, e.amount ?? 1) : e.target) : null;
      if (!p) continue;
      target = p;
    } else if (missionBlocked(s, e.kind, target, e.building)) continue;
    const what = e.kind === 'route' ? `${GOODS[e.good ?? '']?.name ?? 'Goods'} ${e.dir === 'sell' ? 'to' : 'from'} ${nationName(s, target)}` : s.provinces[target]?.name ?? s.nations[target]?.name ?? '';
    out.push({ entry: e, card: hc.uid, char: ch.uid, target, title: `${e.why === 'lost' ? 'Reopen' : 'Again'}: ${MISSION_INFO[e.kind].name}${what ? ' · ' + what : ''}` });
  }
  return out;
}

// ---------- the chancellor's routines ----------
export interface Routine { id: string; name: string; text: string; }
export const ROUTINES: Routine[] = [
  { id: 'study', name: 'Keep the scholars studying', text: 'When a scholar is free and you hold a study card, start the quickest study open in its field.' },
  { id: 'assist', name: 'Help the current study', text: 'When a scholar is free and you hold an Assist card, put it to the study nearest to done.' },
  { id: 'routes', name: 'Reopen cut trade routes', text: 'When a route was cut by war or a realm fell, and you hold the contract and a free merchant, reopen it with the best partner still open.' },
];

/** Run the routines the player switched on: at most one task each, at the start of a season. Returns what was done,
 *  in words. Uses the same launchMission as the planner, so every rule and cost applies. */
export function runRoutines(s: GameState): string[] {
  const on = s.routines ?? [];
  const done: string[] = [];
  if (s.over || !on.length) return done;
  if (on.includes('study') && missionsLeft(s) > 0) {
    const hc = s.hand.find(h => { const d = CARDS[h.card]; return d?.kind === 'mission' && !d.permanent && d.missions?.includes('research'); });
    const ch = hc && free(s, hc.card);
    if (hc && ch) {
      const d = CARDS[hc.card];
      const tech = TECHS.filter(t => techOpenTo(s, s.player, t.id) && (!d.track || t.track === d.track) && !s.techs.includes(t.id) && t.age <= ageIndex(s) && !s.missions.some(m => m.kind === 'research' && m.target === t.id) && !missionBlocked(s, 'research', t.id))
        .sort((a, b) => techCost(s, a.id) - techCost(s, b.id))[0];
      if (tech && !launchMission(s, 'research', ch.uid, tech.id, [], undefined, hc.uid)) done.push(`${ch.name} begins to study ${tech.name}`);
    }
  }
  if (on.includes('assist') && missionsLeft(s) > 0) {
    const hc = s.hand.find(h => { const d = CARDS[h.card]; return d?.kind === 'mission' && !d.permanent && d.missions?.includes('assist'); });
    const ch = hc && free(s, hc.card);
    const study = s.missions.filter(m => m.kind === 'research' && !missionBlocked(s, 'assist', String(m.id))).sort((a, b) => a.turnsLeft - b.turnsLeft)[0];
    if (hc && ch && study && !launchMission(s, 'assist', ch.uid, String(study.id), [], undefined, hc.uid)) done.push(`${ch.name} helps with ${TECH[study.target]?.name ?? 'the study'}`);
  }
  if (on.includes('routes')) {
    for (const o of redoOptions(s).filter(x => x.entry.kind === 'route' && x.entry.why === 'lost')) {
      const e = o.entry;
      if (launchMission(s, 'route', o.char, o.target, [], undefined, o.card, e.good, [], { dir: e.dir!, amount: e.amount ?? 1 })) continue;
      s.redo = (s.redo ?? []).filter(x => x !== e);
      done.push(`A merchant sets out to reopen ${GOODS[e.good!]?.name.toLowerCase() ?? 'the'} trade with ${nationName(s, o.target)}`);
      break;
    }
  }
  return done;
}
