// Finding things: the command search (provinces, realms, people, and a few words like "idle" or "war"), and the
// places the camera buttons frame (home and its frontier, the current threat, your armies).
// Pure reads of the game state (no RNG, no changes), so the screens and the tests share them.
import type { GameState, Character, Role } from '../types';
import { provsOf, enemiesOf, roleName, nationName } from './core';
import { getGeo } from './map';
import { provKnown } from './overseas';
import { NO_STATE } from '../data/nations';
import { attention, type Attention } from './pace';
import { happinessOf } from './society';
import { UNREST_ALERT } from './pace';

// ---------- places for the camera ----------
/** Home: the lands joined to your capital by land, and the foreign provinces on their border.
 *  Far-off colonies are left out, so the first look at a realm shows the realm, not the sea between. */
export function homeView(s: GameState): string[] {
  const g = getGeo();
  const me = s.nations[s.player];
  const mine = new Set(provsOf(s, s.player).map(p => p.id));
  const start = me && mine.has(me.capital) ? me.capital : [...mine][0];
  if (!start) return [];
  const core = new Set([start]), todo = [start];
  while (todo.length) { const id = todo.pop()!; for (const nb of g.adj[id] ?? []) if (mine.has(nb) && !core.has(nb)) { core.add(nb); todo.push(nb); } }
  const frontier = new Set<string>();
  for (const id of core) for (const nb of g.adj[id] ?? []) if (!core.has(nb) && s.provinces[nb] && s.provinces[nb].owner !== NO_STATE) frontier.add(nb);
  return [...core, ...frontier];
}

/** Where the danger is, most pressing first: armies on the march, your land held by the enemy, provinces close to
 *  revolt, then your provinces on the border of a realm at war with you. */
export function threatPlaces(s: GameState): string[] {
  const out: string[] = [];
  const add = (id?: string) => { if (id && s.provinces[id] && !out.includes(id)) out.push(id); };
  for (const inc of s.incoming ?? []) add(inc.target);
  for (const p of Object.values(s.provinces)) if (p.occupiedFrom === s.player && p.owner !== s.player) add(p.id);
  for (const p of provsOf(s, s.player)) if (happinessOf(s, p).value < UNREST_ALERT) add(p.id);
  const foes = new Set(enemiesOf(s, s.player));
  if (foes.size) { const g = getGeo(); for (const p of provsOf(s, s.player)) if ((g.adj[p.id] ?? []).some(nb => foes.has(s.provinces[nb]?.owner))) add(p.id); }
  return out;
}

/** Where your companies stand (garrisons and camps), the biggest first. */
export function armyPlaces(s: GameState): string[] {
  const n: Record<string, number> = {};
  for (const t of s.troops) { if (t.moving || !t.loc) continue; const id = t.loc.replace('base:', ''); if (s.provinces[id]) n[id] = (n[id] ?? 0) + 1; }
  return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b));
}

/** The province an agenda line is about, if it is about one place: where its pin goes. */
export function placeOf(s: GameState, a: Attention): string | null {
  if (a.jump?.to === 'province') return a.jump.id;
  if (a.jump?.to === 'incoming') { const inc = s.incoming?.find(x => x.id === (a.jump as { id: number }).id); return inc?.target ?? null; }
  return null;
}

// ---------- the command search ----------
export type HitKind = 'province' | 'nation' | 'person' | 'agenda';
export interface Hit { kind: HitKind; id: string; title: string; sub: string; score: number; }

/** Lower case without accents, so "cordoba" finds Córdoba. */
export const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Words that list things rather than name them. */
export const SEARCH_WORDS: { words: string[]; what: string }[] = [
  { words: ['idle', 'free'], what: 'people without a task' },
  { words: ['war', 'enemy', 'enemies'], what: 'realms at war with you' },
  { words: ['unrest', 'revolt', 'unhappy'], what: 'provinces close to revolt or uneasy' },
  { words: ['short', 'shortage', 'food'], what: 'goods the realm lacks' },
  { words: ['todo', 'agenda', 'urgent'], what: 'everything on the agenda' },
];
export const SEARCH_MAX = 12;

const personHit = (s: GameState, c: Character, score: number): Hit => ({
  kind: 'person', id: String(c.uid), title: c.name, score,
  sub: `${c.ruler ? 'Monarch · ' : ''}${roleName[c.role]} · skill ${c.skill} · ${c.mission == null ? 'free' : 'on a task'}`,
});
const agendaHit = (a: Attention, score: number): Hit => ({ kind: 'agenda', id: a.id, title: a.title, sub: a.text, score });

/** Everything that matches what was typed, best first. Names score by where they match (start of the name, start of a
 *  word, anywhere); a list word ("idle", "war"…) or a role ("merchant") lists what it names. */
export function search(s: GameState, q: string): Hit[] {
  const t = fold(q.trim());
  if (!t) return [];
  const out: Hit[] = [];
  const score = (name: string) => { const n = fold(name); if (n === t) return 100; if (n.startsWith(t)) return 80; if (n.split(/[\s'-]+/).some(w => w.startsWith(t))) return 60; if (t.length >= 3 && n.includes(t)) return 40; return 0; };
  const word = SEARCH_WORDS.find(w => w.words.some(x => x.startsWith(t) && t.length >= 3));
  if (word) {
    const w = word.words[0];
    if (w === 'idle') for (const c of s.characters) if (c.mission == null) out.push(personHit(s, c, 90));
    if (w === 'war') for (const id of enemiesOf(s, s.player)) out.push({ kind: 'nation', id, title: nationName(s, id), sub: 'At war with you', score: 90 });
    if (w === 'unrest') for (const a of attention(s)) if (a.id === 'unrest' || a.id === 'unease') out.push(agendaHit(a, 90));
    if (w === 'unrest') for (const p of provsOf(s, s.player)) { const v = happinessOf(s, p).value; if (v < 35) out.push({ kind: 'province', id: p.id, title: p.name, sub: `Happiness ${Math.round(v)}%`, score: 85 - v / 10 }); }
    if (w === 'short') for (const a of attention(s)) if (a.id.startsWith('short:')) out.push(agendaHit(a, 90));
    if (w === 'todo') for (const a of attention(s)) out.push(agendaHit(a, 90));
  }
  // a role: everyone of that role, free first
  const role = (Object.keys(roleName) as Role[]).find(r => t.length >= 3 && (fold(roleName[r]).startsWith(t) || r.startsWith(t)));
  if (role) for (const c of s.characters) if (c.role === role) out.push(personHit(s, c, c.mission == null ? 75 : 70));
  // names
  for (const c of s.characters) { const v = score(c.name); if (v) out.push(personHit(s, c, v)); }
  for (const n of Object.values(s.nations)) {
    if (!n.alive || n.id === NO_STATE) continue;
    const v = score(n.name);
    if (v) out.push({ kind: 'nation', id: n.id, title: n.name, sub: n.id === s.player ? 'Your realm' : `${provsOf(s, n.id).length} provinces`, score: v + 2 });
  }
  for (const p of Object.values(s.provinces)) {
    if (!provKnown(s, p.id)) continue;
    const v = score(p.name);
    if (v) out.push({ kind: 'province', id: p.id, title: p.name, sub: p.owner === s.player ? 'Yours' : p.owner === NO_STATE ? 'Unclaimed' : nationName(s, p.owner), score: v + (p.owner === s.player ? 3 : 0) });
  }
  // one line per thing, the best score kept
  const best = new Map<string, Hit>();
  for (const x of out) { const k = x.kind + ':' + x.id; const o = best.get(k); if (!o || x.score > o.score) best.set(k, x); }
  return [...best.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, SEARCH_MAX);
}
