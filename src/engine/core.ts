// Shared helpers: RNG, lookups, relations, treaties, wars, logging.
import type { GameState, Nation, TroopCard, Character, Role, LogEntry, Prompt, Rarity, Province } from '../types';
import { TROOPS } from '../data/troops';
import { BUILDINGS, TECH } from '../data/techs';
import { RULER_ARCHS } from '../data/nations';
import { GOODS } from '../data/goods';
import { REGIONS } from '../data/overseas';
import { TRAITS, FIRST_NAMES, SURNAMES, RARITY, RARITY_ORDER, OUTCOME_ODDS, OUTCOMES } from '../data/characters';
import { getGeo, neighbours } from './map';

// ---------- RNG (mulberry32, state kept in the save) ----------
export function rand(s: GameState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const randInt = (s: GameState, lo: number, hi: number) => lo + Math.floor(rand(s) * (hi - lo + 1));
export const pick = <T>(s: GameState, arr: T[]): T => arr[Math.floor(rand(s) * arr.length)];
export function weighted<T>(s: GameState, items: [T, number][]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rand(s) * total;
  for (const [it, w] of items) { if ((r -= w) <= 0) return it; }
  return items[items.length - 1][0];
}
export const chance = (s: GameState, p: number) => rand(s) < p;
export const uid = (s: GameState) => s.nextUid++;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------- lookups ----------
export const player = (s: GameState): Nation => s.nations[s.player];
export const provsOf = (s: GameState, n: string) => Object.values(s.provinces).filter(p => p.owner === n);
export const hasTech = (s: GameState, t: string) => s.techs.includes(t);
export const nationName = (s: GameState, n: string) => s.nations[n]?.name ?? n;

export function log(s: GameState, text: string, tone: LogEntry['tone'] = 'neutral') {
  s.log.unshift({ year: s.year, text, tone });
  if (s.log.length > 120) s.log.length = 120;
}
export const push = (s: GameState, p: Prompt) => { s.queue.push(p); };

// ---------- relations / diplomacy ----------
const key = (a: string, b: string) => (a < b ? a + '|' + b : b + '|' + a);
export const getRel = (s: GameState, a: string, b: string) => s.rel[key(a, b)] ?? 0;
export function addRel(s: GameState, a: string, b: string, d: number) {
  s.rel[key(a, b)] = clamp(Math.round(getRel(s, a, b) + d), -100, 100);
}
export const hasTreaty = (s: GameState, a: string, b: string, kind: string) =>
  s.treaties.some(t => t.kind === kind && ((t.a === a && t.b === b) || (t.a === b && t.b === a)));
export function addTreaty(s: GameState, a: string, b: string, kind: 'trade' | 'alliance' | 'marriage') {
  if (!hasTreaty(s, a, b, kind)) s.treaties.push({ a, b, kind, since: s.year });
}
export function breakTreaties(s: GameState, a: string, b: string) {
  s.treaties = s.treaties.filter(t => !((t.a === a && t.b === b) || (t.a === b && t.b === a)));
  s.imports = s.imports.filter(i => !((a === s.player && i.from === b) || (b === s.player && i.from === a)));
}
export const findWar = (s: GameState, a: string, b: string) =>
  s.wars.find(w => (w.a === a && w.b === b) || (w.a === b && w.b === a));
export const atWar = (s: GameState, a: string, b: string) => !!findWar(s, a, b);
export const enemiesOf = (s: GameState, n: string) => s.wars.filter(w => w.a === n || w.b === n).map(w => (w.a === n ? w.b : w.a));
export const alliesOf = (s: GameState, n: string) =>
  s.treaties.filter(t => t.kind === 'alliance' && (t.a === n || t.b === n)).map(t => (t.a === n ? t.b : t.a)).filter(x => s.nations[x]?.alive);
export const inTruce = (s: GameState, a: string, b: string) =>
  s.truces.some(t => t.until > s.year && ((t.a === a && t.b === b) || (t.a === b && t.b === a)));

export function declareWar(s: GameState, a: string, b: string) {
  if (atWar(s, a, b) || a === b) return;
  breakTreaties(s, a, b);
  addRel(s, a, b, -40);
  s.wars.push({ a, b, since: s.year, gainsA: 0, gainsB: 0 });
  // allies of the defender may join
  for (const ally of alliesOf(s, b)) {
    if (ally === a || atWar(s, ally, a)) continue;
    if (ally === s.player) continue; // the player is asked by event instead
    if (getRel(s, ally, b) > 30 && rand(s) < 0.75) {
      breakTreaties(s, ally, a);
      s.wars.push({ a, b: ally, since: s.year, gainsA: 0, gainsB: 0 });
      if (a === s.player || b === s.player) log(s, `${nationName(s, ally)} joins the war on the side of ${nationName(s, b)}.`, 'bad');
    }
  }
}
export function makePeace(s: GameState, a: string, b: string) {
  s.wars = s.wars.filter(w => !((w.a === a && w.b === b) || (w.a === b && w.b === a)));
  s.truces.push({ a, b, until: s.year + 10 });
}

export function borders(s: GameState, a: string, b: string): boolean {
  return provsOf(s, a).some(p => neighbours(p.id).some(n => s.provinces[n].owner === b));
}

// ---------- troops ----------
export const troopPower = (t: { type: string; vet: number; str: number }) => {
  const d = TROOPS[t.type];
  return (d.melee + d.fire + d.def * 0.8) * (1 + 0.15 * t.vet) * (t.str / 100);
};
export const armyPower = (arr: { type: string; vet: number; str: number }[]) => arr.reduce((a, t) => a + troopPower(t), 0);

/** Prices rise over the centuries. */
export const inflation = (s: GameState) => 1 + (s.year - 1453) / 160;

export const buildingCost = (s: GameState, b: string) => Math.round(BUILDINGS[b].cost * inflation(s) * (hasGood(s, 'timber') ? 0.85 : 1));

export function upkeepOf(s: GameState, arr: TroopCard[]): number {
  const mult = (hasTech(s, 'standing_army') ? 0.8 : 1) * (0.7 + 0.3 * inflation(s));
  return arr.reduce((a, t) => a + TROOPS[t.type].upkeep, 0) * mult;
}

export function armyCap(s: GameState): number {
  const ps = provsOf(s, s.player);
  const barracks = ps.reduce((a, p) => a + p.buildings.filter(b => b === 'barracks').length, 0);
  return 5 + Math.floor(ps.length / 2) + barracks + (hasTech(s, 'standing_army') ? 3 : 0);
}
export function courtCap(s: GameState): number {
  return 6 + (hasTech(s, 'embassies') ? 1 : 0) + (hasTech(s, 'councils') ? 1 : 0);
}
export const courtCount = (s: GameState) => s.characters.filter(c => !c.ruler).length;

// ---------- goods ----------
/** Goods the player has: produced in owned provinces, or imported. */
export function ownGoods(s: GameState, n = s.player): Set<string> {
  const g = new Set<string>();
  for (const p of provsOf(s, n)) if (p.good) g.add(p.good);
  return g;
}
export function hasGood(s: GameState, good: string): boolean {
  return ownGoods(s).has(good) || s.imports.some(i => i.good === good) || colonyGoods(s).has(good);
}
export function colonyGoods(s: GameState): Set<string> {
  const g = new Set<string>();
  for (const [id, o] of Object.entries(s.overseas ?? {})) if (o.holder === s.player && o.colony > 0 && REGIONS[id]) g.add(REGIONS[id].good);
  return g;
}
export const importCost = (s: GameState) => s.imports.reduce((a, i) => a + (GOODS[i.good]?.price ?? 0), 0) * inflation(s);

// ---------- ruler modifiers ----------
export function rulerMod(s: GameState, field: 'battle' | 'diplo' | 'research' | 'goldPct' | 'np'): number {
  const a = RULER_ARCHS[player(s).ruler.arch];
  return (a?.[field] as number | undefined) ?? 0;
}

// ---------- economy ----------
export function provinceIncome(s: GameState, id: string): number {
  const p = s.provinces[id];
  const g = getGeo();
  let v = p.dev * 0.6 + (g.coastal[id] ? 0.4 : 0);
  for (const b of p.buildings) v += (BUILDINGS[b]?.gold ?? 0) * grade(p, b);
  if (p.buildings.includes('pasture') && (p.good === 'wool' || p.good === 'horses')) v += 1 * grade(p, 'pasture');
  if (p.buildings.includes('mine') && (p.good === 'iron' || p.good === 'silver')) v += 3 * grade(p, 'mine');
  v += TIERS[tierOf(p)].gold;
  return v * controlMult(p.control);
}

export const controlMult = (c: number) => 0.35 + 0.65 * Math.max(0, Math.min(100, c)) / 100;

export function tradeValue(s: GameState, a: string, b: string): number {
  const partnerDev = provsOf(s, b).reduce((x, p) => x + p.dev, 0);
  let v = 2 + partnerDev * 0.12;
  if (a === s.player) {
    if (hasTech(s, 'mercantilism')) v *= 1.5;
    v += (s.flags['trade_bonus_' + b] ?? 0);
  }
  return Math.min(v, 6);
}

export interface IncomeBreakdown {
  provinces: number; trade: number; goods: number; other: number;
  upkeep: number; salaries: number; imports: number; total: number; stabMult: number;
}

export function salaries(s: GameState, n: string) {
  return provsOf(s, n).reduce((a, p) => a + p.buildings.reduce((x, b) => x + (BUILDINGS[b]?.salary ?? 0), 0), 0) * inflation(s);
}

export function incomeOf(s: GameState, n: string): IncomeBreakdown {
  const nat = s.nations[n];
  let provinces = provsOf(s, n).reduce((a, p) => a + provinceIncome(s, p.id), 0);
  const trade = s.treaties.filter(t => t.kind === 'trade' && (t.a === n || t.b === n))
    .reduce((a, t) => a + tradeValue(s, n, t.a === n ? t.b : t.a), 0);
  let other = 0, goods = 0, sal = 0, imp = 0;
  if (n === s.player) {
    other += s.flags.new_world_income ?? 0;
    other += s.flags.spice_income ?? 0;
    if (hasTech(s, 'banking')) provinces *= 1.1;
    provinces *= 1 + rulerMod(s, 'goldPct');
    other -= s.hand.filter(h => h.card === 'debt').length * 2;
    if (hasGood(s, 'oil')) goods += 2;
    if (hasGood(s, 'silver')) goods += 3;
    if (hasGood(s, 'sugar')) goods += 2;
    if (hasGood(s, 'gold')) goods += 4;
    if (hasGood(s, 'spices')) goods += 2;
    if (hasGood(s, 'furs')) goods += 2;
    other += colonyIncome(s);
    if (hasGood(s, 'wool')) goods += provsOf(s, n).filter(p => p.buildings.includes('market')).length;
    sal = salaries(s, n);
    imp = importCost(s);
  } else {
    other += s.flags['ai_bonus_' + n] ?? 0;
  }
  const stabMult = 1 + 0.06 * nat.stability;
  const upkeep = n === s.player ? upkeepOf(s, s.troops) : nat.army.reduce((a, t) => a + TROOPS[t.type].upkeep, 0) * 0.8;
  const total = (provinces + trade + goods + other) * stabMult - upkeep - sal - imp;
  return { provinces, trade, goods, other, upkeep, salaries: sal, imports: imp, total, stabMult };
}

export function colonyIncome(s: GameState): number {
  let v = 0;
  for (const [id, o] of Object.entries(s.overseas ?? {})) if (o.holder === s.player && REGIONS[id]) v += REGIONS[id].value * o.colony + (s.flags['planter_' + id] ?? 0) * o.colony;
  return v;
}

/** Player manpower: the scarce pool for hiring troops and people (1 each). */
export function playerManpower(s: GameState): { gain: number; max: number } {
  const ps = provsOf(s, s.player);
  const dev = ps.reduce((a, p) => a + p.dev, 0);
  let gain = 0.5 + dev * 0.04 + ps.reduce((a, p) => a + p.buildings.filter(b => b === 'barracks').length * 0.5, 0);
  gain += ps.reduce((a, p) => a + (p.buildings.includes('farm') ? 0.5 : 0), 0);
  if (hasGood(s, 'grain')) gain += 0.5;
  if (hasGood(s, 'fish')) gain += 0.3;
  return { gain, max: Math.round(5 + dev * 0.3) };
}

export function manpowerGain(s: GameState, n: string): number {
  const ps = provsOf(s, n);
  return ps.reduce((a, p) => a + p.dev * 0.35 + p.buildings.filter(b => b === 'barracks').length, 0);
}
export const manpowerMax = (s: GameState, n: string) => provsOf(s, n).reduce((a, p) => a + p.dev * 3, 0);

// ---------- characters ----------
export function genCharacter(s: GameState, role: Role, culture: string, minRarity = 0): Character {
  const first = pick(s, FIRST_NAMES[culture] ?? FIRST_NAMES.castilian);
  const last = pick(s, SURNAMES[culture] ?? SURNAMES.castilian);
  const tiers = RARITY_ORDER.slice(minRarity, 4).map(r => [r, RARITY[r].weight] as [Rarity, number]);
  const rarity = weighted(s, tiers);
  const traits = rollTraits(s, role, RARITY[rarity].traits);
  const age = randInt(s, 22, 40);
  return { uid: uid(s), name: `${first} ${last}`, role, skill: RARITY[rarity].skill, traits, born: s.year - age, dies: s.year + randInt(s, 12, 40), rarity, xp: 0 };
}

export function rollTraits(s: GameState, role: Role, n: number, keep: string[] = []): string[] {
  const pool = Object.values(TRAITS).filter(t => t.role === role && !keep.includes(t.id)).map(t => t.id);
  const out = [...keep];
  while (out.length < n + keep.length && pool.length) out.push(pool.splice(Math.floor(rand(s) * pool.length), 1)[0]);
  return out;
}

/** How strongly a character's traits act (Common ×1 … Legendary ×2). */
export const traitMult = (c: { rarity?: Rarity }) => RARITY[c.rarity ?? 'common']?.mult ?? 1;

/** Experience raises rarity: three successes move a character up one tier (Epic at most, unless legendary). */
export function promoteRarity(s: GameState, c: Character): boolean {
  const i = RARITY_ORDER.indexOf(c.rarity);
  if (c.ruler || i < 0 || i >= 3) return false;
  c.rarity = RARITY_ORDER[i + 1];
  c.skill = RARITY[c.rarity].skill;
  if (c.traits.length < RARITY[c.rarity].traits) c.traits = rollTraits(s, c.role, 1, c.traits);
  return true;
}

export const roleName: Record<Role, string> = {
  general: 'General', diplomat: 'Diplomat', admin: 'Administrator', merchant: 'Merchant', researcher: 'Researcher',
  explorer: 'Explorer', conqueror: 'Conqueror', colonist: 'Colonist',
};

/** Building slots in the town (by settlement size) and in the countryside (by development). */
export const SETTLEMENT_SLOTS = [0, 1, 2, 4, 6];
export const townSlots = (p: Province) => SETTLEMENT_SLOTS[p.settlement ?? 0];
export const ruralSlots = (p: Province) => 2 + Math.floor(p.dev / 3);
export const buildingSlots = (s: GameState, id: string, site: 'town' | 'rural' = 'town') => (site === 'town' ? townSlots(s.provinces[id]) : ruralSlots(s.provinces[id]));
export const builtAt = (p: Province, site: 'town' | 'rural') => p.buildings.filter(b => b !== 'fortress' && BUILDINGS[b]?.site === site).length;
export const grade = (p: Province, b: string) => p.grades?.[b] ?? 1;

export type Tier = 'none' | 'village' | 'town' | 'city' | 'metropolis';
export const TIER_ORDER: Tier[] = ['none', 'village', 'town', 'city', 'metropolis'];
export const TIERS: Record<Tier, { name: string; gold: number; np: number; rate: number; people: number }> = {
  none: { name: 'No town', gold: 0, np: 0, rate: 0, people: 0 },
  village: { name: 'Village', gold: 0.3, np: 0, rate: 0, people: 2 },
  town: { name: 'Town', gold: 1, np: 0.1, rate: 0.02, people: 8 },
  city: { name: 'City', gold: 2.5, np: 0.3, rate: 0.05, people: 30 },
  metropolis: { name: 'Metropolis', gold: 5, np: 0.6, rate: 0.1, people: 100 },
};
export const tierOf = (p: Province): Tier => TIER_ORDER[Math.max(0, Math.min(4, p.settlement ?? 0))];
/** Development needed before a settlement can grow to the next size. */
export const GROW_DEV = [0, 1, 2, 3, 5];
export function population(s: GameState, p: Province): number {
  const k = p.dev * 6 + builtAt(p, 'rural') * 1.5 + TIERS[tierOf(p)].people + builtAt(p, 'town') * 2;
  return Math.round(k * (1 + (s.year - 1453) / 300)) * 1000;
}
export function initialSettlement(dev: number, capital: boolean): number {
  const base = dev >= 4 ? 2 : dev === 3 ? 1 : 0;
  return Math.min(4, base + (capital ? 1 : 0));
}

// ---------- outcomes ----------
/** Roll a mission outcome (0 Poor … 4 Exceptional). Better people get better odds. */
export function rollOutcome(s: GameState, c?: { rarity?: Rarity } | null): number {
  const odds = OUTCOME_ODDS[c?.rarity ?? 'common'];
  let r = rand(s) * 100;
  for (let i = 0; i < odds.length; i++) { if ((r -= odds[i]) < 0) return i; }
  return 1;
}
export const outcomeName = (o: number) => OUTCOMES[o].name;

export function buildingAllowed(s: GameState, provId: string, b: string): string | null {
  const p = s.provinces[provId];
  const def = BUILDINGS[b];
  if (def.tech && !hasTech(s, def.tech)) return `Needs ${TECH[def.tech].name}`;
  if (def.coastal && !getGeo().coastal[provId]) return 'Coastal provinces only';
  if (def.site === 'town' && !p.settlement) return 'No town here yet: found a settlement first';
  const slots = buildingSlots(s, provId, def.site);
  if (b === 'fortress') {
    const max = hasTech(s, 'star_forts') ? 3 : 2;
    if (p.fort >= max) return `Fort already at level ${max}`;
  } else {
    if (p.buildings.includes(b)) return 'Already built';
    if (builtAt(p, def.site) >= slots) return `No free ${def.site === 'town' ? 'town' : 'rural'} slots (${slots})`;
  }
  if (s.missions.some(m => m.kind === 'build' && m.target === provId)) return 'Construction already under way';
  return null;
}
