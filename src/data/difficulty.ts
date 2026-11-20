// Difficulty: every lever in one table. Standard is the game as it was balanced (see docs/BALANCE.md);
// change a number here, then run `DIFF=0|1|2 npm run sim`.

export interface DifficultyDef {
  id: number; name: string; text: string;
  /** How much stronger than your border guard a rival must be to declare war on you. */
  warEdge: number;
  /** Years between declarations of war on you, by anyone. */
  warGap: number;
  /** Years of peace at the start: nobody declares war on you. */
  grace: number;
  /** Chance that a rival spares an attack on a crown of three provinces or fewer. */
  mercy: number;
  /** Your starting treasure, multiplied. */
  gold: number;
  /** Rival development pace, multiplied. */
  aiGrowth: number;
  /** Companies added to every rival's army limit. */
  aiArmy: number;
}

export const DIFFICULTY: DifficultyDef[] = [
  { id: 0, name: 'Gentle', text: 'Rivals leave you in peace for 15 years, attack rarely and grow slowly. A fuller treasury to start.', warEdge: 1.6, warGap: 45, grace: 15, mercy: 0.9, gold: 1.5, aiGrowth: 0.8, aiArmy: -1 },
  { id: 1, name: 'Standard', text: 'The game as designed: rivals attack when clearly stronger, now and then.', warEdge: 1.25, warGap: 30, grace: 10, mercy: 0.7, gold: 1, aiGrowth: 1, aiArmy: 0 },
  { id: 2, name: 'Hard', text: 'Rivals attack as soon as they match you, every dozen years, with bigger armies. A leaner treasury.', warEdge: 1.0, warGap: 12, grace: 5, mercy: 0.3, gold: 0.8, aiGrowth: 1.3, aiArmy: 2 },
];
export const STANDARD = 1;

/** Lengths of an open game, in years from the start (0 = to the end of the age). */
export const LENGTHS: { id: string; name: string; years: number; text: string }[] = [
  { id: 'reign', name: 'A reign', years: 40, text: '40 years: an evening' },
  { id: 'century', name: 'A century', years: 100, text: '100 years: a few evenings' },
  { id: 'age', name: 'The whole age', years: 0, text: 'To the end date: a long campaign' },
];
