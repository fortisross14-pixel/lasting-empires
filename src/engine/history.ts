// Scripted history that happens no matter who plays: the siege of Constantinople in 1453.
import type { GameState } from '../types';
import { player, push, log, declareWar, atWar, addRel, uid, makePeace, rand } from './core';
import { makeSide, createBattle, toBattleUnits, transferProvince } from './battle';

const CITY = 'constantinople';
/** The Sultan's host for the siege: his standing army plus the great levy and Urban's guns. */
const HOST = ['levy', 'levy', 'levy', 'levy', 'levy', 'levy', 'levy', 'levy', 'crossbow', 'crossbow', 'crossbow', 'men_at_arms', 'men_at_arms', 'men_at_arms', 'men_at_arms', 'men_at_arms', 'jinetes', 'jinetes', 'bombard', 'bombard'];
const FRIENDS = ['venice', 'genoa', 'hungary', 'papacy', 'naples', 'aragon', 'hospitallers'];

export function scriptedHistory(s: GameState) {
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
