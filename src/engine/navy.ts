// Ships and admirals.
import { shortfallCost, takeGoods, hireNeeds } from './trade';
import type { GameState, Character } from '../types';
import { TROOPS } from '../data/troops';
import { player, provsOf, hasTech, hasCore, inflation, uid, rollOutcome, outcomeName, log, rollTraits, traitMult, techFx } from './core';
import { getGeo } from './map';
import { CARDS, removeCard } from './cards';
import { RARITY } from '../data/characters';

export function navyCap(s: GameState): number {
  const ps = provsOf(s, s.player);
  const coastal = ps.filter(p => getGeo().coastal[p.id]).length;
  const harbours = ps.filter(p => p.buildings.includes('harbour')).length;
  return Math.max(0, 1 + Math.floor(coastal / 2) + harbours + (hasCore(s, 'sea') ? 2 : 0) + techFx(s, 'navy'));
}

/** How many companies these ships can carry. */
export function transportOf(s: GameState, shipUids: number[], ch?: Character | null): number {
  const adm = s.characters.find(c => c.role === 'admiral' && c.mission == null);
  const bonus = (ch?.traits.includes('convoy') || adm?.traits.includes('convoy')) ? 1 : 0;
  return s.fleet.filter(t => shipUids.includes(t.uid)).reduce((a, t) => a + (TROOPS[t.type].transport ?? 0) + bonus, 0);
}

export function shipHireCost(s: GameState, type: string): number {
  return Math.round((10 + 8 * TROOPS[type].tier) * inflation(s)) + shortfallCost(s, hireNeeds(type, 'ship'));
}

export function shipBlocked(s: GameState, type: string): string | null {
  if (!provsOf(s, s.player).some(p => getGeo().coastal[p.id])) return 'You need a coastal province';
  if (s.fleet.length >= navyCap(s)) return `Navy is at full size (${navyCap(s)}). Build harbours for more.`;
  if (player(s).manpower < 1) return 'Needs 1 manpower';
  if (player(s).gold < shipHireCost(s, type)) return `Needs ${shipHireCost(s, type)} ducats`;
  return null;
}

/** Turn a general into an admiral, for good. Their traits become sea traits. */
export function makeAdmiral(s: GameState, c: Character) {
  if (c.role === 'admiral') return;
  c.role = 'admiral';
  c.traits = rollTraits(s, 'admiral', RARITY[c.rarity].traits);
  log(s, `${c.name} takes to the sea as an admiral.`, 'good');
}

/** Play a ship card. An admiral or general may train the crew (better odds); nobody changes role. */
export function hireShip(s: GameState, handUid: number, charUid?: number): string {
  const h = s.hand.find(x => x.uid === handUid);
  const def = h && CARDS[h.card];
  if (!def || def.kind !== 'ship') return '!Not a ship card';
  const c = s.characters.find(x => x.uid === charUid && x.mission == null && (x.role === 'admiral' || x.role === 'general')) ?? null;
  const why = shipBlocked(s, def.troop!);
  if (why) return '!' + why;
  const note = c ? ` Crew trained by ${c.name}.` : '';
  player(s).manpower -= 1;
  player(s).gold -= shipHireCost(s, def.troop!);
  takeGoods(s, hireNeeds(def.troop!, 'ship'));
  const o = rollOutcome(s, c);
  const vet = [0, 0, 1, 2, 3][o];
  s.fleet.push({ uid: uid(s), type: def.troop!, vet, str: o === 0 ? 70 : 100 });
  removeCard(s, handUid);
  void traitMult;
  return `${outcomeName(o)} crew: ${TROOPS[def.troop!].name}${vet ? ' ' + '★'.repeat(vet) : ''}.${note}`;
}

export function yearlyFleet(s: GameState) {
  for (const t of s.fleet) if (t.mission == null && t.str < 100) t.str = Math.min(100, t.str + 15);
}

/** Starting navies for AI crowns. */
export const START_FLEETS: Record<string, string[]> = {
  castile: ['caravel', 'galley'], portugal: ['caravel', 'caravel', 'galley'], aragon: ['galley', 'galley', 'caravel'],
  genoa: ['galley', 'galley', 'caravel'], venice: ['galley', 'galley', 'galley', 'galley'], naples: ['galley', 'galley'],
  france: ['galley', 'caravel'], tunis: ['galley', 'galley'], tlemcen: ['galley'], morocco: ['galley'], granada: ['galley'], papacy: ['galley'],
};
