import { newGame, endTurn, chooseEventOption, playerDeclareWar, ranking, chooseHeir, adoptCore, coreBlocked } from '../src/engine/turn';
import { EVENT } from '../src/engine/events';
import { autoResolve, finishBattle } from '../src/engine/battle';
import { takeDraftOption, doMerge, mergePreview, buyCard, hireWithCard, sellOffices, officeCost } from '../src/engine/drafts';
import { launchMission, missionBlocked, importable, cardRole, cardRoles, attackRoute } from '../src/engine/missions';
import { discoverable } from '../src/engine/overseas';
import { hireShip, transportOf } from '../src/engine/navy';
import { warScore, peaceTerms, concludePeace, enemyDemands, subjectsOf } from '../src/engine/diplo';
import { REGIONS } from '../src/data/overseas';
import { TECHS, BUILDINGS } from '../src/data/techs';
import { provsOf, player, enemiesOf, armyCap, incomeOf, atWar } from '../src/engine/core';
import { CARDS, playCard, cardBlocked, buyCost } from '../src/engine/cards';
import { neighbours } from '../src/engine/map';
import { CATS, type GameState } from '../src/types';

const R = Math.random;
function resolveQueue(s: GameState) {
  let guard = 0;
  while (s.queue.length && guard++ < 60) {
    const p = s.queue[0];
    if (p.kind === 'event') {
      const e = EVENT[p.eventId];
      const ok = e.options.map((o, i) => [o, i] as const).filter(([o]) => !o.can?.(s, p.vars));
      if (!ok.length) { s.queue.shift(); continue; }
      const r = chooseEventOption(s, ok[Math.floor(R() * ok.length)][1]);
      if (typeof r === 'string') s.queue.shift();
    } else if (p.kind === 'battle') { autoResolve(s, p.battle); finishBattle(s, p.battle); s.queue.shift(); }
    else if (p.kind === 'draft') { takeDraftOption(s, p.options[Math.floor(R() * p.options.length)]); s.queue.shift(); }
    else if (p.kind === 'succession') chooseHeir(s, Math.floor(R() * p.heirs.length));
    else if (p.kind === 'peace') {
      s.queue.shift();
      if (!s.nations[p.enemy]?.alive || !atWar(s, s.player, p.enemy)) continue;
      const sc = warScore(s, p.enemy);
      if (sc > 0) { let b = sc; const ids: string[] = []; for (const t of peaceTerms(s, p.enemy).reverse()) if (t.cost <= b && !(t.id.startsWith('gold') && ids.some(i => i.startsWith('gold')))) { ids.push(t.id); b -= t.cost; } concludePeace(s, p.enemy, ids); }
      else if (R() < 0.7) concludePeace(s, p.enemy, enemyDemands(s, p.enemy).map(t => t.id), true);
    }
    else s.queue.shift();
  }
}
const free = (s: GameState, role: string) => s.characters.filter(c => c.role === role && c.mission == null).sort((a, b) => b.skill - a.skill)[0];

function botTurn(s: GameState) {
  const me = player(s);
  while (me.gold > 300 && me.gold > officeCost(s) * 3 && !sellOffices(s)) { /* turn spare gold into cards */ }
  for (const c of ['consolidation', 'open', 'mercantile', 'land']) if (!coreBlocked(s, c)) adoptCore(s, c);
  for (let k = 0; k < 3; k++) { const c = CATS[Math.floor(R() * 5)]; if (s.np >= buyCost(s, c) + 2) { buyCard(s, c); resolveQueue(s); } }
  for (const h of [...s.hand]) {
    if (!s.hand.includes(h)) continue;
    const d = CARDS[h.card];
    if (d.kind === 'troop') { const g = free(s, 'general'); if (!cardBlocked(s, d) && me.gold > 30) playCard(s, h.uid, g ? String(g.uid) : ''); continue; }
    if (d.kind === 'ship') { const g = free(s, 'admiral') ?? free(s, 'general'); if (!cardBlocked(s, d) && me.gold > 50) hireShip(s, h.uid, g?.uid); continue; }
    if (d.kind === 'hire') { if (s.characters.filter(c => c.role === d.role).length < 2) { hireWithCard(s, h.uid); resolveQueue(s); } continue; }
    if (d.kind === 'equip') {
      for (const t of s.troops) { const r = mergePreview(s, t.uid, h.uid); if (!('error' in r) && !r.tech && me.gold > r.cost + 20) { doMerge(s, t.uid, h.uid); break; } }
      continue;
    }
    if (d.kind === 'instant') {
      if (cardBlocked(s, d)) continue;
      let target = '';
      if (d.target === 'nation') target = Object.keys(s.nations).find(n => n !== s.player && s.nations[n].alive)!;
      if (d.target === 'mission') { const m = s.missions.find(m => d.targetOk!(s, String(m.id))); if (!m) continue; target = String(m.id); }
      if (d.target === 'troop') { const t = s.troops.find(t => d.targetOk!(s, String(t.uid))); if (!t) continue; target = String(t.uid); }
      if (d.burden && me.gold < 80) continue;
      playCard(s, h.uid, target); continue;
    }
    // mission cards
    const kind = d.missions![0];
    const role = cardRole(d.id);
    if (kind === 'explore' || kind === 'colonize' || kind === 'conquista') {
      let c = free(s, role);
      if (!c) c = s.characters.find(x => !x.ruler && x.mission == null && cardRoles(d.id).includes(x.role) && s.characters.filter(y => y.role === x.role).length > 1);
      if (!c) continue;
      if (kind === 'explore') { if (discoverable(s).length && me.gold > 60) launchMission(s, 'explore', c.uid, '', [], undefined, h.uid); continue; }
      const tgt = Object.keys(REGIONS).find(id => !missionBlocked(s, kind, id));
      if (!tgt) continue;
      const troops = kind === 'conquista' ? s.troops.filter(t => t.mission == null).slice(0, 4).map(t => t.uid) : [];
      launchMission(s, kind, c.uid, tgt, troops, undefined, h.uid);
      continue;
    }
    if (kind === 'conquer') {
      const g = free(s, 'admiral') ?? free(s, role); if (!g) continue;
      const en = enemiesOf(s, s.player);
      const targets = Object.values(s.provinces).filter(p => en.includes(p.owner) && !missionBlocked(s, 'conquer', p.id)).sort((a, b) => a.fort - b.fort);
      const home = s.troops.filter(t => t.mission == null && t.str > 40);
      if (targets.length && home.length >= 4) {
        const t0 = targets[0]; const troops = home.slice(0, Math.min(g.skill + 3, Math.ceil(home.length * 0.6))).map(t => t.uid);
        const ships = attackRoute(s, t0.id)?.naval ? s.fleet.filter(f => f.mission == null).map(f => f.uid) : [];
        launchMission(s, 'conquer', g.uid, t0.id, troops.slice(0, ships.length ? Math.max(1, transportOf(s, ships)) : troops.length), undefined, h.uid, undefined, ships);
      }
    } else if (['relations', 'trade', 'alliance', 'marriage', 'peace'].includes(kind)) {
      const dip = free(s, role); if (!dip) continue;
      const others = Object.keys(s.nations).filter(n => n !== s.player && s.nations[n].alive && !missionBlocked(s, kind, n));
      if (!others.length) continue;
      const t = others[Math.floor(R() * others.length)];
      launchMission(s, kind, dip.uid, t, [], undefined, h.uid, kind === 'trade' ? importable(s, t)[0] : undefined);
    } else if (kind === 'research') {
      const r = free(s, role); if (!r) continue;
      const t = TECHS.find(t => t.track === d.track && !missionBlocked(s, 'research', t.id));
      if (t) launchMission(s, 'research', r.uid, t.id, [], undefined, h.uid);
    } else {
      const a = free(s, role); if (!a) continue;
      if (kind === 'build') {
        const opts = Object.values(BUILDINGS).filter(b => b.group === d.group).map(b => b.id);
        for (const b of opts) { const p = provsOf(s, s.player).find(p => !missionBlocked(s, 'build', p.id, b)); if (p) { launchMission(s, 'build', a.uid, p.id, [], b, h.uid); break; } }
      } else if (kind === 'convert' || kind === 'assimilate') {
        const p = provsOf(s, s.player).find(p => !missionBlocked(s, kind, p.id)); if (p) launchMission(s, kind, a.uid, p.id, [], undefined, h.uid);
      } else if (kind === 'develop' || kind === 'found' || kind === 'grow') {
        const p = provsOf(s, s.player).find(p => !missionBlocked(s, kind, p.id)); if (p && me.gold > 120) launchMission(s, kind, a.uid, p.id, [], undefined, h.uid);
      } else launchMission(s, kind, a.uid, '', [], undefined, h.uid);
    }
  }
  if (!enemiesOf(s, s.player).length && R() < 0.05 && s.troops.length >= 8) {
    const nb = new Set<string>();
    for (const p of provsOf(s, s.player)) for (const n of neighbours(p.id)) if (s.provinces[n].owner !== s.player) nb.add(s.provinces[n].owner);
    const t = [...nb].sort((a, b) => s.nations[a].army.length - s.nations[b].army.length)[0];
    if (t && s.nations[t].army.length < s.troops.length) playerDeclareWar(s, t);
  }
}

// ---------- runner ----------
// MODE=reasonable|passive|greedy  SEEDS=n
const MODE = process.env.MODE ?? 'reasonable';
const SEEDS = Number(process.env.SEEDS ?? 4);
const CHECK = MODE === 'big' ? [1455, 1460, 1470, 1480, 1500, 1513] : [1500, 1550, 1600, 1650, 1700, 1750];
type Row = Record<string, number>;
const rows: Record<number, Row[]> = {};
const finals: Row[] = [];
function snap(s: GameState): Row {
  const me = player(s); const inc = incomeOf(s, s.player);
  const r = ranking(s);
  return { gold: me.gold, inc: inc.total, gross: inc.provinces + inc.trade + inc.goods + inc.other, upk: inc.upkeep + inc.salaries + inc.imports, provs: provsOf(s, s.player).length, stab: me.stability, happy: s.happiness, hand: s.hand.length, troops: s.troops.length, rank: r.findIndex(x => x.id === s.player) + 1, alive: me.alive ? 1 : 0 };
}
function passiveTurn(s: GameState) {
  for (const h of [...s.hand]) { const d = CARDS[h.card]; if (d.kind === 'instant' && !d.target && !cardBlocked(s, d) && !d.burden) playCard(s, h.uid, ''); }
}
function greedyExtra(s: GameState) {
  if (!enemiesOf(s, s.player).length && player(s).stability >= 0 && R() < 0.4) {
    const nb = new Set<string>();
    for (const p of provsOf(s, s.player)) for (const n of neighbours(p.id)) if (s.provinces[n].owner !== s.player && !s.nations[s.provinces[n].owner].overlord) nb.add(s.provinces[n].owner);
    const mine = s.troops.reduce((a, t) => a + 1 + t.vet * 0.3, 0);
    const t = [...nb].filter(x => s.nations[x].army.length * 1.2 < mine).sort((a, b) => s.nations[a].army.length - s.nations[b].army.length)[0];
    if (t) playerDeclareWar(s, t);
  }
}
for (const n of (MODE === 'big' ? ['castile'] : ['castile', 'portugal', 'aragon'])) for (let seed = 1; seed <= SEEDS; seed++) {
  const s = newGame(n, seed * 7919 + (MODE === 'passive' ? 1 : MODE === 'greedy' ? 2 : 0));
  if (MODE === 'big') { for (const id of ['granada', 'malaga', 'porto', 'lisbon', 'alentejo', 'algarve', 'navarre', 'zaragoza', 'catalonia', 'valencia', 'tangier', 'fez', 'rif', 'oran']) { const prov = s.provinces[id]; const from = prov.owner; prov.owner = n; if (!Object.values(s.provinces).some(x => x.owner === from)) s.nations[from].alive = false; } s.wars = s.wars.filter(w => s.nations[w.a].alive && s.nations[w.b].alive); for (let i = 0; i < 8; i++) s.troops.push({ uid: 50000 + i, type: 'pikemen', vet: 1, str: 100 }); }
  resolveQueue(s);
  let turns = 0;
  try {
    while (!s.over && turns < (MODE === 'big' ? 60 : 400)) {
      if (MODE === 'passive') passiveTurn(s); else { botTurn(s); if (MODE === 'greedy') greedyExtra(s); }
      resolveQueue(s); endTurn(s); resolveQueue(s); turns++;
      if (CHECK.includes(s.year)) (rows[s.year] ??= []).push(snap(s));
    }
  } catch (e) { console.error('CRASH', n, seed, s.year, e); throw e; }
  const f = snap(s); f.year = s.year; f.provs = provsOf(s, n).length; finals.push(f);
  if (process.env.TOP) console.log('  top', n, seed, ranking(s).slice(0, 4).map(r => r.name + ':' + r.score + '(' + provsOf(s, r.id).length + 'p,' + Math.round(s.nations[r.id].prestige) + 'pr)').join(' '));
  if (process.env.WHY && f.provs === 0) console.log('  died', n, seed, s.year, s.log.filter(l => l.tone === 'bad').slice(0, 6).map(l => l.year + ' ' + l.text).join(' | '));
}
const avg = (a: Row[], k: string) => a.reduce((x, r) => x + (r[k] ?? 0), 0) / Math.max(1, a.length);
const med = (a: Row[], k: string) => { const v = a.map(r => r[k]).sort((x, y) => x - y); return v[Math.floor(v.length / 2)] ?? 0; };
console.log(`MODE ${MODE}, ${finals.length} campaigns`);
console.log('year  n  gold(med) income gross  costs provs stab happy hand troops rank');
for (const y of CHECK) { const a = rows[y] ?? []; if (!a.length) continue; console.log(String(y).padEnd(5), String(a.length).padStart(2), String(Math.round(med(a, 'gold'))).padStart(8), avg(a, 'inc').toFixed(0).padStart(6), avg(a, 'gross').toFixed(0).padStart(5), avg(a, 'upk').toFixed(0).padStart(6), avg(a, 'provs').toFixed(1).padStart(5), avg(a, 'stab').toFixed(1).padStart(4), avg(a, 'happy').toFixed(0).padStart(5), avg(a, 'hand').toFixed(0).padStart(4), avg(a, 'troops').toFixed(0).padStart(6), avg(a, 'rank').toFixed(1).padStart(4)); }
const survived = finals.filter(f => f.year > 1750 && f.provs > 0).length;
console.log(`survived ${survived}/${finals.length} · top3 ${finals.filter(f => f.year > 1750 && f.rank >= 1 && f.rank <= 3).length} · wins(#1) ${finals.filter(f => f.year > 1750 && f.rank === 1).length}`);
