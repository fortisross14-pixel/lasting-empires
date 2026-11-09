import type { Personality } from '../types';

interface HistRuler { name: string; traits: string[]; from: number; to: number; }

export interface NationDef {
  id: string; name: string; adj: string; color: string; culture: string; capital: string;
  personality: Personality; gold: number; playable?: boolean; blurb?: string;
  army: string[];  // starting troop types
}

export const NATIONS: NationDef[] = [
  { id: 'castile', name: 'Castile', adj: 'Castilian', color: '#a23b4c', culture: 'castilian', capital: 'toledo', personality: 'expansionist', gold: 70, playable: true,
    blurb: 'The largest crown of Iberia. Rich in land and men, troubled at court. Granada lies to the south.',
    army: ['levy', 'levy', 'levy', 'crossbow', 'men_at_arms', 'jinetes'] },
  { id: 'portugal', name: 'Portugal', adj: 'Portuguese', color: '#2e8577', culture: 'portuguese', capital: 'lisbon', personality: 'merchant', gold: 80, playable: true,
    blurb: 'A small kingdom facing the open ocean. Few soldiers, many ships, and the whole Atlantic ahead.',
    army: ['levy', 'levy', 'levy', 'crossbow', 'men_at_arms'] },
  { id: 'aragon', name: 'Aragon', adj: 'Aragonese', color: '#d1a032', culture: 'aragonese', capital: 'zaragoza', personality: 'balanced', gold: 70, playable: true,
    blurb: 'A crown of many parts: Catalan merchants, island kingdoms, and ambitions in Italy.',
    army: ['levy', 'levy', 'crossbow', 'crossbow', 'men_at_arms'] },
  { id: 'granada', name: 'Granada', adj: 'Granadine', color: '#6f9134', culture: 'andalusi', capital: 'granada', personality: 'cautious', gold: 40, army: ['levy', 'levy', 'crossbow', 'jinetes', 'jinetes'] },
  { id: 'navarre', name: 'Navarre', adj: 'Navarrese', color: '#b4653c', culture: 'castilian', capital: 'navarre', personality: 'cautious', gold: 25, army: ['levy', 'crossbow'] },
  { id: 'france', name: 'France', adj: 'French', color: '#3d5ca3', culture: 'french', capital: 'lyon', personality: 'expansionist', gold: 90, army: ['levy', 'levy', 'levy', 'crossbow', 'men_at_arms', 'men_at_arms', 'knights', 'bombard'] },
  { id: 'savoy', name: 'Savoy', adj: 'Savoyard', color: '#9b7bb8', culture: 'italian', capital: 'savoy', personality: 'cautious', gold: 25, army: ['levy', 'men_at_arms'] },
  { id: 'milan', name: 'Milan', adj: 'Milanese', color: '#4e95b5', culture: 'italian', capital: 'milan', personality: 'expansionist', gold: 50, army: ['levy', 'crossbow', 'men_at_arms', 'knights'] },
  { id: 'genoa', name: 'Genoa', adj: 'Genoese', color: '#a9b4bb', culture: 'italian', capital: 'genoa', personality: 'merchant', gold: 50, army: ['levy', 'crossbow', 'crossbow'] },
  { id: 'venice', name: 'Venice', adj: 'Venetian', color: '#c8603e', culture: 'italian', capital: 'venice', personality: 'merchant', gold: 80, army: ['levy', 'crossbow', 'crossbow', 'men_at_arms', 'bombard'] },
  { id: 'hungary', name: 'Hungary', adj: 'Hungarian', color: '#6f6f96', culture: 'italian', capital: 'croatia', personality: 'balanced', gold: 30, army: ['levy', 'jinetes', 'knights'] },
  { id: 'florence', name: 'Florence', adj: 'Florentine', color: '#a6487f', culture: 'italian', capital: 'florence', personality: 'merchant', gold: 60, army: ['levy', 'crossbow', 'men_at_arms'] },
  { id: 'papacy', name: 'Papal States', adj: 'Papal', color: '#e3d6a4', culture: 'italian', capital: 'rome', personality: 'cautious', gold: 60, army: ['levy', 'levy', 'men_at_arms'] },
  { id: 'naples', name: 'Naples', adj: 'Neapolitan', color: '#7c55a8', culture: 'italian', capital: 'naples', personality: 'balanced', gold: 50, army: ['levy', 'levy', 'crossbow', 'men_at_arms', 'knights'] },
  { id: 'morocco', name: 'Morocco', adj: 'Moroccan', color: '#8f5232', culture: 'maghrebi', capital: 'fez', personality: 'zealot', gold: 40, army: ['levy', 'levy', 'jinetes', 'jinetes'] },
  { id: 'tlemcen', name: 'Tlemcen', adj: 'Zayyanid', color: '#bf9354', culture: 'maghrebi', capital: 'tlemcen', personality: 'cautious', gold: 30, army: ['levy', 'jinetes', 'crossbow'] },
  { id: 'tunis', name: 'Tunis', adj: 'Hafsid', color: '#5f8566', culture: 'maghrebi', capital: 'tunis', personality: 'balanced', gold: 50, army: ['levy', 'levy', 'crossbow', 'jinetes'] },
];

// Starting relations (symmetric). Unlisted pairs start at 0.
export const START_REL: [string, string, number][] = [
  ['castile', 'granada', -60], ['castile', 'aragon', 20], ['castile', 'portugal', 0], ['castile', 'navarre', 10],
  ['castile', 'france', 10], ['aragon', 'naples', 40], ['aragon', 'france', -30], ['aragon', 'genoa', -40],
  ['aragon', 'tunis', -30], ['aragon', 'granada', -30], ['portugal', 'morocco', -50], ['portugal', 'granada', -20],
  ['granada', 'morocco', 30], ['navarre', 'france', 20], ['venice', 'milan', -30], ['venice', 'hungary', -20],
  ['florence', 'milan', 20], ['papacy', 'naples', 10], ['france', 'milan', -10], ['france', 'savoy', 10],
  ['genoa', 'milan', 10], ['tunis', 'tlemcen', -10], ['morocco', 'tlemcen', -20], ['florence', 'venice', -10],
  ['papacy', 'castile', 15], ['papacy', 'aragon', 5], ['papacy', 'portugal', 15],
];

// Historical rulers for the playable nations. After the list runs out, rulers are generated.
export const RULERS: Record<string, HistRuler[]> = {
  castile: [
    { name: 'Juan II', traits: ['Weak'], from: 1406, to: 1454 },
    { name: 'Enrique IV', traits: ['Weak', 'Generous'], from: 1454, to: 1474 },
    { name: 'Isabel I', traits: ['Pious', 'Able'], from: 1474, to: 1504 },
    { name: 'Juana I', traits: ['Unstable'], from: 1504, to: 1516 },
    { name: 'Carlos I', traits: ['Warrior', 'Ambitious'], from: 1516, to: 1556 },
    { name: 'Felipe II', traits: ['Diligent', 'Pious'], from: 1556, to: 1598 },
    { name: 'Felipe III', traits: ['Idle'], from: 1598, to: 1621 },
    { name: 'Felipe IV', traits: ['Patron'], from: 1621, to: 1665 },
    { name: 'Carlos II', traits: ['Sickly'], from: 1665, to: 1700 },
    { name: 'Felipe V', traits: ['Reformer'], from: 1700, to: 1746 },
    { name: 'Fernando VI', traits: ['Diligent'], from: 1746, to: 1759 },
  ],
  portugal: [
    { name: 'Afonso V', traits: ['Warrior'], from: 1438, to: 1481 },
    { name: 'João II', traits: ['Able', 'Ruthless'], from: 1481, to: 1495 },
    { name: 'Manuel I', traits: ['Fortunate'], from: 1495, to: 1521 },
    { name: 'João III', traits: ['Pious'], from: 1521, to: 1557 },
    { name: 'Sebastião', traits: ['Reckless'], from: 1557, to: 1578 },
    { name: 'Henrique', traits: ['Sickly', 'Pious'], from: 1578, to: 1580 },
  ],
  aragon: [
    { name: 'Alfonso V', traits: ['Magnanimous', 'Patron'], from: 1416, to: 1458 },
    { name: 'Juan II', traits: ['Warrior'], from: 1458, to: 1479 },
    { name: 'Fernando II', traits: ['Cunning', 'Able'], from: 1479, to: 1516 },
  ],
};

type Rates = Partial<Record<'military' | 'diplomacy' | 'internal' | 'economy' | 'research', number>>;

export interface RulerArch {
  id: string; name: string; desc: string; rates: Rates; all?: number; startCards?: number;
  role?: 'general' | 'diplomat' | 'admin' | 'merchant' | 'researcher';
  battle?: number; diplo?: number; research?: number; goldPct?: number; np?: number; stab?: number;
}

// What kind of monarch sits on the throne. Chosen from three heirs at each succession.
export const RULER_ARCHS: Record<string, RulerArch> = {
  balanced: { id: 'balanced', name: 'Even-handed', desc: '+0.1 of every card type a year. 2 free cards at the coronation.', rates: {}, all: 0.1, startCards: 2 },
  martial:  { id: 'martial', name: 'Warrior', desc: '+0.5 Military cards a year, +10% battle strength. Can lead armies as a general.', rates: { military: 0.5 }, role: 'general', battle: 0.1 },
  merchant: { id: 'merchant', name: 'Merchant', desc: '+0.3 Economy cards a year, +10% income. Can act as a merchant.', rates: { economy: 0.3 }, role: 'merchant', goldPct: 0.1 },
  diplomat: { id: 'diplomat', name: 'Diplomat', desc: '+0.4 Diplomacy cards a year, +10% diplomatic success. Can go on embassies.', rates: { diplomacy: 0.4 }, role: 'diplomat', diplo: 0.1 },
  scholar:  { id: 'scholar', name: 'Scholar', desc: '+0.4 Research cards a year, +1 research on every study. Can study as a researcher.', rates: { research: 0.4 }, role: 'researcher', research: 1 },
  pious:    { id: 'pious', name: 'Pious', desc: '+0.4 Internal cards a year, +1 nation point a year, +1 stability on accession.', rates: { internal: 0.4 }, np: 1, stab: 1 },
  weak:     { id: 'weak', name: 'Feeble', desc: 'No talents. Favourites rule in the monarch\'s name. −1 stability on accession.', rates: {}, stab: -1 },
};

export function archFromTraits(traits: string[]): string {
  for (const t of traits) {
    if (['Warrior', 'Reckless', 'Ambitious', 'Ruthless'].includes(t)) return 'martial';
    if (t === 'Pious') return 'pious';
    if (['Cunning', 'Magnanimous'].includes(t)) return 'diplomat';
    if (t === 'Patron') return 'scholar';
    if (['Diligent', 'Fortunate', 'Reformer'].includes(t)) return 'merchant';
    if (t === 'Able') return 'balanced';
    if (['Weak', 'Idle', 'Unstable', 'Sickly'].includes(t)) return 'weak';
  }
  return 'balanced';
}

export const RULER_NAMES: Record<string, string[]> = {
  castilian: ['Alfonso', 'Fernando', 'Enrique', 'Juan', 'Pedro', 'Sancho', 'Carlos', 'Felipe', 'Isabel', 'Juana'],
  portuguese: ['Afonso', 'João', 'Duarte', 'Manuel', 'Pedro', 'Sebastião', 'Dinis', 'Maria'],
  aragonese: ['Jaume', 'Pere', 'Alfons', 'Joan', 'Martí', 'Ferran', 'Elionor'],
};
