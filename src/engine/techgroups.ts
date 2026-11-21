// The rules of the tech groups (data/techgroups.ts): whose group a realm is, what contact it has, which soldier
// stands in for a European type.
import type { GameState } from '../types';
import { TECH_GROUPS, groupOfCulture, BRIDGE_FOR, type TechGroup } from '../data/techgroups';
import { TECH } from '../data/techs';
import { TROOPS } from '../data/troops';
import { borders, atWar } from './core';

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
/** Has this realm met a people who know the things a bridge study opens? */
function hasContactFor(s: GameState, bridge: string, id: string): boolean {
  const opened = Object.entries(BRIDGE_FOR).filter(([, b]) => b === bridge).map(([tech]) => tech);
  for (const other of contactGroups(s, id)) if (opened.some(t => !TECH_GROUPS[other].closed.includes(t))) return true;
  return false;
}
/** Does this realm need the study at all? Only where its group keeps something closed. */
export const needsBridge = (s: GameState, bridge: string, id = s.player) => groupDef(s, id).closed.some(t => BRIDGE_FOR[t] === bridge);
/** Why a technology cannot yet be studied by this realm, or null if it can. A closed technology needs its bridge
 *  study first; a bridge study needs contact with a people who know what it opens (a shared border or a war). */
export function closedBecause(s: GameState, tech: string, id = s.player): string | null {
  const g = groupDef(s, id);
  if (TECH[tech]?.bridge) {
    if (!needsBridge(s, tech, id)) return 'Not needed: your people know these things already';
    if (!hasContactFor(s, tech, id)) return `Needs contact with a people who know it: a shared border, or a war`;
    return null;
  }
  if (!g.closed.includes(tech)) return null;
  const bridge = BRIDGE_FOR[tech];
  if (bridge && !s.techs.includes(bridge)) return `Unknown in ${g.name.replace(/^The /, 'the ')}: first study ${TECH[bridge].name}`;
  return null;
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
