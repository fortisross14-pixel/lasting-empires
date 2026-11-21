// Where a realm stands in the world of 1450–1800 (roadmap: regional development). Seven groups, by the people a
// realm is made of. A group sets how dear research is, which technologies it cannot reach until it meets a people
// who know them, and which soldiers it raises.
import { CULTURE_POOL } from './names';
import type { UnitClass } from '../engine/cards';

export type TechGroup = 'western' | 'eastern' | 'islamic' | 'indian' | 'eastasian' | 'african' | 'american';

export interface TechGroupDef {
  id: TechGroup; name: string;
  /** Research costs this many times the base. */
  cost: number;
  /** Technologies out of reach until contact with a group that knows them (a shared border, or a war). */
  closed: string[];
  /** The soldier each kind of troop card raises, in order of the research that brings them; the first that is
   *  allowed is the one raised. A class left out cannot be raised at all (no horses in the Americas). */
  lines: Partial<Record<UnitClass, string[]>>;
  /** European mercenaries (the Swiss Captain) come to these realms only. */
  mercenaries?: boolean;
}

/** Gunpowder, cannon and the ocean ship: what most of the world learned from others. */
const GUNPOWDER = ['firearms', 'bronze_cannon', 'wheellock', 'naval_gunnery', 'musket', 'flintlock', 'bayonet', 'standard_artillery', 'horse_artillery', 'ship_of_line'];
const EUROPE_LINES: TechGroupDef['lines'] = {
  levy: ['levy'], inf: ['men_at_arms', 'pikemen'], shot: ['crossbow', 'arquebusiers', 'musketeers', 'line_infantry'],
  cav: ['jinetes', 'reiters', 'dragoons'], art: ['bombard', 'field_cannon'],
};

export const TECH_GROUPS: Record<TechGroup, TechGroupDef> = {
  western: { id: 'western', name: 'Western Europe', cost: 1, closed: [], lines: EUROPE_LINES, mercenaries: true },
  eastern: { id: 'eastern', name: 'Eastern Europe', cost: 1.15, closed: [], lines: EUROPE_LINES, mercenaries: true },
  islamic: { id: 'islamic', name: 'The Islamic world', cost: 1.1, closed: [],
    lines: { levy: ['azaps'], inf: ['janissaries'], shot: ['horse_archers_foot', 'arquebusiers', 'musketeers', 'line_infantry'], cav: ['sipahis', 'dragoons'], art: ['bombard', 'field_cannon'] } },
  indian: { id: 'indian', name: 'India', cost: 1.25, closed: [],
    lines: { levy: ['levy'], inf: ['rajput_swords'], shot: ['archers', 'arquebusiers', 'musketeers'], cav: ['war_elephants', 'sipahis'], art: ['bombard', 'field_cannon'] } },
  eastasian: { id: 'eastasian', name: 'East Asia', cost: 1.1, closed: [],
    lines: { levy: ['militia'], inf: ['men_at_arms', 'pikemen'], shot: ['crossbow', 'arquebusiers', 'musketeers', 'line_infantry'], cav: ['horse_archers', 'dragoons'], art: ['bombard', 'field_cannon'] } },
  african: { id: 'african', name: 'Africa', cost: 1.5, closed: GUNPOWDER,
    lines: { levy: ['spearmen'], inf: ['shield_warriors'], shot: ['archers', 'arquebusiers', 'musketeers'], cav: ['sahel_horse'], art: ['bombard'] } },
  american: { id: 'american', name: 'The Americas', cost: 2, closed: [...GUNPOWDER, 'pike_square', 'navigation', 'cartography'],
    lines: { levy: ['warriors'], inf: ['elite_warriors'], shot: ['slingers', 'arquebusiers'] } },
};

const POOL_GROUP: Record<string, TechGroup> = {
  slavic: 'eastern', hungarian: 'eastern', greek: 'eastern',
  turkish: 'islamic', arab: 'islamic', persian: 'islamic', steppe: 'islamic',
  indian: 'indian', chinese: 'eastasian', korean: 'eastasian', japanese: 'eastasian', seasian: 'eastasian',
  african: 'african', american: 'american',
};
/** The group of a people; any people not listed is Western. */
export const groupOfCulture = (culture: string): TechGroup => POOL_GROUP[CULTURE_POOL[culture] ?? ''] ?? 'western';
