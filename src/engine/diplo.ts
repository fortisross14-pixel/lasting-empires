import { NATIONS } from '../data/nations';
// War score, peace terms, and subject crowns (vassals and personal unions).
import type { GameState, RevealItem, Nation } from '../types';
import { player, provsOf, findWar, makePeace, addRel, getRel, inflation, log, nationName, clamp, rand, armyPower, push } from './core';
import { neighbours } from './map';
import { transferProvince } from './battle';
import { drawCat } from './cards';

/** War score from the player's side: provinces and battles, −100..100. */
export function warScore(s: GameState, enemy: string): number {
  const w = findWar(s, s.player, enemy);
  if (!w) return 0;
  const mineP = w.a === s.player ? w.gainsA : w.gainsB, theirP = w.a === s.player ? w.gainsB : w.gainsA;
  const mineB = (w.a === s.player ? w.winsA : w.winsB) ?? 0, theirB = (w.a === s.player ? w.winsB : w.winsA) ?? 0;
  return clamp(mineP * 18 - theirP * 18 + mineB * 6 - theirB * 6, -100, 100);
}

export interface PeaceTerm { id: string; label: string; cost: number; detail: string; }

/** What the winner can demand at the table. */
/** Share of a realm's own lands (by core) that the player now holds. */
export function heldShare(s: GameState, enemy: string): number {
  const core = Object.values(s.provinces).filter(p => p.core === enemy);
  // holding their old capital counts as holding their heart
  const cap0 = NATIONS.find(d => d.id === enemy)?.capital;
  if (cap0 && s.provinces[cap0]?.core === enemy && s.provinces[cap0].owner === s.player) return 1;
  return core.length ? core.filter(p => p.owner === s.player).length / core.length : 0;
}

export function peaceTerms(s: GameState, enemy: string): PeaceTerm[] {
  const n = s.nations[enemy];
  const terms: PeaceTerm[] = [];
  const g = Math.round(25 * inflation(s));
  for (let i = 1; i <= 3; i++) terms.push({ id: 'gold' + i, label: `Reparations: ${g * i} ducats`, cost: 10 * i, detail: 'Paid from their treasury' });
  const mine = new Set(provsOf(s, s.player).map(p => p.id));
  const border = provsOf(s, enemy).filter(p => neighbours(p.id).some(x => mine.has(x)) && p.id !== n.capital);
  for (const p of border) terms.push({ id: 'prov:' + p.id, label: `Cede ${p.name}`, cost: 20 + p.dev * 4, detail: `Development ${p.dev}${p.core === s.player ? ' · once ours' : ''}` });
  const size = provsOf(s, enemy).length;
  if (size <= 6 && !n.overlord) terms.push({ id: 'vassal', label: `${n.name} becomes your vassal`, cost: 45 + size * 8, detail: 'Pays tribute and follows you to war' });
  // a small realm whose heartland you already hold can be absorbed whole: for free
  if (size <= 8) { const held = heldShare(s, enemy); const dev = provsOf(s, enemy).reduce((a, p) => a + p.dev, 0); terms.push({ id: 'annex', label: `Annex ${n.name}: all its lands join your realm`, cost: held >= 0.5 ? 0 : 40 + dev * 6, detail: held >= 0.5 ? 'You already hold most of its land: they cannot refuse' : `${size} province${size > 1 ? 's' : ''}, development ${dev}` }); }
  return terms.sort((a, b) => a.cost - b.cost);
}

/** What a winning enemy takes from the player. */
export function enemyDemands(s: GameState, enemy: string): PeaceTerm[] {
  let budget = -warScore(s, enemy);
  const out: PeaceTerm[] = [];
  const theirs = new Set(provsOf(s, enemy).map(p => p.id));
  const border = provsOf(s, s.player).filter(p => neighbours(p.id).some(x => theirs.has(x)) && p.id !== player(s).capital).sort((a, b) => (b.core === enemy ? 1 : 0) - (a.core === enemy ? 1 : 0) || a.dev - b.dev);
  for (const p of border) { const c = 20 + p.dev * 4; if (budget >= c) { out.push({ id: 'prov:' + p.id, label: `Cede ${p.name}`, cost: c, detail: '' }); budget -= c; } }
  const g = Math.round(25 * inflation(s));
  while (budget >= 10 && out.filter(t => t.id.startsWith('gold')).length < 3) { out.push({ id: 'gold', label: `Pay ${g} ducats`, cost: 10, detail: '' }); budget -= 10; }
  return out;
}

export function concludePeace(s: GameState, enemy: string, termIds: string[], theyDemand = false): RevealItem[] {
  const n = s.nations[enemy];
  const items: RevealItem[] = [];
  const score = warScore(s, enemy);
  const g = Math.round(25 * inflation(s));
  const winner = theyDemand ? enemy : s.player, loser = theyDemand ? s.player : enemy;
  for (const id of termIds) {
    if (id.startsWith('gold')) {
      const k = theyDemand ? 1 : Number(id.slice(4) || 1);
      s.nations[loser].gold -= g * k; s.nations[winner].gold += g * k;
      items.push({ title: theyDemand ? 'Reparations paid' : 'Reparations', text: `${g * k} ducats change hands.`, tone: theyDemand ? 'bad' : 'good', kind: 'coin' });
    } else if (id.startsWith('prov:')) {
      const pid = id.slice(5);
      if (s.provinces[pid]?.owner === loser) {
        transferProvince(s, pid, winner);
        items.push({ title: `${s.provinces[pid].name} is ceded`, text: `It now belongs to ${nationName(s, winner)}.`, tone: theyDemand ? 'bad' : 'good', kind: 'scroll' });
      }
    } else if (id === 'annex' && !theyDemand) {
      for (const p of provsOf(s, enemy)) transferProvince(s, p.id, s.player);
      n.alive = false; n.army = []; n.fleet = [];
      items.push({ title: `${n.name} is no more`, text: 'All its lands are now yours. Its people may take time to accept your rule.', tone: 'good', kind: 'crown' });
    } else if (id === 'vassal' && !theyDemand) {
      makeSubject(s, enemy, 'vassal');
      items.push({ title: `${n.name} bends the knee`, text: 'A new vassal: it pays a quarter of its income and joins your wars.', tone: 'good', kind: 'crown' });
    }
  }
  // record the result
  if (score > 10) { s.stats.wars.won++; player(s).prestige += 5 + Math.round(score / 10); drawCat(s, 'military'); items.push({ title: 'Victory', text: `War score ${score}. Prestige +${5 + Math.round(score / 10)} and a Military card.`, tone: 'good', kind: 'laurel' }); }
  else if (score < -10) { s.stats.wars.lost++; player(s).prestige -= 5; items.push({ title: 'Defeat', text: `War score ${score}. Prestige −5.`, tone: 'bad', kind: 'twist' }); }
  else items.push({ title: 'White peace', text: 'Neither side gains.', tone: 'neutral', kind: 'dove' });
  s.imports = s.imports.filter(i => i.from !== enemy);
  makePeace(s, s.player, enemy);
  log(s, `Peace with ${n.name}.`, score > 10 ? 'good' : score < -10 ? 'bad' : 'neutral');
  return items;
}

/** A beaten realm gives up on its own: no army left, and the player holds all its heartland
 *  (or its capital, with at most two provinces left). The outcome is certain, so no treaty is needed. */
export function autoSurrender(s: GameState) {
  for (const w of [...s.wars]) {
    if (w.a !== s.player && w.b !== s.player) continue;
    const enemy = w.a === s.player ? w.b : w.a, n = s.nations[enemy];
    if (!n?.alive || n.army.length) continue;
    const left = provsOf(s, enemy).length;
    const cores = Object.values(s.provinces).filter(p => p.core === enemy);
    const allCores = cores.length > 0 && cores.every(p => p.owner === s.player);
    const cap0 = NATIONS.find(d => d.id === enemy)?.capital;
    const capital = !!cap0 && s.provinces[cap0]?.owner === s.player && left <= 2;
    if (!(allCores || capital) || left > 8) continue;
    const items = concludePeace(s, enemy, ['annex']);
    push(s, { kind: 'reveal', title: `${n.name} surrenders`, subtitle: 'Their armies are gone and their lands are yours: no treaty needed', items });
  }
}

// ---------- subjects ----------
export const subjectsOf = (s: GameState, n = s.player): Nation[] => Object.values(s.nations).filter(x => x.alive && x.overlord === n);
export const tributeShare = (x: Nation) => (x.subject === 'union' ? 0.4 : 0.25);

export function makeSubject(s: GameState, n: string, type: 'vassal' | 'union', overlord = s.player) {
  const x = s.nations[n];
  x.overlord = overlord; x.subject = type; x.subjectSince = s.year;
  s.wars = s.wars.filter(w => !((w.a === n && w.b === overlord) || (w.b === n && w.a === overlord)));
  addRel(s, n, overlord, 20);
  // a subject shares its overlord's wars
  for (const w of s.wars.filter(w => w.a === overlord || w.b === overlord)) {
    const foe = w.a === overlord ? w.b : w.a;
    if (foe !== n && !findWar(s, n, foe)) s.wars.push({ a: n, b: foe, since: s.year, gainsA: 0, gainsB: 0 });
  }
}

export function releaseSubject(s: GameState, n: string) {
  const x = s.nations[n];
  delete x.overlord; delete x.subject; delete x.subjectSince;
}

export function integrateBlocked(s: GameState, n: string): string | null {
  const x = s.nations[n];
  if (!x || x.overlord !== s.player) return 'Not your subject';
  const need = x.subject === 'union' ? 15 : 10;
  if (s.year - (x.subjectSince ?? s.year) < need) return `Needs ${need} years as your ${x.subject} (${s.year - (x.subjectSince ?? s.year)} so far)`;
  if (getRel(s, s.player, n) < 50) return 'Relations must be at least 50';
  return null;
}

export function integrate(s: GameState, n: string) {
  const x = s.nations[n];
  for (const p of provsOf(s, n)) { p.owner = s.player; p.control = Math.min(p.control, 50); }
  player(s).gold += Math.max(0, Math.round(x.gold));
  x.alive = false; x.army = []; x.fleet = [];
  releaseSubject(s, n);
  s.wars = s.wars.filter(w => w.a !== n && w.b !== n);
  s.treaties = s.treaties.filter(t => t.a !== n && t.b !== n);
  log(s, `${x.name} is integrated into the realm.`, 'good');
}

export function vassalizeBlocked(s: GameState, n: string): string | null {
  const x = s.nations[n];
  if (!x?.alive || n === s.player) return 'Choose another crown';
  if (x.overlord) return x.overlord === s.player ? 'Already your subject' : `Already a subject of ${nationName(s, x.overlord)}`;
  if (findWar(s, s.player, n)) return 'At war: demand it in the peace instead';
  if (provsOf(s, n).length > 5) return 'Too large to bend the knee (more than 5 provinces)';
  const mine = armyPower(s.troops) + provsOf(s, s.player).length * 3, theirs = armyPower(x.army) + provsOf(s, n).length * 3;
  if (mine < theirs * 2.5) return 'They do not fear you enough (you need 2.5× their strength)';
  if (getRel(s, s.player, n) < -10) return 'Relations too poor (below −10)';
  return null;
}

/** Yearly: tribute, loyalty, and subjects breaking free. Returns tribute paid to the player. */
export function yearlySubjects(s: GameState): number {
  let tribute = 0;
  for (const x of Object.values(s.nations)) {
    if (!x.alive || !x.overlord) continue;
    if (!s.nations[x.overlord]?.alive) { releaseSubject(s, x.id); continue; }
    if (x.overlord === s.player) {
      const t = provsOf(s, x.id).reduce((a, p) => a + p.dev * 0.6, 0) * tributeShare(x);
      tribute += t; x.gold -= t * 0.5; // paid to the player through incomeOf
      const rel = getRel(s, s.player, x.id);
      if (rel < -30 && rand(s) < 0.12) {
        releaseSubject(s, x.id);
        push(s, { kind: 'reveal', title: `${x.name} breaks free`, items: [{ title: 'Independence', text: `${x.name} no longer accepts your rule.`, tone: 'bad', kind: 'twist' }] });
        log(s, `${x.name} breaks free.`, 'bad');
      } else if (x.subject === 'union') addRel(s, s.player, x.id, 1);
    }
  }
  return tribute;
}

/** A neighbouring crown passes to your house through a royal marriage. */
export function unionClaim(s: GameState, n: string): boolean {
  const x = s.nations[n];
  if (!x?.alive || x.overlord || n === s.player || n === 'papacy' || provsOf(s, n).length > 6) return false;
  makeSubject(s, n, 'union');
  return true;
}
