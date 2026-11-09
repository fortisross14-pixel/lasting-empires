// Core cards: the guiding principles of the realm. Each axis has two opposite cards;
// without either you sit in the middle. Slots open as the realm grows and researches.

export interface AxisDef { id: string; name: string; left: string; right: string; }
export interface CoreDef { id: string; axis: string; name: string; icon: string; pros: string[]; cons: string[]; }

export const AXES: AxisDef[] = [
  { id: 'arms', name: 'Arms', left: 'land', right: 'sea' },
  { id: 'focus', name: 'Focus', left: 'expansion', right: 'consolidation' },
  { id: 'mind', name: 'Outlook', left: 'open', right: 'traditional' },
  { id: 'wealth', name: 'Wealth', left: 'mercantile', right: 'agrarian' },
];

export const CORE: Record<string, CoreDef> = {
  land: { id: 'land', axis: 'arms', name: 'Land Power', icon: 'pike',
    pros: ['+10% battle strength', '+2 army size', '+0.2 Military cards a year'], cons: ['Sea attacks take 1 year longer'] },
  sea: { id: 'sea', axis: 'arms', name: 'Sea Power', icon: 'anchor',
    pros: ['Attacks by sea 1 year faster', 'Voyages +15% discovery', 'Trade treaties +1 ducat', '+0.1 Diplomacy and Economy cards'], cons: ['−5% battle strength on land'] },
  expansion: { id: 'expansion', axis: 'focus', name: 'Expansion', icon: 'sword',
    pros: ['Declaring war costs 1 less stability', '+5 prestige per conquest', '+0.2 Military cards'], cons: ['Conquered lands gain control 1 slower', '−0.1 Internal cards'] },
  consolidation: { id: 'consolidation', axis: 'focus', name: 'Consolidation', icon: 'tower',
    pros: ['+3 control a year everywhere', '+0.3 Internal cards', 'Building, settling and developing roll twice, keep the best'], cons: ['Declaring war costs 1 more stability'] },
  open: { id: 'open', axis: 'mind', name: 'Open-minded', icon: 'book',
    pros: ['Research 25% faster', '+0.3 Research cards', 'Studies roll twice, keep the best', 'Trade missions +10%'], cons: ['−0.5 nation points a year'] },
  traditional: { id: 'traditional', axis: 'mind', name: 'Traditional', icon: 'church',
    pros: ['+1 nation point a year', '+1 stability when adopted', 'Papacy relations +20'], cons: ['Research 15% slower'] },
  mercantile: { id: 'mercantile', axis: 'wealth', name: 'Mercantile', icon: 'coin',
    pros: ['Trade treaties +50%', 'Imports 30% cheaper', '+0.3 Economy cards'], cons: ['−0.3 manpower a year'] },
  agrarian: { id: 'agrarian', axis: 'wealth', name: 'Agrarian', icon: 'wheat',
    pros: ['+0.5 manpower a year', 'Farms and pastures +50%', '+1 control a year'], cons: ['Trade treaties −20%'] },
};

/** Card-rate bonuses from core cards. */
export const CORE_RATES: Record<string, Partial<Record<'military' | 'diplomacy' | 'internal' | 'economy' | 'research', number>>> = {
  land: { military: 0.2 }, sea: { diplomacy: 0.1, economy: 0.1 }, expansion: { military: 0.2, internal: -0.1 },
  consolidation: { internal: 0.3 }, open: { research: 0.3 }, mercantile: { economy: 0.3 },
};
