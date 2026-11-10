// Mission mode: a realm, a deadline and a few goals. Lands are named by who held them in 1451.
import type { Goal } from '../types';

export interface MissionDef {
  id: string; name: string; icon: string; start: number; deadline: number;
  nations: string[];      // who may play it
  text: string; goals: Goal[];
}

const NEW_WORLD = ['caribbean', 'mexico', 'north_america', 'brazil', 'andes', 'plata'];
const ITALY = ['venice', 'milan', 'florence', 'naples', 'papacy', 'genoa', 'savoy', 'ferrara', 'mantua', 'siena', 'lucca', 'montferrat', 'urbino', 'modena'];
const AFRICA = ['west_africa', 'central_africa', 'east_africa', 'southern_africa', 'north_africa'];

export const MISSIONS: MissionDef[] = [
  { id: 'golden_age', name: "Spain's Golden Age", icon: 'crown', start: 1451, deadline: 1520, nations: ['castile', 'aragon'],
    text: 'Unite the crowns of Iberia, finish the Reconquista and plant your banner across the Ocean Sea.',
    goals: [{ k: 'ownLands', of: ['castile', 'aragon', 'granada', 'navarre'], label: 'Spain united: Castile, Aragon, Granada and Navarre (yours or your subjects\')' }, { k: 'colonies', n: 1, regions: NEW_WORLD }] },
  { id: 'conqueror', name: 'The Conqueror', icon: 'sword', start: 1451, deadline: 1530, nations: ['ottomans'],
    text: 'Take the City of the Caesars, then march up the Danube until Christendom trembles.',
    goals: [{ k: 'own', provinces: ['constantinople', 'belgrade', 'buda', 'vienna'] }] },
  { id: 'sea_road', name: 'The Sea Road to India', icon: 'anchor', start: 1451, deadline: 1510, nations: ['portugal'],
    text: 'Round Africa, reach the Indies by sea, and open the spice trade to Lisbon.',
    goals: [{ k: 'discover', regions: ['india'] }, { k: 'posts', n: 2, regions: ['india', 'east_africa', 'east_indies'] }] },
  { id: 'lion_st_mark', name: 'Lion of St Mark', icon: 'coin', start: 1451, deadline: 1550, nations: ['venice'],
    text: 'Grow rich on trade and keep the Turk out of Italy. Gold, not swords.',
    goals: [{ k: 'income', top: 5 }, { k: 'posts', n: 3 }, { k: 'noneIn', nation: 'ottomans', of: ITALY, label: 'No Ottoman province in Italy' }] },
  { id: 'third_rome', name: 'The Third Rome', icon: 'church', start: 1451, deadline: 1550, nations: ['muscovy'],
    text: 'Throw off the Tatar yoke, swallow Novgorod and rule the Rus.',
    goals: [{ k: 'independent' }, { k: 'ownLands', of: ['novgorod'], label: 'All the lands of Novgorod' }, { k: 'provinces', n: 30 }] },
  { id: 'aeiou', name: 'A.E.I.O.U.', icon: 'ring', start: 1451, deadline: 1530, nations: ['austria'],
    text: 'Let others wage war; you, happy Austria, marry. Gain Bohemia and Hungary.',
    goals: [{ k: 'subjects', of: ['bohemia', 'hungary'] }] },
  { id: 'treasure_fleets', name: 'The Treasure Fleets', icon: 'ship', start: 1451, deadline: 1550, nations: ['ming'],
    text: 'Send the great junks west again and stay the first power under Heaven.',
    goals: [{ k: 'discover', regions: ['east_africa', 'india'] }, { k: 'rank', top: 1 }] },
  { id: 'gold_mali', name: 'The Gold of Mali', icon: 'coin', start: 1451, deadline: 1550, nations: ['mali'],
    text: 'Restore the empire of Mansa Musa: wide lands and the richest treasury in Africa.',
    goals: [{ k: 'provinces', n: 15 }, { k: 'income', top: 1, regions: AFRICA }] },
  { id: 'fifth_sun', name: 'The Fifth Sun', icon: 'star', start: 1451, deadline: 1600, nations: ['aztec', 'inca'],
    text: 'Strangers will come from the sea. Learn fast, and still rule from your own capital in 1600.',
    goals: [{ k: 'capital' }, { k: 'techs', n: 12 }] },
];
export const MISSION: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map(m => [m.id, m]));

/** Regions a custom goal can name. */
export const GOAL_REGIONS = ['caribbean', 'north_america', 'mexico', 'brazil', 'andes', 'plata', 'west_africa', 'central_africa', 'southern_africa', 'east_africa', 'india', 'east_indies', 'china', 'siberia', 'oceania', 'europe', 'middle_east', 'north_africa', 'russia', 'central_asia'];
