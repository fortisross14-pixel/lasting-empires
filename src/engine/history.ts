// Scripted history that happens no matter who plays: the siege of Constantinople in 1453, and the rise of
// the great conquerors of the wider world (renamed realms, fresh armies, wars on their historical foes).
import type { GameState } from '../types';
import { player, push, log, declareWar, atWar, addRel, uid, makePeace, rand, borders, inTruce, hasTreaty, provsOf } from './core';
import { provKnown } from './overseas';
import { makeSide, createBattle, toBattleUnits, transferProvince } from './battle';

const CITY = 'constantinople';
/** The Sultan's host for the siege: his standing army plus the great levy and Urban's guns. */
const HOST = ['levy', 'levy', 'levy', 'levy', 'levy', 'levy', 'levy', 'levy', 'crossbow', 'crossbow', 'crossbow', 'men_at_arms', 'men_at_arms', 'men_at_arms', 'men_at_arms', 'men_at_arms', 'jinetes', 'jinetes', 'bombard', 'bombard'];
const FRIENDS = ['venice', 'genoa', 'hungary', 'papacy', 'naples', 'aragon', 'hospitallers'];

/** A turning point for an AI realm: a new name, a stronger army, a war on its old enemy (if they share a border). */
interface Moment { id: string; year: number; who: string; name?: string; adj?: string; troops?: number; war?: string; text: string; if?: (s: GameState) => boolean }
const MOMENTS: Moment[] = [
  { id: 'russia', year: 1547, who: 'muscovy', name: 'Russia', adj: 'Russian', troops: 2, war: 'kazan', text: 'In Moscow, Ivan IV is crowned Tsar of all Russia.' },
  { id: 'selim', year: 1516, who: 'ottomans', troops: 4, war: 'mamluks', text: 'Sultan Selim the Grim turns his guns on the Mamluks of Egypt.' },
  { id: 'mohacs', year: 1526, who: 'ottomans', troops: 2, war: 'hungary', text: 'Süleyman the Magnificent leads his army up the Danube against Hungary.' },
  { id: 'mughals', year: 1526, who: 'timurids', name: 'Mughal Empire', adj: 'Mughal', troops: 4, war: 'delhi', text: 'Babur, a Timurid prince of Kabul, invades Hindustan with guns and matchlocks: the Mughal Empire is born.' },
  { id: 'later_jin', year: 1616, who: 'jurchens', name: 'Later Jin', adj: 'Manchu', troops: 3, text: 'Nurhaci unites the Jurchen tribes and proclaims the Later Jin khanate.' },
  { id: 'qing', year: 1644, who: 'jurchens', name: 'Qing Empire', adj: 'Qing', troops: 5, war: 'ming', text: 'Manchu banners ride through the Great Wall: the Qing dynasty claims the Mandate of Heaven.' },
  { id: 'sunni_ali', year: 1468, who: 'songhai', troops: 3, war: 'mali', text: 'Sunni Ali of Songhai rides on Timbuktu.' },
  { id: 'saadi', year: 1590, who: 'morocco', troops: 3, war: 'songhai', text: 'Moroccan musketeers cross the Sahara against Songhai.' },
  { id: 'pachacuti', year: 1462, who: 'inca', troops: 2, war: 'chimor', text: 'The armies of the Inca march down to the coast against Chimor.' },
  { id: 'triple_alliance', year: 1458, who: 'aztec', troops: 2, war: 'mixtec', text: 'Moctezuma I sends the Triple Alliance against the Mixtec kingdoms.' },
  { id: 'prussia', year: 1701, who: 'brandenburg', name: 'Prussia', adj: 'Prussian', troops: 2, text: 'The Elector of Brandenburg crowns himself King in Prussia.' },
  { id: 'gustavus', year: 1630, who: 'sweden', troops: 3, text: 'Gustavus Adolphus lands in Pomerania with the best army in Europe.' },
  { id: 'peter', year: 1700, who: 'muscovy', troops: 3, war: 'sweden', text: 'Tsar Peter goes to war with Sweden for the Baltic shore.' },
  { id: 'nader', year: 1738, who: 'safavids', troops: 3, war: 'mughals', text: 'Nader Shah of Persia marches on Delhi.' },
];

/** Once a quarter: the moments whose year has come (they lapse five years later, or if the realm is the player's). */
function worldMoments(s: GameState) {
  for (const m of MOMENTS) {
    if (s.year < m.year || s.year > m.year + 5 || s.flags['wh_' + m.id]) continue;
    const n = s.nations[m.who];
    if (!n?.alive || n.id === s.player || n.overlord || !provsOf(s, n.id).length || (m.if && !m.if(s))) continue;
    s.flags['wh_' + m.id] = 1;
    if (m.name && provsOf(s, n.id).length >= 3) { n.name = m.name; if (m.adj) n.adj = m.adj; }
    const type = s.year < 1470 ? 'men_at_arms' : s.year < 1552 ? 'pikemen' : s.year < 1685 ? 'musketeers' : 'line_infantry';
    for (let i = 0; i < (m.troops ?? 0); i++) n.army.push({ uid: uid(s), type, vet: 1, str: 100 });
    const foe = m.war && s.nations[m.war];
    if (foe && foe.alive && foe.id !== s.player && !atWar(s, n.id, foe.id) && !inTruce(s, n.id, foe.id) && !hasTreaty(s, n.id, foe.id, 'alliance') && borders(s, n.id, foe.id)) declareWar(s, n.id, foe.id);
    if (provKnown(s, n.capital)) log(s, m.text, 'neutral');
  }
}

export function scriptedHistory(s: GameState) {
  worldMoments(s);
  if (s.flags.siege_done || s.year < 1453 || (s.year === 1453 && (s.quarter ?? 0) < 1)) return;
  const ott = s.nations.ottomans, byz = s.nations.byzantium, city = s.provinces[CITY];
  if (!ott?.alive || !byz?.alive || !city || city.owner !== 'byzantium') { s.flags.siege_done = 1; return; }
  if (s.flags.siege_next && s.year < s.flags.siege_next) return;
  s.flags.siege_done = 1;
  if (!atWar(s, 'ottomans', 'byzantium')) declareWar(s, 'ottomans', 'byzantium');
  if (s.player === 'byzantium') return defendTheCity(s);
  if (s.player === 'ottomans') { push(s, { kind: 'event', eventId: 'siege_attack', vars: {} }); return; }
  // the world watches: the city almost always falls
  if (rand(s) < 0.94) cityFalls(s);
  else { s.flags.const_holds = 1; log(s, 'Against all odds, Constantinople holds.', 'good'); }
}

export function cityFalls(s: GameState) {
  transferProvince(s, CITY, 'ottomans');
  s.nations.ottomans.prestige += 30;
  s.flags.const_fell = 1;
  log(s, 'Constantinople falls to Sultan Mehmed II.', s.player === 'ottomans' ? 'good' : 'neutral');
}

function defendTheCity(s: GameState) {
  const city = s.provinces[CITY];
  const host = HOST.map(type => ({ uid: uid(s), type, vet: 1, str: 100 }));
  const att = makeSide('ottomans', toBattleUnits([...s.nations.ottomans.army.slice(0, 6), ...host]), { name: 'Sultan Mehmed II', skill: 5, traits: [] }, 0, false);
  const friends = FRIENDS.filter(f => s.nations[f]?.alive && s.treaties.some(t => t.kind === 'alliance' && ((t.a === f && t.b === s.player) || (t.b === f && t.a === s.player))));
  const aidN = friends.length + (s.flags.union_aid ? 2 : 0);
  const aid = Array.from({ length: aidN }, (_, i) => ({ uid: -700 - i, type: i % 2 ? 'crossbow' : 'men_at_arms', vet: 1, str: 100, start: 100 }));
  const home = s.troops.filter(t => t.mission == null && t.str > 0);
  const gen = s.characters.filter(c => c.role === 'general' && c.mission == null).sort((a, b) => b.skill - a.skill)[0];
  const def = makeSide(s.player, [...toBattleUnits(home), ...aid], gen ? { name: gen.name, skill: gen.skill, traits: gen.traits, uid: gen.uid } : null, city.fort + 2, true);
  const b = createBattle(s, att, def, CITY, 'defend');
  b.siege = true;
  push(s, { kind: 'reveal', title: 'The Siege of Constantinople', subtitle: 'Spring 1453', items: [
    { title: 'The Sultan is at the walls', text: `Mehmed II brings ${att.units.length} companies and Urban's great guns against the Theodosian Walls.`, tone: 'bad', kind: 'cannon' },
    { title: 'Your defenders', text: `${home.length} companies of your own${aidN ? `, ${aidN} sent by ${friends.length ? friends.map(f => s.nations[f].name).join(', ') : 'the Latin West'}` : ', and no help from abroad'}, behind walls worth ${city.fort + 2} garrisons.`, tone: aidN ? 'good' : 'neutral', kind: 'tower' },
  ] });
  push(s, { kind: 'battle', battle: b });
}

/** After the great siege, for the player as Byzantium. */
export function siegeAftermath(s: GameState, held: boolean) {
  if (held) {
    s.flags.const_holds = 1;
    player(s).prestige += 40;
    makePeace(s, 'ottomans', 'byzantium');
    s.truces.push({ a: 'ottomans', b: 'byzantium', until: s.year + 10 });
    for (const f of FRIENDS) if (s.nations[f]?.alive) addRel(s, s.player, f, 15);
    return 'The walls hold! The Sultan lifts the siege and signs a ten-year truce. Prestige +40. All of Christendom sings your name.';
  }
  s.flags.const_fell = 1;
  s.nations.ottomans.prestige += 30;
  return 'The City has fallen. The Empire lives on in the Morea, for now.';
}
