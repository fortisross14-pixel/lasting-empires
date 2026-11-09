// Missions: characters (and troops) sent to do things over several years.
import type { GameState, Mission, MissionKind, RevealItem, Character } from '../types';
import { TECH } from '../data/techs';
import { BUILDINGS } from '../data/techs';
import {
  player, provsOf, hasTech, getRel, addRel, addTreaty, hasTreaty, atWar, findWar, makePeace, rulerMod, clamp,
  rand, pick, uid, log, nationName, armyPower, buildingAllowed, push, buildingCost, inflation,
} from './core';
import { getGeo } from './map';
import { createBattle, makeSide, toBattleUnits, genericGeneral, freeMission, transferProvince } from './battle';

export const MISSION_INFO: Record<MissionKind, { name: string; role: 'general' | 'diplomat' | 'admin'; icon: string; verb: string }> = {
  conquer: { name: 'Conquest', role: 'general', icon: 'sword', verb: 'Conquer' },
  raid: { name: 'Raid', role: 'general', icon: 'torch', verb: 'Raid' },
  relations: { name: 'Embassy', role: 'diplomat', icon: 'scroll', verb: 'Improve relations with' },
  trade: { name: 'Trade Treaty', role: 'diplomat', icon: 'coin', verb: 'Sign a trade treaty with' },
  alliance: { name: 'Alliance', role: 'diplomat', icon: 'hands', verb: 'Seek an alliance with' },
  marriage: { name: 'Royal Marriage', role: 'diplomat', icon: 'ring', verb: 'Arrange a marriage with' },
  peace: { name: 'Peace Talks', role: 'diplomat', icon: 'dove', verb: 'Negotiate peace with' },
  research: { name: 'Study', role: 'admin', icon: 'book', verb: 'Research' },
  build: { name: 'Construction', role: 'admin', icon: 'hammer', verb: 'Build' },
  develop: { name: 'Development', role: 'admin', icon: 'wheat', verb: 'Develop' },
  tax: { name: 'Tax Collection', role: 'admin', icon: 'coin', verb: 'Collect taxes' },
  progress: { name: 'Royal Progress', role: 'admin', icon: 'crown', verb: 'Tour the realm' },
};

export const developCost = (s: GameState, prov: string) => Math.round((25 + s.provinces[prov].dev * 15) * inflation(s));

export const DIPLO: MissionKind[] = ['relations', 'trade', 'alliance', 'marriage', 'peace'];

export function techCost(s: GameState, techId: string): number {
  const t = TECH[techId];
  return Math.round(t.cost * (1 + Math.max(0, t.year - s.year) / 25));
}

export function researchRate(s: GameState, ch: Character): number {
  const unis = Math.min(2, provsOf(s, s.player).filter(p => p.buildings.includes('university')).length);
  let r = 1 + ch.skill + unis + rulerMod(s, 'research') + (hasTech(s, 'councils') ? 1 : 0) + (s.flags.reform_research ?? 0) + (s.flags.printing_bonus ?? 0);
  if (ch.traits.includes('scholar')) r += 1;
  if (ch.traits.includes('polymath')) r += 2;
  return Math.max(1, r);
}

/** Which provinces can launch an attack on this province, and how long it takes. */
export function attackRoute(s: GameState, target: string): { turns: number; naval: boolean } | null {
  const g = getGeo();
  const mine = provsOf(s, s.player).map(p => p.id);
  if (mine.some(id => g.adj[id].includes(target))) return { turns: 1, naval: false };
  const sources = mine.filter(id => g.sea[id].includes(target));
  if (!sources.length) return null;
  const harbour = sources.some(id => s.provinces[id].buildings.includes('harbour'));
  return { turns: harbour ? 1 : 2, naval: true };
}

export function missionTurns(s: GameState, kind: MissionKind, ch: Character, target: string, building?: string): number {
  switch (kind) {
    case 'conquer': case 'raid': return attackRoute(s, target)?.turns ?? 2;
    case 'research': return Math.max(1, Math.ceil(techCost(s, target) / researchRate(s, ch)));
    case 'build': return Math.max(1, BUILDINGS[building!].turns - (ch.traits.includes('architect') ? 1 : 0));
    case 'develop': return 3;
    case 'tax': return 1;
    case 'progress': return 2;
    default: {
      const base = { relations: 2, trade: 3, alliance: 3, marriage: 2, peace: 1 }[kind as 'relations'] ?? 2;
      return Math.max(1, base - (hasTech(s, 'chancery') ? 1 : 0) - (ch.traits.includes('envoy') ? 1 : 0));
    }
  }
}

export function diploChance(s: GameState, kind: MissionKind, ch: Character, target: string, bonus = 0): number {
  const rel = getRel(s, s.player, target);
  const nat = s.nations[target];
  let p = ({ relations: 0.75, trade: 0.55, marriage: 0.45, alliance: 0.4, peace: 0.35 } as Record<string, number>)[kind] ?? 0.5;
  p += ch.skill * 0.06 + rel / 250 + bonus + rulerMod(s, 'diplo');
  if (ch.traits.includes('silver')) p += 0.1;
  if (kind === 'marriage' && ch.traits.includes('matchmaker')) p += 0.2;
  if (hasTech(s, 'chancery')) p += 0.1;
  if ((nat.spiedUntil ?? 0) > s.year) p += 0.1;
  if (kind === 'trade' && nat.personality === 'merchant') p += 0.1;
  if (nat.personality === 'expansionist') p -= 0.08;
  if (kind === 'alliance') {
    const need = hasTech(s, 'embassies') ? 25 : 40;
    if (rel < need) p -= 0.35;
  }
  if (kind === 'peace') {
    const w = findWar(s, s.player, target);
    if (w) {
      const mine = w.a === s.player ? w.gainsA : w.gainsB, theirs = w.a === s.player ? w.gainsB : w.gainsA;
      p += (mine - theirs) * 0.12 + (s.year - w.since) * 0.04;
      const ratio = armyPower(s.troops) / Math.max(1, armyPower(nat.army));
      p += clamp(ratio - 1, -1, 1) * 0.2;
      p -= rel / 250; // relations do not help much here
    }
  }
  p -= 0.06 * Math.max(0, player(s).stability < 0 ? -player(s).stability : 0);
  return clamp(p, 0.05, 0.95);
}

/** Returns a reason the mission cannot be launched, or null. */
export function missionBlocked(s: GameState, kind: MissionKind, target: string, building?: string): string | null {
  const me = s.player;
  if (kind === 'conquer' || kind === 'raid') {
    const p = s.provinces[target];
    if (!p || p.owner === me) return 'Choose a foreign province';
    if (!atWar(s, me, p.owner)) return `You are not at war with ${nationName(s, p.owner)}`;
    if (!attackRoute(s, target)) return 'Too far: no border or sea route';
    if (s.missions.some(m => (m.kind === 'conquer' || m.kind === 'raid') && m.target === target)) return 'An army is already marching there';
    return null;
  }
  if (DIPLO.includes(kind)) {
    const n = s.nations[target];
    if (!n || !n.alive || target === me) return 'Choose another nation';
    if (s.missions.some(m => DIPLO.includes(m.kind) && m.target === target)) return 'An envoy is already there';
    const war = atWar(s, me, target);
    if (kind === 'peace') return war ? null : 'You are not at war';
    if (war) return 'You are at war: only peace talks are possible';
    if (kind === 'trade' && hasTreaty(s, me, target, 'trade')) return 'Trade treaty already signed';
    if (kind === 'alliance' && hasTreaty(s, me, target, 'alliance')) return 'Already allied';
    if (kind === 'marriage' && hasTreaty(s, me, target, 'marriage')) return 'Royal houses already joined';
    if (kind === 'trade' && getRel(s, me, target) < -30) return 'Relations too poor (below −30)';
    if (kind === 'marriage' && getRel(s, me, target) < 0) return 'Relations must be at least 0';
    return null;
  }
  if (kind === 'research') {
    const t = TECH[target];
    if (!t) return 'Choose a technology';
    if (s.techs.includes(target)) return 'Already known';
    if (t.req?.some(r => !s.techs.includes(r))) return 'Needs ' + t.req!.filter(r => !s.techs.includes(r)).map(r => TECH[r].name).join(', ');
    if (s.missions.some(m => m.kind === 'research' && m.target === target)) return 'Already being studied';
    return null;
  }
  if (kind === 'build') {
    if (s.provinces[target]?.owner !== me) return 'Choose one of your provinces';
    const why = buildingAllowed(s, target, building!);
    if (why) return why;
    if (player(s).gold < buildingCost(s, building!)) return `Needs ${buildingCost(s, building!)} ducats`;
    return null;
  }
  if (kind === 'develop') {
    const p = s.provinces[target];
    if (p?.owner !== me) return 'Choose one of your provinces';
    if (p.dev >= 8) return 'Already fully developed';
    if (s.missions.some(m => m.kind === 'develop' && m.target === target)) return 'Already under way';
    if (player(s).gold < developCost(s, target)) return `Needs ${developCost(s, target)} ducats`;
    return null;
  }
  if (kind === 'tax' || kind === 'progress') {
    if (s.missions.some(m => m.kind === kind)) return 'Already under way';
    return null;
  }
  return null;
}

export function launchMission(s: GameState, kind: MissionKind, charUid: number, target: string, troopUids: number[], building?: string): string | null {
  const ch = s.characters.find(c => c.uid === charUid);
  if (!ch || ch.mission != null) return 'Choose a free character';
  if (ch.role !== MISSION_INFO[kind].role) return `Needs a ${MISSION_INFO[kind].role}`;
  const why = missionBlocked(s, kind, target, building);
  if (why) return why;
  if ((kind === 'conquer' || kind === 'raid') && !troopUids.length) return 'Send at least one troop';
  const m: Mission = {
    id: uid(s), kind, char: charUid, troops: troopUids, target, building,
    turnsLeft: missionTurns(s, kind, ch, target, building), total: 0, progress: 0, bonus: 0,
  };
  m.total = m.turnsLeft;
  if (kind === 'build') { m.progress = buildingCost(s, building!); player(s).gold -= m.progress; }
  if (kind === 'develop') { m.progress = developCost(s, target); player(s).gold -= m.progress; }
  ch.mission = m.id;
  for (const t of s.troops) if (troopUids.includes(t.uid)) t.mission = m.id;
  s.missions.push(m);
  return null;
}

export function cancelMission(s: GameState, id: number) {
  const m = s.missions.find(x => x.id === id);
  if (!m) return;
  if ((m.kind === 'build' || m.kind === 'develop') && m.progress) player(s).gold += Math.round(m.progress / 2);
  freeMission(s, id);
  s.missions = s.missions.filter(x => x.id !== id);
}

const TWISTS: { title: string; text: string; d: number; rel: number }[] = [
  { title: 'Warm Welcome', text: 'The court receives your envoy with honour.', d: 0.15, rel: 0 },
  { title: 'Rival Envoy', text: 'A rival ambassador is whispering against you.', d: -0.15, rel: 0 },
  { title: 'Court Scandal', text: 'Your envoy is caught in an embarrassing affair.', d: -0.1, rel: -5 },
  { title: 'A Gift of Falcons', text: 'Your hunting falcons delight the prince.', d: 0.1, rel: 5 },
  { title: 'Favourable Winds', text: 'Good news from your agents arrives just in time.', d: 0.1, rel: 0 },
  { title: 'The Prince is Ill', text: 'Nothing can be decided while the prince lies sick.', d: -0.1, rel: 0 },
];

function gainXp(s: GameState, ch: Character | undefined, items: RevealItem[]) {
  if (!ch) return;
  ch.xp++;
  if (ch.xp >= 3 && ch.skill < 6) { ch.skill++; ch.xp = 0; items.push({ title: `${ch.name} improves`, text: `Skill rises to ${ch.skill}.`, tone: 'good', kind: 'star' }); }
}

/** Advance all missions by one year. Battles and results are pushed onto the prompt queue. */
export function advanceMissions(s: GameState) {
  for (const m of [...s.missions]) {
    const ch = s.characters.find(c => c.uid === m.char);
    if (!ch) { cancelMission(s, m.id); continue; }
    if (m.kind === 'research') {
      m.progress += researchRate(s, ch);
      if (rand(s) < 0.08) { m.progress += 2; log(s, `Breakthrough in the study of ${TECH[m.target].name}!`, 'good'); }
      const cost = techCost(s, m.target);
      m.turnsLeft = Math.max(0, Math.ceil((cost - m.progress) / researchRate(s, ch)));
      if (m.progress >= cost) completeResearch(s, m, ch);
      continue;
    }
    m.turnsLeft--;
    if (m.turnsLeft > 0) continue;
    resolveMission(s, m, ch);
  }
}

function finish(s: GameState, m: Mission) { freeMission(s, m.id); s.missions = s.missions.filter(x => x.id !== m.id); }

function completeResearch(s: GameState, m: Mission, ch: Character) {
  const t = TECH[m.target];
  s.techs.push(t.id);
  player(s).prestige += 2;
  if (t.id === 'bureaucracy' || t.id === 'absolutism') player(s).stability = clamp(player(s).stability + 1, -3, 3);
  if (t.id === 'star_forts') { const cap = s.provinces[player(s).capital]; if (cap && cap.owner === s.player) cap.fort = Math.min(3, cap.fort + 1); }
  const items: RevealItem[] = [{ title: t.name, text: t.desc, tone: 'good', kind: 'book' }];
  gainXp(s, ch, items);
  push(s, { kind: 'reveal', title: 'Research complete', subtitle: `${ch.name} completes the study`, items });
  log(s, `Research complete: ${t.name}.`, 'good');
  finish(s, m);
}

function resolveMission(s: GameState, m: Mission, ch: Character) {
  const me = player(s);
  if (m.kind === 'conquer' || m.kind === 'raid') {
    const prov = s.provinces[m.target];
    if (prov.owner === s.player || !atWar(s, s.player, prov.owner)) {
      push(s, { kind: 'reveal', title: 'Army returns', items: [{ title: prov.name, text: 'The war there is over. Your army comes home.', tone: 'neutral', kind: 'sword' }] });
      finish(s, m); return;
    }
    const enemy = s.nations[prov.owner];
    const troops = s.troops.filter(t => m.troops.includes(t.uid));
    if (!troops.length) { finish(s, m); return; }
    const att = makeSide(s.player, toBattleUnits(troops), { name: ch.name, skill: ch.skill, traits: ch.traits, uid: ch.uid }, 0, true);
    const defUnits = [...enemy.army].sort((a, b) => armyPower([b]) - armyPower([a])).slice(0, m.kind === 'raid' ? 3 : 6);
    const fort = m.kind === 'raid' ? Math.max(0, prov.fort - 1) : prov.fort;
    if (!defUnits.length && fort === 0) {
      // undefended: walks in
      const items: RevealItem[] = [];
      if (m.kind === 'conquer') {
        transferProvince(s, prov.id, s.player);
        me.prestige += 4;
        items.push({ title: `${prov.name} surrenders`, text: 'No army stands to defend it. The keys of the city are handed over.', tone: 'good', kind: 'sword' });
        log(s, `${prov.name} surrenders without a fight.`, 'good');
      } else {
        const loot = Math.round(prov.dev * 8 + 5); me.gold += loot;
        items.push({ title: 'Easy plunder', text: `Your raiders return with ${loot} ducats.`, tone: 'good', kind: 'coin' });
      }
      gainXp(s, ch, items);
      push(s, { kind: 'reveal', title: MISSION_INFO[m.kind].name, items });
      finish(s, m); return;
    }
    const def = makeSide(enemy.id, toBattleUnits(defUnits), genericGeneral(s), fort, false);
    const b = createBattle(s, att, def, prov.id, m.kind, m.id);
    push(s, { kind: 'battle', battle: b });
    return;
  }

  if (DIPLO.includes(m.kind)) {
    const target = m.target;
    const tn = s.nations[target];
    const items: RevealItem[] = [];
    if (!tn.alive || (m.kind !== 'peace' && atWar(s, s.player, target)) || (m.kind === 'peace' && !atWar(s, s.player, target))) {
      push(s, { kind: 'reveal', title: MISSION_INFO[m.kind].name, items: [{ title: 'Mission abandoned', text: 'Events have overtaken your envoy.', tone: 'neutral', kind: 'scroll' }] });
      finish(s, m); return;
    }
    let p = diploChance(s, m.kind, ch, target, m.bonus);
    if (rand(s) < 0.35) {
      const tw = pick(s, TWISTS);
      p = clamp(p + tw.d, 0.05, 0.95);
      if (tw.rel) addRel(s, s.player, target, tw.rel);
      items.push({ title: tw.title, text: tw.text + ` (${tw.d > 0 ? '+' : ''}${Math.round(tw.d * 100)}%)`, tone: tw.d > 0 ? 'good' : 'bad', kind: 'twist' });
    }
    const ok = rand(s) < p;
    const tname = tn.name;
    if (ok) {
      switch (m.kind) {
        case 'relations': addRel(s, s.player, target, 25); items.push({ title: 'Friendship', text: `Relations with ${tname} +25.`, tone: 'good', kind: 'scroll' }); break;
        case 'trade': {
          addTreaty(s, s.player, target, 'trade'); addRel(s, s.player, target, 10); me.prestige += 2;
          if (ch.traits.includes('merchant')) s.flags['trade_bonus_' + target] = 2;
          items.push({ title: 'Treaty signed', text: `A trade route opens with ${tname}. Both crowns earn ducats every year.`, tone: 'good', kind: 'coin' }); break;
        }
        case 'alliance': addTreaty(s, s.player, target, 'alliance'); addRel(s, s.player, target, 15); me.prestige += 3; items.push({ title: 'Alliance sealed', text: `${tname} will stand with you in war.`, tone: 'good', kind: 'hands' }); break;
        case 'marriage': addTreaty(s, s.player, target, 'marriage'); addRel(s, s.player, target, 20); me.prestige += 4; items.push({ title: 'A royal wedding', text: `The houses of ${me.name} and ${tname} are joined. Relations improve every year.`, tone: 'good', kind: 'ring' }); break;
        case 'peace': makePeace(s, s.player, target); items.push({ title: 'Peace', text: `The war with ${tname} is over. A ten-year truce begins.`, tone: 'good', kind: 'dove' }); break;
      }
      gainXp(s, ch, items);
      log(s, `${MISSION_INFO[m.kind].name} with ${tname} succeeded.`, 'good');
    } else {
      if (m.kind === 'relations') addRel(s, s.player, target, 5); else addRel(s, s.player, target, -5);
      items.push({ title: 'Refused', text: `${tname} turns your envoy away.`, tone: 'bad', kind: 'scroll' });
      log(s, `${MISSION_INFO[m.kind].name} with ${tname} failed.`, 'bad');
    }
    push(s, { kind: 'reveal', title: MISSION_INFO[m.kind].name, subtitle: `${ch.name} in ${tname} · ${Math.round(p * 100)}% chance`, items });
    finish(s, m); return;
  }

  if (m.kind === 'build') {
    const prov = s.provinces[m.target];
    const b = BUILDINGS[m.building!];
    if (prov.owner !== s.player) { finish(s, m); return; }
    if (b.id === 'fortress') prov.fort++; else prov.buildings.push(b.id);
    if (b.id === 'cathedral') me.stability = clamp(me.stability + 1, -3, 3);
    me.prestige += 1;
    const items: RevealItem[] = [{ title: `${b.name} in ${prov.name}`, text: b.desc, tone: 'good', kind: b.icon }];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Construction complete', items });
    log(s, `${b.name} completed in ${prov.name}.`, 'good');
    finish(s, m); return;
  }

  if (m.kind === 'develop') {
    const prov = s.provinces[m.target];
    if (prov.owner !== s.player) { finish(s, m); return; }
    prov.dev++; me.prestige += 1;
    const items: RevealItem[] = [{ title: `${prov.name} flourishes`, text: `Development rises to ${prov.dev}: more ducats and manpower.`, tone: 'good', kind: 'wheat' }];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Development', items });
    finish(s, m); return;
  }

  if (m.kind === 'tax') {
    const dev = provsOf(s, s.player).reduce((a, p) => a + p.dev, 0);
    let g = 4 * ch.skill + dev * 0.5;
    if (ch.traits.includes('tax')) g *= 1.5;
    if (hasTech(s, 'bureaucracy')) g *= 1.5;
    g = Math.round(g);
    me.gold += g;
    const items: RevealItem[] = [{ title: 'Coffers filled', text: `${ch.name} collects ${g} ducats.`, tone: 'good', kind: 'coin' }];
    if (rand(s) < 0.2) { me.stability = clamp(me.stability - 1, -3, 3); items.push({ title: 'Grumbling', text: 'The collectors were heavy-handed. Stability −1.', tone: 'bad', kind: 'twist' }); }
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Tax Collection', items });
    finish(s, m); return;
  }

  if (m.kind === 'progress') {
    const d = 1 + (ch.traits.includes('steward') ? 1 : 0);
    me.stability = clamp(me.stability + d, -3, 3);
    me.prestige += 2;
    for (const p of provsOf(s, s.player)) p.unrest = Math.max(0, p.unrest - 2);
    const items: RevealItem[] = [{ title: 'The crown is cheered', text: `Stability +${d}, prestige +2. Unrest falls everywhere.`, tone: 'good', kind: 'crown' }];
    gainXp(s, ch, items);
    push(s, { kind: 'reveal', title: 'Royal Progress', items });
    finish(s, m); return;
  }
}

