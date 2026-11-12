// Core game state types. Everything the game needs to save lives in GameState.

export type Role = 'general' | 'diplomat' | 'admin' | 'merchant' | 'researcher' | 'explorer' | 'conqueror' | 'colonist' | 'admiral' | 'courtier' | 'priest' | 'artist' | 'leader';
export type Cat = 'military' | 'diplomacy' | 'internal' | 'economy' | 'research' | 'culture';
export const CATS: Cat[] = ['military', 'diplomacy', 'internal', 'economy', 'research', 'culture'];
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Personality = 'expansionist' | 'merchant' | 'cautious' | 'zealot' | 'balanced';

export interface TroopCard {
  uid: number;
  type: string;   // TroopType id
  vet: number;    // 0..3 veterancy stars
  str: number;    // 0..100 strength
  fought?: number; // turn of its last battle: one battle a season
  mission?: number;
  might?: number; // a forged company is worth this many ordinary ones (1 by default)
  loc?: string;   // where it stands: a province id, or 'base:<province>' for an invasion base
  moving?: { to: string; eta: number }; // marching to another garrison
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
  back?: number;       // quarters until back at court after a mission abroad
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
  occupiedFrom?: string; // taken in a war that is not over yet: shown striped until peace
  land: string;       // landmass id
  lon: number;
  lat: number;
  control: number;    // 0..100: how firmly the crown rules here
  good: string;       // trade good produced
  culture: string;
  religion: string;
  settlement: number; // 0 none, 1 village, 2 town, 3 city, 4 metropolis
  grades: Record<string, number>; // building quality multiplier (Shoddy 0.75 … Wonder 2)
  make?: string;      // what its Workshop / Manufactory makes
}

export type MissionKind =
  | 'conquer' | 'raid'
  | 'relations' | 'trade' | 'alliance' | 'marriage' | 'peace'
  | 'research' | 'build' | 'develop' | 'found' | 'grow' | 'tax' | 'progress'
  | 'explore' | 'colonize' | 'conquista'
  | 'vassalize' | 'integrate' | 'patronage' | 'convert' | 'assimilate' | 'grace' | 'base' | 'route' | 'post' | 'artwork' | 'pilgrimage' | 'accept' | 'assist';

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
  good?: string;         // good traded (trade routes)
  dir?: 'buy' | 'sell';  // trade routes
  amount?: number;       // trade routes: loads a year
}

/** A work of art. Its happiness fades to nothing by `until`; it pays ducats until `goldUntil`. */
export interface Artwork { id: number; name: string; genre: string; quality: number; year: number; artist: string; culture: string; happy: number; until: number; gold: number; goldUntil: number; }

/** A standing trade route: buys or sells loads of one good every quarter. */
export interface TradeRoute { id: number; good: string; dir: 'buy' | 'sell'; partner: string; amount: number; since: number; deal: number; }
/** A trading post abroad: cheaper buying and better selling with that realm. */
export interface TradePost { nation: string; since: number; }

export interface Treaty { a: string; b: string; kind: 'trade' | 'alliance' | 'marriage'; since: number; }
export interface War { a: string; b: string; since: number; gainsA: number; gainsB: number; winsA?: number; winsB?: number; }
export interface Truce { a: string; b: string; until: number; }

export interface BattleUnit {
  uid: number;
  type: string;
  vet: number;
  might?: number;
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

export interface Incoming { id: number; nation: string; target: string; force: number[]; due: number; defenders?: number[]; general?: number; chosen?: boolean; }
export interface Base { target: string; troops: number[]; char: number; ships: number[]; ready: boolean; since: number; }
export interface Viceroy { char: number; seat: string; provinces: string[]; loyalty: number; since: number; }
export interface BattleRecord {
  year: number; quarter: number; province: string; att: string; def: string;
  attPower: number; defPower: number; winner: 'att' | 'def'; player?: 'won' | 'lost'; naval?: boolean; context: string;
}
/** What happened over the current year, for the annual report. */
export interface TurnLog { year: number; quarter: number; battles: BattleRecord[]; done: { kind: string; title: string; ok: boolean }[]; gold?: number; np?: number; cards?: Record<string, number>; }

export interface Battle {
  id: number;
  att: BattleSide;
  def: BattleSide;
  province: string;
  round: number;          // rounds completed
  logs: RoundLog[];
  playerSide: 'att' | 'def';
  context: 'conquer' | 'defend' | 'raid' | 'rebels' | 'sea';
  siege?: boolean; // the great siege of Constantinople
  camp?: boolean;  // an attack on a half-built invasion base
  rebel?: { cause: string; name: string; adj: string }; // a rising: if it wins, a civil war
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
  | { kind: 'reveal'; title: string; subtitle?: string; items: RevealItem[]; alarm?: boolean }
  | { kind: 'draft'; draft: 'buy' | 'court' | 'ambition' | 'gift'; cat?: Cat; options: DraftOption[] }
  | { kind: 'succession'; heirs: Heir[]; old: string }
  | { kind: 'peace'; enemy: string; offered: boolean; surrender?: boolean }
  | { kind: 'incoming'; id: number }
  | { kind: 'gameover'; victory: boolean; reason: string }
  | { kind: 'mission_end'; won: boolean };

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
  quarter?: number;  // 0 spring, 1 summer, 2 autumn, 3 winter: one turn is one quarter
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
  gov?: string;                     // form of government (data/governments.ts); feudal when missing
  revolution?: { to: string; rebel: string; rebelCapital: string; myCapital: string; since: number; from: string; broken?: number };
  scenario?: Scenario;              // mission mode: goals and a deadline
  archive?: HandCard[];             // cards set aside: they do not count against the hand limit
  cardAccum: Record<Cat, number>;
  bought: Record<Cat, number>;      // cards bought this year (price rises)
  np: number;                       // nation points
  imports: { good: string; from: string }[]; // old saves only
  stock: Record<string, number>;    // loads in the warehouses
  short: Record<string, number>;    // share of last year's need that went unmet (0..1)
  routes: TradeRoute[];
  works?: Artwork[];                // works of art made for the crown
  giftYear?: number;                // last year a gift went to your church
  posts: TradePost[];
  tradeYear?: { bought: number; sold: number; local: number; market: number }; // ducats over the last four quarters
  overseas: Record<string, { found: boolean; holder: string | null; colony: number; subdued: boolean }>;
  stats: Stats;
  core: string[];                   // adopted core cards
  fleet: TroopCard[];               // the player's ships
  art: number;                      // 0..100 patronage of the arts
  taxBurden: number;                // 0..30, decays each year
  accepted: string[];               // accepted cultures
  stateReligion: string;
  happiness: number;                // national, 0..100 (cached each year)
  age?: { id: string; since: number; pioneer?: string };
  launched?: number;                // missions started this year (capped by realm rank)
  viceroys?: Viceroy[];
  incoming?: Incoming[];            // enemy armies on the march against you
  bases?: Base[];                   // your invasion bases
  tutorial?: number;                // step of the tutorial, -1 when done
  turnLog?: TurnLog;                // what happened this turn, for the report
  battleLog?: BattleRecord[];       // the player's battles, newest last // the current age and who opened it
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

/** A goal of a mission. Lands are named by their owner in 1451 ("the lands of Granada"), or by province. */
export type Goal =
  | { k: 'own'; provinces: string[]; label?: string }          // hold these provinces
  | { k: 'ownLands'; of: string[]; label?: string }            // hold every province these realms held in 1451
  | { k: 'provinces'; n: number }                              // hold at least n provinces
  | { k: 'holdIn'; regions: string[]; n: number; label?: string } // hold n provinces in these regions
  | { k: 'colonies'; n: number; regions?: string[] }           // n provinces overseas (in these regions)
  | { k: 'discover'; regions: string[] }                       // explorers have found these regions
  | { k: 'posts'; n: number; regions?: string[] }              // trade posts with realms in these regions
  | { k: 'techs'; n: number }                                  // know n technologies
  | { k: 'rank'; top: number }                                 // among the top n powers by score
  | { k: 'army'; top: number }                                 // army strength among the top n
  | { k: 'navy'; top: number }                                 // navy strength among the top n
  | { k: 'income'; top: number; regions?: string[] }           // income among the top n (of realms with a capital in these regions)
  | { k: 'noneIn'; nation: string; of: string[]; label?: string } // that realm holds none of the 1451 lands of these realms
  | { k: 'subjects'; of: string[] }                            // these realms are your subjects, or their capitals are yours
  | { k: 'gov'; gov: string }                                  // this form of government
  | { k: 'capital' }                                           // hold your capital (checked at the deadline)
  | { k: 'independent' }
  | { k: 'newTechs'; n: number }                               // learn n technologies during the mission
  | { k: 'built'; n: number }                                  // finish n buildings during the mission
  | { k: 'routes'; n: number }                                 // have n trade routes running
  | { k: 'works'; n: number }                                  // n works of art made during the mission
  | { k: 'court'; n: number }
  | { k: 'companies'; n: number }                              // n companies in your army
  | { k: 'devGain'; n: number }                                // n development gained during the mission
  | { k: 'hired'; n: number }                                  // hire n troop companies
  | { k: 'forged'; n: number }                                 // forge n times
  | { k: 'people'; n: number }                                 // hire n people to the court
  | { k: 'dismissed'; n: number }                              // dismiss n people
  | { k: 'missionsDone'; n: number }                           // finish n missions of any kind
  | { k: 'tradeProfit'; n: number }                            // trade routes earn n ducats a year, after imports and posts
  | { k: 'launched'; kind: string; n?: number; label?: string } // start n missions of a kind
  | { k: 'atWar'; with: string }                               // be at war with a realm
  | { k: 'gone'; nation: string }                              // that realm is no more (or your subject)
  | { k: 'capitalAt'; province: string }                       // your capital is there
  | { k: 'relation'; with: string; n: number }                 // relations of at least n
  | { k: 'treaty'; with: string; kind: 'marriage' | 'alliance' | 'trade' } // a treaty with a realm
  | { k: 'route'; dir: 'buy' | 'sell'; n: number };            // n trade routes that buy (import) or sell (export)                                 // n people at court                                      // no overlord
export interface Scenario {
  id: string; name: string; text: string; deadline: number; goals: Goal[];
  status: 'active' | 'won' | 'lost'; done?: number;            // year it was won or lost
  custom?: boolean;
  steps?: { g: Goal; hint: string }[]; // a guided mission: steps in order
  step?: number;                       // how many steps are done
}
