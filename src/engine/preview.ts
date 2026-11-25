// What a task will cost and tie up, told before it is sent. A dry run: the task is launched on a copy of the game
// and the copy compared with the real one, so the preview can never disagree with what launching does.
// Pure: the real game is not touched.
import type { GameState, MissionKind } from '../types';
import { launchMission, cardRoles } from './missions';
import { missionsLeft } from './realm';
import { CARDS } from './cards';
import { roleName, player } from './core';
import { GOODS } from '../data/goods';

export interface TaskPreview {
  /** Why it cannot be sent, or null. */
  blocked: string | null;
  ducats: number; manpower: number;
  goods: { good: string; name: string; n: number }[];
  /** Quarters until it is done, and the season and year it ends in (quarter 0 = spring). */
  turns: number; endQuarter: number; endYear: number;
  cardKept: boolean;
  /** Who and what is away while it lasts. */
  ties: string[];
  /** What becomes harder or unavailable once it is sent. */
  after: string[];
}

export interface TaskArgs {
  kind: MissionKind; char: number; target: string; troops: number[]; building?: string; card: number;
  good?: string; ships?: number[]; trade?: { dir: 'buy' | 'sell'; amount: number }; gift?: number;
}

const plural = (n: number, w: string) => `${n} ${n === 1 ? w : w.endsWith('y') ? w.slice(0, -1) + 'ies' : w + 's'}`;

export function taskPreview(s: GameState, a: TaskArgs): TaskPreview {
  const copy = JSON.parse(JSON.stringify(s)) as GameState;
  const hc = s.hand.find(x => x.uid === a.card);
  const blocked = launchMission(copy, a.kind, a.char, a.target, a.troops, a.building, a.card, a.good, a.ships ?? [], a.trade, a.gift ?? 0);
  const ch = s.characters.find(c => c.uid === a.char);
  const empty: TaskPreview = { blocked, ducats: 0, manpower: 0, goods: [], turns: 0, endQuarter: s.quarter ?? 0, endYear: s.year, cardKept: !!(hc && CARDS[hc.card]?.permanent), ties: [], after: [] };
  if (blocked || !ch) return empty;
  const m = copy.missions.find(x => x.char === a.char && !s.missions.some(y => y.id === x.id));
  const turns = m?.turnsLeft ?? 0;
  const q = (s.quarter ?? 0) + turns;
  const goods = Object.keys(GOODS).map(g => ({ good: g, name: GOODS[g].name, n: Math.round(((s.stock[g] ?? 0) - (copy.stock[g] ?? 0)) * 10) / 10 })).filter(x => x.n > 0);
  const cardKept = copy.hand.some(x => x.uid === a.card);
  const ties = [ch.ruler ? `${ch.name} (your monarch) leaves court` : `${ch.name}, ${roleName[ch.role].toLowerCase()}`];
  if (a.troops.length) ties.push(plural(a.troops.length, 'company'));
  if (a.ships?.length) ties.push(plural(a.ships.length, 'ship'));
  const after: string[] = [];
  if (a.kind !== 'route') {
    const left = missionsLeft(copy);
    after.push(left <= 0 ? 'Your last task this year: the next waits for spring' : `${plural(left, 'task')} left this year`);
  }
  const roles = hc ? cardRoles(hc.card) : [ch.role];
  if (!copy.characters.some(c => c.mission == null && roles.includes(c.role))) after.push(`No other free ${roles.map(r => roleName[r].toLowerCase()).join(' or ')} until it is done`);
  if (a.troops.length && !copy.troops.some(t => t.mission == null && !t.moving)) after.push('No companies left at home to defend');
  if (!cardKept && hc && !copy.hand.some(x => x.card === hc.card)) after.push(`Your last ${CARDS[hc.card].name} card`);
  if (player(copy).gold < 0) after.push('The treasury goes below zero: no wages or upkeep until it recovers');
  return {
    blocked: null,
    ducats: Math.round((player(s).gold - player(copy).gold) * 10) / 10,
    manpower: Math.round((player(s).manpower - player(copy).manpower) * 10) / 10,
    goods, turns, endQuarter: q % 4, endYear: s.year + Math.floor(q / 4), cardKept, ties, after,
  };
}
