// Hand cards: decrees, intrigues and fortunes the player holds and plays.
import type { GameState } from '../types';
import { EQUIPMENT, TROOPS } from '../data/troops';
import { TECH } from '../data/techs';
import { player, provsOf, clamp, uid, pick, addRel, hasTech, nationName, armyCap, rand } from './core';

export type CardTarget = 'none' | 'nation' | 'mission' | 'troop';
export type CardCat = 'decree' | 'intrigue' | 'war' | 'fortune' | 'burden';

export interface HandCardDef {
  id: string; name: string; cat: CardCat; target: CardTarget; text: string; icon: string;
  cost?: number;
  can?: (s: GameState) => string | null;
  targetOk?: (s: GameState, t: string) => boolean;
  play: (s: GameState, target: string) => string;
  burden?: boolean;
}

const stab = (s: GameState, d: number) => { const p = player(s); p.stability = clamp(p.stability + d, -3, 3); };

export const CARDS: Record<string, HandCardDef> = {
  levy_tax: { id: 'levy_tax', name: 'Extraordinary Levy', cat: 'decree', target: 'none', icon: 'coin', text: 'Gain 6 + 2 per province in ducats. Stability −1.',
    play: s => { const g = 6 + 2 * provsOf(s, s.player).length; player(s).gold += g; stab(s, -1); return `+${g} ducats, stability −1`; } },
  harvest: { id: 'harvest', name: 'Bountiful Harvest', cat: 'fortune', target: 'none', icon: 'wheat', text: 'Stability +1, manpower +4.',
    play: s => { stab(s, 1); player(s).manpower += 4; return 'Stability +1, manpower +4'; } },
  condottieri: { id: 'condottieri', name: 'Swiss Captain', cat: 'war', target: 'none', icon: 'pike', cost: 35, text: 'Pay 35 ducats: hire a company of Swiss Pikes.',
    can: s => player(s).gold < 35 ? 'Needs 35 ducats' : s.troops.length >= armyCap(s) ? 'Army is at full size' : null,
    play: s => { player(s).gold -= 35; s.troops.push({ uid: uid(s), type: 'swiss', vet: 1, str: 100 }); return 'Swiss Pikes join your army'; } },
  master_smith: { id: 'master_smith', name: 'Master Smith', cat: 'war', target: 'none', icon: 'anvil', text: 'Gain a random equipment card you can use.',
    play: s => { const pool = Object.values(EQUIPMENT).filter(e => !e.tech || hasTech(s, e.tech)); const e = pick(s, pool); s.equipment.push({ uid: uid(s), type: e.id }); return `Forged: ${e.name}`; } },
  spy_network: { id: 'spy_network', name: 'Spy Network', cat: 'intrigue', target: 'nation', icon: 'eye', text: 'Reveal a nation\'s army for 10 years. Your missions against it get +10%.',
    targetOk: (s, t) => t !== s.player,
    play: (s, t) => { s.nations[t].spiedUntil = s.year + 10; return `Your agents report from ${nationName(s, t)}`; } },
  royal_feast: { id: 'royal_feast', name: 'Royal Feast', cat: 'decree', target: 'nation', icon: 'cup', cost: 10, text: 'Pay 10 ducats: relations +25 with a nation.',
    can: s => player(s).gold < 10 ? 'Needs 10 ducats' : null, targetOk: (s, t) => t !== s.player,
    play: (s, t) => { player(s).gold -= 10; addRel(s, s.player, t, 25); return `Relations with ${nationName(s, t)} +25`; } },
  forced_march: { id: 'forced_march', name: 'Forced March', cat: 'war', target: 'mission', icon: 'boot', text: 'A mission takes 1 year less (minimum 1).',
    targetOk: (s, t) => { const m = s.missions.find(x => String(x.id) === t); return !!m && m.turnsLeft > 1 && m.kind !== 'research'; },
    play: (s, t) => { const m = s.missions.find(x => String(x.id) === t)!; m.turnsLeft--; return 'The mission speeds up'; } },
  sermon: { id: 'sermon', name: 'Inspired Sermon', cat: 'fortune', target: 'none', icon: 'church', text: 'Stability +1, prestige +3.',
    play: s => { stab(s, 1); player(s).prestige += 3; return 'Stability +1, prestige +3'; } },
  windfall: { id: 'windfall', name: 'Silver Windfall', cat: 'fortune', target: 'none', icon: 'coin', text: 'Gain 35 ducats.',
    play: s => { player(s).gold += 35; return '+35 ducats'; } },
  scholar: { id: 'scholar', name: 'Wandering Scholar', cat: 'fortune', target: 'mission', icon: 'book', text: 'A study gains 5 research.',
    targetOk: (s, t) => s.missions.some(m => String(m.id) === t && m.kind === 'research'),
    play: (s, t) => { const m = s.missions.find(x => String(x.id) === t)!; m.progress += 5; return `+5 research on ${TECH[m.target].name}`; } },
  drill: { id: 'drill', name: 'Drill Sergeant', cat: 'war', target: 'troop', icon: 'banner', text: 'A troop gains a veteran star.',
    targetOk: (s, t) => s.troops.some(x => String(x.uid) === t && x.vet < 3),
    play: (s, t) => { const x = s.troops.find(y => String(y.uid) === t)!; x.vet++; return `${TROOPS[x.type].name} gains a star`; } },
  fresh_recruits: { id: 'fresh_recruits', name: 'Fresh Recruits', cat: 'war', target: 'none', icon: 'spear', text: 'Troops at home return to full strength. Costs manpower.',
    play: s => { let mp = 0; for (const t of s.troops) if (t.mission == null) { mp += (100 - t.str) / 25; t.str = 100; } player(s).manpower = Math.max(0, player(s).manpower - Math.ceil(mp)); return 'Ranks refilled'; } },
  lavish_gifts: { id: 'lavish_gifts', name: 'Lavish Gifts', cat: 'intrigue', target: 'mission', icon: 'cup', cost: 15, text: 'Pay 15 ducats: a diplomatic mission gets +20% success.',
    can: s => player(s).gold < 15 ? 'Needs 15 ducats' : null,
    targetOk: (s, t) => s.missions.some(m => String(m.id) === t && ['relations', 'trade', 'alliance', 'marriage', 'peace'].includes(m.kind)),
    play: (s, t) => { player(s).gold -= 15; const m = s.missions.find(x => String(x.id) === t)!; m.bonus += 0.2; return 'The envoys carry gold and silk'; } },
  ambush: { id: 'ambush', name: 'Ambush', cat: 'war', target: 'none', icon: 'eye', text: 'In your next battle you see the enemy\'s tactic every round.',
    play: s => { s.flags.ambush = 1; return 'Scouts are ready for the next battle'; } },
  claim: { id: 'claim', name: 'Fabricated Claim', cat: 'intrigue', target: 'nation', icon: 'scroll', text: 'You may declare war on a nation without losing stability.',
    targetOk: (s, t) => t !== s.player,
    play: (s, t) => { s.flags['claim_' + t] = 1; return `You hold a claim against ${nationName(s, t)}`; } },
  relic: { id: 'relic', name: 'Holy Relic', cat: 'fortune', target: 'none', icon: 'church', text: 'Prestige +8, stability +1.',
    play: s => { player(s).prestige += 8; stab(s, 1); return 'Prestige +8, stability +1'; } },
  favour: { id: 'favour', name: 'Royal Favour', cat: 'decree', target: 'none', icon: 'crown', cost: 20, text: 'Pay 20 ducats: a random courtier gains +1 skill.',
    can: s => player(s).gold < 20 ? 'Needs 20 ducats' : !s.characters.some(c => c.skill < 6) ? 'No courtier can improve' : null,
    play: s => { player(s).gold -= 20; const c = pick(s, s.characters.filter(x => x.skill < 6)); c.skill++; return `${c.name} rises to skill ${c.skill}`; } },
  greek_scholars: { id: 'greek_scholars', name: 'Greek Scholars', cat: 'fortune', target: 'mission', icon: 'book', text: 'Refugees from Constantinople: a study gains 7 research.',
    targetOk: (s, t) => s.missions.some(m => String(m.id) === t && m.kind === 'research'),
    play: (s, t) => { const m = s.missions.find(x => String(x.id) === t)!; m.progress += 7; return `+7 research on ${TECH[m.target].name}`; } },
  crusade: { id: 'crusade', name: 'Crusade Bull', cat: 'fortune', target: 'none', icon: 'church', text: 'Gain 30 ducats and stability +1.',
    play: s => { player(s).gold += 30; stab(s, 1); return '+30 ducats, stability +1'; } },
  treasure_fleet: { id: 'treasure_fleet', name: 'Treasure Fleet', cat: 'fortune', target: 'none', icon: 'anchor', text: 'Silver from the Indies: gain 60 ducats.',
    play: s => { player(s).gold += 60; return '+60 ducats'; } },
  conquistadors: { id: 'conquistadors', name: 'Conquistadors', cat: 'war', target: 'none', icon: 'gun', text: 'Veterans return from overseas: gain a 1-star troop.',
    can: s => s.troops.length >= armyCap(s) ? 'Army is at full size' : null,
    play: s => { const type = hasTech(s, 'firearms') ? 'arquebusiers' : 'men_at_arms'; s.troops.push({ uid: uid(s), type, vet: 1, str: 100 }); return `${TROOPS[type].name} join your army`; } },
  debt: { id: 'debt', name: 'Crown Debt', cat: 'burden', target: 'none', icon: 'chain', cost: 30, burden: true, text: 'While held: −2 ducats a year. Play: pay 30 ducats to clear it for good.',
    can: s => player(s).gold < 30 ? 'Needs 30 ducats' : null,
    play: s => { player(s).gold -= 30; return 'The debt is paid off'; } },
  unrest: { id: 'unrest', name: 'Peasant Unrest', cat: 'burden', target: 'none', icon: 'chain', cost: 15, burden: true, text: 'While held: 20% chance a year of −1 stability. Play: pay 15 ducats to clear it.',
    can: s => player(s).gold < 15 ? 'Needs 15 ducats' : null,
    play: s => { player(s).gold -= 15; return 'The grievances are settled'; } },
};

export const STARTING_DECK = [
  'levy_tax', 'levy_tax', 'harvest', 'harvest', 'master_smith', 'master_smith', 'spy_network', 'royal_feast',
  'forced_march', 'sermon', 'windfall', 'scholar', 'scholar', 'drill', 'fresh_recruits', 'lavish_gifts', 'ambush',
  'claim', 'relic', 'favour', 'condottieri',
];

export function shuffle(s: GameState, arr: string[]) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
}

export function drawCard(s: GameState): boolean {
  if (s.hand.length >= 7) return false;
  if (!s.deck.length) { s.deck = s.discard; s.discard = []; shuffle(s, s.deck); }
  const c = s.deck.pop();
  if (!c) return false;
  s.hand.push({ uid: uid(s), card: c });
  return true;
}

export function addToDeck(s: GameState, card: string, n = 1) {
  for (let i = 0; i < n; i++) s.deck.splice(Math.floor(rand(s) * (s.deck.length + 1)), 0, card);
}
export function addToHand(s: GameState, card: string) {
  if (s.hand.length < 8) s.hand.push({ uid: uid(s), card }); else addToDeck(s, card);
}

export function cardBlocked(s: GameState, def: HandCardDef): string | null {
  if (def.can) { const r = def.can(s); if (r) return r; }
  if (def.target === 'mission' && !s.missions.some(m => def.targetOk?.(s, String(m.id)))) return 'No suitable mission';
  if (def.target === 'nation' && !Object.values(s.nations).some(n => n.alive && n.id !== s.player)) return 'No other nation';
  if (def.target === 'troop' && !s.troops.some(t => def.targetOk?.(s, String(t.uid)))) return 'No suitable troop';
  return null;
}

export function playCard(s: GameState, handUid: number, target: string): string {
  const h = s.hand.find(x => x.uid === handUid);
  if (!h) return '';
  const def = CARDS[h.card];
  const blocked = cardBlocked(s, def);
  if (blocked) return blocked;
  if (def.target === 'nation' && !s.nations[target]?.alive) return 'Invalid target';
  if (def.target !== 'none' && def.targetOk && !def.targetOk(s, target)) return 'Invalid target';
  const msg = def.play(s, target);
  s.hand = s.hand.filter(x => x.uid !== handUid);
  if (!def.burden) s.discard.push(def.id);
  return msg;
}
