// Your hand: one button over the map opens every card you hold. Tap a card and the map shows where it can go;
// a card that needs no place (a coin, a feast) opens to be played at once.
import { S } from './state';
import { h, $, clear } from './dom';
import { icon } from './icons';
import { handCard } from './cards';
import { openModal, closeModal } from './modal';
import { CARDS, CAT_INFO, handOf } from '../engine/cards';
import { CATS } from '../types';
import { missionTargets, startMapPick, openCardModal } from './planner';
import { readyByDeck } from '../engine/pace';

/** Does this card go somewhere on the map? Then it is played by choosing the place. */
function playsOnMap(uid: number): boolean {
  const hc = S.hand.find(x => x.uid === uid);
  const d = hc && CARDS[hc.card];
  if (!d?.missions?.length) return false;
  if (['conquer', 'raid', 'conquista'].includes(d.missions[0])) return true;
  // a province, or a realm whose lands can be tapped
  return missionTargets(uid, true).some(r => r.acts.some(a => !a.why && (S.provinces[a.target] || S.nations[a.target]?.alive)));
}
export function renderHandBtn() {
  const b = document.getElementById('handbtn');
  if (!b) return;
  // the button glows while a card in hand could be played now, and says how many (roadmap 5.13)
  const ready = Object.values(readyByDeck(S)).reduce((a, r) => a + (r?.count ?? 0), 0);
  b.classList.toggle('ready', ready > 0);
  b.setAttribute('aria-label', ready ? `Your cards: ${ready} ready to play` : 'Your cards');
  clear(b).append(h('span', { class: 'hb-i', html: icon('cards', 24) }), h('span', { class: 'hb-l' }, 'Cards'), h('b', { class: 'hb-n' }, ready ? `${ready} ready` : String(S.hand.length)));
}
export function showHand() {
  const box = h('div', { class: 'mbox hand-tray' });
  box.append(h('div', { class: 'gm-head' }, h('h2', {}, 'Your cards'), h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeModal, html: icon('close', 18) })));
  if (!S.hand.length) box.append(h('p', { class: 'muted' }, 'No cards in hand. New ones come each year; buy more in any deck.'));
  for (const c of CATS) {
    const cards = handOf(S, c);
    if (!cards.length) continue;
    box.append(h('h3', { class: 'ht-h', style: `--cc:${CAT_INFO[c].color}` }, h('span', { html: icon(CAT_INFO[c].icon, 16) }), CAT_INFO[c].name));
    // the same card held twice is one card with a count: the hand reads at a glance
    const kinds = [...new Map(cards.map(hc => [hc.card, hc])).values()];
    box.append(h('div', { class: 'ht-row' }, kinds.map(hc => {
      const n = cards.filter(x => x.card === hc.card).length;
      const el = handCard(hc.card);
      if (n > 1) el.append(h('b', { class: 'ht-n' }, `×${n}`));
      el.addEventListener('click', () => { closeModal(); if (playsOnMap(hc.uid)) startMapPick(hc.uid); else openCardModal(hc.uid); });
      return el;
    })));
  }
  openModal(box);
  void $;
}
