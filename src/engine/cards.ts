// Cards are the actions of the game. Five kinds, each drawn at its own yearly rate.
import type { GameState, Cat, Role, MissionKind } from '../types';
import { CATS } from '../types';
import { TROOPS, EQUIPMENT } from '../data/troops';
import { TECH, TECHS, BUILDINGS, TECH_RATES, type TechTrack, type BuildingGroup } from '../data/techs';
import { RULER_ARCHS } from '../data/nations';
import {
  player, provsOf, clamp, uid, pick, addRel, hasTech, nationName, armyCap, rand, weighted, hasGood, inflation, log, TIERS, tierOf,
} from './core';

export type CardTarget = 'none' | 'nation' | 'mission' | 'troop';
export type CardKind = 'troop' | 'equip' | 'hire' | 'mission' | 'instant';

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
}

export const HAND_LIMIT = 6;
export const CAT_INFO: Record<Cat, { name: string; icon: string; role: Role; color: string }> = {
  military: { name: 'Military', icon: 'sword', role: 'general', color: '#6e2b2b' },
  diplomacy: { name: 'Diplomacy', icon: 'hands', role: 'diplomat', color: '#2f4f6b' },
  internal: { name: 'Internal', icon: 'crown', role: 'admin', color: '#4d3a62' },
  economy: { name: 'Economy', icon: 'coin', role: 'merchant', color: '#6d5a2a' },
  research: { name: 'Research', icon: 'book', role: 'researcher', color: '#3c6a45' },
};

const stab = (s: GameState, d: number) => { const p = player(s); p.stability = clamp(p.stability + d, -3, 3); };
const techOk = (s: GameState, t?: string) => !t || hasTech(s, t);
const never = () => 0;
const trackOpen = (s: GameState, t: TechTrack) => (TECHS.some(x => x.track === t && !s.techs.includes(x.id)) ? 1.8 : 0);

export const CARDS: Record<string, HandCardDef> = {};
const add = (d: HandCardDef) => { CARDS[d.id] = d; };

// ---------- military ----------
const TROOP_WEIGHT: Record<string, number> = { levy: 4, crossbow: 3, jinetes: 2.5, men_at_arms: 2, knights: 1, bombard: 1, pikemen: 2.5, arquebusiers: 2.5 };
for (const t of Object.values(TROOPS).filter(t => t.draftable)) {
  add({ id: 'hire_' + t.id, name: t.name, cat: 'military', kind: 'troop', troop: t.id, icon: t.icon, text: t.desc,
    weight: s => (techOk(s, t.tech) ? TROOP_WEIGHT[t.id] ?? 1 : 0) });
}
for (const e of Object.values(EQUIPMENT)) {
  add({ id: 'eq_' + e.id, name: e.name, cat: 'military', kind: 'equip', equip: e.id, icon: e.icon, text: e.desc,
    weight: s => (techOk(s, e.tech) ? (e.id === 'banner' ? 0.6 : e.tech ? 1.8 : 1.2) : 0) });
}
add({ id: 'hire_general', name: 'Recruit a General', cat: 'military', kind: 'hire', role: 'general', icon: 'helm', text: 'Meet three captains, keep one. Costs 1 manpower.', weight: () => 1.1 });
add({ id: 'march_orders', name: 'March Orders', cat: 'military', kind: 'mission', missions: ['conquer', 'raid'], icon: 'sword', text: 'Send a general and troops to conquer or raid an enemy province.', weight: () => 2.6 });
add({ id: 'forced_march', name: 'Forced March', cat: 'military', kind: 'instant', target: 'mission', icon: 'boot', text: 'A mission takes 1 year less (minimum 1).', weight: () => 0.9,
  targetOk: (s, t) => { const m = s.missions.find(x => String(x.id) === t); return !!m && m.turnsLeft > 1 && m.kind !== 'research'; },
  play: (s, t) => { s.missions.find(x => String(x.id) === t)!.turnsLeft--; return 'The mission speeds up'; } });
add({ id: 'drill', name: 'Drill Sergeant', cat: 'military', kind: 'instant', target: 'troop', icon: 'banner', text: 'A troop gains a veteran star.', weight: () => 1,
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
add({ id: 'embassy', name: 'Embassy', cat: 'diplomacy', kind: 'mission', missions: ['relations'], icon: 'scroll', text: 'Send a diplomat to improve relations (+25).', weight: () => 2 });
add({ id: 'trade_route', name: 'Trade Route', cat: 'diplomacy', kind: 'mission', missions: ['trade'], icon: 'coin', text: 'Sign a trade treaty, and import one of their goods you lack.', weight: () => 2 });
add({ id: 'alliance_pact', name: 'Alliance Pact', cat: 'diplomacy', kind: 'mission', missions: ['alliance'], icon: 'hands', text: 'Seek an alliance. They will join your wars.', weight: () => 1.2 });
add({ id: 'marriage', name: 'Royal Marriage', cat: 'diplomacy', kind: 'mission', missions: ['marriage'], icon: 'ring', text: 'Join the royal houses: relations grow every year.', weight: () => 1 });
add({ id: 'peace_envoy', name: 'Peace Envoy', cat: 'diplomacy', kind: 'mission', missions: ['peace'], icon: 'dove', text: 'Negotiate an end to a war.', weight: s => (s.wars.some(w => w.a === s.player || w.b === s.player) ? 2 : 0.6) });
add({ id: 'expedition', name: 'Voyage of Discovery', cat: 'diplomacy', kind: 'mission', missions: ['explore'], agent: 'explorer', icon: 'anchor', text: 'An explorer sails into the unknown. What they find is up to fate.', weight: () => 0.9 });
add({ id: 'spy_network', name: 'Spy Network', cat: 'diplomacy', kind: 'instant', target: 'nation', icon: 'eye', text: 'Reveal a nation\'s army for 10 years. Missions against it get +10%.', weight: () => 1,
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
add({ id: 'found_city', name: 'Found a City', cat: 'internal', kind: 'mission', missions: ['found'], icon: 'tower', text: 'Found a new city in a province: +1 development and 2 more building slots.', weight: () => 0.7 });
add({ id: 'royal_progress', name: 'Royal Progress', cat: 'internal', kind: 'mission', missions: ['progress'], icon: 'crown', text: 'Tour the realm: stability +1, prestige +2, control +10 everywhere.', weight: () => 1.2 });
add({ id: 'colonial_charter', name: 'Colonial Charter', cat: 'internal', kind: 'mission', missions: ['colonize'], agent: 'colonist', icon: 'tower', text: 'A colonist settles a discovered land (1 manpower).', weight: s => (Object.values(s.overseas).some(o => o.found) ? 1.2 : 0.15) });
add({ id: 'harvest', name: 'Bountiful Harvest', cat: 'internal', kind: 'instant', icon: 'wheat', text: 'Stability +1, manpower +2.', weight: () => 1,
  play: s => { stab(s, 1); player(s).manpower += 2; return 'Stability +1, manpower +2'; } });
add({ id: 'sermon', name: 'Inspired Sermon', cat: 'internal', kind: 'instant', icon: 'church', text: 'Stability +1, prestige +3.', weight: () => 1,
  play: s => { stab(s, 1); player(s).prestige += 3; return 'Stability +1, prestige +3'; } });
add({ id: 'census', name: 'Royal Census', cat: 'internal', kind: 'instant', icon: 'people', text: 'Manpower +3.', weight: () => 0.9,
  play: s => { player(s).manpower += 3; return 'Manpower +3'; } });
add({ id: 'pacify', name: 'Royal Pardon', cat: 'internal', kind: 'instant', icon: 'dove', text: 'Control +15 in every province.', weight: () => 0.9,
  play: s => { for (const p of provsOf(s, s.player)) p.control = Math.min(100, p.control + 15); return 'Control +15 everywhere'; } });
add({ id: 'favour', name: 'Royal Favour', cat: 'internal', kind: 'instant', icon: 'crown', text: 'Pay 20 ducats: a random courtier gains +1 skill.', weight: () => 0.6,
  can: s => player(s).gold < 20 ? 'Needs 20 ducats' : !s.characters.some(c => c.skill < 6 && !c.ruler) ? 'No courtier can improve' : null,
  play: s => { player(s).gold -= 20; const c = pick(s, s.characters.filter(x => x.skill < 6 && !x.ruler)); c.skill++; return `${c.name} rises to skill ${c.skill}`; } });
add({ id: 'relic', name: 'Holy Relic', cat: 'internal', kind: 'instant', icon: 'church', text: 'Prestige +8, stability +1.', weight: () => 0.4,
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
  play: s => { const g = Math.round((6 + 2 * provsOf(s, s.player).length) * inflation(s)); player(s).gold += g; stab(s, -1); return `+${g} ducats, stability −1`; } });
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
  if (!force && !def?.burden && handOf(s, def.cat).length >= HAND_LIMIT) return false;
  s.hand.push({ uid: uid(s), card });
  return true;
}

export function randomCard(s: GameState, cat: Cat): string {
  const pool = Object.values(CARDS).filter(c => c.cat === cat).map(c => [c.id, c.weight(s)] as [string, number]).filter(([, w]) => w > 0);
  return weighted(s, pool);
}

export function drawCat(s: GameState, cat: Cat): boolean {
  if (handOf(s, cat).length >= HAND_LIMIT) return false;
  addCard(s, randomCard(s, cat));
  return true;
}

export interface RatePart { label: string; v: number; }
export function cardRates(s: GameState): Record<Cat, { rate: number; parts: RatePart[] }> {
  const out = {} as Record<Cat, { rate: number; parts: RatePart[] }>;
  const arch = RULER_ARCHS[player(s).ruler.arch];
  for (const c of CATS) {
    const parts: RatePart[] = [{ label: 'Base', v: 1 }];
    let b = 0;
    for (const p of provsOf(s, s.player)) for (const bid of p.buildings) b += BUILDINGS[bid]?.rates?.[c] ?? 0;
    if (b) parts.push({ label: 'Buildings', v: b });
    let t = 0;
    for (const tid of s.techs) t += TECH_RATES[tid]?.[c] ?? 0;
    if (t) parts.push({ label: 'Research', v: t });
    const tier = provsOf(s, s.player).reduce((a, p) => a + TIERS[tierOf(p)].rate, 0);
    if (tier) parts.push({ label: 'Cities', v: tier });
    const r = (arch?.rates[c] ?? 0) + (arch?.all ?? 0);
    if (r) parts.push({ label: 'Monarch', v: r });
    if (c === 'economy' && hasGood(s, 'salt')) parts.push({ label: 'Salt', v: 0.1 });
    if (player(s).stability <= -2) parts.push({ label: 'Unrest', v: -0.2 });
    out[c] = { rate: Math.max(0.2, parts.reduce((a, p) => a + p.v, 0)), parts };
  }
  return out;
}

export function npRate(s: GameState): { rate: number; parts: RatePart[] } {
  const parts: RatePart[] = [{ label: 'Crown', v: 2 }];
  const courts = provsOf(s, s.player).reduce((a, p) => a + p.buildings.reduce((x, b) => x + (BUILDINGS[b]?.np ?? 0), 0), 0);
  if (courts) parts.push({ label: 'Courthouses', v: courts });
  const cities = provsOf(s, s.player).reduce((a, p) => a + TIERS[tierOf(p)].np, 0);
  if (cities) parts.push({ label: 'Cities', v: cities });
  const arch = RULER_ARCHS[player(s).ruler.arch];
  if (arch?.np) parts.push({ label: 'Monarch', v: arch.np });
  if (hasGood(s, 'wine')) parts.push({ label: 'Wine', v: 0.5 });
  if (hasTech(s, 'councils')) parts.push({ label: 'Royal Councils', v: 1 });
  const st = player(s).stability;
  if (st) parts.push({ label: 'Stability', v: st * 0.5 });
  return { rate: Math.max(0.5, parts.reduce((a, p) => a + p.v, 0)), parts };
}

export const buyCost = (s: GameState, cat: Cat) => 3 + 2 * (s.bought[cat] ?? 0);

/** Yearly card income. Fractions carry over. */
export function yearlyCards(s: GameState): Record<Cat, number> {
  const rates = cardRates(s);
  const got = {} as Record<Cat, number>;
  for (const c of CATS) {
    s.cardAccum[c] = (s.cardAccum[c] ?? 0) + rates[c].rate;
    got[c] = 0;
    while (s.cardAccum[c] >= 1) {
      s.cardAccum[c] -= 1;
      if (drawCat(s, c)) got[c]++;
    }
  }
  s.np += npRate(s).rate;
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
    if (player(s).gold < troopHireCost(s, def.troop!)) return `Needs ${troopHireCost(s, def.troop!)} ducats`;
    return null;
  }
  if (def.kind === 'hire') return player(s).manpower < 1 ? 'Needs 1 manpower' : null;
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
  let c = (6 + 6 * d.tier) * inflation(s);
  if (hasGood(s, 'iron')) c *= 0.8;
  if (d.kind === 'cav' && hasGood(s, 'horses')) c *= 0.7;
  return Math.round(c);
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
    player(s).manpower -= 1;
    player(s).gold -= troopHireCost(s, def.troop!);
    s.troops.push({ uid: uid(s), type: def.troop!, vet: 0, str: 100 });
    removeCard(s, handUid);
    log(s, `Hired ${TROOPS[def.troop!].name}.`);
    return `${TROOPS[def.troop!].name} join your army`;
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
