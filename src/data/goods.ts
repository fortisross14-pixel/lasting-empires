// Goods. Provinces make raw materials; workshops turn them into manufactured goods.
// Everything is counted in loads a year. Prices are in ducats a load before inflation.

export type GoodKind = 'raw' | 'made';

export interface GoodDef {
  id: string; name: string; kind: GoodKind; price: number; icon: string; color: string; desc: string;
  food?: boolean;
  recipe?: Record<string, number>; // made goods: raw loads used for one load
  tech?: string;                   // research needed before workshops can make it
}

export const GOODS: Record<string, GoodDef> = {
  // food: any mix feeds the people
  grain:     { id: 'grain', name: 'Grain', kind: 'raw', price: 1, food: true, icon: 'wheat', color: '#e2c35a', desc: 'Food. Bread for the towns.' },
  fish:      { id: 'fish', name: 'Fish', kind: 'raw', price: 1, food: true, icon: 'fish', color: '#5aa0c8', desc: 'Food. Salted for the winter.' },
  meat:      { id: 'meat', name: 'Meat', kind: 'raw', price: 1.5, food: true, icon: 'meat', color: '#b0603a', desc: 'Food. Cattle and sheep.' },
  produce:   { id: 'produce', name: 'Fruit & Vegetables', kind: 'raw', price: 1.5, food: true, icon: 'apple', color: '#7aa040', desc: 'Food. Orchards, vines and olives.' },
  // raw materials
  wood:      { id: 'wood', name: 'Wood', kind: 'raw', price: 1, icon: 'tree', color: '#4f7f3f', desc: 'For building materials, books and ships.' },
  iron:      { id: 'iron', name: 'Iron', kind: 'raw', price: 2, icon: 'anvil', color: '#7a7f88', desc: 'For weapons, tools and building materials.' },
  coal:      { id: 'coal', name: 'Coal', kind: 'raw', price: 1.5, icon: 'coal', color: '#3a3a3a', desc: 'For weapons and gunpowder.' },
  leather:   { id: 'leather', name: 'Leather', kind: 'raw', price: 2, icon: 'hide', color: '#8a5a3a', desc: 'Hides and furs. For tools; cavalry need it.' },
  fibres:    { id: 'fibres', name: 'Wool & Cotton', kind: 'raw', price: 1.5, icon: 'spool', color: '#e8e0d0', desc: 'Wool, cotton and silk. For cloth and rope.' },
  dyes:      { id: 'dyes', name: 'Dyes', kind: 'raw', price: 3, icon: 'drop', color: '#9a3fa0', desc: 'Woad, indigo, cochineal. For cloth, art and luxuries.' },
  saltpetre: { id: 'saltpetre', name: 'Saltpetre', kind: 'raw', price: 3, icon: 'flask', color: '#d8d8e8', desc: 'Salt and nitre. For gunpowder.' },
  gold:      { id: 'gold', name: 'Gold & Silver', kind: 'raw', price: 6, icon: 'coin', color: '#e8b020', desc: 'Precious metals and ivory. Sells high; for luxuries.' },
  spices:    { id: 'spices', name: 'Spices & Sugar', kind: 'raw', price: 6, icon: 'pepper', color: '#c0502a', desc: 'Pepper, cinnamon, cane sugar. Sells high everywhere.' },
  // manufactured
  materials: { id: 'materials', name: 'Building Materials', kind: 'made', price: 3, icon: 'brick', color: '#b07850', recipe: { wood: 1, iron: 0.5 }, desc: 'Every building, settlement and development needs them, and towns use some to keep up.' },
  tools:     { id: 'tools', name: 'Tools', kind: 'made', price: 3, icon: 'pick', color: '#8a8070', recipe: { iron: 0.5, leather: 0.5 }, desc: 'Farms, pastures, mines, fisheries and woodcutters wear them out. Without them they make half as much.' },
  weapons:   { id: 'weapons', name: 'Weapons', kind: 'made', price: 4, icon: 'sword', color: '#5a6070', recipe: { iron: 1, coal: 0.5 }, desc: 'Every company needs them, and each new one takes a load.' },
  gunpowder: { id: 'gunpowder', name: 'Gunpowder', kind: 'made', price: 5, icon: 'barrel', color: '#40403a', recipe: { saltpetre: 1, coal: 0.5 }, tech: 'firearms', desc: 'Guns and cannon need it, and each new gun company takes a load.' },
  cloth:     { id: 'cloth', name: 'Cloth', kind: 'made', price: 4.5, icon: 'cloth', color: '#c08a9a', recipe: { fibres: 1, dyes: 0.5 }, desc: 'The people need it. Without it, they are unhappy.' },
  arts:      { id: 'arts', name: 'Books & Art', kind: 'made', price: 3.5, icon: 'book', color: '#6a5aa0', recipe: { wood: 0.5, dyes: 0.5 }, desc: 'Paper, paint and gilt. Temples, libraries and universities need them to work fully.' },
  stores:    { id: 'stores', name: 'Naval Stores', kind: 'made', price: 2.5, icon: 'anchor', color: '#5a7a8a', recipe: { wood: 1, fibres: 0.5 }, desc: 'Timber, rope and sailcloth. Every ship needs them, and each new ship takes two loads.' },
  luxuries:  { id: 'luxuries', name: 'Luxuries', kind: 'made', price: 7, icon: 'ring', color: '#d0a040', recipe: { gold: 0.5, dyes: 0.5 }, desc: 'Jewels and fine things for the court. They keep its prestige.' },
};

export const RAW = Object.values(GOODS).filter(g => g.kind === 'raw').map(g => g.id);
export const MADE = Object.values(GOODS).filter(g => g.kind === 'made').map(g => g.id);
export const FOOD = Object.values(GOODS).filter(g => g.food).map(g => g.id);

/** Old saves used other goods. */
export const OLD_GOODS: Record<string, string> = {
  cattle: 'meat', timber: 'wood', horses: 'leather', furs: 'leather', wool: 'fibres', cotton: 'fibres', silk: 'fibres',
  wine: 'produce', oil: 'produce', sugar: 'spices', salt: 'saltpetre', silver: 'gold', ivory: 'gold', porcelain: 'dyes',
};
