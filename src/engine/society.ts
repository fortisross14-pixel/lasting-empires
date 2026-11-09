// Culture, faith, art and the happiness of the people, which moves stability.
import type { GameState, Province } from '../types';
import { BUILDINGS } from '../data/techs';
import { player, provsOf, clamp, rand, hasCore, hasGood, log, population } from './core';

export const CULTURE_NAMES: Record<string, string> = {
  castilian: 'Castilian', portuguese: 'Portuguese', aragonese: 'Aragonese', catalan: 'Catalan', basque: 'Basque', andalusi: 'Andalusi',
  french: 'French', occitan: 'Occitan', italian: 'Italian', sicilian: 'Sicilian', sardinian: 'Sardinian', croatian: 'Croatian', maghrebi: 'Maghrebi',
};
export const RELIGION_NAMES: Record<string, string> = { catholic: 'Catholic', protestant: 'Protestant', muslim: 'Muslim' };

const CULTURE_OVERRIDE: Record<string, string> = {
  biscay: 'basque', navarre: 'basque', catalonia: 'catalan', valencia: 'catalan', majorca: 'catalan', zaragoza: 'aragonese',
  granada: 'andalusi', malaga: 'andalusi', gascony: 'occitan', toulouse: 'occitan', provence: 'occitan',
  sardinia: 'sardinian', sicily: 'sicilian', croatia: 'croatian', dalmatia: 'croatian',
};
const MUSLIM = ['granada', 'morocco', 'tlemcen', 'tunis'];
const NATION_CULTURE: Record<string, string> = { castile: 'castilian', portugal: 'portuguese', aragon: 'aragonese', navarre: 'basque', france: 'french', granada: 'andalusi', hungary: 'croatian', morocco: 'maghrebi', tlemcen: 'maghrebi', tunis: 'maghrebi' };

export function initSociety(s: GameState) {
  for (const p of Object.values(s.provinces)) {
    p.culture ??= CULTURE_OVERRIDE[p.id] ?? NATION_CULTURE[p.core] ?? 'italian';
    p.religion ??= MUSLIM.includes(p.core) ? 'muslim' : 'catholic';
  }
  s.stateReligion ??= 'catholic';
  if (!s.accepted?.length) s.accepted = s.player === 'aragon' ? ['aragonese', 'catalan'] : [NATION_CULTURE[s.player] ?? 'castilian'];
  s.art ??= 5; s.taxBurden ??= 0; s.happiness ??= 55;
}

export const isAccepted = (s: GameState, culture: string) => s.accepted.includes(culture);

export interface HappyPart { label: string; v: number; }

/** Happiness of one province (0..100) and why. */
export function happinessOf(s: GameState, p: Province): { value: number; parts: HappyPart[] } {
  const parts: HappyPart[] = [{ label: 'Base', v: 50 }];
  if (p.religion === s.stateReligion) parts.push({ label: `${RELIGION_NAMES[p.religion]} faith`, v: hasCore(s, 'traditional') ? 11 : 8 });
  else {
    let v = -18;
    if ((s.flags.tolerance_until ?? 0) > s.year) v += 10;
    if (hasCore(s, 'open')) v += 6;
    parts.push({ label: `${RELIGION_NAMES[p.religion] ?? p.religion} minority`, v });
  }
  parts.push(isAccepted(s, p.culture) ? { label: `${CULTURE_NAMES[p.culture] ?? p.culture} culture`, v: 5 } : { label: `Foreign culture (${CULTURE_NAMES[p.culture] ?? p.culture})`, v: -12 });
  const art = Math.round(s.art * 0.15);
  if (art) parts.push({ label: 'Arts', v: art });
  let local = 0;
  for (const b of p.buildings) local += { temple: 5, university: 3, market: 2, farm: 2, courthouse: 1 }[b] ?? 0;
  if (local) parts.push({ label: 'Buildings', v: local });
  if (hasGood(s, 'grain')) parts.push({ label: 'Bread (grain)', v: 2 });
  if (hasGood(s, 'wine')) parts.push({ label: 'Wine', v: 1 });
  const warYears = s.wars.filter(w => w.a === s.player || w.b === s.player).reduce((a, w) => a + (s.year - w.since), 0);
  if (warYears > 2) parts.push({ label: 'War weariness', v: -Math.min(15, Math.round((warYears - 2) * 1.5)) });
  if (s.taxBurden > 0) parts.push({ label: 'Taxes', v: -Math.round(s.taxBurden) });
  if ((s.flags.festival_until ?? 0) > s.year) parts.push({ label: 'Royal festival', v: 8 });
  if (p.control < 30) parts.push({ label: 'Weak royal control', v: -8 });
  if (p.core !== s.player) parts.push({ label: 'Recently conquered', v: -5 });
  const value = clamp(Math.round(parts.reduce((a, x) => a + x.v, 0)), 0, 100);
  return { value, parts };
}

/** Population-weighted happiness of the whole realm. */
export function nationalHappiness(s: GameState): number {
  let sum = 0, w = 0;
  for (const p of provsOf(s, s.player)) { const pop = population(s, p); sum += happinessOf(s, p).value * pop; w += pop; }
  return w ? Math.round(sum / w) : 50;
}

export const moodName = (h: number) => (h >= 75 ? 'Joyful' : h >= 60 ? 'Content' : h >= 40 ? 'Restless' : h >= 25 ? 'Angry' : 'Rebellious');

/** Yearly: happiness moves stability and control; art and taxes drift. */
export function yearlySociety(s: GameState) {
  const me = player(s);
  const h = nationalHappiness(s);
  s.happiness = h;
  if (h >= 80 && rand(s) < 0.4) { me.stability = clamp(me.stability + 1, -3, 3); log(s, 'A joyful people: stability rises.', 'good'); }
  else if (h >= 65 && rand(s) < 0.25) { me.stability = clamp(me.stability + 1, -3, 3); log(s, 'A content people: stability rises.', 'good'); }
  else if (h < 25 && rand(s) < 0.45) { me.stability = clamp(me.stability - 1, -3, 3); log(s, 'The people are close to revolt: stability falls.', 'bad'); }
  else if (h < 40 && rand(s) < 0.25) { me.stability = clamp(me.stability - 1, -3, 3); log(s, 'A restless people: stability falls.', 'bad'); }
  for (const p of provsOf(s, s.player)) p.control = clamp(p.control + (happinessOf(s, p).value - 50) / 25, 0, 100);
  let artGain = 0;
  for (const p of provsOf(s, s.player)) for (const b of p.buildings) artGain += ({ university: 0.5, temple: 0.3, library: 0.3 } as Record<string, number>)[b] ?? 0;
  s.art = clamp(s.art * 0.985 + artGain, 0, 100);
  s.taxBurden = Math.max(0, s.taxBurden - 3);
  void BUILDINGS;
}

/** The biggest culture in the realm that is not yet accepted. */
export function largestForeignCulture(s: GameState): string | null {
  const count: Record<string, number> = {};
  for (const p of provsOf(s, s.player)) if (!isAccepted(s, p.culture)) count[p.culture] = (count[p.culture] ?? 0) + population(s, p);
  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}
