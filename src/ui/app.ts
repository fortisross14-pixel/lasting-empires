import type { GameState, MissionKind, DraftOption, RevealItem, Battle, Character, Cat, Heir } from '../types';
import { CATS } from '../types';
import { NATIONS, RULER_ARCHS } from '../data/nations';
import { TROOPS, EQUIPMENT, COUNTER_TEXT } from '../data/troops';
import { TECHS, TECH, BUILDINGS, type TechTrack } from '../data/techs';
import { TRAITS, RARITY, OUTCOME_ODDS, OUTCOMES } from '../data/characters';
import { GOODS } from '../data/goods';
import { REGIONS } from '../data/overseas';
import {
  player, provsOf, incomeOf, playerManpower, getRel, atWar, hasTreaty, enemiesOf, alliesOf, armyPower,
  armyCap, courtCap, courtCount, provinceIncome, buildingAllowed, buildingCost, roleName, nationName, inTruce,
  tierOf, TIERS, population, townSlots, ruralSlots, builtAt, ownGoods, colonyGoods, coreSlots,
} from '../engine/core';
import { newGame, endTurn, chooseEventOption, playerDeclareWar, warCost, ranking, powerTable, dismissCharacter, disbandTroop, chooseHeir, SAVE_VERSION, coreBlocked, coreCost, adoptCore, dropCore, migrate } from '../engine/turn';
import { EVENT, eventTitle, upcomingHistory } from '../engine/events';
import { CARDS, CAT_INFO, handOf, cardRates, npRate, buyCost, playCard, cardBlocked, troopHireCost, discardCard, HAND_LIMIT, cardFor } from '../engine/cards';
import {
  MISSION_INFO, DIPLO, missionBlocked, launchMission, cancelMission, diploChance, missionTurns, techCost, researchRate, attackRoute,
  developCost, foundCost, growCost, importable, cardRole, voyageCost, GRADES,
} from '../engine/missions';
import { buyCard, buyBlocked, hireWithCard, takeDraftOption, mergePreview, doMerge, AMBITIONS } from '../engine/drafts';
import { regionState, discoverable, exploreChance, colonizeChance, conquistaChance, colonizeBlocked, promote, promoteBlocked, PROMOTION, colonyCost } from '../engine/overseas';
import { playRound, autoResolve, finishBattle, ratio, breakLevel, hp } from '../engine/battle';
import { getGeo } from '../engine/map';
import { h, $, clear, sleep, reduced, fmt, signed } from './dom';
import { icon } from './icons';
import { troopCard, charCard, handCard, tacticCard, backCard, flipCard, coreCard } from './cards';
import { AXES, CORE } from '../data/core';
import { navyCap, transportOf, hireShip, shipHireCost } from '../engine/navy';
import { warScore, peaceTerms, enemyDemands, concludePeace, subjectsOf, integrateBlocked, vassalizeBlocked, tributeShare } from '../engine/diplo';
import { happinessOf, moodName, CULTURE_NAMES, RELIGION_NAMES, isAccepted } from '../engine/society';
import { MapView } from './map';

const KEY = 'lasting-empires.save.v2';
let S: GameState;
let map: MapView;
let sheet: { kind: string; arg?: string } | null = null;
let modalOpen = false;
let forge: number[] = [];
let chronTab = 'powers';
void vassalizeBlocked;
const RARITY_ORDER_I = (c: Character) => ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(c.rarity);

// ---------- persistence ----------
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage may be blocked */ } }
function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === SAVE_VERSION ? migrate(s) : null;
  } catch { return null; }
}
export function snapshot() { return S ? { save: JSON.stringify(S) } : {}; }

// ---------- menu styles ----------
const STYLE_KEY = 'lasting-empires.style';
export const STYLES = [
  { id: 'chancery', name: 'Chancery', desc: 'Letters, wax seals and woodcuts', sw: ['#e9e5da', '#9e1f2a', '#2a4b8c'] },
  { id: 'portolan', name: 'Chart Table', desc: 'Dark sea chart, lacquer and gold', sw: ['#152126', '#d6ad55', '#17333b'] },
  { id: 'heraldic', name: 'Heraldic Court', desc: 'Royal purple, banners, bright gold', sw: ['#1f1638', '#e7b93f', '#1a2546'] },
];
function currentStyle() {
  let v: string | null = null;
  try { v = localStorage.getItem(STYLE_KEY); } catch { /* */ }
  if (!v || v === 'manuscript') v = 'chancery';
  return STYLES.some(x => x.id === v) ? v : 'chancery';
}
export function applyStyle(id = currentStyle()) {
  if (id === 'portolan') delete document.documentElement.dataset.style; else document.documentElement.dataset.style = id;
}
function setStyle(id: string) { try { localStorage.setItem(STYLE_KEY, id); } catch { /* */ } applyStyle(id); }
function stylePicker(onChange: () => void) {
  const cur = currentStyle();
  return h('div', { class: 'stylepick' }, STYLES.map(st => h('button', { class: st.id === cur ? 'on' : '', onclick: () => { setStyle(st.id); onChange(); } },
    h('span', { class: 'sw' }, st.sw.map(c => h('i', { style: `background:${c}` }))), h('b', {}, st.name), h('small', { class: 'muted' }, st.desc))));
}

// ---------- shell ----------
export function boot(data: { save?: string }) {
  applyStyle();
  clear($('#app'));
  let restored: GameState | null = null;
  if (data?.save) { try { restored = JSON.parse(data.save); } catch { /* ignore */ } }
  if (restored && !restored.over && restored.version === SAVE_VERSION) { start(migrate(restored)); return; }
  showTitle();
}

function showTitle() {
  const root = clear($('#app'));
  const saved = loadSave();
  root.append(h('div', { class: 'title-screen' },
    h('div', { class: 'title-inner' },
      h('p', { class: 'eyebrow' }, 'Anno Domini 1453 – 1750'),
      h('h1', { class: 'title' }, 'Lasting Empires'),
      h('p', { class: 'lede' }, 'Every action is a card. Gather Military, Diplomacy, Internal, Economy and Research cards each year, then send your people on missions. One turn is one year.'),
      saved && !saved.over ? h('button', { class: 'btn primary wide', onclick: () => start(saved) }, `Continue as ${saved.nations[saved.player].name}, ${saved.year}`) : null,
      h('h2', { class: 'pick-h' }, 'Menu style'),
      stylePicker(showTitle),
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
          h('li', {}, 'You draw about one card of each kind a year. Buildings, research and your monarch raise those rates. Spend nation points to buy more (pick 1 of 3).'),
          h('li', {}, 'Mission cards need a person: generals, diplomats, administrators, merchants and researchers. Each has a rarity from Common to Legendary.'),
          h('li', {}, 'Manpower is scarce: hiring a troop or a person costs 1. Ducats pay for troops, building salaries and imported goods.'),
          h('li', {}, 'Forge troops in the Military panel: Levy + Long Pikes = Pikemen; Pikemen + Arquebusiers = Tercio.'),
          h('li', {}, 'In battle both sides play a tactic face-down. Counter the enemy and they take extra damage.'),
          h('li', {}, 'Diplomats can become Explorers, generals Conquerors, administrators Colonists, to win lands overseas. There is no going back.'),
        )))));
}

function start(s: GameState) {
  S = s;
  const root = clear($('#app'));
  root.append(
    h('header', { id: 'top' }),
    h('main', { id: 'board' }, h('div', { id: 'timeline' }), h('div', { id: 'zoom' },
      h('button', { class: 'zbtn', 'aria-label': 'Zoom in', onclick: () => map.zoomBy(0.75), html: icon('plus', 18) }),
      h('button', { class: 'zbtn', 'aria-label': 'Zoom out', onclick: () => map.zoomBy(1.33), html: '<svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path d="M5 12 H19"/></svg>' }),
      h('button', { class: 'zbtn', 'aria-label': 'Show my realm', onclick: () => map.focus(provsOf(S, S.player).map(p => p.id)), html: icon('crown', 18) }),
      h('button', { class: 'zbtn', 'aria-label': 'Overseas', title: 'Overseas', onclick: () => toggleSheet('overseas'), html: icon('anchor', 18) })),
      h('div', { id: 'tracker' })),
    h('aside', { id: 'sheet', hidden: true }),
    h('nav', { id: 'tabs' }),
    h('div', { id: 'modal', hidden: true }),
    h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }),
  );
  map = new MapView($('#board'));
  map.onSelect = id => { if (id) openSheet('province', id); else if (sheet?.kind === 'province') closeSheet(); };
  document.documentElement.style.setProperty('--me', player(S).color);
  refresh();
  requestAnimationFrame(() => map.focus(provsOf(S, S.player).map(p => p.id), 120));
  processQueue();
}

function refresh() {
  renderTop(); renderTabs(); map.render(S); renderTimeline(); renderTracker();
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
  const mp = playerManpower(S);
  const top = clear($('#top'));
  top.append(
    h('button', { class: 'crest', onclick: () => toggleSheet('realm'), style: `--nc:${me.color}` },
      h('span', { class: 'np-shield sm' }, me.name[0]),
      h('span', { class: 'crest-t' }, h('b', {}, me.name), h('small', {}, me.ruler.name))),
    h('div', { class: 'year' }, h('span', { class: 'year-n' }, String(S.year)), h('small', {}, 'A.D.')),
    h('div', { class: 'res' },
      chip('coin', fmt(me.gold), signed(inc.total), 'Ducats', inc.total < 0 ? 'bad' : ''),
      chip('people', String(Math.floor(me.manpower)), '+' + mp.gain.toFixed(1), 'Manpower'),
      chip('star', S.np.toFixed(1), '+' + npRate(S).rate.toFixed(1), 'Nation points'),
      h('button', { class: 'chip stab', title: 'Stability', onclick: () => toggleSheet('realm') },
        h('span', { html: icon('scales', 16) }),
        h('span', { class: 'pips' }, ...[-3, -2, -1, 0, 1, 2, 3].map(v => h('i', { class: (v === 0 ? 'zero ' : '') + (me.stability >= v && v > 0 ? 'on' : me.stability <= v && v < 0 ? 'neg' : '') }))),
        h('span', { class: 'sr' }, `Stability ${me.stability}`)),
      chip('mood', `${S.happiness ?? 50}%`, moodName(S.happiness ?? 50), 'Happiness'),
      chip('laurel', fmt(me.prestige), '', 'Prestige'),
    ),
    h('div', { class: 'top-btns' },
      h('button', { class: 'tbtn' + (sheet?.kind === 'missions' ? ' on' : ''), onclick: () => toggleSheet('missions'), title: 'Missions' },
        h('span', { html: icon('hourglass', 18) }), h('span', { class: 'tb-l' }, 'Missions'), S.missions.length ? h('span', { class: 'badge' }, String(S.missions.length)) : null),
      h('button', { class: 'tbtn' + (sheet?.kind === 'chronicle' ? ' on' : ''), onclick: () => toggleSheet('chronicle'), title: 'Chronicle' },
        h('span', { html: icon('laurel', 18) }), h('span', { class: 'tb-l' }, 'Chronicle'))),
  );
}
function chip(ic: string, v: string, sub: string, label: string, tone = '') {
  return h('button', { class: 'chip ' + tone, title: label, onclick: () => toggleSheet('realm') }, h('span', { html: icon(ic, 16) }), h('b', {}, v), sub ? h('small', {}, sub) : null, h('span', { class: 'sr' }, label));
}

function renderTabs() {
  const nav = clear($('#tabs'));
  const rates = cardRates(S);
  for (const c of CATS) {
    const n = handOf(S, c).length;
    nav.append(h('button', { class: 'tab' + (sheet?.kind === c ? ' on' : ''), onclick: () => toggleSheet(c), style: `--cc:${CAT_INFO[c].color}` },
      h('span', { class: 'tab-i', html: icon(CAT_INFO[c].icon, 20) }),
      h('span', { class: 'tab-l' }, c === 'diplomacy' ? 'Diplomacy' : CAT_INFO[c].name),
      h('span', { class: 'tab-n' }, `${n} · +${rates[c].rate.toFixed(1)}`)));
  }
  nav.append(h('button', { id: 'endturn', class: 'btn primary', onclick: onEndTurn }, h('span', { class: 'et-l' }, 'End Year'), h('small', {}, `${S.year} → ${S.year + 1}`)));
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

function missionTitle(m: GameState['missions'][number]) {
  const tname = S.provinces[m.target]?.name ?? S.nations[m.target]?.name ?? TECH[m.target]?.name ?? REGIONS[m.target]?.name ?? '';
  return `${MISSION_INFO[m.kind].name}${m.kind === 'build' ? ': ' + BUILDINGS[m.building!].name : ''}${tname ? ' · ' + tname : ''}`;
}

function renderTracker() {
  const tr = clear($('#tracker'));
  for (const m of S.missions.slice(0, 8)) {
    tr.append(h('button', { class: 'trk', onclick: () => openSheet('missions') },
      h('span', { html: icon(MISSION_INFO[m.kind].icon, 14) }), h('span', { class: 'trk-t' }, missionTitle(m)), h('b', {}, `${m.turnsLeft}y`)));
  }
  if (S.missions.length > 8) tr.append(h('button', { class: 'trk', onclick: () => openSheet('missions') }, `+${S.missions.length - 8} more`));
}

// ---------- sheets ----------
function toggleSheet(kind: string, arg?: string) {
  if (sheet && sheet.kind === kind && sheet.arg === arg) closeSheet(); else openSheet(kind, arg);
}
function openSheet(kind: string, arg?: string) {
  if (kind !== 'military') forge = [];
  sheet = { kind, arg };
  $('#sheet').hidden = false;
  refresh();
}
function closeSheet() {
  sheet = null; forge = [];
  $('#sheet').hidden = true;
  map.select(null);
  refresh();
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
  const scroll = $('#sheet .sh-body')?.scrollTop ?? 0;
  let parts: HTMLElement[] = [];
  if (k === 'province') parts = provinceSheet(sheet.arg!, body);
  else if (k === 'nation') parts = nationSheet(sheet.arg!, body);
  else if (k === 'military') parts = militarySheet(body);
  else if (k === 'diplomacy') parts = diplomacySheet(body);
  else if (k === 'internal') parts = internalSheet(body);
  else if (k === 'economy') parts = economySheet(body);
  else if (k === 'research') parts = researchSheet(body);
  else if (k === 'missions') parts = missionsSheet(body);
  else if (k === 'chronicle') parts = chronicleSheet(body);
  else if (k === 'realm') parts = realmSheet(body);
  else if (k === 'overseas') parts = overseasSheet(body);
  el.append(...parts);
  body.scrollTop = scroll;
}

const gradeLabel = (g: number) => { const d = GRADES.find(x => x.mult === g); return d && d.mult !== 1 ? ` (${d.name})` : ''; };

function oddsLine(c?: Character | null) {
  const odds = OUTCOME_ODDS[c?.rarity ?? 'common'];
  return h('div', { class: 'odds' }, ...odds.map((v, i) => h('span', { class: 'odd o' + i, style: `flex:${Math.max(v, 1.5)}`, title: `${OUTCOMES[i].name} ${v}%` }, `${OUTCOMES[i].name} ${v < 1 ? v : Math.round(v)}%`)));
}

const stat = (label: string, value: string | number | HTMLElement) => h('div', { class: 'stat' }, h('span', {}, label), typeof value === 'object' ? value : h('b', {}, String(value)));

function actionRow(ic: string, title: string, sub: string, blocked: string | null, onclick: () => void, tone = '') {
  return h('button', { class: `action ${tone}${blocked ? ' blocked' : ''}`, onclick: () => (blocked ? toast(blocked, 'bad') : onclick()) },
    h('span', { class: 'a-ico', html: icon(ic, 20) }),
    h('span', { class: 'a-t' }, h('b', {}, title), h('small', {}, blocked ?? sub)),
    h('span', { class: 'a-go', html: icon('next', 14) }));
}

/** The card section at the top of every category panel. */
function cardSection(cat: Cat) {
  const rate = cardRates(S)[cat];
  const hand = handOf(S, cat);
  const pct = Math.round((S.cardAccum[cat] ?? 0) * 100);
  const wrap = h('div', { class: 'cardsec', style: `--cc:${CAT_INFO[cat].color}` });
  wrap.append(h('div', { class: 'cs-head' },
    h('b', {}, `Your ${CAT_INFO[cat].name.toLowerCase()} cards (${hand.length}/${HAND_LIMIT})`),
    h('small', { title: rate.parts.map(p => `${p.label} ${signed(p.v)}`).join(', ') }, `+${rate.rate.toFixed(2)} a year · next card ${pct}%`)));
  const row = h('div', { class: 'cards-row wrap' });
  if (!hand.length) row.append(h('p', { class: 'muted' }, 'No cards yet. You draw them every year, or buy one below.'));
  for (const c of hand) row.append(handCard(c.card, { small: true, dim: !!cardBlocked(S, CARDS[c.card]) && CARDS[c.card].kind !== 'mission', onclick: () => openCardModal(c.uid) }));
  wrap.append(row);
  const why = buyBlocked(S, cat);
  wrap.append(h('button', { class: 'btn buy' + (why ? ' blocked' : ''), onclick: () => act(() => buyCard(S, cat)) },
    h('span', { html: icon('star', 16) }), h('b', {}, `Buy a card · ${buyCost(S, cat)} nation points`), h('small', {}, why ?? 'Three are revealed, you keep one')));
  return wrap;
}

function peopleSection(roles: Character['role'][], title: string, empty = 'Nobody yet. Play a hiring card to recruit someone.') {
  const ppl = S.characters.filter(c => roles.includes(c.role));
  const grid = h('div', { class: 'cards-row wrap' });
  if (!ppl.length) grid.append(h('p', { class: 'muted' }, empty));
  for (const c of ppl) grid.append(charCard(c, S, { small: true, onclick: () => charDetail(c) }));
  return [h('h3', {}, `${title} (${ppl.length})`), grid];
}

// ---------- province ----------
function provinceSheet(id: string, body: HTMLElement) {
  const p = S.provinces[id];
  const owner = S.nations[p.owner];
  const mine = p.owner === S.player;
  const g = getGeo();
  const tier = tierOf(p);
  body.append(h('div', { class: 'stats' },
    stat(TIERS[tier].name, `${(population(S, p) / 1000).toFixed(0)}k people`), stat('Development', p.dev),
    stat('Control', `${Math.round(p.control)}%`), stat('Produces', GOODS[p.good]?.name ?? p.good),
    stat('Income', provinceIncome(S, id).toFixed(1)), stat('Fort', p.fort ? '▮'.repeat(p.fort) : 'none'),
    g.coastal[id] ? stat('Coast', 'yes') : null,
    stat('Culture', `${CULTURE_NAMES[p.culture] ?? p.culture}${mine && !isAccepted(S, p.culture) ? ' (foreign)' : ''}`), stat('Faith', RELIGION_NAMES[p.religion] ?? p.religion)));
  if (mine) {
    const hp = happinessOf(S, p);
    body.append(h('div', { class: 'mood' }, h('div', { class: 'mood-h' }, h('b', {}, `Happiness ${hp.value}%`), h('small', {}, moodName(hp.value))),
      h('div', { class: 'ctl-bar' }, h('i', { style: `width:${hp.value}%`, class: hp.value < 35 ? 'low' : '' })),
      h('div', { class: 'tags' }, hp.parts.filter(x => x.label !== 'Base').map(x => h('span', { class: 'tag ' + (x.v < 0 ? 'war' : 'ally') }, `${x.label} ${signed(x.v)}`)))));
  }
  const site = (sname: 'town' | 'rural', label: string) => {
    const blds = p.buildings.filter(b => BUILDINGS[b]?.site === sname);
    const slots = sname === 'town' ? townSlots(p) : ruralSlots(p);
    return h('div', { class: 'site' }, h('h3', {}, `${label} (${builtAt(p, sname)}/${slots})`),
      h('div', { class: 'tags' }, blds.length ? blds.map(b => h('span', { class: 'tag', html: icon(BUILDINGS[b].icon, 14) + ' ' + BUILDINGS[b].name + gradeLabel(p.grades?.[b] ?? 1) })) : h('span', { class: 'muted' }, sname === 'town' && !p.settlement ? 'No town yet. Found a settlement to build here.' : 'Nothing built yet')));
  };
  body.append(site('town', TIERS[tier].name), site('rural', 'Countryside'));
  if (mine) {
    body.append(h('h3', {}, 'Actions'));
    const devCard = cardFor(S, 'develop');
    body.append(actionRow('wheat', 'Develop', `+1 development · ${developCost(S, id)} ducats · uses Settlers or Irrigation`, !devCard ? 'Needs a Settlers (Internal) or Irrigation (Economy) card' : missionBlocked(S, 'develop', id), () => openPlanner('develop', id, undefined, devCard!.uid)));
    if (p.religion !== S.stateReligion) {
      const rc = cardFor(S, 'convert');
      body.append(actionRow('church', 'Religious mission', `Convert to the ${RELIGION_NAMES[S.stateReligion]} faith · 4 years`, !rc ? 'Needs a Religious Mission card (Internal)' : missionBlocked(S, 'convert', id), () => openPlanner('convert', id, undefined, rc!.uid)));
    }
    if (!isAccepted(S, p.culture)) {
      const ac = cardFor(S, 'assimilate');
      body.append(actionRow('scroll', 'Cultural integration', `Bring the ${CULTURE_NAMES[p.culture] ?? p.culture} people into your ways · 5 years`, !ac ? 'Needs a Cultural Integration card (Internal)' : missionBlocked(S, 'assimilate', id), () => openPlanner('assimilate', id, undefined, ac!.uid)));
    }
    if (!p.settlement) {
      const fc = cardFor(S, 'found');
      body.append(actionRow('tower', 'Found a settlement', `A village, town or city, depending on your administrator · ${foundCost(S)} ducats`, !fc ? 'Needs a Found a Settlement card (Internal)' : missionBlocked(S, 'found', id), () => openPlanner('found', id, undefined, fc!.uid)));
    } else if (p.settlement < 4) {
      const gc = cardFor(S, 'grow');
      body.append(actionRow('tower', `Grow the ${TIERS[tierOf(p)].name.toLowerCase()}`, `Up to a ${TIERS[(['none', 'village', 'town', 'city', 'metropolis'] as const)[p.settlement + 1]].name.toLowerCase()} · ${growCost(S, id)} ducats`, !gc ? 'Needs a Grow your Settlement card (Internal)' : missionBlocked(S, 'grow', id), () => openPlanner('grow', id, undefined, gc!.uid)));
    }
    for (const [siteName, label] of [['town', 'Build in town'], ['rural', 'Build in the countryside']] as const) {
      body.append(h('h3', {}, label));
      for (const b of Object.values(BUILDINGS).filter(b => b.site === siteName)) {
        const why = buildingAllowed(S, id, b.id);
        if (why && (why.startsWith('Needs Ocean') || why === 'Coastal provinces only')) continue;
        const card = cardFor(S, 'build', { group: b.group });
        const need = b.group === 'internal' ? 'Royal Works (Internal)' : 'Guild Charter (Economy)';
        const block = why ?? (!card ? `Needs a ${need} card` : player(S).gold < buildingCost(S, b.id) ? `Needs ${buildingCost(S, b.id)} ducats` : null);
        body.append(actionRow(b.icon, b.name, `${b.desc} · ${buildingCost(S, b.id)} ducats · salary ${b.salary}/yr`, block, () => openPlanner('build', id, b.id, card!.uid)));
      }
    }
  } else {
    const war = atWar(S, S.player, p.owner);
    if (war) {
      const route = attackRoute(S, id);
      const card = cardFor(S, 'conquer');
      body.append(h('h3', {}, 'At war'));
      const block = !card ? 'Needs a March Orders card (Military)' : null;
      body.append(actionRow('sword', `Conquer ${p.name}`, route ? `${route.naval ? 'By sea' : 'Over land'} · ${route.turns} yr march` : 'No route', block ?? missionBlocked(S, 'conquer', id), () => openPlanner('conquer', id, undefined, card!.uid)));
      body.append(actionRow('torch', `Raid ${p.name}`, 'Plunder ducats, take no land', block ?? missionBlocked(S, 'raid', id), () => openPlanner('raid', id, undefined, card!.uid)));
    }
    body.append(actionRow('hands', owner.name, `Relations ${getRel(S, S.player, p.owner)} · open diplomacy`, null, () => openSheet('nation', p.owner)));
    if (!war) body.append(declareWarRow(p.owner));
    body.append(armyIntel(p.owner));
  }
  return [sheetHead(p.name, mine ? `Your province · ${TIERS[tier].name}` : `${owner.name}${p.core !== p.owner ? ` · formerly ${nationName(S, p.core)}` : ''}`, owner.color), body];
}

function armyIntel(n: string) {
  const nat = S.nations[n];
  if ((nat.spiedUntil ?? 0) > S.year) {
    return h('div', { class: 'intel' }, h('h3', {}, `${nat.adj} army (spies)`), h('div', { class: 'cards-row wrap' }, nat.army.slice(0, 12).map(t => troopCard(t, { small: true }))));
  }
  const n2 = nat.army.length;
  return h('div', { class: 'intel' }, h('h3', {}, `${nat.adj} army`), h('p', { class: 'muted' }, `Scouts count about ${Math.max(0, n2 - 1)}–${n2 + 2} companies. A Spy Network card reveals them.`));
}

function declareWarRow(n: string) {
  const truce = inTruce(S, S.player, n);
  const cost = warCost(S, n);
  return actionRow('sword', `Declare war on ${nationName(S, n)}`, cost ? `Stability −${cost}${cost > 1 ? ' (breaks your treaty)' : ''}` : 'You hold a claim: no stability loss', truce ? 'A truce is in force' : null,
    () => confirmBox(`Declare war on ${nationName(S, n)}?`, cost ? `Stability falls by ${cost}. Their allies may join them.` : 'Your claim justifies the war.', 'Declare war', () => act(() => playerDeclareWar(S, n), 'War declared')), 'danger');
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
  const goods = [...ownGoods(S, id)].map(g => GOODS[g]?.name ?? g);
  body.append(h('p', { class: 'muted' }, `Goods: ${goods.join(', ') || 'none'}.`));
  const theirWars = enemiesOf(S, id).filter(e => e !== S.player).map(e => nationName(S, e));
  const theirAllies = alliesOf(S, id).map(e => nationName(S, e));
  if (theirWars.length || theirAllies.length) body.append(h('p', { class: 'muted' }, [theirAllies.length ? `Allies: ${theirAllies.join(', ')}.` : '', theirWars.length ? ` At war with ${theirWars.join(', ')}.` : ''].join('')));
  if (war) body.append(h('div', { class: 'stats' }, stat('War score', `${warScore(S, id) > 0 ? '+' : ''}${warScore(S, id)}`), stat('Meaning', warScore(S, id) > 10 ? 'You are winning' : warScore(S, id) < -10 ? 'You are losing' : 'Even')));
  if (n.overlord) body.append(h('p', { class: 'muted' }, n.overlord === S.player ? `Your ${n.subject === 'union' ? 'personal union' : 'vassal'} since ${n.subjectSince}.` : `Subject of ${nationName(S, n.overlord)}: attacking it means war with its overlord.`));
  body.append(h('h3', {}, 'Send a diplomat'));
  for (const k of DIPLO) {
    if (war !== (k === 'peace')) continue;
    if (k === 'integrate' && n.overlord !== S.player) continue;
    if (k === 'vassalize' && n.overlord === S.player) continue;
    const card = cardFor(S, k);
    const why = !card ? `Needs a ${({ relations: 'Embassy', trade: 'Trade Route', alliance: 'Alliance Pact', marriage: 'Royal Marriage', peace: 'Peace Envoy', vassalize: 'Demand Fealty', integrate: 'Integration Treaty' } as Record<string, string>)[k]} card` : missionBlocked(S, k, id);
    body.append(actionRow(MISSION_INFO[k].icon, MISSION_INFO[k].name, diploHint(k), why, () => openPlanner(k, id, undefined, card!.uid)));
  }
  if (!war) body.append(declareWarRow(id));
  body.append(armyIntel(id));
  return [sheetHead(n.name, `${n.adj} crown`, n.color), body];
}
function diploHint(k: MissionKind) {
  return ({ relations: 'Relations +25', trade: 'Ducats every year, and import a good', alliance: 'They join your wars', marriage: 'Relations grow every year; a dying king may leave you his crown', peace: 'Come to the table and set terms', vassalize: 'They pay tribute and follow you to war', integrate: 'Their provinces become yours' } as Record<string, string>)[k] ?? '';
}

// ---------- category panels ----------
function militarySheet(body: HTMLElement) {
  body.append(cardSection('military'));
  const fb = h('div', { class: 'forge' + (forge.length ? ' active' : '') });
  fb.append(h('div', { class: 'forge-h' }, h('span', { html: icon('merge', 18) }), h('b', {}, 'Forge'), h('small', {}, 'Tap two troops of the same kind for a veteran, or play an equipment card to upgrade a troop')));
  if (forge.length === 2) {
    const r = mergePreview(S, forge[0], forge[1]);
    if ('error' in r) fb.append(h('p', { class: 'bad' }, r.error));
    else fb.append(h('div', { class: 'forge-res' }, troopCard({ type: r.out, vet: r.vet, str: 100 }, { small: true }),
      h('div', {}, h('b', {}, `${TROOPS[r.out].name} ${'★'.repeat(r.vet)}`), h('p', { class: 'muted' }, r.tech ? `Needs research: ${TECH[r.tech].name}` : `${r.cost} ducats`),
        h('button', { class: 'btn primary' + (r.tech || player(S).gold < r.cost ? ' blocked' : ''), onclick: () => { const a = forge[0], b = forge[1]; forge = []; act(() => doMerge(S, a, b), 'Forged!'); } }, 'Forge'))));
  }
  body.append(fb);
  body.append(h('h3', {}, `Armies (${S.troops.length}/${armyCap(S)}) · upkeep ${incomeOf(S, S.player).upkeep.toFixed(1)} a year`));
  const tr = h('div', { class: 'cards-grid' });
  [...S.troops].sort((a, b) => TROOPS[b.type].tier - TROOPS[a.type].tier || b.vet - a.vet).forEach(t =>
    tr.append(troopCard(t, { small: true, selected: forge.includes(t.uid), onclick: () => {
      if (t.mission != null) return toast('This troop is away on a mission');
      forge = forge.includes(t.uid) ? forge.filter(x => x !== t.uid) : [...forge.slice(-1), t.uid];
      renderSheet();
    } })));
  body.append(tr);
  if (forge.length === 1) {
    const t = S.troops.find(x => x.uid === forge[0]);
    if (t) body.append(h('button', { class: 'btn ghost danger', onclick: () => confirmBox(`Disband ${TROOPS[t.type].name}?`, 'The troop is removed for good.', 'Disband', () => { forge = []; act(() => disbandTroop(S, t.uid)); }) }, 'Disband selected troop'));
  }
  body.append(h('h3', {}, `Fleet (${S.fleet.length}/${navyCap(S)}) · carries ${transportOf(S, S.fleet.map(t => t.uid))} companies`));
  const fl = h('div', { class: 'cards-grid' });
  if (!S.fleet.length) fl.append(h('p', { class: 'muted' }, 'No ships. Ship cards come with Military draws; hiring one turns a general into an admiral.'));
  [...S.fleet].sort((a, b) => TROOPS[b.type].tier - TROOPS[a.type].tier).forEach(t =>
    fl.append(troopCard(t, { small: true, selected: forge.includes(t.uid), onclick: () => {
      if (t.mission != null) return toast('This ship is at sea on a mission');
      forge = forge.includes(t.uid) ? forge.filter(x => x !== t.uid) : [...forge.slice(-1), t.uid];
      renderSheet();
    } })));
  body.append(fl);
  body.append(...peopleSection(['general', 'conqueror'], 'Generals and conquerors'));
  body.append(...peopleSection(['admiral'], 'Admirals', 'No admirals yet. Fitting out a ship with a general makes them one.'));
  body.append(recipeBook());
  return [sheetHead('Military', `Army power ${Math.round(armyPower(S.troops))}`, CAT_INFO.military.color), body];
}

function recipeBook() {
  const d = h('details', { class: 'recipes' }, h('summary', {}, 'Recipe book'));
  const rows: [string, string, string, string?][] = [
    ['Levy Infantry', 'Long Pikes', 'Pikemen', 'pike_square'], ['Levy Infantry', 'Plate Armour', 'Men-at-Arms'], ['Levy or Crossbow', 'Arquebuses', 'Arquebusiers', 'firearms'],
    ['Jinetes', 'Plate Armour', 'Knights'], ['Men-at-Arms', 'Warhorses', 'Knights'], ['Pikemen', 'Arquebusiers', 'Tercio', 'tercio_doctrine'],
    ['Bombard', 'Bronze Casting', 'Field Cannon', 'bronze_cannon'], ['Jinetes', 'Pistols', 'Reiters', 'wheellock'], ['Knights', 'Pistols', 'Cuirassiers', 'wheellock'],
    ['Arquebusiers', 'Muskets', 'Musketeers', 'musket'], ['Tercio', 'Muskets', 'Tercio Viejo', 'musket'], ['Reiters', 'Muskets', 'Dragoons', 'military_drill'],
    ['Musketeers', 'Bayonets', 'Line Infantry', 'bayonet'], ['Two of the same troop', '', '+1 star'], ['Any troop', 'Regimental Colours', '+1 star'],
  ];
  d.append(h('table', { class: 'rtable' }, h('tbody', {}, rows.map(([a, b, c, t]) => h('tr', { class: t && !S.techs.includes(t) ? 'locked' : '' },
    h('td', {}, a), h('td', {}, b ? '+ ' + b : ''), h('td', {}, '= ', h('b', {}, c)), h('td', { class: 'muted' }, t && !S.techs.includes(t) ? TECH[t].name : ''))))));
  return d;
}

function diplomacySheet(body: HTMLElement) {
  body.append(cardSection('diplomacy'));
  body.append(...peopleSection(['diplomat', 'explorer'], 'Diplomats and explorers'));
  const subs = subjectsOf(S);
  body.append(h('h3', {}, `Subjects (${subs.length})`));
  if (!subs.length) body.append(h('p', { class: 'muted' }, 'No vassals or unions yet. Demand fealty from a weak crown, win one in a peace, or inherit one through a royal marriage.'));
  for (const x of subs) {
    const yrs = S.year - (x.subjectSince ?? S.year);
    const trib = provsOf(S, x.id).reduce((a, p) => a + p.dev * 0.6, 0) * tributeShare(x);
    const why = integrateBlocked(S, x.id);
    body.append(h('button', { class: 'nrow', onclick: () => openSheet('nation', x.id) },
      h('span', { class: 'swatch', style: `background:${x.color}` }),
      h('span', { class: 'nr-name' }, x.name, h('small', {}, `${x.subject === 'union' ? 'Personal union' : 'Vassal'} · ${yrs} yrs · tribute ${trib.toFixed(1)}/yr`)),
      h('span', { class: 'nr-badges' }, h('span', { class: 'tag ' + (why ? '' : 'ally') }, why ? 'Loyal' : 'Ready to integrate')),
      h('span', { class: 'nr-rel ' + (getRel(S, S.player, x.id) < 0 ? 'bad' : 'good') }, signed(getRel(S, S.player, x.id)))));
  }
  body.append(h('h3', {}, 'Nations'));
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
  return [sheetHead('Diplomacy', 'Relations, treaties, envoys and explorers', CAT_INFO.diplomacy.color), body];
}

function coreSection() {
  const slots = coreSlots(S);
  const wrap = h('div', { class: 'coresec' });
  wrap.append(h('div', { class: 'cs-head' }, h('b', {}, `Core cards (${S.core.length}/${slots} slots)`),
    h('small', {}, `Adopting costs ${coreCost(S)} nation points. Setting one aside costs 1 stability. One change every 5 years.`)));
  const row = h('div', { class: 'cards-row wrap' });
  for (let i = 0; i < 4; i++) {
    const id = S.core[i];
    if (id) row.append(coreCard(id, { slotted: true, onclick: () => confirmBox(`Set aside ${CORE[id].name}?`, 'Stability falls by 1, and the realm returns to the middle on this axis.', 'Set aside', () => act(() => dropCore(S, id))) }));
    else if (i < slots) row.append(h('div', { class: 'card slot-open' }, h('span', {}, 'Empty slot'), h('small', {}, 'Adopt a core card below')));
    else row.append(h('div', { class: 'card slot-locked' }, h('span', { html: icon('chain', 18) }), h('small', {}, ['', 'Bureaucracy or 40 development', 'Absolutism', 'Enlightened Government'][i])));
  }
  wrap.append(row);
  for (const ax of AXES) {
    const cur = S.core.find(c => CORE[c].axis === ax.id);
    const side = (id: string) => {
      const why = coreBlocked(S, id);
      return h('div', { class: 'ax-side' + (cur === id ? ' on' : '') }, coreCard(id, { small: true }),
        h('div', { class: 'ax-txt' }, h('b', {}, CORE[id].name), h('small', { class: 'good' }, CORE[id].pros.join(' · ')), h('small', { class: 'bad' }, CORE[id].cons.join(' · ')),
          cur === id ? h('span', { class: 'tag ally' }, 'Adopted') : h('button', { class: 'btn small' + (why ? ' blocked' : ''), onclick: () => (why ? toast(why, 'bad') : act(() => adoptCore(S, id), `${CORE[id].name} adopted`)) }, why ?? `Adopt · ${coreCost(S)} NP`)));
    };
    wrap.append(h('div', { class: 'axis' }, h('div', { class: 'ax-h' }, h('b', {}, ax.name), h('span', { class: 'ax-meter' }, h('i', { style: `left:${cur === ax.left ? 8 : cur === ax.right ? 92 : 50}%` }))), side(ax.left), side(ax.right)));
  }
  return wrap;
}

function peopleMood() {
  const ps = provsOf(S, S.player);
  const avg = S.happiness ?? 50;
  const cap = S.provinces[player(S).capital] ?? ps[0];
  const parts = cap ? happinessOf(S, cap).parts.filter(x => !['Base', 'Buildings', 'Recently conquered', 'Weak royal control'].includes(x.label) && !x.label.includes('faith') && !x.label.includes('culture') && !x.label.includes('minority')) : [];
  const minorities = ps.filter(p => p.religion !== S.stateReligion).length, foreign = ps.filter(p => !isAccepted(S, p.culture)).length;
  return h('div', { class: 'mood coresec' },
    h('div', { class: 'cs-head' }, h('b', {}, `The people: ${moodName(avg)} (${avg}%)`), h('small', {}, avg >= 65 ? 'Stability tends to rise' : avg < 40 ? 'Stability tends to fall; revolts may break out' : 'Stability holds')),
    h('div', { class: 'ctl-bar' }, h('i', { style: `width:${avg}%`, class: avg < 35 ? 'low' : '' })),
    h('div', { class: 'stats' }, stat('Faith', `${RELIGION_NAMES[S.stateReligion]} · ${minorities} other`), stat('Cultures', `${S.accepted.map(c => CULTURE_NAMES[c] ?? c).join(', ')} · ${foreign} foreign`), stat('Arts', `${Math.round(S.art)}/100`), stat('Tax burden', `${Math.round(S.taxBurden)}`)),
    parts.length ? h('div', { class: 'tags' }, parts.map(x => h('span', { class: 'tag ' + (x.v < 0 ? 'war' : 'ally') }, `${x.label} ${signed(x.v)}`))) : null,
    h('p', { class: 'muted' }, 'Raise it with Patronage of the Arts, Royal Festivals, Religious Missions, Cultural Integration, Charters and temples. Taxes and long wars lower it.'));
}

function internalSheet(body: HTMLElement) {
  body.append(peopleMood());
  body.append(coreSection());
  body.append(cardSection('internal'));
  body.append(...peopleSection(['admin', 'colonist'], 'Administrators and colonists'));
  body.append(h('h3', {}, 'Provinces'));
  const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, h('th', {}, 'Province'), h('th', {}, 'Settlement'), h('th', {}, 'People'), h('th', {}, 'Happy'), h('th', {}, 'Culture'), h('th', {}, 'Faith'), h('th', {}, 'Dev'), h('th', {}, 'Control'))));
  const tb = h('tbody');
  for (const p of provsOf(S, S.player).sort((a, b) => b.dev - a.dev)) {
    tb.append(h('tr', { onclick: () => { map.select(p.id); openSheet('province', p.id); } },
      h('td', {}, p.name), h('td', {}, TIERS[tierOf(p)].name), h('td', {}, `${Math.round(population(S, p) / 1000)}k`),
      h('td', { class: happinessOf(S, p).value < 35 ? 'bad' : '' }, `${happinessOf(S, p).value}%`), h('td', { class: isAccepted(S, p.culture) ? '' : 'bad' }, CULTURE_NAMES[p.culture] ?? p.culture),
      h('td', { class: p.religion === S.stateReligion ? '' : 'bad' }, RELIGION_NAMES[p.religion] ?? p.religion), h('td', {}, String(p.dev)),
      h('td', { class: p.control < 30 ? 'bad' : '' }, `${Math.round(p.control)}%`)));
  }
  t.append(tb);
  body.append(h('div', { class: 'tscroll' }, t));
  body.append(actionRow('anchor', 'Overseas lands', 'Discoveries and colonies', null, () => openSheet('overseas')));
  return [sheetHead('Internal', 'Provinces, towns and the royal administration', CAT_INFO.internal.color), body];
}

function economySheet(body: HTMLElement) {
  body.append(cardSection('economy'));
  const inc = incomeOf(S, S.player);
  body.append(h('h3', {}, 'Income and expenses'));
  body.append(h('table', { class: 'ledger' }, h('tbody', {},
    h('tr', {}, h('td', {}, 'Provinces (after control)'), h('td', {}, inc.provinces.toFixed(1))),
    h('tr', {}, h('td', {}, 'Trade treaties'), h('td', {}, inc.trade.toFixed(1))),
    h('tr', {}, h('td', {}, 'Goods'), h('td', {}, inc.goods.toFixed(1))),
    h('tr', {}, h('td', {}, 'Colonies and overseas'), h('td', {}, inc.other.toFixed(1))),
    h('tr', {}, h('td', {}, `Stability ×${inc.stabMult.toFixed(2)}`), h('td', {}, '')),
    h('tr', {}, h('td', {}, 'Troop upkeep'), h('td', { class: 'bad' }, '−' + inc.upkeep.toFixed(1))),
    h('tr', {}, h('td', {}, 'Building salaries'), h('td', { class: 'bad' }, '−' + inc.salaries.toFixed(1))),
    h('tr', {}, h('td', {}, 'Imported goods'), h('td', { class: 'bad' }, '−' + inc.imports.toFixed(1))),
    h('tr', { class: 'total' }, h('td', {}, 'Each year'), h('td', {}, signed(inc.total))))));
  body.append(h('h3', {}, 'Goods'));
  const own = ownGoods(S), col = colonyGoods(S);
  const gl = h('div', { class: 'goods' });
  for (const g of Object.values(GOODS)) {
    const imp = S.imports.find(i => i.good === g.id);
    const src = own.has(g.id) ? 'Produced' : col.has(g.id) ? 'Colonies' : imp ? `Imported from ${nationName(S, imp.from)} (−${g.price}/yr)` : '';
    gl.append(h('div', { class: 'good' + (src ? ' have' : '') }, h('span', { html: icon(g.icon, 16) }), h('b', {}, g.name), h('small', {}, src || 'Missing: sign a Trade Route to import'), h('small', { class: 'muted' }, g.desc)));
  }
  body.append(gl);
  body.append(h('h3', {}, 'Control and unrest'));
  for (const p of provsOf(S, S.player).sort((a, b) => a.control - b.control)) {
    body.append(h('div', { class: 'ctl' }, h('span', {}, p.name), h('span', { class: 'ctl-bar' }, h('i', { style: `width:${p.control}%`, class: p.control < 30 ? 'low' : '' })), h('b', {}, `${Math.round(p.control)}%`)));
  }
  body.append(h('p', { class: 'muted' }, 'Low control cuts income and can spark revolts. Temples, courthouses, stability and Royal Progress raise it. Newly conquered lands start low.'));
  body.append(...peopleSection(['merchant'], 'Merchants'));
  return [sheetHead('Economy', `${signed(inc.total)} ducats a year`, CAT_INFO.economy.color), body];
}

function researchSheet(body: HTMLElement) {
  body.append(cardSection('research'));
  body.append(...peopleSection(['researcher'], 'Researchers'));
  const tracks: [TechTrack, string][] = [['military', 'Military'], ['economy', 'Economy'], ['state', 'Statecraft']];
  const wrap = h('div', { class: 'tech-cols' });
  for (const [tr, label] of tracks) {
    const col = h('div', { class: 'tech-col' }, h('h3', {}, label));
    for (const t of TECHS.filter(x => x.track === tr)) {
      const known = S.techs.includes(t.id);
      const m = S.missions.find(x => x.kind === 'research' && x.target === t.id);
      const why = known ? null : missionBlocked(S, 'research', t.id);
      const card = cardFor(S, 'research', { track: tr });
      const cost = techCost(S, t.id);
      col.append(h('button', { class: `tech${known ? ' known' : m ? ' active' : why ? ' locked' : ''}`, onclick: () => (known ? toast(t.desc) : m ? toast(`Being studied: ${m.turnsLeft} year(s) left`) : why ? toast(why, 'bad') : !card ? toast(`Needs a ${label} treatise card`, 'bad') : openPlanner('research', t.id, undefined, card.uid)) },
        h('span', { class: 'tech-t' }, h('b', {}, t.name), h('small', {}, known ? 'Known' : m ? `${Math.floor(m.progress)}/${cost} · ${m.turnsLeft} yr` : `${t.year} · ${cost} pts${t.year > S.year ? ' (ahead of its time)' : ''}`)),
        h('span', { class: 'tech-d' }, t.desc)));
    }
    wrap.append(col);
  }
  body.append(wrap);
  return [sheetHead('Research', `${S.techs.length} of ${TECHS.length} known`, CAT_INFO.research.color), body];
}

function missionsSheet(body: HTMLElement) {
  if (!S.missions.length) body.append(h('p', { class: 'muted' }, 'No missions under way. Play a mission card from any panel, or tap a province or nation.'));
  for (const m of S.missions) {
    const c = S.characters.find(x => x.uid === m.char);
    const info = MISSION_INFO[m.kind];
    const pct = m.kind === 'research' ? Math.min(100, (m.progress / techCost(S, m.target)) * 100) : ((m.total - m.turnsLeft) / Math.max(1, m.total)) * 100;
    body.append(h('div', { class: 'mission k-' + info.role },
      h('span', { class: 'a-ico', html: icon(info.icon, 20) }),
      h('div', { class: 'a-t' }, h('b', {}, missionTitle(m)),
        h('small', {}, `${c?.name ?? '?'}${m.troops.length ? ` with ${m.troops.length} troops` : ''} · ${m.turnsLeft} yr left`),
        h('div', { class: 'pbar' }, h('i', { style: `width:${pct}%` }))),
      h('button', { class: 'iconbtn', 'aria-label': 'Recall', title: 'Recall', onclick: () => confirmBox('Recall this mission?', 'The card is lost. Construction refunds half its cost.', 'Recall', () => act(() => cancelMission(S, m.id))), html: icon('close', 16) })));
  }
  return [sheetHead('Missions', `${S.missions.length} under way`), body];
}

function overseasSheet(body: HTMLElement) {
  const exp = cardFor(S, 'explore');
  body.append(actionRow('anchor', 'Voyage of discovery', `An explorer sails out · ${voyageCost(S)} ducats · ${discoverable(S).length} lands within reach`, !exp ? 'Needs a Voyage of Discovery card (Diplomacy)' : missionBlocked(S, 'explore', ''), () => openPlanner('explore', '', undefined, exp!.uid)));
  body.append(h('p', { class: 'muted' }, 'Explorers, conquerors and colonists come from your diplomats, generals and administrators. Open a person\'s card in the court panels to make them specialise.'));
  const groups: Record<string, string[]> = {};
  for (const r of Object.values(REGIONS)) (groups[r.where] ??= []).push(r.id);
  for (const [where, ids] of Object.entries(groups)) {
    body.append(h('h3', {}, where));
    for (const id of ids) {
      const r = REGIONS[id], st = regionState(S, id);
      if (!st.found) {
        body.append(h('div', { class: 'region unknown' }, h('span', { class: 'a-ico', html: icon('star', 18) }), h('div', { class: 'a-t' }, h('b', {}, 'Uncharted'), h('small', {}, st.holder ? `Rumours say ${nationName(S, st.holder)} has been there` : 'Send an explorer'))));
        continue;
      }
      const mine = st.holder === S.player;
      const status = st.holder && !mine ? `Held by ${nationName(S, st.holder)}` : st.colony ? `Your colony, level ${st.colony}/3` : st.subdued ? 'Conquered, ready to settle' : r.natives ? `Home of the ${r.people}` : 'Empty land';
      const row = h('div', { class: 'region' + (mine ? ' mine' : '') }, h('span', { class: 'a-ico', html: icon('anchor', 18) }),
        h('div', { class: 'a-t' }, h('b', {}, r.name), h('small', {}, `${status} · ${GOODS[r.good]?.name} · +${r.value}/level`), h('small', { class: 'muted' }, r.text)));
      const acts = h('div', { class: 'r-acts' });
      const cc = cardFor(S, 'colonize');
      const cw = colonizeBlocked(S, id, S.characters.find(c => c.role === 'colonist' && c.traits.includes('missionary')));
      if (!st.holder || mine) acts.append(h('button', { class: 'btn small' + (!cc || cw ? ' blocked' : ''), onclick: () => (!cc ? toast('Needs a Colonial Charter card (Internal)', 'bad') : cw ? toast(cw, 'bad') : openPlanner('colonize', id, undefined, cc.uid)) }, 'Colonise'));
      const kc = cardFor(S, 'conquista');
      if (r.natives && !st.subdued && (!st.holder || mine)) acts.append(h('button', { class: 'btn small' + (!kc ? ' blocked' : ''), onclick: () => (!kc ? toast('Needs a Conquista card (Military)', 'bad') : openPlanner('conquista', id, undefined, kc.uid)) }, 'Conquer'));
      row.append(acts);
      body.append(row);
    }
  }
  return [sheetHead('Overseas', 'Lands beyond the map'), body];
}

function chronicleSheet(body: HTMLElement) {
  const tabs = h('div', { class: 'seg' }, ...[['powers', 'Powers'], ['generals', 'Generals'], ['kings', 'Monarchs'], ['log', 'Chronicle']].map(([k, l]) =>
    h('button', { class: 'seg-b' + (chronTab === k ? ' on' : ''), onclick: () => { chronTab = k; renderSheet(); } }, l)));
  body.append(tabs);
  if (chronTab === 'powers') {
    const a = AMBITIONS.find(x => x.id === S.ambition);
    if (a) body.append(h('div', { class: 'ambition' + (S.ambitionDone ? ' done' : '') }, h('span', { html: icon('crown', 20) }), h('div', {}, h('b', {}, `Ambition: ${a.name}`), h('small', {}, `${a.text} Reward: ${a.reward} prestige.${S.ambitionDone ? ' Resolved.' : ''}`))));
    const score = Object.fromEntries(ranking(S).map(r => [r.id, r.score]));
    const rows = powerTable(S).sort((x, y) => (score[y.id] ?? 0) - (score[x.id] ?? 0));
    const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['Nation', 'Score', 'Army', 'Income', 'Dev', 'Battles'].map(x => h('th', {}, x)))));
    const tb = h('tbody');
    for (const r of rows) {
      const tot = r.won + r.lost;
      tb.append(h('tr', { class: r.id === S.player ? 'me' : '' }, h('td', {}, h('span', { class: 'swatch', style: `background:${r.color}` }), ' ', r.name),
        h('td', {}, String(score[r.id] ?? 0)), h('td', {}, String(r.military)), h('td', {}, String(r.economy)), h('td', {}, String(r.dev)),
        h('td', {}, tot ? `${r.won}–${r.lost} (${Math.round((r.won / tot) * 100)}%)` : '—')));
    }
    t.append(tb);
    body.append(h('div', { class: 'tscroll' }, t));
    body.append(h('p', { class: 'muted' }, `Score = prestige + 2 × development. Wars you won: ${S.stats.wars.won}, lost: ${S.stats.wars.lost}. The game ends in ${S.endYear}.`));
  } else if (chronTab === 'generals') {
    const gens = [
      ...S.characters.filter(c => c.role === 'general' || c.role === 'conqueror' || (c.wins ?? 0) + (c.losses ?? 0) > 0).map(c => ({ name: c.name, rarity: c.rarity as string, wins: c.wins ?? 0, losses: c.losses ?? 0, note: 'Serving' })),
      ...S.stats.fallen.map(f => ({ name: f.name, rarity: '', wins: f.wins, losses: f.losses, note: `Until ${f.until}` })),
    ].sort((a, b) => b.wins - a.wins);
    const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['General', 'Won', 'Lost', '%', ''].map(x => h('th', {}, x)))));
    t.append(h('tbody', {}, gens.map(g => h('tr', {}, h('td', {}, g.name, g.rarity ? h('small', { class: 'muted' }, ' ' + RARITY[g.rarity as Character['rarity']].name) : null), h('td', {}, String(g.wins)), h('td', {}, String(g.losses)),
      h('td', {}, g.wins + g.losses ? `${Math.round((g.wins / (g.wins + g.losses)) * 100)}%` : '—'), h('td', { class: 'muted' }, g.note)))));
    body.append(h('div', { class: 'tscroll' }, t));
  } else if (chronTab === 'kings') {
    const me = player(S);
    const kings = [...S.stats.kings, { name: me.ruler.name, arch: me.ruler.arch, from: me.ruler.from, to: S.year, prestige: Math.round(me.prestige - (me.ruler.prestigeAtStart ?? 0)) }];
    const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['Monarch', 'Kind', 'Reign', 'Prestige won'].map(x => h('th', {}, x)))));
    t.append(h('tbody', {}, [...kings].sort((a, b) => b.prestige - a.prestige).map(k => h('tr', { class: k.name === me.ruler.name ? 'me' : '' },
      h('td', {}, k.name), h('td', {}, RULER_ARCHS[k.arch]?.name ?? k.arch), h('td', {}, `${k.from}–${k.to}`), h('td', {}, String(k.prestige))))));
    body.append(h('div', { class: 'tscroll' }, t));
  } else {
    body.append(h('ul', { class: 'log' }, S.log.slice(0, 80).map(l => h('li', { class: 't-' + l.tone }, h('span', { class: 'ly' }, String(l.year)), l.text))));
  }
  return [sheetHead('Chronicle', 'Rankings, records and history'), body];
}

function realmSheet(body: HTMLElement) {
  const me = player(S);
  const arch = RULER_ARCHS[me.ruler.arch];
  body.append(h('div', { class: 'ruler' },
    h('span', { class: 'np-shield', style: `--nc:${me.color}` }, me.name[0]),
    h('div', {}, h('b', {}, me.ruler.name), h('p', { class: 'muted' }, `${arch?.name ?? ''} monarch · reigns since ${me.ruler.from}`), h('p', {}, arch?.desc ?? ''))));
  const rates = cardRates(S);
  body.append(h('h3', {}, 'Cards each year'));
  body.append(h('table', { class: 'ledger' }, h('tbody', {}, CATS.map(c => h('tr', {}, h('td', {}, CAT_INFO[c].name, h('small', { class: 'muted' }, ' ' + rates[c].parts.map(p => `${p.label} ${signed(p.v)}`).join(' · '))), h('td', {}, rates[c].rate.toFixed(2)))))));
  const np = npRate(S);
  body.append(h('h3', {}, 'Nation points each year'));
  body.append(h('p', {}, `${np.rate.toFixed(1)} · ${np.parts.map(p => `${p.label} ${signed(p.v)}`).join(' · ')}`));
  const mp = playerManpower(S);
  body.append(h('div', { class: 'stats' },
    stat('Manpower', `${Math.floor(me.manpower)}/${mp.max} (+${mp.gain.toFixed(1)})`), stat('Stability', me.stability),
    stat('Court', `${courtCount(S)}/${courtCap(S)}`), stat('Provinces', provsOf(S, S.player).length)));
  body.append(h('p', { class: 'muted' }, 'Stability from −3 to +3 changes income by 6% a step and nation points by 0.5. At −2 or lower, revolts break out and you draw fewer cards.'));
  body.append(h('h3', {}, 'Menu style'), stylePicker(() => refresh()));
  body.append(h('button', { class: 'btn ghost', onclick: () => confirmBox('Leave this campaign?', 'It stays saved. You can continue it from the title screen.', 'Back to title', () => { closeModal(); showTitle(); }) }, 'Back to title screen'));
  return [sheetHead(me.name, `${me.ruler.name} · ${S.year}`, me.color), body];
}

// ---------- modals ----------
function openModal(content: HTMLElement) {
  const m = clear($('#modal'));
  content.prepend(h('div', { class: 'seal', 'aria-hidden': 'true' }, h('i'), h('i'), h('b')));
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
  if (modalOpen) return ok();
  openModal(h('div', { class: 'mbox narrow' }, h('h2', {}, title), h('p', {}, text),
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Cancel'), h('button', { class: 'btn primary', onclick: () => { closeModal(); ok(); } }, okLabel))));
}

function charDetail(c: Character) {
  const m = c.mission != null ? S.missions.find(x => x.id === c.mission) : null;
  const to = PROMOTION[c.role];
  const pw = promoteBlocked(S, c);
  openModal(h('div', { class: 'mbox narrow' },
    h('div', { class: 'center' }, charCard(c, S)),
    h('h2', {}, c.name),
    h('p', { class: 'muted' }, `${c.ruler ? 'Monarch acting as ' : ''}${roleName[c.role]} · ${RARITY[c.rarity].name} (traits ×${RARITY[c.rarity].mult}) · experience ${c.xp}/3 · age ${S.year - c.born}`),
    h('ul', { class: 'traits' }, c.traits.map(t => h('li', {}, h('b', {}, TRAITS[t]?.name ?? t), ' ', TRAITS[t]?.desc ?? ''))),
    (c.wins ?? 0) + (c.losses ?? 0) ? h('p', {}, `Battles: ${c.wins ?? 0} won, ${c.losses ?? 0} lost.`) : null,
    m ? h('p', {}, `On a mission: ${missionTitle(m)}, ${m.turnsLeft} year(s) left.`) : null,
    to ? h('div', { class: 'promo' }, h('b', {}, `Become ${to === 'explorer' ? 'an Explorer' : 'a ' + roleName[to]}`),
      h('p', { class: 'muted' }, `For lands overseas. Permanent: ${c.name.split(' ')[0]} gets new ${roleName[to].toLowerCase()} traits and can no longer work as a ${roleName[c.role].toLowerCase()}.`),
      h('button', { class: 'btn' + (pw ? ' blocked' : ''), onclick: () => { if (pw) return toast(pw, 'bad'); closeModal(); confirmBox(`Make ${c.name} ${roleName[to].toLowerCase()}?`, 'There is no going back.', 'Specialise', () => act(() => promote(S, c.uid), `${c.name} is now ${roleName[to].toLowerCase()}`)); } }, pw ?? 'Specialise')) : null,
    h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: closeModal }, 'Close'),
      !m && !c.ruler ? h('button', { class: 'btn ghost danger', onclick: () => { closeModal(); confirmBox(`Dismiss ${c.name}?`, 'This frees a seat at court.', 'Dismiss', () => act(() => dismissCharacter(S, c.uid))); } }, 'Dismiss') : null)));
}

interface TargetRow { label: string; sub: string; color?: string; acts: { label: string; kind: MissionKind; target: string; building?: string; why: string | null }[]; }

/** Targets a mission card can be used on. */
function missionTargets(handUid: number): TargetRow[] {
  const hc = S.hand.find(x => x.uid === handUid)!;
  const d = CARDS[hc.card];
  const kind = d.missions![0];
  const rows: TargetRow[] = [];
  if (kind === 'conquer') {
    for (const p of Object.values(S.provinces)) {
      if (p.owner === S.player || !atWar(S, S.player, p.owner) || !attackRoute(S, p.id)) continue;
      rows.push({ label: p.name, sub: `${nationName(S, p.owner)} · fort ${p.fort} · dev ${p.dev}`, color: S.nations[p.owner].color,
        acts: [{ label: 'Conquer', kind: 'conquer', target: p.id, why: missionBlocked(S, 'conquer', p.id) }, { label: 'Raid', kind: 'raid', target: p.id, why: missionBlocked(S, 'raid', p.id) }] });
    }
  } else if (DIPLO.includes(kind)) {
    for (const n of Object.values(S.nations).filter(n => n.alive && n.id !== S.player)) {
      const why = missionBlocked(S, kind, n.id);
      if (why && (why.startsWith('You are') || why.includes('already') || why === 'Not your subject' || why.startsWith('Already a subject') || why.startsWith('Too large'))) continue;
      rows.push({ label: n.name, sub: `Relations ${getRel(S, S.player, n.id)}`, color: n.color, acts: [{ label: MISSION_INFO[kind].name, kind, target: n.id, why }] });
    }
  } else if (kind === 'research') {
    for (const t of TECHS.filter(t => t.track === d.track && !S.techs.includes(t.id))) rows.push({ label: t.name, sub: `${techCost(S, t.id)} pts · ${t.desc}`, acts: [{ label: 'Study', kind, target: t.id, why: missionBlocked(S, 'research', t.id) }] });
  } else if (kind === 'build') {
    for (const p of provsOf(S, S.player)) {
      const acts = Object.values(BUILDINGS).filter(b => b.group === d.group).map(b => ({ label: b.name, kind, target: p.id, building: b.id, why: missionBlocked(S, 'build', p.id, b.id) })).filter(a => !a.why || a.why.startsWith('Needs') && !a.why.startsWith('Needs Ocean') || a.why.startsWith('No free'));
      if (acts.length) rows.push({ label: p.name, sub: `${TIERS[tierOf(p)].name} · town ${builtAt(p, 'town')}/${townSlots(p)} · countryside ${builtAt(p, 'rural')}/${ruralSlots(p)}`, acts });
    }
  } else if (kind === 'convert' || kind === 'assimilate') {
    for (const p of provsOf(S, S.player)) {
      const why = missionBlocked(S, kind, p.id);
      if (why && (why.startsWith('Already') || why.includes('already accepted'))) continue;
      rows.push({ label: p.name, sub: `${CULTURE_NAMES[p.culture] ?? p.culture} · ${RELIGION_NAMES[p.religion] ?? p.religion} · happiness ${happinessOf(S, p).value}%`, acts: [{ label: kind === 'convert' ? 'Convert' : 'Integrate', kind, target: p.id, why }] });
    }
  } else if (kind === 'develop' || kind === 'found' || kind === 'grow') {
    for (const p of provsOf(S, S.player)) {
      const why = missionBlocked(S, kind, p.id);
      if (kind !== 'develop' && why && (why.startsWith('There is already') || why.startsWith('No settlement') || why.startsWith('Already a'))) continue;
      rows.push({ label: p.name, sub: `dev ${p.dev} · ${TIERS[tierOf(p)].name}`, acts: [{ label: kind === 'develop' ? `Develop (${developCost(S, p.id)})` : kind === 'found' ? `Found (${foundCost(S)})` : `Grow (${growCost(S, p.id)})`, kind, target: p.id, why }] });
    }
  } else if (kind === 'colonize' || kind === 'conquista') {
    for (const r of Object.values(REGIONS)) {
      if (!regionState(S, r.id).found) continue;
      const why = missionBlocked(S, kind, r.id);
      rows.push({ label: r.name, sub: `${r.where} · ${GOODS[r.good]?.name}`, acts: [{ label: kind === 'colonize' ? 'Settle' : 'Conquer', kind, target: r.id, why }] });
    }
  } else {
    rows.push({ label: MISSION_INFO[kind].name, sub: MISSION_INFO[kind].verb, acts: [{ label: 'Start', kind, target: '', why: missionBlocked(S, kind, '') }] });
  }
  return rows;
}

function openCardModal(handUid: number) {
  const hc = S.hand.find(x => x.uid === handUid);
  if (!hc) return;
  const def = CARDS[hc.card];
  const blocked = cardBlocked(S, def);
  const body = h('div', { class: 'targets-wrap' });
  const done = (msg: string) => { closeModal(); if (msg.startsWith('!')) toast(msg.slice(1), 'bad'); else toast(msg, 'good'); refresh(); processQueue(); };
  const footer = h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Keep it'),
    !def.burden ? h('button', { class: 'btn ghost', onclick: () => { closeModal(); act(() => discardCard(S, handUid), 'Discarded: +0.5 nation points'); } }, 'Discard (+0.5 NP)') : null);

  if (def.kind === 'troop') {
    body.append(h('p', {}, `Hire for 1 manpower and ${troopHireCost(S, def.troop!)} ducats. Upkeep ${TROOPS[def.troop!].upkeep} a year. A better general trains better troops: veteran stars depend on the outcome.`));
    const gens = S.characters.filter(c => (c.role === 'general' || c.role === 'conqueror') && c.mission == null);
    let gsel: Character | null = [...gens].sort((a, b) => RARITY_ORDER_I(b) - RARITY_ORDER_I(a))[0] ?? null;
    const gl = h('div', { class: 'cards-row wrap' });
    const oddsBox = h('div');
    const drawG = () => {
      clear(gl); clear(oddsBox);
      for (const c of gens) gl.append(charCard(c, S, { small: true, selected: gsel?.uid === c.uid, onclick: () => { gsel = c; drawG(); } }));
      if (!gens.length) gl.append(h('p', { class: 'muted' }, 'No free general: recruits get Common odds.'));
      oddsBox.append(h('small', { class: 'muted' }, gsel ? `Trained by ${gsel.name}:` : 'Without a general:'), oddsLine(gsel));
    };
    drawG();
    body.append(h('h3', {}, 'Choose who trains them'), gl, oddsBox);
    footer.append(h('button', { class: 'btn primary' + (blocked ? ' blocked' : ''), onclick: () => (blocked ? toast(blocked, 'bad') : done(playCard(S, handUid, gsel ? String(gsel.uid) : ''))) }, blocked ?? 'Hire'));
  } else if (def.kind === 'ship') {
    body.append(h('p', {}, `Fit out for 1 manpower and ${shipHireCost(S, def.troop!)} ducats. Upkeep ${TROOPS[def.troop!].upkeep} a year. Carries ${TROOPS[def.troop!].transport} companies. Navy ${S.fleet.length}/${navyCap(S)}.`));
    const crew = S.characters.filter(c => (c.role === 'admiral' || c.role === 'general') && c.mission == null);
    let csel: Character | null = crew.find(c => c.role === 'admiral') ?? null;
    const cl = h('div', { class: 'cards-row wrap' });
    const note = h('div');
    const drawC = () => {
      clear(cl); clear(note);
      for (const c of crew) cl.append(charCard(c, S, { small: true, selected: csel?.uid === c.uid, onclick: () => { csel = c; drawC(); } }));
      if (!crew.length) cl.append(h('p', { class: 'muted' }, 'You need a free general or admiral to command the ship.'));
      if (csel) note.append(h('small', { class: csel.role === 'general' ? 'bad' : 'muted' }, csel.role === 'general' ? `${csel.name} will become an admiral for good: new sea skills, no more land command.` : `Fitted out by ${csel.name}:`), oddsLine(csel));
    };
    drawC();
    body.append(h('h3', {}, 'Choose who commands it'), cl, note);
    footer.append(h('button', { class: 'btn primary' + (blocked || !crew.length ? ' blocked' : ''), onclick: () => { if (blocked) return toast(blocked, 'bad'); if (!csel) return toast('Choose a general or admiral', 'bad'); done(hireShip(S, handUid, csel.uid)); } }, blocked ?? 'Fit out the ship'));
  } else if (def.kind === 'hire') {
    body.append(h('p', {}, `Costs 1 manpower. Three candidates are revealed; you keep one. Court ${courtCount(S)}/${courtCap(S)}.`));
    footer.append(h('button', { class: 'btn primary' + (blocked ? ' blocked' : ''), onclick: () => { if (blocked) return toast(blocked, 'bad'); closeModal(); act(() => hireWithCard(S, handUid)); } }, blocked ?? 'Hire'));
  } else if (def.kind === 'equip') {
    body.append(h('h3', {}, 'Fit to a troop at home'));
    const row = h('div', { class: 'cards-row wrap' });
    let any = false;
    for (const t of S.troops.filter(t => t.mission == null)) {
      const r = mergePreview(S, t.uid, handUid);
      if ('error' in r) continue;
      any = true;
      row.append(h('div', { class: 'fit' }, troopCard(t, { small: true }), h('span', { class: 'arrow' }, '→'), troopCard({ type: r.out, vet: r.vet, str: 100 }, { small: true }),
        h('button', { class: 'btn small' + (r.tech || player(S).gold < r.cost ? ' blocked' : ''), onclick: () => { if (r.tech) return toast(`Needs ${TECH[r.tech].name}`, 'bad'); const e = doMerge(S, t.uid, handUid); done(e ? '!' + e : `Forged ${TROOPS[r.out].name}`); } }, r.tech ? `Needs ${TECH[r.tech].name}` : `Forge · ${r.cost}`)));
    }
    if (!any) row.append(h('p', { class: 'muted' }, 'None of your troops at home can use this. Check the recipe book in the Military panel.'));
    body.append(row);
  } else if (def.kind === 'mission') {
    const role = cardRole(def.id);
    body.append(h('p', { class: 'muted' }, `Needs a free ${roleName[role].toLowerCase()}. Choose where to send them.`));
    const rows = missionTargets(handUid);
    if (!rows.length) body.append(h('p', { class: 'bad' }, def.missions![0] === 'conquer' ? 'You are not at war with anyone you can reach. Declare war from a province or the Diplomacy panel.' : def.missions![0] === 'colonize' || def.missions![0] === 'conquista' ? 'No land discovered yet. Send an explorer first.' : 'No valid target right now.'));
    const list = h('div', { class: 'tlist' });
    for (const r of rows) {
      list.append(h('div', { class: 'trow' }, r.color ? h('span', { class: 'swatch', style: `background:${r.color}` }) : null,
        h('div', { class: 'a-t' }, h('b', {}, r.label), h('small', {}, r.sub)),
        h('div', { class: 'r-acts' }, r.acts.map(a => h('button', { class: 'btn small' + (a.why ? ' blocked' : ''), title: a.why ?? '', onclick: () => { if (a.why) return toast(a.why, 'bad'); closeModal(); openPlanner(a.kind, a.target, a.building, handUid); } }, a.label)))));
    }
    body.append(list);
  } else {
    let target = '';
    const targets = h('div', { class: 'targets' });
    const playBtn = h('button', { class: 'btn primary' }, def.burden ? 'Pay it off' : 'Play card');
    const setBtn = () => playBtn.classList.toggle('blocked', !!blocked || (!!def.target && def.target !== 'none' && !target));
    playBtn.onclick = () => {
      if (blocked) return toast(blocked, 'bad');
      if (def.target && def.target !== 'none' && !target) return toast('Choose a target first', 'bad');
      done(playCard(S, handUid, target));
    };
    const pickT = (val: string, el: HTMLElement) => { target = val; targets.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); setBtn(); };
    if (!blocked && def.target === 'nation') {
      for (const n of Object.values(S.nations).filter(n => n.alive && n.id !== S.player && def.targetOk!(S, n.id))) {
        const b: HTMLElement = h('button', { class: 'tchip', onclick: () => pickT(n.id, b) }, h('span', { class: 'swatch', style: `background:${n.color}` }), n.name);
        targets.append(b);
      }
    } else if (!blocked && def.target === 'mission') {
      for (const m of S.missions.filter(m => def.targetOk!(S, String(m.id)))) {
        const b: HTMLElement = h('button', { class: 'tchip', onclick: () => pickT(String(m.id), b) }, `${missionTitle(m)} (${m.turnsLeft} yr)`);
        targets.append(b);
      }
    } else if (!blocked && def.target === 'troop') {
      const g = h('div', { class: 'cards-row wrap' });
      for (const t of S.troops.filter(t => def.targetOk!(S, String(t.uid)))) { const c: HTMLElement = troopCard(t, { small: true, onclick: () => pickT(String(t.uid), c) }); g.append(c); }
      targets.append(g);
    }
    setBtn();
    if (blocked) body.append(h('p', { class: 'bad' }, blocked)); else if (def.target && def.target !== 'none') body.append(h('h3', {}, 'Choose a target'));
    body.append(targets);
    footer.append(playBtn);
  }
  openModal(h('div', { class: 'mbox narrow' }, h('div', { class: 'center' }, handCard(hc.card)), body, footer));
}

// ---------- mission planner ----------
function openPlanner(kind: MissionKind, target: string, building: string | undefined, cardUid: number) {
  const card = S.hand.find(x => x.uid === cardUid);
  if (!card) { toast('That card is gone', 'bad'); return; }
  const role = cardRole(card.card);
  const info = MISSION_INFO[kind];
  const chars = S.characters.filter(c => c.role === role);
  const free = chars.filter(c => c.mission == null);
  const base = Object.entries(PROMOTION).find(([, v]) => v === role)?.[0];
  if (!chars.length) { toast(`You have no ${roleName[role].toLowerCase()}. ${base ? `Make one of your ${roleName[base as Character['role']].toLowerCase()}s specialise.` : 'Play a hiring card.'}`, 'bad'); return; }
  if (!free.length) { toast(`All your ${roleName[role].toLowerCase()}s are busy`, 'bad'); return; }
  const military = kind === 'conquer' || kind === 'raid' || kind === 'conquista';
  let ch = [...free].sort((a, b) => b.skill - a.skill)[0];
  const home = S.troops.filter(t => t.mission == null && t.str >= 30).sort((a, b) => armyPower([b]) - armyPower([a]));
  const maxTroops = () => ch.skill + 3;
  let picked: number[] = military ? home.slice(0, maxTroops()).map(t => t.uid) : [];
  const naval = (kind === 'conquer' || kind === 'raid') && !!attackRoute(S, target)?.naval;
  const harbourShips = S.fleet.filter(t => t.mission == null && t.str >= 30);
  let ships: number[] = naval ? harbourShips.map(t => t.uid) : [];
  const goods = kind === 'trade' ? importable(S, target) : [];
  let good: string | undefined = goods[0];

  const tname = S.provinces[target]?.name ?? S.nations[target]?.name ?? TECH[target]?.name ?? REGIONS[target]?.name ?? 'the realm';
  const box = h('div', { class: 'mbox planner' });
  const draw = () => {
    clear(box);
    box.append(h('div', { class: 'pl-head' }, h('span', { class: 'a-ico', html: icon(info.icon, 22) }),
      h('div', {}, h('h2', {}, `${info.name}${kind === 'build' ? ': ' + BUILDINGS[building!].name : ''}`), h('p', { class: 'muted' }, `${info.verb} ${tname} · uses ${CARDS[card.card].name}`))));
    box.append(h('h3', {}, `Choose a ${roleName[role].toLowerCase()}`));
    const row = h('div', { class: 'cards-row' });
    for (const c of chars) {
      const busy = c.mission != null;
      let sub = `${missionTurns(S, kind, c, target, building)} yr`;
      if (DIPLO.includes(kind)) sub = `${Math.round(diploChance(S, kind, c, target) * 100)}%`;
      if (kind === 'explore') sub = `${Math.round(exploreChance(S, c) * 100)}%`;
      if (kind === 'colonize') sub = `${Math.round(colonizeChance(S, target, c) * 100)}%`;
      if (!DIPLO.includes(kind) && kind !== 'explore' && kind !== 'colonize') sub = `${OUTCOME_ODDS[c.rarity][3] + OUTCOME_ODDS[c.rarity][4] < 1 ? '<1' : Math.round(OUTCOME_ODDS[c.rarity][3] + OUTCOME_ODDS[c.rarity][4])}% great`;
      row.append(charCard(c, S, { small: true, selected: c.uid === ch.uid, dim: busy, badge: busy ? 'busy' : sub, onclick: () => { if (busy) return toast('Busy on another mission'); ch = c; if (military) picked = picked.slice(0, maxTroops()); draw(); } }));
    }
    box.append(row);
    if (!['conquer', 'raid'].includes(kind)) box.append(h('div', { class: 'oddsbox' }, h('small', { class: 'muted' }, `Outcome odds with a ${RARITY[ch.rarity].name} ${roleName[ch.role].toLowerCase()}:`), oddsLine(ch)));
    const turns = missionTurns(S, kind, ch, target, building);
    const facts: (string | HTMLElement)[] = [`${turns} year${turns > 1 ? 's' : ''}`];
    if (DIPLO.includes(kind)) facts.push(`${Math.round(diploChance(S, kind, ch, target) * 100)}% chance`);
    if (kind === 'research') facts.push(`${researchRate(S, ch, TECH[target]?.track)} research a year · ${techCost(S, target)} needed`);
    if (kind === 'build') facts.push(`${buildingCost(S, building!)} ducats now · salary ${BUILDINGS[building!].salary} a year`);
    if (kind === 'develop') facts.push(`${developCost(S, target)} ducats now`);
    if (kind === 'found') facts.push(`${foundCost(S)} ducats now · Poor/Standard: village · Good: town · Great/Exceptional: city`);
    if (kind === 'grow') facts.push(`${growCost(S, target)} ducats now · Poor: no growth · Exceptional: two steps`);
    if (kind === 'build') facts.push('Quality: Shoddy ×0.75 · Standard · Fine ×1.25 · Grand ×1.5 · Wonder ×2');
    if (kind === 'explore') facts.push(`${Math.round(exploreChance(S, ch) * 100)}% chance of a discovery · ${voyageCost(S)} ducats`);
    if (kind === 'colonize') facts.push(`${Math.round(colonizeChance(S, target, ch) * 100)}% chance · ${colonyCost(S)} ducats and 1 manpower`);
    if (kind === 'trade') {
      box.append(h('h3', {}, 'Import a good'));
      const gr = h('div', { class: 'targets' });
      if (!goods.length) gr.append(h('p', { class: 'muted' }, 'They have nothing you lack.'));
      for (const g of [...goods, '']) {
        const lbl = g ? `${GOODS[g].name}: ${GOODS[g].desc} (−${GOODS[g].price}/yr)` : 'No import';
        gr.append(h('button', { class: 'tchip' + (good === (g || undefined) ? ' sel' : ''), onclick: () => { good = g || undefined; draw(); } }, lbl));
      }
      box.append(gr);
    }
    if (military) {
      box.append(h('h3', {}, `Troops (${picked.length}/${maxTroops()})`));
      const tr = h('div', { class: 'cards-row wrap' });
      if (!home.length) tr.append(h('p', { class: 'muted' }, 'No troops at home. Hire some with Military troop cards.'));
      for (const t of home) tr.append(troopCard(t, { small: true, selected: picked.includes(t.uid), onclick: () => {
        if (picked.includes(t.uid)) picked = picked.filter(x => x !== t.uid);
        else if (picked.length < maxTroops()) picked = [...picked, t.uid]; else toast(`${ch.name} can lead ${maxTroops()} troops`);
        draw();
      } }));
      box.append(tr);
      if (naval) {
        const cap = transportOf(S, ships, ch);
        box.append(h('h3', {}, `Ships (carry ${cap} of ${picked.length} companies)`));
        const sr = h('div', { class: 'cards-row wrap' });
        if (!harbourShips.length) sr.append(h('p', { class: 'bad' }, 'This attack goes by sea and you have no ships in harbour.'));
        for (const t of harbourShips) sr.append(troopCard(t, { small: true, selected: ships.includes(t.uid), onclick: () => { ships = ships.includes(t.uid) ? ships.filter(x => x !== t.uid) : [...ships, t.uid]; draw(); } }));
        box.append(sr);
        const foeFleet = S.nations[S.provinces[target].owner].fleet ?? [];
        facts.push(foeFleet.length ? `Their fleet (${foeFleet.length} ships) may intercept: a sea battle comes first` : 'No enemy fleet seen');
      }
      if (kind === 'conquista') facts.push(`${Math.round(conquistaChance(S, target, ch, picked) * 100)}% chance against the ${REGIONS[target].people}`);
      else {
        const prov = S.provinces[target];
        const enemy = S.nations[prov.owner];
        const mine = Math.round(armyPower(S.troops.filter(t => picked.includes(t.uid))) * (1 + 0.07 * ch.skill));
        const spied = (enemy.spiedUntil ?? 0) > S.year;
        const theirs = Math.round(armyPower([...enemy.army].sort((a, b) => armyPower([b]) - armyPower([a])).slice(0, kind === 'raid' ? 3 : 6)));
        facts.push(h('span', {}, `Your strength ${mine} vs `, h('b', {}, spied ? `${theirs}` : `~${Math.round(theirs * 0.8)}–${Math.round(theirs * 1.25)}`), ` · fort ${prov.fort}`));
      }
      if (!S.troops.some(t => t.mission == null && !picked.includes(t.uid))) facts.push(h('span', { class: 'bad' }, 'No troops left at home to defend'));
    }
    box.append(h('div', { class: 'facts' }, facts.map(f => h('span', { class: 'fact' }, f))));
    const why = missionBlocked(S, kind, target, building) ?? (military && !picked.length ? 'Choose at least one troop' : null) ?? (naval && transportOf(S, ships, ch) < picked.length ? 'Not enough ships to carry these troops' : null);
    box.append(h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: closeModal }, 'Cancel'),
      h('button', { class: 'btn primary' + (why ? ' blocked' : ''), onclick: () => {
        if (why) return toast(why, 'bad');
        const r = launchMission(S, kind, ch.uid, target, picked, building, cardUid, good, ships);
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
  const rep = endTurn(S);
  if (sheet?.kind === 'province' && !S.provinces[sheet.arg!]) closeSheet();
  refresh();
  if (rep) {
    const got = CATS.filter(c => rep.cards[c]).map(c => `${rep.cards[c]} ${CAT_INFO[c].name}`).join(', ');
    await yearFlash(S.year, `${signed(rep.gold)} ducats · +${rep.np.toFixed(1)} NP${got ? ' · cards: ' + got : ''}`);
  }
  processQueue();
}

async function yearFlash(year: number, line: string) {
  if (reduced()) { toast(`${year}: ${line}`); return; }
  const f = h('div', { class: 'yearflash' }, h('span', {}, String(year)), h('small', {}, line));
  document.body.append(f);
  await sleep(1100);
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
  else if (p.kind === 'succession') showSuccession(p.heirs, p.old);
  else if (p.kind === 'peace') showPeace(p.enemy, p.offered);
  else if (p.kind === 'gameover') showGameOver(p.victory, p.reason);
}
function afterPrompt() { closeModal(); refresh(); setTimeout(processQueue, 60); }

function infoCard(it: RevealItem) {
  return h('div', { class: `card k-info tone-${it.tone}${/ outcome$/.test(it.title) ? ' is-outcome' : ''}` },
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
  openModal(h('div', { class: 'mbox reveal' }, h('h2', {}, title), subtitle ? h('p', { class: 'muted' }, subtitle) : null, row, h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: done }, 'Continue'))));
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
  const opts = h('div', { class: 'ev-opts hidden-opts' });
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
  openModal(h('div', { class: 'mbox event' }, f.el, opts));
  setTimeout(() => { f.flip(); setTimeout(() => opts.classList.remove('hidden-opts'), reduced() ? 0 : 450); }, reduced() ? 0 : 350);
}

function draftFront(o: DraftOption) {
  if (o.t === 'troop') return troopCard({ type: o.type, vet: o.vet, str: 100 });
  if (o.t === 'char') return charCard(o.ch, S);
  if (o.t === 'card') return handCard(o.card);
  if (o.t === 'equip') return handCard('eq_' + o.type);
  const a = AMBITIONS.find(x => x.id === o.id)!;
  return h('div', { class: 'card k-event' }, h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, 'Ambition')),
    h('div', { class: 'c-art', html: icon('crown', 34) }), h('div', { class: 'c-name c-title' }, a.name), h('div', { class: 'c-text' }, a.text), h('div', { class: 'c-text gold' }, `+${a.reward} prestige`));
}

function optName(o: DraftOption) {
  return o.t === 'troop' ? TROOPS[o.type].name : o.t === 'equip' ? EQUIPMENT[o.type].name : o.t === 'char' ? o.ch.name : o.t === 'card' ? CARDS[o.card].name : AMBITIONS.find(a => a.id === o.id)!.name;
}

function showDraft(kind: string, options: DraftOption[]) {
  const titles: Record<string, [string, string]> = {
    buy: ['A new card', 'Three cards are revealed. Keep one.'], gift: ['A gift of fortune', 'Keep one.'],
    court: ['An audience at court', 'Three candidates seek your favour. Keep one.'], ambition: ['Your ambition', 'Choose the goal your crown will pursue. Fulfil it for great prestige.'],
  };
  const [t, sub] = titles[kind] ?? titles.buy;
  const row = h('div', { class: 'reveal-row' });
  let ready = false;
  const flips = options.map(o => {
    const f = flipCard(draftFront(o), kind === 'ambition' ? 'Ambition' : kind === 'court' ? 'Court' : 'Card');
    f.el.addEventListener('click', () => {
      if (!ready) return;
      takeDraftOption(S, o);
      S.queue.shift();
      toast(`${optName(o)} chosen`, 'good');
      afterPrompt();
    });
    if (o.t === 'char' && (o.ch.rarity === 'legendary' || o.ch.rarity === 'epic')) f.el.classList.add('legend');
    row.append(f.el);
    return f;
  });
  const hint = h('p', { class: 'muted center' }, 'Revealing…');
  openModal(h('div', { class: 'mbox reveal' }, h('h2', {}, t), h('p', { class: 'muted' }, sub), row, hint));
  flipAll(flips, 450).then(() => { ready = true; hint.textContent = 'Tap a card to keep it.'; });
}

function heirCard(hr: Heir) {
  const a = RULER_ARCHS[hr.arch];
  return h('div', { class: 'card k-event heir' },
    h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, hr.historical ? 'Heir of history' : 'Heir')),
    h('div', { class: 'c-art', html: icon(a.role ? ({ general: 'helm', diplomat: 'scroll', admin: 'quill', merchant: 'coin', researcher: 'book' } as Record<string, string>)[a.role] : 'crown', 30) }),
    h('div', { class: 'c-name c-title' }, hr.name),
    h('div', { class: 'c-rarity' }, `${a.name} · skill ${hr.skill}`),
    h('div', { class: 'c-text' }, a.desc),
    h('div', { class: 'c-text muted' }, `Likely reign: ~${hr.reign} years`));
}

function showSuccession(heirs: Heir[], old: string) {
  const row = h('div', { class: 'reveal-row' });
  let ready = false;
  const flips = heirs.map((hr, i) => {
    const f = flipCard(heirCard(hr), 'Heir');
    f.el.classList.add('heirflip');
    f.el.addEventListener('click', () => { if (!ready) return; chooseHeir(S, i); toast(`Long live ${player(S).ruler.name}!`, 'good'); afterPrompt(); });
    row.append(f.el);
    return f;
  });
  const hint = h('p', { class: 'muted center' }, 'Revealing the heirs…');
  openModal(h('div', { class: 'mbox reveal' }, h('h2', {}, `${old} is dead`), h('p', { class: 'muted' }, 'Choose who takes the crown. Their talents shape the cards you draw.'), row, hint));
  flipAll(flips, 450).then(() => { ready = true; hint.textContent = 'Tap an heir to crown them.'; });
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
  const draw = (last?: { mine: string; theirs: string; myC: boolean; theirC: boolean; dmgMe: number; dmgThem: number }) => {
    clear(box);
    const foeName = foe.nation === 'rebels' ? 'Rebels' : nationName(S, foe.nation);
    const ctx = { conquer: 'Siege of', defend: 'Defence of', raid: 'Raid on', rebels: 'Fighting at', sea: 'Sea battle off' }[b.context];
    box.append(h('div', { class: 'b-head' }, h('h2', {}, `${ctx} ${prov.name}`), h('p', { class: 'muted' }, `Round ${Math.min(3, b.round + (b.done ? 0 : 1))} of 3 · ${foeName}${foe.fort ? ` · fort ${foe.fort}` : me.fort ? ` · your fort ${me.fort}` : ''}`)));
    const side = (sd: typeof me, label: string, cls: string) => h('div', { class: 'b-side ' + cls },
      h('div', { class: 'b-label' }, h('b', {}, label), h('small', {}, sd.general ? `${sd.general.name}` : 'No general'),
        h('span', { class: 'hpbar' }, h('i', { style: `width:${Math.round(ratio(sd) * 100)}%` }), h('em', { style: `left:${breakLevel(sd) * 100}%`, title: 'Breaking point' }), h('span', {}, `${Math.round(ratio(sd) * 100)}%`))),
      h('div', { class: 'uchips' }, sd.units.map(unitChip)));
    box.append(side(foe, foeName, 'foe'));
    const slotFoe = h('div', { class: 'slot' }), slotMe = h('div', { class: 'slot' });
    if (last) {
      slotFoe.append(tacticCard(last.theirs, { small: true, cls: last.theirC ? 'countered' : '' }));
      slotMe.append(tacticCard(last.mine, { small: true, cls: last.myC ? 'countered' : '' }));
    } else if (!b.done) {
      slotFoe.append(b.scout ? tacticCard(b.enemyNext, { small: true, cls: 'scouted' }) : backCard('?', { small: true }));
      slotMe.append(h('div', { class: 'slot-empty' }, 'Your tactic'));
    }
    box.append(h('div', { class: 'b-mid' }, slotFoe, h('div', { class: 'vs' }, last ? h('div', { class: 'dmg' },
      h('span', { class: 'good' }, `You deal ${last.dmgThem}`), h('span', { class: 'bad' }, `You take ${last.dmgMe}`),
      last.theirC ? h('span', { class: 'good' }, 'Their tactic was countered!') : null, last.myC ? h('span', { class: 'bad' }, 'Your tactic was countered!') : null) : 'vs'), slotMe));
    box.append(side(me, 'Your army', 'mine'));
    if (b.done) {
      const out = b.result ?? (b.result = finishBattle(S, b));
      save();
      box.append(h('div', { class: 'b-result ' + (out.good ? 'win' : 'loss') }, h('h3', {}, out.title), ...out.lines.map(l => h('p', {}, l))),
        h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); afterPrompt(); } }, 'Continue')));
      return;
    }
    if (last) { box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => draw() }, 'Next round'))); return; }
    box.append(h('p', { class: 'muted center' }, b.scout ? 'Your scouts have seen the enemy\'s plan.' : 'Choose a tactic. The enemy has already chosen theirs, face-down.'));
    box.append(h('div', { class: 'cards-row center' }, b.options.map(t => tacticCard(t, { onclick: () => commit(t) }))));
    box.append(h('p', { class: 'muted small center' }, COUNTER_TEXT));
    box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: () => { autoResolve(S, b); draw(); } }, 'Auto-resolve')));
  };
  const commit = (t: string) => {
    const beforeMe = hp(me), beforeFoe = hp(foe);
    const lg = playRound(S, b, t);
    const att = b.playerSide === 'att';
    draw({ mine: att ? lg.attTactic : lg.defTactic, theirs: att ? lg.defTactic : lg.attTactic, myC: att ? lg.attCountered : lg.defCountered, theirC: att ? lg.defCountered : lg.attCountered, dmgMe: Math.round(beforeMe - hp(me)), dmgThem: Math.round(beforeFoe - hp(foe)) });
    box.querySelectorAll('.slot .card').forEach(c => c.classList.add('slam'));
  };
  draw();
  openModal(box);
}

function showPeace(enemy: string, offered: boolean) {
  const n = S.nations[enemy];
  if (!n?.alive || !atWar(S, S.player, enemy)) { S.queue.shift(); afterPrompt(); return; }
  const score = warScore(S, enemy);
  const box = h('div', { class: 'mbox narrow peace' });
  let chosen: string[] = [];
  const draw = () => {
    clear(box);
    box.append(h('h2', {}, `Peace with ${n.name}`), h('p', { class: 'muted' }, `${offered ? `${n.name} asks for peace. ` : ''}War score ${score > 0 ? '+' : ''}${score}: ${score > 10 ? 'you are winning and set the terms.' : score < -10 ? 'they are winning and set the terms.' : 'neither side has the upper hand.'}`));
    if (score > 10) {
      const spent = peaceTerms(S, enemy).filter(t => chosen.includes(t.id)).reduce((a, t) => a + t.cost, 0);
      box.append(h('h3', {}, `Your demands (${spent}/${score} points)`));
      const list = h('div', { class: 'tlist' });
      for (const t of peaceTerms(S, enemy)) {
        const on = chosen.includes(t.id);
        const goldClash = t.id.startsWith('gold') && chosen.some(c => c.startsWith('gold') && c !== t.id);
        const tooMuch = !on && spent + t.cost > score;
        list.append(h('button', { class: 'trow term' + (on ? ' on' : '') + (tooMuch || goldClash ? ' blocked' : ''), onclick: () => {
          if (on) chosen = chosen.filter(c => c !== t.id); else if (goldClash) chosen = [...chosen.filter(c => !c.startsWith('gold')), t.id]; else if (tooMuch) return toast('Not enough war score for that', 'bad'); else chosen = [...chosen, t.id];
          draw();
        } }, h('span', { class: 'chk' }, on ? '✓' : ''), h('div', { class: 'a-t' }, h('b', {}, t.label), h('small', {}, t.detail)), h('b', { class: 'cost' }, String(t.cost))));
      }
      box.append(list);
      box.append(h('div', { class: 'mrow' },
        offered ? h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); toast('The war goes on'); afterPrompt(); } }, 'Fight on') : null,
        h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); const items = concludePeace(S, enemy, chosen); closeModal(); refresh(); showReveal(`Peace with ${n.name}`, 'The treaty is sealed', items, afterPrompt); } }, chosen.length ? 'Sign the treaty' : 'Sign a white peace')));
    } else if (score < -10) {
      const dem = enemyDemands(S, enemy);
      box.append(h('h3', {}, 'They demand'));
      box.append(h('ul', { class: 'traits' }, dem.length ? dem.map(t => h('li', {}, t.label)) : h('li', {}, 'Nothing more than peace')));
      box.append(h('div', { class: 'mrow' },
        h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); toast('The war goes on'); afterPrompt(); } }, 'Refuse and fight on'),
        h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); const items = concludePeace(S, enemy, dem.map(t => t.id), true); closeModal(); refresh(); showReveal(`Peace with ${n.name}`, 'You accept their terms', items, afterPrompt); } }, 'Accept their terms')));
    } else {
      box.append(h('div', { class: 'mrow' },
        offered ? h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); toast('The war goes on'); afterPrompt(); } }, 'Fight on') : null,
        h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); const items = concludePeace(S, enemy, []); closeModal(); refresh(); showReveal(`Peace with ${n.name}`, 'A white peace', items, afterPrompt); } }, 'Sign a white peace')));
    }
  };
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
