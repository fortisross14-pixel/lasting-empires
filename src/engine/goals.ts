// Mission mode: how far each goal has come, and the yearly check for victory or failure.
import type { GameState, Goal, Scenario } from '../types';
import { MISSION } from '../data/missions';
import { GOVS } from '../data/governments';
import { REGIONS } from '../data/overseas';
import { player, provsOf, armyPower, incomeOf, push, log, nationName } from './core';
import { getGeo } from './map';
import { provRegion, regionKnown, regionDef } from './overseas';
import { ranking } from './turn';

export interface GoalView {
  title: string;     // what to do
  status: string;    // where you stand, in words
  have: number; need: number; met: boolean;
  invert?: boolean;  // a rank: lower is better
}

const names = (s: GameState, ids: string[]) => ids.map(id => s.provinces[id]?.name ?? id);
const list = (xs: string[], max = 4) => (xs.length <= max ? xs.join(', ') : `${xs.slice(0, max).join(', ')} and ${xs.length - max} more`);
/** Yours, or held by one of your subjects. */
const mineOrSubject = (s: GameState, owner: string) => owner === s.player || s.nations[owner]?.overlord === s.player;
const landsOf = (of: string[]) => getGeo().seeds.filter(x => of.includes(x.owner)).map(x => x.id);

/** Where the player stands in a league of all crowns, by some measure. */
function league(s: GameState, value: (id: string) => number, filter?: (id: string) => boolean) {
  const rows = Object.values(s.nations).filter(n => n.alive && !n.id.startsWith('revolt') && n.id !== 'natives' && (n.id === s.player || !filter || filter(n.id))).map(n => ({ id: n.id, v: value(n.id) }));
  rows.sort((a, b) => b.v - a.v);
  const pos = rows.findIndex(r => r.id === s.player) + 1;
  const mine = rows.find(r => r.id === s.player)?.v ?? 0;
  const lead = rows.find(r => r.id !== s.player) ?? rows[0];
  return { pos, mine, lead };
}

export function goalView(s: GameState, g: Goal, deadline: number): GoalView {
  switch (g.k) {
    case 'own': case 'ownLands': {
      const ids = g.k === 'own' ? g.provinces : landsOf(g.of);
      const held = ids.filter(id => s.provinces[id] && mineOrSubject(s, s.provinces[id].owner));
      const miss = ids.filter(id => !held.includes(id));
      return { title: g.label ?? `Hold ${list(names(s, ids))}`, status: miss.length ? `${held.length} of ${ids.length} held · still to take: ${list(names(s, miss), 3)}` : 'All held', have: held.length, need: ids.length, met: !miss.length };
    }
    case 'provinces': {
      const k = provsOf(s, s.player).length;
      return { title: `Hold at least ${g.n} province${g.n > 1 ? 's' : ''}`, status: `${k} provinces`, have: k, need: g.n, met: k >= g.n };
    }
    case 'holdIn': {
      const k = provsOf(s, s.player).filter(p => g.regions.includes(provRegion(p.id))).length;
      return { title: g.label ?? `${g.n} province${g.n > 1 ? 's' : ''} in ${list(g.regions.map(r => regionDef(r).name), 3)}`, status: `${k} of ${g.n}`, have: k, need: g.n, met: k >= g.n };
    }
    case 'colonies': {
      const home = provRegion(player(s).capital);
      const k = provsOf(s, s.player).filter(p => { const r = provRegion(p.id); return r !== home && (g.regions ? g.regions.includes(r) : !!REGIONS[r]); }).length;
      return { title: `${g.n} colon${g.n > 1 ? 'ies' : 'y'}${g.regions ? ' in ' + list(g.regions.map(r => regionDef(r).name), 3) : ' overseas'}`, status: `${k} of ${g.n}`, have: k, need: g.n, met: k >= g.n };
    }
    case 'discover': {
      const k = g.regions.filter(r => regionKnown(s, r)).length;
      return { title: `Discover ${list(g.regions.map(r => regionDef(r).name))}`, status: g.regions.map(r => `${regionDef(r).name}: ${regionKnown(s, r) ? 'found' : 'not yet'}`).join(' · '), have: k, need: g.regions.length, met: k >= g.regions.length };
    }
    case 'posts': {
      const k = s.posts.filter(p => !g.regions || g.regions.includes(provRegion(s.nations[p.nation]?.capital ?? ''))).length;
      return { title: `${g.n} trade post${g.n > 1 ? 's' : ''}${g.regions ? ' in ' + list(g.regions.map(r => regionDef(r).name), 3) : ''}`, status: `${k} of ${g.n}`, have: k, need: g.n, met: k >= g.n };
    }
    case 'techs':
      return { title: `Know ${g.n} technologies`, status: `${s.techs.length} of ${g.n}`, have: s.techs.length, need: g.n, met: s.techs.length >= g.n };
    case 'rank': {
      const r = ranking(s); const pos = r.findIndex(x => x.id === s.player) + 1; const lead = r.find(x => x.id !== s.player);
      return { title: g.top === 1 ? 'Be the first power in the world' : `Be among the top ${g.top} powers`, status: `You are #${pos} with ${r[pos - 1]?.score ?? 0} points · ${pos === 1 ? `next: ${lead?.name} ${lead?.score}` : `leader: ${r[0].name} ${r[0].score}`}`, have: pos, need: g.top, met: pos <= g.top, invert: true };
    }
    case 'army': case 'navy': {
      const naval = g.k === 'navy';
      const L = league(s, id => Math.round(armyPower(id === s.player ? (naval ? s.fleet : s.troops) : (naval ? s.nations[id].fleet ?? [] : s.nations[id].army))));
      const what = naval ? 'navy' : 'army';
      return { title: g.top === 1 ? `The most powerful ${what}` : `A top ${g.top} ${what}`, status: `Your ${what} ${L.mine} · #${L.pos} · ${L.pos === 1 ? 'next' : 'leader'}: ${nationName(s, L.lead.id)} ${L.lead.v}`, have: L.pos, need: g.top, met: L.pos <= g.top, invert: true };
    }
    case 'income': {
      const inRegions = (id: string) => !g.regions || g.regions.includes(provRegion(s.nations[id].capital));
      const L = league(s, id => Math.round(incomeOf(s, id).total), inRegions);
      return { title: `${g.top === 1 ? 'The richest realm' : `A top ${g.top} income`}${g.regions ? ' in ' + list(g.regions.map(r => regionDef(r).name), 3) : ''}`, status: `Your income ${L.mine} a year · #${L.pos} · ${L.pos === 1 ? 'next' : 'leader'}: ${nationName(s, L.lead.id)} ${L.lead.v}`, have: L.pos, need: g.top, met: L.pos <= g.top, invert: true };
    }
    case 'noneIn': {
      const ids = landsOf(g.of);
      const theirs = ids.filter(id => s.provinces[id]?.owner === g.nation);
      return { title: g.label ?? `${nationName(s, g.nation)} holds none of these lands`, status: theirs.length ? `${nationName(s, g.nation)} holds ${list(names(s, theirs), 3)}` : 'None held by them', have: theirs.length, need: 0, met: !theirs.length, invert: true };
    }
    case 'subjects': {
      const ok = g.of.filter(n => s.nations[n]?.overlord === s.player || (s.nations[n] && s.provinces[s.nations[n].capital]?.owner === s.player));
      return { title: `${list(g.of.map(n => nationName(s, n)))}: your subjects, or their capitals yours`, status: g.of.map(n => `${nationName(s, n)}: ${ok.includes(n) ? 'yours' : s.nations[n]?.overlord ? `subject of ${nationName(s, s.nations[n].overlord!)}` : 'free'}`).join(' · '), have: ok.length, need: g.of.length, met: ok.length >= g.of.length };
    }
    case 'gov': {
      const now = s.gov ?? 'feudal';
      return { title: `Become a ${GOVS[g.gov]?.name ?? g.gov}`, status: `Now: ${GOVS[now]?.name}${s.revolution ? ' · revolution under way' : ''}`, have: now === g.gov ? 1 : 0, need: 1, met: now === g.gov };
    }
    case 'capital': {
      const cap = player(s).capital;
      const held = s.provinces[cap]?.owner === s.player;
      return { title: `Still rule from your capital in ${deadline}`, status: held ? `${s.provinces[cap].name} is yours · ${Math.max(0, deadline - s.year)} years to go` : 'Your capital has fallen', have: held && s.year >= deadline ? 1 : 0, need: 1, met: held && s.year >= deadline };
    }
    case 'newTechs': {
      const k = s.techs.length - (s.flags.goal_techs0 ?? 0);
      return { title: `Research ${g.n} technolog${g.n > 1 ? 'ies' : 'y'}`, status: `${k} of ${g.n} learned`, have: k, need: g.n, met: k >= g.n };
    }
    case 'built': {
      const k = provsOf(s, s.player).reduce((a, p) => a + p.buildings.length, 0) - (s.flags.goal_built0 ?? 0);
      return { title: `Build ${g.n} building${g.n > 1 ? 's' : ''}`, status: `${Math.max(0, k)} of ${g.n} built`, have: k, need: g.n, met: k >= g.n };
    }
    case 'routes': {
      const k = s.routes.length;
      return { title: `${g.n} trade route${g.n > 1 ? 's' : ''} running`, status: `${k} of ${g.n}`, have: k, need: g.n, met: k >= g.n };
    }
    case 'works': {
      const k = (s.works ?? []).length - (s.flags.goal_works0 ?? 0);
      return { title: `${g.n} work${g.n > 1 ? 's' : ''} of art`, status: `${k} of ${g.n} made`, have: k, need: g.n, met: k >= g.n };
    }
    case 'court': {
      const k = s.characters.filter(c => !c.ruler).length;
      return { title: `${g.n} people at court`, status: `${k} of ${g.n}`, have: k, need: g.n, met: k >= g.n };
    }
    case 'independent': {
      const lord = player(s).overlord;
      return { title: 'Be free of any overlord', status: lord ? `Subject of ${nationName(s, lord)}` : 'Independent', have: lord ? 0 : 1, need: 1, met: !lord };
    }
  }
}

export function scenarioFrom(id: string): Scenario | undefined {
  const m = MISSION[id];
  return m && { id: m.id, name: m.name, text: m.text, deadline: m.deadline, goals: m.goals, status: 'active' };
}

/** Each quarter: all goals met wins the mission at once. When the deadline year has passed, it is lost.
 *  Either way a screen says so, and the game goes on for fun. */
export function checkGoals(s: GameState, yearTurned: boolean) {
  const sc = s.scenario;
  if (!sc || sc.status !== 'active') return;
  const views = sc.goals.map(g => goalView(s, g, sc.deadline));
  if (views.every(v => v.met)) {
    sc.status = 'won'; sc.done = s.year;
    player(s).prestige += 50;
    push(s, { kind: 'mission_end', won: true });
    log(s, `Mission accomplished: ${sc.name}.`, 'good');
  } else if ((yearTurned && s.year > sc.deadline) || !provsOf(s, s.player).length) {
    sc.status = 'lost'; sc.done = s.year;
    push(s, { kind: 'mission_end', won: false });
    log(s, `Mission failed: ${sc.name}.`, 'bad');
  }
}
export const yearlyGoals = (s: GameState) => checkGoals(s, true);
