import { newGame, endTurn, chooseEventOption, playerDeclareWar, ranking, chooseHeir, adoptCore, coreBlocked } from '../src/engine/turn';
import { EVENT } from '../src/engine/events';
import { autoResolve, finishBattle } from '../src/engine/battle';
import { takeDraftOption, doMerge, mergePreview, buyCard, hireWithCard } from '../src/engine/drafts';
import { launchMission, missionBlocked, importable, cardRole, attackRoute } from '../src/engine/missions';
import { promote, discoverable } from '../src/engine/overseas';
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
  for (const c of ['consolidation', 'open', 'mercantile', 'land']) if (!coreBlocked(s, c)) adoptCore(s, c);
  for (let k = 0; k < 3; k++) { const c = CATS[Math.floor(R() * 5)]; if (s.np >= buyCost(s, c) + 2) { buyCard(s, c); resolveQueue(s); } }
  for (const h of [...s.hand]) {
    if (!s.hand.includes(h)) continue;
    const d = CARDS[h.card];
    if (d.kind === 'troop') { const g = free(s, 'general'); if (!cardBlocked(s, d) && me.gold > 30) playCard(s, h.uid, g ? String(g.uid) : ''); continue; }
    if (d.kind === 'ship') { const g = s.characters.find(c => (c.role === 'admiral' || (c.role === 'general' && s.characters.filter(x => x.role === 'general').length > 1)) && c.mission == null); if (g && !cardBlocked(s, d) && me.gold > 50) hireShip(s, h.uid, g.uid); continue; }
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
      if (!c) { const base = s.characters.find(x => !x.ruler && x.mission == null && ({ explorer: 'diplomat', conqueror: 'general', colonist: 'admin' } as any)[role] === x.role && s.characters.filter(y => y.role === x.role).length > 1); if (base && !promote(s, base.uid)) c = base; }
      if (!c) continue;
      if (kind === 'explore') { if (discoverable(s).length && me.gold > 60) launchMission(s, 'explore', c.uid, '', [], undefined, h.uid); continue; }
      const tgt = Object.keys(REGIONS).find(id => !missionBlocked(s, kind, id));
      if (!tgt) continue;
      const troops = kind === 'conquista' ? s.troops.filter(t => t.mission == null).slice(0, 4).map(t => t.uid) : [];
      launchMission(s, kind, c.uid, tgt, troops, undefined, h.uid);
      continue;
    }
    if (kind === 'conquer') {
      const g = free(s, role); if (!g) continue;
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

for (const n of ['castile', 'portugal', 'aragon']) for (let seed = 1; seed <= 3; seed++) {
  const s = newGame(n, seed * 7919);
  resolveQueue(s);
  let turns = 0;
  try {
    while (!s.over && turns < 400) {
      botTurn(s); resolveQueue(s); endTurn(s); resolveQueue(s); turns++;
      if (seed === 1 && s.year % 60 === 0) { const inc = incomeOf(s, n); console.log('  ', s.year, 'gold', Math.round(player(s).gold), 'inc', inc.total.toFixed(1), 'up', inc.upkeep.toFixed(1), 'sal', inc.salaries.toFixed(1), 'mp', player(s).manpower.toFixed(1), 'np', s.np.toFixed(1), 'hand', s.hand.length, 'troops', s.troops.length, '/', armyCap(s), 'chars', s.characters.length, 'missions', s.missions.length, 'king', player(s).ruler.name, player(s).ruler.arch); }
    }
  } catch (e) { console.error('CRASH', n, seed, s.year, e); throw e; }
  const me = player(s);
  const r = ranking(s);
  console.log(n, seed, 'year', s.year, 'provs', provsOf(s, n).length, 'gold', Math.round(me.gold), 'troops', s.troops.length, 'techs', s.techs.length, 'stab', me.stability, 'rank', r.findIndex(x => x.id === n) + 1, 'top', r.slice(0, 3).map(x => x.name + ':' + x.score).join(' '), 'alive', Object.values(s.nations).filter(x => x.alive).length, 'kings', s.stats.kings.length, 'wars', JSON.stringify(s.stats.wars), 'imports', s.imports.length, 'colonies', Object.values(s.overseas).filter(o => o.holder === n && o.colony).length, 'found', Object.values(s.overseas).filter(o => o.found).length, 'rar', s.characters.map(c => c.rarity[0]).join(''), 'towns', provsOf(s, n).map(p => p.settlement).join(''), 'vets', s.troops.filter(t => t.vet >= 2).length, 'core', s.core.join('/'), 'fleet', s.fleet.length, 'subj', subjectsOf(s).map(x => x.id + ':' + x.subject).join(','), 'happy', s.happiness, 'art', Math.round(s.art), 'adm', s.characters.filter(c => c.role === 'admiral').length);
}
{
  const s = newGame('castile', 99);
  resolveQueue(s);
  for (let i = 0; i < 120; i++) { botTurn(s); resolveQueue(s); endTurn(s); resolveQueue(s); }
  const c: Record<string, number> = {};
  for (const h of s.hand) c[h.card] = (c[h.card] ?? 0) + 1;
  console.log(Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12));
}
