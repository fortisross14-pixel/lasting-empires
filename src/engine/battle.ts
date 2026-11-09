// Battles: three rounds, each side commits a face-down tactic, then both flip.
import type { GameState, Battle, BattleSide, BattleUnit, BattleGeneral, RoundLog, TroopCard } from '../types';
import { TROOPS, TACTICS } from '../data/troops';
import { rand, pick, weighted, uid, clamp, hasTech, rulerMod, log, nationName, addRel, player, findWar, promoteRarity, hasCore } from './core';

export const breakLevel = (side: BattleSide) => (side.general?.traits.includes('inspiring') ? 0.25 : 0.35);
export const hp = (side: BattleSide) => side.units.reduce((a, u) => a + u.str, 0);
export const ratio = (side: BattleSide) => (side.startHP > 0 ? hp(side) / side.startHP : 0);

export function toBattleUnits(cards: TroopCard[]): BattleUnit[] {
  return cards.filter(c => c.str > 0).map(c => ({ uid: c.uid, type: c.type, vet: c.vet, str: c.str, start: c.str }));
}

export function makeSide(nation: string, units: BattleUnit[], general: BattleGeneral | null, fort: number, isPlayer: boolean): BattleSide {
  const all = [...units];
  for (let i = 0; i < fort; i++) all.push({ uid: -1 - i, type: 'garrison', vet: 0, str: 100, start: 100, garrison: true });
  return { nation, units: all, general, startHP: all.reduce((a, u) => a + u.str, 0), fort, player: isPlayer };
}

export function createBattle(s: GameState, att: BattleSide, def: BattleSide, province: string,
  context: Battle['context'], missionId?: number): Battle {
  const b: Battle = {
    id: uid(s), att, def, province, round: 0, logs: [], playerSide: att.player ? 'att' : 'def',
    context, missionId, done: false, options: [], enemyNext: 'hold', scout: false, ambush: false,
  };
  if ((att.player || def.player) && (s.flags.ambush ?? 0) > 0) { b.ambush = true; s.flags.ambush = 0; }
  prepareRound(s, b);
  return b;
}

export function available(side: BattleSide): string[] {
  const alive = side.units.filter(u => u.str > 0 && !u.garrison);
  const t = ['flank', 'hold'];
  if (alive.some(u => TROOPS[u.type].fire >= 2) || side.units.some(u => u.garrison && u.str > 0)) t.push('volley');
  if (alive.some(u => TROOPS[u.type].kind === 'cav')) t.push('charge');
  if (alive.some(u => TROOPS[u.type].pike || (TROOPS[u.type].kind === 'inf' && TROOPS[u.type].def >= 5))) t.push('pike');
  if (alive.some(u => TROOPS[u.type].kind === 'art')) t.push('barrage');
  return t;
}

function aiPick(s: GameState, me: BattleSide, foe: BattleSide): string {
  const opts = available(me);
  const foeAlive = foe.units.filter(u => u.str > 0);
  const foeCav = foeAlive.filter(u => TROOPS[u.type].kind === 'cav').length / Math.max(1, foeAlive.length);
  const foeShot = foeAlive.filter(u => TROOPS[u.type].fire >= 3).length / Math.max(1, foeAlive.length);
  const w: [string, number][] = opts.map(o => {
    let x = 1;
    if (o === 'pike') x += foeCav * 3;
    if (o === 'charge') x += foeShot * 2 + 0.5;
    if (o === 'volley') x += 1;
    if (o === 'barrage') x += 1.2;
    return [o, x];
  });
  return weighted(s, w);
}

export function prepareRound(s: GameState, b: Battle) {
  const me = b.playerSide === 'att' ? b.att : b.def;
  const foe = b.playerSide === 'att' ? b.def : b.att;
  const opts = available(me);
  // shuffle and take 3
  const shuffled = [...opts].sort(() => rand(s) - 0.5);
  b.options = shuffled.slice(0, 3);
  b.enemyNext = aiPick(s, foe, me);
  b.scout = b.ambush || (b.round === 0 && !!me.general?.traits.includes('cunning'));
}

interface Mods { fire: number; melee: number; cav: number; art: number; incoming: number; incomingMelee: number; }

function mods(tac: string, countered: boolean): Mods {
  const m: Mods = { fire: 1, melee: 1, cav: 1, art: 1, incoming: 1, incomingMelee: 1 };
  if (countered) { m.incoming = 1.25; return m; }
  if (tac === 'volley') m.fire = 1.7;
  if (tac === 'charge') { m.cav = 2; m.melee = 1.2; }
  if (tac === 'flank') m.melee = 1.5;
  if (tac === 'barrage') m.art = 2.5;
  if (tac === 'pike') m.incomingMelee = 0.5;
  if (tac === 'hold') m.incoming = 0.7;
  return m;
}

const ROUND_MULT = [{ fire: 1, melee: 0.4 }, { fire: 0.6, melee: 1 }, { fire: 0.5, melee: 1.1 }];

function attackOutput(s: GameState, side: BattleSide, round: number, my: Mods): { fire: number; melee: number } {
  let fire = 0, melee = 0;
  const g = side.general;
  for (const u of side.units) {
    if (u.str <= 0) continue;
    const d = TROOPS[u.type];
    const eff = (1 + 0.15 * u.vet) * (u.str / 100);
    let f = d.fire * eff * ROUND_MULT[round].fire * my.fire;
    let m = d.melee * eff * ROUND_MULT[round].melee * my.melee;
    if (d.kind === 'cav') m *= my.cav;
    if (d.kind === 'art') f *= my.art * (round === 0 ? 1.2 : 0.8);
    fire += f; melee += m;
  }
  let mult = 1 + 0.07 * (g?.skill ?? 1);
  const tm = g?.mult ?? 1;
  if (g?.traits.includes('bold')) melee *= 1 + 0.2 * tm;
  if (g?.traits.includes('gunner')) fire *= 1 + 0.2 * tm;
  if (side.player) {
    mult += rulerMod(s, 'battle');
    if (hasTech(s, 'military_drill')) mult += 0.1;
    if (hasCore(s, 'land')) mult += 0.1;
    if (hasCore(s, 'sea')) mult -= 0.05;
  }
  return { fire: fire * mult, melee: melee * mult };
}

function applyDamage(s: GameState, target: BattleSide, attacker: BattleSide, out: { fire: number; melee: number }, tm: Mods, effFort: number): number {
  const alive = target.units.filter(u => u.str > 0);
  if (!alive.length) return 0;
  let incoming = out.fire * tm.incoming + out.melee * tm.incoming * tm.incomingMelee;
  if (target.general?.traits.includes('cautious')) incoming *= 1 - 0.15 * (target.general.mult ?? 1);
  const pool = incoming * 14 * (0.85 + rand(s) * 0.3);
  const weights = alive.map(u => {
    const k = TROOPS[u.type].kind;
    return u.str * (u.garrison ? 1.2 : k === 'inf' ? 1.2 : k === 'cav' ? 1 : k === 'shot' ? 0.85 : 0.6) * (0.7 + rand(s) * 0.6);
  });
  const wsum = weights.reduce((a, b) => a + b, 0);
  let dealt = 0;
  alive.forEach((u, i) => {
    const def = TROOPS[u.type].def * (1 + 0.15 * u.vet) * (1 + 0.25 * effFort);
    const dmg = (pool * weights[i] / wsum) / (1 + def * 0.18);
    const before = u.str;
    u.str = Math.max(0, u.str - dmg);
    if (u.str < 8) u.str = 0;
    dealt += before - u.str;
  });
  void attacker;
  return Math.round(dealt);
}

function effectiveFort(b: Battle): number {
  const siege = b.att.units.filter(u => u.str > 0).reduce((a, u) => a + (TROOPS[u.type].siege ?? 0), 0);
  const sm = b.att.general?.traits.includes('siegemaster') ? 1 : 0;
  return clamp(b.def.fort - Math.floor(siege / 2) - sm, 0, 3);
}

/** Play one round. playerTactic may be null for AI-vs-AI or auto mode. */
export function playRound(s: GameState, b: Battle, playerTactic: string | null): RoundLog {
  const r = b.round;
  let attTac: string, defTac: string;
  if (b.att.player || b.def.player) {
    const mine = playerTactic ?? aiPick(s, b.playerSide === 'att' ? b.att : b.def, b.playerSide === 'att' ? b.def : b.att);
    if (b.playerSide === 'att') { attTac = mine; defTac = b.enemyNext; } else { defTac = mine; attTac = b.enemyNext; }
  } else {
    attTac = aiPick(s, b.att, b.def); defTac = aiPick(s, b.def, b.att);
  }
  const attCountered = TACTICS[attTac].counteredBy.includes(defTac);
  const defCountered = TACTICS[defTac].counteredBy.includes(attTac);
  const am = mods(attTac, attCountered), dm = mods(defTac, defCountered);
  const ef = effectiveFort(b);
  const attOut = attackOutput(s, b.att, r, am);
  const defOut = attackOutput(s, b.def, r, dm);
  const dmgToDef = applyDamage(s, b.def, b.att, attOut, dm, ef);
  const dmgToAtt = applyDamage(s, b.att, b.def, defOut, am, 0);
  const lg: RoundLog = { round: r + 1, attTactic: attTac, defTactic: defTac, attCountered, defCountered, dmgToAtt, dmgToDef };
  b.logs.push(lg);
  b.round++;
  const ar = ratio(b.att), dr = ratio(b.def);
  const attBroke = ar < breakLevel(b.att), defBroke = dr < breakLevel(b.def);
  if (attBroke || defBroke || b.round >= 3) {
    b.done = true;
    if (attBroke && defBroke) b.winner = ar > dr ? 'att' : 'def';
    else if (attBroke) b.winner = 'def';
    else if (defBroke) b.winner = 'att';
    else b.winner = ar > dr + 0.02 ? 'att' : 'def';
  } else {
    prepareRound(s, b);
  }
  return lg;
}

export function autoResolve(s: GameState, b: Battle) {
  while (!b.done) playRound(s, b, null);
}

// ---------- applying results ----------
function syncPlayerTroops(s: GameState, side: BattleSide, won: boolean): { lost: string[]; promoted: string[] } {
  const lost: string[] = [], promoted: string[] = [];
  for (const u of side.units) {
    if (u.garrison) continue;
    const card = s.troops.find(t => t.uid === u.uid);
    if (!card) continue;
    let str = u.str;
    if (!won) str *= 0.85;
    if (str < 8) { lost.push(TROOPS[card.type].name); s.troops = s.troops.filter(t => t.uid !== card.uid); continue; }
    card.str = Math.round(str);
    if (won && card.vet < 3 && rand(s) < 0.25) { card.vet++; promoted.push(TROOPS[card.type].name); }
  }
  return { lost, promoted };
}

function syncAITroops(s: GameState, side: BattleSide, won: boolean) {
  const nat = s.nations[side.nation];
  if (!nat) return;
  for (const u of side.units) {
    if (u.garrison) continue;
    const card = nat.army.find(t => t.uid === u.uid);
    if (!card) continue;
    let str = u.str;
    if (!won) str *= 0.85;
    if (str < 8) nat.army = nat.army.filter(t => t.uid !== card.uid);
    else { card.str = Math.round(str); if (won && card.vet < 3 && rand(s) < 0.15) card.vet++; }
  }
}

export function transferProvince(s: GameState, provId: string, to: string) {
  const p = s.provinces[provId];
  const from = p.owner;
  if (from === to) return;
  p.owner = to;
  p.control = p.core === to ? 60 : 25;
  if (p.settlement > 1 && rand(s) < 0.4) p.settlement--; // sacked
  // cancel player missions targeting things that no longer make sense
  if (from === s.player) {
    s.missions = s.missions.filter(m => {
      if (m.kind === 'build' && m.target === provId) { freeMission(s, m.id); return false; }
      return true;
    });
  }
  const w = findWar(s, from, to);
  if (w) { if (w.a === to) w.gainsA++; else w.gainsB++; }
  const fromNat = s.nations[from];
  if (fromNat && fromNat.capital === provId) {
    const rest = Object.values(s.provinces).filter(x => x.owner === from).sort((a, b) => b.dev - a.dev);
    if (rest.length) fromNat.capital = rest[0].id;
  }
  if (fromNat && !Object.values(s.provinces).some(x => x.owner === from)) {
    fromNat.alive = false;
    s.wars = s.wars.filter(w2 => w2.a !== from && w2.b !== from);
    s.treaties = s.treaties.filter(t => t.a !== from && t.b !== from);
    log(s, `${fromNat.name} has fallen and is no more.`, from === s.player ? 'bad' : 'neutral');
  }
}

export function freeMission(s: GameState, missionId: number) {
  for (const t of s.troops) if (t.mission === missionId) delete t.mission;
  for (const c of s.characters) if (c.mission === missionId) delete c.mission;
}

export interface BattleOutcome { title: string; lines: string[]; good: boolean; }

export function finishBattle(s: GameState, b: Battle): BattleOutcome {
  const pSide = b.playerSide === 'att' ? b.att : b.def;
  const eSide = b.playerSide === 'att' ? b.def : b.att;
  const playerInvolved = b.att.player || b.def.player;
  const attWon = b.winner === 'att';
  const prov = s.provinces[b.province];
  const lines: string[] = [];
  let good = false;
  let title = '';

  const rec = (n: string, won: boolean) => {
    if (!s.nations[n]) return;
    const st = (s.stats.battles[n] ??= { won: 0, lost: 0 });
    if (won) st.won++; else st.lost++;
  };
  rec(b.att.nation, attWon); rec(b.def.nation, !attWon);
  if (!playerInvolved) {
    syncAITroops(s, b.att, attWon); syncAITroops(s, b.def, !attWon);
    if (attWon && b.context === 'conquer') transferProvince(s, b.province, b.att.nation);
    return { title: '', lines: [], good: false };
  }

  const playerWon = (b.playerSide === 'att') === attWon;
  const res = syncPlayerTroops(s, pSide, playerWon);
  if (!b.def.player || b.context !== 'rebels') syncAITroops(s, eSide, !playerWon);
  if (b.context === 'rebels' && b.att.player === false) { /* rebels vanish */ }

  const gen = pSide.general?.uid != null ? s.characters.find(c => c.uid === pSide.general!.uid) : undefined;
  if (gen) { if (playerWon) gen.wins = (gen.wins ?? 0) + 1; else gen.losses = (gen.losses ?? 0) + 1; }
  if (gen && playerWon) { gen.xp++; if (gen.xp >= 3) { gen.xp = 0; if (promoteRarity(s, gen)) lines.push(`${gen.name} rises to ${gen.rarity}.`); } }

  const me = player(s);
  if (b.context === 'conquer') {
    if (playerWon) {
      title = `${prov.name} is taken!`;
      transferProvince(s, b.province, s.player);
      me.prestige += hasCore(s, 'expansion') ? 10 : 5;
      lines.push(`${prov.name} now belongs to ${me.name}. Prestige +5.`);
      good = true;
    } else {
      title = `Defeat at ${prov.name}`;
      lines.push(`The army falls back. Stability −${me.ruler.traits.includes('Reckless') ? 2 : 1}.`);
      me.stability = clamp(me.stability - (me.ruler.traits.includes('Reckless') ? 2 : 1), -3, 3);
    }
  } else if (b.context === 'raid') {
    if (playerWon) {
      const loot = Math.round(prov.dev * 8 + 5);
      me.gold += loot; me.prestige += 1;
      addRel(s, s.player, prov.owner, -10);
      title = `Raid on ${prov.name}`;
      lines.push(`Your soldiers return with ${loot} ducats of plunder.`);
      good = true;
    } else { title = `Raid on ${prov.name} repulsed`; lines.push('The raiders are driven off.'); }
  } else if (b.context === 'defend') {
    if (playerWon) {
      title = `${prov.name} holds!`; me.prestige += 3; good = true;
      lines.push(`The ${s.nations[eSide.nation]?.adj ?? ''} attack is beaten back. Prestige +3.`);
    } else {
      title = `${prov.name} has fallen`;
      transferProvince(s, b.province, eSide.nation);
      lines.push(`${nationName(s, eSide.nation)} takes ${prov.name}.`);
      me.stability = clamp(me.stability - 1, -3, 3);
    }
  } else if (b.context === 'rebels') {
    if (playerWon) { title = 'The revolt is crushed'; me.stability = clamp(me.stability + 1, -3, 3); prov.control = Math.max(prov.control, 60); good = true; lines.push('Order returns. Stability +1.'); }
    else { title = 'The rebels triumph'; me.gold = Math.max(0, me.gold - 30); prov.control = Math.min(prov.control, 10); me.stability = clamp(me.stability - 1, -3, 3); lines.push('The rebels loot the treasury (−30 ducats) and the province defies you.'); }
  }
  if (res.lost.length) lines.push(`Lost: ${res.lost.join(', ')}.`);
  if (res.promoted.length) lines.push(`Veterans: ${res.promoted.join(', ')} gain a star.`);
  if (b.missionId != null) {
    freeMission(s, b.missionId);
    s.missions = s.missions.filter(m => m.id !== b.missionId);
  }
  log(s, title, good ? 'good' : 'bad');
  return { title, lines, good };
}

export function genericGeneral(s: GameState): BattleGeneral {
  return { name: pick(s, ['the Marshal', 'the Constable', 'the Captain', 'the Commander']), skill: 1 + Math.floor(rand(s) * 3), traits: [] };
}
