// What rivals ask of the player, and the warning that comes before they strike. Each event has a realm behind it,
// chosen from how the realms really stand. Writing rules: docs/WRITING.md.
import type { GameState, Nation } from '../types';
import { player, provsOf, addRel, getRel, nationName, atWar, hasTreaty, inTruce, alliesOf, enemiesOf, borders, declareWar, uid, maxFort } from './core';
import { addCard } from './cards';
import { transferProvince } from './battle';
import { getGeo } from './map';
import { threatOf } from './ai';
import { goalOf } from './rivals';
import { NO_STATE } from '../data/nations';
import { good, bad, neutral, stab, P, scaled, needs, pay, later, type EventDef, type Vars } from './eventkit';

const nat = (s: GameState, v: Vars, k = 'nation'): Nation | undefined => s.nations[String(v[k])];
const nm = (s: GameState, v: Vars, k = 'nation') => nationName(s, String(v[k]));
const realms = (s: GameState) => Object.values(s.nations).filter(n => n.alive && n.id !== P(s) && n.id !== NO_STATE && !n.overlord && provsOf(s, n.id).length > 0);
const free = (s: GameState, n: Nation) => !atWar(s, P(s), n.id) && !inTruce(s, P(s), n.id);
/** The player's provinces that touch a realm, weakest walls first, never the capital. */
const frontier = (s: GameState, id: string) => provsOf(s, P(s)).filter(p => p.id !== player(s).capital && getGeo().adj[p.id].some(nb => s.provinces[nb].owner === id)).sort((a, b) => a.fort - b.fort || a.dev - b.dev);
/** Companies of the day, for a realm that is given the means to raise them. */
const troopOfDay = (s: GameState) => (s.year < 1470 ? 'men_at_arms' : s.year < 1552 ? 'pikemen' : s.year < 1685 ? 'musketeers' : 'line_infantry');
const prestige = (s: GameState, d: number) => { player(s).prestige = Math.max(0, player(s).prestige + d); };
const cede = (s: GameState, v: Vars) => {
  const n = nat(s, v), p = s.provinces[String(v.prov)];
  if (!n?.alive || !p || p.owner !== P(s)) return [neutral('Overtaken by events', 'The matter has settled itself.')];
  transferProvince(s, p.id, n.id); delete p.occupiedFrom;
  addRel(s, P(s), n.id, 25); s.truces.push({ a: n.id, b: P(s), until: s.year + 10 }); stab(s, -1); prestige(s, -5);
  return [bad(`${p.name} is given up`, `${n.name} takes it without a shot, and swears a truce of ten years. Stability −1, prestige −5.`, 'scroll')];
};
const defy = (s: GameState, v: Vars) => {
  const n = nat(s, v);
  if (!n?.alive || atWar(s, P(s), n.id)) return [neutral('Overtaken by events', 'The matter has settled itself.')];
  declareWar(s, n.id, P(s)); s.flags.ai_war_on_player = s.year; prestige(s, 2);
  return [bad('War', `${n.name} declares war on you. You answered as a monarch should: prestige +2.`, 'sword')];
};

export const REQUEST_EVENTS: EventDef[] = [
  // ---------- the warning before the blow ----------
  {
    id: 'war_warning', title: (s, v) => `${nm(s, v)} Gathers on Your Border`, art: 'banner', chance: 0, repeat: 0, cond: () => true,
    text: (s, v) => { const t = threatOf(s, String(v.nation)); return `Your wardens report that ${nm(s, v)} has called up its levies and is laying in grain along your frontier. Its envoys have grown short with yours. By your captains' count it can bring ${Math.round(t.theirs)} against the ${Math.round(t.needed)} you would need to give it pause. Your chancellor gives it a year.`; },
    options: [
      { label: 'Strengthen the border', hint: 'walls on the frontier', can: (s, v) => (frontier(s, String(v.nation)).some(p => p.fort < maxFort(s)) ? needs(s, 20) : 'The frontier walls are as high as the age allows'), run: (s, v) => { pay(s, 20); const ps = frontier(s, String(v.nation)).filter(p => p.fort < maxFort(s)).slice(0, 2); for (const p of ps) p.fort++; return [good('Masons on the frontier', `Walls +1 in ${ps.map(p => p.name).join(' and ')}. They will count the cost again.`, 'tower')]; } },
      { label: 'Send an envoy with gifts', can: s => needs(s, 15), run: (s, v) => { pay(s, 15); addRel(s, P(s), String(v.nation), 20); return [good('Smooth words and silver cups', `Relations with ${nm(s, v)} +20. If that is enough, the levies go home.`, 'hands')]; } },
      { label: 'Look for a friend who fears them too', run: s => { addCard(s, 'alliance_pact', true); return [good('A list of courts', 'Your chancellor names those with cause to fear the same neighbour. One Alliance Pact card.', 'scroll')]; } },
      { label: 'Let them come', run: s => { addCard(s, 'fortify', true); return [neutral('Swords are sharpened', 'Your captains ask only that you choose the ground. One Fortify card.', 'sword')]; } },
    ],
  },
  // ---------- an ultimatum ----------
  {
    id: 'ultimatum', title: (s, v) => `An Ultimatum from ${nm(s, v)}`, art: 'scroll', chance: 0.06, repeat: 15,
    cond: s => s.year >= s.startYear + 8,
    setup: s => {
      const c = realms(s).filter(n => free(s, n) && !hasTreaty(s, P(s), n.id, 'alliance') && borders(s, P(s), n.id) && (goalOf(s, n.id) === P(s) || getRel(s, P(s), n.id) <= -30) && threatOf(s, n.id).theirs > threatOf(s, n.id).needed * 0.9 && frontier(s, n.id).length > 0)
        .sort((a, b) => threatOf(s, b.id).theirs - threatOf(s, a.id).theirs)[0];
      return c ? { nation: c.id, prov: frontier(s, c.id)[0].id } : null;
    },
    text: (s, v) => `A herald of ${nm(s, v)} reads from a parchment in your own hall. His master holds that ${s.provinces[String(v.prov)]?.name ?? 'your border province'} is his by ancient right, and will have it by treaty or by arms. He will wait for your answer.`,
    options: [
      { label: 'It is theirs. Draw up the treaty', run: cede },
      { label: 'Tell him we need a season to consider', run: (s, v) => { later(s, 'ultimatum_due', 0, 0, v); return [neutral('The herald waits at an inn', 'You have until the next season to arm, to treat, or to find a friend.', 'hourglass')]; } },
      { label: 'Read him the answer of a king', run: defy },
    ],
  },
  {
    id: 'ultimatum_due', title: 'The Herald Returns', art: 'scroll', chance: 0, repeat: 0,
    cond: () => true,
    text: (s, v) => `The herald of ${nm(s, v)} stands in your hall again, and this time he has not taken off his gloves. ${s.provinces[String(v.prov)]?.name ?? 'The province'}, or war: he must have your answer before he rides.`,
    options: [
      { label: 'Give it up', run: cede },
      { label: 'Let it be war', run: defy },
    ],
  },
  // ---------- a subsidy ----------
  {
    id: 'subsidy_request', title: (s, v) => `${nm(s, v)} Asks for Silver`, art: 'coin', chance: 0.07, repeat: 8,
    cond: s => s.year >= s.startYear + 4,
    setup: s => {
      for (const n of realms(s).filter(x => free(s, x) && getRel(s, P(s), x.id) >= 15)) {
        const foe = enemiesOf(s, n.id).find(e => e !== P(s) && s.nations[e]?.alive && (getRel(s, P(s), e) < 0 || borders(s, P(s), e)));
        if (foe) return { nation: n.id, foe };
      }
      return null;
    },
    text: (s, v) => `${nm(s, v)} is at war with ${nm(s, v, 'foe')} and running short of coin. Its envoy puts it plainly: every company his master raises is one that ${nm(s, v, 'foe')} cannot send against you. He asks ${scaled(s, 25)} ducats.`,
    options: [
      { label: 'Send the silver', can: s => needs(s, 25), run: (s, v) => { pay(s, 25); const n = nat(s, v); if (!n?.alive) return [neutral('Too late', 'The realm that asked is no more.')]; addRel(s, P(s), n.id, 20); for (let i = 0; i < 2; i++) n.army.push({ uid: uid(s), type: troopOfDay(s), vet: 0, str: 100 }); return [good('Your silver marches', `${n.name} raises two companies with it. Relations +20.`, 'coin')]; } },
      { label: 'Wish them well', run: (s, v) => { addRel(s, P(s), String(v.nation), -8); return [neutral('Kind words', `${nm(s, v)} had hoped for more. Relations −8.`)]; } },
    ],
  },
  // ---------- a joint war ----------
  {
    id: 'joint_war', title: (s, v) => `${nm(s, v)} Proposes a War`, art: 'sword', chance: 0.06, repeat: 12,
    cond: s => s.year >= s.startYear + 6,
    setup: s => {
      for (const n of realms(s).filter(x => free(s, x) && (hasTreaty(s, P(s), x.id, 'alliance') || getRel(s, P(s), x.id) >= 30))) {
        const g = goalOf(s, n.id), t = g ? s.nations[g] : undefined;
        if (t?.alive && g !== P(s) && borders(s, P(s), g!) && !atWar(s, P(s), g!) && !inTruce(s, P(s), g!) && !hasTreaty(s, P(s), g!, 'alliance') && !hasTreaty(s, P(s), g!, 'marriage') && t.overlord !== P(s)) return { nation: n.id, foe: g! };
      }
      return null;
    },
    text: (s, v) => `The envoy of ${nm(s, v)} unrolls a map on your table and lays two fingers on ${nm(s, v, 'foe')}. "My master will march in spring. If you march too, it cannot face both ways. We divide what falls."`,
    options: [
      { label: 'We march together', run: (s, v) => { const n = nat(s, v), f = nat(s, v, 'foe'); if (!n?.alive || !f?.alive) return [neutral('Overtaken by events', 'The map has changed.')]; if (!atWar(s, n.id, f.id)) declareWar(s, n.id, f.id); declareWar(s, P(s), f.id); addRel(s, P(s), n.id, 15); return [good('A war of two fronts', `You and ${n.name} are at war with ${f.name}. Their companies near the fighting will stand with yours.`, 'banner')]; } },
      { label: 'Not this year', run: (s, v) => { addRel(s, P(s), String(v.nation), -5); return [neutral('The map is rolled up', `${nm(s, v)} will remember that you hesitated. Relations −5.`)]; } },
    ],
  },
  // ---------- drop your ally ----------
  {
    id: 'drop_alliance', title: (s, v) => `${nm(s, v)} Objects to Your Friends`, art: 'hands', chance: 0.05, repeat: 15,
    cond: s => alliesOf(s, P(s)).length > 0,
    setup: s => {
      for (const a of alliesOf(s, P(s)).filter(x => s.nations[x]?.alive && !s.nations[x].overlord)) {
        const n = realms(s).filter(x => x.id !== a && free(s, x) && getRel(s, P(s), x.id) >= -10 && getRel(s, x.id, a) <= -30 && (borders(s, P(s), x.id) || provsOf(s, x.id).length >= 8)).sort((x, y) => provsOf(s, y.id).length - provsOf(s, x.id).length)[0];
        if (n) return { nation: n.id, ally: a };
      }
      return null;
    },
    text: (s, v) => `${nm(s, v)} has no quarrel with you, its envoy says, and would have none. But it cannot be the friend of a friend of ${nm(s, v, 'ally')}. He asks, courteously, that you choose.`,
    options: [
      { label: `Let the alliance lapse`, run: (s, v) => { const a = String(v.ally); s.treaties = s.treaties.filter(t => !(t.kind === 'alliance' && ((t.a === P(s) && t.b === a) || (t.b === P(s) && t.a === a)))); addRel(s, P(s), String(v.nation), 25); addRel(s, P(s), a, -30); prestige(s, -2); return [neutral('A friend exchanged', `The alliance with ${nationName(s, a)} is ended (relations −30). ${nm(s, v)} is gratified: +25. Courts take note of what your word is worth: prestige −2.`, 'hands')]; } },
      { label: 'My friends are my own affair', run: (s, v) => { addRel(s, P(s), String(v.nation), -15); addRel(s, P(s), String(v.ally), 10); return [neutral('The envoy bows and goes', `${nm(s, v)}: relations −15. ${nm(s, v, 'ally')} hears of it: +10.`, 'shield')]; } },
    ],
  },
];
