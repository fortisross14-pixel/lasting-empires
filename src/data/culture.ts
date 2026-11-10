// People: works of art, religious heads and the specialists of the People menu.
import type { Cat } from '../types';

/** Kinds of work an artist can make. Each brings a free card of its kind when it is celebrated. */
export interface GenreDef { id: string; name: string; icon: string; cat: Cat; desc: string; }
export const GENRES: Record<string, GenreDef> = {
  sacred:   { id: 'sacred', name: 'Sacred painting', icon: 'church', cat: 'culture', desc: 'Altarpieces and frescoes. A celebrated one brings a People card; the faithful are pleased (+5 with your church).' },
  portrait: { id: 'portrait', name: 'Royal portrait', icon: 'crown', cat: 'diplomacy', desc: 'The monarch in glory. A celebrated one brings a Diplomacy card and extra prestige.' },
  epic:     { id: 'epic', name: 'Epic poem or romance', icon: 'sword', cat: 'military', desc: 'Heroes, sieges and knights errant, like the Cid or Amadís. A celebrated one brings a Military card.' },
  treatise: { id: 'treatise', name: 'Learned treatise', icon: 'book', cat: 'research', desc: 'Grammars, maps and natural philosophy. A celebrated one brings a Research card.' },
  monument: { id: 'monument', name: 'Monument', icon: 'tower', cat: 'internal', desc: 'A cathedral, palace or square. Lasts longest; a celebrated one brings an Internal card.' },
};

/** What a work does, by quality (the mission outcome). Happiness fades to nothing over `years`. */
export interface QualityDef { name: string; happy: number; years: number; gold: number; goldYears: number; prestige: number; cards: number; museum: number; }
export const QUALITY: QualityDef[] = [
  { name: 'Forgettable', happy: 1, years: 1, gold: 0, goldYears: 0, prestige: 0, cards: 0, museum: 0 },
  { name: 'Fine', happy: 2, years: 2, gold: 0, goldYears: 0, prestige: 1, cards: 0, museum: 0 },
  { name: 'Admired', happy: 3, years: 3, gold: 2, goldYears: 3, prestige: 2, cards: 0, museum: 1 },
  { name: 'Celebrated', happy: 5, years: 5, gold: 4, goldYears: 5, prestige: 4, cards: 1, museum: 2 },
  { name: 'Masterpiece', happy: 6, years: 8, gold: 6, goldYears: 5, prestige: 8, cards: 2, museum: 4 },
];

/** Monuments last half as long again. */
export const MONUMENT_YEARS = 1.5;

/** Famous works, given the name when a masterpiece of that kind is made in their time and culture group. */
export interface Masterwork { name: string; genre: string; from: number; to: number; cultures?: string[]; }
export const MASTERWORKS: Masterwork[] = [
  { name: 'Amadís de Gaula', genre: 'epic', from: 1480, to: 1530, cultures: ['castilian', 'portuguese', 'galician', 'aragonese', 'catalan'] },
  { name: 'La Celestina', genre: 'epic', from: 1490, to: 1520, cultures: ['castilian'] },
  { name: 'Don Quixote', genre: 'epic', from: 1595, to: 1630, cultures: ['castilian'] },
  { name: 'Os Lusíadas', genre: 'epic', from: 1560, to: 1590, cultures: ['portuguese'] },
  { name: 'Le Morte d\'Arthur', genre: 'epic', from: 1465, to: 1500, cultures: ['english'] },
  { name: 'Orlando Furioso', genre: 'epic', from: 1500, to: 1540, cultures: ['italian', 'tuscan', 'lombard', 'venetian', 'neapolitan', 'sicilian'] },
  { name: 'Paradise Lost', genre: 'epic', from: 1650, to: 1680, cultures: ['english'] },
  { name: 'The Last Supper', genre: 'sacred', from: 1490, to: 1510, cultures: ['italian', 'lombard', 'tuscan'] },
  { name: 'The Sistine Ceiling', genre: 'sacred', from: 1505, to: 1520 },
  { name: 'The Garden of Earthly Delights', genre: 'sacred', from: 1490, to: 1515, cultures: ['dutch', 'flemish', 'burgundian'] },
  { name: 'The Burial of the Count of Orgaz', genre: 'sacred', from: 1580, to: 1600, cultures: ['castilian'] },
  { name: 'The Ghent Altarpiece', genre: 'sacred', from: 1451, to: 1480, cultures: ['flemish', 'dutch', 'burgundian'] },
  { name: 'Las Meninas', genre: 'portrait', from: 1640, to: 1670, cultures: ['castilian'] },
  { name: 'The Mona Lisa', genre: 'portrait', from: 1500, to: 1520 },
  { name: 'The Ambassadors', genre: 'portrait', from: 1525, to: 1545, cultures: ['english', 'german'] },
  { name: 'Gramática castellana', genre: 'treatise', from: 1485, to: 1500, cultures: ['castilian'] },
  { name: 'De revolutionibus', genre: 'treatise', from: 1530, to: 1550, cultures: ['polish', 'german'] },
  { name: 'The Prince', genre: 'treatise', from: 1510, to: 1530, cultures: ['italian', 'tuscan'] },
  { name: 'The Encyclopédie', genre: 'treatise', from: 1745, to: 1750, cultures: ['french'] },
  { name: 'The Kitab-ı Bahriye', genre: 'treatise', from: 1515, to: 1530, cultures: ['turkish'] },
  { name: 'The Süleymaniye', genre: 'monument', from: 1545, to: 1570, cultures: ['turkish'] },
  { name: 'El Escorial', genre: 'monument', from: 1560, to: 1590, cultures: ['castilian'] },
  { name: 'St Peter\'s Basilica', genre: 'monument', from: 1505, to: 1630 },
  { name: 'Versailles', genre: 'monument', from: 1660, to: 1710, cultures: ['french'] },
  { name: 'The Taj Mahal', genre: 'monument', from: 1630, to: 1660, cultures: ['hindustani', 'persian'] },
  { name: 'The Forbidden City Gate', genre: 'monument', from: 1451, to: 1750, cultures: ['chinese'] },
  { name: 'Himeji Castle', genre: 'monument', from: 1600, to: 1620, cultures: ['japanese'] },
];

/** Plain titles for works without a famous name. */
export const TITLE_PARTS: Record<string, { a: string[]; b: string[] }> = {
  sacred: { a: ['The Virgin of', 'The Altarpiece of', 'The Martyrdom of', 'The Annunciation of', 'Saint James of'], b: ['the Rosary', 'the Kings', 'Mercy', 'the Sea', 'the Pillar'] },
  portrait: { a: ['Portrait of', 'The Coronation of', 'The Triumph of', 'Equestrian Portrait of'], b: [] },
  epic: { a: ['The Song of', 'The Romance of', 'The Deeds of', 'The Lament for'], b: ['the Twelve Knights', 'the Frontier', 'the Lost Kingdom', 'the Golden Isles', 'the Siege'] },
  treatise: { a: ['A Treatise on', 'The Book of', 'On'], b: ['the Heavens', 'Navigation', 'Good Government', 'the Body', 'Grammar', 'the Stars'] },
  monument: { a: ['The Cathedral of', 'The Royal Palace of', 'The Great Square of', 'The Bridge of', 'The Monastery of'], b: [] },
};

/** Who speaks for each faith, and what your church thinks of you. */
export const RELIGION_HEADS: Record<string, { name: string; seat: string }> = {
  catholic: { name: 'The Pope', seat: 'Rome' },
  protestant: { name: 'The Synod', seat: 'the reformed churches' },
  orthodox: { name: 'The Ecumenical Patriarch', seat: 'Constantinople' },
  coptic: { name: 'The Coptic Pope', seat: 'Alexandria' },
  muslim: { name: 'The Caliph and the ulema', seat: 'Cairo' },
  hindu: { name: 'The Brahmins', seat: 'Varanasi' },
  buddhist: { name: 'The Sangha', seat: 'the great monasteries' },
  confucian: { name: 'The Literati', seat: 'the academies' },
  shinto: { name: 'The Great Shrines', seat: 'Ise' },
  animist: { name: 'The Elders', seat: 'the sacred groves' },
  nahuatl: { name: 'The High Priests', seat: 'the Great Temple' },
  inti: { name: 'The Willaq Umu', seat: 'Cuzco' },
};

/** Specialists of the People menu: courtiers become one of them for good on their first mission. */
export const PEOPLE_ROLES = ['courtier', 'priest', 'artist', 'leader'] as const;
