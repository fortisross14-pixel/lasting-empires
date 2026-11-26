// National cards and strengths (docs/HISTORY-PLAN.md, phase 2): the effects written as data in src/data/national.ts,
// read here for the hand of cards, the battle and the realm's page. Only the realms a card names ever draw it.
import type { GameState } from '../types';
import { NATIONAL_CARDS, NATIONAL_INTRO, LOCAL_TECH_NAMES, type NationalCard, type NationalEffect } from '../data/national';
import { TROOPS } from '../data/troops';
import { BUILDINGS, TECH } from '../data/techs';
import { HERITAGES } from '../data/heritage';
import { player, addRel, uid, hasTech, armyCap, buildingCost, nationName, provsOf } from './core';
import { nationKnown } from './overseas';
import { navyCap } from './navy';
import { raise, heritageOf, canEverRecruit } from './technology';

/** The national cards a realm may draw. */
export const nationalCardsOf = (nation: string): NationalCard[] => NATIONAL_CARDS.filter(c => c.only.includes(nation));

/** What the card needs to be played at all; null when it can be. */
export function nationalCan(s: GameState, c: NationalCard): string | null {
  for (const e of c.fx) {
    const tech = (e.k === 'promote' || e.k === 'raise') ? e.tech : undefined;
    if (tech && !hasTech(s, tech)) return `Needs ${TECH[tech]?.name ?? tech}`;
    if (e.k === 'raise') {
      if (e.gold && player(s).gold < e.gold) return `Needs ${e.gold} ducats`;
      if (!canEverRecruit(s, s.player, e.type)) return 'Your realm cannot raise these troops';
      if (full(s, e.type)) return TROOPS[e.type]?.kind === 'ship' ? 'Navy is at full size' : 'Army is at full size';
    }
    if (e.k === 'promote' && !s.troops.some(t => e.from.includes(t.type))) return `Needs a company of ${TROOPS[e.from[0]]?.name ?? e.from[0]}`;
  }
  return null;
}

const full = (s: GameState, type: string) => TROOPS[type]?.kind === 'ship' ? s.fleet.length >= navyCap(s) : s.troops.length >= armyCap(s);

/** What the card is played on: a troop, a task under way, a realm, or nothing. */
export function nationalTarget(c: NationalCard): 'none' | 'troop' | 'mission' | 'nation' {
  if (c.fx.some(e => e.k === 'promote')) return 'troop';
  if (c.fx.some(e => e.k === 'hasten' || e.k === 'refund')) return 'mission';
  if (c.fx.some(e => e.k === 'relations')) return 'nation';
  return 'none';
}

export function nationalTargetOk(s: GameState, c: NationalCard, t: string): boolean {
  for (const e of c.fx) {
    if (e.k === 'promote') { const x = s.troops.find(y => String(y.uid) === t); if (!x || !e.from.includes(x.type)) return false; }
    if (e.k === 'hasten') { const m = s.missions.find(x => String(x.id) === t); if (!m || m.turnsLeft <= 1 || m.kind === 'research' || (e.kinds && !e.kinds.includes(m.kind))) return false; }
    if (e.k === 'refund') { const m = s.missions.find(x => String(x.id) === t); if (!m || m.kind !== 'build' || !m.building || !BUILDINGS[m.building]) return false; }
    if (e.k === 'relations' && (t === s.player || !s.nations[t] || !nationKnown(s, t))) return false;
  }
  return true;
}

/** Play the card: returns the line for the log. */
export function playNational(s: GameState, c: NationalCard, t: string): string {
  const out: string[] = [];
  for (const e of c.fx) out.push(apply(s, e, t));
  return out.filter(Boolean).join('; ') || c.name;
}

function apply(s: GameState, e: NationalEffect, t: string): string {
  const me = player(s);
  switch (e.k) {
    case 'promote': {
      const x = s.troops.find(y => String(y.uid) === t);
      if (!x) return '';
      const was = TROOPS[x.type].name;
      x.type = e.to;
      return `${was} become ${TROOPS[e.to].name}`;
    }
    case 'raise': {
      if (e.gold) me.gold -= e.gold;
      let made: string | null = null;
      for (let i = 0; i < e.n; i++) {
        if (full(s, e.type)) break;
        made = raise(s, s.player, e.type, e.vet ?? 0, 100, () => uid(s)) ?? made;
      }
      return made ? `${TROOPS[made].name} join your forces` : 'No room for more companies';
    }
    case 'hasten': { const m = s.missions.find(x => String(x.id) === t); if (!m) return ''; m.turnsLeft = Math.max(1, m.turnsLeft - e.turns); return 'The task speeds up'; }
    case 'refund': {
      const m = s.missions.find(x => String(x.id) === t);
      if (!m?.building) return '';
      const back = Math.round(buildingCost(s, m.building) * e.share);
      me.gold += back;
      return `${back} ducats paid back on the ${BUILDINGS[m.building].name}`;
    }
    case 'gold': me.gold += e.n; return `+${e.n} ducats`;
    case 'np': s.np += e.n; return `+${e.n} nation points`;
    case 'prestige': me.prestige += e.n; return `+${e.n} prestige`;
    case 'goods': for (const [g, n] of Object.entries(e.goods)) s.stock[g] = (s.stock[g] ?? 0) + n; return Object.entries(e.goods).map(([g, n]) => `+${n} ${g}`).join(', ');
    case 'control': for (const p of provsOf(s, s.player)) p.control = Math.min(100, p.control + e.n); return `+${e.n} control`;
    case 'relations': addRel(s, s.player, t, e.n); return `Relations with ${nationName(s, t)} +${e.n}`;
    case 'refill': for (const x of s.troops) if (x.mission == null) x.str = 100; return 'Ranks refilled';
    case 'defend': {
      s.flags.natDefend = Math.round(e.bonus * 100);
      s.flags.natDefendUntil = s.year + e.years;
      for (const k of Object.keys(s.flags)) if (k.startsWith('natDefend_')) delete s.flags[k];
      for (const g of e.ground ?? []) s.flags['natDefend_' + g] = 1;
      return `Your defenders fight ${Math.round(e.bonus * 100)}% stronger until ${s.year + e.years}`;
    }
  }
}

/** The extra strength of the player's defenders on this ground, from a national card still in force (0 if none). */
export function nationalDefence(s: GameState, terrain: string): number {
  const f = s.flags;
  if (!f.natDefend || (f.natDefendUntil ?? 0) < s.year) return 0;
  const grounds = Object.keys(f).filter(k => k.startsWith('natDefend_'));
  if (grounds.length && !f['natDefend_' + terrain]) return 0;
  return f.natDefend / 100;
}

/** A realm's short introduction: its own, or one from its heritage. */
export function nationalIntro(s: GameState, nation: string): string {
  if (NATIONAL_INTRO[nation]) return NATIONAL_INTRO[nation];
  const h = HERITAGES[heritageOf(s, nation)];
  return `${nationName(s, nation)}, of the ${h.name} tradition: ${h.text.charAt(0).toLowerCase()}${h.text.slice(1)}`;
}

/** Show the common studies under the player's tradition's own names (data/national.ts). The names are display only,
 *  shared by every screen; called when a game starts or loads. */
const ORIGINAL_NAMES = new Map<string, string>();
export function localiseTechs(s: GameState) {
  const local = LOCAL_TECH_NAMES[heritageOf(s, s.player)] ?? {};
  for (const t of Object.values(TECH)) {
    if (!ORIGINAL_NAMES.has(t.id)) ORIGINAL_NAMES.set(t.id, t.name);
    t.name = local[t.id] ?? ORIGINAL_NAMES.get(t.id)!;
  }
}
