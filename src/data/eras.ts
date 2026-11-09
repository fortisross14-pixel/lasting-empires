// The ages of the game. Each one bends the rules a little.
import type { Cat } from '../types';

export interface EraDef {
  id: string; name: string; from: number; to: number; icon: string;
  text: string;      // what the age feels like
  effects: string[]; // what it changes, for the player
  rates?: Partial<Record<Cat, number>>;
}

export const ERAS: EraDef[] = [
  { id: 'reconquest', name: 'Age of Crusade', from: 1453, to: 1491, icon: 'sword',
    text: 'Constantinople falls and the old frontiers burn. Kings fight for faith and land.',
    effects: ['+0.2 Military cards a year', 'War on a realm of another faith costs 1 less stability'], rates: { military: 0.2 } },
  { id: 'discovery', name: 'Age of Discovery', from: 1492, to: 1516, icon: 'anchor',
    text: 'Ships sail beyond every known sea. New worlds wait for the bold.',
    effects: ['Voyages and colonies are 10% more likely to succeed', 'Colonies cost 25% less', '+0.2 Diplomacy cards a year'], rates: { diplomacy: 0.2 } },
  { id: 'reformation', name: 'Age of Reformation', from: 1517, to: 1599, icon: 'church',
    text: 'Printing presses spread new faiths. Princes choose their church, and their wars.',
    effects: ['Provinces of another faith are 4 less happy', 'Religious missions fail less often', '+0.2 Internal cards a year'], rates: { internal: 0.2 } },
  { id: 'absolutism', name: 'Age of Absolutism', from: 1600, to: 1699, icon: 'crown',
    text: 'Great standing armies and greater palaces. The crown is the state.',
    effects: ['Administration costs 15% less', '+1 nation point a year', '+0.1 Military and Economy cards a year'], rates: { military: 0.1, economy: 0.1 } },
  { id: 'enlightenment', name: 'Age of Enlightenment', from: 1700, to: 1750, icon: 'book',
    text: 'Reason, science and salons. Even kings must now explain themselves.',
    effects: ['+0.3 Research cards a year', 'The arts grow 50% faster'], rates: { research: 0.3 } },
];

export const eraOf = (year: number): EraDef => ERAS.find(e => year >= e.from && year <= e.to) ?? ERAS[ERAS.length - 1];
