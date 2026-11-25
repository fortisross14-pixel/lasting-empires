// The Empire Agenda: the few things that matter now, over the map, each a tap away from where it is done.
// The lines come from `agenda()` in the engine (pace.ts); this module draws them and follows their jumps.
import { S, map, todo } from './state';
import { h, clear } from './dom';
import { icon } from './icons';
import { agenda, AGENDA_MAX, TIERS, TIER_NAMES, type Attention, type Jump } from '../engine/pace';
import { openModal, closeModal } from './modal';
import { openWin } from './windows/frame';
import { openSheet } from './sheets';
import { openCardModal } from './planner';
import { showIncoming, processQueue } from './prompts';
import { settings, setSetting } from './settings';
import { sfx } from './sound';

/** Marks beside the tier names, so the tier never rests on colour alone. */
export const TIER_MARKS: Record<Attention['tier'], string> = { urgent: '!', opportunity: '✦', risk: '▾', long: '…' };

/** Take the player to the place where a line can be dealt with. */
export function jumpTo(a: Attention) {
  sfx('flip');
  const j: Jump = a.jump ?? { to: 'win', cat: a.cat, tab: a.tab };
  if (j.to === 'win') openWin(j.cat, j.tab);
  else if (j.to === 'card') {
    if (!S.hand.some(x => x.uid === j.uid)) { openWin(j.cat, 'cards'); return; }
    openWin(j.cat, 'cards');
    openCardModal(j.uid);
  } else if (j.to === 'province') {
    map.focus([j.id], 220);
    map.select(j.id);
    openSheet('province', j.id);
  } else if (j.to === 'nation') openSheet('nation', j.id);
  else if (j.to === 'incoming') {
    const head = S.queue[0];
    if (head?.kind === 'incoming' && head.id === j.id) processQueue(); else showIncoming(j.id, true);
  }
  else openSheet(j.kind);
}

/** Is the panel open? 'auto' opens it on wide screens and folds it on phones and in guided missions. */
function isOpen() {
  const v = settings().agenda;
  if (v === 'open') return true;
  if (v === 'closed') return false;
  const guided = (!!S.scenario?.steps?.length && S.scenario.status === 'active') || ((S.tutorial ?? -1) >= 0);
  return innerWidth > 760 && !guided;
}

/** One line of the agenda: the tier, what it is, one line of why, and a tap to go. `brief`: the title alone, for the
 *  panel over the map (the map stays a map); the why is in the full list and read out to screen readers. */
export function agendaRow(a: Attention, onGo: () => void, brief = false, grouped = false) {
  return h('button', { class: `ag-row t-${a.tier}${brief ? ' brief' : ''}`, onclick: onGo, 'aria-label': `${TIER_NAMES[a.tier]}: ${a.title}. ${a.text}` },
    h('span', { class: 'ag-i', html: icon(a.icon, 18) }),
    h('span', { class: 'ag-t' }, brief || grouped ? null : h('small', { class: 'ag-tier' }, `${TIER_MARKS[a.tier]} ${TIER_NAMES[a.tier]}`), h('b', {}, brief ? h('span', { class: 'ag-mark', 'aria-hidden': 'true' }, TIER_MARKS[a.tier] + ' ') : null, a.title), brief ? null : h('span', { class: 'ag-sub' }, a.text)),
    h('span', { class: 'a-go', html: icon('next', 14) }));
}

/** Every line, grouped by tier, with the why: for the full agenda and the list before End Turn. */
export function agendaGroups(lines: Attention[], onGo: (a: Attention) => void, fresh: Set<string> = new Set()) {
  return h('div', { class: 'gm-list ag-groups' }, TIERS.map(t => ({ t, rows: lines.filter(a => a.tier === t) })).filter(g => g.rows.length).map(g =>
    h('div', { class: 'ag-group' }, h('h3', { class: `ag-gh t-${g.t}` }, `${TIER_MARKS[g.t]} ${TIER_NAMES[g.t]}`),
      g.rows.map(a => { const r = agendaRow(a, () => onGo(a), false, true); if (fresh.has(a.id)) r.classList.add('new'); return r; }))));
}

/** The whole agenda in a dialog: what needs you, why, and where to go. */
export function showAgenda() {
  const lines = agenda(S, todo);
  openModal(h('div', { class: 'mbox narrow gmenu todo' },
    h('div', { class: 'gm-head' }, h('h2', {}, 'Empire agenda'), h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeModal, html: icon('close', 18) })),
    lines.length ? agendaGroups(lines, a => { closeModal(); jumpTo(a); }) : h('p', { class: 'muted' }, 'Nothing needs you this season.'),
    h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: closeModal }, 'Back to the map'))));
}

export function renderAgenda() {
  const box = document.getElementById('agenda');
  if (!box || !S) return;
  clear(box);
  const lines = agenda(S, todo);
  if (S.over || !lines.length) { box.hidden = true; return; }
  box.hidden = false;
  const open = isOpen();
  const urgent = lines.filter(a => a.tier === 'urgent').length;
  const now = lines.filter(a => a.tier !== 'long').length;
  box.classList.toggle('open', open);
  box.classList.toggle('has-urgent', urgent > 0);
  const summary = urgent ? `${urgent} urgent` : now ? `${now} to decide` : 'All in hand';
  box.append(h('button', { class: 'ag-head', 'aria-expanded': String(open), 'aria-controls': 'ag-list', onclick: () => { setSetting('agenda', open ? 'closed' : 'open'); renderAgenda(); } },
    h('span', { html: icon('list', 16) }), h('b', {}, 'Agenda'), h('small', { class: 'ag-sum' }, summary), h('span', { class: 'caret' }, open ? '▴' : '▾')));
  if (!open) { place(box); return; }
  const shown = lines.slice(0, AGENDA_MAX);
  box.append(h('div', { class: 'ag-list', id: 'ag-list' }, shown.map(a => agendaRow(a, () => jumpTo(a), true)),
    h('button', { class: 'ag-more', onclick: showAgenda }, lines.length > shown.length ? `All ${lines.length}, with reasons` : 'Reasons')));
  place(box);
}

/** The agenda sits under the strip of wars and tasks, whatever that strip holds. */
function place(box: HTMLElement) {
  requestAnimationFrame(() => {
    const board = document.getElementById('board'), tl = document.getElementById('timeline'), gb = document.getElementById('goalbar');
    if (!board) return;
    const top0 = board.getBoundingClientRect().top;
    let y = 8;
    for (const el of [gb, tl]) if (el && !el.hidden && el.childElementCount) y = Math.max(y, el.getBoundingClientRect().bottom - top0 + 8);
    box.style.top = `${Math.round(y)}px`;
  });
}
