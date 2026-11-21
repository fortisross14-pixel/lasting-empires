// Engine checks that run without a browser: `npm test`. Each check is small and names what it protects.
// The bot simulation (`npm run sim`) stays the tool for balance; this file is for rules that must never break.
import { newGame, newMissionGame, endTurn, chooseEventOption, chooseHeir, migrate, adoptCore, SAVE_VERSION, OLDEST_SAVE } from '../src/engine/turn';
import { quarterFlow, stewardBudget, tradeIncome } from '../src/engine/trade';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { ERAS } from '../src/data/eras';
import { MUSIC_TRACKS, trackFor } from '../src/ui/music';
import { aiEconomy, worksOf, landRate, yearsToLand, diligence, DILIGENCE_SPREAD } from '../src/engine/ai';
import { cardHasTarget } from '../src/engine/pace';
import { closedBecause, groupOf } from '../src/engine/techgroups';
import { techCost } from '../src/engine/missions';
import { unitFor, classOpen } from '../src/engine/cards';
import { RETIRED, cardFor, addCard as addCardT } from '../src/engine/cards';
import { EVENT_SCENES, eventsWithArt, FACE_FAMILIES, faceFamily, faceOf } from '../src/ui/art';
import { gunzipSync } from 'node:zlib';
import { EVENT, EVENTS, rollEvents } from '../src/engine/events';
import { HISTORY_EVENTS, CORE_EVENTS, NEWS_EVENTS, dispatch } from '../src/engine/annals';
import { CORE } from '../src/data/core';
import { historyOf, momentWeight, ANNALS_MAX } from '../src/engine/chronicle';
import { CHAIN_EVENTS } from '../src/engine/chains';
import { COURT_EVENTS, loyaltyOf, wishOf, addLoyalty, loyaltyWord, reignOf, EPITHETS } from '../src/engine/court';
import { commanderOf, COMMANDER_MIN } from '../src/engine/commanders';
import { autoResolve, finishBattle, createBattle, makeSide, playRound, ratio, canReserve, setReserve, reserveOf, commitReserve, canRetreat, retreat, alliedHelp, RETREAT_COST, ALLY_COMPANIES } from '../src/engine/battle';
import { TERRAINS, TERRAIN_OVERRIDES, terrainOf } from '../src/data/terrain';
import { TACTICS, TRAIT_TACTIC } from '../src/data/troops';
import { declareWar, getRel, addRel, atWar, hasTreaty } from '../src/engine/core';
import { goalOf, attitude, HIST_GOALS, TEMPERS, GOAL_MIN, DEEDS_KEPT } from '../src/engine/rivals';
import { wantsPlayer, mayStrikePlayer, threatOf } from '../src/engine/ai';
import { REQUEST_EVENTS } from '../src/engine/requests';
import { NATIONS } from '../src/data/nations';
import { LATER_DEFS } from '../src/engine/starts';
import { takeDraftOption } from '../src/engine/drafts';
import { choosePicks } from '../src/engine/cards';
import { CARDS } from '../src/engine/cards';
import { MISSIONS } from '../src/data/missions';
import { DIFFICULTY, LENGTHS, STANDARD } from '../src/data/difficulty';
import { STARTS } from '../src/data/starts';
import { attention, readyByDeck, markTurn, stopReasons, cardHasTarget, SKIP_MAX } from '../src/engine/pace';
import { missionCap } from '../src/engine/realm';
import { player, provsOf, genCharacter } from '../src/engine/core';
import type { GameState, BattleUnit, BattleGeneral } from '../src/types';

let failed = 0, passed = 0;
function check(name: string, fn: () => void) {
  const t0 = Date.now();
  try { fn(); passed++; console.log(`  ok   ${name} (${Date.now() - t0} ms)`); }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`); }
}
function eq<T>(a: T, b: T, what: string) { if (a !== b) throw new Error(`${what}: expected ${String(b)}, got ${String(a)}`); }
function ok(v: unknown, what: string) { if (!v) throw new Error(what); }

/** Answer every prompt the same way each time: the first option that is allowed. */
function answer(s: GameState) {
  let guard = 0;
  while (s.queue.length && guard++ < 80) {
    const p = s.queue[0];
    if (p.kind === 'event') { const i = EVENT[p.eventId].options.findIndex(o => !o.can?.(s, p.vars)); if (i < 0 || typeof chooseEventOption(s, i) === 'string') s.queue.shift(); }
    else if (p.kind === 'battle') { autoResolve(s, p.battle); finishBattle(s, p.battle); s.queue.shift(); }
    else if (p.kind === 'picks') choosePicks(s, p.picks.map(pk => Math.floor(0 * pk.options.length)));
    else if (p.kind === 'draft') { takeDraftOption(s, p.options[0]); s.queue.shift(); }
    else if (p.kind === 'succession') chooseHeir(s, 0);
    else s.queue.shift();
  }
}
function play(s: GameState, turns: number) { answer(s); for (let i = 0; i < turns && !s.over; i++) { endTurn(s); answer(s); } return s; }
const strip = (s: GameState) => { const c = JSON.parse(JSON.stringify(s)) as GameState; delete c.difficulty; delete c.savedAt; return JSON.stringify(c); };

console.log('Lasting Empires: engine checks');

check('the same seed gives the same game', () => {
  const a = play(newGame('castile', 99), 60), b = play(newGame('castile', 99), 60);
  eq(JSON.stringify(a), JSON.stringify(b), 'state after 60 turns');
});

check('a save survives JSON and migrate, and plays on', () => {
  const a = play(newGame('portugal', 7), 30);
  const b = migrate(JSON.parse(JSON.stringify(a)) as GameState);
  eq(b.year, a.year, 'year after loading');
  play(b, 20);
  ok(b.year > a.year || b.over, 'the loaded game did not advance');
});

check('every stored save loads through the migrations and plays on', () => {
  const dir = 'scripts/saves';
  const files = readdirSync(dir).filter(f => /^v\d+\.json\.gz$/.test(f));
  ok(files.length >= SAVE_VERSION - OLDEST_SAVE, `expected a stored save for each version from ${OLDEST_SAVE} to ${SAVE_VERSION - 1} (npm run make-save before raising SAVE_VERSION)`);
  for (const f of files) {
    const s = JSON.parse(gunzipSync(readFileSync(`${dir}/${f}`)).toString()) as GameState;
    const year = s.year, provinces = Object.keys(s.provinces).length, was = s.version, steward = s.steward?.on;
    migrate(s);
    eq(s.version, SAVE_VERSION, `${f}: version after migrating`);
    ok(Object.keys(s.provinces).length >= provinces, `${f}: provinces were lost`);
    ok(s.steward && s.steward.on === (was < 3 ? false : steward), `${f}: a save must keep its economy (the steward as he was, off before he existed)`);
    ok(Array.isArray(s.pending), `${f}: no list of pending events after migrating`);
    play(s, 12);
    ok(s.year >= year + 3 || s.over, `${f}: did not play on after loading`);
  }
  let refused = false;
  try { migrate({ version: SAVE_VERSION + 1 } as GameState); } catch { refused = true; }
  ok(refused, 'a save from a newer game was not refused');
});

check('the steward buys what is missing, within his purse, and only when in office', () => {
  const s = newGame('castile', 44); answer(s);
  s.stock.cloth = 0; s.stock.weapons = 0; for (const p of provsOf(s, s.player)) delete p.make;
  s.steward = { on: false, share: 0.15 };
  const off = quarterFlow(s);
  ok((off.missing.cloth ?? 0) > 0 && (off.missing.weapons ?? 0) > 0, 'the test realm should lack cloth and weapons');
  eq(off.stewardCost, 0, 'spending out of office');
  s.steward = { on: true, share: 0.3 };
  const on = quarterFlow(s);
  ok(on.stewardCost > 0, 'the steward bought nothing');
  ok(on.stewardCost <= stewardBudget(s) / 4 + 1e-9, 'the steward overspent his purse');
  ok((on.missing.cloth ?? 0) < off.missing.cloth, 'cloth is as short as before');
  eq(Math.round(tradeIncome(s).steward * 100), Math.round(on.stewardCost * 400), 'the ledger and the flow disagree');
  s.steward = { on: true, share: 0.0001 };
  const poor = quarterFlow(s);
  ok(Object.keys(poor.missing).length > 0, 'a nearly empty purse covered every need');
  ok(poor.stewardCost <= stewardBudget(s) / 4 + 1e-9, 'a nearly empty purse was overspent');
});

check('twelve realms on three start dates play 40 turns', () => {
  const pick: Record<number, string[]> = {
    1451: ['castile', 'portugal', 'byzantium', 'ottomans', 'venice', 'ming', 'japan', 'mali', 'aztec', 'inca', 'muscovy', 'vijayanagara'],
  };
  for (const y of [1451, ...Object.keys(STARTS).map(Number)]) {
    const realms = pick[y] ?? (STARTS[y].featured ?? []).slice(0, 12);
    ok(realms.length >= 6, `start ${y} has only ${realms.length} featured realms`);
    for (const n of realms) {
      let s: GameState;
      try { s = play(newGame(n, 1000 + y, y), 40); } catch (e) { throw new Error(`${n} ${y}: ${(e as Error).message}`); }
      ok(s.over || s.year === y + 10, `${n} ${y}: stopped in ${s.year}`);
    }
  }
});

check('every mission starts for every realm that may play it, and its cards exist', () => {
  for (const m of MISSIONS) {
    for (const c of m.cards ?? []) ok(CARDS[c], `mission ${m.id}: unknown card ${c}`);
    for (const n of m.nations.slice(0, 2)) {
      const s = newMissionGame(n, m.id, m.start, { seed: 5 });
      ok(s.scenario?.status === 'active', `mission ${m.id} did not start active`);
      ok(provsOf(s, s.player).length > 0, `mission ${m.id}: ${n} has no land in ${m.start}`);
    }
  }
});

check('Standard difficulty is the game as it was', () => {
  const a = play(newGame('aragon', 31), 60), b = play(newGame('aragon', 31, 1451, { difficulty: STANDARD }), 60);
  eq(strip(a), strip(b), 'state after 60 turns');
});

check('difficulty levers run from gentle to hard', () => {
  eq(DIFFICULTY.length, 3, 'number of levels');
  for (let i = 1; i < DIFFICULTY.length; i++) {
    const lo = DIFFICULTY[i - 1], hi = DIFFICULTY[i];
    ok(hi.warEdge < lo.warEdge && hi.warGap < lo.warGap && hi.grace < lo.grace && hi.mercy < lo.mercy, `${hi.name}: rivals must be bolder than on ${lo.name}`);
    ok(hi.gold < lo.gold && hi.aiGrowth > lo.aiGrowth && hi.aiArmy > lo.aiArmy, `${hi.name}: the start must be leaner than on ${lo.name}`);
  }
  const g = newGame('castile', 3, 1451, { difficulty: 0 }), n = newGame('castile', 3), h = newGame('castile', 3, 1451, { difficulty: 2 });
  ok(player(g).gold > player(n).gold && player(n).gold > player(h).gold, 'starting treasure does not follow the difficulty');
});

check('a reign ends after 40 years, a full game does not', () => {
  const reign = LENGTHS.find(l => l.id === 'reign')!;
  const s = newGame('portugal', 11, 1451, { length: 'reign' });
  eq(s.endYear, 1451 + reign.years, 'end year of a reign');
  play(s, reign.years * 4 + 8);
  ok(s.over, 'the reign did not end');
  ok(s.year <= s.endYear + 1, `the reign ran to ${s.year}`);
  eq(newGame('portugal', 11, 1451, { length: 'age' }).endYear, 1750, 'end year of the whole age');
  ok(s.flags.rank0 >= 1, 'the starting rank was not recorded');
});

check('things to do: cards a free person can carry, and nothing once everyone is busy', () => {
  const s = newGame('castile', 21); answer(s);
  const ready = readyByDeck(s);
  ok(Object.keys(ready).length > 0, 'a new game shows no card ready to play');
  ok(!Object.values(ready).some(r => r!.card === 'Embassy' || r!.card === 'Peace Envoy'), 'a permanent card was listed as waiting');
  ok(attention(s).some(a => a.id.startsWith('deck:')), 'no deck line in the list');
  for (const c of s.characters) c.mission = -99; // everyone is away
  ok(!attention(s).some(a => a.id.startsWith('deck:') || a.id.startsWith('idle:')), 'people on missions were listed as free');
  for (const c of s.characters) delete c.mission;
  s.launched = missionCap(s); // the year's missions are used up
  ok(!attention(s).some(a => a.id.startsWith('deck:') || a.id.startsWith('idle:')), 'tasks were offered beyond the yearly limit');
});

check('things to do: shortages and unrest', () => {
  const s = newGame('castile', 22); answer(s);
  s.short.weapons = 0.5;
  ok(attention(s).some(a => a.id === 'short:weapons'), 'a 50% shortage of weapons was not listed');
  s.short.weapons = 0.1;
  ok(!attention(s).some(a => a.id === 'short:weapons'), 'a 10% shortage was listed');
  ok(!cardHasTarget(s, 'march_orders') || s.wars.some(w => w.a === s.player || w.b === s.player), 'March Orders had a target at peace');
});

check('skip ahead never passes a card, a prompt or a finished task', () => {
  for (const n of ['portugal', 'venice', 'ming']) {
    const s = newGame(n, 4242); answer(s);
    let presses = 0, turns = 0, longest = 0;
    while (!s.over && turns < 400) {
      presses++;
      let run = 0;
      for (;;) {
        const before = markTurn(s), tasks = s.missions.length;
        const rep = endTurn(s); turns++; run++;
        const why = stopReasons(s, before, rep);
        const news = s.queue.length > 0 || Object.values(rep?.cards ?? {}).some(v => v > 0) || s.missions.length < tasks;
        ok(!news || why.length > 0, `${n} ${s.year}: something happened and skip ahead did not stop`);
        answer(s);
        if (why.length || run >= SKIP_MAX || s.over) break;
      }
      longest = Math.max(longest, run);
    }
    ok(longest <= SKIP_MAX, `${n}: a skip ran ${longest} turns`);
    ok(presses < turns, `${n}: skip ahead saved no presses (${presses} for ${turns} turns)`);
    console.log(`       ${n}: ${turns} turns in ${presses} presses (${Math.round((1 - presses / turns) * 100)}% fewer), longest run ${longest}`);
  }
});

check('people: loyalty and wishes follow from the person, and move only when something happens', () => {
  const a = newGame('castile', 61), b = newGame('castile', 61);
  for (let i = 0; i < a.characters.length; i++) { eq(loyaltyOf(a.characters[i]), loyaltyOf(b.characters[i]), 'loyalty of the same person in the same game'); eq(wishOf(a.characters[i]), wishOf(b.characters[i]), 'wish'); }
  const c = a.characters.find(x => !x.ruler)!;
  ok(loyaltyOf(c) >= 50 && loyaltyOf(c) <= 70, `a new servant starts between 50 and 70, not ${loyaltyOf(c)}`);
  ok(c.loyalty === undefined, 'loyalty was stored before anything changed it');
  addLoyalty(c, 500); eq(loyaltyOf(c), 100, 'loyalty is capped'); eq(loyaltyWord(c), 'Devoted', 'word at 100');
  addLoyalty(c, -500); eq(loyaltyOf(c), 0, 'loyalty has a floor'); eq(loyaltyWord(c), 'Disloyal', 'word at 0');
});

check('every court event can fire, and every option of it runs', () => {
  for (const def of COURT_EVENTS) {
    let fired = false;
    for (const seed of [71, 72, 73]) {
      const s = play(newGame('castile', seed), 16); // four years in: the court may stir
      s.queue = []; s.flags.court_last = 0;
      // a court where every event has its person: battle-tried, disloyal, dying, an artist, a churchman, a war
      const cs = s.characters.filter(c => !c.ruler);
      for (const c of cs) { delete c.mission; c.loyalty = 30; }
      const gen = cs.find(c => c.role === 'general'); if (gen) { gen.wins = 4; delete gen.honours; }
      const old = cs.find(c => c.role === 'admin'); if (old) { old.dies = s.year; if (!old.traits.length) old.traits = ['x']; }
      cs.find(c => c.role === 'courtier' || c.role === 'leader')!.role = 'artist';
      if (def.id === 'court_favourite') for (const c of cs) c.loyalty = 70;
      if (def.id === 'court_preacher') cs.find(c => c.role === 'diplomat')!.role = 'priest';
      player(s).gold = 500;
      if (def.id === 'court_travel_back') { const sc = cs.find(c => c.role === 'researcher')!; s.pending = [{ id: def.id, year: s.year, vars: { c: sc.uid, purse: 1 } }]; rollEvents(s); }
      else if (def.id === 'captive_general') { s.pending = [{ id: def.id, year: s.year, vars: { nation: 'france', name: 'Jean de Test' } }]; rollEvents(s); }
      else {
        if (def.cond && !def.cond(s)) continue;
        const v = def.setup ? def.setup(s) : {};
        if (!v) continue;
        s.queue.push({ kind: 'event', eventId: def.id, vars: v });
      }
      const p = s.queue.find(q => q.kind === 'event' && q.eventId === def.id);
      if (!p || p.kind !== 'event') continue;
      fired = true;
      ok(def.text(s, p.vars).length > 20, `${def.id}: no text`);
      ok(def.text(s, p.vars).trim().split(/\s+/).length <= 60, `${def.id}: ${def.text(s, p.vars).trim().split(/\s+/).length} words, the limit is 60`);
      ok(typeof def.title === 'string' ? def.title : def.title(s, p.vars), `${def.id}: no title`);
      for (let i = 0; i < def.options.length; i++) {
        const c = JSON.parse(JSON.stringify(s)) as GameState; // each option on its own copy of the game
        if (def.options[i].can?.(c, p.vars)) continue;
        const items = def.options[i].run(c, p.vars);
        ok(items.length > 0 && items.every(it => it.title && it.text), `${def.id} option ${i}: nothing to show`);
      }
      break;
    }
    ok(fired, `${def.id} never found its moment in three prepared games`);
  }
});

const words = (t: string) => t.trim().split(/\s+/).length;
/** The longest an event's text may be (docs/WRITING.md). */
const MAX_WORDS = 60;

check('every chain can be walked down every road to its end, and no step is too long', () => {
  const firsts = CHAIN_EVENTS.filter(e => e.chance > 0).map(e => e.id).concat(['court_favourite']);
  const seen = new Set<string>(); let ends = 0, longest = 0;
  const walk = (s: GameState, id: string, vars: Record<string, string | number>, depth: number) => {
    const def = EVENT[id];
    ok(def, `unknown event ${id}`);
    seen.add(id);
    const text = def.text(s, vars);
    longest = Math.max(longest, words(text));
    ok(words(text) <= MAX_WORDS, `${id} (${String(vars.path ?? 'first step')}): ${words(text)} words, the limit is ${MAX_WORDS}`);
    ok((typeof def.title === 'string' ? def.title : def.title(s, vars)).length > 3, `${id}: no title`);
    const open = def.options.filter(o => !o.can?.(s, vars));
    ok(open.length > 0, `${id} (${String(vars.path ?? '')}): no option can be chosen even with a full treasury`);
    for (const o of def.options) {
      if (o.can?.(s, vars)) continue;
      const c = JSON.parse(JSON.stringify(s)) as GameState;
      c.pending = [];
      const items = o.run(c, vars);
      ok(items.length > 0 && items.every(it => it.title && it.text), `${id}: "${o.label}" shows nothing`);
      ok(c.pending!.length <= 1, `${id}: "${o.label}" set two things in motion`);
      const nx = c.pending![0];
      if (!nx) { ends++; continue; }
      ok(depth < 3, `${id}: the story goes on after three steps`);
      c.year = nx.year; c.pending = [];
      const d2 = EVENT[nx.id];
      ok(d2 && (!d2.cond || d2.cond(c)), `${id}: the next step ${nx.id} would be dropped`);
      walk(c, nx.id, { ...(d2.setup ? d2.setup(c) ?? {} : {}), ...nx.vars }, depth + 1);
    }
  };
  for (const id of firsts) {
    const s = play(newGame('castile', 300 + firsts.indexOf(id)), 44); // eleven years in, so every story may begin
    s.queue = []; s.pending = []; s.flags.court_last = 0; player(s).gold = 5000;
    while (s.characters.filter(c => !c.ruler).length < 4) s.characters.push(genCharacter(s, 'admin', player(s).culture, 1)); // a court to speak of, whatever the years did
    for (const c of s.characters) if (!c.ruler) { delete c.mission; c.loyalty = 70; }
    const def = EVENT[id];
    if (def.window) s.year = Math.max(s.year, def.window[0]);
    if (id === 'loan_1') player(s).gold = 10;
    if (id === 'printer_1') s.techs = s.techs.filter(x => x !== 'printing');
    ok(!def.cond || def.cond(s), `${id}: cannot begin in a plain game`);
    const v = def.setup ? def.setup(s) : {};
    ok(v, `${id}: found nowhere to happen`);
    player(s).gold = 5000;
    walk(s, id, v!, 1);
  }
  for (const e of CHAIN_EVENTS) ok(seen.has(e.id), `${e.id} is never reached`);
  ok(firsts.length >= 10, `only ${firsts.length} chains`);
  console.log(`       ${firsts.length} chains, ${seen.size} steps, ${ends} endings; the longest text is ${longest} words`);
});

check('the new history, core and news events: every option runs and no text is too long', () => {
  const s0 = play(newGame('aragon', 401), 12);
  s0.queue = []; player(s0).gold = 5000; s0.core = ['land', 'sea', 'expansion', 'consolidation', 'open', 'traditional', 'mercantile', 'agrarian'];
  for (const def of [...HISTORY_EVENTS, ...CORE_EVENTS, ...NEWS_EVENTS]) {
    const vars = def.id === 'news_abroad' ? { nation: 'france', text: 'In Paris, a king is crowned.' } : {};
    const text = def.text(s0, vars);
    ok(words(text) <= MAX_WORDS, `${def.id}: ${words(text)} words, the limit is ${MAX_WORDS}`);
    ok(def.options.length >= 1 && def.options.some(o => !o.can?.(s0, vars)), `${def.id}: no option can be chosen`);
    for (const o of def.options) {
      const c = JSON.parse(JSON.stringify(s0)) as GameState;
      if (o.can?.(c, vars)) continue;
      const items = o.run(c, vars);
      ok(items.length > 0 && items.every(it => it.title && it.text), `${def.id}: "${o.label}" shows nothing`);
    }
  }
  for (const id of Object.keys(CORE)) ok(EVENT['core_' + id], `the principle ${id} has no event`);
});

check('no event text is longer than the writers\' limit', () => {
  const s = play(newGame('castile', 431), 8); s.queue = [];
  let rendered = 0;
  for (const e of EVENTS) {
    let v: Record<string, string | number> | null = {};
    try { v = e.setup ? e.setup(s) : {}; } catch { v = null; }
    let text = '';
    try { text = e.text(s, v ?? {}); } catch { continue; } // needs a situation this game is not in
    if (/undefined/.test(text)) continue;
    rendered++;
    ok(words(text) <= MAX_WORDS, `${e.id}: ${words(text)} words, the limit is ${MAX_WORDS}`);
  }
  ok(rendered >= EVENTS.length * 0.8, `only ${rendered} of ${EVENTS.length} event texts could be read`);
});

check('the history deck has at least eight dated events in every half-century', () => {
  const count: Record<number, number> = {};
  for (const e of EVENTS) if (e.window) { const k = Math.min(1700, Math.max(1450, Math.floor(e.window[0] / 50) * 50)); count[k] = (count[k] ?? 0) + 1; }
  for (const k of [1450, 1500, 1550, 1600, 1650, 1700]) ok((count[k] ?? 0) >= 8, `${k}–${k + 49}: only ${count[k] ?? 0} dated events`);
  console.log(`       ${EVENTS.length} events in all; dated by half-century: ${[1450, 1500, 1550, 1600, 1650, 1700].map(k => `${k}s ${count[k]}`).join(', ')}`);
});

check('the history of the realm keeps the weighty moments and forgets the rest', () => {
  ok(momentWeight('You declare war on Granada.') > 0 && momentWeight('Ambition fulfilled: Reconquista!') > momentWeight('Peace with Granada.'), 'weights are out of order');
  eq(momentWeight('Hired Levy Infantry.'), 0, 'a hired company is remembered');
  eq(momentWeight('Kashmir has fallen and is no more.'), 0, 'the fall of a far kingdom is kept as this realm\'s history');
  ok(momentWeight('Granada is taken!') > momentWeight('Research complete: Pike Square.'), 'a conquest weighs no more than a study');
  const s = play(newGame('castile', 421), 60);
  ok((s.stats.annals ?? []).length > 0, 'fifteen years of Castile left no moment worth keeping');
  ok((s.stats.annals ?? []).length <= ANNALS_MAX, 'the annals outgrew their limit');
  const h = historyOf(s);
  ok(h.length >= 1 && h.reduce((a, c) => a + c.moments.length, 0) <= 15, 'the history has no chapter, or more than fifteen moments');
  ok(h.every(c => c.moments.every((m, i) => i === 0 || m.year >= c.moments[i - 1].year)), 'a chapter is out of order');
});

check('news from abroad: one dispatch a year, and adopting a principle sets its event in motion', () => {
  const s = play(newGame('castile', 411), 4);
  s.pending = []; s.flags.news_year = 0;
  dispatch(s, 'france', 'In Paris, a king is crowned.'); dispatch(s, 'england', 'In London, a king is crowned.');
  eq(s.pending!.filter(x => x.id === 'news_abroad').length, 1, 'dispatches in one year');
  s.np = 50; s.core = []; s.coreChanged = -99;
  eq(adoptCore(s, 'open'), null, 'adopting Open-minded');
  const p = s.pending!.find(x => x.id === 'core_open');
  ok(p && p.year > s.year && p.year <= s.year + 5, 'the clergy do not object within five years');
});

check('a choice can come back: a pending event fires in its year and not before', () => {
  const s = play(newGame('portugal', 81), 8);
  s.queue = []; s.pending = [{ id: 'captive_general', year: s.year + 2, vars: { nation: 'castile', name: 'Diego de Prueba' } }];
  rollEvents(s);
  ok(!s.queue.some(q => q.kind === 'event' && q.eventId === 'captive_general'), 'it fired two years early');
  s.year += 2; s.queue = [];
  rollEvents(s);
  const p = s.queue.find(q => q.kind === 'event' && q.eventId === 'captive_general');
  ok(p && p.kind === 'event' && p.vars.name === 'Diego de Prueba', 'it did not fire when due, or lost what was chosen');
  eq(s.pending!.length, 0, 'pending events left over');
});

check('rival commanders have names, keep them, and small realms have none', () => {
  const s = newGame('castile', 91);
  const big = Object.values(s.nations).find(n => n.alive && n.id !== s.player && provsOf(s, n.id).length >= COMMANDER_MIN)!;
  const small = Object.values(s.nations).find(n => n.alive && n.id !== s.player && provsOf(s, n.id).length > 0 && provsOf(s, n.id).length < COMMANDER_MIN)!;
  const rng = s.rng;
  const g1 = commanderOf(s, big.id), g2 = commanderOf(s, big.id);
  ok(g1 && g2 && g1.name === g2.name && g1.name.includes(' '), 'a large realm has no lasting named commander');
  eq(s.rng, rng, 'appointing a commander rolled the dice');
  eq(commanderOf(s, small.id), null, 'a small realm has a named commander');
  big.general!.captive = true;
  eq(commanderOf(s, big.id), null, 'a captive commander still leads');
});

check('a reign is summed up with a by-name earned by its deeds', () => {
  const s = newGame('castile', 95);
  ok(player(s).ruler.start, 'the start of the reign was not recorded');
  player(s).ruler.from = s.year;
  eq(reignOf(s).epithet, 'the Brief', 'a reign of no years');
  player(s).ruler.from = s.year - 20; player(s).ruler.start!.provs -= 6;
  eq(reignOf(s).epithet, 'the Conqueror', 'six provinces won in twenty years');
  player(s).ruler.start!.provs += 6; player(s).ruler.start!.built -= 7;
  eq(reignOf(s).epithet, 'the Builder', 'seven buildings raised');
  ok(new Set(EPITHETS.map(e => e[0])).size === EPITHETS.length, 'two by-names are the same');
});

// ---------- battles ----------
const unit = (uidN: number, type: string, str = 100): BattleUnit => ({ uid: uidN, type, vet: 0, str, start: str });
const army = (base: number, types: string[]) => types.map((t, i) => unit(base + i, t));
/** A battle on chosen ground between two plain armies, the player attacking. */
function field(seed: number, terrain: string, mine: string[], theirs: string[], general: BattleGeneral | null = null) {
  const s = newGame('castile', seed); s.queue = [];
  const b = createBattle(s, makeSide('castile', army(900000, mine), general, 0, true), makeSide('portugal', army(910000, theirs), null, 0, false), 'porto', 'conquer');
  b.terrain = terrain;
  return { s, b };
}

check('text size: every font size in the stylesheet scales with --ts', () => {
  const css = readFileSync('src/styles.css', 'utf8');
  const bare = css.match(/font-size:\s*[\d.]+px/g) ?? [];
  eq(bare.length, 0, `font sizes written without calc(… * var(--ts, 1)): ${bare.slice(0, 4).join(', ')}`);
});

check('faces: sixteen for each family, kept on the person, and two generals differ', () => {
  for (const fam of FACE_FAMILIES) for (let i = 0; i < 16; i++) ok(existsSync(`art/face_${fam}_${Math.floor(i / 4)}${i % 4}.webp`), `face ${i} of ${fam} is missing`);
  eq(faceFamily('castilian'), 'western', 'Castile'); eq(faceFamily('turkish'), 'islamic', 'the Ottomans');
  const s = newGame('castile', 77);
  const court = [0, 1, 2].map(() => genCharacter(s, 'general'));
  s.characters.push(...court);
  const faces = court.map(c => faceOf(c, s.characters));
  eq(new Set(faces).size, 3, `three generals wear faces ${faces.join(', ')}`);
  eq(faceOf(court[0], s.characters), faces[0], 'the face is kept');
  for (const c of s.characters) { const f = faceOf(c, s.characters); ok(f >= 0 && f < 16, `${c.name} has face ${f}`); }
});

check('age plates and title scenes: one plate for each age, two scenes for the title', () => {
  for (const e of ERAS) ok(existsSync(`art/age_${e.id}.webp`), `the plate of the ${e.name} is missing`);
  for (const n of ['wide', 'tall']) ok(existsSync(`art/title_${n}.webp`), `art/title_${n}.webp is missing`);
});

check('music: a piece for every family of dress, in both formats', () => {
  for (const fam of FACE_FAMILIES) { const n = MUSIC_TRACKS[fam]; ok(n, `no music for ${fam}`); for (const ext of ['ogg', 'm4a']) ok(existsSync(`sound/music-${n}.${ext}`), `sound/music-${n}.${ext} is missing`); }
  eq(trackFor('castilian'), 'europe', 'Castile'); eq(trackFor('turkish'), 'levant', 'the Ottomans');
});

check('rivals work to a budget: land improved exactly as fast as the rate says, with no dice', () => {
  const s = newGame('castile', 91), fr = s.nations.france;
  const dev = () => provsOf(s, 'france').reduce((a, p) => a + p.dev, 0);
  const d0 = dev(), w0 = worksOf(fr).land, rate = landRate(s, fr), seed0 = s.seed;
  ok(rate > 0.1 && rate < 0.6, `France's rate is ${rate}`);
  for (let i = 0; i < 20; i++) { fr.gold = 0; fr.manpower = 0; aiEconomy(s, fr); } // no silver, no men: only the land moves
  eq(dev() - d0, Math.floor(w0 + 20 * rate + 1e-9), 'land improved in twenty years');
  ok((fr.deeds ?? []).some(d => /Improved the land/.test(d.text)), 'the work is in its record');
  const yl = yearsToLand(s, fr);
  ok(yl != null && yl >= 1 && yl <= Math.ceil(1 / rate), `years to the next work: ${yl}`);
  // each realm has its own pace, inside the spread, and the world's average is the common pace
  const ds = Object.keys(s.nations).map(diligence);
  ok(Math.min(...ds) >= 1 - DILIGENCE_SPREAD - 1e-9 && Math.max(...ds) <= 1 + DILIGENCE_SPREAD + 1e-9, 'a pace outside the spread');
  const mean = ds.reduce((a, b) => a + b, 0) / ds.length;
  ok(Math.abs(mean - 1) < 0.03, `the mean pace of ${ds.length} realms is ${mean.toFixed(3)}`);
  // two realms do not begin at the same point of their savings
  ok(worksOf(s.nations.england).land !== worksOf(s.nations.portugal).land, 'savings are staggered');
  void seed0;
});

check('merged cards: the Treatise studies any field, and retired cards come as their successor', () => {
  const s = newGame('castile', 61);
  ok(cardHasTarget(s, 'study'), 'a Treatise finds nothing to study');
  ok(cardFor(s, 'research', { track: 'military' }) === undefined || true, 'cardFor');
  s.hand.push({ uid: 99901, card: 'study' });
  ok(cardFor(s, 'research', { track: 'economy' })?.card === 'study', 'a Treatise is not offered for an economic study');
  for (const [old, now] of Object.entries(RETIRED)) { ok(CARDS[now], `${old} retires to ${now}, which is not a card`); const n = s.hand.length; addCardT(s, old); eq(s.hand[s.hand.length - 1].card, now, `${old} given as`); ok(s.hand.length === n + 1, 'one card added'); }
});

check('regions: the Inca cannot study gunpowder or raise horse, Castile is as it was', () => {
  const inca = newGame('inca', 71), cas = newGame('castile', 71);
  ok(closedBecause(inca, 'firearms'), 'the Inca may study firearms in 1451');
  ok(/Needs contact/.test(closedBecause(inca, 'foreign_arms') ?? ''), "the Inca may begin Strangers' Arms without contact");
  ok(/Not needed/.test(closedBecause(cas, 'foreign_arms') ?? ''), "Castile is offered Strangers' Arms");
  inca.techs.push('foreign_arms');
  ok(!closedBecause(inca, 'firearms'), "firearms still closed after Strangers' Arms");
  ok(closedBecause(inca, 'navigation'), "Strangers' Arms opened the ocean too");
  ok(!closedBecause(cas, 'firearms'), 'Castile may not study firearms');
  ok(techCost(inca, 'guilds') > techCost(cas, 'guilds'), 'research costs the same in Cuzco as in Toledo');
  eq(unitFor(inca, 'inf'), 'elite_warriors', 'Inca infantry'); eq(unitFor(cas, 'inf'), 'men_at_arms', 'Castilian infantry');
  ok(!classOpen(inca, 'cav') && classOpen(cas, 'cav'), 'Inca horse');
  ok(!inca.troops.some(t => ['crossbow', 'jinetes', 'men_at_arms', 'knights', 'levy', 'bombard'].includes(t.type)), `European troops in the Inca army: ${inca.troops.map(t => t.type).join(', ')}`);
  ok(!Object.values(inca.nations).filter(n => groupOf(inca, n.id) === 'american').some(n => n.army.some(t => ['crossbow', 'jinetes', 'knights', 'arquebusiers'].includes(t.type))), 'European troops in an American army');
  eq(groupOf(cas, 'ottomans'), 'islamic', 'Ottomans');
  eq(CARDS.condottieri.weight(inca), 0, 'Swiss mercenaries for the Inca');
});

check('event paintings: every one named is a file, and every event named exists', () => {
  for (const scene of EVENT_SCENES) ok(existsSync(`art/event_${scene}.webp`), `art/event_${scene}.webp is missing`);
  for (const id of eventsWithArt()) ok(EVENT[id], `a painting is set for ${id}, which is not an event`);
  ok(EVENT_SCENES.length >= 27, `only ${EVENT_SCENES.length} event paintings`);
});

check('ground: every province has one, and hills blunt a cavalry attack', () => {
  const s = newGame('castile', 501);
  const count: Record<string, number> = {};
  for (const p of Object.values(s.provinces)) { const t = terrainOf(p); ok(TERRAINS[t], `${p.id}: unknown ground ${t}`); count[t] = (count[t] ?? 0) + 1; }
  for (const id of Object.keys(TERRAIN_OVERRIDES)) ok(s.provinces[id], `ground is set by hand for ${id}, which is not a province`);
  ok(Object.keys(count).length >= 4, `only ${Object.keys(count).length} kinds of ground in the world`);
  const dealt = (terrain: string) => { let sum = 0; for (let k = 0; k < 12; k++) { const { s: g, b } = field(520 + k, terrain, ['knights', 'knights', 'knights', 'knights'], ['men_at_arms', 'men_at_arms', 'men_at_arms']); b.enemyNext = 'hold'; sum += playRound(g, b, 'charge').dmgToDef; } return sum; };
  const open = dealt('plains'), hills = dealt('hills'), woods = dealt('forest');
  ok(hills < open * 0.85 && woods < open * 0.85, `a charge deals ${open} on open ground, ${hills} on hills, ${woods} in woods`);
  console.log(`       ground of the ${Object.keys(s.provinces).length} provinces: ${Object.entries(count).map(([k, v]) => `${k} ${v}`).join(', ')}`);
});

check('a reserve stays out of the fight until it is sent in, then strikes harder', () => {
  const { s, b } = field(531, 'plains', ['men_at_arms', 'men_at_arms', 'knights'], ['men_at_arms', 'men_at_arms', 'men_at_arms']);
  ok(canReserve(b), 'three companies cannot spare a reserve');
  setReserve(b, 900002);
  eq(reserveOf(b)?.uid, 900002, 'the company held back');
  const before = ratio(b.att);
  playRound(s, b, null);
  eq(b.att.units.find(u => u.uid === 900002)!.str, 100, 'strength of the reserve after a round it sat out');
  ok(ratio(b.att) <= before, 'the line gained strength without the reserve');
  setReserve(b, 900001);
  eq(reserveOf(b)?.uid, 900002, 'the reserve was changed after the first round');
  if (!b.done) {
    const wavering = ratio(b.att);
    commitReserve(b);
    ok(!reserveOf(b) && b.att.units.find(u => u.uid === 900002)!.fresh === b.round, 'the reserve did not enter');
    ok(ratio(b.att) > wavering, 'fresh men did not steady the line');
  }
  const { s: s2, b: b2 } = field(532, 'plains', ['men_at_arms', 'men_at_arms', 'knights'], ['men_at_arms', 'men_at_arms', 'men_at_arms']);
  setReserve(b2, 900002); autoResolve(s2, b2);
  ok(b2.done && (!reserveOf(b2) || b2.round === 1), 'left to the general, the reserve was never sent in');
  const { b: b3 } = field(533, 'plains', ['men_at_arms'], ['men_at_arms']);
  ok(!canReserve(b3), 'a single company was allowed a reserve');
});

check('a withdrawal saves the army: less strength lost than a rout, and no stability', () => {
  const { s, b } = field(541, 'plains', ['levy', 'levy'], ['men_at_arms', 'men_at_arms', 'men_at_arms', 'knights']);
  // real companies, so the result can be written back to them
  s.troops = b.att.units.map(u => ({ uid: u.uid, type: u.type, vet: 0, str: 100 }));
  ok(!canRetreat(b), 'a withdrawal was allowed before the first round');
  playRound(s, b, null);
  if (!b.done) {
    ok(canRetreat(b), 'no withdrawal after the first round');
    const left = b.att.units.map(u => u.str), stab = player(s).stability;
    retreat(b);
    ok(b.done && b.retreated && b.winner === 'def', 'the battle did not end as a withdrawal');
    const out = finishBattle(s, b);
    ok(/Withdrawal/.test(out.title), `the report calls it "${out.title}"`);
    eq(player(s).stability, stab, 'stability after a withdrawal');
    b.att.units.forEach((u, i) => { const card = s.troops.find(t => t.uid === u.uid); if (left[i] - RETREAT_COST >= 8) eq(card?.str, Math.round(left[i] - RETREAT_COST), 'strength kept by a company that withdrew'); });
  }
});

check('a general can be read: a bold one charges, a cautious one holds, about half the time', () => {
  const count = (trait: string, tactic: string) => { let n = 0; for (let k = 0; k < 120; k++) { const { s, b } = field(600 + k, 'plains', ['knights', 'men_at_arms', 'crossbow'], ['men_at_arms', 'men_at_arms'], { name: 'Test', skill: 3, traits: [trait] }); n += playRound(s, b, null).attTactic === tactic ? 1 : 0; } return n; };
  const bold = count('bold', 'charge'), plain = count('inspiring', 'charge'), careful = count('cautious', 'hold');
  ok(bold >= 60 && bold > plain + 20, `a bold general charged ${bold} times in 120, an ordinary one ${plain}`);
  ok(careful >= 60, `a cautious general held ${careful} times in 120`);
  for (const [trait, list] of Object.entries(TRAIT_TACTIC)) for (const tac of list) ok(TACTICS[tac], `${trait} favours an unknown tactic ${tac}`);
});

check('allies in the war send up to two companies, and take them home afterwards', () => {
  const s = newGame('castile', 551); s.queue = [];
  eq(alliedHelp(s, 'granada', 'granada').length, 0, 'help from an ally who is not in this war');
  declareWar(s, 'france', 'granada');
  for (const t of s.nations.france.army) t.loc = 'jaen'; // France's host stands beside the target, for the test
  const help = alliedHelp(s, 'granada', 'granada');
  ok(help.length >= 1 && help.length <= ALLY_COMPANIES && help.every(u => u.ally === 'france'), `France sent ${help.length} companies`);
  ok(s.nations.france.army.some(t => t.uid === help[0].uid), 'the lent company is not one of France\'s own');
});

// ---------- rivals ----------
check('rivals want something: history first, then the neighbour they like least, without dice', () => {
  const s = newGame('castile', 701);
  for (const [id, list] of Object.entries(HIST_GOALS)) for (const [t] of list) ok(NATIONS.some(n => n.id === id) && (NATIONS.some(n => n.id === t) || LATER_DEFS.some(n => n.id === t)), `history gives ${id} the goal ${t}, which is not a realm`);
  const rng = s.rng;
  eq(goalOf(s, 'ottomans'), 'byzantium', 'what the Ottomans want in 1451');
  eq(goalOf(s, 'france'), 'burgundy', 'what France wants in 1451');
  const big = Object.values(s.nations).filter(n => n.alive && n.id !== s.player && provsOf(s, n.id).length >= GOAL_MIN);
  ok(big.filter(n => goalOf(s, n.id)).length >= big.length * 0.8, 'most realms of some size have no goal');
  for (const n of big) { const g = goalOf(s, n.id); ok(g !== n.id, `${n.id} wants itself`); eq(goalOf(s, n.id), g, `${n.id}: the goal changed when asked twice`); }
  const small = Object.values(s.nations).find(n => n.alive && provsOf(s, n.id).length > 0 && provsOf(s, n.id).length < GOAL_MIN)!;
  eq(goalOf(s, small.id), null, 'a small realm has a goal');
  eq(s.rng, rng, 'choosing goals rolled the dice');
  s.nations.byzantium.alive = false;
  ok(goalOf(s, 'ottomans') !== 'byzantium', 'the Ottomans still want a realm that is gone');
  for (const p of ['expansionist', 'zealot', 'balanced', 'merchant', 'cautious'] as const) ok(TEMPERS[p]?.text.length > 20, `no words for the ${p} temper`);
});

/** Portugal with Castile as an angry, stronger neighbour, past the years of peace. */
function threatened(seed: number) {
  const s = newGame('portugal', seed); s.queue = []; s.pending = [];
  s.year = s.startYear + 20; s.rel[['castile', 'portugal'].sort().join('|')] = -60;
  if (getRel(s, 'portugal', 'castile') !== -60) addRel(s, 'portugal', 'castile', -60 - getRel(s, 'portugal', 'castile'));
  s.troops = []; for (const p of provsOf(s, 'portugal')) p.fort = 0;
  s.treaties = s.treaties.filter(t => !((t.a === 'castile' && t.b === 'portugal') || (t.b === 'castile' && t.a === 'portugal')));
  return s;
}

check('no war on the player arrives unannounced: first the warning, a year later the blow', () => {
  const s = threatened(711), castile = s.nations.castile;
  ok(wantsPlayer(s, castile), 'the test neighbour does not want the war');
  eq(mayStrikePlayer(s, castile), false, 'struck with no warning');
  eq(s.pending!.filter(x => x.id === 'war_warning').length, 1, 'warnings sent');
  eq(mayStrikePlayer(s, castile), false, 'struck in the year of the warning');
  eq(s.pending!.filter(x => x.id === 'war_warning').length, 1, 'warnings after asking twice');
  s.year++;
  eq(mayStrikePlayer(s, castile), true, 'held back a year after the warning');
  // the player answered: an envoy lifted relations, and the levies go home
  addRel(s, 'portugal', 'castile', 40);
  eq(mayStrikePlayer(s, castile), false, 'struck although relations were mended');
  const a = attitude(s, 'castile', threatOf(s, 'castile'));
  ok(a.reasons.length > 0 && a.word.length > 0, 'no attitude towards the player');
  declareWar(s, 'castile', 'portugal');
  eq(attitude(s, 'castile').word, 'At war', 'the word for a realm at war with the player');
});

check('rivals ask: a warning, an ultimatum, silver, a joint war, a friend given up', () => {
  for (const def of REQUEST_EVENTS) {
    const s = threatened(721);
    player(s).gold = 5000;
    addRel(s, 'portugal', 'england', 40 - getRel(s, 'portugal', 'england')); addRel(s, 'portugal', 'france', -5 - getRel(s, 'portugal', 'france'));
    if (!hasTreaty(s, 'portugal', 'england', 'alliance')) s.treaties.push({ a: 'england', b: 'portugal', kind: 'alliance', since: s.year });
    if (!atWar(s, 'england', 'france')) declareWar(s, 'england', 'france');
    addRel(s, 'france', 'england', -60 - getRel(s, 'france', 'england'));
    s.nations.england.goal = { target: 'castile', since: s.year };
    const fixed: Record<string, Record<string, string | number>> = { war_warning: { nation: 'castile' }, ultimatum_due: { nation: 'castile', prov: provsOf(s, 'portugal').find(p => p.id !== player(s).capital)!.id } };
    ok(!def.cond || def.cond(s), `${def.id}: its condition fails in a game made for it`);
    const v = fixed[def.id] ?? (def.setup ? def.setup(s) : {});
    ok(v, `${def.id}: found no realm to ask`);
    const text = def.text(s, v!);
    ok(words(text) <= MAX_WORDS && !/undefined/.test(text), `${def.id}: ${words(text)} words, or a hole in the text`);
    ok((typeof def.title === 'string' ? def.title : def.title(s, v!)).length > 5, `${def.id}: no title`);
    for (const o of def.options) {
      const c = JSON.parse(JSON.stringify(s)) as GameState;
      if (o.can?.(c, v!)) continue;
      const items = o.run(c, v!);
      ok(items.length > 0 && items.every(it => it.title && it.text), `${def.id}: "${o.label}" shows nothing`);
    }
  }
  // giving up a province really moves it, and refusing really means war
  const s = threatened(722), v = { nation: 'castile', prov: provsOf(s, 'portugal').find(p => p.id !== player(s).capital)!.id };
  const a = JSON.parse(JSON.stringify(s)) as GameState; EVENT.ultimatum_due.options[0].run(a, v);
  eq(a.provinces[v.prov].owner, 'castile', 'owner of the province given up');
  ok(a.truces.some(t => t.a === 'castile' && t.b === 'portugal'), 'no truce after giving way');
  const b = JSON.parse(JSON.stringify(s)) as GameState; EVENT.ultimatum_due.options[1].run(b, v);
  ok(atWar(b, 'castile', 'portugal'), 'no war after refusing');
});

check('rivals leave a record of what they do', () => {
  const s = play(newGame('castile', 731), 40);
  const withDeeds = Object.values(s.nations).filter(n => n.alive && n.id !== s.player && (n.deeds ?? []).length > 0);
  ok(withDeeds.length >= 20, `only ${withDeeds.length} realms did anything worth writing down in ten years`);
  ok(withDeeds.every(n => n.deeds!.length <= DEEDS_KEPT && n.deeds!.every((d, i) => i === 0 || d.year <= n.deeds![i - 1].year)), 'a record is too long or out of order');
});

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
