// Later start dates (1600, 1700): the 1451 world is built first (so every province keeps the
// culture and faith of its old masters), then handed to its owners of that year.
import type { GameState, Nation, Personality, TroopCard } from '../types';
import { STARTS } from '../data/starts';
import { LATER_TABLE, LATER_NATIONS, LATER_SOCIETY, LATER_SUBJECTS } from '../data/later-owners';
import { TECHS, BUILDINGS } from '../data/techs';
import { REGIONS } from '../data/overseas';
import { NO_STATE } from '../data/nations';
import { provsOf, addTreaty, declareWar, initialSettlement, uid } from './core';
import { provRegion, regionState } from './overseas';
import { getGeo } from './map';

/** Realms that appear only in the later starts, in the nations.ts row format. */
export interface LaterNation { id: string; name: string; adj: string; color: string; culture: string; religion: string; capital: string; personality: Personality; gold: number; army: string }
export const LATER_DEFS: LaterNation[] = LATER_NATIONS.trim().split('\n').filter(Boolean).map(l => {
  const [id, name, adj, color, culture, religion, capital, personality, gold, army] = l.split(';');
  return { id, name, adj, color, culture, religion, capital, personality: personality as Personality, gold: +gold, army };
});
const ROWS = Object.fromEntries(LATER_TABLE.trim().split('\n').filter(Boolean).map(l => { const [id, a, b] = l.split(';'); return [id, { 1600: a, 1700: b } as Record<number, string>]; }));

/** Owner of a province in a later start year (1451 owners otherwise). */
export const laterOwner = (id: string, year: number) => ROWS[id]?.[year];

// troop upgrades by the year they had spread (as the AI uses them)
const UPGRADES: [string, string, number][] = [
  ['levy', 'pikemen', 1470], ['men_at_arms', 'pikemen', 1475], ['crossbow', 'arquebusiers', 1485], ['bombard', 'field_cannon', 1495],
  ['pikemen', 'tercio', 1518], ['jinetes', 'reiters', 1540], ['knights', 'cuirassiers', 1550], ['arquebusiers', 'musketeers', 1552],
  ['tercio', 'old_tercio', 1565], ['reiters', 'dragoons', 1615], ['musketeers', 'line_infantry', 1685], ['old_tercio', 'line_infantry', 1695],
];
/** What an old troop type has become by a later start: the common troops of that age, not its elite. */
export function modernize(type: string, year: number): string {
  const m = STARTS[year]?.units;
  if (m) return m[type] ?? type;
  for (let i = 0; i < 6; i++) { const up = UPGRADES.find(([from, , y]) => from === type && year >= y); if (!up) break; type = up[1]; }
  return type;
}

/** Turn the 1451 world just built into the world of a later year. Call after initSociety, before the player's setup. */
export function applyStart(s: GameState, year: number) {
  const st = STARTS[year];
  if (!st) return;
  // owners, cores and a richer land
  for (const p of Object.values(s.provinces)) {
    const o = laterOwner(p.id, year);
    if (!o || !s.nations[o]) continue;
    p.owner = o; p.core = o;
    if (o !== NO_STATE && o !== 'tribes') p.dev = Math.min(8, p.dev + st.devBonus);
    p.control = 80;
  }
  // faith and settlers
  for (const l of LATER_SOCIETY.trim().split('\n').filter(Boolean)) {
    const [id, r1600, r1700, c1700] = l.split(';');
    const p = s.provinces[id]; if (!p) continue;
    const rel = year === 1600 ? r1600 : r1700 || r1600;
    if (rel) p.religion = rel;
    if (year === 1700 && c1700) p.culture = c1700;
  }
  // which realms stand, under what names, ruling from where
  for (const n of Object.values(s.nations)) {
    const r = st.renames[n.id];
    if (r?.name) n.name = r.name;
    if (r?.adj) n.adj = r.adj;
    const mine = provsOf(s, n.id);
    if (!mine.length || n.id === NO_STATE) { n.alive = false; n.army = []; n.fleet = []; continue; }
    n.alive = true;
    const want = r?.capital && s.provinces[r.capital]?.owner === n.id ? r.capital : n.capital;
    n.capital = s.provinces[want]?.owner === n.id ? want : [...mine].sort((a, b) => b.dev - a.dev)[0].id;
    // armies of the age, and about as large as the realm
    n.army = n.army.map(t => ({ ...t, type: modernize(t.type, year) }));
    const want2 = Math.max(n.army.length, Math.round(2 + mine.length / 2.5));
    while (n.army.length < want2) n.army.push({ uid: uid(s), type: modernize(n.army.length % 3 ? 'levy' : 'crossbow', year), vet: 0, str: 100 });
    // fleets of the age: about one ship for every four coastal provinces
    const coast = mine.filter(p => getGeo().coastal[p.id]).length;
    const ships = Math.max((n.fleet ?? []).length, Math.floor(coast / 4));
    n.fleet = Array.from({ length: ships }, () => ({ uid: uid(s), type: year >= 1650 ? 'man_of_war' : 'galleon', vet: 0, str: 100 }));
    n.gold = Math.round(n.gold * (1 + (year - 1451) / 160));
  }
  for (const p of Object.values(s.provinces)) p.settlement = initialSettlement(p.dev, s.nations[p.owner]?.capital === p.id);
  for (const l of LATER_SUBJECTS.trim().split('\n').filter(Boolean)) {
    const [y, sub, over] = l.split(';');
    if (+y !== year || !s.nations[sub]?.alive || !s.nations[over]?.alive) continue;
    s.nations[sub].overlord = over; s.nations[sub].subject = 'vassal'; s.nations[sub].subjectSince = year - 10;
  }
  for (const [a, b] of st.alliances) if (s.nations[a]?.alive && s.nations[b]?.alive) addTreaty(s, a, b, 'alliance');
  for (const [a, b] of st.wars) if (s.nations[a]?.alive && s.nations[b]?.alive) declareWar(s, a, b);
  s.age = { id: st.age, since: year };
  s.flags.siege_done = 1; // Constantinople fell long ago
}

/** The player's realm in a later start: research, government, buildings, an army of its time, a known world. */
export function setupLaterPlayer(s: GameState, year: number) {
  const st = STARTS[year];
  if (!st) return;
  const me = s.nations[s.player];
  s.techs = TECHS.filter(t => t.year < st.techBefore).map(t => t.id);
  s.gov = st.gov[s.player] ?? 'feudal';
  const ps = provsOf(s, s.player).sort((a, b) => b.dev - a.dev);
  const add = (p: (typeof ps)[number], b: string) => { if (!p.buildings.includes(b) && BUILDINGS[b] && (!BUILDINGS[b].tech || s.techs.includes(BUILDINGS[b].tech!))) { p.buildings.push(b); p.grades[b] = 1; } };
  for (const p of ps) {
    if (p.settlement >= 2) { add(p, 'temple'); add(p, 'market'); }
    if (year >= 1700 && p.settlement >= 3) add(p, 'library');
  }
  const cap = s.provinces[me.capital];
  if (cap) { add(cap, 'barracks'); add(cap, 'courthouse'); if (year >= 1700) add(cap, 'university'); }
  s.troops = s.troops.map(t => ({ ...t, type: modernize(t.type, year) } as TroopCard));
  const extra = Math.max(0, Math.round(ps.length / 3) - s.troops.length);
  for (let i = 0; i < extra; i++) s.troops.push({ uid: uid(s), type: modernize(i % 2 ? 'levy' : 'crossbow', year), vet: 0, str: 100 });
  const coast = ps.filter(p => getGeo().coastal[p.id]).length;
  const ships = Math.max(s.fleet.length, Math.floor(coast / 4));
  s.fleet = Array.from({ length: Math.min(ships, 12) }, () => ({ uid: uid(s), type: year >= 1650 ? 'man_of_war' : 'galleon', vet: 0, str: 100 }));
  me.gold = Math.round(me.gold * (1 + (year - 1451) / 160));
  // Europeans have charted the world; others know their own corner and whoever trades there
  const european = ['europe', 'russia'].includes(provRegion(me.capital));
  for (const r of Object.keys(REGIONS)) if (european && !(year < 1700 && r === 'oceania')) regionState(s, r).found = true;
  for (const p of Object.values(s.provinces)) if (p.owner === s.player) regionState(s, provRegion(p.id)).found = true;
}

/** Nation entries for the later starts' own realms, ready for newGame. */
export function laterNation(d: LaterNation, armies: Record<string, string[]>, startYear: number): Omit<Nation, 'ruler'> {
  return {
    id: d.id, name: d.name, adj: d.adj, color: d.color, culture: d.culture, capital: d.capital, gold: d.gold, manpower: 10, stability: 1, prestige: 0,
    personality: d.personality, alive: true, fleet: [],
    army: (armies[d.army] ?? armies.M ?? ['levy', 'levy', 'crossbow']).map(type => ({ uid: 0, type: modernize(type, startYear), vet: 0, str: 100 })),
  };
}
