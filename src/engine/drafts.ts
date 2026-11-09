// Drafting troops and courtiers, merging cards, and ambitions.
import type { GameState, DraftOption, Character } from '../types';
import { TROOPS, EQUIPMENT, RECIPES, type Recipe } from '../data/troops';
import { LEGENDS } from '../data/characters';
import { player, hasTech, rand, pick, weighted, uid, genCharacter, armyCap, courtCap, draftsPerTurn, provsOf, log, inflation } from './core';

const BASE_COST = { levy: { gold: 15, mp: 2 }, pro: { gold: 40, mp: 3 }, court: { gold: 25, mp: 0 } };
export const draftCost = (s: GameState, k: 'levy' | 'pro' | 'court') => ({ gold: Math.round(BASE_COST[k].gold * inflation(s)), mp: BASE_COST[k].mp });

export function troopDraftOptions(s: GameState, kind: 'levy' | 'pro'): DraftOption[] {
  const troops = Object.values(TROOPS).filter(t => t.draftable && (!t.tech || hasTech(s, t.tech)));
  const equip = Object.values(EQUIPMENT).filter(e => !e.tech || hasTech(s, e.tech));
  const out: DraftOption[] = [];
  for (let i = 0; i < 3; i++) {
    const isEquip = rand(s) < (kind === 'levy' ? 0.3 : 0.4);
    if (isEquip) {
      const w: [string, number][] = equip.map(e => [e.id, e.id === 'banner' ? 0.5 : e.tech ? 2 : 1]);
      out.push({ t: 'equip', type: weighted(s, w) });
    } else {
      const w: [string, number][] = troops.map(t => [t.id, kind === 'levy' ? Math.max(0.2, 4 - t.tier * 1.4) : t.tier >= 2 ? 2 + t.tier : 0.6]);
      const vet = kind === 'pro' && rand(s) < 0.3 ? 1 : 0;
      out.push({ t: 'troop', type: weighted(s, w), vet });
    }
  }
  return out;
}

export function draftBlocked(s: GameState, kind: 'levy' | 'pro'): string | null {
  const c = draftCost(s, kind);
  if (s.draftsThisTurn >= draftsPerTurn(s)) return 'No more drafts this year (build Barracks for more)';
  if (player(s).gold < c.gold) return `Needs ${c.gold} ducats`;
  if (player(s).manpower < c.mp) return `Needs ${c.mp} manpower`;
  return null;
}

export function startTroopDraft(s: GameState, kind: 'levy' | 'pro'): string | null {
  const why = draftBlocked(s, kind);
  if (why) return why;
  const c = draftCost(s, kind);
  player(s).gold -= c.gold; player(s).manpower -= c.mp;
  s.draftsThisTurn++;
  s.queue.unshift({ kind: 'draft', draft: kind, options: troopDraftOptions(s, kind) });
  return null;
}

export function legendsAvailable(s: GameState) {
  return LEGENDS.filter(l => !s.usedLegends.includes(l.id) && s.year >= l.from && s.year < l.to - 2 && (!l.nations || l.nations.includes(s.player)));
}

export function courtOptions(s: GameState, legendBoost = 0): DraftOption[] {
  const out: DraftOption[] = [];
  const culture = player(s).culture;
  const roles: Character['role'][] = ['general', 'diplomat', 'admin'];
  roles.sort(() => rand(s) - 0.5);
  const legends = legendsAvailable(s);
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

export function courtBlocked(s: GameState): string | null {
  if (s.characters.length >= courtCap(s)) return `Court is full (${courtCap(s)} seats). Dismiss someone first.`;
  if (player(s).gold < draftCost(s, 'court').gold) return `Needs ${draftCost(s, 'court').gold} ducats`;
  if (s.flags.court_year === s.year) return 'You already held an audience this year';
  return null;
}

export function startCourtDraft(s: GameState): string | null {
  const why = courtBlocked(s);
  if (why) return why;
  player(s).gold -= draftCost(s, 'court').gold;
  s.flags.court_year = s.year;
  s.queue.unshift({ kind: 'draft', draft: 'court', options: courtOptions(s) });
  return null;
}

export function takeDraftOption(s: GameState, opt: DraftOption) {
  if (opt.t === 'troop') s.troops.push({ uid: uid(s), type: opt.type, vet: opt.vet, str: 100 });
  else if (opt.t === 'equip') s.equipment.push({ uid: uid(s), type: opt.type });
  else if (opt.t === 'char') {
    s.characters.push(opt.ch);
    if (opt.ch.legendId) { s.usedLegends.push(opt.ch.legendId); log(s, `${opt.ch.name} joins your court!`, 'good'); }
  } else if (opt.t === 'ambition') s.ambition = opt.id;
}

// ---------- merging ----------
export interface MergeResult { out: string; vet: number; cost: number; tech?: string; recipe?: Recipe; }

/** a and b are card uids (troop or equipment). */
export function mergePreview(s: GameState, aUid: number, bUid: number): MergeResult | { error: string } {
  const ta = s.troops.find(t => t.uid === aUid), tb = s.troops.find(t => t.uid === bUid);
  const ea = s.equipment.find(e => e.uid === aUid), eb = s.equipment.find(e => e.uid === bUid);
  const A = ta?.type ?? ea?.type, B = tb?.type ?? eb?.type;
  if (!A || !B || aUid === bUid) return { error: 'Pick two cards' };
  if (!ta && !tb) return { error: 'At least one card must be a troop' };
  if ((ta?.mission ?? tb?.mission) != null) return { error: 'That troop is away on a mission' };
  // same troop type: veteran merge
  if (ta && tb && ta.type === tb.type) {
    const vet = Math.max(ta.vet, tb.vet) + 1;
    if (vet > 3) return { error: 'Already at 3 stars' };
    return { out: ta.type, vet, cost: Math.round((5 + TROOPS[ta.type].tier * 5) * inflation(s)) };
  }
  // banner: +1 star
  const troop = ta ?? tb!, other = ta ? (tb?.type ?? eb?.type) : ea!.type;
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
  s.equipment = s.equipment.filter(e => !parts.includes(e.uid));
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
];

export function ambitionOptions(s: GameState): DraftOption[] {
  const pool = AMBITIONS.filter(a => !a.nations || a.nations.includes(s.player));
  const out: DraftOption[] = [];
  while (out.length < 3 && pool.length) out.push({ t: 'ambition', id: pool.splice(Math.floor(rand(s) * pool.length), 1)[0].id });
  return out;
}

export { pick, armyCap };
