// The rules of the tech groups (data/techgroups.ts): whose group a realm is, what contact it has, which soldier
// stands in for a European type.
import type { GameState } from '../types';
import { TECH_GROUPS, groupOfCulture, BRIDGE_FOR, type TechGroup } from '../data/techgroups';
import { TECH } from '../data/techs';
import { TROOPS } from '../data/troops';
import { borders, atWar, provsOf } from './core';
import { provRegion } from './overseas';
import { later } from './eventkit';
import { capsOf, researchBlock } from './technology';

export const groupOf = (s: GameState, id = s.player): TechGroup => groupOfCulture(s.nations[id]?.culture ?? '');
export const groupDef = (s: GameState, id = s.player) => TECH_GROUPS[groupOf(s, id)];

/** Groups the realm is in contact with: a shared border, or a war. Worked out once a season. */
let cache = { key: '', groups: new Set<TechGroup>() };
export function contactGroups(s: GameState, id = s.player): Set<TechGroup> {
  const key = `${id}|${s.year}|${s.quarter ?? 0}|${s.seed}`;
  if (cache.key === key) return cache.groups;
  const out = new Set<TechGroup>([groupOf(s, id)]);
  for (const n of Object.values(s.nations)) if (n.alive && n.id !== id && (borders(s, id, n.id) || atWar(s, id, n.id))) out.add(groupOf(s, n.id));
  cache = { key, groups: out };
  return out;
}
/** Does this realm need a strangers' study at all? Only where it lacks something the study opens. */
export const needsBridge = (s: GameState, bridge: string, id = s.player) => (TECH[bridge]?.grants ?? []).some(c => !capsOf(s, id).has(c));
/** Why a technology cannot yet be studied by this realm, or null if it can: its capabilities (technology.ts), and for
 *  a strangers' study a realm in contact that has what it opens. The First Contact event counts as that contact. */
export function closedBecause(s: GameState, tech: string, id = s.player): string | null {
  if (TECH[tech]?.bridge && id === s.player && s.flags.first_contact && needsBridge(s, tech, id)) return null;
  return researchBlock(s, tech, id);
}

/** The European types in the order of their class line, to find a type's place. */
const EURO = TECH_GROUPS.western.lines;
/** The soldier a realm of this group raises in place of a European type (for starting armies and the AI). */
export function localUnit(group: TechGroup, type: string): string | null {
  const lines = TECH_GROUPS[group].lines;
  if (group === 'western' || group === 'eastern') return type;
  for (const [cls, line] of Object.entries(EURO)) {
    const i = line!.indexOf(type);
    if (i < 0) continue;
    const mine = lines[cls as keyof typeof lines];
    if (!mine?.length) return null;
    return mine[Math.min(i, mine.length - 1)];
  }
  // heavy types made by recipes (knights, tercios): the best of the matching kind the group has
  const kind = TROOPS[type]?.kind;
  const cls = kind === 'cav' ? 'cav' : kind === 'shot' ? 'shot' : kind === 'art' ? 'art' : 'inf';
  const mine = lines[cls as keyof typeof lines] ?? lines.inf;
  return mine?.length ? mine[mine.length - 1] : null;
}

/** Once a year, for a realm that must learn from strangers: has a people who know gunpowder come to its part of
 *  the world (a colony in a region where it holds land), or met it on a border or in war? The first time, the
 *  First Contact event tells the player, and the bridge studies open. */
export function checkFirstContact(s: GameState) {
  if (s.flags.first_contact || capsOf(s).has('gunpowder')) return;
  const mine = new Set(provsOf(s, s.player).map(p => provRegion(p.id)));
  const knows = (owner: string) => !!s.nations[owner]?.alive && owner !== s.player && capsOf(s, owner).has('gunpowder');
  const landed = Object.values(s.provinces).find(p => knows(p.owner) && mine.has(provRegion(p.id)));
  const met = landed ? null : Object.values(s.nations).find(n => knows(n.id) && (borders(s, s.player, n.id) || atWar(s, s.player, n.id)));
  const who = landed?.owner ?? met?.id;
  if (!who) return;
  s.flags.first_contact = s.year;
  const prov = landed?.id ?? provsOf(s, who)[0]?.id ?? '';
  later(s, 'first_contact', 0, 0, { nation: who, prov });
}
