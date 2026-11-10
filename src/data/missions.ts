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

  // ---------- 1600 ----------
  { id: 'dutch_golden_age', name: 'The Dutch Golden Age', icon: 'coin', start: 1600, deadline: 1650, nations: ['netherlands'],
    text: 'Win your freedom from Spain, then make Amsterdam the warehouse of the world.',
    goals: [{ k: 'independent' }, { k: 'income', top: 3 }, { k: 'posts', n: 4 }, { k: 'colonies', n: 2 }] },
  { id: 'lion_north', name: 'Lion of the North', icon: 'crown', start: 1600, deadline: 1660, nations: ['sweden'],
    text: 'Turn the Baltic into a Swedish lake and stand among the great powers.',
    goals: [{ k: 'own', provinces: ['riga', 'reval', 'ingria', 'stettin', 'scania'], label: 'The Baltic shores: Riga, Reval, Ingria, Stettin and Scania' }, { k: 'army', top: 5 }] },
  { id: 'akbar', name: "Akbar's Empire", icon: 'star', start: 1600, deadline: 1660, nations: ['mughals'],
    text: 'Bring the whole of Hindustan, from the Indus to the Deccan, under the Peacock Throne.',
    goals: [{ k: 'provinces', n: 75 }, { k: 'rank', top: 3 }] },
  { id: 'rule_waves', name: 'Rule the Waves', icon: 'anchor', start: 1600, deadline: 1700, nations: ['england'],
    text: 'Beat the Armada\'s heirs at sea and plant colonies on every ocean.',
    goals: [{ k: 'navy', top: 1 }, { k: 'colonies', n: 8 }] },
  { id: 'long_war', name: 'The Long Turkish War', icon: 'sword', start: 1600, deadline: 1700, nations: ['austria'],
    text: 'Drive the Turk out of Hungary and down the Danube.',
    goals: [{ k: 'own', provinces: ['buda', 'belgrade'] }, { k: 'techs', n: 45 }] },

  // ---------- 1700 ----------
  { id: 'liberte', name: 'Liberté', icon: 'torch', start: 1700, deadline: 1795, nations: ['france'],
    text: 'Make France the most learned nation on earth, then let the people overthrow the old order.',
    goals: [{ k: 'techs', n: 66 }, { k: 'gov', gov: 'republic' }] },
  { id: 'thirteen', name: 'Join or Die', icon: 'banner', start: 1700, deadline: 1810, nations: ['thirteen_colonies'],
    text: 'Break free of the English crown and become one of the great military powers.',
    goals: [{ k: 'independent' }, { k: 'army', top: 10 }, { k: 'provinces', n: 12 }] },
  { id: 'prussia_rise', name: 'An Army with a State', icon: 'helm', start: 1700, deadline: 1760, nations: ['brandenburg'],
    text: 'From a scattered electorate to a great power: drill, discipline and Silesia.',
    goals: [{ k: 'army', top: 5 }, { k: 'provinces', n: 15 }] },
  { id: 'peter', name: 'A Window on the West', icon: 'ship', start: 1700, deadline: 1730, nations: ['muscovy'],
    text: 'Take a port on the Baltic, build a fleet and catch up with the West.',
    goals: [{ k: 'own', provinces: ['ingria', 'reval', 'riga'], label: 'The Baltic ports: Ingria, Reval and Riga' }, { k: 'navy', top: 5 }, { k: 'techs', n: 55 }] },
  { id: 'maratha_rise', name: 'Hindavi Swarajya', icon: 'sword', start: 1700, deadline: 1770, nations: ['marathas'],
    text: 'Drive the Mughals from the Deccan and raise the saffron flag over Delhi.',
    goals: [{ k: 'own', provinces: ['delhi', 'agra'] }, { k: 'provinces', n: 25 }] },
  { id: 'kangxi', name: 'The High Qing', icon: 'crown', start: 1700, deadline: 1780, nations: ['qing'],
    text: 'Rule the largest and richest realm under Heaven for a century of peace.',
    goals: [{ k: 'rank', top: 1 }, { k: 'provinces', n: 90 }, { k: 'income', top: 1 }] },
];
export const MISSION: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map(m => [m.id, m]));

/** Regions a custom goal can name. */
export const GOAL_REGIONS = ['caribbean', 'north_america', 'mexico', 'brazil', 'andes', 'plata', 'west_africa', 'central_africa', 'southern_africa', 'east_africa', 'india', 'east_indies', 'china', 'siberia', 'oceania', 'europe', 'middle_east', 'north_africa', 'russia', 'central_asia'];
