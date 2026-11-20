// Pace: what still needs the player this turn, and when a run of quiet turns should stop.
// Pure reads of the game state (no RNG, no changes), so the screens and the tests share them.
import type { GameState, Cat, Role, MissionKind } from '../types';
import { CATS } from '../types';
import { CARDS, CAT_INFO, handExcess, buyCost } from './cards';
import { buyBlocked } from './drafts';
import { missionBlocked, cardRoles, DIPLO } from './missions';
import { missionsLeft } from './realm';
import { provsOf, enemiesOf, ageIndex } from './core';
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
    if (kind === 'research') return TECHS.some(t => t.track === d.track && !s.techs.includes(t.id) && t.age <= ageIndex(s) && ok(t.id));
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

export interface Ready { card: string; person: string; count: number; }
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
    if (r) r.count++; else out[d.cat] = { card: d.name, person: who.name, count: 1 };
  }
  return out;
}

/** Something still open this turn. `cat`/`tab` name the window that deals with it. */
export interface Attention { id: string; title: string; text: string; cat: Cat; tab: string; icon: string; }

/** Shortages above this share of a need are worth a line. */
export const SHORT_ALERT = 0.2;
/** Provinces below this happiness may rise (quarterlyUnrest in realm.ts). */
export const UNREST_ALERT = 25;

/** What the player may want to do before ending the turn, most pressing first. */
export function attention(s: GameState): Attention[] {
  const out: Attention[] = [];
  if (s.over) return out;
  const ready = readyByDeck(s);
  for (const c of CATS) {
    const r = ready[c];
    if (r) out.push({ id: 'deck:' + c, title: `${CAT_INFO[c].name}: ${r.card}${r.count > 1 ? ` and ${r.count - 1} more` : ''}`, text: `${r.person} is free to carry it out.`, cat: c, tab: 'cards', icon: CAT_INFO[c].icon });
  }
  // someone with nothing to carry, in a deck where a new card would give them work
  if (missionsLeft(s) > 0) for (const c of ['internal', 'economy', 'research', 'culture'] as Cat[]) {
    if (ready[c]) continue;
    const who = freeWith(s, DECK_ROLES[c]);
    if (!who || buyBlocked(s, c, 'action')) continue;
    out.push({ id: 'idle:' + c, title: `${who.name} has no task`, text: `A ${CAT_INFO[c].name} card costs ${buyCost(s, c)} nation points (you have ${Math.floor(s.np)}).`, cat: c, tab: 'cards', icon: 'people' });
  }
  for (const [g, v] of Object.entries(s.short ?? {})) {
    if (v <= SHORT_ALERT) continue;
    const name = NEED_NAMES[g] ?? GOODS[g]?.name ?? g;
    out.push({ id: 'short:' + g, title: `${name} runs short`, text: `${Math.round(v * 100)}% of what the realm needs is missing. ${s.steward?.on ? 'The steward\'s purse does not cover it: open a route, build for it, or give him more.' : 'Open a route or build for it, or put the steward in office.'}`, cat: 'economy', tab: 'goods', icon: 'coin' });
  }
  const restless = provsOf(s, s.player).filter(p => happinessOf(s, p).value < UNREST_ALERT);
  if (restless.length) out.push({ id: 'unrest', title: `${restless.length} province${restless.length > 1 ? 's' : ''} close to revolt`, text: `${restless.slice(0, 3).map(p => p.name).join(', ')}${restless.length > 3 ? '…' : ''}: happiness below ${UNREST_ALERT}%.`, cat: 'culture', tab: 'cultures', icon: 'mood' });
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

