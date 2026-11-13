// Coalitions: realms that conquer too fast frighten their neighbours, who band together.
import type { GameState } from '../types';
import { provsOf, addRel, getRel, addTreaty, hasTreaty, atWar, declareWar, push, log, nationName, armyPower, alliesOf } from './core';
import { travel } from './army';

/** Each conquest adds to the conqueror's infamy; it fades by 8% a year. */
export function addInfamy(s: GameState, conqueror: string, provId: string) {
  const p = s.provinces[provId];
  if (!p || !s.nations[conqueror]) return;
  s.flags['ae_' + conqueror] = (s.flags['ae_' + conqueror] ?? 0) + p.dev + 2;
}
export const infamy = (s: GameState, n: string) => s.flags['ae_' + n] ?? 0;
const power = (s: GameState, n: string) => armyPower(n === s.player ? s.troops : s.nations[n]?.army ?? []) + provsOf(s, n).length * 1.5;

/** Neighbours who would join a coalition against this realm. */
export function coalitionAgainst(s: GameState, target: string): string[] {
  const t = s.nations[target];
  if (!t?.alive) return [];
  const cap = t.capital;
  const all = Object.values(s.nations).filter(n => n.alive && n.id !== target && n.id !== 'natives' && !n.overlord && n.overlord !== target
    && s.provinces[n.capital] && travel(n.capital, cap) <= 1 && getRel(s, n.id, target) < 20 && !hasTreaty(s, n.id, target, 'alliance') && !hasTreaty(s, n.id, target, 'marriage')
    && !(s.nations[n.id].overlord === target)).map(n => n.id);
  // the eight strongest stand together; the rest watch
  return all.sort((a, b) => power(s, b) - power(s, a)).slice(0, 8);
}

/** Once a year. */
export function yearlyCoalitions(s: GameState) {
  for (const n of Object.values(s.nations)) {
    if (!n.alive) continue;
    const key = 'ae_' + n.id;
    if (s.flags[key]) { s.flags[key] *= 0.92; if (s.flags[key] < 1) delete s.flags[key]; }
    const ae = infamy(s, n.id), size = provsOf(s, n.id).length;
    const coalKey = 'coal_' + n.id;
    if (ae < 22 || size < 8) { if (s.flags[coalKey] && ae < 10) { delete s.flags[coalKey]; if (n.id === s.player) log(s, 'The coalition against you breaks up.', 'good'); } continue; }
    const members = coalitionAgainst(s, n.id);
    if (members.length < 2) continue;
    if (!s.flags[coalKey]) {
      s.flags[coalKey] = s.year;
      if (n.id === s.player) push(s, { kind: 'reveal', title: 'A coalition forms against you', items: [{ title: 'Your conquests frighten them', text: `${members.slice(0, 6).map(m => nationName(s, m)).join(', ')} have allied against you. Conquer less for a while (infamy ${Math.round(ae)}) and it will break up; if they grow strong enough, they will attack together.`, tone: 'bad', kind: 'hands' }] });
      else if (alliesOf(s, s.player).includes(n.id) || members.includes(s.player)) log(s, `A coalition forms against ${n.name}.`, 'neutral');
    }
    for (const m of members) addRel(s, m, n.id, -4);
    // strike together when strong enough, at most once every 15 years
    const theirs = members.reduce((a, m) => a + power(s, m), 0), mine = power(s, n.id) + alliesOf(s, n.id).reduce((a, x) => a + power(s, x) * 0.5, 0);
    if (theirs > mine * 1.1 && (s.flags['coalwar_' + n.id] ?? -99) + 15 <= s.year) {
      const ai = members.filter(m => m !== s.player && !atWar(s, m, n.id));
      if (ai.length < 2) continue;
      s.flags['coalwar_' + n.id] = s.year;
      for (const m of ai) declareWar(s, m, n.id);
      if (n.id === s.player) push(s, { kind: 'reveal', alarm: true, title: 'War! The coalition attacks', items: [{ title: 'Together against you', text: `${ai.map(m => nationName(s, m)).join(', ')} declare war on you at once.`, tone: 'bad', kind: 'sword' }] });
      else log(s, `The coalition attacks ${n.name}.`, 'neutral');
    }
  }
}
