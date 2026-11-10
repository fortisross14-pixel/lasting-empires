import { newGame, endTurn, chooseEventOption, playerDeclareWar, ranking, chooseHeir, adoptCore, coreBlocked } from '../src/engine/turn';
if (process.env.NOWARCARDS) (globalThis as { NOWARCARDS?: boolean }).NOWARCARDS = true;
if (process.env.HANDLIMIT) (globalThis as { HANDLIMIT?: boolean }).HANDLIMIT = true;
import { EVENT } from '../src/engine/events';
import { autoResolve, finishBattle } from '../src/engine/battle';
import { takeDraftOption, doMerge, mergePreview, buyCard, hireWithCard, sellOffices, officeCost } from '../src/engine/drafts';
import { launchMission, missionBlocked, cardRole, cardRoles, attackRoute } from '../src/engine/missions';
import { discoverable, provRegion } from '../src/engine/overseas';
import { hireShip, transportOf } from '../src/engine/navy';
import { warScore, peaceTerms, concludePeace, enemyDemands, subjectsOf } from '../src/engine/diplo';
import { TECHS, BUILDINGS } from '../src/data/techs';
import { provsOf, player, enemiesOf, armyCap, incomeOf, atWar } from '../src/engine/core';
import { CARDS, playCard, cardBlocked, buyCost } from '../src/engine/cards';
import { neighbours } from '../src/engine/map';
import { CATS, type GameState } from '../src/types';
import { NATIONS } from '../src/data/nations';
import { troopsNear } from '../src/engine/army';
import { happinessOf } from '../src/engine/society';
import { partners, routeBlocked, postBlocked, quarterFlow, defaultMake } from '../src/engine/trade';
import { GOODS } from '../src/data/goods';
import { appointViceroy, viceroyBlocked } from '../src/engine/realm';

// the bot's own choices: seeded with SIMSEED for repeatable runs, otherwise random
let simSeed = Number(process.env.SIMSEED ?? 0) || Math.floor(Math.random() * 2 ** 31);
const R = () => { simSeed = (simSeed * 1103515245 + 12345) % 2147483648; return simSeed / 2147483648; };
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
  if ((s.quarter ?? 0) === 1) { const seat = provsOf(s, s.player).find(p => !viceroyBlocked(s, p.id)); const who = s.characters.filter(c => c.mission == null && !c.ruler && c.role === 'admin').sort((a, b) => a.skill - b.skill)[0]; if (seat && who) appointViceroy(s, seat.id, who.uid); }
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
      const tgt = Object.keys(s.provinces).find(id => !missionBlocked(s, kind, id));
      if (!tgt) continue;
      const troops = kind === 'conquista' ? s.troops.filter(t => t.mission == null).slice(0, 4).map(t => t.uid) : [];
      launchMission(s, kind, c.uid, tgt, troops, undefined, h.uid);
      continue;
    }
    if (kind === 'conquer') {
      const g = free(s, 'admiral') ?? free(s, role); if (!g) continue;
      const en = enemiesOf(s, s.player);
      const targets = Object.values(s.provinces).filter(p => en.includes(p.owner) && !missionBlocked(s, 'conquer', p.id)).sort((a, b) => a.fort - b.fort);
      const t0 = targets[0];
      const home = t0 ? troopsNear(s, s.player, t0.id).filter(t => t.str > 40) : [];
      if (targets.length && home.length >= 3) {
        const troops = home.slice(0, Math.min(g.skill + 3, Math.ceil(home.length * 0.6))).map(t => t.uid);
        const ships = attackRoute(s, t0.id)?.naval ? s.fleet.filter(f => f.mission == null).map(f => f.uid) : [];
        launchMission(s, 'conquer', g.uid, t0.id, troops.slice(0, ships.length ? Math.max(1, transportOf(s, ships)) : troops.length), undefined, h.uid, undefined, ships);
      }
    } else if (['relations', 'trade', 'alliance', 'marriage', 'peace'].includes(kind)) {
      const dip = free(s, role); if (!dip) continue;
      const others = Object.keys(s.nations).filter(n => n !== s.player && s.nations[n].alive && !missionBlocked(s, kind, n));
      if (!others.length) continue;
      const t = others[Math.floor(R() * others.length)];
      launchMission(s, kind, dip.uid, t, [], undefined, h.uid);
    } else if (kind === 'route' || kind === 'post') {
      // workshops make whatever is shortest
      for (const p of provsOf(s, s.player)) if (p.buildings.includes('workshop') || p.buildings.includes('manufactory')) p.make = defaultMake(s);
      if (process.env.NOTRADE) continue;
      const m = free(s, role); if (!m) continue;
      // buy what runs short; sell what overflows
      const short = Object.entries(s.short).filter(([g, v]) => v > 0.15 && g !== 'food').sort((a, b) => b[1] - a[1])[0]?.[0] ?? ((s.short.food ?? 0) > 0.15 ? 'grain' : null);
      const dir = d.trade ?? 'buy';
      if (kind === 'route' && dir === 'buy' && short) {
        const f = quarterFlow(s);
        const gap = Math.min(4, Math.max(1, Math.ceil((f.missing[short === 'grain' ? 'food' : short] ?? 0) * 4)));
        const pt = partners(s, short, 'buy').find(x => !x.why && !routeBlocked(s, short, 'buy', x.nation, gap));
        if (pt && me.gold > 40 && !s.missions.some(x => x.kind === 'route' && x.good === short)) launchMission(s, 'route', m.uid, pt.nation, [], undefined, h.uid, short, [], { dir: 'buy', amount: gap });
      } else if (kind === 'route' && dir === 'sell') {
        const f = quarterFlow(s);
        const over = Object.entries(f.overflow).sort((a, b) => b[1] * GOODS[b[0]].price - a[1] * GOODS[a[0]].price)[0]?.[0];
        const pt = over && partners(s, over, 'sell').find(x => !x.why && !routeBlocked(s, over, 'sell', x.nation, 2));
        if (pt) launchMission(s, 'route', m.uid, pt.nation, [], undefined, h.uid, over, [], { dir: 'sell', amount: 2 });
      } else if (kind === 'post') {
        const r = s.routes[0];
        if (r && !postBlocked(s, r.partner) && me.gold > 100) launchMission(s, 'post', m.uid, r.partner, [], undefined, h.uid);
      }
    } else if (kind === 'research') {
      const r = free(s, role); if (!r) continue;
      const t = TECHS.find(t => t.track === d.track && !missionBlocked(s, 'research', t.id));
      if (t) launchMission(s, 'research', r.uid, t.id, [], undefined, h.uid);
    } else {
      const a = free(s, role) ?? s.characters.filter(c => !c.ruler && c.mission == null && cardRoles(d.id).includes(c.role)).sort((x, y) => y.skill - x.skill)[0]; if (!a) continue;
      if (process.env.NOCULTURE && d.cat === 'culture') continue;
      if (kind === 'artwork') { if (me.gold > 60) { const gs = ['sacred', 'portrait', 'epic', 'treatise', 'monument']; launchMission(s, 'artwork', a.uid, gs[Math.floor(R() * gs.length)], [], undefined, h.uid); } continue; }
      if (kind === 'accept') { const c = provsOf(s, s.player).map(p => p.culture).find(c => !missionBlocked(s, 'accept', c)); if (c) launchMission(s, 'accept', a.uid, c, [], undefined, h.uid); continue; }
      if (kind === 'assist') { const st = s.missions.find(m => m.kind === 'research' && !missionBlocked(s, 'assist', String(m.id))); if (st) launchMission(s, 'assist', a.uid, String(st.id), [], undefined, h.uid); continue; }
      if (kind === 'pilgrimage') { if (me.gold > 50) launchMission(s, 'pilgrimage', a.uid, '', [], undefined, h.uid); continue; }
      if (kind === 'build') {
        let opts = Object.values(BUILDINGS).filter(b => b.group === d.group).map(b => b.id);
        // short of made goods: a workshop first
        const shortMade = Object.entries(s.short).some(([g, v]) => v > 0.2 && GOODS[g]?.kind === 'made');
        if (shortMade && !process.env.NOWORKSHOP) opts = ['workshop', ...opts.filter(b => b !== 'workshop')];
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
const PICK = process.env.NATIONS === 'all' ? NATIONS.filter(d => !d.native).map(d => d.id) : process.env.NATIONS ? process.env.NATIONS.split(',') : ['castile', 'portugal', 'aragon'];
for (const n of (MODE === 'big' ? ['castile'] : PICK)) for (let seed = 1; seed <= SEEDS; seed++) {
  const s = newGame(n, seed * 7919 + (MODE === 'passive' ? 1 : MODE === 'greedy' ? 2 : 0));
  if (MODE === 'big') { for (const id of ['granada', 'malaga', 'almeria', 'porto', 'lisbon', 'evora', 'faro', 'coimbra', 'pamplona', 'zaragoza', 'barcelona', 'valencia', 'tangier', 'fez', 'oran', 'tlemcen']) { const prov = s.provinces[id]; const from = prov.owner; prov.owner = n; if (!Object.values(s.provinces).some(x => x.owner === from)) s.nations[from].alive = false; } s.wars = s.wars.filter(w => s.nations[w.a].alive && s.nations[w.b].alive); for (let i = 0; i < 8; i++) s.troops.push({ uid: 50000 + i, type: 'pikemen', vet: 1, str: 100 }); }
  resolveQueue(s);
  let turns = 0;
  try {
    while (!s.over && turns < Number(process.env.TURNS ?? (MODE === 'big' ? 240 : 1300))) {
      if (MODE === 'passive') passiveTurn(s); else { botTurn(s); if (MODE === 'greedy') greedyExtra(s); }
      resolveQueue(s); endTurn(s); resolveQueue(s); turns++;
      if (CHECK.includes(s.year) && s.quarter === 0) (rows[s.year] ??= []).push(snap(s));
      if (process.env.TRACE && s.quarter === 0 && s.year % 20 === 0) { const own: Record<string, number> = {}; for (const p of Object.values(s.provinces)) if (p.core === s.player && p.owner !== s.player) own[p.owner] = (own[p.owner] ?? 0) + 1; console.log('  trace', n, s.year, 'provs', provsOf(s, s.player).length, 'troops', s.troops.length, 'stab', player(s).stability, 'lost to', JSON.stringify(own), 'wars', s.wars.filter(w => w.a === s.player || w.b === s.player).map(w => w.a === s.player ? w.b : w.a).join(',')); }
    }
  } catch (e) { console.error('CRASH', n, seed, s.year, e); throw e; }
  if (process.env.DUMP) console.log('  state', n, 'provs', provsOf(s, n).length, 'overlord', player(s).overlord, 'year', s.year, 'over', s.over, 'hand', s.hand.length);
  if (process.env.DUMP) { const c: Record<string, number> = {}; for (const h of s.hand) c[h.card] = (c[h.card] ?? 0) + 1; console.log('  hand', n, JSON.stringify(c), 'gold', Math.round(player(s).gold), 'income', JSON.stringify(incomeOf(s, n), (k, v) => typeof v === 'number' ? Math.round(v * 10) / 10 : v)); }
  if (process.env.HASH) console.log('  hash', n, seed, s.year, require('crypto').createHash('md5').update(JSON.stringify(s)).digest('hex'));
  const f = snap(s); f.year = s.year; f.provs = provsOf(s, n).length; finals.push(f);
  if (process.env.GOODSLOG) { const t = incomeOf(s, n); console.log('  goods', n, seed, s.year, 'short', JSON.stringify(Object.fromEntries(Object.entries(s.short).filter(([, v]) => v > 0.05))), 'routes', s.routes.map(r => r.dir + ':' + r.good + '>' + r.partner).join(','), 'posts', s.posts.map(p => p.nation).join(','), 'workshops', provsOf(s, n).filter(p => p.make && (p.buildings.includes('workshop') || p.buildings.includes('manufactory'))).map(p => p.make).join(','), 'trade+', t.goods.toFixed(1), 'trade-', t.imports.toFixed(1), 'total', t.total.toFixed(1)); }
  if (process.env.GOODSLOG) console.log('  culture', n, seed, 'works', (s.works ?? []).length, 'best', (s.works ?? []).filter(w => w.quality >= 3).map(w => w.name).slice(0, 4).join('; '), 'accepted', s.accepted.length, 'church', Math.round(s.flags['faith_' + s.stateReligion] ?? (s.rel['papacy'] ? 0 : 0)), 'people', s.characters.filter(c => ['courtier', 'priest', 'artist', 'leader'].includes(c.role)).map(c => c.role).join(','));
  if (process.env.WHERE) { const reg: Record<string, number> = {}; for (const p of provsOf(s, n)) { const r = provRegion(p.id); reg[r] = (reg[r] ?? 0) + 1; } const how: Record<string, number> = {}; for (const l of s.log) { const k = /colony|Colony/.test(l.text) ? 'colony' : /conquer|taken|falls|captured/i.test(l.text) ? 'conquest' : /integrat|vassal|union/i.test(l.text) ? 'diplo' : ''; if (k) how[k] = (how[k] ?? 0) + 1; } console.log('  where', n, seed, JSON.stringify(reg), JSON.stringify(how)); }
  if (process.env.TOP) console.log('  top', n, seed, ranking(s).slice(0, 4).map(r => r.name + ':' + r.score + '(' + provsOf(s, r.id).length + 'p,' + Math.round(s.nations[r.id].prestige) + 'pr)').join(' '));
  if (process.env.CIVIL) { const hs = provsOf(s, s.player).map(p => happinessOf(s, p).value); console.log('  happy', n, 'provs', hs.length, 'min', Math.min(...hs), 'under30', hs.filter(h => h < 30).length, 'under40', hs.filter(h => h < 40).length, 'vblock', viceroyBlocked(s, provsOf(s, s.player).filter(p => p.id !== player(s).capital)[0]?.id ?? '')); }
  if (process.env.CIVIL) console.log('  civil', n, seed, s.log.filter(l => /Civil war|joins the|rising|crowns himself|declares independence|breaks away/i.test(l.text)).map(l => l.year + ' ' + l.text).slice(0, 8).join(' | '), 'viceroys', (s.viceroys ?? []).length);
  if (process.env.WHY && f.provs === 0) console.log('  died', n, seed, s.year, s.log.filter(l => l.tone === 'bad').slice(0, 6).map(l => l.year + ' ' + l.text).join(' | '));
}
const avg = (a: Row[], k: string) => a.reduce((x, r) => x + (r[k] ?? 0), 0) / Math.max(1, a.length);
const med = (a: Row[], k: string) => { const v = a.map(r => r[k]).sort((x, y) => x - y); return v[Math.floor(v.length / 2)] ?? 0; };
console.log(`MODE ${MODE}, ${finals.length} campaigns`);
console.log('year  n  gold(med) income gross  costs provs stab happy hand troops rank');
for (const y of CHECK) { const a = rows[y] ?? []; if (!a.length) continue; console.log(String(y).padEnd(5), String(a.length).padStart(2), String(Math.round(med(a, 'gold'))).padStart(8), avg(a, 'inc').toFixed(0).padStart(6), avg(a, 'gross').toFixed(0).padStart(5), avg(a, 'upk').toFixed(0).padStart(6), avg(a, 'provs').toFixed(1).padStart(5), avg(a, 'stab').toFixed(1).padStart(4), avg(a, 'happy').toFixed(0).padStart(5), avg(a, 'hand').toFixed(0).padStart(4), avg(a, 'troops').toFixed(0).padStart(6), avg(a, 'rank').toFixed(1).padStart(4)); }
const survived = finals.filter(f => f.year > 1750 && f.provs > 0).length;
console.log(`survived ${survived}/${finals.length} · top3 ${finals.filter(f => f.year > 1750 && f.rank >= 1 && f.rank <= 3).length} · wins(#1) ${finals.filter(f => f.year > 1750 && f.rank === 1).length}`);
if (process.env.LIST) for (const f of finals) console.log('  final', f.nation ?? '', f.provs, f.rank);
if (process.env.ROWS) console.log(JSON.stringify(rows[1750]));
