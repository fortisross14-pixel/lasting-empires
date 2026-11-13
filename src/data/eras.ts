// The ages of the game. An age opens when the first realm in the world reaches its research
// or its event. That realm is the pioneer and gets a bonus. Each age bends the rules a little.
import type { Cat } from '../types';

export interface EraDef {
  id: string; name: string; icon: string;
  text: string;      // what the age feels like
  effects: string[]; // what it changes, for the player
  rates?: Partial<Record<Cat, number>>;
  opens?: { tech?: string; event?: string; how: string }; // what starts it
  ai?: { from: number; chance: number; pioneers: string[] }; // when an AI realm may get there first
  focus: Cat;        // the pioneer's bonus cards
}

export const ERAS: EraDef[] = [
  { id: 'reconquest', name: 'Age of Crusade', icon: 'sword', focus: 'military',
    text: 'Constantinople falls and the old frontiers burn. Kings fight for faith and land.',
    effects: ['+0.2 Military cards a year', 'War on a realm of another faith costs 1 less stability', 'No voyages into the open ocean yet'], rates: { military: 0.2 } },
  { id: 'discovery', name: 'Age of Discovery', icon: 'anchor', focus: 'diplomacy',
    opens: { tech: 'navigation', how: 'The first realm to research Ocean Navigation opens it.' },
    ai: { from: 1478, chance: 0.07, pioneers: ['portugal', 'castile', 'aragon', 'genoa', 'venice', 'england', 'france'] },
    text: 'Ships sail beyond every known sea. New worlds wait for the bold.',
    effects: ['Voyages of discovery and colonies across the ocean are possible', 'Voyages and colonies are 10% more likely to succeed', 'Colonies cost 25% less', '+0.2 Diplomacy cards a year'], rates: { diplomacy: 0.2 } },
  { id: 'reformation', name: 'Age of Reformation', icon: 'church', focus: 'internal',
    opens: { event: 'reformer', how: 'Opens when a reformer is protected by a prince: a realm with the Printing Press may shelter one.' },
    ai: { from: 1505, chance: 0.06, pioneers: ['saxony', 'hesse', 'brandenburg', 'bohemia', 'swiss', 'sweden', 'denmark', 'england'] },
    text: 'Printing presses spread new faiths. Princes choose their church, and their wars.',
    effects: ['The Protestant faith spreads', 'Provinces of another faith are 4 less happy', 'Religious missions fail less often', '+0.2 Internal cards a year'], rates: { internal: 0.2 } },
  { id: 'absolutism', name: 'Age of Absolutism', icon: 'crown', focus: 'military',
    opens: { tech: 'absolutism', how: 'The first realm to research Absolutism opens it.' },
    ai: { from: 1590, chance: 0.07, pioneers: ['france', 'castile', 'austria', 'sweden', 'ottomans', 'muscovy', 'ming'] },
    text: 'Great standing armies and greater palaces. The crown is the state.',
    effects: ['Administration costs 15% less', '+1 nation point a year', '+0.1 Military and Economy cards a year'], rates: { military: 0.1, economy: 0.1 } },
  { id: 'enlightenment', name: 'Age of Enlightenment', icon: 'book', focus: 'research',
    opens: { tech: 'enlightened', how: 'The first realm to research Enlightened Government opens it.' },
    ai: { from: 1680, chance: 0.08, pioneers: ['england', 'france', 'burgundy', 'brandenburg', 'austria', 'sweden'] },
    text: 'Reason, science and salons. Even kings must now explain themselves.',
    effects: ['+0.3 Research cards a year', 'The arts grow 50% faster'], rates: { research: 0.3 } },
  { id: 'revolutions', name: 'Age of Revolutions', icon: 'torch', focus: 'internal',
    opens: { tech: 'rights_of_man', how: 'The first realm to research the Rights of Man opens it.' },
    ai: { from: 1760, chance: 0.08, pioneers: ['thirteen_colonies', 'france', 'england', 'netherlands'] },
    text: 'Citizens, not subjects. Crowns fall, republics rise, and whole nations take up arms.',
    effects: ['Revolutions cost 1 stability less to start', '+0.3 Internal cards a year', 'Provinces of another culture are 3 less happy'], rates: { internal: 0.3 } },
];

export const ERA: Record<string, EraDef> = Object.fromEntries(ERAS.map(e => [e.id, e]));
/** Which age a year would be in historically: used only to migrate old saves. */
export const eraOfYear = (year: number): EraDef => ERAS[year >= 1776 ? 5 : year >= 1700 ? 4 : year >= 1600 ? 3 : year >= 1517 ? 2 : year >= 1492 ? 1 : 0];
/** Research that opens an age, by tech id. */
export const AGE_TECH: Record<string, string> = Object.fromEntries(ERAS.filter(e => e.opens?.tech).map(e => [e.opens!.tech!, e.id]));
/** Bonus for the realm that opens an age. */
export const PIONEER_YEARS = 25;
