// Forms of government. Each has a few plain effects (the same keys as research, added up by techFx)
// and a research that makes it possible. Changing it takes a Revolution.
import type { TechFx } from './techs';

export interface GovDef {
  id: string; name: string; icon: string;
  tech?: string;          // research needed before a revolution can bring it
  text: string;           // what it feels like
  buffs: string[];        // what it does, one line each
  fx: TechFx;
  levies?: boolean;       // may raise Levy Infantry
  farms?: number;         // share more food and leather from the land
  rebels: string;         // the faction that fights a revolution towards it
}

export const GOVS: Record<string, GovDef> = {
  feudal: {
    id: 'feudal', name: 'Feudal Monarchy', icon: 'tower', rebels: 'Loyal Barons',
    text: 'The king rules through his lords: they raise the men and keep much of the taxes.',
    buffs: ['Levy Infantry cards: the lords call up their peasants', 'Farms and pastures make 25% more', '+1 manpower a year', 'Taxes −10%: the lords keep their share'],
    fx: { manpower: 1, income: -0.1 }, levies: true, farms: 0.25,
  },
  absolutism: {
    id: 'absolutism', name: 'Absolute Monarchy', icon: 'crown', tech: 'absolutism', rebels: 'Noble Fronde',
    text: 'One crown, one law. The nobles dance at court instead of ruling their lands.',
    buffs: ['+10% income', '+3 army size', '+1 nation point a year', 'No more levies; −3 happiness'],
    fx: { income: 0.1, army: 3, np: 1, happy: -3 },
  },
  parliament: {
    id: 'parliament', name: 'Parliamentary Monarchy', icon: 'scales', tech: 'councils', rebels: 'King\'s Party',
    text: 'The crown rules with a parliament of lords and merchants, who vote the taxes.',
    buffs: ['+15% income', '+2 trade routes', '+4 happiness', '−1 nation point a year'],
    fx: { income: 0.15, routes: 2, happy: 4, np: -1 },
  },
  enlightened: {
    id: 'enlightened', name: 'Enlightened Despotism', icon: 'book', tech: 'enlightened', rebels: 'Old Order',
    text: 'A philosopher-king reforms everything, for the people but without them.',
    buffs: ['+2 research a year for every scholar', '+0.3 People cards a year', '+1 stability', '+2 control a year everywhere'],
    fx: { research: 2, stability: 1, control: 2, rates: { culture: 0.3 } },
  },
  republic: {
    id: 'republic', name: 'Republic', icon: 'people', tech: 'encyclopaedia', rebels: 'Royalists',
    text: 'No crown at all: the citizens choose who governs, and pay their taxes gladly.',
    buffs: ['+6 happiness', '+10% income', '+0.2 Economy and Diplomacy cards a year', '−2 army size'],
    fx: { happy: 6, income: 0.1, army: -2, rates: { economy: 0.2, diplomacy: 0.2 } },
  },
};
export const GOV_ORDER = ['feudal', 'absolutism', 'parliament', 'enlightened', 'republic'];
