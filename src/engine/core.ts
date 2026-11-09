// Shared helpers: RNG, lookups, relations, treaties, wars, logging.
import type { GameState, Nation, TroopCard, Character, Role, LogEntry, Prompt } from '../types';
import { TROOPS } from '../data/troops';
import { BUILDINGS, TECH } from '../data/techs';
import { RULER_TRAITS } from '../data/nations';
import { TRAITS, FIRST_NAMES, SURNAMES } from '../data/characters';
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

export const buildingCost = (s: GameState, b: string) => Math.round(BUILDINGS[b].cost * inflation(s));

export function upkeepOf(s: GameState, arr: TroopCard[]): number {
  const mult = (hasTech(s, 'standing_army') ? 0.8 : 1) * (0.7 + 0.3 * inflation(s));
  return arr.reduce((a, t) => a + TROOPS[t.type].upkeep, 0) * mult;
}

export function armyCap(s: GameState): number {
  const ps = provsOf(s, s.player);
  const barracks = ps.reduce((a, p) => a + p.buildings.filter(b => b === 'barracks').length, 0);
  return 5 + Math.floor(ps.length / 2) + barracks + (hasTech(s, 'standing_army') ? 3 : 0);
}
export function draftsPerTurn(s: GameState): number {
  const barracks = provsOf(s, s.player).reduce((a, p) => a + p.buildings.filter(b => b === 'barracks').length, 0);
  return 2 + barracks;
}
export function courtCap(s: GameState): number {
  return 4 + (hasTech(s, 'embassies') ? 1 : 0) + (hasTech(s, 'councils') ? 1 : 0);
}

// ---------- ruler modifiers ----------
export function rulerMod(s: GameState, field: 'battle' | 'diplo' | 'research' | 'gold' | 'prestige'): number {
  const r = player(s).ruler;
  return r.traits.reduce((a, t) => a + (RULER_TRAITS[t]?.[field] ?? 0), 0);
}

// ---------- economy ----------
export function provinceIncome(s: GameState, id: string): number {
  const p = s.provinces[id];
  const g = getGeo();
  let v = p.dev * 0.6 + (g.coastal[id] ? 0.4 : 0);
  for (const b of p.buildings) v += BUILDINGS[b]?.gold ?? 0;
  if (p.unrest > 0) v *= 0.5;
  return v;
}

export function tradeValue(s: GameState, a: string, b: string): number {
  const partnerDev = provsOf(s, b).reduce((x, p) => x + p.dev, 0);
  let v = 2 + partnerDev * 0.12;
  if (a === s.player) {
    if (hasTech(s, 'mercantilism')) v *= 1.5;
    v += (s.flags['trade_bonus_' + b] ?? 0);
  }
  return Math.min(v, 6);
}

export interface IncomeBreakdown { provinces: number; trade: number; other: number; upkeep: number; total: number; stabMult: number; }

export function incomeOf(s: GameState, n: string): IncomeBreakdown {
  const nat = s.nations[n];
  let provinces = provsOf(s, n).reduce((a, p) => a + provinceIncome(s, p.id), 0);
  const trade = s.treaties.filter(t => t.kind === 'trade' && (t.a === n || t.b === n))
    .reduce((a, t) => a + tradeValue(s, n, t.a === n ? t.b : t.a), 0);
  let other = 0;
  if (n === s.player) {
    other += rulerMod(s, 'gold');
    other += s.flags.new_world_income ?? 0;
    other += s.flags.spice_income ?? 0;
    if (hasTech(s, 'banking')) provinces *= 1.1;
    other -= s.hand.filter(h => h.card === 'debt').length * 2;
  } else {
    other += s.flags['ai_bonus_' + n] ?? 0;
  }
  const stabMult = 1 + 0.06 * nat.stability;
  const upkeep = n === s.player ? upkeepOf(s, s.troops) : nat.army.reduce((a, t) => a + TROOPS[t.type].upkeep, 0) * 0.8;
  const total = (provinces + trade + other) * stabMult - upkeep;
  return { provinces, trade, other, upkeep, total, stabMult };
}

export function manpowerGain(s: GameState, n: string): number {
  const ps = provsOf(s, n);
  return ps.reduce((a, p) => a + p.dev * 0.35 + p.buildings.filter(b => b === 'barracks').length, 0);
}
export const manpowerMax = (s: GameState, n: string) => provsOf(s, n).reduce((a, p) => a + p.dev * 3, 0);

// ---------- characters ----------
export function genCharacter(s: GameState, role: Role, culture: string, skillBias = 0): Character {
  const first = pick(s, FIRST_NAMES[culture] ?? FIRST_NAMES.castilian);
  const last = pick(s, SURNAMES[culture] ?? SURNAMES.castilian);
  const skill = clamp(weighted(s, [[1, 2], [2, 5], [3, 5], [4, 2], [5, 0.6]]) + skillBias, 1, 6);
  const roleTraits = Object.values(TRAITS).filter(t => t.role === role);
  const traits: string[] = [];
  if (chance(s, 0.75)) traits.push(pick(s, roleTraits).id);
  if (chance(s, 0.2)) { const t = pick(s, roleTraits).id; if (!traits.includes(t)) traits.push(t); }
  const age = randInt(s, 22, 40);
  return {
    uid: uid(s), name: `${first} ${last}`, role, skill, traits,
    born: s.year - age, dies: s.year + randInt(s, 12, 40), rarity: skill >= 4 || traits.length > 1 ? 'rare' : 'common', xp: 0,
  };
}

export const roleName: Record<Role, string> = { general: 'General', diplomat: 'Diplomat', admin: 'Administrator' };

export function buildingAllowed(s: GameState, provId: string, b: string): string | null {
  const p = s.provinces[provId];
  const def = BUILDINGS[b];
  if (def.tech && !hasTech(s, def.tech)) return `Needs ${TECH[def.tech].name}`;
  if (def.coastal && !getGeo().coastal[provId]) return 'Coastal provinces only';
  const slots = 1 + Math.ceil(p.dev / 2);
  if (b === 'fortress') {
    const max = hasTech(s, 'star_forts') ? 3 : 2;
    if (p.fort >= max) return `Fort already at level ${max}`;
  } else {
    if (p.buildings.includes(b)) return 'Already built';
    if (p.buildings.filter(x => x !== 'fortress').length >= slots) return `No free building slots (${slots})`;
  }
  if (s.missions.some(m => m.kind === 'build' && m.target === provId)) return 'Construction already under way';
  return null;
}
