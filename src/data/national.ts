// National heritage (docs/HISTORY-PLAN.md, phase 2): the soldiers each heritage raises, and the units, technologies,
// buildings, cards, strength and introduction of the five reference civilisations (Inca, Aztec, Castile, Ming,
// Brunei). Data only: every effect is one the game already has (technology fx, building yields, card plays read by
// src/engine/national.ts). Numbers are first balancing targets, not historical facts.
import type { TroopType } from './troops';
import type { TechDef, BuildingDef, TechFx } from './techs';
import type { Heritage } from './heritage';

/** National and regional soldiers and ships. `heritages` / `only` limit who can field them (technology.ts). */
export const NATIONAL_TROOPS: Record<string, TroopType & { heritages?: Heritage[]; only?: string[] }> = {
  // the Andes
  inca_spearmen: { id: 'inca_spearmen', name: 'Inca Spearmen', kind: 'inf', melee: 3, fire: 0, def: 4, upkeep: 0.6, tier: 1, draftable: true, icon: 'spear', heritages: ['andean'], desc: 'Spearmen of the ayllu, quilted and steady: hard to move from a hillside.' },
  mace_warriors: { id: 'mace_warriors', name: 'Inca Mace Warriors', kind: 'inf', melee: 4, fire: 0, def: 3, upkeep: 1.0, tier: 2, draftable: true, icon: 'helm', heritages: ['andean'], desc: 'Bronze star-maces and quilted armour: the shock troops of the Andes.' },
  andean_slingers: { id: 'andean_slingers', name: 'Andean Slingers', kind: 'shot', melee: 1, fire: 3, def: 1, upkeep: 0.5, tier: 1, draftable: true, icon: 'crossbow', heritages: ['andean'], desc: 'A stone from an Andean sling breaks a shield at a hundred paces.' },
  inca_guard: { id: 'inca_guard', name: 'Inca Imperial Guard', kind: 'inf', melee: 5, fire: 1, def: 5, upkeep: 1.8, tier: 3, draftable: false, tech: 'imperial_garrisons', icon: 'shield', only: ['inca'], desc: 'The Sapa Inca\'s own companies, raised from the best of every province. Dear to keep.' },
  // Mesoamerica
  macuahuitl_warriors: { id: 'macuahuitl_warriors', name: 'Macuahuitl Warriors', kind: 'inf', melee: 4, fire: 0, def: 2, upkeep: 0.9, tier: 2, draftable: true, icon: 'sword', heritages: ['mesoamerican'], desc: 'Obsidian-edged clubs that cut like a razor, and fight to take captives.' },
  atlatl_skirmishers: { id: 'atlatl_skirmishers', name: 'Atlatl Skirmishers', kind: 'shot', melee: 2, fire: 2, def: 1, upkeep: 0.5, tier: 1, draftable: true, icon: 'spear', heritages: ['mesoamerican'], desc: 'Darts thrown with the atlatl, then into the fight with a club.' },
  jaguar_warriors: { id: 'jaguar_warriors', name: 'Jaguar Warriors', kind: 'inf', melee: 6, fire: 0, def: 4, upkeep: 2.0, tier: 3, draftable: false, tech: 'warrior_societies', icon: 'helm', heritages: ['mesoamerican'], desc: 'An elite society of proven warriors: training and pride, not a better blade. Dear to keep.' },
  eagle_warriors: { id: 'eagle_warriors', name: 'Eagle Warriors', kind: 'inf', melee: 5, fire: 1, def: 5, upkeep: 1.8, tier: 3, draftable: false, tech: 'warrior_societies', icon: 'helm', heritages: ['mesoamerican'], desc: 'The eagle society: steadier than the jaguars, as quick to the captive.' },
  // East Asia
  ming_spearmen: { id: 'ming_spearmen', name: 'Ming Spearmen', kind: 'inf', melee: 3, fire: 0, def: 4, upkeep: 0.7, tier: 1, draftable: true, icon: 'spear', heritages: ['east_asian'], desc: 'The garrison soldiers of the Ming, drilled in close ranks.' },
  chinese_crossbow: { id: 'chinese_crossbow', name: 'Chinese Crossbowmen', kind: 'shot', melee: 1, fire: 3, def: 2, upkeep: 0.7, tier: 1, draftable: true, icon: 'crossbow', heritages: ['east_asian'], desc: 'Crossbows in volleys, a craft a thousand years old.' },
  early_handgunners: { id: 'early_handgunners', name: 'Early Handgunners', kind: 'shot', melee: 1, fire: 4, def: 1, upkeep: 1.0, tier: 2, draftable: true, icon: 'gun', heritages: ['east_asian'], desc: 'Fire-lances and hand cannon: the guns China gave the world.' },
  chinese_cavalry: { id: 'chinese_cavalry', name: 'Chinese Cavalry', kind: 'cav', melee: 4, fire: 1, def: 3, upkeep: 1.3, tier: 2, draftable: true, icon: 'horse', heritages: ['east_asian'], desc: 'Horsemen of the northern garrisons, with bow and lance.' },
  chinese_artillery: { id: 'chinese_artillery', name: 'Chinese Artillery', kind: 'art', melee: 0, fire: 4, def: 1, upkeep: 1.4, tier: 2, draftable: true, icon: 'cannon', heritages: ['east_asian'], desc: 'Cast bronze and iron guns on carts, the fruit of the imperial arsenals.' },
  // Japan
  ashigaru: { id: 'ashigaru', name: 'Ashigaru', kind: 'inf', melee: 2, fire: 0, def: 2, upkeep: 0.5, tier: 1, draftable: true, icon: 'spear', heritages: ['japanese'], desc: 'Foot soldiers with the long yari, raised from the villages.' },
  samurai: { id: 'samurai', name: 'Samurai', kind: 'inf', melee: 5, fire: 0, def: 4, upkeep: 1.4, tier: 2, draftable: true, icon: 'sword', heritages: ['japanese'], desc: 'The warrior retainers of a lord: steel, armour and long training.' },
  yumi_archers: { id: 'yumi_archers', name: 'Yumi Archers', kind: 'shot', melee: 1, fire: 3, def: 1, upkeep: 0.7, tier: 1, draftable: true, icon: 'crossbow', heritages: ['japanese'], desc: 'The great asymmetric bow, drawn by men who began as boys.' },
  teppo_ashigaru: { id: 'teppo_ashigaru', name: 'Teppo Ashigaru', kind: 'shot', melee: 1, fire: 5, def: 1, upkeep: 1.1, tier: 2, draftable: true, icon: 'gun', heritages: ['japanese'], desc: 'Matchlock foot in volleys: the guns that changed Japanese war.' },
  mounted_samurai: { id: 'mounted_samurai', name: 'Mounted Samurai', kind: 'cav', melee: 5, fire: 1, def: 4, upkeep: 1.6, tier: 2, draftable: true, icon: 'horse', heritages: ['japanese'], desc: 'Bow and spear from the saddle, the oldest way of the warrior.' },
  // maritime Southeast Asia
  bornean_spearmen: { id: 'bornean_spearmen', name: 'Bornean Spearmen', kind: 'inf', melee: 2, fire: 0, def: 3, upkeep: 0.5, tier: 1, draftable: true, icon: 'spear', heritages: ['maritime_sea'], desc: 'Spear and long shield, from the rivers and the coast.' },
  malay_swordsmen: { id: 'malay_swordsmen', name: 'Malay Swordsmen', kind: 'inf', melee: 4, fire: 0, def: 3, upkeep: 0.9, tier: 2, draftable: true, icon: 'sword', heritages: ['maritime_sea'], desc: 'Kris and parang, light and quick, best in close country.' },
  island_skirmishers: { id: 'island_skirmishers', name: 'Island Skirmishers', kind: 'shot', melee: 1, fire: 2, def: 1, upkeep: 0.5, tier: 1, draftable: true, icon: 'spear', heritages: ['maritime_sea', 'mainland_sea'], desc: 'Javelins, bows and, from friendly forest peoples, the blowpipe.' },
  lantaka_gunners: { id: 'lantaka_gunners', name: 'Lantaka Gunners', kind: 'art', melee: 0, fire: 3, def: 1, upkeep: 1.0, tier: 1, draftable: true, icon: 'cannon', heritages: ['maritime_sea'], desc: 'Swivel guns cast in bronze, on walls, boats and carts.' },
  lancaran: { id: 'lancaran', name: 'Lancaran', kind: 'ship', melee: 3, fire: 1, def: 2, upkeep: 0.6, tier: 1, draftable: true, icon: 'ship', heritages: ['maritime_sea', 'mainland_sea'], transport: 2, desc: 'A fast oared and sailed warship of the straits.' },
  jong: { id: 'jong', name: 'Jong', kind: 'ship', melee: 2, fire: 2, def: 5, upkeep: 1.2, tier: 2, draftable: true, icon: 'ship', heritages: ['maritime_sea'], transport: 4, desc: 'The great multi-masted ship of the Javanese seas: cargo, troops and guns.' },
  junk: { id: 'junk', name: 'War Junk', kind: 'ship', melee: 3, fire: 3, def: 5, upkeep: 1.3, tier: 2, draftable: true, icon: 'ship', heritages: ['east_asian'], transport: 4, desc: 'The ocean-going junk: watertight holds and many masts.' },
  dhow: { id: 'dhow', name: 'Dhow', kind: 'ship', melee: 2, fire: 1, def: 3, upkeep: 0.7, tier: 1, draftable: true, icon: 'ship', heritages: ['east_african', 'south_asian', 'islamic'], transport: 3, desc: 'Lateen sails on the monsoon: the ship of the Indian Ocean trade.' },
  // everyone with pikes and guns; Spain makes it the Tercio
  pike_and_shot: { id: 'pike_and_shot', name: 'Pike and Shot', kind: 'inf', melee: 4, fire: 3, def: 5, upkeep: 2.0, tier: 3, tech: 'pike_and_shot', draftable: false, icon: 'tercio', desc: 'Pikes and guns in one formation, each covering the other.' },
};

/** What each heritage raises, by kind, in the order research brings them (the best its means allow is hired). */
export const HERITAGE_LINES: Partial<Record<Heritage, Partial<Record<'levy' | 'inf' | 'shot' | 'cav' | 'art', string[]>>>> = {
  andean: { levy: ['warriors'], inf: ['inca_spearmen', 'mace_warriors'], shot: ['andean_slingers', 'arquebusiers', 'musketeers'], cav: ['jinetes', 'dragoons'], art: ['bombard', 'field_cannon'] },
  mesoamerican: { levy: ['warriors'], inf: ['macuahuitl_warriors'], shot: ['atlatl_skirmishers', 'arquebusiers', 'musketeers'], cav: ['jinetes', 'dragoons'], art: ['bombard', 'field_cannon'] },
  east_asian: { levy: ['militia'], inf: ['ming_spearmen', 'pikemen'], shot: ['chinese_crossbow', 'early_handgunners', 'musketeers', 'line_infantry'], cav: ['chinese_cavalry', 'dragoons'], art: ['chinese_artillery', 'field_cannon'] },
  japanese: { levy: ['ashigaru'], inf: ['samurai', 'pikemen'], shot: ['yumi_archers', 'teppo_ashigaru', 'musketeers'], cav: ['mounted_samurai', 'dragoons'], art: ['bombard', 'field_cannon'] },
  maritime_sea: { levy: ['bornean_spearmen'], inf: ['malay_swordsmen'], shot: ['island_skirmishers', 'arquebusiers', 'musketeers'], art: ['lantaka_gunners', 'field_cannon'] },
  mainland_sea: { levy: ['militia'], inf: ['spearmen'], shot: ['island_skirmishers', 'arquebusiers', 'musketeers'], cav: ['war_elephants', 'sipahis'], art: ['bombard', 'field_cannon'] },
};
/** The ships each heritage builds, worst to best (others build the European line, within their means). */
export const HERITAGE_SHIPS: Partial<Record<Heritage, string[]>> = {
  maritime_sea: ['lancaran', 'jong', 'galleon', 'man_of_war'], mainland_sea: ['lancaran', 'galleon'], east_asian: ['junk', 'galleon', 'man_of_war'],
  east_african: ['dhow', 'galleon'], south_asian: ['dhow', 'galleon', 'man_of_war'],
};
/** European hulls: their own heritages build them (others have their own traditions; galleons and ships of the line
 *  are open to every realm with the means, as the world converges). */
export const EUROPEAN_HULLS: Record<string, Heritage[]> = {
  galley: ['western_european', 'mediterranean', 'eastern_european', 'islamic'], caravel: ['western_european', 'mediterranean'],
  carrack: ['western_european', 'mediterranean', 'eastern_european'], galleass: ['mediterranean', 'western_european'],
};

/** National and regional technologies: each in the normal research, under the National Traditions filter. `only`
 *  names the nations (or `heritage` the heritages) that may study it. `known` ones a nation starts with. */
export const NATIONAL_TECHS: (TechDef & { only?: string[]; heritage?: Heritage[]; known?: boolean })[] = [
  // Inca
  { id: 'qhapaq_nan', name: 'Qhapaq Ñan', track: 'state', age: 0, year: 1451, cost: 20, only: ['inca'], known: true, fx: { control: 1 }, desc: 'The royal road of the Andes, already thousands of miles long: +1 control a year in every province.' },
  { id: 'khipu', name: 'Khipu Administration', track: 'state', age: 0, year: 1451, cost: 20, only: ['inca'], known: true, fx: { research: 0.5 }, desc: 'Knotted cords that count every storehouse and village: +0.5 research a year for every scholar.' },
  { id: 'state_labour', name: 'State Labour Organisation', track: 'economy', age: 0, year: 1460, cost: 26, only: ['inca'], req: ['qhapaq_nan'], fx: { build: 0.15 }, desc: 'The mit\'a turns villages into builders: buildings cost 15% less.' },
  { id: 'andean_terracing', name: 'Andean Terracing', track: 'economy', age: 0, year: 1465, cost: 28, only: ['inca'], fx: { income: 0.08 }, desc: 'Terraces climb the valleys: +8% income from provinces.' },
  { id: 'imperial_garrisons', name: 'Imperial Garrisons', track: 'military', age: 1, year: 1490, cost: 34, only: ['inca'], req: ['qhapaq_nan'], fx: { army: 1 }, desc: '+1 army size, and the Inca Imperial Guard can be raised.' },
  // Aztec
  { id: 'obsidian_craft', name: 'Obsidian Craftsmanship', track: 'military', age: 0, year: 1451, cost: 20, only: ['aztec', 'tlaxcala'], known: true, fx: { battle: 0.04 }, desc: 'Blades of volcanic glass, sharper than steel: +4% battle strength.' },
  { id: 'warrior_societies', name: 'Warrior Societies', track: 'military', age: 0, year: 1460, cost: 26, only: ['aztec', 'tlaxcala'], desc: 'Captive-takers rise into the Jaguar and Eagle societies: their promotion cards can be played.' },
  { id: 'tribute_admin', name: 'Tribute Administration', track: 'state', age: 0, year: 1465, cost: 28, only: ['aztec'], fx: { income: 0.1 }, desc: 'Tribute rolls from every province of the Triple Alliance: +10% income.' },
  { id: 'chinampa', name: 'Chinampa Agriculture', track: 'economy', age: 0, year: 1451, cost: 22, only: ['aztec', 'tlaxcala', 'mixtec', 'zapotec'], fx: { manpower: 0.5, happy: 1 }, desc: 'Floating gardens feed the lake cities: +0.5 manpower a year, +1 happiness.' },
  { id: 'imperial_training', name: 'Imperial Warrior Training', track: 'military', age: 1, year: 1490, cost: 34, only: ['aztec'], req: ['warrior_societies'], fx: { battle: 0.05, manpower: 0.5 }, desc: 'Every young man trained in the telpochcalli: +5% battle strength, +0.5 manpower a year.' },
  // Castile
  { id: 'frontier_warfare', name: 'Frontier Warfare', track: 'military', age: 0, year: 1451, cost: 22, only: ['castile', 'aragon', 'portugal'], known: true, fx: { battle: 0.03 }, desc: 'Centuries of raid and counter-raid on the Granada frontier: +3% battle strength.' },
  { id: 'ordinance_companies', name: 'Ordinance Companies', track: 'military', age: 0, year: 1470, cost: 30, only: ['castile', 'france'], fx: { upkeep: 0.08 }, desc: 'Standing companies paid by the crown: troops cost 8% less to keep.' },
  { id: 'tercio_doctrine', name: 'Tercio Doctrine', track: 'military', age: 1, year: 1534, cost: 40, only: ['castile', 'aragon'], req: ['pike_and_shot'], desc: 'The Spanish way of pike and shot, ordered in 1534: Pike and Shot companies can become Tercios.' },
  { id: 'veteran_tercios', name: 'Veteran Tercios', track: 'military', age: 2, year: 1560, cost: 46, only: ['castile', 'aragon'], req: ['tercio_doctrine'], fx: { battle: 0.05 }, desc: 'Old soldiers who would not break: +5% battle strength.' },
  { id: 'imperial_administration', name: 'Imperial Administration', track: 'state', age: 1, year: 1520, cost: 40, only: ['castile', 'aragon'], fx: { control: 1, income: 0.05 }, desc: 'Councils for every part of a world empire: +1 control a year, +5% income.' },
  // Ming
  { id: 'imperial_examinations', name: 'Imperial Examinations', track: 'state', age: 0, year: 1451, cost: 22, only: ['ming', 'korea', 'qing', 'daiviet'], known: true, fx: { seats: 1, research: 0.5 }, desc: 'Officials chosen by examination: +1 seat at court, +0.5 research a year for every scholar.' },
  { id: 'imperial_armaments', name: 'Imperial Armaments', track: 'military', age: 0, year: 1451, cost: 26, only: ['ming', 'qing'], fx: { battle: 0.04 }, desc: 'The great arsenals cast guns and arrows by the ten thousand: +4% battle strength.' },
  { id: 'gunpowder_battalions', name: 'Gunpowder Battalions', track: 'military', age: 1, year: 1500, cost: 36, only: ['ming', 'qing', 'korea'], req: ['imperial_armaments'], fx: { battle: 0.05, upkeep: 0.05 }, desc: 'Gun units drilled as one: +5% battle strength, troops cost 5% less.' },
  { id: 'grand_canal', name: 'Grand Canal Administration', track: 'economy', age: 0, year: 1451, cost: 22, only: ['ming', 'qing'], known: true, fx: { income: 0.06 }, desc: 'The canal carries the grain of the south north: +6% income.' },
  { id: 'porcelain', name: 'Porcelain Manufacturing', track: 'economy', age: 0, year: 1460, cost: 28, only: ['ming', 'qing'], fx: { routes: 1, income: 0.04 }, desc: 'Jingdezhen fires the porcelain the world wants: +1 trade route, +4% income.' },
  // Brunei
  { id: 'maritime_networks', name: 'Maritime Trading Networks', track: 'economy', age: 0, year: 1451, cost: 20, only: ['brunei', 'malacca', 'majapahit', 'sulu', 'johor', 'aceh'], known: true, fx: { routes: 1 }, desc: 'Merchants of the straits know every harbour of the monsoon: +1 trade route.' },
  { id: 'tropical_shipbuilding', name: 'Tropical Shipbuilding', track: 'military', age: 0, year: 1460, cost: 26, only: ['brunei', 'malacca', 'majapahit', 'sulu'], fx: { navy: 1 }, desc: 'Hardwood hulls from the rainforest: +1 navy size.' },
  { id: 'riverine_logistics', name: 'Riverine Logistics', track: 'state', age: 0, year: 1465, cost: 26, only: ['brunei'], fx: { control: 1 }, desc: 'The rivers are the roads of Borneo: +1 control a year.' },
  { id: 'cannon_casting', name: 'Regional Cannon Casting', track: 'military', age: 0, year: 1470, cost: 30, only: ['brunei', 'malacca', 'majapahit', 'aceh'], fx: { battle: 0.04 }, desc: 'Bronze lantaka cast in the sultanate\'s own foundries: +4% battle strength.' },
  { id: 'forest_trade', name: 'Forest Trade Networks', track: 'economy', age: 1, year: 1490, cost: 32, only: ['brunei'], fx: { income: 0.06, np: 0.3 }, desc: 'Camphor, resins and hornbill from the inland peoples: +6% income, +0.3 nation points a year.' },
  // the generic pike-and-shot formation, for every realm with pikes and guns
  { id: 'pike_and_shot', name: 'Pike and Shot', track: 'military', age: 1, year: 1500, cost: 36, req: ['pike_square', 'firearms'], needs: ['iron', 'gunpowder'], desc: 'Pikemen and gunners in one formation: Pikemen + Arquebusiers → Pike and Shot.' },
];

/** National buildings: one of the realm's own in place of nothing generic (yields the game already reads). */
export const NATIONAL_BUILDINGS: (BuildingDef & { only: string[] })[] = [
  { id: 'qollqa', name: 'Qollqa Storehouses', group: 'internal', site: 'rural', cost: 30, turns: 2, salary: 0.3, icon: 'barrel', only: ['inca'], control: 2, rates: { military: 0.1 }, gives: ['+2 control a year here', '+0.1 Military cards a year'], desc: 'Rows of state storehouses on the hillside: armies and villages never starve.' },
  { id: 'tambo', name: 'Tambo', group: 'internal', site: 'rural', cost: 28, turns: 2, salary: 0.3, icon: 'tower', only: ['inca'], control: 3, gives: ['+3 control a year here'], desc: 'A royal waystation on the road: runners, soldiers and officials rest and move on.' },
  { id: 'andenes', name: 'Andenes', group: 'economy', site: 'rural', cost: 32, turns: 3, salary: 0.2, icon: 'wheat', only: ['inca'], gold: 1.5, gives: ['+1.5 ducats a year'], desc: 'Stone terraces climb the valley: maize and potatoes where there was only slope.' },
  { id: 'chinampa_farms', name: 'Chinampa Farms', group: 'economy', site: 'rural', cost: 30, turns: 2, salary: 0.2, icon: 'wheat', only: ['aztec', 'tlaxcala'], gold: 1.6, gives: ['+1.6 ducats a year'], desc: 'Floating fields on the lake: several harvests a year.' },
  { id: 'calmecac', name: 'Calmecac', group: 'internal', site: 'town', cost: 40, turns: 3, salary: 0.6, icon: 'book', only: ['aztec'], rates: { research: 0.15, military: 0.15 }, gives: ['+0.15 Research and +0.15 Military cards a year'], desc: 'The school of priests and commanders.' },
  { id: 'tribute_centre', name: 'Tribute Collection Centre', group: 'economy', site: 'town', cost: 36, turns: 2, salary: 0.5, icon: 'coin', only: ['aztec'], gold: 1.2, np: 0.2, gives: ['+1.2 ducats and +0.2 nation points a year'], desc: 'Where the tribute of the provinces is counted and sent on.' },
  { id: 'royal_armoury', name: 'Royal Armoury', group: 'internal', site: 'town', cost: 45, turns: 3, salary: 0.8, icon: 'anvil', only: ['castile', 'aragon'], rates: { military: 0.25 }, gives: ['+0.25 Military cards a year'], desc: 'The crown\'s own arms and armour, in its own halls.' },
  { id: 'casa_contratacion', name: 'Casa de Contratación', group: 'economy', site: 'town', cost: 60, turns: 3, salary: 1, tech: 'navigation', coastal: true, icon: 'anchor', only: ['castile'], gold: 2, rates: { economy: 0.15 }, gives: ['+2 ducats a year', '+0.15 Economy cards a year'], desc: 'The house of trade that rules the Indies fleets, from 1503.' },
  { id: 'frontier_fortress', name: 'Frontier Fortress', group: 'internal', site: 'rural', cost: 40, turns: 3, salary: 0.6, icon: 'tower', only: ['castile', 'aragon'], control: 3, rates: { military: 0.1 }, gives: ['+3 control a year here', '+0.1 Military cards a year'], desc: 'A castle on the old frontier, still manned.' },
  { id: 'imperial_arsenal', name: 'Imperial Arsenal', group: 'internal', site: 'town', cost: 50, turns: 3, salary: 1, icon: 'cannon', only: ['ming', 'qing'], rates: { military: 0.3 }, gives: ['+0.3 Military cards a year'], desc: 'Guns, crossbows and armour by the ten thousand.' },
  { id: 'examination_hall', name: 'Examination Hall', group: 'internal', site: 'town', cost: 45, turns: 3, salary: 0.8, icon: 'book', only: ['ming', 'korea', 'qing'], rates: { research: 0.25 }, np: 0.2, gives: ['+0.25 Research cards a year', '+0.2 nation points a year'], desc: 'Thousands of cells where candidates write for their future.' },
  { id: 'porcelain_kiln', name: 'Porcelain Kiln', group: 'economy', site: 'town', cost: 40, turns: 2, salary: 0.5, icon: 'cup', only: ['ming', 'qing'], gold: 2.2, gives: ['+2.2 ducats a year'], desc: 'Dragon kilns that fire for days: blue-and-white for the world.' },
  { id: 'river_port', name: 'River Port', group: 'economy', site: 'town', cost: 35, turns: 2, salary: 0.4, icon: 'anchor', only: ['brunei'], gold: 1.4, rates: { economy: 0.1 }, gives: ['+1.4 ducats a year', '+0.1 Economy cards a year'], desc: 'Stilt-houses and quays where the river meets the sea.' },
  { id: 'trading_house', name: 'Maritime Trading House', group: 'economy', site: 'town', cost: 42, turns: 3, salary: 0.6, coastal: true, icon: 'coin', only: ['brunei', 'malacca'], gold: 1.8, rates: { diplomacy: 0.1 }, gives: ['+1.8 ducats a year', '+0.1 Diplomacy cards a year'], desc: 'Factors of a dozen nations under one roof.' },
  { id: 'regional_foundry', name: 'Regional Foundry', group: 'internal', site: 'town', cost: 38, turns: 3, salary: 0.6, icon: 'anvil', only: ['brunei', 'malacca', 'majapahit'], rates: { military: 0.2 }, gives: ['+0.2 Military cards a year'], desc: 'Where the lantaka and the bronze kettles are cast.' },
];

/** What a national card does, read by src/engine/national.ts. Each is an effect the game already knows. */
export type NationalEffect =
  | { k: 'promote'; from: string[]; to: string; tech?: string }        // a troop of these types becomes `to`
  | { k: 'raise'; type: string; n: number; vet?: number; gold?: number; tech?: string } // new companies
  | { k: 'hasten'; turns: number; kinds?: string[] }                  // a task under way ends sooner
  | { k: 'refund'; share: number }                                     // part of a building under way paid back
  | { k: 'gold'; n: number } | { k: 'np'; n: number } | { k: 'prestige'; n: number }
  | { k: 'goods'; goods: Record<string, number> }                      // loads into the warehouses
  | { k: 'control'; n: number }                                        // in every province
  | { k: 'relations'; n: number }                                      // with a realm you know
  | { k: 'refill' }                                                    // troops at home back to full strength
  | { k: 'defend'; bonus: number; years: number; ground?: string[] };  // defending, here (or anywhere) for a while
export interface NationalCard { id: string; name: string; cat: 'military' | 'diplomacy' | 'internal' | 'economy' | 'research' | 'culture'; icon: string; text: string; only: string[]; fx: NationalEffect[]; weight?: number; }

export const NATIONAL_CARDS: NationalCard[] = [
  // Inca
  { id: 'imperial_road', name: 'Imperial Road Network', cat: 'internal', icon: 'map', only: ['inca'], text: 'Gangs on the Qhapaq Ñan: +6 control in every province.', fx: [{ k: 'control', n: 6 }] },
  { id: 'chasqui', name: 'Chasqui Messengers', cat: 'internal', icon: 'boot', only: ['inca'], text: 'Relay runners carry the order: a task under way ends 1 season sooner.', fx: [{ k: 'hasten', turns: 1 }] },
  { id: 'mita_labour', name: "Mit'a Labour", cat: 'economy', icon: 'hammer', only: ['inca'], text: 'Villages owe the state their labour: 40% of a building under way is paid back.', fx: [{ k: 'refund', share: 0.4 }] },
  { id: 'highland_ambush', name: 'Highland Ambush', cat: 'military', icon: 'tower', only: ['inca'], text: 'For a year, your armies defending hills or mountains fight 20% stronger.', fx: [{ k: 'defend', bonus: 0.2, years: 1, ground: ['hills', 'mountains'] }] },
  { id: 'imperial_storehouses', name: 'Imperial Storehouses', cat: 'military', icon: 'barrel', only: ['inca'], text: 'The qollqa open: troops at home back to full strength, +3 stores.', fx: [{ k: 'refill' }, { k: 'goods', goods: { stores: 3 } }] },
  { id: 'elite_guard', name: 'Elite Guard', cat: 'military', icon: 'shield', only: ['inca'], text: 'Raise a company of the Inca Imperial Guard (needs Imperial Garrisons, 30 ducats).', fx: [{ k: 'raise', type: 'inca_guard', n: 1, vet: 1, gold: 30, tech: 'imperial_garrisons' }] },
  // Aztec
  { id: 'jaguar_promotion', name: 'Jaguar Warrior Promotion', cat: 'military', icon: 'helm', only: ['aztec', 'tlaxcala'], text: 'A company of Macuahuitl Warriors that took its captives joins the Jaguar society (needs Warrior Societies).', fx: [{ k: 'promote', from: ['macuahuitl_warriors'], to: 'jaguar_warriors', tech: 'warrior_societies' }] },
  { id: 'eagle_promotion', name: 'Eagle Warrior Promotion', cat: 'military', icon: 'helm', only: ['aztec', 'tlaxcala'], text: 'A company of Macuahuitl Warriors joins the Eagle society (needs Warrior Societies).', fx: [{ k: 'promote', from: ['macuahuitl_warriors'], to: 'eagle_warriors', tech: 'warrior_societies' }] },
  { id: 'tribute_demands', name: 'Tribute Demands', cat: 'economy', icon: 'coin', only: ['aztec'], text: 'The provinces send their tribute early: +35 ducats.', fx: [{ k: 'gold', n: 35 }] },
  { id: 'tlatelolco', name: 'Great Market of Tlatelolco', cat: 'economy', icon: 'coin', only: ['aztec'], text: 'Sixty thousand traders in a day: +20 ducats, +2 cloth, +2 luxuries.', fx: [{ k: 'gold', n: 20 }, { k: 'goods', goods: { cloth: 2, luxuries: 2 } }] },
  { id: 'warrior_training', name: 'Warrior Training', cat: 'military', icon: 'banner', only: ['aztec', 'tlaxcala'], text: 'The houses of youth send their best: two companies of Macuahuitl Warriors.', fx: [{ k: 'raise', type: 'macuahuitl_warriors', n: 2, gold: 20 }] },
  { id: 'lake_agriculture', name: 'Lake Agriculture', cat: 'internal', icon: 'wheat', only: ['aztec', 'tlaxcala'], text: 'New chinampas on the lake: +4 food.', fx: [{ k: 'goods', goods: { food: 4 } }] },
  // Castile
  { id: 'jinetes_card', name: 'Jinetes', cat: 'military', icon: 'horse', only: ['castile', 'aragon'], text: 'The light horse of the frontier: two companies of Jinetes (25 ducats).', fx: [{ k: 'raise', type: 'jinetes', n: 2, gold: 25 }] },
  { id: 'gonzalo_reforms', name: "Gonzalo's Reforms", cat: 'military', icon: 'banner', only: ['castile', 'aragon'], text: 'The Great Captain mixes pike and shot: Pikemen or Arquebusiers become Pike and Shot (needs Pike and Shot).', fx: [{ k: 'promote', from: ['pikemen', 'arquebusiers'], to: 'pike_and_shot', tech: 'pike_and_shot' }] },
  { id: 'raise_tercio', name: 'Raise a Tercio', cat: 'military', icon: 'tercio', only: ['castile', 'aragon'], text: 'A Pike and Shot company is made a Tercio (needs Tercio Doctrine).', fx: [{ k: 'promote', from: ['pike_and_shot'], to: 'tercio', tech: 'tercio_doctrine' }] },
  { id: 'tercio_viejo', name: 'Tercio Viejo', cat: 'military', icon: 'tercio', only: ['castile', 'aragon'], text: 'A veteran Tercio takes up muskets: it becomes a Tercio Viejo (needs Musket).', fx: [{ k: 'promote', from: ['tercio'], to: 'old_tercio', tech: 'musket' }] },
  { id: 'royal_expedition', name: 'Royal Expedition', cat: 'diplomacy', icon: 'ship', only: ['castile', 'portugal'], text: 'The crown backs the voyage: a voyage, colony or conquest under way ends 2 seasons sooner.', fx: [{ k: 'hasten', turns: 2, kinds: ['explore', 'colonize', 'conquista'] }] },
  { id: 'imperial_convoy', name: 'Imperial Convoy', cat: 'economy', icon: 'anchor', only: ['castile'], text: 'The fleet comes in safe: +40 ducats.', fx: [{ k: 'gold', n: 40 }] },
  // Ming
  { id: 'imperial_exam_card', name: 'Imperial Examination', cat: 'research', icon: 'book', only: ['ming', 'qing'], text: 'A new class of officials passes: +2 nation points, +1 prestige.', fx: [{ k: 'np', n: 2 }, { k: 'prestige', n: 1 }] },
  { id: 'mobilize_garrisons', name: 'Mobilize the Garrisons', cat: 'military', icon: 'spear', only: ['ming', 'qing'], text: 'The border garrisons march: two companies of Ming Spearmen (15 ducats).', fx: [{ k: 'raise', type: 'ming_spearmen', n: 2, gold: 15 }] },
  { id: 'canal_convoy', name: 'Grand Canal Convoy', cat: 'economy', icon: 'anchor', only: ['ming', 'qing'], text: 'The grain fleet arrives in Beijing: +30 ducats, +3 food.', fx: [{ k: 'gold', n: 30 }, { k: 'goods', goods: { food: 3 } }] },
  { id: 'imperial_workshop', name: 'Imperial Workshop', cat: 'economy', icon: 'anvil', only: ['ming', 'qing'], text: 'The arsenals send stores: +3 weapons, +2 gunpowder.', fx: [{ k: 'goods', goods: { weapons: 3, gunpowder: 2 } }] },
  { id: 'frontier_defence', name: 'Frontier Defence', cat: 'military', icon: 'tower', only: ['ming', 'qing', 'korea'], text: 'For a year, your armies defending your provinces fight 15% stronger.', fx: [{ k: 'defend', bonus: 0.15, years: 1 }] },
  // Brunei
  { id: 'monsoon_trade', name: 'Monsoon Trade', cat: 'economy', icon: 'anchor', only: ['brunei', 'malacca', 'majapahit'], text: 'The monsoon brings the fleets: +30 ducats.', fx: [{ k: 'gold', n: 30 }] },
  { id: 'maritime_tribute', name: 'Maritime Tribute', cat: 'diplomacy', icon: 'crown', only: ['brunei'], text: 'Island chiefs send tribute to the sultan: +15 ducats, +3 prestige.', fx: [{ k: 'gold', n: 15 }, { k: 'prestige', n: 3 }] },
  { id: 'forest_scouts', name: 'Forest Scouts', cat: 'diplomacy', icon: 'eye', only: ['brunei'], text: 'Guides from the inland peoples: a task under way ends 1 season sooner.', fx: [{ k: 'hasten', turns: 1 }] },
  { id: 'merchant_envoys', name: 'Merchant Envoys', cat: 'diplomacy', icon: 'scroll', only: ['brunei', 'malacca'], text: 'Merchants carry the sultan\'s letters: relations +15 with a realm you know.', fx: [{ k: 'relations', n: 15 }] },
  { id: 'naval_expedition', name: 'Regional Naval Expedition', cat: 'military', icon: 'ship', only: ['brunei', 'malacca', 'majapahit'], text: 'Two lancaran join the fleet (20 ducats).', fx: [{ k: 'raise', type: 'lancaran', n: 2, gold: 20 }] },
];

/** A national strength: the realm's own lasting advantage, read like a technology's effects. */
export const NATIONAL_FX: Record<string, { name: string; text: string; fx: TechFx }> = {
  inca: { name: 'Masters of the Andes', text: '+1 control a year, buildings 5% cheaper', fx: { control: 1, build: 0.05 } },
  aztec: { name: 'The Triple Alliance', text: '+4% in battle, more prestige', fx: { battle: 0.04, prestige: 0.3 } },
  castile: { name: 'Professional Warfare', text: '+3% in battle, upkeep 4% lower', fx: { battle: 0.03, upkeep: 0.04 } },
  ming: { name: 'The Celestial Empire', text: 'faster research, +4% income', fx: { research: 0.5, income: 0.04 } },
  brunei: { name: 'Masters of Maritime Trade', text: '+1 trade route, +4% income', fx: { routes: 1, income: 0.04 } },
};

/** A short historical introduction for a realm's page and the realm picker. Realms without one get a line from
 *  their heritage (src/engine/national.ts). */
export const NATIONAL_INTRO: Record<string, string> = {
  inca: 'Tawantinsuyu, the Four Quarters: a young empire that is binding the Andes together with roads, storehouses and knotted-cord records. It knows no iron and no horse, but no state in the world moves grain and men across mountains as well.',
  aztec: 'The Triple Alliance of Tenochtitlan, Texcoco and Tlacopan rules the Valley of Mexico from a city on a lake. Its strength is tribute, markets and warriors who rise by the captives they take.',
  castile: 'The crown of Castile, still at war with Granada after seven centuries of frontier. Its soldiers are hardened, its nobles restless, and its ships are about to look west.',
  ming: 'The Great Ming rules the largest and best-administered state on earth, with gunpowder, examinations and a canal that feeds the capital. Its challenge is to keep so vast a realm working.',
  brunei: 'A sultanate of rivers and harbours on Borneo, rich from the monsoon trade in camphor, spices and porcelain. Its power is in its ships, its merchants and its bronze guns.',
};
