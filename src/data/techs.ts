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
  { id: 'standing_army', name: 'Standing Army', track: 'military', year: 1560, cost: 18, req: ['tercio_doctrine'], desc: '+3 army size, troop upkeep −20%.' },
  { id: 'military_drill', name: 'Military Drill', track: 'military', year: 1590, cost: 22, req: ['standing_army'], desc: 'Reiters + Muskets → Dragoons. +10% battle strength.' },
  { id: 'bayonet', name: 'Bayonet', track: 'military', year: 1660, cost: 26, req: ['musket', 'military_drill'], desc: 'Musketeers + Bayonets → Line Infantry.' },

  { id: 'guilds', name: 'Guilds', track: 'economy', year: 1453, cost: 6, desc: 'Build Armouries: they forge an equipment card every 4 years.' },
  { id: 'printing', name: 'Printing Press', track: 'economy', year: 1460, cost: 9, desc: 'Build Universities: +1 research per study.' },
  { id: 'banking', name: 'Banking', track: 'economy', year: 1470, cost: 12, desc: '+10% income. Build Banks.' },
  { id: 'navigation', name: 'Ocean Navigation', track: 'economy', year: 1480, cost: 12, desc: 'Build Harbours (+2 ducats in coastal provinces). Opens overseas ventures.' },
  { id: 'manufactories', name: 'Manufactories', track: 'economy', year: 1530, cost: 18, req: ['guilds', 'banking'], desc: 'Build Manufactories: +5 ducats each.' },
  { id: 'mercantilism', name: 'Mercantilism', track: 'economy', year: 1600, cost: 22, req: ['manufactories'], desc: 'Trade treaties are worth 50% more.' },

  { id: 'chancery', name: 'Royal Chancery', track: 'state', year: 1453, cost: 6, desc: '+10% diplomatic success. Diplomatic missions take 1 year less.' },
  { id: 'embassies', name: 'Resident Embassies', track: 'state', year: 1480, cost: 10, req: ['chancery'], desc: '+1 court seat. Alliances need 15 less relation.' },
  { id: 'bureaucracy', name: 'Bureaucracy', track: 'state', year: 1500, cost: 14, desc: '+1 stability. Tax missions yield 50% more.' },
  { id: 'councils', name: 'Royal Councils', track: 'state', year: 1530, cost: 16, req: ['bureaucracy'], desc: '+1 court seat. +1 research per study.' },
  { id: 'absolutism', name: 'Absolutism', track: 'state', year: 1620, cost: 24, req: ['councils'], desc: '+1 stability, +2 prestige a year.' },
];

export const TECH: Record<string, TechDef> = Object.fromEntries(TECHS.map(t => [t.id, t]));

export interface BuildingDef {
  id: string; name: string; cost: number; turns: number; tech?: string; desc: string;
  gold?: number; coastal?: boolean; icon: string;
}

export const BUILDINGS: Record<string, BuildingDef> = {
  market:      { id: 'market', name: 'Market', cost: 30, turns: 2, gold: 2, icon: 'coin', desc: '+2 ducats a year.' },
  barracks:    { id: 'barracks', name: 'Barracks', cost: 40, turns: 3, icon: 'banner', desc: '+1 draft a year, +1 army size, +1 manpower a year.' },
  fortress:    { id: 'fortress', name: 'Fortress', cost: 50, turns: 3, icon: 'tower', desc: '+1 fort level (maximum 2, or 3 with Star Forts).' },
  cathedral:   { id: 'cathedral', name: 'Cathedral', cost: 50, turns: 4, icon: 'church', desc: '+1 prestige a year. +1 stability when finished.' },
  armoury:     { id: 'armoury', name: 'Armoury', cost: 40, turns: 3, tech: 'guilds', icon: 'anvil', desc: 'Forges an equipment card every 4 years.' },
  university:  { id: 'university', name: 'University', cost: 60, turns: 4, tech: 'printing', icon: 'book', desc: '+1 research on every study.' },
  bank:        { id: 'bank', name: 'Bank', cost: 60, turns: 3, tech: 'banking', gold: 3, icon: 'coin', desc: '+3 ducats a year.' },
  harbour:     { id: 'harbour', name: 'Harbour', cost: 35, turns: 2, tech: 'navigation', gold: 2, coastal: true, icon: 'anchor', desc: '+2 ducats a year. Naval missions take 1 year less from here.' },
  manufactory: { id: 'manufactory', name: 'Manufactory', cost: 80, turns: 4, tech: 'manufactories', gold: 5, icon: 'anvil', desc: '+5 ducats a year.' },
};
