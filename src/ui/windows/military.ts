// Military window: army, navy, wars and battles, forge recipes.
import { TROOPS } from '../../data/troops';
import { TECH } from '../../data/techs';
import { player, provsOf, incomeOf, armyPower, armyCap, nationName } from '../../engine/core';
import { disbandTroop } from '../../engine/turn';
import { unitFor, UNIT_LINES, CLASS_NAME, type UnitClass } from '../../engine/cards';
import { h, signed } from '../dom';
import { icon } from '../icons';
import { troopCard, troopDetails } from '../cards';
import { navyCap, transportOf } from '../../engine/navy';
import { warScore } from '../../engine/diplo';
import { garrisons, moveTroops, travel, locOf, READY_STR, healOf } from '../../engine/army';
import { S, forge, setForge } from '../state';
import { toast, act, SEASONS, placeName, qText } from '../app';
import { closeWin, renderWin } from './frame';
import { openSheet, peopleSection } from '../sheets';
import { confirmBox } from '../modal';

// ---------- category panels ----------
/** What each troop card hires now, and what research brings next. */
export function unitsPanel() {
  const box = h('div', { class: 'units' });
  for (const cls of ['levy', 'inf', 'shot', 'cav', 'art'] as UnitClass[]) {
    const now = unitFor(S, cls);
    const line = UNIT_LINES[cls];
    const next = line.slice(line.indexOf(now) + 1)[0];
    const d = TROOPS[now];
    box.append(h('div', { class: 'unit-row' },
      troopCard({ type: now, vet: 0, str: 100 }, { small: true }),
      h('div', { class: 'g-t' }, h('b', {}, CLASS_NAME[cls]), h('small', {}, `${d.name} · melee ${d.melee}, fire ${d.fire}, defence ${d.def} · upkeep ${d.upkeep}`),
        h('small', { class: 'muted' }, next ? `Next: ${TROOPS[next].name} with ${TECH[TROOPS[next].tech!]?.name ?? 'research'}` : 'The best of its kind'))));
  }
  return box;
}

export function armyTab(body: HTMLElement) {
  // where troops stand now, plus the capital, barracks and bases
  const gs = [...new Set([...garrisons(S), ...S.troops.filter(t => !t.moving && t.loc).map(t => t.loc!)])];
  body.append(h('h3', {}, 'Your units'), h('p', { class: 'muted small' }, 'Troop cards hire the best unit of their kind you have researched. Better kinds (Tercios, Knights, Cuirassiers, Galleons…) come from the recipes in the Forge: two companies, or a company and an improvement card.'), unitsPanel());
  body.append(h('p', { class: 'muted' }, 'Troops stand in the capital, in provinces with Barracks, or at an invasion base. They heal every season: fastest with Barracks, then the capital, at half speed on the march or in camp. Only troops within a quarter\'s march can attack or defend a province. Tap troops to select them, then move them.'));
  body.append(h('p', { class: 'muted small' }, 'On troop cards: M = Melee (close combat), F = Fire (range), D = Defence. Tap a company to see its details and move it.'));
  body.append(h('h3', {}, `Armies (${S.troops.length}/${armyCap(S)}) · upkeep ${incomeOf(S, S.player).upkeep.toFixed(1)} a year`));
  const sel = forge.filter(u => S.troops.some(t => t.uid === u));
  const toggle = (uid: number) => { setForge(forge.includes(uid) ? forge.filter(x => x !== uid) : [...forge, uid]); renderWin(); };
  const groups: [string, typeof S.troops][] = gs.map(g => [g, S.troops.filter(t => t.loc === g && !t.moving)]);
  const moving = S.troops.filter(t => t.moving), away = S.troops.filter(t => t.mission != null && !t.moving);
  for (const [g, ts] of groups) {
    body.append(h('div', { class: 'garrison' }, h('b', {}, placeName(g)), h('small', {}, `${g === player(S).capital ? 'capital · ' : g.startsWith('base:') ? 'camp · ' : S.provinces[g]?.buildings.includes('barracks') ? 'barracks · ' : ''}${ts.filter(t => t.mission == null).length} companies · power ${Math.round(armyPower(ts.filter(t => t.mission == null)))}`)));
    const row = h('div', { class: 'cards-row wrap' });
    if (!ts.length) row.append(h('p', { class: 'muted' }, 'Empty.'));
    for (const t of ts) row.append(troopCard(t, { small: true, selected: sel.includes(t.uid), dim: t.mission != null || t.str < 100, badge: t.mission === -5 ? 'defending' : t.str < 100 ? `+${healOf(S, t).q}% a season` : undefined, onclick: () => t.mission === -5 ? toast('Standing ready to defend') : t.mission != null ? toast('Away on a task') : (t.str < 100 && toast(`Heals ${healOf(S, t).q}% a season${healOf(S, t).why.length ? ': ' + healOf(S, t).why.join(', ') : ''}. ${t.str < READY_STR ? 'Too weak to attack until half strength, but it can march.' : 'Ready to fight.'}`), toggle(t.uid)) }));
    body.append(row);
  }
  if (moving.length) {
    body.append(h('h3', {}, 'On the march'));
    body.append(h('div', { class: 'cards-row wrap' }, moving.map(t => troopCard(t, { small: true, badge: `${placeName(t.moving!.to)} · ${t.moving!.eta} q` }))));
  }
  if (away.length) body.append(h('p', { class: 'muted' }, `${away.length} companies are away on tasks.`));
  if (sel.length === 1) { const t1 = S.troops.find(t => t.uid === sel[0])!; body.append(troopDetails(t1.type, t1)); }
  if (sel.length) {
    const from = S.troops.find(t => t.uid === sel[0])!;
    body.append(h('div', { class: 'mcap' }, h('b', {}, `${sel.length} selected · move to:`),
      h('div', { class: 'targets' }, garrisons(S).filter(g => g !== from.loc).map(g => { const q = travel(locOf(S, from), g); return h('button', { class: 'tchip', onclick: () => { const ids = [...sel]; setForge([]); act(() => moveTroops(S, ids, g), q ? `On the march: ${qText(q)}` : 'Moved'); } }, `${placeName(g)} · ${q ? qText(q) : 'now'}`); }),
        garrisons(S).some(g => g !== from.loc) ? null : h('small', { class: 'muted' }, 'Nowhere else to go: troops stand in the capital, in provinces with Barracks (Internal) or at an invasion base.'),
        sel.length === 1 ? h('button', { class: 'btn ghost danger small', onclick: () => confirmBox(`Disband ${TROOPS[from.type].name}?`, 'The troop is removed for good.', 'Disband', () => { setForge([]); act(() => disbandTroop(S, from.uid)); }) }, 'Disband') : null)));
  }
  if (!provsOf(S, S.player).some(p => p.buildings.includes('barracks'))) body.append(h('p', { class: 'muted' }, 'Tip: Barracks (Internal) make troops heal 50% faster there.'));
}

export function navyTab(body: HTMLElement) {
  body.append(h('h3', {}, `Fleet (${S.fleet.length}/${navyCap(S)}) · carries ${transportOf(S, S.fleet.map(t => t.uid))} companies`));
  const fl = h('div', { class: 'cards-grid' });
  if (!S.fleet.length) fl.append(h('p', { class: 'muted' }, 'No ships. Ship cards come with Military draws; hiring one turns a general into an admiral.'));
  [...S.fleet].sort((a, b) => TROOPS[b.type].tier - TROOPS[a.type].tier).forEach(t =>
    fl.append(troopCard(t, { small: true, selected: forge.includes(t.uid), onclick: () => {
      if (t.mission != null) return toast('This ship is at sea on a mission');
      setForge(forge.includes(t.uid) ? forge.filter(x => x !== t.uid) : [...forge.slice(-1), t.uid]);
      renderWin();
    } })));
  body.append(fl);
  body.append(...peopleSection(['admiral'], 'Admirals', 'No admirals yet. A general who leads an attack with ships becomes one, for good.'));
}

export function warsTab(body: HTMLElement) {
  const wars = S.wars.filter(w => w.a === S.player || w.b === S.player);
  body.append(h('h3', {}, `Wars (${wars.length})`));
  if (!wars.length) body.append(h('p', { class: 'muted' }, 'At peace. Declare war from a province or a realm in Diplomacy.'));
  for (const w of wars) {
    const foe = w.a === S.player ? w.b : w.a;
    const n = S.nations[foe];
    const mine = w.a === S.player ? (w.winsA ?? 0) : (w.winsB ?? 0), theirs = w.a === S.player ? (w.winsB ?? 0) : (w.winsA ?? 0);
    const score = warScore(S, foe);
    body.append(h('button', { class: 'nrow war', onclick: () => { closeWin(); openSheet('nation', foe); } },
      h('span', { class: 'swatch', style: `background:${n?.color}` }),
      h('span', { class: 'nr-name' }, n?.name ?? foe, h('small', {}, `since ${w.since} · battles ${mine}–${theirs}${S.flags['faction_' + foe] ? ' · civil war' : ''}`)),
      h('span', { class: 'nr-badges' }, h('span', { class: 'tag ' + (score >= 0 ? 'ally' : 'war') }, `War score ${signed(Math.round(score))}`)),
      h('span', { class: 'a-go', html: icon('next', 14) })));
  }
  const log = [...(S.battleLog ?? [])].reverse();
  body.append(h('h3', {}, `Your battles (${log.length})`));
  if (!log.length) body.append(h('p', { class: 'muted' }, 'No battles fought yet.'));
  const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['When', 'Where', 'Against', 'Odds', 'Result'].map(x => h('th', {}, x)))));
  t.append(h('tbody', {}, log.slice(0, 60).map(r => {
    const meAtt = r.att === S.player;
    const foe = meAtt ? r.def : r.att;
    const odds = Math.round(100 * (meAtt ? r.attPower : r.defPower) / Math.max(1, r.attPower + r.defPower));
    return h('tr', {}, h('td', {}, `${SEASONS[r.quarter]} ${r.year}`), h('td', {}, `${S.provinces[r.province]?.name ?? r.province}${r.naval ? ' (sea)' : ''}`),
      h('td', {}, nationName(S, foe) === foe && foe === 'rebels' ? 'Rebels' : nationName(S, foe)), h('td', {}, `${odds}%`), h('td', { class: r.player === 'won' ? 'good' : 'bad' }, r.player === 'won' ? 'Victory' : 'Defeat'));
  })));
  if (log.length) body.append(h('div', { class: 'tscroll' }, t));
}

export function recipeBook(knownOnly = false) {
  const d: HTMLElement = knownOnly ? h('div', { class: 'recipes' }) : h('details', { class: 'recipes' }, h('summary', {}, 'Recipe book'));
  const rows: [string, string, string, string?][] = [
    ['Levy Infantry', 'Long Pikes', 'Pikemen', 'pike_square'], ['Levy Infantry', 'Plate Armour', 'Men-at-Arms'], ['Levy or Crossbow', 'Arquebuses', 'Arquebusiers', 'firearms'],
    ['Jinetes', 'Plate Armour', 'Knights'], ['Men-at-Arms', 'Warhorses', 'Knights'], ['Pikemen', 'Arquebusiers', 'Tercio', 'tercio_doctrine'],
    ['Bombard', 'Bronze Casting', 'Field Cannon', 'bronze_cannon'], ['Jinetes', 'Pistols', 'Reiters', 'wheellock'], ['Knights', 'Pistols', 'Cuirassiers', 'wheellock'],
    ['Arquebusiers', 'Muskets', 'Musketeers', 'musket'], ['Tercio', 'Muskets', 'Tercio Viejo', 'musket'], ['Reiters', 'Muskets', 'Dragoons', 'military_drill'],
    ['Musketeers', 'Bayonets', 'Line Infantry', 'bayonet'], ['Two of the same troop', '', '×1.8 strength in one company'], ['Any troop', 'Regimental Colours', '+1 star'],
  ];
  const shown = knownOnly ? rows.filter(([, , , t]) => !t || S.techs.includes(t)) : rows;
  if (knownOnly && shown.length < rows.length) d.append(h('p', { class: 'muted' }, `${rows.length - shown.length} more recipes unlock with research.`));
  d.append(h('table', { class: 'rtable' }, h('tbody', {}, shown.map(([a, b, c, t]) => h('tr', { class: t && !S.techs.includes(t) ? 'locked' : '' },
    h('td', {}, a), h('td', {}, b ? '+ ' + b : ''), h('td', {}, '= ', h('b', {}, c)), h('td', { class: 'muted' }, t && !S.techs.includes(t) ? TECH[t].name : ''))))));
  return d;
}
