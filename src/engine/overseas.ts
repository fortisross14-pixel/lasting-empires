// Lands beyond the sea: discovery, colonies and conquest, and the people who specialise in them.
import type { GameState, Character, RevealItem, Role } from '../types';
import { REGIONS, HOME_REGIONS, WORLD_VIEW, NATIVE_EMPIRES, COLONIAL_AI, type RegionDef } from '../data/overseas';
import { KNOWN_REGIONS } from '../data/provinces';
import { NO_STATE } from '../data/nations';
import { GOODS } from '../data/goods';
import { RARITY } from '../data/characters';
import { ageId, player, provsOf, hasTech, rand, clamp, armyPower, rollTraits, traitMult, inflation, log, nationName, weighted, hasCore } from './core';
import { getGeo, neighbours } from './map';
import { transferProvince } from './battle';

const regionOf = (id: string) => getGeo().seeds.find(x => x.id === id)?.region ?? 'europe';
let REGION_CACHE: Record<string, string> | null = null;
export const provRegion = (id: string) => (REGION_CACHE ??= Object.fromEntries(getGeo().seeds.map(x => [x.id, x.region])))[id] ?? regionOf(id);

export const regionState = (s: GameState, id: string) => (s.overseas[id] ??= { found: false, holder: null, colony: 0, subdued: false });
export const regionKnown = (s: GameState, region: string) => !!s.overseas[region]?.found || (!s.flags.world_view && KNOWN_REGIONS.includes(region));
/** Any region, including the heartlands. */
export const regionDef = (id: string): RegionDef => REGIONS[id] ?? HOME_REGIONS[id] ?? { id, name: id, where: '', dist: 3, text: '' };

/** At the start: a realm knows its own part of the world, what its traders know, and its neighbours. */
export function initKnownWorld(s: GameState) {
  s.flags.world_view = 1;
  const home = provRegion(s.nations[s.player].capital);
  const known = new Set<string>([home, ...(WORLD_VIEW[home] ?? [])]);
  for (const p of provsOf(s, s.player)) { known.add(provRegion(p.id)); for (const nb of neighbours(p.id)) known.add(provRegion(nb)); }
  for (const r of known) regionState(s, r).found = true;
}
export const provKnown = (s: GameState, provId: string) => regionKnown(s, provRegion(provId));

/** Regions an explorer could find next. */
export function discoverable(s: GameState): RegionDef[] {
  if (ageId(s) === 'reconquest') return [];
  const all = [...new Set(getGeo().seeds.map(x => x.region))];
  const linked = (r: string) => getGeo().seeds.some(x => x.region === r && neighbours(x.id).some(nb => regionKnown(s, provRegion(nb))));
  return all.filter(id => !regionKnown(s, id)).map(regionDef).filter(r => {
    const near = linked(r.id);
    if (!near && r.needs && !r.needs.some(n => regionKnown(s, n))) return false;
    const dist = near ? 1 : r.dist;
    if (dist >= 3 && !hasTech(s, 'navigation')) return false;
    return true;
  });
}

/** Seeing a land from your own borders reveals its region. */
export function revealBorders(s: GameState) {
  const regions = new Set<string>();
  for (const p of provsOf(s, s.player)) { regions.add(provRegion(p.id)); for (const nb of neighbours(p.id)) regions.add(provRegion(nb)); }
  for (const r of regions) if (!regionKnown(s, r)) { regionState(s, r).found = true; log(s, `Your borders now touch ${regionDef(r).name}.`, 'good'); }
}

export function exploreChance(s: GameState, ch: Character): number {
  let p = 0.3 + ch.skill * 0.07;
  if (ch.traits.includes('navigator')) p += 0.15 * traitMult(ch);
  if (hasTech(s, 'navigation')) p += 0.15;
  if (hasCore(s, 'sea')) p += 0.15;
  if (ageId(s) === 'discovery') p += 0.1;
  return clamp(p, 0.1, 0.95);
}

const hasCoast = (s: GameState, n = s.player) => provsOf(s, n).some(p => getGeo().coastal[p.id]);
const touches = (s: GameState, id: string, n = s.player) => neighbours(id).some(nb => s.provinces[nb]?.owner === n);

/** Can the player's ships reach this province across the ocean? */
export function oceanReach(s: GameState, id: string): boolean {
  if (!getGeo().coastal[id] || !provKnown(s, id) || !hasCoast(s)) return false;
  if (ageId(s) === 'reconquest') return false; // no ocean crossings before the Age of Discovery
  const r = regionDef(provRegion(id));
  if (r.dist >= 2 && !hasTech(s, 'navigation')) return false;
  return true;
}

export const colonyCost = (s: GameState) => Math.round(40 * inflation(s) * (ageId(s) === 'discovery' ? 0.75 : 1));

export function colonizeBlocked(s: GameState, id: string, ch?: Character): string | null {
  const p = s.provinces[id];
  if (!p) return 'Choose a land';
  if (p.owner !== NO_STATE) return p.owner === s.player ? 'Already yours' : `Ruled by ${nationName(s, p.owner)}`;
  if (!provKnown(s, id)) return 'Not yet discovered';
  if (!touches(s, id) && !oceanReach(s, id)) return 'Out of reach: it must border your lands, or lie on a coast your ships can reach';
  if (player(s).gold < colonyCost(s)) return `Needs ${colonyCost(s)} ducats`;
  if (player(s).manpower < 1) return 'Needs 1 manpower';
  if (s.missions.some(m => m.kind === 'colonize' && m.target === id)) return 'Colonists already on their way';
  void ch;
  return null;
}

export function colonizeChance(s: GameState, id: string, ch: Character): number {
  const p = s.provinces[id];
  let c = 0.6 + ch.skill * 0.06 - (p?.dev ?? 1) * 0.06;
  if (ch.traits.includes('settler')) c += 0.15 * traitMult(ch);
  if (ch.traits.includes('missionary')) c += 0.1 * traitMult(ch);
  if (ageId(s) === 'discovery') c += 0.1;
  return clamp(c, 0.1, 0.95);
}

export const colonizeTurns = (s: GameState, id: string) => (touches(s, id) ? 2 : (REGIONS[provRegion(id)]?.dist ?? 1) + 2);

export function conquistaBlocked(s: GameState, id: string): string | null {
  const p = s.provinces[id];
  if (!p) return 'Choose a land';
  if (!NATIVE_EMPIRES.includes(p.owner)) return 'Only native empires can be taken this way';
  if (!provKnown(s, id)) return 'Not yet discovered';
  if (!touches(s, id) && !oceanReach(s, id)) return 'Out of reach: it must border your lands, or lie on a coast your ships can reach';
  if (s.missions.some(m => m.kind === 'conquista' && m.target === id)) return 'An expedition is already under way';
  return null;
}

export function conquistaChance(s: GameState, id: string, ch: Character, troopUids: number[]): number {
  const p = s.provinces[id];
  let pow = armyPower(s.troops.filter(t => troopUids.includes(t.uid))) * (1 + 0.08 * ch.skill);
  if (ch.traits.includes('adelantado')) pow *= 1 + 0.25 * traitMult(ch);
  if (hasTech(s, 'firearms')) pow *= 1.3;
  const owner = s.nations[p.owner];
  const foe = 8 + p.dev * 3 + p.fort * 6 + Math.min(30, armyPower(owner?.army ?? []) * 0.25);
  return clamp(pow / (pow + foe), 0.05, 0.95);
}

// ---------- resolutions (called from missions.ts) ----------
export function resolveExplore(s: GameState, ch: Character, items: RevealItem[], o = 1) {
  const pool = discoverable(s);
  if (!pool.length) { items.push({ title: 'Nothing new', text: 'Every sea you can reach has been sailed.', tone: 'neutral', kind: 'anchor' }); return false; }
  if (rand(s) >= exploreChance(s, ch)) {
    if (!ch.traits.includes('survivor') && rand(s) < 0.15) {
      s.characters = s.characters.filter(c => c.uid !== ch.uid);
      items.push({ title: 'Lost at sea', text: `${ch.name} never returns.`, tone: 'bad', kind: 'skull' });
      log(s, `${ch.name} is lost at sea.`, 'bad');
    } else items.push({ title: 'Empty horizons', text: 'Storms and empty seas. The fleet comes home with nothing.', tone: 'bad', kind: 'anchor' });
    return false;
  }
  const found = (r: RegionDef) => {
    regionState(s, r.id).found = true;
    if (r.where === 'New World') s.flags.new_world = Math.max(1, s.flags.new_world ?? 0);
    const ps = Object.values(s.provinces).filter(p => provRegion(p.id) === r.id);
    const goods = [...new Set(ps.map(p => GOODS[p.good]?.name ?? p.good))].slice(0, 4).join(', ');
    const rulers = [...new Set(ps.map(p => p.owner).filter(x => x !== NO_STATE))].map(x => nationName(s, x));
    return `${r.text} ${ps.length} provinces. Goods: ${goods}.${rulers.length ? ' Rulers: ' + rulers.slice(0, 3).join(', ') + '.' : ' No state rules here.'}`;
  };
  const r = weighted(s, pool.map(x => [x, 4 - x.dist] as [RegionDef, number]));
  player(s).prestige += 4 + r.dist * 2;
  items.push({ title: `${r.name} discovered!`, text: found(r), tone: 'good', kind: 'anchor' });
  log(s, `${ch.name} discovers ${r.name}.`, 'good');
  if (o >= 3) {
    const more = discoverable(s);
    if (more.length) {
      const r2 = more[Math.floor(rand(s) * more.length)];
      found(r2);
      items.unshift({ title: `${o === 4 ? 'Exceptional' : 'Great'} voyage`, text: `The fleet sails on and also finds ${r2.name}.`, tone: 'good', kind: 'star' });
    }
  }
  return true;
}

function settle(s: GameState, id: string, to: string) {
  const p = s.provinces[id];
  p.owner = to; p.core = to; p.control = 40;
  p.settlement = Math.max(p.settlement, 1);
}

export function resolveColonize(s: GameState, id: string, ch: Character, items: RevealItem[], o = 1) {
  const p = s.provinces[id];
  if (p.owner !== NO_STATE) { items.push({ title: 'Claimed', text: `${nationName(s, p.owner)} got there first.`, tone: 'bad', kind: 'twist' }); return false; }
  if (rand(s) < colonizeChance(s, id, ch)) {
    settle(s, id, s.player);
    if (o >= 3) { p.dev += 1; p.settlement = Math.max(p.settlement, 2); items.push({ title: `${o === 4 ? 'Exceptional' : 'Great'} outcome`, text: 'Settlers pour in: the colony starts as a town, one level more developed.', tone: 'good', kind: 'star' }); }
    if (o >= 2 || ch.traits.includes('missionary')) p.religion = s.stateReligion;
    if (ch.traits.includes('planter')) s.flags['planter_' + id] = Math.max(s.flags['planter_' + id] ?? 0, Math.round(traitMult(ch)));
    player(s).prestige += 3;
    items.push({ title: `A colony in ${p.name}`, text: `${p.name} is now your province. It produces ${GOODS[p.good]?.name ?? p.good}.${p.religion === s.stateReligion ? '' : ' Its people keep their old faith.'}`, tone: 'good', kind: 'tower' });
    log(s, `Colony founded in ${p.name}.`, 'good');
    return true;
  }
  items.push({ title: 'The colony fails', text: p.dev >= 2 ? 'The natives drive the settlers away.' : 'Fever and hunger take the settlers.', tone: 'bad', kind: 'skull' });
  return false;
}

export function resolveConquista(s: GameState, id: string, ch: Character, troopUids: number[], items: RevealItem[], o = 1) {
  const p = s.provinces[id];
  const people = nationName(s, p.owner);
  const ok = NATIVE_EMPIRES.includes(p.owner) && rand(s) < conquistaChance(s, id, ch, troopUids);
  const loss = ok ? (ch.traits.includes('pathfinder') ? 10 : 25) : 55;
  for (const t of s.troops) if (troopUids.includes(t.uid)) t.str = Math.max(0, t.str - loss);
  const dead = s.troops.filter(t => troopUids.includes(t.uid) && t.str < 15).length;
  s.troops = s.troops.filter(t => !(troopUids.includes(t.uid) && t.str < 15));
  if (ok) {
    const loot = Math.round((20 + p.dev * 25) * inflation(s) * [0.6, 1, 1.3, 1.7, 2.5][o] * (ch.traits.includes('plunderer') ? 1 + 0.5 * traitMult(ch) : 1));
    const wasCapital = s.nations[p.owner]?.capital === id;
    transferProvince(s, id, s.player);
    p.core = s.player;
    player(s).gold += loot; player(s).prestige += 8 + p.dev * 2 + (wasCapital ? 10 : 0);
    items.push({ title: `${p.name} falls`, text: `The ${people} lose ${p.name}. Plunder: ${loot} ducats (${['poor', 'standard', 'good', 'great', 'exceptional'][o]} haul).`, tone: 'good', kind: 'sword' });
    log(s, `${ch.name} conquers ${p.name} from the ${people}.`, 'good');
  } else {
    items.push({ title: 'Disaster', text: `The ${people} destroy the expedition.`, tone: 'bad', kind: 'skull' });
  }
  if (dead) items.push({ title: 'Losses', text: `${dead} compan${dead > 1 ? 'ies' : 'y'} did not come back.`, tone: 'bad', kind: 'skull' });
  return ok;
}

/** AI crowns also settle the world: overseas for the colonial powers, over land for their neighbours. */
export function aiOverseas(s: GameState) {
  const free = Object.values(s.provinces).filter(p => p.owner === NO_STATE);
  if (!free.length) return;
  for (const [id, from] of Object.entries(COLONIAL_AI)) {
    const n = s.nations[id];
    if (id === s.player || !n?.alive || n.overlord || s.year < from || !hasCoast(s, id)) continue;
    if (rand(s) > 0.05) continue;
    const age = s.year - from;
    const open = ageId(s) !== 'reconquest' ? s.year - (s.age?.since ?? s.year) : -1;
    const reach = (r: string) => { const d = REGIONS[r]?.dist ?? 1; return d === 1 || (open >= 0 && ((d === 2 && open > 3) || (d === 3 && open > 20))); };
    const mine = new Set(provsOf(s, id).map(p => provRegion(p.id)));
    const opts = free.filter(p => p.owner === NO_STATE && getGeo().coastal[p.id] && reach(provRegion(p.id)))
      .map(p => [p, (mine.has(provRegion(p.id)) ? 4 : 1) * (touches(s, p.id, id) ? 3 : 1)] as [typeof p, number]);
    if (!opts.length) continue;
    const p = weighted(s, opts);
    settle(s, p.id, id);
    if (provKnown(s, p.id)) log(s, `${n.name} plants a colony in ${p.name}.`, 'bad');
  }
  // land neighbours expand into empty lands (Muscovy into Siberia, the Ming into the steppe...)
  if (s.year < 1480) return;
  for (const p of free) {
    if (p.owner !== NO_STATE || rand(s) > 0.004) continue;
    const owners = [...new Set(getGeo().adj[p.id].map(nb => s.provinces[nb].owner))].filter(o => o !== NO_STATE && o !== s.player && s.nations[o]?.alive && !s.nations[o].overlord && !['tribes', 'bedouins'].includes(o));
    if (!owners.length) continue;
    const to = owners[Math.floor(rand(s) * owners.length)];
    settle(s, p.id, to);
    if (provKnown(s, p.id)) log(s, `${nationName(s, to)} settles ${p.name}.`, 'neutral');
  }
}

// ---------- specialists ----------
export const PROMOTION: Partial<Record<Role, Role>> = { diplomat: 'explorer', general: 'conqueror', admin: 'colonist' };

export function promoteBlocked(s: GameState, c: Character): string | null {
  const to = PROMOTION[c.role];
  if (!to) return 'This person cannot specialise';
  if (c.ruler) return 'The monarch cannot leave the court';
  if (c.mission != null) return 'Away on a mission';
  return null;
}

/** Permanent: the character becomes an explorer, conqueror or colonist and gets new traits. */
export function promote(s: GameState, uid: number): string | null {
  const c = s.characters.find(x => x.uid === uid);
  if (!c) return 'Not found';
  const why = promoteBlocked(s, c);
  if (why) return why;
  c.role = PROMOTION[c.role]!;
  c.traits = rollTraits(s, c.role, RARITY[c.rarity].traits);
  log(s, `${c.name} becomes ${c.role === 'explorer' ? 'an explorer' : 'a ' + c.role}.`, 'good');
  return null;
}
