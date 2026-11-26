// The Imperial Chronicle's records (docs/HISTORY-PLAN.md, phase 4): data first, kept small. Every year the player's
// realm is measured; every ten years (and at the start and the end) the leading powers of the world are too. Wars the
// player fought, firsts of its civilisation and the people of its history are kept here; the weighty moments of the
// log stay in stats.annals (chronicle.ts). A reload never doubles a year: a year measured again replaces itself.
import type { GameState } from '../types';
import { TECH } from '../data/techs';
import { TROOPS } from '../data/troops';
import { AGE_TECH } from '../data/eras';
import { player, provsOf, incomeOf, armyPower, nationName } from './core';
import { ranking } from './turn';
import { knows } from './diffusion';

/** What is measured, in this order, in every row. */
export const FIELDS = ['score', 'rank', 'prestige', 'dev', 'provinces', 'gold', 'income', 'army', 'navy', 'won', 'lost', 'techs'] as const;
export type Field = (typeof FIELDS)[number];
export const FIELD_NAME: Record<Field, string> = { score: 'Score', rank: 'Rank', prestige: 'Prestige', dev: 'Development', provinces: 'Provinces', gold: 'Treasury', income: 'Income', army: 'Army power', navy: 'Navy power', won: 'Battles won', lost: 'Battles lost', techs: 'Technologies' };
/** Powers measured at each world snapshot (the player is always among them), and how often. */
export const TOP_N = 20, WORLD_EVERY = 10;

export interface Snapshot { y: number; r: Record<string, number[]>; }
export interface WarEntry { foe: string; from: number; to?: number; provs0: number; provs1?: number; result?: 'won' | 'lost' | 'white peace'; }
export type FirstKind = 'technology' | 'contact' | 'weapons' | 'age' | 'realm';
export interface First { year: number; kind: FirstKind; text: string; }
export interface Records {
  world: Snapshot[];                       // the leading powers, every WORLD_EVERY years
  me: { y: number; v: number[] }[];        // the player's realm, every year
  names: Record<string, [string, string]>; // name and colour of every realm ever measured (kept for those that fall)
  wars: WarEntry[];                        // the player's wars
  firsts: First[];                         // the firsts of its civilisation
}
export const recordsOf = (s: GameState): Records => (s.records ??= { world: [], me: [], names: {}, wars: [], firsts: [] });

/** One realm's row of measures. */
function measure(s: GameState, id: string, score: number, rank: number): number[] {
  const n = s.nations[id];
  const mine = id === s.player;
  const b = s.stats.battles[id] ?? { won: 0, lost: 0 };
  const ps = provsOf(s, id);
  const techs = mine ? s.techs.length : Object.keys(TECH).filter(t => knows(s, id, t)).length;
  return [score, rank, Math.round(n.prestige), ps.reduce((a, p) => a + p.dev, 0), ps.length, Math.round(n.gold),
    Math.round(incomeOf(s, id).total), Math.round(armyPower(mine ? s.troops : n.army)), Math.round(armyPower(mine ? s.fleet : n.fleet ?? [])),
    b.won, b.lost, techs];
}
const put = <T extends { y: number }>(list: T[], row: T) => { const i = list.findIndex(x => x.y === row.y); if (i >= 0) list[i] = row; else { list.push(row); list.sort((a, b) => a.y - b.y); } };

/** Measure the year: the player always; the world at the start, every WORLD_EVERY years and at the end. */
export function recordYear(s: GameState, final = false) {
  const R = recordsOf(s);
  const rank = ranking(s);
  const pos = (id: string) => rank.findIndex(x => x.id === id) + 1;
  const me = rank.find(x => x.id === s.player);
  put(R.me, { y: s.year, v: measure(s, s.player, me?.score ?? 0, pos(s.player)) });
  if (final || !R.world.length || s.year % WORLD_EVERY === 0) {
    const ids = [...new Set([...rank.slice(0, TOP_N).map(x => x.id), s.player])];
    const r: Record<string, number[]> = {};
    for (const id of ids) { const x = rank.find(z => z.id === id); r[id] = measure(s, id, x?.score ?? 0, pos(id)); }
    put(R.world, { y: s.year, r });
  }
  for (const id of new Set([s.player, ...rank.slice(0, TOP_N).map(x => x.id)])) { const n = s.nations[id]; if (n) R.names[id] = [n.name, n.color]; }
  trackWars(s);
}

/** Open an entry for each war the player is in, close those that have ended. */
function trackWars(s: GameState) {
  const R = recordsOf(s);
  const now = s.wars.filter(w => w.a === s.player || w.b === s.player).map(w => (w.a === s.player ? w.b : w.a));
  const provs = provsOf(s, s.player).length;
  for (const foe of now) if (!R.wars.some(w => w.foe === foe && w.to == null)) {
    R.wars.push({ foe, from: s.year, provs0: provs });
    const n = s.nations[foe]; if (n) R.names[foe] ??= [n.name, n.color];
  }
  for (const w of R.wars) if (w.to == null && !now.includes(w.foe)) { w.to = s.year; w.provs1 = provs; }
}

/** A war of the player's ends at the peace table: set down how. */
export function endWarRecord(s: GameState, foe: string, result: WarEntry['result']) {
  const R = recordsOf(s);
  let w = [...R.wars].reverse().find(x => x.foe === foe && x.to == null);
  if (!w) { w = { foe, from: s.year, provs0: provsOf(s, s.player).length }; R.wars.push(w); }
  w.to = s.year; w.provs1 = provsOf(s, s.player).length; w.result = result;
  const n = s.nations[foe]; if (n) R.names[foe] ??= [n.name, n.color];
}

/** Set down a first of the realm's civilisation, once. */
export function recordFirst(s: GameState, kind: FirstKind, text: string) {
  const R = recordsOf(s);
  if (R.firsts.some(f => f.text === text)) return;
  R.firsts.push({ year: s.year, kind, text });
}
/** A study learned: a first worth keeping when it opens an age, a capability, a new kind of soldier, or the realm is
 *  the first in the known world to have it. */
export function recordTech(s: GameState, techId: string, firstInWorld: boolean) {
  const t = TECH[techId];
  if (!t) return;
  const troops = Object.values(TROOPS).filter(x => x.tech === techId).map(x => x.name);
  if (AGE_TECH[techId]) recordFirst(s, 'age', `${t.name} opens a new age`);
  else if (t.grants?.length) recordFirst(s, 'technology', `${t.name}: your people learn what strangers knew`);
  else if (firstInWorld) recordFirst(s, 'technology', `${t.name}, first in the known world`);
  else if (troops.length) recordFirst(s, 'technology', `${t.name}: the first ${troops.join(' and ')}`);
}

// ---------- reading the records ----------
export const val = (row: number[] | undefined, f: Field) => row?.[FIELDS.indexOf(f)] ?? 0;
/** The player's series of one measure, year by year. */
export const mySeries = (s: GameState, f: Field) => recordsOf(s).me.map(r => ({ y: r.y, v: val(r.v, f) }));
/** One realm's series of one measure across the world snapshots (gaps where it was not among the leaders). */
export const worldSeries = (s: GameState, id: string, f: Field) => recordsOf(s).world.filter(w => w.r[id]).map(w => ({ y: w.y, v: val(w.r[id], f) }));
/** A realm's name and colour, alive or fallen. */
export const realmLook = (s: GameState, id: string): [string, string] => s.nations[id] ? [s.nations[id].name, s.nations[id].color] : recordsOf(s).names[id] ?? [nationName(s, id), '#888'];
/** The realms ever among the leaders, with their best place. */
export function leaders(s: GameState): { id: string; best: number; last: number }[] {
  const out = new Map<string, { id: string; best: number; last: number }>();
  for (const w of recordsOf(s).world) for (const [id, row] of Object.entries(w.r)) {
    const e = out.get(id) ?? { id, best: 999, last: w.y };
    e.best = Math.min(e.best, val(row, 'rank')); e.last = w.y; out.set(id, e);
  }
  return [...out.values()].sort((a, b) => a.best - b.best);
}

/** A reign's measures: what the realm was when it began and when it ended (or now). */
function reignDelta(s: GameState, from: number, to: number, f: Field): number {
  const me = recordsOf(s).me;
  const at = (y: number) => { let best = me[0]; for (const r of me) if (r.y <= y) best = r; return best; };
  if (!me.length) return 0;
  return val(at(to).v, f) - val(at(from).v, f);
}
export interface Award { title: string; who: string; why: string; }
/** Honours earned from the record, never given for nothing: each needs a real gain. */
export function awards(s: GameState): Award[] {
  const me = player(s);
  const reigns = [...s.stats.kings.map(k => ({ name: k.name + (k.epithet ? ` ${k.epithet}` : ''), from: k.from, to: k.to, prestige: k.prestige })),
    { name: me.ruler.name, from: me.ruler.from, to: s.year, prestige: Math.round(me.prestige - (me.ruler.prestigeAtStart ?? 0)) }];
  const out: Award[] = [];
  const best = (f: Field, title: string, unit: string) => {
    const r = reigns.map(k => ({ k, d: reignDelta(s, k.from, k.to, f) })).sort((a, b) => b.d - a.d)[0];
    if (r && r.d > 0) out.push({ title, who: r.k.name, why: `+${r.d} ${unit} (${r.k.from}–${r.k.to})` });
  };
  best('provinces', 'The Conqueror', 'provinces');
  best('dev', 'The Builder', 'development');
  best('income', 'The Treasurer', 'ducats of income a year');
  best('techs', 'The Learned', 'technologies');
  const glory = [...reigns].sort((a, b) => b.prestige - a.prestige)[0];
  if (glory && glory.prestige > 0) out.push({ title: 'The Glorious', who: glory.name, why: `+${glory.prestige} prestige` });
  const gens = [...s.characters.map(c => ({ name: c.name, wins: c.wins ?? 0, losses: c.losses ?? 0 })), ...s.stats.fallen.map(f => ({ name: f.name, wins: f.wins, losses: f.losses }))].sort((a, b) => b.wins - a.wins);
  if (gens[0]?.wins) out.push({ title: 'Captain of the Age', who: gens[0].name, why: `${gens[0].wins} battles won, ${gens[0].losses} lost` });
  return out;
}

/** What an annals line is about, for the timeline's filter. */
export type AnnalKind = 'war' | 'diplomacy' | 'civilisation' | 'realm';
export function annalKind(text: string): AnnalKind {
  if (/war|battle|defeat|siege|conquers| is taken| holds!|coalition|lost at sea/i.test(text)) return 'war';
  if (/peace|union|treaty|alliance|marriage|integrated|independence|subject/i.test(text)) return 'diplomacy';
  if (/research|age|discovers|colony|trade post|masterpiece|great work|study|studies/i.test(text)) return 'civilisation';
  return 'realm';
}
