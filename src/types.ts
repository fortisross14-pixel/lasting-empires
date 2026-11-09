// Core game state types. Everything the game needs to save lives in GameState.

export type Role = 'general' | 'diplomat' | 'admin' | 'merchant' | 'researcher' | 'explorer' | 'conqueror' | 'colonist' | 'admiral';
export type Cat = 'military' | 'diplomacy' | 'internal' | 'economy' | 'research';
export const CATS: Cat[] = ['military', 'diplomacy', 'internal', 'economy', 'research'];
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Personality = 'expansionist' | 'merchant' | 'cautious' | 'zealot' | 'balanced';

export interface TroopCard {
  uid: number;
  type: string;   // TroopType id
  vet: number;    // 0..3 veterancy stars
  str: number;    // 0..100 strength
  mission?: number;
}

export interface EquipCard {
  uid: number;
  type: string;   // EquipType id
}

export interface Character {
  uid: number;
  name: string;
  role: Role;
  skill: number;  // 1..6
  traits: string[];
  born: number;
  dies: number;   // year of death (hidden from the player)
  rarity: Rarity;
  xp: number;
  mission?: number;
  legendId?: string;
  ruler?: boolean;     // the monarch, who can also act in their role
  wins?: number;
  losses?: number;
}

export interface HandCard {
  uid: number;
  card: string;   // HandCardDef id
}

export interface Ruler {
  name: string;
  traits: string[];   // flavour from history
  arch: string;       // RulerArch id: what the monarch is good at
  skill: number;
  from: number;
  to: number;
  prestigeAtStart?: number;
}

export interface Heir { name: string; arch: string; skill: number; reign: number; historical?: boolean; traits: string[]; }

export interface Nation {
  id: string;
  name: string;
  adj: string;
  color: string;
  culture: string;
  capital: string;
  gold: number;
  manpower: number;
  stability: number;  // -3..+3
  prestige: number;
  personality: Personality;
  army: TroopCard[];  // used by AI nations
  fleet: TroopCard[]; // ships (AI nations)
  overlord?: string;  // this crown is a subject of another
  subject?: 'vassal' | 'union';
  subjectSince?: number;
  alive: boolean;
  ruler: Ruler;
  spiedUntil?: number;
}

export interface Province {
  id: string;
  name: string;
  owner: string;
  core: string;       // original owner
  dev: number;        // 1..6
  fort: number;       // 0..3
  buildings: string[];
  favor?: number;     // happiness from royal grace, fades by 1 a year
  land: string;       // landmass id
  lon: number;
  lat: number;
  control: number;    // 0..100: how firmly the crown rules here
  good: string;       // trade good produced
  culture: string;
  religion: string;
  settlement: number; // 0 none, 1 village, 2 town, 3 city, 4 metropolis
  grades: Record<string, number>; // building quality multiplier (Shoddy 0.75 … Wonder 2)
}

export type MissionKind =
  | 'conquer' | 'raid'
  | 'relations' | 'trade' | 'alliance' | 'marriage' | 'peace'
  | 'research' | 'build' | 'develop' | 'found' | 'grow' | 'tax' | 'progress'
  | 'explore' | 'colonize' | 'conquista'
  | 'vassalize' | 'integrate' | 'patronage' | 'convert' | 'assimilate' | 'grace';

export interface Mission {
  id: number;
  kind: MissionKind;
  char: number;          // character uid
  troops: number[];      // troop uids
  ships?: number[];      // ship uids (sea routes)
  target: string;        // province id, nation id or tech id
  building?: string;
  turnsLeft: number;
  total: number;
  progress: number;      // research points accumulated
  bonus: number;         // flat success bonus from cards (0..1)
  good?: string;         // good to import (trade routes)
}

export interface Treaty { a: string; b: string; kind: 'trade' | 'alliance' | 'marriage'; since: number; }
export interface War { a: string; b: string; since: number; gainsA: number; gainsB: number; winsA?: number; winsB?: number; }
export interface Truce { a: string; b: string; until: number; }

export interface BattleUnit {
  uid: number;
  type: string;
  vet: number;
  str: number;
  start: number;
  garrison?: boolean;
}

export interface BattleGeneral { name: string; skill: number; traits: string[]; uid?: number; mult?: number; }

export interface BattleSide {
  nation: string;
  units: BattleUnit[];
  general: BattleGeneral | null;
  startHP: number;
  fort: number;
  player: boolean;
}

export interface RoundLog {
  round: number;
  attTactic: string;
  defTactic: string;
  attCountered: boolean;
  defCountered: boolean;
  dmgToAtt: number;
  dmgToDef: number;
}

export interface Battle {
  id: number;
  att: BattleSide;
  def: BattleSide;
  province: string;
  round: number;          // rounds completed
  logs: RoundLog[];
  playerSide: 'att' | 'def';
  context: 'conquer' | 'defend' | 'raid' | 'rebels' | 'sea';
  naval?: boolean;
  follow?: { type: 'land-attack' | 'land-defend'; missionId?: number; nation?: string; force?: number[] };
  missionId?: number;
  done: boolean;
  winner?: 'att' | 'def';
  options: string[];      // tactic choices for the player this round
  enemyNext: string;      // enemy tactic already chosen for this round (hidden unless scouted)
  scout: boolean;         // enemy tactic is revealed this round (Cunning in round 1, Ambush always)
  ambush: boolean;
  result?: { title: string; lines: string[]; good: boolean };
}

export interface RevealItem {
  title: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  kind?: string;          // icon key
}

export type Prompt =
  | { kind: 'event'; eventId: string; vars: Record<string, string | number> }
  | { kind: 'battle'; battle: Battle }
  | { kind: 'reveal'; title: string; subtitle?: string; items: RevealItem[] }
  | { kind: 'draft'; draft: 'buy' | 'court' | 'ambition' | 'gift'; cat?: Cat; options: DraftOption[] }
  | { kind: 'succession'; heirs: Heir[]; old: string }
  | { kind: 'peace'; enemy: string; offered: boolean }
  | { kind: 'gameover'; victory: boolean; reason: string };

export type DraftOption =
  | { t: 'troop'; type: string; vet: number }
  | { t: 'equip'; type: string }
  | { t: 'char'; ch: Character }
  | { t: 'card'; card: string }
  | { t: 'ambition'; id: string };

export interface LogEntry { year: number; text: string; tone: 'good' | 'bad' | 'neutral'; }

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  nextUid: number;
  year: number;
  startYear: number;
  endYear: number;
  player: string;
  nations: Record<string, Nation>;
  provinces: Record<string, Province>;
  rel: Record<string, number>;
  treaties: Treaty[];
  wars: War[];
  truces: Truce[];
  hand: HandCard[];
  cardAccum: Record<Cat, number>;
  bought: Record<Cat, number>;      // cards bought this year (price rises)
  np: number;                       // nation points
  imports: { good: string; from: string }[];
  overseas: Record<string, { found: boolean; holder: string | null; colony: number; subdued: boolean }>;
  stats: Stats;
  core: string[];                   // adopted core cards
  fleet: TroopCard[];               // the player's ships
  art: number;                      // 0..100 patronage of the arts
  taxBurden: number;                // 0..30, decays each year
  accepted: string[];               // accepted cultures
  stateReligion: string;
  happiness: number;                // national, 0..100 (cached each year)
  coreChanged: number;              // year of the last change
  troops: TroopCard[];
  equipment: EquipCard[];
  characters: Character[];
  missions: Mission[];
  techs: string[];
  firedEvents: string[];
  usedLegends: string[];
  queue: Prompt[];
  log: LogEntry[];
  flags: Record<string, number>;
  ambition: string | null;
  ambitionDone: boolean;
  over: boolean;
}

export interface Stats {
  battles: Record<string, { won: number; lost: number }>;
  kings: { name: string; arch: string; from: number; to: number; prestige: number }[];
  fallen: { name: string; role: Role; skill: number; wins: number; losses: number; until: number }[];
  wars: { won: number; lost: number };
}
