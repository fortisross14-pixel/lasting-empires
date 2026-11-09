// History deck and random events. Each fires as a face-down card that flips to show choices.
import type { GameState, RevealItem } from '../types';
import { TROOPS } from '../data/troops';
import { LEGENDS } from '../data/characters';
import {
  player, provsOf, clamp, rand, pick, randInt, uid, addRel, getRel, addTreaty, hasTreaty, atWar, declareWar, makePeace,
  nationName, log, hasTech, push, armyCap, alliesOf, enemiesOf,
} from './core';
import { addCard, grantRandomCards } from './cards';
import { endWar } from './missions';
import { regionState } from './overseas';
import { unionClaim, subjectsOf, makeSubject } from './diplo';
import { happinessOf, CULTURE_NAMES } from './society';
import { getGeo } from './map';
import { createBattle, makeSide, genericGeneral, transferProvince } from './battle';
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
}

const addCards = (s: GameState, id: string, n: number) => { for (let i = 0; i < n; i++) addCard(s, id); };
const stab = (s: GameState, d: number) => { const p = player(s); p.stability = clamp(p.stability + d, -3, 3); };
const good = (title: string, text: string, kind = 'star'): RevealItem => ({ title, text, tone: 'good', kind });
const bad = (title: string, text: string, kind = 'twist'): RevealItem => ({ title, text, tone: 'bad', kind });
const neutral = (title: string, text: string, kind = 'scroll'): RevealItem => ({ title, text, tone: 'neutral', kind });
const P = (s: GameState) => s.player;
const alive = (s: GameState, n: string) => !!s.nations[n]?.alive;
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

export const EVENTS: EventDef[] = [
  {
    id: 'constantinople', history: true, title: 'The Fall of Constantinople', art: 'tower', window: [1453, 1454], chance: 1,
    text: () => 'Sultan Mehmed\'s great cannon pound the walls of the Queen of Cities. Messengers race west with the news. Has the last Roman city fallen?',
    options: [{
      label: 'Await the news',
      run: s => {
        if (rand(s) < 0.85) {
          addCards(s, 'greek_scholars', 2);
          return [bad('The City has fallen', 'The Ottoman Turks take Constantinople. Greek scholars flee west with their books.'), good('Greek Scholars', 'Two Greek Scholars research cards are added to your hand.', 'book')];
        }
        s.flags.const_holds = 1;
        player(s).gold += 20;
        return [good('The walls hold!', 'Against all odds the Sultan withdraws. History takes a different road: fewer corsairs will trouble the sea.'), good('Grateful envoys', 'A Byzantine embassy brings you 20 ducats.', 'coin')];
      },
    }],
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
          unionClaim(s, other);
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
    cond: s => alive(s, 'france') && alive(s, 'naples') && P(s) !== 'france',
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
    id: 'reformation', history: true, title: 'The Reformation', art: 'book', window: [1517, 1532], chance: 0.3,
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
    cond: s => !!s.flags.new_world,
    text: () => 'In the high Andes your colonists have found a mountain made of silver.',
    options: [{ label: 'Open the mines', run: s => { s.flags.new_world_income = (s.flags.new_world_income ?? 0) + 6; addCards(s, 'treasure_fleet', 2); return [good('Potosí', 'New World income +6 ducats a year. Two Treasure Fleet cards are added.', 'coin')]; } }],
  },
  {
    id: 'price_revolution', history: true, title: 'The Price Revolution', art: 'coin', window: [1560, 1600], chance: 0.2,
    cond: s => !!s.flags.new_world,
    text: () => 'So much silver floods in that prices soar. Your treasury is richer, yet everything costs more.',
    options: [{ label: 'Borrow from the Genoese', run: s => { player(s).gold += 50; addCards(s, 'debt', 2); return [neutral('Bankers\' gold', '+50 ducats now, but two Crown Debt cards are added.', 'chain')]; } },
      { label: 'Cut spending', run: s => { stab(s, -1); return [neutral('Austerity', 'Stability −1.')]; } }],
  },
  {
    id: 'lepanto', history: true, title: 'The Holy League at Sea', art: 'anchor', window: [1565, 1576], chance: 0.3,
    cond: s => provsOf(s, P(s)).some(p => MED().includes(p.id)),
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
      if (!coast.length) return null;
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
    options: [{ label: 'Meet them', can: s => s.characters.length >= 8 ? 'Your court is crowded' : null, run: s => { push(s, { kind: 'draft', draft: 'court', options: courtOptions(s, undefined, 1) }); return [neutral('Audience', 'Choose one of them.', 'crown')]; } },
      { label: 'Send them away', run: () => [neutral('Not today', 'They leave.')] }],
  },
  {
    id: 'merchant_envoy', title: 'A Merchant Envoy', art: 'coin', chance: 0.06, repeat: 4,
    setup: s => {
      const c = Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && !atWar(s, P(s), n.id) && !hasTreaty(s, P(s), n.id, 'trade') && getRel(s, P(s), n.id) > -10);
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
        const n = randInt(s, 3, 5);
        const att = makeSide('rebels', Array.from({ length: n }, (_, i) => ({ uid: -200 - i, type: 'rebels', vet: 0, str: 100, start: 100 })), genericGeneral(s), 0, false);
        const home = s.troops.filter(t => t.mission == null).sort((a, b) => b.str - a.str).slice(0, 6);
        const gen = s.characters.find(c => c.role === 'general' && c.mission == null);
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
      const c = Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && n.id !== 'papacy' && !atWar(s, P(s), n.id) && !hasTreaty(s, P(s), n.id, 'marriage') && getRel(s, P(s), n.id) >= 10 && sameFaith(s, n.id));
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
    id: 'protestant_minority', title: 'The New Faith Spreads', art: 'church', chance: 0.15, repeat: 12, window: [1520, 1700],
    cond: s => s.stateReligion === 'catholic' && provsOf(s, P(s)).some(p => p.religion === 'catholic' && p.settlement >= 2),
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
    setup: s => { const ps = provsOf(s, P(s)).filter(p => p.religion !== s.stateReligion && !s.accepted.includes(p.culture) && p.control < 60 && p.dev <= 3); return ps.length ? { prov: pick(s, ps).id } : null; },
    text: (s, v) => `The native people of ${s.provinces[v.prov].name} rise against the settlers, who beg for soldiers.`,
    options: [
      { label: 'Send soldiers (25 ducats)', can: s => player(s).gold < 25 ? 'Needs 25 ducats' : null, run: (s, v) => { player(s).gold -= 25; s.provinces[v.prov].control = Math.min(100, s.provinces[v.prov].control + 15); return [good('Order', `Control +15 in ${s.provinces[v.prov].name}.`, 'sword')]; } },
      { label: 'Make peace with their chiefs', run: (s, v) => { const p = s.provinces[v.prov]; p.favor = Math.min(30, (p.favor ?? 0) + 10); p.dev = Math.max(1, p.dev - (rand(s) < 0.4 ? 1 : 0)); return [neutral('A treaty', `Happiness +10 in ${p.name}, but some settlers leave.`, 'hands')]; } },
    ],
  },
  {
    id: 'rival_colonies', title: 'Rival Flags Overseas', art: 'anchor', chance: 0.1, repeat: 10,
    setup: s => {
      const mine = new Set(provsOf(s, P(s)).filter(p => !getGeo().seeds.some(x => x.id === p.id && ['europe', 'north_africa', 'atlantic'].includes(x.region))).map(p => p.id));
      for (const id of mine) for (const nb of getGeo().adj[id]) { const o = s.provinces[nb].owner; if (o !== P(s) && s.nations[o]?.alive && !atWar(s, P(s), o) && !hasTreaty(s, P(s), o, 'alliance')) return { nation: o, prov: id }; }
      return null;
    },
    text: (s, v) => `Settlers of ${nationName(s, String(v.nation))} push into the lands around ${s.provinces[v.prov].name}. Your governor asks for orders.`,
    options: [
      { label: 'Claim the frontier', hint: 'A claim: war with them costs no stability', run: (s, v) => { s.flags['claim_' + v.nation] = 1; addRel(s, P(s), String(v.nation), -15); return [neutral('A claim', `You may declare war on ${nationName(s, String(v.nation))} without losing stability. Relations −15.`, 'sword')]; } },
      { label: 'Agree a border', run: (s, v) => { addRel(s, P(s), String(v.nation), 10); return [good('A border treaty', 'Relations +10.', 'hands')]; } },
    ],
  },
];

export const EVENT: Record<string, EventDef> = Object.fromEntries(EVENTS.map(e => [e.id, e]));

/** Roll the history deck and random events for this year. */
export function rollEvents(s: GameState) {
  let fired = 0;
  for (const e of EVENTS) {
    if (fired >= 2 || e.chance <= 0) continue;
    if (e.window && (s.year < e.window[0] || s.year > e.window[1])) continue;
    const lastKey = 'ev_' + e.id;
    if (e.repeat == null && s.firedEvents.includes(e.id)) continue;
    if (e.repeat != null && (s.flags[lastKey] ?? -999) + e.repeat > s.year) continue;
    if (e.history && !westernRealm(s)) continue;
    if (e.cond && !e.cond(s)) continue;
    let p = e.chance;
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
  if (!westernRealm(s)) return [];
  return EVENTS.filter(e => e.history && e.window && !s.firedEvents.includes(e.id) && e.window[1] >= s.year && (!e.cond || e.cond(s)))
    .map(e => ({ id: e.id, title: typeof e.title === 'string' ? e.title : 'Unknown', window: e.window! }))
    .sort((a, b) => a.window[0] - b.window[0]).slice(0, 4);
}

export function eventTitle(s: GameState, id: string, v: Vars) {
  const e = EVENT[id];
  return typeof e.title === 'string' ? e.title : e.title(s, v);
}

void transferProvince; void alliesOf; void enemiesOf; void getGeo;
