import { GUN_TROOPS } from './trade';
import { commandOf, GENERIC_COMMAND } from '../data/characters';
// Where armies stand, how long they take to march, who can fight where,
// enemy attacks announced a quarter ahead, and invasion bases for far wars.
import type { GameState, TroopCard, Incoming } from '../types';
import { player, provsOf, rand, push, log, uid, nationName, atWar, armyPower, traitMult } from './core';
import { getGeo } from './map';
import { makeSide, createBattle, toBattleUnits, genericGeneral } from './battle';

// ---------- distance ----------
const baseOf = (loc: string) => (loc.startsWith('base:') ? loc.slice(5) : loc);
let SEED: Record<string, { lon: number; lat: number }> | null = null;
const seed = (id: string) => (SEED ??= Object.fromEntries(getGeo().seeds.map(x => [x.id, { lon: x.lon, lat: x.lat }])))[id];

/** Quarters to march between two places: 0 nearby, 1 across a land or a short sea, 2 far within a continent, 3 across the world. */
export function travel(a: string, b: string): number {
  const A = baseOf(a), B = baseOf(b);
  if (A === B) return 0;
  const pa = seed(A), pb = seed(B);
  if (!pa || !pb) return 3;
  const d = Math.hypot((pa.lon - pb.lon) * Math.cos(((pa.lat + pb.lat) / 2) * Math.PI / 180), pa.lat - pb.lat);
  const g = getGeo();
  const sea = g.land[A] !== g.land[B];
  let t = d < 4.5 ? 0 : d < 11 ? 1 : d < 30 ? 2 : 3;
  if (sea) t = Math.max(t, 1);
  return t;
}
/** Crossing water between two places? Then ships must carry the troops. */
export const bySea = (a: string, b: string) => getGeo().land[baseOf(a)] !== getGeo().land[baseOf(b)];

// ---------- garrisons ----------
/** Where the player may station troops: the capital, provinces with barracks, and ready invasion bases. */
export function garrisons(s: GameState): string[] {
  const cap = player(s).capital;
  const out = [cap, ...provsOf(s, s.player).filter(p => p.buildings.includes('barracks') && p.id !== cap).map(p => p.id)];
  for (const b of s.bases ?? []) if (b.ready) out.push('base:' + b.target);
  return out;
}
/** Where an AI realm keeps its armies: its capital and a few of its largest provinces, spread out. */
export function aiGarrisons(s: GameState, n: string): string[] {
  const nat = s.nations[n];
  const ps = provsOf(s, n).sort((a, b) => b.dev - a.dev);
  const out: string[] = [];
  if (s.provinces[nat.capital]?.owner === n) out.push(nat.capital);
  const k = Math.min(6, Math.ceil(ps.length / 6));
  for (const p of ps) { if (out.length >= k) break; if (out.every(o => travel(o, p.id) >= 1)) out.push(p.id); }
  if (!out.length && ps[0]) out.push(ps[0].id);
  return out;
}

export const locOf = (s: GameState, t: TroopCard, n = s.player) => t.loc ?? s.nations[n]?.capital ?? '';

/** Give every army a place: old saves, new recruits, lost garrisons. */
export function settleArmies(s: GameState) {
  const g = new Set(garrisons(s));
  const cap = player(s).capital;
  for (const t of [...s.troops, ...s.fleet]) {
    if (!t.loc) t.loc = cap;
    const at = baseOf(t.loc);
    // a garrison we no longer hold: fall back to the capital
    if (!t.moving && t.mission == null && !t.loc.startsWith('base:') && (!g.has(t.loc) || s.provinces[at]?.owner !== s.player)) {
      t.moving = { to: cap, eta: Math.max(1, travel(t.loc, cap)) };
    }
  }
  for (const n of Object.values(s.nations)) {
    if (!n.alive || n.id === s.player) continue;
    const gs = aiGarrisons(s, n.id);
    if (!gs.length) continue;
    n.army.forEach((t, i) => { if (!t.loc || s.provinces[baseOf(t.loc)]?.owner !== n.id) t.loc = gs[i % gs.length]; });
  }
}

/** Troops of a realm free to fight at a province: not away, not marching, and within reach. */
export function troopsNear(s: GameState, n: string, target: string, reach = 1): TroopCard[] {
  const list = n === s.player ? s.troops : s.nations[n]?.army ?? [];
  const unready = new Set((s.bases ?? []).filter(b => !b.ready).map(b => 'base:' + b.target));
  const now = turnNo(s);
  return list.filter(t => t.mission == null && !t.moving && t.str > 0 && t.fought !== now && !(n === s.player && (unready.has(t.loc ?? '') || recovering(t))) && travel(locOf(s, t, n), target) <= reach);
}

/** Order troops to another garrison. Nearby is instant; far takes quarters. */
export function moveTroops(s: GameState, uids: number[], to: string): string | null {
  if (!garrisons(s).includes(to)) return 'Troops can only be stationed in the capital, a province with barracks, or a ready base';
  const ts = [...s.troops, ...s.fleet].filter(t => uids.includes(t.uid));
  if (!ts.length) return 'Choose troops';
  if (ts.some(t => t.mission != null)) return 'Some of them are away on a mission';
  for (const t of ts) {
    const eta = travel(locOf(s, t), to);
    if (eta === 0) { t.loc = to; delete t.moving; } else t.moving = { to, eta };
  }
  return null;
}

/** A company that came out of battle below full strength rests until it is whole again. */
/** Badly mauled troops rest before they attack again; from half strength they can march. */
export const READY_STR = 50;
export const recovering = (t: TroopCard) => t.str < READY_STR;
/** Quarterly healing in garrison: about a fifth of a company. */
export const HEAL = 20;

/** How much a company heals this quarter, and why: faster at home with barracks, slower on the march or at a camp,
 *  halved when the realm lacks weapons (or powder for gun troops). It never stops completely. */
export function healOf(s: GameState, t: TroopCard): { q: number; why: string[] } {
  const why: string[] = [];
  let k = 1;
  const at = t.moving ? null : baseOf(locOf(s, t));
  const p = at ? s.provinces[at] : null;
  if (t.moving) { k = 0.5; why.push('on the march: half'); }
  else if (locOf(s, t).startsWith('base:')) { k = 0.5; why.push('in a field camp: half'); }
  else if (p?.owner === s.player) {
    if (p.buildings.includes('barracks')) { k = 1.5; why.push('barracks: +50%'); }
    else if (p.id === player(s).capital) { k = 1.25; why.push('capital: +25%'); }
  } else { k = 0.5; why.push('away from home: half'); }
  const shortW = s.short?.weapons ?? 0, shortP = GUN_TROOPS.has(t.type) ? s.short?.gunpowder ?? 0 : 0;
  const short = Math.max(shortW, shortP);
  if (short > 0) { k *= 1 - 0.5 * short; why.push(`short of ${shortP > shortW ? 'gunpowder' : 'weapons'}: slower (Economy → Goods)`); }
  return { q: Math.max(5, Math.round(HEAL * k)), why };
}

/** Each quarter: marching troops get closer, and arrive. */
export function quarterlyMarch(s: GameState) {
  for (const t of [...s.troops, ...s.fleet]) {
    if (!t.moving) continue;
    t.moving.eta--;
    if (t.moving.eta <= 0) { t.loc = t.moving.to; delete t.moving; }
  }
}

export const turnNo = (s: GameState) => (s.year - s.startYear) * 4 + (s.quarter ?? 0);

// ---------- enemy attacks, announced a quarter ahead ----------
/** An AI army sets out against one of the player's provinces. The player chooses the defence next. */
export function announceAttack(s: GameState, nation: string, target: string, force: TroopCard[]) {
  const inc: Incoming = { id: uid(s), nation, target, force: force.map(t => t.uid), due: turnNo(s) + 1 };
  (s.incoming ??= []).push(inc);
  push(s, { kind: 'incoming', id: inc.id });
  log(s, `${nationName(s, nation)} marches on ${s.provinces[target].name}.`, 'bad');
}

/** Player's defence choice for an announced attack. Empty = everyone in reach. */
export const DEFENDING = -5; // mission marker: standing ready to meet an announced attack
export function setDefence(s: GameState, id: number, defenders: number[], general?: number) {
  const inc = s.incoming?.find(x => x.id === id);
  if (!inc) return;
  inc.defenders = defenders; inc.general = general; inc.chosen = true;
  for (const t of s.troops) if (defenders.includes(t.uid)) t.mission = DEFENDING;
  const g = s.characters.find(c => c.uid === general);
  if (g) g.mission = DEFENDING;
}
/** Release the troops and general held back for an attack. */
function release(s: GameState, inc: Incoming) {
  for (const t of s.troops) if (t.mission === DEFENDING && inc.defenders?.includes(t.uid)) delete t.mission;
  const g = s.characters.find(c => c.uid === inc.general);
  if (g && g.mission === DEFENDING) delete g.mission;
}

/** Start of a turn: armies that set out last quarter arrive and fight. */
export function resolveIncoming(s: GameState) {
  const now = turnNo(s);
  for (const inc of [...(s.incoming ?? [])]) {
    if (inc.due > now) continue;
    s.incoming = s.incoming!.filter(x => x !== inc);
    release(s, inc);
    const n = s.nations[inc.nation], prov = s.provinces[inc.target];
    if (!n?.alive || !prov || prov.owner !== s.player || !atWar(s, n.id, s.player)) continue;
    const force = n.army.filter(t => inc.force.includes(t.uid) && t.str > 0);
    if (!force.length) continue;
    const near = troopsNear(s, s.player, prov.id);
    const chosen = inc.chosen ? s.troops.filter(t => inc.defenders!.includes(t.uid) && t.str > 0) : near;
    const gen = s.characters.find(c => c.uid === inc.general && c.mission == null) ?? (inc.chosen ? undefined : s.characters.filter(c => c.role === 'general' && c.mission == null).sort((a, b) => b.skill - a.skill)[0]);
    chosen.splice(gen ? commandOf(gen.skill) : GENERIC_COMMAND);
    const last = provsOf(s, s.player).length <= 3 || prov.id === player(s).capital;
    const militia = [0, 1].slice(0, last ? 2 : 1).map(i => ({ uid: -300 - i, type: 'levy', vet: 1, str: 100, start: 100, garrison: true }));
    const att = makeSide(n.id, toBattleUnits(force), genericGeneral(s), 0, false);
    const def = makeSide(s.player, [...toBattleUnits(chosen), ...militia], gen ? { name: gen.name, skill: gen.skill, traits: gen.traits, uid: gen.uid, mult: traitMult(gen) } : null, prov.fort + (last ? 1 : 0), true);
    push(s, { kind: 'battle', battle: createBattle(s, att, def, prov.id, 'defend') });
  }
}

// ---------- invasion bases ----------
/** Nearest place the player holds troops, and how far it is from a target. */
export function nearestGarrison(s: GameState, target: string): { at: string; t: number } | null {
  let best: { at: string; t: number } | null = null;
  for (const g of garrisons(s)) { const t = travel(g, target); if (!best || t < best.t) best = { at: g, t }; }
  return best;
}
export const baseFor = (s: GameState, target: string) => (s.bases ?? []).find(b => travel('base:' + b.target, target) <= 1);

/** A finished base mission: the camp goes up next to the target. For a quarter it is half-built and exposed. */
export function buildBase(s: GameState, target: string, troops: number[], ships: number[], char: number) {
  (s.bases ??= []).push({ target, troops, ships, char, ready: false, since: turnNo(s) });
  for (const t of [...s.troops, ...s.fleet]) if (troops.includes(t.uid) || ships.includes(t.uid)) { t.loc = 'base:' + target; delete t.mission; delete t.moving; }
  const owner = s.provinces[target].owner;
  push(s, { kind: 'reveal', title: `A camp near ${s.provinces[target].name}`, items: [
    { title: 'Building the base', text: `Your army digs in near ${s.provinces[target].name}. For one quarter it fights at half strength while the camp goes up.`, tone: 'neutral', kind: 'tower' },
    { title: 'They know', text: `${nationName(s, owner)} has seen you coming and may strike before the base is ready.`, tone: 'bad', kind: 'eye' },
  ] });
}

/** Each quarter: half-built bases may be attacked, finished ones last while the war does. */
export function quarterlyBases(s: GameState) {
  for (const b of [...(s.bases ?? [])]) {
    const owner = s.provinces[b.target]?.owner;
    const here = s.troops.filter(t => t.loc === 'base:' + b.target);
    if (!here.length || !owner || owner === s.player || !atWar(s, s.player, owner)) {
      // the war is over or the army has gone: break camp
      for (const t of here) t.moving = { to: player(s).capital, eta: Math.max(1, travel(b.target, player(s).capital)) };
      s.bases = s.bases!.filter(x => x !== b);
      if (owner && owner !== s.player) log(s, `The camp near ${s.provinces[b.target]?.name} is struck.`, 'neutral');
      continue;
    }
    if (b.ready) continue;
    if (turnNo(s) - b.since < 1) continue;
    const foes = troopsNear(s, owner, b.target);
    const mine = armyPower(here) * 0.5;
    if (foes.length && armyPower(foes) * (0.7 + rand(s) * 0.6) > mine * 0.8) {
      // the enemy strikes the half-built camp: our troops fight at half strength
      const ch = s.characters.find(c => c.uid === b.char);
      const att = makeSide(owner, toBattleUnits(foes.slice(0, 8)), genericGeneral(s), 0, false);
      const def = makeSide(s.player, toBattleUnits(here).map(u => ({ ...u, might: (u.might ?? 1) * 0.5 })), ch ? { name: ch.name, skill: ch.skill, traits: ch.traits, uid: ch.uid } : null, 0, true);
      const battle = createBattle(s, att, def, b.target, 'defend');
      battle.camp = true;
      push(s, { kind: 'battle', battle });
      b.since = turnNo(s); // if it survives, it is finished the quarter after
      continue;
    }
    b.ready = true;
    const ch = s.characters.find(c => c.uid === b.char);
    if (ch && ch.mission === -2) delete ch.mission;
    push(s, { kind: 'reveal', title: 'The base is ready', items: [{ title: s.provinces[b.target].name, text: 'Your camp stands. Troops here strike at full strength, and nearby provinces are within a quarter\'s march.', tone: 'good', kind: 'tower' }] });
  }
}

/** A camp overrun: the survivors sail or march home. */
export function campLost(s: GameState, target: string) {
  const b = s.bases?.find(x => x.target === target);
  if (!b) return;
  s.bases = s.bases!.filter(x => x !== b);
  for (const t of [...s.troops, ...s.fleet]) if (t.loc === 'base:' + target) t.moving = { to: player(s).capital, eta: Math.max(1, travel(target, player(s).capital)) };
  const ch = s.characters.find(c => c.uid === b.char);
  if (ch && ch.mission === -2) delete ch.mission;
}

/** Yearly, for AI realms at war: shift armies toward the enemy. */
export function aiRedeploy(s: GameState, n: string) {
  const nat = s.nations[n];
  const gs = aiGarrisons(s, n);
  if (!gs.length || !nat.army.length) return;
  const foes = Object.values(s.nations).filter(x => x.alive && atWar(s, n, x.id)).map(x => x.id);
  if (!foes.length) { nat.army.forEach((t, i) => { t.loc = gs[i % gs.length]; }); return; }
  const foeProvs = foes.flatMap(f => provsOf(s, f).map(p => p.id));
  const dist = (g: string) => Math.min(...foeProvs.map(p => travel(g, p)));
  const front = [...gs].sort((a, b) => dist(a) - dist(b))[0];
  nat.army.forEach((t, i) => { t.loc = i % 3 === 2 ? gs[i % gs.length] : front; }); // two in three to the front
}
