// Research and buildings.

export type TechTrack = 'military' | 'economy' | 'state';
type Rates = Partial<Record<'military' | 'diplomacy' | 'internal' | 'economy' | 'research' | 'culture', number>>;

/** Plain effects of a technology, added up over everything you know (see techFx in core). */
export interface TechFx {
  income?: number;     // share more from provinces (0.1 = +10%)
  army?: number;       // army size
  navy?: number;       // navy size
  upkeep?: number;     // share less troop upkeep
  battle?: number;     // share more battle strength
  manpower?: number;   // a year
  seats?: number;      // court seats
  core?: number;       // core card slots
  research?: number;   // research a year for every scholar
  prestige?: number;   // a year
  np?: number;         // nation points a year
  stability?: number;  // once, when learned
  control?: number;    // a year in every province
  happy?: number;      // in every province
  build?: number;      // share off building costs
  routes?: number;     // trade routes
  posts?: number;      // trade posts
  rates?: Rates;       // cards a year
}

export interface TechDef {
  id: string; name: string; track: TechTrack;
  age: number;         // 0 Crusade · 1 Discovery · 2 Reformation · 3 Absolutism · 4 Enlightenment
  year: number;        // when it came historically: studying it sooner costs more
  cost: number;        // research points
  req?: string[]; desc: string; fx?: TechFx;
}

// About four per field in each age. Costs rise by age so that a study takes 2–7 years.
export const TECHS: TechDef[] = [
  // ---------- Age of Crusade ----------
  { id: 'pike_square', name: 'Pike Square', track: 'military', age: 0, year: 1453, cost: 20, desc: 'Draft Pikemen. Long Pikes appear in drafts. Levy + Long Pikes → Pikemen.' },
  { id: 'condotta', name: 'Condotta Contracts', track: 'military', age: 0, year: 1455, cost: 20, desc: 'Captains for hire: +2 army size, +0.5 manpower a year.', fx: { army: 2, manpower: 0.5 } },
  { id: 'firearms', name: 'Firearms', track: 'military', age: 0, year: 1465, cost: 26, desc: 'Draft Arquebusiers. Levy or Crossbow + Arquebus → Arquebusiers. Make gunpowder.' },
  { id: 'bronze_cannon', name: 'Bronze Cannon', track: 'military', age: 0, year: 1475, cost: 29, desc: 'Bombard + Bronze Casting → Field Cannon. +1 siege for artillery.' },

  { id: 'guilds', name: 'Guilds', track: 'economy', age: 0, year: 1453, cost: 20, desc: 'Workshops make 25% more. +0.2 Economy cards a year.', fx: { rates: { economy: 0.2 } } },
  { id: 'printing', name: 'Printing Press', track: 'economy', age: 0, year: 1460, cost: 24, desc: 'Build Universities. +0.2 Research cards a year.', fx: { rates: { research: 0.2 } } },
  { id: 'banking', name: 'Banking', track: 'economy', age: 0, year: 1470, cost: 27, desc: '+10% income. Build Banks. +1 trade route and post.', fx: { income: 0.1, routes: 1, posts: 1, rates: { economy: 0.1 } } },
  { id: 'navigation', name: 'Ocean Navigation', track: 'economy', age: 0, year: 1480, cost: 31, desc: 'Build Harbours. Voyages to the farthest seas. +1 trade post. The first realm to learn it opens the Age of Discovery.', fx: { posts: 1 } },

  { id: 'chancery', name: 'Royal Chancery', track: 'state', age: 0, year: 1453, cost: 20, desc: '+10% diplomatic success, missions 1 year shorter. Build Chancery Offices. +0.2 Diplomacy cards.', fx: { rates: { diplomacy: 0.2 } } },
  { id: 'heraldry', name: 'Heraldry and Orders', track: 'state', age: 0, year: 1455, cost: 20, desc: 'Orders of knighthood bind the nobles: +1 prestige a year, +0.1 Diplomacy cards.', fx: { prestige: 1, rates: { diplomacy: 0.1 } } },
  { id: 'royal_taxes', name: 'Royal Taxation', track: 'state', age: 0, year: 1465, cost: 26, desc: 'Taxes collected by the crown, not the lords: +5% income, +1 control a year.', fx: { income: 0.05, control: 1 } },
  { id: 'embassies', name: 'Resident Embassies', track: 'state', age: 0, year: 1480, cost: 27, req: ['chancery'], desc: '+1 court seat. Alliances need 15 less relation.', fx: { seats: 1, rates: { diplomacy: 0.1 } } },

  // ---------- Age of Discovery ----------
  { id: 'tercio_doctrine', name: 'Tercio Doctrine', track: 'military', age: 1, year: 1495, cost: 38, req: ['pike_square', 'firearms'], desc: 'Pikemen + Arquebusiers → Tercio.' },
  { id: 'star_forts', name: 'Star Forts', track: 'military', age: 1, year: 1500, cost: 34, req: ['bronze_cannon'], desc: 'Fortresses can reach level 3. +1 fort in your capital.' },
  { id: 'wheellock', name: 'Wheellock', track: 'military', age: 1, year: 1515, cost: 38, req: ['firearms'], desc: 'Pistols: Jinetes → Reiters, Knights → Cuirassiers.' },
  { id: 'naval_gunnery', name: 'Naval Gunnery', track: 'military', age: 1, year: 1510, cost: 38, req: ['bronze_cannon'], desc: 'Build Galleons. Carrack + Bronze Casting → Galleon. +1 navy size.', fx: { navy: 1 } },

  { id: 'cartography', name: 'Cartography', track: 'economy', age: 1, year: 1495, cost: 34, req: ['navigation'], desc: 'Charts of every coast: +1 trade route, +1 trade post.', fx: { routes: 1, posts: 1 } },
  { id: 'double_entry', name: 'Double-Entry Books', track: 'economy', age: 1, year: 1500, cost: 34, desc: 'Every ducat accounted for: +5% income, buildings 10% cheaper.', fx: { income: 0.05, build: 0.1 } },
  { id: 'colonial_charters', name: 'Colonial Charters', track: 'economy', age: 1, year: 1505, cost: 38, req: ['navigation'], desc: 'Build Plantations. +0.1 Economy and Diplomacy cards.', fx: { rates: { economy: 0.1, diplomacy: 0.1 } } },
  { id: 'merchant_marine', name: 'Merchant Marine', track: 'economy', age: 1, year: 1515, cost: 38, desc: 'Ships for hire: +1 trade route, +1 navy size.', fx: { routes: 1, navy: 1 } },

  { id: 'bureaucracy', name: 'Bureaucracy', track: 'state', age: 1, year: 1500, cost: 38, desc: '+1 stability, tax missions +50%, +0.2 Internal cards a year. +1 core card slot.', fx: { stability: 1, rates: { internal: 0.2 } } },
  { id: 'humanism', name: 'Humanism', track: 'state', age: 1, year: 1495, cost: 34, req: ['printing'], desc: 'Scholars read the ancients: +1 research a year for every scholar, +0.15 People cards.', fx: { research: 1, rates: { culture: 0.15 } } },
  { id: 'census', name: 'Royal Census', track: 'state', age: 1, year: 1510, cost: 34, desc: 'Count every hearth: +1 manpower a year, +1 control a year.', fx: { manpower: 1, control: 1 } },
  { id: 'diplomatic_corps', name: 'Diplomatic Corps', track: 'state', age: 1, year: 1515, cost: 38, req: ['embassies'], desc: 'Trained envoys: +1 court seat, +0.2 Diplomacy cards.', fx: { seats: 1, rates: { diplomacy: 0.2 } } },

  // ---------- Age of Reformation ----------
  { id: 'musket', name: 'Musket', track: 'military', age: 2, year: 1530, cost: 46, req: ['firearms'], desc: 'Arquebusiers → Musketeers, Tercio → Tercio Viejo.' },
  { id: 'standing_army', name: 'Standing Army', track: 'military', age: 2, year: 1560, cost: 49, req: ['tercio_doctrine'], desc: '+3 army size, troop upkeep −20%, +0.2 Military cards a year.', fx: { army: 3, upkeep: 0.2, rates: { military: 0.2 } } },
  { id: 'siege_engineering', name: 'Siege Engineering', track: 'military', age: 2, year: 1545, cost: 46, req: ['star_forts'], desc: 'Sappers and trenches: +5% battle strength, +1 army size.', fx: { battle: 0.05, army: 1 } },
  { id: 'military_drill', name: 'Military Drill', track: 'military', age: 2, year: 1590, cost: 53, req: ['standing_army'], desc: 'Reiters + Muskets → Dragoons. +10% battle strength.', fx: { battle: 0.1 } },

  { id: 'manufactories', name: 'Manufactories', track: 'economy', age: 2, year: 1530, cost: 46, req: ['guilds', 'banking'], desc: 'Build Manufactories: +4 ducats and 4 loads a year of a manufactured good.' },
  { id: 'joint_stock', name: 'Joint-Stock Companies', track: 'economy', age: 2, year: 1555, cost: 49, req: ['cartography'], desc: 'Shares in far voyages: +5% income, +1 trade route and post.', fx: { income: 0.05, routes: 1, posts: 1 } },
  { id: 'crop_rotation', name: 'Crop Rotation', track: 'economy', age: 2, year: 1570, cost: 46, desc: 'Fields rest in turn: +1 manpower a year, +2 happiness everywhere.', fx: { manpower: 1, happy: 2 } },

  { id: 'councils', name: 'Royal Councils', track: 'state', age: 2, year: 1530, cost: 46, req: ['bureaucracy'], desc: '+1 court seat, +1 research per study, +1 nation point a year.', fx: { seats: 1, research: 1, np: 1, rates: { internal: 0.1 } } },
  { id: 'religious_peace', name: 'Religious Peace', track: 'state', age: 2, year: 1555, cost: 46, desc: 'Cuius regio, eius religio: +3 happiness everywhere, +1 stability.', fx: { happy: 3, stability: 1 } },
  { id: 'postal_service', name: 'Postal Service', track: 'state', age: 2, year: 1580, cost: 46, desc: 'Royal couriers on fixed roads: +2 control a year, +0.15 Diplomacy and Internal cards.', fx: { control: 2, rates: { diplomacy: 0.15, internal: 0.15 } } },
  { id: 'absolutism', name: 'Absolutism', track: 'state', age: 2, year: 1600, cost: 53, req: ['councils'], desc: '+1 stability, +2 prestige a year. +1 core card slot. The first realm to learn it opens the Age of Absolutism.', fx: { stability: 1, prestige: 2 } },

  // ---------- Age of Absolutism ----------
  { id: 'flintlock', name: 'Flintlock', track: 'military', age: 3, year: 1630, cost: 53, req: ['musket'], desc: 'Guns that fire in the rain: +5% battle strength, troop upkeep −5%.', fx: { battle: 0.05, upkeep: 0.05 } },
  { id: 'military_academies', name: 'Military Academies', track: 'military', age: 3, year: 1640, cost: 57, req: ['military_drill'], desc: 'Officers trained, not born: +2 army size, +0.2 Military cards.', fx: { army: 2, rates: { military: 0.2 } } },
  { id: 'ship_of_line', name: 'Ship of the Line', track: 'military', age: 3, year: 1650, cost: 57, req: ['naval_gunnery'], desc: 'Build Ships of the Line. +1 navy size.', fx: { navy: 1 } },
  { id: 'bayonet', name: 'Bayonet', track: 'military', age: 3, year: 1660, cost: 61, req: ['musket', 'military_drill'], desc: 'Musketeers + Bayonets → Line Infantry.' },

  { id: 'mercantilism', name: 'Mercantilism', track: 'economy', age: 3, year: 1620, cost: 53, req: ['manufactories'], desc: 'Trade treaties are worth 50% more. +2 trade routes, +1 trade post.', fx: { routes: 2, posts: 1 } },
  { id: 'central_bank', name: 'Central Bank', track: 'economy', age: 3, year: 1660, cost: 61, req: ['banking'], desc: 'A bank of the realm: +10% income.', fx: { income: 0.1, rates: { economy: 0.1 } } },
  { id: 'canals', name: 'Canals and Roads', track: 'economy', age: 3, year: 1665, cost: 57, desc: 'Goods move cheaply: +5% income, buildings 10% cheaper.', fx: { income: 0.05, build: 0.1 } },
  { id: 'marine_insurance', name: 'Marine Insurance', track: 'economy', age: 3, year: 1680, cost: 53, req: ['joint_stock'], desc: 'Losses shared: +1 trade route, +1 trade post.', fx: { routes: 1, posts: 1 } },

  { id: 'intendants', name: 'Intendants', track: 'state', age: 3, year: 1635, cost: 53, req: ['absolutism'], desc: 'Royal officers in every province: +2 control a year, +1 nation point a year.', fx: { control: 2, np: 1 } },
  { id: 'court_society', name: 'Court Society', track: 'state', age: 3, year: 1670, cost: 53, desc: 'The nobles dance at court instead of plotting: +2 prestige a year, +1 stability.', fx: { prestige: 2, stability: 1, rates: { culture: 0.1 } } },
  { id: 'scientific_method', name: 'Scientific Method', track: 'state', age: 3, year: 1660, cost: 57, req: ['councils'], desc: 'Learned societies: +1.5 research a year for every scholar, +0.2 Research cards.', fx: { research: 1.5, rates: { research: 0.2 } } },
  { id: 'enlightened', name: 'Enlightened Government', track: 'state', age: 3, year: 1690, cost: 65, req: ['absolutism'], desc: '+1 core card slot. +0.2 Internal and Research cards a year. Build Museums. The first realm to learn it opens the Age of Enlightenment.', fx: { rates: { internal: 0.2, research: 0.2 } } },

  // ---------- Age of Enlightenment ----------
  { id: 'light_infantry', name: 'Light Infantry', track: 'military', age: 4, year: 1705, cost: 64, req: ['flintlock'], desc: 'Skirmishers ahead of the line: +5% battle strength.', fx: { battle: 0.05 } },
  { id: 'standard_artillery', name: 'Standard Artillery', track: 'military', age: 4, year: 1720, cost: 68, req: ['bayonet'], desc: 'Guns of fixed calibres: +5% battle strength, troop upkeep −5%.', fx: { battle: 0.05, upkeep: 0.05 } },
  { id: 'general_staff', name: 'General Staff', track: 'military', age: 4, year: 1730, cost: 72, req: ['military_academies'], desc: 'Planned campaigns: +3 army size, +0.2 Military cards.', fx: { army: 3, rates: { military: 0.2 } } },
  { id: 'naval_reform', name: 'Naval Reform', track: 'military', age: 4, year: 1715, cost: 64, req: ['ship_of_line'], desc: 'Dockyards and press gangs: +2 navy size.', fx: { navy: 2 } },

  { id: 'physiocracy', name: 'Physiocracy', track: 'economy', age: 4, year: 1720, cost: 64, desc: 'Wealth from the land: +5% income, +1 manpower a year.', fx: { income: 0.05, manpower: 1 } },
  { id: 'steam_pump', name: 'Steam Pump', track: 'economy', age: 4, year: 1712, cost: 72, req: ['manufactories'], desc: 'Engines drain the deep mines: +10% income.', fx: { income: 0.1 } },
  { id: 'agricultural_revolution', name: 'New Husbandry', track: 'economy', age: 4, year: 1730, cost: 68, req: ['crop_rotation'], desc: 'Seed drills and turnips: +1 manpower a year, +3 happiness everywhere.', fx: { manpower: 1, happy: 3 } },

  { id: 'encyclopaedia', name: 'Encyclopaedia', track: 'state', age: 4, year: 1735, cost: 68, req: ['scientific_method'], desc: 'All knowledge in one work: +2 research a year for every scholar, +0.2 People cards.', fx: { research: 2, rates: { culture: 0.2 } } },
  { id: 'cameralism', name: 'Cameralism', track: 'state', age: 4, year: 1720, cost: 64, req: ['intendants'], desc: 'The science of government: +5% income, +1 nation point a year.', fx: { income: 0.05, np: 1 } },
  { id: 'tolerance_edict', name: 'Edict of Tolerance', track: 'state', age: 4, year: 1740, cost: 68, desc: 'Every faith may worship: +4 happiness everywhere.', fx: { happy: 4 } },
  { id: 'public_schools', name: 'Public Schools', track: 'state', age: 4, year: 1745, cost: 72, req: ['enlightened'], desc: 'Schools in every parish: +1 stability, +0.2 Internal and Research cards.', fx: { stability: 1, rates: { internal: 0.2, research: 0.2 } } },
];

export const TECH: Record<string, TechDef> = Object.fromEntries(TECHS.map(t => [t.id, t]));

export type BuildingGroup = 'internal' | 'economy';

export interface BuildingDef {
  id: string; name: string; group: BuildingGroup; site: 'town' | 'rural'; cost: number; turns: number; tech?: string; desc: string;
  salary: number;               // ducats a year
  gold?: number; coastal?: boolean; icon: string;
  rates?: Partial<Record<'military' | 'diplomacy' | 'internal' | 'economy' | 'research' | 'culture', number>>;
  control?: number;             // control gained per year in this province
  np?: number;                  // nation points a year
  match?: string[];             // raw materials that double its output
  gives: string[];              // what it does, one line each, for the build screen
}

export const BUILDINGS: Record<string, BuildingDef> = {
  temple: { id: 'temple', name: 'Temple', group: 'internal', site: 'town', cost: 40, turns: 3, salary: 0.5, icon: 'church', control: 3, rates: { internal: 0.2, culture: 0.15 }, gives: ['+0.2 Internal and +0.15 People cards a year', '+3 control a year here', '+1 stability when finished', '+0.5 prestige a year'], desc: '+0.2 Internal and +0.15 People cards, +3 control a year, +1 stability when finished.' },
  library: { id: 'library', name: 'Library', group: 'internal', site: 'town', cost: 35, turns: 2, salary: 0.5, icon: 'book', rates: { research: 0.2, culture: 0.1 }, gives: ['+0.2 Research and +0.1 People cards a year', 'Shows 1 work of art'], desc: '+0.2 Research and +0.1 People cards a year. Shows 1 work of art.' },
  university: { id: 'university', name: 'University', group: 'internal', site: 'town', cost: 60, turns: 4, tech: 'printing', salary: 1, icon: 'book', rates: { research: 0.3, culture: 0.1 }, gives: ['+0.3 Research and +0.1 People cards a year', '+1 research a year for every scholar (up to 2 universities)', 'Shows 2 works of art'], desc: '+0.3 Research and +0.1 People cards, +1 research on every study. Shows 2 works of art.' },
  museum: { id: 'museum', name: 'Museum', group: 'internal', site: 'town', cost: 70, turns: 3, tech: 'enlightened', salary: 1, icon: 'star', rates: { culture: 0.3 }, gives: ['+0.3 People cards a year', 'Shows 4 works of art', 'Visitors pay for the best works'], desc: 'Shows 4 works of art: visitors pay for the best of them. +0.3 People cards a year.' },
  barracks: { id: 'barracks', name: 'Barracks', group: 'internal', site: 'town', cost: 40, turns: 3, salary: 1, icon: 'banner', rates: { military: 0.2 }, gives: ['+0.2 Military cards a year', '+0.5 manpower a year', '+1 army size'], desc: '+0.2 Military cards, +0.5 manpower a year, +1 army size.' },
  fortress: { id: 'fortress', name: 'Fortress', group: 'internal', site: 'town', cost: 50, turns: 3, salary: 1, icon: 'tower', gives: ['+1 fort level here (up to 2, or 3 with Star Forts)', 'Harder to conquer or raid'], desc: '+1 fort level (maximum 2, or 3 with Star Forts).' },
  courthouse: { id: 'courthouse', name: 'Courthouse', group: 'internal', site: 'town', cost: 45, turns: 3, salary: 0.8, icon: 'scales', control: 5, np: 0.5, rates: { internal: 0.1 }, gives: ['+5 control a year here', '+0.5 nation points a year', '+0.1 Internal cards a year'], desc: '+5 control a year, +0.5 nation points, +0.1 Internal cards.' },
  chancery: { id: 'chancery', name: 'Chancery Office', group: 'internal', site: 'town', cost: 45, turns: 3, tech: 'chancery', salary: 0.8, icon: 'scroll', rates: { diplomacy: 0.25 }, gives: ['+0.25 Diplomacy cards a year'], desc: '+0.25 Diplomacy cards a year.' },
  farm: { id: 'farm', name: 'Farms', group: 'economy', site: 'rural', cost: 25, turns: 2, salary: 0.2, gold: 0.8, icon: 'wheat', control: 1, match: ['grain', 'produce', 'fibres'], gives: ['+0.8 ducats a year', '+0.5 manpower a year', '+1 control a year here', 'Doubles grain, fruit or fibres made here; elsewhere grows a little grain'], desc: '+0.8 ducats, +0.5 manpower, +1 control a year. Doubles grain, fruit or cotton made here; elsewhere it grows a little grain.' },
  pasture: { id: 'pasture', name: 'Pastures', group: 'economy', site: 'rural', cost: 25, turns: 2, salary: 0.2, gold: 1, icon: 'horse', match: ['meat', 'leather', 'fibres'], gives: ['+1 ducat a year', 'Doubles meat, leather or fibres made here; elsewhere raises a little meat'], desc: '+1 ducat. Doubles meat, leather or wool made here; elsewhere it raises a little meat.' },
  mine: { id: 'mine', name: 'Mine', group: 'economy', site: 'rural', cost: 40, turns: 3, salary: 0.6, gold: 1.5, icon: 'anvil', match: ['iron', 'coal', 'gold', 'saltpetre'], gives: ['+1.5 ducats a year', 'Doubles iron, coal, gold or saltpetre made here'], desc: '+1.5 ducats. Doubles iron, coal, gold or saltpetre made here.' },
  fishery: { id: 'fishery', name: 'Fishery', group: 'economy', site: 'rural', cost: 20, turns: 2, salary: 0.2, gold: 0.7, coastal: true, icon: 'anchor', match: ['fish'], gives: ['+0.7 ducats a year', '+0.3 manpower a year', 'Doubles fish made here; elsewhere lands a little fish'], desc: '+0.7 ducats, +0.3 manpower. Coastal only. Doubles fish made here; elsewhere it lands a little fish.' },
  woodcutter: { id: 'woodcutter', name: 'Woodcutters', group: 'economy', site: 'rural', cost: 20, turns: 2, salary: 0.2, gold: 0.7, icon: 'hammer', match: ['wood', 'leather'], gives: ['+0.7 ducats a year', 'Doubles wood or leather made here; elsewhere cuts a little wood'], desc: '+0.7 ducats. Doubles wood or furs made here; elsewhere it cuts a little wood.' },
  plantation: { id: 'plantation', name: 'Plantation', group: 'economy', site: 'rural', cost: 45, turns: 3, tech: 'colonial_charters', salary: 0.5, gold: 1.2, icon: 'cup', match: ['spices', 'produce', 'fibres', 'dyes'], gives: ['+1.2 ducats a year', 'Doubles spices, fruit, fibres or dyes made here'], desc: '+1.2 ducats. Doubles spices, sugar, fruit, cotton or dyes made here.' },
  market: { id: 'market', name: 'Market', group: 'economy', site: 'town', cost: 30, turns: 2, salary: 0.3, gold: 1.5, icon: 'coin', rates: { economy: 0.2 }, gives: ['+1.5 ducats a year', '+0.2 Economy cards a year'], desc: '+1.5 ducats, +0.2 Economy cards a year.' },
  workshop: { id: 'workshop', name: 'Workshop', group: 'economy', site: 'town', cost: 40, turns: 3, salary: 0.5, gold: 1, icon: 'anvil', gives: ['+1 ducat a year', 'Makes 2 loads a year of a manufactured good you choose', 'Making weapons: an equipment card every 4 years'], desc: 'Makes 2 loads a year of one manufactured good you choose, from raw materials in your warehouses. Making weapons, it also forges an equipment card every 4 years.' },
  harbour: { id: 'harbour', name: 'Harbour', group: 'economy', site: 'town', cost: 35, turns: 2, tech: 'navigation', salary: 0.5, gold: 2, coastal: true, icon: 'anchor', rates: { economy: 0.1, diplomacy: 0.1 }, gives: ['+2 ducats a year', '+0.1 Economy and Diplomacy cards a year', 'Faster naval missions, +1 navy size'], desc: '+2 ducats, +0.1 Economy and Diplomacy cards. Faster naval missions.' },
  bank: { id: 'bank', name: 'Bank', group: 'economy', site: 'town', cost: 60, turns: 3, tech: 'banking', salary: 1, gold: 2.5, icon: 'coin', rates: { economy: 0.2 }, gives: ['+2.5 ducats a year', '+0.2 Economy cards a year'], desc: '+2.5 ducats, +0.2 Economy cards.' },
  manufactory: { id: 'manufactory', name: 'Manufactory', group: 'economy', site: 'town', cost: 80, turns: 4, tech: 'manufactories', salary: 1.5, gold: 4, icon: 'anvil', rates: { economy: 0.2 }, gives: ['+4 ducats a year', '+0.2 Economy cards a year', 'Makes 4 loads a year of the chosen good'], desc: '+4 ducats, +0.2 Economy cards. Makes 4 loads a year of the province\'s chosen good.' },
};

/** Card-rate bonuses from research. */
export const TECH_RATES: Record<string, Rates> = Object.fromEntries(TECHS.filter(t => t.fx?.rates).map(t => [t.id, t.fx!.rates!]));

export const AGE_NAMES = ['Crusade', 'Discovery', 'Reformation', 'Absolutism', 'Enlightenment'];
