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
export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export interface TraitDef { id: string; name: string; role: Role | 'any'; desc: string; }

export const TRAITS: Record<string, TraitDef> = {
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
  { id: 'cortes', name: 'Hernán Cortés', role: 'conqueror', skill: 6, traits: ['adelantado', 'plunderer'], from: 1510, to: 1547, nations: ['castile', 'aragon'], quote: 'Burner of ships' },
  { id: 'pizarro', name: 'Francisco Pizarro', role: 'conqueror', skill: 5, traits: ['plunderer', 'pathfinder'], from: 1520, to: 1541, nations: ['castile', 'aragon'], quote: 'Conqueror of Peru' },
  { id: 'cabral', name: 'Pedro Álvares Cabral', role: 'explorer', skill: 5, traits: ['navigator'], from: 1495, to: 1520, nations: ['portugal'], quote: 'He found Brazil on the way to India' },
  { id: 'magellan', name: 'Fernão de Magalhães', role: 'explorer', skill: 6, traits: ['navigator', 'cartographer'], from: 1505, to: 1521, quote: 'Around the whole world' },
  { id: 'lascasas', name: 'Bartolomé de las Casas', role: 'colonist', skill: 5, traits: ['missionary', 'settler'], from: 1510, to: 1566, quote: 'Protector of the Indians' },
  { id: 'doria', name: 'Andrea Doria', role: 'general', skill: 5, traits: ['bold', 'gunner'], from: 1510, to: 1560, quote: 'Admiral of Genoa' },
  { id: 'vitoria', name: 'Francisco de Vitoria', role: 'researcher', skill: 5, traits: ['jurist'], from: 1520, to: 1546, quote: 'Founder of the law of nations' },
  { id: 'cervantes', name: 'Miguel de Cervantes', role: 'diplomat', skill: 4, traits: ['silver'], from: 1570, to: 1616, quote: 'Soldier, captive, author' },
  { id: 'olivares', name: 'Gaspar de Guzmán', role: 'merchant', skill: 5, traits: ['tax', 'banker'], from: 1621, to: 1643, nations: ['castile'], quote: 'Count-Duke of Olivares' },
  { id: 'spinola', name: 'Ambrogio Spinola', role: 'general', skill: 6, traits: ['siegemaster', 'gunner'], from: 1600, to: 1630, quote: 'The besieger of Breda' },
  { id: 'vauban', name: 'Sébastien de Vauban', role: 'admin', skill: 6, traits: ['architect'], from: 1660, to: 1707, quote: 'A town besieged by Vauban is a town taken' },
  { id: 'patino', name: 'José Patiño', role: 'merchant', skill: 5, traits: ['tax', 'guildmaster'], from: 1717, to: 1736, quote: 'Builder of fleets' },
];
