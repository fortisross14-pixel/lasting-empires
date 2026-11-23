// Ending a turn: what must be settled first, skip ahead, settings, and the year's report.
import { infoToggle } from './simplify';
import { sfx } from './sound';
import type { GameState, MissionKind, Cat, BattleRecord } from '../types';
import { CATS } from '../types';
import { ageOf } from '../engine/ages';
import { nationName } from '../engine/core';
import { endTurn } from '../engine/turn';
import { CAT_INFO, heldOf, handExcess } from '../engine/cards';
import { MISSION_INFO } from '../engine/missions';
import { h, sleep, reduced, signed } from './dom';
import { icon } from './icons';
import { markTurn, stopReasons, SKIP_MAX } from '../engine/pace';
import { DIFFICULTY, LENGTHS, STANDARD } from '../data/difficulty';
import { settings, setSetting, TEXT_SIZES, type Settings } from './settings';
import { S, sheet, modalOpen, todo, seenTodo, saveNow, exportSaveFile, setCv, setWin, setPendingReport } from './state';
import { TUTORIAL, refresh, toast, SEASONS, clearUndo } from './app';
import { openWin } from './windows/frame';
import { missionRow } from './windows/cards';
import { closeSheet } from './sheets';
import { closePage, openModal, closeModal } from './modal';
import { pickHand, stopMapPick } from './planner';
import { processQueue, QUICK_ODDS } from './prompts';

// ---------- end turn & prompt queue ----------
/** What must be settled before a turn can end: open decisions, a hand over its limit and, once, the list of things
 *  still to do. Returns true when the turn may go on; `again` is called if the player chooses to end it anyway. */
export function readyToEnd(again: () => void): boolean {
  if (pickHand != null) stopMapPick();
  if (modalOpen) return false;
  if (S.queue.length) { processQueue(); return false; }
  const ex = handExcess(S);
  if (ex.total > 0) {
    // too many cards: choose what to sell before the turn ends
    const cat = (Object.keys(ex.byCat) as Cat[])[0] ?? [...CATS].sort((a, b) => heldOf(S, b) - heldOf(S, a))[0];
    setWin({ cat, tab: 'cards' }); setCv({ filter: 'hand', mode: 'select', sel: [] });
    openWin(cat, 'cards');
    toast(`Your hand is over the limit: sell ${ex.total} card${ex.total > 1 ? 's' : ''} to end the turn`, 'bad');
    return false;
  }
  // the chancellor's notes and a guided mission already say what to do next: no second voice on top of them
  const guided = (S.tutorial ?? -1) >= 0 && (S.tutorial ?? -1) < TUTORIAL.length || (!!S.scenario?.steps?.length && S.scenario.status === 'active');
  if (settings().warn && !guided && todo.some(a => !seenTodo.has(a.id))) { showAttention(again); return false; }
  return true;
}

/** Before the turn ends: what is still open, each line leading to its screen. Shown once for each new thing. */
export function showAttention(again: () => void) {
  const fresh = new Set(todo.filter(a => !seenTodo.has(a.id)).map(a => a.id));
  for (const a of todo) seenTodo.add(a.id);
  // one line for each thing still open; who would do it, and how to stop these reminders, behind ⓘ
  const subs = todo.map(a => h('small', { hidden: true }, a.text));
  const note = h('p', { class: 'muted small gm-save', hidden: true }, 'You will not be asked again about these. Reminders can be switched off in Menu → Settings.');
  openModal(h('div', { class: 'mbox narrow gmenu todo' },
    h('div', { class: 'gm-head' }, h('h2', {}, 'Still to do', infoToggle([...subs, note], 'Details')), h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeModal, html: icon('close', 18) })),
    h('div', { class: 'gm-list' }, todo.map((a, i) => h('button', { class: 'gm-row' + (fresh.has(a.id) ? ' new' : ''), onclick: () => { closeModal(); openWin(a.cat, a.tab); } },
      h('span', { class: 'gm-i', html: icon(a.icon, 20) }), h('span', { class: 'gm-t' }, h('b', {}, a.title), subs[i]), h('span', { class: 'a-go', html: icon('next', 14) })))),
    note,
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Back to the map'), h('button', { class: 'btn primary', onclick: () => { closeModal(); again(); } }, 'End the turn'))));
}

export const cardsLine = (cards: Record<string, number>) => (CATS.some(c => cards[c]) ? ' · cards: ' + CATS.filter(c => cards[c]).map(c => `${cards[c]} ${CAT_INFO[c].name}`).join(', ') : '');

export async function onEndTurn() {
  closePage(); // a card or task left open is put away: the turn must not end under it
  if (!readyToEnd(onEndTurn)) return;
  clearUndo();
  sfx('seal');
  const rep = endTurn(S);
  saveNow();
  if (sheet?.kind === 'province' && !S.provinces[sheet.arg!]) closeSheet();
  refresh();
  if (rep) {
    lastReport = rep;
    if ((S.quarter ?? 0) === 0) { setPendingReport(true); yearReport = S.turnLog ?? null; await yearFlash(S.year, ageOf(S).name); }
    else toast(`${SEASONS[S.quarter ?? 0]} ${S.year} · ${signed(Math.round(rep.gold))} ducats${cardsLine(rep.cards)}`);
    if (CATS.some(c => rep.cards[c])) sfx('draw', 0.25);
  }
  processQueue();
}

/** Skip ahead: play quiet seasons one after another and stop as soon as something needs the player
 *  (a decision, a new card, a finished task, a war, something new to do), after SKIP_MAX seasons at most. */
export function onSkipAhead() {
  closePage();
  if (!readyToEnd(onSkipAhead)) return;
  clearUndo();
  sfx('seal');
  let n = 0, gold = 0, yearEnd = false;
  const cards: Record<string, number> = {};
  for (;;) {
    const before = markTurn(S);
    const rep = endTurn(S);
    if (!rep) break;
    n++; gold += rep.gold; lastReport = rep;
    for (const [c, v] of Object.entries(rep.cards)) cards[c] = (cards[c] ?? 0) + v;
    const why = stopReasons(S, before, rep);
    yearEnd = (S.quarter ?? 0) === 0;
    if (why.length || n >= SKIP_MAX) break;
  }
  // the year's report is shown when the skip ends on a new year; quiet years in between pass without one
  if (n && yearEnd) { setPendingReport(true); yearReport = S.turnLog ?? null; }
  saveNow();
  if (sheet?.kind === 'province' && !S.provinces[sheet.arg!]) closeSheet();
  refresh();
  if (CATS.some(c => cards[c])) sfx('draw', 0.25);
  if (n) toast(`${n} season${n > 1 ? 's' : ''} passed: now ${SEASONS[S.quarter ?? 0]} ${S.year} · ${signed(Math.round(gold))} ducats${cardsLine(cards)}`);
  processQueue();
}

/** Settings of this device, and the choices this campaign was started with. */
export function showSettings() {
  const st = settings();
  const toggle = (k: 'warn' | 'skip' | 'calm' | 'haptics' | 'quickBattles', label: string, sub: string) => h('label', { class: 'set-row' },
    h('span', { class: 'gm-t' }, h('b', {}, label), h('small', {}, sub)),
    h('input', { type: 'checkbox', class: 'set-sw', role: 'switch', checked: st[k] ? true : undefined, onchange: (e: Event) => { setSetting(k, (e.target as HTMLInputElement).checked as Settings[typeof k]); refresh(); } }));
  const d = DIFFICULTY[S.difficulty ?? STANDARD] ?? DIFFICULTY[STANDARD];
  const len = LENGTHS.find(l => l.id === S.length);
  openModal(h('div', { class: 'mbox narrow gmenu' },
    h('div', { class: 'gm-head' }, h('h2', {}, 'Settings'), h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeModal, html: icon('close', 18) })),
    h('div', { class: 'gm-list' },
      toggle('warn', 'Things to do', 'Before a turn ends, list the cards and people still waiting.'),
      toggle('skip', 'Skip ahead button', `Plays up to ${SKIP_MAX} quiet seasons in one tap and stops when something happens.`),
      toggle('quickBattles', 'Quick battles', `A battle you are nearly sure to win or lose (${Math.round(QUICK_ODDS * 100)}% or more either way) is fought without stopping, and told in one line.`),
      toggle('calm', 'Less motion', 'No sliding or turning cards. Always on when your device asks for reduced motion.'),
      h('div', { class: 'set-row' }, h('span', { class: 'gm-t' }, h('b', {}, 'Sound'), h('small', {}, 'Paper, wax, coin and drum, made on the device.')),
        h('div', { class: 'seg set-seg', role: 'radiogroup', 'aria-label': 'Sound' }, ([['Off', 0], ['Soft', 0.5], ['Full', 1]] as [string, number][]).map(([label, v]) =>
          h('button', { class: 'seg-b' + (st.sfx === v ? ' on' : ''), role: 'radio', 'aria-checked': String(st.sfx === v), onclick: () => { setSetting('sfx', v); closeModal(); showSettings(); sfx('coin'); } }, label)))),
      h('div', { class: 'set-row' }, h('span', { class: 'gm-t' }, h('b', {}, 'Music'), h('small', {}, 'Lute, oud, guzheng or drums, by the people you rule.')),
        h('div', { class: 'seg set-seg', role: 'radiogroup', 'aria-label': 'Music' }, ([['Off', 0], ['Soft', 0.5], ['Full', 1]] as [string, number][]).map(([label, v]) =>
          h('button', { class: 'seg-b' + (st.music === v ? ' on' : ''), role: 'radio', 'aria-checked': String(st.music === v), onclick: () => { setSetting('music', v); closeModal(); showSettings(); refresh(); } }, label)))),
      toggle('haptics', 'Touch feedback', 'A short buzz when a card is played or turned, on phones that can.'),
      h('div', { class: 'set-row' }, h('span', { class: 'gm-t' }, h('b', {}, 'Text size'), h('small', {}, 'Larger text in cards, windows and messages.')),
        h('div', { class: 'seg set-seg', role: 'radiogroup', 'aria-label': 'Text size' }, TEXT_SIZES.map(v =>
          h('button', { class: 'seg-b' + (st.text === v ? ' on' : ''), role: 'radio', 'aria-checked': String(st.text === v), onclick: () => { setSetting('text', v); closeModal(); showSettings(); refresh(); } }, `${Math.round(v * 100)}%`)))),
      h('div', { class: 'set-row' }, h('span', { class: 'gm-t' }, h('b', {}, 'Save file'), h('small', {}, 'Download a copy of your campaigns. Load it from the title screen.')),
        h('button', { class: 'btn small', onclick: () => { saveNow(); const r = exportSaveFile(); if (r) toast(r, 'bad'); } }, 'Export'))),
    h('h3', {}, 'This campaign'),
    h('p', { class: 'set-note' }, h('b', {}, d.name), ` · ${d.text}`),
    h('p', { class: 'set-note' }, S.scenario ? `Mission: ${S.scenario.name}, to ${S.scenario.deadline}.` : `${len ? len.name : 'The whole age'}: the game ends after ${S.endYear}.`),
    h('p', { class: 'muted small' }, 'Difficulty and length are chosen when a game starts.'),
    h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: closeModal }, 'Done'))));
}

export async function yearFlash(year: number, line: string) {
  sfx('bell', 0.15);
  if (reduced()) { toast(`${year}: ${line}`); return; }
  const f = h('div', { class: 'yearflash' }, h('span', {}, String(year)), h('small', {}, line));
  document.body.append(f);
  await sleep(1100);
  f.classList.add('out');
  setTimeout(() => f.remove(), 400);
}

export let lastReport: { gold: number; np: number; cards: Record<string, number> } | null = null;
export let yearReport: GameState['turnLog'] | null = null;

/** End of turn: what happened this quarter, with the battles played out. */
export function showTurnReport() {
  setPendingReport(false);
  const tl = yearReport;
  if (!tl) return;
  const box = h('div', { class: 'mbox report' });
  box.append(h('h2', {}, `The year ${tl.year}`), h('p', { class: 'muted' }, `Four quarters played. Now: ${SEASONS[S.quarter ?? 0]} ${S.year}`));
  const cards = tl.cards ?? {};
  const got = CATS.filter(c => cards[c]).map(c => `${cards[c]} ${CAT_INFO[c].name}`).join(', ');
  box.append(h('div', { class: 'facts' }, h('span', { class: 'fact' }, `${signed(Math.round(tl.gold ?? 0))} ducats`), h('span', { class: 'fact' }, `+${(tl.np ?? 0).toFixed(1)} nation points`), got ? h('span', { class: 'fact' }, `Cards: ${got}`) : null));
  if (tl.battles.length) {
    box.append(h('h3', {}, `Battles this year (${tl.battles.length})`));
    const list = h('div', { class: 'blist' });
    tl.battles.forEach((r, i) => list.append(battleRow(r, i)));
    box.append(list);
  }
  if (tl.done.length) {
    box.append(h('h3', {}, 'Missions completed this year'));
    box.append(h('ul', { class: 'rlist' }, tl.done.map(d => h('li', {}, h('span', { html: icon(MISSION_INFO[d.kind as MissionKind]?.icon ?? 'star', 14) }), d.title))));
  }
  box.append(h('h3', {}, `Under way (${S.missions.length})`));
  if (!S.missions.length) box.append(h('p', { class: 'muted' }, 'No tasks under way. Open a menu and send someone out.'));
  for (const m of S.missions.slice(0, 6)) box.append(missionRow(m));
  if (S.missions.length > 6) box.append(h('p', { class: 'muted' }, `+${S.missions.length - 6} more in the Missions tabs.`));
  box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => { closeModal(); refresh(); } }, 'Continue')));
  openModal(box);
}

/** One battle, sports-results style: the odds first, a few seconds of fighting, then the winner. */
export function battleRow(r: BattleRecord, i: number) {
  const a = S.nations[r.att], d = S.nations[r.def];
  const pA = r.attPower / Math.max(1, r.attPower + r.defPower);
  const name = (n: string) => (n === 'rebels' ? 'Rebels' : nationName(S, n));
  const mine = r.att === S.player || r.def === S.player;
  const row = h('div', { class: 'brow' + (mine ? ' mine' : '') });
  const bar = h('div', { class: 'bbar' }, h('i', { class: 'ba', style: `width:${pA * 100}%; background:${a?.color ?? '#7a2e26'}` }), h('i', { class: 'bd', style: `background:${d?.color ?? '#555'}` }), h('b', { class: 'bmark', style: `left:${pA * 100}%` }));
  const res = h('span', { class: 'bres' }, `${Math.round(pA * 100)}% – ${Math.round((1 - pA) * 100)}%`);
  row.append(h('div', { class: 'bnames' }, h('span', {}, name(r.att)), h('small', {}, `${SEASONS[r.quarter]} · ${r.naval ? 'at sea off ' : ''}${S.provinces[r.province]?.name ?? ''}`), h('span', {}, name(r.def))), bar, res);
  const end = r.winner === 'att' ? 100 : 0;
  const steps = reduced() ? [] : [pA * 100 + 12, pA * 100 - 10, pA * 100 + 6, (pA * 100 + end) / 2];
  const mark = bar.querySelector('.bmark') as HTMLElement, fill = bar.querySelector('.ba') as HTMLElement;
  const set = (v: number) => { const x = Math.max(2, Math.min(98, v)); mark.style.left = x + '%'; fill.style.width = x + '%'; };
  let t = 400 + i * 500;
  for (const v of steps) { setTimeout(() => set(v), t); t += 420; }
  setTimeout(() => {
    set(end);
    const won = r.winner === 'att' ? name(r.att) : name(r.def);
    res.textContent = mine ? (r.player === 'won' ? `Victory: ${won}` : `Defeat: ${won} win`) : `${won} win`;
    res.classList.add(mine ? (r.player === 'won' ? 'good' : 'bad') : 'done');
  }, t);
  return row;
}
