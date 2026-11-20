// More of the history deck (the half-centuries that were thin), what each principle of the realm brings with it,
// and the news that reaches the court from abroad. Writing rules: docs/WRITING.md.
import type { GameState, Nation } from '../types';
import { player, provsOf, rand, addRel, nationName, atWar, borders, log } from './core';
import { addCard } from './cards';
import { addChurchRel } from './culture';
import { addLoyalty } from './court';
import { getGeo } from './map';
import { provKnown } from './overseas';
import { good, bad, neutral, stab, P, scaled, needs, pay, later, type EventDef } from './eventkit';

const CHRISTIAN = ['catholic', 'orthodox', 'protestant', 'coptic'];
const regionOfCapital = (s: GameState) => getGeo().seeds.find(x => x.id === player(s).capital)?.region ?? 'europe';
const western = (s: GameState) => ['europe', 'north_africa', 'middle_east', 'atlantic', 'russia'].includes(regionOfCapital(s));
const eastAsian = (s: GameState) => regionOfCapital(s) === 'china';
const alive = (s: GameState, n: string) => !!s.nations[n]?.alive && n !== P(s);
const gold = (s: GameState, n: number) => { player(s).gold += scaled(s, n); };
const prestige = (s: GameState, n: number) => { player(s).prestige = Math.max(0, player(s).prestige + n); };
const coastal = (s: GameState) => provsOf(s, P(s)).some(p => getGeo().coastal[p.id]);
const town = (s: GameState) => provsOf(s, P(s)).filter(p => (p.settlement ?? 0) >= 2).sort((a, b) => a.dev - b.dev)[0];
const neighbours = (s: GameState): Nation[] => Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && borders(s, P(s), n.id));
const courtAll = (s: GameState, d: number, role?: string) => { for (const c of s.characters) if (!c.ruler && (!role || c.role === role)) addLoyalty(c, d); };

// ---------- the history deck, filled in ----------
export const HISTORY_EVENTS: EventDef[] = [
  {
    id: 'sack_of_rome', history: true, title: 'The Sack of Rome', art: 'torch', window: [1527, 1528], chance: 1,
    cond: s => western(s) && CHRISTIAN.includes(s.stateReligion) && P(s) !== 'papacy',
    text: () => 'The Emperor\'s unpaid soldiers have broken into Rome. For eight days they have stabled horses in St Peter\'s and sold cardinals back to their families. The Pope watches from the Castel Sant\'Angelo, and writes to every prince.',
    options: [
      { label: 'Send money for the Holy Father\'s ransom', can: s => needs(s, 30), run: s => { pay(s, 30); addChurchRel(s, 15); prestige(s, 3); return [good('A friend in the hour of need', 'Favour with your church +15, prestige +3.', 'church')]; } },
      { label: 'Buy what the soldiers are selling', can: s => needs(s, 15), run: s => { pay(s, 15); s.art = Math.min(100, s.art + 8); addChurchRel(s, -8); return [neutral('A wagon from Rome', 'Altarpieces, a cardinal\'s library and something said to be by Raphael. Arts +8; favour with your church −8.', 'quill')]; } },
      { label: 'Have a Mass said', run: () => [neutral('Prayers for Rome', 'It costs nothing.', 'church')] },
    ],
  },
  {
    id: 'dutch_revolt', history: true, title: 'The Beggars of the Sea', art: 'ship', window: [1566, 1574], chance: 0.5,
    cond: s => western(s) && P(s) !== 'castile' && P(s) !== 'netherlands',
    text: () => 'The cities of the Low Countries have risen against their Spanish king, over his taxes and his bishops. Their envoys are sober men in black with excellent credit. They ask who will lend to rebels.',
    options: [
      { label: 'Lend to them', can: s => needs(s, 30), run: s => { pay(s, 30); if (alive(s, 'castile')) addRel(s, P(s), 'castile', -15); if (alive(s, 'netherlands')) addRel(s, P(s), 'netherlands', 25); later(s, 'dutch_repaid', 8, 14); return [neutral('A loan to a republic not yet born', 'Madrid will hear of it. The Dutch write the debt in a very neat ledger.', 'coin')]; } },
      { label: 'Sell powder to both sides', run: s => { gold(s, 25); prestige(s, -1); return [neutral('Neutral, and paid', `${scaled(s, 25)} ducats. Nobody thinks better of you.`, 'coin')]; } },
      { label: 'Rebels are rebels', run: s => { if (alive(s, 'castile')) addRel(s, P(s), 'castile', 10); stab(s, 1); return [neutral('The envoys are shown out', 'Your own cities take note. Stability +1.', 'crown')]; } },
    ],
  },
  {
    id: 'dutch_repaid', title: 'A Neat Ledger', art: 'coin', chance: 0, cond: () => true,
    text: s => `A ship from Amsterdam ties up with a chest and a letter. The Dutch have won their cities, opened a bank, and remembered a debt. They repay it with interest: ${scaled(s, 55)} ducats, counted twice.`,
    options: [{ label: 'Count it a third time', run: s => { gold(s, 55); addCard(s, 'trade_fair'); return [good('Repaid in full', `${scaled(s, 55)} ducats, and their merchants come to your fairs: one Trade Fair card.`, 'coin')]; } }],
  },
  {
    id: 'st_bartholomew', history: true, title: 'The Bells of St Bartholomew', art: 'skull', window: [1572, 1573], chance: 1,
    cond: s => western(s) && P(s) !== 'france',
    text: () => 'On St Bartholomew\'s night the bells of Paris rang, and by morning three thousand Huguenots lay in the Seine. The roads out of France are full of weavers, printers and goldsmiths with what they could carry.',
    options: [
      { label: 'Open your gates to them', run: s => { const p = town(s); if (p) p.dev = Math.min(8, p.dev + 1); if (s.stateReligion === 'catholic') addChurchRel(s, -6); else addChurchRel(s, 4); return [good('Skilled hands', `${p ? `They settle in ${p.name}: development +1.` : 'They pass through, and remember you kindly.'}${s.stateReligion === 'catholic' ? ' Your bishops disapprove (favour −6).' : ''}`, 'cloth')]; } },
      { label: 'Only those who can pay', run: s => { gold(s, 20); return [neutral('A toll at the border', `${scaled(s, 20)} ducats.`, 'coin')]; } },
      { label: 'Close the border', run: s => { if (s.stateReligion === 'catholic') addChurchRel(s, 4); return [neutral('They walk on', 'To Geneva, to London, to anyone who will have them.')]; } },
    ],
  },
  {
    id: 'armada', history: true, title: 'A Hundred and Thirty Sail', art: 'ship', window: [1588, 1589], chance: 1,
    cond: s => western(s) && coastal(s) && P(s) !== 'castile' && P(s) !== 'england',
    text: () => 'The King of Spain\'s great fleet is in the Channel, bound for England with an army aboard. In every port from Lisbon to Hamburg men are betting on the wind.',
    options: [
      { label: 'Bet on the English, and the weather', can: s => needs(s, 20), run: s => { pay(s, 20); if (rand(s) < 0.75) { gold(s, 50); return [good('A Protestant wind', `The fleet is scattered round Scotland. Your wager pays ${scaled(s, 50)} ducats.`, 'coin')]; } return [bad('The landing succeeds', 'Against all the odds. Your stake is gone.')]; } },
      { label: 'Buy guns from the wrecks', can: s => needs(s, 15), run: s => { pay(s, 15); addCard(s, 'fortify'); return [good('Bronze from the sea', 'Fishermen bring them in for months. One Fortify card.', 'cannon')]; } },
      { label: 'Watch from the cliffs', run: () => [neutral('A sight to tell of', 'The lanterns pass all night.')] },
    ],
  },
  {
    id: 'imjin_war', history: true, anywhere: true, title: 'The Seven-Year War', art: 'sword', window: [1592, 1598], chance: 0.6,
    cond: s => eastAsian(s) && P(s) !== 'japan' && P(s) !== 'korea',
    text: () => 'The regent of Japan has landed a hundred and fifty thousand men at Busan and taken the Korean capital in three weeks. Only at sea are the Koreans winning: their admiral has ships with roofs of iron spikes.',
    options: [
      { label: 'Send rice and powder to Korea', can: s => needs(s, 25), run: s => { pay(s, 25); if (alive(s, 'korea')) addRel(s, P(s), 'korea', 25); prestige(s, 4); return [good('The elder brother\'s duty', 'Korea will not forget. Prestige +4.', 'hands')]; } },
      { label: 'Have the roofed ships drawn', can: s => needs(s, 10), run: s => { pay(s, 10); addCard(s, 'study_military'); return [good('The turtle ship', 'Your shipwrights study the drawings. One Military Treatise card.', 'ship')]; } },
      { label: 'Sell to both', run: s => { gold(s, 30); prestige(s, -2); return [neutral('Rice has no flag', `${scaled(s, 30)} ducats; prestige −2.`, 'coin')]; } },
    ],
  },
  {
    id: 'tulip_mania', history: true, title: 'The Price of a Flower', art: 'coin', window: [1636, 1637], chance: 1,
    cond: s => western(s),
    text: () => 'In Haarlem one tulip bulb, the Semper Augustus, has changed hands for the price of a house on the canal. Your merchants beg leave to buy before it doubles again.',
    options: [
      { label: 'Buy', can: s => needs(s, 30), run: s => { pay(s, 30); if (rand(s) < 0.35) { gold(s, 80); return [good('Sold at the top', `Your factor sells in January. ${scaled(s, 80)} ducats.`, 'coin')]; } return [bad('February', 'One morning no buyer comes to the tavern. You own some very fine flowers.')]; } },
      { label: 'Sell them the bulbs from the palace garden', run: s => { gold(s, 15); return [good('A sure trade', `${scaled(s, 15)} ducats for what the gardeners were going to thin out.`, 'coin')]; } },
      { label: 'Forbid it', run: s => { courtAll(s, -5, 'merchant'); return [neutral('No flowers', 'Your merchants sulk until February, and then thank you.')]; } },
    ],
  },
  {
    id: 'fronde', history: true, title: 'Barricades in Paris', art: 'torch', window: [1648, 1652], chance: 0.7,
    cond: s => western(s) && P(s) !== 'france',
    text: () => 'Paris has blocked its streets with wine barrels against the ministers of its boy king, and the great nobles have joined in, each for himself. Your own nobles are reading the French pamphlets with close attention.',
    options: [
      { label: 'Hear your estates before they ask', run: s => { stab(s, 1); s.taxBurden = Math.max(0, s.taxBurden - 5); s.np = Math.max(0, s.np - 1); return [good('A concession in time', 'Stability +1, and old tax grievances are forgotten. It costs you 1 nation point.', 'scales')]; } },
      { label: 'Send money to the barricades', can: s => needs(s, 25), run: s => { pay(s, 25); const f = s.nations.france; if (f?.alive) { addRel(s, P(s), 'france', -15); f.army.splice(0, Math.ceil(f.army.length * 0.2)); } return [neutral('France against itself', 'Its armies are busy at home for years. If Paris learns who paid, it will remember.', 'coin')]; } },
      { label: 'Forbid the pamphlets', run: s => { courtAll(s, -3); return [neutral('They are read anyway', 'In closets, and aloud.')]; } },
    ],
  },
  {
    id: 'royal_society', history: true, title: 'Gentlemen Who Weigh the Air', art: 'flask', window: [1660, 1670], chance: 0.5,
    cond: s => western(s),
    text: () => 'In London a society of gentlemen meets each Wednesday to weigh air, look at fleas through glass, and print what they find. One of them writes to ask whether your realm has natural philosophers who would correspond.',
    options: [
      { label: 'Found an academy of your own', can: s => needs(s, 40), run: s => { pay(s, 40); prestige(s, 5); addCard(s, 'study_economy'); addCard(s, 'breakthrough'); return [good('By royal charter', 'Prestige +5, and two research cards.', 'flask')]; } },
      { label: 'Let your scholars write to them', run: s => { addCard(s, 'scholar'); courtAll(s, 5, 'researcher'); return [good('Letters every month', 'One Wandering Scholar card.', 'quill')]; } },
      { label: 'Fleas', run: s => { addChurchRel(s, 3); return [neutral('The letter is not answered', 'Your confessor approves.')]; } },
    ],
  },
  {
    id: 'glorious_revolution', history: true, title: 'A King Drops His Seal in the River', art: 'crown', window: [1688, 1689], chance: 1,
    cond: s => western(s) && P(s) !== 'england',
    text: () => 'The English have changed kings without a battle. A Dutch prince landed, the old king dropped the Great Seal in the Thames and fled, and Parliament has written down, article by article, what a king may not do.',
    options: [
      { label: 'Receive the exiled king', run: s => { prestige(s, 3); if (alive(s, 'england')) addRel(s, P(s), 'england', -15); if (alive(s, 'france')) addRel(s, P(s), 'france', 5); return [neutral('A court in exile', 'Kings stand by kings. Prestige +3; London is not pleased.', 'crown')]; } },
      { label: 'Greet the new one', run: s => { if (alive(s, 'england')) addRel(s, P(s), 'england', 15); return [good('Your envoy is the first to bow', 'Relations with England +15.', 'hands')]; } },
      { label: 'Read their Bill of Rights closely', run: s => { addCard(s, 'study_state'); return [good('An instructive document', 'One Treatise on Government card.', 'scroll')]; } },
    ],
  },
];

// ---------- every principle answers back ----------
/** One event for each core card, within five years of adopting it (adoptCore in turn.ts schedules it). */
export const CORE_EVENTS: EventDef[] = [
  {
    id: 'core_land', title: 'The Captains\' Petition', art: 'pike', chance: 0, cond: s => (s.core ?? []).includes('land'),
    text: () => 'Since the crown declared for the land, your captains have grown bold. They ask for a standing camp outside the capital, where companies may drill the year round under the royal eye.',
    options: [
      { label: 'Build the camp', can: s => needs(s, 20), run: s => { pay(s, 20); addCard(s, 'drill'); courtAll(s, 5, 'general'); return [good('Drums every morning', 'One Drill Sergeant card; your generals are pleased.', 'pike')]; } },
      { label: 'Soldiers in winter quarters cost enough', run: s => { courtAll(s, -4, 'general'); return [neutral('The petition is filed', 'The captains salute and withdraw.')]; } },
    ],
  },
  {
    id: 'core_sea', title: 'The Shipwrights Come to Court', art: 'anchor', chance: 0, cond: s => (s.core ?? []).includes('sea'),
    text: () => 'Since the crown declared for the sea, the harbour towns speak of nothing else. Their shipwrights ask for a royal yard with a dry dock. Their captains ask, more quietly, for letters of marque.',
    options: [
      { label: 'A royal yard', can: s => needs(s, 25), run: s => { pay(s, 25); prestige(s, 3); addCard(s, 'trade_fair'); return [good('Keels on the slip', 'Prestige +3, and a Trade Fair card as merchants gather.', 'anchor')]; } },
      { label: 'Letters of marque', run: s => { gold(s, 20); const n = neighbours(s)[0]; if (n) addRel(s, P(s), n.id, -8); return [neutral('Licensed pirates', `${scaled(s, 20)} ducats in prize money.${n ? ` ${n.name} protests.` : ''}`, 'ship')]; } },
    ],
  },
  {
    id: 'core_expansion', title: 'The Neighbours Ask Your Intentions', art: 'sword', chance: 0, cond: s => (s.core ?? []).includes('expansion'),
    text: () => 'Since the crown spoke of wider borders, three envoys have arrived in one week. Each asks, in the politest language diplomacy has, which border you meant.',
    options: [
      { label: 'Reassure them all', run: s => { for (const n of neighbours(s)) addRel(s, P(s), n.id, 8); return [neutral('Warm words', 'Relations +8 with every neighbour. They do not quite believe you.', 'hands')]; } },
      { label: 'Let them wonder', run: s => { for (const n of neighbours(s)) addRel(s, P(s), n.id, -5); addCard(s, 'claim'); return [neutral('Silence is an answer', 'Relations −5 with every neighbour. Your lawyers find an old parchment: one Claim card.', 'scroll')]; } },
    ],
  },
  {
    id: 'core_consolidation', title: 'The Great Survey', art: 'scroll', chance: 0, cond: s => (s.core ?? []).includes('consolidation'),
    text: () => 'Since the crown turned to its own house, your treasurer proposes a thing never done: to send clerks to every village and write down each field, mill and hearth. The nobles call it an insult.',
    options: [
      { label: 'Count everything', can: s => needs(s, 20), run: s => { pay(s, 20); for (const p of provsOf(s, P(s))) p.control = Math.min(100, p.control + 5); addCard(s, 'census'); return [good('The book of the realm', 'Control +5 everywhere, and a Census card.', 'book')]; } },
      { label: 'Not against the nobles', run: s => { stab(s, 1); return [neutral('The clerks stay home', 'Stability +1.')]; } },
    ],
  },
  {
    id: 'core_open', title: 'The Clergy Object', art: 'church', chance: 0, cond: s => (s.core ?? []).includes('open'),
    text: () => 'Since the crown opened its doors to new learning, crates of foreign books arrive monthly. Your bishops have read some of them. They come in a body to ask that the crates be opened by a priest before a scholar.',
    options: [
      { label: 'Scholars first', run: s => { addChurchRel(s, -8); addCard(s, 'scholar'); return [neutral('The crates go to the university', 'Favour with your church −8. One Wandering Scholar card.', 'book')]; } },
      { label: 'A priest may look, and may not burn', run: s => { addChurchRel(s, 3); s.np = Math.max(0, s.np - 1); return [neutral('A compromise nobody loves', 'Favour +3; the delay costs you 1 nation point.', 'scales')]; } },
    ],
  },
  {
    id: 'core_traditional', title: 'The Young Men Leave', art: 'book', chance: 0, cond: s => (s.core ?? []).includes('traditional'),
    text: () => 'Since the crown declared for the old ways, the sons of your best families have begun to study abroad, in Padua and Leiden, where the new things are taught. Some do not come back.',
    options: [
      { label: 'Found a college where the old and new are both taught', can: s => needs(s, 25), run: s => { pay(s, 25); addCard(s, 'study_state'); addChurchRel(s, 3); return [good('A college with your name', 'One Treatise on Government card; favour with your church +3.', 'book')]; } },
      { label: 'Let them go', run: s => { prestige(s, -2); return [neutral('Empty benches', 'Prestige −2.')]; } },
    ],
  },
  {
    id: 'core_mercantile', title: 'The Merchants Ask for Convoys', art: 'coin', chance: 0, cond: s => (s.core ?? []).includes('mercantile'),
    text: () => 'Since the crown declared for trade, your merchants have sent more ships than ever, and lost more to pirates. They ask for royal escorts, and offer to pay half.',
    options: [
      { label: 'Escorts, at half the cost', can: s => needs(s, 20), run: s => { pay(s, 20); addCard(s, 'trade_route'); courtAll(s, 8, 'merchant'); return [good('The convoy sails', 'One Trade Treaty card; your merchants are devoted.', 'ship')]; } },
      { label: 'Let them arm their own ships', run: s => { gold(s, 10); prestige(s, -1); return [neutral('Merchants with cannon', `They pay ${scaled(s, 10)} ducats for the licence. It will end badly somewhere.`, 'cannon')]; } },
    ],
  },
  {
    id: 'core_agrarian', title: 'The Commons', art: 'wheat', chance: 0, cond: s => (s.core ?? []).includes('agrarian'),
    text: () => 'Since the crown declared for the land and those who work it, the great landlords have a proposal: let them hedge the common pastures for sheep. The rents would double. The villagers have a different view.',
    options: [
      { label: 'Let them hedge', run: s => { gold(s, 30); for (const p of provsOf(s, P(s))) p.favor = Math.max(-30, (p.favor ?? 0) - 3) || undefined; return [neutral('Sheep where there were cottages', `${scaled(s, 30)} ducats. The villages remember.`, 'coin')]; } },
      { label: 'The commons stay common', run: s => { stab(s, 1); courtAll(s, -3); return [good('The king\'s peace in the fields', 'Stability +1. The great men at court are displeased.', 'wheat')]; } },
    ],
  },
];

// ---------- news from abroad ----------
/** A turning point abroad reaches the court as a dispatch, one a year at most; the rest go only into the annals. */
export function dispatch(s: GameState, nation: string, text: string) {
  log(s, text, 'neutral');
  if ((s.flags.news_year ?? 0) >= s.year || nation === s.player || !s.nations[nation]?.alive || !provKnown(s, s.nations[nation].capital)) return;
  s.flags.news_year = s.year;
  later(s, 'news_abroad', 0, 0, { nation, text });
}
export const NEWS_EVENTS: EventDef[] = [
  {
    id: 'news_abroad', title: 'News from Abroad', art: 'scroll', chance: 0, repeat: 0, cond: () => true,
    text: (s, v) => `${String(v.text)} So writes your man at the court of ${nationName(s, String(v.nation))}, who asks whether you wish him to stay and learn more.`,
    options: [
      { label: 'Send an envoy to their court', hint: 'their armies are known to you for two years', can: (s, v) => (!s.nations[String(v.nation)]?.alive ? 'That realm is no more' : atWar(s, P(s), String(v.nation)) ? 'You are at war with them' : needs(s, 8)), run: (s, v) => { pay(s, 8); const n = s.nations[String(v.nation)]; addRel(s, P(s), n.id, 8); n.spiedUntil = Math.max(n.spiedUntil ?? 0, s.year + 2); return [good('Eyes at their court', `Relations with ${n.name} +8. For two years you will know where their armies stand.`, 'eye')]; } },
      { label: 'Note it in the annals', run: () => [neutral('Noted', 'The world turns.')] },
    ],
  },
];
