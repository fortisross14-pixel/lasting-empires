// The text cap: a block on screen is a headline and one short line. Anything longer shows its first sentence (or the
// first BRIEF_WORDS words) and keeps the rest behind "More", so the important thing is read first and the detail is
// still there for whoever wants it.
import { h } from './dom';

/** How many words a line shows before the rest folds behind "More". */
export const BRIEF_WORDS = 24;

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/** A text cut to its first sentence, or to `max` words, with a "More" button for the rest. Short texts pass whole. */
export function capped(text: string, max = BRIEF_WORDS, cls = ''): HTMLElement {
  const t = text.trim();
  if (words(t) <= max) return h('span', { class: 'cap ' + cls }, t);
  // the first sentence if it is short enough, else the first `max` words
  const m = /^(.+?[.!?])\s+(.+)$/s.exec(t);
  let head: string, rest: string;
  if (m && words(m[1]) <= max) { head = m[1]; rest = m[2]; }
  else { const w = t.split(/\s+/); head = w.slice(0, max).join(' ') + '…'; rest = w.slice(max).join(' '); }
  const cut = head.endsWith('…');
  const dots = h('span', { class: 'cap-dots' }, cut ? '…' : '');
  const tail = h('span', { class: 'cap-rest', hidden: true }, ' ' + rest);
  const more = h('button', { type: 'button', class: 'cap-more', 'aria-expanded': 'false', onclick: (e: Event) => { e.stopPropagation(); tail.hidden = false; dots.remove(); more.remove(); } }, 'More');
  return h('span', { class: 'cap ' + cls }, cut ? head.slice(0, -1) : head, dots, tail, ' ', more);
}
