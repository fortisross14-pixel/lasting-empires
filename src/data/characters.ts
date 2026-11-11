import type { Role, Rarity } from '../types';

export const FIRST_NAMES: Record<string, string[]> = {
  castilian: ['Álvaro', 'Rodrigo', 'Gonzalo', 'Diego', 'Pedro', 'Juan', 'Íñigo', 'Beltrán', 'Fadrique', 'Gutierre', 'Alonso', 'Hernando', 'Luis', 'García', 'Martín', 'Francisco', 'Lope', 'Sancho', 'Beatriz', 'Leonor'],
  portuguese: ['Afonso', 'Duarte', 'Fernão', 'Vasco', 'Nuno', 'Rui', 'Gonçalo', 'Pêro', 'Diogo', 'João', 'Martim', 'Bartolomeu', 'Tristão', 'Lopo', 'Brites', 'Isabel'],
  aragonese: ['Jaume', 'Pere', 'Bernat', 'Ramon', 'Joan', 'Francesc', 'Galceran', 'Berenguer', 'Jordi', 'Lluís', 'Hug', 'Guillem', 'Ferran', 'Blasco', 'Violant', 'Elisenda'],
};

export const SURNAMES: Record<string, string[]> = {
  castilian: ['de Mendoza', 'Ponce de León', 'de Guzmán', 'Pacheco', 'de Velasco', 'Manrique', 'de Zúñiga', 'Enríquez', 'de la Cueva', 'Osorio', 'Pimentel', 'de Ávila', 'de Toledo', 'Carrillo', 'Girón', 'de Quiñones'],
  portuguese: ['de Almeida', 'da Silva', 'de Meneses', 'Coutinho', 'Pereira', 'de Sousa', 'de Castro', 'de Noronha', 'Pacheco', 'Mascarenhas', 'de Ataíde', 'Cabral', 'de Brito', 'Correia'],
  aragonese: ['de Cardona', 'de Requesens', 'de Moncada', 'de Centelles', 'de Urrea', 'de Luna', "d'Híxar", 'de Rocabertí', 'Folch', 'de Pinós', 'Desvalls', 'de Borja', 'Margarit'],
};

export interface RarityDef { id: Rarity; name: string; skill: number; mult: number; traits: number; weight: number; }
/** Rarity sets a character's skill and how strong their traits are. */
export const RARITY: Record<Rarity, RarityDef> = {
  common:    { id: 'common', name: 'Common', skill: 2, mult: 1, traits: 1, weight: 45 },
  uncommon:  { id: 'uncommon', name: 'Uncommon', skill: 3, mult: 1.25, traits: 1, weight: 30 },
  rare:      { id: 'rare', name: 'Rare', skill: 4, mult: 1.5, traits: 2, weight: 17 },
  epic:      { id: 'epic', name: 'Epic', skill: 5, mult: 1.75, traits: 2, weight: 7 },
  legendary: { id: 'legendary', name: 'Legendary', skill: 6, mult: 2, traits: 3, weight: 0 },
};
export interface OutcomeDef { id: number; name: string; mult: number; tone: 'good' | 'bad' | 'neutral'; }
/** Mission results, from worst to best. */
export const OUTCOMES: OutcomeDef[] = [
  { id: 0, name: 'Poor', mult: 0.6, tone: 'bad' },
  { id: 1, name: 'Standard', mult: 1, tone: 'neutral' },
  { id: 2, name: 'Good', mult: 1.3, tone: 'good' },
  { id: 3, name: 'Great', mult: 1.7, tone: 'good' },
  { id: 4, name: 'Exceptional', mult: 2.5, tone: 'good' },
];
/** Chance (%) of each outcome by the rarity of the person assigned. */
export const OUTCOME_ODDS: Record<Rarity, number[]> = {
  common:    [30, 55, 13, 2, 0],
  uncommon:  [20, 55, 20, 4.99, 0.01],
  rare:      [12, 48, 30, 9.9, 0.1],
  epic:      [6, 37, 37, 18, 2],
  legendary: [2, 18, 35, 25, 20],
};

/** How many companies a commander can lead into one battle, by skill: ordinary 3, legendary 8. */
export const commandOf = (skill: number) => (skill >= 6 ? 8 : Math.max(3, skill + 1));
/** An enemy commander without a name leads this many; the sovereign at the capital one more. */
export const GENERIC_COMMAND = 4;

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export interface TraitDef { id: string; name: string; role: Role | 'any'; desc: string; }

export const TRAITS: Record<string, TraitDef> = {
  refined:    { id: 'refined', name: 'Refined', role: 'courtier', desc: '+0.5 prestige a year at court' },
  pious:      { id: 'pious', name: 'Pious', role: 'courtier', desc: '+2 a year with your church' },
  zealous:    { id: 'zealous', name: 'Zealous', role: 'priest', desc: 'Conversions take 2 quarters less' },
  beloved:    { id: 'beloved', name: 'Beloved Pastor', role: 'priest', desc: 'A failed conversion costs no control' },
  curial:     { id: 'curial', name: 'Friend of the Curia', role: 'priest', desc: 'Missions to the church win 50% more favour' },
  painter:    { id: 'painter', name: 'Painter', role: 'artist', desc: 'Sacred paintings and portraits: rolls twice, keeps the better' },
  poet:       { id: 'poet', name: 'Poet', role: 'artist', desc: 'Epics and treatises: rolls twice, keeps the better' },
  builder:    { id: 'builder', name: 'Master Builder', role: 'artist', desc: 'Monuments: rolls twice, keeps the better' },
  prolific:   { id: 'prolific', name: 'Prolific', role: 'artist', desc: 'Works take half as long' },
  orator:     { id: 'orator', name: 'Orator', role: 'leader', desc: 'Royal Grace wins 50% more happiness' },
  tolerant:   { id: 'tolerant', name: 'Tolerant', role: 'leader', desc: 'Integration never fails outright' },
  humanist:   { id: 'humanist', name: 'Humanist', role: 'leader', desc: 'Embracing a culture also gives +1 stability' },
  bold:       { id: 'bold', name: 'Bold', role: 'general', desc: 'Melee +20%' },
  gunner:     { id: 'gunner', name: 'Gunner', role: 'general', desc: 'Fire +20%' },
  cautious:   { id: 'cautious', name: 'Cautious', role: 'general', desc: 'Damage taken −15%' },
  cunning:    { id: 'cunning', name: 'Cunning', role: 'general', desc: 'Scouts reveal the enemy tactic in round 1' },
  inspiring:  { id: 'inspiring', name: 'Inspiring', role: 'general', desc: 'Army breaks at 25% instead of 35%' },
  siegemaster:{ id: 'siegemaster', name: 'Siegemaster', role: 'general', desc: 'Enemy forts count as one level lower' },
  silver:     { id: 'silver', name: 'Silver-tongued', role: 'diplomat', desc: 'Diplomatic success +10%' },
  merchant:   { id: 'merchant', name: 'Trade Envoy', role: 'diplomat', desc: 'Trade treaties worth +2 ducats' },
  matchmaker: { id: 'matchmaker', name: 'Matchmaker', role: 'diplomat', desc: 'Royal marriages +20%' },
  envoy:      { id: 'envoy', name: 'Swift Envoy', role: 'diplomat', desc: 'Missions take 1 year less' },
  scholar:    { id: 'scholar', name: 'Scholar', role: 'researcher', desc: '+1 research per year' },
  inventor:   { id: 'inventor', name: 'Inventor', role: 'researcher', desc: 'Military studies +2 research a year' },
  economist:  { id: 'economist', name: 'Arbitrista', role: 'researcher', desc: 'Economy studies +2 research a year' },
  jurist:     { id: 'jurist', name: 'Jurist', role: 'researcher', desc: 'Statecraft studies +2 research a year' },
  architect:  { id: 'architect', name: 'Architect', role: 'admin', desc: 'Buildings finish 1 year sooner' },
  tax:        { id: 'tax', name: 'Tax Farmer', role: 'merchant', desc: 'Tax collection +50%' },
  banker:     { id: 'banker', name: 'Banker', role: 'merchant', desc: 'Economic buildings cost 20% less' },
  guildmaster:{ id: 'guildmaster', name: 'Guildmaster', role: 'merchant', desc: 'Economic buildings finish 1 year sooner' },
  agronomist: { id: 'agronomist', name: 'Agronomist', role: 'merchant', desc: 'Irrigation and farms give +1 extra development chance' },
  navigator:  { id: 'navigator', name: 'Navigator', role: 'explorer', desc: 'Discovery chance +15%' },
  cartographer:{ id: 'cartographer', name: 'Cartographer', role: 'explorer', desc: 'Voyages take 1 year less' },
  survivor:   { id: 'survivor', name: 'Survivor', role: 'explorer', desc: 'Never lost at sea' },
  adelantado: { id: 'adelantado', name: 'Adelantado', role: 'conqueror', desc: 'Conquest strength +25%' },
  plunderer:  { id: 'plunderer', name: 'Plunderer', role: 'conqueror', desc: 'Loot +50%' },
  pathfinder: { id: 'pathfinder', name: 'Pathfinder', role: 'conqueror', desc: 'Troops lose less strength overseas' },
  sea_dog:    { id: 'sea_dog', name: 'Sea Dog', role: 'admiral', desc: 'Ship guns +20%' },
  boarder:    { id: 'boarder', name: 'Boarding Master', role: 'admiral', desc: 'Boarding +20%' },
  weather:    { id: 'weather', name: 'Weatherwise', role: 'admiral', desc: 'Reads the wind: sees the enemy tactic in round 1' },
  convoy:     { id: 'convoy', name: 'Convoy Master', role: 'admiral', desc: 'Each ship carries 1 more company' },
  settler:    { id: 'settler', name: 'Settler', role: 'colonist', desc: 'Colonies succeed +15%' },
  planter:    { id: 'planter', name: 'Planter', role: 'colonist', desc: 'Each colony level worth +1 ducat' },
  missionary: { id: 'missionary', name: 'Missionary', role: 'colonist', desc: 'Can settle among native peoples without conquest' },
  steward:    { id: 'steward', name: 'Steward', role: 'admin', desc: 'Royal progress gives +1 more stability' },
  polymath:   { id: 'polymath', name: 'Polymath', role: 'researcher', desc: '+2 research per year' },
};

export interface LegendDef {
  id: string; name: string; role: Role; skill: number; traits: string[];
  from: number; to: number; nations?: string[]; quote: string;
}

// Legendary characters can appear in court drafts during their lifetime.
export const LEGENDS: LegendDef[] = [
  { id: 'leonardo', name: 'Leonardo da Vinci', role: 'artist', skill: 6, traits: ['painter', 'prolific'], from: 1478, to: 1519, quote: 'Art is never finished, only abandoned' },
  { id: 'michelangelo', name: 'Michelangelo Buonarroti', role: 'artist', skill: 6, traits: ['builder', 'painter'], from: 1495, to: 1564, quote: 'I saw the angel in the marble' },
  { id: 'durer', name: 'Albrecht Dürer', role: 'artist', skill: 5, traits: ['painter', 'poet'], from: 1495, to: 1528, quote: 'Painter of Nuremberg' },
  { id: 'el_greco', name: 'El Greco', role: 'artist', skill: 5, traits: ['painter'], from: 1577, to: 1614, nations: ['castile', 'spain'], quote: 'The Greek of Toledo' },
  { id: 'velazquez', name: 'Diego Velázquez', role: 'artist', skill: 6, traits: ['painter', 'prolific'], from: 1623, to: 1660, nations: ['castile', 'spain'], quote: 'Painter to the king' },
  { id: 'sinan', name: 'Mimar Sinan', role: 'artist', skill: 6, traits: ['builder', 'prolific'], from: 1538, to: 1588, nations: ['ottomans'], quote: 'Chief architect of the empire' },
  { id: 'las_casas', name: 'Bartolomé de las Casas', role: 'priest', skill: 5, traits: ['beloved', 'curial'], from: 1514, to: 1566, quote: 'Protector of the Indians' },
  { id: 'loyola', name: 'Ignatius of Loyola', role: 'priest', skill: 6, traits: ['zealous', 'curial'], from: 1534, to: 1556, quote: 'Founder of the Society of Jesus' },
  { id: 'erasmus', name: 'Erasmus of Rotterdam', role: 'leader', skill: 6, traits: ['humanist', 'tolerant'], from: 1500, to: 1536, quote: 'Prince of the humanists' },
  { id: 'more', name: 'Thomas More', role: 'leader', skill: 5, traits: ['orator', 'humanist'], from: 1510, to: 1535, nations: ['england'], quote: 'Author of Utopia' },
  { id: 'gran_capitan', name: 'Gonzalo Fernández de Córdoba', role: 'general', skill: 6, traits: ['cunning', 'inspiring'], from: 1480, to: 1515, nations: ['castile', 'aragon'], quote: '"El Gran Capitán"' },
  { id: 'cisneros', name: 'Francisco Jiménez de Cisneros', role: 'admin', skill: 6, traits: ['steward', 'architect'], from: 1492, to: 1517, nations: ['castile'], quote: 'Cardinal, regent and reformer' },
  { id: 'nebrija', name: 'Antonio de Nebrija', role: 'researcher', skill: 5, traits: ['scholar'], from: 1480, to: 1522, quote: 'Author of the first Castilian grammar' },
  { id: 'alba', name: 'Fernando Álvarez de Toledo', role: 'general', skill: 6, traits: ['siegemaster', 'cautious'], from: 1530, to: 1582, nations: ['castile', 'aragon'], quote: '"The Iron Duke" of Alba' },
  { id: 'farnese', name: 'Alessandro Farnese', role: 'general', skill: 6, traits: ['bold', 'siegemaster'], from: 1570, to: 1592, quote: 'Master of the siege' },
  { id: 'henry', name: 'Henrique, the Navigator', role: 'researcher', skill: 6, traits: ['scholar', 'polymath'], from: 1453, to: 1460, nations: ['portugal'], quote: 'Patron of the sea routes' },
  { id: 'dias', name: 'Bartolomeu Dias', role: 'explorer', skill: 5, traits: ['navigator', 'cartographer'], from: 1480, to: 1500, nations: ['portugal'], quote: 'First to round the Cape' },
  { id: 'gama', name: 'Vasco da Gama', role: 'explorer', skill: 6, traits: ['navigator', 'survivor'], from: 1490, to: 1524, nations: ['portugal'], quote: 'The sea road to India' },
  { id: 'albuquerque', name: 'Afonso de Albuquerque', role: 'general', skill: 6, traits: ['bold', 'cunning'], from: 1500, to: 1515, nations: ['portugal'], quote: '"The Terrible", lion of the seas' },
  { id: 'columbus', name: 'Cristóbal Colón', role: 'explorer', skill: 4, traits: ['navigator', 'survivor'], from: 1484, to: 1506, quote: 'A Genoese with a wild plan' },
  { id: 'leonardo', name: 'Leonardo da Vinci', role: 'researcher', skill: 6, traits: ['polymath', 'inventor'], from: 1480, to: 1519, quote: 'Painter, engineer, dreamer' },
  { id: 'machiavelli', name: 'Niccolò Machiavelli', role: 'diplomat', skill: 6, traits: ['silver'], from: 1498, to: 1527, quote: 'It is better to be feared than loved' },
  { id: 'galileo', name: 'Galileo Galilei', role: 'researcher', skill: 6, traits: ['inventor', 'scholar'], from: 1592, to: 1640, quote: 'And yet it moves' },
  { id: 'mercado', name: 'Tomás de Mercado', role: 'researcher', skill: 5, traits: ['economist'], from: 1560, to: 1575, quote: 'Of the deals and contracts of merchants' },
  { id: 'bazan', name: 'Álvaro de Bazán', role: 'admiral', skill: 6, traits: ['boarder', 'weather'], from: 1550, to: 1588, nations: ['castile', 'aragon'], quote: 'Never defeated at sea' },
  { id: 'cortes', name: 'Hernán Cortés', role: 'conqueror', skill: 6, traits: ['adelantado', 'plunderer'], from: 1510, to: 1547, nations: ['castile', 'aragon'], quote: 'Burner of ships' },
  { id: 'pizarro', name: 'Francisco Pizarro', role: 'conqueror', skill: 5, traits: ['plunderer', 'pathfinder'], from: 1520, to: 1541, nations: ['castile', 'aragon'], quote: 'Conqueror of Peru' },
  { id: 'cabral', name: 'Pedro Álvares Cabral', role: 'explorer', skill: 5, traits: ['navigator'], from: 1495, to: 1520, nations: ['portugal'], quote: 'He found Brazil on the way to India' },
  { id: 'magellan', name: 'Fernão de Magalhães', role: 'explorer', skill: 6, traits: ['navigator', 'cartographer'], from: 1505, to: 1521, quote: 'Around the whole world' },
  { id: 'lascasas', name: 'Bartolomé de las Casas', role: 'colonist', skill: 5, traits: ['missionary', 'settler'], from: 1510, to: 1566, quote: 'Protector of the Indians' },
  { id: 'doria', name: 'Andrea Doria', role: 'admiral', skill: 5, traits: ['sea_dog', 'weather'], from: 1510, to: 1560, quote: 'Admiral of Genoa' },
  { id: 'vitoria', name: 'Francisco de Vitoria', role: 'researcher', skill: 5, traits: ['jurist'], from: 1520, to: 1546, quote: 'Founder of the law of nations' },
  { id: 'cervantes', name: 'Miguel de Cervantes', role: 'diplomat', skill: 4, traits: ['silver'], from: 1570, to: 1616, quote: 'Soldier, captive, author' },
  { id: 'olivares', name: 'Gaspar de Guzmán', role: 'merchant', skill: 5, traits: ['tax', 'banker'], from: 1621, to: 1643, nations: ['castile'], quote: 'Count-Duke of Olivares' },
  { id: 'spinola', name: 'Ambrogio Spinola', role: 'general', skill: 6, traits: ['siegemaster', 'gunner'], from: 1600, to: 1630, quote: 'The besieger of Breda' },
  { id: 'vauban', name: 'Sébastien de Vauban', role: 'admin', skill: 6, traits: ['architect'], from: 1660, to: 1707, quote: 'A town besieged by Vauban is a town taken' },
  { id: 'patino', name: 'José Patiño', role: 'merchant', skill: 5, traits: ['tax', 'guildmaster'], from: 1717, to: 1736, quote: 'Builder of fleets' },
];
