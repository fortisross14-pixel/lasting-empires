// Research window: technologies by age and field.
import { needsBridge } from '../../engine/techgroups';
import { infoToggle } from '../simplify';
import { TROOPS, EQUIPMENT } from '../../data/troops';
import { TECHS, TECH, BUILDINGS, AGE_NAMES, type TechTrack } from '../../data/techs';
import { GOODS } from '../../data/goods';
import { AGE_TECH, ERA } from '../../data/eras';
import { techFx, ageIndex } from '../../engine/core';
import { cardFor } from '../../engine/cards';
import { missionBlocked, techCost, researchRate } from '../../engine/missions';
import { h } from '../dom';
import { icon } from '../icons';
import { S } from '../state';
import { toast, qLabel, qText } from '../app';
import { renderWin } from './frame';
import { openPlanner } from '../planner';
import { techOpenTo } from '../../engine/technology';
import { exposureLine, missingChain } from '../../engine/diffusion';

// Research tab filters: which age and which field are shown.
export let techAge: number | 'all' | null = null;
export let techTrack: TechTrack | 'all' | 'national' = 'all';
/** A study of the realm's own tradition (data/national.ts): open to a few realms only. */
const isNational = (id: string) => !!(TECH[id] as { only?: string[] }).only;
export const TRACK_NAME: Record<TechTrack, string> = { military: 'Military', economy: 'Economy', state: 'Statecraft' };
export const TRACK_ICON: Record<TechTrack, string> = { military: 'sword', economy: 'coin', state: 'crown' };

/** What a technology lets you build, draft or make. */
export function techUnlocks(id: string): string[] {
  const out: string[] = [];
  for (const b of Object.values(BUILDINGS)) if (b.tech === id) out.push(b.name);
  for (const t of Object.values(TROOPS)) if (t.tech === id) out.push(t.name);
  for (const e of Object.values(EQUIPMENT)) if (e.tech === id) out.push(e.name);
  for (const g of Object.values(GOODS)) if (g.tech === id) out.push(g.name);
  return [...new Set(out)];
}

/** About how many years a study takes: with your best free scholar, or the range for a new one. */
export function techYears(id: string): string {
  const cost = techCost(S, id);
  const free = S.characters.filter(c => c.role === 'researcher' && c.mission == null);
  if (free.length) {
    const best = free.reduce((a, c) => (researchRate(S, c, TECH[id].track) > researchRate(S, a, TECH[id].track) ? c : a));
    const y = cost / researchRate(S, best, TECH[id].track);
    return `about ${y < 1.5 ? Math.max(1, Math.round(y * 4)) + ' quarters' : Math.round(y) + ' years'} with ${best.name}`;
  }
  const lo = cost / (8 + techFx(S, 'research')), hi = cost / (4 + techFx(S, 'research'));
  return `about ${Math.max(1, Math.round(lo))}–${Math.max(1, Math.round(hi))} years`;
}

export function techCard(t: (typeof TECHS)[number]): HTMLElement {
  const known = S.techs.includes(t.id);
  const m = S.missions.find(x => x.kind === 'research' && x.target === t.id);
  const why = known ? null : missionBlocked(S, 'research', t.id);
  const card = cardFor(S, 'research', { track: t.track });
  const cost = techCost(S, t.id);
  const status = known ? 'Known' : m ? `Studying · ${Math.floor(m.progress)}/${cost} · ${qLabel(m.turnsLeft)} left` : techYears(t.id);
  const unlocks = techUnlocks(t.id);
  const chain = known ? [] : missingChain(S, t.id), exposure = exposureLine(S, t.id);
  const tap = () => known ? toast(t.desc) : m ? toast(`Being studied: ${qText(m.turnsLeft)} left`) : why ? toast(why, 'bad') : !card ? toast(`Needs a ${TRACK_NAME[t.track]} study card (buy one in the Cards tab)`, 'bad') : openPlanner('research', t.id, undefined, card.uid);
  // what it does, what it needs and what it opens: one tap on ⓘ away
  const more = h('span', { class: 'tc-more', hidden: true },
    h('span', { class: 'tc-desc' }, t.desc),
    !known && t.req?.length ? h('small', { class: 'tc-req' + (t.req.every(r => S.techs.includes(r)) ? '' : ' bad') }, 'Needs ' + t.req.map(r => TECH[r].name + (S.techs.includes(r) ? ' ✓' : '')).join(', ')) : null,
    // the whole way there, each step a link to why it is not open yet
    !known && chain.length > (t.req?.length ?? 0) ? h('small', { class: 'tc-req' }, 'Path: ', ...chain.flatMap((r, i) => [i ? ' → ' : '', h('button', { class: 'linkish', onclick: (e: Event) => { e.stopPropagation(); const w = missionBlocked(S, 'research', r); toast(`${TECH[r].name}: ${w ?? 'ready to study'}`, w ? 'bad' : 'good'); } }, TECH[r].name)]), ` → ${t.name}`) : null,
    exposure ? h('small', { class: 'tc-exp' }, exposure) : null,
    AGE_TECH[t.id] ? h('span', { class: 'tech-age' }, `Opens the ${ERA[AGE_TECH[t.id]].name} for the whole world`) : null);
  return h('div', { class: `tcard tr-${t.track}${known ? ' known' : m ? ' active' : why ? ' locked' : ''}`, role: 'button', tabindex: '0', onclick: tap },
    h('span', { class: 'tc-side' }, h('span', { class: 'tc-ico', html: icon(TRACK_ICON[t.track], 26) }), h('b', { class: 'tc-pts' }, known ? '✓' : String(cost)), h('small', {}, known ? 'known' : 'points')),
    h('span', { class: 'tc-body' },
      h('span', { class: 'tc-head' }, h('b', { class: 'tc-name' }, t.name), infoToggle([more], `About ${t.name}`)),
      h('small', { class: 'tc-status' }, isNational(t.id) ? `National tradition · ${status}` : status),
      unlocks.length ? h('span', { class: 'tc-unl' }, unlocks.map(u => h('i', {}, u))) : null,
      more,
      !known && !m && why && !why.startsWith('Needs ') ? h('small', { class: 'bad' }, why) : null));
}

export function techTab(body: HTMLElement) {
  const now = ageIndex(S);
  if (techAge == null || (techAge !== 'all' && techAge > now)) techAge = now;
  const inAge = (a: number) => TECHS.filter(t => t.age === a && techOpenTo(S, S.player, t.id));
  const ages = h('div', { class: 'seg tfilter' },
    AGE_NAMES.map((name, i) => i > now
      ? h('button', { class: 'seg-b locked', onclick: () => toast(`The Age of ${name} has not begun. Its research stays hidden until then.`) }, name)
      : h('button', { class: 'seg-b' + (techAge === i ? ' on' : ''), onclick: () => { techAge = i; renderWin(); } }, name, h('small', {}, ` ${inAge(i).filter(t => S.techs.includes(t.id)).length}/${inAge(i).length}`))),
    h('button', { class: 'seg-b' + (techAge === 'all' ? ' on' : ''), onclick: () => { techAge = 'all'; renderWin(); } }, 'All'));
  const hasNational = TECHS.some(t => isNational(t.id) && techOpenTo(S, S.player, t.id));
  const tracks = h('div', { class: 'seg tfilter' }, ([...(['all', 'military', 'economy', 'state'] as const), ...(hasNational ? ['national' as const] : [])]).map(tr =>
    h('button', { class: 'seg-b' + (techTrack === tr ? ' on' : ''), onclick: () => { techTrack = tr; renderWin(); } }, tr === 'all' ? 'All fields' : tr === 'national' ? 'National' : TRACK_NAME[tr])));
  body.append(ages, tracks);
  const list = TECHS.filter(t => techOpenTo(S, S.player, t.id) && t.age <= now && (!t.bridge || needsBridge(S, t.id)) && (techAge === 'all' || t.age === techAge) && (techTrack === 'all' || (techTrack === 'national' ? isNational(t.id) : t.track === techTrack)));
  // studies under way first, then what you can start, then the rest, then what you know
  const rank = (t: (typeof TECHS)[number]) => S.techs.includes(t.id) ? 3 : S.missions.some(x => x.kind === 'research' && x.target === t.id) ? 0 : missionBlocked(S, 'research', t.id) ? 2 : 1;
  list.sort((a, b) => rank(a) - rank(b) || a.age - b.age || a.cost - b.cost);
  const grid = h('div', { class: 'tgrid' });
  for (const t of list) grid.append(techCard(t));
  body.append(grid);
  if (now < AGE_NAMES.length - 1) body.append(h('p', { class: 'muted' }, `The research of the Age of ${AGE_NAMES[now + 1]} opens with that age.`));
}
