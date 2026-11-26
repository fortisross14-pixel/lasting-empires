// The chronicle of a reign (docs/PLAN-DIRECTION.md, M7): what you aimed for, the choices that decided it, and the
// realm then and now. Shown at the end of a game and at the top of the realm's history; drawn into the shared picture.
import type { GameState } from '../types';
import { h } from './dom';
import { icon } from './icons';
import { ambitionDef, decisiveMoments } from '../engine/arc';
import { ranking } from '../engine/turn';
import { player, provsOf } from '../engine/core';
import { SEASON_NAMES } from '../engine/story';

const MARK = { won: '✓', failed: '✕', 'set aside': '–' } as const;

/** The ambitions held, in order, each with how it ended (or that it is still open). */
export function ambitionLines(s: GameState): { mark: string; text: string; tone: 'good' | 'bad' | 'neutral' }[] {
  return (s.ambitions ?? []).map(a => {
    const d = ambitionDef(a.id);
    const name = d?.name ?? a.id;
    const when = `${a.from}${a.to ? ` – ${a.to}` : ''}`;
    if (a.result === 'won') return { mark: MARK.won, text: `${name}, fulfilled (${when})`, tone: 'good' as const };
    if (a.result === 'failed') return { mark: MARK.failed, text: `${name}, failed (${when})`, tone: 'bad' as const };
    if (a.result === 'set aside') return { mark: MARK['set aside'], text: `${name}, set aside for a grander one (${when})`, tone: 'neutral' as const };
    return { mark: '…', text: `${name}, still pursued (since ${a.from})`, tone: 'neutral' as const };
  });
}

/** The realm then and now, in a few numbers. */
export function thenAndNow(s: GameState): { label: string; then: string; now: string }[] {
  const pos = ranking(s).findIndex(x => x.id === s.player) + 1;
  const ord = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
  return [
    { label: 'Provinces', then: String(s.flags.start_provs ?? '?'), now: String(provsOf(s, s.player).length) },
    { label: 'Place among the powers', then: s.flags.rank0 ? ord(s.flags.rank0) : '?', now: pos ? ord(pos) : '?' },
    { label: 'Technologies', then: '', now: String(s.techs.length) },
    { label: 'Prestige', then: '', now: String(Math.round(player(s).prestige)) },
  ];
}

/** The chronicle as a page section. `final`: the words of an ending rather than of a reign under way. */
export function chronicleSection(s: GameState, final = false, numbers = true): HTMLElement {
  const moments = decisiveMoments(s);
  const amb = ambitionLines(s);
  return h('section', { class: 'chron' },
    h('h3', {}, final ? 'The reign in brief' : 'So far'),
    !numbers ? null : h('div', { class: 'chron-now' }, thenAndNow(s).map(r => h('div', { class: 'cn-r' }, h('small', {}, r.label), h('b', {}, r.then ? `${r.then} → ${r.now}` : r.now)))),
    amb.length ? h('h3', {}, 'Ambitions') : null,
    amb.length ? h('ul', { class: 'chron-amb' }, amb.map(a => h('li', { class: 't-' + a.tone }, h('span', { class: 'ca-m', 'aria-hidden': 'true' }, a.mark), a.text))) : null,
    h('h3', {}, 'The choices that decided it'),
    moments.length
      ? h('ol', { class: 'chron-list' }, moments.map(m => h('li', {},
          h('span', { class: 'cl-when' }, `${SEASON_NAMES[m.quarter] ?? ''} ${m.year}`),
          h('span', { class: 'cl-t' }, h('b', {}, m.title), h('span', { class: 'cl-b' }, h('span', { html: icon('quill', 12) }), ' ', m.because), m.changes.length ? h('small', {}, m.changes.join(' · ')) : null))))
      : h('p', { class: 'muted' }, final ? 'No single choice stood out: a reign of small steps.' : 'Nothing decisive yet. Land won or lost, treaties, trade posts, studies and growing towns are set down here.'));
}
