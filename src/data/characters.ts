import type { Role } from '../types';

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

export interface TraitDef { id: string; name: string; role: Role | 'any'; desc: string; }

export const TRAITS: Record<string, TraitDef> = {
  bold:       { id: 'bold', name: 'Bold', role: 'general', desc: 'Melee +20%' },
  gunner:     { id: 'gunner', name: 'Gunner', role: 'general', desc: 'Fire +20%' },
  cautious:   { id: 'cautious', name: 'Cautious', role: 'general', desc: 'Damage taken −15%' },
  cunning:    { id: 'cunning', name: 'Cunning', role: 'general', desc: 'Scouts reveal the enemy tactic in round 1' },
  inspiring:  { id: 'inspiring', name: 'Inspiring', role: 'general', desc: 'Army breaks at 25% instead of 35%' },
  siegemaster:{ id: 'siegemaster', name: 'Siegemaster', role: 'general', desc: 'Enemy forts count as one level lower' },
  silver:     { id: 'silver', name: 'Silver-tongued', role: 'diplomat', desc: 'Diplomatic success +10%' },
  merchant:   { id: 'merchant', name: 'Merchant', role: 'diplomat', desc: 'Trade treaties worth +2 ducats' },
  matchmaker: { id: 'matchmaker', name: 'Matchmaker', role: 'diplomat', desc: 'Royal marriages +20%' },
  envoy:      { id: 'envoy', name: 'Swift Envoy', role: 'diplomat', desc: 'Missions take 1 year less' },
  scholar:    { id: 'scholar', name: 'Scholar', role: 'admin', desc: '+1 research per year' },
  architect:  { id: 'architect', name: 'Architect', role: 'admin', desc: 'Buildings finish 1 year sooner' },
  tax:        { id: 'tax', name: 'Tax Farmer', role: 'admin', desc: 'Tax missions +50%' },
  steward:    { id: 'steward', name: 'Steward', role: 'admin', desc: 'Royal progress gives +1 more stability' },
  explorer:   { id: 'explorer', name: 'Explorer', role: 'any', desc: 'Overseas ventures succeed more often' },
  polymath:   { id: 'polymath', name: 'Polymath', role: 'admin', desc: '+2 research per year' },
};

export interface LegendDef {
  id: string; name: string; role: Role; skill: number; traits: string[];
  from: number; to: number; nations?: string[]; quote: string;
}

// Legendary characters can appear in court drafts during their lifetime.
export const LEGENDS: LegendDef[] = [
  { id: 'gran_capitan', name: 'Gonzalo Fernández de Córdoba', role: 'general', skill: 6, traits: ['cunning', 'inspiring'], from: 1480, to: 1515, nations: ['castile', 'aragon'], quote: '"El Gran Capitán"' },
  { id: 'cisneros', name: 'Francisco Jiménez de Cisneros', role: 'admin', skill: 6, traits: ['steward', 'scholar'], from: 1492, to: 1517, nations: ['castile'], quote: 'Cardinal, regent and reformer' },
  { id: 'nebrija', name: 'Antonio de Nebrija', role: 'admin', skill: 5, traits: ['scholar'], from: 1480, to: 1522, quote: 'Author of the first Castilian grammar' },
  { id: 'alba', name: 'Fernando Álvarez de Toledo', role: 'general', skill: 6, traits: ['siegemaster', 'cautious'], from: 1530, to: 1582, nations: ['castile', 'aragon'], quote: '"The Iron Duke" of Alba' },
  { id: 'farnese', name: 'Alessandro Farnese', role: 'general', skill: 6, traits: ['bold', 'siegemaster'], from: 1570, to: 1592, quote: 'Master of the siege' },
  { id: 'henry', name: 'Henrique, the Navigator', role: 'admin', skill: 6, traits: ['explorer', 'scholar'], from: 1453, to: 1460, nations: ['portugal'], quote: 'Patron of the sea routes' },
  { id: 'dias', name: 'Bartolomeu Dias', role: 'diplomat', skill: 4, traits: ['explorer', 'envoy'], from: 1480, to: 1500, nations: ['portugal'], quote: 'First to round the Cape' },
  { id: 'gama', name: 'Vasco da Gama', role: 'diplomat', skill: 5, traits: ['explorer', 'merchant'], from: 1490, to: 1524, nations: ['portugal'], quote: 'The sea road to India' },
  { id: 'albuquerque', name: 'Afonso de Albuquerque', role: 'general', skill: 6, traits: ['bold', 'cunning'], from: 1500, to: 1515, nations: ['portugal'], quote: '"The Terrible", lion of the seas' },
  { id: 'columbus', name: 'Cristóbal Colón', role: 'diplomat', skill: 4, traits: ['explorer'], from: 1484, to: 1506, quote: 'A Genoese with a wild plan' },
  { id: 'leonardo', name: 'Leonardo da Vinci', role: 'admin', skill: 6, traits: ['polymath', 'architect'], from: 1480, to: 1519, quote: 'Painter, engineer, dreamer' },
  { id: 'machiavelli', name: 'Niccolò Machiavelli', role: 'diplomat', skill: 6, traits: ['silver'], from: 1498, to: 1527, quote: 'It is better to be feared than loved' },
  { id: 'doria', name: 'Andrea Doria', role: 'general', skill: 5, traits: ['bold', 'gunner'], from: 1510, to: 1560, quote: 'Admiral of Genoa' },
  { id: 'vitoria', name: 'Francisco de Vitoria', role: 'admin', skill: 5, traits: ['scholar'], from: 1520, to: 1546, quote: 'Founder of the law of nations' },
  { id: 'cervantes', name: 'Miguel de Cervantes', role: 'diplomat', skill: 4, traits: ['silver'], from: 1570, to: 1616, quote: 'Soldier, captive, author' },
  { id: 'olivares', name: 'Gaspar de Guzmán', role: 'admin', skill: 5, traits: ['tax', 'steward'], from: 1621, to: 1643, nations: ['castile'], quote: 'Count-Duke of Olivares' },
  { id: 'spinola', name: 'Ambrogio Spinola', role: 'general', skill: 6, traits: ['siegemaster', 'gunner'], from: 1600, to: 1630, quote: 'The besieger of Breda' },
  { id: 'vauban', name: 'Sébastien de Vauban', role: 'admin', skill: 6, traits: ['architect'], from: 1660, to: 1707, quote: 'A town besieged by Vauban is a town taken' },
  { id: 'patino', name: 'José Patiño', role: 'admin', skill: 5, traits: ['tax', 'architect'], from: 1717, to: 1736, quote: 'Builder of fleets' },
];
