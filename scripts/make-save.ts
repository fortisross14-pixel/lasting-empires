// Writes a test save of the current version to scripts/saves/ (npm run make-save). Run it BEFORE raising SAVE_VERSION,
// so the old version keeps a save that `npm test` loads through every migration since.
import { newGame, endTurn, chooseEventOption, chooseHeir } from '../src/engine/turn';
import { EVENT } from '../src/engine/events';
import { autoResolve, finishBattle } from '../src/engine/battle';
import { takeDraftOption } from '../src/engine/drafts';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import type { GameState } from '../src/types';
function answer(s: GameState) { let g = 0; while (s.queue.length && g++ < 80) { const p = s.queue[0];
  if (p.kind === 'event') { const i = EVENT[p.eventId].options.findIndex(o => !o.can?.(s, p.vars)); if (i < 0 || typeof chooseEventOption(s, i) === 'string') s.queue.shift(); }
  else if (p.kind === 'battle') { autoResolve(s, p.battle); finishBattle(s, p.battle); s.queue.shift(); }
  else if (p.kind === 'draft') { takeDraftOption(s, p.options[0]); s.queue.shift(); }
  else if (p.kind === 'succession') chooseHeir(s, 0); else s.queue.shift(); } }
const s = newGame('castile', 20261120); answer(s);
for (let i = 0; i < 24; i++) { endTurn(s); answer(s); }
const json = JSON.stringify(s);
writeFileSync(`scripts/saves/v${s.version}.json.gz`, gzipSync(json, { level: 9 }));
console.log('version', s.version, 'year', s.year, 'json KB', (json.length / 1024).toFixed(0));
