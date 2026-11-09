// Buying cards with nation points, hiring people, forging troops, and ambitions.
import type { GameState, DraftOption, Character, Cat, Role } from '../types';
import { TROOPS, RECIPES, type Recipe } from '../data/troops';
import { LEGENDS } from '../data/characters';
import { player, hasTech, rand, uid, genCharacter, courtCap, courtCount, provsOf, log, inflation } from './core';
import { CARDS, buyCost, randomCard, removeCard, handOf, HAND_LIMIT } from './cards';

// ---------- buying cards ----------
export function buyBlocked(s: GameState, cat: Cat): string | null {
  const c = buyCost(s, cat);
  if (handOf(s, cat).length >= HAND_LIMIT) return `Your ${cat} hand is full (${HAND_LIMIT})`;
  return s.np < c ? `Needs ${c} nation points` : null;
}

/** Spend nation points: reveal three cards of a kind, keep one. */
export function buyCard(s: GameState, cat: Cat): string | null {
  const why = buyBlocked(s, cat);
  if (why) return why;
  s.np -= buyCost(s, cat);
  s.bought[cat] = (s.bought[cat] ?? 0) + 1;
  const opts: DraftOption[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 12 && opts.length < 3; i++) {
    const c = randomCard(s, cat);
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
export interface MergeResult { out: string; vet: number; cost: number; tech?: string; recipe?: Recipe; }

/** a and b are troop uids or equipment-card uids from the hand. */
export function mergePreview(s: GameState, aUid: number, bUid: number): MergeResult | { error: string } {
  const ta = s.troops.find(t => t.uid === aUid), tb = s.troops.find(t => t.uid === bUid);
  const eqType = (u: number) => { const h = s.hand.find(x => x.uid === u); return h && CARDS[h.card].kind === 'equip' ? CARDS[h.card].equip : undefined; };
  const ea = eqType(aUid), eb = eqType(bUid);
  const A = ta?.type ?? ea, B = tb?.type ?? eb;
  if (!A || !B || aUid === bUid) return { error: 'Pick two cards' };
  if (!ta && !tb) return { error: 'At least one card must be a troop' };
  if ((ta?.mission ?? tb?.mission) != null) return { error: 'That troop is away on a mission' };
  if (ta && tb && ta.type === tb.type) {
    const vet = Math.max(ta.vet, tb.vet) + 1;
    if (vet > 3) return { error: 'Already at 3 stars' };
    return { out: ta.type, vet, cost: Math.round((5 + TROOPS[ta.type].tier * 5) * inflation(s)) };
  }
  const troop = ta ?? tb!, other = ta ? (tb?.type ?? eb) : ea!;
  if (other === 'banner') {
    if (troop.vet >= 3) return { error: 'Already at 3 stars' };
    return { out: troop.type, vet: troop.vet + 1, cost: Math.round(5 * inflation(s)) };
  }
  const r = RECIPES.find(x => (x.a === A && x.b === B) || (x.a === B && x.b === A));
  if (!r) return { error: 'These cards do not combine' };
  const vet = Math.max(ta?.vet ?? 0, tb?.vet ?? 0);
  const cost = Math.round(r.cost * inflation(s));
  if (r.tech && !hasTech(s, r.tech)) return { out: r.out, vet, cost, tech: r.tech, recipe: r };
  return { out: r.out, vet, cost, recipe: r };
}

export function doMerge(s: GameState, aUid: number, bUid: number): string | null {
  const res = mergePreview(s, aUid, bUid);
  if ('error' in res) return res.error;
  if (res.tech) return 'Research needed first';
  if (player(s).gold < res.cost) return `Needs ${res.cost} ducats`;
  const parts = [aUid, bUid];
  const strs = s.troops.filter(t => parts.includes(t.uid)).map(t => t.str);
  const str = Math.round(strs.reduce((a, b) => a + b, 0) / strs.length);
  player(s).gold -= res.cost;
  s.troops = s.troops.filter(t => !parts.includes(t.uid));
  s.hand = s.hand.filter(h => !parts.includes(h.uid));
  s.troops.push({ uid: uid(s), type: res.out, vet: res.vet, str: Math.max(str, 60) });
  log(s, `Forged a new unit: ${TROOPS[res.out].name}${res.vet ? ' ' + '★'.repeat(res.vet) : ''}.`, 'good');
  return null;
}

// ---------- ambitions ----------
export interface AmbitionDef { id: string; name: string; text: string; reward: number; deadline?: number; nations?: string[]; check: (s: GameState) => boolean; }

const owns = (s: GameState, ids: string[]) => ids.every(id => s.provinces[id]?.owner === s.player);
const IBERIA = ['galicia', 'asturias', 'leon', 'burgos', 'biscay', 'toledo', 'extremadura', 'mancha', 'seville', 'cordoba', 'murcia', 'granada', 'malaga', 'porto', 'lisbon', 'alentejo', 'algarve', 'navarre', 'zaragoza', 'catalonia', 'valencia'];
const AFRICA = ['tangier', 'fez', 'rif', 'tlemcen', 'oran', 'algiers', 'bejaia', 'constantine', 'tunis', 'kairouan'];

export const AMBITIONS: AmbitionDef[] = [
  { id: 'reconquista', name: 'Reconquista', text: 'Own Granada and Málaga before 1500.', reward: 40, deadline: 1500, check: s => owns(s, ['granada', 'malaga']) },
  { id: 'iberia', name: 'Lord of Iberia', text: 'Own every province of the Iberian peninsula.', reward: 90, check: s => owns(s, IBERIA) },
  { id: 'italy', name: 'The Italian Crown', text: 'Own Naples, Milan and Rome.', reward: 70, check: s => owns(s, ['naples', 'milan', 'rome']) },
  { id: 'islands', name: 'Mare Nostrum', text: 'Own Sicily, Sardinia, Corsica and Majorca.', reward: 50, check: s => owns(s, ['sicily', 'sardinia', 'corsica', 'majorca']) },
  { id: 'africa', name: 'The African Shore', text: 'Own 4 provinces in North Africa.', reward: 55, check: s => AFRICA.filter(id => s.provinces[id].owner === s.player).length >= 4 },
  { id: 'merchant', name: 'Merchant Prince', text: 'Hold 6 trade treaties at once.', reward: 50, check: s => s.treaties.filter(t => t.kind === 'trade' && (t.a === s.player || t.b === s.player)).length >= 6 },
  { id: 'army', name: 'Army of Legend', text: 'Field 4 troops of Tercio quality or better (tier 4+).', reward: 50, check: s => s.troops.filter(t => TROOPS[t.type].tier >= 4).length >= 4 },
  { id: 'scholar', name: 'Light of Learning', text: 'Research 15 technologies.', reward: 50, check: s => s.techs.length >= 15 },
  { id: 'builder', name: 'The Builder King', text: 'Have 12 buildings across your realm.', reward: 45, check: s => provsOf(s, s.player).reduce((a, p) => a + p.buildings.length, 0) >= 12 },
  { id: 'cities', name: 'City Founder', text: 'Found 4 new cities.', reward: 45, check: s => provsOf(s, s.player).reduce((a, p) => a + (p.cities ?? 0), 0) >= 4 },
];

export function ambitionOptions(s: GameState): DraftOption[] {
  const pool = AMBITIONS.filter(a => !a.nations || a.nations.includes(s.player));
  const out: DraftOption[] = [];
  while (out.length < 3 && pool.length) out.push({ t: 'ambition', id: pool.splice(Math.floor(rand(s) * pool.length), 1)[0].id });
  return out;
}

