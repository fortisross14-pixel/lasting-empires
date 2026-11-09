// Trade goods. You have a good if you own a province that makes it, or import it through a trade route.

export interface GoodDef { id: string; name: string; price: number; desc: string; icon: string; }

export const GOODS: Record<string, GoodDef> = {
  grain:  { id: 'grain', name: 'Grain', price: 2, icon: 'wheat', desc: '+0.5 manpower a year' },
  fish:   { id: 'fish', name: 'Fish', price: 1.5, icon: 'anchor', desc: '+0.3 manpower a year' },
  iron:   { id: 'iron', name: 'Iron', price: 3, icon: 'anvil', desc: 'Hiring troops costs 20% fewer ducats' },
  timber: { id: 'timber', name: 'Timber', price: 2, icon: 'hammer', desc: 'Buildings cost 15% less' },
  horses: { id: 'horses', name: 'Horses', price: 3, icon: 'horse', desc: 'Hiring cavalry costs 30% fewer ducats' },
  wool:   { id: 'wool', name: 'Wool', price: 2, icon: 'scroll', desc: '+1 ducat a year for each Market' },
  wine:   { id: 'wine', name: 'Wine', price: 2, icon: 'cup', desc: '+0.5 nation points a year' },
  oil:    { id: 'oil', name: 'Olive Oil', price: 2, icon: 'cup', desc: '+2 ducats a year' },
  salt:   { id: 'salt', name: 'Salt', price: 1.5, icon: 'star', desc: '+0.1 Economy cards a year' },
  silver: { id: 'silver', name: 'Silver', price: 4, icon: 'coin', desc: '+3 ducats a year' },
  sugar:  { id: 'sugar', name: 'Sugar', price: 3, icon: 'cup', desc: '+2 ducats a year' },
  gold:   { id: 'gold', name: 'Gold', price: 5, icon: 'coin', desc: '+4 ducats a year' },
  spices: { id: 'spices', name: 'Spices', price: 5, icon: 'star', desc: '+2 ducats and +1 prestige a year' },
  furs:   { id: 'furs', name: 'Furs', price: 3, icon: 'horse', desc: '+2 ducats a year' },
  silk:   { id: 'silk', name: 'Silk', price: 4, icon: 'ring', desc: '+1 prestige a year' },
};

export const PROVINCE_GOODS: Record<string, string> = {
  galicia: 'fish', asturias: 'timber', leon: 'grain', burgos: 'wool', biscay: 'iron', toledo: 'iron', extremadura: 'wool',
  mancha: 'wine', seville: 'oil', cordoba: 'horses', murcia: 'salt', granada: 'silk', malaga: 'wine', porto: 'wine',
  lisbon: 'salt', alentejo: 'grain', algarve: 'fish', navarre: 'timber', zaragoza: 'grain', catalonia: 'wool', valencia: 'silk',
  poitou: 'salt', gascony: 'wine', toulouse: 'grain', lyon: 'silk', provence: 'oil', savoy: 'timber', milan: 'iron',
  genoa: 'fish', verona: 'wool', venice: 'salt', dalmatia: 'timber', croatia: 'horses', florence: 'wool', romagna: 'grain',
  marche: 'grain', rome: 'wine', abruzzo: 'wool', naples: 'wine', apulia: 'oil', calabria: 'silk', sicily: 'grain',
  sardinia: 'silver', corsica: 'timber', majorca: 'oil', tangier: 'fish', fez: 'horses', rif: 'iron', tlemcen: 'horses',
  oran: 'grain', algiers: 'fish', bejaia: 'timber', constantine: 'grain', tunis: 'oil', kairouan: 'wool',
};
