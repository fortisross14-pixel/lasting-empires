// The centred window of a deck: its tabs and which screen each one opens.
import type { Character, Cat } from '../../types';
import { CATS } from '../../types';
import { reduced } from '../dom';
import { simplify } from '../simplify';
import { TECHS } from '../../data/techs';
import { churchRel, cultureRows } from '../../engine/culture';
import { provsOf, incomeOf, enemiesOf, alliesOf, armyPower, armyCap } from '../../engine/core';
import { CAT_INFO, handOf } from '../../engine/cards';
import { MISSION_INFO } from '../../engine/missions';
import { h, $, clear, signed } from '../dom';
import { icon } from '../icons';
import { subjectsOf } from '../../engine/diplo';
import { nationalHappiness } from '../../engine/society';
import { rankOf, missionCap } from '../../engine/realm';
import { S, sheet, win, winPage, setSheet, setPick, setCv, setWin, setForge, setWinPage } from '../state';
import { refresh } from '../app';
import { govTab, realmTab, coreSection, provincesTab } from './internal';
import { cardsTab, missionsTab } from './cards';
import { armyTab, navyTab, warsTab } from './military';
import { subjectsTab, realmsTab } from './diplomacy';
import { ledgerTab, goodsTab, tradeTab } from './economy';
import { culturesTab, religionTab, artsTab } from './culture';
import { techTab } from './research';
import { armBack, dismissPage, pageFresh, pageShown } from '../modal';
import { pickHand, stopMapPick } from '../planner';

// ---------- the core menus: a centred window with tabs ----------
export const WIN_TABS: Record<Cat, [string, string][]> = {
  military: [['cards', 'Cards'], ['army', 'Army'], ['navy', 'Navy'], ['wars', 'Wars & battles']],
  diplomacy: [['cards', 'Cards'], ['realms', 'Realms'], ['subjects', 'Subjects']],
  internal: [['cards', 'Cards'], ['gov', 'Government'], ['core', 'Core'], ['realm', 'Rank & viceroys'], ['provinces', 'Provinces']],
  economy: [['cards', 'Cards'], ['goods', 'Goods'], ['trade', 'Trade'], ['ledger', 'Ledger']],
  culture: [['cards', 'Cards'], ['cultures', 'Cultures'], ['religion', 'Religion'], ['arts', 'Arts']],
  research: [['cards', 'Cards'], ['tech', 'Technologies']],
};
export function toggleWin(cat: Cat) { if (win?.cat === cat) closeWin(); else openWin(cat); }
export function openWin(cat: Cat, tab = win?.cat === cat ? win.tab : 'cards') {
  if (pickHand != null) stopMapPick();
  if (sheet) { setSheet(null); $('#sheet').hidden = true; }
  if (win?.cat !== cat) { setPick({}); setCv({ filter: 'all', mode: 'browse', sel: [] }); }
  setWinPage(null);
  setWin({ cat, tab });
  armBack();
  const wasHidden = $('#win').hidden;
  $('#win').hidden = false;
  if (wasHidden) { $('#win').classList.add('fresh'); setTimeout(() => $('#win').classList.remove('fresh'), 500); }
  refresh();
}
export function closeWin() { setWin(null); setWinPage(null); setPick({}); setForge([]); $('#win').hidden = true; refresh(); }
export function renderWin() {
  if (!win) return;
  const el = clear($('#win'));
  const { cat, tab } = win;
  const prev = document.querySelector('#win .win-body')?.scrollTop ?? 0;
  const body = h('div', { class: 'win-body' });
  const head = h('div', { class: 'win-head', style: `--cc:${CAT_INFO[cat].color}` },
    h('span', { class: 'win-ico', html: icon(CAT_INFO[cat].icon, 22) }),
    h('div', { class: 'win-titles' }, h('h2', {}, CAT_INFO[cat].name), h('p', {}, winSub(cat))),
    h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeWin, html: icon('close', 18) }));
  // a card, a task or a person being looked at takes the place of the tabs, with a way back
  if (winPage) {
    const at = document.querySelector('#win .win-page')?.scrollTop ?? 0;
    const wrap = h('div', { class: 'win-page' + (pageFresh ? ' in' : '') },
      h('button', { class: 'btn ghost small page-back', onclick: () => dismissPage() }, `‹ Back to ${CAT_INFO[cat].name}`), winPage);
    pageShown();
    el.append(head, wrap);
    wrap.scrollTop = at;
    return;
  }
  const tabs = h('div', { class: 'win-tabs', role: 'tablist' }, WIN_TABS[cat].map(([id, label]) =>
    h('button', { class: 'win-tab' + (tab === id ? ' on' : ''), role: 'tab', 'aria-selected': String(tab === id), onclick: () => { setWin({ cat, tab: id }); renderWin(); } }, label,
      id === 'cards' ? h('span', { class: 'win-n' }, String(handOf(S, cat).length)) : id === 'missions' ? h('span', { class: 'win-n' }, String(missionsOfCat(cat).length)) : null)));
  winTab(cat, tab, body);
  simplify(body);
  el.append(head, tabs, body);
  if (slide) { body.classList.add(slide > 0 ? 'from-right' : 'from-left'); slide = 0; } else body.scrollTop = prev;
  bindSwipe(body);
  tabs.querySelector('.win-tab.on')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

// ---------- swipe: one thumb walks through the tabs of a deck, and on from the last tab to the next deck ----------
/** A swipe must travel this far, be this much more sideways than up or down, and take no longer than this. */
export const SWIPE_MIN = 56, SWIPE_SLOPE = 1.8, SWIPE_MS = 700;
/** Which way the next body comes in: +1 from the right, -1 from the left, 0 not at all. */
let slide = 0;
/** Move one tab on (+1) or back (-1); past either end, to the neighbouring deck. False at the ends of the six decks. */
export function stepTab(dir: 1 | -1): boolean {
  if (!win || winPage) return false;
  const tabs = WIN_TABS[win.cat], i = tabs.findIndex(([id]) => id === win!.tab), j = i + dir;
  if (j >= 0 && j < tabs.length) { setWin({ cat: win.cat, tab: tabs[j][0] }); }
  else {
    const next = CATS[CATS.indexOf(win.cat) + dir];
    if (!next) return false;
    const nt = WIN_TABS[next];
    setPick({}); setCv({ filter: 'all', mode: 'browse', sel: [] });
    setWin({ cat: next, tab: nt[dir > 0 ? 0 : nt.length - 1][0] });
  }
  slide = reduced() ? 0 : dir;
  refresh();
  return true;
}
/** Can this element, or anything between it and the body, still scroll sideways that way? Then the swipe is its own. */
function scrollsSideways(from: HTMLElement, body: HTMLElement, dir: number): boolean {
  for (let e: HTMLElement | null = from; e && e !== body; e = e.parentElement) {
    if (e instanceof HTMLInputElement && e.type === 'range') return true;
    if (e.scrollWidth <= e.clientWidth + 2) continue;
    const ox = getComputedStyle(e).overflowX;
    if (ox !== 'auto' && ox !== 'scroll') continue;
    if (dir > 0 ? e.scrollLeft + e.clientWidth < e.scrollWidth - 2 : e.scrollLeft > 2) return true;
  }
  return false;
}
function bindSwipe(body: HTMLElement) {
  let x0 = 0, y0 = 0, t0 = 0, from: HTMLElement | null = null;
  body.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { from = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); from = e.target as HTMLElement;
  }, { passive: true });
  body.addEventListener('touchend', e => {
    if (!from || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0, start = from;
    from = null;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * SWIPE_SLOPE || Date.now() - t0 > SWIPE_MS) return;
    const dir = dx < 0 ? 1 : -1; // a finger moving left asks for what lies to the right
    if (scrollsSideways(start, body, dir)) return;
    stepTab(dir);
  }, { passive: true });
}
export function winSub(cat: Cat) {
  if (cat === 'military') return `Army power ${Math.round(armyPower(S.troops))} · ${S.troops.length}/${armyCap(S)} companies · ${S.fleet.length} ships`;
  if (cat === 'diplomacy') return `${alliesOf(S, S.player).length} allies · ${enemiesOf(S, S.player).length} wars · ${subjectsOf(S).length} subjects`;
  if (cat === 'internal') return `${rankOf(S).name} · ${provsOf(S, S.player).length} provinces · tasks this year ${S.launched ?? 0}/${missionCap(S)}`;
  if (cat === 'economy') return `${signed(incomeOf(S, S.player).total)} ducats a year`;
  if (cat === 'culture') return `Happiness ${nationalHappiness(S)}% · ${cultureRows(S).length} peoples · ${(S.works ?? []).length} works of art · church ${Math.round(churchRel(S))}`;
  return `${S.techs.length} of ${TECHS.length} technologies known`;
}
export const CAT_ROLES: Record<Cat, Character['role'][]> = {
  military: ['general', 'conqueror', 'admiral'], diplomacy: ['diplomat', 'explorer'], internal: ['admin', 'colonist'], economy: ['merchant'], research: ['researcher'], culture: ['courtier', 'priest', 'artist', 'leader'],
};
/** Missions shown under a menu: by the person sent (a merchant building is Economy), or the mission's own role. */
export const missionsOfCat = (cat: Cat) => S.missions.filter(m => {
  const r = S.characters.find(c => c.uid === m.char)?.role ?? MISSION_INFO[m.kind].role;
  return CAT_ROLES[cat].includes(r as Character['role']) || (cat === 'military' && ['conquer', 'raid', 'conquista'].includes(m.kind));
});

export function winTab(cat: Cat, tab: string, body: HTMLElement) {
  if (tab === 'cards') return cardsTab(cat, body);
  if (tab === 'missions') return missionsTab(cat, body);
  const holder = h('div');
  if (cat === 'military') {
    if (tab === 'army') armyTab(body);
    else if (tab === 'navy') navyTab(body);
    else warsTab(body);
  } else if (cat === 'diplomacy') {
    if (tab === 'realms') realmsTab(body); else subjectsTab(body);
  } else if (cat === 'internal') {
    if (tab === 'gov') govTab(body);
    else if (tab === 'core') body.append(coreSection());
    else if (tab === 'realm') realmTab(body);
    else provincesTab(body);
  } else if (cat === 'economy') {
    if (tab === 'ledger') ledgerTab(body); else if (tab === 'trade') tradeTab(body); else goodsTab(body);
  } else if (cat === 'culture') {
    if (tab === 'religion') religionTab(body); else if (tab === 'arts') artsTab(body); else culturesTab(body);
  } else techTab(body);
  void holder;
}
