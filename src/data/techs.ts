// Research and buildings.

export type TechTrack = 'military' | 'economy' | 'state';

export interface TechDef {
  id: string; name: string; track: TechTrack; year: number; cost: number;
  req?: string[]; desc: string;
}

export const TECHS: TechDef[] = [
  { id: 'pike_square', name: 'Pike Square', track: 'military', year: 1453, cost: 8, desc: 'Draft Pikemen. Long Pikes appear in drafts. Levy + Long Pikes → Pikemen.' },
  { id: 'firearms', name: 'Firearms', track: 'military', year: 1465, cost: 10, desc: 'Draft Arquebusiers. Levy or Crossbow + Arquebus → Arquebusiers.' },
  { id: 'bronze_cannon', name: 'Bronze Cannon', track: 'military', year: 1475, cost: 12, desc: 'Bombard + Bronze Casting → Field Cannon. +1 siege for artillery.' },
  { id: 'tercio_doctrine', name: 'Tercio Doctrine', track: 'military', year: 1495, cost: 16, req: ['pike_square', 'firearms'], desc: 'Pikemen + Arquebusiers → Tercio.' },
  { id: 'star_forts', name: 'Star Forts', track: 'military', year: 1500, cost: 14, req: ['bronze_cannon'], desc: 'Fortresses can reach level 3. +1 fort in your capital.' },
  { id: 'wheellock', name: 'Wheellock', track: 'military', year: 1520, cost: 16, req: ['firearms'], desc: 'Pistols: Jinetes → Reiters, Knights → Cuirassiers.' },
  { id: 'musket', name: 'Musket', track: 'military', year: 1530, cost: 18, req: ['firearms'], desc: 'Arquebusiers → Musketeers, Tercio → Tercio Viejo.' },
  { id: 'naval_gunnery', name: 'Naval Gunnery', track: 'military', year: 1540, cost: 16, req: ['bronze_cannon'], desc: 'Build Galleons. Carrack + Bronze Casting → Galleon.' },
  { id: 'ship_of_line', name: 'Ship of the Line', track: 'military', year: 1650, cost: 24, req: ['naval_gunnery'], desc: 'Build Ships of the Line. +1 navy size.' },
  { id: 'standing_army', name: 'Standing Army', track: 'military', year: 1560, cost: 18, req: ['tercio_doctrine'], desc: '+3 army size, troop upkeep −20%, +0.2 Military cards a year.' },
  { id: 'military_drill', name: 'Military Drill', track: 'military', year: 1590, cost: 22, req: ['standing_army'], desc: 'Reiters + Muskets → Dragoons. +10% battle strength.' },
  { id: 'bayonet', name: 'Bayonet', track: 'military', year: 1660, cost: 26, req: ['musket', 'military_drill'], desc: 'Musketeers + Bayonets → Line Infantry.' },

  { id: 'guilds', name: 'Guilds', track: 'economy', year: 1453, cost: 6, desc: 'Build Workshops (forge equipment). +0.2 Economy cards a year.' },
  { id: 'printing', name: 'Printing Press', track: 'economy', year: 1460, cost: 9, desc: 'Build Universities. +0.2 Research cards a year.' },
  { id: 'banking', name: 'Banking', track: 'economy', year: 1470, cost: 12, desc: '+10% income. Build Banks.' },
  { id: 'navigation', name: 'Ocean Navigation', track: 'economy', year: 1480, cost: 12, desc: 'Build Harbours (+2 ducats in coastal provinces). Voyages to the farthest seas. The first realm to learn it opens the Age of Discovery.' },
  { id: 'manufactories', name: 'Manufactories', track: 'economy', year: 1530, cost: 18, req: ['guilds', 'banking'], desc: 'Build Manufactories: +5 ducats each.' },
  { id: 'mercantilism', name: 'Mercantilism', track: 'economy', year: 1600, cost: 22, req: ['manufactories'], desc: 'Trade treaties are worth 50% more.' },

  { id: 'chancery', name: 'Royal Chancery', track: 'state', year: 1453, cost: 6, desc: '+10% diplomatic success, missions 1 year shorter. Build Chancery Offices. +0.2 Diplomacy cards.' },
  { id: 'embassies', name: 'Resident Embassies', track: 'state', year: 1480, cost: 10, req: ['chancery'], desc: '+1 court seat. Alliances need 15 less relation.' },
  { id: 'bureaucracy', name: 'Bureaucracy', track: 'state', year: 1500, cost: 14, desc: '+1 stability, tax missions +50%, +0.2 Internal cards a year. +1 core card slot.' },
  { id: 'councils', name: 'Royal Councils', track: 'state', year: 1530, cost: 16, req: ['bureaucracy'], desc: '+1 court seat, +1 research per study, +1 nation point a year.' },
  { id: 'absolutism', name: 'Absolutism', track: 'state', year: 1620, cost: 24, req: ['councils'], desc: '+1 stability, +2 prestige a year. +1 core card slot.' },
  { id: 'enlightened', name: 'Enlightened Government', track: 'state', year: 1700, cost: 30, req: ['absolutism'], desc: '+1 core card slot. +0.2 Internal and Research cards a year.' },
];

export const TECH: Record<string, TechDef> = Object.fromEntries(TECHS.map(t => [t.id, t]));

export type BuildingGroup = 'internal' | 'economy';

export interface BuildingDef {
  id: string; name: string; group: BuildingGroup; site: 'town' | 'rural'; cost: number; turns: number; tech?: string; desc: string;
  salary: number;               // ducats a year
  gold?: number; coastal?: boolean; icon: string;
  rates?: Partial<Record<'military' | 'diplomacy' | 'internal' | 'economy' | 'research', number>>;
  control?: number;             // control gained per year in this province
  np?: number;                  // nation points a year
  match?: string[];             // raw materials that double its output
}

export const BUILDINGS: Record<string, BuildingDef> = {
  temple: { id: 'temple', name: 'Temple', group: 'internal', site: 'town', cost: 40, turns: 3, salary: 0.5, icon: 'church', control: 3, rates: { internal: 0.2 }, desc: '+0.2 Internal cards, +3 control a year, +1 stability when finished.' },
  library: { id: 'library', name: 'Library', group: 'internal', site: 'town', cost: 35, turns: 2, salary: 0.5, icon: 'book', rates: { research: 0.2 }, desc: '+0.2 Research cards a year.' },
  university: { id: 'university', name: 'University', group: 'internal', site: 'town', cost: 60, turns: 4, tech: 'printing', salary: 1, icon: 'book', rates: { research: 0.3 }, desc: '+0.3 Research cards, +1 research on every study.' },
  barracks: { id: 'barracks', name: 'Barracks', group: 'internal', site: 'town', cost: 40, turns: 3, salary: 1, icon: 'banner', rates: { military: 0.2 }, desc: '+0.2 Military cards, +0.5 manpower a year, +1 army size.' },
  fortress: { id: 'fortress', name: 'Fortress', group: 'internal', site: 'town', cost: 50, turns: 3, salary: 1, icon: 'tower', desc: '+1 fort level (maximum 2, or 3 with Star Forts).' },
  courthouse: { id: 'courthouse', name: 'Courthouse', group: 'internal', site: 'town', cost: 45, turns: 3, salary: 0.8, icon: 'scales', control: 5, np: 0.5, rates: { internal: 0.1 }, desc: '+5 control a year, +0.5 nation points, +0.1 Internal cards.' },
  chancery: { id: 'chancery', name: 'Chancery Office', group: 'internal', site: 'town', cost: 45, turns: 3, tech: 'chancery', salary: 0.8, icon: 'scroll', rates: { diplomacy: 0.25 }, desc: '+0.25 Diplomacy cards a year.' },
  farm: { id: 'farm', name: 'Farms', group: 'economy', site: 'rural', cost: 25, turns: 2, salary: 0.2, gold: 0.8, icon: 'wheat', control: 1, match: ['grain', 'cattle', 'sugar', 'cotton'], desc: '+0.8 ducats, +0.5 manpower, +1 control a year. Double on grain, cattle, sugar or cotton.' },
  pasture: { id: 'pasture', name: 'Pastures', group: 'economy', site: 'rural', cost: 25, turns: 2, salary: 0.2, gold: 1, icon: 'horse', match: ['wool', 'horses', 'cattle'], desc: '+1 ducat. Double on wool, horses or cattle.' },
  mine: { id: 'mine', name: 'Mine', group: 'economy', site: 'rural', cost: 40, turns: 3, salary: 0.6, gold: 1.5, icon: 'anvil', match: ['iron', 'gold', 'silver', 'salt'], desc: '+1.5 ducats. Double on iron, gold, silver or salt, and +2 more on gold or silver.' },
  fishery: { id: 'fishery', name: 'Fishery', group: 'economy', site: 'rural', cost: 20, turns: 2, salary: 0.2, gold: 0.7, coastal: true, icon: 'anchor', match: ['fish'], desc: '+0.7 ducats, +0.3 manpower. Coastal only. Double on fish.' },
  woodcutter: { id: 'woodcutter', name: 'Woodcutters', group: 'economy', site: 'rural', cost: 20, turns: 2, salary: 0.2, gold: 0.7, icon: 'hammer', match: ['timber', 'furs'], desc: '+0.7 ducats. Double on timber or furs.' },
  plantation: { id: 'plantation', name: 'Plantation', group: 'economy', site: 'rural', cost: 45, turns: 3, tech: 'navigation', salary: 0.5, gold: 1.2, icon: 'cup', match: ['spices', 'sugar', 'cotton', 'wine', 'oil', 'silk', 'porcelain', 'ivory'], desc: '+1.2 ducats. Double on spices, sugar, cotton, wine, oil, silk, porcelain or ivory.' },
  market: { id: 'market', name: 'Market', group: 'economy', site: 'town', cost: 30, turns: 2, salary: 0.3, gold: 1.5, icon: 'coin', rates: { economy: 0.2 }, desc: '+1.5 ducats, +0.2 Economy cards a year.' },
  workshop: { id: 'workshop', name: 'Workshop', group: 'economy', site: 'town', cost: 40, turns: 3, tech: 'guilds', salary: 0.5, gold: 1, icon: 'anvil', desc: '+1 ducat. Forges an equipment card every 4 years.' },
  harbour: { id: 'harbour', name: 'Harbour', group: 'economy', site: 'town', cost: 35, turns: 2, tech: 'navigation', salary: 0.5, gold: 2, coastal: true, icon: 'anchor', rates: { economy: 0.1, diplomacy: 0.1 }, desc: '+2 ducats, +0.1 Economy and Diplomacy cards. Faster naval missions.' },
  bank: { id: 'bank', name: 'Bank', group: 'economy', site: 'town', cost: 60, turns: 3, tech: 'banking', salary: 1, gold: 2.5, icon: 'coin', rates: { economy: 0.2 }, desc: '+2.5 ducats, +0.2 Economy cards.' },
  manufactory: { id: 'manufactory', name: 'Manufactory', group: 'economy', site: 'town', cost: 80, turns: 4, tech: 'manufactories', salary: 1.5, gold: 4, icon: 'anvil', rates: { economy: 0.2 }, desc: '+4 ducats, +0.2 Economy cards.' },
};

/** Card-rate bonuses from research. */
export const TECH_RATES: Record<string, Partial<Record<'military' | 'diplomacy' | 'internal' | 'economy' | 'research', number>>> = {
  guilds: { economy: 0.2 }, printing: { research: 0.2 }, chancery: { diplomacy: 0.2 }, bureaucracy: { internal: 0.2 },
  standing_army: { military: 0.2 }, enlightened: { internal: 0.2, research: 0.2 }, banking: { economy: 0.1 }, embassies: { diplomacy: 0.1 }, councils: { internal: 0.1 },
};
