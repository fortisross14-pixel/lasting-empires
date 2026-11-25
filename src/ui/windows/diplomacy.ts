// Diplomacy window: realms and subjects.
import { provsOf, getRel, atWar, hasTreaty } from '../../engine/core';
import { provKnown } from '../../engine/overseas';
import { h, signed } from '../dom';
import { subjectsOf, integrateBlocked, tributeShare } from '../../engine/diplo';
import { S, shield } from '../state';
import { icon } from '../icons';
import { worldAmbitions } from '../../engine/rivals';
import { rising } from '../../engine/ai';
import { openSheet } from '../sheets';

export function subjectsTab(body: HTMLElement) {
  const subs = subjectsOf(S);
  body.append(h('h3', {}, `Subjects (${subs.length})`));
  if (!subs.length) body.append(h('p', { class: 'muted' }, 'No vassals or unions yet. Demand fealty from a weak crown, win one in a peace, or inherit one through a royal marriage.'));
  for (const x of subs) {
    const yrs = S.year - (x.subjectSince ?? S.year);
    const trib = provsOf(S, x.id).reduce((a, p) => a + p.dev * 0.6, 0) * tributeShare(x);
    const why = integrateBlocked(S, x.id);
    body.append(h('button', { class: 'nrow', onclick: () => openSheet('nation', x.id) },
      h('span', { class: 'swatch', style: `background:${x.color}` }),
      h('span', { class: 'nr-name' }, x.name, h('small', {}, `${x.subject === 'union' ? 'Personal union' : 'Vassal'} · ${yrs} yrs · tribute ${trib.toFixed(1)}/yr`)),
      h('span', { class: 'nr-badges' }, h('span', { class: 'tag ' + (why ? '' : 'ally') }, why ? 'Loyal' : 'Ready to integrate')),
      h('span', { class: 'nr-rel ' + (getRel(S, S.player, x.id) < 0 ? 'bad' : 'good') }, signed(getRel(S, S.player, x.id)))));
  }
}

export function realmsTab(body: HTMLElement) {
  body.append(h('p', { class: 'muted' }, 'Every realm you know of, friends first. Tap one for treaties, envoys and war.'));
  const list = Object.values(S.nations).filter(n => n.alive && n.id !== S.player && provsOf(S, n.id).some(p => provKnown(S, p.id))).sort((a, b) => getRel(S, S.player, b.id) - getRel(S, S.player, a.id));
  for (const n of list) {
    const rel = getRel(S, S.player, n.id);
    const war = atWar(S, S.player, n.id);
    const badges = [war ? 'War' : '', hasTreaty(S, S.player, n.id, 'alliance') ? 'Ally' : '', hasTreaty(S, S.player, n.id, 'trade') ? 'Trade' : '', hasTreaty(S, S.player, n.id, 'marriage') ? 'Wed' : ''].filter(Boolean);
    body.append(h('button', { class: 'nrow' + (war ? ' war' : ''), onclick: () => openSheet('nation', n.id) },
      h('span', { class: 'swatch', style: `background:${n.color}` }),
      h('span', { class: 'nr-name' }, n.name, h('small', {}, `${provsOf(S, n.id).length} provinces`)),
      h('span', { class: 'nr-badges' }, badges.map(b => h('span', { class: 'tag ' + b.toLowerCase() }, b))),
      h('span', { class: 'nr-rel ' + (rel >= 30 ? 'good' : rel <= -30 ? 'bad' : '') }, signed(rel))));
  }
}

/** What the great powers are after: one realm a row, its shield, one or two lines, a tap opens it (M6). */
export function ambitionsTab(body: HTMLElement) {
  const list = worldAmbitions(S, id => rising(S, id));
  body.append(h('p', { class: 'muted' }, 'What the great powers are after. A great power\'s aims are plain to all; a smaller realm keeps them to itself unless your envoys or spies learn them. Tap a realm for its page.'));
  body.append(h('div', { class: 'amb-list' }, list.map(a => {
    const n = S.nations[a.nation];
    return h('button', { class: 'amb-row' + (a.aboutYou ? ' you' : ''), onclick: () => openSheet('nation', a.nation) },
      shield(a.nation, n.color, true),
      h('span', { class: 'amb-t' }, h('b', {}, n.name, h('small', {}, ` · ${a.provinces} provinces`)),
        ...a.lines.map(l => h('span', { class: 'amb-l t-' + l.tone }, `${l.tone === 'bad' ? '▾ ' : ''}${n.name} ${l.text}.`))),
      h('span', { class: 'a-go', html: icon('next', 14) }));
  })));
}
