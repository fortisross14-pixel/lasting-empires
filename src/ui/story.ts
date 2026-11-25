// After a decision, on screen: the map shows the place, then the result opens with "Because you …" and
// "What changed" (the engine side is src/engine/story.ts). Clear first, pretty second.
import type { Story, StoryChange } from '../types';
import { S, map, win } from './state';
import { h } from './dom';
import { icon } from './icons';
import { reduced } from './dom';
import { openSheet } from './sheets';
import { sfx } from './sound';

/** How long the map shows the place before the result opens, in milliseconds. */
export const STAGE_MS = 750;

/** One change, readable without colour: a mark, the name, and the amount or the new word. */
export function changeLine(c: StoryChange): string {
  if (c.from != null) return `${c.label}: ${c.from} → ${c.to}`;
  const v = Math.abs(c.delta);
  const pct = /happiness|control/.test(c.label) ? '%' : '';
  return `${c.label} ${c.delta > 0 ? '+' : '−'}${v}${pct}`;
}
const mark = (c: StoryChange) => (c.from != null ? '◆' : c.good ? '▴' : '▾');

/** The band at the top of a result: what you decided, and when. */
export function becauseBand(st: Story) {
  return h('p', { class: 'story-because' }, h('span', { class: 'sb-i', html: icon('quill', 16) }), h('span', {}, st.because));
}

/** The list of what moved. Nothing measurable: the list says so, so the player is never left guessing. */
export function changesBox(st: Story) {
  const list = st.changes.filter(c => c.label !== 'Ducats' || Math.abs(c.delta) >= 1);
  return h('section', { class: 'story-changes', 'aria-label': 'What changed' },
    h('h3', {}, 'What changed'),
    list.length
      ? h('ul', {}, list.map(c => h('li', { class: c.from != null ? 'ch-word' : c.good ? 'ch-up' : 'ch-down' }, h('span', { class: 'ch-m', 'aria-hidden': 'true' }, mark(c)), changeLine(c))))
      : h('p', { class: 'muted small' }, 'Nothing that can be counted changed.'));
}

/** A button under the result: go and look at the place on the map. */
export function seeItButton(st: Story, close: () => void) {
  if (!st.place || !S.provinces[st.place]) return null;
  return h('button', { class: 'btn ghost', onclick: () => { close(); const id = st.place!; map.focus([id], 120); map.select(id); openSheet('province', id); } }, h('span', { html: icon('map', 14) }), ' See it on the map');
}

/** The short words that rise from the place on the map: the first counted change. */
function floatLabel(st: Story): string {
  // the change at the place itself first (Toledo: development), then any other count, then a changed word
  const here = st.place ? S.provinces[st.place]?.name ?? '' : '';
  // the map already floats these by itself when a province changes: no second label on top
  if (st.changes.some(x => here && /: (development|buildings|settlement|held by)$/.test(x.label) && x.label.startsWith(here + ':'))) return '';
  const c = st.changes.find(x => here && x.label.startsWith(here + ':') && x.from == null) ?? st.changes.find(x => x.from != null) ?? st.changes.find(x => x.from == null && x.label !== 'Ducats');
  if (!c) return '';
  if (c.from != null) return c.to === 'you' ? 'Yours' : c.to ?? '';
  return `${c.delta > 0 ? '+' : '−'}${Math.abs(c.delta)} ${c.label.replace(/^.*: /, '').replace(/^Relations with .*/, 'relations')}`;
}

/** Before the result opens: the map moves to the place and it pulses. Skipped when a window covers the map, when
 *  there is no place, or under reduced motion (then the result opens at once). */
export function stage(st: Story | undefined, then: () => void) {
  if (!st?.place || !S.provinces[st.place] || win || reduced()) { then(); return; }
  const good = st.changes.some(c => c.good) && !st.changes.some(c => !c.good && c.from == null && c.label !== 'Ducats');
  map.focus([st.place], 70);
  const tone = st.changes.length ? (good ? 'good' : 'bad') : 'neutral';
  map.pulse(st.place, tone, floatLabel(st));
  sfx(tone === 'bad' ? 'knock' : 'quill');
  setTimeout(then, STAGE_MS);
}
