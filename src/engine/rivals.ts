// Rivals the player can read: what each realm wants, what kind of realm it is, how it stands towards the player
// and why, the warning that comes before a war, and what it has lately been doing.
// Nothing here rolls dice except the warning's own event, so the rest of the world falls as it did.
import type { GameState, Nation, Personality } from '../types';
import { provsOf, getRel, addRel, atWar, hasTreaty, inTruce, borders, nationName, enemiesOf } from './core';
import { NO_STATE } from '../data/nations';
import { provRegion } from './overseas';
import { REGIONS } from '../data/overseas';

// ---------- what a realm wants ----------
/** Provinces a realm needs before it has a goal worth the name. */
export const GOAL_MIN = 5;
/** A realm holds to a goal this long, then looks about again. */
export const GOAL_YEARS = 25;
/** In choosing whom to fight, the goal counts as this many candidates. */
export const GOAL_WEIGHT = 3;
/** Each year a realm likes the object of its ambition a little less. */
export const GOAL_DRIFT = -2;

/** What history gave the great conquerors to want, in order: [target, from the year]. */
export const HIST_GOALS: Record<string, [string, number][]> = {
  ottomans: [['byzantium', 1451], ['serbia', 1455], ['karaman', 1465], ['mamluks', 1500], ['hungary', 1520]],
  muscovy: [['novgorod', 1451], ['kazan', 1530], ['crimea', 1600], ['sweden', 1695]],
  castile: [['granada', 1451], ['navarre', 1500]],
  france: [['burgundy', 1451], ['brittany', 1480], ['milan', 1494]],
  timurids: [['delhi', 1500]],
  jurchens: [['ming', 1610]],
  songhai: [['mali', 1451]],
  morocco: [['songhai', 1580]],
  inca: [['chimor', 1451]],
  aztec: [['mixtec', 1451], ['tlaxcala', 1480]],
  vijayanagara: [['bahmani', 1451]],
  poland: [['lithuania', 1451]],
};
const hash = (t: string) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const neighboursOf = (s: GameState, id: string): Nation[] => Object.values(s.nations).filter(n => n.alive && n.id !== id && n.id !== NO_STATE && provsOf(s, n.id).length > 0 && borders(s, id, n.id));
const reachable = (s: GameState, id: string, t: string) => !!s.nations[t]?.alive && provsOf(s, t).length > 0 && s.nations[t].overlord !== id && s.nations[id].overlord !== t;

/** The realm this one means to have: history's choice if it still stands, otherwise the neighbour it likes least
 *  (weaker ones first). Worked out without dice, kept for GOAL_YEARS, and chosen again when the target is gone. */
export function goalOf(s: GameState, id: string): string | null {
  const n = s.nations[id];
  if (!n?.alive || id === s.player || n.overlord || provsOf(s, id).length < GOAL_MIN) return null;
  if (n.goal && reachable(s, id, n.goal.target) && s.year - n.goal.since < GOAL_YEARS) return n.goal.target;
  const hist = [...(HIST_GOALS[id] ?? [])].reverse().find(([t, from]) => s.year >= from && reachable(s, id, t));
  let target = hist?.[0] ?? null;
  if (!target) {
    const mine = provsOf(s, id).length;
    const ns = neighboursOf(s, id).filter(x => reachable(s, id, x.id) && !hasTreaty(s, id, x.id, 'alliance') && !hasTreaty(s, id, x.id, 'marriage'));
    // the least liked, and among those the one small enough to swallow; ties fall by name and decade, not by dice
    const score = (x: Nation) => getRel(s, id, x.id) + (provsOf(s, x.id).length > mine ? 40 : 0) + (hash(id + x.id + Math.floor(s.year / GOAL_YEARS)) % 20);
    target = ns.sort((a, b) => score(a) - score(b))[0]?.id ?? null;
  }
  if (!target) { delete n.goal; return null; }
  n.goal = { target, since: s.year };
  return target;
}
/** Once a year: ambition sours relations with its object. */
export function yearlyGoals(s: GameState, n: Nation) {
  const g = goalOf(s, n.id);
  if (g && !atWar(s, n.id, g)) addRel(s, n.id, g, GOAL_DRIFT);
}
/** Does the player know what this realm wants? By spies, by an embassy, by alliance, or because it is plain. */
export const goalKnown = (s: GameState, id: string) => {
  const n = s.nations[id];
  return (n.spiedUntil ?? 0) > s.year || !!s.flags['goal_known_' + id] || hasTreaty(s, s.player, id, 'alliance') || n.overlord === s.player || (goalOf(s, id) === s.player && getRel(s, s.player, id) <= -30);
};
export const learnGoal = (s: GameState, id: string) => { if (goalOf(s, id)) s.flags['goal_known_' + id] = 1; };

// ---------- what kind of realm it is ----------
/** The five tempers, in words, with what each really does in the code that drives them (ai.ts). */
export const TEMPERS: Record<Personality, { name: string; text: string }> = {
  expansionist: { name: 'Expansionist', text: 'Goes to war most readily of all, even against those it does not hate, and keeps a larger army.' },
  zealot: { name: 'Zealot', text: 'Goes to war readily, above all against those it already hates.' },
  balanced: { name: 'Balanced', text: 'Goes to war now and then, when it is clearly the stronger.' },
  merchant: { name: 'Merchant', text: 'Seldom goes to war; its lands grow richer faster than others\'.' },
  cautious: { name: 'Cautious', text: 'Almost never starts a war, and keeps a smaller army.' },
};

// ---------- how it stands towards the player, and why ----------
export type AttitudeWord = 'At war' | 'Your subject' | 'Ally' | 'Friendly' | 'Afraid' | 'Rival' | 'Hostile' | 'Wary' | 'Neutral';
export interface Attitude { word: AttitudeWord; rel: number; reasons: { text: string; tone: 'good' | 'bad' | 'neutral' }[]; }
/** Provinces at which the whole world grows wary of a realm (the fear of the strong, in runAI). */
export const BIG_REALM = 12;

/** One word for how a realm sees the player, and the currents under it: what moves relations each year, what the
 *  realm wants, and what holds it back. Every line is something the game really does. */
export function attitude(s: GameState, id: string, power?: { theirs: number; needed: number }): Attitude {
  const n = s.nations[id], rel = getRel(s, s.player, id), goal = goalOf(s, id);
  const reasons: Attitude['reasons'] = [];
  const war = atWar(s, s.player, id), ally = hasTreaty(s, s.player, id, 'alliance');
  if (hasTreaty(s, s.player, id, 'marriage')) reasons.push({ text: 'A royal marriage joins your houses: relations +3 a year.', tone: 'good' });
  if (ally) reasons.push({ text: 'Your ally: it may join your wars, and will never declare one on you.', tone: 'good' });
  if (hasTreaty(s, s.player, id, 'trade')) reasons.push({ text: 'A trade treaty binds your merchants.', tone: 'good' });
  if (inTruce(s, s.player, id)) reasons.push({ text: 'A truce is in force between you.', tone: 'neutral' });
  if (goal === s.player) reasons.push({ text: `It wants your lands: relations ${GOAL_DRIFT} a year.`, tone: 'bad' });
  else if (goal && goalKnown(s, id)) reasons.push({ text: `Its eyes are on ${nationName(s, goal)}, not on you.`, tone: 'neutral' });
  if (provsOf(s, s.player).length >= BIG_REALM) reasons.push({ text: `You are a great power (${BIG_REALM} provinces or more): every realm grows warier of you, −2 a year.`, tone: 'bad' });
  if (rel > 0 && !hasTreaty(s, s.player, id, 'marriage')) reasons.push({ text: 'Goodwill fades by 1 a year unless renewed.', tone: 'neutral' });
  if (rel < 0) reasons.push({ text: 'Old grudges fade slowly: about +1 every two years.', tone: 'neutral' });
  if (power && !war && !ally) {
    if (power.theirs >= power.needed) reasons.push({ text: 'It is strong enough on your border to attack you.', tone: 'bad' });
    else reasons.push({ text: `It has about ${Math.round((power.theirs / Math.max(1, power.needed)) * 100)}% of the strength it would want before attacking you.`, tone: power.theirs >= power.needed * 0.8 ? 'bad' : 'neutral' });
  }
  const afraid = !!power && power.theirs < power.needed * 0.5 && rel < 30;
  const word: AttitudeWord = war ? 'At war' : n.overlord === s.player ? 'Your subject' : ally ? 'Ally' : rel >= 30 ? 'Friendly'
    : goal === s.player ? 'Rival' : rel <= -30 ? (afraid ? 'Afraid' : 'Hostile') : afraid ? 'Afraid' : rel < 0 ? 'Wary' : 'Neutral';
  return { word, rel, reasons };
}

// ---------- what it has been doing ----------
/** How many deeds a realm's record keeps. */
export const DEEDS_KEPT = 3;
/** Write down something a realm did, newest first, for the player's spies to read. */
export function deed(s: GameState, n: Nation, text: string) {
  n.deeds = [{ year: s.year, text }, ...(n.deeds ?? [])].slice(0, DEEDS_KEPT);
}
/** Can the player read a realm's record? As for its goal: by spies, embassy or alliance. */
export const deedsKnown = (s: GameState, id: string) => (s.nations[id].spiedUntil ?? 0) > s.year || !!s.flags['goal_known_' + id] || hasTreaty(s, s.player, id, 'alliance') || s.nations[id].overlord === s.player;

// ---------- the warning before a war ----------
/** A warning holds this many years: after that, a realm must be seen gathering again before it may strike. */
export const WARNING_VALID = 10;
/** Has this realm been seen gathering against the player, at least a year ago and not too long since? */
export const warned = (s: GameState, id: string) => { const y = s.flags['warned_' + id] ?? 0; return y > 0 && s.year > y && s.year - y <= WARNING_VALID; };
export const warnedNow = (s: GameState, id: string) => (s.flags['warned_' + id] ?? 0) === s.year;
export const markWarned = (s: GameState, id: string) => { s.flags['warned_' + id] = s.year; };


// ---------- the world's ambitions (docs/PLAN-DIRECTION.md, M6) ----------
/** How many of the greatest realms the ambitions list follows (plus any realm that wants your land). */
export const AMBITION_REALMS = 8;
export interface AmbitionLine { text: string; tone: 'good' | 'bad' | 'neutral'; }
export interface Ambition { nation: string; provinces: number; aboutYou: boolean; lines: AmbitionLine[]; }

/** Provinces a realm holds in the overseas regions (the New World and beyond), away from its own: an empire overseas.
 *  Another landmass at home (Norway for Denmark, the Levant for Egypt) is not overseas. */
export const overseasOf = (s: GameState, id: string) => {
  const cap = s.nations[id]?.capital;
  const home = cap ? provRegion(cap) : '';
  return provsOf(s, id).filter(p => { const r = provRegion(p.id); return r !== home && !!REGIONS[r]; }).length;
};

/** What the great powers are after, in plain words, most pressing for you first. A great power's aim is plain to
 *  all; a smaller realm's only when you know it (goalKnown). Pure but for goalOf's yearly memo. */
/** A realm's goal, read without writing its yearly memo, so looking never changes the game. */
function peek<T>(s: GameState, id: string, read: () => T): T {
  const n = s.nations[id];
  if (!n) return read();
  const had = n.goal ? { ...n.goal } : undefined;
  const v = read();
  if (had) n.goal = had; else delete n.goal;
  return v;
}
export const peekGoal = (s: GameState, id: string) => peek(s, id, () => goalOf(s, id));
export function worldAmbitions(s: GameState, isRising: (id: string) => boolean = () => false): Ambition[] {
  const alive = Object.values(s.nations).filter(n => n.alive && n.id !== s.player && n.id !== NO_STATE);
  const big = alive.map(n => ({ n, p: provsOf(s, n.id).length })).sort((a, b) => b.p - a.p || a.n.name.localeCompare(b.n.name));
  const chosen = big.filter((x, i) => i < AMBITION_REALMS || peekGoal(s, x.n.id) === s.player);
  const out: Ambition[] = [];
  for (const { n, p } of chosen) {
    const goal = peekGoal(s, n.id);
    const plain = p >= BIG_REALM || peek(s, n.id, () => goalKnown(s, n.id));
    const lines: AmbitionLine[] = [];
    if (goal === s.player && plain) lines.push({ text: `wants your lands${getRel(s, n.id, s.player) <= -40 ? ', and says so' : ''}`, tone: 'bad' });
    const foes = enemiesOf(s, n.id).filter(x => s.nations[x]?.alive);
    if (foes.includes(s.player)) lines.push({ text: 'is at war with you', tone: 'bad' });
    const others = foes.filter(x => x !== s.player);
    if (others.length) lines.push({ text: `is at war with ${others.slice(0, 2).map(x => nationName(s, x)).join(' and ')}${others.length > 2 ? ` and ${others.length - 2} more` : ''}`, tone: 'neutral' });
    if (goal && goal !== s.player && plain) lines.push({ text: `seeks the lands of ${nationName(s, goal)}`, tone: 'neutral' });
    const far = overseasOf(s, n.id);
    if (far >= 2) lines.push({ text: `builds an empire overseas: ${far} lands`, tone: 'neutral' });
    if (isRising(n.id)) lines.push({ text: 'is rising fast', tone: 'neutral' });
    if (!lines.length) lines.push({ text: plain ? 'keeps to its own affairs' : 'keeps its aims to itself: an embassy or spies would learn them', tone: 'neutral' });
    out.push({ nation: n.id, provinces: p, aboutYou: lines.some(l => l.tone === 'bad'), lines: lines.slice(0, 2) });
  }
  return out.sort((a, b) => Number(b.aboutYou) - Number(a.aboutYou) || b.provinces - a.provinces);
}
