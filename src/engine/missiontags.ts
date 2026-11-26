// Mission tags, for finding missions as the list grows: start year, real or wild, length, difficulty, the regions
// where it happens and its topics. Worked out from the mission's own data, so a new mission is tagged without extra
// work; a mission may still set `difficulty`, `regions` or `topics` itself to override what is worked out.
import type { GameState, Goal } from '../types';
import { MISSION_DIFFICULTY, type MissionDef } from '../data/missions';
import { provsOf } from './core';

export type Length = 'short' | 'medium' | 'long';
export type Difficulty = 'beginner' | 'easy' | 'medium' | 'difficult';
export type Region = 'Europe' | 'Middle East' | 'Africa' | 'Asia' | 'Americas';
export type Topic = 'Military' | 'Diplomacy' | 'Exploration' | 'Trade' | 'Research' | 'Building' | 'People' | 'Government';

export interface MissionTags { release: number; start: number; real: boolean; length: Length; difficulty: Difficulty; regions: Region[]; topics: Topic[]; }

export const LENGTHS_TAG: Length[] = ['short', 'medium', 'long'];
export const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'difficult'];
export const REGIONS_TAG: Region[] = ['Europe', 'Middle East', 'Africa', 'Asia', 'Americas'];
/** The newest release: its missions are marked New until played. */
export const LATEST_RELEASE = 2;
export const TOPICS: Topic[] = ['Military', 'Diplomacy', 'Exploration', 'Trade', 'Research', 'Building', 'People', 'Government'];
/** Years: up to SHORT is short, up to MEDIUM is medium, longer is long. */
export const SHORT_YEARS = 20, MEDIUM_YEARS = 50;

/** The part of the world a point lies in, from its longitude and latitude. */
export function regionAt(lon: number, lat: number): Region {
  if (lon < -30) return 'Americas';
  if (lat >= 36 && lon < 45) return 'Europe';
  if (lat > 48 && lon < 60) return 'Europe';
  if (lon >= 26 && lon < 63 && lat >= 12 && lat < 42) return 'Middle East';
  if (lat < 37 && lon < 52) return 'Africa';
  return 'Asia';
}

/** What each kind of goal is about. */
const GOAL_TOPIC: Partial<Record<Goal['k'], Topic>> = {
  own: 'Military', ownLands: 'Military', noneIn: 'Military', army: 'Military', atWar: 'Military', gone: 'Military', companies: 'Military', forged: 'Military', navy: 'Military',
  subjects: 'Diplomacy', independent: 'Diplomacy',
  colonies: 'Exploration', discover: 'Exploration', holdIn: 'Exploration',
  posts: 'Trade', routes: 'Trade', income: 'Trade', tradeProfit: 'Trade',
  techs: 'Research', newTechs: 'Research',
  built: 'Building', devGain: 'Building', works: 'Building',
  court: 'People', hired: 'People', people: 'People', dismissed: 'People',
  gov: 'Government', capital: 'Government',
  capability: 'Research', fields: 'Military', battlesWon: 'Military', nationalCards: 'People',
};
/** A beginner mission names its lesson ("War: March Orders…"): the first word is its topic. */
const LESSON_TOPIC: Record<string, Topic> = { war: 'Military', diplomacy: 'Diplomacy', people: 'People', trade: 'Trade', buildings: 'Building', research: 'Research', troops: 'Military', the: 'People', development: 'Building', arts: 'People', exploration: 'Exploration' };

/** The provinces a goal names, for its regions. */
function goalProvinces(s: GameState, g: Goal): string[] {
  if (g.k === 'own') return g.provinces;
  if (g.k === 'ownLands' || g.k === 'noneIn') return Object.values(s.provinces).filter(p => g.of.includes(p.owner)).map(p => p.id);
  return [];
}

/** Tag a mission. `world` is the game as it stands at the mission's start (for the realm's size and its capital). */
export function missionTags(m: MissionDef & { difficulty?: Difficulty; regions?: Region[]; topics?: Topic[] }, world: GameState): MissionTags {
  const release = m.release ?? 1;
  const years = m.deadline - m.start;
  const length: Length = years <= SHORT_YEARS ? 'short' : years <= MEDIUM_YEARS ? 'medium' : 'long';
  // regions: where the first realm's capital stands, then where the goals lead (two at most)
  let regions = m.regions;
  if (!regions?.length) {
    const out: Region[] = [];
    const add = (id?: string) => { const p = id ? world.provinces[id] : undefined; if (p) { const r = regionAt(p.lon, p.lat); if (!out.includes(r)) out.push(r); } };
    add(world.nations[m.nations[0]]?.capital);
    for (const g of m.goals) for (const id of goalProvinces(world, g)) add(id);
    if (m.goals.some(g => g.k === 'colonies' || g.k === 'discover') && !out.includes('Americas')) out.push('Americas');
    regions = out.slice(0, 2);
  }
  // topics: from the lesson, then from the goals (three at most, most frequent first)
  let topics = m.topics;
  if (!topics?.length) {
    const count = new Map<Topic, number>();
    const bump = (t?: Topic, w = 1) => { if (t) count.set(t, (count.get(t) ?? 0) + w); };
    if (m.beginner) bump(LESSON_TOPIC[m.beginner.split(/[\s:]/)[0].toLowerCase()], 3);
    for (const g of [...m.goals, ...(m.steps ?? []).map(st => st.g)]) bump(GOAL_TOPIC[g.k]);
    topics = [...count.entries()].sort((a, b) => b[1] - a[1] || TOPICS.indexOf(a[0]) - TOPICS.indexOf(b[0])).map(([t]) => t).slice(0, 3);
    if (!topics.length) topics = ['Government'];
  }
  // difficulty: a lesson is for beginners; otherwise a small realm, many goals and little time make it harder
  let difficulty = m.difficulty ?? MISSION_DIFFICULTY[m.id];
  if (!difficulty) {
    if (m.beginner) difficulty = 'beginner';
    else {
      const size = provsOf(world, m.nations[0]).length;
      // the realm's size weighs most: a small crown has little room for mistakes
      const sizePts = size <= 3 ? 3 : size <= 6 ? 2 : size <= 12 ? 1 : size <= 24 ? 0 : -1;
      const score = m.goals.length + sizePts + (years < 30 ? 1 : years > 100 ? -1 : 0);
      difficulty = score <= 3 ? 'easy' : score <= 5 ? 'medium' : 'difficult';
    }
  }
  return { release, start: m.start, real: !m.wild, length, difficulty, regions, topics };
}

/** The filter the missions screen keeps: in each facet, any of the chosen values; between facets, all of them. */
export interface MissionFilter { release: number[]; start: number[]; real: ('real' | 'wild')[]; length: Length[]; difficulty: Difficulty[]; regions: Region[]; topics: Topic[]; completed: boolean; }
export const EMPTY_FILTER: MissionFilter = { release: [], start: [], real: [], length: [], difficulty: [], regions: [], topics: [], completed: true };

export function matches(t: MissionTags, f: MissionFilter, done: boolean): boolean {
  if (!f.completed && done) return false;
  if (f.release?.length && !f.release.includes(t.release)) return false;
  if (f.start.length && !f.start.includes(t.start)) return false;
  if (f.real.length && !f.real.includes(t.real ? 'real' : 'wild')) return false;
  if (f.length.length && !f.length.includes(t.length)) return false;
  if (f.difficulty.length && !f.difficulty.includes(t.difficulty)) return false;
  if (f.regions.length && !t.regions.some(r => f.regions.includes(r))) return false;
  if (f.topics.length && !t.topics.some(x => f.topics.includes(x))) return false;
  return true;
}
