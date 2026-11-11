// Mission mode: a realm, a deadline and a few goals. Lands are named by who held them in 1451.
import type { Goal } from '../types';

export interface MissionDef {
  id: string; name: string; icon: string; start: number; deadline: number;
  nations: string[];      // who may play it
  text: string; goals: Goal[];
  wild?: boolean;         // not history: just for fun
  beginner?: string;      // a first mission: what it teaches
  cards?: string[];       // cards handed over at the start, so the lesson can begin at once
  gold?: number;          // ducats handed over at the start
  steps?: { g: Goal; hint: string }[]; // guided: done in order, each with a hint
}

const NEW_WORLD = ['caribbean', 'mexico', 'north_america', 'brazil', 'andes', 'plata'];
const ITALY = ['venice', 'milan', 'florence', 'naples', 'papacy', 'genoa', 'savoy', 'ferrara', 'mantua', 'siena', 'lucca', 'montferrat', 'urbino', 'modena'];
const AFRICA = ['west_africa', 'central_africa', 'east_africa', 'southern_africa', 'north_africa'];

export const MISSIONS: MissionDef[] = [
  // ---------- beginner missions: short, one system each; they unlock the rest ----------
  { id: 'b_constantinople', name: 'The Red Apple', icon: 'sword', start: 1451, deadline: 1465, nations: ['ottomans'], cards: ['march_orders', 'march_orders'], beginner: 'War: March Orders, troops and sieges',
    text: 'Take Constantinople. Send a general with troops using a March Orders card (Military), and bring cannon for the walls.',
    goals: [{ k: 'own', provinces: ['constantinople'] }] },
  { id: 'b_navarre', name: 'A Royal Wedding', icon: 'ring', start: 1451, deadline: 1480, nations: ['castile'], cards: ['marriage', 'fealty', 'embassy'], beginner: 'Diplomacy: relations, marriage, vassals',
    text: 'Bring Navarre under your crown without a war: improve relations, marry your houses, then make it your subject (Diplomacy cards and a diplomat).',
    goals: [{ k: 'subjects', of: ['navarre'] }] },
  { id: 'b_court', name: 'A Court of Talents', icon: 'people', start: 1451, deadline: 1461, nations: ['portugal'], beginner: 'People: hiring, roles and rarity',
    text: 'Gather able people. Buy person cards in any deck (nation points), meet three candidates and keep the best.',
    goals: [{ k: 'court', n: 8 }] },
  { id: 'b_trade', name: 'Merchants of the Lagoon', icon: 'coin', start: 1451, deadline: 1461, nations: ['venice'], cards: ['export_contract', 'export_contract', 'import_contract'], beginner: 'Economy: goods, trade routes and trade posts',
    text: 'Sell what you have too much of. Open trade routes from Economy → Goods with Import and Export Contract cards and a merchant.',
    goals: [{ k: 'routes', n: 2 }] },
  { id: 'b_army', name: 'The Sword Hunt', icon: 'helm', start: 1600, deadline: 1612, nations: ['japan'], cards: ['hire_infantry', 'hire_ranged', 'hire_cavalry'], beginner: 'Troops: hiring companies, the Forge and recipes',
    text: 'Japan is one at last: turn its samurai into one army. Hire companies with troop cards (Military), and merge two of a kind in the Forge to make a stronger one.',
    goals: [{ k: 'companies', n: 15 }] },
  { id: 'b_develop', name: 'The Road of the Inca', icon: 'tower', start: 1451, deadline: 1475, nations: ['inca'], gold: 200, cards: ['settlers', 'settlers', 'irrigation', 'grow_settlement'], beginner: 'Your land: development, settlements and growth',
    text: 'Bind the mountains with roads and terraces. Develop provinces and grow your towns with Settlers, Irrigation and Grow your Settlement cards.',
    goals: [{ k: 'devGain', n: 4 }] },
  { id: 'b_build', name: 'The Builder King', icon: 'hammer', start: 1600, deadline: 1620, nations: ['benin', 'kongo', 'ethiopia'], cards: ['royal_works', 'guild_charter', 'guild_charter'], beginner: 'Buildings: cost, benefit and upkeep',
    text: 'Raise three buildings. Tap a province, compare cost and benefit, and build with a Royal Works or Guild Charter card.',
    goals: [{ k: 'built', n: 3 }] },
  { id: 'b_art', name: 'Patron of the Arts', icon: 'quill', start: 1600, deadline: 1612, nations: ['papacy', 'florence'], cards: ['patronage'], beginner: 'People and culture: artists and works of art',
    text: 'Commission a work of art. A courtier or artist with a Commission card (People deck) paints, writes or builds it.',
    goals: [{ k: 'works', n: 1 }] },
  { id: 'b_research', name: 'The Academy', icon: 'book', start: 1700, deadline: 1725, nations: ['france'], cards: ['study_military', 'study_economy', 'study_state', 'collaboration'], beginner: 'Research: technologies and scholars',
    text: 'Research two technologies. Pick one in Research → Technologies and send a scholar with a study card; a Collaboration card lets a second scholar help.',
    goals: [{ k: 'newTechs', n: 2 }] },

  { id: 'golden_age', name: "Spain's Golden Age", icon: 'crown', start: 1451, deadline: 1520, nations: ['castile', 'aragon'],
    text: 'Unite the crowns of Iberia, finish the Reconquista and plant your banner across the Ocean Sea.',
    goals: [{ k: 'ownLands', of: ['castile', 'aragon', 'granada', 'navarre'], label: 'Spain united: Castile, Aragon, Granada and Navarre (yours or your subjects\')' }, { k: 'colonies', n: 1, regions: NEW_WORLD }] },
  { id: 'conqueror', name: 'The Conqueror', icon: 'sword', start: 1451, deadline: 1530, nations: ['ottomans'],
    text: 'Take the City of the Caesars, then march up the Danube until Christendom trembles.',
    goals: [{ k: 'own', provinces: ['constantinople', 'belgrade', 'buda', 'vienna'] }] },
  { id: 'sea_road', name: 'The Sea Road to India', icon: 'anchor', start: 1451, deadline: 1510, nations: ['portugal'],
    text: 'Round Africa, reach the Indies by sea, and open the spice trade to Lisbon.',
    goals: [{ k: 'discover', regions: ['india'] }, { k: 'posts', n: 2, regions: ['india', 'east_africa', 'east_indies'] }] },
  { id: 'lion_st_mark', name: 'Lion of St Mark', icon: 'coin', start: 1451, deadline: 1550, nations: ['venice'],
    text: 'Grow rich on trade and keep the Turk out of Italy. Gold, not swords.',
    goals: [{ k: 'income', top: 5 }, { k: 'posts', n: 3 }, { k: 'noneIn', nation: 'ottomans', of: ITALY, label: 'No Ottoman province in Italy' }] },
  { id: 'third_rome', name: 'The Third Rome', icon: 'church', start: 1451, deadline: 1550, nations: ['muscovy'],
    text: 'Throw off the Tatar yoke, swallow Novgorod and rule the Rus.',
    goals: [{ k: 'independent' }, { k: 'ownLands', of: ['novgorod'], label: 'All the lands of Novgorod' }, { k: 'provinces', n: 30 }] },
  { id: 'aeiou', name: 'A.E.I.O.U.', icon: 'ring', start: 1451, deadline: 1530, nations: ['austria'],
    text: 'Let others wage war; you, happy Austria, marry. Gain Bohemia and Hungary.',
    goals: [{ k: 'subjects', of: ['bohemia', 'hungary'] }] },
  { id: 'treasure_fleets', name: 'The Treasure Fleets', icon: 'ship', start: 1451, deadline: 1550, nations: ['ming'],
    text: 'Send the great junks west again and stay the first power under Heaven.',
    goals: [{ k: 'discover', regions: ['east_africa', 'india'] }, { k: 'rank', top: 1 }] },
  { id: 'gold_mali', name: 'The Gold of Mali', icon: 'coin', start: 1451, deadline: 1550, nations: ['mali'],
    text: 'Restore the empire of Mansa Musa: wide lands and the richest treasury in Africa.',
    goals: [{ k: 'provinces', n: 15 }, { k: 'income', top: 1, regions: AFRICA }] },
  { id: 'fifth_sun', name: 'The Fifth Sun', icon: 'star', start: 1451, deadline: 1600, nations: ['aztec', 'inca'],
    text: 'Strangers will come from the sea. Learn fast, and still rule from your own capital in 1600.',
    goals: [{ k: 'capital' }, { k: 'techs', n: 12 }] },

  // ---------- 1600 ----------
  { id: 'dutch_golden_age', name: 'The Dutch Golden Age', icon: 'coin', start: 1600, deadline: 1650, nations: ['netherlands'],
    text: 'Win your freedom from Spain, then make Amsterdam the warehouse of the world.',
    goals: [{ k: 'independent' }, { k: 'income', top: 3 }, { k: 'posts', n: 4 }, { k: 'colonies', n: 2 }] },
  { id: 'lion_north', name: 'Lion of the North', icon: 'crown', start: 1600, deadline: 1660, nations: ['sweden'],
    text: 'Turn the Baltic into a Swedish lake and stand among the great powers.',
    goals: [{ k: 'own', provinces: ['riga', 'reval', 'ingria', 'stettin', 'scania'], label: 'The Baltic shores: Riga, Reval, Ingria, Stettin and Scania' }, { k: 'army', top: 5 }] },
  { id: 'akbar', name: "Akbar's Empire", icon: 'star', start: 1600, deadline: 1660, nations: ['mughals'],
    text: 'Bring the whole of Hindustan, from the Indus to the Deccan, under the Peacock Throne.',
    goals: [{ k: 'provinces', n: 75 }, { k: 'rank', top: 3 }] },
  { id: 'rule_waves', name: 'Rule the Waves', icon: 'anchor', start: 1600, deadline: 1700, nations: ['england'],
    text: 'Beat the Armada\'s heirs at sea and plant colonies on every ocean.',
    goals: [{ k: 'navy', top: 1 }, { k: 'colonies', n: 8 }] },
  { id: 'long_war', name: 'The Long Turkish War', icon: 'sword', start: 1600, deadline: 1700, nations: ['austria'],
    text: 'Drive the Turk out of Hungary and down the Danube.',
    goals: [{ k: 'own', provinces: ['buda', 'belgrade'] }, { k: 'techs', n: 45 }] },

  // ---------- 1700 ----------
  { id: 'liberte', name: 'Liberté', icon: 'torch', start: 1700, deadline: 1795, nations: ['france'],
    text: 'Make France the most learned nation on earth, then let the people overthrow the old order.',
    goals: [{ k: 'techs', n: 66 }, { k: 'gov', gov: 'republic' }] },
  { id: 'thirteen', name: 'Join or Die', icon: 'banner', start: 1700, deadline: 1810, nations: ['thirteen_colonies'],
    text: 'Break free of the English crown and become one of the great military powers.',
    goals: [{ k: 'independent' }, { k: 'army', top: 10 }, { k: 'provinces', n: 12 }] },
  { id: 'prussia_rise', name: 'An Army with a State', icon: 'helm', start: 1700, deadline: 1760, nations: ['brandenburg'],
    text: 'From a scattered electorate to a great power: drill, discipline and Silesia.',
    goals: [{ k: 'army', top: 5 }, { k: 'provinces', n: 15 }] },
  { id: 'peter', name: 'A Window on the West', icon: 'ship', start: 1700, deadline: 1730, nations: ['muscovy'],
    text: 'Take a port on the Baltic, build a fleet and catch up with the West.',
    goals: [{ k: 'own', provinces: ['ingria', 'reval', 'riga'], label: 'The Baltic ports: Ingria, Reval and Riga' }, { k: 'navy', top: 5 }, { k: 'techs', n: 55 }] },
  { id: 'maratha_rise', name: 'Hindavi Swarajya', icon: 'sword', start: 1700, deadline: 1770, nations: ['marathas'],
    text: 'Drive the Mughals from the Deccan and raise the saffron flag over Delhi.',
    goals: [{ k: 'own', provinces: ['delhi', 'agra'] }, { k: 'provinces', n: 25 }] },
  { id: 'kangxi', name: 'The High Qing', icon: 'crown', start: 1700, deadline: 1780, nations: ['qing'],
    text: 'Rule the largest and richest realm under Heaven for a century of peace.',
    goals: [{ k: 'rank', top: 1 }, { k: 'provinces', n: 90 }, { k: 'income', top: 1 }] },

  // ---------- wild ones: not history, just for fun ----------
  { id: 'abubakari', name: "Abubakari's Fleet", icon: 'ship', start: 1451, deadline: 1560, nations: ['mali', 'songhai'], wild: true,
    text: 'Legend says a Mansa of Mali sailed west with two thousand boats. Finish what he started.',
    goals: [{ k: 'discover', regions: ['caribbean', 'brazil'] }, { k: 'colonies', n: 3, regions: ['caribbean', 'brazil', 'mexico', 'north_america', 'andes', 'plata'] }] },
  { id: 'aztec_armada', name: 'The Aztec Armada', icon: 'anchor', start: 1451, deadline: 1620, nations: ['aztec', 'inca'], wild: true,
    text: 'Why wait for the Spaniards? Cross the ocean first and plant your gods in Europe.',
    goals: [{ k: 'discover', regions: ['europe'] }, { k: 'holdIn', regions: ['europe'], n: 2, label: '2 provinces in Europe' }, { k: 'capital' }] },
  { id: 'rome_reborn', name: 'Rome Reborn', icon: 'crown', start: 1451, deadline: 1560, nations: ['byzantium'], wild: true,
    text: 'The City survives the siege, and the Emperor remembers the old borders.',
    goals: [{ k: 'own', provinces: ['constantinople', 'rome', 'alexandria', 'jerusalem'] }, { k: 'provinces', n: 40 }] },
  { id: 'swiss_navy', name: 'The Swiss Navy', icon: 'ship', start: 1451, deadline: 1600, nations: ['swiss'], wild: true,
    text: 'Landlocked? A detail. The finest navy in Europe will fly the white cross.',
    goals: [{ k: 'navy', top: 3 }, { k: 'colonies', n: 2 }] },
  { id: 'irish_revenge', name: "Ireland's Revenge", icon: 'sword', start: 1451, deadline: 1600, nations: ['ireland'], wild: true,
    text: 'Cross the Irish Sea the other way for once.',
    goals: [{ k: 'own', provinces: ['london'] }, { k: 'provinces', n: 15 }] },
  { id: 'ethiopia_crusade', name: 'Prester John Rides', icon: 'church', start: 1451, deadline: 1580, nations: ['ethiopia'], wild: true,
    text: 'Europe dreamed of a Christian king beyond Egypt. Be him: march to Jerusalem.',
    goals: [{ k: 'own', provinces: ['jerusalem', 'cairo'] }, { k: 'holdIn', regions: ['middle_east'], n: 6, label: '6 provinces in the Middle East' }] },
  { id: 'african_world', name: 'The Empire of Three Continents', icon: 'star', start: 1600, deadline: 1750, nations: ['morocco', 'ethiopia', 'kongo', 'oyo', 'benin', 'mali'], wild: true,
    text: 'An African empire with lands in Europe and Asia. The Ottomans did it the other way round.',
    goals: [{ k: 'holdIn', regions: ['west_africa', 'central_africa', 'east_africa', 'southern_africa', 'north_africa'], n: 20, label: '20 provinces in Africa' }, { k: 'holdIn', regions: ['europe'], n: 3, label: '3 provinces in Europe' }, { k: 'holdIn', regions: ['middle_east', 'india', 'china', 'east_indies', 'central_asia'], n: 3, label: '3 provinces in Asia' }] },
  { id: 'japan_australia', name: 'The Southern Land of the Rising Sun', icon: 'anchor', start: 1600, deadline: 1720, nations: ['japan'], wild: true,
    text: 'Forget the closed country. Sail south and settle the great southern continent before any European.',
    goals: [{ k: 'discover', regions: ['oceania'] }, { k: 'colonies', n: 3, regions: ['oceania'] }, { k: 'navy', top: 5 }] },
  { id: 'papal_empire', name: 'The Pope Goes West', icon: 'church', start: 1700, deadline: 1810, nations: ['papacy'], wild: true,
    text: 'Ten thousand armed priests and a fleet of galleons. The Vatican wants its share of the world.',
    goals: [{ k: 'provinces', n: 30 }, { k: 'colonies', n: 5 }, { k: 'army', top: 10 }] },
  { id: 'colonies_strike', name: 'The Colonies Strike Back', icon: 'banner', start: 1700, deadline: 1810, nations: ['thirteen_colonies'], wild: true,
    text: 'Independence is not enough. Take London itself.',
    goals: [{ k: 'independent' }, { k: 'own', provinces: ['london'] }] },
  { id: 'mughal_europe', name: 'The Mughal Grand Tour', icon: 'crown', start: 1700, deadline: 1800, nations: ['mughals'], wild: true,
    text: 'Aurangzeb\'s heirs fancy a palace on the Bosphorus and a summer house in Vienna.',
    goals: [{ k: 'own', provinces: ['constantinople', 'vienna'] }] },
];
// ---------- the beginner missions, step by step ----------
const STEPS: Record<string, { cards?: string[]; deadline?: number; steps: { g: Goal; hint: string }[] }> = {
  b_constantinople: { cards: ['hire_infantry', 'march_orders', 'march_orders', 'move_capital'], deadline: 1470, steps: [
    { g: { k: 'hired', n: 1 }, hint: 'Military → Cards: tap Hire Infantry and pick a general to train them. Each company costs 1 manpower and some ducats.' },
    { g: { k: 'atWar', with: 'byzantium' }, hint: 'Tap Constantinople on the map and choose Declare war. Going to war gives you March Orders cards.' },
    { g: { k: 'own', provinces: ['constantinople'], label: 'Take Constantinople' }, hint: 'Play March Orders (Military → Cards): choose a general and the troops standing near the city, and attack. Cannon help against the great walls.' },
    { g: { k: 'gone', nation: 'byzantium' }, hint: 'Taken provinces are only occupied until peace. Once Constantinople is yours and their army is beaten, Byzantium surrenders and you set the terms: pick "Annex Byzantium". If they still have troops, send your Peace Envoy (Diplomacy → Cards).' },
    { g: { k: 'capitalAt', province: 'constantinople' }, hint: 'Tap Constantinople and choose Move the capital here (it uses your Move the Capital card).' },
  ] },
  b_navarre: { cards: ['embassy', 'marriage', 'marriage', 'fealty', 'fealty'], steps: [
    { g: { k: 'relation', with: 'navarre', n: 40 }, hint: 'Diplomacy → Cards: play the Embassy card and send a diplomat to Navarre. Each embassy improves relations.' },
    { g: { k: 'treaty', with: 'navarre', kind: 'marriage' }, hint: 'Play the Royal Marriage card with a diplomat: married houses trust each other, and one day may share a crown.' },
    { g: { k: 'subjects', of: ['navarre'] }, hint: 'Play Demand Fealty: with good relations and a far stronger realm, Navarre accepts you as overlord.' },
  ] },
  b_court: { cards: ['embassy'], steps: [
    { g: { k: 'court', n: 8 }, hint: 'Open any panel → Cards → Buy a person card (it costs nation points). Meet three candidates and keep one: rarer people are better at their missions.' },
    { g: { k: 'launched', kind: 'relations', label: 'Send someone on a mission' }, hint: 'People act through missions: play the Embassy card (Diplomacy) and choose a diplomat to send to a neighbour.' },
  ] },
  b_trade: { steps: [
    { g: { k: 'route', dir: 'sell', n: 1 }, hint: 'Economy → Goods: find a good with spare (green) and press Sell. A merchant opens the route with an Export Contract.' },
    { g: { k: 'route', dir: 'buy', n: 1 }, hint: 'Find a good you lack (red) and press Buy: an Import Contract brings it in every season.' },
  ] },
  b_build: { steps: [
    { g: { k: 'built', n: 1 }, hint: 'Tap one of your provinces: each building shows its Cost and its Benefit. Build with a Guild Charter (Economy) or Royal Works (Internal) card.' },
    { g: { k: 'built', n: 2 }, hint: 'A second building: markets, farms and mines pay for themselves; temples keep people content.' },
    { g: { k: 'built', n: 3 }, hint: 'One more. Watch the upkeep: every building pays a salary each year.' },
  ] },
  b_art: { steps: [
    { g: { k: 'launched', kind: 'artwork', label: 'Commission a work of art' }, hint: 'People → Cards: play Commission a Work of Art and send a courtier or an artist. A courtier who paints becomes an artist for good.' },
    { g: { k: 'works', n: 1 }, hint: 'Wait while it is made: a better artist makes a finer work, which pleases the people and adds prestige.' },
  ] },
  b_research: { cards: ['hire_researcher'], steps: [
    { g: { k: 'launched', kind: 'research', label: 'Start a study' }, hint: 'Research → Technologies: tap a technology and send a scholar with a study card. Each card shows its points and what it unlocks.' },
    { g: { k: 'launched', kind: 'assist', label: 'Add a second scholar' }, hint: 'Hire a second scholar (Invite a Scholar card), then play Collaboration: they help the study already under way.' },
    { g: { k: 'newTechs', n: 1 }, hint: 'Wait for the study to finish: end a few turns.' },
    { g: { k: 'newTechs', n: 2 }, hint: 'Start the next study as soon as a scholar is free.' },
  ] },
  b_army: { steps: [
    { g: { k: 'hired', n: 1 }, hint: 'Military → Cards: tap a troop card (Hire Infantry, Ranged or Cavalry). It hires the best unit of that kind you have researched.' },
    { g: { k: 'forged', n: 1 }, hint: 'Military → Cards → Forge: pick two companies of the same kind; they merge into one stronger company and free a place in your army.' },
    { g: { k: 'companies', n: 15 }, hint: 'Grow the army to 15 companies: buy troop cards with nation points if you run out.' },
  ] },
  b_develop: { steps: [
    { g: { k: 'launched', kind: 'develop', label: 'Start developing a province' }, hint: 'Internal → Cards: play Settlers and send an administrator to a province. Development means more taxes, men and goods.' },
    { g: { k: 'devGain', n: 1 }, hint: 'Wait for the settlers to arrive (two years). Irrigation (Economy) develops a province too.' },
    { g: { k: 'launched', kind: 'grow', label: 'Grow a town' }, hint: 'Play Grow your Settlement: a village becomes a town, a town a city, with room for more buildings.' },
    { g: { k: 'devGain', n: 4 }, hint: 'Keep developing until you have gained 4 development.' },
  ] },
};
for (const m of MISSIONS) {
  const x = STEPS[m.id];
  if (!x) continue;
  m.steps = x.steps;
  m.goals = x.steps.map(st => st.g);
  if (x.cards) m.cards = [...(m.cards ?? []), ...x.cards.filter(c => !(m.cards ?? []).includes(c))];
  if (x.deadline) m.deadline = x.deadline;
}

export const MISSION: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map(m => [m.id, m]));

/** Regions a custom goal can name. */
export const GOAL_REGIONS = ['caribbean', 'north_america', 'mexico', 'brazil', 'andes', 'plata', 'west_africa', 'central_africa', 'southern_africa', 'east_africa', 'india', 'east_indies', 'china', 'siberia', 'oceania', 'europe', 'middle_east', 'north_africa', 'russia', 'central_asia'];
