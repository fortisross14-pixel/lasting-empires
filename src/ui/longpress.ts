// Hold any card to read it: a press of half a second opens the card's full detail over whatever is on screen,
// without choosing or playing it. Lifting the finger or tapping anywhere closes it. Works on every card in the game
// (hand, picks, drafts, decks, the court), because every card carries what it shows (cards.ts).
import { S } from './state';
import { h } from './dom';
import { handCard, troopCard, charCard, troopDetails } from './cards';
import { CARDS } from '../engine/cards';
import { buzz } from './sound';

/** How long a finger must rest on a card before its detail opens, in milliseconds. */
export const HOLD_MS = 450;
let timer = 0, fired = false, start = { x: 0, y: 0 };

function detailFor(card: HTMLElement): HTMLElement | null {
  const { card: id, troop, char } = card.dataset;
  if (id && CARDS[id]) return h('div', {}, handCard(id, { wide: true, cls: 'lp-card' }));
  if (troop) return h('div', {}, troopCard({ type: troop, vet: 0, str: 100 }, { cls: 'lp-card' }), troopDetails(troop));
  if (char) { const c = S?.characters.find(x => String(x.uid) === char); return c ? h('div', {}, charCard(c, S, { wide: true, cls: 'lp-card' })) : null; }
  return null;
}
function show(card: HTMLElement) {
  const body = detailFor(card);
  if (!body) return;
  fired = true;
  buzz(12);
  document.getElementById('lp')?.remove();
  const el = h('div', { id: 'lp', role: 'dialog', 'aria-label': 'Card details' }, h('div', { class: 'lp-box' }, body, h('small', { class: 'lp-hint' }, 'Lift your finger or tap to close')));
  el.addEventListener('pointerdown', e => { e.stopPropagation(); el.remove(); });
  document.body.append(el);
}
function cancel() { clearTimeout(timer); timer = 0; }

document.addEventListener('pointerdown', e => {
  fired = false;
  const card = (e.target as Element)?.closest?.('.card[data-card], .card[data-troop], .card[data-char]') as HTMLElement | null;
  if (!card || e.button > 0) return;
  start = { x: e.clientX, y: e.clientY };
  cancel();
  timer = window.setTimeout(() => show(card), HOLD_MS);
}, { capture: true, passive: true });
document.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel(); }, { capture: true, passive: true });
document.addEventListener('pointerup', () => { cancel(); if (fired) setTimeout(() => document.getElementById('lp')?.remove(), 900); }, { capture: true });
document.addEventListener('pointercancel', cancel, { capture: true });
// the press that opened the detail must not also choose the card
document.addEventListener('click', e => { if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; } }, { capture: true });
document.addEventListener('contextmenu', e => { if ((e.target as Element)?.closest?.('.card')) e.preventDefault(); });
