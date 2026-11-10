// Goods: what the realm makes, what it uses, what it buys and sells.
// Everything is counted in loads a year and settled every quarter from the warehouses (s.stock).
import type { GameState, Province, TradeRoute } from '../types';
import { GOODS, RAW, MADE, FOOD } from '../data/goods';
import { BUILDINGS } from '../data/techs';
import { player, provsOf, inflation, controlMult, grade, hasTech, hasCore, atWar, hasTreaty, log, nationName, techFx, govOf } from './core';
import { NO_STATE } from '../data/nations';
import { travel } from './army';
import { rankOf, RANKS } from './realm';

export const EXTRACT = ['farm', 'pasture', 'mine', 'fishery', 'woodcutter', 'plantation'];
const CULTURE_B = ['temple', 'library', 'university'];
/** Companies and ships that fire guns. */
export const GUN_TROOPS = new Set(['arquebusiers', 'tercio', 'field_cannon', 'bombard', 'reiters', 'cuirassiers', 'musketeers', 'old_tercio', 'dragoons', 'line_infantry', 'galleass', 'galleon', 'ship_of_line']);

export const price = (s: GameState, g: string) => (GOODS[g]?.price ?? 1) * inflation(s);

// ---------- making ----------
/** Raw loads a province makes a year. Extraction buildings double it on a matching good; tools keep them working. */
export function provinceOutput(s: GameState, p: Province): number {
  if (!GOODS[p.good] || GOODS[p.good].kind !== 'raw') return 0;
  let v = 0.5 + 0.15 * p.dev;
  const tools = p.owner === s.player ? 1 - 0.5 * (s.short?.tools ?? 0) : 1;
  for (const b of p.buildings) if (EXTRACT.includes(b) && BUILDINGS[b].match?.includes(p.good)) v *= 1 + grade(p, b) * tools;
  // a feudal realm's lords make the most of farms and herds
  if (p.owner === s.player && (GOODS[p.good].food || p.good === 'leather')) v *= 1 + (govOf(s).farms ?? 0);
  return v * controlMult(p.control);
}

/** Farms, fisheries, woodcutters and pastures also make a little of their own good anywhere; peasants grow a little grain. */
export const SIDE_GOOD: Record<string, string> = { farm: 'grain', fishery: 'fish', woodcutter: 'wood', pasture: 'meat' };
export function sideOutput(s: GameState, p: Province): { good: string; v: number }[] {
  const tools = p.owner === s.player ? 1 - 0.5 * (s.short?.tools ?? 0) : 1;
  const out: { good: string; v: number }[] = [];
  // peasants grow some grain wherever the land's riches are not food
  if (GOODS[p.good] && !GOODS[p.good].food) out.push({ good: 'grain', v: 0.3 * controlMult(p.control) });
  for (const b of p.buildings) {
    const g = SIDE_GOOD[b];
    if (g && !BUILDINGS[b].match?.includes(p.good)) out.push({ good: g, v: 0.5 * grade(p, b) * tools * controlMult(p.control) });
  }
  return out;
}

export const canMake = (s: GameState, g: string) => GOODS[g]?.kind === 'made' && (!GOODS[g].tech || hasTech(s, GOODS[g].tech!));

/** Loads a year a province's workshops can make. */
export function workshopCap(s: GameState, p: Province): number {
  let c = 0;
  if (p.buildings.includes('workshop')) c += 2 * grade(p, 'workshop') * (hasTech(s, 'guilds') ? 1.25 : 1);
  if (p.buildings.includes('manufactory')) c += 4 * grade(p, 'manufactory');
  return c;
}

// ---------- using ----------
/** What the realm uses a year. 'food' is any mix of grain, fish, meat and fruit. */
export function needs(s: GameState): Record<string, number> {
  const ps = provsOf(s, s.player);
  const dev = ps.reduce((a, p) => a + p.dev, 0);
  const count = (list: string[]) => ps.reduce((a, p) => a + p.buildings.filter(b => list.includes(b)).length, 0);
  const town = ps.reduce((a, p) => a + p.buildings.filter(b => BUILDINGS[b]?.site === 'town').length, 0);
  const guns = [...s.troops, ...s.fleet].filter(t => GUN_TROOPS.has(t.type)).length;
  return {
    food: dev * 0.12,
    materials: town * 0.08,
    tools: count(EXTRACT) * 0.2,
    weapons: s.troops.length * 0.15,
    gunpowder: guns * 0.25,
    cloth: dev * 0.02,
    arts: count(CULTURE_B) * 0.25,
    stores: s.fleet.length * 0.25,
    luxuries: [0.25, 0.5, 1, 1.5][RANKS.indexOf(rankOf(s))] ?? 0.5,
  };
}

export const NEED_NAMES: Record<string, string> = { food: 'Food' };

// ---------- trade terms ----------
export const routeCap = (s: GameState) => 3 + s.posts.length + techFx(s, 'routes');
export const postCap = (s: GameState) => 1 + techFx(s, 'posts');
export const distanceTo = (s: GameState, n: string) => { const a = player(s).capital, b = s.nations[n]?.capital; return a && b ? travel(a, b) : 2; };
/** Quarters to set up a trade post: 2 next door, up to 6 across the oceans. */
export const postTurns = (s: GameState, n: string) => [2, 3, 4, 6][distanceTo(s, n)] ?? 6;
export const postCost = (s: GameState, n: string) => Math.round((30 + 10 * distanceTo(s, n)) * inflation(s));
export const POST_UPKEEP = 2; // ducats a year
export const MAX_ROUTE = 4;   // loads a year

/** Does a realm make this good? Raw: one of its provinces does. Made: a realm of some size with one of the materials. */
export function supplies(s: GameState, n: string, g: string): boolean {
  const ps = provsOf(s, n);
  const d = GOODS[g];
  if (!d) return false;
  if (d.kind === 'raw') return ps.some(p => p.good === g);
  return ps.length >= 6 && Object.keys(d.recipe!).some(i => ps.some(p => p.good === i));
}

/** Price multiplier for a route: direct trade pays the carriers; a trade post cuts them out. */
export function dealFor(s: GameState, n: string, dir: 'buy' | 'sell', merchant = 1): number {
  const post = s.posts.some(p => p.nation === n);
  const treaty = hasTreaty(s, s.player, n, 'trade') ? 0.1 : 0;
  const d = distanceTo(s, n);
  if (dir === 'buy') return Math.max(0.6, (post ? 0.9 : 1.25 + 0.05 * d) - treaty) * (hasCore(s, 'mercantile') ? 0.9 : 1) * merchant;
  return Math.max(0.3, (post ? 1.2 : 0.85 - 0.05 * d) + treaty) * (2 - merchant);
}
/** A better merchant strikes better bargains: 2% a skill point. */
export const merchantFactor = (skill: number) => 1 - 0.02 * Math.min(10, skill);

export interface Partner { nation: string; deal: number; post: boolean; dist: number; why: string | null; }
/** Realms you could trade a good with, best first. */
export function partners(s: GameState, g: string, dir: 'buy' | 'sell', merchant = 1): Partner[] {
  const out: Partner[] = [];
  for (const n of Object.values(s.nations)) {
    if (!n.alive || n.id === s.player || n.id === NO_STATE || !n.capital || !provsOf(s, n.id).length) continue;
    const has = supplies(s, n.id, g);
    if (dir === 'buy' ? !has : has || provsOf(s, n.id).length < 3) continue;
    const war = atWar(s, s.player, n.id);
    out.push({ nation: n.id, deal: dealFor(s, n.id, dir, merchant), post: s.posts.some(p => p.nation === n.id), dist: distanceTo(s, n.id), why: war ? 'At war' : null });
  }
  return out.sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0) || (dir === 'buy' ? a.deal - b.deal : b.deal - a.deal) || a.dist - b.dist);
}

export function routeBlocked(s: GameState, g: string, dir: 'buy' | 'sell', partner: string, amount: number): string | null {
  if (!GOODS[g]) return 'Choose a good';
  if (amount < 1 || amount > MAX_ROUTE) return `A route carries 1 to ${MAX_ROUTE} loads a year`;
  const pending = s.missions.filter(m => m.kind === 'route').length;
  if (s.routes.length + pending >= routeCap(s)) return `All ${routeCap(s)} trade routes are in use. Trade posts and banking give more.`;
  const n = s.nations[partner];
  if (!n?.alive) return 'Choose a realm';
  if (atWar(s, s.player, partner)) return `You are at war with ${n.name}`;
  if (dir === 'buy' && !supplies(s, partner, g)) return `${n.name} has no ${GOODS[g].name} to sell`;
  if (dir === 'sell' && supplies(s, partner, g)) return `${n.name} makes its own ${GOODS[g].name}`;
  return null;
}

export function postBlocked(s: GameState, n: string): string | null {
  const nat = s.nations[n];
  if (!nat?.alive || n === s.player) return 'Choose a foreign realm';
  if (atWar(s, s.player, n)) return `You are at war with ${nat.name}`;
  if (s.posts.some(p => p.nation === n) || s.missions.some(m => m.kind === 'post' && m.target === n)) return 'You already trade there';
  const pending = s.missions.filter(m => m.kind === 'post').length;
  if (s.posts.length + pending >= postCap(s)) return `You can keep ${postCap(s)} trade post${postCap(s) > 1 ? 's' : ''}. Ocean Navigation, Banking and Mercantilism allow more.`;
  if (player(s).gold < postCost(s, n)) return `Costs ${postCost(s, n)} ducats`;
  return null;
}

// ---------- the quarter ----------
export interface Flow {
  made: Record<string, number>; bought: Record<string, number>; sold: Record<string, number>;
  used: Record<string, number>; input: Record<string, number>; overflow: Record<string, number>;
  missing: Record<string, number>; need: Record<string, number>;
  stock: Record<string, number>;
  buyCost: number; sellGain: number; localGain: number;
  factories: { prov: string; good: string; cap: number; made: number }[];
}

const add = (r: Record<string, number>, k: string, v: number) => { r[k] = (r[k] ?? 0) + v; };

/** One quarter of the realm's goods, worked out on a copy of the warehouses. */
export function quarterFlow(s: GameState): Flow {
  const q = 0.25;
  const st: Record<string, number> = { ...(s.stock ?? {}) };
  const f: Flow = { made: {}, bought: {}, sold: {}, used: {}, input: {}, overflow: {}, missing: {}, need: {}, stock: st, buyCost: 0, sellGain: 0, localGain: 0, factories: [] };
  const ps = provsOf(s, s.player);
  // 1. the provinces
  for (const p of ps) {
    const v = provinceOutput(s, p) * q;
    if (v > 0) { add(f.made, p.good, v); add(st, p.good, v); }
    for (const x of sideOutput(s, p)) { add(f.made, x.good, x.v * q); add(st, x.good, x.v * q); }
  }
  // 2. what the routes bring in
  for (const r of s.routes) if (r.dir === 'buy') { const v = r.amount * q; add(f.bought, r.good, v); add(st, r.good, v); f.buyCost += v * price(s, r.good) * dealFor(s, r.partner, 'buy', r.deal); }
  // 3. workshops, as far as their materials go
  for (const p of ps) {
    const cap = workshopCap(s, p);
    if (!cap || !p.make || !canMake(s, p.make)) continue;
    const rec = GOODS[p.make].recipe!;
    let k = cap * q;
    for (const [i, a] of Object.entries(rec)) k = Math.min(k, (st[i] ?? 0) / a);
    k = Math.max(0, k);
    for (const [i, a] of Object.entries(rec)) { st[i] -= k * a; add(f.input, i, k * a); }
    add(f.made, p.make, k); add(st, p.make, k);
    f.factories.push({ prov: p.id, good: p.make, cap, made: k / q });
  }
  // 4. the realm's needs; food comes from whatever is in the granaries
  for (const [g, yearly] of Object.entries(needs(s))) {
    const want = yearly * q;
    if (want <= 0) continue;
    f.need[g] = want;
    if (g === 'food') {
      const have = FOOD.reduce((a, x) => a + Math.max(0, st[x] ?? 0), 0);
      const take = Math.min(want, have);
      for (const x of FOOD) { const share = have > 0 ? Math.max(0, st[x] ?? 0) / have * take : 0; st[x] = (st[x] ?? 0) - share; add(f.used, x, share); }
      if (take < want) f.missing.food = want - take;
    } else {
      const take = Math.min(want, Math.max(0, st[g] ?? 0));
      st[g] = (st[g] ?? 0) - take; add(f.used, g, take);
      if (take < want) f.missing[g] = want - take;
    }
  }
  // 5. what the routes carry out, from what is left
  for (const r of s.routes) if (r.dir === 'sell') {
    const v = Math.min(r.amount * q, Math.max(0, st[r.good] ?? 0));
    st[r.good] -= v; add(f.sold, r.good, v); f.sellGain += v * price(s, r.good) * dealFor(s, r.partner, 'sell', r.deal);
  }
  // 6. full warehouses sell the rest cheaply at home
  for (const g of Object.keys(GOODS)) {
    const yearlyUse = ((f.used[g] ?? 0) + (f.input[g] ?? 0) + (f.sold[g] ?? 0)) / q;
    const cap = stockCap(yearlyUse);
    if ((st[g] ?? 0) > cap) { const v = st[g] - cap; f.overflow[g] = v; st[g] = cap; f.localGain += v * price(s, g) * LOCAL_PRICE; }
    if (st[g] != null) st[g] = Math.max(0, Math.round(st[g] * 1000) / 1000);
  }
  return f;
}

/** Warehouses hold about two years of use, and never less than a few loads. */
export const stockCap = (yearlyUse: number) => Math.max(4, 2 * yearlyUse);
/** Surplus sold at home fetches little. */
export const LOCAL_PRICE = 0.5;

/** Trade income and costs a year, for the ledger. */
export function tradeIncome(s: GameState): { sold: number; local: number; bought: number; posts: number } {
  const f = quarterFlow(s);
  return { sold: f.sellGain * 4, local: f.localGain * 4, bought: f.buyCost * 4, posts: s.posts.length * POST_UPKEEP * inflation(s) };
}

/** Each quarter: fill and empty the warehouses, and remember what ran short. */
export function settleGoods(s: GameState) {
  const f = quarterFlow(s);
  s.stock = f.stock;
  s.short ??= {};
  for (const g of Object.keys(needs(s))) {
    const now = f.need[g] ? (f.missing[g] ?? 0) / f.need[g] : 0;
    s.short[g] = Math.round((0.5 * (s.short[g] ?? 0) + 0.5 * now) * 100) / 100;
  }
  const y = s.tradeYear ?? { bought: 0, sold: 0, local: 0, market: 0 };
  s.tradeYear = { bought: y.bought * 0.75 + f.buyCost, sold: y.sold * 0.75 + f.sellGain, local: y.local * 0.75 + f.localGain, market: y.market * 0.75 };
}

/** Each quarter: routes and posts in a realm at war with you, or gone, are lost. */
export function checkTrade(s: GameState) {
  for (const r of [...s.routes]) {
    const n = s.nations[r.partner];
    if (!n?.alive || atWar(s, s.player, r.partner)) {
      s.routes = s.routes.filter(x => x !== r);
      log(s, `The ${GOODS[r.good]?.name ?? r.good} route with ${nationName(s, r.partner)} is cut.`, 'bad');
    }
  }
  for (const p of [...s.posts]) {
    const n = s.nations[p.nation];
    if (!n?.alive || atWar(s, s.player, p.nation)) {
      s.posts = s.posts.filter(x => x !== p);
      log(s, `Your trade post in ${nationName(s, p.nation)} is seized.`, 'bad');
    }
  }
}

// ---------- one-off needs ----------
/** Ducats to buy on the open market what the warehouses lack: double the price. */
export function shortfallCost(s: GameState, need: Record<string, number>): number {
  let c = 0;
  for (const [g, n] of Object.entries(need)) c += Math.max(0, n - (s.stock?.[g] ?? 0)) * price(s, g) * 2;
  return Math.round(c);
}
/** Take goods from the warehouses; the rest is bought (the caller adds shortfallCost to the price). */
export function takeGoods(s: GameState, need: Record<string, number>) {
  s.stock ??= {};
  for (const [g, n] of Object.entries(need)) s.stock[g] = Math.max(0, (s.stock[g] ?? 0) - n);
}

/** Materials a building needs. */
export const materialsFor = (b: string) => Math.max(1, Math.round((BUILDINGS[b]?.cost ?? 40) / 12));
/** Goods a new company or ship needs. */
export function hireNeeds(type: string, kind: string): Record<string, number> {
  if (kind === 'ship') return { stores: 2, ...(GUN_TROOPS.has(type) ? { gunpowder: 1 } : {}) };
  return { weapons: 1, ...(GUN_TROOPS.has(type) ? { gunpowder: 1 } : {}), ...(kind === 'cav' ? { leather: 1 } : {}) };
}

/** What a new Workshop should make: what you lack and have the materials for; otherwise what sells best. */
export function defaultMake(s: GameState): string {
  const need = needs(s);
  const f = quarterFlow(s);
  let best = 'materials', score = -1e9;
  for (const g of MADE) {
    if (!canMake(s, g)) continue;
    const rec = GOODS[g].recipe!;
    // how much of a 2-load workshop the spare materials would feed
    let feed = 1;
    for (const [i, a] of Object.entries(rec)) {
      const spare = ((f.made[i] ?? 0) + (f.bought[i] ?? 0) - (f.input[i] ?? 0) - (f.used[i] ?? 0)) * 4 + (s.stock?.[i] ?? 0) / 4;
      feed = Math.min(feed, Math.max(0, spare / (2 * a)));
    }
    const lack = Math.max(0, (need[g] ?? 0) - ((f.made[g] ?? 0) + (f.bought[g] ?? 0)) * 4);
    const v = (Math.min(lack, 2 * feed) * 2 + 2 * feed * 0.5) * GOODS[g].price;
    if (v > score) { score = v; best = g; }
  }
  return best;
}

/** A starting stock: half a year of what the realm uses. */
export function startStock(s: GameState): Record<string, number> {
  const st: Record<string, number> = {};
  const need = needs(s);
  for (const [g, v] of Object.entries(need)) {
    if (g === 'food') { for (const x of FOOD) st[x] = 0; continue; }
    st[g] = Math.round(v * 0.5 * 10) / 10 + 1;
  }
  const food = need.food * 0.5;
  const mine = provsOf(s, s.player).filter(p => GOODS[p.good]?.food).map(p => p.good);
  const kinds = mine.length ? [...new Set(mine)] : ['grain'];
  for (const x of kinds) st[x] = Math.round(food / kinds.length * 10) / 10;
  for (const g of RAW) st[g] ??= 0;
  return st;
}

export type { TradeRoute };
