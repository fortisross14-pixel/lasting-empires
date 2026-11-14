// Legendary characters of the wider world, one for each continent outside the Iberian story.
// They join LEGENDS (src/data/characters.ts): those with a living span appear in court drafts for their realms;
// Cristóvão da Gama and George Washington also arrive through history events (giveLegend in events.ts).
import { LEGENDS, type LegendDef } from './characters';

export const WORLD_LEGENDS: LegendDef[] = [
  { id: 'qi_jiguang', name: 'Qi Jiguang', role: 'general', skill: 6, traits: ['cunning', 'inspiring'], from: 1555, to: 1588, nations: ['ming'], quote: 'Scourge of the wokou pirates' },
  { id: 'cristovao', name: 'Cristóvão da Gama', role: 'general', skill: 5, traits: ['bold', 'gunner'], from: 1541, to: 1543, nations: ['ethiopia', 'portugal'], quote: 'He died for the Negus' },
  { id: 'washington', name: 'George Washington', role: 'general', skill: 6, traits: ['cautious', 'inspiring'], from: 1754, to: 1799, nations: ['thirteen_colonies'], quote: 'First in war, first in peace' },
  { id: 'eugene', name: 'Prince Eugene of Savoy', role: 'general', skill: 6, traits: ['cunning', 'siegemaster'], from: 1683, to: 1736, nations: ['austria'], quote: 'Victor of Zenta and Blenheim' },
];

for (const l of WORLD_LEGENDS) if (!LEGENDS.some(x => x.id === l.id)) LEGENDS.push(l);
