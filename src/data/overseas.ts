// Lands beyond the map, found by explorers, settled by colonists, won by conquerors.

export interface RegionDef {
  id: string; name: string; where: string; dist: 1 | 2 | 3; natives: number; people: string;
  good: string; value: number; loot: number; needs?: string; text: string;
}

export const REGIONS: Record<string, RegionDef> = {
  madeira:   { id: 'madeira', name: 'Madeira', where: 'Atlantic isles', dist: 1, natives: 0, people: 'no one', good: 'sugar', value: 2, loot: 0, text: 'Empty, wooded islands. Perfect for sugar cane.' },
  azores:    { id: 'azores', name: 'The Azores', where: 'Atlantic isles', dist: 1, natives: 0, people: 'no one', good: 'grain', value: 1.5, loot: 0, text: 'Green islands far out in the ocean.' },
  canaries:  { id: 'canaries', name: 'Canary Islands', where: 'Atlantic isles', dist: 1, natives: 1, people: 'Guanches', good: 'sugar', value: 2, loot: 20, text: 'Volcanic islands defended by the Guanches.' },
  cape_verde:{ id: 'cape_verde', name: 'Cape Verde', where: 'West Africa', dist: 2, natives: 0, people: 'no one', good: 'salt', value: 1.5, loot: 0, text: 'Dry islands on the route south.' },
  guinea:    { id: 'guinea', name: 'Gold Coast', where: 'West Africa', dist: 2, natives: 2, people: 'Akan kingdoms', good: 'gold', value: 3, loot: 60, text: 'Rivers that carry gold dust to the sea.' },
  caribbean: { id: 'caribbean', name: 'The Antilles', where: 'New World', dist: 2, natives: 1, people: 'Taíno', good: 'sugar', value: 3, loot: 40, text: 'Islands beyond the Ocean Sea. The door to a New World.' },
  florida:   { id: 'florida', name: 'Florida', where: 'New World', dist: 2, natives: 2, people: 'Timucua', good: 'furs', value: 1.5, loot: 20, needs: 'caribbean', text: 'A long green coast north of the islands.' },
  new_spain: { id: 'new_spain', name: 'Mexico', where: 'New World', dist: 3, natives: 4, people: 'Mexica Empire', good: 'silver', value: 5, loot: 220, needs: 'caribbean', text: 'A great empire of lake cities, rich beyond belief.' },
  peru:      { id: 'peru', name: 'Peru', where: 'New World', dist: 3, natives: 4, people: 'Inca Empire', good: 'gold', value: 5, loot: 260, needs: 'new_spain', text: 'An empire of mountain roads and temples of gold.' },
  brazil:    { id: 'brazil', name: 'Brazil', where: 'New World', dist: 2, natives: 1, people: 'Tupi', good: 'sugar', value: 3, loot: 20, text: 'Red-dye wood and endless coast.' },
  plata:     { id: 'plata', name: 'Río de la Plata', where: 'New World', dist: 3, natives: 1, people: 'Guaraní', good: 'horses', value: 2, loot: 10, needs: 'brazil', text: 'A river so wide it looks like the sea.' },
  cape:      { id: 'cape', name: 'Cape of Good Hope', where: 'Southern Africa', dist: 3, natives: 1, people: 'Khoikhoi', good: 'fish', value: 1, loot: 5, needs: 'guinea', text: 'The southern tip of Africa. Beyond lies the Indian Ocean.' },
  india:     { id: 'india', name: 'Malabar Coast', where: 'India', dist: 3, natives: 3, people: 'the Zamorin of Calicut', good: 'spices', value: 5, loot: 120, needs: 'cape', text: 'Pepper, cinnamon and rich trading cities.' },
  spice:     { id: 'spice', name: 'Spice Islands', where: 'East Indies', dist: 3, natives: 2, people: 'Sultanates of Maluku', good: 'spices', value: 6, loot: 80, needs: 'india', text: 'Cloves and nutmeg worth their weight in gold.' },
};
