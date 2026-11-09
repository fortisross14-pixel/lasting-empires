// History deck and random events. Each fires as a face-down card that flips to show choices.
import type { GameState, RevealItem } from '../types';
import { TROOPS } from '../data/troops';
import { LEGENDS } from '../data/characters';
import {
  player, provsOf, clamp, rand, pick, randInt, uid, addRel, getRel, addTreaty, hasTreaty, atWar, declareWar, makePeace,
  nationName, log, hasTech, push, armyCap, alliesOf, enemiesOf,
} from './core';
import { addToDeck, addToHand } from './cards';
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

const stab = (s: GameState, d: number) => { const p = player(s); p.stability = clamp(p.stability + d, -3, 3); };
const good = (title: string, text: string, kind = 'star'): RevealItem => ({ title, text, tone: 'good', kind });
const bad = (title: string, text: string, kind = 'twist'): RevealItem => ({ title, text, tone: 'bad', kind });
const neutral = (title: string, text: string, kind = 'scroll'): RevealItem => ({ title, text, tone: 'neutral', kind });
const P = (s: GameState) => s.player;
const alive = (s: GameState, n: string) => !!s.nations[n]?.alive;
const MED_COAST = ['murcia', 'valencia', 'catalonia', 'majorca', 'sardinia', 'sicily', 'calabria', 'naples', 'malaga', 'granada', 'provence', 'genoa', 'corsica'];
const ATLANTIC = ['seville', 'lisbon', 'porto', 'algarve', 'galicia', 'asturias', 'biscay'];

function annexNation(s: GameState, other: string) {
  const o = s.nations[other];
  for (const p of provsOf(s, other)) { p.owner = s.player; p.core = s.player; p.unrest = 0; }
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
          addToDeck(s, 'greek_scholars', 2);
          return [bad('The City has fallen', 'The Ottoman Turks take Constantinople. Greek scholars flee west with their books.'), good('Greek Scholars', 'Two Greek Scholars cards are shuffled into your deck.', 'book')];
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
          annexNation(s, other);
          player(s).prestige += 25;
          log(s, `The crowns of Castile and Aragon are united!`, 'good');
          return [good('The Crowns are United!', `${name} joins your realm: all its provinces, treasury and army are now yours. Prestige +25.`, 'crown')];
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
        s.flags.claim_granada = 1; addToHand(s, 'crusade'); addRel(s, P(s), 'papacy', 15);
        if (!atWar(s, P(s), 'granada')) declareWar(s, P(s), 'granada');
        return [good('Holy war', 'You are at war with Granada without losing stability. A Crusade Bull card is added to your hand.', 'church')];
      } },
      { label: 'Not now', run: s => { addRel(s, P(s), 'papacy', -10); return [neutral('The Pope is disappointed', 'Relations with the Papacy −10.')]; } },
    ],
  },
  {
    id: 'columbus', history: true, title: 'A Genoese Navigator', art: 'anchor', window: [1484, 1496], chance: 0.25,
    cond: s => provsOf(s, P(s)).some(p => ATLANTIC.includes(p.id)) && !s.flags.new_world,
    text: () => 'Cristóbal Colón swears he can reach the Indies by sailing west. The scholars say the world is far bigger than he thinks. He needs three ships.',
    options: [
      { label: 'Fund the voyage (−40 ducats)', can: s => player(s).gold < 40 ? 'Needs 40 ducats' : null, run: s => {
        player(s).gold -= 40;
        const p = hasTech(s, 'navigation') ? 0.85 : 0.7;
        if (rand(s) < p) {
          s.flags.new_world = 1; s.flags.new_world_income = 4; player(s).prestige += 15;
          addToDeck(s, 'treasure_fleet', 2); addToDeck(s, 'conquistadors', 2);
          return [good('Land beyond the Ocean!', 'Colón finds a New World. +4 ducats a year (growing over time), prestige +15. Treasure Fleets and Conquistadors join your deck.', 'anchor')];
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
          s.flags.spice_income = 7; player(s).prestige += 15;
          const leg = LEGENDS.find(l => l.id === 'gama')!;
          if (!s.usedLegends.includes('gama')) {
            s.usedLegends.push('gama');
            s.characters.push({ uid: uid(s), name: leg.name, role: leg.role, skill: leg.skill, traits: leg.traits, born: s.year - 30, dies: leg.to, rarity: 'legendary', xp: 0, legendId: leg.id });
          }
          return [good('The road to India', 'Spices flow to Lisbon: +7 ducats a year, prestige +15.', 'anchor'), good('Vasco da Gama', 'The great captain joins your court.', 'crown')];
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
      { label: 'Tolerate the reformers', run: s => { stab(s, -1); s.flags.reform_research = 1; addRel(s, P(s), 'papacy', -25); return [neutral('New ideas', 'Every study gains +1 research a year. Stability −1, Papacy −25.', 'book')]; } },
    ],
  },
  {
    id: 'potosi', history: true, title: 'The Silver Mountain', art: 'coin', window: [1545, 1565], chance: 0.3,
    cond: s => !!s.flags.new_world,
    text: () => 'In the high Andes your colonists have found a mountain made of silver.',
    options: [{ label: 'Open the mines', run: s => { s.flags.new_world_income = (s.flags.new_world_income ?? 0) + 6; addToDeck(s, 'treasure_fleet', 2); return [good('Potosí', 'New World income +6 ducats a year. Two more Treasure Fleets join your deck.', 'coin')]; } }],
  },
  {
    id: 'price_revolution', history: true, title: 'The Price Revolution', art: 'coin', window: [1560, 1600], chance: 0.2,
    cond: s => !!s.flags.new_world,
    text: () => 'So much silver floods in that prices soar. Your treasury is richer, yet everything costs more.',
    options: [{ label: 'Borrow from the Genoese', run: s => { player(s).gold += 50; addToDeck(s, 'debt', 2); return [neutral('Bankers\' gold', '+50 ducats now, but two Crown Debt cards join your deck.', 'chain')]; } },
      { label: 'Cut spending', run: s => { stab(s, -1); return [neutral('Austerity', 'Stability −1.')]; } }],
  },
  {
    id: 'lepanto', history: true, title: 'The Holy League at Sea', art: 'anchor', window: [1565, 1576], chance: 0.3,
    cond: s => provsOf(s, P(s)).some(p => MED_COAST.includes(p.id)),
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
      const coast = provsOf(s, P(s)).filter(p => MED_COAST.includes(p.id));
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
      { label: 'Let the market decide', run: s => { addToHand(s, 'unrest'); return [bad('Hunger', 'A Peasant Unrest card is added to your hand.', 'chain')]; } },
    ],
  },
  {
    id: 'court_visitor', title: 'A Talent at Court', art: 'crown', chance: 0.07, repeat: 4,
    text: () => 'Three promising people seek a place at your court. You may take one, at no cost.',
    options: [{ label: 'Meet them', can: s => s.characters.length >= 8 ? 'Your court is crowded' : null, run: s => { push(s, { kind: 'draft', draft: 'court', options: courtOptions(s, 1) }); return [neutral('Audience', 'Choose one of them.', 'crown')]; } },
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
    cond: s => player(s).stability <= -2,
    setup: s => { const ps = provsOf(s, P(s)).filter(p => p.id !== player(s).capital); return ps.length ? { prov: pick(s, ps).id } : null; },
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
          player(s).gold = Math.max(0, player(s).gold - 30); prov.unrest = 5;
          return [bad('No one to stop them', 'The rebels loot the treasury (−30 ducats).', 'torch')];
        }
        push(s, { kind: 'battle', battle: createBattle(s, att, def, prov.id, 'rebels') });
        return [neutral('The army marches', 'Your troops move against the rebels.', 'sword')];
      } },
      { label: 'Grant concessions (−40 ducats)', can: s => player(s).gold < 40 ? 'Needs 40 ducats' : null, run: s => { player(s).gold -= 40; stab(s, 1); return [neutral('Peace bought', 'Stability +1.', 'scroll')]; } },
    ],
  },

  // ---------- prompted by the AI ----------
  {
    id: 'peace_offer', title: s => 'Peace Offer', art: 'dove', chance: 0,
    text: (s, v) => `${nationName(s, String(v.nation))} sends envoys asking for peace on equal terms.`,
    options: [
      { label: 'Accept peace', run: (s, v) => { const n = String(v.nation); if (atWar(s, P(s), n)) makePeace(s, P(s), n); return [good('Peace', `The war with ${nationName(s, n)} ends. Ten years of truce.`, 'dove')]; } },
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
  return EVENTS.filter(e => e.history && e.window && !s.firedEvents.includes(e.id) && e.window[1] >= s.year && (!e.cond || e.cond(s)))
    .map(e => ({ id: e.id, title: typeof e.title === 'string' ? e.title : 'Unknown', window: e.window! }))
    .sort((a, b) => a.window[0] - b.window[0]).slice(0, 4);
}

export function eventTitle(s: GameState, id: string, v: Vars) {
  const e = EVENT[id];
  return typeof e.title === 'string' ? e.title : e.title(s, v);
}

void transferProvince; void alliesOf; void enemiesOf; void getGeo;
