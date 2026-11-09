// The shape of the realm: its rank, how many missions it can run a year, viceroys, and civil wars.
import type { GameState, Nation, Province, Character } from '../types';
import { player, provsOf, rand, clamp, uid, push, log, declareWar, nationName, atWar, armyPower } from './core';
import { getGeo } from './map';
import { happinessOf, CULTURE_NAMES, RELIGION_NAMES } from './society';
import { RARITY } from '../data/characters';
import { BUILDINGS } from '../data/techs';
import { buildingAllowed } from './core';
import { makeSide, createBattle, toBattleUnits, genericGeneral, finishBattle } from './battle';

// ---------- rank ----------
export interface RankDef { id: string; name: string; min: number; missions: number; viceroys: number; }
export const RANKS: RankDef[] = [
  { id: 'small', name: 'Small Kingdom', min: 0, missions: 6, viceroys: 0 },
  { id: 'kingdom', name: 'Kingdom', min: 5, missions: 9, viceroys: 0 },
  { id: 'great', name: 'Great Kingdom', min: 13, missions: 12, viceroys: 1 },
  { id: 'empire', name: 'Empire', min: 30, missions: 15, viceroys: 3 },
];
export const rankOf = (s: GameState, n = s.player): RankDef => { const k = provsOf(s, n).length; return [...RANKS].reverse().find(r => k >= r.min)!; };
export const nextRank = (s: GameState): RankDef | null => RANKS[RANKS.indexOf(rankOf(s)) + 1] ?? null;
/** Each viceroy takes two of the crown's yearly missions: the work is theirs now. */
export const VICEROY_COST = 2;
export const missionCap = (s: GameState) => Math.max(2, rankOf(s).missions - (s.viceroys?.length ?? 0) * VICEROY_COST);
export const missionsLeft = (s: GameState) => Math.max(0, missionCap(s) - (s.launched ?? 0));

// ---------- viceroys ----------
const managed = (s: GameState) => new Set((s.viceroys ?? []).flatMap(v => v.provinces));
/** The territory a viceroy seated in this province would rule: your provinces within two marches of it. */
export function territoryOf(s: GameState, seat: string): string[] {
  const g = getGeo(), cap = player(s).capital, taken = managed(s);
  const out = new Set<string>([seat]);
  let frontier = [seat];
  for (let step = 0; step < 2; step++) {
    const next: string[] = [];
    for (const id of frontier) for (const nb of [...g.adj[id], ...g.sea[id]]) {
      if (out.has(nb) || nb === cap || taken.has(nb) || s.provinces[nb]?.owner !== s.player) continue;
      out.add(nb); next.push(nb);
    }
    frontier = next;
  }
  return [...out];
}

export function viceroyBlocked(s: GameState, seat: string, ch?: Character): string | null {
  const r = rankOf(s);
  if (!r.viceroys) return 'Only a Great Kingdom or an Empire can name viceroys';
  if ((s.viceroys?.length ?? 0) >= r.viceroys) return `A ${r.name} can have ${r.viceroys} viceroy${r.viceroys > 1 ? 's' : ''}`;
  const p = s.provinces[seat];
  if (p?.owner !== s.player) return 'Choose one of your provinces';
  if (seat === player(s).capital) return 'The capital is ruled by the crown itself';
  if (managed(s).has(seat)) return 'Already under a viceroy';
  if (territoryOf(s, seat).length < 3) return 'Too small: a viceroyalty needs at least 3 provinces';
  if (ch && (ch.mission != null || ch.ruler)) return 'Choose a free person';
  if (missionCap(s) - VICEROY_COST < 2) return 'Too few yearly missions left to hand over';
  return null;
}

export function appointViceroy(s: GameState, seat: string, charUid: number): string | null {
  const ch = s.characters.find(c => c.uid === charUid);
  if (!ch) return 'Choose a person';
  const why = viceroyBlocked(s, seat, ch);
  if (why) return why;
  const provinces = territoryOf(s, seat);
  (s.viceroys ??= []).push({ char: ch.uid, seat, provinces, loyalty: 75 - ch.skill * 3, since: s.year });
  ch.mission = -1; // away for good
  log(s, `${ch.name} becomes viceroy of ${s.provinces[seat].name} (${provinces.length} provinces).`, 'good');
  return null;
}

export function recallViceroy(s: GameState, charUid: number) {
  const v = s.viceroys?.find(x => x.char === charUid);
  if (!v) return;
  s.viceroys = s.viceroys!.filter(x => x !== v);
  const ch = s.characters.find(c => c.uid === charUid);
  if (ch) delete ch.mission;
  if (v.loyalty < 40) { player(s).stability = clamp(player(s).stability - 1, -3, 3); log(s, `${ch?.name ?? 'The viceroy'} resents the recall. Stability −1.`, 'bad'); }
}

/** Once a year, in winter: viceroys improve their lands; the very able may grow ambitious. */
export function yearlyViceroys(s: GameState, q: number) {
  if (q !== 3 || !s.viceroys?.length) return;
  const me = player(s);
  for (const v of [...s.viceroys]) {
    const ch = s.characters.find(c => c.uid === v.char);
    v.provinces = v.provinces.filter(id => s.provinces[id]?.owner === s.player);
    if (!ch || v.provinces.length === 0) { s.viceroys = s.viceroys.filter(x => x !== v); continue; }
    const k = ch.skill;
    const focus = viceroyFocus(ch.role);
    for (const id of v.provinces) {
      const p = s.provinces[id];
      p.control = clamp(p.control + k * (focus === 'order' ? 2 : 1), 0, 100);
      if (focus === 'order' && p.dev < 8 && rand(s) < 0.025 * k) p.dev++;
      if (focus === 'order') p.favor = Math.min(30, (p.favor ?? 0) + k / 2);
      if (focus === 'people') p.favor = Math.min(30, (p.favor ?? 0) + k);
      if (focus === 'arms' && p.fort < 2 && rand(s) < 0.02 * k) p.fort++;
      if (focus === 'trade' && rand(s) < 0.03 * k) {
        const opt = ['market', 'farm', 'mine', 'fishery', 'pasture'].find(b => buildingAllowed(s, id, b) === null);
        if (opt) { p.buildings.push(opt); log(s, `${ch.name} builds a ${BUILDINGS[opt].name.toLowerCase()} in ${p.name}.`, 'good'); }
      }
    }
    if (focus === 'arms') me.manpower += k * 0.4;
    if (focus === 'trade') me.gold += Math.round(k * v.provinces.length * 0.5);
    if (focus === 'learning') { const m = s.missions.find(x => x.kind === 'research'); if (m) m.progress += k; }
    // loyalty: a big, unhappy viceroyalty under a weak crown drifts away; an able viceroy more so
    const terr = v.provinces.map(id => s.provinces[id]);
    const happy = terr.reduce((a, p) => a + happinessOf(s, p).value, 0) / terr.length;
    const power = terr.reduce((a, p) => a + p.dev, 0);
    v.loyalty = clamp(v.loyalty + me.stability * 1.5 + (happy - 50) / 8 - power / 25 - Math.max(0, k - 3) + (me.prestige > 100 ? 1.5 : 0), 0, 100);
    if (v.loyalty < 40 && !s.flags['vwarn_' + v.char]) {
      s.flags['vwarn_' + v.char] = 1;
      push(s, { kind: 'reveal', title: 'Whispers from the viceroyalty', items: [{ title: ch.name, text: `Your viceroy in ${s.provinces[v.seat].name} keeps a court of his own. Loyalty ${Math.round(v.loyalty)}. Raise stability, or recall him before it is too late.`, tone: 'bad', kind: 'eye' }] });
    }
    if (v.loyalty < 20 && (k >= 4 || power >= 15) && rand(s) < 0.35) viceroyRebels(s, v, ch);
  }
}

function viceroyRebels(s: GameState, v: NonNullable<GameState['viceroys']>[number], ch: Character) {
  s.viceroys = s.viceroys!.filter(x => x !== v);
  s.characters = s.characters.filter(c => c.uid !== ch.uid);
  const seat = s.provinces[v.seat];
  const n = createNation(s, { id: 'viceroy_' + v.char, name: `Kingdom of ${seat.name}`, adj: seat.name, culture: seat.culture, religion: seat.religion, capital: seat.id, provinces: v.provinces, armySize: 2 + Math.ceil(v.provinces.length * 0.8), ruler: ch.name });
  declareWar(s, n.id, s.player);
  push(s, { kind: 'reveal', title: 'A viceroy crowns himself', subtitle: `${ch.name} rises against you`, items: [{ title: n.name, text: `${ch.name} declares ${v.provinces.length} provinces independent and is at war with you. Win them back, or make peace and let them go.`, tone: 'bad', kind: 'crown' }] });
  log(s, `${ch.name} declares independence as ruler of the ${n.name}.`, 'bad');
}

/** What a viceroy's training makes the viceroyalty good at. */
export type ViceroyFocus = 'arms' | 'order' | 'trade' | 'people' | 'learning';
export const viceroyFocus = (role: Character['role']): ViceroyFocus =>
  role === 'general' || role === 'conqueror' || role === 'admiral' ? 'arms' : role === 'merchant' ? 'trade' : role === 'diplomat' || role === 'explorer' ? 'people' : role === 'researcher' ? 'learning' : 'order';
export const FOCUS_TEXT: Record<ViceroyFocus, string> = {
  arms: 'A soldier: forts, firm control and manpower for the crown',
  order: 'An administrator: control, contentment and growth',
  trade: 'A merchant: markets, farms and mines, and ducats each year',
  people: 'A diplomat: the people are happier',
  learning: 'A scholar: helps whatever you are researching',
};

// ---------- new realms born in play (rebels, breakaway viceroyalties) ----------
const PALETTE = ['#7a4e8c', '#3f7a6a', '#a0522d', '#5a6e9c', '#8c7a3f', '#9c3f5a', '#4f8c4a', '#6a5a4a'];
export function createNation(s: GameState, o: { id: string; name: string; adj: string; culture: string; religion: string; capital: string; provinces: string[]; armySize: number; ruler?: string; personality?: Nation['personality'] }): Nation {
  const id = s.nations[o.id] ? `${o.id}_${uid(s)}` : o.id;
  const n: Nation = {
    id, name: o.name, adj: o.adj, color: PALETTE[Math.floor(rand(s) * PALETTE.length)], culture: o.culture, capital: o.capital,
    gold: 20, manpower: 5, stability: 0, prestige: 5, personality: o.personality ?? 'expansionist', alive: true, fleet: [],
    army: Array.from({ length: o.armySize }, (_, i) => ({ uid: uid(s), type: i % 3 === 2 ? 'men_at_arms' : 'levy', vet: 0, str: 100 })),
    ruler: { name: o.ruler ?? 'the rebel council', traits: [], arch: 'martial', skill: 3, from: s.year, to: s.year + 20 },
  };
  s.nations[id] = n;
  for (const pid of o.provinces) { const p = s.provinces[pid]; p.owner = id; p.control = 50; }
  s.flags['dev0_' + id] = o.provinces.reduce((a, pid) => a + s.provinces[pid].dev, 0);
  return n;
}

// ---------- unrest and civil war ----------
/** Why a province is unhappy, as the banner rebels gather under. */
function causeOf(s: GameState, p: Province): { key: string; name: string; adj: string } {
  if (p.religion !== s.stateReligion) return { key: 'faith_' + p.religion, name: `${RELIGION_NAMES[p.religion] ?? p.religion} League`, adj: RELIGION_NAMES[p.religion] ?? p.religion };
  if (!s.accepted.includes(p.culture)) return { key: 'culture_' + p.culture, name: `Free ${CULTURE_NAMES[p.culture]}`, adj: CULTURE_NAMES[p.culture] };
  return { key: 'pretender', name: `${player(s).adj} Pretender`, adj: 'Rebel' };
}

/** Rebels of this cause already at war with the crown. */
const factionOf = (s: GameState, key: string) => Object.values(s.nations).find(n => n.alive && s.flags['faction_' + n.id] === 1 && n.id.startsWith('rebel_' + key) && atWar(s, n.id, s.player));

/** Each quarter: angry provinces may rise. A rising that takes its province starts a civil war. */
export function quarterlyUnrest(s: GameState) {
  const me = player(s);
  for (const p of provsOf(s, s.player)) {
    if (p.id === me.capital) continue;
    const h = happinessOf(s, p).value;
    if (h >= 30) continue;
    const cause = causeOf(s, p);
    if (cause.key === 'pretender' && me.stability > -2) continue; // loyal subjects only rise against a failing crown
    const faction = factionOf(s, cause.key);
    // provinces next to a rebel faction of their own cause may simply go over to it
    if (faction && getGeo().adj[p.id].some(nb => s.provinces[nb].owner === faction.id) && rand(s) < 0.06 * (1 + (30 - h) / 10)) {
      p.owner = faction.id; p.control = 40;
      push(s, { kind: 'reveal', title: `${p.name} joins the rebels`, items: [{ title: faction.name, text: `${p.name} goes over to the ${faction.name}. The civil war spreads.`, tone: 'bad', kind: 'torch' }] });
      log(s, `${p.name} joins the ${faction.name}.`, 'bad');
      continue;
    }
    if (h >= 25 || (s.flags['rising_' + p.id] ?? -99) > s.year - 6) continue; // a rising every few years at most
    const chance = 0.006 * (1 + (25 - h) / 6) * (p.control < 40 ? 1.5 : 1) * (me.stability <= -2 ? 1.4 : 1);
    if (rand(s) >= chance) continue;
    rising(s, p, cause, h);
    return; // one rising a quarter is plenty
  }
}

function rising(s: GameState, p: Province, cause: { key: string; name: string; adj: string }, h: number) {
  const size = Math.max(2, Math.round(1 + p.dev / 2 + (30 - h) / 8));
  const att = makeSide('rebels', risingForce(size), genericGeneral(s), 0, false);
  const home = s.troops.filter(t => t.mission == null && t.str > 0).sort((a, b) => b.str - a.str).slice(0, 6);
  const gen = s.characters.filter(c => c.role === 'general' && c.mission == null).sort((a, b) => b.skill - a.skill)[0];
  const militia = [0, 1].map(i => ({ uid: -600 - i, type: 'levy', vet: 0, str: 100, start: 100, garrison: true }));
  const def = makeSide(s.player, [...toBattleUnits(home), ...militia], gen ? { name: gen.name, skill: gen.skill, traits: gen.traits, uid: gen.uid } : null, p.fort, true);
  const b = createBattle(s, att, def, p.id, 'rebels');
  b.rebel = { cause: cause.key, name: cause.name, adj: cause.adj };
  push(s, { kind: 'reveal', title: `Rising in ${p.name}`, subtitle: `Happiness ${Math.round(h)}%`, items: [{ title: cause.name, text: `${size} companies of rebels take up arms in ${p.name}. If they beat your troops, the province breaks away and a civil war begins.`, tone: 'bad', kind: 'torch' }] });
  push(s, { kind: 'battle', battle: b });
}

/** After the player loses to rebels: the province breaks away and a civil war begins (or spreads). */
export function rebelsTake(s: GameState, provId: string, causeKey: string, name: string, adj: string, survivors: number) {
  const p = s.provinces[provId];
  const existing = factionOf(s, causeKey);
  if (existing) {
    p.owner = existing.id; p.control = 40;
    for (let i = 0; i < Math.max(1, survivors); i++) existing.army.push({ uid: uid(s), type: 'levy', vet: 0, str: 80 });
    log(s, `${p.name} falls to the ${existing.name}.`, 'bad');
    return existing;
  }
  const n = createNation(s, { id: 'rebel_' + causeKey, name, adj, culture: p.culture, religion: p.religion, capital: p.id, provinces: [p.id], armySize: Math.max(2, survivors) });
  s.flags['faction_' + n.id] = 1;
  declareWar(s, n.id, s.player);
  push(s, { kind: 'reveal', title: 'Civil war!', subtitle: `The ${name} hold ${p.name}`, items: [
    { title: name, text: `Rebels hold ${p.name} and raise their own banner. Other unhappy provinces of the same cause may join them. Retake ${p.name}, or make peace and let it go.`, tone: 'bad', kind: 'torch' },
    { title: 'What feeds it', text: 'Unhappy provinces. Royal grace, religious missions, cultural integration, festivals and tolerance calm them.', tone: 'neutral', kind: 'mood' },
  ] });
  log(s, `Civil war: the ${name} rise in ${p.name}.`, 'bad');
  return n;
}

/** Rebel strength for the battle of a rising. */
export const risingForce = (size: number) => Array.from({ length: size }, (_, i) => ({ uid: -500 - i, type: i % 4 === 3 ? 'men_at_arms' : 'rebels', vet: 0, str: 100, start: 100 }));

void armyPower; void nationName; void RARITY;
