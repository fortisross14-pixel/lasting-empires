// Engine checks that run without a browser: `npm test`. Each check is small and names what it protects.
// The bot simulation (`npm run sim`) stays the tool for balance; this file is for rules that must never break.
import { newGame, newMissionGame, endTurn, chooseEventOption, chooseHeir, migrate } from '../src/engine/turn';
import { EVENT } from '../src/engine/events';
import { autoResolve, finishBattle } from '../src/engine/battle';
import { takeDraftOption } from '../src/engine/drafts';
import { CARDS } from '../src/engine/cards';
import { MISSIONS } from '../src/data/missions';
import { DIFFICULTY, LENGTHS, STANDARD } from '../src/data/difficulty';
import { STARTS } from '../src/data/starts';
import { attention, readyByDeck, markTurn, stopReasons, cardHasTarget, SKIP_MAX } from '../src/engine/pace';
import { missionCap } from '../src/engine/realm';
import { player, provsOf } from '../src/engine/core';
import type { GameState } from '../src/types';

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

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
