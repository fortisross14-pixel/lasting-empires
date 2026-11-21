import { groupOf, groupDef, localUnit } from './techgroups';
import { TECH_GROUPS } from '../data/techgroups';
import { goalOf, yearlyGoals, deed, warned, warnedNow, markWarned, GOAL_WEIGHT } from './rivals';
import { later } from './eventkit';
import { maxFort } from './core';
import { dispatch } from './annals';
import { inflation, ageIndex, diff } from './core';
import { commandOf, GENERIC_COMMAND } from '../data/characters';
// AI nations: economy, recruiting, upgrades, war and peace.
import type { Personality, GameState, Nation, TroopCard, RevealItem } from '../types';
import { TROOPS } from '../data/troops';
import {
  rand, pick, uid, clamp, provsOf, incomeOf, manpowerGain, manpowerMax, getRel, addRel, atWar, findWar,
  declareWar, makePeace, inTruce, hasTreaty, addTreaty, alliesOf, enemiesOf, armyPower, log, push, nationName, player, chance, traitMult,
} from './core';
import { neighbours } from './map';
import { aiOverseas, revealBorders } from './overseas';
import { troopsNear, announceAttack, aiRedeploy } from './army';
import { NO_STATE } from '../data/nations';
import { getGeo } from './map';
import { warScore, makeSubject, subjectsOf } from './diplo';
import { createBattle, makeSide, toBattleUnits, genericGeneral, autoResolve, finishBattle } from './battle';

// When AI nations get each troop type (they lag behind the player's research a little).
const AI_UPGRADES: [string, string, number][] = [
  ['levy', 'pikemen', 1470], ['men_at_arms', 'pikemen', 1475], ['crossbow', 'arquebusiers', 1485],
  ['bombard', 'field_cannon', 1495], ['pikemen', 'tercio', 1518], ['jinetes', 'reiters', 1540],
  ['knights', 'cuirassiers', 1550], ['arquebusiers', 'musketeers', 1552], ['tercio', 'old_tercio', 1565],
  ['reiters', 'dragoons', 1615], ['musketeers', 'line_infantry', 1685], ['old_tercio', 'line_infantry', 1695],
];

function aiRecruitPool(s: GameState, n: Nation): [string, number][] {
  const year = s.year, g = groupOf(s, n.id), closed = TECH_GROUPS[g].closed;
  return aiRecruitPoolEuro(year).map(([t, w]) => [TROOPS[t].tech && closed.includes(TROOPS[t].tech!) ? null : localUnit(g, t), w] as [string | null, number]).filter((x): x is [string, number] => !!x[0]);
}
function aiRecruitPoolEuro(year: number): [string, number][] {
  const pool: [string, number][] = [['levy', 3], ['crossbow', 2], ['jinetes', 1.5], ['men_at_arms', 1.5], ['knights', 0.7], ['bombard', 0.4]];
  if (year >= 1465) pool.push(['pikemen', 2]);
  if (year >= 1478) pool.push(['arquebusiers', 2]);
  if (year >= 1510) pool.push(['tercio', 0.8]);
  if (year >= 1545) pool.push(['musketeers', 1.5]);
  if (year >= 1600) pool.push(['dragoons', 0.6]);
  if (year >= 1675) pool.push(['line_infantry', 1.5]);
  return pool;
}

/** Realms history remembers as conquerors, in the years they rose: more eager for war, a little stronger,
 *  slower to make peace while winning. The bonus ends once a realm holds RISER_MAX provinces. */
export const RISERS: Record<string, [number, number]> = {
  ottomans: [1451, 1683], muscovy: [1462, 1725], castile: [1475, 1590], timurids: [1526, 1707], mughals: [1556, 1707],
  jurchens: [1610, 1760], qing: [1644, 1760], songhai: [1464, 1590], aztec: [1451, 1519], inca: [1451, 1527],
  safavids: [1501, 1630], sweden: [1611, 1718], brandenburg: [1640, 1790], vijayanagara: [1451, 1565], marathas: [1700, 1760],
  bahmani: [1451, 1490], oyo: [1600, 1780], ashanti: [1700, 1800], ayutthaya: [1451, 1600],
};
export const RISER_MAX = 70;
/** Is this realm in its historical age of expansion? */
export const rising = (s: GameState, id: string) => { const w = RISERS[id]; return !!w && s.year >= w[0] && s.year <= w[1] && provsOf(s, id).length < RISER_MAX; };
// Years between AI declarations of war on the player, and how strong the attacker must be: see data/difficulty.ts.

export function aiArmyCap(s: GameState, n: Nation): number {
  const ps = provsOf(s, n.id).length;
  const bonus = (n.personality === 'expansionist' ? 2 : n.personality === 'cautious' ? 0 : 1) + (rising(s, n.id) ? 2 : 0);
  return Math.max(1, Math.round(2 + Math.sqrt(ps) * 2.6 + bonus + (s.year - 1453) / 100) + diff(s).aiArmy);
}

/** What the player can bring to bear on the border with `n`: the troops within reach of it and the walls there,
 *  never less than a quarter of the whole army (the rest can march back), plus a quarter of the allies' strength. */
export function playerGuard(s: GameState, n: string): number {
  const front = new Set<string>();
  for (const p of provsOf(s, s.player)) if (getGeo().adj[p.id].some(nb => s.provinces[nb].owner === n)) front.add(p.id);
  const near = new Set<number>();
  for (const id of front) for (const t of troopsNear(s, s.player, id)) near.add(t.uid);
  const local = armyPower(s.troops.filter(t => near.has(t.uid))) + [...front].reduce((a, id) => a + s.provinces[id].fort * 3, 0);
  return Math.max(local, playerPower(s) / 4) + alliesOf(s, s.player).reduce((a, x) => a + nationPower(s, x) * 0.25, 0);
}

export const nationPower = (s: GameState, n: string) => armyPower(s.nations[n].army) + provsOf(s, n).reduce((a, p) => a + p.fort * 3, 0);
export const playerPower = (s: GameState) =>
  armyPower(s.troops) + provsOf(s, s.player).reduce((a, p) => a + p.fort * 3, 0);
const powerOf = (s: GameState, n: string) => (n === s.player ? playerPower(s) : nationPower(s, n));

/** Balance levers: AI development a year (chance of +1) and how fast every crown's prestige fades. */
/** Provinces a realm needs for its wars to be news at the player's court. */
export const GREAT_POWER = 12;
export const AI_DEV_BASE = 0.14, AI_DEV_SIZE = 0.025, PRESTIGE_FADE = 0.03;

// ---------- a rival's works: a budget, not dice ----------
// Each year a realm sets labour aside for four kinds of work. When a whole unit is saved, the work is done and
// written in its record. The rates are what the dice used to give on average, so realms grow as fast as before,
// but steadily, and a player who reads a realm's page can see what it is about.
/** Ships laid down a year by a realm with a coast, room in its harbours and silver to spare. */
export const SHIP_RATE = 0.12;
/** Companies re-armed a year, for each company whose arms have been overtaken. */
export const ARMS_RATE = 0.05;
const hashOf = (t: string) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** How far a realm's pace on the land may lie from the common one, either way. When dice decided, luck spread
 *  realms about this much over three centuries (one in ten ended a tenth ahead or behind); without it no rival
 *  ever pulls ahead and the player's place in the ranking rises. The spread is now each realm's own nature. */
export const DILIGENCE_SPREAD = 0.17;
/** A realm's own pace, fixed for the whole game: from 1 − spread to 1 + spread, 1 on average. */
export const diligence = (id: string) => 1 - DILIGENCE_SPREAD + ((hashOf(id + 'diligence') % 1000) / 999) * 2 * DILIGENCE_SPREAD;
/** Works on the land a year: bigger realms a little faster, but far less than in proportion, so great empires do
 *  not win on size alone; merchants faster; each realm at its own pace; multiplied by the difficulty. */
export const landRate = (s: GameState, n: Nation) => (AI_DEV_BASE + AI_DEV_SIZE * Math.sqrt(provsOf(s, n.id).length) + (n.personality === 'merchant' ? 0.04 : 0)) * diligence(n.id) * diff(s).aiGrowth;
/** A realm's savings towards its works. They begin part-way, differently for each realm, so the world does not
 *  all build in the same year. */
export function worksOf(n: Nation) {
  return (n.work ??= { land: (hashOf(n.id + 'land') % 100) / 100, focus: (hashOf(n.id + 'focus') % 100) / 100, ships: (hashOf(n.id + 'ships') % 100) / 100, arms: (hashOf(n.id + 'arms') % 100) / 100 });
}
/** The land a realm can still improve, poorest first: the ceiling rises with the ages. */
const improvable = (s: GameState, n: Nation) => provsOf(s, n.id).filter(p => p.dev < 5 + ageIndex(s)).sort((x, y) => x.dev - y.dev || (x.id < y.id ? -1 : 1));
/** Years until a realm next improves its land, for the player's spies; null when it has none left to improve. */
export function yearsToLand(s: GameState, n: Nation): number | null {
  if (!improvable(s, n).length) return null;
  return Math.max(1, Math.ceil((1 - worksOf(n).land) / Math.max(0.01, landRate(s, n))));
}

export function aiEconomy(s: GameState, n: Nation) {
  const inc = incomeOf(s, n.id);
  n.gold = Math.min(n.gold + inc.total, 400 * inflation(s)); // crowns spend what they cannot store
  n.manpower = Math.min(manpowerMax(s, n.id), n.manpower + manpowerGain(s, n.id));
  for (const t of n.army) t.str = Math.min(100, t.str + 20);
  // the land: labour saved each year, and one of the four poorest provinces improved when there is enough
  const w = worksOf(n);
  w.land += landRate(s, n);
  if (w.land >= 1) {
    const low = improvable(s, n);
    if (low.length) { w.land -= 1; const p = low[hashOf(n.id + s.year) % Math.min(4, low.length)]; p.dev++; deed(s, n, `Improved the land of ${p.name}.`); }
    else w.land = 1; // nothing left to improve in this age: the labour waits, but does not pile up
  }
  if (n.gold < -20 && n.army.length) { n.army.splice(Math.floor(rand(s) * n.army.length), 1); n.gold += 10; }
  // recruit
  const cap = aiArmyCap(s, n);
  let tries = 2;
  while (tries-- > 0 && n.army.length < cap) {
    const pool = aiRecruitPool(s, n);
    if (!pool.length) break;
    const type = weightedPick(s, pool);
    const cost = 12 + 9 * TROOPS[type].tier;
    if (n.gold < cost + 10 || n.manpower < 2) break;
    n.gold -= cost; n.manpower -= 2;
    n.army.push({ uid: uid(s), type, vet: 0, str: 100 });
    deed(s, n, `Raised a company of ${TROOPS[type].name}.`);
  }
  // navy
  n.fleet ??= [];
  const coastal = provsOf(s, n.id).filter(p => getGeo().coastal[p.id]).length;
  if (coastal && n.fleet.length < 1 + Math.floor(coastal / 2) && n.gold > 45) {
    w.ships += SHIP_RATE;
    if (w.ships >= 1) {
      w.ships -= 1;
      const type = s.year >= 1650 ? 'man_of_war' : s.year >= 1545 ? 'galleon' : s.year >= 1490 && hashOf(n.id + s.year + 'hull') % 2 ? 'carrack' : 'galley';
      n.gold -= 30; n.fleet.push({ uid: uid(s), type, vet: 0, str: 100 });
      deed(s, n, `Launched a ${TROOPS[type].name.toLowerCase()}.`);
    }
  }
  for (const t of n.fleet) t.str = Math.min(100, t.str + 20);
  // upgrade old units
  const own = Object.values(groupDef(s, n.id).lines).flat();
  const upgradeOf = (type: string) => AI_UPGRADES.find(([from, to, y]) => from === type && s.year >= y && own.includes(to));
  const old = n.army.filter(t => upgradeOf(t.type));
  w.arms = old.length ? w.arms + ARMS_RATE * old.length : Math.min(w.arms, 1);
  for (const t of old) {
    if (w.arms < 1) break;
    w.arms -= 1;
    const up = upgradeOf(t.type)!;
    t.type = up[1]; deed(s, n, `Re-armed a company as ${TROOPS[up[1]].name}.`);
  }
  // slow growth
  // prestige
  n.prestige = n.prestige * (1 - PRESTIGE_FADE) + 0.3 + Math.sqrt(provsOf(s, n.id).length) * 0.35;
}

/** Every second year a realm does one thing in keeping with its temper. Small, real, and written in its record.
 *  `FOCUS_CHANCE` is the share of a work saved each year: at 0.5, one work every two years. If the realm cannot
 *  pay for it when its turn comes, the turn is lost, as it was when dice decided. */
export const FOCUS_CHANCE = 0.5, WALL_COST = 30;
/** What each temper's own work is, in words for the realm's page. */
export const FOCUS_WORK: Record<Personality, string> = { cautious: 'raises walls on a border', balanced: 'raises walls on a border', merchant: 'holds a great fair', zealot: 'endows a house of prayer', expansionist: 'musters its levies' };
function aiFocus(s: GameState, n: Nation) {
  const w = worksOf(n);
  w.focus += FOCUS_CHANCE;
  if (w.focus < 1) return;
  w.focus -= 1;
  if (n.personality === 'cautious' || n.personality === 'balanced') {
    const cap = maxFort(s);
    const border = provsOf(s, n.id).filter(p => p.fort < Math.min(cap, 2) && neighbours(p.id).some(nb => s.provinces[nb].owner !== n.id)).sort((a, b) => a.fort - b.fort || b.dev - a.dev)[0];
    if (border && n.gold >= WALL_COST * inflation(s) + 20) { n.gold -= WALL_COST * inflation(s); border.fort++; deed(s, n, `Strengthened the walls of ${border.name}.`); }
  } else if (n.personality === 'merchant') {
    n.gold += 10 * inflation(s); deed(s, n, 'Held a great fair.');
  } else if (n.personality === 'zealot') {
    n.prestige += 1; deed(s, n, 'Endowed a house of prayer.');
  } else {
    n.manpower = Math.min(manpowerMax(s, n.id), n.manpower + 2); deed(s, n, 'Mustered its levies.');
  }
}

function weightedPick(s: GameState, items: [string, number][]): string {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rand(s) * total;
  for (const [it, w] of items) if ((r -= w) <= 0) return it;
  return items[0][0];
}

function strongest(arr: TroopCard[], n: number): TroopCard[] {
  return [...arr].sort((a, b) => armyPower([b]) - armyPower([a])).slice(0, n);
}

/** Pick a province of `enemy` that `n` can reach. */
function pickTarget(s: GameState, n: string, enemy: string): string | null {
  const mine = provsOf(s, n).map(p => p.id);
  const cands = new Set<string>();
  for (const id of mine) for (const nb of neighbours(id)) if (s.provinces[nb].owner === enemy) cands.add(nb);
  if (!cands.size) return null;
  const list = [...cands].map(id => s.provinces[id]);
  list.sort((a, b) => (b.dev - b.fort * 1.5 + (b.core === n ? 3 : 0)) - (a.dev - a.fort * 1.5 + (a.core === n ? 3 : 0)));
  return rand(s) < 0.7 ? list[0].id : pick(s, list).id;
}

let attacksOnPlayer = 0;

/** Would this realm go to war with the player now? Past the years of peace and the gap between such wars,
 *  disliking the player enough, and stronger where they meet by the margin the difficulty asks. */
export function wantsPlayer(s: GameState, n: Nation): boolean {
  if (!n.alive || n.overlord || atWar(s, n.id, s.player) || inTruce(s, n.id, s.player) || hasTreaty(s, n.id, s.player, 'alliance') || hasTreaty(s, n.id, s.player, 'marriage') || s.nations[s.player].overlord === n.id) return false;
  if (s.year < s.startYear + diff(s).grace || (s.flags.ai_war_on_player ?? -99) + diff(s).warGap > s.year) return false;
  if (getRel(s, n.id, s.player) > (rising(s, n.id) ? -10 : -40)) return false;
  const t = threatOf(s, n.id);
  return t.theirs > t.needed;
}
/** What a realm can bring against the player, and what it would want before attacking. */
export function threatOf(s: GameState, id: string): { theirs: number; needed: number } {
  const friends = alliesOf(s, id).filter(a => getRel(s, a, s.player) < 0).reduce((a, x) => a + powerOf(s, x) * 0.5, 0);
  return { theirs: nationPower(s, id) + friends, needed: playerGuard(s, id) * diff(s).warEdge };
}
/** May this realm declare war on the player now? Only if it wants to and was seen gathering at least a year ago;
 *  the first time it wants to, the warning goes out instead and it waits. */
export function mayStrikePlayer(s: GameState, n: Nation): boolean {
  if (!wantsPlayer(s, n)) return false;
  if (warned(s, n.id)) return true;
  if (!warnedNow(s, n.id)) { markWarned(s, n.id); later(s, 'war_warning', 0, 0, { nation: n.id }); }
  return false;
}
const neighboursPlayer = (s: GameState, id: string) => provsOf(s, id).some(p => neighbours(p.id).some(nb => s.provinces[nb].owner === s.player));

function aiWar(s: GameState, n: Nation) {
  // attack enemies
  for (const e of enemiesOf(s, n.id)) {
    if (!s.nations[e]?.alive) continue;
    const revolt = n.id === s.revolution?.rebel; // the other side of a revolution fights hard
    const rise = rising(s, n.id);
    if (!n.army.length || rand(s) > (revolt ? 0.8 : rise ? 0.6 : 0.4)) continue;
    // a casual game: a crown on its last legs is rarely hunted down
    if (e === s.player && !revolt && provsOf(s, s.player).length <= 3 && rand(s) < diff(s).mercy) continue;
    const target = pickTarget(s, n.id, e);
    if (!target) continue;
    const prov = s.provinces[target];
    if (e === s.player) {
      // only the armies standing within a quarter's march can strike, and the player sees them coming
      const near = strongest(troopsNear(s, n.id, target).filter(t => t.str > 40), GENERIC_COMMAND + (s.nations[n.id].ruler.skill >= 5 ? 2 : 0));
      if (!near.length || attacksOnPlayer >= (revolt ? 2 : 1) || s.incoming?.some(x => x.nation === n.id)) continue;
      attacksOnPlayer++;
      announceAttack(s, n.id, target, near);
      continue;
    }
    const force = strongest(n.army.filter(t => t.str > 40), rise ? 8 : 6);
    if (!force.length) continue;
    {
      const defNat = s.nations[e];
      const att = makeSide(n.id, toBattleUnits(force), genericGeneral(s), 0, false);
      const def = makeSide(e, toBattleUnits(strongest(defNat.army, 6)), genericGeneral(s), prov.fort, false);
      const b = createBattle(s, att, def, target, 'conquer');
      autoResolve(s, b);
      const before = prov.owner;
      finishBattle(s, b);
      if (prov.owner !== before && (before === s.player || hasTreaty(s, s.player, before, 'alliance') || hasTreaty(s, s.player, n.id, 'alliance'))) {
        log(s, `${n.name} takes ${prov.name} from ${nationName(s, before)}.`, 'neutral');
      }
    }
  }
}

function launchAttackOnPlayer(s: GameState, n: Nation, force: TroopCard[], target: string) {
  const byLand = provsOf(s, n.id).some(p => getGeo().adj[p.id].includes(target));
  const home = s.fleet.filter(t => t.mission == null && t.str > 20);
  if (!byLand && home.length && (n.fleet ?? []).length) {
    const adm = s.characters.filter(c => c.role === 'admiral' && c.mission == null).sort((a, b) => b.skill - a.skill)[0];
    const att = makeSide(n.id, toBattleUnits(strongest(n.fleet, 6)), genericGeneral(s), 0, false);
    const def = makeSide(s.player, toBattleUnits(strongest(home, 8)), adm ? { name: adm.name, skill: adm.skill, traits: adm.traits, uid: adm.uid, mult: traitMult(adm) } : null, 0, true);
    push(s, { kind: 'battle', battle: createBattle(s, att, def, target, 'sea', undefined, { naval: true, follow: { type: 'land-defend', nation: n.id, force: force.map(t => t.uid) } }) });
    return;
  }
  landDefence(s, n.id, force.map(t => t.uid), target);
}

/** An enemy army lands or marches on one of your provinces. */
export function landDefence(s: GameState, nationId: string, forceUids: number[], target: string) {
  const n = s.nations[nationId];
  const force = n.army.filter(t => forceUids.includes(t.uid));
  if (!force.length) return;
  const prov = s.provinces[target];
  const home = s.troops.filter(t => t.mission == null && t.str > 0);
  const lastStand = provsOf(s, s.player).length <= 3 || target === player(s).capital;
  const gen = s.characters.filter(c => c.role === 'general' && c.mission == null).sort((a, b) => b.skill - a.skill)[0];
  const defenders = strongest(home, gen ? commandOf(gen.skill) : GENERIC_COMMAND);
  const att = makeSide(n.id, toBattleUnits(force), genericGeneral(s), 0, false);
  const militia = lastStand ? [0, 1].map(i => ({ uid: -300 - i, type: 'levy', vet: 1, str: 100, start: 100, garrison: true })) : [];
  const def = makeSide(s.player, [...toBattleUnits(defenders), ...militia], gen ? { name: gen.name, skill: gen.skill, traits: gen.traits, uid: gen.uid, mult: traitMult(gen) } : null, prov.fort + (lastStand ? 1 : 0), true);
  if (!def.units.length) {
    // nothing defends it: it falls
    const b = createBattle(s, att, def, target, 'defend');
    b.done = true; b.winner = 'att';
    const out = finishBattle(s, b);
    push(s, { kind: 'reveal', title: out.title, subtitle: `${n.name} marches in unopposed`, items: [{ title: prov.name, text: out.lines.join(' '), tone: 'bad', kind: 'sword' }] });
    return;
  }
  const b = createBattle(s, att, def, target, 'defend');
  push(s, { kind: 'battle', battle: b });
}

function aiDiplomacy(s: GameState, n: Nation) {
  // peace between AIs
  for (const w of s.wars.filter(w => (w.a === n.id || w.b === n.id))) {
    const other = w.a === n.id ? w.b : w.a;
    if (other === s.player) {
      if (n.id === s.revolution?.rebel) continue; // a revolution ends only by arms
      const theyWin = -warScore(s, n.id) > 30 || provsOf(s, s.player).length <= 3;
      if (s.year - w.since >= (theyWin ? 2 : 3) && rand(s) < (theyWin ? 0.35 : 0.12) && !s.queue.some(q => q.kind === 'peace' && q.enemy === n.id)) {
        push(s, { kind: 'peace', enemy: n.id, offered: true });
      }
      continue;
    }
    if (n.id < other && s.year - w.since >= 2) {
      const lead = (w.a === n.id ? 1 : -1) * (w.gainsA - w.gainsB); // provinces taken by n, net
      const winner = lead > 0 ? n.id : lead < 0 ? other : '';
      const holdOut = winner && rising(s, winner) && s.year - w.since < 8;
      if (rand(s) < (holdOut ? 0.08 : 0.2)) makePeace(s, n.id, other);
    }
  }
  // declare war
  const atWarCount = enemiesOf(s, n.id).length;
  if (atWarCount > 0 || n.overlord) return;
  // a realm that has been seen gathering against the player, and still wants the war a year later, goes to it
  const bent = wantsPlayer(s, n) && warned(s, n.id) && neighboursPlayer(s, n.id);
  const base = { expansionist: 0.07, zealot: 0.05, balanced: 0.035, merchant: 0.02, cautious: 0.012 }[n.personality];
  const size = provsOf(s, n.id).length;
  const rise = rising(s, n.id);
  // great powers still go to war, just less eagerly; a realm in its age of conquest more so
  if (!bent && rand(s) > (rise ? Math.max(base, 0.06) * 1.5 / (1 + size / 40) : base / (1 + size / 20))) return;
  const neigh = new Set<string>();
  for (const p of provsOf(s, n.id)) for (const nb of neighbours(p.id)) { const o = s.provinces[nb].owner; if (o !== n.id) neigh.add(o); }
  const myPow = nationPower(s, n.id);
  const options = [...neigh].filter(t => {
    if (!s.nations[t]?.alive || inTruce(s, n.id, t) || hasTreaty(s, n.id, t, 'alliance') || hasTreaty(s, n.id, t, 'marriage')) return false;
    if (s.nations[t].overlord === n.id || n.overlord === t) return false;
    const rel = getRel(s, n.id, t);
    if (t === s.player) {
      // the player is attacked now and then: by a neighbour that hates it and is clearly stronger where they meet.
      // No such war comes unannounced: the first time a realm wants it, the player is warned and it waits a year.
      return mayStrikePlayer(s, n);
    }
    if (rel > (rise ? 30 : n.personality === 'expansionist' ? 15 : -10)) return false;
    const theirPow = powerOf(s, t) + alliesOf(s, t).reduce((a, x) => a + powerOf(s, x) * 0.5, 0);
    return myPow > theirPow * (rise ? 1.0 : 1.25);
  });
  if (!options.length) return;
  // what the realm wants weighs more than what merely lies near; a realm bent on the player goes for the player
  const goal = goalOf(s, n.id);
  const t = bent && options.includes(s.player) ? s.player : pick(s, options.flatMap(o => (o === goal ? Array<string>(GOAL_WEIGHT).fill(o) : [o])));
  declareWar(s, n.id, t);
  deed(s, n, `Declared war on ${nationName(s, t)}.`);
  if (t !== s.player && size >= GREAT_POWER && provsOf(s, t).length >= GREAT_POWER) dispatch(s, n.id, `${n.name} has declared war on ${nationName(s, t)}.`);
  if (t === s.player) {
    s.flags.ai_war_on_player = s.year;
    log(s, `${n.name} declares war on you!`, 'bad');
    // the player's allies may be asked to help: AI allies simply join
    const joined: string[] = [];
    for (const ally of alliesOf(s, s.player)) {
      if (!atWar(s, ally, n.id) && rand(s) < 0.7) { declareWar(s, ally, n.id); joined.push(nationName(s, ally)); log(s, `Your ally ${nationName(s, ally)} joins the war.`, 'good'); }
    }
    const theirs = s.wars.filter(w => (w.a === s.player || w.b === s.player) && w.since === s.year).map(w => (w.a === s.player ? w.b : w.a)).filter(x => x !== n.id && !joined.includes(nationName(s, x)));
    const items: RevealItem[] = [{ title: `${n.adj} heralds arrive`, text: `${n.name} has declared war on you. Expect attacks on your border provinces within months: keep troops in your garrisons to defend them. You received March Orders to strike back.`, tone: 'bad', kind: 'sword' }];
    if (theirs.length) items.push({ title: 'Their friends join them', text: `${theirs.map(x => nationName(s, x)).join(', ')} ${theirs.length > 1 ? 'are' : 'is'} at war with you too.`, tone: 'bad', kind: 'banner' });
    if (joined.length) items.push({ title: 'Your allies stand by you', text: `${joined.join(', ')} ${joined.length > 1 ? 'join' : 'joins'} the war on your side.`, tone: 'good', kind: 'shield' });
    push(s, { kind: 'reveal', alarm: true, title: 'War!', subtitle: `${n.name} declares war on you`, items });
  } else if (alliesOf(s, t).includes(s.player)) {
    push(s, { kind: 'event', eventId: 'call_to_arms', vars: { attacker: n.id, ally: t } });
  }
}

/** AI crowns make friends against common rivals, and give up old friendships that turned sour. */
function aiAlliances(s: GameState, n: Nation) {
  const mine = alliesOf(s, n.id).filter(a => a !== s.player);
  for (const a of mine) if (getRel(s, n.id, a) < -20 && rand(s) < 0.2) { s.treaties = s.treaties.filter(t => !(t.kind === 'alliance' && ((t.a === n.id && t.b === a) || (t.b === n.id && t.a === a)))); return; }
  if (mine.length >= 3 || n.overlord || rand(s) > 0.04) return;
  const rivals = Object.values(s.nations).filter(x => x.alive && getRel(s, n.id, x.id) <= -30).map(x => x.id);
  const enemies = enemiesOf(s, n.id);
  const cands = Object.values(s.nations).filter(x => x.alive && x.id !== n.id && x.id !== s.player && !x.overlord && !atWar(s, n.id, x.id) && !hasTreaty(s, n.id, x.id, 'alliance')
    && getRel(s, n.id, x.id) > -10 && (getRel(s, n.id, x.id) >= 30 || enemies.some(e => atWar(s, x.id, e)) || rivals.some(r => getRel(s, x.id, r) <= -30)));
  if (!cands.length) return;
  const x = pick(s, cands);
  addTreaty(s, n.id, x.id, 'alliance');
  addRel(s, n.id, x.id, 15);
  if (alliesOf(s, s.player).includes(x.id) || alliesOf(s, s.player).includes(n.id)) log(s, `${n.name} and ${x.name} sign an alliance.`, 'neutral');
}

/** Conquered lands in AI empires sometimes rise and go back to their old crown; fallen crowns can return. */
function aiRebellions(s: GameState) {
  for (const p of Object.values(s.provinces)) {
    if (p.owner === s.player || p.owner === p.core) continue;
    const owner = s.nations[p.owner];
    if (!owner || owner.overlord) continue;
    const size = provsOf(s, p.owner).length;
    if (size <= 2 || p.id === owner.capital) continue;
    // conquests mostly hold, so the map changes over the centuries; a realm in its age of conquest holds them better
    if (rand(s) > (0.004 + Math.max(0, size - 8) * 0.001) * (rising(s, owner.id) ? 0.5 : 1)) continue;
    const old = s.nations[p.core];
    if (!old || old.id === s.player || old.id === NO_STATE) continue;
    if (!old.alive) {
      old.alive = true; old.capital = p.id; old.gold = 30; old.stability = 0;
      old.army = [{ uid: uid(s), type: 'levy', vet: 0, str: 100 }, { uid: uid(s), type: 'levy', vet: 0, str: 100 }]; old.fleet = [];
    }
    const from = p.owner;
    p.owner = p.core; p.control = 50;
    s.truces.push({ a: from, b: p.core, until: s.year + 5 });
    if (hasTreaty(s, s.player, from, 'alliance') || hasTreaty(s, s.player, p.core, 'alliance')) log(s, `${p.name} rises against ${nationName(s, from)} and returns to ${nationName(s, p.core)}.`, 'neutral');
  }
}

/** Small crowns next to a much stronger conqueror bow to it as vassals; after a generation a small vassal is
 *  absorbed (its land keeps its old core, so it can rise again later); vassals of the start dates are left alone. No realm takes more than 3 vassals,
 *  and the very largest take none, so no one swallows the world this way. */
function aiVassals(s: GameState) {
  for (const x of Object.values(s.nations)) {
    if (!x.alive || x.id === s.player || x.id === NO_STATE || x.id === 'papacy' || s.revolution?.rebel === x.id) continue;
    const mine = provsOf(s, x.id);
    if (x.overlord) {
      const lord = s.nations[x.overlord];
      if (!s.flags['bowed_' + x.id] || !lord?.alive || lord.id === s.player || mine.length > 3 || s.year - (x.subjectSince ?? s.year) < 20 || rand(s) > 0.05) continue;
      for (const p of mine) { p.owner = lord.id; p.control = Math.min(p.control, 50); delete p.occupiedFrom; }
      lord.army.push(...x.army.slice(0, 2));
      x.alive = false; x.army = []; x.fleet = []; delete x.overlord; delete x.subject; delete s.flags['bowed_' + x.id];
      s.wars = s.wars.filter(w => w.a !== x.id && w.b !== x.id);
      s.treaties = s.treaties.filter(t => t.a !== x.id && t.b !== x.id);
      log(s, `${x.name} is absorbed by ${lord.name}.`, 'neutral');
      continue;
    }
    if (mine.length > 2 || enemiesOf(s, x.id).length || alliesOf(s, x.id).includes(s.player) || subjectsOf(s, x.id).length || rand(s) > 0.04) continue;
    const xp = nationPower(s, x.id);
    const near = new Set<string>();
    for (const p of mine) for (const nb of getGeo().adj[p.id]) near.add(s.provinces[nb].owner);
    const lords = [...near].map(id => s.nations[id]).filter(b => b?.alive && b.id !== x.id && b.id !== s.player && b.id !== NO_STATE && !b.overlord
      && (b.personality === 'expansionist' || rising(s, b.id)) && provsOf(s, b.id).length <= 60 && provsOf(s, b.id).length >= 6
      && subjectsOf(s, b.id).length < 3 && !atWar(s, b.id, s.player) && getRel(s, x.id, b.id) > -60 && nationPower(s, b.id) > xp * 3.5);
    if (!lords.length) continue;
    const b = pick(s, lords);
    makeSubject(s, x.id, 'vassal', b.id);
    s.flags['bowed_' + x.id] = 1; // only crowns that bowed this way are absorbed later
    log(s, `${x.name} bows to ${b.name} and becomes its vassal.`, 'neutral');
  }
}

/** Which quarter of the year a realm acts in: spreads the world's moves over the year. */
export const aiQuarter = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 4; };

/** One quarter of AI play. Every realm runs its yearly turn in its own quarter; world upkeep runs at year end. */
export function runAI(s: GameState, q = 3) {
  if (q === 0) attacksOnPlayer = 0;
  if (q === 3) { aiRebellions(s); aiOverseas(s); aiVassals(s); }
  if (q === 0) { // a dead realm cannot be at war, and old occupations of finished wars are forgotten
    s.wars = s.wars.filter(w => s.nations[w.a]?.alive && s.nations[w.b]?.alive);
    for (const p of Object.values(s.provinces)) if (p.occupiedFrom && !(s.nations[p.occupiedFrom]?.alive && s.wars.some(w => (w.a === p.owner && w.b === p.occupiedFrom) || (w.b === p.owner && w.a === p.occupiedFrom)))) delete p.occupiedFrom;
  }
  revealBorders(s);
  const ids = Object.keys(s.nations).filter(id => id !== s.player && s.nations[id].alive && aiQuarter(id) === q);
  ids.sort(() => rand(s) - 0.5);
  for (const id of ids) {
    const n = s.nations[id];
    if (!n.alive || !provsOf(s, id).length) continue; // no land left: waits for the peace table
    aiEconomy(s, n);
    aiFocus(s, n);
    yearlyGoals(s, n);
    aiDiplomacy(s, n);
    aiAlliances(s, n);
    aiRedeploy(s, n.id);
    if (n.alive) aiWar(s, n);
  }
  if (q !== 3) return;
  // the conquests of a rising realm alarm its neighbours less (its infamy fades faster), so it is not
  // always broken by a coalition at the start of its climb
  for (const id of Object.keys(RISERS)) if (id !== s.player && s.flags['ae_' + id] && rising(s, id)) s.flags['ae_' + id] *= 0.85;
  // fear of the strong: everyone grows wary of large realms
  for (const big of Object.values(s.nations)) {
    if (!big.alive || provsOf(s, big.id).length < 12) continue;
    for (const o of Object.values(s.nations)) if (o.alive && o.id !== big.id && o.id !== s.player) addRel(s, o.id, big.id, -2);
  }
  // relation drift
  for (const k of Object.keys(s.rel)) {
    const v = s.rel[k];
    if (v > 0) s.rel[k] = v - 1; else if (v < 0 && chance(s, 0.5)) s.rel[k] = v + 1;
  }
  for (const t of s.treaties) if (t.kind === 'marriage') addRel(s, t.a, t.b, 3);
  for (const w of s.wars) { void w; }
  s.truces = s.truces.filter(t => t.until > s.year);
  void clamp; void atWar; void findWar; void player;
}
