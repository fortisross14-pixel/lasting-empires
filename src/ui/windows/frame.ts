// The centred window of a deck: its tabs and which screen each one opens.
import type { Character, Cat } from '../../types';
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
import { S, sheet, win, setSheet, setPick, setCv, setWin, setForge } from '../state';
import { refresh } from '../app';
import { govTab, realmTab, coreSection, provincesTab } from './internal';
import { cardsTab, missionsTab } from './cards';
import { armyTab, navyTab, warsTab } from './military';
import { subjectsTab, realmsTab } from './diplomacy';
import { ledgerTab, goodsTab, tradeTab } from './economy';
import { culturesTab, religionTab, artsTab } from './culture';
import { techTab } from './research';
import { armBack } from '../modal';
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
  setWin({ cat, tab });
  armBack();
  const wasHidden = $('#win').hidden;
  $('#win').hidden = false;
  if (wasHidden) { $('#win').classList.add('fresh'); setTimeout(() => $('#win').classList.remove('fresh'), 500); }
  refresh();
}
export function closeWin() { setWin(null); setPick({}); setForge([]); $('#win').hidden = true; refresh(); }
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
  const tabs = h('div', { class: 'win-tabs', role: 'tablist' }, WIN_TABS[cat].map(([id, label]) =>
    h('button', { class: 'win-tab' + (tab === id ? ' on' : ''), role: 'tab', 'aria-selected': String(tab === id), onclick: () => { setWin({ cat, tab: id }); renderWin(); } }, label,
      id === 'cards' ? h('span', { class: 'win-n' }, String(handOf(S, cat).length)) : id === 'missions' ? h('span', { class: 'win-n' }, String(missionsOfCat(cat).length)) : null)));
  winTab(cat, tab, body);
  el.append(head, tabs, body);
  body.scrollTop = prev;
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
