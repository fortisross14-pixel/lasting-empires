// Ready-made test games.
import type { GameState } from '../types';
import { newGame } from './turn';
import { player, uid, makePeace, declareWar, atWar, enemiesOf, genCharacter } from './core';
import { addCard } from './cards';
import { startStock } from './trade';
import { settleArmies, announceAttack, troopsNear, turnNo } from './army';

/** Castile at war with Portugal in the summer of 1467: armies in three garrisons, the Portuguese marching on Badajoz,
 *  scouts already in Portugal, and the Azores far out to sea for an invasion base. */
export function scenarioCastilePortugal(): GameState {
  const s = newGame('castile', 1467);
  s.queue = []; s.tutorial = -1;
  s.year = 1467; s.quarter = 1;
  s.ambition = null;
  for (const e of enemiesOf(s, 'castile')) makePeace(s, 'castile', e);
  const me = player(s);
  // the clock jumped 16 years: the court and the crown must still be alive
  for (const c of s.characters) c.dies = Math.max(c.dies, s.year + 15 + (c.uid % 10));
  me.ruler = { ...me.ruler, name: 'Enrique IV', from: 1454, to: 1474 };
  me.gold = 450; me.manpower = 12; me.stability = 1; s.np = 12;
  // barracks in Seville (the south) and Salamanca (the Portuguese border)
  for (const id of ['seville', 'salamanca']) if (!s.provinces[id].buildings.includes('barracks')) s.provinces[id].buildings.push('barracks');
  const T = (type: string, loc: string, vet = 0) => s.troops.push({ uid: uid(s), type, vet, str: 100, loc });
  s.troops = [];
  for (const t of ['men_at_arms', 'men_at_arms', 'crossbow', 'jinetes', 'knights']) T(t, 'toledo');
  for (const t of ['levy', 'levy', 'crossbow', 'men_at_arms', 'jinetes']) T(t, 'seville', 1);
  for (const t of ['levy', 'crossbow', 'men_at_arms']) T(t, 'salamanca');
  s.fleet = [{ uid: uid(s), type: 'caravel', vet: 0, str: 100, loc: 'seville' }, { uid: uid(s), type: 'galley', vet: 0, str: 100, loc: 'seville' }, { uid: uid(s), type: 'galley', vet: 0, str: 100, loc: 'seville' }];
  // generals
  const g1 = genCharacter(s, 'general', 'castilian', 3); g1.name = 'Gonzalo de Córdoba'; g1.skill = 5; g1.rarity = 'epic';
  const g2 = genCharacter(s, 'general', 'castilian', 2);
  g1.dies = s.year + 30; g2.dies = s.year + 25;
  s.characters.push(g1, g2);
  // cards to play with
  s.hand = s.hand.filter(h => h.card === 'debt');
  for (const c of ['peace_envoy', 'merchant_route', 'trading_post', 'patronage', 'holy_see', 'march_orders', 'march_orders', 'march_orders', 'scouts', 'spy_network', 'hire_men_at_arms']) addCard(s, c, true);
  // the war
  if (!atWar(s, 'castile', 'portugal')) declareWar(s, 'castile', 'portugal');
  const pt = s.nations.portugal;
  pt.army = ['levy', 'levy', 'levy', 'crossbow', 'crossbow', 'men_at_arms', 'men_at_arms', 'jinetes', 'knights', 'men_at_arms', 'levy', 'crossbow'].map(type => ({ uid: uid(s), type, vet: 0, str: 100 }));
  pt.spiedUntil = s.year + 2;
  settleArmies(s);
  s.stock = startStock(s);
  // a merchant to try trade routes
  const m = genCharacter(s, 'merchant', 'castilian', 2); m.dies = s.year + 25; s.characters.push(m);
  // the Portuguese are already on the march against Badajoz: choose your defence
  const near = troopsNear(s, 'portugal', 'badajoz');
  if (near.length) { announceAttack(s, 'portugal', 'badajoz', near.slice(0, 6)); s.incoming![0].due = turnNo(s); } // they arrive when you end this turn
  s.log.unshift({ year: s.year, text: 'Test scenario: Castile and Portugal are at war.', tone: 'neutral' });
  return s;
}
