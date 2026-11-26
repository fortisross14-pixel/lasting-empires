// The game screen: top bar, map, deck tabs, the strip of wars and tasks, the tutorial, and refresh().
import { syncMusic } from './music';
import './longpress';
import { showHand, renderHandBtn } from './hand';
import { renderGoalBar } from './goalbar';
import { renderAgenda } from './agenda';
import { renderCamera, agendaPins, goHome } from './camera';
import { sfx } from './sound';
import type { GameState, RevealItem } from '../types';
import { CATS } from '../types';
import { TECH, BUILDINGS } from '../data/techs';
import { goalView } from '../engine/goals';
import { GOODS } from '../data/goods';
import { GENRES } from '../data/culture';
import { cultureName } from '../engine/culture';
import { PIONEER_YEARS } from '../data/eras';
import { ageOf, nextAge } from '../engine/ages';
import { player, push, pioneerNow, provsOf, incomeOf, playerManpower, enemiesOf, nationName } from '../engine/core';
import { CAT_INFO, handOf, cardRates, npRate, handLimit, heldOf } from '../engine/cards';
import { MISSION_INFO, techCost } from '../engine/missions';
import { h, $, clear, fmt, signed } from './dom';
import { icon } from './icons';
import { setCardGame } from './cards';
import { warScore } from '../engine/diplo';
import { moodName, RELIGION_NAMES } from '../engine/society';
import { MapView, MAP_MODES, legendFor } from './map';
import { attention, SKIP_MAX } from '../engine/pace';
import { settings } from './settings';
import { S, map, shownRealm, sheet, win, todo, seenTodo, shield, save, setS, setMap, setShownRealm, setTodo } from './state';
import { recordMission } from './title';
import { toggleWin, openWin, renderWin } from './windows/frame';
import { toggleSheet, openSheet, closeSheet, renderSheet } from './sheets';
import { showGameMenu } from './modal';
import { pickHand, onMapPick } from './planner';
import { onEndTurn, onSkipAhead } from './endturn';
import { processQueue } from './prompts';

export function start(s: GameState) {
  setS(s);
  seenTodo.clear();
  const root = clear($('#app'));
  root.append(
    h('header', { id: 'top' }),
    h('main', { id: 'board' }, h('div', { id: 'goalbar', hidden: true }), h('div', { id: 'timeline' }), h('section', { id: 'agenda', hidden: true, 'aria-label': 'Empire agenda' }), h('button', { id: 'handbtn', 'aria-label': 'Your cards', onclick: () => showHand() }),
      h('button', { class: 'viewpill', id: 'modebtn', 'aria-label': 'Map view', onclick: () => toggleModes() }, h('span', { html: icon('map', 16) }), h('span', { id: 'modelabel' }, 'Map: Realms'), h('span', { class: 'caret' }, '▾')),
      h('div', { id: 'modes', hidden: true }), h('div', { id: 'legend', hidden: true }),
      h('div', { id: 'tracker' }), h('div', { id: 'cam', role: 'toolbar', 'aria-label': 'Map camera' })),
    h('aside', { id: 'sheet', hidden: true }),
    h('section', { id: 'win', hidden: true, role: 'dialog', 'aria-modal': 'false' }),
    h('nav', { id: 'tabs' }),
    h('div', { id: 'modal', hidden: true }),
    h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }),
  );
  setMap(new MapView($('#board')));
  map.onPick = onMapPick;
  map.onSelect = id => { setShownRealm(null); if (pickHand != null) { if (id) toast('Hold your finger on the province to choose it'); return; } if (id) openSheet('province', id); else if (sheet?.kind === 'province') closeSheet(); };
  document.documentElement.style.setProperty('--me', player(S).color);
  refresh();
  requestAnimationFrame(() => goHome()); // home and its frontier, not the sea between far colonies
  processQueue();
}

export function toggleModes() {
  const box = $('#modes');
  if (!box.hidden) { box.hidden = true; return; }
  clear(box).append(...MAP_MODES.map(m => h('button', { class: 'mode-b' + (map.mode === m.id ? ' on' : ''), onclick: () => { map.setMode(m.id, S); box.hidden = true; renderLegend(); } }, h('span', { html: icon(m.icon, 16) }), m.name)));
  box.hidden = false;
}

export function renderLegend() {
  const lbl = document.getElementById('modelabel');
  if (lbl) lbl.textContent = 'Map: ' + MAP_MODES.find(m => m.id === map.mode)!.name;
  const box = $('#legend');
  const items = legendFor(S, map.mode);
  box.hidden = map.mode === 'political';
  if (box.hidden) return;
  const title = MAP_MODES.find(m => m.id === map.mode)!.name;
  const name = (k: string) => map.mode === 'religion' ? RELIGION_NAMES[k] ?? k : map.mode === 'goods' ? GOODS[k]?.name ?? k : k;
  clear(box).append(h('b', {}, title), ...items.map(i => h('span', { class: 'lg', title: map.mode === 'goods' ? GOODS[i.label]?.desc ?? '' : '', onclick: map.mode === 'goods' ? () => toast(`${GOODS[i.label].name}: ${GOODS[i.label].desc}`) : undefined },
    i.icon ? h('i', { class: 'lg-ic', style: `background:${i.color}`, html: icon(i.icon, 12) }) : h('i', { style: `background:${i.color}` }), name(i.label))),
    h('button', { class: 'lg-x', 'aria-label': 'Back to realms', onclick: () => { map.setMode('political', S); renderLegend(); }, html: icon('close', 14) }));
}

// ---------- tutorial: a few notes from the chancellor in the first game ----------
export interface TutStep { title: string; text: string; done?: () => boolean; next?: boolean; }
export const TUTORIAL: TutStep[] = [
  { title: 'Welcome, Majesty', text: 'One turn is one quarter of a year. Everything you do starts with a card: you draw them through the year, in six kinds. Let me show you around.', next: true },
  { title: 'Your treasury', text: 'At the top: ducats, manpower (1 per troop or person you hire), nation points (to buy cards), stability and the people\'s happiness. Tap the year to see the current age.', next: true },
  { title: 'Open a menu', text: 'The six menus are at the bottom. Open Internal.', done: () => win?.cat === 'internal' },
  { title: 'Cards', text: 'Every menu opens on your cards. Tap one to use it. The Buy row spends nation points (the star at the top) on a new person, troop or action card.', next: true },
  { title: 'Send someone out', text: 'Most cards are tasks for a person: tap the card, choose where, then who goes. Better people get better results. A task takes a few seasons, and a bigger realm can start more each year.', done: () => S.missions.length > 0, next: true },
  { title: 'Armies', text: 'Open Military. Troops stand in your capital or in provinces with Barracks, and only those within a quarter\'s march can fight. Cards → Forge merges two companies into a stronger one.', done: () => win?.cat === 'military' },
  { title: 'The map', text: 'Close the menu and tap any province for its details and actions. "Map: Realms" at the bottom right switches to culture, religion, raw materials, happiness or population.', next: true },
  { title: 'End the turn', text: 'Press End Turn at the top right. Every winter you get the year\'s report: money, cards, battles and tasks.', done: () => (S.quarter ?? 0) !== 0 || S.year !== S.startYear },
  { title: 'Rule well', text: 'Ages open by research, rivals form coalitions if you conquer too fast, and unhappy provinces may rise. The Chronicle (in the Menu) shows the rankings. Good luck.', next: true },
];
export function renderTutorial() {
  let el = document.getElementById('tut');
  const i = S.tutorial ?? -1;
  if (i < 0 || i >= TUTORIAL.length) { el?.remove(); return; }
  const st = TUTORIAL[i];
  if (st.done?.()) { S.tutorial = i + 1; return renderTutorial(); }
  if (!el) { el = h('div', { id: 'tut', role: 'note' }); document.getElementById('app')!.append(el); }
  clear(el).append(h('small', {}, `Chancellor's note ${i + 1}/${TUTORIAL.length}`), h('b', {}, st.title), h('p', {}, st.text),
    h('div', { class: 'tut-acts' },
      h('button', { class: 'btn ghost small', onclick: () => { S.tutorial = -1; renderTutorial(); save(); } }, 'Skip tutorial'),
      st.next ? h('button', { class: 'btn primary small', onclick: () => { S.tutorial = i + 1; renderTutorial(); save(); } }, i === TUTORIAL.length - 1 ? 'Finish' : 'Next') : null));
}

/** Test hooks for the browser checks: the game in play, and a redraw. */
(globalThis as { __game?: () => unknown; __refresh?: () => void }).__game = () => S;
(globalThis as { __refresh?: () => void }).__refresh = () => refresh();
(globalThis as { __map?: () => unknown }).__map = () => map;
export function refresh() {
  if (undoStack.length && gameMark() !== undoStack[undoStack.length - 1].mark) clearUndo(); // moved on by something that cannot be undone
  setCardGame(S);
  recordMission();
  map.realm = sheet?.kind === 'nation' ? sheet.arg ?? null : shownRealm;
  setTodo(attention(S));
  for (const id of [...seenTodo]) if (!todo.some(a => a.id === id)) seenTodo.delete(id); // gone and back again is news
  renderTop(); renderTabs(); renderHandBtn(); renderGoalBar(); agendaPins(); map.render(S); renderTimeline(); renderTracker(); renderLegend(); renderAgenda(); renderCamera();
  syncMusic(player(S).culture);
  if (sheet) renderSheet();
  if (win) renderWin();
  renderTutorial();
  save();
}

export function toast(msg: string, tone: 'good' | 'bad' | 'neutral' = 'neutral') {
  const t = $('#toast');
  const el = h('div', { class: 'toast-msg t-' + tone }, msg);
  t.append(el);
  if (tone === 'bad') sfx('knock');
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

/** Undo for the season: every action that showed the player nothing new (no draw, no outcome, no question) can be
 *  taken back, one after another, until the turn ends. Each step keeps the game as it was before and a fingerprint of
 *  the game just after: if the game has moved since by an action that cannot be undone, the whole stack is dropped,
 *  so undo never takes back more than it says. */
interface UndoStep { snap: string; what: string; mark: string; }
let undoStack: UndoStep[] = [];
/** How many steps are kept (each is a whole saved game). */
export const UNDO_MAX = 12;
let undoEl: HTMLElement | null = null;
/** A cheap fingerprint of the game: almost every action writes to the log or moves one of these. */
const gameMark = () => [S.hand.length, S.missions.length, S.troops.length, S.characters.length, S.queue.length, Math.round(player(S).gold * 10), S.np, S.year, S.quarter,
  S.log.length, S.wars.length, S.treaties.length, S.routes.length, S.troops.map(t => `${t.loc}${t.moving ? '>' + t.moving : ''}`).join(','),
  provsOf(S, S.player).map(p => p.make ?? '').join(',')].join('|');
export interface UndoToken { snap: string; mark: string; asked: number; }
/** Call before an action that may be taken back. */
export function undoBegin(): UndoToken { return { snap: JSON.stringify(S), mark: gameMark(), asked: S.queue.length }; }
/** Call after it succeeded: it joins the stack unless the game asked or revealed something on the way. */
export function undoCommit(t: UndoToken, what: string) {
  if (S.queue.length !== t.asked) { clearUndo(); return; }
  const top = undoStack[undoStack.length - 1];
  if (top && top.mark !== t.mark) undoStack = []; // something that cannot be undone happened in between
  undoStack.push({ snap: t.snap, what, mark: gameMark() });
  if (undoStack.length > UNDO_MAX) undoStack.shift();
}
export const undoCount = () => undoStack.length;
export const undoLabel = () => undoStack[undoStack.length - 1]?.what ?? '';
/** Take back the last step. */
export function undoLast() {
  const st = undoStack.pop();
  if (!st) return;
  undoEl?.remove(); undoEl = null;
  setS(JSON.parse(st.snap) as GameState);
  sfx('flip');
  refresh();
  toast(`Taken back: ${st.what}`);
}
/** A short strip after the action, with Undo, as a reminder; the top bar keeps an Undo button for the whole season. */
export function offerUndo(t: UndoToken, what: string) {
  undoCommit(t, what);
  if (!undoStack.length) { toast(what, 'good'); return; }
  undoEl?.remove();
  const el = undoEl = h('div', { class: 'toast-msg t-good undo' }, h('span', {}, what), h('button', { class: 'btn small', onclick: undoLast }, 'Undo'));
  $('#toast').append(el);
  setTimeout(() => { if (undoEl === el) { el.remove(); undoEl = null; } }, UNDO_SECONDS * 1000);
}
export function clearUndo() { undoStack = []; undoEl?.remove(); undoEl = null; }
export const UNDO_SECONDS = 6;

/** Run an action from a button: show its error, or its message, and redraw. With `undo`, it can be taken back. */
export function act(fn: () => string | null | void, okMsg?: string, undo?: string) {
  const t = undo ? undoBegin() : null;
  const r = fn();
  if (typeof r === 'string' && r) toast(r, 'bad');
  else {
    if (t) undoCommit(t, undo!);
    if (okMsg) toast(okMsg, 'good');
  }
  refresh();
  processQueue();
}

// ---------- top bar ----------
export function showEra() {
  const e = ageOf(S), next = nextAge(S);
  const who = S.age?.pioneer ? (S.age.pioneer === S.player ? 'You opened it' : `Opened by ${nationName(S, S.age.pioneer)}`) : 'The world begins here';
  const items: RevealItem[] = [{ title: `Since ${S.age?.since ?? S.startYear}`, text: `${e.text} ${who}.`, tone: 'neutral', kind: 'star' }, ...e.effects.map(x => ({ title: 'This age', text: x, tone: 'good' as const, kind: e.icon }))];
  if (pioneerNow(S)) items.push({ title: 'Pioneer', text: `+0.4 ${e.focus} cards a year until ${(S.age?.since ?? 0) + PIONEER_YEARS}.`, tone: 'good', kind: 'crown' });
  if (next) items.push({ title: `Next: ${next.name}`, text: `${next.opens?.how ?? ''} The realm that opens it gains prestige, nation points, 2 ${next.focus} cards and a ${PIONEER_YEARS}-year bonus.`, tone: 'neutral', kind: next.icon });
  push(S, { kind: 'reveal', title: e.name, subtitle: 'The ages open by research and events, not by the calendar', items });
  processQueue();
}

export function renderTop() {
  const me = player(S);
  const inc = incomeOf(S, S.player);
  const mp = playerManpower(S);
  const top = clear($('#top'));
  const sc = S.scenario;
  const goalsBadge = sc ? (sc.status === 'active' ? (sc.steps?.length ? `${sc.step ?? 0}/${sc.steps.length}` : `${sc.goals.filter(g => goalView(S, g, sc.deadline).met).length}/${sc.goals.length}`) : sc.status === 'won' ? '✓' : '✗') : '';
  top.append(
    h('button', { class: 'crest', onclick: () => toggleSheet('realm'), style: `--nc:${me.color}`, 'aria-label': `${me.name}: realm and ruler` },
      shield(S.player, me.color, true),
      h('span', { class: 'crest-t' }, h('b', {}, me.name), h('small', {}, me.ruler.name))),
    h('button', { class: 'year', title: ageOf(S).name, onclick: () => showEra() }, h('span', { class: 'year-n' }, String(S.year)), h('small', {}, h('span', { class: 'yr-s' }, SEASONS[S.quarter ?? 0]), h('span', { class: 'yr-a' }, ` · ${ageOf(S).name.replace('Age of ', '')}`))),
    // the realm at a glance: what you spend (ducats, men, nation points) and how the realm feels
    h('div', { class: 'res' },
      chip('coin', fmt(me.gold), signed(inc.total), 'Ducats', inc.total < 0 ? 'bad' : ''),
      chip('people', String(Math.floor(me.manpower)), '+' + mp.gain.toFixed(1), 'Manpower'),
      chip('star', S.np.toFixed(1), '+' + npRate(S).rate.toFixed(1), 'Nation points'),
      h('button', { class: 'chip stab', title: 'Stability', 'aria-label': `Stability ${me.stability}`, onclick: () => openSheet('realm') },
        h('span', { html: icon('scales', 16) }),
        h('span', { class: 'pips' }, ...[-3, -2, -1, 0, 1, 2, 3].map(v => h('i', { class: (v === 0 ? 'zero ' : '') + (me.stability >= v && v > 0 ? 'on' : me.stability <= v && v < 0 ? 'neg' : '') }))),
        h('span', { class: 'sr' }, `Stability ${me.stability}`)),
      chip('mood', `${S.happiness ?? 50}%`, moodName(S.happiness ?? 50), 'Happiness'),
      chip('laurel', fmt(me.prestige), '', 'Prestige'),
    ),
    h('div', { class: 'top-btns' },
      false && sc ? h('button', { class: 'tbtn goals-b' + (sheet?.kind === 'goals' ? ' on' : '') + ' st-' + sc!.status, onclick: () => toggleSheet('goals'), title: 'Mission goals', 'aria-label': 'Mission goals' },
        h('span', { html: icon('star', 18) }), h('span', { class: 'tb-l' }, 'Goals'), h('span', { class: 'badge' }, goalsBadge)) : null,
      // the tasks under way are a main part of the game: their own button, with how many are out
      h('button', { class: 'tbtn tasks-b' + (sheet?.kind === 'missions' ? ' on' : ''), onclick: () => toggleSheet('missions'), title: 'Tasks under way', 'aria-label': `Tasks under way: ${S.missions.length}` },
        h('span', { html: icon('hourglass', 18) }), h('span', { class: 'tb-l' }, 'Tasks'), S.missions.length ? h('span', { class: 'badge' }, String(S.missions.length)) : null),
      h('button', { class: 'tbtn menu-b', onclick: () => showGameMenu(), title: 'Menu', 'aria-label': 'Menu' },
        h('span', { html: icon('list', 18) }), h('span', { class: 'tb-l' }, 'Menu')),
      undoCount() ? h('button', { class: 'tbtn undo-b', onclick: undoLast, title: `Undo: ${undoLabel()}  ( Ctrl+Z )`, 'aria-label': `Undo: ${undoLabel()}. ${undoCount()} step${undoCount() > 1 ? 's' : ''} can be taken back this season` },
        h('span', { html: icon('undo', 18) }), h('span', { class: 'tb-l' }, 'Undo'), undoCount() > 1 ? h('span', { class: 'badge' }, String(undoCount())) : null) : null,
      settings().skip ? h('button', { class: 'tbtn skip-b', onclick: onSkipAhead, title: 'Skip ahead until something happens', 'aria-label': `Skip ahead: play up to ${SKIP_MAX} seasons, stopping when something needs you` },
        h('span', { html: icon('skip', 18) }), h('span', { class: 'tb-l' }, 'Skip')) : null,
      endTurnButton()),
  );
}
/** End Turn, with a badge that says what kind of thing is waiting: urgent things in the war colour, else all in ink. */
function endTurnButton() {
  const urgent = todo.filter(a => a.tier === 'urgent').length;
  const n = urgent || todo.length;
  const what = urgent ? `${urgent} urgent thing${urgent > 1 ? 's' : ''} need${urgent > 1 ? '' : 's'} you` : todo.length ? `${todo.length} thing${todo.length > 1 ? 's' : ''} you could do` : '';
  return h('button', { id: 'endturn', class: 'btn primary', onclick: onEndTurn, title: what || undefined, 'aria-label': `End turn, ${SEASONS[S.quarter ?? 0]} ${S.year}${what ? '. ' + what : ''}` },
    h('span', { class: 'et-l' }, 'End Turn'), h('small', {}, `${SEASONS[S.quarter ?? 0]} ${S.year}`),
    n ? h('span', { class: 'badge et-badge' + (urgent ? ' urgent' : '') }, urgent ? `!${urgent}` : String(n)) : null);
}
export function chip(ic: string, v: string, sub: string, label: string, tone = '') {
  // each number opens the screen that explains it
  const go = label === 'Ducats' ? () => openWin('economy', 'ledger') : label === 'Manpower' ? () => openWin('military', 'army') : label === 'Happiness' ? () => openWin('culture', 'cultures') : () => openSheet('realm');
  return h('button', { class: 'chip ' + tone, title: label, 'aria-label': `${label} ${v}${sub ? ', ' + sub : ''}`, onclick: go }, h('span', { html: icon(ic, 16) }), h('b', {}, v), sub ? h('small', {}, sub) : null);
}

export function renderTabs() {
  const nav = clear($('#tabs'));
  const rates = cardRates(S);
  for (const c of CATS) {
    const n = handOf(S, c).length;
    nav.append(h('button', { class: 'tab' + (win?.cat === c ? ' on' : ''), onclick: () => toggleWin(c), style: `--cc:${CAT_INFO[c].color}` },
      h('span', { class: 'tab-i', html: icon(CAT_INFO[c].icon, 20) }, todo.some(a => a.id === 'deck:' + c) ? h('i', { class: 'tab-dot', title: 'A card here can be played now' }) : null, n ? h('span', { class: 'tab-c' + (heldOf(S, c) > handLimit(S) ? ' over' : ''), 'aria-label': `${n} cards in hand, limit ${handLimit(S)}` }, String(n)) : null),
      h('span', { class: 'tab-l' }, c === 'diplomacy' ? 'Diplomacy' : CAT_INFO[c].name),
      h('span', { class: 'tab-n', title: 'New cards a year' }, `+${rates[c].rate.toFixed(1)}/yr`)));
  }
}

/** The strip over the map: your wars first, then missions under way. */
export function renderTimeline() {
  const tl = clear($('#timeline'));
  // a guided mission's next step is shown in the goal banner (goalbar.ts)
  const foes = enemiesOf(S, S.player);
  const inc = S.incoming ?? [];
  if (foes.length) {
    tl.append(h('span', { class: 'tl-h war' }, 'At war'));
    for (const f of foes) {
      const sc = warScore(S, f);
      const w = S.wars.find(x => (x.a === f && x.b === S.player) || (x.b === f && x.a === S.player));
      const coming = inc.filter(i => i.nation === f).length;
      tl.append(h('button', { class: 'tl-card tl-war', style: `--nc:${S.nations[f].color}`, onclick: () => openWin('military', 'wars') },
        h('span', { class: 'tl-rose', html: icon('sword', 14) }), h('span', { class: 'tl-t' }, S.nations[f].name),
        h('small', {}, coming ? `${coming} attack${coming > 1 ? 's' : ''} coming!` : `score ${sc > 0 ? '+' : ''}${sc} · since ${w?.since ?? S.year}`)));
    }
  }
  const ms = S.missions.filter(m => m.kind !== 'route').slice(0, 6);
  if (ms.length) {
    tl.append(h('span', { class: 'tl-h' }, 'Tasks'));
    for (const m of ms) {
      const pct = m.kind === 'research' ? Math.min(100, (m.progress / techCost(S, m.target)) * 100) : ((m.total - m.turnsLeft) / Math.max(1, m.total)) * 100;
      tl.append(h('button', { class: 'tl-card tl-m', onclick: () => openSheet('missions') },
        h('span', { class: 'tl-rose', html: icon(MISSION_INFO[m.kind].icon, 14) }), h('span', { class: 'tl-t' }, missionTitle(m)),
        h('small', {}, h('i', { class: 'tl-bar' }, h('i', { style: `width:${Math.round(pct)}%` })), ` ${qLabel(m.turnsLeft)}`)));
    }
    if (S.missions.length > ms.length) tl.append(h('button', { class: 'tl-card tl-more', onclick: () => openSheet('missions') }, h('span', { class: 'tl-t' }, `+${S.missions.length - ms.length} more`)));
  }
}

export function missionTitle(m: GameState['missions'][number]) {
  const study = m.kind === 'assist' ? S.missions.find(x => String(x.id) === m.target) : null;
  const tname = study ? TECH[study.target]?.name ?? '' : m.kind === 'artwork' ? GENRES[m.target]?.name ?? '' : m.kind === 'accept' ? cultureName(m.target) : m.kind === 'route' ? `${GOODS[m.good ?? '']?.name ?? ''} ${m.dir === 'sell' ? 'to' : 'from'} ${nationName(S, m.target)}` : S.provinces[m.target]?.name ?? S.nations[m.target]?.name ?? TECH[m.target]?.name ?? '';
  return `${MISSION_INFO[m.kind].name}${m.kind === 'build' ? ': ' + BUILDINGS[m.building!].name : ''}${tname ? ' · ' + tname : ''}`;
}

export function renderTracker() {
  const tr = clear($('#tracker'));
  return; // missions now show in the strip over the map
  for (const m of S.missions.slice(0, 8)) {
    tr.append(h('button', { class: 'trk', onclick: () => openSheet('missions') },
      h('span', { html: icon(MISSION_INFO[m.kind].icon, 14) }), h('span', { class: 'trk-t' }, missionTitle(m)), h('b', {}, qLabel(m.turnsLeft))));
  }
  if (S.missions.length > 8) tr.append(h('button', { class: 'trk', onclick: () => openSheet('missions') }, `+${S.missions.length - 8} more`));
}

// ---------- sheets ----------
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
/** A garrison or base as the player reads it. */
export const placeName = (loc: string) => (loc.startsWith('base:') ? `Camp near ${S.provinces[loc.slice(5)]?.name ?? ''}` : S.provinces[loc]?.name ?? loc);
/** Turns are quarters: show them as quarters, or years when long. */
export const qLabel = (n: number) => (n >= 8 ? `${Math.round(n / 4)} yr` : `${n} q`);
export const qText = (n: number) => (n >= 8 ? `${Math.round(n / 4)} years` : `${n} quarter${n > 1 ? 's' : ''}`);
