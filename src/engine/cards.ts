// Cards are the actions of the game. Five kinds, each drawn at its own yearly rate.
import { happinessOf } from './society';
import { getGeo, neighbours } from './map';
import type { GameState, Cat, Role, MissionKind } from '../types';
import { CATS } from '../types';
import { TROOPS, EQUIPMENT } from '../data/troops';
import { TECH, TECHS, BUILDINGS, TECH_RATES, type TechTrack, type BuildingGroup } from '../data/techs';
import { RULER_ARCHS } from '../data/nations';
import { largestForeignCulture, CULTURE_NAMES } from './society';
import { CORE_RATES } from '../data/core';
import { shipBlocked } from './navy';
import { shortfallCost, takeGoods, hireNeeds, postCap } from './trade';
import { setCardPool, acceptCap, giftCost, sendGift, churchHead } from './culture';
import {
  ageId, ageDef, pioneerNow, enemiesOf, player, provsOf, clamp, uid, pick, addRel, hasTech, nationName, armyCap, rand, weighted, hasGood, inflation, log, TIERS, tierOf, grade, rollOutcome, outcomeName, hasCore, techFx, ageIndex } from './core';

export type CardTarget = 'none' | 'nation' | 'mission' | 'troop';
export type CardKind = 'troop' | 'ship' | 'equip' | 'hire' | 'mission' | 'instant';

export interface HandCardDef {
  id: string; name: string; cat: Cat; kind: CardKind; text: string; icon: string;
  weight: (s: GameState) => number;
  troop?: string; equip?: string; role?: Role;
  missions?: MissionKind[]; track?: TechTrack; group?: BuildingGroup; agent?: Role;
  target?: CardTarget;
  can?: (s: GameState) => string | null;
  targetOk?: (s: GameState, t: string) => boolean;
  play?: (s: GameState, target: string) => string;
  burden?: boolean;
  permanent?: boolean; // stays in hand after use: the mission costs ducats only
  trade?: 'buy' | 'sell'; // trade route cards: which way the goods go
  cls?: UnitClass;        // troop cards: hire the best unit of this class you have researched
  improve?: boolean;      // shown with the improvements (it betters a troop)
}

export const HAND_LIMIT = 7;
/** The border province that most needs walls: next to an enemy (or a foreign realm), weakest fort, richest. */
export function exposedProvince(s: GameState) {
  const max = hasTech(s, 'star_forts') ? 3 : 2;
  const foes = new Set(enemiesOf(s, s.player));
  const ps = provsOf(s, s.player).filter(p => p.fort < max).map(p => {
    const nb = neighbours(p.id).map(n => s.provinces[n]?.owner).filter(o => o && o !== s.player);
    return { p, score: (nb.some(o => foes.has(o!)) ? 100 : nb.length ? 10 : 0) - p.fort * 20 + p.dev };
  }).filter(x => x.score >= 10 - 40).sort((a, b) => b.score - a.score);
  return ps.length && ps[0].score > -30 ? ps[0].p : null;
}

/** Card types a deck sells: people and actions everywhere, troops and improvements in Military. */
export const typesFor = (cat: Cat): CardType[] => (cat === 'military' ? ['people', 'troops', 'improvement', 'action'] : ['people', 'action']);
/** Cards of a type you could get from a deck now. */
export const poolOf = (s: GameState, cat: Cat, type: CardType) => Object.values(CARDS).filter(c => c.cat === cat && cardType(c) === type && c.weight(s) > 0);

/** What a card is for: people to hire, troops, improvements, or actions. */
export type CardType = 'people' | 'troops' | 'improvement' | 'action' | 'burden';
export function cardType(d: HandCardDef): CardType {
  if (d.burden) return 'burden';
  if (d.kind === 'hire') return 'people';
  if (d.kind === 'troop' || d.kind === 'ship') return 'troops';
  if (d.kind === 'equip' || d.improve) return 'improvement';
  return 'action';
}
export const CARD_TYPE_NAME: Record<CardType, string> = { people: 'People', troops: 'Troops', improvement: 'Improvement', action: 'Action', burden: 'Burden' };

/** How many cards you may keep, by realm rank: per deck and in all. Permanent cards and burdens do not count.
 *  Cards always arrive; over the limit you sell the extras (half a nation point each) before the turn ends. */
export const HAND_LIMITS: [number, number][] = [[8, 22], [10, 28], [12, 34], [15, 40]]; // Small Kingdom, Kingdom, Great Kingdom, Empire
const RANK_MIN = [0, 5, 13, 30]; // as RANKS in realm.ts
function limitRow(s: GameState): [number, number] {
  if ((globalThis as { NOHANDLIMIT?: boolean }).NOHANDLIMIT) return [Infinity, Infinity];
  const k = provsOf(s, s.player).length;
  let i = 0; while (i < RANK_MIN.length - 1 && k >= RANK_MIN[i + 1]) i++;
  return HAND_LIMITS[i];
}
export const handLimit = (s: GameState) => limitRow(s)[0];
export const handTotalLimit = (s: GameState) => limitRow(s)[1];
export const countsToLimit = (h: { card: string }) => !!CARDS[h.card] && !CARDS[h.card].permanent && !CARDS[h.card].burden;
export const heldOf = (s: GameState, cat: Cat) => handOf(s, cat).filter(countsToLimit).length;
export const heldTotal = (s: GameState) => s.hand.filter(countsToLimit).length;
/** Cards over the limit: per deck, and how many more over the total once the decks are within theirs. */
export function handExcess(s: GameState): { byCat: Partial<Record<Cat, number>>; total: number } {
  const byCat: Partial<Record<Cat, number>> = {};
  let fixed = 0;
  for (const c of CATS) { const n = heldOf(s, c) - handLimit(s); if (n > 0) { byCat[c] = n; fixed += n; } }
  return { byCat, total: Math.max(fixed, heldTotal(s) - handTotalLimit(s)) };
}
/** Sell cards from the hand: half a nation point each. */
export function sellCards(s: GameState, uids: number[]): string | null {
  const ok = uids.filter(u => { const h = s.hand.find(x => x.uid === u); return h && !CARDS[h.card].burden; });
  if (!ok.length) return 'Nothing to sell (burdens must be paid off)';
  for (const u of ok) removeCard(s, u);
  s.np += 0.5 * ok.length;
  return null;
}
/** For the simulation and as a safety net: sell the extras, most duplicated cards first. */
export function trimHand(s: GameState) {
  for (let guard = 0; guard < 500; guard++) {
    const ex = handExcess(s);
    if (ex.total <= 0) return;
    const cat = (Object.keys(ex.byCat) as Cat[])[0];
    const pool = s.hand.filter(h => countsToLimit(h) && (!cat || CARDS[h.card].cat === cat));
    const n: Record<string, number> = {}; for (const h of pool) n[h.card] = (n[h.card] ?? 0) + 1;
    const worst = pool.sort((a, b) => n[b.card] - n[a.card] || b.uid - a.uid)[0];
    if (!worst) return;
    sellCards(s, [worst.uid]);
  }
}
export const RATE_CAP = 1.4;
export const CAT_INFO: Record<Cat, { name: string; icon: string; role: Role; color: string }> = {
  military: { name: 'Military', icon: 'sword', role: 'general', color: '#6e2b2b' },
  diplomacy: { name: 'Diplomacy', icon: 'hands', role: 'diplomat', color: '#2f4f6b' },
  internal: { name: 'Internal', icon: 'crown', role: 'admin', color: '#4d3a62' },
  economy: { name: 'Economy', icon: 'coin', role: 'merchant', color: '#6d5a2a' },
  research: { name: 'Research', icon: 'book', role: 'researcher', color: '#3c6a45' },
  culture: { name: 'People', icon: 'people', role: 'courtier', color: '#7a3a5a' },
};

const stab = (s: GameState, d: number) => { const p = player(s); p.stability = clamp(p.stability + d, -3, 3); };
const techOk = (s: GameState, t?: string) => !t || hasTech(s, t);
const never = () => 0;
setCardPool((s, cat) => Object.fromEntries(Object.values(CARDS).filter(c => c.cat === cat && !c.burden && !c.permanent && c.weight(s) > 0).map(c => [c.id, true as const])));
const trackOpen = (s: GameState, t: TechTrack) => (TECHS.some(x => x.track === t && x.age <= ageIndex(s) && !s.techs.includes(x.id)) ? 1.8 : 0);

export const CARDS: Record<string, HandCardDef> = {};
const add = (d: HandCardDef) => { CARDS[d.id] = d; };

// ---------- military ----------
/** Troop cards are by class: each hires the most advanced unit of that class you have researched. */
export type UnitClass = 'levy' | 'inf' | 'shot' | 'cav' | 'art';
export const UNIT_LINES: Record<UnitClass, string[]> = {
  levy: ['levy'],
  inf: ['men_at_arms', 'pikemen'],
  shot: ['crossbow', 'arquebusiers', 'musketeers', 'line_infantry'],
  cav: ['jinetes', 'reiters', 'dragoons'],
  art: ['bombard', 'field_cannon'],
};
export const CLASS_NAME: Record<UnitClass, string> = { levy: 'Levy Infantry', inf: 'Infantry', shot: 'Ranged', cav: 'Cavalry', art: 'Artillery' };
/** The unit a class card hires now. */
export const unitFor = (s: GameState, cls: UnitClass) => [...UNIT_LINES[cls]].reverse().find(t => techOk(s, TROOPS[t].tech)) ?? UNIT_LINES[cls][0];
/** The unit a troop card hires. */
export const cardTroop = (s: GameState, d: HandCardDef) => (d.cls ? unitFor(s, d.cls) : d.troop!);
const CLASS_CARDS: [string, UnitClass, string, number, string][] = [
  ['hire_levy', 'levy', 'Levy Infantry', 3, 'Peasants with spears: cheap, and the base for many recipes.'],
  ['hire_infantry', 'inf', 'Hire Infantry', 2.5, 'Your best foot soldiers: Men-at-Arms, then Pikemen with Pike Square.'],
  ['hire_ranged', 'shot', 'Hire Ranged', 2.5, 'Your best missile troops: Crossbowmen, then Arquebusiers, Musketeers and Line Infantry as you research them.'],
  ['hire_cavalry', 'cav', 'Hire Cavalry', 1.8, 'Your best horsemen: Jinetes, then Reiters and Dragoons as you research them. Heavy horse comes from recipes.'],
  ['hire_artillery', 'art', 'Hire Artillery', 1, 'Your best guns: Bombards, then Field Cannon with Bronze Cannon.'],
];
for (const [id, cls, name, w, text] of CLASS_CARDS) add({ id, name, cat: 'military', kind: 'troop', cls, troop: UNIT_LINES[cls][0], icon: TROOPS[UNIT_LINES[cls][0]].icon, text, weight: () => w });
// old single-unit cards stay playable in saved games, but are no longer drawn
for (const t of Object.values(TROOPS).filter(t => t.draftable && t.kind !== 'ship' && t.id !== 'levy')) {
  add({ id: 'hire_' + t.id, name: t.name, cat: 'military', kind: 'troop', troop: t.id, icon: t.icon, text: t.desc, weight: never });
}
const SHIP_WEIGHT: Record<string, number> = { galley: 1.4, caravel: 1.2, carrack: 1.2, galleon: 1.2, man_of_war: 1 };
for (const t of Object.values(TROOPS).filter(t => t.draftable && t.kind === 'ship')) {
  add({ id: 'ship_' + t.id, name: t.name, cat: 'military', kind: 'ship', troop: t.id, icon: t.icon, text: `${t.desc} Carries ${t.transport} companies.`,
    weight: s => (techOk(s, t.tech) && provsOf(s, s.player).some(p => p.buildings.includes('harbour') || (getGeo().coastal[p.id] && p.dev >= 3)) ? SHIP_WEIGHT[t.id] ?? 1 : 0) });
}
for (const e of Object.values(EQUIPMENT)) {
  add({ id: 'eq_' + e.id, name: e.name, cat: 'military', kind: 'equip', equip: e.id, icon: e.icon, text: e.desc,
    weight: s => (techOk(s, e.tech) ? (e.id === 'banner' ? 0.6 : e.tech ? 1.8 : 1.2) : 0) });
}
add({ id: 'hire_general', name: 'Recruit a General', cat: 'military', kind: 'hire', role: 'general', icon: 'helm', text: 'Meet three captains, keep one. Costs 1 manpower.', weight: () => 1.1 });
add({ id: 'march_orders', name: 'March Orders', cat: 'military', kind: 'mission', missions: ['conquer', 'raid', 'base'], icon: 'sword', text: 'Send a general and troops to conquer or raid an enemy province within a quarter\'s march, or to set up an invasion base near a far one.', weight: s => (s.wars.some(w => w.a === s.player || w.b === s.player) ? 0.6 : 0.2) });
add({ id: 'forced_march', name: 'Forced March', cat: 'military', kind: 'instant', target: 'mission', icon: 'boot', text: 'A mission takes 1 year less (minimum 1).', weight: () => 0.9,
  targetOk: (s, t) => { const m = s.missions.find(x => String(x.id) === t); return !!m && m.turnsLeft > 1 && m.kind !== 'research'; },
  play: (s, t) => { s.missions.find(x => String(x.id) === t)!.turnsLeft--; return 'The mission speeds up'; } });
add({ id: 'drill', name: 'Drill Sergeant', cat: 'military', kind: 'instant', improve: true, target: 'troop', icon: 'banner', text: 'A troop gains a veteran star.', weight: () => 1,
  targetOk: (s, t) => s.troops.some(x => String(x.uid) === t && x.vet < 3),
  play: (s, t) => { const x = s.troops.find(y => String(y.uid) === t)!; x.vet++; return `${TROOPS[x.type].name} gains a star`; } });
add({ id: 'fresh_recruits', name: 'Fresh Recruits', cat: 'military', kind: 'instant', icon: 'spear', text: 'Troops at home return to full strength.', weight: () => 0.8,
  play: s => { for (const t of s.troops) if (t.mission == null) t.str = 100; return 'Ranks refilled'; } });
add({ id: 'ambush', name: 'Ambush', cat: 'military', kind: 'instant', icon: 'eye', text: 'In your next battle you see the enemy\'s tactic every round.', weight: () => 0.8,
  play: s => { s.flags.ambush = 1; return 'Scouts are ready for the next battle'; } });
add({ id: 'condottieri', name: 'Swiss Captain', cat: 'military', kind: 'instant', icon: 'pike', text: 'Pay 35 ducats: hire a 1-star company of Swiss Pikes (no manpower needed).', weight: () => 0.6,
  can: s => player(s).gold < 35 ? 'Needs 35 ducats' : s.troops.length >= armyCap(s) ? 'Army is at full size' : null,
  play: s => { player(s).gold -= 35; s.troops.push({ uid: uid(s), type: 'swiss', vet: 1, str: 100 }); return 'Swiss Pikes join your army'; } });
add({ id: 'conquistadors', name: 'Conquistadors', cat: 'military', kind: 'instant', icon: 'gun', text: 'Veterans return from overseas: gain a 1-star troop for free.', weight: never,
  can: s => s.troops.length >= armyCap(s) ? 'Army is at full size' : null,
  play: s => { const type = hasTech(s, 'firearms') ? 'arquebusiers' : 'men_at_arms'; s.troops.push({ uid: uid(s), type, vet: 1, str: 100 }); return `${TROOPS[type].name} join your army`; } });

// ---------- diplomacy ----------
add({ id: 'hire_diplomat', name: 'Engage a Diplomat', cat: 'diplomacy', kind: 'hire', role: 'diplomat', icon: 'scroll', text: 'Meet three envoys, keep one. Costs 1 manpower.', weight: () => 1.1 });
add({ id: 'embassy', name: 'Embassy', cat: 'diplomacy', kind: 'mission', permanent: true, missions: ['relations'], icon: 'scroll', text: 'Send a diplomat to improve relations (+25).', weight: () => 2 });
add({ id: 'import_contract', name: 'Import Contract', cat: 'economy', kind: 'mission', missions: ['route'], trade: 'buy', icon: 'coin', text: 'A merchant opens a route that buys 1–4 loads a year of one good abroad, every quarter. Quick to set up; dear unless you have a trade post there.', weight: s => (Object.values(s.short ?? {}).some(v => v > 0.1) ? 1.6 : 1.1) });
add({ id: 'export_contract', name: 'Export Contract', cat: 'economy', kind: 'mission', missions: ['route'], trade: 'sell', icon: 'coin', text: 'A merchant opens a route that sells 1–4 loads a year of one good abroad, every quarter. Better prices through a trade post.', weight: () => 1 });
add({ id: 'trading_post', name: 'Trade Post Charter', cat: 'economy', kind: 'mission', missions: ['post'], icon: 'anchor', text: 'A merchant founds a post abroad: 2 quarters next door, up to 6 overseas. Routes with that realm then buy below the market price and sell above it.', weight: s => (s.posts.length < postCap(s) ? 0.6 : 0.1) });
add({ id: 'merchant_route', name: 'Trade Route', cat: 'economy', kind: 'mission', missions: ['route'], icon: 'coin', text: 'An old route charter: buy or sell a good abroad.', weight: never });
add({ id: 'trade_route', name: 'Trade Treaty', cat: 'diplomacy', kind: 'mission', missions: ['trade'], icon: 'coin', text: 'Sign a trade treaty: ducats every year, and better prices on your trade routes with them.', weight: () => 2 });
add({ id: 'alliance_pact', name: 'Alliance Pact', cat: 'diplomacy', kind: 'mission', missions: ['alliance'], icon: 'hands', text: 'Seek an alliance. They will join your wars.', weight: () => 1.2 });
add({ id: 'marriage', name: 'Royal Marriage', cat: 'diplomacy', kind: 'mission', missions: ['marriage'], icon: 'ring', text: 'Join the royal houses: relations grow every year.', weight: () => 1 });
add({ id: 'peace_envoy', name: 'Peace Envoy', cat: 'diplomacy', kind: 'mission', permanent: true, missions: ['peace'], icon: 'dove', text: 'Negotiate an end to a war.', weight: s => (s.wars.some(w => w.a === s.player || w.b === s.player) ? 2 : 0.6) });
add({ id: 'expedition', name: 'Voyage of Discovery', cat: 'diplomacy', kind: 'mission', missions: ['explore'], agent: 'explorer', icon: 'anchor', text: 'An explorer sails into the unknown. What they find is up to fate.', weight: s => (ageId(s) === 'reconquest' ? 0 : 0.9) });
add({ id: 'fealty', name: 'Demand Fealty', cat: 'diplomacy', kind: 'mission', missions: ['vassalize'], icon: 'crown', text: 'Make a much weaker crown your vassal.', weight: () => 0.7 });
add({ id: 'fortify', name: 'Fortify', cat: 'military', kind: 'instant', icon: 'tower', text: 'Pay 25 ducats: the most exposed province on your borders gains a fort level (up to 2, or 3 with Star Forts).', weight: s => (s.wars.some(w => w.a === s.player || w.b === s.player) ? 1.2 : 0.6),
  can: s => player(s).gold < Math.round(25 * inflation(s)) ? `Needs ${Math.round(25 * inflation(s))} ducats` : !exposedProvince(s) ? 'Every border province is fortified already' : null,
  play: s => { const p = exposedProvince(s)!; player(s).gold -= Math.round(25 * inflation(s)); p.fort++; return `${p.name} is fortified: fort ${p.fort}`; } });
add({ id: 'scouts', name: 'Spy Troop Positions', cat: 'military', kind: 'instant', target: 'nation', icon: 'eye', text: 'Scouts find where a realm\'s armies stand, and how strong they are, for 2 years. Strike where they are weak.', weight: s => (enemiesOf(s, s.player).length ? 1.5 : 0.4),
  targetOk: (s, t) => t !== s.player && !!s.nations[t]?.alive, play: (s, t) => { s.nations[t].spiedUntil = Math.max(s.nations[t].spiedUntil ?? 0, s.year + 2); return `Scouts report where the ${s.nations[t].adj} armies stand`; } });
add({ id: 'integration', name: 'Integration Treaty', cat: 'diplomacy', kind: 'mission', missions: ['integrate'], icon: 'hands', text: 'Fold a loyal vassal or union crown into the realm.', weight: s => (Object.values(s.nations).some(n => n.overlord === s.player) ? 1.2 : 0.1) });
add({ id: 'spy_network', name: 'Spy Network', cat: 'diplomacy', kind: 'instant', target: 'nation', icon: 'eye', text: 'Reveal a nation\'s army and where it stands for 10 years. Missions against it get +10%.', weight: () => 1,
  targetOk: (s, t) => t !== s.player, play: (s, t) => { s.nations[t].spiedUntil = s.year + 10; return `Your agents report from ${nationName(s, t)}`; } });
add({ id: 'royal_feast', name: 'Royal Feast', cat: 'diplomacy', kind: 'instant', target: 'nation', icon: 'cup', text: 'Pay 10 ducats: relations +25 with a nation.', weight: () => 1,
  can: s => player(s).gold < 10 ? 'Needs 10 ducats' : null, targetOk: (s, t) => t !== s.player,
  play: (s, t) => { player(s).gold -= 10; addRel(s, s.player, t, 25); return `Relations with ${nationName(s, t)} +25`; } });
add({ id: 'lavish_gifts', name: 'Lavish Gifts', cat: 'diplomacy', kind: 'instant', target: 'mission', icon: 'cup', text: 'Pay 15 ducats: a diplomatic mission gets +20% success.', weight: () => 0.8,
  can: s => player(s).gold < 15 ? 'Needs 15 ducats' : null,
  targetOk: (s, t) => s.missions.some(m => String(m.id) === t && ['relations', 'trade', 'alliance', 'marriage', 'peace'].includes(m.kind)),
  play: (s, t) => { player(s).gold -= 15; s.missions.find(x => String(x.id) === t)!.bonus += 0.2; return 'The envoys carry gold and silk'; } });
add({ id: 'claim', name: 'Fabricated Claim', cat: 'diplomacy', kind: 'instant', target: 'nation', icon: 'scroll', text: 'You may declare war on a nation without losing stability.', weight: () => 0.8,
  targetOk: (s, t) => t !== s.player, play: (s, t) => { s.flags['claim_' + t] = 1; return `You hold a claim against ${nationName(s, t)}`; } });

add({ id: 'conquista', name: 'Conquista', cat: 'military', kind: 'mission', missions: ['conquista'], agent: 'conqueror', icon: 'sword', text: 'A conqueror leads troops against a native people overseas.', weight: s => (Object.values(s.overseas).some(o => o.found) ? 1 : 0.15) });

// ---------- internal ----------
add({ id: 'hire_admin', name: 'Appoint an Administrator', cat: 'internal', kind: 'hire', role: 'admin', icon: 'quill', text: 'Meet three officials, keep one. Costs 1 manpower.', weight: () => 1.1 });
add({ id: 'royal_works', name: 'Royal Works', cat: 'internal', kind: 'mission', missions: ['build'], group: 'internal', icon: 'hammer', text: 'Build a temple, library, barracks, fortress, courthouse or university.', weight: () => 2.5 });
add({ id: 'settlers', name: 'Settlers', cat: 'internal', kind: 'mission', missions: ['develop'], icon: 'wheat', text: 'Develop a province: +1 development.', weight: () => 1.5 });
add({ id: 'found_settlement', name: 'Found a Settlement', cat: 'internal', kind: 'mission', missions: ['found'], icon: 'tower', text: 'Found a village, town or city where there is none. The better the administrator, the bigger it starts.', weight: s => (provsOf(s, s.player).some(p => !p.settlement) ? 1.4 : 0.2) });
add({ id: 'grow_settlement', name: 'Grow your Settlement', cat: 'internal', kind: 'mission', missions: ['grow'], icon: 'tower', text: 'Grow a village to a town, a town to a city, a city to a metropolis.', weight: () => 1.3 });
add({ id: 'royal_progress', name: 'Royal Progress', cat: 'internal', kind: 'mission', missions: ['progress'], icon: 'crown', text: 'Tour the realm: stability +1, prestige +2, control +10 everywhere.', weight: () => 1.2 });
add({ id: 'colonial_charter', name: 'Colonial Charter', cat: 'internal', kind: 'mission', missions: ['colonize'], agent: 'colonist', icon: 'tower', text: 'A colonist settles a discovered land (1 manpower).', weight: s => (Object.values(s.overseas).some(o => o.found) ? 1.2 : 0.15) });
add({ id: 'patronage', name: 'Commission a Work of Art', cat: 'culture', agent: 'artist', kind: 'mission', missions: ['artwork'], icon: 'quill', text: 'An artist makes a painting, poem, treatise or monument. The better the work, the longer it cheers the people; the best pay ducats, bring prestige and a free card.', weight: () => 1.3 });
add({ id: 'religious_mission', name: 'Religious Mission', cat: 'culture', agent: 'priest', kind: 'mission', missions: ['convert'], icon: 'church', text: 'Preachers convert a province to your faith.', weight: s => (provsOf(s, s.player).some(p => p.religion !== s.stateReligion) ? 1.3 : 0.1) });
add({ id: 'royal_grace', name: 'Royal Grace', cat: 'culture', agent: 'leader', kind: 'mission', missions: ['grace'], icon: 'mood', text: 'A cultural leader wins the hearts of one province. A better one is faster and kinder.', weight: s => (provsOf(s, s.player).some(p => happinessOf(s, p).value < 50) ? 1.3 : 0.5) });
add({ id: 'assimilation', name: 'Cultural Integration', cat: 'culture', agent: 'leader', kind: 'mission', missions: ['assimilate'], icon: 'scroll', text: 'Bring a province of foreign culture into your ways.', weight: s => (provsOf(s, s.player).some(p => !s.accepted.includes(p.culture)) ? 1.1 : 0.1) });
add({ id: 'hire_courtier', name: 'Invite a Courtier', cat: 'culture', kind: 'hire', role: 'courtier', icon: 'people', text: 'Meet three courtiers, keep one. Their first mission makes them a churchman, an artist or a cultural leader for good. Costs 1 manpower.', weight: () => 1.1 });
add({ id: 'hire_artist', name: 'Invite an Artist', cat: 'culture', kind: 'hire', role: 'artist', icon: 'quill', text: 'Meet three painters, poets and builders, keep one. Costs 1 manpower.', weight: () => 0.6 });
add({ id: 'hire_priest', name: 'Call a Churchman', cat: 'culture', kind: 'hire', role: 'priest', icon: 'church', text: 'Meet three clerics, keep one. Costs 1 manpower.', weight: () => 0.6 });
add({ id: 'holy_see', name: 'Mission to the Church', cat: 'culture', agent: 'priest', kind: 'mission', missions: ['pilgrimage'], icon: 'church', text: 'A churchman wins the favour of your faith\'s leaders. Blessed realms are happier and more prestigious; censured ones lose stability.', weight: () => 1 });
add({ id: 'embrace_culture', name: 'Embrace a Culture', cat: 'culture', agent: 'leader', kind: 'mission', missions: ['accept'], icon: 'people', text: 'A cultural leader makes a people of your realm one of your own: no more foreign-culture unhappiness.', weight: s => (provsOf(s, s.player).some(p => !s.accepted.includes(p.culture)) ? 0.9 : 0.1) });
add({ id: 'church_gift', name: 'Gift to the Church', cat: 'culture', kind: 'instant', icon: 'church', text: 'Pay 25 ducats: your faith\'s leaders favour you more (+10).', weight: () => 0.9,
  can: s => player(s).gold < giftCost(s) ? `Needs ${giftCost(s)} ducats` : null,
  play: s => { sendGift(s); return `Favour with ${churchHead(s).name.replace(/^The /, 'the ')} +10`; } });
add({ id: 'festival', name: 'Royal Festival', cat: 'culture', kind: 'instant', icon: 'cup', text: 'Pay 15 ducats: happiness +8 for 5 years.', weight: () => 0.9,
  can: s => player(s).gold < Math.round(15 * inflation(s)) ? `Needs ${Math.round(15 * inflation(s))} ducats` : null,
  play: s => { player(s).gold -= Math.round(15 * inflation(s)); s.flags.festival_until = s.year + 5; return 'Bells, bonfires and bullfights: happiness +8 for 5 years'; } });
add({ id: 'charter', name: 'Charter of Privileges', cat: 'culture', kind: 'instant', icon: 'scroll', text: 'Accept the largest foreign culture in your realm. Its people stop feeling like outsiders.', weight: s => (provsOf(s, s.player).some(p => !s.accepted.includes(p.culture)) ? 0.6 : 0),
  can: s => (!provsOf(s, s.player).some(p => !s.accepted.includes(p.culture)) ? 'Every culture is already accepted' : s.accepted.length >= acceptCap(s) ? `You can embrace ${acceptCap(s)} cultures (more with a bigger realm)` : null),
  play: s => { const c = largestForeignCulture(s)!; s.accepted.push(c); return `${CULTURE_NAMES[c] ?? c} culture is accepted`; } });
add({ id: 'tolerance', name: 'Edict of Tolerance', cat: 'culture', kind: 'instant', icon: 'dove', text: 'For 20 years, other faiths are less unhappy. The Papacy disapproves (−20).', weight: s => (provsOf(s, s.player).some(p => p.religion !== s.stateReligion) ? 0.6 : 0),
  play: s => { s.flags.tolerance_until = s.year + 20; addRel(s, s.player, 'papacy', -20); return 'Other faiths may worship in peace'; } });
add({ id: 'harvest', name: 'Bountiful Harvest', cat: 'internal', kind: 'instant', icon: 'wheat', text: 'Stability +1, manpower +2.', weight: () => 1,
  play: s => { stab(s, 1); player(s).manpower += 2; return 'Stability +1, manpower +2'; } });
add({ id: 'sermon', name: 'Inspired Sermon', cat: 'culture', kind: 'instant', icon: 'church', text: 'Stability +1, prestige +3.', weight: () => 1,
  play: s => { stab(s, 1); player(s).prestige += 3; return 'Stability +1, prestige +3'; } });
add({ id: 'census', name: 'Royal Census', cat: 'internal', kind: 'instant', icon: 'people', text: 'Manpower +3.', weight: () => 0.9,
  play: s => { player(s).manpower += 3; return 'Manpower +3'; } });
add({ id: 'pacify', name: 'Royal Pardon', cat: 'internal', kind: 'instant', icon: 'dove', text: 'Control +15 in every province.', weight: () => 0.9,
  play: s => { for (const p of provsOf(s, s.player)) p.control = Math.min(100, p.control + 15); return 'Control +15 everywhere'; } });
add({ id: 'favour', name: 'Royal Favour', cat: 'internal', kind: 'instant', icon: 'crown', text: 'Pay 20 ducats: a random courtier gains +1 skill.', weight: () => 0.6,
  can: s => player(s).gold < 20 ? 'Needs 20 ducats' : !s.characters.some(c => c.skill < 6 && !c.ruler) ? 'No courtier can improve' : null,
  play: s => { player(s).gold -= 20; const c = pick(s, s.characters.filter(x => x.skill < 6 && !x.ruler)); c.skill++; return `${c.name} rises to skill ${c.skill}`; } });
add({ id: 'relic', name: 'Holy Relic', cat: 'culture', kind: 'instant', icon: 'church', text: 'Prestige +8, stability +1.', weight: () => 0.4,
  play: s => { player(s).prestige += 8; stab(s, 1); return 'Prestige +8, stability +1'; } });
add({ id: 'crusade', name: 'Crusade Bull', cat: 'internal', kind: 'instant', icon: 'church', text: 'Gain 30 ducats and stability +1.', weight: never,
  play: s => { player(s).gold += 30; stab(s, 1); return '+30 ducats, stability +1'; } });
add({ id: 'unrest', name: 'Peasant Unrest', cat: 'internal', kind: 'instant', icon: 'chain', burden: true, text: 'While held: 20% chance a year of −1 stability. Play: pay 15 ducats to clear it.', weight: never,
  can: s => player(s).gold < 15 ? 'Needs 15 ducats' : null, play: s => { player(s).gold -= 15; return 'The grievances are settled'; } });

// ---------- economy ----------
add({ id: 'hire_merchant', name: 'Engage a Merchant', cat: 'economy', kind: 'hire', role: 'merchant', icon: 'coin', text: 'Meet three merchants, keep one. Costs 1 manpower.', weight: () => 1.1 });
add({ id: 'guild_charter', name: 'Guild Charter', cat: 'economy', kind: 'mission', missions: ['build'], group: 'economy', icon: 'anvil', text: 'A merchant builds farms, pastures, mines, markets, workshops, harbours, banks or manufactories.', weight: () => 2.5 });
add({ id: 'tax_farm', name: 'Tax Farmers', cat: 'economy', kind: 'mission', missions: ['tax'], icon: 'coin', text: 'A merchant collects extra taxes (1 year).', weight: () => 1.4 });
add({ id: 'irrigation', name: 'Irrigation', cat: 'economy', kind: 'mission', missions: ['develop'], icon: 'wheat', text: 'Develop a province: +1 development.', weight: () => 1 });
add({ id: 'levy_tax', name: 'Extraordinary Levy', cat: 'economy', kind: 'instant', icon: 'coin', text: 'Gain 6 + 2 per province in ducats. Stability −1.', weight: () => 1.2,
  play: s => { const g = Math.round((6 + 2 * provsOf(s, s.player).length) * inflation(s)); player(s).gold += g; stab(s, -1); s.taxBurden = Math.min(30, s.taxBurden + 10); return `+${g} ducats, stability −1, taxes weigh on the people`; } });
add({ id: 'windfall', name: 'Silver Windfall', cat: 'economy', kind: 'instant', icon: 'coin', text: 'Gain 35 ducats.', weight: () => 0.9,
  play: s => { const g = Math.round(35 * inflation(s)); player(s).gold += g; return `+${g} ducats`; } });
add({ id: 'trade_fair', name: 'Trade Fair', cat: 'economy', kind: 'instant', icon: 'scales', text: 'Gain 8 ducats per trade treaty, and 5 more.', weight: () => 1,
  play: s => { const n = s.treaties.filter(t => t.kind === 'trade' && (t.a === s.player || t.b === s.player)).length; const g = Math.round((5 + 8 * n) * inflation(s)); player(s).gold += g; return `+${g} ducats`; } });
add({ id: 'loan', name: 'Genoese Loan', cat: 'economy', kind: 'instant', icon: 'chain', text: 'Gain 60 ducats now. A Crown Debt card is added.', weight: () => 0.7,
  play: s => { player(s).gold += Math.round(60 * inflation(s)); addCard(s, 'debt'); return 'The bankers pay out'; } });
add({ id: 'treasure_fleet', name: 'Treasure Fleet', cat: 'economy', kind: 'instant', icon: 'anchor', text: 'Silver from the Indies: gain 60 ducats.', weight: s => (s.flags.new_world ? 0.8 : 0),
  play: s => { player(s).gold += 60; return '+60 ducats'; } });
add({ id: 'debt', name: 'Crown Debt', cat: 'economy', kind: 'instant', icon: 'chain', burden: true, text: 'While held: −2 ducats a year. Play: pay 30 ducats to clear it.', weight: never,
  can: s => player(s).gold < 30 ? 'Needs 30 ducats' : null, play: s => { player(s).gold -= 30; return 'The debt is paid off'; } });

// ---------- research ----------
add({ id: 'hire_researcher', name: 'Invite a Scholar', cat: 'research', kind: 'hire', role: 'researcher', icon: 'book', text: 'Meet three scholars, keep one. Costs 1 manpower.', weight: () => 1.1 });
add({ id: 'study_military', name: 'Military Treatise', cat: 'research', kind: 'mission', missions: ['research'], track: 'military', icon: 'sword', text: 'A researcher studies a military technology.', weight: s => trackOpen(s, 'military') });
add({ id: 'study_economy', name: 'Economic Treatise', cat: 'research', kind: 'mission', missions: ['research'], track: 'economy', icon: 'coin', text: 'A researcher studies an economic technology.', weight: s => trackOpen(s, 'economy') });
add({ id: 'study_state', name: 'Treatise on Government', cat: 'research', kind: 'mission', missions: ['research'], track: 'state', icon: 'scales', text: 'A researcher studies a statecraft technology.', weight: s => trackOpen(s, 'state') });
add({ id: 'collaboration', name: 'Collaboration', cat: 'research', kind: 'mission', missions: ['assist'], icon: 'people', text: 'A second scholar joins a study under way: it gains three quarters of their research until it is done.', weight: s => (s.missions.some(m => m.kind === 'research') ? 1.2 : 0.4) });
add({ id: 'scholar', name: 'Wandering Scholar', cat: 'research', kind: 'instant', target: 'mission', icon: 'book', text: 'A study gains 5 research.', weight: () => 1,
  targetOk: (s, t) => s.missions.some(m => String(m.id) === t && m.kind === 'research'),
  play: (s, t) => { const m = s.missions.find(x => String(x.id) === t)!; m.progress += 5; return `+5 research on ${TECH[m.target].name}`; } });
add({ id: 'breakthrough', name: 'Breakthrough', cat: 'research', kind: 'instant', icon: 'star', text: 'Every study under way gains 3 research.', weight: () => 0.7,
  can: s => (s.missions.some(m => m.kind === 'research') ? null : 'No study under way'),
  play: s => { for (const m of s.missions) if (m.kind === 'research') m.progress += 3; return 'All studies +3'; } });
add({ id: 'greek_scholars', name: 'Greek Scholars', cat: 'research', kind: 'instant', target: 'mission', icon: 'book', text: 'Refugees from Constantinople: a study gains 7 research.', weight: never,
  targetOk: (s, t) => s.missions.some(m => String(m.id) === t && m.kind === 'research'),
  play: (s, t) => { const m = s.missions.find(x => String(x.id) === t)!; m.progress += 7; return `+7 research on ${TECH[m.target].name}`; } });

// ---------- drawing ----------
export const handOf = (s: GameState, cat: Cat) => s.hand.filter(h => CARDS[h.card]?.cat === cat);

/** Add a card to hand. Respects the hand limit unless forced (burdens always arrive). */
export function addCard(s: GameState, card: string, force = false): boolean {
  const def = CARDS[card];
  if (def?.permanent && s.hand.some(h => h.card === card)) { s.np += 1; return false; } // you already hold it: a nation point instead
  void force;
  s.hand.push({ uid: uid(s), card });
  return true;
}

export function randomCard(s: GameState, cat: Cat, type?: CardType): string {
  const pool = Object.values(CARDS).filter(c => c.cat === cat && (!type || cardType(c) === type)).map(c => [c.id, c.weight(s)] as [string, number]).filter(([, w]) => w > 0);
  return weighted(s, pool);
}

export function drawCat(s: GameState, cat: Cat): boolean {
  addCard(s, randomCard(s, cat));
  return true;
}

export interface RatePart { label: string; v: number; }
export function cardRates(s: GameState): Record<Cat, { rate: number; parts: RatePart[] }> {
  const out = {} as Record<Cat, { rate: number; parts: RatePart[] }>;
  const arch = RULER_ARCHS[player(s).ruler.arch];
  for (const c of CATS) {
    const parts: RatePart[] = [{ label: 'Base', v: 0.5 }];
    let b = 0;
    // temples, libraries and universities work at half pace without books and art
    const arts = 1 - 0.5 * (s.short?.arts ?? 0);
    for (const p of provsOf(s, s.player)) for (const bid of p.buildings) b += (BUILDINGS[bid]?.rates?.[c] ?? 0) * grade(p, bid) * (['temple', 'library', 'university'].includes(bid) ? arts : 1);
    if (b) parts.push({ label: 'Buildings', v: b });
    let t = 0;
    for (const tid of s.techs) t += TECH_RATES[tid]?.[c] ?? 0;
    if (t) parts.push({ label: 'Research', v: t });
    const tier = provsOf(s, s.player).reduce((a, p) => a + TIERS[tierOf(p)].rate, 0);
    if (tier) parts.push({ label: 'Cities', v: tier });
    const r = (arch?.rates[c] ?? 0) + (arch?.all ?? 0);
    if (r) parts.push({ label: 'Monarch', v: r });
    const core = (s.core ?? []).reduce((a, id) => a + (CORE_RATES[id]?.[c] ?? 0), 0);
    if (core) parts.push({ label: 'Core cards', v: core });
    const era = ageDef(s);
    if (era.rates?.[c]) parts.push({ label: era.name, v: era.rates[c]! });
    if (pioneerNow(s) && era.focus === c) parts.push({ label: 'Pioneer of the age', v: 0.4 });
    if (player(s).stability <= -2) parts.push({ label: 'Unrest', v: -0.2 });
    out[c] = { rate: Math.min(RATE_CAP, Math.max(0.2, parts.reduce((a, p) => a + p.v, 0))), parts };
  }
  return out;
}

export function npRate(s: GameState): { rate: number; parts: RatePart[] } {
  const parts: RatePart[] = [{ label: 'Crown', v: 2 }];
  const courts = provsOf(s, s.player).reduce((a, p) => a + p.buildings.reduce((x, b) => x + (BUILDINGS[b]?.np ?? 0) * grade(p, b), 0), 0);
  if (courts) parts.push({ label: 'Courthouses', v: courts });
  const cities = provsOf(s, s.player).reduce((a, p) => a + TIERS[tierOf(p)].np, 0);
  if (cities) parts.push({ label: 'Cities', v: cities });
  const arch = RULER_ARCHS[player(s).ruler.arch];
  if (arch?.np) parts.push({ label: 'Monarch', v: arch.np });
  if ((s.short?.luxuries ?? 1) < 0.05) parts.push({ label: 'Luxuries at court', v: 0.5 });
  if (techFx(s, 'np')) parts.push({ label: 'Research', v: techFx(s, 'np') });
  if (ageId(s) === 'absolutism') parts.push({ label: 'Absolutism', v: 1 });
  if (hasCore(s, 'traditional')) parts.push({ label: 'Traditional', v: 1 });
  if (hasCore(s, 'open')) parts.push({ label: 'Open-minded', v: -0.5 });
  const st = player(s).stability;
  if (st) parts.push({ label: 'Stability', v: st * 0.5 });
  return { rate: Math.max(0.5, parts.reduce((a, p) => a + p.v, 0)), parts };
}

export const buyCost = (s: GameState, cat: Cat) => 3 + 2 * (s.bought[cat] ?? 0);

/** Yearly card income. Fractions carry over. */
export function yearlyCards(s: GameState, share = 1): Record<Cat, number> {
  const rates = cardRates(s);
  const got = {} as Record<Cat, number>;
  for (const c of CATS) {
    s.cardAccum[c] = (s.cardAccum[c] ?? 0) + rates[c].rate * share;
    got[c] = 0;
    while (s.cardAccum[c] >= 1) {
      s.cardAccum[c] -= 1;
      if (drawCat(s, c)) got[c]++;
    }
  }
  s.np += npRate(s).rate * share;
  return got;
}

export function grantRandomCards(s: GameState, n: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = CATS[Math.floor(rand(s) * CATS.length)];
    const id = randomCard(s, c);
    if (addCard(s, id)) names.push(CARDS[id].name);
  }
  return names;
}

// ---------- playing ----------
export function cardBlocked(s: GameState, def: HandCardDef): string | null {
  if (def.kind === 'troop') {
    if (player(s).manpower < 1) return 'Needs 1 manpower';
    if (s.troops.length >= armyCap(s)) return `Army is at full size (${armyCap(s)})`;
    if (player(s).gold < troopHireCost(s, cardTroop(s, def))) return `Needs ${troopHireCost(s, cardTroop(s, def))} ducats`;
    return null;
  }
  if (def.kind === 'hire') return player(s).manpower < 1 ? 'Needs 1 manpower' : null;
  if (def.kind === 'ship') return shipBlocked(s, def.troop!);
  if (def.kind === 'equip') return s.troops.some(t => t.mission == null) ? null : 'No troop at home to equip';
  if (def.kind === 'mission') return null;
  if (def.can) { const r = def.can(s); if (r) return r; }
  if (def.target === 'nation' && !Object.values(s.nations).some(n => n.alive && n.id !== s.player)) return 'No other nation';
  if (def.target === 'mission' && !s.missions.some(m => def.targetOk?.(s, String(m.id)))) return 'No suitable mission';
  if (def.target === 'troop' && !s.troops.some(t => def.targetOk?.(s, String(t.uid)))) return 'No suitable troop';
  return null;
}

export function troopHireCost(s: GameState, type: string): number {
  const d = TROOPS[type];
  // what the warehouses lack (weapons, powder, leather) is bought at double price
  return Math.round((6 + 6 * d.tier) * inflation(s)) + shortfallCost(s, hireNeeds(type, d.kind));
}

export const removeCard = (s: GameState, handUid: number) => { s.hand = s.hand.filter(x => x.uid !== handUid); };

/** Play an instant card, or hire a troop. Returns a message (or an error starting with '!'). */
export function playCard(s: GameState, handUid: number, target: string): string {
  const h = s.hand.find(x => x.uid === handUid);
  if (!h) return '!Card not found';
  const def = CARDS[h.card];
  const blocked = cardBlocked(s, def);
  if (blocked) return '!' + blocked;
  if (def.kind === 'troop') {
    const gen = s.characters.find(c => String(c.uid) === target && c.mission == null && (c.role === 'general' || c.role === 'conqueror'));
    player(s).manpower -= 1;
    const type = cardTroop(s, def);
    player(s).gold -= troopHireCost(s, type);
    takeGoods(s, hireNeeds(type, TROOPS[type].kind));
    const o = rollOutcome(s, gen);
    const vet = [0, 0, 1, 2, 3][o];
    s.troops.push({ uid: uid(s), type, vet, str: o === 0 ? 70 : 100 });
    removeCard(s, handUid);
    log(s, `Hired ${TROOPS[type].name}${vet ? ' ' + '★'.repeat(vet) : ''}.`);
    return `${outcomeName(o)} recruits: ${TROOPS[type].name}${vet ? ' ' + '★'.repeat(vet) : ''}${o === 0 ? ' (under strength)' : ''}${gen ? ', trained by ' + gen.name : ''}`;
  }
  if (def.kind !== 'instant' || !def.play) return '!This card is used another way';
  if (def.target === 'nation' && !s.nations[target]?.alive) return '!Choose a nation';
  if (def.target && def.target !== 'none' && def.targetOk && !def.targetOk(s, target)) return '!Choose a valid target';
  const msg = def.play(s, target);
  removeCard(s, handUid);
  return msg;
}

/** The first card in hand that can launch this mission kind. */
export function cardFor(s: GameState, kind: MissionKind, opts: { track?: TechTrack; group?: BuildingGroup } = {}) {
  return s.hand.find(h => {
    const d = CARDS[h.card];
    if (d.kind !== 'mission' || !d.missions?.includes(kind)) return false;
    if (opts.track && d.track !== opts.track) return false;
    if (opts.group && d.group !== opts.group) return false;
    return true;
  });
}

/** Discard a card you cannot use: +0.5 nation points. Burdens cannot be discarded. */
export function discardCard(s: GameState, handUid: number): string | null {
  const h = s.hand.find(x => x.uid === handUid);
  if (!h) return 'Card not found';
  if (CARDS[h.card].burden) return 'Burdens must be paid off';
  removeCard(s, handUid);
  s.np += 0.5;
  return null;
}

// ---------- archive: cards set aside to keep the hand tidy ----------
/** Set cards aside. Burdens (debts, unrest) cannot be hidden away. */
export function archiveCards(s: GameState, uids: number[]): string | null {
  const move = s.hand.filter(h => uids.includes(h.uid) && !CARDS[h.card].burden);
  if (!move.length) return 'Nothing to archive (burdens cannot be archived)';
  s.archive = [...(s.archive ?? []), ...move];
  s.hand = s.hand.filter(h => !move.includes(h));
  return null;
}
/** Bring an archived card back into the hand, if there is room for its kind. */
export function restoreCard(s: GameState, uid: number): string | null {
  const c = s.archive?.find(h => h.uid === uid);
  if (!c) return 'Not in the archive';
  const cat = CARDS[c.card].cat;
  if (heldOf(s, cat) >= handLimit(s) || heldTotal(s) >= handTotalLimit(s)) return 'Your hand is full';
  s.archive = s.archive!.filter(h => h !== c);
  s.hand.push(c);
  return null;
}
/** Throw an archived card away for half a nation point. */
export function dropArchived(s: GameState, uid: number): string | null {
  const c = s.archive?.find(h => h.uid === uid);
  if (!c) return 'Not in the archive';
  s.archive = s.archive!.filter(h => h !== c);
  s.np += 0.5;
  return null;
}
