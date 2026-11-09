import { newGame, endTurn, ranking } from '../../src/engine/turn';
import { NO_STATE } from '../../src/data/nations';
const s = newGame('castile', 7);
for (let y = 0; y < 297; y++) {
  s.queue = [];
  endTurn(s);
  if ([1500, 1550, 1600, 1650, 1700, 1749].includes(s.year)) {
    const free = Object.values(s.provinces).filter(p => p.owner === NO_STATE).length;
    const alive = Object.values(s.nations).filter(n => n.alive).length;
    const colonies: Record<string, number> = {};
    for (const p of Object.values(s.provinces)) if (p.core !== p.owner || ['castile','portugal','england','france'].includes(p.owner)) colonies[p.owner] = (colonies[p.owner] ?? 0) + 1;
    console.log(s.year, 'free', free, 'alive', alive, ranking(s).slice(0, 6).map(r => `${r.name}:${r.score}`).join(' '));
  }
}
const own: Record<string, number> = {};
for (const p of Object.values(s.provinces)) own[p.owner] = (own[p.owner] ?? 0) + 1;
console.log(Object.entries(own).sort((a, b) => b[1] - a[1]).slice(0, 15));
for (const id of ['portugal', 'aragon', 'france', 'ming']) { const n = s.nations[id]; console.log(id, 'prestige', Math.round(n.prestige), 'dev', Object.values(s.provinces).filter(p => p.owner === id).reduce((a, p) => a + p.dev, 0)); }
