// Summary first, explanation on request. After a screen is drawn, every paragraph that explains (rather than
// states a figure) is folded away behind a small ⓘ beside the heading of its section; a tap shows it again.
// Nothing is removed: the words are all still there, one tap away.
import { h } from './dom';

/** Paragraphs shorter than this stay in view: a short line is a fact, not an explanation. */
export const EXPLAIN_WORDS = 9;
/** Places where a paragraph is part of something else and stays as it is. */
const KEEP = '.more, .action, .trow, .pnext, .ptile-detail, .card, .gm-row, .facts, summary, .att, .pgood, .tcard, .loyal, .mcap, .pl-foot, .reveal-row, .empty-hint';
const words = (e: Element) => (e.textContent?.match(/\S+/g) ?? []).length;

/** A small ⓘ that shows or hides the given elements. */
export function infoToggle(targets: HTMLElement[], label = 'More about this'): HTMLElement {
  const b = h('button', { class: 'info-t', 'aria-label': label, 'aria-expanded': 'false', title: label, onclick: (e: Event) => {
    e.stopPropagation();
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open));
    for (const t of targets) t.hidden = !open;
  } }, 'i');
  return b;
}

/** Fold the explanations of a screen behind the headings they belong to. */
export function simplify(root: HTMLElement) {
  const byHead = new Map<HTMLElement, HTMLElement[]>();
  const loose: HTMLElement[] = [];
  for (const p of Array.from(root.querySelectorAll<HTMLElement>('p.muted, p.set-note, p.note, p.hint'))) {
    if (p.hidden || p.closest(KEEP) || words(p) < EXPLAIN_WORDS) continue;
    // the heading of its section: the nearest h3 or h2 before it among its siblings, or before its parent
    let head: HTMLElement | null = null;
    for (let at: Element | null = p; at && at !== root && !head; at = at.parentElement) {
      for (let s = at.previousElementSibling; s; s = s.previousElementSibling) if (/^H[23]$/.test(s.tagName)) { head = s as HTMLElement; break; }
    }
    p.classList.add('more');
    p.hidden = true;
    if (head) { if (!byHead.has(head)) byHead.set(head, []); byHead.get(head)!.push(p); } else loose.push(p);
  }
  for (const [head, ps] of byHead) head.append(infoToggle(ps));
  // explanations with no heading over them: one ⓘ at the top of the screen opens them all
  if (loose.length) root.prepend(h('div', { class: 'info-row' }, infoToggle(loose, 'How this works'), h('small', {}, 'How this works')));
}
