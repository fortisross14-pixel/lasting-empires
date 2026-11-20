// The ground a battle is fought on. Each province has one kind, worked out from what the land yields and where it
// lies, with a few provinces set by hand. The numbers here are the whole of what ground does in a battle.

export type Terrain = 'plains' | 'forest' | 'hills' | 'mountains' | 'desert';

export interface TerrainDef {
  id: Terrain; name: string; text: string;
  /** Cavalry of the attacker (and of the defender too, in woods), multiplied. */
  attCav: number; defCav: number;
  /** Fire of both sides, and of the defender alone, multiplied. */
  fire: number; defFire: number;
  /** Damage the defender takes, and everything the attacker deals, multiplied. */
  defTaken: number; attAll: number;
}

export const TERRAINS: Record<Terrain, TerrainDef> = {
  plains: { id: 'plains', name: 'Open ground', text: 'Nothing helps or hinders either side.', attCav: 1, defCav: 1, fire: 1, defFire: 1, defTaken: 1, attAll: 1 },
  forest: { id: 'forest', name: 'Woods', text: 'Cavalry fights at ×0.6 and all fire at ×0.85, for both sides.', attCav: 0.6, defCav: 0.6, fire: 0.85, defFire: 1, defTaken: 1, attAll: 1 },
  hills: { id: 'hills', name: 'Hills', text: 'The attacker\'s cavalry fights at ×0.6; the defender\'s fire at ×1.2.', attCav: 0.6, defCav: 1, fire: 1, defFire: 1.2, defTaken: 1, attAll: 1 },
  mountains: { id: 'mountains', name: 'Mountains', text: 'The attacker\'s cavalry fights at ×0.5; the defender takes ×0.85 damage.', attCav: 0.5, defCav: 1, fire: 1, defFire: 1, defTaken: 0.85, attAll: 1 },
  desert: { id: 'desert', name: 'Desert', text: 'The attacker arrives thirsty and fights at ×0.9.', attCav: 1, defCav: 1, fire: 1, defFire: 1, defTaken: 1, attAll: 0.9 },
};
/** An army that comes ashore from ships is met on the beach: the defender's fire, first round only. */
export const LANDING_FIRE = 1.3;

/** Provinces whose ground is set by hand, where the raw material would mislead. */
export const TERRAIN_OVERRIDES: Record<string, Terrain> = Object.fromEntries(Object.entries({
  // Europe, corrected by hand: the Alps, the Apennines, the Carpathians, the Balkans and Norway; the plains a mine
  // or a salt pan had made into hills; the great northern woods.
  // Not the inside of Iberia, on purpose: thirteen more hills and mountains there (the Cantabrian range, the
  // Pyrenees, Galicia) took the bot's Castile, Portugal and Aragon from 58% to 77% in the top three, because ground
  // counts only where the player fights and so is a gift to whoever defends it. See docs/BALANCE.md before adding
  // high ground to a realm a player starts in.
  mountains: 'granada chambery grenoble bern innsbruck graz kolozsvar pressburg bosnia kruja abruzzo corsica bergen inverness',
  hills: 'almeria malaga clermont limoges marseille genoa florence perugia ancona cosenza sassari '
    + 'zurich ljubljana stuttgart dresden prague belgrade sofia thessaloniki athens mistra candia zara trondheim iceland glasgow exeter madeira canaries mashhad',
  forest: 'bayonne luxembourg erfurt stockholm norrland turku novgorod vologda dvina moscow nizhny kazan riga',
  plains: 'lisbon evora caen cologne luneburg munich breslau milan venice',
  desert: 'bukhara',
} as Record<Terrain, string>).flatMap(([t, ids]) => ids.split(' ').map(id => [id, t as Terrain])));
const BY_GOOD: Record<string, Terrain> = { wood: 'forest', iron: 'hills', coal: 'hills', gold: 'mountains' };

const GREEN = ['grain', 'produce', 'fish', 'wood'];
/** The Sahara and Arabia: between 15° and 32° north, from the Atlantic to the Gulf. */
const dryBelt = (lon: number, lat: number) => lat >= 15 && lat <= 32 && lon >= -17 && lon <= 60;

/** The ground of a province. Timber country is wooded, mining country hilly or mountainous, and in the dry belt
 *  whatever does not yield grain, fruit, fish or timber is desert. */
export function terrainOf(p: { id: string; good: string; lat: number; lon: number }): Terrain {
  if (TERRAIN_OVERRIDES[p.id]) return TERRAIN_OVERRIDES[p.id];
  if (dryBelt(p.lon, p.lat) && !GREEN.includes(p.good)) return 'desert';
  if (BY_GOOD[p.good]) return BY_GOOD[p.good];
  const lat = Math.abs(p.lat);
  if (p.good === 'saltpetre') return lat >= 12 && lat <= 36 ? 'desert' : 'hills';
  if (p.good === 'spices' && lat < 23) return 'forest';
  return 'plains';
}
