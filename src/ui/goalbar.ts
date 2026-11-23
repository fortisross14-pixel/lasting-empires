// The goal, always in view (roadmap 5.1–5.3): a banner over the map with what you are working towards and how far
// you have come, pins on the provinces a goal names, and a stamp when a goal is met.
import { S, map } from './state';
import { h, $, clear } from './dom';
import { icon } from './icons';
import { goalView, type GoalView } from '../engine/goals';
import { AMBITIONS } from '../engine/drafts';
import { ranking } from '../engine/turn';
import { getGeo } from '../engine/map';
import { openSheet } from './sheets';
import { sfx } from './sound';
import type { Goal } from '../types';

/** Years before a deadline at which the banner turns to warning. */
export const LATE_YEARS = 5;

/** The provinces a goal names, for the pins on the map. */
function goalProvinces(g: Goal): string[] {
  if (g.k === 'own') return g.provinces;
  if (g.k === 'ownLands' || g.k === 'noneIn') return getGeo().seeds.filter(x => g.of.includes(x.owner)).map(x => x.id);
  return [];
}
/** Short words for a goal, for one line on a phone. */
const short = (v: GoalView) => (v.need > 1 && !v.invert ? `${v.title.replace(/^Hold /, '')} ${Math.min(v.have, v.need)}/${v.need}` : v.title);

let metBefore: Set<string> | null = null;
let gameKey = '';

export function renderGoalBar() {
  const bar = document.getElementById('goalbar');
  if (!bar || !S) return;
  clear(bar);
  const key = `${S.player}|${S.startYear}|${S.scenario?.id ?? ''}`;
  if (key !== gameKey) { gameKey = key; metBefore = null; }
  const sc = S.scenario;
  let items: { id: string; v: GoalView }[] = [];
  let deadline: number | null = null;
  let open: () => void = () => openSheet('realm');
  const pins: { id: string; held: boolean }[] = [];
  if (sc && sc.status === 'active') {
    deadline = sc.deadline;
    open = () => openSheet('goals');
    // a guided mission shows its steps, done in order; any other mission its goals
    const at = sc.step ?? 0;
    items = sc.steps?.length
      ? sc.steps.map((st, i) => { const v = goalView(S, st.g, sc.deadline); return { id: 's' + i, v: { ...v, met: i < at } }; })
      : sc.goals.map((g, i) => ({ id: 'g' + i, v: goalView(S, g, sc.deadline) }));
    for (const g of sc.goals) for (const id of goalProvinces(g)) {
      const p = S.provinces[id]; if (!p) continue;
      const mine = p.owner === S.player || S.nations[p.owner]?.overlord === S.player;
      pins.push({ id, held: g.k === 'noneIn' ? p.owner !== g.nation : mine });
    }
  } else if (sc) {
    // the mission is over: the banner says how it ended, and still opens the goals
    open = () => openSheet('goals');
    items = [{ id: 'end', v: { title: sc.status === 'won' ? `Mission accomplished${sc.done ? ` in ${sc.done}` : ''}` : 'Mission failed', status: '', have: 0, need: 0, met: false } }];
  } else {
    const a = AMBITIONS.find(x => x.id === S.ambition);
    if (a) { items = [{ id: 'amb', v: { title: a.name, status: a.text, have: S.ambitionDone ? 1 : 0, need: 1, met: S.ambitionDone } }]; deadline = a.deadline ?? null; }
    const r = ranking(S), pos = r.findIndex(x => x.id === S.player) + 1;
    items.push({ id: 'rank', v: { title: `${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'} of ${r.length}`, status: 'Your place among the powers', have: 0, need: 0, met: false } });
  }
  map.setGoalPins(pins);
  if (!items.length) { bar.hidden = true; return; }
  bar.hidden = false;
  // a goal newly met: a stamp and a sting (not on the first look at a game)
  const met = new Set(items.filter(x => x.v.met && x.id !== 'rank').map(x => x.id));
  const fresh = metBefore ? [...met].filter(id => !metBefore!.has(id)) : [];
  metBefore = met;
  const left = deadline != null ? deadline - S.year : null;
  bar.classList.toggle('late', left != null && left <= LATE_YEARS);
  const next = items.find(x => !x.v.met && x.id !== 'rank') ?? items[0];
  bar.append(h('button', { class: 'gb-main', onclick: open, 'aria-label': 'Goals' },
    h('span', { class: 'gb-i', html: icon(sc ? 'star' : 'crown', 18) }),
    h('span', { class: 'gb-t' }, next.id === 'rank' ? `Rank ${next.v.title}` : next.v.met ? `${next.v.title} ✓` : short(next.v)),
    items.length > 1 ? h('span', { class: 'gb-dots', 'aria-label': `${met.size} of ${items.filter(x => x.id !== 'rank').length} done` },
      items.filter(x => x.id !== 'rank').map(x => h('i', { class: x.v.met ? 'on' : '' }))) : null,
    sc || next.id === 'rank' ? null : h('span', { class: 'gb-rank' }, items.find(x => x.id === 'rank')!.v.title),
    left != null ? h('span', { class: 'gb-left' }, left > 0 ? `${left} yr` : 'last year') : null));
  if (fresh.length) {
    bar.append(h('span', { class: 'gb-stamp', 'aria-hidden': 'true' }, 'Done'));
    sfx('great');
  }
  void $;
}
