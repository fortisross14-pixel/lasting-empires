// Pace: what still needs the player this turn, and when a run of quiet turns should stop.
// Pure reads of the game state (no RNG, no changes), so the screens and the tests share them.
import type { GameState, Cat, Role, MissionKind } from '../types';
import { CATS } from '../types';
import { CARDS, CAT_INFO, handExcess, buyCost } from './cards';
import { buyBlocked } from './drafts';
import { missionBlocked, cardRoles, DIPLO } from './missions';
import { missionsLeft } from './realm';
import { provsOf, enemiesOf, ageIndex, incomeOf } from './core';
import { warned, warnedNow } from './rivals';
import { wantsPlayer } from './ai';
import { TECHS, BUILDINGS } from '../data/techs';
import { GENRES } from '../data/culture';
import { cultureRows } from './culture';
import { GOODS } from '../data/goods';
import { partners, routeBlocked, NEED_NAMES } from './trade';
import { provKnown } from './overseas';
import { NO_STATE } from '../data/nations';
import { NATIVE_EMPIRES } from '../data/overseas';
import { happinessOf } from './society';
import type { YearReport } from './turn';

/** Is there anything this mission card could be used on right now? */
export function cardHasTarget(s: GameState, cardId: string): boolean {
  const d = CARDS[cardId];
  if (!d || d.kind !== 'mission' || !d.missions) return false;
  const mine = () => provsOf(s, s.player);
  return d.missions.some((kind: MissionKind) => {
    const ok = (target: string, building?: string) => !missionBlocked(s, kind, target, building);
    if (kind === 'conquer' || kind === 'raid' || kind === 'base') {
      const foes = new Set(enemiesOf(s, s.player));
      return foes.size > 0 && Object.values(s.provinces).some(p => foes.has(p.owner) && provKnown(s, p.id) && ok(p.id));
    }
    if (DIPLO.includes(kind)) return Object.values(s.nations).some(n => n.alive && n.id !== s.player && n.id !== NO_STATE && ok(n.id));
    if (kind === 'research') return TECHS.some(t => (!d.track || t.track === d.track) && !s.techs.includes(t.id) && t.age <= ageIndex(s) && ok(t.id));
    if (kind === 'build') {
      const bs = Object.values(BUILDINGS).filter(b => b.group === d.group && (!b.tech || s.techs.includes(b.tech)));
      return mine().some(p => bs.some(b => ok(p.id, b.id)));
    }
    if (kind === 'develop' || kind === 'found' || kind === 'grow' || kind === 'grace' || kind === 'convert' || kind === 'assimilate') return mine().some(p => ok(p.id));
    if (kind === 'assist') return s.missions.some(m => m.kind === 'research' && ok(String(m.id)));
    if (kind === 'artwork') return Object.keys(GENRES).some(g => ok(g));
    if (kind === 'accept') return cultureRows(s).some(r => !r.accepted && ok(r.culture));
    if (kind === 'colonize') return Object.values(s.provinces).some(p => p.owner === NO_STATE && provKnown(s, p.id) && ok(p.id));
    if (kind === 'conquista') return Object.values(s.provinces).some(p => NATIVE_EMPIRES.includes(p.owner) && provKnown(s, p.id) && ok(p.id));
    if (kind === 'post') return Object.values(s.nations).some(n => n.alive && n.id !== s.player && n.id !== NO_STATE && ok(n.id));
    if (kind === 'route') {
      const dirs: ('buy' | 'sell')[] = d.trade ? [d.trade] : ['buy', 'sell'];
      return dirs.some(dir => Object.keys(GOODS).some(g => partners(s, g, dir).some(p => !p.why && !routeBlocked(s, g, dir, p.nation, 1))));
    }
    return ok('');
  });
}

const freeWith = (s: GameState, roles: Role[]) => s.characters.find(c => c.mission == null && roles.includes(c.role));
/** The people who serve each deck (as CAT_ROLES in the screens). */
const DECK_ROLES: Record<Cat, Role[]> = {
  military: ['general', 'conqueror', 'admiral'], diplomacy: ['diplomat', 'explorer'], internal: ['admin', 'colonist'], economy: ['merchant'],
  research: ['researcher'], culture: ['courtier', 'priest', 'artist', 'leader'],
};

export interface Ready { card: string; person: string; count: number; uid: number; }
/** For each deck: a card in hand that a free person could carry out now. Permanent cards (Embassy, Peace Envoy) never count:
 *  they are always there, and nagging about them would teach the player to ignore the list. */
export function readyByDeck(s: GameState): Partial<Record<Cat, Ready>> {
  const out: Partial<Record<Cat, Ready>> = {};
  if (missionsLeft(s) <= 0) return out;
  const seen: Record<string, boolean> = {};
  for (const h of s.hand) {
    const d = CARDS[h.card];
    if (!d || d.kind !== 'mission' || d.permanent || d.burden) continue;
    const who = freeWith(s, cardRoles(h.card));
    if (!who) continue;
    const usable = (seen[h.card] ??= cardHasTarget(s, h.card));
    if (!usable) continue;
    const r = out[d.cat];
    if (r) r.count++; else out[d.cat] = { card: d.name, person: who.name, count: 1, uid: h.uid };
  }
  return out;
}

/** How much a line matters: `urgent` is this season and costs something if ignored; `opportunity` is something a free
 *  person or card can do now; `risk` will hurt later unless met; `long` is work under way (shown, never nagged). */
export type Tier = 'urgent' | 'opportunity' | 'risk' | 'long';
export const TIERS: Tier[] = ['urgent', 'opportunity', 'risk', 'long'];
export const TIER_NAMES: Record<Tier, string> = { urgent: 'Urgent', opportunity: 'Opportunity', risk: 'Risk', long: 'Long-term' };
/** Where a line takes the player: the screen on which the thing can be done. */
export type Jump =
  | { to: 'win'; cat: Cat; tab: string }
  | { to: 'card'; cat: Cat; uid: number }
  | { to: 'province'; id: string }
  | { to: 'nation'; id: string }
  | { to: 'incoming'; id: number }
  | { to: 'sheet'; kind: string };

/** Something still open this turn. `cat`/`tab` name the window that deals with it; `jump`, when set, the exact place. */
export interface Attention { id: string; title: string; text: string; cat: Cat; tab: string; icon: string; tier: Tier; jump?: Jump;
  /** false: already answered (a defence chosen): shown, but it does not stop End Turn again. */
  nag?: boolean; }

/** Shortages above this share of a need are worth a line. */
export const SHORT_ALERT = 0.2;
/** Provinces below this happiness may rise (quarterlyUnrest in realm.ts). */
export const UNREST_ALERT = 25;
/** Provinces below this happiness are worth watching before they reach UNREST_ALERT. */
export const UNEASE_ALERT = 35;
/** A treasury that runs dry within this many quarters is a risk worth a line. */
export const DEBT_QUARTERS = 4;
/** The most lines the agenda panel over the map shows at once (the full list is one tap away). */
export const AGENDA_MAX = 4;

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** What the player may want to do before ending the turn, most pressing first. Every line can be acted on. */
export function attention(s: GameState): Attention[] {
  const out: Attention[] = [];
  if (s.over) return out;
  const mine = provsOf(s, s.player);
  // ----- urgent: this season -----
  for (const inc of s.incoming ?? []) {
    const n = s.nations[inc.nation], p = s.provinces[inc.target];
    if (!n || !p) continue;
    out.push({ id: 'incoming:' + inc.id, tier: 'urgent', title: `${n.name} marches on ${p.name}`, text: inc.chosen ? `They arrive when this season ends. ${plural(inc.defenders?.length ?? 0, 'company')} stand${(inc.defenders?.length ?? 0) === 1 ? 's' : ''} ready: change who defends.` : 'They arrive when this season ends. Choose a commander and the companies who hold.', cat: 'military', tab: 'wars', icon: 'sword', jump: { to: 'incoming', id: inc.id }, nag: !inc.chosen });
  }
  const held = Object.values(s.provinces).filter(p => p.occupiedFrom === s.player && p.owner !== s.player);
  if (held.length) out.push({ id: 'occupied', tier: 'urgent', title: `${held.length === 1 ? held[0].name + ' is' : plural(held.length, 'province') + ' are'} held by the enemy`, text: `${held.slice(0, 3).map(p => `${p.name} (${s.nations[p.owner]?.name ?? 'the enemy'})`).join(', ')}${held.length > 3 ? '…' : ''}. Take ${held.length === 1 ? 'it' : 'them'} back before the peace.`, cat: 'military', tab: 'wars', icon: 'tower', jump: { to: 'province', id: held[0].id } });
  const restless = mine.filter(p => happinessOf(s, p).value < UNREST_ALERT);
  if (restless.length) out.push({ id: 'unrest', tier: 'urgent', title: `${plural(restless.length, 'province')} close to revolt`, text: `${restless.slice(0, 3).map(p => p.name).join(', ')}${restless.length > 3 ? '…' : ''}: happiness below ${UNREST_ALERT}%. A rising is possible every season.`, cat: 'culture', tab: 'cultures', icon: 'mood', jump: restless.length === 1 ? { to: 'province', id: restless[0].id } : { to: 'win', cat: 'culture', tab: 'cultures' } });
  const ex = handExcess(s);
  if (ex.total > 0) {
    const cat = (Object.keys(ex.byCat) as Cat[])[0] ?? 'military';
    out.push({ id: 'hand', tier: 'urgent', title: `Hand over the limit by ${ex.total}`, text: `Sell ${ex.total === 1 ? 'a card' : ex.total + ' cards'} before the season can end.`, cat, tab: 'cards', icon: 'cards', jump: { to: 'win', cat, tab: 'cards' } });
  }
  // ----- opportunities: a free person and a card -----
  const ready = readyByDeck(s);
  for (const c of CATS) {
    const r = ready[c];
    if (r) out.push({ id: 'deck:' + c, tier: 'opportunity', title: `${CAT_INFO[c].name}: ${r.card}${r.count > 1 ? ` and ${r.count - 1} more` : ''}`, text: `${r.person} is free to carry it out.`, cat: c, tab: 'cards', icon: CAT_INFO[c].icon, jump: { to: 'card', cat: c, uid: r.uid } });
  }
  // someone with nothing to carry, in a deck where a new card would give them work
  if (missionsLeft(s) > 0) for (const c of ['internal', 'economy', 'research', 'culture'] as Cat[]) {
    if (ready[c]) continue;
    const who = freeWith(s, DECK_ROLES[c]);
    if (!who || buyBlocked(s, c, 'action')) continue;
    out.push({ id: 'idle:' + c, tier: 'opportunity', title: `${who.name} has no task`, text: `${/^[AEIOU]/.test(CAT_INFO[c].name) ? 'An' : 'A'} ${CAT_INFO[c].name} card costs ${buyCost(s, c)} nation points (you have ${Math.floor(s.np)}).`, cat: c, tab: 'cards', icon: 'people', jump: { to: 'win', cat: c, tab: 'cards' } });
  }
  // ----- risks: what will hurt later -----
  for (const n of Object.values(s.nations)) {
    if (!n.alive || n.id === s.player || !(warned(s, n.id) || warnedNow(s, n.id)) || !wantsPlayer(s, n)) continue;
    const since = s.flags['warned_' + n.id] ?? s.year;
    out.push({ id: 'warning:' + n.id, tier: 'risk', title: `${n.name} gathers on your border`, text: `It may declare war from ${since + 1}. Make a friend who fears it, win it over, or raise the frontier walls.`, cat: 'diplomacy', tab: 'realms', icon: 'sword', jump: { to: 'nation', id: n.id } });
  }
  const me = s.nations[s.player];
  if (me) {
    const yearly = incomeOf(s, s.player).total;
    if (yearly < 0) {
      const q = Math.floor(Math.max(0, me.gold) / (-yearly / 4));
      if (q < DEBT_QUARTERS) out.push({ id: 'debt', tier: q < 1 ? 'urgent' : 'risk', title: q < 1 ? 'The treasury is empty' : `The treasury runs dry in ${plural(q, 'season')}`, text: `You spend ${Math.round(-yearly)} ducats a year more than you earn. Cut upkeep, open a route, or raise taxes.`, cat: 'economy', tab: 'ledger', icon: 'coin', jump: { to: 'win', cat: 'economy', tab: 'ledger' } });
    }
  }
  const uneasy = mine.filter(p => { const v = happinessOf(s, p).value; return v >= UNREST_ALERT && v < UNEASE_ALERT; });
  if (uneasy.length) out.push({ id: 'unease', tier: 'risk', title: uneasy.length === 1 ? `${uneasy[0].name} at ${Math.round(happinessOf(s, uneasy[0]).value)}% happiness` : `${plural(uneasy.length, 'province')} grow uneasy`, text: `${uneasy.length === 1 ? '' : uneasy.slice(0, 3).map(p => p.name).join(', ') + (uneasy.length > 3 ? '…' : '') + ': '}a revolt becomes possible below ${UNREST_ALERT}%.`, cat: 'culture', tab: 'cultures', icon: 'mood', jump: uneasy.length === 1 ? { to: 'province', id: uneasy[0].id } : { to: 'win', cat: 'culture', tab: 'cultures' } });
  for (const [g, v] of Object.entries(s.short ?? {})) {
    if (v <= SHORT_ALERT) continue;
    const name = NEED_NAMES[g] ?? GOODS[g]?.name ?? g;
    out.push({ id: 'short:' + g, tier: 'risk', title: `${name} runs short`, text: `${Math.round(v * 100)}% of what the realm needs is missing. ${s.steward?.on ? 'The steward\'s purse does not cover it: open a route, build for it, or give him more.' : 'Open a route or build for it, or put the steward in office.'}`, cat: 'economy', tab: 'goods', icon: 'coin', jump: { to: 'win', cat: 'economy', tab: 'goods' } });
  }
  return out.sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
}

/** The Empire Agenda: what needs you, then the work under way. Long-term lines are for reading and never stop a turn. */
export function agenda(s: GameState, att: Attention[] = attention(s)): Attention[] {
  const out = [...att];
  if (s.over) return out;
  // the study nearest to done, and how many are under way
  const studies = s.missions.filter(m => m.kind === 'research').map(m => ({ m, left: m.turnsLeft })).sort((a, b) => a.left - b.left);
  if (studies.length) {
    const { m } = studies[0];
    const t = TECHS.find(x => x.id === m.target);
    out.push({ id: 'study:' + m.id, tier: 'long', title: `${t?.name ?? 'A study'}: ${m.turnsLeft >= 8 ? `${Math.round(m.turnsLeft / 4)} years` : plural(Math.max(1, m.turnsLeft), 'season')} to go`, text: studies.length > 1 ? `${studies.length - 1} more under way.` : 'A second scholar on an Assist card speeds it up.', cat: 'research', tab: 'tech', icon: 'book', nag: false, jump: { to: 'win', cat: 'research', tab: 'tech' } });
  }
  const others = s.missions.filter(m => m.kind !== 'research' && m.kind !== 'route' && m.kind !== 'assist');
  if (others.length) {
    const m = [...others].sort((a, b) => a.turnsLeft - b.turnsLeft)[0];
    out.push({ id: 'tasks', tier: 'long', title: `${plural(others.length, 'task')} under way`, text: `The next ends in ${plural(Math.max(1, m.turnsLeft), 'season')}.`, cat: 'internal', tab: 'cards', icon: 'scroll', nag: false, jump: { to: 'sheet', kind: 'missions' } });
  }
  return out;
}

// ---------- skipping quiet turns ----------
/** The most quarters one press of "skip ahead" may play. */
export const SKIP_MAX = 8;

/** What the game looked like before a turn, to tell afterwards whether anything happened. */
export interface TurnMark { missions: number[]; wars: number; todo: string[]; year: number; }
export const markTurn = (s: GameState): TurnMark => ({ missions: s.missions.map(m => m.id), wars: s.wars.filter(w => w.a === s.player || w.b === s.player).length, todo: attention(s).map(a => a.id), year: s.year });

export type StopReason = 'over' | 'prompt' | 'card' | 'task' | 'war' | 'hand' | 'todo' | 'report';
/** After a turn: why the player should look at the game now. Empty means the turn was quiet. */
export function stopReasons(s: GameState, before: TurnMark, rep: YearReport | null): StopReason[] {
  const out: StopReason[] = [];
  if (s.over) out.push('over');
  if (s.queue.length) out.push('prompt');
  if (rep && Object.values(rep.cards).some(n => n > 0)) out.push('card');
  if (before.missions.some(id => !s.missions.some(m => m.id === id))) out.push('task');
  if (s.wars.filter(w => w.a === s.player || w.b === s.player).length !== before.wars) out.push('war');
  if (handExcess(s).total > 0) out.push('hand');
  if (attention(s).some(a => !before.todo.includes(a.id))) out.push('todo');
  // the year's report is worth a stop when the year had battles or finished tasks
  if (s.year !== before.year && s.turnLog && (s.turnLog.battles.length || s.turnLog.done.length)) out.push('report');
  return out;
}

