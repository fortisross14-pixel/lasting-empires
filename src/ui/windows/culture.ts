// People window: cultures, religion, the arts.
import { infoToggle } from '../simplify';
import type { MissionKind } from '../../types';
import { GENRES, QUALITY } from '../../data/culture';
import {
  churchHead, churchRel, churchMood, giftCost, giftBlocked, artHappy, artGold, displayed, displaySlots, museumsOpen, artCost, acceptCap, cultureRows, religionRows,
  cultureName,
} from '../../engine/culture';
import { provsOf } from '../../engine/core';
import { playCard, cardFor } from '../../engine/cards';
import { missionBlocked, pilgrimageCost } from '../../engine/missions';
import { h } from '../dom';
import { icon } from '../icons';
import { happinessOf, moodName, RELIGION_NAMES, nationalHappiness } from '../../engine/society';
import { S } from '../state';
import { toast, act } from '../app';
import { stat, actionRow } from '../sheets';
import { countCards } from './economy';
import { openPlanner } from '../planner';

// ---------- People: cultures, religion, arts ----------
export function culturesTab(body: HTMLElement) {
  const rows = cultureRows(S);
  body.append(h('p', { class: 'muted small' }, `Embraced cultures count as your own people; others are unhappy (−12) until a cultural leader embraces them (${S.accepted.length}/${acceptCap(S)} embraced) or integrates their provinces one by one.`));
  body.append(h('table', { class: 'gtable' },
    h('thead', {}, h('tr', {}, h('th', {}, 'People'), h('th', { class: 'num' }, 'Provinces'), h('th', { class: 'num' }, 'People'), h('th', { class: 'num' }, 'Happy'), h('th', {}, ''))),
    h('tbody', {}, rows.map(r => h('tr', {},
      h('td', {}, h('b', {}, cultureName(r.culture)), r.accepted ? h('small', { class: 'muted' }, ' · your own') : null),
      h('td', { class: 'num' }, String(r.provinces)), h('td', { class: 'num' }, `${(r.people / 1000).toFixed(0)}k`),
      h('td', { class: 'num ' + (r.happy < 35 ? 'dn' : r.happy >= 60 ? 'up' : '') }, `${r.happy}%`),
      h('td', { class: 'g-acts' }, r.accepted ? null : peopleAction('accept', r.culture, 'Embrace')))))));
  body.append(h('h3', {}, 'What makes them happy'));
  const hp = nationalHappiness(S);
  body.append(h('p', {}, `Across the realm ${hp}% (${moodName(hp)}). Works of art add ${artHappy(S).toFixed(1)} everywhere now; Royal Grace and Integration work province by province.`));
  const worst = [...provsOf(S, S.player)].map(p => ({ p, v: happinessOf(S, p).value })).sort((a, b) => a.v - b.v).slice(0, 5);
  for (const { p, v } of worst) body.append(h('div', { class: 'ctl' }, h('span', {}, `${p.name} (${cultureName(p.culture)})`), h('span', { class: 'ctl-bar' }, h('i', { style: `width:${v}%`, class: v < 35 ? 'low' : '' })), h('b', {}, `${v}%`)));
}

/** A shortcut from a People tab to the planner, if you hold the card. */
export function peopleAction(kind: MissionKind, target: string, label: string) {
  const card = cardFor(S, kind);
  const why = !card ? `Needs a ${kind === 'accept' ? 'Embrace a Culture' : kind === 'pilgrimage' ? 'Mission to the Church' : kind === 'convert' ? 'Religious Mission' : 'Work of Art'} card` : missionBlocked(S, kind, target);
  return h('button', { class: 'btn small ghost' + (why ? ' blocked' : ''), title: why ?? '', onclick: () => (why ? toast(why, 'bad') : openPlanner(kind, target, undefined, card!.uid)) }, label);
}

export function religionTab(body: HTMLElement) {
  const head = churchHead(S), rel = churchRel(S), mood = churchMood(S);
  body.append(h('div', { class: 'stats' }, stat('State faith', RELIGION_NAMES[S.stateReligion] ?? S.stateReligion), stat('Leaders', head.name), stat('Their favour', `${Math.round(rel)}`), stat('Standing', mood === 'blessed' ? 'Blessed' : mood === 'censured' ? 'Censured' : 'Tolerated')));
  body.append(h('div', { class: 'ctl' }, h('span', {}, 'Favour'), h('span', { class: 'ctl-bar' }, h('i', { style: `width:${(rel + 100) / 2}%`, class: rel <= -40 ? 'low' : '' })), h('b', {}, `${Math.round(rel)}`)));
  body.append(h('p', { class: 'muted small' }, `At 50 or more you are blessed: +3 happiness in provinces of your faith and +1 prestige a year, and at 80 they may send missionaries. At −40 or less you are censured: −5 happiness there and stability may fall. Favour drifts back towards 20${S.stateReligion === 'catholic' ? ' (your standing with the Papal States)' : ''}. Converting provinces and sacred art please them.`));
  const gift = S.hand.find(h => h.card === 'church_gift');
  body.append(actionRow('coin', 'Send a gift', `Uses a Gift to the Church card (you hold ${countCards('church_gift')}) · ${giftCost(S)} ducats · favour +10`, !gift ? 'Needs a Gift to the Church card (People deck)' : giftBlocked(S), () => act(() => { const r = playCard(S, gift!.uid, ''); if (r.startsWith('!')) toast(r.slice(1), 'bad'); }, 'Gift sent')));
  body.append(actionRow('church', 'Mission to the Church', `A churchman wins favour: +3 to +40 · ${pilgrimageCost(S)} ducats`, !cardFor(S, 'pilgrimage') ? 'Needs a Mission to the Church card' : missionBlocked(S, 'pilgrimage', ''), () => openPlanner('pilgrimage', '', undefined, cardFor(S, 'pilgrimage')!.uid)));
  body.append(h('h3', {}, 'Faiths of the realm'));
  body.append(h('table', { class: 'gtable' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Faith'), h('th', { class: 'num' }, 'Provinces'), h('th', { class: 'num' }, 'People'), h('th', { class: 'num' }, 'Happy'), h('th', {}, ''))),
    h('tbody', {}, religionRows(S).map(r => h('tr', {},
      h('td', {}, h('b', {}, RELIGION_NAMES[r.religion] ?? r.religion), r.religion === S.stateReligion ? h('small', { class: 'muted' }, ' · state faith') : null),
      h('td', { class: 'num' }, String(r.provinces)), h('td', { class: 'num' }, `${(r.people / 1000).toFixed(0)}k`),
      h('td', { class: 'num ' + (r.happy < 35 ? 'dn' : r.happy >= 60 ? 'up' : '') }, `${r.happy}%`),
      h('td', { class: 'g-acts' }, r.religion === S.stateReligion ? null : h('small', { class: 'muted' }, 'convert province by province')))))));
  const others = provsOf(S, S.player).filter(p => p.religion !== S.stateReligion).slice(0, 8);
  if (others.length) {
    body.append(h('h3', {}, 'Provinces of other faiths'));
    for (const p of others) body.append(h('div', { class: 'grow-row' }, h('span', { class: 'gico', html: icon('church', 18) }), h('div', { class: 'g-t' }, h('b', {}, p.name), h('small', {}, `${RELIGION_NAMES[p.religion] ?? p.religion} · happiness ${happinessOf(S, p).value}%`)), h('div', { class: 'g-acts' }, peopleAction('convert', p.id, 'Convert'))));
  }
}

export function artsTab(body: HTMLElement) {
  const works = [...(S.works ?? [])].sort((a, b) => b.year - a.year);
  const g = artGold(S);
  body.append(h('div', { class: 'stats' }, stat('Works', String(works.length)), stat('Happiness now', '+' + artHappy(S).toFixed(1)), stat('Ducats a year', (g.fees + g.visitors).toFixed(1)), stat('On show', `${displayed(S).length}/${displaySlots(S)}`)));
  body.append(h('p', { class: 'muted small' }, `An artist makes one work per task. Quality is the outcome: the better it is, the longer it cheers the people; admired works pay fees for a few years, celebrated ones bring a free card of their kind and masterpieces may carry a famous name. Libraries show 1 work, universities 2, museums 4; ${museumsOpen(S) ? 'in this Age of Enlightenment visitors pay for them.' : 'from the Age of Enlightenment visitors will pay to see them.'}`));
  body.append(h('h3', {}, 'Commission a work'), h('p', { class: countCards('patronage') ? 'muted small' : 'bad small' }, `Each work takes a Commission a Work of Art card (you hold ${countCards('patronage')}) and a free artist or courtier. Draw them in the People deck or buy a pack.`));
  const list = h('div', { class: 'tlist' });
  for (const gd of Object.values(GENRES)) list.append(h('div', { class: 'trow' }, h('span', { class: 'gico', html: icon(gd.icon, 20) }), (() => { const d = h('small', { hidden: true }, gd.desc); return h('div', { class: 'a-t' }, h('b', {}, gd.name, infoToggle([d], `About ${gd.name}`)), h('small', {}, `${artCost(S, gd.id)} ducats`), d); })(), h('div', { class: 'r-acts' }, peopleAction('artwork', gd.id, 'Commission'))));
  body.append(list);
  body.append(h('h3', {}, `The crown's collection (${works.length})`));
  if (!works.length) body.append(h('p', { class: 'muted' }, 'Nothing yet. Invite an artist or send a courtier with a Commission card.'));
  const shown = new Set(displayed(S).map(w => w.id));
  const now = S.year + (S.quarter ?? 0) / 4;
  for (const w of works.slice(0, 40)) {
    const left = Math.max(0, w.until - now);
    const q = QUALITY[w.quality];
    body.append(h('div', { class: 'grow-row work q' + w.quality }, h('span', { class: 'gico', html: icon(GENRES[w.genre]?.icon ?? 'star', 20) }),
      h('div', { class: 'g-t' }, h('b', {}, w.name), h('small', {}, `${q.name} ${GENRES[w.genre]?.name.toLowerCase() ?? ''} · ${w.artist}, ${Math.floor(w.year)}${left > 0 ? ` · +${(w.happy * Math.min(1, left / Math.max(0.25, w.until - w.year))).toFixed(1)} happiness, ${left >= 1 ? Math.ceil(left) + ' yr' : 'fading'}` : ''}${w.goldUntil > S.year ? ` · ${w.gold} ducats/yr to ${w.goldUntil}` : ''}`)),
      shown.has(w.id) ? h('span', { class: 'gchip over' }, 'on show') : null));
  }
}
