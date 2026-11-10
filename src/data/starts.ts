// Later start dates. Who owns what comes from later-owners.ts (one row per province); this file
// says how each date differs otherwise: names, wars, alliances, governments, the age, the end.
export interface StartDef {
  year: number; end: number; name: string; text: string;
  age: string;                 // the age the world is in
  techBefore: number;          // the player knows every technology from before this year
  devBonus: number;            // provinces of real realms are this much more developed
  renames: Record<string, { name?: string; adj?: string; capital?: string }>;
  wars: [string, string][];
  alliances: [string, string][];
  gov: Record<string, string>; // the player's government, by realm (feudal otherwise)
  featured: string[];          // realms shown first in the picker
  rulers: Record<string, [string, number]>; // who reigns at the start, and until when
  units: Record<string, string>; // what each old troop type has become by then
  devWeight: number;           // score per development point owned (1 in 1451): the giants of later worlds count for less
}

export const STARTS: Record<number, StartDef> = {
  1600: {
    year: 1600, end: 1780, devWeight: 0.5, name: 'The Age of Reformation', age: 'reformation', techBefore: 1591, devBonus: 1,
    text: 'Spain rules a world empire, the Dutch fight for freedom, Akbar rules India, and the Ming face the Manchus.',
    renames: {
      castile: { name: 'Spain', adj: 'Spanish', capital: 'madrid' }, muscovy: { name: 'Russia', adj: 'Russian' },
      poland: { name: 'Poland-Lithuania', adj: 'Polish' }, japan: { name: 'Tokugawa Japan', adj: 'Japanese' }, ottomans: { capital: 'constantinople' },
    },
    wars: [['castile', 'netherlands'], ['castile', 'england'], ['ottomans', 'austria'], ['sweden', 'poland']],
    alliances: [['england', 'netherlands'], ['ming', 'korea'], ['castile', 'austria'], ['castile', 'portugal']],
    gov: { netherlands: 'parliament', venice: 'parliament', england: 'feudal' },
    featured: ['castile', 'netherlands', 'england', 'france', 'sweden', 'austria', 'ottomans', 'muscovy', 'poland', 'venice', 'portugal', 'safavids', 'mughals', 'ming', 'japan'],
    rulers: {
      castile: ['Felipe III', 1621], england: ['Elizabeth I', 1603], france: ['Henri IV', 1610], netherlands: ['Stadtholder Maurits', 1625], muscovy: ['Tsar Boris Godunov', 1605],
      ottomans: ['Mehmed III', 1603], mughals: ['Akbar the Great', 1605], safavids: ['Shah Abbas I', 1629], ming: ['the Wanli Emperor', 1620], japan: ['Tokugawa Ieyasu', 1616],
      austria: ['Rudolf II', 1612], sweden: ['Karl IX', 1611], poland: ['Zygmunt III', 1632], portugal: ['Filipe II', 1621], venice: ['Doge Marino Grimani', 1605],
      brandenburg: ['Joachim Friedrich', 1608], denmark: ['Christian IV', 1648], scotland: ['James VI', 1625], papacy: ['Clement VIII', 1605],
    },
    units: { levy: 'pikemen', men_at_arms: 'pikemen', crossbow: 'arquebusiers', bombard: 'field_cannon', jinetes: 'reiters', knights: 'cuirassiers' },
  },
  1700: {
    year: 1700, end: 1810, devWeight: 0.5, name: 'The Age of Absolutism', age: 'absolutism', techBefore: 1691, devBonus: 2,
    text: 'The Sun King rules France, Peter the Great builds a new Russia, Prussia rises, and English colonists fill the American coast.',
    renames: {
      castile: { name: 'Spain', adj: 'Spanish', capital: 'madrid' }, muscovy: { name: 'Russia', adj: 'Russian' },
      brandenburg: { name: 'Prussia', adj: 'Prussian' }, poland: { name: 'Poland-Lithuania', adj: 'Polish' }, ottomans: { capital: 'constantinople' }, japan: { name: 'Tokugawa Japan', adj: 'Japanese' },
    },
    wars: [['sweden', 'muscovy'], ['sweden', 'denmark'], ['sweden', 'poland']],
    alliances: [['england', 'netherlands'], ['france', 'castile'], ['austria', 'england'], ['muscovy', 'poland']],
    gov: { france: 'absolutism', castile: 'absolutism', austria: 'absolutism', muscovy: 'absolutism', sweden: 'absolutism', brandenburg: 'absolutism', denmark: 'absolutism', england: 'parliament', netherlands: 'parliament', thirteen_colonies: 'parliament', venice: 'parliament' },
    featured: ['france', 'england', 'thirteen_colonies', 'brandenburg', 'muscovy', 'austria', 'castile', 'netherlands', 'sweden', 'ottomans', 'safavids', 'mughals', 'marathas', 'qing', 'japan'],
    rulers: {
      france: ['Louis XIV, the Sun King', 1715], castile: ['Felipe V', 1724], england: ['William III', 1702], netherlands: ['Stadtholder Willem III', 1702], muscovy: ['Peter the Great', 1725],
      brandenburg: ['Friedrich III', 1713], austria: ['Leopold I', 1705], sweden: ['Karl XII', 1718], ottomans: ['Mustafa II', 1703], mughals: ['Aurangzeb', 1707],
      qing: ['the Kangxi Emperor', 1722], marathas: ['Tarabai', 1708], safavids: ['Shah Sultan Husayn', 1722], poland: ['August II the Strong', 1733],
      thirteen_colonies: ['the Colonial Assemblies', 1720], japan: ['Tokugawa Tsunayoshi', 1709], denmark: ['Frederik IV', 1730], portugal: ['Pedro II', 1706], scotland: ['William II', 1702], papacy: ['Clement XI', 1721],
    },
    units: { levy: 'musketeers', men_at_arms: 'line_infantry', crossbow: 'musketeers', bombard: 'field_cannon', jinetes: 'dragoons', knights: 'cuirassiers', pikemen: 'musketeers' },
  },
};
export const START_YEARS = [1451, 1600, 1700];
