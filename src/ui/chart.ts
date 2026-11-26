// Line charts for the Chronicle, in the game's own manner: fine lines in each realm's colour on the page, a quiet
// grid, the realm's name at the end of its line (four or fewer) and a legend above, and a reading of every line at
// the year under the pointer. One measure per chart, so one axis.
import { h } from './dom';

export interface Series { id: string; name: string; color: string; points: { y: number; v: number }[]; strong?: boolean; }
export interface ChartOpts { height?: number; invert?: boolean; fmt?: (v: number) => string; label: string; }

const NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, attrs: Record<string, string | number>) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };
/** A rounded step for the grid: 1, 2 or 5 times a power of ten. */
function niceStep(range: number, ticks: number) {
  const raw = range / Math.max(1, ticks), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

export function lineChart(series: Series[], o: ChartOpts): HTMLElement {
  const W = 720, H = o.height ?? 240, L = 46, R = series.length <= 4 ? 110 : 16, T = 12, B = 26;
  const fmt = o.fmt ?? ((v: number) => String(Math.round(v)));
  const pts = series.flatMap(s => s.points);
  const box = h('figure', { class: 'chart' }, h('figcaption', { class: 'ch-title' }, o.label));
  if (pts.length < 2) { box.append(h('p', { class: 'muted small' }, 'Not enough years recorded yet: the chart fills in as the years pass.')); return box; }
  const y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
  let v0 = Math.min(0, ...pts.map(p => p.v)), v1 = Math.max(...pts.map(p => p.v));
  if (o.invert) { v0 = 1; v1 = Math.max(2, v1); }
  if (v1 === v0) v1 = v0 + 1;
  const step = niceStep(v1 - v0, 4);
  v1 = Math.ceil(v1 / step) * step;
  const x = (y: number) => L + ((y - y0) / Math.max(1, y1 - y0)) * (W - L - R);
  const yv = (v: number) => (o.invert ? T + ((v - v0) / (v1 - v0)) * (H - T - B) : H - B - ((v - v0) / (v1 - v0)) * (H - T - B));
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ch-svg', role: 'img', 'aria-label': `${o.label}: ${series.map(s => s.name).join(', ')}` });
  // the grid and its values
  for (let v = o.invert ? 1 : v0; v <= v1 + 1e-9; v += o.invert ? Math.max(1, step) : step) {
    svg.append(el('line', { x1: L, x2: W - R, y1: yv(v), y2: yv(v), class: 'ch-grid' }));
    const t = el('text', { x: L - 6, y: yv(v) + 4, class: 'ch-tick', 'text-anchor': 'end' }); t.textContent = fmt(v); svg.append(t);
  }
  const yStep = Math.max(1, Math.round(niceStep(y1 - y0, 6)));
  for (let y = Math.ceil(y0 / yStep) * yStep; y <= y1; y += yStep) { const t = el('text', { x: x(y), y: H - 8, class: 'ch-tick', 'text-anchor': 'middle' }); t.textContent = String(y); svg.append(t); }
  // the lines, the player's drawn stronger; names at the ends when there are few
  const ends: { y: number; s: Series }[] = [];
  for (const s of series) {
    if (!s.points.length) continue;
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.y).toFixed(1)},${yv(p.v).toFixed(1)}`).join('');
    svg.append(el('path', { d, class: 'ch-line' + (s.strong ? ' strong' : ''), stroke: s.color }));
    const last = s.points[s.points.length - 1];
    if (s.points.length === 1) svg.append(el('circle', { cx: x(last.y), cy: yv(last.v), r: 4, fill: s.color, class: 'ch-dot' }));
    ends.push({ y: yv(last.v), s });
  }
  if (series.length <= 4) {
    // nudge the end labels apart
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    for (const e of ends) { const t = el('text', { x: W - R + 6, y: e.y + 4, class: 'ch-end' + (e.s.strong ? ' strong' : '') }); t.textContent = e.s.name; svg.append(t); }
  }
  // the reading under the pointer
  const cross = el('line', { y1: T, y2: H - B, class: 'ch-cross', visibility: 'hidden' });
  svg.append(cross);
  const tip = h('div', { class: 'ch-tip', hidden: true });
  const years = [...new Set(pts.map(p => p.y))].sort((a, b) => a - b);
  const show = (cx: number) => {
    const yr = years.reduce((a, b) => (Math.abs(x(b) - cx) < Math.abs(x(a) - cx) ? b : a));
    cross.setAttribute('x1', String(x(yr))); cross.setAttribute('x2', String(x(yr))); cross.setAttribute('visibility', 'visible');
    // each line's reading nearest that year (the world is counted every ten years, the realm every year)
    const near = (sr: Series) => sr.points.reduce<{ y: number; v: number } | undefined>((a, p) => (Math.abs(p.y - yr) <= 5 && (!a || Math.abs(p.y - yr) < Math.abs(a.y - yr)) ? p : a), undefined);
    const rows = series.map(s => ({ s, p: near(s) })).filter(r => r.p).sort((a, b) => (o.invert ? a.p!.v - b.p!.v : b.p!.v - a.p!.v));
    tip.replaceChildren(h('b', {}, String(yr)), ...rows.map(r => h('span', { class: 'ch-tr' }, h('i', { style: `background:${r.s.color}` }), r.s.name, h('em', {}, fmt(r.p!.v) + (r.p!.y !== yr ? ` (${r.p!.y})` : '')))));
    tip.hidden = false;
    tip.style.left = `${(x(yr) / W) * 100}%`;
    tip.classList.toggle('left', x(yr) > W / 2);
  };
  svg.addEventListener('pointermove', e => { const r = svg.getBoundingClientRect(); show(((e.clientX - r.left) / r.width) * W); });
  svg.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; });
  const legend = series.length >= 2 ? h('div', { class: 'ch-legend' }, series.map(s => h('span', { class: 'ch-lg' + (s.strong ? ' strong' : '') }, h('i', { style: `background:${s.color}` }), s.name))) : null;
  box.append(legend ?? '', h('div', { class: 'ch-wrap' }, svg, tip));
  return box;
}

/** Horizontal bars for a count by kind (the army's companies by type). */
export function barList(rows: { name: string; n: number }[], max = Math.max(1, ...rows.map(r => r.n))): HTMLElement {
  return h('div', { class: 'bars' }, rows.map(r => h('div', { class: 'bar-r' }, h('span', { class: 'bar-n' }, r.name), h('span', { class: 'bar-t' }, h('i', { style: `width:${(r.n / max) * 100}%` })), h('b', {}, String(r.n)))));
}
