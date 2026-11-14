import { provKnown } from './overseas';
import { ageIndex } from './core';
import { troopsNear } from './army';
import { commandOf, GENERIC_COMMAND } from '../data/characters';
import { courtCount, courtCap } from './core';
// History deck and random events. Each fires as a face-down card that flips to show choices.
import type { GameState, RevealItem } from '../types';
import { TROOPS } from '../data/troops';
import { LEGENDS } from '../data/characters';
import {
  player, provsOf, clamp, rand, pick, randInt, uid, addRel, getRel, addTreaty, hasTreaty, atWar, declareWar, makePeace,
  nationName, log, hasTech, push, armyCap, alliesOf, enemiesOf, inflation, borders, maxFort,
} from './core';
import { addCard, grantRandomCards } from './cards';
import { endWar } from './missions';
import { regionState } from './overseas';
import { ageOf, ageReached, openAge } from './ages';
import { unionClaim, subjectsOf, makeSubject, releaseSubject } from './diplo';
import '../data/legends'; // adds the legends of the wider world to LEGENDS
import { happinessOf, CULTURE_NAMES } from './society';
import { getGeo } from './map';
import { createBattle, makeSide, genericGeneral, transferProvince } from './battle';
import { cityFalls } from './history';
import { courtOptions } from './drafts';

type Vars = Record<string, string | number>;

export interface EventOption {
  label: string;
  hint?: string;
  can?: (s: GameState, v: Vars) => string | null;
  run: (s: GameState, v: Vars) => RevealItem[];
}

export interface EventDef {
  id: string;
  title: string | ((s: GameState, v: Vars) => string);
  text: (s: GameState, v: Vars) => string;
  art: string;
  window?: [number, number];
  chance: number;           // per year while eligible
  repeat?: number;          // minimum years between repeats; omitted = once only
  cond?: (s: GameState) => boolean;
  setup?: (s: GameState) => Vars | null;
  options: EventOption[];
  history?: boolean;        // shown on the history timeline
  anywhere?: boolean;       // a history card for realms outside Europe and its neighbours too (cond says whose)
}

const addCards = (s: GameState, id: string, n: number) => { for (let i = 0; i < n; i++) addCard(s, id); };
const stab = (s: GameState, d: number) => { const p = player(s); p.stability = clamp(p.stability + d, -3, 3); };
const good = (title: string, text: string, kind = 'star'): RevealItem => ({ title, text, tone: 'good', kind });
const bad = (title: string, text: string, kind = 'twist'): RevealItem => ({ title, text, tone: 'bad', kind });
const neutral = (title: string, text: string, kind = 'scroll'): RevealItem => ({ title, text, tone: 'neutral', kind });
const P = (s: GameState) => s.player;
const alive = (s: GameState, n: string) => !!s.nations[n]?.alive;
let REGION: Record<string, string> | null = null;
const regionOf = (id: string) => (REGION ??= Object.fromEntries(getGeo().seeds.map(x => [x.id, x.region])))[id] ?? '';
const AMERICAS = ['north_america', 'caribbean', 'mexico', 'andes', 'brazil', 'plata'];
/** Does the player hold land in the Americas that is not its homeland? */
const holdsNewWorld = (s: GameState) => provsOf(s, P(s)).some(p => AMERICAS.includes(regionOf(p.id)) && p.core !== P(s));
/** Lands far from home: another region than the capital's, and not the realm's own heartland. */
const overseasOf = (s: GameState) => { const home = regionOf(player(s).capital); return provsOf(s, P(s)).filter(p => regionOf(p.id) !== home && p.core !== P(s)); };
const CHRISTIAN = ['catholic', 'orthodox', 'protestant', 'coptic'];
/** The history deck is written for Europe and its neighbours. */
const westernRealm = (s: GameState) => ['europe', 'north_africa', 'middle_east', 'atlantic', 'russia'].includes(getGeo().seeds.find(x => x.id === s.nations[s.player].capital)?.region ?? 'europe');
/** Crowns whose provinces touch yours. */
const borderNations = (s: GameState) => { const out = new Set<string>(); for (const p of provsOf(s, P(s))) for (const nb of getGeo().adj[p.id]) { const o = s.provinces[nb].owner; if (o !== P(s)) out.add(o); } return out; };
const sameFaith = (s: GameState, n: string) => s.provinces[s.nations[n].capital]?.religion === s.stateReligion;
const coastIn = (f: (lon: number, lat: number) => boolean) => getGeo().seeds.filter(x => getGeo().coastal[x.id] && f(x.lon, x.lat)).map(x => x.id);
let MED_C: string[] | null = null, ATL_C: string[] | null = null;
const MED = () => (MED_C ??= coastIn((lon, lat) => lon > -5.5 && lon < 19 && lat > 35 && lat < 45.5));
const ATL = () => (ATL_C ??= coastIn((lon, lat) => lon < -5.3 && lon > -10 && lat > 35.8 && lat < 44));

function annexNation(s: GameState, other: string) {
  const o = s.nations[other];
  for (const p of provsOf(s, other)) { p.owner = s.player; p.core = s.player; p.control = Math.max(p.control, 50); }
  const room = armyCap(s) + 4 - s.troops.length;
  for (const t of o.army.slice(0, Math.max(0, room))) s.troops.push({ uid: uid(s), type: t.type, vet: t.vet, str: t.str });
  player(s).gold += Math.max(0, Math.round(o.gold));
  o.alive = false; o.army = [];
  s.wars = s.wars.filter(w => w.a !== other && w.b !== other);
  s.treaties = s.treaties.filter(t => t.a !== other && t.b !== other);
}


// ---------- helpers for the history of the wider world ----------
/** Ducats in the money of the day. */
const scaled = (s: GameState, n: number) => Math.round(n * inflation(s));
const needs = (s: GameState, n: number) => (player(s).gold < scaled(s, n) ? `Needs ${scaled(s, n)} ducats` : null);
const BEST: Record<'inf' | 'cav', string[]> = { inf: ['line_infantry', 'musketeers', 'arquebusiers', 'pikemen', 'men_at_arms'], cav: ['dragoons', 'cuirassiers', 'reiters', 'knights', 'jinetes'] };
/** Companies of the best kind the player can field today; returns the troop name. */
function addTroops(s: GameState, kind: 'inf' | 'cav', n: number) {
  const type = BEST[kind].find(t => !TROOPS[t].tech || hasTech(s, TROOPS[t].tech!)) ?? 'levy';
  for (let i = 0; i < n; i++) s.troops.push({ uid: uid(s), type, vet: 1, str: 100 });
  return TROOPS[type].name;
}
/** A realm of the AI raises extra companies of its age. */
function aiBoost(s: GameState, n: string, k: number) {
  const type = s.year < 1470 ? 'men_at_arms' : s.year < 1552 ? 'pikemen' : s.year < 1685 ? 'musketeers' : 'line_infantry';
  for (let i = 0; i < k; i++) s.nations[n].army.push({ uid: uid(s), type, vet: 0, str: 100 });
}
/** A lost battle: a share of the player's army is gone (at least one company). */
function lose(s: GameState, frac: number) {
  const home = s.troops.filter(t => t.mission == null);
  const k = Math.min(home.length, Math.max(1, Math.round(home.length * frac)));
  const gone = new Set(home.sort(() => rand(s) - 0.5).slice(0, k).map(t => t.uid));
  s.troops = s.troops.filter(t => !gone.has(t.uid));
}
const cutArmy = (n: { army: unknown[] }, frac: number) => { n.army.splice(0, Math.round(n.army.length * frac)); };
/** A legendary character joins the court, once per game; returns their name. */
function giveLegend(s: GameState, id: string): string | null {
  const l = LEGENDS.find(x => x.id === id);
  if (!l || s.usedLegends.includes(id)) return null;
  s.usedLegends.push(id);
  s.characters.push({ uid: uid(s), name: l.name, role: l.role, skill: l.skill, traits: [...l.traits], born: s.year - 30, dies: Math.max(l.to, s.year + 3), rarity: 'legendary', xp: 0, legendId: l.id });
  return l.name;
}
/** Take a side in someone else's quarrel: an ally, and a war on the other. */
function sideWith(s: GameState, friend: string, foe: string): RevealItem[] {
  addTreaty(s, P(s), friend, 'alliance'); addRel(s, P(s), friend, 30); stab(s, -1);
  if (alive(s, foe) && !atWar(s, P(s), foe)) { s.flags['claim_' + foe] = 1; declareWar(s, P(s), foe); }
  return [neutral('Kyoto burns', `${nationName(s, friend)} is your ally (+30) and you are at war with ${nationName(s, foe)}. Stability −1.`, 'torch')];
}
const STEPPE = ['mongols', 'oirats', 'jurchens', 'qing', 'moghulistan', 'uzbeks'];
/** Your provinces that face the steppe. */
const northFront = (s: GameState) => provsOf(s, P(s)).filter(p => getGeo().adj[p.id].some(nb => STEPPE.includes(s.provinces[nb].owner)));
const deccanFoe = (s: GameState) => ['marathas', 'bijapur', 'golconda', 'ahmadnagar'].find(n => alive(s, n) && borders(s, P(s), n)) ?? '';
/** Whom each crown sees as its enemy in the Seven Years' War. */
const RIVAL_1756: Record<string, string> = { england: 'france', france: 'england', austria: 'brandenburg', brandenburg: 'austria', muscovy: 'brandenburg', castile: 'england', sweden: 'brandenburg' };

export const EVENTS: EventDef[] = [
  {
    id: 'constantinople', history: true, title: s => s.flags.const_holds ? 'Constantinople Holds' : 'The Fall of Constantinople', art: 'tower', window: [1453, 1454], chance: 1,
    cond: s => !!(s.flags.const_fell || s.flags.const_holds) && P(s) !== 'ottomans' && P(s) !== 'byzantium',
    text: s => s.flags.const_holds ? 'Against all odds, the Sultan\'s guns fell silent and his host withdrew. The last Roman city stands.' : 'Sultan Mehmed\'s great cannon have breached the walls of the Queen of Cities. The last Roman emperor died in the breach. Messengers race west with the news.',
    options: [{
      label: 'Hear the news',
      run: s => {
        if (s.flags.const_holds) { player(s).gold += 20; return [good('The walls held', 'History takes a different road. A grateful Byzantine embassy brings 20 ducats.', 'coin')]; }
        addCards(s, 'greek_scholars', 2);
        return [bad('The City has fallen', 'The Ottoman Turks hold Constantinople.'), good('Greek Scholars', 'Scholars flee west with their books: two Greek Scholars research cards.', 'book')];
      },
    }],
  },
  // ---------- the siege, as Byzantium or as the Sultan ----------
  {
    id: 'giustiniani', title: 'A Genoese Captain', art: 'helm', window: [1452, 1453], chance: 2,
    cond: s => P(s) === 'byzantium' && !s.flags.siege_done,
    text: () => 'Giovanni Giustiniani Longo, a famous captain of Genoa, offers to defend the walls with seven hundred men of his own. He asks for gold, and the island of Lemnos when it is over.',
    options: [
      { label: 'Hire him (40 ducats)', can: s => player(s).gold < 40 ? 'Needs 40 ducats' : null, run: s => {
        player(s).gold -= 40;
        for (let i = 0; i < 3; i++) s.troops.push({ uid: uid(s), type: 'men_at_arms', vet: 2, str: 100 });
        s.characters.push({ uid: uid(s), name: 'Giovanni Giustiniani', role: 'general', skill: 5, traits: ['cautious', 'inspiring'], born: 1418, dies: 1453 + 6, rarity: 'legendary', xp: 0 });
        return [good('The Genoese arrive', 'Three veteran companies and a legendary general join the defence.', 'helm')];
      } },
      { label: 'We cannot pay', run: () => [neutral('He sails home', 'Constantinople must stand alone.')] },
    ],
  },
  {
    id: 'church_union', title: 'The Union of the Churches', art: 'church', window: [1451, 1453], chance: 1.2,
    cond: s => P(s) === 'byzantium' && !s.flags.siege_done && !s.flags.union_asked,
    text: () => 'The Pope promises ships and soldiers if the Orthodox Church submits to Rome. Your people would rather see the Sultan\'s turban in the City than the Latin mitre.',
    options: [
      { label: 'Proclaim the union', hint: 'Help arrives at the siege; your people are furious', run: s => { s.flags.union_asked = 1; s.flags.union_aid = 1; stab(s, -2); addRel(s, P(s), 'papacy', 40); addRel(s, P(s), 'venice', 20); return [good('Latin help is promised', 'Two companies of Latin crossbowmen and men-at-arms will reach the City before the siege. Stability −2.', 'church')]; } },
      { label: 'Refuse', run: s => { s.flags.union_asked = 1; stab(s, 1); return [neutral('Orthodox and alone', 'Stability +1. No help will come from Rome.', 'church')]; } },
    ],
  },
  {
    id: 'siege_attack', title: 'The Conquest of Constantinople', art: 'cannon', chance: 0,
    text: () => 'The Red Apple lies before you. Your host surrounds the city by land and sea, and the Hungarian founder Urban has cast a cannon such as the world has never seen.',
    options: [
      { label: 'Storm the walls', hint: 'Very likely to succeed', run: s => {
        if (rand(s) < 0.88) { cityFalls(s); player(s).prestige += 10; return [good('The City is yours', 'Constantinople falls. Prestige +40. You are Fatih, the Conqueror.', 'crown')]; }
        s.flags.siege_done = 0; s.flags.siege_next = s.year + 1; stab(s, -1);
        return [bad('Repulsed', 'The walls hold for now. Stability −1. You will try again next year.', 'tower')];
      } },
      { label: 'Bring up the great bombard (60 ducats)', hint: 'Almost certain', can: s => player(s).gold < 60 ? 'Needs 60 ducats' : null, run: s => {
        player(s).gold -= 60;
        if (rand(s) < 0.98) { cityFalls(s); player(s).prestige += 10; return [good('The walls crumble', 'Urban\'s gun opens a breach and Constantinople falls. Prestige +40.', 'cannon')]; }
        s.flags.siege_done = 0; s.flags.siege_next = s.year + 1; return [bad('The gun cracks', 'The great bombard bursts. Next year, then.', 'cannon')];
      } },
    ],
  },
  {
    id: 'printing', history: true, title: 'The Printing Press', art: 'book', window: [1460, 1480], chance: 0.15,
    text: () => 'A German printer offers to set up a press in your capital. The clergy grumble: who will control what is read?',
    options: [
      { label: 'Embrace it (−20 ducats)', can: s => player(s).gold < 20 ? 'Needs 20 ducats' : null,
        run: s => { player(s).gold -= 20; s.flags.printing_bonus = 1; if (!s.techs.includes('printing')) s.techs.push('printing'); return [good('Presses roll', 'You learn Printing Press, and every study gains +1 research a year.', 'book')]; } },
      { label: 'Restrict it', run: s => { stab(s, 1); return [neutral('The Church approves', 'Stability +1.', 'church')]; } },
    ],
  },
  {
    id: 'castile_succession', history: true, title: 'The Succession of Enrique IV', art: 'crown', window: [1464, 1473], chance: 0.25,
    cond: s => P(s) === 'castile',
    text: () => 'The nobles mock the King\'s daughter Juana as "la Beltraneja", a bastard. A faction rallies to his half-sister Isabel. You must choose an heir.',
    options: [
      { label: 'Back Isabel', hint: 'Portugal is angered', run: s => { addRel(s, 'castile', 'portugal', -30); addRel(s, 'castile', 'aragon', 20); return [neutral('Isabel is heir', 'Portugal, which backs Juana, is furious (relations −30). Aragon is pleased (+20).', 'crown')]; } },
      { label: 'Back Juana', hint: 'An alternate history', run: s => {
        s.flags.juana = 1; addRel(s, 'castile', 'portugal', 40); addTreaty(s, 'castile', 'portugal', 'marriage'); addRel(s, 'castile', 'aragon', -30);
        const r = player(s).ruler; void r;
        return [good('Juana is heir', 'Juana will marry Afonso V of Portugal. The two crowns draw close (marriage, +40).', 'ring'), bad('Isabel\'s party sulks', 'Aragon is offended (−30). The famous union with Aragon will not happen.', 'twist')];
      } },
    ],
  },
  {
    id: 'iberian_union', history: true, title: 'Isabel and Fernando', art: 'ring', window: [1469, 1480], chance: 0.3,
    cond: s => (P(s) === 'castile' && alive(s, 'aragon') && !s.flags.juana) || (P(s) === 'aragon' && alive(s, 'castile')),
    text: s => `A secret marriage is proposed between the heirs of Castile and Aragon. If the Cortes accept, the two crowns will become one. Relations: ${getRel(s, 'castile', 'aragon')}.`,
    options: [
      { label: 'Arrange the wedding', run: s => {
        const other = P(s) === 'castile' ? 'aragon' : 'castile';
        const p = clamp(0.55 + getRel(s, 'castile', 'aragon') / 200, 0.3, 0.85);
        if (rand(s) < p) {
          const name = s.nations[other].name;
          if (!unionClaim(s, other, true)) { addTreaty(s, 'castile', 'aragon', 'marriage'); addRel(s, 'castile', 'aragon', 30); return [neutral('A marriage, not a union', `${name} already answers to another crown. The houses are joined by marriage instead.`, 'ring')]; }
          player(s).prestige += 25;
          log(s, `The crowns of Castile and Aragon are united!`, 'good');
          return [good('The Crowns are United!', `${name} enters a personal union with your crown: one monarch, two kingdoms. It pays 40% of its income and fights at your side. After 15 years you may integrate it fully. Prestige +25.`, 'crown')];
        }
        addTreaty(s, 'castile', 'aragon', 'marriage'); addRel(s, 'castile', 'aragon', 20);
        return [bad('The Cortes refuse', 'The nobles will not accept a foreign king. A marriage alliance is signed instead.', 'ring')];
      } },
      { label: 'Refuse', run: s => { addRel(s, 'castile', 'aragon', -20); return [neutral('No union', 'Each crown goes its own way. Relations −20.')]; } },
    ],
  },
  {
    id: 'granada_crusade', history: true, title: 'A Crusade for Granada', art: 'church', window: [1478, 1495], chance: 0.25,
    cond: s => ['castile', 'aragon', 'portugal'].includes(P(s)) && alive(s, 'granada'),
    text: () => 'The Pope issues a bull of crusade against the last Muslim kingdom of Iberia. Gold and volunteers are offered to whoever takes the cross.',
    options: [
      { label: 'Take the cross', run: s => {
        s.flags.claim_granada = 1; addCard(s, 'crusade'); addRel(s, P(s), 'papacy', 15);
        if (!atWar(s, P(s), 'granada')) declareWar(s, P(s), 'granada');
        return [good('Holy war', 'You are at war with Granada without losing stability. A Crusade Bull card is added.', 'church')];
      } },
      { label: 'Not now', run: s => { addRel(s, P(s), 'papacy', -10); return [neutral('The Pope is disappointed', 'Relations with the Papacy −10.')]; } },
    ],
  },
  {
    id: 'columbus', history: true, title: 'A Genoese Navigator', art: 'anchor', window: [1484, 1496], chance: 0.25,
    cond: s => provsOf(s, P(s)).some(p => ATL().includes(p.id)) && !s.flags.new_world && !regionState(s, 'caribbean').found,
    text: () => 'Cristóbal Colón swears he can reach the Indies by sailing west. The scholars say the world is far bigger than he thinks. He needs three ships.',
    options: [
      { label: 'Fund the voyage (−40 ducats)', can: s => player(s).gold < 40 ? 'Needs 40 ducats' : null, run: s => {
        player(s).gold -= 40;
        const p = hasTech(s, 'navigation') ? 0.85 : 0.7;
        if (rand(s) < p) {
          s.flags.new_world = 1; s.flags.new_world_income = 2; player(s).prestige += 15;
          regionState(s, 'caribbean').found = true;
          openAge(s, 'discovery', P(s)); // a voyage like this opens the age, if no one has yet
          addCards(s, 'treasure_fleet', 1); addCards(s, 'conquistadors', 1); addCard(s, 'colonial_charter'); addCard(s, 'conquista');
          if (!s.usedLegends.includes('columbus')) { s.usedLegends.push('columbus'); s.characters.push({ uid: uid(s), name: 'Cristóbal Colón', role: 'explorer', skill: 5, traits: ['navigator', 'survivor'], born: s.year - 40, dies: 1506, rarity: 'legendary', xp: 0, legendId: 'columbus' }); }
          return [good('Land beyond the Ocean!', 'Colón finds the Antilles, the door to a New World. Prestige +15, and he joins your court as an explorer. Settle it with colonists, or send conquerors.', 'anchor')];
        }
        return [bad('Lost at sea', 'The ships never return. Perhaps another captain will come.', 'anchor')];
      } },
      { label: 'Send him away', run: s => {
        const rival = ['castile', 'portugal'].find(n => n !== P(s) && alive(s, n));
        if (rival) { s.flags['ai_bonus_' + rival] = (s.flags['ai_bonus_' + rival] ?? 0) + 6; return [bad(`${nationName(s, rival)} funds him`, `Colón sails for ${nationName(s, rival)} instead, and they grow rich from the New World.`, 'anchor')]; }
        return [neutral('A dreamer', 'He leaves your court.')];
      } },
    ],
  },
  {
    id: 'cape_route', history: true, title: 'Rounding the Cape', art: 'anchor', window: [1486, 1510], chance: 0.3, repeat: 6,
    cond: s => P(s) === 'portugal' && !s.flags.spice_income,
    text: () => 'Your captains believe Africa can be sailed around, opening a sea road to the spices of India.',
    options: [
      { label: 'Send the fleet (−30 ducats)', can: s => player(s).gold < 30 ? 'Needs 30 ducats' : null, run: s => {
        player(s).gold -= 30;
        if (rand(s) < (hasTech(s, 'navigation') ? 0.8 : 0.55)) {
          s.flags.spice_income = 4; player(s).prestige += 15;
          for (const r of ['west_africa', 'central_africa', 'southern_africa', 'east_africa', 'india']) regionState(s, r).found = true;
          const leg = LEGENDS.find(l => l.id === 'gama')!;
          if (!s.usedLegends.includes('gama')) {
            s.usedLegends.push('gama');
            s.characters.push({ uid: uid(s), name: leg.name, role: leg.role, skill: leg.skill, traits: [...leg.traits], born: s.year - 30, dies: leg.to, rarity: 'legendary', xp: 0, legendId: leg.id });
          }
          return [good('The road to India', 'Spices flow to Lisbon: +4 ducats a year, prestige +15. The Gold Coast, the Cape and India are now on your charts.', 'anchor'), good('Vasco da Gama', 'The great captain joins your court.', 'crown')];
        }
        return [bad('Storms at the Cape', 'The fleet turns back, battered. Try again in a few years.', 'anchor')];
      } },
      { label: 'Wait', run: () => [neutral('Not yet', 'The plan will keep.')] },
    ],
  },
  {
    id: 'tordesillas', history: true, title: 'Dividing the World', art: 'scroll', window: [1493, 1505], chance: 0.35,
    cond: s => !!s.flags.new_world && ['castile', 'portugal'].includes(P(s)) && alive(s, 'castile') && alive(s, 'portugal'),
    text: s => `${P(s) === 'castile' ? 'Portugal' : 'Castile'} proposes a line on the map: new lands to the west for one crown, to the east for the other.`,
    options: [
      { label: 'Sign the treaty', run: s => { addRel(s, 'castile', 'portugal', 30); return [good('Treaty of Tordesillas', 'Relations +30.', 'scroll')]; } },
      { label: 'Claim it all', run: s => { addRel(s, 'castile', 'portugal', -40); player(s).prestige += 10; return [neutral('Defiance', 'Prestige +10, but relations −40.', 'crown')]; } },
    ],
  },
  {
    id: 'italian_wars', history: true, title: 'The French Cross the Alps', art: 'sword', window: [1494, 1502], chance: 0.35,
    cond: s => alive(s, 'france') && alive(s, 'naples') && P(s) !== 'france' && s.stateReligion === 'catholic' && regionOf(player(s).capital) === 'europe',
    text: () => 'King Charles VIII of France claims the throne of Naples and marches south with a huge army and modern artillery. Italy is in uproar.',
    options: [
      { label: 'Join the Holy League', hint: 'War with France', run: s => {
        if (!atWar(s, 'france', 'naples')) declareWar(s, 'france', 'naples');
        for (const n of ['naples', 'papacy', 'venice']) if (alive(s, n) && n !== P(s)) { addTreaty(s, P(s), n, 'alliance'); addRel(s, P(s), n, 20); }
        if (!atWar(s, P(s), 'france')) declareWar(s, P(s), 'france');
        player(s).prestige += 5;
        return [good('The League', 'You are allied with Naples, the Papacy and Venice, and at war with France.', 'hands')];
      } },
      { label: 'Stay out of it', run: s => {
        if (!atWar(s, 'france', 'naples')) declareWar(s, 'france', 'naples');
        for (let i = 0; i < 3; i++) s.nations.france.army.push({ uid: uid(s), type: pick(s, ['men_at_arms', 'knights', 'bombard', 'pikemen']), vet: 1, str: 100 });
        return [neutral('Italy burns', 'France and Naples go to war without you.', 'sword')];
      } },
    ],
  },
  {
    id: 'reformation', title: 'The Reformation', art: 'book', chance: 0.5, window: [1500, 1570],
    cond: s => ageReached(s, 'reformation') && s.stateReligion === 'catholic',
    text: () => 'A German monk has nailed his theses to a church door. Printed pamphlets spread his ideas faster than any preacher. Unrest stirs everywhere.',
    options: [
      { label: 'Defend the faith (−30 ducats)', can: s => player(s).gold < 30 ? 'Needs 30 ducats' : null, run: s => { player(s).gold -= 30; stab(s, 1); player(s).prestige += 10; addRel(s, P(s), 'papacy', 20); return [good('Champion of Rome', 'Stability +1, prestige +10, Papacy +20.', 'church')]; } },
      { label: 'Tolerate the reformers', run: s => {
        stab(s, -1); s.flags.reform_research = 1; addRel(s, P(s), 'papacy', -25);
        const ps = provsOf(s, P(s)).filter(p => p.religion === 'catholic').sort(() => rand(s) - 0.5).slice(0, 2);
        for (const p of ps) p.religion = 'protestant';
        for (const p of provsOf(s, 'france')) if (rand(s) < 0.3) p.religion = 'protestant';
        return [neutral('New ideas', 'Every study gains +1 research a year. Stability −1, Papacy −25.', 'book'), bad('Protestant towns', ps.length ? `${ps.map(p => p.name).join(' and ')} turn Protestant. Their people will be unhappy under a Catholic crown.` : 'No province turns yet.', 'church')];
      } },
    ],
  },
  {
    id: 'potosi', history: true, title: 'The Silver Mountain', art: 'coin', window: [1545, 1565], chance: 0.3,
    cond: s => !!s.flags.new_world && holdsNewWorld(s),
    text: () => 'In the high Andes your colonists have found a mountain made of silver.',
    options: [{ label: 'Open the mines', run: s => { s.flags.new_world_income = (s.flags.new_world_income ?? 0) + 6; addCards(s, 'treasure_fleet', 2); return [good('Potosí', 'New World income +6 ducats a year. Two Treasure Fleet cards are added.', 'coin')]; } }],
  },
  {
    id: 'price_revolution', history: true, title: 'The Price Revolution', art: 'coin', window: [1560, 1600], chance: 0.2,
    cond: s => !!s.flags.new_world && holdsNewWorld(s),
    text: () => 'So much silver floods in that prices soar. Your treasury is richer, yet everything costs more.',
    options: [{ label: 'Borrow from the Genoese', run: s => { player(s).gold += 50; addCards(s, 'debt', 2); return [neutral('Bankers\' gold', '+50 ducats now, but two Crown Debt cards are added.', 'chain')]; } },
      { label: 'Cut spending', run: s => { stab(s, -1); return [neutral('Austerity', 'Stability −1.')]; } }],
  },
  {
    id: 'lepanto', history: true, title: 'The Holy League at Sea', art: 'anchor', window: [1565, 1576], chance: 0.3,
    cond: s => provsOf(s, P(s)).some(p => MED().includes(p.id)) && CHRISTIAN.includes(s.stateReligion) && alive(s, 'ottomans') && P(s) !== 'ottomans',
    text: () => 'The Turkish fleet threatens the whole Mediterranean. The Pope calls Christian galleys to gather at Messina.',
    options: [
      { label: 'Send galleys (−50 ducats)', can: s => player(s).gold < 50 ? 'Needs 50 ducats' : null, run: s => {
        player(s).gold -= 50; addRel(s, P(s), 'papacy', 15);
        if (rand(s) < 0.65) { player(s).prestige += 30; stab(s, 1); return [good('Victory at Lepanto!', 'The Turkish fleet is destroyed. Prestige +30, stability +1.', 'anchor')]; }
        player(s).prestige -= 5; return [bad('A bloody draw', 'Many galleys are lost for little gain. Prestige −5.', 'anchor')];
      } },
      { label: 'Keep your ships home', run: s => { addRel(s, P(s), 'papacy', -10); return [neutral('Caution', 'Papacy −10.')]; } },
    ],
  },
  {
    id: 'thirty_years', history: true, title: 'War in the Empire', art: 'sword', window: [1618, 1630], chance: 0.35,
    text: () => 'A great war tears Germany apart. Veteran companies are for hire to anyone who pays.',
    options: [
      { label: 'Hire veterans (−45 ducats)', can: s => player(s).gold < 45 ? 'Needs 45 ducats' : null, run: s => {
        player(s).gold -= 45;
        const types = hasTech(s, 'musket') ? ['musketeers', 'cuirassiers'] : ['arquebusiers', 'knights'];
        for (const t of types) s.troops.push({ uid: uid(s), type: t, vet: 1, str: 100 });
        return [good('Veterans arrive', `${types.map(t => TROOPS[t].name).join(' and ')} join your army.`, 'banner')];
      } },
      { label: 'Stay out', run: () => [neutral('Peace at home', 'You watch from afar.')] },
    ],
  },
  {
    id: 'enlightenment', history: true, title: 'The Age of Reason', art: 'book', window: [1690, 1730], chance: 0.15,
    text: () => 'Philosophers write of reason, science and good government. Academies spring up across Europe.',
    options: [
      { label: 'Found a Royal Academy (−40 ducats)', can: s => player(s).gold < 40 ? 'Needs 40 ducats' : null, run: s => { player(s).gold -= 40; s.flags.reform_research = (s.flags.reform_research ?? 0) + 1; player(s).prestige += 10; return [good('Royal Academy', '+1 research on every study, prestige +10.', 'book')]; } },
      { label: 'Ignore them', run: () => [neutral('Old ways', 'Nothing changes.')] },
    ],
  },

  // ---------- random events ----------
  {
    id: 'corsairs', title: 'Barbary Corsairs', art: 'anchor', window: [1460, 1720], chance: 0.07, repeat: 6,
    setup: s => {
      const coast = provsOf(s, P(s)).filter(p => MED().includes(p.id));
      if (!coast.length || s.stateReligion === 'muslim') return null; // the corsairs raid Christian shores
      if (s.flags.const_holds && rand(s) < 0.5) return null;
      const p = pick(s, coast);
      return { prov: p.id };
    },
    text: (s, v) => `Corsair galleys have landed in ${s.provinces[v.prov].name}. They are burning villages and taking captives.`,
    options: [
      { label: 'Pay ransom', can: (s, v) => player(s).gold < 15 + s.provinces[v.prov].dev * 5 ? 'Not enough ducats' : null,
        hint: 'Costs 15 + 5 per development',
        run: (s, v) => { const c = 15 + s.provinces[v.prov].dev * 5; player(s).gold -= c; return [neutral('Captives freed', `You pay ${c} ducats.`, 'coin')]; } },
      { label: 'Fight them', can: s => s.troops.some(t => t.mission == null) ? null : 'No troops at home', run: (s, v) => {
        const prov = s.provinces[v.prov];
        const home = s.troops.filter(t => t.mission == null).sort((a, b) => b.str - a.str).slice(0, 4);
        const gen = s.characters.find(c => c.role === 'general' && c.mission == null);
        const att = makeSide('tunis', [0, 1, 2].map(i => ({ uid: -100 - i, type: i === 2 ? 'arquebusiers' : 'levy', vet: 1, str: 100, start: 100 })).map(u => ({ ...u, type: hasTech(s, 'firearms') ? u.type : u.type === 'arquebusiers' ? 'crossbow' : u.type })), genericGeneral(s), 0, false);
        const def = makeSide(P(s), home.map(t => ({ uid: t.uid, type: t.type, vet: t.vet, str: t.str, start: t.str })), gen ? { name: gen.name, skill: gen.skill, traits: gen.traits, uid: gen.uid } : null, 0, true);
        push(s, { kind: 'battle', battle: createBattle(s, att, def, prov.id, 'rebels') });
        return [neutral('To arms!', 'Your troops march to the coast.', 'sword')];
      } },
      { label: 'Let them be', run: (s, v) => { const p = s.provinces[v.prov]; p.dev = Math.max(1, p.dev - 1); stab(s, -1); return [bad('Devastation', `${p.name} loses 1 development. Stability −1.`)]; } },
    ],
  },
  {
    id: 'plague', title: 'Plague', art: 'skull', chance: 0.03, repeat: 10,
    setup: s => { const ps = provsOf(s, P(s)); return ps.length ? { prov: pick(s, ps).id } : null; },
    text: (s, v) => `Sickness spreads from the port of ${s.provinces[v.prov].name}. The physicians speak of the Black Death returning.`,
    options: [
      { label: 'Quarantine (−20 ducats)', can: s => player(s).gold < 20 ? 'Needs 20 ducats' : null, run: s => { player(s).gold -= 20; player(s).manpower = Math.max(0, player(s).manpower - 3); return [neutral('Contained', 'Manpower −3.', 'skull')]; } },
      { label: 'Pray', run: s => {
        if (rand(s) < 0.5) return [good('Spared', 'The sickness fades on its own.', 'church')];
        player(s).manpower = 0; stab(s, -1); for (const t of s.troops) t.str = Math.max(20, t.str - 25);
        return [bad('The Great Dying', 'Manpower is gone, troops lose strength, stability −1.', 'skull')];
      } },
    ],
  },
  {
    id: 'bad_harvest', title: 'Failed Harvest', art: 'wheat', chance: 0.05, repeat: 5,
    text: () => 'Rain has rotted the grain in the fields. Bread prices double and the poor go hungry.',
    options: [
      { label: 'Open the granaries (−25 ducats)', can: s => player(s).gold < 25 ? 'Needs 25 ducats' : null, run: s => { player(s).gold -= 25; return [good('Bread for all', 'The people bless the crown.', 'wheat')]; } },
      { label: 'Let the market decide', run: s => { addCard(s, 'unrest'); return [bad('Hunger', 'A Peasant Unrest card is added to your hand.', 'chain')]; } },
    ],
  },
  {
    id: 'court_visitor', title: 'A Talent at Court', art: 'crown', chance: 0.07, repeat: 4,
    text: () => 'Three promising people seek a place at your court. You may take one, at no cost.',
    options: [{ label: 'Meet them', can: s => courtCount(s) >= courtCap(s) ? 'Your court is full' : null, run: s => { push(s, { kind: 'draft', draft: 'court', options: courtOptions(s, undefined, 1) }); return [neutral('Audience', 'Choose one of them.', 'crown')]; } },
      { label: 'Send them away', run: () => [neutral('Not today', 'They leave.')] }],
  },
  {
    id: 'merchant_envoy', title: 'A Merchant Envoy', art: 'coin', chance: 0.06, repeat: 4,
    setup: s => {
      const c = Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && !atWar(s, P(s), n.id) && !hasTreaty(s, P(s), n.id, 'trade') && getRel(s, P(s), n.id) > -10 && n.id !== 'natives' && provKnown(s, n.capital));
      return c.length ? { nation: pick(s, c).id } : null;
    },
    text: (s, v) => `Merchants from ${nationName(s, String(v.nation))} propose a trade agreement on generous terms.`,
    options: [
      { label: 'Accept', run: (s, v) => { addTreaty(s, P(s), String(v.nation), 'trade'); addRel(s, P(s), String(v.nation), 10); return [good('Treaty signed', `A trade treaty with ${nationName(s, String(v.nation))}.`, 'coin')]; } },
      { label: 'Decline', run: (s, v) => { addRel(s, P(s), String(v.nation), -5); return [neutral('Declined', 'Relations −5.')]; } },
    ],
  },
  {
    id: 'tribute_demand', title: 'A Demand for Tribute', art: 'sword', chance: 0.04, repeat: 8,
    setup: s => {
      const myPow = s.troops.length;
      const c = Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && !atWar(s, P(s), n.id) && getRel(s, P(s), n.id) < 0 && n.army.length > myPow + 2 && s.year > s.startYear + 5);
      return c.length ? { nation: pick(s, c).id } : null;
    },
    text: (s, v) => `${nationName(s, String(v.nation))} demands 30 ducats as a sign of respect. Their army is larger than yours.`,
    options: [
      { label: 'Pay 30 ducats', can: s => player(s).gold < 30 ? 'Needs 30 ducats' : null, run: (s, v) => { player(s).gold -= 30; addRel(s, P(s), String(v.nation), 15); player(s).prestige -= 3; return [neutral('Humiliation', 'Relations +15, prestige −3.', 'coin')]; } },
      { label: 'Refuse', run: (s, v) => {
        const n = String(v.nation);
        if (rand(s) < 0.5) { declareWar(s, n, P(s)); return [bad('War!', `${nationName(s, n)} declares war on you.`, 'sword')]; }
        player(s).prestige += 3; return [good('They back down', 'Prestige +3.', 'crown')];
      } },
    ],
  },
  {
    id: 'revolt', title: 'Revolt!', art: 'torch', chance: 0.2, repeat: 3,
    cond: s => player(s).stability <= -2 || provsOf(s, P(s)).some(p => p.control < 25 || happinessOf(s, p).value < 25),
    setup: s => { let ps = provsOf(s, P(s)).filter(p => p.id !== player(s).capital && p.control < 25); if (!ps.length) ps = provsOf(s, P(s)).filter(p => p.id !== player(s).capital); return ps.length ? { prov: pick(s, ps).id } : null; },
    text: (s, v) => `Peasants and minor nobles rise in ${s.provinces[v.prov].name}, refusing to pay taxes to a failing crown.`,
    options: [
      { label: 'Crush them', run: (s, v) => {
        const prov = s.provinces[v.prov];
        const n = randInt(s, 4, 7);
        // rebels keep up with the times: later ages bring muskets and drilled men
        const att = makeSide('rebels', Array.from({ length: n }, (_, i) => ({ uid: -200 - i, type: 'rebels', vet: 0, str: 100, start: 100, might: 1 + 0.4 * ageIndex(s) })), genericGeneral(s), 0, false);
        const gen = s.characters.filter(c => c.role === 'general' && c.mission == null).sort((a, b) => b.skill - a.skill)[0];
        const home = troopsNear(s, P(s), prov.id, 2).sort((a, b) => b.str - a.str).slice(0, gen ? commandOf(gen.skill) : GENERIC_COMMAND);
        const def = makeSide(P(s), home.map(t => ({ uid: t.uid, type: t.type, vet: t.vet, str: t.str, start: t.str })), gen ? { name: gen.name, skill: gen.skill, traits: gen.traits, uid: gen.uid } : null, prov.fort, true);
        if (!def.units.length) {
          player(s).gold = Math.max(0, player(s).gold - 30); prov.control = 10;
          return [bad('No one to stop them', 'The rebels loot the treasury (−30 ducats).', 'torch')];
        }
        push(s, { kind: 'battle', battle: createBattle(s, att, def, prov.id, 'rebels') });
        return [neutral('The army marches', 'Your troops move against the rebels.', 'sword')];
      } },
      { label: 'Grant concessions (−40 ducats)', can: s => player(s).gold < 40 ? 'Needs 40 ducats' : null, run: s => { player(s).gold -= 40; stab(s, 1); return [neutral('Peace bought', 'Stability +1.', 'scroll')]; } },
    ],
  },

  {
    id: 'opportunity', title: 'Fortune Smiles', art: 'star', chance: 0.06, repeat: 3,
    text: () => 'Merchants, petitioners and adventurers crowd the palace with proposals. Some of them are worth hearing.',
    options: [{ label: 'Hear them out', run: s => { const names = grantRandomCards(s, 2); return [good('New opportunities', `You gain: ${names.join(', ')}.`, 'star')]; } }],
  },
  {
    id: 'cortes', title: 'The Cortes Meet', art: 'scales', chance: 0.05, repeat: 6,
    text: () => 'The estates of the realm gather. They will grant the crown a subsidy, or new powers, but not both.',
    options: [
      { label: 'Ask for a subsidy', run: s => { const g = 30 + provsOf(s, P(s)).length * 3; player(s).gold += g; return [good('Subsidy granted', `+${g} ducats.`, 'coin')]; } },
      { label: 'Ask for new powers', run: s => { s.np += 4; return [good('Royal authority', '+4 nation points.', 'crown')]; } },
    ],
  },

  // ---------- prompted by the AI ----------
  {
    id: 'peace_offer', title: s => 'Peace Offer', art: 'dove', chance: 0,
    text: (s, v) => `${nationName(s, String(v.nation))} sends envoys asking for peace on equal terms.`,
    options: [
      { label: 'Accept peace', run: (s, v) => { const n = String(v.nation); const extra = endWar(s, n); if (atWar(s, P(s), n)) makePeace(s, P(s), n); return [good('Peace', `The war with ${nationName(s, n)} ends. Ten years of truce.`, 'dove'), ...extra]; } },
      { label: 'Fight on', run: () => [neutral('The war goes on', 'Your answer is steel.', 'sword')] },
    ],
  },
  {
    id: 'call_to_arms', title: 'Call to Arms', art: 'hands', chance: 0,
    text: (s, v) => `${nationName(s, String(v.attacker))} has attacked your ally ${nationName(s, String(v.ally))}. They beg for your help.`,
    options: [
      { label: 'Honour the alliance', run: (s, v) => { const a = String(v.attacker); if (!atWar(s, P(s), a)) declareWar(s, P(s), a); player(s).prestige += 3; addRel(s, P(s), String(v.ally), 15); return [good('Faithful ally', `You are at war with ${nationName(s, a)}. Prestige +3.`, 'hands')]; } },
      { label: 'Break the alliance', run: (s, v) => { const ally = String(v.ally); s.treaties = s.treaties.filter(t => !(t.kind === 'alliance' && ((t.a === ally && t.b === P(s)) || (t.b === ally && t.a === P(s))))); addRel(s, P(s), ally, -40); player(s).prestige -= 10; return [bad('Oath-breaker', 'The alliance ends. Prestige −10.', 'twist')]; } },
    ],
  },

  // ---------- ages opened by events ----------
  {
    id: 'reformer', title: 'A Reformer at Court', art: 'book', chance: 0.12, repeat: 4,
    cond: s => ageOf(s).id === 'discovery' && s.techs.includes('printing') && s.stateReligion === 'catholic' && s.year >= 1490,
    text: () => 'A learned monk, armed with your printing presses, preaches against the sale of indulgences and the wealth of Rome. The bishops demand his head. Thousands come to hear him.',
    options: [
      { label: 'Protect him', hint: 'Opens the Age of Reformation for the whole world; you are its pioneer', run: s => { stab(s, -1); addRel(s, P(s), 'papacy', -30); openAge(s, 'reformation', P(s)); return [good('The world will change', 'You open the Age of Reformation. Stability −1, the Pope is furious (−30).', 'book')]; } },
      { label: 'Hand him to the Church', run: s => { addRel(s, P(s), 'papacy', 10); return [neutral('Silenced', 'For now. Papacy +10. Another prince may not be so obedient.', 'church')]; } },
    ],
  },
  // ---------- the world reacts: proposals from other crowns ----------
  {
    id: 'ai_alliance', title: s => 'An Offer of Alliance', art: 'hands', chance: 0.12, repeat: 5,
    cond: s => s.year > s.startYear + 2,
    setup: s => {
      const near = borderNations(s);
      const c = Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && !n.overlord && !atWar(s, P(s), n.id) && !hasTreaty(s, P(s), n.id, 'alliance')
        && (getRel(s, P(s), n.id) >= 25 || enemiesOf(s, P(s)).some(e => atWar(s, n.id, e)) || (near.has(n.id) && getRel(s, P(s), n.id) >= 10))
        && alliesOf(s, P(s)).length < 4);
      if (!c.length) return null;
      const n = pick(s, c);
      const foe = enemiesOf(s, P(s)).find(e => atWar(s, n.id, e)) ?? enemiesOf(s, n.id)[0] ?? '';
      return { nation: n.id, foe };
    },
    text: (s, v) => `Envoys from ${nationName(s, String(v.nation))} propose a defensive alliance${v.foe ? `. They fear ${nationName(s, String(v.foe))} as much as you do` : ''}. Allies join each other's wars.`,
    options: [
      { label: 'Sign the alliance', run: (s, v) => {
        const n = String(v.nation);
        addTreaty(s, P(s), n, 'alliance'); addRel(s, P(s), n, 15);
        const out = [good('Allies', `${nationName(s, n)} is now your ally. Relations +15.`, 'hands')];
        if (v.foe && atWar(s, P(s), String(v.foe)) && !atWar(s, n, String(v.foe))) { declareWar(s, n, String(v.foe)); out.push(good('They march', `${nationName(s, n)} joins your war against ${nationName(s, String(v.foe))}.`, 'sword')); }
        return out;
      } },
      { label: 'Decline politely', run: (s, v) => { addRel(s, P(s), String(v.nation), -8); return [neutral('Declined', 'Relations −8.')]; } },
    ],
  },
  {
    id: 'ai_marriage', title: 'A Royal Match', art: 'ring', chance: 0.08, repeat: 6,
    setup: s => {
      const c = Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && n.id !== 'papacy' && !atWar(s, P(s), n.id) && !hasTreaty(s, P(s), n.id, 'marriage') && getRel(s, P(s), n.id) >= 10 && sameFaith(s, n.id) && provKnown(s, n.capital));
      return c.length ? { nation: pick(s, c).id } : null;
    },
    text: (s, v) => `${nationName(s, String(v.nation))} offers a prince for a marriage into your royal house. Marriages bind crowns, and one day may unite them.`,
    options: [
      { label: 'Agree to the match', run: (s, v) => { addTreaty(s, P(s), String(v.nation), 'marriage'); addRel(s, P(s), String(v.nation), 10); return [good('Wedding bells', `Your houses are joined. Relations +10, and they grow by 3 a year.`, 'ring')]; } },
      { label: 'Refuse', run: (s, v) => { addRel(s, P(s), String(v.nation), -10); return [neutral('Refused', 'Relations −10.')]; } },
    ],
  },
  {
    id: 'ai_vassal_offer', title: 'A Small Crown Seeks Protection', art: 'crown', chance: 0.05, repeat: 8,
    setup: s => {
      const myPow = s.troops.length;
      const near = borderNations(s);
      const c = Object.values(s.nations).filter(n => n.alive && near.has(n.id) && !n.overlord && !atWar(s, P(s), n.id) && provsOf(s, n.id).length <= 2 && n.army.length * 2 < myPow && getRel(s, P(s), n.id) >= 20 && !subjectsOf(s, n.id).length);
      return c.length ? { nation: pick(s, c).id } : null;
    },
    text: (s, v) => `${nationName(s, String(v.nation))} is small and afraid of its neighbours. Its ruler offers to become your vassal.`,
    options: [
      { label: 'Take them under your wing', run: (s, v) => { makeSubject(s, String(v.nation), 'vassal'); return [good('A new vassal', `${nationName(s, String(v.nation))} pays you tribute and follows you to war.`, 'crown')]; } },
      { label: 'Stay out of it', run: () => [neutral('No', 'They will look for another protector.')] },
    ],
  },
  // ---------- the realm reacts to how you rule ----------
  {
    id: 'protestant_minority', title: 'The New Faith Spreads', art: 'church', chance: 0.15, repeat: 12,
    cond: s => ageReached(s, 'reformation') && s.stateReligion === 'catholic' && provsOf(s, P(s)).some(p => p.religion === 'catholic' && p.settlement >= 2),
    setup: s => { const ps = provsOf(s, P(s)).filter(p => p.religion === s.stateReligion && p.settlement >= 2); return ps.length ? { prov: pick(s, ps).id } : null; },
    text: (s, v) => `Preachers of the new faith fill the squares of ${s.provinces[v.prov].name}. Printers spread their pamphlets faster than your bishops can burn them.`,
    options: [
      { label: 'Tolerate them', hint: 'Other faiths are less unhappy for 15 years', run: (s, v) => { s.flags.reformation_seen = 1; s.provinces[v.prov].religion = 'protestant'; s.flags.tolerance_until = Math.max(s.flags.tolerance_until ?? 0, s.year + 15); addRel(s, P(s), 'papacy', -10); return [neutral('Freedom of conscience', `${s.provinces[v.prov].name} turns Protestant, peacefully. Other faiths are less unhappy for 15 years. The Pope frowns (−10).`, 'church')]; } },
      { label: 'Suppress them', run: (s, v) => { s.flags.reformation_seen = 1; const p = s.provinces[v.prov]; p.control = Math.max(0, p.control - 20); addRel(s, P(s), 'papacy', 10); if (rand(s) < 0.4) { p.religion = 'protestant'; return [bad('It spreads anyway', `${p.name} turns Protestant despite you. Control −20 there.`, 'torch')]; } return [good('Order restored', `The preachers flee. Control −20 in ${p.name}. The Pope is pleased (+10).`, 'church')]; } },
      { label: 'Convert the crown', hint: 'Your state faith becomes Protestant', run: (s, v) => { s.flags.reformation_seen = 1; s.stateReligion = 'protestant'; s.provinces[v.prov].religion = 'protestant'; stab(s, -2); addRel(s, P(s), 'papacy', -60); return [bad('A new church', 'Your crown breaks with Rome. Stability −2. Catholic provinces are now of another faith; Protestant ones rejoice.', 'church')]; } },
    ],
  },
  {
    id: 'great_artist', title: 'A Genius Seeks a Patron', art: 'quill', chance: 0.18, repeat: 10,
    cond: s => s.art >= 30,
    text: s => `Your fame as a patron (arts ${Math.round(s.art)}) has spread. A painter of rare gifts asks for a commission.`,
    options: [
      { label: 'Commission a masterpiece (60 ducats)', can: s => player(s).gold < 60 ? 'Needs 60 ducats' : null, run: s => { player(s).gold -= 60; s.art = Math.min(100, s.art + 12); player(s).prestige += 12; return [good('A masterpiece', 'Arts +12, prestige +12. People will come from afar to see it.', 'quill')]; } },
      { label: 'A small portrait (15 ducats)', can: s => player(s).gold < 15 ? 'Needs 15 ducats' : null, run: s => { player(s).gold -= 15; s.art = Math.min(100, s.art + 4); player(s).prestige += 3; return [good('A fine portrait', 'Arts +4, prestige +3.', 'quill')]; } },
      { label: 'Not now', run: () => [neutral('Another court', 'The artist moves on.')] },
    ],
  },
  {
    id: 'tax_riots', title: 'Bread and Taxes', art: 'torch', chance: 0.35, repeat: 5,
    cond: s => s.taxBurden >= 10,
    setup: s => { const ps = provsOf(s, P(s)).filter(p => p.id !== player(s).capital); return ps.length ? { prov: pick(s, ps).id } : null; },
    text: (s, v) => `The tax collectors are stoned in ${s.provinces[v.prov].name}. Crowds shout that the crown is bleeding them dry.`,
    options: [
      { label: 'Forgive this year\'s taxes', run: s => { const g = Math.round(20 + s.taxBurden * 2); player(s).gold -= g; s.taxBurden = 0; return [neutral('Relief', `You give up ${g} ducats. Tax anger is gone.`, 'coin')]; } },
      { label: 'Send the soldiers', run: (s, v) => { const p = s.provinces[v.prov]; p.control = Math.min(100, p.control + 10); p.favor = Math.max(0, (p.favor ?? 0) - 10) || undefined; stab(s, -1); return [bad('Order by the sword', `Control +10 in ${p.name}, but stability −1 and the people remember.`, 'sword')]; } },
    ],
  },
  {
    id: 'vassal_plot', title: 'A Vassal Plots', art: 'eye', chance: 0.12, repeat: 6,
    setup: s => { const c = subjectsOf(s).filter(n => getRel(s, P(s), n.id) < 10); return c.length ? { nation: pick(s, c).id } : null; },
    text: (s, v) => `Your spies report that ${nationName(s, String(v.nation))} is talking to your rivals about throwing off your rule.`,
    options: [
      { label: 'Grant them privileges (2 nation points)', can: s => s.np < 2 ? 'Needs 2 nation points' : null, run: (s, v) => { s.np -= 2; addRel(s, P(s), String(v.nation), 30); return [good('Loyalty bought', 'Relations +30.', 'hands')]; } },
      { label: 'Threaten them', run: (s, v) => { const n = s.nations[String(v.nation)]; if (rand(s) < 0.45 + s.troops.length / 60) { addRel(s, P(s), n.id, 10); return [good('They bow', `${n.name} swears loyalty again.`, 'crown')]; } n.overlord = undefined; n.subject = undefined; declareWar(s, n.id, P(s)); return [bad('Rebellion', `${n.name} declares independence and war!`, 'sword')]; } },
    ],
  },
  {
    id: 'idle_fleet', title: 'Sailors Without Work', art: 'anchor', chance: 0.1, repeat: 8,
    cond: s => s.fleet.length >= 3 && !enemiesOf(s, P(s)).length,
    text: s => `Your ${s.fleet.length} ships rot at anchor. Captains ask leave to sail as privateers against foreign merchants.`,
    options: [
      { label: 'Issue letters of marque', run: s => { const g = Math.round(15 * s.fleet.length * (1 + (s.year - 1453) / 200)); player(s).gold += g; const victim = pick(s, Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && n.fleet.length)); if (victim) addRel(s, P(s), victim.id, -20); return [good('Prizes', `Your privateers bring in ${g} ducats.${victim ? ` ${victim.name} is furious (−20).` : ''}`, 'coin')]; } },
      { label: 'Keep them in port', run: () => [neutral('Patience', 'Nothing happens.')] },
    ],
  },
  {
    id: 'golden_age', title: 'A Golden Age', art: 'laurel', chance: 0.3, repeat: 15,
    cond: s => (s.happiness ?? 0) >= 72 && player(s).stability >= 2 && !enemiesOf(s, P(s)).length,
    text: () => 'Bells ring, markets overflow and poets write of your reign. The realm has rarely been so content.',
    options: [
      { label: 'Celebrate', run: s => { player(s).prestige += 15; grantRandomCards(s, 2); return [good('Glory', 'Prestige +15 and two cards.', 'laurel')]; } },
      { label: 'Invest the goodwill', run: s => { s.np += 4; return [good('Prudence', '+4 nation points.', 'star')]; } },
    ],
  },
  {
    id: 'culture_petition', title: 'A People Asks to Be Heard', art: 'scroll', chance: 0.12, repeat: 10,
    setup: s => {
      const count: Record<string, number> = {};
      for (const p of provsOf(s, P(s))) if (!s.accepted.includes(p.culture)) count[p.culture] = (count[p.culture] ?? 0) + 1;
      const best = Object.entries(count).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])[0];
      return best ? { culture: best[0], n: best[1] } : null;
    },
    text: (s, v) => `Leaders of the ${CULTURE_NAMES[String(v.culture)]} people (${v.n} provinces) ask for their customs and language to be honoured at court.`,
    options: [
      { label: 'Accept their culture (4 nation points)', can: s => s.np < 4 ? 'Needs 4 nation points' : null, run: (s, v) => { s.np -= 4; s.accepted.push(String(v.culture)); return [good('Embraced', `${CULTURE_NAMES[String(v.culture)]} is now an accepted culture: no more foreign-culture unhappiness.`, 'scroll')]; } },
      { label: 'Refuse', run: (s, v) => { for (const p of provsOf(s, P(s))) if (p.culture === v.culture) p.control = Math.max(0, p.control - 8); return [bad('Resentment', `Control −8 in every ${CULTURE_NAMES[String(v.culture)]} province.`, 'torch')]; } },
    ],
  },
  {
    id: 'native_unrest', title: 'Unrest in the Colonies', art: 'torch', chance: 0.12, repeat: 6,
    setup: s => { const ps = overseasOf(s).filter(p => p.religion !== s.stateReligion && !s.accepted.includes(p.culture) && p.control < 60 && p.dev <= 3); return ps.length ? { prov: pick(s, ps).id } : null; },
    text: (s, v) => `The native people of ${s.provinces[v.prov].name} rise against the settlers, who beg for soldiers.`,
    options: [
      { label: 'Send soldiers (25 ducats)', can: s => player(s).gold < 25 ? 'Needs 25 ducats' : null, run: (s, v) => { player(s).gold -= 25; s.provinces[v.prov].control = Math.min(100, s.provinces[v.prov].control + 15); return [good('Order', `Control +15 in ${s.provinces[v.prov].name}.`, 'sword')]; } },
      { label: 'Make peace with their chiefs', run: (s, v) => { const p = s.provinces[v.prov]; p.favor = Math.min(30, (p.favor ?? 0) + 10); p.dev = Math.max(1, p.dev - (rand(s) < 0.4 ? 1 : 0)); return [neutral('A treaty', `Happiness +10 in ${p.name}, but some settlers leave.`, 'hands')]; } },
    ],
  },
  {
    id: 'rival_colonies', title: 'Rival Flags Overseas', art: 'anchor', chance: 0.1, repeat: 10,
    setup: s => {
      const mine = new Set(overseasOf(s).map(p => p.id));
      for (const id of mine) for (const nb of getGeo().adj[id]) { const o = s.provinces[nb].owner; if (o !== P(s) && s.nations[o]?.alive && !atWar(s, P(s), o) && !hasTreaty(s, P(s), o, 'alliance')) return { nation: o, prov: id }; }
      return null;
    },
    text: (s, v) => `Settlers of ${nationName(s, String(v.nation))} push into the lands around ${s.provinces[v.prov].name}. Your governor asks for orders.`,
    options: [
      { label: 'Claim the frontier', hint: 'A claim: war with them costs no stability', run: (s, v) => { s.flags['claim_' + v.nation] = 1; addRel(s, P(s), String(v.nation), -15); return [neutral('A claim', `You may declare war on ${nationName(s, String(v.nation))} without losing stability. Relations −15.`, 'sword')]; } },
      { label: 'Agree a border', run: (s, v) => { addRel(s, P(s), String(v.nation), 10); return [good('A border treaty', 'Relations +10.', 'hands')]; } },
    ],
  },
  // ---------- the wider world: the leading realms of every continent, and Europe after 1630 ----------
  // `anywhere` events are history cards for realms outside Europe too; each checks who plays and who is alive.
  {
    id: 'westphalia', history: true, title: 'The Peace of Westphalia', art: 'dove', window: [1644, 1650], chance: 0.35,
    cond: s => regionOf(player(s).capital) === 'europe' && alive(s, 'austria') && P(s) !== 'papacy',
    text: () => 'After thirty years of war, envoys of every crown gather at Münster and Osnabrück. The treaty will let each prince choose the faith of his own land, and no emperor or pope may overrule him.',
    options: [
      { label: 'Sign the peace', hint: 'Stability, friends, tolerance', run: s => {
        stab(s, 1); s.flags.tolerance_until = Math.max(s.flags.tolerance_until ?? 0, s.year + 20);
        const fr = ['austria', 'france', 'sweden', 'netherlands'].filter(n => n !== P(s) && alive(s, n)); for (const n of fr) addRel(s, P(s), n, 10);
        addRel(s, P(s), 'papacy', -10);
        return [good('A new order', `Stability +1. Other faiths are less unhappy for 20 years. ${fr.map(n => nationName(s, n)).join(', ')} +10. The Pope protests (−10).`, 'dove')];
      } },
      { label: 'Hold out for more', hint: 'Prestige and a claim on Austria', run: s => {
        player(s).prestige += 10; stab(s, -1);
        if (P(s) !== 'austria') { s.flags.claim_austria = 1; addRel(s, P(s), 'austria', -20); }
        return [neutral('No peace for you', `Prestige +10, stability −1.${P(s) !== 'austria' ? ' You hold a claim on Austria (war without losing stability); Austria −20.' : ''}`, 'sword')];
      } },
    ],
  },
  {
    id: 'versailles', history: true, title: 'The Palace of Versailles', art: 'crown', window: [1661, 1690], chance: 0.2,
    cond: s => P(s) === 'france',
    text: s => `The King would turn his father's hunting lodge into the most splendid palace in Europe, and keep the great nobles there, dancing attendance on him instead of plotting in the provinces. The builders ask ${scaled(s, 120)} ducats.`,
    options: [
      { label: 'Build it', can: s => needs(s, 120), run: s => { player(s).gold -= scaled(s, 120); player(s).prestige += 30; s.art = Math.min(100, s.art + 10); stab(s, 1); return [good('The Sun King\'s court', 'Prestige +30, arts +10, stability +1. All Europe copies the fashions of Versailles.', 'crown')]; } },
      { label: 'Spend it on the army', run: s => { const t = addTroops(s, 'inf', 2); return [neutral('Guns before gardens', `Two companies of ${t} join the army.`, 'banner')]; } },
    ],
  },
  {
    id: 'spanish_succession', history: true, title: 'The Spanish Succession', art: 'crown', window: [1700, 1704], chance: 0.6,
    cond: s => ['france', 'castile'].includes(P(s)) && alive(s, 'france') && alive(s, 'castile') && alive(s, 'austria'),
    text: s => `The last Habsburg king of Spain has left every one of his crowns to Philippe of Anjou, grandson of Louis XIV. Austria claims the inheritance for the Archduke Charles, and England will not stand by while France and Spain become one family. ${P(s) === 'castile' ? 'Spain must choose its friends.' : 'Versailles must decide whether to accept the will.'}`,
    options: [
      { label: 'Stand by the will', hint: 'France and Spain together; war with Austria', run: s => {
        addTreaty(s, 'france', 'castile', 'alliance'); addRel(s, 'france', 'castile', 30);
        if (!atWar(s, P(s), 'austria') && !hasTreaty(s, P(s), 'austria', 'alliance')) declareWar(s, P(s), 'austria');
        player(s).prestige += 15;
        return [good('Bourbon Spain', 'France and Spain are allied (+30), and at war with Austria. Prestige +15.', 'crown')];
      } },
      { label: 'Agree a partition', hint: 'Peace, at a price in prestige', run: s => {
        player(s).prestige -= 10; for (const n of ['austria', 'england']) if (alive(s, n)) addRel(s, P(s), n, 20);
        return [neutral('A compromise', 'Prestige −10. Austria and England are relieved (+20).', 'scroll')];
      } },
    ],
  },
  {
    id: 'grand_alliance', history: true, title: 'The Grand Alliance', art: 'hands', window: [1701, 1704], chance: 0.6,
    cond: s => ['austria', 'england'].includes(P(s)) && alive(s, 'france') && alive(s, 'castile') && !hasTreaty(s, P(s), 'france', 'alliance'),
    text: () => 'A Bourbon prince sits on the throne of Spain, and Louis XIV will not rule out that one day one king may wear both crowns. Austria, England and the Dutch Republic meet at The Hague to stop him.',
    options: [
      { label: 'Join the Grand Alliance', hint: 'War with France, allies at your side', run: s => {
        const fr = ['austria', 'england', 'netherlands'].filter(n => n !== P(s) && alive(s, n));
        for (const n of fr) { addTreaty(s, P(s), n, 'alliance'); addRel(s, P(s), n, 20); }
        if (!atWar(s, P(s), 'france')) declareWar(s, P(s), 'france');
        for (const n of fr) if (!atWar(s, n, 'france') && s.nations[n].overlord == null) declareWar(s, n, 'france');
        player(s).prestige += 10;
        return [good('Allies against the Sun King', `You are allied with ${fr.map(n => nationName(s, n)).join(', ') || 'no one'} and at war with France. Prestige +10.`, 'hands')];
      } },
      { label: 'Stay neutral', run: s => { addRel(s, P(s), 'france', 20); player(s).prestige -= 10; return [neutral('Neutral', 'France is grateful (+20). Prestige −10.')]; } },
    ],
  },
  {
    id: 'seven_years_war', history: true, title: 'The Seven Years\' War', art: 'sword', window: [1756, 1760], chance: 0.5,
    cond: s => !!RIVAL_1756[P(s)] && alive(s, RIVAL_1756[P(s)]) && alive(s, 'england') && alive(s, 'france'),
    text: s => `Old alliances turn upside down: Austria joins France, Britain pays Prussia. War spreads from Silesia to Canada and Bengal, and your ministers see a chance against ${nationName(s, RIVAL_1756[P(s)])}.`,
    options: [
      { label: 'Fight on every front', hint: 'A claim, prestige; war will follow', run: s => {
        const r = RIVAL_1756[P(s)]; s.flags['claim_' + r] = 1; addRel(s, P(s), r, -30); player(s).prestige += 10; addCards(s, 'march_orders', 2);
        return [good('To war', `You hold a claim on ${nationName(s, r)}: declare war without losing stability. Two March Orders, prestige +10.`, 'sword')];
      } },
      { label: 'Stay neutral and trade', run: s => { const g = scaled(s, 40); player(s).gold += g; player(s).prestige -= 5; return [neutral('Neutral profits', `Merchants sell to both sides: +${g} ducats. Prestige −5.`, 'coin')]; } },
    ],
  },
  {
    id: 'french_revolution', history: true, title: 'The Estates-General', art: 'torch', window: [1788, 1792], chance: 0.5,
    cond: s => P(s) === 'france',
    text: () => 'The treasury is empty and bread is dear. At Versailles the deputies of the Third Estate have sworn on a tennis court not to part until France has a constitution. In Paris the crowd is arming itself.',
    options: [
      { label: 'Accept a constitution', hint: 'A Revolution card; less royal power', run: s => { addCard(s, 'revolution'); stab(s, -1); player(s).prestige -= 10; return [neutral('A new France', 'You receive a Revolution card to change your government. Stability −1, prestige −10.', 'scroll')]; } },
      { label: 'Send in the troops', run: s => { stab(s, -2); addCards(s, 'unrest', 2); player(s).prestige += 5; return [bad('The Bastille holds, for now', 'Stability −2 and two Peasant Unrest cards. Prestige +5 with the old nobility.', 'torch')]; } },
    ],
  },
  {
    id: 'english_civil_war', history: true, title: 'King and Parliament', art: 'scales', window: [1640, 1648], chance: 0.3,
    cond: s => P(s) === 'england',
    text: () => 'The King has ruled eleven years without Parliament. Now he needs its money for a war with the Scots, and the Commons want power in return: no taxes without their consent, and the King\'s ministers answerable to them.',
    options: [
      { label: 'Rule without them', hint: 'Royal power, civil strife', run: s => { stab(s, -2); s.np += 3; addCard(s, 'unrest'); return [bad('Civil war', 'Royal authority +3 nation points, but stability −2 and a Peasant Unrest card. Cavaliers fight Roundheads across the land.', 'sword')]; } },
      { label: 'Accept the Grand Remonstrance', hint: 'A Revolution card; peace at home', run: s => { addCard(s, 'revolution'); stab(s, 1); player(s).prestige -= 10; return [neutral('Parliament rules', 'Stability +1, prestige −10. You receive a Revolution card to reform the government.', 'scales')]; } },
    ],
  },
  {
    id: 'boston_tea', history: true, title: 'Tea in Boston Harbour', art: 'anchor', window: [1773, 1778], chance: 0.5,
    cond: s => P(s) === 'england' && alive(s, 'thirteen_colonies'),
    text: () => 'American colonists dressed as Mohawks have thrown a cargo of East India tea into Boston harbour. "No taxation without representation," they cry. Your ministers want to close the port.',
    options: [
      { label: 'Repeal the taxes', can: s => needs(s, 40), run: s => { player(s).gold -= scaled(s, 40); addRel(s, P(s), 'thirteen_colonies', 30); player(s).prestige -= 5; return [neutral('Calm returns', `You give up ${scaled(s, 40)} ducats of revenue. The colonies are mollified (+30). Prestige −5.`, 'coin')]; } },
      { label: 'Send the redcoats', hint: 'The colonies may rise, with France behind them', run: s => {
        const c = s.nations.thirteen_colonies;
        if (c.overlord === P(s)) releaseSubject(s, c.id);
        aiBoost(s, c.id, 4);
        if (!atWar(s, c.id, P(s))) declareWar(s, c.id, P(s));
        const out = [bad('The colonies rise', `${c.name} declare their independence and go to war. Their militia is larger than you thought.`, 'sword')];
        if (alive(s, 'france') && !atWar(s, 'france', P(s)) && getRel(s, 'france', P(s)) < 20 && !hasTreaty(s, 'france', P(s), 'alliance')) { declareWar(s, 'france', P(s)); out.push(bad('France joins them', 'King Louis sends ships and soldiers to the Americans.', 'anchor')); }
        return out;
      } },
    ],
  },
  {
    id: 'independence', history: true, anywhere: true, title: 'Common Sense', art: 'scroll', window: [1774, 1777], chance: 0.6,
    cond: s => P(s) === 'thirteen_colonies' && alive(s, 'england'),
    text: () => 'A pamphlet sells a hundred thousand copies in a season: it is only common sense that an island should not rule a continent. In Philadelphia the Congress debates a declaration of independence.',
    options: [
      { label: 'Declare independence', hint: 'War with Britain; a great general; France may help', run: s => {
        if (player(s).overlord) releaseSubject(s, P(s));
        if (!atWar(s, P(s), 'england')) declareWar(s, P(s), 'england');
        player(s).prestige += 20;
        const out = [good('Free and independent states', 'You are at war with Britain. Prestige +20.', 'scroll')];
        const g = giveLegend(s, 'washington'); if (g) out.push(good(g, 'The Virginian colonel takes command of the Continental Army.', 'helm'));
        if (alive(s, 'france') && !atWar(s, P(s), 'france')) { addTreaty(s, P(s), 'france', 'alliance'); addRel(s, P(s), 'france', 30); out.push(good('An alliance with France', 'France signs a treaty of alliance (+30).', 'hands')); }
        return out;
      } },
      { label: 'Petition the King', run: s => { addRel(s, P(s), 'england', 20); stab(s, 1); return [neutral('The Olive Branch', 'Britain is pleased (+20). Stability +1.', 'dove')]; } },
    ],
  },
  {
    id: 'tsar_of_russia', history: true, title: 'Tsar of All Russia', art: 'crown', window: [1545, 1550], chance: 0.4,
    cond: s => P(s) === 'muscovy' && player(s).name !== 'Russia',
    text: () => 'The young Grand Prince wants to be crowned with the cap of Monomakh as Tsar, a Caesar like the emperors of Rome and Byzantium. Moscow, the boyars say, is the Third Rome.',
    options: [
      { label: 'Be crowned Tsar', hint: 'Your realm becomes Russia; a claim on Kazan', run: s => {
        const me = player(s); me.name = 'Russia'; me.adj = 'Russian'; me.prestige += 15;
        const out = [good('The Tsardom of Russia', 'Your realm is now called Russia. Prestige +15.', 'crown')];
        if (alive(s, 'kazan')) { s.flags.claim_kazan = 1; out.push(neutral('Kazan', 'You hold a claim on the khanate of Kazan: war without losing stability.', 'sword')); }
        return out;
      } },
      { label: 'Remain Grand Prince', run: s => { s.np += 3; return [neutral('Modesty', '+3 nation points. The boyars are reassured.', 'scroll')]; } },
    ],
  },
  {
    id: 'poltava', history: true, title: 'Karl XII Marches on Moscow', art: 'sword', window: [1707, 1710], chance: 0.6,
    cond: s => ['muscovy', 'sweden'].includes(P(s)) && alive(s, 'muscovy') && alive(s, 'sweden') && atWar(s, 'muscovy', 'sweden'),
    text: s => P(s) === 'sweden' ? 'The Swedish army has never lost a battle under the young King. Now he means to end the war with Tsar Peter in Moscow itself. His generals fear the winter and the empty land.' : 'The King of Sweden has crossed into the Ukraine with the finest army in Europe. Tsar Peter\'s generals propose to burn the land before him and fight only when he is starved.',
    options: [
      { label: 'Give battle', hint: 'All on one throw', run: s => {
        const swe = P(s) === 'sweden', foe = swe ? 'muscovy' : 'sweden';
        if (rand(s) < (swe ? 0.3 : 0.7)) { player(s).prestige += 25; s.flags['claim_' + foe] = 1; cutArmy(s.nations[foe], 0.4); return [good(swe ? 'Moscow trembles' : 'Victory at Poltava!', `The enemy army is broken (−40%). Prestige +25 and a claim on ${nationName(s, foe)}.`, 'crown')]; }
        lose(s, 0.5); player(s).prestige -= 15; stab(s, -1);
        return [bad(swe ? 'Disaster at Poltava' : 'A bloody defeat', 'Half your army is lost. Prestige −15, stability −1.', 'skull')];
      } },
      { label: 'Hold back', run: s => { const foe = P(s) === 'sweden' ? 'muscovy' : 'sweden'; if (atWar(s, P(s), foe)) { endWar(s, foe); if (atWar(s, P(s), foe)) makePeace(s, P(s), foe); } player(s).prestige -= 10; return [neutral('Peace of exhaustion', `The war with ${nationName(s, foe)} ends. Prestige −10.`, 'dove')]; } },
    ],
  },
  {
    id: 'st_petersburg', history: true, title: 'A Window on Europe', art: 'anchor', window: [1703, 1712], chance: 0.3,
    cond: s => P(s) === 'muscovy',
    text: s => `The Tsar wants a new capital on the marshes of the Neva, built in stone by Dutch and Italian architects, with a navy, an academy and wide streets. It will cost ${scaled(s, 60)} ducats and thousands of lives.`,
    options: [
      { label: 'Build Saint Petersburg', can: s => needs(s, 60), run: s => { player(s).gold -= scaled(s, 60); player(s).prestige += 15; s.flags.reform_research = (s.flags.reform_research ?? 0) + 1; stab(s, -1); return [good('A city on the Neva', 'Prestige +15 and +1 research on every study. Stability −1: the old boyars hate it.', 'anchor')]; } },
      { label: 'Moscow is enough', run: s => { stab(s, 1); return [neutral('Old Russia', 'Stability +1.')]; } },
    ],
  },
  {
    id: 'gustavus_germany', history: true, title: 'The Lion of the North', art: 'banner', window: [1628, 1634], chance: 0.4,
    cond: s => P(s) === 'sweden' && alive(s, 'austria') && !hasTreaty(s, P(s), 'austria', 'alliance'),
    text: () => 'The Emperor\'s armies stand on the Baltic shore and the Protestant princes of Germany are beaten. Cardinal Richelieu offers French gold if Sweden will land in Pomerania.',
    options: [
      { label: 'Land in Germany', hint: 'War with Austria, French subsidies', run: s => {
        if (!atWar(s, P(s), 'austria')) declareWar(s, P(s), 'austria');
        const g = alive(s, 'france') ? scaled(s, 40) : 0; player(s).gold += g; const t = addTroops(s, 'inf', 2); player(s).prestige += 15;
        return [good('Sweden goes to war', `You are at war with Austria. Two companies of ${t} and prestige +15.${g ? ` France pays ${g} ducats.` : ''}`, 'banner')];
      } },
      { label: 'Stay out', run: s => { stab(s, 1); addRel(s, P(s), 'austria', 10); return [neutral('The Baltic first', 'Stability +1, Austria +10.')]; } },
    ],
  },
  {
    id: 'vienna_ottoman', history: true, title: 'The Red Apple of the West', art: 'cannon', window: [1680, 1688], chance: 0.4,
    cond: s => P(s) === 'ottomans' && alive(s, 'austria') && !s.flags.vienna_done,
    text: () => 'Grand Vizier Kara Mustafa wants to finish what Süleyman began: to take Vienna, the golden apple of the West. The Hungarian rebels promise to rise with him.',
    options: [
      { label: 'March on Vienna', hint: 'A great gamble', run: s => {
        s.flags.vienna_done = 1; addRel(s, P(s), 'austria', -30);
        if (rand(s) < 0.35) { const g = scaled(s, 60); player(s).prestige += 30; player(s).gold += g; s.flags.claim_austria = 1; return [good('Vienna ransomed', `The Emperor flees and the city pays ${g} ducats to be spared. Prestige +30 and a claim on Austria.`, 'crown')]; }
        lose(s, 0.4); player(s).prestige -= 20; stab(s, -1); if (alive(s, 'poland')) addRel(s, P(s), 'poland', -20);
        return [bad('Defeat at the Kahlenberg', 'The Polish winged hussars break the siege. You lose 40% of your army, prestige −20, stability −1.', 'skull')];
      } },
      { label: 'Renew the truce', run: s => { s.flags.vienna_done = 1; stab(s, 1); player(s).prestige -= 5; return [neutral('Patience', 'Stability +1, prestige −5.')]; } },
    ],
  },
  {
    id: 'vienna_austria', history: true, title: 'The Turks Before Vienna', art: 'tower', window: [1682, 1686], chance: 0.4,
    cond: s => P(s) === 'austria' && alive(s, 'ottomans') && provsOf(s, 'ottomans').length >= 10,
    text: () => 'A huge Ottoman army marches up the Danube and the court has fled to Passau. Count Starhemberg holds the walls with a small garrison. King Jan Sobieski of Poland may come, if asked.',
    options: [
      { label: 'Call on Sobieski', can: s => alive(s, 'poland') ? null : 'Poland is gone', hint: 'Alliance with Poland; a claim on the Turks', run: s => {
        addTreaty(s, P(s), 'poland', 'alliance'); addRel(s, P(s), 'poland', 30); s.flags.claim_ottomans = 1; player(s).prestige += 20;
        const gen = giveLegend(s, 'eugene');
        return [good('The relief of Vienna', 'The winged hussars charge down the Kahlenberg. Alliance with Poland (+30), prestige +20, and a claim on the Ottomans.', 'crown'), ...(gen ? [good(gen, 'A young Savoyard prince who fought at Vienna offers you his sword.', 'helm')] : [])];
      } },
      { label: 'Buy them off', can: s => needs(s, 50), run: s => { player(s).gold -= scaled(s, 50); player(s).prestige -= 15; return [neutral('Gold for the Sultan', `You pay ${scaled(s, 50)} ducats. Prestige −15.`, 'coin')]; } },
    ],
  },
  {
    id: 'silesia', history: true, title: 'The King of Prussia Strikes', art: 'sword', window: [1740, 1745], chance: 0.5,
    cond: s => P(s) === 'austria' && alive(s, 'brandenburg') && borders(s, P(s), 'brandenburg') && !hasTreaty(s, P(s), 'brandenburg', 'alliance'),
    text: () => 'The old emperor is dead and his daughter Maria Theresia is on the throne. Within weeks the young King of Prussia has marched into Silesia without declaring war. Hungary\'s nobles offer "our life and blood" for their queen.',
    options: [
      { label: 'Fight for every acre', hint: 'War with Prussia, the realm rallies', run: s => { if (!atWar(s, 'brandenburg', P(s))) declareWar(s, 'brandenburg', P(s)); stab(s, 1); player(s).prestige += 10; const t = addTroops(s, 'cav', 1); return [good('Vitam et sanguinem', `You are at war with ${nationName(s, 'brandenburg')}. Stability +1, prestige +10, and a company of ${t} from Hungary.`, 'sword')]; } },
      { label: 'Give up Silesia for peace', run: s => { player(s).prestige -= 15; stab(s, 1); addRel(s, P(s), 'brandenburg', 20); return [neutral('A bitter peace', 'Prestige −15, stability +1.')]; } },
    ],
  },
  // ---------- Asia ----------
  {
    id: 'great_wall', history: true, anywhere: true, title: 'The Wall of Ten Thousand Li', art: 'tower', window: [1470, 1550], chance: 0.15,
    cond: s => P(s) === 'ming' && northFront(s).length > 0,
    text: s => `Steppe horsemen raid the northern frontier every autumn. Ministers argue: rebuild the old earthen wall in brick and stone for ${scaled(s, 70)} ducats, or open horse markets and buy peace with trade.`,
    options: [
      { label: 'Build in stone', can: s => needs(s, 70), run: s => {
        player(s).gold -= scaled(s, 70); const cap = maxFort(s); const ps = northFront(s); for (const p of ps) p.fort = Math.min(cap, p.fort + 1);
        return [good('The Great Wall', `Walls +1 in ${ps.length} frontier province${ps.length > 1 ? 's' : ''} (up to the limit of the age).`, 'tower')];
      } },
      { label: 'Open the horse markets', run: s => {
        const st = [...new Set(northFront(s).flatMap(p => getGeo().adj[p.id].map(nb => s.provinces[nb].owner)))].filter(o => o !== P(s) && alive(s, o));
        for (const n of st) { addRel(s, P(s), n, 30); if (!atWar(s, P(s), n)) addTreaty(s, P(s), n, 'trade'); }
        stab(s, -1); return [neutral('Peace by trade', `Trade treaties and +30 relations with ${st.map(n => nationName(s, n)).join(', ') || 'the steppe'}. The censors call it shameful: stability −1.`, 'coin')];
      } },
    ],
  },
  {
    id: 'manchu_conquest', history: true, anywhere: true, title: 'The Fall of Beijing', art: 'tower', window: [1640, 1645], chance: 0.5,
    cond: s => P(s) === 'ming' && (alive(s, 'jurchens') || alive(s, 'qing')),
    text: () => 'The rebel Li Zicheng is at the gates of Beijing, and the treasury cannot pay the soldiers. At Shanhai Pass, general Wu Sangui must choose: open the Great Wall to the Manchus so they destroy the rebels, or hold it against both.',
    options: [
      { label: 'Ally with the Manchus', hint: 'The rebels are crushed; the Manchus take the north-east', run: s => {
        const m = alive(s, 'jurchens') ? 'jurchens' : 'qing';
        const near = provsOf(s, P(s)).filter(p => p.id !== player(s).capital && getGeo().adj[p.id].some(nb => s.provinces[nb].owner === m));
        if (near.length) transferProvince(s, near[0].id, m);
        if (atWar(s, P(s), m)) { endWar(s, m); if (atWar(s, P(s), m)) makePeace(s, P(s), m); }
        stab(s, 1); player(s).prestige -= 20; addRel(s, P(s), m, 30);
        return [neutral('The gate opens', `The rebels are scattered. Stability +1, prestige −20.${near.length ? ` The Manchus keep ${near[0].name}.` : ''}`, 'tower')];
      } },
      { label: 'Hold the wall against all', hint: 'War with the Manchus and unrest', run: s => {
        const m = alive(s, 'jurchens') ? 'jurchens' : 'qing';
        if (!atWar(s, m, P(s))) declareWar(s, m, P(s));
        stab(s, -2); addCard(s, 'unrest'); const t = addTroops(s, 'inf', 2);
        return [bad('The dynasty fights for its life', `At war with ${nationName(s, m)}. Stability −2 and a Peasant Unrest card. Two loyal companies of ${t} rally to the throne.`, 'sword')];
      } },
    ],
  },
  {
    id: 'macartney', history: true, anywhere: true, title: 'An Embassy from the Western Ocean', art: 'scroll', window: [1792, 1795], chance: 0.5,
    cond: s => P(s) === 'qing' && alive(s, 'england'),
    text: () => 'Lord Macartney has come from King George with clocks, telescopes and a request: an envoy in Beijing, and ports open to British trade. He refuses to kowtow.',
    options: [
      { label: 'We possess all things', hint: 'Prestige; Britain is offended', run: s => { player(s).prestige += 10; addRel(s, P(s), 'england', -30); return [neutral('The Celestial Empire needs nothing', 'Prestige +10. Britain −30.', 'crown')]; } },
      { label: 'Open more ports', run: s => { addTreaty(s, P(s), 'england', 'trade'); addRel(s, P(s), 'england', 20); stab(s, -1); player(s).prestige -= 5; return [good('Trade with the West', 'A trade treaty with Britain (+20). Stability −1, prestige −5.', 'coin')]; } },
    ],
  },
  {
    id: 'onin_war', history: true, anywhere: true, title: 'The Ōnin War', art: 'torch', window: [1467, 1477], chance: 0.4,
    cond: s => P(s) === 'japan' && alive(s, 'hosokawa') && alive(s, 'yamana'),
    text: () => 'The shogun\'s succession has split the great houses. Hosokawa Katsumoto and Yamana Sōzen camp in the streets of Kyoto with a hundred thousand men between them, and the temples are burning.',
    options: [
      { label: 'Back the Hosokawa', run: s => sideWith(s, 'hosokawa', 'yamana') },
      { label: 'Back the Yamana', run: s => sideWith(s, 'yamana', 'hosokawa') },
    ],
  },
  {
    id: 'tanegashima', history: true, anywhere: true, title: 'Southern Barbarians', art: 'anchor', window: [1543, 1550], chance: 0.4,
    cond: s => P(s) === 'japan',
    text: s => `A Chinese junk has washed up on Tanegashima carrying Portuguese traders with strange iron guns. The local lord asks ${scaled(s, 30)} ducats to have his smiths copy them.`,
    options: [
      { label: 'Copy their guns', can: s => needs(s, 30), run: s => { player(s).gold -= scaled(s, 30); const had = s.techs.includes('firearms'); if (!had) s.techs.push('firearms'); if (alive(s, 'portugal')) addRel(s, P(s), 'portugal', 20); return [good('Tanegashima guns', had ? 'Your smiths improve your firearms. Portugal +20.' : 'You learn Firearms. Portugal +20.', 'cannon')]; } },
      { label: 'Turn them away', run: s => { stab(s, 1); return [neutral('No barbarians', 'Stability +1.')]; } },
    ],
  },
  {
    id: 'taj_mahal', history: true, anywhere: true, title: 'A Tomb for the Empress', art: 'laurel', window: [1631, 1645], chance: 0.3,
    cond: s => P(s) === 'mughals',
    text: s => `Mumtaz Mahal has died in childbirth. The Emperor, grey with grief, wants a tomb of white marble on the Yamuna that will outlast the world. It will cost ${scaled(s, 100)} ducats.`,
    options: [
      { label: 'Build the Taj Mahal', can: s => needs(s, 100), run: s => { player(s).gold -= scaled(s, 100); player(s).prestige += 30; s.art = Math.min(100, s.art + 12); return [good('The Taj Mahal', 'Prestige +30, arts +12. Travellers will come for centuries.', 'laurel')]; } },
      { label: 'Spend it on the Deccan wars', run: s => { const t = addTroops(s, 'inf', 2); return [neutral('Duty before grief', `Two companies of ${t} march south.`, 'banner')]; } },
    ],
  },
  {
    id: 'deccan_wars', history: true, anywhere: true, title: 'The Emperor Marches South', art: 'sword', window: [1681, 1705], chance: 0.25,
    cond: s => P(s) === 'mughals' && deccanFoe(s) !== '',
    text: s => `The Deccan will not submit. ${nationName(s, deccanFoe(s))} raids the imperial lands and the Emperor's councillors want him to take the field in person, for as long as it takes.`,
    options: [
      { label: 'Take the field', hint: 'War; the treasury and the realm suffer', run: s => { const f = deccanFoe(s); s.flags['claim_' + f] = 1; if (!atWar(s, P(s), f)) declareWar(s, P(s), f); stab(s, -1); player(s).gold = Math.max(0, player(s).gold - scaled(s, 30)); return [neutral('The long war', `At war with ${nationName(s, f)}. Stability −1 and ${scaled(s, 30)} ducats spent.`, 'sword')]; } },
      { label: 'Make terms', run: s => { addRel(s, P(s), deccanFoe(s), 25); player(s).prestige -= 10; return [neutral('An uneasy peace', 'Relations +25, prestige −10.', 'dove')]; } },
    ],
  },
  {
    id: 'panipat', history: true, anywhere: true, title: 'Babur Crosses the Indus', art: 'cannon', window: [1524, 1527], chance: 0.5,
    cond: s => P(s) === 'delhi' && alive(s, 'timurids') && borders(s, P(s), 'timurids'),
    text: () => 'Babur, a Timurid prince of Kabul, has crossed the Indus with a small army, Turkish matchlocks and field guns chained together behind carts. The Sultan\'s war elephants outnumber them ten to one.',
    options: [
      { label: 'Meet him at Panipat', hint: 'A risky battle', run: s => {
        if (rand(s) < (hasTech(s, 'firearms') ? 0.6 : 0.4)) { player(s).prestige += 25; s.flags.claim_timurids = 1; cutArmy(s.nations.timurids, 0.4); return [good('The invader is beaten', 'Babur\'s army is broken. Prestige +25 and a claim on his lands.', 'crown')]; }
        lose(s, 0.5); stab(s, -2); if (!atWar(s, 'timurids', P(s))) declareWar(s, 'timurids', P(s));
        return [bad('The elephants panic', 'The guns stampede your elephants. Half your army is lost, stability −2, and Babur marches on Delhi.', 'skull')];
      } },
      { label: 'Pay him to go home', can: s => needs(s, 60), run: s => { player(s).gold -= scaled(s, 60); addRel(s, P(s), 'timurids', 40); if (atWar(s, P(s), 'timurids')) { endWar(s, 'timurids'); if (atWar(s, P(s), 'timurids')) makePeace(s, P(s), 'timurids'); } else s.truces.push({ a: P(s), b: 'timurids', until: s.year + 10 }); player(s).prestige -= 10; return [neutral('Tribute', `You pay ${scaled(s, 60)} ducats for ten years of peace. Prestige −10.`, 'coin')]; } },
    ],
  },
  {
    id: 'talikota', history: true, anywhere: true, title: 'The Sultans Unite', art: 'sword', window: [1562, 1566], chance: 0.5,
    cond: s => P(s) === 'vijayanagara' && alive(s, 'bahmani'),
    text: () => 'For once the quarrelling sultans of the Deccan have made common cause against the City of Victory. Their armies gather at Talikota with heavy guns and Turkish gunners.',
    options: [
      { label: 'Give battle', hint: 'Win, or see Hampi sacked', run: s => {
        if (rand(s) < 0.45) { player(s).prestige += 30; s.flags.claim_bahmani = 1; return [good('Victory at Talikota', 'The sultans flee. Prestige +30 and a claim on the Deccan.', 'crown')]; }
        lose(s, 0.5); stab(s, -2); const c = s.provinces[player(s).capital]; c.dev = Math.max(1, c.dev - 2);
        return [bad('Hampi is sacked', `Half your army is lost; ${c.name} loses 2 development. Stability −2.`, 'torch')];
      } },
      { label: 'Divide them with gold', can: s => needs(s, 60), run: s => { player(s).gold -= scaled(s, 60); addRel(s, P(s), 'bahmani', 30); return [neutral('Bribes', `You pay ${scaled(s, 60)} ducats and the alliance falls apart (+30).`, 'coin')]; } },
    ],
  },
  // ---------- Africa ----------
  {
    id: 'timbuktu', history: true, anywhere: true, title: 'The City of Scholars', art: 'book', window: [1465, 1470], chance: 0.4,
    cond: s => P(s) === 'songhai' && alive(s, 'mali'),
    text: () => 'Timbuktu, the city of three hundred mosques and the great libraries, still answers to the weakening Mansa of Mali. Its Tuareg masters will not stop Sunni Ali for long. Its scholars fear him more than the Tuareg.',
    options: [
      { label: 'Take Timbuktu', hint: 'War with Mali; the scholars flee', run: s => { if (!atWar(s, P(s), 'mali')) declareWar(s, P(s), 'mali'); player(s).prestige += 10; stab(s, -1); return [neutral('Sunni Ali rides', 'You are at war with Mali. Prestige +10, but the frightened ulama cost you stability −1.', 'sword')]; } },
      { label: 'Protect the scholars', run: s => { stab(s, 1); s.flags.reform_research = (s.flags.reform_research ?? 0) + 1; addRel(s, P(s), 'mali', 15); return [good('Learning flourishes', 'Stability +1 and +1 research on every study. Mali +15.', 'book')]; } },
    ],
  },
  {
    id: 'askia_hajj', history: true, anywhere: true, title: 'The Pilgrimage of the Askia', art: 'star', window: [1495, 1498], chance: 0.5,
    cond: s => P(s) === 'songhai',
    text: s => `The new Askia wants to make the pilgrimage to Mecca with a great retinue, as Mansa Musa once did, and come home with the blessing of the Sharif. It will cost ${scaled(s, 50)} ducats in gifts and alms.`,
    options: [
      { label: 'Go to Mecca', can: s => needs(s, 50), run: s => { player(s).gold -= scaled(s, 50); player(s).prestige += 20; s.np += 3; stab(s, 1); return [good('Caliph of the West', 'The Sharif names you his deputy in the lands of the Blacks. Prestige +20, +3 nation points, stability +1.', 'star')]; } },
      { label: 'Stay and rule', run: s => { const t = addTroops(s, 'cav', 1); return [neutral('The army first', `A company of ${t} joins the host.`, 'banner')]; } },
    ],
  },
  {
    id: 'tondibi', history: true, anywhere: true, title: 'Musketeers Across the Sahara', art: 'cannon', window: [1589, 1592], chance: 0.6,
    cond: s => P(s) === 'songhai' && alive(s, 'morocco'),
    text: () => 'The Sultan of Morocco covets the gold of the Niger. Judar Pasha has crossed the desert with four thousand musketeers and cannon. They are few and exhausted, but Songhai has never faced guns.',
    options: [
      { label: 'Meet them at Tondibi', hint: 'Firearms help', run: s => {
        if (rand(s) < (hasTech(s, 'firearms') ? 0.65 : 0.4)) { player(s).prestige += 25; s.flags.claim_morocco = 1; return [good('The desert swallows them', 'Few of the invaders see Marrakesh again. Prestige +25, and a claim on Morocco.', 'crown')]; }
        lose(s, 0.5); stab(s, -2); if (!atWar(s, 'morocco', P(s))) declareWar(s, 'morocco', P(s));
        return [bad('Defeat at Tondibi', 'Cattle driven at the guns stampede back through your own lines. Half the army is lost, stability −2, and Morocco is at war with you.', 'skull')];
      } },
      { label: 'Pay them off', can: s => needs(s, 80), run: s => { player(s).gold -= scaled(s, 80); addRel(s, P(s), 'morocco', 30); player(s).prestige -= 10; return [neutral('Gold for the Pasha', `You pay ${scaled(s, 80)} ducats in gold dust. Prestige −10.`, 'coin')]; } },
    ],
  },
  {
    id: 'mali_envoys', history: true, anywhere: true, title: 'Envoys to Lisbon', art: 'anchor', window: [1481, 1540], chance: 0.15,
    cond: s => P(s) === 'mali' && alive(s, 'portugal') && !hasTreaty(s, P(s), 'portugal', 'trade'),
    text: () => 'Songhai horsemen take the cities of the Niger bend one by one. Portuguese ships trade on the Gambia, and the Mansa\'s council suggests asking the King of Portugal for friendship and guns.',
    options: [
      { label: 'Send envoys', hint: 'Trade and a few guns', run: s => { addTreaty(s, P(s), 'portugal', 'trade'); addRel(s, P(s), 'portugal', 30); s.troops.push({ uid: uid(s), type: 'arquebusiers', vet: 1, str: 100 }); stab(s, -1); return [good('Friends across the sea', 'A trade treaty with Portugal (+30) and a company of Arquebusiers. Stability −1: the old families distrust the Christians.', 'anchor')]; } },
      { label: 'Trust the old ways', run: s => { stab(s, 1); return [neutral('Mali stands alone', 'Stability +1.')]; } },
    ],
  },
  {
    id: 'gragn', history: true, anywhere: true, title: 'Ahmad the Left-Handed', art: 'sword', window: [1527, 1543], chance: 0.25,
    cond: s => P(s) === 'ethiopia' && alive(s, 'adal'),
    text: () => 'Imam Ahmad ibn Ibrahim of Adal has declared holy war. His army carries Ottoman matchlocks; churches and monasteries burn across the highlands. The Emperor writes to the King of Portugal for help.',
    options: [
      { label: 'Call the Portuguese', can: s => alive(s, 'portugal') ? null : 'Portugal is gone', hint: 'Musketeers and a legendary captain', run: s => {
        for (let i = 0; i < 2; i++) s.troops.push({ uid: uid(s), type: 'arquebusiers', vet: 1, str: 100 });
        addRel(s, P(s), 'portugal', 30); s.flags.claim_adal = 1;
        const g = giveLegend(s, 'cristovao');
        return [good('Four hundred musketeers', 'Two companies of Portuguese Arquebusiers land at Massawa. Portugal +30, and a claim on Adal.', 'anchor'), ...(g ? [good(g, 'Vasco da Gama\'s son leads them.', 'helm')] : [])];
      } },
      { label: 'Fight on alone', run: s => { if (!atWar(s, 'adal', P(s))) declareWar(s, 'adal', P(s)); stab(s, -1); player(s).prestige += 10; return [neutral('The highlands resist', 'At war with Adal. Stability −1, prestige +10.', 'sword')]; } },
    ],
  },
  {
    id: 'kongo_baptism', history: true, anywhere: true, title: 'The Baptism of the Manikongo', art: 'church', window: [1483, 1495], chance: 0.3,
    cond: s => P(s) === 'kongo' && alive(s, 'portugal') && s.stateReligion !== 'catholic',
    text: () => 'Portuguese ships have come up the great river with priests, masons and gifts. They ask the Manikongo to be baptised as their King has been. Some of the nobles want the new god\'s power; others cling to the nkisi of their fathers.',
    options: [
      { label: 'Accept baptism', hint: 'Your crown becomes Catholic', run: s => {
        s.stateReligion = 'catholic'; s.provinces[player(s).capital].religion = 'catholic';
        addRel(s, P(s), 'portugal', 40); addRel(s, P(s), 'papacy', 20); addTreaty(s, P(s), 'portugal', 'trade'); stab(s, -1);
        return [good('João I of Kongo', 'The crown is Catholic and the capital follows. A trade treaty with Portugal (+40), the Pope +20. Stability −1; the countryside keeps its old faith.', 'church')];
      } },
      { label: 'Keep the old faith', run: s => { stab(s, 1); addRel(s, P(s), 'portugal', -10); return [neutral('The ancestors are honoured', 'Stability +1, Portugal −10.')]; } },
    ],
  },
  {
    id: 'mbwila', history: true, anywhere: true, title: 'The Road to Mbwila', art: 'sword', window: [1660, 1666], chance: 0.4,
    cond: s => P(s) === 'kongo' && alive(s, 'portugal') && getRel(s, P(s), 'portugal') < 40,
    text: () => 'The governor of Portuguese Angola claims the copper mines of the south. His musketeers and their Imbangala allies are marching on Mbwila. The King wants to meet them with the whole army of Kongo.',
    options: [
      { label: 'Give battle', hint: 'A dangerous throw', run: s => {
        if (rand(s) < 0.4) { player(s).prestige += 25; s.flags.claim_portugal = 1; return [good('Victory at Mbwila', 'The Portuguese are driven back to Luanda. Prestige +25 and a claim on Portugal.', 'crown')]; }
        lose(s, 0.5); stab(s, -2); player(s).prestige -= 15;
        return [bad('The King falls', 'Half your army is lost and the King\'s head is carried to Luanda. Stability −2, prestige −15.', 'skull')];
      } },
      { label: 'Pay for peace', can: s => needs(s, 50), run: s => { player(s).gold -= scaled(s, 50); addRel(s, P(s), 'portugal', 25); return [neutral('The mines are shared', `You pay ${scaled(s, 50)} ducats. Portugal +25.`, 'coin')]; } },
    ],
  },
  // ---------- the Americas ----------
  {
    id: 'one_rabbit', history: true, anywhere: true, title: 'The Famine of One Rabbit', art: 'wheat', window: [1451, 1456], chance: 0.4,
    cond: s => P(s) === 'aztec',
    text: s => `Frost and drought have ruined the maize for the second year. People sell themselves to the Totonacs for food. Moctezuma can open the granaries of Tenochtitlan (${scaled(s, 30)} ducats), or the priests say the gods want more captives.`,
    options: [
      { label: 'Open the granaries', can: s => needs(s, 30), run: s => { player(s).gold -= scaled(s, 30); stab(s, 1); return [good('The people are fed', 'Stability +1.', 'wheat')]; } },
      { label: 'Wage the Flower Wars', hint: 'A claim on Tlaxcala', run: s => { if (alive(s, 'tlaxcala')) { s.flags.claim_tlaxcala = 1; addRel(s, P(s), 'tlaxcala', -30); } player(s).prestige += 10; stab(s, -1); return [neutral('Captives for the gods', 'Prestige +10, stability −1. You hold a claim on Tlaxcala.', 'sword')]; } },
    ],
  },
  {
    id: 'chimor', history: true, anywhere: true, title: 'The Kingdom of Chimor', art: 'sword', window: [1460, 1475], chance: 0.3,
    cond: s => P(s) === 'inca' && alive(s, 'chimor') && !s.nations.chimor.overlord,
    text: () => 'On the desert coast the lords of Chan Chan rule rich irrigated valleys, and their goldsmiths are the best in the world. Túpac Inca Yupanqui could take the mountain springs that water their canals.',
    options: [
      { label: 'Conquer Chimor', run: s => { s.flags.claim_chimor = 1; if (!atWar(s, P(s), 'chimor')) declareWar(s, P(s), 'chimor'); player(s).prestige += 10; return [good('The armies march', 'At war with Chimor, without losing stability. Prestige +10.', 'sword')]; } },
      { label: 'Demand tribute', hint: 'They may bow, or refuse', run: s => {
        if (provsOf(s, 'chimor').length <= 6 && rand(s) < 0.55) { makeSubject(s, 'chimor', 'vassal'); return [good('Chimor bows', 'Chimor becomes your vassal and sends its goldsmiths to Cusco.', 'crown')]; }
        addRel(s, P(s), 'chimor', -20); return [bad('They refuse', 'The Chimú lord sends back your envoys. Relations −20.')];
      } },
    ],
  },
  {
    id: 'inca_civil_war', history: true, anywhere: true, title: 'A Sickness from the North', art: 'skull', window: [1525, 1532], chance: 0.4,
    cond: s => P(s) === 'inca',
    text: () => 'A strange sickness from the north, carried ahead of strangers no one here has yet seen, kills the Sapa Inca and his heir. Two of his sons claim the fringed crown: Huáscar in Cusco and Atahualpa with the veteran army in Quito.',
    options: [
      { label: 'Back Huáscar in Cusco', hint: 'Civil war', run: s => { stab(s, -2); player(s).manpower = 0; lose(s, 0.25); return [bad('Brother against brother', 'Stability −2, manpower gone, a quarter of the army lost.', 'skull')]; } },
      { label: 'Divide the empire', hint: 'Peace, at the cost of glory', run: s => { stab(s, -1); player(s).prestige -= 20; return [neutral('Two Incas', 'Stability −1, prestige −20.', 'scroll')]; } },
    ],
  },
];

export const EVENT: Record<string, EventDef> = Object.fromEntries(EVENTS.map(e => [e.id, e]));

/** Roll the history deck and random events for this year. */
export function rollEvents(s: GameState) {
  let fired = 0;
  for (const e of EVENTS) {
    if (fired >= 1 || e.chance <= 0) continue; // one event a quarter at most
    if (e.window && (s.year < e.window[0] || s.year > e.window[1])) continue;
    const lastKey = 'ev_' + e.id;
    if (e.repeat == null && s.firedEvents.includes(e.id)) continue;
    if (e.repeat != null && (s.flags[lastKey] ?? -999) + e.repeat > s.year) continue;
    if (e.history && !e.anywhere && !westernRealm(s)) continue;
    if (e.cond && !e.cond(s)) continue;
    let p = e.chance / 4; // chances are per year; a turn is a quarter
    if (e.window && e.history && s.year >= e.window[1]) p = 1; // history always comes due
    if (rand(s) >= p) continue;
    const vars = e.setup ? e.setup(s) : {};
    if (!vars) continue;
    s.firedEvents.push(e.id);
    s.flags[lastKey] = s.year;
    push(s, { kind: 'event', eventId: e.id, vars });
    fired++;
  }
}

/** Upcoming history cards for the timeline (face-down). */
export function upcomingHistory(s: GameState): { id: string; title: string; window: [number, number] }[] {
  const west = westernRealm(s);
  return EVENTS.filter(e => e.history && (west || e.anywhere) && e.window && !s.firedEvents.includes(e.id) && e.window[1] >= s.year && (!e.cond || e.cond(s)))
    .map(e => ({ id: e.id, title: typeof e.title === 'string' ? e.title : 'Unknown', window: e.window! }))
    .sort((a, b) => a.window[0] - b.window[0]).slice(0, 4);
}

export function eventTitle(s: GameState, id: string, v: Vars) {
  const e = EVENT[id];
  return typeof e.title === 'string' ? e.title : e.title(s, v);
}

void transferProvince; void alliesOf; void enemiesOf; void getGeo;
