// Internal window: government, core cards, rank and viceroys, provinces.
import { TECH } from '../../data/techs';
import { GOVS, GOV_ORDER } from '../../data/governments';
import { revolutionBlocked, revolutionLands, startRevolution, REVOLUTION_YEARS } from '../../engine/government';
import { player, provsOf, armyPower, tierOf, TIERS, population, coreSlots } from '../../engine/core';
import { coreBlocked, coreCost, adoptCore, dropCore } from '../../engine/turn';
import { getGeo } from '../../engine/map';
import { h, signed } from '../dom';
import { icon } from '../icons';
import { charCard, coreCard } from '../cards';
import { AXES, CORE } from '../../data/core';
import { happinessOf, moodName, CULTURE_NAMES, RELIGION_NAMES, isAccepted } from '../../engine/society';
import { rankOf, nextRank, missionCap, viceroyBlocked, territoryOf, appointViceroy, recallViceroy, viceroyFocus, FOCUS_TEXT } from '../../engine/realm';
import { S, map, pick } from '../state';
import { toast, act } from '../app';
import { closeWin } from './frame';
import { openSheet, stat, actionRow } from '../sheets';
import { confirmBox } from '../modal';
import { processQueue } from '../prompts';

// ---------- government and revolution ----------
export function govCard(id: string, current: boolean): HTMLElement {
  const g = GOVS[id];
  const why = current ? null : revolutionBlocked(S, id);
  const box = h('div', { class: 'gov' + (current ? ' now' : '') + (!current && why ? ' locked' : '') },
    h('div', { class: 'gov-h' }, h('span', { class: 'gov-i', html: icon(g.icon, 26) }), h('div', {}, h('b', {}, g.name), h('small', {}, current ? 'Your government' : g.tech ? `Needs ${TECH[g.tech].name}${S.techs.includes(g.tech) ? ' ✓' : ''}` : 'The old way'))),
    h('p', { class: 'gov-t' }, g.text),
    h('ul', { class: 'gov-b' }, g.buffs.map(b => h('li', {}, b))));
  if (!current) box.append(h('button', { class: 'btn' + (why ? ' blocked' : ' primary'), onclick: () => (why ? toast(why, 'bad') : confirmRevolution(id)) }, why ?? 'Start a revolution'));
  return box;
}

export function confirmRevolution(to: string) {
  const lands = revolutionLands(S);
  const front = lands.filter(id => (getGeo().adj[id] ?? []).some(nb => S.provinces[nb]?.owner === S.player && !lands.includes(nb)));
  const cap = [...(front.length ? front : lands)].sort((a, b) => S.provinces[b].dev - S.provinces[a].dev)[0];
  const turn = S.troops.filter(t => t.mission == null && t.loc && lands.includes(t.loc)).length;
  confirmBox(`Revolution towards ${GOVS[to].name}?`,
    `${lands.length} province${lands.length > 1 ? 's' : ''} will rise for the old order: ${lands.map(id => S.provinces[id].name).join(', ')}. Their capital will be ${S.provinces[cap].name}. They raise about ${Math.max(4, Math.round(S.troops.length * 0.6 + lands.length * 0.5))} companies${turn ? `, and ${turn} of your companies stationed there change sides` : ''}. Take ${S.provinces[cap].name}, or destroy all their troops, within ${REVOLUTION_YEARS} years to win; if they take ${S.provinces[player(S).capital].name} first, the revolution fails and you lose 40% of your treasure, 3 cards and 2 stability.`,
    'Start the revolution', () => { act(() => startRevolution(S, to)); processQueue(); });
}

export function govTab(body: HTMLElement) {
  const r = S.revolution;
  if (r) {
    const n = S.nations[r.rebel];
    const mine = Math.round(armyPower(S.troops)), theirs = Math.round(armyPower(n?.army ?? []));
    body.append(h('div', { class: 'gov revo' },
      h('div', { class: 'gov-h' }, h('span', { class: 'gov-i', html: icon('torch', 26) }), h('div', {}, h('b', {}, `Revolution towards ${GOVS[r.to].name}`), h('small', {}, `Year ${S.year - r.since + 1} of ${REVOLUTION_YEARS}`))),
      h('ul', { class: 'gov-b' },
        h('li', {}, `To win: take ${S.provinces[r.rebelCapital].name}, the capital of the ${n?.name ?? 'rebels'}, or destroy all their companies`),
        h('li', {}, `You lose if ${S.provinces[r.myCapital].name} falls, or after ${r.since + REVOLUTION_YEARS}`),
        h('li', {}, `Army strength: yours ${mine}, theirs ${theirs}`),
        h('li', {}, `They hold ${provsOf(S, r.rebel).length} provinces`)),
      h('button', { class: 'btn primary', onclick: () => { closeWin(); map.focus([r.rebelCapital], 200); } }, `Show ${S.provinces[r.rebelCapital].name}`)));
  }
  const cur = S.gov ?? 'feudal';
  body.append(h('h3', {}, 'Your government'), govCard(cur, true));
  body.append(h('h3', {}, 'Other forms of government'), h('p', { class: 'muted' }, 'Changing government takes a Revolution card (Internal deck, once you have researched a new form) and a civil war: the far provinces rise for the old order.'));
  const grid = h('div', { class: 'gov-grid' });
  for (const id of GOV_ORDER) if (id !== cur) grid.append(govCard(id, false));
  body.append(grid);
}

export function realmTab(body: HTMLElement) {
  const r = rankOf(S), nx = nextRank(S), k = provsOf(S, S.player).length;
  body.append(h('div', { class: 'coresec' },
    h('div', { class: 'cs-head' }, h('b', {}, `${player(S).name}: ${r.name}`), h('small', {}, nx ? `${nx.name} at ${nx.min} provinces (you have ${k})` : 'The highest rank')),
    h('div', { class: 'stats' }, stat('Tasks a year', `${missionCap(S)}`), stat('Started this year', `${S.launched ?? 0}`), stat('Viceroys', `${S.viceroys?.length ?? 0}/${r.viceroys}`), stat('Provinces', k)),
    h('p', { class: 'muted' }, 'Small Kingdom 6 tasks a year · Kingdom (5+ provinces) 9 · Great Kingdom (13+) 12 and 1 viceroy · Empire (30+) 15 and 3 viceroys. Each viceroy takes 2 of your yearly tasks.')));
  // viceroys
  body.append(h('h3', {}, 'Viceroys'));
  if (!r.viceroys) body.append(h('p', { class: 'muted' }, 'A Great Kingdom or an Empire can hand distant provinces to a viceroy. They govern them for you: a better viceroy raises control, happiness and development faster, but the very able grow ambitious and may crown themselves.'));
  for (const v of S.viceroys ?? []) {
    const c = S.characters.find(x => x.uid === v.char);
    body.append(h('div', { class: 'vrow' }, c ? charCard(c, S, { small: true }) : null,
      h('div', { class: 'a-t' }, h('b', {}, `${c?.name ?? '?'} · Viceroy of ${S.provinces[v.seat]?.name}`), h('small', {}, `${v.provinces.length} provinces · since ${v.since}${c ? ' · ' + FOCUS_TEXT[viceroyFocus(c.role)] : ''}`),
        h('div', { class: 'ctl' }, h('span', {}, 'Loyalty'), h('span', { class: 'ctl-bar' }, h('i', { style: `width:${v.loyalty}%`, class: v.loyalty < 40 ? 'low' : '' })), h('b', {}, `${Math.round(v.loyalty)}`))),
      h('button', { class: 'btn small', onclick: () => confirmBox('Recall the viceroy?', v.loyalty < 40 ? 'They are disloyal: stability falls by 1.' : 'They return to court.', 'Recall', () => act(() => recallViceroy(S, v.char))) }, 'Recall')));
  }
  if (r.viceroys && (S.viceroys?.length ?? 0) < r.viceroys) {
    const seats = provsOf(S, S.player).filter(p => !viceroyBlocked(S, p.id)).sort((a, b) => territoryOf(S, b.id).length - territoryOf(S, a.id).length).slice(0, 8);
    const free = S.characters.filter(c => c.mission == null && !c.ruler);
    if (!seats.length) body.append(h('p', { class: 'muted' }, 'No province can seat a viceroy: it needs 3 of your provinces within two marches, away from the capital.'));
    else if (!free.length) body.append(h('p', { class: 'muted' }, 'Nobody free at court to send.'));
    else {
      body.append(h('p', { class: 'muted' }, 'Name a viceroy: choose a seat, then a person.'));
      let seat = pick.card != null ? null : seats[0].id;
      const sel = h('div', { class: 'targets' }, seats.map(p => h('button', { class: 'tchip' + (p.id === seat ? ' sel' : ''), onclick: (e: Event) => { seat = p.id; (e.currentTarget as HTMLElement).parentElement!.querySelectorAll('.tchip').forEach(x => x.classList.remove('sel')); (e.currentTarget as HTMLElement).classList.add('sel'); } }, `${p.name} (${territoryOf(S, p.id).length} provinces)`)));
      body.append(h('p', { class: 'muted small' }, 'The person shapes the viceroyalty: a general (forts, manpower), an administrator (control, growth), a merchant (buildings, ducats), a diplomat (happiness), a researcher (research). A big, unhappy viceroyalty, or a very able viceroy under a weak crown, may break away.'));
      const pr = h('div', { class: 'cards-row wrap' }, free.map(c => charCard(c, S, { small: true, badge: viceroyFocus(c.role), onclick: () => seat && confirmBox(`Make ${c.name} viceroy?`, `${c.name} will govern ${territoryOf(S, seat).length} provinces from ${S.provinces[seat].name} for good. ${c.skill >= 5 ? 'Very able: watch their loyalty.' : ''}`, 'Appoint', () => act(() => appointViceroy(S, seat!, c.uid), 'Viceroy appointed')) })));
      body.append(sel, pr);
    }
  }
  // the people and civil wars
  body.append(peopleMood());
  const factions = Object.values(S.nations).filter(n => n.alive && S.flags['faction_' + n.id] === 1);
  body.append(h('h3', {}, 'Civil wars'));
  if (!factions.length) body.append(h('p', { class: 'muted' }, 'None. Provinces below 30% happiness may rise; if rebels beat your troops they take the province and start a civil war that spreads to unhappy provinces of the same faith or culture.'));
  for (const f of factions) body.append(h('button', { class: 'nrow war', onclick: () => { closeWin(); openSheet('nation', f.id); } }, h('span', { class: 'swatch', style: `background:${f.color}` }), h('span', { class: 'nr-name' }, f.name, h('small', {}, `${provsOf(S, f.id).length} provinces · ${f.army.length} companies`)), h('span', { class: 'a-go', html: icon('next', 14) })));
  const angry = provsOf(S, S.player).filter(p => happinessOf(S, p).value < 30);
  if (angry.length) body.append(h('p', { class: 'bad' }, `At risk of rising: ${angry.map(p => `${p.name} (${happinessOf(S, p).value}%)`).join(', ')}.`));
}

export function coreSection() {
  const slots = coreSlots(S);
  const wrap = h('div', { class: 'coresec' });
  wrap.append(h('div', { class: 'cs-head' }, h('b', {}, `Core cards (${S.core.length}/${slots} slots)`),
    h('small', {}, `Adopting costs ${coreCost(S)} nation points. Setting one aside costs 1 stability. One change every 5 years.`)));
  const row = h('div', { class: 'cards-row wrap' });
  for (let i = 0; i < 4; i++) {
    const id = S.core[i];
    if (id) row.append(coreCard(id, { slotted: true, onclick: () => confirmBox(`Set aside ${CORE[id].name}?`, 'Stability falls by 1, and the realm returns to the middle on this axis.', 'Set aside', () => act(() => dropCore(S, id))) }));
    else if (i < slots) row.append(h('div', { class: 'card slot-open' }, h('span', {}, 'Empty slot'), h('small', {}, 'Adopt a core card below')));
    else row.append(h('div', { class: 'card slot-locked' }, h('span', { html: icon('chain', 18) }), h('small', {}, ['', 'Bureaucracy or 40 development', 'Absolutism', 'Enlightened Government'][i])));
  }
  wrap.append(row);
  for (const ax of AXES) {
    const cur = S.core.find(c => CORE[c].axis === ax.id);
    const side = (id: string) => {
      const why = coreBlocked(S, id);
      return h('div', { class: 'ax-side' + (cur === id ? ' on' : '') }, coreCard(id, { small: true }),
        h('div', { class: 'ax-txt' }, h('b', {}, CORE[id].name), h('small', { class: 'good' }, CORE[id].pros.join(' · ')), h('small', { class: 'bad' }, CORE[id].cons.join(' · ')),
          cur === id ? h('span', { class: 'tag ally' }, 'Adopted') : h('button', { class: 'btn small' + (why ? ' blocked' : ''), onclick: () => (why ? toast(why, 'bad') : act(() => adoptCore(S, id), `${CORE[id].name} adopted`)) }, why ?? `Adopt · ${coreCost(S)} NP`)));
    };
    wrap.append(h('div', { class: 'axis' }, h('div', { class: 'ax-h' }, h('b', {}, ax.name), h('span', { class: 'ax-meter' }, h('i', { style: `left:${cur === ax.left ? 8 : cur === ax.right ? 92 : 50}%` }))), side(ax.left), side(ax.right)));
  }
  return wrap;
}

export function peopleMood() {
  const ps = provsOf(S, S.player);
  const avg = S.happiness ?? 50;
  const cap = S.provinces[player(S).capital] ?? ps[0];
  const parts = cap ? happinessOf(S, cap).parts.filter(x => !['Base', 'Buildings', 'Recently conquered', 'Weak royal control'].includes(x.label) && !x.label.includes('faith') && !x.label.includes('culture') && !x.label.includes('minority')) : [];
  const minorities = ps.filter(p => p.religion !== S.stateReligion).length, foreign = ps.filter(p => !isAccepted(S, p.culture)).length;
  return h('div', { class: 'mood coresec' },
    h('div', { class: 'cs-head' }, h('b', {}, `The people: ${moodName(avg)} (${avg}%)`), h('small', {}, avg >= 65 ? 'Stability tends to rise' : avg < 40 ? 'Stability tends to fall; revolts may break out' : 'Stability holds')),
    h('div', { class: 'ctl-bar' }, h('i', { style: `width:${avg}%`, class: avg < 35 ? 'low' : '' })),
    h('div', { class: 'stats' }, stat('Faith', `${RELIGION_NAMES[S.stateReligion]} · ${minorities} other`), stat('Cultures', `${S.accepted.map(c => CULTURE_NAMES[c] ?? c).join(', ')} · ${foreign} foreign`), stat('Arts', `${Math.round(S.art)}/100`), stat('Tax burden', `${Math.round(S.taxBurden)}`)),
    parts.length ? h('div', { class: 'tags' }, parts.map(x => h('span', { class: 'tag ' + (x.v < 0 ? 'war' : 'ally') }, `${x.label} ${signed(x.v)}`))) : null,
    h('p', { class: 'muted' }, 'Raise it with Patronage of the Arts, Royal Festivals, Religious Missions, Cultural Integration, Charters and temples. Taxes and long wars lower it.'));
}

export function provincesTab(body: HTMLElement) {
  const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, h('th', {}, 'Province'), h('th', {}, 'Settlement'), h('th', {}, 'People'), h('th', {}, 'Happy'), h('th', {}, 'Culture'), h('th', {}, 'Faith'), h('th', {}, 'Dev'), h('th', {}, 'Control'))));
  const tb = h('tbody');
  for (const p of provsOf(S, S.player).sort((a, b) => b.dev - a.dev)) {
    tb.append(h('tr', { onclick: () => { closeWin(); map.select(p.id); map.focus([p.id]); openSheet('province', p.id); } },
      h('td', {}, p.name), h('td', {}, TIERS[tierOf(p)].name), h('td', {}, `${Math.round(population(S, p) / 1000)}k`),
      h('td', { class: happinessOf(S, p).value < 35 ? 'bad' : '' }, `${happinessOf(S, p).value}%`), h('td', { class: isAccepted(S, p.culture) ? '' : 'bad' }, CULTURE_NAMES[p.culture] ?? p.culture),
      h('td', { class: p.religion === S.stateReligion ? '' : 'bad' }, RELIGION_NAMES[p.religion] ?? p.religion), h('td', {}, String(p.dev)),
      h('td', { class: p.control < 30 ? 'bad' : '' }, `${Math.round(p.control)}%`)));
  }
  t.append(tb);
  body.append(h('div', { class: 'tscroll' }, t));
  body.append(actionRow('anchor', 'Overseas lands', 'Discoveries and colonies', null, () => openSheet('overseas')));
}
