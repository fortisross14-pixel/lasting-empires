// Dialogs and the back button, the game menu, and a person's details.
import { loyaltyOf, loyaltyWord, wishOf, WISHES, DISLOYAL } from '../engine/court';
import type { Character } from '../types';
import { TRAITS, RARITY } from '../data/characters';
import { ageOf } from '../engine/ages';
import { player, roleName } from '../engine/core';
import { dismissCharacter } from '../engine/turn';
import { PROMOTION } from '../engine/overseas';
import { h, $, clear } from './dom';
import { icon } from './icons';
import { charCard } from './cards';
import { DIFFICULTY, STANDARD } from '../data/difficulty';
import { settings } from './settings';
import { S, sheet, win, modalOpen, slot, saveNow, setModalOpen } from './state';
import { showTitle } from './title';
import { toast, act, showEra, missionTitle } from './app';
import { closeWin } from './windows/frame';
import { openSheet, closeSheet } from './sheets';
import { pickHand, stopMapPick } from './planner';
import { showSettings } from './endturn';

// ---------- modals ----------
export function openModal(content: HTMLElement) {
  const m = clear($('#modal'));
  content.prepend(h('div', { class: 'seal', 'aria-hidden': 'true' }, h('i'), h('i'), h('b')));
  m.append(h('div', { class: 'scrim', onclick: () => { dismissModal(); } }), content);
  m.hidden = false;
  setModalOpen(true);
  armBack();
}
/** Close the dialog the way its own cancel button would. Decisions without one stay open. */
export function dismissModal(): boolean {
  const m = $('#modal');
  const btn = (m.querySelector('.iconbtn[aria-label="Close"]') as HTMLElement | null)
    ?? Array.from(m.querySelectorAll<HTMLElement>('button')).find(b => /^(‹ ?)?(Keep it|Cancel|Close|Back|Back to map|Continue|Not now|Later)$/i.test((b.textContent ?? '').trim()) && !b.classList.contains('blocked')) ?? null;
  if (!btn) return false;
  btn.click();
  return true;
}

// ---------- back: Android's back button, Escape and tapping outside all step back one layer ----------
/** What "back" does on the screens outside a game (title, missions, picker). */
export let screenBack: (() => void) | null = null;
export function goBack(): boolean {
  if (modalOpen) { if (!dismissModal()) toast('Choose an option first'); return true; }
  if (!document.getElementById('top')) { if (screenBack) { const f = screenBack; screenBack = null; f(); return true; } return false; }
  if (pickHand != null) { stopMapPick(); return true; }
  if (sheet?.kind === 'nation' && sheetFrom) { const f = sheetFrom; sheetFrom = null; openSheet('province', f); return true; }
  if (sheet) { closeSheet(); return true; }
  if (win) { closeWin(); return true; }
  showGameMenu(); // nothing open: back offers the menu rather than leaving the game
  return true;
}
/** Keep one history entry in hand so the browser's back comes to us first. */
export function armBack() { try { if (history.state?.le !== 1) history.pushState({ le: 1 }, ''); } catch { /* sandboxed frames may refuse */ } }
addEventListener('popstate', () => { if (goBack()) armBack(); });
addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); goBack(); } });
/** The province a realm sheet was opened from, so back returns to it. */
export let sheetFrom: string | null = null;
export function closeModal() {
  const m = $('#modal');
  m.hidden = true; clear(m);
  setModalOpen(false);
}
/** The in-game menu: everything that is not a daily action lives here. */
export function showGameMenu() {
  if (modalOpen) return;
  const go = (f: () => void) => () => { closeModal(); f(); };
  const row = (ic: string, label: string, sub: string, f: () => void, badge = '') => h('button', { class: 'gm-row', onclick: go(f) },
    h('span', { class: 'gm-i', html: icon(ic, 20) }), h('span', { class: 'gm-t' }, h('b', {}, label), h('small', {}, sub)), badge ? h('span', { class: 'gm-badge' }, badge) : h('span', { class: 'a-go', html: icon('next', 14) }));
  const sc = S.scenario;
  openModal(h('div', { class: 'mbox narrow gmenu' },
    h('div', { class: 'gm-head' }, h('h2', {}, 'Menu'), h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeModal, html: icon('close', 18) })),
    h('div', { class: 'gm-list' },
      sc ? row('star', 'Mission goals', sc.name, () => openSheet('goals')) : null,
      row('hourglass', 'Tasks under way', S.missions.length ? 'Your people at work, and when they finish' : 'Nobody is at work right now', () => openSheet('missions'), S.missions.length ? String(S.missions.length) : ''),
      row('crown', 'Realm and ruler', `${player(S).ruler.name} · cards and nation points each year`, () => openSheet('realm')),
      row('laurel', 'Chronicle', 'Rankings of the powers, records and history', () => openSheet('chronicle')),
      row('book', ageOf(S).name, 'The age you live in and the next one', () => showEra()),
      row('gear', 'Settings', `${(DIFFICULTY[S.difficulty ?? STANDARD] ?? DIFFICULTY[STANDARD]).name} · reminders ${settings().warn ? 'on' : 'off'}`, () => showSettings())),
    h('p', { class: 'muted small gm-save' }, `Saved in slot ${slot} every season.`),
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: () => { saveNow(); closeModal(); showTitle(); } }, 'Save and exit to title'), h('button', { class: 'btn primary', onclick: closeModal }, 'Continue'))));
}

export function confirmBox(title: string, text: string, okLabel: string, ok: () => void) {
  if (modalOpen) return ok();
  openModal(h('div', { class: 'mbox narrow' }, h('h2', {}, title), h('p', {}, text),
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Cancel'), h('button', { class: 'btn primary', onclick: () => { closeModal(); ok(); } }, okLabel))));
}

const rivalOf = (c: Character) => (c.rival != null ? S.characters.find(x => x.uid === c.rival) : undefined);

export function charDetail(c: Character) {
  const m = c.mission != null ? S.missions.find(x => x.id === c.mission) : null;
  const to = PROMOTION[c.role];
  openModal(h('div', { class: 'mbox narrow' },
    h('div', { class: 'center' }, charCard(c, S)),
    h('h2', {}, c.name),
    h('p', { class: 'muted' }, `${c.ruler ? 'Monarch acting as ' : ''}${roleName[c.role]} · ${RARITY[c.rarity].name} (traits ×${RARITY[c.rarity].mult}) · experience ${c.xp}/3 · age ${S.year - c.born}`),
    h('ul', { class: 'traits' }, c.traits.map(t => h('li', {}, h('b', {}, TRAITS[t]?.name ?? t), ' ', TRAITS[t]?.desc ?? ''))),
    c.ruler ? null : h('div', { class: 'loyal l-' + loyaltyWord(c).toLowerCase() },
      h('div', { class: 'loyal-h' }, h('b', {}, loyaltyWord(c)), h('span', {}, `loyalty ${loyaltyOf(c)} of 100`)),
      h('span', { class: 'loyal-bar', role: 'img', 'aria-label': `Loyalty ${loyaltyOf(c)} of 100` }, h('i', { style: `width:${loyaltyOf(c)}%` }), h('em', { style: `left:${DISLOYAL}%`, title: 'Below this they listen to other offers' })),
      h('p', {}, `${c.name.split(' ')[0]} ${WISHES[wishOf(c)].text}.`, rivalOf(c) ? ` A rival of ${rivalOf(c)!.name}.` : ''),
      h('p', { class: 'muted small' }, 'Loyalty grows with tasks given and done, with victories and with favours; it falls with idleness, slights and an unsteady realm.')),
    (c.wins ?? 0) + (c.losses ?? 0) ? h('p', {}, `Battles: ${c.wins ?? 0} won, ${c.losses ?? 0} lost.`) : null,
    m ? h('p', {}, `On a mission: ${missionTitle(m)}, ${m.turnsLeft} year(s) left.`) : null,
    to ? h('p', { class: 'muted promo' }, ({ diplomat: `Send ${c.name.split(' ')[0]} on a Voyage of Discovery and they become an explorer for good.`, general: `Lead an attack with ships to become an admiral, or a conquista to become a conqueror. Both are for good.`, admin: `Send ${c.name.split(' ')[0]} to found a colony and they become a colonist for good.`, courtier: `The first mission decides: a Religious Mission or Mission to the Church makes a churchman, a Work of Art an artist, Royal Grace, Integration or Embrace a Culture a cultural leader. For good.` } as Record<string, string>)[c.role]) : null,
    h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: closeModal }, 'Close'),
      !m && !c.ruler ? h('button', { class: 'btn ghost danger', onclick: () => { closeModal(); confirmBox(`Dismiss ${c.name}?`, 'This frees a seat at court.', 'Dismiss', () => act(() => dismissCharacter(S, c.uid))); } }, 'Dismiss') : null)));
}

// Setters: other modules import these variables read-only, so they change them here.
export const setScreenBack = (v: (() => void) | null) => (screenBack = v);
export const setSheetFrom = (v: string | null) => (sheetFrom = v);
