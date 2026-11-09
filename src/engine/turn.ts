// New game setup, the yearly turn, and player actions that touch several systems.
import type { GameState, Nation, Ruler, RevealItem } from '../types';
import { NATIONS, START_REL, RULERS, RULER_TRAITS, RULER_NAMES } from '../data/nations';
import { PROVINCES } from '../data/geo';
import { EQUIPMENT } from '../data/troops';
import {
  rand, pick, randInt, uid, clamp, player, provsOf, incomeOf, manpowerGain, manpowerMax, log, push, addRel,
  addTreaty, rulerMod, hasTech, genCharacter, declareWar, nationName, atWar, getRel,
} from './core';
import { STARTING_DECK, shuffle, drawCard, addToHand } from './cards';
import { advanceMissions } from './missions';
import { runAI } from './ai';
import { rollEvents, EVENT } from './events';
import { AMBITIONS, ambitionOptions } from './drafts';

export const SAVE_VERSION = 1;

function makeRuler(s: GameState, nation: string, year: number): Ruler {
  const list = RULERS[nation] ?? [];
  const hist = list.find(r => r.from <= year && r.to > year);
  if (hist && !(nation === 'castile' && s.flags.juana && hist.from >= 1474 && hist.from < 1516)) return { ...hist };
  if (nation === 'castile' && s.flags.juana && year >= 1474 && year < 1504) {
    return { name: 'Juana I and Afonso', traits: ['Weak', 'Fortunate'], from: 1474, to: 1500 };
  }
  const culture = s.nations[nation]?.culture ?? 'castilian';
  const names = RULER_NAMES[culture] ?? RULER_NAMES.castilian;
  const base = pick(s, names);
  const count = (s.flags['regnal_' + base] = (s.flags['regnal_' + base] ?? randInt(s, 1, 3)) + 1);
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][Math.min(10, count - 1)];
  const traitIds = Object.keys(RULER_TRAITS);
  const traits = [pick(s, traitIds)];
  if (rand(s) < 0.4) { const t = pick(s, traitIds); if (!traits.includes(t)) traits.push(t); }
  return { name: `${base} ${roman}`, traits, from: year, to: year + randInt(s, traits.includes('Sickly') ? 3 : 10, 35) };
}

export function newGame(nationId: string, seed = Math.floor(Math.random() * 1e9)): GameState {
  const s: GameState = {
    version: SAVE_VERSION, seed, rng: seed, nextUid: 1, year: 1453, startYear: 1453, endYear: 1750, player: nationId,
    nations: {}, provinces: {}, rel: {}, treaties: [], wars: [], truces: [], hand: [], deck: [], discard: [],
    troops: [], equipment: [], characters: [], missions: [], techs: [], firedEvents: [], usedLegends: [], queue: [],
    log: [], flags: {}, ambition: null, ambitionDone: false, draftsThisTurn: 0, over: false,
  };
  for (const d of NATIONS) {
    const n: Nation = {
      id: d.id, name: d.name, adj: d.adj, color: d.color, culture: d.culture, capital: d.capital, gold: d.gold,
      manpower: 10, stability: 1, prestige: 0, personality: d.personality, alive: true,
      army: d.id === nationId ? [] : d.army.map(type => ({ uid: s.nextUid++, type, vet: 0, str: 100 })),
      ruler: { name: '', traits: [], from: 1453, to: 1453 },
    };
    s.nations[d.id] = n;
  }
  for (const n of Object.values(s.nations)) n.ruler = makeRuler(s, n.id, 1453);
  for (const [id, name, owner, dev, fort, land, lon, lat] of PROVINCES) {
    s.provinces[id] = { id, name, owner, core: owner, dev, fort, buildings: [], land, lon, lat, unrest: 0 };
  }
  for (const [a, b, v] of START_REL) addRel(s, a, b, v);
  addTreaty(s, 'aragon', 'naples', 'alliance');
  addTreaty(s, 'castile', 'france', 'alliance');
  addTreaty(s, 'milan', 'florence', 'alliance');
  addTreaty(s, 'granada', 'morocco', 'alliance');
  addTreaty(s, 'venice', 'florence', 'trade');
  addTreaty(s, 'genoa', 'castile', 'trade');
  declareWar(s, 'castile', 'granada'); // the frontier war of the Reconquista simmers on
  if (nationId !== 'castile') { s.wars = s.wars.filter(w => !(w.a === 'castile' && w.b === 'granada')); }

  const me = player(s);
  const def = NATIONS.find(d => d.id === nationId)!;
  me.manpower = 14;
  s.troops = def.army.map(type => ({ uid: uid(s), type, vet: 0, str: 100 }));
  s.equipment = [{ uid: uid(s), type: 'plate' }];
  s.characters = [
    genCharacter(s, 'general', me.culture, 1),
    genCharacter(s, 'diplomat', me.culture, 1),
    genCharacter(s, 'admin', me.culture, 1),
  ];
  if (nationId === 'portugal' && !s.usedLegends.includes('henry')) {
    s.usedLegends.push('henry');
    s.characters.push({ uid: uid(s), name: 'Henrique, the Navigator', role: 'admin', skill: 6, traits: ['explorer', 'scholar'], born: 1394, dies: 1460, rarity: 'legendary', xp: 0, legendId: 'henry' });
  }
  s.deck = [...STARTING_DECK];
  shuffle(s, s.deck);
  for (let i = 0; i < 4; i++) drawCard(s);
  push(s, { kind: 'draft', draft: 'ambition', options: ambitionOptions(s) });
  rollEvents(s);
  log(s, `${me.ruler.name} rules ${me.name}. The year is 1453.`);
  return s;
}

function successionCheck(s: GameState) {
  const me = player(s);
  if (s.year < me.ruler.to) return;
  const old = me.ruler.name;
  me.ruler = makeRuler(s, s.player, s.year);
  const items: RevealItem[] = [];
  let st = 0;
  for (const t of me.ruler.traits) st += RULER_TRAITS[t]?.stab ?? 0;
  if (st) me.stability = clamp(me.stability + st, -3, 3);
  if (me.ruler.traits.includes('Magnanimous')) for (const n of Object.keys(s.nations)) if (n !== s.player) addRel(s, s.player, n, 10);
  for (const t of me.ruler.traits) items.push({ title: t, text: RULER_TRAITS[t]?.desc ?? '', tone: (RULER_TRAITS[t]?.stab ?? 0) < 0 || ['Weak', 'Idle', 'Sickly', 'Unstable'].includes(t) ? 'bad' : 'good', kind: 'crown' });
  push(s, { kind: 'reveal', title: `${old} is dead. Long live ${me.ruler.name}!`, subtitle: 'A new monarch takes the throne', items });
  log(s, `${me.ruler.name} takes the throne.`);
  for (const n of Object.values(s.nations)) if (n.id !== s.player && s.year >= n.ruler.to) n.ruler = makeRuler(s, n.id, s.year);
}

function characterAging(s: GameState) {
  for (const c of [...s.characters]) {
    if (s.year < c.dies) continue;
    s.characters = s.characters.filter(x => x.uid !== c.uid);
    let extra = '';
    if (c.mission != null) {
      const m = s.missions.find(x => x.id === c.mission);
      if (m) {
        for (const t of s.troops) if (t.mission === m.id) delete t.mission;
        s.missions = s.missions.filter(x => x.id !== m.id);
        extra = ' Their mission is abandoned.';
      }
    }
    const verb = c.rarity === 'legendary' ? 'leaves the stage of history' : rand(s) < 0.5 ? 'has died' : 'retires from court';
    push(s, { kind: 'reveal', title: `${c.name} ${verb}`, items: [{ title: c.name, text: `Your ${c.role} is gone.${extra}`, tone: 'bad', kind: 'skull' }] });
    log(s, `${c.name} ${verb}.`, 'bad');
  }
}

function playerEconomy(s: GameState) {
  const me = player(s);
  const inc = incomeOf(s, s.player);
  me.gold += inc.total;
  me.manpower = Math.min(manpowerMax(s, s.player), me.manpower + manpowerGain(s, s.player));
  // troops at home recover strength
  for (const t of s.troops) {
    if (t.mission != null || t.str >= 100) continue;
    const add = Math.min(100 - t.str, 20);
    const mp = add / 25;
    if (me.manpower >= mp) { t.str += add; me.manpower -= mp; }
  }
  // armouries
  for (const p of provsOf(s, s.player)) {
    if (p.buildings.includes('armoury') && (s.year + p.dev) % 4 === 0) {
      const pool = Object.values(EQUIPMENT).filter(e => !e.tech || hasTech(s, e.tech));
      const e = pick(s, pool);
      s.equipment.push({ uid: uid(s), type: e.id });
      log(s, `The armoury in ${p.name} forges ${e.name}.`, 'good');
    }
  }
  // new world grows
  if (s.flags.new_world && s.year % 5 === 0 && (s.flags.new_world_income ?? 0) < 12) s.flags.new_world_income = (s.flags.new_world_income ?? 0) + 1;
  // prestige
  me.prestige += rulerMod(s, 'prestige') + provsOf(s, s.player).filter(p => p.buildings.includes('cathedral')).length + (hasTech(s, 'absolutism') ? 2 : 0);
  // debt
  if (me.gold < 0) {
    me.gold += 40;
    addToHand(s, 'debt');
    me.stability = clamp(me.stability - 1, -3, 3);
    push(s, { kind: 'reveal', title: 'The treasury is empty', items: [{ title: 'Emergency loan', text: 'Genoese bankers lend you 40 ducats. A Crown Debt card is added to your hand and stability falls by 1.', tone: 'bad', kind: 'chain' }] });
  }
  // burdens
  for (const h of s.hand) if (h.card === 'unrest' && rand(s) < 0.2) { me.stability = clamp(me.stability - 1, -3, 3); log(s, 'Peasant unrest lowers stability.', 'bad'); }
  for (const p of provsOf(s, s.player)) if (p.unrest > 0) p.unrest--;
  // stability drifts toward 0 when at war for long
  if (s.wars.some(w => (w.a === s.player || w.b === s.player) && s.year - w.since > 8) && rand(s) < 0.15) {
    me.stability = clamp(me.stability - 1, -3, 3); log(s, 'War weariness lowers stability.', 'bad');
  }
}

function checkAmbition(s: GameState) {
  if (!s.ambition || s.ambitionDone) return;
  const a = AMBITIONS.find(x => x.id === s.ambition)!;
  if (a.deadline && s.year > a.deadline) {
    s.ambitionDone = true;
    push(s, { kind: 'reveal', title: 'Ambition failed', items: [{ title: a.name, text: `The deadline of ${a.deadline} has passed.`, tone: 'bad', kind: 'twist' }] });
    return;
  }
  if (a.check(s)) {
    s.ambitionDone = true;
    player(s).prestige += a.reward;
    push(s, { kind: 'reveal', title: 'Ambition fulfilled!', items: [{ title: a.name, text: `${a.text} Prestige +${a.reward}.`, tone: 'good', kind: 'crown' }] });
    log(s, `Ambition fulfilled: ${a.name}!`, 'good');
  }
}

export function ranking(s: GameState): { id: string; name: string; score: number }[] {
  return Object.values(s.nations).filter(n => n.alive)
    .map(n => ({ id: n.id, name: n.name, score: Math.round(n.prestige + provsOf(s, n.id).reduce((a, p) => a + p.dev * 2, 0)) }))
    .sort((a, b) => b.score - a.score);
}

export function endTurn(s: GameState) {
  if (s.over || s.queue.length) return;
  s.draftsThisTurn = 0;
  advanceMissions(s);
  runAI(s);
  playerEconomy(s);
  s.year++;
  characterAging(s);
  successionCheck(s);
  rollEvents(s);
  drawCard(s);
  checkAmbition(s);
  if (!provsOf(s, s.player).length) {
    s.over = true;
    push(s, { kind: 'gameover', victory: false, reason: `${player(s).name} has been conquered.` });
  } else if (s.year > s.endYear) {
    s.over = true;
    const r = ranking(s);
    const place = r.findIndex(x => x.id === s.player) + 1;
    push(s, { kind: 'gameover', victory: place <= 3, reason: `The year is ${s.year}. ${player(s).name} ranks #${place} among the powers.` });
  }
}

// ---------- player actions ----------
export function playerDeclareWar(s: GameState, target: string): string | null {
  if (atWar(s, s.player, target)) return 'Already at war';
  if (s.truces.some(t => t.until > s.year && ((t.a === s.player && t.b === target) || (t.b === s.player && t.a === target)))) return 'A truce is in force';
  const claim = s.flags['claim_' + target];
  const allied = s.treaties.some(t => (t.kind === 'alliance' || t.kind === 'marriage') && ((t.a === s.player && t.b === target) || (t.b === s.player && t.a === target)));
  declareWar(s, s.player, target);
  if (!claim) player(s).stability = clamp(player(s).stability - (allied ? 2 : 1), -3, 3);
  delete s.flags['claim_' + target];
  log(s, `You declare war on ${nationName(s, target)}.`, 'neutral');
  return null;
}

export function warCost(s: GameState, target: string): number {
  if (s.flags['claim_' + target]) return 0;
  const allied = s.treaties.some(t => (t.kind === 'alliance' || t.kind === 'marriage') && ((t.a === s.player && t.b === target) || (t.b === s.player && t.a === target)));
  return allied ? 2 : 1;
}

export function chooseEventOption(s: GameState, idx: number): RevealItem[] | string {
  const p = s.queue[0];
  if (!p || p.kind !== 'event') return 'No event';
  const e = EVENT[p.eventId];
  const opt = e.options[idx];
  const why = opt.can?.(s, p.vars);
  if (why) return why;
  s.queue.shift();
  return opt.run(s, p.vars);
}

export function dismissCharacter(s: GameState, uidC: number) {
  const c = s.characters.find(x => x.uid === uidC);
  if (!c || c.mission != null) return;
  s.characters = s.characters.filter(x => x.uid !== uidC);
}

export function disbandTroop(s: GameState, uidT: number) {
  const t = s.troops.find(x => x.uid === uidT);
  if (!t || t.mission != null) return;
  s.troops = s.troops.filter(x => x.uid !== uidT);
  player(s).manpower += 1;
}

export { getRel };
