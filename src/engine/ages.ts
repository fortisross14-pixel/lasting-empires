// Ages open by research or event, not by the calendar. The first realm to get there is the pioneer.
import type { GameState } from '../types';
import { ERAS, ERA, eraOfYear, AGE_TECH, PIONEER_YEARS, type EraDef } from '../data/eras';
import { player, provsOf, rand, push, log, nationName } from './core';
import { addCard } from './cards';
import { CARDS } from './cards';

export function ageOf(s: GameState): EraDef {
  s.age ??= { id: eraOfYear(s.year).id, since: s.year };
  return ERA[s.age.id] ?? ERAS[0];
}
const index = (id: string) => ERAS.findIndex(e => e.id === id);
/** Has the world reached this age (or a later one)? */
export const ageReached = (s: GameState, id: string) => index(ageOf(s).id) >= index(id);
export const nextAge = (s: GameState): EraDef | null => ERAS[index(ageOf(s).id) + 1] ?? null;
export const isPioneer = (s: GameState) => s.age?.pioneer === s.player && s.year < (s.age?.since ?? 0) + PIONEER_YEARS;

/** Opens the next age, if `id` is it. The pioneer gets glory and cards. */
export function openAge(s: GameState, id: string, pioneer: string) {
  const next = nextAge(s);
  if (!next || next.id !== id) return false;
  s.age = { id, since: s.year, pioneer };
  const mine = pioneer === s.player;
  const p = s.nations[pioneer];
  if (p) p.prestige += 20;
  if (mine) {
    s.np += 4;
    const pool = Object.values(CARDS).filter(c => c.cat === next.focus && !c.burden && (c.weight?.(s) ?? 1) > 0);
    for (let i = 0; i < 2 && pool.length; i++) addCard(s, pool[Math.floor(rand(s) * pool.length)].id, true);
  } else if (p) {
    const cap = s.provinces[p.capital];
    if (cap && cap.dev < 8) cap.dev++;
  }
  push(s, { kind: 'reveal', title: next.name, subtitle: mine ? 'Your realm leads the world into a new age' : `${nationName(s, pioneer)} leads the world into a new age`, items: [
    { title: 'A new age', text: next.text, tone: 'neutral', kind: 'star' },
    ...next.effects.map(e => ({ title: 'This age', text: e, tone: 'good' as const, kind: next.icon })),
    mine ? { title: 'Pioneer', text: `Prestige +20, 4 nation points and 2 ${next.focus} cards. For ${PIONEER_YEARS} years you draw +0.4 ${next.focus} cards a year.`, tone: 'good', kind: 'crown' }
      : { title: `${nationName(s, pioneer)} is the pioneer`, text: 'They gain prestige and a richer capital. The age is open to every realm.', tone: 'neutral', kind: 'crown' },
  ] });
  log(s, `${mine ? 'You open' : nationName(s, pioneer) + ' opens'} the ${next.name}.`, mine ? 'good' : 'neutral');
  return true;
}

/** The player finished a research: does it open an age? */
export function onTech(s: GameState, tech: string) {
  const id = AGE_TECH[tech];
  if (id) openAge(s, id, s.player);
}

/** Each year an AI realm may reach the next age first. */
export function yearlyAges(s: GameState) {
  const next = nextAge(s);
  if (!next?.ai || s.year < next.ai.from) return;
  const late = Math.max(0, s.year - next.ai.from);
  if (rand(s) > next.ai.chance * (1 + late / 15)) return;
  const cands = next.ai.pioneers.filter(n => n !== s.player && s.nations[n]?.alive && provsOf(s, n).length);
  const fallback = Object.values(s.nations).filter(n => n.alive && n.id !== s.player).sort((a, b) => provsOf(s, b.id).length - provsOf(s, a.id).length)[0]?.id;
  const who = cands.length ? cands[Math.floor(rand(s) * cands.length)] : fallback;
  if (who) openAge(s, next.id, who);
  void player;
}
