// New game setup, the yearly turn, and player actions that touch several systems.
import { GOODS, OLD_GOODS } from '../data/goods';
import { yearlyChurch } from './culture';
import { settleGoods, checkTrade, startStock, GUN_TROOPS } from './trade';
import { initKnownWorld } from './overseas';
import { poolFor } from '../data/names';
import { yearlyAges } from './ages';
import { scriptedHistory } from './history';
import { yearlyCoalitions } from './coalition';
import { HEAL } from './army';
import { settleArmies, resolveIncoming, quarterlyMarch, quarterlyBases } from './army';
import { yearlyViceroys, quarterlyUnrest } from './realm';
import { eraOfYear } from '../data/eras';
import type { GameState, Nation, Ruler, RevealItem, Heir, Character } from '../types';
import { CATS } from '../types';
import { NATIONS, START_REL, RULERS, RULER_NAMES, RULER_ARCHS, archFromTraits, NO_STATE, ARMIES } from '../data/nations';
import { getGeo } from './map';
import { BUILDINGS } from '../data/techs';
import { TROOPS } from '../data/troops';
import { CORE } from '../data/core';
import {
  rand, pick, randInt, uid, clamp, player, provsOf, incomeOf, log, push, addRel, playerManpower, initialSettlement, grade,
  addTreaty, hasTech, genCharacter, declareWar, nationName, atWar, getRel, hasGood, armyPower, hasCore, coreSlots, hasTreaty, ageId,
  resetProvIndex, techFx } from './core';
import { drawCat, yearlyCards, grantRandomCards, addCard, CARDS, trimHand } from './cards';
import { advanceMissions, MISSION_INFO, quarterlyReturns } from './missions';
import { runAI, PRESTIGE_FADE } from './ai';
import { quarterlyRevolution } from './government';
import { applyStart, setupLaterPlayer, laterNation, LATER_DEFS } from './starts';
import { STARTS } from '../data/starts';
import { MISSION } from '../data/missions';
import { yearlyGoals, checkGoals, scenarioFrom } from './goals';
import { rollEvents, EVENT } from './events';
import { AMBITIONS, ambitionOptions } from './drafts';
import { START_FLEETS, yearlyFleet } from './navy';
import { initSociety, yearlySociety } from './society';
import { yearlySubjects, unionClaim } from './diplo';

export const SAVE_VERSION = 2;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function genRulerName(s: GameState, nation: string, title = true): string {
  const culture = s.nations[nation]?.culture ?? 'castilian';
  const names = RULER_NAMES[culture] ?? poolFor(culture)?.rulers ?? RULER_NAMES.castilian;
  const base = pick(s, names);
  if (!title) return base;
  const count = (s.flags['regnal_' + nation + base] = (s.flags['regnal_' + nation + base] ?? randInt(s, 1, 3)) + 1);
  return `${base} ${ROMAN[Math.min(11, count - 1)]}`;
}

function histRuler(nation: string, year: number) {
  return (RULERS[nation] ?? []).find(r => r.from <= year && r.to > year);
}

/** Starting ruler for any nation (AI rulers are flavour only). */
function initialRuler(s: GameState, nation: string): Ruler {
  const later = STARTS[s.year]?.rulers[nation];
  if (later && s.year === s.startYear) return { name: later[0], traits: [], arch: 'balanced', skill: 3, from: s.year - 5, to: later[1] };
  const h = histRuler(nation, s.year);
  if (h) return { name: h.name, traits: [...h.traits], arch: archFromTraits(h.traits), skill: h.traits.some(t => ['Weak', 'Idle', 'Unstable'].includes(t)) ? 1 : 3, from: h.from, to: h.to };
  return { name: genRulerName(s, nation), traits: [], arch: pick(s, Object.keys(RULER_ARCHS)), skill: randInt(s, 2, 4), from: s.year, to: s.year + randInt(s, 8, 30) };
}

/** Three heirs with different talents. The historical one, if any, is first. */
export function makeHeirs(s: GameState): Heir[] {
  const out: Heir[] = [];
  const h = (RULERS[s.player] ?? []).find(r => r.from >= s.year - 1 && r.from <= s.year + 1 && r.name !== player(s).ruler.name);
  const juanaBlock = s.player === 'castile' && s.flags.juana && h && h.from >= 1474 && h.from < 1516;
  if (h && !juanaBlock) {
    const arch = archFromTraits(h.traits);
    out.push({ name: h.name, arch, skill: arch === 'weak' ? 1 : randInt(s, 3, 5), reign: Math.max(3, h.to - h.from), historical: true, traits: [...h.traits] });
  }
  const archs = Object.keys(RULER_ARCHS).filter(a => a !== 'weak' && !out.some(o => o.arch === a)).sort(() => rand(s) - 0.5);
  while (out.length < 3) {
    const arch = archs.pop() ?? 'balanced';
    const female = rand(s) < 0.3;
    const nm = genRulerName(s, s.player, false);
    out.push({ name: `${female ? 'Infanta' : 'Infante'} ${nm}`, arch, skill: randInt(s, 2, 5), reign: randInt(s, 10, 35), traits: [] });
  }
  return out;
}

function setRuler(s: GameState, heir: Heir) {
  const me = player(s);
  if (me.ruler.name) s.stats.kings.push({ name: me.ruler.name, arch: me.ruler.arch, from: me.ruler.from, to: s.year, prestige: Math.round(me.prestige - (me.ruler.prestigeAtStart ?? 0)) });
  // remove the old monarch from the court
  const old = s.characters.find(c => c.ruler);
  if (old) {
    if (old.mission != null) {
      for (const t of s.troops) if (t.mission === old.mission) delete t.mission;
      s.missions = s.missions.filter(m => m.id !== old.mission);
    }
    s.characters = s.characters.filter(c => !c.ruler);
  }
  const name = heir.name.replace(/^Infant[ae] /, '') + (heir.historical || /\s[IVX]+$/.test(heir.name) ? '' : ' ' + ROMAN[Math.min(11, ((s.flags['regnal_' + s.player + heir.name.replace(/^Infant[ae] /, '')] = (s.flags['regnal_' + s.player + heir.name.replace(/^Infant[ae] /, '')] ?? 0) + 1)) - 1)]);
  me.ruler = { name, traits: heir.traits, arch: heir.arch, skill: heir.skill, from: s.year, to: s.year + heir.reign, prestigeAtStart: me.prestige };
  const a = RULER_ARCHS[heir.arch];
  if (a.stab) me.stability = clamp(me.stability + a.stab, -3, 3);
  if (a.startCards) grantRandomCards(s, a.startCards);
  if (a.role) {
    s.characters.unshift({ uid: uid(s), name: me.ruler.name, role: a.role, skill: heir.skill, traits: [], born: s.year - 25, dies: me.ruler.to, rarity: (['common', 'common', 'common', 'uncommon', 'rare', 'epic', 'legendary'] as const)[Math.min(6, heir.skill)], xp: 0, ruler: true });
  }
}

export function chooseHeir(s: GameState, idx: number) {
  const p = s.queue[0];
  if (!p || p.kind !== 'succession') return;
  const heir = p.heirs[idx];
  s.queue.shift();
  setRuler(s, heir);
  log(s, `${player(s).ruler.name} is crowned.`, 'good');
}

/** The game opens in 1451, as Mehmed II takes the Ottoman throne. */
export const START_YEAR = 1451;
/** Why a war is already burning in 1451, for the realm that inherits it. */
const START_WARS: Record<string, string> = {
  'castile:granada': 'The frontier war of the Reconquista still smoulders. Granada raids Andalusia from its mountains: expect attacks on Seville, Jaén and Murcia. Keep troops near the south, strike back with March Orders, or send a Peace Envoy.',
  'england:france': 'The last years of the Hundred Years\' War. French armies push into Normandy and Gascony: guard the coast and the last English lands in France.',
  'france:england': 'The last years of the Hundred Years\' War. England still holds Normandy and Gascony: this is your chance to drive them out.',
};

/** A mission-mode game: the realm, its goals and deadline; no personal ambition on top. */
export function newMissionGame(nationId: string, mission: string | import('../types').Scenario, startYear = START_YEAR): GameState {
  const s = newGame(nationId, undefined, startYear);
  s.scenario = typeof mission === 'string' ? scenarioFrom(mission) : mission;
  s.queue = s.queue.filter(q => !(q.kind === 'draft' && q.draft === 'ambition'));
  // starting points for goals that count what you do during the mission
  // beginner missions hand over the cards their lesson needs
  if (typeof mission === 'string') for (const c of MISSION[mission]?.cards ?? []) addCard(s, c, true);
  if (typeof mission === 'string' && mission === 'b_court') s.np += 8; // nation points to buy person cards
  if (typeof mission === 'string') player(s).gold += MISSION[mission]?.gold ?? 0;
  s.flags.goal_techs0 = s.techs.length;
  s.flags.goal_built0 = provsOf(s, s.player).reduce((a, p) => a + p.buildings.length, 0);
  s.flags.goal_works0 = (s.works ?? []).length;
  s.flags.goal_dev0 = provsOf(s, s.player).reduce((a, p) => a + p.dev, 0);
  return s;
}

export function newGame(nationId: string, seed = Math.floor(Math.random() * 1e9), startYear = START_YEAR): GameState {
  const later = STARTS[startYear];
  const s: GameState = {
    version: SAVE_VERSION, seed, rng: seed, nextUid: 1, year: later ? startYear : START_YEAR, quarter: 0, startYear: later ? startYear : START_YEAR, endYear: later?.end ?? 1750, player: nationId,
    nations: {}, provinces: {}, rel: {}, treaties: [], wars: [], truces: [], hand: [],
    cardAccum: { military: 0, diplomacy: 0, internal: 0, economy: 0, research: 0, culture: 0 },
    bought: { military: 0, diplomacy: 0, internal: 0, economy: 0, research: 0, culture: 0 },
    np: 3, imports: [], stock: {}, short: {}, routes: [], posts: [], overseas: {}, core: [], coreChanged: -99, fleet: [], art: 5, taxBurden: 0, accepted: [], stateReligion: 'catholic', happiness: 55, stats: { battles: {}, kings: [], fallen: [], wars: { won: 0, lost: 0 } },
    troops: [], equipment: [], characters: [], missions: [], techs: [], gov: 'feudal', firedEvents: [], usedLegends: [], queue: [],
    log: [], flags: {}, ambition: null, ambitionDone: false, over: false,
  };
  for (const d of NATIONS) {
    const n: Nation = {
      id: d.id, name: d.name, adj: d.adj, color: d.color, culture: d.culture, capital: d.capital, gold: d.gold,
      manpower: 10, stability: 1, prestige: 0, personality: d.personality, alive: true,
      army: d.id === nationId ? [] : d.army.map(type => ({ uid: s.nextUid++, type, vet: 0, str: 100 })),
      fleet: d.id === nationId ? [] : (START_FLEETS[d.id] ?? []).map(type => ({ uid: s.nextUid++, type, vet: 0, str: 100 })),
      ruler: { name: '', traits: [], arch: 'balanced', skill: 2, from: START_YEAR, to: START_YEAR },
    };
    s.nations[d.id] = n;
    if (d.native) { n.alive = false; n.army = []; n.fleet = []; } // stateless lands: never act
  }
  // realms born after 1451 exist only in the later starts
  if (later) for (const d of LATER_DEFS) if (!s.nations[d.id]) {
    const n = { ...laterNation(d, ARMIES, startYear), ruler: { name: '', traits: [], arch: 'balanced', skill: 2, from: s.year, to: s.year } } as Nation;
    n.army = d.id === nationId ? [] : n.army.map(t => ({ ...t, uid: s.nextUid++ }));
    s.nations[d.id] = n;
  }
  const geo = getGeo();
  for (const { id, name, owner, dev, fort, lon, lat, good } of geo.seeds) {
    s.provinces[id] = { id, name, owner, core: owner, dev, fort, buildings: [], land: geo.land[id], lon, lat, control: 80, good, settlement: initialSettlement(dev, NATIONS.some(n => n.capital === id)), grades: {}, culture: undefined as unknown as string, religion: undefined as unknown as string };
  }
  if (later) { initSociety(s); applyStart(s, startYear); }
  for (const n of Object.values(s.nations)) if (n.id !== nationId) n.ruler = initialRuler(s, n.id);
  if (!later) {
  for (const [a, b, v] of START_REL) addRel(s, a, b, v);
  addTreaty(s, 'aragon', 'naples', 'alliance');
  addTreaty(s, 'castile', 'france', 'alliance');
  addTreaty(s, 'milan', 'florence', 'alliance');
  addTreaty(s, 'granada', 'morocco', 'alliance');
  addTreaty(s, 'venice', 'florence', 'trade');
  addTreaty(s, 'genoa', 'castile', 'trade');
  addTreaty(s, 'poland', 'lithuania', 'alliance');
  addTreaty(s, 'byzantium', 'venice', 'trade');
  addTreaty(s, 'byzantium', 'genoa', 'trade');
  addTreaty(s, 'france', 'scotland', 'alliance');
  addTreaty(s, 'england', 'portugal', 'alliance');
  addTreaty(s, 'burgundy', 'england', 'trade');
  addTreaty(s, 'ming', 'korea', 'alliance');
  declareWar(s, 'england', 'france');     // the last years of the Hundred Years' War
  if (nationId === 'castile') declareWar(s, 'castile', 'granada'); // the frontier war of the Reconquista simmers on
  }

  const me = player(s);
  const def = NATIONS.find(d => d.id === nationId) ?? { army: laterNation(LATER_DEFS.find(d => d.id === nationId)!, ARMIES, startYear).army.map(t => t.type) };
  me.manpower = 5;
  s.troops = def.army.map(type => ({ uid: uid(s), type, vet: 0, str: 100 }));
  s.fleet = (START_FLEETS[nationId] ?? []).map(type => ({ uid: uid(s), type, vet: 0, str: 100 }));
  if (!later) initSociety(s);
  s.stateReligion = LATER_DEFS.find(d => d.id === nationId)?.religion ?? s.provinces[me.capital]?.religion ?? 'catholic'; // the crown shares the faith of its capital
  initKnownWorld(s);
  s.flags.start_provs = provsOf(s, nationId).length;
  for (const n of Object.values(s.nations)) s.flags['dev0_' + n.id] = provsOf(s, n.id).reduce((a, p) => a + p.dev, 0);
  s.characters = [
    genCharacter(s, 'general', me.culture, 1),
    genCharacter(s, 'diplomat', me.culture, 1),
    genCharacter(s, 'admin', me.culture, 1),
    genCharacter(s, 'merchant', me.culture, 1),
    genCharacter(s, 'researcher', me.culture, 1),
    genCharacter(s, 'courtier', me.culture, 1),
  ];
  if (nationId === 'portugal' && !later && !s.usedLegends.includes('henry')) {
    s.usedLegends.push('henry');
    s.characters.push({ uid: uid(s), name: 'Henrique, the Navigator', role: 'researcher', skill: 6, traits: ['scholar', 'polymath'], born: 1394, dies: 1460, rarity: 'legendary', xp: 0, legendId: 'henry' });
  }
  const r = initialRuler(s, nationId);
  me.ruler = { name: '', traits: [], arch: 'balanced', skill: 1, from: s.year, to: s.year };
  setRuler(s, { name: r.name, arch: r.arch, skill: r.skill, reign: Math.max(3, r.to - s.year), historical: true, traits: r.traits });
  s.stats.kings = [];
  me.ruler.from = r.from;
  for (const c of CATS) { drawCat(s, c); drawCat(s, c); }
  addCard(s, 'eq_plate');
  addCard(s, 'peace_envoy', true);
  if (later) setupLaterPlayer(s, startYear);
  settleArmies(s);
  s.stock = startStock(s);
  // wars you inherit on the first day: say so plainly
  const foes = s.wars.filter(w => w.a === nationId || w.b === nationId).map(w => (w.a === nationId ? w.b : w.a));
  if (foes.length) push(s, { kind: 'reveal', alarm: true, title: 'You are at war', subtitle: `Your crown inherits ${foes.length > 1 ? 'these wars' : 'this war'}`, items: foes.map(f => ({ title: `At war with ${s.nations[f].name}`, text: START_WARS[`${nationId}:${f}`] ?? `${s.nations[f].name} is your enemy. Its troops may attack your border provinces: keep garrisons ready. Use March Orders to strike, or a Peace Envoy to end it.`, tone: 'bad' as const, kind: 'sword' })) });
  push(s, { kind: 'draft', draft: 'ambition', options: ambitionOptions(s) });
  rollEvents(s);
  log(s, `${me.ruler.name} rules ${me.name}. It is the spring of ${s.year}.`);
  return s;
}

function successionCheck(s: GameState) {
  const me = player(s);
  if (s.year < me.ruler.to) return;
  push(s, { kind: 'succession', heirs: makeHeirs(s), old: me.ruler.name });
  me.ruler.to = 9999; // until the heir is chosen
  for (const n of Object.values(s.nations)) {
    if (n.id === s.player || s.year < n.ruler.to) continue;
    if (n.alive && n.id !== 'papacy' && hasTreaty(s, s.player, n.id, 'marriage') && getRel(s, s.player, n.id) >= 30 && !n.overlord && !atWar(s, s.player, n.id) && rand(s) < 0.06 && unionClaim(s, n.id)) {
      push(s, { kind: 'reveal', title: `The crown of ${n.name} passes to your house`, subtitle: 'A royal marriage bears fruit', items: [{ title: 'Personal union', text: `${n.name} keeps its own laws but now shares your monarch. It pays 40% of its income and fights at your side. After 15 years you may integrate it.`, tone: 'good', kind: 'crown' }] });
      log(s, `${n.name} enters a personal union with your crown.`, 'good');
    }
    n.ruler = { name: genRulerName(s, n.id), traits: [], arch: pick(s, Object.keys(RULER_ARCHS)), skill: randInt(s, 1, 5), from: s.year, to: s.year + randInt(s, 10, 30) };
  }
}

function characterAging(s: GameState) {
  for (const c of [...s.characters]) {
    if (c.ruler || s.year < c.dies) continue;
    s.characters = s.characters.filter(x => x.uid !== c.uid);
    if (c.role === 'general' || (c.wins ?? 0) > 0) s.stats.fallen.push({ name: c.name, role: c.role, skill: c.skill, wins: c.wins ?? 0, losses: c.losses ?? 0, until: s.year });
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

/** Each quarter: a quarter of the year's income, manpower and control. */
function playerEconomy(s: GameState) {
  const me = player(s);
  checkTrade(s);
  const inc = incomeOf(s, s.player);
  me.gold += inc.total / 4;
  settleGoods(s);
  const mp = playerManpower(s);
  me.manpower = Math.min(mp.max, me.manpower + mp.gain / 4);
  // the wounded heal only if there are weapons (and powder, and naval stores) to refit them
  const refit = (t: { type: string }) => 1 - Math.max(s.short?.weapons ?? 0, GUN_TROOPS.has(t.type) ? s.short?.gunpowder ?? 0 : 0);
  for (const t of s.troops) if (t.mission == null && !t.moving && t.str < 100) t.str = Math.min(100, t.str + HEAL * refit(t));
  for (const t of s.fleet) if (t.mission == null && !t.moving && t.str < 100) t.str = Math.min(100, t.str + HEAL * (1 - (s.short?.stores ?? 0)));
  // control
  for (const p of provsOf(s, s.player)) {
    let d = 2 + me.stability + (hasCore(s, 'consolidation') ? 3 : 0) + (hasCore(s, 'agrarian') ? 1 : 0);
    for (const b of p.buildings) d += (BUILDINGS[b]?.control ?? 0) * grade(p, b);
    d += techFx(s, 'control');
    if (p.core !== s.player) d -= hasCore(s, 'expansion') ? 2 : 1;
    p.control = clamp(p.control + d / 4, 0, 100);
  }
  treasuryCheck(s);
}

/** Once a year: workshops, prestige, unrest and war weariness. */
function yearlyPlayer(s: GameState) {
  const me = player(s);
  // workshops forge equipment cards
  for (const p of provsOf(s, s.player)) {
    if (p.buildings.includes('workshop') && p.make === 'weapons' && (s.short?.weapons ?? 0) < 0.2 && (s.year + p.dev) % 4 === 0) {
      const eqs = Object.values(CARDS).filter(c => c.kind === 'equip' && c.weight(s) > 0);
      const e = pick(s, eqs);
      addCard(s, e.id);
      log(s, `The workshop in ${p.name} forges ${e.name}.`, 'good');
    }
  }
  if (s.flags.new_world && s.year % 5 === 0 && (s.flags.new_world_income ?? 0) < 12) s.flags.new_world_income = (s.flags.new_world_income ?? 0) + 1;
  // prestige
  me.prestige *= 1 - PRESTIGE_FADE; // prestige fades unless renewed, for every crown
  me.prestige += provsOf(s, s.player).filter(p => p.buildings.includes('temple')).length * 0.5 + techFx(s, 'prestige') + (1 - 2 * (s.short?.luxuries ?? 0));
}

/** An empty treasury: imports stop, then loans, then bankruptcy. */
function treasuryCheck(s: GameState) {
  const me = player(s);
  const buys = s.routes.filter(r => r.dir === 'buy');
  if (me.gold < 0 && buys.length) {
    // first the crown stops buying goods abroad
    const costly = [...buys].sort((x, y) => GOODS[y.good].price * y.amount - GOODS[x.good].price * x.amount)[0];
    s.routes = s.routes.filter(r => r !== costly);
    log(s, `The empty treasury closes the ${GOODS[costly.good]?.name ?? costly.good} route from ${nationName(s, costly.partner)}.`, 'bad');
  }
  const debts = s.hand.filter(h => h.card === 'debt').length;
  if (me.gold < 0 && debts >= 5) {
    // bankruptcy: the debts are repudiated, at a price
    s.hand = s.hand.filter(h => h.card !== 'debt');
    s.routes = s.routes.filter(r => r.dir === 'sell');
    me.gold = 0; me.stability = clamp(me.stability - 2, -3, 3); me.prestige = Math.max(0, me.prestige - 20);
    push(s, { kind: 'reveal', title: 'Bankruptcy', items: [{ title: 'The crown defaults', text: 'You repudiate every Crown Debt. Trade routes that buy abroad close, stability falls by 2 and prestige by 20. No banker will forget.', tone: 'bad', kind: 'chain' }] });
    log(s, 'The crown declares bankruptcy.', 'bad');
  } else if (me.gold < 0) {
    me.gold += 40;
    addCard(s, 'debt');
    me.stability = clamp(me.stability - 1, -3, 3);
    push(s, { kind: 'reveal', title: 'The treasury is empty', items: [{ title: 'Emergency loan', text: 'Genoese bankers lend you 40 ducats. A Crown Debt card is added and stability falls by 1.', tone: 'bad', kind: 'chain' }] });
  }
}

function yearlyStrain(s: GameState) {
  const me = player(s);
  for (const h of s.hand) if (h.card === 'unrest' && rand(s) < 0.2) { me.stability = clamp(me.stability - 1, -3, 3); log(s, 'Peasant unrest lowers stability.', 'bad'); }
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
  // Size counts, but growth since 1453 counts more: a realm that stands still slips down the list.
  const dev = (n: string) => provsOf(s, n).reduce((a, p) => a + p.dev, 0);
  const dw = STARTS[s.startYear]?.devWeight ?? 1;
  return Object.values(s.nations).filter(n => n.alive)
    .map(n => {
      const d = dev(n.id), d0 = s.flags['dev0_' + n.id] ?? d;
      const subj = Object.values(s.nations).filter(x => x.alive && x.overlord === n.id).reduce((a, x) => a + dev(x.id), 0);
      return { id: n.id, name: n.name, score: Math.round(n.prestige / 2 + d * dw + Math.max(0, d - d0) * 5 + subj * 2) };
    })
    .sort((a, b) => b.score - a.score);
}

export interface PowerRow { id: string; name: string; color: string; military: number; economy: number; dev: number; prestige: number; provinces: number; won: number; lost: number; }
export function powerTable(s: GameState): PowerRow[] {
  return Object.values(s.nations).filter(n => n.alive).map(n => {
    const b = s.stats.battles[n.id] ?? { won: 0, lost: 0 };
    return {
      id: n.id, name: n.name, color: n.color,
      military: Math.round(armyPower(n.id === s.player ? s.troops : n.army)),
      economy: Math.round(incomeOf(s, n.id).total + (n.id === s.player ? 0 : 0)),
      dev: provsOf(s, n.id).reduce((a, p) => a + p.dev, 0),
      prestige: Math.round(n.prestige), provinces: provsOf(s, n.id).length, won: b.won, lost: b.lost,
    };
  });
}

export interface YearReport { gold: number; np: number; cards: Record<string, number>; }

export function endTurn(s: GameState): YearReport | null {
  if (s.over || s.queue.length) return null;
  trimHand(s); // the screen asks you to choose first; this only catches what is left
  const g0 = player(s).gold, np0 = s.np;
  s.quarter ??= 0;
  const q = s.quarter;
  if (q === 0 || !s.turnLog || s.turnLog.year !== s.year) s.turnLog = { year: s.year, quarter: q, battles: [], done: [], gold: 0, np: 0, cards: {} };
  if (q === 0) { s.bought = { military: 0, diplomacy: 0, internal: 0, economy: 0, research: 0, culture: 0 }; s.launched = 0; }
  settleArmies(s);
  resolveIncoming(s);
  quarterlyReturns(s); // envoys already riding home get closer before new results come in
  const before = s.missions.map(m => ({ id: m.id, kind: m.kind, target: m.target }));
  advanceMissions(s);
  for (const m of before) if (!s.missions.some(x => x.id === m.id)) s.turnLog.done.push({ kind: m.kind, title: `${MISSION_INFO[m.kind].name}${s.provinces[m.target] ? ' · ' + s.provinces[m.target].name : s.nations[m.target] ? ' · ' + s.nations[m.target].name : ''}`, ok: true });
  quarterlyMarch(s);
  quarterlyBases(s);
  runAI(s, q);
  playerEconomy(s);
  yearlyViceroys(s, q);
  quarterlyUnrest(s);
  quarterlyRevolution(s);
  const cards = yearlyCards(s, 1 / 4);
  rollEvents(s);
  s.quarter = (q + 1) % 4;
  if (s.quarter === 0) {
    // the year turns
    yearlyPlayer(s);
    yearlyStrain(s);
    yearlySubjects(s);
    yearlyCoalitions(s);
    yearlyFleet(s);
    yearlySociety(s);
    yearlyChurch(s);
    s.year++;
    yearlyAges(s);
    characterAging(s);
    successionCheck(s);
    checkAmbition(s);
    yearlyGoals(s);
  } else checkGoals(s, false);
  scriptedHistory(s);
  if (!provsOf(s, s.player).length) {
    s.over = true;
    if (s.scenario?.status === 'active') checkGoals(s, true);
    push(s, { kind: 'gameover', victory: false, reason: `${player(s).name} has been conquered.` });
  } else if (s.year > s.endYear) {
    s.over = true;
    const r = ranking(s);
    const place = r.findIndex(x => x.id === s.player) + 1;
    // in mission mode only the mission counts; in the open game, the ranking
    const sc = s.scenario;
    if (sc) push(s, { kind: 'gameover', victory: sc.status === 'won', reason: sc.status === 'won' ? `The year is ${s.year}. You accomplished ${sc.name} in ${sc.done}, and the world went on.` : `The year is ${s.year}. ${sc.name} was not accomplished.` });
    else push(s, { kind: 'gameover', victory: place <= 3, reason: `The year is ${s.year}. ${player(s).name} ranks #${place} among the powers.` });
  }
  const tl = s.turnLog!;
  tl.gold = (tl.gold ?? 0) + player(s).gold - g0; tl.np = (tl.np ?? 0) + s.np - np0;
  for (const [c, n] of Object.entries(cards)) tl.cards![c] = (tl.cards![c] ?? 0) + n;
  return { gold: player(s).gold - g0, np: s.np - np0, cards };
}

// ---------- player actions ----------
export function playerDeclareWar(s: GameState, target: string): string | null {
  if (atWar(s, s.player, target)) return 'Already at war';
  if (s.nations[target]?.overlord === s.player) return 'You cannot attack your own subject';
  if (s.truces.some(t => t.until > s.year && ((t.a === s.player && t.b === target) || (t.b === s.player && t.a === target)))) return 'A truce is in force';
  const claim = s.flags['claim_' + target];
  const allied = s.treaties.some(t => (t.kind === 'alliance' || t.kind === 'marriage') && ((t.a === s.player && t.b === target) || (t.b === s.player && t.a === target)));
  const cost = warCost(s, target);
  declareWar(s, s.player, target);
  player(s).stability = clamp(player(s).stability - cost, -3, 3);
  void claim; void allied;
  delete s.flags['claim_' + target];
  log(s, `You declare war on ${nationName(s, target)}.`, 'neutral');
  return null;
}

export function warCost(s: GameState, target: string): number {
  if (s.flags['claim_' + target]) return 0;
  const allied = s.treaties.some(t => (t.kind === 'alliance' || t.kind === 'marriage') && ((t.a === s.player && t.b === target) || (t.b === s.player && t.a === target)));
  let c = allied ? 2 : 1;
  if (ageId(s) === 'reconquest' && s.provinces[s.nations[target]?.capital]?.religion !== s.stateReligion) c -= 1;
  if (hasCore(s, 'expansion')) c -= 1;
  if (hasCore(s, 'consolidation')) c += 1;
  return Math.max(0, c);
}

// ---------- core cards ----------
export function coreBlocked(s: GameState, id: string): string | null {
  const def = CORE[id];
  if (!def) return 'Unknown card';
  if (hasCore(s, id)) return 'Already adopted';
  if (s.core.some(c => CORE[c].axis === def.axis)) return `You follow ${CORE[s.core.find(c => CORE[c].axis === def.axis)!].name}: set it aside first`;
  if (s.core.length >= coreSlots(s)) return `All ${coreSlots(s)} core slots are full`;
  if (s.coreChanged > s.year - 5 && s.core.length) return `The realm needs time: next change in ${s.coreChanged + 5 - s.year} years`;
  if (s.np < coreCost(s)) return `Needs ${coreCost(s)} nation points`;
  return null;
}
export const coreCost = (s: GameState) => 4 + 2 * s.core.length;

export function adoptCore(s: GameState, id: string): string | null {
  const why = coreBlocked(s, id);
  if (why) return why;
  s.np -= coreCost(s);
  s.core.push(id);
  s.coreChanged = s.year;
  if (id === 'traditional') { player(s).stability = clamp(player(s).stability + 1, -3, 3); addRel(s, s.player, 'papacy', 20); }
  log(s, `The crown adopts a new principle: ${CORE[id].name}.`, 'good');
  return null;
}

/** Setting a core card aside costs 1 stability. */
export function dropCore(s: GameState, id: string): string | null {
  if (!hasCore(s, id)) return 'Not adopted';
  s.core = s.core.filter(c => c !== id);
  s.coreChanged = s.year;
  player(s).stability = clamp(player(s).stability - 1, -3, 3);
  log(s, `${CORE[id].name} is set aside.`);
  return null;
}

/** The map grew: provinces added since a save was made join the game. Each goes to its 1451 owner if that crown
 *  still stands, otherwise to whoever holds most of its neighbours, otherwise to no state. */
function addNewProvinces(s: GameState) {
  const geo = getGeo();
  const missing = geo.seeds.filter(x => !s.provinces[x.id]);
  if (!missing.length) return;
  for (const { id, name, owner, dev, fort, lon, lat, good } of missing) {
    let o = s.nations[owner]?.alive ? owner : '';
    if (!o) {
      const count: Record<string, number> = {};
      for (const nb of geo.adj[id] ?? []) { const p = s.provinces[nb]; if (p) count[p.owner] = (count[p.owner] ?? 0) + 1; }
      o = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? NO_STATE;
    }
    s.provinces[id] = { id, name, owner: o, core: o, dev, fort, buildings: [], land: geo.land[id], lon, lat, control: 70, good, settlement: initialSettlement(dev, false), grades: {}, culture: undefined as unknown as string, religion: undefined as unknown as string };
  }
  resetProvIndex(s);
  log(s, `The map grows: ${missing.length} new provinces.`, 'neutral');
}

/** Fill in fields added after a save was made. */
export function migrate(s: GameState): GameState {
  s.core ??= []; s.coreChanged ??= -99; s.overseas ??= {}; s.imports ??= [];
  s.fleet ??= []; s.accepted ??= []; s.gov ??= 'feudal';
  // older games gave every crown the Catholic faith: give it back its own, unless it converted
  { const capRel = s.provinces[s.nations[s.player]?.capital]?.religion; if (capRel && s.stateReligion === 'catholic' && capRel !== 'catholic' && capRel !== 'protestant' && !s.flags.reformation_seen) s.stateReligion = capRel; }
  if (s.archive?.length) { s.hand.push(...s.archive); s.archive = []; } // the archive is gone: cards come back, the hand limit applies
  s.age ??= { id: eraOfYear(s.year).id, since: s.year };
  addNewProvinces(s);
  settleArmies(s);
  for (const n of Object.values(s.nations)) n.fleet ??= [];
  initSociety(s);
  for (const p of Object.values(s.provinces)) { p.settlement ??= 0; p.grades ??= {}; if (OLD_GOODS[p.good]) p.good = OLD_GOODS[p.good]; }
  if (!s.stock) {
    // the goods economy arrived: old imports end, every workshop picks a product, and warehouses start half full
    s.imports = []; s.routes = []; s.posts = []; s.short = {};
    for (const p of provsOf(s, s.player)) if ((p.buildings.includes('workshop') || p.buildings.includes('manufactory')) && !p.make) p.make = 'materials';
    s.stock = startStock(s);
  }
  s.routes ??= []; s.posts ??= []; s.short ??= {};
  // troop cards are by class now: an old Knights card becomes Hire Cavalry, and so on
  const CLASS_CARD: Record<string, string> = { inf: 'hire_infantry', shot: 'hire_ranged', cav: 'hire_cavalry', art: 'hire_artillery' };
  for (const h of s.hand) { const t = h.card.startsWith('hire_') ? TROOPS[h.card.slice(5)] : undefined; if (t && t.id !== 'levy' && t.kind !== 'ship' && CLASS_CARD[t.kind]) h.card = CLASS_CARD[t.kind]; }
  // trade became card by card: the old lasting route charter becomes one import and one export contract
  if (s.hand.some(h => h.card === 'merchant_route')) {
    s.hand = s.hand.filter(h => h.card !== 'merchant_route');
    addCard(s, 'import_contract', true); addCard(s, 'export_contract', true);
  }
  // the People menu arrived: a sixth kind of card and a courtier to start with
  s.cardAccum.culture ??= 0; s.bought.culture ??= 0; s.works ??= [];
  if (!s.characters.some(c => ['courtier', 'priest', 'artist', 'leader'].includes(c.role))) s.characters.push(genCharacter(s, 'courtier', player(s).culture, 1));
  return s;
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
  if (!c || c.mission != null || c.ruler) return;
  s.characters = s.characters.filter(x => x.uid !== uidC);
}

export function disbandTroop(s: GameState, uidT: number) {
  const t = s.troops.find(x => x.uid === uidT);
  if (!t || t.mission != null) return;
  s.troops = s.troops.filter(x => x.uid !== uidT);
}

export { getRel, nationName, atWar };
void getRel; void (null as unknown as Character);
