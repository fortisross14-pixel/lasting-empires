// AI nations: economy, recruiting, upgrades, war and peace.
import type { GameState, Nation, TroopCard } from '../types';
import { TROOPS } from '../data/troops';
import {
  rand, pick, uid, clamp, provsOf, incomeOf, manpowerGain, manpowerMax, getRel, addRel, atWar, findWar,
  declareWar, makePeace, inTruce, hasTreaty, addTreaty, alliesOf, enemiesOf, armyPower, log, push, nationName, player, chance, traitMult,
} from './core';
import { neighbours } from './map';
import { aiOverseas, revealBorders } from './overseas';
import { NO_STATE } from '../data/nations';
import { getGeo } from './map';
import { warScore } from './diplo';
import { createBattle, makeSide, toBattleUnits, genericGeneral, autoResolve, finishBattle } from './battle';

// When AI nations get each troop type (they lag behind the player's research a little).
const AI_UPGRADES: [string, string, number][] = [
  ['levy', 'pikemen', 1470], ['men_at_arms', 'pikemen', 1475], ['crossbow', 'arquebusiers', 1485],
  ['bombard', 'field_cannon', 1495], ['pikemen', 'tercio', 1518], ['jinetes', 'reiters', 1540],
  ['knights', 'cuirassiers', 1550], ['arquebusiers', 'musketeers', 1552], ['tercio', 'old_tercio', 1565],
  ['reiters', 'dragoons', 1615], ['musketeers', 'line_infantry', 1685], ['old_tercio', 'line_infantry', 1695],
];

function aiRecruitPool(year: number): [string, number][] {
  const pool: [string, number][] = [['levy', 3], ['crossbow', 2], ['jinetes', 1.5], ['men_at_arms', 1.5], ['knights', 0.7], ['bombard', 0.4]];
  if (year >= 1465) pool.push(['pikemen', 2]);
  if (year >= 1478) pool.push(['arquebusiers', 2]);
  if (year >= 1510) pool.push(['tercio', 0.8]);
  if (year >= 1545) pool.push(['musketeers', 1.5]);
  if (year >= 1600) pool.push(['dragoons', 0.6]);
  if (year >= 1675) pool.push(['line_infantry', 1.5]);
  return pool;
}

export function aiArmyCap(s: GameState, n: Nation): number {
  const ps = provsOf(s, n.id).length;
  const bonus = n.personality === 'expansionist' ? 2 : n.personality === 'cautious' ? 0 : 1;
  return Math.round(2 + Math.sqrt(ps) * 2.6 + bonus + (s.year - 1453) / 100);
}

export const nationPower = (s: GameState, n: string) => armyPower(s.nations[n].army) + provsOf(s, n).reduce((a, p) => a + p.fort * 3, 0);
export const playerPower = (s: GameState) =>
  armyPower(s.troops) + provsOf(s, s.player).reduce((a, p) => a + p.fort * 3, 0);
const powerOf = (s: GameState, n: string) => (n === s.player ? playerPower(s) : nationPower(s, n));

function aiEconomy(s: GameState, n: Nation) {
  const inc = incomeOf(s, n.id);
  n.gold += inc.total;
  n.manpower = Math.min(manpowerMax(s, n.id), n.manpower + manpowerGain(s, n.id));
  for (const t of n.army) t.str = Math.min(100, t.str + 20);
  // AI realms slowly develop their land, the way a player would
  // the same pace for every realm, so great empires do not outgrow everyone on size alone
  if (rand(s) < 0.2 + (n.personality === 'merchant' ? 0.06 : 0)) {
    const low = provsOf(s, n.id).filter(p => p.dev < 8).sort((x, y) => x.dev - y.dev);
    if (low.length) low[Math.floor(rand(s) * Math.min(4, low.length))].dev++;
  }
  if (n.gold < -20 && n.army.length) { n.army.splice(Math.floor(rand(s) * n.army.length), 1); n.gold += 10; }
  // recruit
  const cap = aiArmyCap(s, n);
  let tries = 2;
  while (tries-- > 0 && n.army.length < cap) {
    const type = weightedPick(s, aiRecruitPool(s.year));
    const cost = 12 + 9 * TROOPS[type].tier;
    if (n.gold < cost + 10 || n.manpower < 2) break;
    n.gold -= cost; n.manpower -= 2;
    n.army.push({ uid: uid(s), type, vet: 0, str: 100 });
  }
  // navy
  n.fleet ??= [];
  const coastal = provsOf(s, n.id).filter(p => getGeo().coastal[p.id]).length;
  if (coastal && n.fleet.length < 1 + Math.floor(coastal / 2) && n.gold > 45 && rand(s) < 0.12) {
    const type = s.year >= 1650 ? 'man_of_war' : s.year >= 1545 ? 'galleon' : s.year >= 1490 && rand(s) < 0.5 ? 'carrack' : 'galley';
    n.gold -= 30; n.fleet.push({ uid: uid(s), type, vet: 0, str: 100 });
  }
  for (const t of n.fleet) t.str = Math.min(100, t.str + 20);
  // upgrade old units
  for (const t of n.army) {
    if (rand(s) > 0.05) continue;
    const up = AI_UPGRADES.find(([from, , y]) => from === t.type && s.year >= y);
    if (up) t.type = up[1];
  }
  // slow growth
  // prestige
  n.prestige = n.prestige * 0.985 + 0.5 + Math.sqrt(provsOf(s, n.id).length) * 0.6;
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

function aiWar(s: GameState, n: Nation) {
  // attack enemies
  for (const e of enemiesOf(s, n.id)) {
    if (!s.nations[e]?.alive) continue;
    if (!n.army.length || rand(s) > 0.4) continue;
    // a casual game: a crown on its last legs is rarely hunted down
    if (e === s.player && provsOf(s, s.player).length <= 3 && rand(s) < 0.7) continue;
    const target = pickTarget(s, n.id, e);
    if (!target) continue;
    const prov = s.provinces[target];
    const force = strongest(n.army.filter(t => t.str > 40), 6);
    if (!force.length) continue;
    if (e === s.player) {
      if (attacksOnPlayer >= 1) continue;
      attacksOnPlayer++;
      launchAttackOnPlayer(s, n, force, target);
    } else {
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
  const defenders = strongest(home, 8);
  const gen = s.characters.filter(c => c.role === 'general' && c.mission == null).sort((a, b) => b.skill - a.skill)[0];
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
      const theyWin = -warScore(s, n.id) > 30 || provsOf(s, s.player).length <= 3;
      if (s.year - w.since >= (theyWin ? 2 : 3) && rand(s) < (theyWin ? 0.35 : 0.12) && !s.queue.some(q => q.kind === 'peace' && q.enemy === n.id)) {
        push(s, { kind: 'peace', enemy: n.id, offered: true });
      }
      continue;
    }
    if (n.id < other && s.year - w.since >= 2 && rand(s) < 0.2) makePeace(s, n.id, other);
  }
  // declare war
  const atWarCount = enemiesOf(s, n.id).length;
  if (atWarCount > 0 || n.overlord) return;
  const base = { expansionist: 0.07, zealot: 0.05, balanced: 0.035, merchant: 0.02, cautious: 0.012 }[n.personality];
  const size = provsOf(s, n.id).length;
  if (rand(s) > base / (1 + size / 8)) return;
  const neigh = new Set<string>();
  for (const p of provsOf(s, n.id)) for (const nb of neighbours(p.id)) { const o = s.provinces[nb].owner; if (o !== n.id) neigh.add(o); }
  const myPow = nationPower(s, n.id);
  const options = [...neigh].filter(t => {
    if (!s.nations[t]?.alive || inTruce(s, n.id, t) || hasTreaty(s, n.id, t, 'alliance') || hasTreaty(s, n.id, t, 'marriage')) return false;
    if (s.nations[t].overlord === n.id || n.overlord === t) return false;
    if (t === s.player && s.year < s.startYear + 10) return false;
    const rel = getRel(s, n.id, t);
    if (rel > (n.personality === 'expansionist' ? 15 : -10)) return false;
    const theirPow = powerOf(s, t) + alliesOf(s, t).reduce((a, x) => a + powerOf(s, x) * 0.5, 0);
    return myPow > theirPow * (t === s.player ? 1.5 : 1.25);
  });
  if (!options.length) return;
  const t = pick(s, options);
  declareWar(s, n.id, t);
  if (t === s.player) {
    push(s, { kind: 'reveal', title: 'War!', subtitle: `${n.name} declares war on you`, items: [{ title: `${n.adj} heralds arrive`, text: `${n.name} has declared war. Expect attacks on your border provinces. Keep troops at home to defend them.`, tone: 'bad', kind: 'sword' }] });
    log(s, `${n.name} declares war on you!`, 'bad');
    // the player's allies may be asked to help: AI allies simply join
    for (const ally of alliesOf(s, s.player)) {
      if (!atWar(s, ally, n.id) && rand(s) < 0.7) { declareWar(s, ally, n.id); log(s, `Your ally ${nationName(s, ally)} joins the war.`, 'good'); }
    }
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
    if (rand(s) > 0.008 + Math.max(0, size - 8) * 0.0025) continue;
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

export function runAI(s: GameState) {
  aiRebellions(s);
  attacksOnPlayer = 0;
  aiOverseas(s);
  revealBorders(s);
  const ids = Object.keys(s.nations).filter(id => id !== s.player && s.nations[id].alive);
  ids.sort(() => rand(s) - 0.5);
  for (const id of ids) {
    const n = s.nations[id];
    if (!n.alive) continue;
    aiEconomy(s, n);
    aiDiplomacy(s, n);
    aiAlliances(s, n);
    if (n.alive) aiWar(s, n);
  }
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
