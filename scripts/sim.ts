import { newGame, endTurn, chooseEventOption, playerDeclareWar, ranking } from '../src/engine/turn';
import { EVENT } from '../src/engine/events';
import { autoResolve, finishBattle } from '../src/engine/battle';
import { takeDraftOption, startTroopDraft, doMerge, mergePreview } from '../src/engine/drafts';
import { launchMission, missionBlocked } from '../src/engine/missions';
import { TECHS } from '../src/data/techs';
import { provsOf, player, atWar, enemiesOf, armyCap } from '../src/engine/core';
import { CARDS, playCard, cardBlocked } from '../src/engine/cards';
import { neighbours } from '../src/engine/map';
import type { GameState } from '../src/types';

function resolveQueue(s: GameState) {
  let guard = 0;
  while (s.queue.length && guard++ < 50) {
    const p = s.queue[0];
    if (p.kind === 'event') {
      const e = EVENT[p.eventId];
      const ok = e.options.map((o, i) => [o, i] as const).filter(([o]) => !o.can?.(s, p.vars));
      const pickI = ok.length ? ok[Math.floor(Math.random() * ok.length)][1] : -1;
      if (pickI < 0) { s.queue.shift(); continue; }
      const r = chooseEventOption(s, pickI);
      if (typeof r === 'string') s.queue.shift();
    } else if (p.kind === 'battle') { autoResolve(s, p.battle); finishBattle(s, p.battle); s.queue.shift(); }
    else if (p.kind === 'draft') { takeDraftOption(s, p.options[0]); s.queue.shift(); }
    else if (p.kind === 'gameover') { s.queue.shift(); }
    else s.queue.shift();
  }
}

function botTurn(s: GameState) {
  const me = player(s);
  // play cards
  for (const h of [...s.hand]) {
    const d = CARDS[h.card];
    if (cardBlocked(s, d)) continue;
    let target = '';
    if (d.target === 'nation') target = Object.keys(s.nations).find(n => n !== s.player && s.nations[n].alive)!;
    if (d.target === 'mission') { const m = s.missions.find(m => d.targetOk!(s, String(m.id))); if (!m) continue; target = String(m.id); }
    if (d.target === 'troop') { const t = s.troops.find(t => d.targetOk!(s, String(t.uid))); if (!t) continue; target = String(t.uid); }
    playCard(s, h.uid, target);
  }
  for (let k = 0; k < 3; k++) if (s.troops.length < armyCap(s) && me.gold > 30) { startTroopDraft(s, me.gold > 150 ? 'pro' : 'levy'); resolveQueue(s); }
  // merges
  for (const a of s.troops) for (const b of [...s.troops, ...s.equipment as any[]]) {
    if (a.uid === b.uid) continue;
    const r = mergePreview(s, a.uid, b.uid);
    if (!('error' in r) && !r.tech && r.out !== a.type) { doMerge(s, a.uid, b.uid); return botTurn2(s); }
  }
  botTurn2(s);
}
function botTurn2(s: GameState) {
  const me = player(s);
  for (const c of s.characters.filter(c => c.mission == null)) {
    if (c.role === 'admin') {
      const t = TECHS.find(t => !missionBlocked(s, 'research', t.id));
      if (t && Math.random() < 0.7) { launchMission(s, 'research', c.uid, t.id, []); continue; }
      const b = ['barracks', 'fortress', 'market', 'university', 'bank', 'armoury', 'harbour', 'manufactory', 'cathedral'].find(b => provsOf(s, s.player).some(p => !missionBlocked(s, 'build', p.id, b)));
      const p = b && provsOf(s, s.player).find(p => !missionBlocked(s, 'build', p.id, b));
      if (p && b) launchMission(s, 'build', c.uid, p.id, [], b); else if (me.gold > 300) { const q = provsOf(s, s.player).find(p => !missionBlocked(s, 'develop', p.id)); if (q) launchMission(s, 'develop', c.uid, q.id, []); } else if (me.stability < 1) launchMission(s, 'progress', c.uid, '', []); else launchMission(s, 'tax', c.uid, '', []);
    } else if (c.role === 'diplomat') {
      const others = Object.keys(s.nations).filter(n => n !== s.player && s.nations[n].alive);
      const en = enemiesOf(s, s.player)[0];
      if (en && Math.random() < 0.3) { launchMission(s, 'peace', c.uid, en, []); continue; }
      const t = others[Math.floor(Math.random() * others.length)];
      if (!missionBlocked(s, 'trade', t)) launchMission(s, 'trade', c.uid, t, []); else if (!missionBlocked(s, 'relations', t)) launchMission(s, 'relations', c.uid, t, []);
    } else {
      const en = enemiesOf(s, s.player);
      const targets = Object.values(s.provinces).filter(p => en.includes(p.owner) && !missionBlocked(s, 'conquer', p.id));
      const home = s.troops.filter(t => t.mission == null);
      if (targets.length && home.length >= 4) { targets.sort((a, b) => a.fort - b.fort); launchMission(s, 'conquer', c.uid, targets[0].id, home.slice(0, Math.min(c.skill + 3, Math.ceil(home.length * 0.6))).map(t => t.uid)); }
    }
  }
  if (!enemiesOf(s, s.player).length && Math.random() < 0.05 && s.troops.length >= 8) {
    const nb = new Set<string>();
    for (const p of provsOf(s, s.player)) for (const n of neighbours(p.id)) if (s.provinces[n].owner !== s.player) nb.add(s.provinces[n].owner);
    const t = [...nb].sort((a, b) => s.nations[a].army.length - s.nations[b].army.length)[0]; if (t && s.nations[t].army.length < s.troops.length) playerDeclareWar(s, t);
  }
  void me; void atWar;
}

const nations = ['castile', 'portugal', 'aragon'];
for (const n of nations) for (let seed = 1; seed <= 3; seed++) {
  const s = newGame(n, seed * 7919);
  resolveQueue(s);
  let turns = 0;
  try {
    while (!s.over && turns < 400) { botTurn(s); resolveQueue(s); endTurn(s); resolveQueue(s); turns++;
      if (s.year % 60 === 0 && seed===1) { const inc = (require('../src/engine/core') as any).incomeOf(s, n); console.log('  ', s.year, 'gold', Math.round(player(s).gold), 'inc', inc.total.toFixed(1), 'up', inc.upkeep.toFixed(1), 'troops', s.troops.length, 'cap', armyCap(s)); } }
  } catch (e) { console.error('CRASH', n, seed, s.year, e); throw e; }
  const me = player(s);
  const r = ranking(s);
  console.log(n, seed, 'year', s.year, 'provs', provsOf(s, n).length, 'gold', Math.round(me.gold), 'troops', s.troops.length, s.troops.map(t=>t.type).slice(0,6).join('/'), 'techs', s.techs.length, 'stab', me.stability, 'rank', r.findIndex(x => x.id === n) + 1, 'top', r.slice(0, 3).map(x => x.name + ':' + x.score).join(' '), 'alive', Object.values(s.nations).filter(x=>x.alive).length);
}
