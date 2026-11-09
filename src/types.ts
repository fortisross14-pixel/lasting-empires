// Core game state types. Everything the game needs to save lives in GameState.

export type Role = 'general' | 'diplomat' | 'admin';
export type Rarity = 'common' | 'rare' | 'legendary';
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
}

export interface HandCard {
  uid: number;
  card: string;   // HandCardDef id
}

export interface Ruler {
  name: string;
  traits: string[];
  from: number;
  to: number;
}

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
  land: string;       // landmass id
  lon: number;
  lat: number;
  unrest: number;
}

export type MissionKind =
  | 'conquer' | 'raid'
  | 'relations' | 'trade' | 'alliance' | 'marriage' | 'peace'
  | 'research' | 'build' | 'develop' | 'tax' | 'progress';

export interface Mission {
  id: number;
  kind: MissionKind;
  char: number;          // character uid
  troops: number[];      // troop uids
  target: string;        // province id, nation id or tech id
  building?: string;
  turnsLeft: number;
  total: number;
  progress: number;      // research points accumulated
  bonus: number;         // flat success bonus from cards (0..1)
}

export interface Treaty { a: string; b: string; kind: 'trade' | 'alliance' | 'marriage'; since: number; }
export interface War { a: string; b: string; since: number; gainsA: number; gainsB: number; }
export interface Truce { a: string; b: string; until: number; }

export interface BattleUnit {
  uid: number;
  type: string;
  vet: number;
  str: number;
  start: number;
  garrison?: boolean;
}

export interface BattleGeneral { name: string; skill: number; traits: string[]; uid?: number; }

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
  context: 'conquer' | 'defend' | 'raid' | 'rebels';
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
  | { kind: 'draft'; draft: 'levy' | 'pro' | 'court' | 'ambition'; options: DraftOption[] }
  | { kind: 'gameover'; victory: boolean; reason: string };

export type DraftOption =
  | { t: 'troop'; type: string; vet: number }
  | { t: 'equip'; type: string }
  | { t: 'char'; ch: Character }
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
  deck: string[];
  discard: string[];
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
  draftsThisTurn: number;
  over: boolean;
}
