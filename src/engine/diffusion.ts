// Contact and diffusion (docs/HISTORY-PLAN.md, phase 3). Knowledge moves between peoples who meet: a shared border,
// a war, a treaty, a foreigner at court, a battle against strange weapons. Each AI realm keeps the technologies it
// knows (a light research of its own, quicker where a neighbour already knows the thing); the player keeps a record of
// what it has been exposed to, which makes a study cheaper, while being first in the world costs a little more and
// pioneering a strangers' study with no teacher costs far more.
import type { GameState, Nation } from '../types';
import { TECH, TECHS, type TechDef } from '../data/techs';
import { TROOPS } from '../data/troops';
import type { Capability } from '../data/heritage';
import { TECH_GROUPS, groupOfCulture } from '../data/techgroups';
import { neighbours } from './map';
import { log, nationName } from './core';
import { capsOf, techOpenTo, researchBlock, unitNeeds, bridgeFor, clearCapsMemo } from './technology';

/** How a realm came to know of a thing. */
export type ExposureHow = 'border' | 'war' | 'treaty' | 'court' | 'battle';
export interface Exposure { from: string; year: number; how: ExposureHow; }
export const HOW_TEXT: Record<ExposureHow, string> = { border: 'across the border', war: 'in war', treaty: 'through a treaty', court: 'from a foreigner at court', battle: 'on the battlefield' };

/** Cost of a study, by what the realm has seen of it. */
export const EXPOSED_COST = 0.9, FIRST_COST = 1.1, PIONEER_COST = 2.5;
/** Capabilities no realm can work out alone: an animal it has never seen. */
export const NO_PIONEER: Capability[] = ['horses', 'elephants'];
/** A specialist card's share of a study's cost, given at once (about 0.65× the cost with one). */
export const SPECIALIST_SHARE = 0.35;
/** Years an AI realm lags the date of a study, by how far its region is from where the study began (the tech group's
 *  cost), and the years a teacher next door saves. */
export const LAG_PER_COST = 40, BASE_LAG = 2, CONTACT_SAVES = 6, AI_PER_YEAR = 3;

// ---------- who is in contact with whom, worked out once a year ----------
let contactMemo: { key: string; map: Map<string, Map<string, ExposureHow>> } = { key: '', map: new Map() };
/** Every realm's contacts and how they touch: a border, a war or a treaty. */
export function contactsOf(s: GameState, id: string): Map<string, ExposureHow> {
  const key = `${s.seed}|${s.year}`;
  if (contactMemo.key !== key) {
    const map = new Map<string, Map<string, ExposureHow>>();
    const put = (a: string, b: string, how: ExposureHow) => {
      if (a === b) return;
      for (const [x, y] of [[a, b], [b, a]]) { let m = map.get(x); if (!m) map.set(x, m = new Map()); if (!m.has(y) || how === 'war') m.set(y, how); }
    };
    for (const p of Object.values(s.provinces)) for (const n of neighbours(p.id)) { const o = s.provinces[n]?.owner; if (o && p.owner && o !== p.owner) put(p.owner, o, 'border'); }
    for (const t of s.treaties) put(t.a, t.b, 'treaty');
    for (const w of s.wars) put(w.a, w.b, 'war');
    contactMemo = { key, map };
  }
  return contactMemo.map.get(id) ?? new Map();
}

// ---------- what each realm knows ----------
/** What an AI realm knows: everything its region has reached alone by now (worked out from the dates, not stored),
 *  plus what it learned early from a teacher next door (`early`, kept in the save). Kept once a year. */
let knownMemo: { key: string; map: Map<string, Set<string>> } = { key: '', map: new Map() };
function knownSet(s: GameState, n: Nation): Set<string> {
  const key = `${s.seed}|${s.year}|${s.startYear ?? 1451}`;
  if (knownMemo.key !== key) knownMemo = { key, map: new Map() };
  let set = knownMemo.map.get(n.id);
  if (set) return set;
  set = new Set<string>(n.early ?? []);
  for (const t of TECHS) if ((t as { known?: boolean }).known && techOpenTo(s, n.id, t.id)) set.add(t.id);
  const lag = lagOf(s, n);
  let more = true;
  while (more) {
    more = false;
    for (const t of TECHS) if (t.year + lag <= s.year && learnable(s, n, t, set)) { set.add(t.id); more = true; }
  }
  knownMemo.map.set(n.id, set);
  return set;
}
/** Forget the kept answers (a realm has just learned something). */
const forgetKnown = (id: string) => knownMemo.map.delete(id);

/** Does this realm know the study? The player by research; an AI realm by its region's pace and its teachers. */
export function knows(s: GameState, id: string, techId: string): boolean {
  if (id === s.player) return s.techs.includes(techId);
  const n = s.nations[id];
  return !!n && knownSet(s, n).has(techId);
}
/** Every study an AI realm knows (for its page and the tests). */
export const studiesOf = (s: GameState, id: string): string[] => (id === s.player ? s.techs : s.nations[id] ? [...knownSet(s, s.nations[id])] : []);
/** Years after a study's date that this realm reaches it alone. */
function lagOf(s: GameState, n: Nation): number {
  const cost = TECH_GROUPS[groupOfCulture(n.culture)]?.cost ?? 1;
  return BASE_LAG + Math.round((cost - 1) * LAG_PER_COST) + (n.personality === 'cautious' ? 3 : n.personality === 'merchant' ? -1 : 0);
}
/** Could this AI realm learn the study now (its traditions, its means, what it knows)? */
function learnable(s: GameState, n: Nation, t: TechDef, known: Set<string>): boolean {
  if (known.has(t.id) || t.bridge || !techOpenTo(s, n.id, t.id)) return false;
  if (t.req?.some(r => !known.has(r))) return false;
  return researchBlock(s, t.id, n.id) === null;
}
/** Does any realm this one touches know the study? Returns that realm. */
function teacherOfTech(s: GameState, id: string, techId: string): string | null {
  for (const other of contactsOf(s, id).keys()) if (s.nations[other]?.alive && knows(s, other, techId)) return other;
  return null;
}

/** Once a year: an AI realm with a teacher next door learns a study up to CONTACT_SAVES years before its region
 *  would alone (a few a year at most, oldest first). What its region reaches alone needs no record. Returns what was
 *  learned early, for the record. */
export function yearlyAiResearch(s: GameState): { nation: string; tech: string; from: string | null }[] {
  const out: { nation: string; tech: string; from: string | null }[] = [];
  for (const n of Object.values(s.nations)) {
    if (!n.alive || n.id === s.player) continue;
    const known = knownSet(s, n), lag = lagOf(s, n);
    // what the region has now reached alone leaves the record of early learning
    if (n.early?.length) n.early = n.early.filter(id => TECH[id] && TECH[id].year + lag > s.year);
    let got = 0;
    for (const t of TECHS) {
      if (got >= AI_PER_YEAR) break;
      if (t.year + lag - CONTACT_SAVES > s.year || t.year + lag <= s.year || !learnable(s, n, t, known)) continue;
      const from = teacherOfTech(s, n.id, t.id);
      if (!from) continue;
      (n.early ??= []).push(t.id); known.add(t.id); got++;
      out.push({ nation: n.id, tech: t.id, from });
    }
    if (got) forgetKnown(n.id);
  }
  return out;
}

/** The troop's study, if it needs one: an AI realm raises it only once it knows it. */
export const aiKnowsTroop = (s: GameState, id: string, type: string) => { const t = TROOPS[type]?.tech; return !t || !TECH[t] || knows(s, id, t); };

// ---------- what the player has been exposed to ----------
export const exposureOf = (s: GameState, techId: string): Exposure | undefined => s.exposed?.[techId];
export function expose(s: GameState, techId: string, from: string, how: ExposureHow): boolean {
  if (s.techs.includes(techId) || s.exposed?.[techId]) return false;
  (s.exposed ??= {})[techId] = { from, year: s.year, how };
  return true;
}
/** A capability the player lacks, met through someone: opens its strangers' study for good. */
function exposeCap(s: GameState, c: Capability, from: string, how: ExposureHow): string | null {
  if (capsOf(s, s.player).has(c)) return null;
  const b = bridgeFor(c);
  return b && expose(s, b.id, from, how) ? b.id : null;
}

/** Once a year: what the player's contacts know and it does not, and the capabilities they have. Returns the studies
 *  newly seen. (Foreigners at court come through the specialist cards: cards.ts.) */
export function yearlyExposure(s: GameState): string[] {
  const out: string[] = [];
  const mine = capsOf(s, s.player);
  for (const [other, how] of contactsOf(s, s.player)) {
    const n = s.nations[other];
    if (!n?.alive) continue;
    for (const t of TECHS) {
      if (t.bridge || s.techs.includes(t.id) || s.exposed?.[t.id] || !techOpenTo(s, s.player, t.id)) continue;
      if (knows(s, other, t.id) && expose(s, t.id, other, how)) out.push(t.id);
    }
    for (const c of capsOf(s, other)) if (!mine.has(c)) { const b = exposeCap(s, c, other, how); if (b) out.push(b); }
  }
  return out;
}

/** After a battle: weapons the player has never seen, met in the enemy's ranks. A notice, and the strangers' study
 *  opens. Returns the names of the strange weapons met (empty if none). */
export function meetWeapons(s: GameState, enemy: string, types: string[]): string[] {
  const mine = capsOf(s, s.player);
  const seen: string[] = [];
  for (const type of new Set(types)) {
    const strange = unitNeeds(type).filter(c => !mine.has(c));
    if (!strange.length) continue;
    let opened = false;
    for (const c of strange) if (exposeCap(s, c, enemy, 'battle')) opened = true;
    if (opened) seen.push(TROOPS[type].name);
  }
  if (seen.length) {
    s.flags.captured_until = s.year + 3; // the Study Captured Equipment card can be drawn for a while
    log(s, `Foreign weapons met: the ${seen.join(' and ')} of ${nationName(s, enemy)}. A strangers' study is open to your scholars.`, 'neutral');
    clearCapsMemo();
  }
  return seen;
}

// ---------- the cost of a study ----------
/** What the player's exposure does to a study's cost: cheaper when seen, dearer when first in the known world, far
 *  dearer when pioneering a strangers' study with no teacher. */
export function exposureMult(s: GameState, techId: string): number {
  const t = TECH[techId];
  if (!t) return 1;
  if (t.bridge) return pioneering(s, techId) ? PIONEER_COST : 1;
  if (s.exposed?.[techId]) return EXPOSED_COST;
  // a study ahead of its time that no realm in the world has yet: the player would be first
  return t.year > s.year && !worldKnows(s, techId) ? FIRST_COST : 1;
}
/** A strangers' study made with no teacher and no exposure: the realm works it out alone. */
export function pioneering(s: GameState, techId: string): boolean {
  const t = TECH[techId];
  return !!t?.bridge && !s.exposed?.[techId] && !(t.grants ?? []).some(c => [...contactsOf(s, s.player).keys()].some(o => capsOf(s, o).has(c)));
}
/** Can the player pioneer this strangers' study alone at all? Never for an animal it has never seen. */
export const canPioneer = (techId: string) => !(TECH[techId]?.grants ?? []).some(c => NO_PIONEER.includes(c));
function worldKnows(s: GameState, techId: string): boolean {
  for (const n of Object.values(s.nations)) if (n.alive && n.id !== s.player && knows(s, n.id, techId)) return true;
  return false;
}

/** The realms that know a study, for its page: those the player is in contact with first. */
export function knownBy(s: GameState, techId: string): { near: string[]; far: number } {
  const near: string[] = [];
  let far = 0;
  const contacts = contactsOf(s, s.player);
  for (const n of Object.values(s.nations)) {
    if (!n.alive || n.id === s.player || !knows(s, n.id, techId)) continue;
    if (contacts.has(n.id)) near.push(n.id); else far++;
  }
  return { near, far };
}

/** One line for a study's page: what the realm has seen of it and what that does to its cost (null when known). */
export function exposureLine(s: GameState, techId: string): string | null {
  const t = TECH[techId];
  if (!t || s.techs.includes(techId)) return null;
  const e = s.exposed?.[techId];
  if (t.bridge) {
    if (e) return `Seen ${HOW_TEXT[e.how]} (${nationName(s, e.from)}, ${e.year}).`;
    if (!pioneering(s, techId)) return 'A neighbour knows this: it can be learned from them.';
    return canPioneer(techId) ? `No teacher: your scholars must work it out alone, at ${PIONEER_COST}× the cost.` : 'No teacher, and this cannot be worked out alone.';
  }
  const by = knownBy(s, techId);
  const who = by.near.slice(0, 3).map(id => nationName(s, id)).join(', ') + (by.near.length > 3 ? ` and ${by.near.length - 3} more` : '');
  if (e) return `Known to ${who || nationName(s, e.from)}${by.far ? ' and others further away' : ''}: ${Math.round((1 - EXPOSED_COST) * 100)}% cheaper.`;
  if (by.near.length) return `Known to ${who}: cheaper from next year.`;
  if (by.far) return 'Known in lands you have no contact with.';
  return t.year > s.year ? `Ahead of its time and known nowhere: being first costs ${Math.round((FIRST_COST - 1) * 100)}% more.` : null;
}

/** The studies still missing on the way to this one, the earliest first (its full chain of requirements). */
export function missingChain(s: GameState, techId: string): string[] {
  const out: string[] = [];
  const visit = (id: string) => {
    for (const r of TECH[id]?.req ?? []) if (!s.techs.includes(r) && !out.includes(r)) { visit(r); out.push(r); }
  };
  visit(techId);
  return out;
}
