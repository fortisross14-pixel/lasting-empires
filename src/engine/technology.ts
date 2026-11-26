// The one place that says what a realm can raise, forge, equip and study (docs/HISTORY-PLAN.md, part II).
// Every path asks here: class cards, equipment cards, forging, starting armies, later starts, AI recruiting,
// AI upgrades, AI ships, research and goods. Each answer carries its reason, so the screen shows what the engine
// enforces. Capabilities come from the realm's heritage (data/heritage.ts), what had spread by a later start,
// strangers' studies the player has made, and what an AI realm has adopted through years of contact.
import type { GameState, Nation } from '../types';
import { HERITAGES, CULTURE_HERITAGE, NATION_CAPS, LATER_CAPS, ADOPT_YEARS, NOT_BY_CONTACT, CAPABILITIES, type Capability, type Heritage } from '../data/heritage';
import { TECH, TECHS } from '../data/techs';
import { TROOPS, EQUIPMENT, type Recipe } from '../data/troops';
import { borders, atWar, hasTreaty } from './core';
import { TECH_GROUPS, groupOfCulture } from '../data/techgroups';
import { HERITAGE_LINES } from '../data/national';

export type { Capability, Heritage };
export interface Availability { ok: boolean; why: string | null; missing: Capability[]; }
const OK: Availability = { ok: true, why: null, missing: [] };

/** The heritage of a realm: its nation's own if set, else its people's, else Western European. */
export function heritageOf(s: GameState, id: string): Heritage {
  const n = s.nations[id];
  return NATION_CAPS[id]?.heritage ?? CULTURE_HERITAGE[n?.culture ?? ''] ?? 'western_european';
}
export const heritageDef = (s: GameState, id: string) => HERITAGES[heritageOf(s, id)];

/** Capabilities a realm starts with: its heritage, its own differences, and what had spread by a later start. */
export function startCaps(s: GameState, id: string): Set<Capability> {
  const h = heritageOf(s, id), o = NATION_CAPS[id];
  const out = new Set<Capability>(HERITAGES[h].caps);
  for (const y of Object.keys(LATER_CAPS).map(Number).filter(y => y <= (s.startYear ?? 1451))) for (const c of LATER_CAPS[y][h] ?? []) out.add(c);
  for (const c of o?.add ?? []) out.add(c);
  for (const c of o?.remove ?? []) out.delete(c);
  return out;
}

/** Everything a realm can do now. Worked out once a season and kept (the answer is asked many times a turn). */
let memo = { key: '', caps: new Map<string, Set<Capability>>() };
export function capsOf(s: GameState, id = s.player): Set<Capability> {
  const key = `${s.seed}|${s.year}|${s.quarter ?? 0}|${s.techs.length}`;
  if (memo.key !== key) memo = { key, caps: new Map() };
  const hit = memo.caps.get(id);
  if (hit) return hit;
  const out = startCaps(s, id);
  if (id === s.player) { for (const t of s.techs) for (const c of TECH[t]?.grants ?? []) out.add(c); }
  for (const c of s.nations[id]?.learned ?? []) out.add(c);
  memo.caps.set(id, out);
  return out;
}
/** Forget the kept answers (after a research or an adoption within the same season). */
export const clearCapsMemo = () => { memo = { key: '', caps: new Map() }; };

/** What each kind of soldier and ship needs. Peoples' own soldiers (warriors, slingers…) need nothing beyond their
 *  heritage; European types need what made them. */
const UNIT_NEEDS: Record<string, Capability[]> = {
  crossbow: ['iron'], men_at_arms: ['iron', 'plate'], knights: ['iron', 'plate', 'horses'], jinetes: ['horses'],
  bombard: ['cannon'], field_cannon: ['cannon'], pikemen: ['iron'], arquebusiers: ['gunpowder'], swiss: ['iron'],
  tercio: ['iron', 'gunpowder'], reiters: ['horses', 'gunpowder'], cuirassiers: ['iron', 'plate', 'horses', 'gunpowder'],
  musketeers: ['gunpowder'], old_tercio: ['iron', 'gunpowder'], dragoons: ['horses', 'gunpowder'], line_infantry: ['gunpowder', 'iron'],
  shield_warriors: ['iron'], sahel_horse: ['horses', 'iron'], janissaries: ['iron'], sipahis: ['horses', 'iron'], horse_archers: ['horses'],
  rajput_swords: ['iron'], war_elephants: ['elephants'], azaps: ['iron'], militia: [], horse_archers_foot: [],
  galley: ['ships'], caravel: ['ships', 'ocean'], carrack: ['ships', 'ocean'], galleass: ['ships', 'cannon'], galleon: ['ships', 'ocean', 'cannon'], man_of_war: ['ships', 'ocean', 'cannon'],
};
export const unitNeeds = (type: string): Capability[] => UNIT_NEEDS[type] ?? [];
const EQUIP_NEEDS: Record<string, Capability[]> = {
  long_pike: ['iron'], arquebus: ['gunpowder'], plate: ['iron', 'plate'], warhorse: ['horses'], bronze: ['cannon'],
  pistols: ['gunpowder', 'horses'], musket: ['gunpowder'], bayonet: ['gunpowder', 'iron'], banner: [],
};
export const equipNeeds = (id: string): Capability[] => EQUIP_NEEDS[id] ?? [];
/** Does this soldier or ship burn powder (for the goods it needs: trade.ts)? */
export const usesPowder = (type: string) => unitNeeds(type).some(c => c === 'gunpowder' || c === 'cannon');

const capName = (c: Capability) => CAPABILITIES.find(x => x.id === c)?.name.toLowerCase() ?? c;
/** The strangers' study that opens a capability, if there is one. */
export const bridgeFor = (c: Capability) => TECHS.find(t => t.bridge && t.grants?.includes(c));
function missingWhy(missing: Capability[]): string {
  const c = missing[0];
  if (NOT_BY_CONTACT.includes(c)) return `Your people have no ${capName(c)}`;
  const b = bridgeFor(c);
  return `Your people have no ${capName(c)}${b ? `: ${b.name} opens it, once you have met a people who know it` : ''}`;
}
function check(have: Set<Capability>, needs: Capability[]): Availability {
  const missing = needs.filter(c => !have.has(c));
  return missing.length ? { ok: false, why: missingWhy(missing), missing } : OK;
}

/** Can this realm raise this soldier or ship? For the player the research it needs counts too. */
/** A unit of another nation's or another heritage's tradition (null: open to this realm). */
function foreignUnit(s: GameState, id: string, type: string): string | null {
  const t = TROOPS[type];
  if (t?.only && !t.only.includes(id)) return `${t.name}: a tradition of ${t.only.map(n => s.nations[n]?.name ?? n).join(' and ')}`;
  if (t?.heritages && !t.heritages.includes(heritageOf(s, id))) return `${t.name}: not of your people's traditions`;
  return null;
}
export function canRecruitUnit(s: GameState, id: string, type: string): Availability {
  const t = TROOPS[type];
  if (!t) return { ok: false, why: 'Unknown troop', missing: [] };
  const foreign = foreignUnit(s, id, type);
  if (foreign) return { ok: false, why: foreign, missing: [] };
  const c = check(capsOf(s, id), unitNeeds(type));
  if (!c.ok) return c;
  if (id === s.player && t.tech && !s.techs.includes(t.tech)) return { ok: false, why: `Needs ${TECH[t.tech]?.name ?? 'research'}`, missing: [] };
  return OK;
}
/** Capabilities only (no research): can this realm ever field this soldier as things stand? */
export const canEverRecruit = (s: GameState, id: string, type: string) => !foreignUnit(s, id, type) && check(capsOf(s, id), unitNeeds(type)).ok;

/** Can this realm make or use this equipment? */
export function canAcquireEquipment(s: GameState, id: string, eq: string): Availability {
  const e = EQUIPMENT[eq];
  if (!e) return { ok: false, why: 'Unknown equipment', missing: [] };
  const c = check(capsOf(s, id), equipNeeds(eq));
  if (!c.ok) return c;
  if (id === s.player && e.tech && !s.techs.includes(e.tech)) return { ok: false, why: `Needs ${TECH[e.tech]?.name ?? 'research'}`, missing: [] };
  return OK;
}

/** Can this realm forge this recipe? Both parts and the result must be within its means, and its research. */
export function canForgeRecipe(s: GameState, id: string, r: Recipe): Availability {
  for (const part of [r.a, r.b]) {
    const c = TROOPS[part] ? check(capsOf(s, id), unitNeeds(part)) : check(capsOf(s, id), equipNeeds(part));
    if (!c.ok) return c;
  }
  const foreign = foreignUnit(s, id, r.out);
  if (foreign) return { ok: false, why: foreign, missing: ['plate'] as Capability[] }; // never forgeable here: treated like a missing means
  const out = check(capsOf(s, id), unitNeeds(r.out));
  if (!out.ok) return out;
  if (id === s.player && r.tech && !s.techs.includes(r.tech)) return { ok: false, why: `Needs ${TECH[r.tech]?.name ?? 'research'}`, missing: [] };
  return OK;
}

/** Realms in meaningful contact: a shared border, a war or a trade treaty. Seeing a coast on the map is not contact. */
export const inContact = (s: GameState, a: string, b: string) => borders(s, a, b) || atWar(s, a, b) || hasTreaty(s, a, b, 'trade');
/** A realm in contact with this one that has the capability, if any. */
export function teacherOf(s: GameState, id: string, c: Capability): string | null {
  for (const n of Object.values(s.nations)) if (n.alive && n.id !== id && inContact(s, id, n.id) && capsOf(s, n.id).has(c)) return n.id;
  return null;
}

/** Is this study one this realm's traditions allow at all? National and regional traditions belong to their own;
 *  the screens leave the others out entirely (they can never apply). */
export function techOpenTo(s: GameState, id: string, techId: string): boolean {
  const t = TECH[techId];
  if (!t) return false;
  if (t.only && !t.only.includes(id)) return false;
  if (t.heritage && !t.heritage.includes(heritageOf(s, id))) return false;
  return true;
}
/** Is this building one of the realm's own traditions, or open to all? */
export const buildingOpenTo = (id: string, only?: string[]) => !only || only.includes(id);

/** Why a study cannot be made yet, from the realm's means (null: nothing in its way here). A strangers' study needs
 *  something it opens to be missing, and a realm in contact that has it; any other study needs its capabilities. */
export function researchBlock(s: GameState, techId: string, id = s.player): string | null {
  const t = TECH[techId];
  if (!t) return 'Unknown study';
  if (!techOpenTo(s, id, techId)) return `A tradition of ${t.only ? t.only.map(n => s.nations[n]?.name ?? n).join(' and ') : 'another people'}`;
  const have = capsOf(s, id);
  if (t.bridge) {
    const missing = (t.grants ?? []).filter(c => !have.has(c));
    if (!missing.length) return 'Not needed: your people know these things already';
    if (!missing.some(c => teacherOf(s, id, c))) return `Needs contact with a people who have ${missing.map(capName).join(' and ')}: a shared border, a war or a trade treaty`;
    return null;
  }
  const missing = (t.needs ?? []).filter(c => !have.has(c));
  return missing.length ? missingWhy(missing) : null;
}

/** Once a year, for every AI realm: a capability spreads to it after enough years of contact with a realm that has
 *  it (ADOPT_YEARS), never by the calendar. Plate harness and elephants do not spread this way. Returns what was
 *  adopted, for the log. The player learns by research instead (strangers' studies). */
export function adoptByContact(s: GameState): { nation: string; cap: Capability; from: string }[] {
  const out: { nation: string; cap: Capability; from: string }[] = [];
  for (const n of Object.values(s.nations) as Nation[]) {
    if (!n.alive || n.id === s.player) continue;
    const have = capsOf(s, n.id);
    for (const c of Object.keys(ADOPT_YEARS) as Capability[]) {
      if (have.has(c) || NOT_BY_CONTACT.includes(c)) continue;
      if (c === 'ocean' && !have.has('ships')) continue; // the open ocean needs a sea tradition first
      const from = teacherOf(s, n.id, c);
      n.exposure ??= {};
      if (!from) continue;
      n.exposure[c] = (n.exposure[c] ?? 0) + 1;
      if (n.exposure[c]! >= ADOPT_YEARS[c]!) { (n.learned ??= []).push(c); delete n.exposure[c]; out.push({ nation: n.id, cap: c, from }); }
    }
  }
  if (out.length) clearCapsMemo();
  return out;
}

/** National formations and the generic form other realms field instead. */
const SUBSTITUTE: Record<string, string> = { tercio: 'pike_and_shot', old_tercio: 'pike_and_shot', inca_guard: 'mace_warriors', jaguar_warriors: 'macuahuitl_warriors', eagle_warriors: 'macuahuitl_warriors' };
/** The nearest soldier this realm can field in place of one it cannot: the best of the same kind in its own line
 *  that its means allow, else its most basic foot. Null only when it has no soldier of that kind at all. */
export function fitUnit(s: GameState, id: string, type: string, lines: Partial<Record<string, string[]>>): string | null {
  if (canEverRecruit(s, id, type)) return type;
  // a national formation other realms field in its generic form (the Tercio is Spain's Pike and Shot)
  const generic = SUBSTITUTE[type];
  if (generic && canEverRecruit(s, id, generic)) return generic;
  // the realm's own soldier of the same place in the line, if it can field that
  const local = localFor(s, id, type);
  if (local && local !== type && canEverRecruit(s, id, local)) return local;
  const kind = TROOPS[type]?.kind;
  const cls = type === 'levy' ? 'levy' : kind === 'cav' ? 'cav' : kind === 'shot' ? 'shot' : kind === 'art' ? 'art' : kind === 'ship' ? 'ship' : 'inf';
  if (cls === 'ship') return ['galleon', 'carrack', 'galley'].find(t => canEverRecruit(s, id, t)) ?? null;
  const line = lines[cls] ?? [];
  const best = [...line].reverse().find(t => canEverRecruit(s, id, t));
  if (best) return best;
  // a kind it cannot raise at all (no horses, no guns): stand in foot soldiers, as the realm would
  if (cls === 'cav' || cls === 'art') return [...(lines.inf ?? []), ...(lines.levy ?? [])].reverse().find(t => canEverRecruit(s, id, t)) ?? null;
  return [...(lines.levy ?? [])].find(t => canEverRecruit(s, id, t)) ?? null;
}

/** Make every army and fleet in the world fit its realm's means (at the start of a game, after a later start is laid
 *  out, and after loading an older save): a company the realm cannot field becomes the nearest it can, or goes. */
export function fitAllArmies(s: GameState, linesOf: (id: string) => Partial<Record<string, string[]>>): number {
  let changed = 0;
  const fit = <T extends { type: string }>(id: string, list: T[]): T[] => list.flatMap(t => {
    const local = TROOPS[t.type]?.kind === 'ship' ? t.type : localFor(s, id, t.type) ?? t.type;
    const f = fitUnit(s, id, local, linesOf(id));
    if (f !== t.type) changed++;
    return f ? [{ ...t, type: f }] : [];
  });
  for (const n of Object.values(s.nations)) {
    if (!n.alive || n.id === s.player) continue;
    n.army = fit(n.id, n.army); n.fleet = fit(n.id, n.fleet ?? []);
  }
  s.troops = fit(s.player, s.troops); s.fleet = fit(s.player, s.fleet);
  return changed;
}

/** The soldiers a realm raises, by kind: its heritage's own line where it has one, else its region's. */
export function linesOf(s: GameState, id: string): Partial<Record<string, string[]>> {
  const group = TECH_GROUPS[groupOfCulture(s.nations[id]?.culture ?? '')].lines;
  return { ...group, ...(HERITAGE_LINES[heritageOf(s, id)] ?? {}) };
}
/** The European types in order, to find what a type stands for in another realm's line. */
const EURO_LINES = TECH_GROUPS.western.lines as Record<string, string[]>;
/** The realm's own soldier in place of a European (or another people's) type: same kind, same place in the line. */
export function localFor(s: GameState, id: string, type: string): string | null {
  const lines = linesOf(s, id);
  if (Object.values(lines).some(l => l?.includes(type))) return type;
  const kind = TROOPS[type]?.kind;
  if (kind === 'ship') return type;
  for (const [cls, line] of Object.entries(EURO_LINES)) {
    const i = line.indexOf(type);
    if (i < 0) continue;
    const mine = lines[cls];
    return mine?.length ? mine[Math.min(i, mine.length - 1)] : null;
  }
  const cls = type === 'levy' ? 'levy' : kind === 'cav' ? 'cav' : kind === 'shot' ? 'shot' : kind === 'art' ? 'art' : 'inf';
  const mine = lines[cls] ?? lines.inf;
  return mine?.length ? mine[mine.length - 1] : null;
}

/** The soldier a realm gets in place of `type`, within its means (null: none of that kind). For events and cards
 *  that hand out troops by name: three Men-at-Arms for Castile are three Elite Warriors for the Aztecs. */
export function fitType(s: GameState, id: string, type: string): string | null {
  return fitUnit(s, id, type, linesOf(s, id));
}
/** Add a company to a realm's army (or the player's troops or fleet), fitted to its means. Returns the type raised. */
export function raise(s: GameState, id: string, type: string, vet = 0, str = 100, newUid: () => number): string | null {
  const t = fitType(s, id, type);
  if (!t) return null;
  const card = { uid: newUid(), type: t, vet, str };
  if (id === s.player) (TROOPS[t].kind === 'ship' ? s.fleet : s.troops).push(card);
  else if (TROOPS[t].kind === 'ship') (s.nations[id].fleet ??= []).push(card); else s.nations[id].army.push(card);
  return t;
}
