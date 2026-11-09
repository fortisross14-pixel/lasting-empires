// Lands beyond the sea: discovery, colonies and conquest, and the people who specialise in them.
import type { GameState, Character, RevealItem, Role } from '../types';
import { REGIONS, type RegionDef } from '../data/overseas';
import { GOODS } from '../data/goods';
import { RARITY } from '../data/characters';
import { player, hasTech, rand, clamp, armyPower, rollTraits, traitMult, inflation, log, nationName, weighted } from './core';

export const regionState = (s: GameState, id: string) => (s.overseas[id] ??= { found: false, holder: null, colony: 0, subdued: false });

/** Regions an explorer could find next. */
export function discoverable(s: GameState): RegionDef[] {
  return Object.values(REGIONS).filter(r => {
    if (regionState(s, r.id).found) return false;
    if (r.needs && !regionState(s, r.needs).found) return false;
    if (r.dist >= 2 && !hasTech(s, 'navigation') && s.year < 1480) return false;
    if (r.dist >= 3 && !hasTech(s, 'navigation')) return false;
    return true;
  });
}

export function exploreChance(s: GameState, ch: Character): number {
  let p = 0.3 + ch.skill * 0.07;
  if (ch.traits.includes('navigator')) p += 0.15 * traitMult(ch);
  if (hasTech(s, 'navigation')) p += 0.15;
  return clamp(p, 0.1, 0.95);
}

export const colonyCost = (s: GameState) => Math.round(40 * inflation(s));

export function colonizeBlocked(s: GameState, id: string, ch?: Character): string | null {
  const r = REGIONS[id];
  if (!r) return 'Choose a land';
  const st = regionState(s, id);
  if (!st.found) return 'Not yet discovered';
  if (st.holder && st.holder !== s.player) return `Claimed by ${nationName(s, st.holder)}`;
  if (st.colony >= 3) return 'Colony fully grown';
  if (r.natives >= 2 && !st.subdued && !ch?.traits.includes('missionary')) return `The ${r.people} must be conquered first`;
  if (player(s).gold < colonyCost(s)) return `Needs ${colonyCost(s)} ducats`;
  if (player(s).manpower < 1) return 'Needs 1 manpower';
  if (s.missions.some(m => m.kind === 'colonize' && m.target === id)) return 'Colonists already on their way';
  return null;
}

export function colonizeChance(s: GameState, id: string, ch: Character): number {
  const r = REGIONS[id], st = regionState(s, id);
  let p = 0.55 + ch.skill * 0.06;
  if (ch.traits.includes('settler')) p += 0.15 * traitMult(ch);
  if (r.natives >= 1 && !st.subdued) p -= 0.1 * r.natives;
  return clamp(p, 0.1, 0.95);
}

export function conquistaBlocked(s: GameState, id: string): string | null {
  const r = REGIONS[id];
  if (!r) return 'Choose a land';
  const st = regionState(s, id);
  if (!st.found) return 'Not yet discovered';
  if (r.natives === 0) return 'No one lives there to conquer';
  if (st.subdued) return 'Already conquered';
  if (st.holder && st.holder !== s.player) return `Claimed by ${nationName(s, st.holder)}`;
  if (s.missions.some(m => m.kind === 'conquista' && m.target === id)) return 'An expedition is already under way';
  return null;
}

export function conquistaChance(s: GameState, id: string, ch: Character, troopUids: number[]): number {
  const r = REGIONS[id];
  let pow = armyPower(s.troops.filter(t => troopUids.includes(t.uid))) * (1 + 0.08 * ch.skill);
  if (ch.traits.includes('adelantado')) pow *= 1 + 0.25 * traitMult(ch);
  if (hasTech(s, 'firearms')) pow *= 1.3;
  const foe = r.natives * 14;
  return clamp(pow / (pow + foe), 0.05, 0.95);
}

// ---------- resolutions (called from missions.ts) ----------
export function resolveExplore(s: GameState, ch: Character, items: RevealItem[], o = 1) {
  const pool = discoverable(s);
  if (!pool.length) { items.push({ title: 'Nothing new', text: 'Every known sea has been sailed.', tone: 'neutral', kind: 'anchor' }); return false; }
  if (rand(s) >= exploreChance(s, ch)) {
    if (!ch.traits.includes('survivor') && rand(s) < 0.15) {
      s.characters = s.characters.filter(c => c.uid !== ch.uid);
      items.push({ title: 'Lost at sea', text: `${ch.name} never returns.`, tone: 'bad', kind: 'skull' });
      log(s, `${ch.name} is lost at sea.`, 'bad');
    } else items.push({ title: 'Empty horizons', text: 'Storms and empty seas. The fleet comes home with nothing.', tone: 'bad', kind: 'anchor' });
    return false;
  }
  const r = weighted(s, pool.map(x => [x, 4 - x.dist] as [RegionDef, number]));
  const st = regionState(s, r.id);
  st.found = true;
  player(s).prestige += 4 + r.dist * 2;
  if (r.where === 'New World') s.flags.new_world = Math.max(1, s.flags.new_world ?? 0);
  items.push({ title: `${r.name} discovered!`, text: `${r.text} People: ${r.people}. Produces ${GOODS[r.good]?.name ?? r.good}.`, tone: 'good', kind: 'anchor' });
  if (st.holder && st.holder !== s.player) items.push({ title: 'Too late', text: `${nationName(s, st.holder)} already holds it.`, tone: 'bad', kind: 'twist' });
  log(s, `${ch.name} discovers ${r.name}.`, 'good');
  if (o >= 3) {
    const more = discoverable(s);
    if (more.length) {
      const r2 = more[Math.floor(rand(s) * more.length)];
      regionState(s, r2.id).found = true;
      items.unshift({ title: `${o === 4 ? 'Exceptional' : 'Great'} voyage`, text: `The fleet sails on and also finds ${r2.name}.`, tone: 'good', kind: 'star' });
    }
  }
  return true;
}

export function resolveColonize(s: GameState, id: string, ch: Character, items: RevealItem[], o = 1) {
  const r = REGIONS[id], st = regionState(s, id);
  if (st.holder && st.holder !== s.player) { items.push({ title: 'Claimed', text: `${nationName(s, st.holder)} got there first.`, tone: 'bad', kind: 'twist' }); return false; }
  if (rand(s) < colonizeChance(s, id, ch)) {
    st.colony = Math.min(3, st.colony + (o >= 3 ? 2 : 1)); st.holder = s.player;
    if (o >= 3) items.push({ title: `${o === 4 ? 'Exceptional' : 'Great'} outcome`, text: 'Settlers pour in: the colony grows two levels at once.', tone: 'good', kind: 'star' });
    if (ch.traits.includes('planter')) s.flags['planter_' + id] = Math.max(s.flags['planter_' + id] ?? 0, Math.round(traitMult(ch)));
    player(s).prestige += 3;
    items.push({ title: st.colony === 1 ? `A colony in ${r.name}` : `${r.name} grows`, text: `Colony level ${st.colony}/3: +${r.value} ducats a year per level, and access to ${GOODS[r.good]?.name ?? r.good}.`, tone: 'good', kind: 'tower' });
    log(s, `Colony in ${r.name} reaches level ${st.colony}.`, 'good');
    return true;
  }
  items.push({ title: 'The colony fails', text: r.natives && !st.subdued ? `The ${r.people} drive the settlers away.` : 'Fever and hunger take the settlers.', tone: 'bad', kind: 'skull' });
  return false;
}

export function resolveConquista(s: GameState, id: string, ch: Character, troopUids: number[], items: RevealItem[], o = 1) {
  const r = REGIONS[id], st = regionState(s, id);
  const p = conquistaChance(s, id, ch, troopUids);
  const ok = rand(s) < p;
  const loss = ok ? (ch.traits.includes('pathfinder') ? 10 : 25) : 55;
  for (const t of s.troops) if (troopUids.includes(t.uid)) t.str = Math.max(0, t.str - loss);
  const dead = s.troops.filter(t => troopUids.includes(t.uid) && t.str < 15).length;
  s.troops = s.troops.filter(t => !(troopUids.includes(t.uid) && t.str < 15));
  if (ok) {
    st.subdued = true; st.holder = s.player;
    const loot = Math.round(r.loot * inflation(s) * [0.6, 1, 1.3, 1.7, 2.5][o] * (ch.traits.includes('plunderer') ? 1 + 0.5 * traitMult(ch) : 1));
    player(s).gold += loot; player(s).prestige += 10 + r.natives * 3;
    items.push({ title: `The ${r.people} submit`, text: `${r.name} is yours to settle. Plunder: ${loot} ducats (${['poor', 'standard', 'good', 'great', 'exceptional'][o]} haul).`, tone: 'good', kind: 'sword' });
    log(s, `${ch.name} conquers ${r.name}.`, 'good');
  } else {
    items.push({ title: 'Disaster', text: `The ${r.people} destroy the expedition.`, tone: 'bad', kind: 'skull' });
  }
  if (dead) items.push({ title: 'Losses', text: `${dead} compan${dead > 1 ? 'ies' : 'y'} did not come back.`, tone: 'bad', kind: 'skull' });
  return ok;
}

/** AI crowns also claim lands over time. */
export function aiOverseas(s: GameState) {
  if (s.year < 1470) return;
  const rivals = ['portugal', 'castile', 'france', 'aragon', 'genoa', 'venice'].filter(n => n !== s.player && s.nations[n]?.alive);
  if (!rivals.length) return;
  for (const r of Object.values(REGIONS)) {
    const st = regionState(s, r.id);
    if (st.holder) continue;
    const pace = r.dist === 1 ? 0.012 : r.dist === 2 ? (s.year > 1495 ? 0.01 : 0) : (s.year > 1515 ? 0.008 : 0);
    if (rand(s) < pace) {
      st.holder = rivals[Math.floor(rand(s) * rivals.length)];
      s.flags['ai_bonus_' + st.holder] = (s.flags['ai_bonus_' + st.holder] ?? 0) + r.value;
      if (st.found) log(s, `${nationName(s, st.holder)} claims ${r.name}.`, 'bad');
    }
  }
}

// ---------- specialists ----------
export const PROMOTION: Partial<Record<Role, Role>> = { diplomat: 'explorer', general: 'conqueror', admin: 'colonist' };

export function promoteBlocked(s: GameState, c: Character): string | null {
  const to = PROMOTION[c.role];
  if (!to) return 'This person cannot specialise';
  if (c.ruler) return 'The monarch cannot leave the court';
  if (c.mission != null) return 'Away on a mission';
  if (to !== 'explorer' && !Object.values(s.overseas).some(o => o.found)) return 'Discover a land overseas first';
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
