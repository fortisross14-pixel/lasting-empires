// Event chains: stories in three steps, where the second and third depend on what was chosen before.
// A step schedules the next with later(...) from eventkit.ts, carrying `path` (the road taken) and whatever else the
// story needs (a province, a person). Steps after the first have chance 0: they come only when called.
// Writing rules are in docs/WRITING.md: speak to "you", 60 words or fewer, one concrete detail, no modern words.
import type { GameState, Province, Character } from '../types';
import { player, provsOf, rand, pick, courtCap, courtCount, genCharacter } from './core';
import { addCard } from './cards';
import { addChurchRel } from './culture';
import { addLoyalty, loyaltyOf } from './court';
import { getGeo } from './map';
import { good, bad, neutral, stab, P, scaled, needs, pay, later, type EventDef, type Vars } from './eventkit';

// ---------- small tools ----------
const prov = (s: GameState, v: Vars): Province | undefined => s.provinces[String(v.prov)];
const pname = (s: GameState, v: Vars) => prov(s, v)?.name ?? 'the provinces';
const favor = (s: GameState, v: Vars, d: number) => { const p = prov(s, v); if (p && p.owner === P(s)) p.favor = Math.max(-30, Math.min(30, (p.favor ?? 0) + d)) || undefined; };
const control = (s: GameState, v: Vars, d: number) => { const p = prov(s, v); if (p && p.owner === P(s)) p.control = Math.max(0, Math.min(100, p.control + d)); };
const develop = (s: GameState, v: Vars, d: number) => { const p = prov(s, v); if (p && p.owner === P(s)) p.dev = Math.max(1, Math.min(8, p.dev + d)); };
const capital = (s: GameState) => s.provinces[player(s).capital];
const awayFromCourt = (s: GameState) => provsOf(s, P(s)).filter(p => p.id !== player(s).capital);
const anyProv = (s: GameState): Vars | null => { const ps = awayFromCourt(s); return ps.length ? { prov: pick(s, ps).id } : null; };
const coastProv = (s: GameState): Vars | null => { const ps = provsOf(s, P(s)).filter(p => getGeo().coastal[p.id]); return ps.length ? { prov: pick(s, ps).id } : null; };
const townProv = (s: GameState): Vars | null => { const ps = provsOf(s, P(s)).filter(p => (p.settlement ?? 0) >= 2); return ps.length ? { prov: pick(s, ps).id } : null; };
const path = (v: Vars) => String(v.path ?? '');
const person = (s: GameState, v: Vars): Character | undefined => s.characters.find(c => c.uid === Number(v.c));
const gold = (s: GameState, n: number) => { player(s).gold += scaled(s, n); };
const prestige = (s: GameState, n: number) => { player(s).prestige = Math.max(0, player(s).prestige + n); };
const courtAll = (s: GameState, d: number) => { for (const c of s.characters) if (!c.ruler) addLoyalty(c, d); };
/** The next step of the same story, with the same province or person and the road now taken. */
const next = (s: GameState, v: Vars, id: string, min: number, max: number, road: string) => later(s, id, min, max, { ...v, path: road });
/** One line for each road into a step. */
const byPath = (v: Vars, lines: Record<string, string>) => lines[path(v)] ?? Object.values(lines)[0];

export const CHAIN_EVENTS: EventDef[] = [
  // ---------- 1. the printing house ----------
  {
    id: 'printer_1', title: 'A Printer Asks for a Licence', art: 'book', window: [1455, 1560], chance: 0.1,
    text: s => `A journeyman from Mainz has set up a press of metal letters behind the cloth market of ${capital(s)?.name ?? 'your capital'}. He can make two hundred Psalters in the time a scribe makes one, and asks only your licence to sell them.`,
    options: [
      { label: 'Let him print what sells', run: (s, v) => { next(s, v, 'printer_2', 3, 6, 'free'); return [good('The press turns', 'The first sheets hang drying over the street within a week.', 'book')]; } },
      { label: 'A licence, and a censor to read every sheet', run: (s, v) => { next(s, v, 'printer_2', 3, 6, 'censor'); addChurchRel(s, 3); return [neutral('Printed with permission', 'Each book will carry your seal and the bishop\'s. Favour with your church +3.', 'book')]; } },
      { label: 'No. Scribes have served well enough', run: s => { addChurchRel(s, 6); return [neutral('The press is sold for its metal', 'The scribes\' guild sends you a fine Book of Hours in thanks. Favour with your church +6.', 'church')]; } },
    ],
  },
  {
    id: 'printer_2', title: (_s, v) => 'What the Press Brought', art: 'book', chance: 0,
    text: (s, v) => byPath(v, {
      free: 'A single sheet is selling faster than bread in the market: a woodcut of the bishop as a fat goose, with eight lines of verse beneath. The bishop wants the printer in irons. The printer says he only sets what he is paid to set.',
      censor: 'Your censor has forty titles waiting on his desk and reads four a month. The printer says a rival in Venice has offered him a shop, paper on credit and no questions, and he will go by Easter unless something changes.',
    }),
    options: [
      { label: 'Leave the presses alone', run: (s, v) => { addChurchRel(s, -8); addCard(s, 'study_state'); next(s, v, 'printer_3', 4, 8, 'free'); return [neutral('The goose flies', 'The bishop is furious (favour −8). A printed treatise on government reaches your desk: one Treatise on Government card.', 'book')]; } },
      { label: 'Tighten the hand on them', hint: 'more censors', can: s => needs(s, 15), run: (s, v) => { pay(s, 15); addChurchRel(s, 5); next(s, v, 'printer_3', 4, 8, 'closed'); return [neutral('Seals on every sheet', 'Three more censors are sworn in. Favour with your church +5.', 'lock')]; } },
    ],
  },
  {
    id: 'printer_3', title: (_s, v) => (path(v) === 'free' ? 'A City of Books' : 'The Presses Fall Silent'), art: 'book', chance: 0,
    text: (s, v) => byPath(v, {
      free: `Twelve presses now work in ${capital(s)?.name ?? 'the capital'}, and a street is named for them. Scholars come for the cheap paper and stay to argue. A master printer asks you to put your name to a royal press.`,
      closed: 'The last printer has loaded his type on a mule and gone over the mountains to Basel, where no seal is asked for. His shop is a tavern now. Your scribes are busy again, and the university has stopped asking for books.',
    }),
    options: [
      { label: 'Found a royal press', can: (s, v) => (path(v) === 'free' ? needs(s, 30) : 'The printers are gone'), run: s => { pay(s, 30); prestige(s, 6); addCard(s, 'scholar'); addCard(s, 'study_economy'); s.art = Math.min(100, s.art + 5); return [good('By royal privilege', 'Your arms on the title page of every learned book. Prestige +6, arts +5, and two research cards.', 'book')]; } },
      { label: 'Tax the trade in books', can: (_s, v) => (path(v) === 'free' ? null : 'There is no trade to tax'), run: s => { gold(s, 25); return [neutral('A penny a ream', `The treasury gains ${scaled(s, 25)} ducats.`, 'coin')]; } },
      { label: 'Call the printers back, with a pardon', can: (s, v) => (path(v) === 'closed' ? needs(s, 20) : 'They never left'), run: s => { pay(s, 20); addCard(s, 'study_state'); addChurchRel(s, -4); return [good('The mule returns', 'One press reopens under your protection. One research card; favour with your church −4.', 'book')]; } },
      { label: 'Let it be', run: (s, v) => { if (path(v) === 'closed') { addChurchRel(s, 4); stab(s, 1); return [neutral('Quiet streets', 'No broadsheets, no quarrels. Stability +1; favour with your church +4.', 'church')]; } return [neutral('The street of printers', 'It needs nothing from you.', 'book')]; } },
    ],
  },
  // ---------- 2. the pretender ----------
  {
    id: 'pretender_1', title: 'A Boy in the Hills', art: 'crown', chance: 0.07,
    cond: s => s.year >= s.startYear + 8 && provsOf(s, P(s)).length >= 4,
    setup: anyProv,
    text: (s, v) => `In the hills above ${pname(s, v)} a shepherd's boy of eleven is being shown to pilgrims as the true son of the old king, hidden at birth. He has the royal chin, they say. Yesterday a village priest knelt to him.`,
    options: [
      { label: 'Send soldiers to fetch him', run: (s, v) => { control(s, v, 8); favor(s, v, -5); next(s, v, 'pretender_2', 1, 2, 'seized'); return [neutral('Taken at dawn', `The boy rides to your capital between two sergeants. ${pname(s, v)} mutters.`, 'chain')]; } },
      { label: 'Invite him to court as a guest', can: s => needs(s, 10), run: (s, v) => { pay(s, 10); next(s, v, 'pretender_2', 1, 2, 'court'); return [neutral('A place at table', 'He comes willingly, with his mother and a goat.', 'cup')]; } },
      { label: 'It is a tale for winter evenings', run: (s, v) => { next(s, v, 'pretender_2', 2, 4, 'grown'); return [neutral('Let them talk', 'You have a realm to govern.')]; } },
    ],
  },
  {
    id: 'pretender_2', title: (_s, v) => ({ seized: 'The Boy in the Tower', court: 'The Boy at Your Table', grown: 'The Banner in the Hills' }[path(v)] ?? 'The Pretender'), art: 'crown', chance: 0,
    text: (s, v) => byPath(v, {
      seized: 'The boy answers your judges without fear and gets the names of the old king\'s hounds right. A crowd waits at the tower gate each morning to see whether he is still alive.',
      court: 'The boy has learned to bow and to ride. Your pages like him; your heir does not. Last night a great lord was seen speaking with his mother for an hour in the chapel.',
      grown: `Three villages near ${pname(s, v)} now fly a banner with the boy's face on it, and a neighbouring court has sent him a sword and forty ducats. He is a youth of fifteen, and men follow him.`,
    }),
    options: [
      { label: 'A public trial', can: (_s, v) => (path(v) === 'grown' ? 'First he must be taken' : null), run: (s, v) => { next(s, v, 'pretender_3', 1, 1, 'trial'); return [neutral('Before the whole court', 'The judges are summoned for Michaelmas.', 'scales')]; } },
      { label: 'A quiet monastery, for life', can: (_s, v) => (path(v) === 'grown' ? 'First he must be taken' : null), run: (s, v) => { addChurchRel(s, 3); prestige(s, -1); next(s, v, 'pretender_3', 3, 6, 'cloister'); return [neutral('Brother Nobody', 'He is taken north by night. The monks ask no questions.', 'church')]; } },
      { label: 'Make him your page, and watch him', can: (_s, v) => (path(v) === 'court' ? null : 'He is not at your court'), run: (s, v) => { next(s, v, 'pretender_3', 5, 8, 'page'); return [neutral('The king\'s shadow', 'He carries your cup and learns your wars.', 'cup')]; } },
      { label: 'March into the hills', can: (_s, v) => (path(v) === 'grown' ? null : 'There is no rising'), run: (s, v) => { player(s).manpower = Math.max(0, player(s).manpower - 2); control(s, v, 15); favor(s, v, -10); next(s, v, 'pretender_3', 1, 1, 'broken'); return [bad('Fire in the villages', `It costs you two companies' worth of men. ${pname(s, v)} is quiet and sullen.`, 'sword')]; } },
      { label: 'A pardon and a pension, if he swears', can: (s, v) => (path(v) === 'grown' ? needs(s, 20) : 'There is no rising'), run: (s, v) => { pay(s, 20); favor(s, v, 6); next(s, v, 'pretender_3', 5, 8, 'page'); return [good('He kneels', 'The banner comes down. He takes your coin and a place in your household.', 'hands')]; } },
    ],
  },
  {
    id: 'pretender_3', title: (_s, v) => ({ trial: 'The Verdict', cloister: 'A Letter from the Monastery', page: 'A Knight of No Name', broken: 'The Hills Are Quiet' }[path(v)] ?? 'The End of the Tale'), art: 'crown', chance: 0,
    text: (s, v) => byPath(v, {
      trial: 'The court finds what everyone knew: he is a shepherd\'s son, coached by a clever priest. He stands in the dock in a borrowed doublet, waiting to hear what kings do to boys who were told they were princes.',
      cloister: 'The abbot writes that Brother Nobody has taken his vows, sings well, and illuminates manuscripts with a rare hand. He has asked, once, whether you remember him.',
      page: 'The shepherd\'s boy is a man now, the best lance in your household, and has never once spoken of his chin. He asks leave to serve you in the field.',
      broken: `The boy was not found among the dead. Some say he drowned in the river, some that he keeps sheep again under another name. In ${pname(s, v)} they do not say his name to strangers.`,
    }),
    options: [
      { label: 'The rope, as the law says', can: (_s, v) => (path(v) === 'trial' ? null : 'No verdict is asked'), run: (s, v) => { stab(s, 1); favor(s, v, -8); return [neutral('An end to pretenders', `Nobody will try that tale again. Stability +1; ${pname(s, v)} remembers.`, 'skull')]; } },
      { label: 'A whipping, and home to his sheep', can: (_s, v) => (path(v) === 'trial' ? null : 'No verdict is asked'), run: (s, v) => { prestige(s, 3); favor(s, v, 6); return [good('The king laughed', `The story is told in every tavern, and it is a kind one. Prestige +3; ${pname(s, v)} is grateful.`, 'mood')]; } },
      { label: 'Commission a psalter from him', can: (s, v) => (path(v) === 'cloister' ? needs(s, 10) : 'He is no monk'), run: s => { pay(s, 10); s.art = Math.min(100, s.art + 5); addChurchRel(s, 4); return [good('The Shepherd\'s Psalter', 'It is the finest book in your chapel. Arts +5; favour with your church +4.', 'quill')]; } },
      { label: 'Give him a command', can: (s, v) => (path(v) === 'page' ? (courtCount(s) >= courtCap(s) ? 'Your court is full' : null) : 'He is not yours to command'), run: s => { const c = genCharacter(s, 'general', player(s).culture, 2); c.traits = [...new Set([...c.traits, 'bold'])]; c.loyalty = 85; s.characters.push(c); return [good('A general from nowhere', `${c.name} joins your court: a ${c.rarity} general, bold and devoted.`, 'helm')]; } },
      { label: 'Say nothing, and let it rest', run: () => [neutral('The tale is over', 'It will be a ballad one day.')] },
    ],
  },
  // ---------- 3. the heretic preacher ----------
  {
    id: 'heretic_1', title: 'A Preacher at the Mill', art: 'church', chance: 0.07,
    cond: s => s.year >= s.startYear + 5,
    setup: anyProv,
    text: (s, v) => `A wool-carder in ${pname(s, v)} preaches by the mill each Sunday that God needs no priests and takes no tithes. He reads from a book in the common tongue. The clergy demand that you have him taken.`,
    options: [
      { label: 'Take him', run: (s, v) => { addChurchRel(s, 6); next(s, v, 'heretic_2', 1, 2, 'taken'); return [neutral('In the bishop\'s prison', 'He goes quietly, still talking. Favour with your church +6.', 'chain')]; } },
      { label: 'Let him preach', run: (s, v) => { addChurchRel(s, -6); next(s, v, 'heretic_2', 2, 4, 'free'); return [neutral('A sermon is not a crime', 'The clergy are scandalised. Favour with your church −6.', 'church')]; } },
      { label: 'Bring him to court to dispute with your scholars', run: (s, v) => { next(s, v, 'heretic_2', 1, 1, 'debate'); return [neutral('A safe conduct', 'He walks to the capital, preaching in every village on the way.', 'book')]; } },
    ],
  },
  {
    id: 'heretic_2', title: (_s, v) => ({ taken: 'Ashes in the Square', free: 'Barns Full of Listeners', debate: 'The Disputation' }[path(v)] ?? 'The Preacher'), art: 'church', chance: 0,
    text: (s, v) => byPath(v, {
      taken: `The wool-carder would not unsay a word, and the bishop burned him in the square of ${pname(s, v)}. Now his book is copied by hand in cellars, and the carders wear a scrap of grey wool where a badge would go.`,
      free: `The mill was too small; he preaches in barns now, and four hundred came last Sunday from as far as two days' walk. They pay no tithe. The priest of ${pname(s, v)} has an empty church and writes to you weekly.`,
      debate: 'For three days the wool-carder stood before your doctors of theology with one book against their two hundred, and was not beaten. Your scholars are troubled. Your confessor asks whether he will be allowed to leave.',
    }),
    options: [
      { label: 'Root it out', run: (s, v) => { control(s, v, 8); favor(s, v, -10); addChurchRel(s, 5); next(s, v, 'heretic_3', 4, 8, 'hard'); return [bad('Doors broken at night', `The cellars of ${pname(s, v)} are searched. Favour with your church +5.`, 'torch')]; } },
      { label: 'Leave them in peace', run: (s, v) => { addChurchRel(s, -6); favor(s, v, 5); next(s, v, 'heretic_3', 4, 8, 'soft'); return [neutral('A blind eye', 'The clergy call it weakness. Favour with your church −6.', 'eye')]; } },
      { label: 'Take the book for your library', can: (_s, v) => (path(v) === 'debate' ? null : 'There is no book before you'), run: (s, v) => { addCard(s, 'scholar'); addChurchRel(s, -3); next(s, v, 'heretic_3', 4, 8, 'soft'); return [good('A dangerous book, well bound', 'Your scholars read it behind closed doors. One Wandering Scholar card.', 'book')]; } },
    ],
  },
  {
    id: 'heretic_3', title: (_s, v) => (path(v) === 'soft' ? 'The Quiet People' : 'The Empty Looms'), art: 'church', chance: 0,
    text: (s, v) => byPath(v, {
      soft: `The grey-wool people of ${pname(s, v)} have built no church and started no riot. They work six days, read on the seventh, and their cloth is the best in the market. They ask for a charter to live by their own rule.`,
      hard: `Sixty families left ${pname(s, v)} in one spring, with their looms on carts, for a city across the border that asked nothing about their prayers. The fulling mills stand idle and the rents are unpaid.`,
    }),
    options: [
      { label: 'Grant the charter', can: (_s, v) => (path(v) === 'soft' ? null : 'They are gone'), run: (s, v) => { develop(s, v, 1); addChurchRel(s, -5); addCard(s, 'tolerance'); return [good('By their own rule', `${pname(s, v)} prospers: development +1, and an Edict of Tolerance card. Favour with your church −5.`, 'scroll')]; } },
      { label: 'A double tax for their peace', can: (_s, v) => (path(v) === 'soft' ? null : 'They are gone'), run: (s, v) => { gold(s, 25); favor(s, v, -5); return [neutral('They pay, and say nothing', `${scaled(s, 25)} ducats.`, 'coin')]; } },
      { label: 'Sell what they left behind', can: (_s, v) => (path(v) === 'hard' ? null : 'They have left nothing'), run: (s, v) => { gold(s, 20); develop(s, v, -1); return [neutral('Sixty empty houses', `${scaled(s, 20)} ducats. ${pname(s, v)} is poorer: development −1.`, 'coin')]; } },
      { label: 'Send word that they may return', can: (_s, v) => (path(v) === 'hard' ? null : 'They never left'), run: (s, v) => { addChurchRel(s, -5); favor(s, v, 6); return [good('Carts on the road home', 'Half of them come back. Favour with your church −5.', 'hands')]; } },
    ],
  },
  // ---------- 4. the great famine ----------
  {
    id: 'famine_1', title: 'The Rains Fail Twice', art: 'wheat', chance: 0.06, repeat: 60,
    cond: s => s.year >= s.startYear + 4,
    setup: anyProv,
    text: (s, v) => `The second harvest in a row has failed around ${pname(s, v)}. Bread costs three times what it did at Easter, and the first families are on the roads with their bedding on their backs.`,
    options: [
      { label: 'Open the royal granaries', can: s => needs(s, 20), run: (s, v) => { pay(s, 20); favor(s, v, 8); next(s, v, 'famine_2', 1, 1, 'fed'); return [good('Bread at the old price', 'Your seal is on every sack.', 'wheat')]; } },
      { label: 'Buy grain abroad', can: s => needs(s, 35), run: (s, v) => { pay(s, 35); favor(s, v, 5); next(s, v, 'famine_2', 1, 1, 'fed'); return [good('Ships are hired', 'Grain from the Baltic will come by midsummer.', 'ship')]; } },
      { label: 'The market will find its level', run: (s, v) => { next(s, v, 'famine_2', 1, 1, 'hungry'); return [neutral('No decree is made', 'The price rises again on Monday.')]; } },
    ],
  },
  {
    id: 'famine_2', title: (_s, v) => (path(v) === 'fed' ? 'The Grain Hoarders' : 'Bread Riots'), art: 'wheat', chance: 0,
    text: (s, v) => byPath(v, {
      fed: `The crown's grain reached ${pname(s, v)}, and half of it is already in merchants' cellars, waiting for the price to climb. The bakers' wives know which cellars.`,
      hungry: `The bakeries of ${pname(s, v)} were stormed at dawn. A grain merchant was hanged from his own hoist, and the crowd has not gone home.`,
    }),
    options: [
      { label: 'Fix the price of bread by decree', run: (s, v) => { favor(s, v, 8); for (const c of s.characters) if (c.role === 'merchant') addLoyalty(c, -8); next(s, v, 'famine_3', 1, 2, 'good'); return [good('A loaf for a penny', 'The cellars open. Your merchants call it robbery.', 'scales')]; } },
      { label: 'Let those who have grain sell it', can: (_s, v) => (path(v) === 'fed' ? null : 'There is no grain to sell'), run: (s, v) => { gold(s, 15); favor(s, v, -6); next(s, v, 'famine_3', 1, 2, 'mixed'); return [neutral('The toll on every cart', `${scaled(s, 15)} ducats in market dues. The poor eat acorns.`, 'coin')]; } },
      { label: 'Soldiers into the streets', can: (_s, v) => (path(v) === 'hungry' ? null : 'There is no riot'), run: (s, v) => { control(s, v, 10); favor(s, v, -12); next(s, v, 'famine_3', 1, 2, 'bad'); return [bad('Order', 'It is restored by noon.', 'sword')]; } },
      { label: 'Open the granaries now, late as it is', can: (s, v) => (path(v) === 'hungry' ? needs(s, 30) : 'They are open already'), run: (s, v) => { pay(s, 30); favor(s, v, 4); next(s, v, 'famine_3', 1, 2, 'mixed'); return [neutral('Too late for some', 'The crowd eats, and goes home.', 'wheat')]; } },
    ],
  },
  {
    id: 'famine_3', title: (_s, v) => (path(v) === 'good' ? 'The Harvest Returns' : 'The Villages After'), art: 'wheat', chance: 0,
    text: (s, v) => byPath(v, {
      good: `The wheat stands tall around ${pname(s, v)} this year. In the churches they have painted you into the fresco of the loaves and fishes, a little behind the apostles, holding a sack.`,
      mixed: `The famine is over. One house in six around ${pname(s, v)} stands empty, and the survivors have long memories about who ate and who did not.`,
      bad: `The famine is over. One house in four around ${pname(s, v)} stands empty; the fields nearest the town were sown, the rest went to thistle. Nobody there speaks of the spring of the soldiers.`,
    }),
    options: [
      { label: 'Build granaries against the next time', can: s => needs(s, 25), run: (s, v) => { pay(s, 25); addCard(s, 'irrigation'); favor(s, v, 5); return [good('Stone, not luck', 'One Irrigation card, and a province that trusts you.', 'tower')]; } },
      { label: 'Resettle the empty farms', can: s => needs(s, 15), run: (s, v) => { pay(s, 15); addCard(s, 'settlers'); if (path(v) === 'bad') develop(s, v, -1); return [neutral('New names on old doors', 'One Settlers card.', 'wheat')]; } },
      { label: 'Give thanks, and go on', run: (s, v) => { if (path(v) === 'good') { stab(s, 1); prestige(s, 3); return [good('Deo gratias', 'Stability +1, prestige +3.', 'church')]; } if (path(v) === 'bad') { develop(s, v, -1); player(s).manpower = Math.max(0, player(s).manpower - 1); return [bad('Thistle', `${pname(s, v)}: development −1. Fewer men to call on.`)]; } return [neutral('A hard year, survived', 'Nothing more is said.')]; } },
    ],
  },
  // ---------- 5. the bankers' loan ----------
  {
    id: 'loan_1', title: 'The Bankers Call on You', art: 'coin', chance: 0.09,
    cond: s => s.year >= s.startYear + 3 && player(s).gold < scaled(s, 80),
    text: s => `Two men in plain black from a banking house of Augsburg ask an audience. They have heard the crown is short of ready money, and can put ${scaled(s, 80)} ducats on your table this week, against the tolls of your richest road.`,
    options: [
      { label: 'Take all of it', run: (s, v) => { gold(s, 80); next(s, v, 'loan_2', 3, 5, 'large'); return [good('Counted out in silver', `${scaled(s, 80)} ducats. The first payment falls due in a few years.`, 'coin')]; } },
      { label: 'Take half', run: (s, v) => { gold(s, 40); next(s, v, 'loan_2', 3, 5, 'small'); return [good('A prudent sum', `${scaled(s, 40)} ducats.`, 'coin')]; } },
      { label: 'A king does not borrow from clerks', run: s => { prestige(s, 1); return [neutral('They bow and withdraw', 'They leave their address. Prestige +1.')]; } },
    ],
  },
  {
    id: 'loan_2', title: 'The First Payment Falls Due', art: 'coin', chance: 0,
    text: (s, v) => `The men in black are back, with a ledger. Principal and interest come to ${scaled(s, path(v) === 'large' ? 100 : 50)} ducats. They are very polite, and they have brought a notary.`,
    options: [
      { label: 'Pay in full', can: (s, v) => needs(s, path(v) === 'large' ? 100 : 50), run: (s, v) => { pay(s, path(v) === 'large' ? 100 : 50); next(s, v, 'loan_3', 2, 4, 'paid'); return [good('The ledger is closed', 'The notary writes "satisfied" and blots it.', 'scales')]; } },
      { label: 'Renew it, at their interest', run: (s, v) => { next(s, v, 'loan_3', 3, 5, path(v) === 'large' ? 'heavy' : 'light'); return [neutral('Another column in the ledger', 'They are in no hurry. That is what troubles your treasurer.', 'scroll')]; } },
      { label: 'Give them the tolls instead', run: (s, v) => { addCard(s, 'debt'); next(s, v, 'loan_3', 4, 6, 'tolls'); return [bad('Their men at your toll-gates', 'A Crown Debt card: the road pays them now, not you.', 'chain')]; } },
    ],
  },
  {
    id: 'loan_3', title: (_s, v) => ({ paid: 'Good Credit', tolls: 'Their Mark on Your Road' }[path(v)] ?? 'The Bankers at the Door'), art: 'coin', chance: 0,
    text: (s, v) => byPath(v, {
      paid: 'A letter from Augsburg, sealed in black. The house thanks you for your punctuality and begs to say that the crown\'s credit is now as good as a merchant\'s, which from them is the highest praise.',
      heavy: `The debt has grown to ${scaled(s, 150)} ducats. The men in black no longer come alone: a third rides with them, from a court that would dearly like to hold your notes.`,
      light: `The debt has grown to ${scaled(s, 75)} ducats. The men in black have stopped bowing quite so low.`,
      tolls: 'The bankers\' collectors have run your richest road for years, and run it well: the bridges are mended, and every cart pays. Your own subjects call it the Augsburg road.',
    }),
    options: [
      { label: 'Accept their thanks, and their terms', can: (_s, v) => (path(v) === 'paid' ? null : 'They offer no thanks'), run: s => { addCard(s, 'loan'); prestige(s, 2); return [good('A name that is money', 'One Genoese Loan card, to use when you choose. Prestige +2.', 'coin')]; } },
      { label: 'Pay it all, whatever it costs', can: (s, v) => (path(v) === 'heavy' ? needs(s, 150) : path(v) === 'light' ? needs(s, 75) : 'Nothing is owed'), run: (s, v) => { pay(s, path(v) === 'heavy' ? 150 : 75); stab(s, 1); return [good('Free of them', 'Stability +1.', 'scales')]; } },
      { label: 'Refuse to pay', can: (_s, v) => (path(v) === 'heavy' || path(v) === 'light' ? null : 'Nothing is owed'), run: s => { stab(s, -1); prestige(s, -8); addCard(s, 'debt'); return [bad('The crown defaults', 'No banker in Europe will lend to you for a generation. Stability −1, prestige −8, and a Crown Debt card.', 'chain')]; } },
      { label: 'Buy the tolls back', can: (s, v) => (path(v) === 'tolls' ? needs(s, 60) : 'The tolls are yours'), run: s => { pay(s, 60); const d = s.hand.find(h => h.card === 'debt'); if (d) s.hand = s.hand.filter(h => h !== d); prestige(s, 2); return [good('Your road again', 'One Crown Debt card is cleared. Prestige +2.', 'coin')]; } },
      { label: 'Leave things as they are', run: () => [neutral('The ledger stays open', 'Bankers are patient.')] },
    ],
  },
  // ---------- 6. the royal favourite (step one is court_favourite in court.ts) ----------
  {
    id: 'favourite_2', title: (s, v) => `${person(s, v)?.name ?? 'The Favourite'}'s New House`, art: 'crown', chance: 0,
    cond: () => true,
    text: (s, v) => { const c = person(s, v); return c ? `${c.name} has built a house across the square from your palace, with more windows than yours. Offices in your gift are sold at its back door, and petitioners wait there before they wait on you.` : 'The house your old favourite began stands half built across the square, a lesson in stone.'; },
    options: [
      { label: 'Take back the seals', can: (s, v) => (person(s, v) ? null : 'The favourite is gone'), run: (s, v) => { const c = person(s, v)!; addLoyalty(c, -25); for (const x of s.characters) if (!x.ruler && x !== c) addLoyalty(x, 6); next(s, v, 'favourite_3', 1, 3, 'curbed'); return [neutral('The back door is closed', `${c.name} hands over the seals without a word (loyalty ${loyaltyOf(c)}). The council is relieved.`, 'lock')]; } },
      { label: 'Share in the profits', can: (s, v) => (person(s, v) ? null : 'The favourite is gone'), run: (s, v) => { gold(s, 30); prestige(s, -3); next(s, v, 'favourite_3', 2, 4, 'rotten'); return [neutral('A third for the crown', `${scaled(s, 30)} ducats. Everyone knows where it came from: prestige −3.`, 'coin')]; } },
      { label: 'Look the other way', run: (s, v) => { if (person(s, v)) next(s, v, 'favourite_3', 2, 4, 'rotten'); return [neutral('A house is only a house', 'So you tell the council.')]; } },
    ],
  },
  {
    id: 'favourite_3', title: (_s, v) => (path(v) === 'curbed' ? 'The Favourite Asks to Retire' : 'The Lords\' Petition'), art: 'crown', chance: 0,
    cond: () => true,
    text: (s, v) => { const c = person(s, v); const n = c?.name ?? 'your favourite'; return byPath(v, {
      curbed: `${n} comes to you in a plain coat, lays a ring on the table and asks leave to go home to the country. "I served you well, and then I served myself. Let me go before I do worse."`,
      rotten: `Eleven great lords have put their seals to one parchment. Either ${n} leaves your court before the feast of St John, or they do, with their men.`,
    }); },
    options: [
      { label: 'Let them go with honour', can: (s, v) => (person(s, v) ? null : 'The favourite is gone'), run: (s, v) => { const c = person(s, v)!; s.characters = s.characters.filter(x => x !== c); prestige(s, 2); if (path(v) === 'rotten') stab(s, 1); return [good('A dignified end', `${c.name} leaves court with a pension and your thanks. Prestige +2${path(v) === 'rotten' ? ', stability +1' : ''}.`, 'hands')]; } },
      { label: 'The tower', can: (s, v) => (person(s, v) ? null : 'The favourite is gone'), run: (s, v) => { const c = person(s, v)!; s.characters = s.characters.filter(x => x !== c); stab(s, 1); gold(s, 20); courtAll(s, -3); return [bad('How favourites end', `The house across the square is yours now (${scaled(s, 20)} ducats). Stability +1; the court is afraid.`, 'chain')]; } },
      { label: 'Stand by them', can: (s, v) => (person(s, v) ? null : 'The favourite is gone'), run: (s, v) => { const c = person(s, v)!; c.loyalty = 100; c.skill = Math.min(6, c.skill + 1); if (path(v) === 'rotten') { stab(s, -1); prestige(s, -2); } return [neutral('Mine to raise, mine to keep', `${c.name} is yours for life (devoted, skill +1).${path(v) === 'rotten' ? ' The lords ride home: stability −1, prestige −2.' : ''}`, 'crown')]; } },
      { label: 'So be it', run: () => [neutral('It ends', 'The court has other things to talk about by autumn.')] },
    ],
  },
  // ---------- 7. the plague ship ----------
  {
    id: 'plague_1', title: 'A Ship with a Yellow Flag', art: 'ship', chance: 0.06, repeat: 50,
    cond: s => s.year >= s.startYear + 3,
    setup: coastProv,
    text: (s, v) => `A carrack from the Levant lies off ${pname(s, v)} flying the yellow flag. Eleven of her crew have been put over the side since Crete. Her hold is full of silk, and her owners are at your door.`,
    options: [
      { label: 'Forty days at anchor, nobody ashore', run: (s, v) => { next(s, v, 'plague_2', 1, 1, 'held'); return [neutral('The quarantine', 'A guard boat circles her day and night.', 'anchor')]; } },
      { label: 'Unload the silk', run: (s, v) => { gold(s, 40); next(s, v, 'plague_2', 1, 1, 'landed'); return [neutral('Silk on the quay', `The crown's share is ${scaled(s, 40)} ducats. The porters are paid double.`, 'coin')]; } },
      { label: 'Burn her where she lies', run: (s, v) => { prestige(s, -1); favor(s, v, 3); return [bad('A fire on the water', 'The crew are taken off to an island first. The owners will never forgive you. Prestige −1.', 'torch')]; } },
    ],
  },
  {
    id: 'plague_2', title: (_s, v) => (path(v) === 'held' ? 'The Thirtieth Day' : 'Sickness on the Quay'), art: 'ship', chance: 0,
    text: (s, v) => byPath(v, {
      held: `Thirty days, and no new dead aboard. The silk merchants of ${pname(s, v)} say the season is passing, the cloth is rotting, and ten days more or less cannot matter. They offer the crown a consideration.`,
      landed: `Three porters who carried the silk are dead in ${pname(s, v)}, with the black swellings under their arms. The physicians have left by the north gate.`,
    }),
    options: [
      { label: 'Forty days means forty', can: (_s, v) => (path(v) === 'held' ? null : 'It is too late for that'), run: (s, v) => { favor(s, v, -3); next(s, v, 'plague_3', 1, 2, 'spared'); return [good('The guard boat stays', 'The merchants curse you. Nobody dies.', 'anchor')]; } },
      { label: 'Take the consideration', can: (_s, v) => (path(v) === 'held' ? null : 'Nothing is offered'), run: (s, v) => { gold(s, 15); next(s, v, 'plague_3', 1, 2, rand(s) < 0.5 ? 'spared' : 'contained'); return [neutral('She comes alongside', `${scaled(s, 15)} ducats. Pray it was clean.`, 'coin')]; } },
      { label: 'Close the gates and mark the doors', can: (s, v) => (path(v) === 'landed' ? needs(s, 10) : 'There is no sickness'), run: (s, v) => { pay(s, 10); favor(s, v, -5); control(s, v, 5); next(s, v, 'plague_3', 1, 2, 'contained'); return [neutral('A city shut', 'Bread is passed over the wall on poles.', 'lock')]; } },
      { label: 'Processions and prayers', can: (_s, v) => (path(v) === 'landed' ? null : 'There is no sickness'), run: (s, v) => { addChurchRel(s, 5); next(s, v, 'plague_3', 1, 2, 'spread'); return [neutral('The relics are carried out', 'The whole city walks behind them, shoulder to shoulder. Favour with your church +5.', 'church')]; } },
    ],
  },
  {
    id: 'plague_3', title: (_s, v) => ({ spared: 'The Port That Was Spared', contained: 'The Dead Are Counted', spread: 'The Great Dying' }[path(v)] ?? 'After the Plague'), art: 'skull', chance: 0,
    text: (s, v) => byPath(v, {
      spared: `The plague took Genoa and Marseille this year and passed ${pname(s, v)} by. Envoys come to ask how it was done, and to copy the rules you wrote on one sheet in one night.`,
      contained: `The gates of ${pname(s, v)} are open again. One in ten is dead, but the sickness did not pass the walls, and the villages around never knew how near it came.`,
      spread: `The plague went out of ${pname(s, v)} with the pilgrims and along every road. The bells have stopped ringing for the dead because there are too few ringers.`,
    }),
    options: [
      { label: 'Build a house of quarantine on the island', can: (s, v) => (path(v) === 'spread' ? 'There is nobody to build it' : needs(s, 20)), run: (s, v) => { pay(s, 20); prestige(s, 4); if (path(v) === 'spared') develop(s, v, 1); return [good('The lazaretto', `Ships will trust your port. Prestige +4${path(v) === 'spared' ? '; development +1' : ''}.`, 'tower')]; } },
      { label: 'Forgive the taxes of the stricken', can: (s, v) => (path(v) === 'spared' ? 'Nobody was stricken' : needs(s, 15)), run: (s, v) => { pay(s, 15); favor(s, v, 10); if (path(v) === 'spread') { develop(s, v, -1); player(s).manpower = Math.max(0, player(s).manpower - 2); } return [neutral('A year without the collector', `${pname(s, v)} will remember it.${path(v) === 'spread' ? ' Development −1; fewer men to call on.' : ''}`, 'hands')]; } },
      { label: 'Go on', run: (s, v) => { if (path(v) === 'spared') { prestige(s, 2); return [good('A wise prince', 'Prestige +2.', 'laurel')]; } if (path(v) === 'contained') { develop(s, v, -1); return [bad('One in ten', `${pname(s, v)}: development −1.`, 'skull')]; } develop(s, v, -1); stab(s, -1); player(s).manpower = Math.max(0, player(s).manpower - 3); return [bad('The year of the dying', `${pname(s, v)}: development −1. Stability −1, and far fewer men to call on.`, 'skull')]; } },
    ],
  },
  // ---------- 8. the guild revolt ----------
  {
    id: 'guild_1', title: 'The Weavers Lay Down Their Shuttles', art: 'cloth', chance: 0.07,
    cond: s => s.year >= s.startYear + 4,
    setup: townProv,
    text: (s, v) => `No loom has moved in ${pname(s, v)} for nine days. The weavers want foreign cloth kept out of the market and two seats on the town council. The cloth merchants want the weavers back at work, or replaced.`,
    options: [
      { label: 'Keep foreign cloth out', run: (s, v) => { favor(s, v, 6); next(s, v, 'guild_2', 1, 3, 'ban'); return [neutral('The gates are watched for bales', 'The looms start again on Monday.', 'cloth')]; } },
      { label: 'Stand with the merchants', run: (s, v) => { gold(s, 10); favor(s, v, -6); next(s, v, 'guild_2', 1, 2, 'merchants'); return [neutral('New hands are hired', `The merchants send ${scaled(s, 10)} ducats in thanks.`, 'coin')]; } },
      { label: 'Call both sides before you', run: (s, v) => { next(s, v, 'guild_2', 1, 1, 'heard'); return [neutral('A hearing is set', 'They agree on that much.', 'scales')]; } },
    ],
  },
  {
    id: 'guild_2', title: (_s, v) => ({ ban: 'Cloth by Moonlight', merchants: 'Looms Burned in the Night', heard: 'A Charter Is Proposed' }[path(v)] ?? 'The Weavers'), art: 'cloth', chance: 0,
    text: (s, v) => byPath(v, {
      ban: `Cloth costs a third more in ${pname(s, v)} since the ban, and Flemish bales come over the hill tracks at night on mules with muffled hooves. The weavers want patrols. The townsfolk want cheaper coats.`,
      merchants: `Somebody burned eleven of the merchants' new looms in ${pname(s, v)} last night, and the hired hands have gone home. The merchants name four ringleaders and want them hanged.`,
      heard: `After two days before you, weavers and merchants have agreed on one thing: a guild with a charter, a mark for honest cloth, and a hall to meet in. Neither will pay for the hall.`,
    }),
    options: [
      { label: 'Patrol the hill tracks', can: (s, v) => (path(v) === 'ban' ? needs(s, 15) : 'There are no smugglers'), run: (s, v) => { pay(s, 15); next(s, v, 'guild_3', 3, 6, 'guild'); return [neutral('Mules are seized', 'The weavers drink your health.', 'eye')]; } },
      { label: 'Lift the ban quietly', can: (_s, v) => (path(v) === 'ban' ? null : 'There is no ban'), run: (s, v) => { favor(s, v, -4); next(s, v, 'guild_3', 3, 6, 'open'); return [neutral('The gates stop looking', 'Coats are cheap again.', 'cloth')]; } },
      { label: 'Hang the four', can: (_s, v) => (path(v) === 'merchants' ? null : 'Nobody is accused'), run: (s, v) => { control(s, v, 10); favor(s, v, -10); next(s, v, 'guild_3', 3, 6, 'open'); return [bad('Four ropes', 'The looms are rebuilt under guard.', 'skull')]; } },
      { label: 'Pay for the looms, and give the weavers their seats', can: (s, v) => (path(v) === 'merchants' ? needs(s, 20) : 'No looms were burned'), run: (s, v) => { pay(s, 20); favor(s, v, 8); next(s, v, 'guild_3', 3, 6, 'guild'); return [good('Both sides are astonished', 'Work begins again.', 'hands')]; } },
      { label: 'The crown will build the hall', can: (s, v) => (path(v) === 'heard' ? needs(s, 25) : 'No hall is asked for'), run: (s, v) => { pay(s, 25); favor(s, v, 8); next(s, v, 'guild_3', 3, 6, 'hall'); return [good('A foundation stone', 'You lay it yourself.', 'hammer')]; } },
      { label: 'Let them settle it themselves', run: (s, v) => { next(s, v, 'guild_3', 3, 6, 'open'); return [neutral('No more hearings', 'You have a realm to run.')]; } },
    ],
  },
  {
    id: 'guild_3', title: (_s, v) => (path(v) === 'open' ? 'An Open Market' : 'The Guild\'s Mark'), art: 'cloth', chance: 0,
    text: (s, v) => byPath(v, {
      guild: `Cloth from ${pname(s, v)} now carries a lead seal with a shuttle on it, and buyers ask for it by name as far as the great fairs. The guild begs you to accept its thanks.`,
      hall: `The weavers' hall of ${pname(s, v)} is finished: the finest roof in the town, with your arms over the door and a shuttle carved under them. The cloth sealed there sells as far as the great fairs.`,
      open: `Anyone may weave and anyone may sell in ${pname(s, v)}. Cloth is cheap, the merchants are rich, and the old weavers' street is full of journeymen who own nothing but their hands.`,
    }),
    options: [
      { label: 'Accept', run: (s, v) => { if (path(v) === 'open') { gold(s, 20); addCard(s, 'trade_fair'); return [neutral('A town of traders', `${scaled(s, 20)} ducats and a Trade Fair card.`, 'coin')]; } addCard(s, 'guild_charter'); favor(s, v, 5); if (path(v) === 'hall') develop(s, v, 1); return [good('Honest cloth', `A Guild Charter card${path(v) === 'hall' ? `, and ${pname(s, v)} grows: development +1` : ''}.`, 'cloth')]; } },
    ],
  },
  // ---------- 9. the border lord ----------
  {
    id: 'border_1', title: (s, v) => `The Warden of ${pname(s, v)}`, art: 'tower', chance: 0.07,
    cond: s => s.year >= s.startYear + 6 && provsOf(s, P(s)).length >= 6,
    setup: s => { const ps = awayFromCourt(s).filter(p => getGeo().adj[p.id].some(nb => s.provinces[nb].owner !== P(s))); return ps.length ? { prov: pick(s, ps).id } : null; },
    text: (s, v) => `Your warden in ${pname(s, v)} has raised a second tower without your leave, keeps sixty riders in his own colours, and dispenses justice from a chair that looks very like a throne. The border has never been quieter.`,
    options: [
      { label: 'Summon him to explain himself', run: (s, v) => { next(s, v, 'border_2', 1, 1, 'summoned'); return [neutral('A herald rides out', 'With your seal and a polite letter.', 'scroll')]; } },
      { label: 'Send a man to look at his books', can: s => needs(s, 10), run: (s, v) => { pay(s, 10); next(s, v, 'border_2', 1, 1, 'inspected'); return [neutral('An auditor, with an escort', 'He is told to count everything.', 'eye')]; } },
      { label: 'A quiet border is worth a tower', run: (s, v) => { const p = prov(s, v); if (p) p.fort = Math.min(5, p.fort + 1); next(s, v, 'border_2', 3, 5, 'ignored'); return [neutral('Let him build', `${pname(s, v)}: walls +1.`, 'tower')]; } },
    ],
  },
  {
    id: 'border_2', title: (_s, v) => ({ summoned: 'He Does Not Come', inspected: 'The Auditor\'s Report', ignored: 'A Prince in All but Name' }[path(v)] ?? 'The Warden'), art: 'tower', chance: 0,
    cond: () => true,
    text: (s, v) => byPath(v, {
      summoned: `The warden of ${pname(s, v)} regrets that the state of the border forbids him to leave it. He sends his eldest son in his place, with six falcons and a chest of silver cups.`,
      inspected: `Your auditor reports that the warden of ${pname(s, v)} keeps one toll in three for himself, and has done for years. He also reports that the roads are mended, the garrison paid, and no raider has crossed since.`,
      ignored: `The warden of ${pname(s, v)} now strikes his own copper tokens and has married his daughter to a lord across the border, without a word to you. His people call him "the old prince".`,
    }),
    options: [
      { label: 'Keep the son at court', can: (_s, v) => (path(v) === 'summoned' ? null : 'No son was sent'), run: (s, v) => { control(s, v, 10); next(s, v, 'border_3', 3, 6, 'tame'); return [good('A page, and a pledge', 'The boy is treated well, and his father knows where he sleeps.', 'cup')]; } },
      { label: 'Take the tolls back', can: (_s, v) => (path(v) === 'inspected' ? null : 'Nothing is known of his tolls'), run: (s, v) => { gold(s, 20); next(s, v, 'border_3', 3, 6, 'tame'); return [neutral('The third toll', `${scaled(s, 20)} ducats, and a crown clerk at every gate.`, 'coin')]; } },
      { label: 'Let him keep what he takes, for his oath', run: (s, v) => { control(s, v, -10); next(s, v, 'border_3', 3, 6, 'loyal'); return [neutral('He swears on the relics', 'Hereditary warden, under you and nobody else.', 'hands')]; } },
      { label: 'Pull down his tower', run: (s, v) => { player(s).manpower = Math.max(0, player(s).manpower - 1); control(s, v, 20); favor(s, v, -10); const p = prov(s, v); if (p) p.fort = Math.max(0, p.fort - 1); next(s, v, 'border_3', 2, 4, 'broken'); return [bad('The royal guns', `It takes a week. ${pname(s, v)}: walls −1.`, 'cannon')]; } },
    ],
  },
  {
    id: 'border_3', title: (_s, v) => ({ tame: 'The Warden Serves', loyal: 'A Wall of Men', broken: 'The Border After the Warden' }[path(v)] ?? 'The Border'), art: 'tower', chance: 0,
    cond: () => true,
    text: (s, v) => byPath(v, {
      tame: `The warden of ${pname(s, v)} sends his accounts each Michaelmas, exact to the penny, and his riders wear your colours on the left sleeve and his on the right.`,
      loyal: `Raiders crossed into ${pname(s, v)} this spring and met the old prince's riders at the ford. None went home. He sent you their banners, and no bill.`,
      broken: `Without the warden's riders the hill tracks of ${pname(s, v)} belong to whoever is boldest. Two villages were burned at harvest, and your garrison arrived to count the ashes.`,
    }),
    options: [
      { label: 'Good', can: (_s, v) => (path(v) === 'broken' ? 'It is not good' : null), run: (s, v) => { if (path(v) === 'loyal') { const p = prov(s, v); if (p) p.fort = Math.min(5, p.fort + 1); prestige(s, 2); addCard(s, 'fortify'); return [good('A border that guards itself', `${pname(s, v)}: walls +1. A Fortify card; prestige +2.`, 'shield')]; } control(s, v, 10); stab(s, 1); return [good('One law in the realm', `Stability +1; control rises in ${pname(s, v)}.`, 'scales')]; } },
      { label: 'Garrison the border properly', can: (s, v) => (path(v) === 'broken' ? needs(s, 20) : 'It is guarded'), run: (s, v) => { pay(s, 20); const p = prov(s, v); if (p) p.fort = Math.min(5, p.fort + 1); favor(s, v, 5); return [neutral('Crown soldiers in the hills', `${pname(s, v)}: walls +1.`, 'tower')]; } },
      { label: 'It will settle', can: (_s, v) => (path(v) === 'broken' ? null : 'There is nothing to settle'), run: (s, v) => { develop(s, v, -1); favor(s, v, -5); return [bad('Ashes', `${pname(s, v)}: development −1.`)]; } },
    ],
  },
  // ---------- 10. the lost heir ----------
  {
    id: 'heir_1', title: 'The Horse Came Back Alone', art: 'horse', chance: 0.05,
    cond: s => s.year >= s.startYear + 10,
    setup: anyProv,
    text: (s, v) => `Your heir rode out hawking near ${pname(s, v)} four days ago with two grooms. This morning the grey mare came back to the stable alone, lathered, with blood on the saddle that is not hers.`,
    options: [
      { label: 'Search every valley', can: s => needs(s, 15), run: (s, v) => { pay(s, 15); next(s, v, 'heir_2', 0, 0, 'search'); return [neutral('Every man who can ride', 'The court empties in an hour.', 'horse')]; } },
      { label: 'Cry a reward in every market', can: s => needs(s, 25), run: (s, v) => { pay(s, 25); next(s, v, 'heir_2', 0, 0, 'reward'); return [neutral('A purse on the church door', 'By nightfall the whole realm knows.', 'coin')]; } },
      { label: 'Tell nobody yet', run: (s, v) => { next(s, v, 'heir_2', 0, 0, 'secret'); return [neutral('The stable boy is sworn to silence', 'You send three men you trust.', 'lock')]; } },
    ],
  },
  {
    id: 'heir_2', title: 'A Letter Without a Seal', art: 'scroll', chance: 0,
    cond: () => true,
    text: (s, v) => `A letter is found pinned to the chapel door with a hunting knife. The prince lives. He is held in a tower in the hills beyond ${pname(s, v)} by a knight who lost his lands under your father, and who wants ${scaled(s, 60)} ducats and his name restored.${path(v) === 'secret' ? ' The court has heard, and asks why it heard from servants.' : ''}`,
    options: [
      { label: 'Pay, and restore his name', can: s => needs(s, 60), run: (s, v) => { pay(s, 60); if (path(v) === 'secret') stab(s, -1); next(s, v, 'heir_3', 0, 1, 'paid'); return [neutral('The silver is weighed out', 'A monk carries it up the hill on a mule.', 'coin')]; } },
      { label: 'Storm the tower', run: (s, v) => { player(s).manpower = Math.max(0, player(s).manpower - 2); if (path(v) === 'secret') stab(s, -1); next(s, v, 'heir_3', 0, 1, rand(s) < (path(v) === 'search' ? 0.75 : 0.55) ? 'freed' : 'lost'); return [neutral('Ladders at dusk', 'Your best men go up in silence.', 'sword')]; } },
    ],
  },
  {
    id: 'heir_3', title: (_s, v) => (path(v) === 'lost' ? 'A Realm Without an Heir' : 'The Prince Comes Home'), art: 'crown', chance: 0,
    cond: () => true,
    text: (s, v) => byPath(v, {
      paid: 'The prince walks into the hall thin, bearded and unhurt. He says the knight fed him at his own table and taught him chess, and that he would like the man\'s lands looked into, as it seems they were wrongly taken.',
      freed: 'Your men bring the prince down the ladder on their shoulders. He has a broken arm and a new way of looking at people. The knight died sword in hand at the head of his own stair.',
      lost: 'The tower was taken. The prince was found in the upper room, dead since morning, with a chessboard set out beside him. The knight had gone out by the postern. The bells of the capital toll all night.',
    }),
    options: [
      { label: 'Give thanks', can: (_s, v) => (path(v) === 'lost' ? 'There is nothing to give thanks for' : null), run: (s, v) => { stab(s, 1); courtAll(s, 3); if (path(v) === 'freed') prestige(s, 3); return [good('A feast of three days', `Stability +1; the court rejoices${path(v) === 'freed' ? '; prestige +3' : ''}.`, 'cup')]; } },
      { label: 'Look into the knight\'s lands, as the prince asks', can: (_s, v) => (path(v) === 'paid' ? null : 'Nobody asks it'), run: (s, v) => { stab(s, 1); prestige(s, 4); favor(s, v, 8); return [good('Justice, late', `The wrong is put right. Stability +1, prestige +4; ${pname(s, v)} hears of it.`, 'scales')]; } },
      { label: 'Mourn, and seek a marriage to mend the line', can: (_s, v) => (path(v) === 'lost' ? null : 'The line is safe'), run: s => { stab(s, -2); prestige(s, -4); addCard(s, 'marriage'); return [bad('Black hangings', 'Stability −2, prestige −4. A Royal Marriage card: the house must go on.', 'ring')]; } },
    ],
  },
];
