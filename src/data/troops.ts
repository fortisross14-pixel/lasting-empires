// Troops, equipment, merge recipes and battle tactics.

export type TroopKind = 'inf' | 'cav' | 'shot' | 'art' | 'ship';

export interface TroopType {
  id: string; name: string; kind: TroopKind;
  melee: number; fire: number; def: number;
  upkeep: number; tier: number;
  tech?: string;        // research needed before it can be drafted
  draftable: boolean;   // false = only by merging or special cards
  icon: string; desc: string;
  siege?: number;
  pike?: boolean;       // enables Pike Wall
  transport?: number;   // ships: companies carried by sea
}

export const TROOPS: Record<string, TroopType> = {
  levy:        { id: 'levy', name: 'Levy Infantry', kind: 'inf', melee: 2, fire: 0, def: 2, upkeep: 0.5, tier: 1, draftable: true, icon: 'spear', desc: 'Peasants with spears. Cheap, and the base for most merges.' },
  crossbow:    { id: 'crossbow', name: 'Crossbowmen', kind: 'shot', melee: 1, fire: 2, def: 1, upkeep: 0.7, tier: 1, draftable: true, icon: 'crossbow', desc: 'Steady missile troops from the town militias.' },
  men_at_arms: { id: 'men_at_arms', name: 'Men-at-Arms', kind: 'inf', melee: 4, fire: 0, def: 4, upkeep: 1.2, tier: 2, draftable: true, icon: 'helm', desc: 'Armoured professional foot.' },
  jinetes:     { id: 'jinetes', name: 'Jinetes', kind: 'cav', melee: 3, fire: 0, def: 2, upkeep: 1.0, tier: 1, draftable: true, icon: 'horse', desc: 'Light horsemen with javelins, masters of the skirmish.' },
  knights:     { id: 'knights', name: 'Knights', kind: 'cav', melee: 6, fire: 0, def: 5, upkeep: 2.0, tier: 3, draftable: true, icon: 'lance', desc: 'Heavy lancers. Devastating on the charge.' },
  bombard:     { id: 'bombard', name: 'Bombard', kind: 'art', melee: 0, fire: 3, def: 1, upkeep: 1.5, tier: 2, draftable: true, icon: 'cannon', desc: 'Huge siege guns. Slow, but walls fall before them.', siege: 2 },
  pikemen:     { id: 'pikemen', name: 'Pikemen', kind: 'inf', melee: 3, fire: 0, def: 5, upkeep: 1.0, tier: 2, tech: 'pike_square', draftable: true, icon: 'pike', desc: 'A hedge of long pikes. Horsemen break on it.', pike: true },
  arquebusiers:{ id: 'arquebusiers', name: 'Arquebusiers', kind: 'shot', melee: 1, fire: 4, def: 1, upkeep: 1.2, tier: 2, tech: 'firearms', draftable: true, icon: 'gun', desc: 'Matchlock guns. Slow to reload, deadly in a volley.' },
  swiss:       { id: 'swiss', name: 'Swiss Pikes', kind: 'inf', melee: 5, fire: 0, def: 6, upkeep: 2.0, tier: 3, draftable: false, icon: 'pike', desc: 'Mercenary pike columns. Feared across Europe.', pike: true },
  tercio:      { id: 'tercio', name: 'Tercio', kind: 'inf', melee: 5, fire: 4, def: 6, upkeep: 2.5, tier: 4, tech: 'tercio_doctrine', draftable: false, icon: 'tercio', desc: 'Pike square with sleeves of shot. Queen of the battlefield.', pike: true },
  field_cannon:{ id: 'field_cannon', name: 'Field Cannon', kind: 'art', melee: 0, fire: 6, def: 2, upkeep: 2.0, tier: 3, tech: 'bronze_cannon', draftable: false, icon: 'cannon', desc: 'Light bronze guns that keep up with the army.', siege: 2 },
  reiters:     { id: 'reiters', name: 'Reiters', kind: 'cav', melee: 4, fire: 3, def: 3, upkeep: 2.0, tier: 3, tech: 'wheellock', draftable: false, icon: 'pistol', desc: 'Pistol cavalry that ride in, fire and wheel away.' },
  cuirassiers: { id: 'cuirassiers', name: 'Cuirassiers', kind: 'cav', melee: 7, fire: 2, def: 6, upkeep: 3.0, tier: 4, tech: 'wheellock', draftable: false, icon: 'lance', desc: 'Armoured horse with pistols and swords.' },
  musketeers:  { id: 'musketeers', name: 'Musketeers', kind: 'shot', melee: 2, fire: 6, def: 2, upkeep: 1.8, tier: 3, tech: 'musket', draftable: false, icon: 'gun', desc: 'Heavy muskets on rests. Their volleys break pike squares.' },
  old_tercio:  { id: 'old_tercio', name: 'Tercio Viejo', kind: 'inf', melee: 7, fire: 6, def: 8, upkeep: 3.5, tier: 5, tech: 'musket', draftable: false, icon: 'tercio', desc: 'Veteran tercio with musket sleeves. Almost unbreakable.', pike: true },
  dragoons:    { id: 'dragoons', name: 'Dragoons', kind: 'cav', melee: 4, fire: 4, def: 4, upkeep: 2.2, tier: 4, tech: 'military_drill', draftable: false, icon: 'horse', desc: 'Mounted musketeers. Ride fast, fight on foot.' },
  line_infantry:{ id: 'line_infantry', name: 'Line Infantry', kind: 'shot', melee: 5, fire: 7, def: 5, upkeep: 2.6, tier: 5, tech: 'bayonet', draftable: false, icon: 'gun', desc: 'Flintlocks with bayonets. Pike and shot in one man.' },
  // ships: melee = boarding, fire = guns, def = hull
  galley:      { id: 'galley', name: 'Galley', kind: 'ship', melee: 4, fire: 1, def: 3, upkeep: 0.8, tier: 1, draftable: true, icon: 'ship', desc: 'Oared warship of the Mediterranean. Rams and boards.', transport: 2 },
  caravel:     { id: 'caravel', name: 'Caravel', kind: 'ship', melee: 1, fire: 2, def: 2, upkeep: 0.6, tier: 1, draftable: true, icon: 'ship', desc: 'Small, fast and handy against the wind.', transport: 1 },
  carrack:     { id: 'carrack', name: 'Carrack', kind: 'ship', melee: 2, fire: 3, def: 4, upkeep: 1.2, tier: 2, tech: 'navigation', draftable: true, icon: 'ship', desc: 'High-sided ocean ship. Carries many soldiers.', transport: 4 },
  galleass:    { id: 'galleass', name: 'Galleass', kind: 'ship', melee: 4, fire: 4, def: 5, upkeep: 1.6, tier: 3, tech: 'bronze_cannon', draftable: false, icon: 'ship', desc: 'A great galley bristling with guns.', transport: 3 },
  galleon:     { id: 'galleon', name: 'Galleon', kind: 'ship', melee: 3, fire: 5, def: 6, upkeep: 1.8, tier: 3, tech: 'naval_gunnery', draftable: true, icon: 'ship', desc: 'Gun-armed ocean warship and treasure carrier.', transport: 4 },
  man_of_war:  { id: 'man_of_war', name: 'Ship of the Line', kind: 'ship', melee: 3, fire: 8, def: 8, upkeep: 2.6, tier: 4, tech: 'ship_of_line', draftable: true, icon: 'ship', desc: 'Three decks of guns. Rules the sea.', transport: 3 },
  garrison:    { id: 'garrison', name: 'Garrison', kind: 'inf', melee: 1, fire: 2, def: 3, upkeep: 0, tier: 1, draftable: false, icon: 'tower', desc: 'Defenders of the walls.' },
  rebels:      { id: 'rebels', name: 'Rebels', kind: 'inf', melee: 2, fire: 0, def: 1, upkeep: 0, tier: 1, draftable: false, icon: 'spear', desc: 'Angry peasants.' },
};

export interface EquipType { id: string; name: string; tech?: string; icon: string; desc: string; }

export const EQUIPMENT: Record<string, EquipType> = {
  long_pike:  { id: 'long_pike', name: 'Long Pikes', tech: 'pike_square', icon: 'pike', desc: 'Merge with Levy Infantry to make Pikemen.' },
  arquebus:   { id: 'arquebus', name: 'Arquebuses', tech: 'firearms', icon: 'gun', desc: 'Merge with Levy or Crossbowmen to make Arquebusiers.' },
  plate:      { id: 'plate', name: 'Plate Armour', icon: 'helm', desc: 'Merge with Levy for Men-at-Arms, or Jinetes for Knights.' },
  warhorse:   { id: 'warhorse', name: 'Warhorses', icon: 'horse', desc: 'Merge with Men-at-Arms to make Knights.' },
  bronze:     { id: 'bronze', name: 'Bronze Casting', tech: 'bronze_cannon', icon: 'cannon', desc: 'Merge with a Bombard to make a Field Cannon.' },
  pistols:    { id: 'pistols', name: 'Wheellock Pistols', tech: 'wheellock', icon: 'pistol', desc: 'Jinetes become Reiters, Knights become Cuirassiers.' },
  musket:     { id: 'musket', name: 'Muskets', tech: 'musket', icon: 'gun', desc: 'Arquebusiers become Musketeers, a Tercio becomes a Tercio Viejo.' },
  bayonet:    { id: 'bayonet', name: 'Bayonets', tech: 'bayonet', icon: 'sword', desc: 'Musketeers become Line Infantry.' },
  banner:     { id: 'banner', name: 'Regimental Colours', icon: 'banner', desc: 'Merge with any troop: +1 veteran star.' },
};

export interface Recipe { a: string; b: string; out: string; tech?: string; cost: number; }

// a and b are troop or equipment ids; order does not matter.
export const RECIPES: Recipe[] = [
  { a: 'levy', b: 'long_pike', out: 'pikemen', tech: 'pike_square', cost: 10 },
  { a: 'levy', b: 'plate', out: 'men_at_arms', cost: 12 },
  { a: 'levy', b: 'arquebus', out: 'arquebusiers', tech: 'firearms', cost: 12 },
  { a: 'crossbow', b: 'arquebus', out: 'arquebusiers', tech: 'firearms', cost: 8 },
  { a: 'jinetes', b: 'plate', out: 'knights', cost: 18 },
  { a: 'men_at_arms', b: 'warhorse', out: 'knights', cost: 15 },
  { a: 'men_at_arms', b: 'long_pike', out: 'pikemen', tech: 'pike_square', cost: 5 },
  { a: 'pikemen', b: 'arquebusiers', out: 'tercio', tech: 'tercio_doctrine', cost: 25 },
  { a: 'swiss', b: 'arquebusiers', out: 'tercio', tech: 'tercio_doctrine', cost: 15 },
  { a: 'bombard', b: 'bronze', out: 'field_cannon', tech: 'bronze_cannon', cost: 15 },
  { a: 'jinetes', b: 'pistols', out: 'reiters', tech: 'wheellock', cost: 15 },
  { a: 'knights', b: 'pistols', out: 'cuirassiers', tech: 'wheellock', cost: 20 },
  { a: 'arquebusiers', b: 'musket', out: 'musketeers', tech: 'musket', cost: 15 },
  { a: 'tercio', b: 'musket', out: 'old_tercio', tech: 'musket', cost: 30 },
  { a: 'reiters', b: 'musket', out: 'dragoons', tech: 'military_drill', cost: 20 },
  { a: 'musketeers', b: 'bayonet', out: 'line_infantry', tech: 'bayonet', cost: 25 },
  { a: 'galley', b: 'bronze', out: 'galleass', tech: 'bronze_cannon', cost: 20 },
  { a: 'carrack', b: 'bronze', out: 'galleon', tech: 'naval_gunnery', cost: 25 },
  { a: 'pikemen', b: 'musketeers', out: 'line_infantry', tech: 'bayonet', cost: 20 },
];

export interface TacticDef { id: string; name: string; desc: string; counteredBy: string[]; needs?: 'cav' | 'shot' | 'art' | 'pike'; naval?: boolean; }

export const TACTICS: Record<string, TacticDef> = {
  volley:  { id: 'volley', name: 'Volley Fire', desc: 'Fire ×1.7', counteredBy: ['charge'], needs: 'shot' },
  charge:  { id: 'charge', name: 'Cavalry Charge', desc: 'Cavalry melee ×2, foot ×1.2', counteredBy: ['pike'], needs: 'cav' },
  pike:    { id: 'pike', name: 'Pike Wall', desc: 'Enemy melee ×0.5', counteredBy: ['volley', 'barrage'], needs: 'pike' },
  flank:   { id: 'flank', name: 'Flanking March', desc: 'Melee ×1.5', counteredBy: ['hold'] },
  hold:    { id: 'hold', name: 'Hold the Line', desc: 'All damage taken ×0.7', counteredBy: ['barrage'] },
  barrage: { id: 'barrage', name: 'Bombardment', desc: 'Artillery fire ×2.5', counteredBy: ['charge'], needs: 'art' },
  broadside: { id: 'broadside', name: 'Broadside', desc: 'Guns ×1.7', counteredBy: ['board'], naval: true },
  board:     { id: 'board', name: 'Grapple and Board', desc: 'Boarding ×1.8', counteredBy: ['line'], naval: true },
  line:      { id: 'line', name: 'Line of Battle', desc: 'Damage taken ×0.6', counteredBy: ['gauge'], naval: true },
  gauge:     { id: 'gauge', name: 'Weather Gauge', desc: 'All ×1.3', counteredBy: ['broadside'], naval: true },
};

export const COUNTER_TEXT = 'A countered tactic does nothing, and its side takes 25% more damage.';
