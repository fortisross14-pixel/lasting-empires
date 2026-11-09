// People: works of art, your church, and the cultures of the realm.
import type { GameState, Character, Artwork, RevealItem } from '../types';
import { GENRES, QUALITY, MASTERWORKS, TITLE_PARTS, RELIGION_HEADS, MONUMENT_YEARS } from '../data/culture';
import { player, provsOf, inflation, clamp, rand, pick, uid, log, getRel, addRel, population, ageIndex } from './core';
import { CULTURE_NAMES, happinessOf, isAccepted } from './society';
import { ERAS } from '../data/eras';

// ---------- your church ----------
/** Catholics deal with the Papal States themselves; other faiths keep a standing with their leaders. */
const usesPapacy = (s: GameState) => s.stateReligion === 'catholic' && !!s.nations.papacy?.alive;
export const churchHead = (s: GameState) => RELIGION_HEADS[s.stateReligion] ?? { name: 'The clergy', seat: 'the realm' };
export function churchRel(s: GameState): number {
  return usesPapacy(s) ? getRel(s, s.player, 'papacy') : s.flags['faith_' + s.stateReligion] ?? 20;
}
export function addChurchRel(s: GameState, d: number) {
  if (usesPapacy(s)) addRel(s, s.player, 'papacy', d);
  else s.flags['faith_' + s.stateReligion] = clamp((s.flags['faith_' + s.stateReligion] ?? 20) + d, -100, 100);
}
/** Blessed at 50 or more, censured at −40 or less. */
export const churchMood = (s: GameState): 'blessed' | 'censured' | 'neutral' => { const r = churchRel(s); return r >= 50 ? 'blessed' : r <= -40 ? 'censured' : 'neutral'; };
export const giftCost = (s: GameState) => Math.round(25 * inflation(s));
export function giftBlocked(s: GameState): string | null {
  if ((s.giftYear ?? -99) === s.year) return 'One gift a year';
  if (player(s).gold < giftCost(s)) return `Costs ${giftCost(s)} ducats`;
  return null;
}
/** A gift to your church: ducats for favour, once a year. */
export function sendGift(s: GameState): string | null {
  const why = giftBlocked(s);
  if (why) return why;
  player(s).gold -= giftCost(s);
  s.giftYear = s.year;
  addChurchRel(s, 10);
  log(s, `A gift to ${churchHead(s).name.replace(/^The /, 'the ')}: favour +10.`, 'good');
  return null;
}

/** Yearly: what your church thinks of you shows. */
export function yearlyChurch(s: GameState) {
  const me = player(s);
  if (!usesPapacy(s)) { const k = 'faith_' + s.stateReligion; const v = s.flags[k] ?? 20; s.flags[k] = Math.round((v + (20 - v) * 0.05) * 10) / 10; }
  const mood = churchMood(s);
  if (mood === 'blessed') { me.prestige += 1; if (churchRel(s) >= 80 && rand(s) < 0.25) { s.hand.push({ uid: uid(s), card: 'religious_mission' }); log(s, `${churchHead(s).name} sends missionaries: a Religious Mission card.`, 'good'); } }
  if (mood === 'censured' && rand(s) < 0.2) { me.stability = clamp(me.stability - 1, -3, 3); log(s, `${churchHead(s).name} condemns the crown: stability −1.`, 'bad'); }
  // pious courtiers keep good relations
  for (const c of s.characters) if (c.mission == null && c.traits.includes('pious')) addChurchRel(s, 2);
  for (const c of s.characters) if (c.traits.includes('refined')) me.prestige += 0.5;
}

/** Happiness in a province from your church's mood (only for those of your faith). */
export function churchHappy(s: GameState, religion: string): number {
  if (religion !== s.stateReligion) return 0;
  const m = churchMood(s);
  return m === 'blessed' ? 3 : m === 'censured' ? -5 : 0;
}

// ---------- works of art ----------
export const artCost = (s: GameState, genre: string) => Math.round((genre === 'monument' ? 60 : 30) * inflation(s));
const nowY = (s: GameState) => s.year + (s.quarter ?? 0) / 4;

/** Happiness from works of art in the whole realm right now: each fades to nothing over its years. */
export function artHappy(s: GameState): number {
  let v = 0;
  for (const w of s.works ?? []) {
    const span = Math.max(0.25, w.until - w.year);
    const left = Math.max(0, w.until - nowY(s));
    v += w.happy * Math.min(1, left / span);
  }
  return Math.round(v * 10) / 10;
}

/** Works on show: libraries hold 1, universities 2, museums 4. From the Age of Enlightenment they draw visitors. */
export function displaySlots(s: GameState): number {
  return provsOf(s, s.player).reduce((a, p) => a + (p.buildings.includes('library') ? 1 : 0) + (p.buildings.includes('university') ? 2 : 0) + (p.buildings.includes('museum') ? 4 : 0), 0);
}
export const museumsOpen = (s: GameState) => ageIndex(s) >= ERAS.findIndex(e => e.id === 'enlightenment');
export function displayed(s: GameState): Artwork[] {
  return [...(s.works ?? [])].filter(w => QUALITY[w.quality].museum > 0).sort((a, b) => b.quality - a.quality || a.year - b.year).slice(0, displaySlots(s));
}
/** Ducats a year from works: fees in their first years, then visitors in the Enlightenment. */
export function artGold(s: GameState): { fees: number; visitors: number } {
  let fees = 0;
  for (const w of s.works ?? []) if (w.goldUntil > s.year) fees += w.gold;
  const visitors = museumsOpen(s) ? displayed(s).reduce((a, w) => a + QUALITY[w.quality].museum, 0) * inflation(s) : 0;
  return { fees: fees * inflation(s), visitors };
}

function titleFor(s: GameState, genre: string, quality: number, culture: string): string {
  if (quality === 4) {
    const used = new Set((s.works ?? []).map(w => w.name));
    const fit = MASTERWORKS.filter(m => m.genre === genre && s.year >= m.from && s.year <= m.to && (!m.cultures || m.cultures.includes(culture)) && !used.has(m.name));
    if (fit.length) return pick(s, fit).name;
  }
  const t = TITLE_PARTS[genre];
  const place = pick(s, provsOf(s, s.player)).name;
  const a = pick(s, t.a);
  if (genre === 'portrait') return `${a} ${player(s).ruler.name}`;
  if (genre === 'monument') return `${a} ${place}`;
  return `${a} ${t.b.length ? pick(s, t.b) : place}`;
}

/** An artist finishes a work. Quality is the mission outcome. */
export function createWork(s: GameState, ch: Character, genre: string, o: number): RevealItem[] {
  const q = QUALITY[o];
  const g = GENRES[genre];
  const culture = player(s).culture;
  const years = q.years * (genre === 'monument' ? MONUMENT_YEARS : 1);
  const w: Artwork = { id: uid(s), name: titleFor(s, genre, o, culture), genre, quality: o, year: nowY(s), artist: ch.name, culture, happy: q.happy, until: nowY(s) + years, gold: q.gold, goldUntil: s.year + q.goldYears };
  (s.works ??= []).push(w);
  const me = player(s);
  me.prestige += q.prestige + (genre === 'portrait' && o >= 2 ? 3 : 0);
  if (genre === 'sacred') addChurchRel(s, o >= 2 ? 5 : 2);
  for (let i = 0; i < q.cards; i++) {
    const pool = Object.keys(CARDS_BY_CAT(s, g.cat));
    if (pool.length) s.hand.push({ uid: uid(s), card: pick(s, pool) });
  }
  const bits = [`+${q.happy} happiness everywhere, fading over ${years >= 1 ? Math.round(years) + ' year' + (Math.round(years) > 1 ? 's' : '') : 'a season'}`];
  if (q.gold) bits.push(`${q.gold} ducats a year for ${q.goldYears} years`);
  if (q.prestige) bits.push(`+${q.prestige} prestige`);
  if (q.cards) bits.push(`${q.cards} free ${g.cat === 'culture' ? 'People' : g.cat[0].toUpperCase() + g.cat.slice(1)} card${q.cards > 1 ? 's' : ''}`);
  if (q.museum) bits.push(`worth showing in a library or museum`);
  log(s, `${ch.name} finishes ${w.name} (${q.name.toLowerCase()}).`, o >= 3 ? 'good' : 'neutral');
  return [{ title: `${w.name}`, text: `${q.name} ${g.name.toLowerCase()} by ${ch.name}: ${bits.join(', ')}.`, tone: o >= 2 ? 'good' : 'neutral', kind: g.icon }];
}

// cards are looked up lazily to avoid an import cycle with cards.ts
let cardsByCat: ((s: GameState, cat: string) => Record<string, true>) | null = null;
export function setCardPool(f: (s: GameState, cat: string) => Record<string, true>) { cardsByCat = f; }
const CARDS_BY_CAT = (s: GameState, cat: string) => (cardsByCat ? cardsByCat(s, cat) : {});

// ---------- cultures ----------
/** How many cultures the crown can embrace: 2, +1 per 12 provinces, +1 with a humanist age. */
export function acceptCap(s: GameState): number {
  return 2 + Math.floor(provsOf(s, s.player).length / 12) + (ageIndex(s) >= 2 ? 1 : 0);
}
export function acceptBlocked(s: GameState, culture: string): string | null {
  if (isAccepted(s, culture)) return 'Already embraced';
  const ps = provsOf(s, s.player).filter(p => p.culture === culture);
  if (!ps.length) return 'No such people in your realm';
  if (ps.length < 2 && ps.reduce((a, p) => a + p.dev, 0) < 6) return 'Too few of them yet: 2 provinces or 6 development';
  if (s.accepted.length >= acceptCap(s)) return `You can embrace ${acceptCap(s)} cultures (more with a bigger realm)`;
  if (s.missions.some(m => m.kind === 'accept')) return 'A leader is already at work';
  return null;
}

export interface CultureRow { culture: string; provinces: number; people: number; happy: number; accepted: boolean; }
export function cultureRows(s: GameState): CultureRow[] {
  const by: Record<string, CultureRow & { w: number }> = {};
  for (const p of provsOf(s, s.player)) {
    const r = by[p.culture] ??= { culture: p.culture, provinces: 0, people: 0, happy: 0, accepted: isAccepted(s, p.culture), w: 0 };
    const pop = population(s, p);
    r.provinces++; r.people += pop; r.happy += happinessOf(s, p).value * pop; r.w += pop;
  }
  return Object.values(by).map(r => ({ culture: r.culture, provinces: r.provinces, people: r.people, happy: Math.round(r.happy / Math.max(1, r.w)), accepted: r.accepted })).sort((a, b) => b.people - a.people);
}
export function religionRows(s: GameState) {
  const by: Record<string, { religion: string; provinces: number; people: number; happy: number; w: number }> = {};
  for (const p of provsOf(s, s.player)) {
    const r = by[p.religion] ??= { religion: p.religion, provinces: 0, people: 0, happy: 0, w: 0 };
    const pop = population(s, p);
    r.provinces++; r.people += pop; r.happy += happinessOf(s, p).value * pop; r.w += pop;
  }
  return Object.values(by).map(r => ({ religion: r.religion, provinces: r.provinces, people: r.people, happy: Math.round(r.happy / Math.max(1, r.w)) })).sort((a, b) => b.people - a.people);
}
export const cultureName = (c: string) => CULTURE_NAMES[c] ?? c;
