// Buying cards with nation points, hiring people, forging troops, and ambitions.
import { troopPower } from './core';
import type { TroopCard } from '../types';
import { getGeo } from './map';
import type { GameState, DraftOption, Character, Cat, Role } from '../types';
import { TROOPS, RECIPES, type Recipe } from '../data/troops';
import { LEGENDS } from '../data/characters';
import { player, hasTech, rand, uid, genCharacter, courtCap, courtCount, provsOf, log, inflation } from './core';
import { CARDS, buyCost, randomCard, removeCard, handOf, handLimit, addCard, poolOf, type CardType } from './cards';

// ---------- buying cards ----------
export function buyBlocked(s: GameState, cat: Cat, type?: CardType): string | null {
  const c = buyCost(s, cat);
  if (handOf(s, cat).length >= handLimit(s)) return `Your ${cat} hand is full (${handLimit(s)}; a bigger realm holds more)`;
  if (type && !poolOf(s, cat, type).length) return 'Nothing of this kind to buy yet';
  return s.np < c ? `Needs ${c} nation points` : null;
}

/** Spend nation points on a card of one type: three are revealed and you keep one; if the deck has only one such card, you get it straight away. */
export function buyCard(s: GameState, cat: Cat, type?: CardType): string | null {
  const why = buyBlocked(s, cat, type);
  if (why) return why;
  s.np -= buyCost(s, cat);
  s.bought[cat] = (s.bought[cat] ?? 0) + 1;
  if (type && poolOf(s, cat, type).length === 1) { addCard(s, poolOf(s, cat, type)[0].id, true); return null; }
  const opts: DraftOption[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 12 && opts.length < 3; i++) {
    const c = randomCard(s, cat, type);
    if (seen.has(c) && i < 9) continue;
    seen.add(c);
    opts.push({ t: 'card', card: c });
  }
  s.queue.unshift({ kind: 'draft', draft: 'buy', cat, options: opts });
  return null;
}

// ---------- hiring people ----------
export function legendsAvailable(s: GameState, role?: Role) {
  return LEGENDS.filter(l => !s.usedLegends.includes(l.id) && s.year >= l.from && s.year < l.to - 2 && (!l.nations || l.nations.includes(s.player)) && (!role || l.role === role));
}

export function courtOptions(s: GameState, role?: Role, legendBoost = 0): DraftOption[] {
  const out: DraftOption[] = [];
  const culture = player(s).culture;
  const roles: Role[] = role ? [role, role, role] : (['general', 'diplomat', 'admin', 'researcher'] as Role[]).sort(() => rand(s) - 0.5);
  const legends = legendsAvailable(s, role);
  for (let i = 0; i < 3; i++) {
    if (legends.length && rand(s) < 0.12 + legendBoost * 0.08) {
      const l = legends.splice(Math.floor(rand(s) * legends.length), 1)[0];
      out.push({ t: 'char', ch: { uid: uid(s), name: l.name, role: l.role, skill: l.skill, traits: [...l.traits], born: s.year - 30, dies: l.to, rarity: 'legendary', xp: 0, legendId: l.id } });
    } else {
      out.push({ t: 'char', ch: genCharacter(s, roles[i], culture) });
    }
  }
  return out;
}

/** Play a hire card: costs 1 manpower, then three candidates are revealed. */
export function hireWithCard(s: GameState, handUid: number): string | null {
  const h = s.hand.find(x => x.uid === handUid);
  const def = h && CARDS[h.card];
  if (!def || def.kind !== 'hire') return 'Not a hiring card';
  if (player(s).manpower < 1) return 'Needs 1 manpower';
  if (courtCount(s) >= courtCap(s)) return `Your court is full (${courtCap(s)}). Dismiss someone first.`;
  player(s).manpower -= 1;
  removeCard(s, handUid);
  s.queue.unshift({ kind: 'draft', draft: 'court', options: courtOptions(s, def.role) });
  return null;
}

export function takeDraftOption(s: GameState, opt: DraftOption) {
  if (opt.t === 'troop') s.troops.push({ uid: uid(s), type: opt.type, vet: opt.vet, str: 100 });
  else if (opt.t === 'card') s.hand.push({ uid: uid(s), card: opt.card });
  else if (opt.t === 'char') {
    s.characters.push(opt.ch);
    if (opt.ch.legendId) { s.usedLegends.push(opt.ch.legendId); log(s, `${opt.ch.name} joins your court!`, 'good'); }
  } else if (opt.t === 'ambition') s.ambition = opt.id;
}

// ---------- forging ----------
export interface MergeResult { out: string; vet: number; cost: number; tech?: string; recipe?: Recipe; might: number; before: number; after: number; }

/** Two companies forged into one keep most of their strength: about 1.8 times the stronger alone. */
export const FORGE_KEEP = 0.9;
const MAX_MIGHT = 4;

/** a and b are troop uids or equipment-card uids from the hand. */
export function mergePreview(s: GameState, aUid: number, bUid: number): MergeResult | { error: string } {
  const find = (u: number) => s.troops.find(t => t.uid === u) ?? s.fleet.find(t => t.uid === u);
  const ta = find(aUid), tb = find(bUid);
  const eqType = (u: number) => { const h = s.hand.find(x => x.uid === u); return h && CARDS[h.card].kind === 'equip' ? CARDS[h.card].equip : undefined; };
  const ea = eqType(aUid), eb = eqType(bUid);
  const A = ta?.type ?? ea, B = tb?.type ?? eb;
  if (!A || !B || aUid === bUid) return { error: 'Pick two cards' };
  if (!ta && !tb) return { error: 'At least one card must be a troop' };
  if ((ta?.mission ?? tb?.mission) != null) return { error: 'That troop is away on a mission' };
  const full = (t: TroopCard) => troopPower({ ...t, str: 100 });
  const base = (type: string, vet: number) => troopPower({ type, vet, str: 100 });
  if (ta && tb && ta.type === tb.type) {
    // two of a kind: one company with the weight of nearly two
    const vet = Math.max(ta.vet, tb.vet);
    const before = Math.max(full(ta), full(tb)), target = FORGE_KEEP * (full(ta) + full(tb));
    const might = Math.min(MAX_MIGHT, Math.round((target / base(ta.type, vet)) * 10) / 10);
    if (might <= Math.max(ta.might ?? 1, tb.might ?? 1)) return { error: `Already as strong as a company can be (×${MAX_MIGHT})` };
    return { out: ta.type, vet, might, before, after: base(ta.type, vet) * might, cost: Math.round((8 + TROOPS[ta.type].tier * 8) * inflation(s) * might / 1.8) };
  }
  const troop = ta ?? tb!, other = ta ? (tb?.type ?? eb) : ea!;
  if (other === 'banner') {
    if (troop.vet >= 3) return { error: 'Already at 3 stars' };
    return { out: troop.type, vet: troop.vet + 1, might: troop.might ?? 1, before: full(troop), after: base(troop.type, troop.vet + 1) * (troop.might ?? 1), cost: Math.round(5 * inflation(s)) };
  }
  const r = RECIPES.find(x => (x.a === A && x.b === B) || (x.a === B && x.b === A));
  if (!r) return { error: 'These cards do not combine' };
  const vet = Math.max(ta?.vet ?? 0, tb?.vet ?? 0);
  const cost = Math.round(r.cost * inflation(s));
  // two companies make a better kind of company and keep 90% of their joint strength; equipment upgrades one
  const before = Math.max(ta ? full(ta) : 0, tb ? full(tb) : 0);
  const might = ta && tb ? Math.min(MAX_MIGHT, Math.max(1, Math.round((FORGE_KEEP * (full(ta) + full(tb)) / base(r.out, vet)) * 10) / 10)) : (troop.might ?? 1);
  const res = { out: r.out, vet, cost, recipe: r, might, before, after: base(r.out, vet) * might };
  if (r.tech && !hasTech(s, r.tech)) return { ...res, tech: r.tech };
  return res;
}

export function doMerge(s: GameState, aUid: number, bUid: number): string | null {
  const res = mergePreview(s, aUid, bUid);
  if ('error' in res) return res.error;
  if (res.tech) return 'Research needed first';
  if (player(s).gold < res.cost) return `Needs ${res.cost} ducats`;
  s.flags.stat_forged = (s.flags.stat_forged ?? 0) + 1;
  const parts = [aUid, bUid];
  const isShip = TROOPS[res.out].kind === 'ship';
  const strs = [...s.troops, ...s.fleet].filter(t => parts.includes(t.uid)).map(t => t.str);
  const str = Math.round(strs.reduce((a, b) => a + b, 0) / strs.length);
  player(s).gold -= res.cost;
  s.troops = s.troops.filter(t => !parts.includes(t.uid));
  s.fleet = s.fleet.filter(t => !parts.includes(t.uid));
  s.hand = s.hand.filter(h => !parts.includes(h.uid));
  (isShip ? s.fleet : s.troops).push({ uid: uid(s), type: res.out, vet: res.vet, str: Math.max(str, 60), ...(res.might > 1 ? { might: res.might } : {}) });
  log(s, `Forged a new unit: ${TROOPS[res.out].name}${res.vet ? ' ' + '★'.repeat(res.vet) : ''}.`, 'good');
  return null;
}

// ---------- ambitions ----------
export interface AmbitionDef { id: string; name: string; text: string; reward: number; deadline?: number; nations?: string[]; check: (s: GameState) => boolean; }

const owns = (s: GameState, ids: string[]) => ids.every(id => s.provinces[id]?.owner === s.player);
const IBERIAN_CROWNS = ['castile', 'granada', 'portugal', 'navarre', 'aragon'];
let IBERIA_C: string[] | null = null, AFRICA_C: string[] | null = null;
const IBERIA = () => (IBERIA_C ??= getGeo().seeds.filter(x => IBERIAN_CROWNS.includes(x.owner) && getGeo().land[x.id] === getGeo().land.madrid && x.lat < 44).map(x => x.id));
const AFRICA = () => (AFRICA_C ??= getGeo().seeds.filter(x => x.region === 'north_africa' && x.lon < 12).map(x => x.id));

export const AMBITIONS: AmbitionDef[] = [
  { id: 'reconquista', name: 'Reconquista', text: 'Own Granada and Málaga before 1500.', reward: 40, deadline: 1500, nations: ['castile', 'aragon', 'portugal', 'navarre'], check: s => owns(s, ['granada', 'malaga']) },
  { id: 'iberia', name: 'Lord of Iberia', text: 'Own every province of the Iberian peninsula.', reward: 90, nations: IBERIAN_CROWNS, check: s => owns(s, IBERIA()) },
  { id: 'italy', name: 'The Italian Crown', text: 'Own Naples, Milan and Rome.', reward: 70, nations: ['aragon', 'castile', 'france', 'austria', 'milan', 'venice', 'florence', 'papacy', 'naples', 'savoy', 'genoa'], check: s => owns(s, ['naples', 'milan', 'rome']) },
  { id: 'islands', name: 'Mare Nostrum', text: 'Own Sicily, Sardinia, Corsica and Majorca.', reward: 50, nations: ['aragon', 'castile', 'genoa', 'naples', 'france', 'tunis', 'ottomans'], check: s => owns(s, ['palermo', 'cagliari', 'corsica', 'majorca']) },
  { id: 'africa', name: 'The African Shore', text: 'Own 4 provinces in North Africa.', reward: 55, nations: ['castile', 'aragon', 'portugal', 'granada', 'ottomans', 'morocco', 'tlemcen', 'tunis', 'mamluks'], check: s => AFRICA().filter(id => s.provinces[id]?.owner === s.player).length >= 4 },
  { id: 'indies', name: 'Beyond the Seas', text: 'Own 3 provinces outside your home region.', reward: 70, check: s => { const home = getGeo().seeds.find(x => x.id === s.nations[s.player].capital)?.region; return provsOf(s, s.player).filter(p => getGeo().seeds.find(x => x.id === p.id)?.region !== home).length >= 3; } },
  { id: 'great_power', name: 'A Great Power', text: 'Double the provinces you started with (at least 6).', reward: 70, check: s => provsOf(s, s.player).length >= Math.max(6, 2 * (s.flags.start_provs ?? 3)) },
  { id: 'faith', name: 'Defender of the Faith', text: 'Have every province share your state faith (at least 8).', reward: 50, check: s => { const ps = provsOf(s, s.player); return ps.length >= 8 && ps.every(p => p.religion === s.stateReligion); } },
  { id: 'merchant', name: 'Merchant Prince', text: 'Hold 6 trade treaties at once.', reward: 50, check: s => s.treaties.filter(t => t.kind === 'trade' && (t.a === s.player || t.b === s.player)).length >= 6 },
  { id: 'army', name: 'Army of Legend', text: 'Field 4 troops of Tercio quality or better (tier 4+).', reward: 50, check: s => s.troops.filter(t => TROOPS[t.type].tier >= 4).length >= 4 },
  { id: 'scholar', name: 'Light of Learning', text: 'Research 15 technologies.', reward: 50, check: s => s.techs.length >= 15 },
  { id: 'builder', name: 'The Builder King', text: 'Have 12 buildings across your realm.', reward: 45, check: s => provsOf(s, s.player).reduce((a, p) => a + p.buildings.length, 0) >= 12 },
  { id: 'cities', name: 'City of Cities', text: 'Have 4 cities or metropolises.', reward: 45, check: s => provsOf(s, s.player).filter(p => (p.settlement ?? 0) >= 3).length >= 4 },
];

export function ambitionOptions(s: GameState): DraftOption[] {
  const pool = AMBITIONS.filter(a => !a.nations || a.nations.includes(s.player));
  const out: DraftOption[] = [];
  while (out.length < 3 && pool.length) out.push({ t: 'ambition', id: pool.splice(Math.floor(rand(s) * pool.length), 1)[0].id });
  return out;
}


// ---------- sale of offices: ducats into nation points ----------
export const officeCost = (s: GameState) => Math.round(40 * inflation(s) * (1 + (s.flags['offices_' + s.year] ?? 0)));
export function sellOffices(s: GameState): string | null {
  const c = officeCost(s);
  if (player(s).gold < c) return `Needs ${c} ducats`;
  player(s).gold -= c;
  s.np += 2;
  s.flags['offices_' + s.year] = (s.flags['offices_' + s.year] ?? 0) + 1;
  return null;
}
