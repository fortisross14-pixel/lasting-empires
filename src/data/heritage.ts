// Regional heritage (docs/HISTORY-PLAN.md, part I): what a people knows when the game begins. Each heritage is a
// template of capabilities (iron, horses, gunpowder…), with overrides for the nations that differ from their group.
// Capabilities are knowledge and means a realm has or lacks; they gate what it can raise, forge and build, for the
// player and the AI alike (src/engine/technology.ts). They are not a ladder of "civilisation": a realm can lack iron
// and still build roads and archives better than its neighbours.

/** What a realm can do with its hands and its herds. */
export type Capability =
  | 'iron'        // iron and steel weapons and tools
  | 'plate'       // European plate-armour manufacture (other peoples have their own armour, not this)
  | 'horses'      // horses and mounted warfare
  | 'elephants'   // war elephants
  | 'gunpowder'   // gunpowder and hand firearms
  | 'cannon'      // cast guns: bombards and later cannon
  | 'ships'       // seagoing warships of any regional tradition
  | 'ocean';      // ships and navigation for the open ocean

export const CAPABILITIES: { id: Capability; name: string; text: string }[] = [
  { id: 'iron', name: 'Ironworking', text: 'Iron and steel weapons and armour.' },
  { id: 'plate', name: 'Plate armour', text: 'The European craft of plate harness for men and horses.' },
  { id: 'horses', name: 'Horses', text: 'Horses, and the riders to make war from their backs.' },
  { id: 'elephants', name: 'War elephants', text: 'Elephants trained for war.' },
  { id: 'gunpowder', name: 'Gunpowder', text: 'Powder, and the hand guns that fire it.' },
  { id: 'cannon', name: 'Cannon', text: 'Cast guns, from great bombards to field pieces.' },
  { id: 'ships', name: 'Warships', text: 'Fighting ships of your own sea traditions.' },
  { id: 'ocean', name: 'Ocean sailing', text: 'Ships and navigation for the open ocean.' },
];

export type Heritage =
  | 'western_european' | 'mediterranean' | 'eastern_european' | 'islamic' | 'steppe' | 'south_asian' | 'east_asian'
  | 'japanese' | 'mainland_sea' | 'maritime_sea' | 'west_african' | 'east_african' | 'mesoamerican' | 'andean';

export interface HeritageDef { id: Heritage; name: string; caps: Capability[]; text: string; }

export const HERITAGES: Record<Heritage, HeritageDef> = {
  western_european: { id: 'western_european', name: 'Western European', caps: ['iron', 'plate', 'horses', 'gunpowder', 'cannon', 'ships', 'ocean'], text: 'Ironworking, armour, heavy cavalry and the first firearms.' },
  mediterranean: { id: 'mediterranean', name: 'Mediterranean', caps: ['iron', 'plate', 'horses', 'gunpowder', 'cannon', 'ships', 'ocean'], text: 'Galleys, sea trade and companies of hired soldiers.' },
  eastern_european: { id: 'eastern_european', name: 'Eastern European', caps: ['iron', 'plate', 'horses', 'gunpowder', 'cannon', 'ships'], text: 'Cavalry, fortified towns and the long frontier.' },
  islamic: { id: 'islamic', name: 'Islamic Middle East', caps: ['iron', 'horses', 'gunpowder', 'cannon', 'ships'], text: 'Cavalry, fine metalwork and great schools.' },
  steppe: { id: 'steppe', name: 'Central Asian steppe', caps: ['iron', 'horses'], text: 'Mounted archers, speed and the herds that feed an army.' },
  south_asian: { id: 'south_asian', name: 'South Asian', caps: ['iron', 'horses', 'elephants', 'gunpowder', 'ships'], text: 'Metalwork, cloth, cavalry and elephants.' },
  east_asian: { id: 'east_asian', name: 'East Asian', caps: ['iron', 'horses', 'gunpowder', 'cannon', 'ships'], text: 'Administration, metalwork, printing and gunpowder.' },
  japanese: { id: 'japanese', name: 'Japanese', caps: ['iron', 'horses', 'ships'], text: 'Samurai, archery and fine steel.' },
  mainland_sea: { id: 'mainland_sea', name: 'Mainland Southeast Asian', caps: ['iron', 'elephants', 'ships'], text: 'Rice, rivers and armies that move by water.' },
  maritime_sea: { id: 'maritime_sea', name: 'Maritime Southeast Asian', caps: ['iron', 'gunpowder', 'cannon', 'ships', 'ocean'], text: 'Ships, island trade and the monsoon routes.' },
  west_african: { id: 'west_african', name: 'West African', caps: ['iron', 'horses'], text: 'Iron, the Sahel trade and horsemen of the savanna.' },
  east_african: { id: 'east_african', name: 'East African', caps: ['iron', 'horses', 'ships'], text: 'Highland forts and the coast trade of the Indian Ocean.' },
  mesoamerican: { id: 'mesoamerican', name: 'Mesoamerican', caps: [], text: 'Obsidian blades, quilted armour and disciplined infantry.' },
  andean: { id: 'andean', name: 'Andean', caps: [], text: 'Quilted armour, copper and bronze, roads and mountain engineering.' },
};

/** The heritage of each people (a culture id); a people not listed is Western European. */
export const CULTURE_HERITAGE: Record<string, Heritage> = {
  italian: 'mediterranean', aragonese: 'mediterranean',
  polish: 'eastern_european', lithuanian: 'eastern_european', russian: 'eastern_european', czech: 'eastern_european', hungarian: 'eastern_european',
  romanian: 'eastern_european', serbian: 'eastern_european', albanian: 'eastern_european', greek: 'eastern_european', georgian: 'eastern_european',
  turkish: 'islamic', arab: 'islamic', persian: 'islamic', kurdish: 'islamic', azeri: 'islamic', dagestani: 'islamic', andalusi: 'islamic', maghrebi: 'islamic', berber: 'islamic',
  tatar: 'steppe', uzbek: 'steppe', mongol: 'steppe', oirat: 'steppe', chagatai: 'steppe', jurchen: 'steppe', tibetan: 'steppe', circassian: 'steppe', kazakh: 'steppe',
  hindustani: 'south_asian', bengali: 'south_asian', gujarati: 'south_asian', rajput: 'south_asian', sindhi: 'south_asian', kashmiri: 'south_asian', deccani: 'south_asian',
  kannada: 'south_asian', malayali: 'south_asian', oriya: 'south_asian', sinhala: 'south_asian', punjabi: 'south_asian', nepali: 'south_asian', marathi: 'south_asian', tamil: 'south_asian',
  han: 'east_asian', korean: 'east_asian', viet: 'east_asian', ryukyuan: 'east_asian', manchu: 'east_asian',
  japanese: 'japanese',
  cham: 'mainland_sea', khmer: 'mainland_sea', thai: 'mainland_sea', burmese: 'mainland_sea', lao: 'mainland_sea', mon: 'mainland_sea', rakhine: 'mainland_sea',
  malay: 'maritime_sea', javanese: 'maritime_sea', moluccan: 'maritime_sea', sundanese: 'maritime_sea', filipino: 'maritime_sea',
  wolof: 'west_african', manding: 'west_african', songhai: 'west_african', edo: 'west_african', hausa: 'west_african', kanuri: 'west_african', mossi: 'west_african', yoruba: 'west_african', bantu: 'west_african', akan: 'west_african',
  swahili: 'east_african', amhara: 'east_african', somali: 'east_african',
  nahua: 'mesoamerican', purepecha: 'mesoamerican', maya: 'mesoamerican', mixtec: 'mesoamerican', zapotec: 'mesoamerican', native: 'mesoamerican',
  quechua: 'andean', chimu: 'andean', muisca: 'andean',
  // peoples of the later starts
  nubian: 'east_african', harari: 'east_african', malagasy: 'east_african', fur: 'west_african', maba: 'west_african', fulani: 'west_african', fon: 'west_african', nupe: 'west_african',
  iroquois: 'mesoamerican', mapuche: 'andean', shan: 'mainland_sea', bugis: 'maritime_sea', baltic: 'eastern_european', kalmyk: 'steppe', baluch: 'islamic',
};

/** Nations that differ from their heritage: capabilities added or taken away. Kept short on purpose: the template
 *  is right for most; these are the cases where history says otherwise. */
export const NATION_CAPS: Record<string, { add?: Capability[]; remove?: Capability[]; heritage?: Heritage }> = {
  ming: { add: ['ocean'] },                         // the treasure fleets were within living memory in 1451
  korea: { add: ['cannon'] },                       // Korean ships' guns
  daiviet: { remove: ['horses'] },                  // an army of foot and river boats, with Chinese guns
  muscovy: { remove: ['ships'] }, novgorod: { remove: ['ships'] }, tver: { remove: ['ships'] }, poland: { remove: ['ships'] }, lithuania: { remove: ['ships'] }, bohemia: { remove: ['ships'] }, hungary: { remove: ['ships'] },
  timurids: { add: ['gunpowder'], remove: ['ships'] }, qaraqoyunlu: { remove: ['ships'] }, aqqoyunlu: { remove: ['ships'] }, kurds: { remove: ['ships', 'cannon'] },
  bedouins: { remove: ['ships', 'cannon', 'gunpowder'] }, tribes: { remove: ['ships', 'cannon', 'gunpowder'] },
  oman: { add: ['ocean'] }, hormuz: { add: ['ocean'] },
  mughals: { add: ['cannon'] },                     // Babur's guns at Panipat
  gujarat: { add: ['ocean'] }, calicut: { add: ['ocean'] }, bengal: { add: ['ocean'] },
  ayutthaya: { add: ['horses'] }, ava: { add: ['horses'] },
  brunei: { add: ['ocean'] }, malacca: { add: ['ocean'] }, majapahit: { add: ['ocean'] },
  kilwa: { add: ['ocean'] }, pate: { add: ['ocean'] }, ethiopia: { remove: ['ships'] }, adal: { remove: ['ships'] }, ajuran: { add: ['ocean'] },
  kongo: { remove: ['horses'] }, mutapa: { heritage: 'east_african', remove: ['ships'] }, benin: { remove: ['horses'] }, oyo: {},
  tarascan: {},                                     // Purépecha copper and bronze: within the regional armour, not iron
  ryukyu: { add: ['ocean'], remove: ['horses'] },
  mapuche: { add: ['horses', 'iron'] },            // Mapuche horsemen and iron lances by 1600
  iroquois: { add: ['gunpowder', 'iron'] },        // trade muskets and iron tools by 1700
  thirteen_colonies: {},
};

/** What had spread to each heritage by a later start date (on top of its 1451 template): the state of the world in
 *  1600 and 1700, not a calendar rule; after the start, capabilities spread only through contact. */
export const LATER_CAPS: Record<number, Partial<Record<Heritage, Capability[]>>> = {
  1600: {
    japanese: ['gunpowder', 'cannon'],               // matchlocks from 1543, cannon by the 1580s
    steppe: ['gunpowder'], south_asian: ['cannon'], mainland_sea: ['gunpowder', 'cannon', 'horses'],
    west_african: ['gunpowder'], east_african: ['gunpowder'], islamic: ['ocean'],
  },
  1700: {
    japanese: ['gunpowder', 'cannon'], steppe: ['gunpowder', 'cannon'], south_asian: ['cannon', 'ocean'], mainland_sea: ['gunpowder', 'cannon', 'horses'],
    west_african: ['gunpowder', 'horses'], east_african: ['gunpowder', 'cannon'], islamic: ['ocean'], east_asian: ['ocean'], eastern_european: ['ocean'],
  },
};

/** Years of contact (a shared border, a war or a trade treaty) with a realm that has a capability before a realm
 *  without it adopts it. Cast guns and ocean ships need a working industry, so they are slower than hand guns. */
export const ADOPT_YEARS: Partial<Record<Capability, number>> = { gunpowder: 8, cannon: 12, horses: 10, iron: 15, ships: 10, ocean: 20 };
/** Capabilities a realm can never adopt from neighbours alone (no horses, no plate harness without the craft). */
export const NOT_BY_CONTACT: Capability[] = ['plate', 'elephants'];
