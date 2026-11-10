// Forms of government and the revolutions that change them.
// A revolution splits the realm: the far provinces rise for the old order with troops of their own.
// Take their capital and the new government stands; lose your own capital first, or run out of time, and it fails.
import type { GameState, TroopCard } from '../types';
import { GOVS } from '../data/governments';
import { player, provsOf, uid, push, log, clamp, rand, declareWar, makePeace, enemiesOf, govOf, hasTech } from './core';
import { createNation } from './realm';
import { getGeo } from './map';
import { CARDS } from './cards';

export const REVOLUTION_YEARS = 12;
/** How many times their army must be broken before their capital gives up. */
export const BREAKS = 3;

/** Why this realm cannot start a revolution towards this government now. */
export function revolutionBlocked(s: GameState, to: string): string | null {
  const g = GOVS[to];
  if (!g) return 'Unknown government';
  if ((s.gov ?? 'feudal') === to) return 'This is already your government';
  if (g.tech && !hasTech(s, g.tech)) return `Research ${g.tech === 'councils' ? 'Royal Councils' : g.tech === 'absolutism' ? 'Absolutism' : g.tech === 'enlightened' ? 'Enlightened Government' : 'the Encyclopaedia'} first`;
  if (s.revolution) return 'A revolution is already under way';
  if (enemiesOf(s, s.player).length) return 'Not in wartime: make peace first';
  if (provsOf(s, s.player).length < 4 || revolutionLands(s).length < 1) return 'Your realm is too small to split: 4 provinces joined by land at least';
  if (!s.hand.some(h => h.card === 'revolution')) return 'Needs a Revolution card (Internal)';
  return null;
}

/** Provinces that would rise: the farthest from your capital by land, about two in five of the realm. Overseas lands stay loyal. */
export function revolutionLands(s: GameState): string[] {
  const me = player(s);
  const mine = new Set(provsOf(s, s.player).map(p => p.id));
  const dist: Record<string, number> = { [me.capital]: 0 };
  const queue = [me.capital];
  while (queue.length) {
    const id = queue.shift()!;
    for (const nb of getGeo().adj[id] ?? []) if (mine.has(nb) && dist[nb] == null) { dist[nb] = dist[id] + 1; queue.push(nb); }
  }
  const far = [...mine].filter(id => id !== me.capital && dist[id] != null).sort((a, b) => dist[b] - dist[a] || s.provinces[b].dev - s.provinces[a].dev);
  const n = clamp(Math.round(mine.size * 0.4), 1, Math.max(1, far.length - 1));
  return far.slice(0, n);
}

export function startRevolution(s: GameState, to: string): string | null {
  const why = revolutionBlocked(s, to);
  if (why) return why;
  const me = player(s);
  const card = s.hand.find(h => h.card === 'revolution')!;
  s.hand = s.hand.filter(h => h !== card);
  const from = s.gov ?? 'feudal';
  const lands = revolutionLands(s);
  const landSet = new Set(lands);
  // their capital stands on the front line: the richest rising province that borders what stays loyal
  const front = lands.filter(id => (getGeo().adj[id] ?? []).some(nb => s.provinces[nb]?.owner === s.player && !landSet.has(nb)));
  const capital = [...(front.length ? front : lands)].sort((a, b) => s.provinces[b].dev - s.provinces[a].dev)[0];
  // troops stationed in the rising provinces go over to the old order
  const turncoats = s.troops.filter(t => t.mission == null && t.loc && landSet.has(t.loc));
  s.troops = s.troops.filter(t => !turncoats.includes(t));
  const size = Math.max(4, Math.round(s.troops.length * 0.6 + lands.length * 0.5));
  const cap = s.provinces[capital];
  const n = createNation(s, { id: 'revolt', name: `${me.adj} ${GOVS[to].rebels}`, adj: me.adj, culture: cap.culture, religion: cap.religion, capital, provinces: lands, armySize: size, ruler: GOVS[to].rebels });
  // they fight with the same kinds of troops as you, plus the turncoats
  const kinds = s.troops.length ? s.troops.map(t => t.type) : ['levy', 'men_at_arms'];
  n.army = [...n.army.map(t => ({ ...t, type: kinds[Math.floor(rand(s) * kinds.length)] })), ...turncoats.map(t => ({ uid: uid(s), type: t.type, vet: t.vet, str: t.str } as TroopCard))];
  n.personality = 'expansionist';
  n.gold = 150;
  s.revolution = { to, from, rebel: n.id, rebelCapital: capital, myCapital: me.capital, since: s.year };
  declareWar(s, n.id, s.player);
  s.hand.push({ uid: uid(s), card: 'march_orders' }); // a third set of orders for the decisive march
  me.stability = clamp(me.stability - 1, -3, 3);
  push(s, { kind: 'reveal', alarm: true, title: 'Revolution!', subtitle: `Towards ${GOVS[to].name}`, items: [
    { title: `The ${n.name} rise`, text: `${lands.length} province${lands.length > 1 ? 's' : ''} rise${lands.length > 1 ? '' : 's'} for the old order with ${n.army.length} companies${turncoats.length ? `, ${turncoats.length} of them your own troops who changed sides` : ''}.`, tone: 'bad', kind: 'torch' },
    { title: 'To win', text: `Take their capital, ${cap.name}, or destroy every company they have. The rest of their land then returns to you and your new government stands.`, tone: 'good', kind: 'crown' },
    { title: 'You lose if', text: `They take your capital, ${s.provinces[me.capital].name}, first, or ${REVOLUTION_YEARS} years pass. Then the revolution fails: you lose treasure, cards and stability.`, tone: 'bad', kind: 'skull' },
  ] });
  log(s, `Revolution: the ${n.name} rise against the change to ${GOVS[to].name}.`, 'bad');
  return null;
}

function endRevolution(s: GameState, won: boolean) {
  const r = s.revolution!;
  const why = won ? 'rev_won' : s.provinces[r.myCapital]?.owner !== s.player ? 'rev_lost_capital' : 'rev_lost_time';
  s.flags[why] = (s.flags[why] ?? 0) + 1;
  s.flags.rev_years = (s.flags.rev_years ?? 0) + (s.year - r.since);
  const me = player(s);
  const n = s.nations[r.rebel];
  // whoever wins, the land comes back together under the crown
  for (const p of Object.values(s.provinces)) if (p.owner === r.rebel || (p.id === r.myCapital && !won)) { p.owner = s.player; p.control = Math.min(p.control, 50); }
  if (n) { if (s.wars.some(w => [w.a, w.b].includes(n.id))) makePeace(s, s.player, n.id); n.alive = false; n.army = []; }
  s.truces = s.truces.filter(t => t.a !== r.rebel && t.b !== r.rebel);
  delete s.revolution;
  const g = GOVS[r.to];
  if (won) {
    s.gov = r.to;
    me.stability = clamp(me.stability + 1 + (g.fx.stability ?? 0), -3, 3);
    me.prestige += 10;
    push(s, { kind: 'reveal', title: 'The revolution triumphs', subtitle: `${me.name} is now a ${g.name}`, items: [
      { title: g.name, text: g.buffs.join('. ') + '.', tone: 'good', kind: g.icon },
      { title: 'The realm made whole', text: 'The rebel provinces return to you. Stability +1, prestige +10.', tone: 'good', kind: 'crown' },
    ] });
    log(s, `The revolution triumphs: ${me.name} becomes a ${g.name}.`, 'good');
  } else {
    const lost = Math.round(me.gold * 0.4);
    me.gold -= lost;
    const drop = s.hand.filter(h => !CARDS[h.card]?.burden && !CARDS[h.card]?.permanent).sort(() => rand(s) - 0.5).slice(0, 3);
    s.hand = s.hand.filter(h => !drop.includes(h));
    me.stability = clamp(me.stability - 2, -3, 3);
    me.prestige = Math.max(0, me.prestige - 15);
    push(s, { kind: 'reveal', alarm: true, title: 'The revolution fails', subtitle: `${GOVS[r.from].name} remains`, items: [
      { title: 'The old order wins', text: `You keep your lands and your ${GOVS[r.from].name}, but lose ${lost} ducats, ${drop.length} cards, 2 stability and 15 prestige.`, tone: 'bad', kind: 'skull' },
    ] });
    log(s, 'The revolution fails.', 'bad');
  }
}

/** Each quarter: has either side's capital fallen? */
export function quarterlyRevolution(s: GameState) {
  const r = s.revolution;
  if (!r) return;
  const n = s.nations[r.rebel];
  if (!n?.alive || s.provinces[r.rebelCapital]?.owner === s.player || !provsOf(s, r.rebel).length) return endRevolution(s, true);
  // their last army broken: the capital opens its gates
  // their army broken: once, they call up new levies; twice, the capital opens its gates
  if (!n.army.length) {
    r.broken = (r.broken ?? 0) + 1;
    if (r.broken >= BREAKS) { log(s, `The ${n.name} have no army left: ${s.provinces[r.rebelCapital].name} opens its gates.`, 'good'); s.provinces[r.rebelCapital].owner = s.player; return endRevolution(s, true); }
    const k = Math.max(2, Math.ceil(provsOf(s, r.rebel).length / 2));
    for (let i = 0; i < k; i++) n.army.push({ uid: uid(s), type: i % 2 ? 'men_at_arms' : 'levy', vet: 0, str: 100 });
    push(s, { kind: 'reveal', title: 'The rebels call up new levies', items: [{ title: n.name, text: `Their army is broken (${r.broken} of ${BREAKS}), but they raise ${k} new companies. Break them ${BREAKS} times, or take ${s.provinces[r.rebelCapital].name}, and the revolution is won.`, tone: 'neutral', kind: 'torch' }] });
  }
  if (s.provinces[r.myCapital]?.owner !== s.player || s.year - r.since >= REVOLUTION_YEARS) return endRevolution(s, false);
}

export const govName = (s: GameState) => govOf(s).name;
