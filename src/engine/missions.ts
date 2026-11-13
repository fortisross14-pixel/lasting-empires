import { maxFort } from './core';
// Missions: characters (and troops) sent to do things over several years.
import { onTech } from './ages';
import { troopsNear, travel, locOf, bySea, nearestGarrison, baseFor, buildBase } from './army';
import { missionsLeft, missionCap, rankOf } from './realm';
import type { GameState, Mission, MissionKind, RevealItem, Character, Role } from '../types';
import { CARDS, drawCat, CAT_INFO } from './cards';
import { vassalizeBlocked, integrateBlocked, makeSubject, integrate, heldShare } from './diplo';
import { RELIGION_NAMES, isAccepted } from './society';
import { transportOf } from './navy';
import { colonizeBlocked, conquistaBlocked, discoverable, resolveExplore, resolveColonize, resolveConquista, colonyCost, colonizeTurns, oceanReach } from './overseas';
import { NO_STATE } from '../data/nations';
import { GOODS } from '../data/goods';
import { GENRES, QUALITY } from '../data/culture';
import { artCost, createWork, addChurchRel, churchRel, churchHead, acceptBlocked, cultureName } from './culture';
import { routeBlocked, postBlocked, postTurns, postCost, POST_UPKEEP, dealFor, merchantFactor, price, supplies, routeCap, shortfallCost, takeGoods, materialsFor, defaultMake } from './trade';
import { OUTCOMES, RARITY, commandOf, GENERIC_COMMAND } from '../data/characters';
import { TECH, AGE_NAMES } from '../data/techs';
import { BUILDINGS } from '../data/techs';
import {
  player, provsOf, hasTech, getRel, addRel, addTreaty, hasTreaty, atWar, findWar, makePeace, rulerMod, clamp,
  ageId, rand, pick, uid, log, nationName, armyPower, buildingAllowed, push, buildingCost, inflation, ownGoods, traitMult, promoteRarity,
  rollOutcome, outcomeName, TIERS, tierOf, GROW_DEV, hasCore, rollBest, rollTraits, techFx, ageIndex } from './core';
import { getGeo } from './map';
import { createBattle, makeSide, toBattleUnits, genericGeneral, freeMission, transferProvince } from './battle';

export const MISSION_INFO: Record<MissionKind, { name: string; role: Role; icon: string; verb: string }> = {
  conquer: { name: 'Conquest', role: 'general', icon: 'sword', verb: 'Conquer' },
  base: { name: 'Invasion Base', role: 'general', icon: 'tower', verb: 'Set up a base to strike' },
  raid: { name: 'Raid', role: 'general', icon: 'torch', verb: 'Raid' },
  relations: { name: 'Embassy', role: 'diplomat', icon: 'scroll', verb: 'Improve relations with' },
  trade: { name: 'Trade Treaty', role: 'diplomat', icon: 'coin', verb: 'Sign a trade treaty with' },
  alliance: { name: 'Alliance', role: 'diplomat', icon: 'hands', verb: 'Seek an alliance with' },
  marriage: { name: 'Royal Marriage', role: 'diplomat', icon: 'ring', verb: 'Arrange a marriage with' },
  peace: { name: 'Peace Talks', role: 'diplomat', icon: 'dove', verb: 'Negotiate peace with' },
  research: { name: 'Study', role: 'researcher', icon: 'book', verb: 'Research' },
  build: { name: 'Construction', role: 'admin', icon: 'hammer', verb: 'Build' },
  develop: { name: 'Development', role: 'admin', icon: 'wheat', verb: 'Develop' },
  found: { name: 'New Settlement', role: 'admin', icon: 'tower', verb: 'Found a settlement in' },
  grow: { name: 'Growing Settlement', role: 'admin', icon: 'tower', verb: 'Grow the settlement of' },
  tax: { name: 'Tax Collection', role: 'admin', icon: 'coin', verb: 'Collect taxes' },
  progress: { name: 'Royal Progress', role: 'admin', icon: 'crown', verb: 'Tour the realm' },
  explore: { name: 'Voyage of Discovery', role: 'explorer', icon: 'anchor', verb: 'Sail into the unknown' },
  colonize: { name: 'Colony', role: 'colonist', icon: 'tower', verb: 'Settle' },
  conquista: { name: 'Conquista', role: 'conqueror', icon: 'sword', verb: 'Conquer' },
  vassalize: { name: 'Demand Fealty', role: 'diplomat', icon: 'crown', verb: 'Demand fealty from' },
  integrate: { name: 'Integration', role: 'diplomat', icon: 'hands', verb: 'Integrate' },
  patronage: { name: 'Patronage', role: 'artist', icon: 'star', verb: 'Commission works of art for' },
  convert: { name: 'Religious Mission', role: 'priest', icon: 'church', verb: 'Convert' },
  grace: { name: 'Royal Grace', role: 'leader', icon: 'mood', verb: 'Win the hearts of' },
  assimilate: { name: 'Cultural Integration', role: 'leader', icon: 'scroll', verb: 'Integrate the people of' },
  route: { name: 'Trade Route', role: 'merchant', icon: 'coin', verb: 'Open a trade route with' },
  post: { name: 'Trade Post', role: 'merchant', icon: 'anchor', verb: 'Open a trade post in' },
  artwork: { name: 'Work of Art', role: 'artist', icon: 'quill', verb: 'Create' },
  pilgrimage: { name: 'Mission to the Church', role: 'priest', icon: 'church', verb: 'Win the favour of' },
  accept: { name: 'Embrace a Culture', role: 'leader', icon: 'people', verb: 'Embrace the' },
  assist: { name: 'Collaboration', role: 'researcher', icon: 'people', verb: 'Help with the study of' },
};

/** Scholars helping a study add this share of their research. */
export const ASSIST_SHARE = 0.75;
export const helpersOf = (s: GameState, studyId: number) => s.missions.filter(m => m.kind === 'assist' && m.target === String(studyId));

/** Goods a project uses up when it starts. */
export function projectGoods(kind: MissionKind, building?: string): Record<string, number> {
  if (kind === 'build' && building) return { materials: materialsFor(building) };
  if (kind === 'develop') return { materials: 2 };
  if (kind === 'found') return { materials: 3 };
  if (kind === 'grow') return { materials: 4 };
  if (kind === 'patronage') return { arts: 2 };
  if (kind === 'artwork') return building === 'monument' ? { arts: 1, materials: 3 } : { arts: 2 };
  return {};
}
/** Ducats to buy what the warehouses lack for a project. */
export const projectShortfall = (s: GameState, kind: MissionKind, building?: string) => shortfallCost(s, projectGoods(kind, building));

/** Who can carry out a mission started by this card. */
export function cardRole(cardId: string): Role {
  const d = CARDS[cardId];
  return d.agent ?? CAT_INFO[d.cat].role;
}

const SPECIAL_BASE: Partial<Record<Role, Role>> = { explorer: 'diplomat', colonist: 'admin', conqueror: 'general', priest: 'courtier', artist: 'courtier', leader: 'courtier' };

/** Everyone who may take this card. People of the base role turn into the specialist when sent. */
export function cardRoles(cardId: string): Role[] {
  const r = cardRole(cardId);
  if (r === 'general') return ['general', 'admiral'];
  const base = SPECIAL_BASE[r];
  return base ? [r, base] : [r];
}

/** The role this person takes on for good by going on this mission, if any. */
export function becomesOnMission(kind: MissionKind, ch: Character, withShips: boolean): Role | null {
  if (ch.ruler) return null;
  if (kind === 'explore' && ch.role === 'diplomat') return 'explorer';
  if (kind === 'colonize' && ch.role === 'admin') return 'colonist';
  if (kind === 'conquista' && ch.role === 'general') return 'conqueror';
  if ((kind === 'conquer' || kind === 'raid') && withShips && ch.role === 'general') return 'admiral';
  if (ch.role === 'courtier') {
    if (kind === 'convert' || kind === 'pilgrimage') return 'priest';
    if (kind === 'artwork' || kind === 'patronage') return 'artist';
    if (kind === 'assimilate' || kind === 'grace' || kind === 'accept') return 'leader';
  }
  return null;
}

function specialise(s: GameState, ch: Character, role: Role) {
  ch.role = role;
  ch.traits = rollTraits(s, role, RARITY[ch.rarity].traits);
  log(s, `${ch.name} becomes ${role === 'explorer' || role === 'admiral' ? 'an ' + role : 'a ' + role}. There is no going back.`, 'good');
}

const townSlotsText = (lvl: number) => `${[0, 1, 2, 4, 6][lvl]} town building slots.`;

/** Building quality by outcome. */
export const GRADES = [
  { name: 'Shoddy', mult: 0.75 }, { name: 'Standard', mult: 1 }, { name: 'Fine', mult: 1.25 }, { name: 'Grand', mult: 1.5 }, { name: 'Wonder', mult: 2 },
];

export const developCost = (s: GameState, prov: string) => Math.round((25 + s.provinces[prov].dev * 15) * inflation(s));

export const foundCost = (s: GameState) => Math.round(50 * inflation(s));
export const growCost = (s: GameState, prov: string) => Math.round((40 + 30 * (s.provinces[prov]?.settlement ?? 0)) * inflation(s));

/** Goods a trade partner can sell you that you do not have. */

export const patronageCost = (s: GameState) => Math.round(45 * inflation(s));
export const pilgrimageCost = (s: GameState) => Math.round(20 * inflation(s));

export const voyageCost = (s: GameState) => Math.round(30 * inflation(s));

export const DIPLO: MissionKind[] = ['relations', 'trade', 'alliance', 'marriage', 'peace', 'vassalize', 'integrate'];

export function techCost(s: GameState, techId: string): number {
  const t = TECH[techId];
  return Math.round(t.cost * (1 + Math.max(0, t.year - s.year) / 20)); // ideas ahead of their time are dear
}

export function researchRate(s: GameState, ch: Character, track?: string): number {
  const unis = Math.min(2, provsOf(s, s.player).filter(p => p.buildings.includes('university')).length);
  let r = 2 + ch.skill + unis + rulerMod(s, 'research') + techFx(s, 'research') + (s.flags.reform_research ?? 0) + (s.flags.printing_bonus ?? 0);
  const m = traitMult(ch);
  if (ch.traits.includes('scholar')) r += 1 * m;
  if (ch.traits.includes('polymath')) r += 2 * m;
  if (track) {
    if (track === 'military' && ch.traits.includes('inventor')) r += 2 * m;
    if (track === 'economy' && ch.traits.includes('economist')) r += 2 * m;
    if (track === 'state' && ch.traits.includes('jurist')) r += 2 * m;
  }
  if (hasCore(s, 'open')) r *= 1.25;
  if (hasCore(s, 'traditional')) r *= 0.85;
  return Math.max(1, Math.round(r * 10) / 10);
}

/** Can the player strike this province, and how? Troops must stand within a quarter's march (a garrison or a base). */
export function attackRoute(s: GameState, target: string): { turns: number; naval: boolean } | null {
  const near = troopsNear(s, s.player, target);
  if (!near.length) return null;
  const best = Math.min(...near.map(t => travel(locOf(s, t), target)));
  const naval = near.every(t => bySea(locOf(s, t), target));
  let turns = Math.max(1, best);
  if (naval && hasCore(s, 'land')) turns += 1;
  return { turns, naval };
}

/** Years a religious or cultural mission takes, by the administrator's rarity. */
export const RARITY_YEARS: Record<string, number> = { legendary: 2, epic: 3, rare: 4, uncommon: 5, common: 6 };
/** Happiness a Royal Grace adds, by outcome (it fades by 1 a year). */
export const GRACE_GAIN = [4, 10, 14, 20, 28];

export const graceCost = (s: GameState) => Math.round(20 * inflation(s));

/** How many turns (quarters) a mission takes. */
export function missionTurns(s: GameState, kind: MissionKind, ch: Character, target: string, building?: string): number {
  switch (kind) {
    case 'conquer': case 'raid': return attackRoute(s, target)?.turns ?? 2;
    case 'base': { const ng = nearestGarrison(s, target); return Math.max(1, (ng?.t ?? 3) - 1); }
    case 'research': return Math.max(1, Math.ceil(techCost(s, target) / (researchRate(s, ch, TECH[target]?.track) / 4)));
    case 'build': {
      const b = BUILDINGS[building!];
      const fast = (b.group === 'internal' && ch.traits.includes('architect')) || (b.group === 'economy' && ch.traits.includes('guildmaster'));
      return Math.max(2, b.turns * 3 - (fast ? (traitMult(ch) >= 1.75 ? 4 : 2) : 0));
    }
    case 'explore': return ch.traits.includes('cartographer') ? 4 : 6;
    case 'colonize': return colonizeTurns(s, target) * 3;
    case 'conquista': return (attackRoute(s, target)?.turns ?? 3) + 1;
    case 'vassalize': return 4;
    case 'integrate': return 12;
    case 'patronage': return 4;
    case 'convert': return Math.max(2, RARITY_YEARS[ch.rarity] * 3 - (ch.traits.includes('zealous') ? 2 : 0));
    case 'assimilate': return (RARITY_YEARS[ch.rarity] + 1) * 3;
    case 'grace': return Math.max(2, RARITY_YEARS[ch.rarity]);
    case 'develop': case 'found': case 'grow': return 8;
    case 'tax': return 2;
    case 'progress': return 4;
    case 'route': return 1;
    case 'assist': return s.missions.find(m => String(m.id) === target)?.turnsLeft ?? 1;
    case 'artwork': return Math.max(1, Math.round((target === 'monument' ? 8 : 4) / (ch.traits.includes('prolific') ? 2 : 1)));
    case 'pilgrimage': return 2;
    case 'accept': return Math.max(2, RARITY_YEARS[ch.rarity]);
    case 'post': return postTurns(s, target);
    default: {
      // the journey out, then talks; the envoy comes home afterwards
      const talks = { relations: 0, trade: 1, alliance: 1, marriage: 1, peace: 0 }[kind as 'relations'] ?? 0;
      return Math.max(1, envoyTravel(s, target) + talks - (hasTech(s, 'chancery') ? 1 : 0) - (ch.traits.includes('envoy') ? 1 : 0));
    }
  }
}

export function diploChance(s: GameState, kind: MissionKind, ch: Character, target: string, bonus = 0): number {
  const rel = getRel(s, s.player, target);
  const nat = s.nations[target];
  let p = ({ relations: 0.9, trade: 0.55, marriage: 0.45, alliance: 0.4, peace: 0.35, vassalize: 0.35, integrate: 0.55 } as Record<string, number>)[kind] ?? 0.5;
  p += ch.skill * 0.06 + rel / 250 + bonus + rulerMod(s, 'diplo');
  if (ch.traits.includes('silver')) p += 0.1 * traitMult(ch);
  if (kind === 'marriage' && ch.traits.includes('matchmaker')) p += 0.2 * traitMult(ch);
  if (kind === 'vassalize' && hasTreaty(s, s.player, target, 'marriage')) p += 0.25; // married houses: the crown is half theirs already
  if (hasTech(s, 'chancery')) p += 0.1;
  if ((nat.spiedUntil ?? 0) > s.year) p += 0.1;
  if (kind === 'trade' && nat.personality === 'merchant') p += 0.1;
  if (kind === 'trade' && hasCore(s, 'open')) p += 0.1;
  if (nat.personality === 'expansionist') p -= 0.08;
  if (kind === 'alliance') {
    const need = hasTech(s, 'embassies') ? 25 : 40;
    if (rel < need) p -= 0.35;
  }
  if (kind === 'peace') {
    const w = findWar(s, s.player, target);
    if (w && heldShare(s, target) >= 0.5) return 1; // you hold their heartland: they must talk
    if (w) {
      const mine = w.a === s.player ? w.gainsA : w.gainsB, theirs = w.a === s.player ? w.gainsB : w.gainsA;
      p += (mine - theirs) * 0.12 + (s.year - w.since) * 0.04;
      const ratio = armyPower(s.troops) / Math.max(1, armyPower(nat.army));
      p += clamp(ratio - 1, -1, 1) * 0.2;
      p -= rel / 250; // relations do not help much here
    }
  }
  // a much stronger crown is hard to refuse (and a much weaker one easy to)
  if (['relations', 'trade', 'marriage', 'alliance', 'vassalize', 'integrate'].includes(kind)) p += powerEdge(s, target);
  p -= 0.06 * Math.max(0, player(s).stability < 0 ? -player(s).stability : 0);
  return clamp(p, 0.05, diploCap(rel));
}

/** Best odds a mission can have: 95%, rising to 99% with relations of 80 or more. */
export const diploCap = (rel: number) => (rel >= 80 ? 0.99 : 0.95);
/** −15%…+25% from the balance of power: army plus 3 per province, on a log scale. */
export function powerEdge(s: GameState, target: string): number {
  const mine = armyPower(s.troops) + 3 * provsOf(s, s.player).length;
  const theirs = armyPower(s.nations[target]?.army ?? []) + 3 * provsOf(s, target).length;
  return clamp(0.06 * Math.log2(Math.max(0.01, mine) / Math.max(1, theirs)), -0.15, 0.25);
}

/** Returns a reason the mission cannot be launched, or null. */
export function missionBlocked(s: GameState, kind: MissionKind, target: string, building?: string): string | null {
  const me = s.player;
  if (kind === 'post') return postBlocked(s, target);
  if (kind === 'assist') {
    const st = s.missions.find(m => String(m.id) === target && m.kind === 'research');
    if (!st) return 'Choose a study under way';
    if (helpersOf(s, st.id).length >= 2) return 'Two scholars already help with it';
    return null;
  }
  if (kind === 'artwork') {
    if (!GENRES[target]) return 'Choose a kind of work';
    const cost = artCost(s, target) + projectShortfall(s, 'artwork', target);
    return player(s).gold < cost ? `Needs ${cost} ducats` : null;
  }
  if (kind === 'pilgrimage') {
    if (s.missions.some(m => m.kind === 'pilgrimage')) return 'A churchman is already on the way';
    return player(s).gold < pilgrimageCost(s) ? `Needs ${pilgrimageCost(s)} ducats` : null;
  }
  if (kind === 'accept') return acceptBlocked(s, target);
  if (kind === 'route') { const n = s.nations[target]; return !n?.alive ? 'Choose a realm' : atWar(s, me, target) ? `You are at war with ${n.name}` : null; }
  if (kind === 'base') {
    const p = s.provinces[target];
    if (!p || p.owner === me) return 'Choose an enemy province';
    if (!atWar(s, me, p.owner)) return `You are not at war with ${nationName(s, p.owner)}`;
    if (baseFor(s, target)) return 'You already have a base within reach';
    const ng = nearestGarrison(s, target);
    if (ng && ng.t <= 1) return 'Close enough already: attack directly';
    if (s.missions.some(m => m.kind === 'base')) return 'An invasion base is already being prepared';
    return null;
  }
  if (kind === 'conquer' || kind === 'raid') {
    const p = s.provinces[target];
    if (!p || p.owner === me) return 'Choose a foreign province';
    if (p.owner === NO_STATE) return 'No state rules here: send a colonist instead';
    if (!atWar(s, me, p.owner)) return `You are not at war with ${nationName(s, p.owner)}`;
    if (!attackRoute(s, target)) { const ng = nearestGarrison(s, target); return ng && ng.t >= 2 ? `Too far: your nearest troops are ${ng.t} quarters away. Set up an invasion base first (March Orders → Invasion base).` : 'No free troops within a quarter\'s march. Move troops to a garrison nearby.'; }
    if (s.missions.some(m => (m.kind === 'conquer' || m.kind === 'raid') && m.target === target)) return 'An army is already marching there';
    return null;
  }
  if (DIPLO.includes(kind)) {
    const n = s.nations[target];
    if (!n || !n.alive || target === me) return 'Choose another nation';
    if (player(s).gold < envoyCost(s, target)) return `The journey costs ${envoyCost(s, target)} ducats`;
    if (s.missions.some(m => DIPLO.includes(m.kind) && m.target === target)) return 'An envoy is already there';
    const war = atWar(s, me, target);
    if (kind === 'peace') return !war ? 'You are not at war' : target === s.revolution?.rebel ? 'A revolution ends only by arms: take their capital' : null;
    if (war) return 'You are at war: only peace talks are possible';
    if (kind === 'trade' && hasTreaty(s, me, target, 'trade')) return 'Trade treaty already signed';
    if (kind === 'alliance' && hasTreaty(s, me, target, 'alliance')) return 'Already allied';
    if (kind === 'marriage' && hasTreaty(s, me, target, 'marriage')) return 'Royal houses already joined';
    if (kind === 'trade' && getRel(s, me, target) < -30) return 'Relations too poor (below −30)';
    if (kind === 'marriage' && getRel(s, me, target) < 0) return 'Relations must be at least 0';
    return null;
  }
  if (kind === 'research') {
    const t = TECH[target];
    if (!t) return 'Choose a technology';
    if (s.techs.includes(target)) return 'Already known';
    if (t.age > ageIndex(s)) return `Belongs to the Age of ${AGE_NAMES[t.age]}`;
    if (t.req?.some(r => !s.techs.includes(r))) return 'Needs ' + t.req!.filter(r => !s.techs.includes(r)).map(r => TECH[r].name).join(', ');
    if (s.missions.some(m => m.kind === 'research' && m.target === target)) return 'Already being studied';
    return null;
  }
  if (kind === 'build') {
    if (s.provinces[target]?.owner !== me) return 'Choose one of your provinces';
    const why = buildingAllowed(s, target, building!);
    if (why) return why;
    const cost = buildingCost(s, building!) + projectShortfall(s, 'build', building);
    if (player(s).gold < cost) return `Needs ${cost} ducats`;
    return null;
  }
  if (kind === 'develop') {
    const p = s.provinces[target];
    if (p?.owner !== me) return 'Choose one of your provinces';
    if (p.dev >= 8) return 'Already fully developed';
    if (s.missions.some(m => m.kind === 'develop' && m.target === target)) return 'Already under way';
    if (player(s).gold < developCost(s, target)) return `Needs ${developCost(s, target)} ducats`;
    return null;
  }
  if (kind === 'found') {
    const p = s.provinces[target];
    if (p?.owner !== me) return 'Choose one of your provinces';
    if (p.settlement > 0) return `There is already a ${TIERS[tierOf(p)].name.toLowerCase()} here: grow it instead`;
    if (s.missions.some(m => (m.kind === 'found' || m.kind === 'grow') && m.target === target)) return 'Already under way';
    if (player(s).gold < foundCost(s)) return `Needs ${foundCost(s)} ducats`;
    return null;
  }
  if (kind === 'grow') {
    const p = s.provinces[target];
    if (p?.owner !== me) return 'Choose one of your provinces';
    if (!p.settlement) return 'No settlement here yet: found one first';
    if (p.settlement >= 4) return 'Already a metropolis';
    if (p.dev < GROW_DEV[p.settlement + 1]) return `Needs development ${GROW_DEV[p.settlement + 1]} to grow`;
    if (s.missions.some(m => (m.kind === 'found' || m.kind === 'grow') && m.target === target)) return 'Already under way';
    if (player(s).gold < growCost(s, target)) return `Needs ${growCost(s, target)} ducats`;
    return null;
  }
  if (kind === 'explore') {
    if (ageId(s) === 'reconquest') return 'The Age of Discovery has not begun: research Ocean Navigation, or wait for another realm to';
    if (!discoverable(s).length) return 'There is nothing left you can reach (Ocean Navigation opens farther seas)';
    if (player(s).gold < voyageCost(s)) return `Needs ${voyageCost(s)} ducats`;
    return null;
  }
  if (kind === 'vassalize') return vassalizeBlocked(s, target);
  if (kind === 'integrate') return integrateBlocked(s, target);
  if (kind === 'patronage') {
    if (player(s).gold < patronageCost(s)) return `Needs ${patronageCost(s)} ducats`;
    if (s.missions.some(m => m.kind === 'patronage')) return 'Artists are already at work';
    return null;
  }
  if (kind === 'grace') {
    const p = s.provinces[target];
    if (p?.owner !== me) return 'Choose one of your provinces';
    if ((p.favor ?? 0) >= 20) return 'Already in high favour';
    if (s.missions.some(m => m.kind === 'grace' && m.target === target)) return 'Already under way';
    if (player(s).gold < graceCost(s)) return `Needs ${graceCost(s)} ducats`;
    return null;
  }
  if (kind === 'convert' || kind === 'assimilate') {
    const p = s.provinces[target];
    if (p?.owner !== me) return 'Choose one of your provinces';
    if (kind === 'convert' && p.religion === s.stateReligion) return `Already ${RELIGION_NAMES[p.religion]}`;
    if (kind === 'assimilate' && isAccepted(s, p.culture)) return 'Their culture is already accepted';
    if (s.missions.some(m => m.kind === kind && m.target === target)) return 'Already under way';
    return null;
  }
  if (kind === 'colonize') return colonizeBlocked(s, target);
  if (kind === 'conquista') return conquistaBlocked(s, target);
  if (kind === 'tax' || kind === 'progress') {
    if (s.missions.some(m => m.kind === kind)) return 'Already under way';
    return null;
  }
  return null;
}

export function launchMission(s: GameState, kind: MissionKind, charUid: number, target: string, troopUids: number[], building?: string, cardUid?: number, good?: string, shipUids: number[] = [], trade?: { dir: 'buy' | 'sell'; amount: number }): string | null {
  const card = s.hand.find(h => h.uid === cardUid);
  const cdef = card && CARDS[card.card];
  if (!cdef || !cdef.missions?.includes(kind)) return 'You need a card for this mission';
  if (kind === 'research' && cdef.track && TECH[target]?.track !== cdef.track) return 'This card studies another field';
  if (kind === 'build' && cdef.group && BUILDINGS[building!]?.group !== cdef.group) return 'This card builds another kind of building';
  if (kind === 'route' && cdef.trade && cdef.trade !== trade?.dir) return cdef.trade === 'buy' ? 'An Import Contract buys goods: sell with an Export Contract' : 'An Export Contract sells goods: buy with an Import Contract';
  if (kind !== 'route' && missionsLeft(s) <= 0) return `No missions left this year: a ${rankOf(s).name} can start ${missionCap(s)} a year`;
  const ch = s.characters.find(c => c.uid === charUid);
  if (!ch || ch.mission != null) return 'Choose a free character';
  const roles = cardRoles(cdef.id);
  if (!roles.includes(ch.role)) return `Needs a ${roles.join(' or ')}`;
  if (ch.ruler && roles[0] !== ch.role && SPECIAL_BASE[roles[0]]) return 'The monarch cannot leave the court for this'; 
  const why = kind === 'colonize' ? colonizeBlocked(s, target, ch) : kind === 'route' ? routeBlocked(s, good ?? '', trade?.dir ?? 'buy', target, trade?.amount ?? 0) : missionBlocked(s, kind, target, building);
  if (why) return why;
  if ((kind === 'conquer' || kind === 'raid' || kind === 'conquista' || kind === 'base') && !troopUids.length) return 'Send at least one troop';
  const sent = s.troops.filter(t => troopUids.includes(t.uid));
  if ((kind === 'conquer' || kind === 'raid') && sent.some(t => travel(locOf(s, t), target) > 1)) return 'Some of these troops are too far away';
  if (sent.some(t => t.moving)) return 'Some of these troops are on the march';
  const overSea = sent.filter(t => bySea(locOf(s, t), target)).length;
  if ((kind === 'conquer' || kind === 'raid' || kind === 'base') && overSea) {
    const cap = transportOf(s, shipUids, ch);
    if (cap < overSea) return `By sea: your ships carry ${cap} companies, you are sending ${overSea} over water`;
  }
  const m: Mission = {
    id: uid(s), kind, char: charUid, troops: troopUids, target, building,
    turnsLeft: missionTurns(s, kind, ch, target, building), total: 0, progress: 0, bonus: 0, good,
  };
  if (kind === 'route') { m.dir = trade!.dir; m.amount = trade!.amount; }
  if (kind === 'post') { m.progress = postCost(s, target); player(s).gold -= m.progress; }
  const pgKey = kind === 'artwork' ? target : building;
  const extra = projectShortfall(s, kind, pgKey);
  takeGoods(s, projectGoods(kind, pgKey));
  if (kind === 'artwork') { m.progress = artCost(s, target); player(s).gold -= m.progress; }
  if (kind === 'pilgrimage') { m.progress = pilgrimageCost(s); player(s).gold -= m.progress; }
  player(s).gold -= extra;
  if (kind === 'conquer' || kind === 'raid') m.turnsLeft = Math.max(1, ...sent.map(t => travel(locOf(s, t), target)));
  if (kind === 'base') m.turnsLeft = Math.max(1, Math.max(...sent.map(t => travel(locOf(s, t), target))) - 1);
  if (!cdef.permanent) s.hand = s.hand.filter(h => h.uid !== cardUid);
  if (DIPLO.includes(kind)) player(s).gold -= envoyCost(s, target);
  m.total = m.turnsLeft;
  if (kind === 'build') {
    m.progress = buildingCost(s, building!);
    if (BUILDINGS[building!].group === 'economy' && ch.traits.includes('banker')) m.progress = Math.round(m.progress * (1 - Math.min(0.5, 0.2 * traitMult(ch))));
    player(s).gold -= m.progress;
  }
  if (kind === 'explore') { m.progress = voyageCost(s); player(s).gold -= m.progress; }
  if (kind === 'colonize') { m.progress = colonyCost(s); player(s).gold -= m.progress; player(s).manpower -= 1; }
  if (kind === 'develop') { m.progress = developCost(s, target); player(s).gold -= m.progress; }
  if (kind === 'grace') { m.progress = graceCost(s); player(s).gold -= m.progress; }
  if (kind === 'found') { m.progress = foundCost(s); player(s).gold -= m.progress; }
  if (kind === 'grow') { m.progress = growCost(s, target); player(s).gold -= m.progress; }
  ch.mission = m.id;
  s.flags['stat_m_' + kind] = (s.flags['stat_m_' + kind] ?? 0) + 1;
  if (kind !== 'route') s.launched = (s.launched ?? 0) + 1; // a trade route is a quick errand: it does not use up a yearly mission
  for (const t of s.troops) if (troopUids.includes(t.uid)) t.mission = m.id;
  for (const t of s.fleet) if (shipUids.includes(t.uid)) t.mission = m.id;
  if (shipUids.length) m.ships = shipUids;
  const becomes = becomesOnMission(kind, ch, shipUids.length > 0);
  if (becomes) specialise(s, ch, becomes);
  if (kind === 'patronage') { m.progress = patronageCost(s); player(s).gold -= m.progress; }
  s.missions.push(m);
  return null;
}

export function cancelMission(s: GameState, id: number) {
  const m = s.missions.find(x => x.id === id);
  if (!m) return;
  if (['build', 'develop', 'found', 'grow', 'colonize', 'explore', 'post', 'artwork'].includes(m.kind) && m.progress) player(s).gold += Math.round(m.progress / 2);
  freeMission(s, id);
  s.missions = s.missions.filter(x => x.id !== id);
}

const TWISTS: { title: string; text: string; d: number; rel: number }[] = [
  { title: 'Warm Welcome', text: 'The court receives your envoy with honour.', d: 0.15, rel: 0 },
  { title: 'Rival Envoy', text: 'A rival ambassador is whispering against you.', d: -0.15, rel: 0 },
  { title: 'Court Scandal', text: 'Your envoy is caught in an embarrassing affair.', d: -0.1, rel: -5 },
  { title: 'A Gift of Falcons', text: 'Your hunting falcons delight the prince.', d: 0.1, rel: 5 },
  { title: 'Favourable Winds', text: 'Good news from your agents arrives just in time.', d: 0.1, rel: 0 },
  { title: 'The Prince is Ill', text: 'Nothing can be decided while the prince lies sick.', d: -0.1, rel: 0 },
];

/** A reveal card announcing how well the mission went. */
export function outcomeItem(o: number, text: string): RevealItem {
  return { title: `${outcomeName(o)} outcome`, text, tone: OUTCOMES[o].tone, kind: o >= 3 ? 'star' : o === 0 ? 'twist' : 'scroll' };
}

function gainXp(s: GameState, ch: Character | undefined, items: RevealItem[]) {
  if (!ch) return;
  ch.xp++;
  if (ch.xp >= 3) { ch.xp = 0; if (promoteRarity(s, ch)) items.push({ title: `${ch.name} rises`, text: `Now ${ch.rarity[0].toUpperCase() + ch.rarity.slice(1)}: stronger traits.`, tone: 'good', kind: 'star' }); }
}

/** Advance all missions by one year. Battles and results are pushed onto the prompt queue. */
export function advanceMissions(s: GameState) {
  for (const m of [...s.missions]) {
    const ch = s.characters.find(c => c.uid === m.char);
    if (!ch) { cancelMission(s, m.id); continue; }
    if (m.kind === 'assist') {
      const st = s.missions.find(x => String(x.id) === m.target);
      if (!st) { finish(s, m); continue; }
      m.turnsLeft = st.turnsLeft; m.total = Math.max(m.total, st.total);
      continue;
    }
    if (m.kind === 'research') {
      const help = helpersOf(s, m.id).reduce((a, h) => { const hc = s.characters.find(c => c.uid === h.char); return a + (hc ? researchRate(s, hc, TECH[m.target].track) * ASSIST_SHARE : 0); }, 0);
      m.progress += (researchRate(s, ch, TECH[m.target].track) + help) / 4;
      if (rand(s) < 0.02) { m.progress += 2; log(s, `Breakthrough in the study of ${TECH[m.target].name}!`, 'good'); }
      const cost = techCost(s, m.target);
      m.turnsLeft = Math.max(0, Math.ceil((cost - m.progress) / ((researchRate(s, ch, TECH[m.target].track) + help) / 4)));
      if (m.progress >= cost) completeResearch(s, m, ch);
      continue;
    }
    m.turnsLeft--;
    if (m.turnsLeft > 0) continue;
    resolveMission(s, m, ch);
  }
}

function finish(s: GameState, m: Mission) {
  s.flags.stat_missions_done = (s.flags.stat_missions_done ?? 0) + 1;
  freeMission(s, m.id); s.missions = s.missions.filter(x => x.id !== m.id);
  // envoys abroad still have to ride home before they can go out again
  if (DIPLO.includes(m.kind)) { const ch = s.characters.find(c => c.uid === m.char); if (ch && ch.mission == null) { ch.back = Math.max(1, envoyTravel(s, m.target)); ch.mission = -4; } }
}

/** A route mission's deal can fall through while the merchant travels. */
function routeBlockedNow(s: GameState, m: Mission): string | null {
  const n = s.nations[m.target];
  if (!n?.alive) return 'That realm is gone.';
  if (atWar(s, s.player, m.target)) return `You are at war with ${n.name}.`;
  if (s.routes.length >= routeCap(s)) return 'All your trade routes are already in use.';
  if (m.dir === 'buy' && !supplies(s, m.target, m.good!)) return `${n.name} no longer has ${GOODS[m.good!].name} to sell.`;
  return null;
}

/** Quarters for an envoy to reach a realm's court from yours. */
export const envoyTravel = (s: GameState, nation: string) => { const a = player(s).capital, b = s.nations[nation]?.capital; return a && b ? travel(a, b) : 1; };
/** Every journey has a cost: horses, gifts, lodging. */
export const envoyCost = (s: GameState, nation: string) => Math.round((4 + 4 * envoyTravel(s, nation)) * inflation(s));

/** Each quarter: envoys on the way home get closer. */
export function quarterlyReturns(s: GameState) {
  for (const c of s.characters) if (c.mission === -4) { c.back = (c.back ?? 1) - 1; if (c.back <= 0) { delete c.mission; delete c.back; } }
}

function completeResearch(s: GameState, m: Mission, ch: Character) {
  const t = TECH[m.target];
  for (const h of helpersOf(s, m.id)) { const hc = s.characters.find(c => c.uid === h.char); finish(s, h); if (hc) gainXp(s, hc, []); }
  s.techs.push(t.id);
  onTech(s, t.id);
  player(s).prestige += 1;
  if (t.fx?.stability) player(s).stability = clamp(player(s).stability + t.fx.stability, -3, 3);
  if (t.id === 'star_forts') { const cap = s.provinces[player(s).capital]; if (cap && cap.owner === s.player) cap.fort = Math.min(maxFort(s), cap.fort + 1); }
  const items: RevealItem[] = [{ title: t.name, text: t.desc, tone: 'good', kind: 'book' }];
  const o = hasCore(s, 'open') ? rollBest(s, ch) : rollOutcome(s, ch);
  if (o >= 3) {
    const n = o === 4 ? 2 : 1;
    for (let i = 0; i < n; i++) drawCat(s, 'research');
    if (o === 4) player(s).prestige += 5;
    items.unshift(outcomeItem(o, `The work opens new questions: +${n} Research card${n > 1 ? 's' : ''}${o === 4 ? ', prestige +5' : ''}.`));
  }
  gainXp(s, ch, items);
  push(s, { kind: 'reveal', title: 'Research complete', subtitle: `${ch.name} completes the study`, items });
  log(s, `Research complete: ${t.name}.`, 'good');
  finish(s, m);
}

function resolveMission(s: GameState, m: Mission, ch: Character) {
  if (m.kind === 'base') {
    const p = s.provinces[m.target];
    if (!p || p.owner === s.player || !atWar(s, s.player, p.owner)) { finish(s, m); return; }
    const ships = m.ships ?? [];
    for (const t of s.fleet) if (ships.includes(t.uid)) delete t.mission;
    buildBase(s, m.target, m.troops, ships, ch.uid);
    s.missions = s.missions.filter(x => x.id !== m.id);
    ch.mission = -2; // stays with the camp until it is ready
    return;
  }
  const me = player(s);
  if (m.kind === 'conquer' || m.kind === 'raid') {
    const prov = s.provinces[m.target];
    if (prov.owner !== s.player && atWar(s, s.player, prov.owner) && m.ships?.length) {
      const enemyFleet = [...(s.nations[prov.owner].fleet ?? [])].sort((a, b) => armyPower([b]) - armyPower([a])).slice(0, 6);
      if (enemyFleet.length) {
        const adm = ch;
        const att = makeSide(s.player, toBattleUnits(s.fleet.filter(t => m.ships!.includes(t.uid))), { name: adm.name, skill: adm.skill, traits: adm.traits, uid: adm.uid, mult: traitMult(adm) }, 0, true);
        const def = makeSide(prov.owner, toBattleUnits(enemyFleet), genericGeneral(s), 0, false);
        push(s, { kind: 'battle', battle: createBattle(s, att, def, prov.id, 'sea', m.id, { naval: true, follow: { type: 'land-attack', missionId: m.id } }) });
        return;
      }
    }
    landPhase(s, m.id);
    return;
  }
  return resolveOther(s, m, ch);
}

/** The land part of a conquest or raid (after any sea battle). */
export function landPhase(s: GameState, missionId: number) {
  const m = s.missions.find(x => x.id === missionId);
  if (!m) return;
  const ch = s.characters.find(c => c.uid === m.char);
  const me = player(s);
  if (!ch) { cancelMission(s, m.id); return; }
  {
    const prov = s.provinces[m.target];
    if (prov.owner === s.player || !atWar(s, s.player, prov.owner)) {
      push(s, { kind: 'reveal', title: 'Army returns', items: [{ title: prov.name, text: 'The war there is over. Your army comes home.', tone: 'neutral', kind: 'sword' }] });
      finish(s, m); return;
    }
    const enemy = s.nations[prov.owner];
    const troops = s.troops.filter(t => m.troops.includes(t.uid)).slice(0, commandOf(ch.skill));
    if (!troops.length) { finish(s, m); return; }
    const att = makeSide(s.player, toBattleUnits(troops), { name: ch.name, skill: ch.skill, traits: ch.traits, uid: ch.uid, mult: traitMult(ch) }, 0, true);
    const defUnits = [...troopsNear(s, enemy.id, prov.id)].sort((a, b) => armyPower([b]) - armyPower([a])).slice(0, m.kind === 'raid' ? 3 : GENERIC_COMMAND + (prov.id === enemy.capital ? 1 : 0));
    const fort = m.kind === 'raid' ? Math.max(0, prov.fort - 1) : prov.fort;
    if (!defUnits.length && fort === 0) {
      // undefended: walks in
      const items: RevealItem[] = [];
      if (m.kind === 'conquer') {
        transferProvince(s, prov.id, s.player);
        me.prestige += 4;
        items.push({ title: `${prov.name} surrenders`, text: 'No army stands to defend it. The keys of the city are handed over.', tone: 'good', kind: 'sword' });
        log(s, `${prov.name} surrenders without a fight.`, 'good');
      } else {
        const loot = Math.round(prov.dev * 8 + 5); me.gold += loot;
        items.push({ title: 'Easy plunder', text: `Your raiders return with ${loot} ducats.`, tone: 'good', kind: 'coin' });
      }
      gainXp(s, ch, items);
      push(s, { kind: 'reveal', title: MISSION_INFO[m.kind].name, items });
      finish(s, m); return;
    }
    const def = makeSide(enemy.id, toBattleUnits(defUnits), genericGeneral(s), fort, false);
    const b = createBattle(s, att, def, prov.id, m.kind as 'conquer' | 'raid', m.id);
    push(s, { kind: 'battle', battle: b });
    return;
  }
}

function resolveOther(s: GameState, m: Mission, ch: Character) {
  const me = player(s);

  if (m.kind === 'route') {
    const tn = s.nations[m.target];
    const why = routeBlockedNow(s, m);
    const g = GOODS[m.good!];
    if (why) {
      push(s, { kind: 'reveal', title: 'Trade Route', items: [{ title: 'No deal', text: why, tone: 'bad', kind: 'coin' }] });
    } else {
      s.routes.push({ id: uid(s), good: m.good!, dir: m.dir!, partner: m.target, amount: m.amount!, since: s.year, deal: merchantFactor(ch.skill) });
      const d = dealFor(s, m.target, m.dir!, merchantFactor(ch.skill));
      const each = price(s, m.good!) * d;
      push(s, { kind: 'reveal', title: 'Trade Route', subtitle: `${ch.name} in ${tn.name}`, items: [{ title: m.dir === 'buy' ? `${g.name} bought from ${tn.name}` : `${g.name} sold to ${tn.name}`, text: `${m.amount} loads a year at ${each.toFixed(1)} ducats each: ${m.dir === 'buy' ? 'costs' : 'earns'} ${(each * m.amount!).toFixed(1)} a year, paid every quarter.`, tone: 'good', kind: g.icon }] });
      log(s, `Trade route opened: ${g.name} ${m.dir === 'buy' ? 'from' : 'to'} ${tn.name}.`, 'good');
      gainXp(s, ch, []);
    }
    finish(s, m); return;
  }
  if (m.kind === 'post') {
    const tn = s.nations[m.target];
    if (!tn?.alive || atWar(s, s.player, m.target)) {
      push(s, { kind: 'reveal', title: 'Trade Post', items: [{ title: 'Abandoned', text: 'Events have overtaken your merchants.', tone: 'bad', kind: 'anchor' }] });
    } else {
      s.posts.push({ nation: m.target, since: s.year });
      push(s, { kind: 'reveal', title: 'Trade Post', subtitle: `${ch.name} in ${tn.name}`, items: [{ title: `A trade post in ${tn.name}`, text: `Routes with ${tn.name} now buy at 90% of the market price and sell 20% above it. One more trade route allowed. Upkeep ${POST_UPKEEP} ducats a year.`, tone: 'good', kind: 'anchor' }] });
      log(s, `Trade post opened in ${tn.name}.`, 'good');
      gainXp(s, ch, []);
    }
    finish(s, m); return;
  }

  if (DIPLO.includes(m.kind)) {
    const target = m.target;
    const tn = s.nations[target];
    const items: RevealItem[] = [];
    if (!tn.alive || (m.kind !== 'peace' && atWar(s, s.player, target)) || (m.kind === 'peace' && !atWar(s, s.player, target))) {
      push(s, { kind: 'reveal', title: MISSION_INFO[m.kind].name, items: [{ title: 'Mission abandoned', text: 'Events have overtaken your envoy.', tone: 'neutral', kind: 'scroll' }] });
      finish(s, m); return;
    }
    let p = diploChance(s, m.kind, ch, target, m.bonus);
    // surprises; a near-certain deal (or a friendly embassy) is not spoiled by a bad one
    const sure = p >= 0.9 || (m.kind === 'relations' && getRel(s, s.player, target) >= 0);
    const tws = TWISTS.filter(t => !sure || t.d > 0);
    if (rand(s) < 0.35 && tws.length) {
      const tw = pick(s, tws);
      p = clamp(p + tw.d, 0.05, diploCap(getRel(s, s.player, target)));
      if (tw.rel) addRel(s, s.player, target, tw.rel);
      items.push({ title: tw.title, text: tw.text + ` (${tw.d > 0 ? '+' : ''}${Math.round(tw.d * 100)}%)`, tone: tw.d > 0 ? 'good' : 'bad', kind: 'twist' });
    }
    const ok = rand(s) < p;
    const tname = tn.name;
    if (ok) {
      switch (m.kind) {
        case 'relations': addRel(s, s.player, target, 25); items.push({ title: 'Friendship', text: `Relations with ${tname} +25.`, tone: 'good', kind: 'scroll' }); break;
        case 'trade': {
          addTreaty(s, s.player, target, 'trade'); addRel(s, s.player, target, 10); me.prestige += 2;
          if (ch.traits.includes('merchant')) s.flags['trade_bonus_' + target] = 2;
          items.push({ title: 'Treaty signed', text: `Merchants of both crowns are welcome: ducats every year, and your trade routes with ${tname} get 10% better prices.`, tone: 'good', kind: 'coin' });
          break;
        }
        case 'alliance': addTreaty(s, s.player, target, 'alliance'); addRel(s, s.player, target, 15); me.prestige += 3; items.push({ title: 'Alliance sealed', text: `${tname} will stand with you in war.`, tone: 'good', kind: 'hands' }); break;
        case 'marriage': addTreaty(s, s.player, target, 'marriage'); addRel(s, s.player, target, 20); me.prestige += 4; items.push({ title: 'A royal wedding', text: `The houses of ${me.name} and ${tname} are joined. Relations improve every year.`, tone: 'good', kind: 'ring' }); break;
        case 'peace': s.queue.push({ kind: 'peace', enemy: target, offered: false }); items.push({ title: 'They will talk', text: `${tname} agrees to come to the table. Set the terms next.`, tone: 'good', kind: 'dove' }); break;
        case 'vassalize': makeSubject(s, target, 'vassal'); me.prestige += 6; items.push({ title: `${tname} bends the knee`, text: 'A new vassal: it pays tribute and joins your wars.', tone: 'good', kind: 'crown' }); break;
        case 'integrate': integrate(s, target); me.prestige += 8; items.push({ title: `${tname} joins the realm`, text: 'Its provinces are now yours. Their culture may be foreign: watch their happiness.', tone: 'good', kind: 'hands' }); break;
      }
      const o = rollOutcome(s, ch);
      if (o >= 2) {
        addRel(s, s.player, target, o * 5);
        if (o >= 3) { drawCat(s, 'diplomacy'); me.prestige += o === 4 ? 6 : 2; }
        if (m.kind === 'trade' && o >= 3) s.flags['trade_bonus_' + target] = (s.flags['trade_bonus_' + target] ?? 0) + (o - 2);
        items.unshift(outcomeItem(o, `The court is charmed: relations +${o * 5}${o >= 3 ? ', a Diplomacy card' : ''}${m.kind === 'trade' && o >= 3 ? `, trade +${o - 2} ducats` : ''}.`));
      }
      gainXp(s, ch, items);
      log(s, `${MISSION_INFO[m.kind].name} with ${tname} succeeded.`, 'good');
    } else {
      if (m.kind === 'relations') addRel(s, s.player, target, 5); else addRel(s, s.player, target, -5);
      items.push({ title: 'Refused', text: `${tname} turns your envoy away.`, tone: 'bad', kind: 'scroll' });
      log(s, `${MISSION_INFO[m.kind].name} with ${tname} failed.`, 'bad');
    }
    push(s, { kind: 'reveal', title: MISSION_INFO[m.kind].name, subtitle: `${ch.name} in ${tname} · ${Math.round(p * 100)}% chance`, items });
    finish(s, m); return;
  }

  if (m.kind === 'build') {
    const prov = s.provinces[m.target];
    const b = BUILDINGS[m.building!];
    if (prov.owner !== s.player) { finish(s, m); return; }
    const o = hasCore(s, 'consolidation') ? rollBest(s, ch) : rollOutcome(s, ch);
    const g = GRADES[o];
    if (b.id === 'fortress') { prov.fort = Math.min(maxFort(s), prov.fort + 1); if (o >= 3) prov.fort = Math.min(maxFort(s), prov.fort + 1); } else { prov.buildings.push(b.id); prov.grades = { ...(prov.grades ?? {}), [b.id]: g.mult }; }
    if (b.id === 'temple') me.stability = clamp(me.stability + 1, -3, 3);
    if ((b.id === 'workshop' || b.id === 'manufactory') && !prov.make) prov.make = defaultMake(s);
    me.prestige += o >= 3 ? o : 1;
    const items: RevealItem[] = [
      outcomeItem(o, b.id === 'fortress' ? (o >= 3 ? 'The walls rise twice as strong: +2 fort levels.' : 'The walls are finished.') : `A ${g.name.toLowerCase()} ${b.name.toLowerCase()}: output ×${g.mult}.`),
      { title: `${b.name} in ${prov.name}`, text: b.desc, tone: 'good', kind: b.icon }];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Construction complete', items });
    log(s, `${b.name} completed in ${prov.name}.`, 'good');
    finish(s, m); return;
  }

  if (m.kind === 'explore' || m.kind === 'colonize' || m.kind === 'conquista') {
    const items: RevealItem[] = [];
    const o = rollOutcome(s, ch);
    const ok = m.kind === 'explore' ? resolveExplore(s, ch, items, o) : m.kind === 'colonize' ? resolveColonize(s, m.target, ch, items, o) : resolveConquista(s, m.target, ch, m.troops, items, o);
    if (ok && s.characters.includes(ch)) gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: MISSION_INFO[m.kind].name, subtitle: m.kind === 'explore' ? `${ch.name} returns` : s.provinces[m.target]?.name, items });
    finish(s, m); return;
  }

  if (m.kind === 'develop') {
    const prov = s.provinces[m.target];
    if (prov.owner !== s.player) { finish(s, m); return; }
    const o = hasCore(s, 'consolidation') ? rollBest(s, ch) : rollOutcome(s, ch);
    const d = [0, 1, 1, 2, 3][o];
    prov.dev += d; me.prestige += d;
    if (o === 2) prov.control = Math.min(100, prov.control + 10);
    const items: RevealItem[] = [outcomeItem(o, d ? `Development +${d}${o === 2 ? ', control +10' : ''}.` : 'Floods and quarrels: the work comes to nothing.'),
      { title: `${prov.name}`, text: `Development is now ${prov.dev}.`, tone: d ? 'good' : 'bad', kind: 'wheat' }];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Development', items });
    finish(s, m); return;
  }

  if (m.kind === 'found') {
    const prov = s.provinces[m.target];
    if (prov.owner !== s.player) { finish(s, m); return; }
    const o = hasCore(s, 'consolidation') ? rollBest(s, ch) : rollOutcome(s, ch);
    prov.settlement = [1, 1, 2, 3, 3][o];
    if (o === 4) { prov.dev++; me.prestige += 5; }
    prov.control = Math.min(100, prov.control + 5); me.prestige += prov.settlement;
    const tn = TIERS[tierOf(prov)].name;
    const items: RevealItem[] = [outcomeItem(o, `${o >= 3 ? 'Settlers flock in' : o === 2 ? 'A good start' : 'A modest start'}: a ${tn.toLowerCase()} rises${o === 4 ? ', and the land around it flourishes (+1 development)' : ''}.`),
      { title: `${tn} of ${prov.name}`, text: `${townSlotsText(prov.settlement)} Grow it later with a Grow your Settlement card.`, tone: 'good', kind: 'tower' }];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Settlement founded', items });
    log(s, `A ${tn.toLowerCase()} is founded in ${prov.name}.`, 'good');
    finish(s, m); return;
  }

  if (m.kind === 'grow') {
    const prov = s.provinces[m.target];
    if (prov.owner !== s.player) { finish(s, m); return; }
    const o = hasCore(s, 'consolidation') ? rollBest(s, ch) : rollOutcome(s, ch);
    const step = [0, 1, 1, 1, 2][o];
    const before = TIERS[tierOf(prov)].name;
    prov.settlement = Math.min(4, prov.settlement + step);
    if (prov.settlement > 3 && prov.dev < GROW_DEV[4]) prov.settlement = 3;
    if (o >= 2) prov.control = Math.min(100, prov.control + 5 * o);
    if (o >= 3) prov.dev++;
    me.prestige += step * 2;
    const tn = TIERS[tierOf(prov)].name;
    const items: RevealItem[] = [outcomeItem(o, step ? `The ${before.toLowerCase()} becomes a ${tn.toLowerCase()}${o >= 3 ? ', and development +1' : ''}.` : 'Plague and quarrels: the settlement does not grow this time.'),
      { title: `${tn} of ${prov.name}`, text: townSlotsText(prov.settlement), tone: step ? 'good' : 'bad', kind: 'tower' }];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Settlement', items });
    finish(s, m); return;
  }

  if (m.kind === 'artwork') {
    const genre = m.target;
    const twice = (ch.traits.includes('painter') && (genre === 'sacred' || genre === 'portrait')) || (ch.traits.includes('poet') && (genre === 'epic' || genre === 'treatise')) || (ch.traits.includes('builder') && genre === 'monument');
    const o = twice || hasCore(s, 'consolidation') ? rollBest(s, ch) : rollOutcome(s, ch);
    const items: RevealItem[] = [outcomeItem(o, `${GENRES[genre].name}: ${QUALITY[o].name.toLowerCase()}.`), ...createWork(s, ch, genre, o)];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'A Work of Art', subtitle: ch.name, items });
    finish(s, m); return;
  }

  if (m.kind === 'pilgrimage') {
    const o = rollOutcome(s, ch);
    let gain = [3, 10, 15, 25, 40][o];
    if (ch.traits.includes('curial')) gain = Math.round(gain * 1.5);
    addChurchRel(s, gain);
    if (o >= 3) me.prestige += 3;
    const items: RevealItem[] = [outcomeItem(o, `${churchHead(s).name} receives ${ch.name}: favour +${gain}${o >= 3 ? ', prestige +3' : ''}. Standing now ${Math.round(churchRel(s))}.`)];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Mission to the Church', items });
    finish(s, m); return;
  }

  if (m.kind === 'accept') {
    const c = m.target;
    const o = rollOutcome(s, ch);
    const items: RevealItem[] = [];
    if (o === 0 && !ch.traits.includes('tolerant')) items.push(outcomeItem(o, `Old prejudices win: the ${cultureName(c)} stay outsiders for now.`));
    else {
      if (!s.accepted.includes(c)) s.accepted.push(c);
      if (o >= 3 || ch.traits.includes('humanist')) me.stability = clamp(me.stability + 1, -3, 3);
      if (o >= 3) me.prestige += 3;
      items.push(outcomeItem(Math.max(1, o), `The ${cultureName(c)} are now one of the realm's own peoples: no more foreign-culture unhappiness for them${o >= 3 || ch.traits.includes('humanist') ? ', stability +1' : ''}.`));
    }
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Embrace a Culture', items });
    finish(s, m); return;
  }

  if (m.kind === 'patronage') {
    const o = rollOutcome(s, ch);
    const gain = [3, 8, 12, 18, 30][o];
    s.art = Math.min(100, s.art + gain);
    me.prestige += [0, 1, 2, 4, 10][o];
    const works = ['a modest altarpiece', 'a fine chapel', 'a celebrated cycle of frescoes', 'a famous palace', 'a masterpiece the world will remember'];
    const items: RevealItem[] = [outcomeItem(o, `Your artists produce ${works[o]}. Arts +${gain}.`)];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Patronage of the Arts', items });
    finish(s, m); return;
  }

  if (m.kind === 'grace') {
    const prov = s.provinces[m.target];
    if (prov.owner !== s.player) { finish(s, m); return; }
    const o = rollOutcome(s, ch);
    const gain = Math.round(GRACE_GAIN[o] * (ch.traits.includes('orator') ? 1.5 : 1));
    prov.favor = Math.min(30, (prov.favor ?? 0) + gain);
    if (o >= 3) prov.control = Math.min(100, prov.control + 10);
    const how = ['A cold welcome', 'Alms and a feast', 'A royal charter of privileges', 'Bread, wine and a new bridge', 'A visit the people will tell their grandchildren about'];
    const items: RevealItem[] = [outcomeItem(o, `${how[o]} in ${prov.name}. Happiness +${gain} there (fading by 1 a year)${o >= 3 ? ', control +10' : ''}.`)];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Royal Grace', items });
    finish(s, m); return;
  }

  if (m.kind === 'convert' || m.kind === 'assimilate') {
    const prov = s.provinces[m.target];
    if (prov.owner !== s.player) { finish(s, m); return; }
    let o = rollOutcome(s, ch);
    if (o === 0 && m.kind === 'convert' && ageId(s) === 'reformation' && rand(s) < 0.4) o = 1;
    if (o === 0 && m.kind === 'assimilate' && ch.traits.includes('tolerant')) o = 1;
    const items: RevealItem[] = [];
    if (o === 0) {
      if (!ch.traits.includes('beloved')) prov.control = Math.max(0, prov.control - 15);
      items.push(outcomeItem(o, m.kind === 'convert' ? 'The preachers are driven out. Control −15.' : 'The people resist. Control −15.'));
    } else {
      if (m.kind === 'convert') { prov.religion = s.stateReligion; addChurchRel(s, 4); } else prov.culture = player(s).culture === 'aragonese' ? (prov.culture === 'catalan' ? 'catalan' : 'aragonese') : s.accepted[0];
      if (o >= 3) { prov.control = Math.min(100, prov.control + 15); me.stability = clamp(me.stability + 1, -3, 3); }
      items.push(outcomeItem(o, m.kind === 'convert' ? `${prov.name} turns to the ${RELIGION_NAMES[s.stateReligion]} faith${o >= 3 ? ', peacefully: control +15, stability +1' : ''}.` : `The people of ${prov.name} adopt your ways${o >= 3 ? ' gladly: control +15, stability +1' : ''}.`));
    }
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: MISSION_INFO[m.kind].name, items });
    finish(s, m); return;
  }

  if (m.kind === 'tax') {
    const dev = provsOf(s, s.player).reduce((a, p) => a + p.dev, 0);
    let g = 4 * ch.skill + dev * 0.5;
    if (ch.traits.includes('tax')) g *= 1 + 0.5 * traitMult(ch);
    if (hasTech(s, 'bureaucracy')) g *= 1.5;
    const o = rollOutcome(s, ch);
    g = Math.round(g * OUTCOMES[o].mult);
    me.gold += g;
    s.taxBurden = Math.min(30, s.taxBurden + 6);
    const items: RevealItem[] = [outcomeItem(o, `${ch.name} collects ${g} ducats. The people feel it.`)];
    if (o === 0 && rand(s) < 0.6) { me.stability = clamp(me.stability - 1, -3, 3); items.push({ title: 'Grumbling', text: 'The collectors were heavy-handed. Stability −1.', tone: 'bad', kind: 'twist' }); }
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Tax Collection', items });
    finish(s, m); return;
  }

  if (m.kind === 'progress') {
    const o = rollOutcome(s, ch);
    const d = [0, 1, 1, 2, 2][o] + (ch.traits.includes('steward') ? (traitMult(ch) >= 2 ? 2 : 1) : 0);
    const ctl = [5, 10, 15, 20, 30][o];
    me.stability = clamp(me.stability + d, -3, 3);
    me.prestige += 1 + o;
    for (const p of provsOf(s, s.player)) p.control = Math.min(100, p.control + ctl);
    const items: RevealItem[] = [outcomeItem(o, `Stability +${d}, prestige +${1 + o}, control +${ctl} everywhere.`)];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Royal Progress', items });
    finish(s, m); return;
  }
}


/** Called when the player's war with `enemy` ends: winning a war earns a Military card. */
export function endWar(s: GameState, enemy: string): RevealItem[] {
  const w = findWar(s, s.player, enemy);
  if (!w) return [];
  const mine = w.a === s.player ? w.gainsA : w.gainsB, theirs = w.a === s.player ? w.gainsB : w.gainsA;
  s.imports = s.imports.filter(i => i.from !== enemy);
  if (mine > theirs) {
    s.stats.wars.won++;
    player(s).prestige += 5;
    drawCat(s, 'military');
    return [{ title: 'Victory!', text: `You won the war (${mine} provinces taken, ${theirs} lost). Prestige +5 and a Military card.`, tone: 'good', kind: 'laurel' }];
  }
  if (theirs > mine) { s.stats.wars.lost++; return [{ title: 'A bitter peace', text: `You lost ${theirs} provinces and took ${mine}.`, tone: 'bad', kind: 'twist' }]; }
  return [];
}
