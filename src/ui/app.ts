import type { GameState, MissionKind, DraftOption, RevealItem, Battle, Character } from '../types';
import { NATIONS, RULER_TRAITS } from '../data/nations';
import { TROOPS, EQUIPMENT, TACTICS, COUNTER_TEXT } from '../data/troops';
import { TECHS, TECH, BUILDINGS } from '../data/techs';
import { TRAITS } from '../data/characters';
import {
  player, provsOf, incomeOf, manpowerGain, manpowerMax, getRel, atWar, hasTreaty, enemiesOf, alliesOf, armyPower,
  armyCap, courtCap, draftsPerTurn, provinceIncome, buildingAllowed, buildingCost, roleName, nationName, inTruce,
} from '../engine/core';
import { newGame, endTurn, chooseEventOption, playerDeclareWar, warCost, ranking, dismissCharacter, disbandTroop, SAVE_VERSION } from '../engine/turn';
import { EVENT, eventTitle, upcomingHistory } from '../engine/events';
import { CARDS, playCard, cardBlocked } from '../engine/cards';
import {
  MISSION_INFO, DIPLO, missionBlocked, launchMission, cancelMission, diploChance, missionTurns, techCost, researchRate, attackRoute, developCost,
} from '../engine/missions';
import { startTroopDraft, startCourtDraft, takeDraftOption, draftBlocked, courtBlocked, draftCost, mergePreview, doMerge, AMBITIONS } from '../engine/drafts';
import { playRound, autoResolve, finishBattle, ratio, breakLevel, hp } from '../engine/battle';
import { getGeo } from '../engine/map';
import { h, $, clear, sleep, reduced, fmt, signed } from './dom';
import { icon } from './icons';
import { troopCard, equipCard, charCard, handCard, tacticCard, backCard, flipCard } from './cards';
import { MapView } from './map';

const KEY = 'lasting-empires.save.v1';
let S: GameState;
let map: MapView;
let sheet: { kind: string; arg?: string } | null = null;
let modalOpen = false;
let forge: number[] = [];

// ---------- persistence ----------
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage may be blocked */ } }
function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === SAVE_VERSION ? s : null;
  } catch { return null; }
}
export function snapshot() { return S ? { save: JSON.stringify(S) } : {}; }

// ---------- shell ----------
export function boot(data: { save?: string }) {
  const root = $('#app');
  clear(root);
  let restored: GameState | null = null;
  if (data?.save) { try { restored = JSON.parse(data.save); } catch { /* ignore */ } }
  if (restored && !restored.over) { start(restored); return; }
  showTitle();
}

function showTitle() {
  const root = clear($('#app'));
  const saved = loadSave();
  const wrap = h('div', { class: 'title-screen' },
    h('div', { class: 'title-inner' },
      h('p', { class: 'eyebrow' }, 'Anno Domini 1453 – 1750'),
      h('h1', { class: 'title' }, 'Lasting Empires'),
      h('p', { class: 'lede' }, 'Raise troops, forge them into tercios, send your court on missions, and let history surprise you. One turn is one year.'),
      saved && !saved.over ? h('button', { class: 'btn primary wide', onclick: () => start(saved) }, `Continue as ${saved.nations[saved.player].name}, ${saved.year}`) : null,
      h('h2', { class: 'pick-h' }, 'Choose your crown'),
      h('div', { class: 'nation-picks' }, NATIONS.filter(n => n.playable).map(n =>
        h('button', { class: 'nation-pick', style: `--nc:${n.color}`, onclick: () => start(newGame(n.id)) },
          h('span', { class: 'np-shield' }, n.name[0]),
          h('span', { class: 'np-name' }, n.name),
          h('span', { class: 'np-diff' }, n.id === 'castile' ? 'Strong start' : n.id === 'aragon' ? 'Balanced' : 'Hard start'),
          h('span', { class: 'np-blurb' }, n.blurb ?? '')))),
      h('details', { class: 'howto' },
        h('summary', {}, 'How to play'),
        h('ul', {},
          h('li', {}, 'Tap a province on the map to build, develop, attack or talk to its owner.'),
          h('li', {}, 'Every mission needs a character: generals lead troops, diplomats sign treaties, administrators research and build.'),
          h('li', {}, 'Draft troop and equipment cards in the Army panel, then forge them: Levy + Long Pikes = Pikemen; Pikemen + Arquebusiers = Tercio.'),
          h('li', {}, 'In battle both sides play a tactic face-down. Counter the enemy and they take extra damage.'),
          h('li', {}, 'Play cards from your hand at any time. History cards along the top will flip when their time comes.'),
          h('li', {}, 'Press End Year when you are ready. Score the most prestige by 1750.'),
        ))));
  root.append(wrap);
}

function start(s: GameState) {
  S = s;
  const root = clear($('#app'));
  const me = player(S);
  root.append(
    h('header', { id: 'top' }),
    h('main', { id: 'board' }, h('div', { id: 'timeline' }), h('div', { id: 'zoom' },
      h('button', { class: 'zbtn', 'aria-label': 'Zoom in', onclick: () => map.zoomBy(0.75), html: icon('plus', 18) }),
      h('button', { class: 'zbtn', 'aria-label': 'Zoom out', onclick: () => map.zoomBy(1.33), html: '<svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path d="M5 12 H19"/></svg>' }),
      h('button', { class: 'zbtn', 'aria-label': 'Show my realm', onclick: () => map.focus(provsOf(S, S.player).map(p => p.id)), html: icon('crown', 18) }))),
    h('aside', { id: 'sheet', hidden: true }),
    h('section', { id: 'dock' }, h('div', { id: 'hand' }), h('button', { id: 'endturn', class: 'btn primary', onclick: onEndTurn })),
    h('nav', { id: 'tabs' }, ...[
      ['army', 'Army', 'tercio'], ['court', 'Court', 'crown'], ['missions', 'Missions', 'hourglass'],
      ['research', 'Research', 'book'], ['nations', 'Nations', 'hands'], ['chronicle', 'Chronicle', 'scroll'],
    ].map(([k, label, ic]) => h('button', { class: 'tab', 'data-tab': k, onclick: () => toggleSheet(k) }, h('span', { html: icon(ic, 20) }), h('span', { class: 'tab-l' }, label)))),
    h('div', { id: 'modal', hidden: true }),
    h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }),
  );
  map = new MapView($('#board'));
  map.onSelect = id => { if (id) openSheet('province', id); else if (sheet?.kind === 'province') closeSheet(); };
  document.documentElement.style.setProperty('--me', me.color);
  refresh();
  requestAnimationFrame(() => map.focus(provsOf(S, S.player).map(p => p.id), 120));
  processQueue();
}

function refresh() {
  renderTop(); map.render(S); renderHand(); renderTimeline();
  if (sheet) renderSheet();
  save();
}

function toast(msg: string, tone: 'good' | 'bad' | 'neutral' = 'neutral') {
  const t = $('#toast');
  const el = h('div', { class: 'toast-msg t-' + tone }, msg);
  t.append(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

function act(fn: () => string | null | void, okMsg?: string) {
  const r = fn();
  if (typeof r === 'string' && r) toast(r, 'bad');
  else if (okMsg) toast(okMsg, 'good');
  refresh();
  processQueue();
}

// ---------- top bar ----------
function renderTop() {
  const me = player(S);
  const inc = incomeOf(S, S.player);
  const top = clear($('#top'));
  top.append(
    h('button', { class: 'crest', onclick: () => toggleSheet('realm'), style: `--nc:${me.color}` },
      h('span', { class: 'np-shield sm' }, me.name[0]),
      h('span', { class: 'crest-t' }, h('b', {}, me.name), h('small', {}, me.ruler.name))),
    h('div', { class: 'year' }, h('span', { class: 'year-n' }, String(S.year)), h('small', {}, 'A.D.')),
    h('div', { class: 'res' },
      chip('coin', fmt(me.gold), signed(inc.total), 'Ducats', inc.total < 0 ? 'bad' : ''),
      chip('people', fmt(me.manpower), '/' + fmt(manpowerMax(S, S.player)), 'Manpower'),
      h('button', { class: 'chip stab', title: 'Stability', onclick: () => toggleSheet('realm') },
        h('span', { html: icon('scales', 16) }),
        h('span', { class: 'pips' }, ...[-3, -2, -1, 0, 1, 2, 3].map(v => h('i', { class: (v === 0 ? 'zero ' : '') + (me.stability >= v && v > 0 ? 'on' : me.stability <= v && v < 0 ? 'neg' : '') }))),
        h('span', { class: 'sr' }, `Stability ${me.stability}`)),
      chip('laurel', fmt(me.prestige), '', 'Prestige'),
    ),
  );
}
function chip(ic: string, v: string, sub: string, label: string, tone = '') {
  return h('button', { class: 'chip ' + tone, title: label, onclick: () => toggleSheet('realm') }, h('span', { html: icon(ic, 16) }), h('b', {}, v), sub ? h('small', {}, sub) : null, h('span', { class: 'sr' }, label));
}

// ---------- hand & timeline ----------
function renderHand() {
  const hand = clear($('#hand'));
  if (!S.hand.length) hand.append(h('p', { class: 'empty-hand' }, 'No cards in hand. You draw one each year.'));
  S.hand.forEach((c, i) => {
    const blocked = cardBlocked(S, CARDS[c.card]);
    const el = handCard(c.card, { small: true, dim: !!blocked, onclick: () => openCardModal(c.uid) });
    el.style.setProperty('--i', String(i));
    hand.append(el);
  });
  const et = $('#endturn');
  et.innerHTML = '';
  et.append(h('span', { class: 'et-l' }, 'End Year'), h('small', {}, `${S.year} → ${S.year + 1}`));
}

function renderTimeline() {
  const tl = clear($('#timeline'));
  const up = upcomingHistory(S);
  if (!up.length) return;
  tl.append(h('span', { class: 'tl-h' }, 'History'));
  for (const e of up) {
    tl.append(h('button', { class: 'tl-card', onclick: () => toast(`${e.title}: due ${e.window[0]}–${e.window[1]}. What happens is up to fate and you.`) },
      h('span', { class: 'tl-rose', html: icon('star', 14) }), h('span', { class: 'tl-t' }, e.title), h('small', {}, `${e.window[0]}–${e.window[1]}`)));
  }
}

// ---------- sheets ----------
function toggleSheet(kind: string, arg?: string) {
  if (sheet && sheet.kind === kind && sheet.arg === arg) closeSheet(); else openSheet(kind, arg);
}
function openSheet(kind: string, arg?: string) {
  if (kind !== 'army') forge = [];
  sheet = { kind, arg };
  renderSheet();
  $('#sheet').hidden = false;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', (t as HTMLElement).dataset.tab === kind));
}
function closeSheet() {
  sheet = null; forge = [];
  $('#sheet').hidden = true;
  map.select(null);
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
}

function sheetHead(title: string, sub?: string, color?: string) {
  return h('div', { class: 'sh-head', style: color ? `--nc:${color}` : '' },
    h('div', { class: 'sh-titles' }, h('h2', {}, title), sub ? h('p', {}, sub) : null),
    h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeSheet, html: icon('close', 18) }));
}

function renderSheet() {
  if (!sheet) return;
  const el = clear($('#sheet'));
  const body = h('div', { class: 'sh-body' });
  const k = sheet.kind;
  if (k === 'province') el.append(...provinceSheet(sheet.arg!, body));
  else if (k === 'nation') el.append(...nationSheet(sheet.arg!, body));
  else if (k === 'army') el.append(...armySheet(body));
  else if (k === 'court') el.append(...courtSheet(body));
  else if (k === 'missions') el.append(...missionsSheet(body));
  else if (k === 'research') el.append(...researchSheet(body));
  else if (k === 'nations') el.append(...nationsSheet(body));
  else if (k === 'chronicle') el.append(...chronicleSheet(body));
  else if (k === 'realm') el.append(...realmSheet(body));
}

const stat = (label: string, value: string | number | HTMLElement) => h('div', { class: 'stat' }, h('span', {}, label), typeof value === 'object' ? value : h('b', {}, String(value)));

function provinceSheet(id: string, body: HTMLElement) {
  const p = S.provinces[id];
  const owner = S.nations[p.owner];
  const mine = p.owner === S.player;
  const g = getGeo();
  body.append(h('div', { class: 'stats' },
    stat('Development', p.dev), stat('Fort', p.fort ? '▮'.repeat(p.fort) : 'none'),
    stat('Income', provinceIncome(S, id).toFixed(1)), stat('Coast', g.coastal[id] ? 'yes' : 'inland'),
    p.unrest ? stat('Unrest', p.unrest + ' yrs') : null));
  if (p.buildings.length) body.append(h('div', { class: 'tags' }, p.buildings.map(b => h('span', { class: 'tag', html: icon(BUILDINGS[b].icon, 14) + ' ' + BUILDINGS[b].name }))));
  if (mine) {
    body.append(h('h3', {}, 'Develop'));
    const devWhy = missionBlocked(S, 'develop', id);
    body.append(actionRow('wheat', `Develop ${p.name}`, `+1 development · ${developCost(S, id)} ducats · 3 years`, devWhy, () => openPlanner('develop', id)));
    body.append(h('h3', {}, 'Build'));
    for (const b of Object.values(BUILDINGS)) {
      const why = buildingAllowed(S, id, b.id) ?? (player(S).gold < buildingCost(S, b.id) ? `Needs ${buildingCost(S, b.id)} ducats` : null);
      if (why && (why.startsWith('Needs Ocean') || why === 'Coastal provinces only')) continue;
      body.append(actionRow(b.icon, b.name, `${b.desc} · ${buildingCost(S, b.id)} ducats · ${b.turns} yrs`, why, () => openPlanner('build', id, b.id)));
    }
  } else {
    const war = atWar(S, S.player, p.owner);
    body.append(h('h3', {}, war ? 'At war' : 'Relations'));
    if (war) {
      const route = attackRoute(S, id);
      body.append(actionRow('sword', `Conquer ${p.name}`, route ? `${route.naval ? 'By sea' : 'Over land'} · ${route.turns} yr march` : 'No route', missionBlocked(S, 'conquer', id), () => openPlanner('conquer', id)));
      body.append(actionRow('torch', `Raid ${p.name}`, 'Plunder ducats, take no land', missionBlocked(S, 'raid', id), () => openPlanner('raid', id)));
    }
    body.append(actionRow('hands', `${owner.name}`, `Relations ${getRel(S, S.player, p.owner)} · open diplomacy`, null, () => openSheet('nation', p.owner)));
    if (!war) body.append(declareWarRow(p.owner));
    body.append(armyIntel(p.owner));
  }
  return [sheetHead(p.name, mine ? 'Your province' : `${owner.name}${p.core !== p.owner ? ` · formerly ${nationName(S, p.core)}` : ''}`, owner.color), body];
}

function armyIntel(n: string) {
  const nat = S.nations[n];
  const spied = (nat.spiedUntil ?? 0) > S.year;
  if (spied) {
    return h('div', { class: 'intel' }, h('h3', {}, `${nat.adj} army (spies)`),
      h('div', { class: 'cards-row' }, nat.army.slice(0, 12).map(t => troopCard(t, { small: true }))));
  }
  const n2 = nat.army.length;
  return h('div', { class: 'intel' }, h('h3', {}, `${nat.adj} army`), h('p', { class: 'muted' }, `Scouts count about ${Math.max(0, n2 - 1)}–${n2 + 2} companies. Play a Spy Network card to see them.`));
}

function declareWarRow(n: string) {
  const truce = inTruce(S, S.player, n);
  const cost = warCost(S, n);
  return actionRow('sword', `Declare war on ${nationName(S, n)}`, cost ? `Stability −${cost}${cost > 1 ? ' (breaks your treaty)' : ''}` : 'You hold a claim: no stability loss', truce ? 'A truce is in force' : null, () => confirmBox(`Declare war on ${nationName(S, n)}?`, cost ? `Stability falls by ${cost}. Their allies may join them.` : 'Your claim justifies the war.', 'Declare war', () => act(() => playerDeclareWar(S, n), 'War declared')), 'danger');
}

function actionRow(ic: string, title: string, sub: string, blocked: string | null, onclick: () => void, tone = '') {
  return h('button', { class: `action ${tone}${blocked ? ' blocked' : ''}`, onclick: () => (blocked ? toast(blocked, 'bad') : onclick()) },
    h('span', { class: 'a-ico', html: icon(ic, 20) }),
    h('span', { class: 'a-t' }, h('b', {}, title), h('small', {}, blocked ?? sub)),
    h('span', { class: 'a-go', html: icon('next', 14) }));
}

function nationSheet(id: string, body: HTMLElement) {
  const n = S.nations[id];
  const rel = getRel(S, S.player, id);
  const war = atWar(S, S.player, id);
  const tre = ['trade', 'alliance', 'marriage'].filter(k => hasTreaty(S, S.player, id, k));
  body.append(h('div', { class: 'relbar' }, h('i', { style: `left:${(rel + 100) / 2}%` }), h('span', {}, `Relations ${rel}`)));
  body.append(h('div', { class: 'stats' },
    stat('Provinces', provsOf(S, id).length), stat('Ruler', n.ruler.name), stat('Temper', n.personality),
    stat('Status', war ? 'At war with you' : tre.length ? tre.join(', ') : 'Neutral')));
  const theirWars = enemiesOf(S, id).filter(e => e !== S.player).map(e => nationName(S, e));
  const theirAllies = alliesOf(S, id).map(e => nationName(S, e));
  if (theirWars.length || theirAllies.length) body.append(h('p', { class: 'muted' }, [theirAllies.length ? `Allies: ${theirAllies.join(', ')}.` : '', theirWars.length ? ` At war with ${theirWars.join(', ')}.` : ''].join('')));
  body.append(h('h3', {}, 'Send a diplomat'));
  for (const k of DIPLO) {
    if (war !== (k === 'peace')) continue;
    const why = missionBlocked(S, k, id);
    body.append(actionRow(MISSION_INFO[k].icon, MISSION_INFO[k].name, diploHint(k), why, () => openPlanner(k, id)));
  }
  if (!war) body.append(declareWarRow(id));
  body.append(armyIntel(id));
  return [sheetHead(n.name, `${n.adj} crown`, n.color), body];
}
function diploHint(k: MissionKind) {
  return ({ relations: 'Relations +25', trade: 'Both earn ducats every year', alliance: 'They join your wars', marriage: 'Relations grow every year, prestige', peace: 'End the war, 10-year truce' } as Record<string, string>)[k] ?? '';
}

function armySheet(body: HTMLElement) {
  const me = player(S);
  const left = draftsPerTurn(S) - S.draftsThisTurn;
  const lc = draftCost(S, 'levy'), pc = draftCost(S, 'pro');
  body.append(h('div', { class: 'draft-row' },
    h('button', { class: 'btn draft' + (draftBlocked(S, 'levy') ? ' blocked' : ''), onclick: () => act(() => startTroopDraft(S, 'levy')) },
      h('b', {}, 'Levy draft'), h('small', {}, `${lc.gold} ducats · ${lc.mp} men`)),
    h('button', { class: 'btn draft pro' + (draftBlocked(S, 'pro') ? ' blocked' : ''), onclick: () => act(() => startTroopDraft(S, 'pro')) },
      h('b', {}, 'Professional draft'), h('small', {}, `${pc.gold} ducats · ${pc.mp} men`))));
  body.append(h('p', { class: 'muted' }, `Drafts left this year: ${left}. Army ${S.troops.length}/${armyCap(S)}. Upkeep ${incomeOf(S, S.player).upkeep.toFixed(1)} a year. Each draft reveals 3 cards; you keep one.`));

  // forge
  const fb = h('div', { class: 'forge' + (forge.length ? ' active' : '') });
  fb.append(h('div', { class: 'forge-h' }, h('span', { html: icon('merge', 18) }), h('b', {}, 'Forge'), h('small', {}, 'Tap two cards to combine them')));
  if (forge.length === 2) {
    const r = mergePreview(S, forge[0], forge[1]);
    if ('error' in r) fb.append(h('p', { class: 'bad' }, r.error));
    else {
      fb.append(h('div', { class: 'forge-res' }, troopCard({ type: r.out, vet: r.vet, str: 100 }, { small: true }),
        h('div', {}, h('b', {}, `${TROOPS[r.out].name} ${'★'.repeat(r.vet)}`),
          h('p', { class: 'muted' }, r.tech ? `Needs research: ${TECH[r.tech].name}` : `${r.cost} ducats`),
          h('button', { class: 'btn primary' + (r.tech || me.gold < r.cost ? ' blocked' : ''), onclick: () => { const a = forge[0], b = forge[1]; forge = []; act(() => doMerge(S, a, b), 'Forged!'); } }, 'Forge'))));
    }
  } else if (forge.length === 1) fb.append(h('p', { class: 'muted' }, 'Now pick a second card.'));
  body.append(fb);

  const sel = (u: number) => {
    if (forge.includes(u)) forge = forge.filter(x => x !== u);
    else forge = [...forge.slice(-1), u];
    renderSheet();
  };
  body.append(h('h3', {}, `Troops (${S.troops.length})`));
  const tr = h('div', { class: 'cards-grid' });
  [...S.troops].sort((a, b) => TROOPS[b.type].tier - TROOPS[a.type].tier || b.vet - a.vet).forEach(t =>
    tr.append(troopCard(t, { selected: forge.includes(t.uid), onclick: () => (t.mission != null ? toast('This troop is away on a mission') : sel(t.uid)) })));
  body.append(tr);
  body.append(h('h3', {}, `Equipment (${S.equipment.length})`));
  const eq = h('div', { class: 'cards-grid' });
  if (!S.equipment.length) eq.append(h('p', { class: 'muted' }, 'Equipment comes from drafts, Armouries and Master Smith cards.'));
  S.equipment.forEach(e => eq.append(equipCard(e, { selected: forge.includes(e.uid), onclick: () => sel(e.uid) })));
  body.append(eq);
  if (forge.length === 1 && S.troops.some(t => t.uid === forge[0])) {
    const t = S.troops.find(x => x.uid === forge[0])!;
    body.append(h('button', { class: 'btn ghost danger', onclick: () => confirmBox(`Disband ${TROOPS[t.type].name}?`, 'The troop is removed. You recover 1 manpower.', 'Disband', () => { forge = []; act(() => disbandTroop(S, t.uid)); }) }, 'Disband selected troop'));
  }
  body.append(recipeBook());
  return [sheetHead('Army', `${S.troops.length} companies · power ${Math.round(armyPower(S.troops))}`), body];
}

function recipeBook() {
  const d = h('details', { class: 'recipes' }, h('summary', {}, 'Recipe book'));
  const rows: [string, string, string, string?][] = [
    ['Levy Infantry', 'Long Pikes', 'Pikemen', 'pike_square'], ['Levy Infantry', 'Plate Armour', 'Men-at-Arms'], ['Levy or Crossbow', 'Arquebuses', 'Arquebusiers', 'firearms'],
    ['Jinetes', 'Plate Armour', 'Knights'], ['Men-at-Arms', 'Warhorses', 'Knights'], ['Pikemen', 'Arquebusiers', 'Tercio', 'tercio_doctrine'],
    ['Bombard', 'Bronze Casting', 'Field Cannon', 'bronze_cannon'], ['Jinetes', 'Pistols', 'Reiters', 'wheellock'], ['Knights', 'Pistols', 'Cuirassiers', 'wheellock'],
    ['Arquebusiers', 'Muskets', 'Musketeers', 'musket'], ['Tercio', 'Muskets', 'Tercio Viejo', 'musket'], ['Reiters', 'Muskets', 'Dragoons', 'military_drill'],
    ['Musketeers', 'Bayonets', 'Line Infantry', 'bayonet'], ['Any two of the same', '', '+1 star'], ['Any troop', 'Regimental Colours', '+1 star'],
  ];
  d.append(h('table', { class: 'rtable' }, h('tbody', {}, rows.map(([a, b, c, t]) => h('tr', { class: t && !S.techs.includes(t) ? 'locked' : '' },
    h('td', {}, a), h('td', {}, b ? '+ ' + b : ''), h('td', {}, '= ', h('b', {}, c)), h('td', { class: 'muted' }, t && !S.techs.includes(t) ? TECH[t].name : ''))))));
  return d;
}

function courtSheet(body: HTMLElement) {
  const me = player(S);
  body.append(h('div', { class: 'ruler' },
    h('span', { class: 'np-shield', style: `--nc:${me.color}` }, me.name[0]),
    h('div', {}, h('b', {}, me.ruler.name), h('p', { class: 'muted' }, `Reigns since ${me.ruler.from}`),
      h('div', { class: 'tags' }, me.ruler.traits.map(t => h('span', { class: 'tag', title: RULER_TRAITS[t]?.desc }, t + ': ' + (RULER_TRAITS[t]?.desc ?? '')))))));
  const why = courtBlocked(S);
  body.append(actionRow('crown', 'Hold an audience', `${draftCost(S, 'court').gold} ducats · meet 3 candidates, keep one · legends may appear`, why, () => act(() => startCourtDraft(S))));
  body.append(h('h3', {}, `Court (${S.characters.length}/${courtCap(S)})`));
  const grid = h('div', { class: 'cards-grid' });
  for (const c of S.characters) grid.append(charCard(c, S, { onclick: () => charDetail(c) }));
  body.append(grid);
  return [sheetHead('Court', 'Generals, diplomats and administrators'), body];
}

function charDetail(c: Character) {
  const m = c.mission != null ? S.missions.find(x => x.id === c.mission) : null;
  openModal(h('div', { class: 'mbox narrow' },
    h('div', { class: 'center' }, charCard(c, S)),
    h('h2', {}, c.name),
    h('p', { class: 'muted' }, `${roleName[c.role]} · skill ${c.skill} · experience ${c.xp}/3 · age ${S.year - c.born}`),
    h('ul', { class: 'traits' }, c.traits.map(t => h('li', {}, h('b', {}, TRAITS[t]?.name ?? t), ' ', TRAITS[t]?.desc ?? ''))),
    m ? h('p', {}, `On a mission: ${MISSION_INFO[m.kind].name}, ${m.turnsLeft} year(s) left.`) : null,
    h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: closeModal }, 'Close'),
      !m ? h('button', { class: 'btn ghost danger', onclick: () => { closeModal(); confirmBox(`Dismiss ${c.name}?`, 'This frees a seat at court.', 'Dismiss', () => act(() => dismissCharacter(S, c.uid))); } }, 'Dismiss') : null)));
}

function missionsSheet(body: HTMLElement) {
  if (!S.missions.length) body.append(h('p', { class: 'muted' }, 'No missions under way. Tap a province or a nation to send someone.'));
  for (const m of S.missions) {
    const c = S.characters.find(x => x.uid === m.char);
    const info = MISSION_INFO[m.kind];
    const tname = S.provinces[m.target]?.name ?? S.nations[m.target]?.name ?? TECH[m.target]?.name ?? 'the realm';
    const pct = m.kind === 'research' ? Math.min(100, (m.progress / techCost(S, m.target)) * 100) : ((m.total - m.turnsLeft) / Math.max(1, m.total)) * 100;
    body.append(h('div', { class: 'mission k-' + info.role },
      h('span', { class: 'a-ico', html: icon(info.icon, 20) }),
      h('div', { class: 'a-t' }, h('b', {}, `${info.name}: ${m.kind === 'build' ? BUILDINGS[m.building!].name + ' in ' : ''}${tname}`),
        h('small', {}, `${c?.name ?? '?'}${m.troops.length ? ` with ${m.troops.length} troops` : ''} · ${m.turnsLeft} yr left`),
        h('div', { class: 'pbar' }, h('i', { style: `width:${pct}%` }))),
      h('button', { class: 'iconbtn', 'aria-label': 'Recall', title: 'Recall', onclick: () => confirmBox('Recall this mission?', m.kind === 'build' || m.kind === 'develop' ? 'Half the cost is refunded.' : 'Progress is lost.', 'Recall', () => act(() => cancelMission(S, m.id))), html: icon('close', 16) })));
  }
  body.append(h('h3', {}, 'Royal business'));
  body.append(actionRow('coin', 'Collect taxes', 'Administrator · 1 year · ducats now', missionBlocked(S, 'tax', ''), () => openPlanner('tax', '')));
  body.append(actionRow('crown', 'Royal progress', 'Administrator · 2 years · stability +1, prestige +2', missionBlocked(S, 'progress', ''), () => openPlanner('progress', '')));
  return [sheetHead('Missions', `${S.missions.length} under way`), body];
}

function researchSheet(body: HTMLElement) {
  const tracks: [string, string][] = [['military', 'Military'], ['economy', 'Economy'], ['state', 'Statecraft']];
  const wrap = h('div', { class: 'tech-cols' });
  for (const [tr, label] of tracks) {
    const col = h('div', { class: 'tech-col' }, h('h3', {}, label));
    for (const t of TECHS.filter(x => x.track === tr)) {
      const known = S.techs.includes(t.id);
      const m = S.missions.find(x => x.kind === 'research' && x.target === t.id);
      const why = known ? null : missionBlocked(S, 'research', t.id);
      const cost = techCost(S, t.id);
      col.append(h('button', { class: `tech${known ? ' known' : m ? ' active' : why ? ' locked' : ''}`, onclick: () => (known ? toast(t.desc) : m ? toast(`Being studied: ${m.turnsLeft} year(s) left`) : why ? toast(why, 'bad') : openPlanner('research', t.id)) },
        h('span', { class: 'tech-t' }, h('b', {}, t.name), h('small', {}, known ? 'Known' : m ? `${Math.floor(m.progress)}/${cost} · ${m.turnsLeft} yr` : `${t.year} · ${cost} pts${t.year > S.year ? ' (ahead of its time)' : ''}`)),
        h('span', { class: 'tech-d' }, t.desc)));
    }
    wrap.append(col);
  }
  body.append(wrap);
  return [sheetHead('Research', `${S.techs.length} of ${TECHS.length} known · send an administrator to study`), body];
}

function nationsSheet(body: HTMLElement) {
  const list = Object.values(S.nations).filter(n => n.alive && n.id !== S.player).sort((a, b) => getRel(S, S.player, b.id) - getRel(S, S.player, a.id));
  for (const n of list) {
    const rel = getRel(S, S.player, n.id);
    const war = atWar(S, S.player, n.id);
    const badges = [war ? 'War' : '', hasTreaty(S, S.player, n.id, 'alliance') ? 'Ally' : '', hasTreaty(S, S.player, n.id, 'trade') ? 'Trade' : '', hasTreaty(S, S.player, n.id, 'marriage') ? 'Wed' : ''].filter(Boolean);
    body.append(h('button', { class: 'nrow' + (war ? ' war' : ''), onclick: () => openSheet('nation', n.id) },
      h('span', { class: 'swatch', style: `background:${n.color}` }),
      h('span', { class: 'nr-name' }, n.name, h('small', {}, `${provsOf(S, n.id).length} provinces`)),
      h('span', { class: 'nr-badges' }, badges.map(b => h('span', { class: 'tag ' + b.toLowerCase() }, b))),
      h('span', { class: 'nr-rel ' + (rel >= 30 ? 'good' : rel <= -30 ? 'bad' : '') }, signed(rel))));
  }
  return [sheetHead('Nations', 'Relations, treaties and wars'), body];
}

function chronicleSheet(body: HTMLElement) {
  const a = AMBITIONS.find(x => x.id === S.ambition);
  if (a) body.append(h('div', { class: 'ambition' + (S.ambitionDone ? ' done' : '') }, h('span', { html: icon('crown', 20) }), h('div', {}, h('b', {}, `Ambition: ${a.name}`), h('small', {}, `${a.text} Reward: ${a.reward} prestige.${S.ambitionDone ? ' Resolved.' : ''}`))));
  body.append(h('h3', {}, 'Great powers'));
  const r = ranking(S).slice(0, 6);
  body.append(h('ol', { class: 'rank' }, r.map(x => h('li', { class: x.id === S.player ? 'me' : '' }, h('span', {}, x.name), h('b', {}, String(x.score))))));
  body.append(h('h3', {}, 'Chronicle'));
  body.append(h('ul', { class: 'log' }, S.log.slice(0, 60).map(l => h('li', { class: 't-' + l.tone }, h('span', { class: 'ly' }, String(l.year)), l.text))));
  return [sheetHead('Chronicle', `Score = prestige + 2 × development. The game ends in ${S.endYear}.`), body];
}

function realmSheet(body: HTMLElement) {
  const me = player(S);
  const inc = incomeOf(S, S.player);
  body.append(h('table', { class: 'ledger' }, h('tbody', {},
    h('tr', {}, h('td', {}, 'Provinces'), h('td', {}, inc.provinces.toFixed(1))),
    h('tr', {}, h('td', {}, 'Trade treaties'), h('td', {}, inc.trade.toFixed(1))),
    h('tr', {}, h('td', {}, 'Crown and overseas'), h('td', {}, inc.other.toFixed(1))),
    h('tr', {}, h('td', {}, `Stability ×${inc.stabMult.toFixed(2)}`), h('td', {}, '')),
    h('tr', {}, h('td', {}, 'Army upkeep'), h('td', { class: 'bad' }, '−' + inc.upkeep.toFixed(1))),
    h('tr', { class: 'total' }, h('td', {}, 'Each year'), h('td', {}, signed(inc.total))))));
  body.append(h('div', { class: 'stats' },
    stat('Manpower', `${fmt(me.manpower)} (+${manpowerGain(S, S.player).toFixed(1)})`), stat('Stability', me.stability),
    stat('Prestige', fmt(me.prestige)), stat('Provinces', provsOf(S, S.player).length)));
  body.append(h('p', { class: 'muted' }, 'Stability from −3 to +3 changes income by 6% a step. At −2 or lower, revolts break out. Raise it with Royal Progress, cards and cathedrals.'));
  body.append(h('button', { class: 'btn ghost', onclick: () => confirmBox('Abandon this campaign?', 'Your saved game will be replaced when you start a new one.', 'Back to title', () => { closeModal(); showTitle(); }) }, 'Back to title screen'));
  return [sheetHead(me.name, `${me.ruler.name} · ${S.year}`, me.color), body];
}

// ---------- modals ----------
function openModal(content: HTMLElement) {
  const m = clear($('#modal'));
  m.append(h('div', { class: 'scrim' }), content);
  m.hidden = false;
  modalOpen = true;
}
function closeModal() {
  const m = $('#modal');
  m.hidden = true; clear(m);
  modalOpen = false;
}
function confirmBox(title: string, text: string, okLabel: string, ok: () => void) {
  const prevOpen = modalOpen;
  if (prevOpen) return ok();
  openModal(h('div', { class: 'mbox narrow' }, h('h2', {}, title), h('p', {}, text),
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Cancel'), h('button', { class: 'btn primary', onclick: () => { closeModal(); ok(); } }, okLabel))));
}

function openCardModal(handUid: number) {
  const hc = S.hand.find(x => x.uid === handUid);
  if (!hc) return;
  const def = CARDS[hc.card];
  const blocked = cardBlocked(S, def);
  let target = '';
  const targets = h('div', { class: 'targets' });
  const playBtn = h('button', { class: 'btn primary' }, def.burden ? 'Pay it off' : 'Play card');
  const setBtn = () => playBtn.classList.toggle('blocked', !!blocked || (def.target !== 'none' && !target));
  playBtn.onclick = () => {
    if (blocked) return toast(blocked, 'bad');
    if (def.target !== 'none' && !target) return toast('Choose a target first', 'bad');
    const before = S.hand.length;
    const msg = playCard(S, handUid, target);
    closeModal();
    if (S.hand.length < before) toast(`${def.name}: ${msg}`, 'good'); else toast(msg, 'bad');
    refresh(); processQueue();
  };
  const pickT = (val: string, el: HTMLElement) => { target = val; targets.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); setBtn(); };
  if (!blocked && def.target === 'nation') {
    for (const n of Object.values(S.nations).filter(n => n.alive && n.id !== S.player && def.targetOk!(S, n.id))) {
      const b: HTMLElement = h('button', { class: 'tchip', style: `--nc:${n.color}`, onclick: () => pickT(n.id, b) }, h('span', { class: 'swatch', style: `background:${n.color}` }), n.name);
      targets.append(b);
    }
  } else if (!blocked && def.target === 'mission') {
    for (const m of S.missions.filter(m => def.targetOk!(S, String(m.id)))) {
      const tname = S.provinces[m.target]?.name ?? S.nations[m.target]?.name ?? TECH[m.target]?.name ?? '';
      const b: HTMLElement = h('button', { class: 'tchip', onclick: () => pickT(String(m.id), b) }, `${MISSION_INFO[m.kind].name}: ${tname} (${m.turnsLeft} yr)`);
      targets.append(b);
    }
  } else if (!blocked && def.target === 'troop') {
    const g = h('div', { class: 'cards-row' });
    for (const t of S.troops.filter(t => def.targetOk!(S, String(t.uid)))) {
      const c: HTMLElement = troopCard(t, { small: true, onclick: () => pickT(String(t.uid), c) });
      g.append(c);
    }
    targets.append(g);
  }
  setBtn();
  openModal(h('div', { class: 'mbox narrow' },
    h('div', { class: 'center' }, handCard(hc.card)),
    blocked ? h('p', { class: 'bad center' }, blocked) : def.target !== 'none' ? h('h3', {}, 'Choose a target') : null,
    targets,
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Keep it'), playBtn)));
}

// ---------- mission planner ----------
function openPlanner(kind: MissionKind, target: string, building?: string) {
  const info = MISSION_INFO[kind];
  const chars = S.characters.filter(c => c.role === info.role);
  const free = chars.filter(c => c.mission == null);
  if (!chars.length) { toast(`You have no ${roleName[info.role].toLowerCase()} at court. Hold an audience in the Court panel.`, 'bad'); return; }
  if (!free.length) { toast(`All your ${roleName[info.role].toLowerCase()}s are busy`, 'bad'); return; }
  const military = kind === 'conquer' || kind === 'raid';
  let ch = [...free].sort((a, b) => b.skill - a.skill)[0];
  const home = S.troops.filter(t => t.mission == null && t.str >= 30).sort((a, b) => armyPower([b]) - armyPower([a]));
  let picked: number[] = [];
  const maxTroops = () => ch.skill + 3;
  if (military) picked = home.slice(0, maxTroops()).map(t => t.uid);

  const tname = S.provinces[target]?.name ?? S.nations[target]?.name ?? TECH[target]?.name ?? 'the realm';
  const box = h('div', { class: 'mbox planner' });
  const draw = () => {
    clear(box);
    box.append(h('div', { class: 'pl-head' }, h('span', { class: 'a-ico', html: icon(info.icon, 22) }),
      h('div', {}, h('h2', {}, `${info.name}${kind === 'build' ? ': ' + BUILDINGS[building!].name : ''}`), h('p', { class: 'muted' }, `${info.verb} ${tname}`))));
    box.append(h('h3', {}, `Choose a ${roleName[info.role].toLowerCase()}`));
    const row = h('div', { class: 'cards-row' });
    for (const c of chars) {
      const busy = c.mission != null;
      let sub = '';
      if (DIPLO.includes(kind)) sub = `${Math.round(diploChance(S, kind, c, target) * 100)}%`;
      else if (kind === 'research') sub = `${missionTurns(S, kind, c, target)} yr`;
      else sub = `${missionTurns(S, kind, c, target, building)} yr`;
      const card = charCard(c, S, { small: true, selected: c.uid === ch.uid, dim: busy, badge: busy ? 'busy' : sub, onclick: () => { if (busy) return toast('Busy on another mission'); ch = c; if (military) picked = picked.slice(0, maxTroops()); draw(); } });
      row.append(card);
    }
    box.append(row);

    const turns = missionTurns(S, kind, ch, target, building);
    const facts: (string | HTMLElement)[] = [`${turns} year${turns > 1 ? 's' : ''}`];
    if (DIPLO.includes(kind)) facts.push(`${Math.round(diploChance(S, kind, ch, target) * 100)}% chance`);
    if (kind === 'research') facts.push(`${researchRate(S, ch)} research a year · ${techCost(S, target)} needed`);
    if (kind === 'build') facts.push(`${buildingCost(S, building!)} ducats now`);
    if (kind === 'develop') facts.push(`${developCost(S, target)} ducats now`);

    if (military) {
      box.append(h('h3', {}, `Troops (${picked.length}/${maxTroops()})`));
      const tr = h('div', { class: 'cards-row wrap' });
      if (!home.length) tr.append(h('p', { class: 'muted' }, 'No troops at home. Draft some in the Army panel.'));
      for (const t of home) tr.append(troopCard(t, { small: true, selected: picked.includes(t.uid), onclick: () => {
        if (picked.includes(t.uid)) picked = picked.filter(x => x !== t.uid);
        else if (picked.length < maxTroops()) picked = [...picked, t.uid]; else toast(`${ch.name} can lead ${maxTroops()} troops (skill + 3)`);
        draw();
      } }));
      box.append(tr);
      const prov = S.provinces[target];
      const enemy = S.nations[prov.owner];
      const mine = Math.round(armyPower(S.troops.filter(t => picked.includes(t.uid))) * (1 + 0.07 * ch.skill));
      const spied = (enemy.spiedUntil ?? 0) > S.year;
      const theirs = Math.round(armyPower([...enemy.army].sort((a, b) => armyPower([b]) - armyPower([a])).slice(0, kind === 'raid' ? 3 : 6)));
      facts.push(h('span', {}, `Your strength ${mine} vs `, spied ? h('b', {}, `${theirs}`) : h('b', {}, `~${Math.round(theirs * 0.8)}–${Math.round(theirs * 1.25)}`), ` · fort ${prov.fort}`));
      const home2 = S.troops.filter(t => t.mission == null && !picked.includes(t.uid)).length;
      if (home2 === 0) facts.push(h('span', { class: 'bad' }, 'No troops left at home to defend'));
    }
    box.append(h('div', { class: 'facts' }, facts.map(f => h('span', { class: 'fact' }, f))));
    const why = missionBlocked(S, kind, target, building) ?? (military && !picked.length ? 'Choose at least one troop' : null);
    box.append(h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: closeModal }, 'Cancel'),
      h('button', { class: 'btn primary' + (why ? ' blocked' : ''), onclick: () => {
        if (why) return toast(why, 'bad');
        const r = launchMission(S, kind, ch.uid, target, picked, building);
        if (r) return toast(r, 'bad');
        closeModal();
        toast(`${ch.name} sets out`, 'good');
        refresh();
      } }, 'Launch mission')));
  };
  draw();
  openModal(box);
}

// ---------- end turn & prompt queue ----------
async function onEndTurn() {
  if (modalOpen) return;
  if (S.queue.length) { processQueue(); return; }
  const goldBefore = player(S).gold;
  endTurn(S);
  closeSheetIfStale();
  refresh();
  await yearFlash(S.year, player(S).gold - goldBefore);
  processQueue();
}
function closeSheetIfStale() { if (sheet?.kind === 'province' && !S.provinces[sheet.arg!]) closeSheet(); }

async function yearFlash(year: number, dGold: number) {
  if (reduced()) { toast(`${year}: ${signed(dGold)} ducats`); return; }
  const f = h('div', { class: 'yearflash' }, h('span', {}, String(year)), h('small', {}, `${signed(dGold)} ducats`));
  document.body.append(f);
  await sleep(900);
  f.classList.add('out');
  setTimeout(() => f.remove(), 400);
}

function processQueue() {
  if (modalOpen || !S.queue.length) return;
  const p = S.queue[0];
  if (p.kind === 'reveal') showReveal(p.title, p.subtitle, p.items, () => { S.queue.shift(); afterPrompt(); });
  else if (p.kind === 'event') showEvent();
  else if (p.kind === 'draft') showDraft(p.draft, p.options);
  else if (p.kind === 'battle') showBattle(p.battle);
  else if (p.kind === 'gameover') showGameOver(p.victory, p.reason);
}
function afterPrompt() { closeModal(); refresh(); setTimeout(processQueue, 60); }

function infoCard(it: RevealItem) {
  return h('div', { class: `card k-info tone-${it.tone}` },
    h('div', { class: 'c-art', html: icon(it.kind ?? 'star', 30) }),
    h('div', { class: 'c-name c-title' }, it.title),
    h('div', { class: 'c-text' }, it.text));
}

async function flipAll(flips: { flip: () => void }[], delay = 380) {
  for (const f of flips) { await sleep(reduced() ? 0 : delay); f.flip(); }
}

function showReveal(title: string, subtitle: string | undefined, items: RevealItem[], done: () => void) {
  const row = h('div', { class: 'reveal-row' });
  const flips = items.map(it => { const f = flipCard(infoCard(it), ''); row.append(f.el); return f; });
  const btn = h('button', { class: 'btn primary', onclick: done }, 'Continue');
  openModal(h('div', { class: 'mbox reveal' }, h('h2', {}, title), subtitle ? h('p', { class: 'muted' }, subtitle) : null, row, h('div', { class: 'mrow' }, btn)));
  flipAll(flips);
}

function showEvent() {
  const p = S.queue[0];
  if (p.kind !== 'event') return;
  const e = EVENT[p.eventId];
  const front = h('div', { class: 'card k-event' },
    h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, e.history ? 'History' : 'Event')),
    h('div', { class: 'c-art', html: icon(e.art, 40) }),
    h('div', { class: 'c-name c-title' }, eventTitle(S, p.eventId, p.vars)),
    h('div', { class: 'c-text' }, e.text(S, p.vars)));
  const f = flipCard(front, e.history ? 'History' : 'Event', true);
  const opts = h('div', { class: 'ev-opts' });
  e.options.forEach((o, i) => {
    const why = o.can?.(S, p.vars) ?? null;
    opts.append(h('button', { class: 'btn opt' + (why ? ' blocked' : ''), onclick: () => {
      if (why) return toast(why, 'bad');
      const res = chooseEventOption(S, i);
      if (typeof res === 'string') return toast(res, 'bad');
      closeModal(); refresh();
      showReveal(eventTitle(S, p.eventId, p.vars), 'What came of it', res, afterPrompt);
    } }, h('b', {}, o.label), why ? h('small', {}, why) : o.hint ? h('small', {}, o.hint) : null));
  });
  opts.classList.add('hidden-opts');
  openModal(h('div', { class: 'mbox event' }, f.el, opts));
  setTimeout(() => { f.flip(); setTimeout(() => opts.classList.remove('hidden-opts'), reduced() ? 0 : 450); }, reduced() ? 0 : 350);
}

function draftFront(o: DraftOption) {
  if (o.t === 'troop') return troopCard({ type: o.type, vet: o.vet, str: 100 });
  if (o.t === 'equip') return equipCard({ type: o.type });
  if (o.t === 'char') return charCard(o.ch, S);
  const a = AMBITIONS.find(x => x.id === o.id)!;
  return h('div', { class: 'card k-event' }, h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, 'Ambition')),
    h('div', { class: 'c-art', html: icon('crown', 34) }), h('div', { class: 'c-name c-title' }, a.name), h('div', { class: 'c-text' }, a.text), h('div', { class: 'c-text gold' }, `+${a.reward} prestige`));
}

function showDraft(kind: string, options: DraftOption[]) {
  const titles: Record<string, [string, string]> = {
    levy: ['Levy draft', 'Three cards are drawn. Keep one.'], pro: ['Professional draft', 'Seasoned companies and fine gear. Keep one.'],
    court: ['An audience at court', 'Three candidates seek your favour. Keep one.'], ambition: ['Your ambition', 'Choose the goal your dynasty will pursue. Fulfil it for great prestige.'],
  };
  const [t, sub] = titles[kind];
  const row = h('div', { class: 'reveal-row' });
  let ready = false;
  const flips = options.map(o => {
    const front = draftFront(o);
    const f = flipCard(front, kind === 'ambition' ? 'Ambition' : kind === 'court' ? 'Court' : 'Draft');
    f.el.addEventListener('click', () => {
      if (!ready) return;
      takeDraftOption(S, o);
      S.queue.shift();
      const name = o.t === 'troop' ? TROOPS[o.type].name : o.t === 'equip' ? EQUIPMENT[o.type].name : o.t === 'char' ? o.ch.name : AMBITIONS.find(a => a.id === o.id)!.name;
      toast(`${name} chosen`, 'good');
      afterPrompt();
    });
    if (o.t === 'char' && o.ch.rarity === 'legendary') f.el.classList.add('legend');
    row.append(f.el);
    return f;
  });
  const hint = h('p', { class: 'muted center' }, 'Revealing…');
  openModal(h('div', { class: 'mbox reveal' }, h('h2', {}, t), h('p', { class: 'muted' }, sub), row, hint));
  flipAll(flips, 450).then(() => { ready = true; hint.textContent = 'Tap a card to keep it.'; });
}

// ---------- battle ----------
function unitChip(u: { type: string; vet: number; str: number; start: number; garrison?: boolean }) {
  const d = TROOPS[u.type];
  return h('div', { class: 'uchip' + (u.str <= 0 ? ' dead' : '') },
    h('span', { html: icon(d.icon, 16) }), h('span', { class: 'u-n' }, d.name + (u.vet ? ' ' + '★'.repeat(u.vet) : '')),
    h('span', { class: 'u-bar' }, h('i', { style: `width:${Math.max(0, u.str)}%` })));
}

function showBattle(b: Battle) {
  const me = b.playerSide === 'att' ? b.att : b.def;
  const foe = b.playerSide === 'att' ? b.def : b.att;
  const prov = S.provinces[b.province];
  const box = h('div', { class: 'mbox battle' });
  let busy = false;

  const draw = (last?: { mine: string; theirs: string; myC: boolean; theirC: boolean; dmgMe: number; dmgThem: number }) => {
    clear(box);
    const foeName = foe.nation === 'rebels' ? 'Rebels' : nationName(S, foe.nation);
    const ctx = { conquer: 'Siege of', defend: 'Defence of', raid: 'Raid on', rebels: 'Fighting at' }[b.context];
    box.append(h('div', { class: 'b-head' }, h('h2', {}, `${ctx} ${prov.name}`), h('p', { class: 'muted' }, `Round ${Math.min(3, b.round + (b.done ? 0 : 1))} of 3 · ${foeName}${foe.fort ? ` · fort ${foe.fort}` : me.fort ? ` · your fort ${me.fort}` : ''}`)));
    const side = (sd: typeof me, label: string, cls: string) => h('div', { class: 'b-side ' + cls },
      h('div', { class: 'b-label' }, h('b', {}, label), h('small', {}, sd.general ? `${sd.general.name} · skill ${sd.general.skill}` : 'No general'),
        h('span', { class: 'hpbar' }, h('i', { style: `width:${Math.round(ratio(sd) * 100)}%` }), h('em', { style: `left:${breakLevel(sd) * 100}%`, title: 'Breaking point' }), h('span', {}, `${Math.round(ratio(sd) * 100)}%`))),
      h('div', { class: 'uchips' }, sd.units.map(unitChip)));
    box.append(side(foe, foeName, 'foe'));
    // tactic slots
    const slotFoe = h('div', { class: 'slot' });
    const slotMe = h('div', { class: 'slot' });
    if (last) {
      slotFoe.append(tacticCard(last.theirs, { small: true, cls: last.theirC ? 'countered' : '' }));
      slotMe.append(tacticCard(last.mine, { small: true, cls: last.myC ? 'countered' : '' }));
    } else if (!b.done) {
      slotFoe.append(b.scout ? tacticCard(b.enemyNext, { small: true, cls: 'scouted' }) : backCard('?', { small: true }));
      slotMe.append(h('div', { class: 'slot-empty' }, 'Your tactic'));
    }
    const mid = h('div', { class: 'b-mid' }, slotFoe, h('div', { class: 'vs' }, last ? h('div', { class: 'dmg' },
      h('span', { class: 'good' }, `You deal ${last.dmgThem}`), h('span', { class: 'bad' }, `You take ${last.dmgMe}`),
      last.theirC ? h('span', { class: 'good' }, 'Their tactic was countered!') : null, last.myC ? h('span', { class: 'bad' }, 'Your tactic was countered!') : null) : 'vs'), slotMe);
    box.append(mid);
    box.append(side(me, 'Your army', 'mine'));
    if (b.done) {
      const out = b.result ?? (b.result = finishBattle(S, b));
      save();
      box.append(h('div', { class: 'b-result ' + (out.good ? 'win' : 'loss') }, h('h3', {}, out.title), ...out.lines.map(l => h('p', {}, l))),
        h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); afterPrompt(); } }, 'Continue')));
      return;
    }
    if (last) {
      box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => draw() }, 'Next round')));
      return;
    }
    box.append(h('p', { class: 'muted center' }, b.scout ? 'Your scouts have seen the enemy\'s plan.' : 'Choose a tactic. The enemy has already chosen theirs, face-down.'));
    const opts = h('div', { class: 'cards-row center' });
    for (const t of b.options) opts.append(tacticCard(t, { onclick: () => commit(t) }));
    box.append(opts);
    box.append(h('p', { class: 'muted small center' }, COUNTER_TEXT));
    box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: () => { autoResolve(S, b); draw(); } }, 'Auto-resolve')));
  };
  const commit = (t: string) => {
    if (busy) return;
    busy = true;
    const beforeMe = hp(me), beforeFoe = hp(foe);
    const lg = playRound(S, b, t);
    const mineTac = b.playerSide === 'att' ? lg.attTactic : lg.defTactic;
    const theirTac = b.playerSide === 'att' ? lg.defTactic : lg.attTactic;
    const myC = b.playerSide === 'att' ? lg.attCountered : lg.defCountered;
    const theirC = b.playerSide === 'att' ? lg.defCountered : lg.attCountered;
    draw({ mine: mineTac, theirs: theirTac, myC, theirC, dmgMe: Math.round(beforeMe - hp(me)), dmgThem: Math.round(beforeFoe - hp(foe)) });
    box.querySelectorAll('.slot .card').forEach(c => c.classList.add('slam'));
    busy = false;
  };
  void TACTICS;
  draw();
  openModal(box);
}

function showGameOver(victory: boolean, reason: string) {
  const r = ranking(S);
  openModal(h('div', { class: 'mbox narrow' },
    h('h2', {}, victory ? 'A lasting empire' : 'The end of an age'), h('p', {}, reason),
    h('ol', { class: 'rank' }, r.slice(0, 8).map(x => h('li', { class: x.id === S.player ? 'me' : '' }, h('span', {}, x.name), h('b', {}, String(x.score))))),
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); closeModal(); refresh(); } }, 'Look at the map'),
      h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); closeModal(); try { localStorage.removeItem(KEY); } catch { /* */ } showTitle(); } }, 'New campaign'))));
}
