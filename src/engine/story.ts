// After a decision: what you chose, where, and what it changed (docs/PLAN-DIRECTION.md, M6).
// When a task ends, the realm is measured before and after; every result it shows (a reveal or a battle) carries
// "Because you sent …", the place, and the measured changes, so the player sees the consequence, not only a toast.
import type { GameState, Mission, Character, Story, StoryChange } from '../types';
import { provsOf, getRel, nationName, player } from './core';
import { MISSION_INFO } from './missions';
import { happinessOf, CULTURE_NAMES, RELIGION_NAMES } from './society';
import { TECH } from '../data/techs';
import { GENRES } from '../data/culture';

/** Season names for the story lines (the screens have their own copy for the top bar). */
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

interface Measure { nums: Record<string, number>; words: Record<string, string>; }

/** The numbers a task can move, for the realm and for the task's own target. */
function measure(s: GameState, m: Mission): Measure {
  const me = player(s);
  const nums: Record<string, number> = {
    Ducats: me.gold, Prestige: me.prestige, Stability: me.stability, 'Nation points': s.np,
    Provinces: provsOf(s, s.player).length, 'Technologies known': s.techs.length, 'Trade routes': s.routes.length, 'Trade posts': s.posts.length,
    'Patronage of the arts': s.art ?? 0, 'People at court': s.characters.length,
  };
  const words: Record<string, string> = {};
  const p = s.provinces[m.target];
  if (p) {
    nums[`${p.name}: development`] = p.dev;
    nums[`${p.name}: settlement`] = p.settlement;
    nums[`${p.name}: walls`] = p.fort;
    nums[`${p.name}: buildings`] = p.buildings.length;
    nums[`${p.name}: happiness`] = Math.round(happinessOf(s, p).value);
    nums[`${p.name}: crown control`] = Math.round(p.control);
    words[`${p.name}: held by`] = p.owner === s.player ? 'you' : nationName(s, p.owner);
    words[`${p.name}: faith`] = RELIGION_NAMES[p.religion] ?? p.religion;
    words[`${p.name}: people`] = CULTURE_NAMES[p.culture] ?? p.culture;
  }
  const n = s.nations[m.target];
  if (n && m.target !== s.player) {
    nums[`Relations with ${n.name}`] = Math.round(getRel(s, s.player, n.id));
    words[`${n.name}`] = s.treaties.filter(t => (t.a === n.id && t.b === s.player) || (t.b === n.id && t.a === s.player)).map(t => t.kind).sort().join(', ') || 'no treaty';
    if (n.overlord === s.player) words[`${n.name}`] += ' · your subject';
  }
  return { nums, words };
}

/** What moved, as lines a player can read at a glance. Ducats move every season for other reasons, so only a change
 *  of a whole ducat or more is shown; numbers are rounded to what the screens show. */
function changes(a: Measure, b: Measure): StoryChange[] {
  const out: StoryChange[] = [];
  for (const k of Object.keys(b.nums)) {
    if (!(k in a.nums)) continue;
    const d = Math.round((b.nums[k] - a.nums[k]) * 10) / 10;
    if (!d || (k === 'Ducats' && Math.abs(d) < 1)) continue;
    out.push({ label: k, delta: k === 'Ducats' ? Math.round(d) : d, good: d > 0 });
  }
  for (const k of Object.keys(b.words)) {
    if (k in a.words && a.words[k] !== b.words[k]) out.push({ label: k, delta: 0, from: a.words[k], to: b.words[k], good: !/war/.test(b.words[k]) });
  }
  return out;
}

/** "Because you sent Rodrigo to develop Toledo in Spring 1451." */
export function becauseOf(s: GameState, m: Mission, ch: Character | undefined): string {
  const info = MISSION_INFO[m.kind];
  // older saves did not keep when a task was sent: count back from now (a task resolves in the turn after its last)
  const startQ = (s.quarter ?? 0) - (m.total || 0) + 1;
  const q = m.since?.quarter ?? ((startQ % 4) + 4) % 4, y = m.since?.year ?? s.year + Math.floor(startQ / 4);
  const what = m.kind === 'research' ? TECH[m.target]?.name ?? 'a study'
    : m.kind === 'artwork' ? (GENRES[m.target]?.name ?? 'a work').toLowerCase()
    : m.kind === 'assist' ? 'a study'
    : s.provinces[m.target]?.name ?? s.nations[m.target]?.name ?? '';
  const verb = info.verb.charAt(0).toLowerCase() + info.verb.slice(1);
  const who = ch ? (ch.ruler ? `${ch.name}, your monarch,` : ch.name) : 'your people';
  return `Because you sent ${who} to ${verb}${what ? ' ' + what : ''} in ${SEASON_NAMES[q]} ${y}.`;
}

/** Run a task's ending and tie what it shows to the decision that started it. */
export function withStory(s: GameState, m: Mission, ch: Character | undefined, end: () => void) {
  const q0 = s.queue.length;
  const before = measure(s, m);
  end();
  const after = measure(s, m);
  const story: Story = {
    because: becauseOf(s, m, ch),
    kind: m.kind,
    place: s.provinces[m.target] ? m.target : s.nations[m.target]?.capital && s.provinces[s.nations[m.target].capital] ? s.nations[m.target].capital : undefined,
    changes: changes(before, after),
  };
  for (const p of s.queue.slice(q0)) if ((p.kind === 'reveal' || p.kind === 'battle') && !p.story) p.story = story;
}
