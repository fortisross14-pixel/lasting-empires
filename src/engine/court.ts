// The court: what the people around the crown feel and want, the events that come of it, and how a reign is summed up.
// A person has a loyalty (0..100), one wish and, sometimes, a rival. Loyalty moves with work, victories and the
// choices of the court events below; a disloyal servant may take a bribe, skim the accounts, desert or simply leave.
import type { GameState, Character, Wish, Nation } from '../types';
import { player, provsOf, rand, pick, clamp, log, push, nationName, getRel, addRel, enemiesOf, borders, promoteRarity, roleName } from './core';
import { TRAITS } from '../data/characters';
import { addCard } from './cards';
import { addChurchRel, churchRel } from './culture';
import { good, bad, neutral, stab, P, scaled, needs, pay, later, type EventDef, type Vars } from './eventkit';

// ---------- loyalty and wishes ----------
const hash = (t: string) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const WISH_ORDER: Wish[] = ['title', 'gold', 'glory', 'faith', 'family', 'rest'];
export const WISHES: Record<Wish, { name: string; text: string }> = {
  title: { name: 'A title', text: 'wants a title and a seat among the great' },
  gold: { name: 'Gold', text: 'wants to be paid what they are worth' },
  glory: { name: 'Glory', text: 'wants a name that outlives them' },
  faith: { name: 'The faith', text: 'wants the crown to serve the faith' },
  family: { name: 'Family', text: 'wants a good match and a house of their own' },
  rest: { name: 'Rest', text: 'wants an honourable end to their service' },
};
/** A person's loyalty and wish. Until something changes them they follow from who the person is (no dice), so
 *  old saves and new games agree and the world's other rolls fall as before. */
export const loyaltyOf = (c: Character) => c.loyalty ?? 50 + (hash(c.name + c.uid) % 21);
export const wishOf = (c: Character): Wish => c.wish ?? WISH_ORDER[hash(c.uid + c.name) % WISH_ORDER.length];
export function addLoyalty(c: Character, d: number) { c.loyalty = clamp(Math.round(loyaltyOf(c) + d), 0, 100); }
/** Devoted at 80, loyal at 60, wavering at 35, disloyal below. */
export const LOYALTY_LEVELS: [number, string][] = [[80, 'Devoted'], [60, 'Loyal'], [35, 'Wavering'], [0, 'Disloyal']];
export const loyaltyWord = (c: Character) => LOYALTY_LEVELS.find(([min]) => loyaltyOf(c) >= min)![1];
/** Below this, a servant listens to other offers; below LEAVES, they may simply go. */
export const DISLOYAL = 35, LEAVES = 20;

const court = (s: GameState) => s.characters.filter(c => !c.ruler);
const freeOf = (s: GameState, roles?: string[]) => court(s).filter(c => c.mission == null && (!roles || roles.includes(c.role)));
const who = (s: GameState, v: Vars, key = 'c') => s.characters.find(c => c.uid === Number(v[key]));
const first = (c: Character) => c.name.split(' ')[0];
const leave = (s: GameState, c: Character) => { s.characters = s.characters.filter(x => x.uid !== c.uid); for (const x of s.characters) { if (x.rival === c.uid) delete x.rival; if (x.friend === c.uid) delete x.friend; } };
/** Grant what was hoped for: more loyalty when it is the very thing they wished. Returns a line to add. */
function favour(c: Character, kind: Wish, plain: number): string {
  const wished = wishOf(c) === kind;
  addLoyalty(c, wished ? plain + 15 : plain);
  if (wished) c.wish = 'rest';
  return wished ? ` It is what ${first(c)} wanted most.` : '';
}

/** Once a year: loyalty drifts with work and with the state of the realm; the deeply disloyal may go. */
export function yearlyCourt(s: GameState) {
  const stabNow = player(s).stability;
  for (const c of [...court(s)]) {
    let d = c.mission != null ? 1 : loyaltyOf(c) > 45 ? -2 : 0; // people want work, but idleness alone does not make a traitor
    if (stabNow <= -2) d -= 2; else if (stabNow >= 2) d += 1;
    if (c.rival != null) { const r = s.characters.find(x => x.uid === c.rival); if (r && loyaltyOf(r) > loyaltyOf(c) + 20) d -= 1; }
    if (d) addLoyalty(c, d);
    if (loyaltyOf(c) < LEAVES && c.mission == null && rand(s) < 0.15) {
      leave(s, c);
      push(s, { kind: 'reveal', title: `${c.name} leaves your service`, items: [bad('An empty seat', `Your ${roleName[c.role].toLowerCase()} felt ill used for too long, and has gone to seek a better master.`, 'boot')] });
      log(s, `${c.name} leaves your court.`, 'bad');
    }
  }
}
/** A new monarch must win the court again. */
export function courtAtSuccession(s: GameState) { for (const c of court(s)) addLoyalty(c, -6); }

// ---------- the reign, summed up ----------
export function reignMark(s: GameState) {
  const b = s.stats.battles[s.player] ?? { won: 0, lost: 0 };
  return { provs: provsOf(s, s.player).length, won: b.won, lost: b.lost, works: (s.works ?? []).length, built: provsOf(s, s.player).reduce((a, p) => a + p.buildings.length, 0), techs: s.techs.length };
}
export interface Reign { years: number; provs: number; won: number; lost: number; works: number; built: number; techs: number; pious: boolean; happy: number; stability: number; epithet: string; }
/** By-names, each earned by a deed; the first that fits is taken, so the rarer deeds come first. */
export const EPITHETS: [string, (r: Reign) => boolean][] = [
  ['the Brief', r => r.years < 4],
  ['the Conqueror', r => r.provs >= 5],
  ['the Unlucky', r => r.provs <= -3 || r.lost >= r.won + 3],
  ['the Victorious', r => r.won >= 5 && r.won >= r.lost * 2],
  ['the Builder', r => r.built >= 6],
  ['the Wise', r => r.techs >= 4],
  ['the Magnificent', r => r.works >= 3],
  ['the Pious', r => r.pious],
  ['the Beloved', r => r.happy >= 70],
  ['the Steadfast', r => r.years >= 25 && r.stability >= 1],
  ['the Troubled', r => r.stability <= -2],
];
/** The reign that is ending, in numbers and one by-name ('' when no deed stands out). */
export function reignOf(s: GameState): Reign {
  const me = player(s), now = reignMark(s), st = me.ruler.start ?? now;
  const r: Reign = {
    years: Math.max(0, s.year - me.ruler.from), provs: now.provs - st.provs, won: now.won - st.won, lost: now.lost - st.lost,
    works: now.works - st.works, built: now.built - st.built, techs: now.techs - st.techs,
    pious: churchRel(s) >= 50, happy: s.happiness ?? 50, stability: me.stability, epithet: '',
  };
  r.epithet = EPITHETS.find(([, fits]) => fits(r))?.[0] ?? '';
  return r;
}

// ---------- court events ----------
/** At most one court event a year, and none in the first three years: the court must be known before it stirs. */
const quiet = (s: GameState) => (s.flags.court_last ?? 0) >= s.year || s.year < s.startYear + 3;
function courtEvent(def: EventDef & { find: (s: GameState) => Vars | null }): EventDef {
  const { find, ...rest } = def;
  return { ...rest, cond: s => !quiet(s) && (!def.cond || def.cond(s)), setup: s => { const v = find(s); if (v) s.flags.court_last = s.year; return v; } };
}
const neighbour = (s: GameState, f: (n: Nation) => boolean = () => true) => Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && borders(s, P(s), n.id) && f(n));

export const COURT_EVENTS: EventDef[] = [
  courtEvent({
    id: 'court_title', title: (s, v) => `${who(s, v)?.name ?? 'Your general'} Asks for a Title`, art: 'laurel', chance: 0.3, repeat: 6,
    find: s => { const c = freeOf(s, ['general', 'conqueror', 'admiral']).find(x => (x.wins ?? 0) >= 3 && !x.honours); return c ? { c: c.uid } : null; },
    text: (s, v) => { const c = who(s, v)!; return `${c.name} has won ${c.wins} battles under your banner. At supper, before the whole court, ${first(c)} asks what a victor may hope for: a county, perhaps, and a coat of arms.`; },
    options: [
      { label: 'Grant a title and lands', hint: 'costs ducats', can: s => needs(s, 30), run: (s, v) => { const c = who(s, v); if (!c) return [neutral('Too late', 'They are gone.')]; pay(s, 30); c.honours = (c.honours ?? 0) + 1; const x = favour(c, 'title', 20); return [good('A new count', `${c.name} kneels and rises a noble.${x} Loyalty is now ${loyaltyOf(c)}.`, 'laurel')]; } },
      { label: 'A purse of gold instead', can: s => needs(s, 15), run: (s, v) => { const c = who(s, v); if (!c) return [neutral('Too late', 'They are gone.')]; pay(s, 15); const x = favour(c, 'gold', 8); return [neutral('Gold, not rank', `${first(c)} bows and takes the purse.${x} Loyalty is now ${loyaltyOf(c)}.`, 'coin')]; } },
      { label: 'A soldier serves; he does not ask', run: (s, v) => { const c = who(s, v); if (!c) return [neutral('Too late', 'They are gone.')]; addLoyalty(c, -20); return [bad('A cold silence', `${c.name} says nothing more that night. Loyalty falls to ${loyaltyOf(c)}.`)]; } },
    ],
  }),
  courtEvent({
    id: 'court_bribe', title: 'A Purse from Abroad', art: 'coin', chance: 0.25, repeat: 8,
    find: s => { const c = court(s).filter(x => loyaltyOf(x) < 50).sort((a, b) => loyaltyOf(a) - loyaltyOf(b))[0]; const n = neighbour(s, x => getRel(s, P(s), x.id) < 10)[0]; return c && n ? { c: c.uid, nation: n.id } : null; },
    text: (s, v) => { const c = who(s, v)!; return `A clerk brings you a letter not meant for your eyes. ${c.name} has taken money from ${nationName(s, String(v.nation))}, and promised news of your councils in return.`; },
    options: [
      { label: 'Dismiss them at once', run: (s, v) => { const c = who(s, v); if (c && c.mission == null) leave(s, c); addRel(s, P(s), String(v.nation), -5); return [neutral('Gone by morning', `${c?.name ?? 'The traitor'} leaves the court${c && c.mission != null ? ' when the task is done' : ''}. Relations with ${nationName(s, String(v.nation))} −5.`, 'boot')]; } },
      { label: 'Outbid them', can: s => needs(s, 25), run: (s, v) => { const c = who(s, v); pay(s, 25); if (c) addLoyalty(c, 25); return [good('Bought back', `${c?.name ?? 'Your servant'} swears the foreign gold meant nothing. Loyalty is now ${c ? loyaltyOf(c) : 0}.`, 'coin')]; } },
      { label: 'Say nothing, and feed them lies', run: (s, v) => { const c = who(s, v); if (c) addLoyalty(c, -5); addRel(s, P(s), String(v.nation), 8); return [neutral('A useful leak', `${nationName(s, String(v.nation))} believes what it reads: relations +8. But a traitor still sits at your table.`, 'eye')]; } },
    ],
  }),
  courtEvent({
    id: 'court_feud', title: 'Two Who Cannot Share a Room', art: 'sword', chance: 0.22, repeat: 10,
    find: s => { const cs = freeOf(s).filter(c => c.rival == null); if (cs.length < 2) return null; const a = pick(s, cs), b = pick(s, cs.filter(x => x !== a)); return { a: a.uid, b: b.uid }; },
    text: (s, v) => { const a = who(s, v, 'a')!, b = who(s, v, 'b')!; return `${a.name} and ${b.name} came to blows in the gallery over a seat at your table. Each now demands that you send the other from court.`; },
    options: [
      { label: 'Take the first one\'s side', run: (s, v) => feud(s, v, 'a', 'b') },
      { label: 'Take the second one\'s side', run: (s, v) => feud(s, v, 'b', 'a') },
      { label: 'Make them dine together', hint: 'a feast', can: s => needs(s, 10), run: (s, v) => { const a = who(s, v, 'a'), b = who(s, v, 'b'); pay(s, 10); if (a && b) { a.rival = b.uid; b.rival = a.uid; addLoyalty(a, 3); addLoyalty(b, 3); } return [neutral('An uneasy peace', 'They eat in silence and bow to you. They are rivals still, and will watch which of them you favour.', 'cup')]; } },
    ],
  }),
  courtEvent({
    id: 'court_travel', title: 'A Scholar Asks Leave', art: 'book', chance: 0.2, repeat: 12,
    find: s => { const c = freeOf(s, ['researcher'])[0]; return c ? { c: c.uid } : null; },
    text: (s, v) => { const c = who(s, v)!; return `${c.name} lays a letter before you. The masters of Padua have asked ${first(c)} to read with them for two years. "I would come back knowing more than any man in your realm," the scholar says.`; },
    options: [
      { label: 'Go, with my blessing', run: (s, v) => { const c = who(s, v); if (!c) return [neutral('Too late', 'They are gone.')]; c.mission = -4; c.back = 8; addLoyalty(c, 10); later(s, 'court_travel_back', 2, 2, { c: c.uid, purse: 0 }); return [neutral('The road to Padua', `${c.name} is away for two years. Scholars who travel sometimes find other patrons.`, 'boot')]; } },
      { label: 'Go, with a purse and my seal', can: s => needs(s, 20), run: (s, v) => { const c = who(s, v); if (!c) return [neutral('Too late', 'They are gone.')]; pay(s, 20); c.mission = -4; c.back = 8; addLoyalty(c, 20); later(s, 'court_travel_back', 2, 2, { c: c.uid, purse: 1 }); return [good('A royal scholar abroad', `${c.name} travels as your envoy to the learned, and will surely return.`, 'boot')]; } },
      { label: 'I need you here', run: (s, v) => { const c = who(s, v); if (c) addLoyalty(c, -10); return [neutral('The letter is put away', `${c ? first(c) : 'The scholar'} obeys. Loyalty falls to ${c ? loyaltyOf(c) : 0}.`)]; } },
    ],
  }),
  {
    id: 'court_travel_back', title: 'News from Padua', art: 'book', chance: 0,
    text: (s, v) => { const c = who(s, v); return c ? `A rider comes ahead of ${c.name}, two years gone among the scholars of Italy.` : 'A letter arrives from Italy about the scholar who left your court.'; },
    options: [{
      label: 'Read the letter', run: (s, v) => {
        const c = who(s, v);
        if (!c) return [neutral('No word', 'The scholar is no longer of your court.')];
        if (!Number(v.purse) && rand(s) < 0.25) { leave(s, c); return [bad('A chair in Padua', `${c.name} writes with regret: the university has offered a chair for life. Your court has one scholar fewer.`, 'book')]; }
        delete c.mission; delete c.back;
        const rose = promoteRarity(s, c); if (!rose) c.skill = Math.min(6, c.skill + 1);
        addLoyalty(c, 10);
        return [good('Home, and wiser', `${c.name} returns ${rose ? `a ${c.rarity} scholar` : 'with new learning (skill +1)'} and a trunk of books.`, 'book')];
      },
    }],
  },
  courtEvent({
    id: 'court_skim', title: 'The Accounts Do Not Add Up', art: 'coin', chance: 0.22, repeat: 9,
    find: s => { const c = court(s).filter(x => x.role === 'merchant' || x.role === 'admin').sort((a, b) => loyaltyOf(a) - loyaltyOf(b))[0]; return c && loyaltyOf(c) < 62 ? { c: c.uid } : null; },
    text: (s, v) => { const c = who(s, v)!; return `Your auditors find two ledgers for the same tolls. One is ${c.name}'s, and it is the lighter by ${scaled(s, 25)} ducats. ${first(c)} does not deny it.`; },
    options: [
      { label: 'Take it back and send them away', run: (s, v) => { const c = who(s, v); player(s).gold += scaled(s, 15); if (c && c.mission == null) leave(s, c); return [neutral('A thief dismissed', `You recover ${scaled(s, 15)} ducats. ${c?.name ?? 'The thief'} is gone from court.`, 'coin')]; } },
      { label: 'A heavy fine, and they stay', run: (s, v) => { const c = who(s, v); player(s).gold += scaled(s, 25); if (c) addLoyalty(c, -15); return [neutral('Paid in full', `${scaled(s, 25)} ducats return to the treasury. ${c ? first(c) : 'Your servant'} keeps the office, and a grudge: loyalty ${c ? loyaltyOf(c) : 0}.`, 'coin')]; } },
      { label: 'Forgive it, once', run: (s, v) => { const c = who(s, v); if (c) addLoyalty(c, 20); player(s).prestige = Math.max(0, player(s).prestige - 2); return [good('A debt of another kind', `${c ? first(c) : 'Your servant'} weeps and swears to repay you in service. Loyalty rises to ${c ? loyaltyOf(c) : 0}; the court whispers (prestige −2).`, 'hands')]; } },
    ],
  }),
  courtEvent({
    id: 'court_deathbed', title: (s, v) => `${who(s, v)?.name ?? 'An Old Servant'} Is Dying`, art: 'skull', chance: 0.8, repeat: 3,
    find: s => { const c = court(s).find(x => x.dies <= s.year + 1 && x.mission == null && x.traits.length > 0); if (!c) return null; const heir = court(s).filter(x => x !== c && x.role === c.role && c.traits.some(t => !x.traits.includes(t))).sort((a, b) => b.skill - a.skill)[0]; return { c: c.uid, heir: heir?.uid ?? 0 }; },
    text: (s, v) => { const c = who(s, v)!; return `The physicians give ${c.name} until the first frost. Your old ${roleName[c.role].toLowerCase()} asks for someone to sit by the bed and write down what a lifetime has taught.`; },
    options: [
      { label: 'Send their ablest colleague', can: (s, v) => (who(s, v, 'heir') ? null : 'No colleague of the same calling at court'), run: (s, v) => { const c = who(s, v), h = who(s, v, 'heir'); if (!c || !h) return [neutral('Too late', 'The moment has passed.')]; const t = c.traits.find(x => !h.traits.includes(x))!; h.traits.push(t); addLoyalty(h, 5); return [good('What a lifetime taught', `${h.name} writes for three nights, and rises with the old master's gift: ${TRAITS[t]?.name ?? t}.`, 'quill')]; } },
      { label: 'Go yourself', run: (s, v) => { const c = who(s, v); for (const x of court(s)) addLoyalty(x, 4); player(s).prestige += 2; return [good('A king at the bedside', `${c ? first(c) : 'The old servant'} dies with your hand in theirs. The whole court is moved: loyalty +4 for all, prestige +2.`, 'crown')]; } },
      { label: 'Send a priest', run: () => [neutral('The last rites', 'It is done decently, and no more.', 'church')] },
    ],
  }),
  courtEvent({
    id: 'court_marriage', title: 'A Match for Your General', art: 'ring', chance: 0.2, repeat: 10,
    find: s => { const c = freeOf(s, ['general', 'conqueror', 'admiral', 'diplomat', 'admin']).find(x => !x.honours && s.year - x.born < 45); const n = neighbour(s)[0]; return c ? { c: c.uid, nation: n?.id ?? '' } : null; },
    text: (s, v) => { const c = who(s, v)!; return `${c.name} is ${s.year - c.born} and unmarried, and the great houses have noticed. Three fathers have written to you this month. ${first(c)} waits to hear what the crown thinks proper.`; },
    options: [
      { label: 'A daughter of the high nobility', hint: 'you give the dowry', can: s => needs(s, 25), run: (s, v) => { const c = who(s, v); if (!c) return [neutral('Too late', 'They are gone.')]; pay(s, 25); c.honours = (c.honours ?? 0) + 1; const x = favour(c, 'family', 15); player(s).prestige += 2; return [good('A wedding at court', `${c.name} marries into an old house.${x} Loyalty is now ${loyaltyOf(c)}; prestige +2.`, 'ring')]; } },
      { label: 'A bride from a neighbouring court', can: (_s, v) => (v.nation ? null : 'No neighbouring court'), run: (s, v) => { const c = who(s, v); if (!c) return [neutral('Too late', 'They are gone.')]; c.honours = (c.honours ?? 0) + 1; addLoyalty(c, 8); addRel(s, P(s), String(v.nation), 15); return [good('Two courts joined', `The match pleases ${nationName(s, String(v.nation))}: relations +15. ${first(c)} is content enough.`, 'hands')]; } },
      { label: 'Let them choose for themselves', run: (s, v) => { const c = who(s, v); if (c) { c.honours = (c.honours ?? 0) + 1; addLoyalty(c, 12); } return [good('A marriage of the heart', `${c ? first(c) : 'Your servant'} will not forget that you asked nothing. Loyalty rises to ${c ? loyaltyOf(c) : 0}.`, 'ring')]; } },
    ],
  }),
  courtEvent({
    id: 'court_artist', title: 'The Artist Asks to Be Free', art: 'quill', chance: 0.25, repeat: 10,
    find: s => { const c = court(s).find(x => x.role === 'artist'); return c ? { c: c.uid } : null; },
    text: (s, v) => { const c = who(s, v)!; return `${c.name} sets down the brush before your unfinished portrait. "Eleven saints and four dukes this year, Majesty. Give me one wall, and let me paint on it what I see."`; },
    options: [
      { label: 'One wall, and no questions', run: (s, v) => { const c = who(s, v); if (c) addLoyalty(c, 20); s.art = Math.min(100, s.art + 6); return [good('Something new', `What ${c ? first(c) : 'the artist'} paints is argued over for a season. Arts +6.`, 'quill')]; } },
      { label: 'Double the stipend', can: s => needs(s, 20), run: (s, v) => { const c = who(s, v); pay(s, 20); if (c) favour(c, 'gold', 12); s.art = Math.min(100, s.art + 3); return [good('Back to work', `The saints are finished on time. Arts +3; loyalty ${c ? loyaltyOf(c) : 0}.`, 'coin')]; } },
      { label: 'The portrait first', run: (s, v) => { const c = who(s, v); if (c) addLoyalty(c, -15); addCard(s, 'patronage'); return [neutral('A commission is a commission', `${c ? first(c) : 'The artist'} takes up the brush again, unsmiling. You gain a Commission a Work of Art card.`, 'quill')]; } },
    ],
  }),
  courtEvent({
    id: 'court_preacher', title: 'A Sermon Against the Court', art: 'church', chance: 0.18, repeat: 12,
    find: s => { const c = court(s).find(x => x.role === 'priest' && x.mission == null); return { c: c?.uid ?? 0 }; },
    text: () => 'A preacher has filled the square outside your palace three Sundays running. He names no names, but he speaks of silk, dice and women kept at the people\'s cost, and the crowd looks up at your windows.',
    options: [
      { label: 'Send your own churchman to answer him', can: (s, v) => (who(s, v) ? null : 'No churchman free at court'), run: (s, v) => { const c = who(s, v); if (!c) return [neutral('No answer', 'Nobody goes.')]; addLoyalty(c, 10); addChurchRel(s, 6); return [good('A better sermon', `${c.name} preaches on the duties of kings, and the crowd goes home thoughtful. Favour with your church +6.`, 'church')]; } },
      { label: 'Put away the dice for a season', run: s => { for (const x of court(s)) addLoyalty(x, -4); addChurchRel(s, 10); return [neutral('A sober Lent', 'The court grumbles (loyalty −4 for all). The clergy approve: favour +10.', 'church')]; } },
      { label: 'Have him moved on', run: s => { addChurchRel(s, -8); return [bad('An empty square', 'The guards are gentle, but everyone saw. Favour with your church −8.')]; } },
    ],
  }),
  courtEvent({
    id: 'court_favourite', title: 'The Favourite', art: 'crown', chance: 0.18, repeat: 15,
    find: s => { const c = court(s).filter(x => loyaltyOf(x) >= 60).sort((a, b) => b.skill - a.skill)[0]; return c && court(s).length >= 3 ? { c: c.uid } : null; },
    text: (s, v) => { const c = who(s, v)!; return `You find you ask ${c.name} before you ask anyone. The others have seen it. Some now bring their petitions to ${first(c)} first, and some have stopped speaking at council.`; },
    options: [
      { label: 'Raise them above the rest', run: (s, v) => { const c = who(s, v); if (!c) return [neutral('Too late', 'They are gone.')]; c.skill = Math.min(6, c.skill + 1); addLoyalty(c, 15); for (const x of court(s)) if (x !== c) addLoyalty(x, -8); return [neutral('A first minister', `${c.name} grows in office (skill +1) and in devotion. Everyone else: loyalty −8.`, 'crown')]; } },
      { label: 'Keep all at the same distance', run: (s, v) => { const c = who(s, v); if (c) addLoyalty(c, -10); for (const x of court(s)) if (x !== c) addLoyalty(x, 3); return [neutral('No favourites', `${c ? first(c) : 'Your favourite'} is hurt; the council breathes again (loyalty +3 for the others).`, 'scales')]; } },
    ],
  }),
  courtEvent({
    id: 'court_deserter', title: 'A General Changes Sides', art: 'sword', chance: 0.6, repeat: 8,
    cond: s => enemiesOf(s, P(s)).some(e => s.nations[e]?.alive && e !== s.revolution?.rebel),
    find: s => { const c = freeOf(s, ['general', 'conqueror']).filter(x => loyaltyOf(x) < DISLOYAL).sort((a, b) => loyaltyOf(a) - loyaltyOf(b))[0]; const e = enemiesOf(s, P(s)).find(x => s.nations[x]?.alive && x !== s.revolution?.rebel); return c && e ? { c: c.uid, nation: e } : null; },
    text: (s, v) => { const c = who(s, v)!; return `${c.name} did not come to council. The stables say ${first(c)} rode out before dawn with two servants, on the road to ${nationName(s, String(v.nation))}, where a command is said to be waiting.`; },
    options: [
      { label: 'Riders, and a better offer', can: s => needs(s, 35), run: (s, v) => { const c = who(s, v); pay(s, 35); if (c) c.loyalty = 50; return [good('Overtaken at the ford', `${c?.name ?? 'The general'} comes back with your gold and your pardon. Loyalty 50.`, 'coin')]; } },
      { label: 'Let the traitor go', run: (s, v) => { const c = who(s, v), n = s.nations[String(v.nation)]; if (c) { leave(s, c); if (n) n.general = { name: c.name, skill: c.skill, traits: c.traits.filter(t => TRAITS[t]?.role === 'general'), since: s.year }; } return [bad('You will meet again', `${c?.name ?? 'The general'} now commands the armies of ${n?.name ?? 'your enemy'}, and knows yours well.`, 'sword')]; } },
      { label: 'Riders, and a rope', run: (s, v) => { const c = who(s, v); if (c) leave(s, c); stab(s, -1); for (const x of court(s)) if (x.role === 'general') addLoyalty(x, -6); return [bad('An example', `${c?.name ?? 'The general'} does not reach the border. Stability −1; your other generals take note.`, 'skull')]; } },
    ],
  }),
  courtEvent({
    id: 'court_triumph', title: (s, v) => `${who(s, v)?.name ?? 'The Victor'} Comes Home`, art: 'laurel', chance: 0.35, repeat: 5,
    find: s => { const c = freeOf(s, ['general', 'conqueror', 'admiral']).find(x => (x.wins ?? 0) >= 1 && (s.flags['triumph_' + x.uid] ?? 0) < (x.wins ?? 0)); if (!c) return null; s.flags['triumph_' + c.uid] = c.wins ?? 0; return { c: c.uid }; },
    text: (s, v) => { const c = who(s, v)!; return `${c.name} is a day's ride from ${s.provinces[player(s).capital]?.name ?? 'the capital'} with the captured banners. The city fathers ask whether the gates should be hung with laurel, and who will pay for the wine.`; },
    options: [
      { label: 'A triumph through the streets', can: s => needs(s, 25), run: (s, v) => { const c = who(s, v); pay(s, 25); if (c) favour(c, 'glory', 12); player(s).prestige += 4; const cap = s.provinces[player(s).capital]; if (cap) cap.favor = Math.min(30, (cap.favor ?? 0) + 8); return [good('Laurel and wine', `The capital cheers for three days. Prestige +4; ${c ? first(c) : 'the victor'} will remember it (loyalty ${c ? loyaltyOf(c) : 0}).`, 'laurel')]; } },
      { label: 'A private word of thanks', run: (s, v) => { const c = who(s, v); if (c) addLoyalty(c, 3); return [neutral('Well done', 'A hand on the shoulder, and back to work.')]; } },
      { label: 'The victory was the crown\'s', run: (s, v) => { const c = who(s, v); if (c) addLoyalty(c, -12); player(s).prestige += 1; return [neutral('One sun in the sky', `The banners are hung in your chapel, not in ${c ? first(c) : 'the general'}'s hall. Prestige +1; loyalty ${c ? loyaltyOf(c) : 0}.`, 'crown')]; } },
    ],
  }),
  {
    id: 'captive_general', title: 'A Noble Prisoner', art: 'chain', chance: 0, repeat: 0,
    cond: () => true,
    text: (s, v) => `${String(v.name)}, who commanded the armies of ${nationName(s, String(v.nation))}, sits in your tower and eats at your table. His king has sent to ask your price.`,
    options: [
      { label: 'Ransom him', run: (s, v) => { const n = s.nations[String(v.nation)]; const g = Math.min(scaled(s, 40), Math.max(0, Math.round(n?.gold ?? 0))); if (n) { n.gold -= g; if (n.general) delete n.general.captive; } player(s).gold += g; return [good('Paid in gold', `${nationName(s, String(v.nation))} pays ${g} ducats. You will see ${String(v.name)} across a field again.`, 'coin')]; } },
      { label: 'Keep him', run: (s, v) => { player(s).prestige += 3; const n = s.nations[String(v.nation)]; if (n?.general) n.general.since = s.year - 20; return [neutral('A guest for years', `${String(v.name)} stays in the tower. Their armies are led by lesser men for five years. Prestige +3.`, 'chain')]; } },
      { label: 'Free him without price', run: (s, v) => { const n = s.nations[String(v.nation)]; if (n?.general) delete n.general.captive; addRel(s, P(s), String(v.nation), 15); player(s).prestige += 2; return [good('A gesture between princes', `${String(v.name)} rides home with his sword. Relations with ${nationName(s, String(v.nation))} +15, prestige +2.`, 'hands')]; } },
    ],
  },
];

function feud(s: GameState, v: Vars, win: string, lose: string) {
  const a = who(s, v, win), b = who(s, v, lose);
  if (!a || !b) return [neutral('It blows over', 'One of them has left court.')];
  a.rival = b.uid; b.rival = a.uid;
  addLoyalty(a, 15); addLoyalty(b, -20);
  return [neutral('You have chosen', `${a.name} thanks you warmly (loyalty ${loyaltyOf(a)}). ${b.name} bows very low and says nothing (loyalty ${loyaltyOf(b)}).`, 'scales')];
}
