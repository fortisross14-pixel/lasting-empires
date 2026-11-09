// SVG map with pan, pinch-zoom and tap-to-select.
import type { GameState } from '../types';
import { getGeo } from '../engine/map';
import { MAP_W, MAP_H } from '../data/geo';
import { atWar, provsOf } from '../engine/core';
import { MISSION_INFO } from '../engine/missions';
import { icon } from './icons';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

export class MapView {
  svg: SVGSVGElement;
  vb = { x: 0, y: 0, w: MAP_W, h: MAP_H };
  cells: Record<string, SVGPathElement> = {};
  labels: Record<string, SVGTextElement> = {};
  marks: SVGGElement;
  selected: string | null = null;
  onSelect: (id: string | null) => void = () => {};
  private pointers = new Map<number, { x: number; y: number }>();
  private moved = 0;
  private pinchStart: { d: number; vb: { x: number; y: number; w: number; h: number }; cx: number; cy: number } | null = null;

  constructor(host: HTMLElement) {
    const g = getGeo();
    this.svg = svgEl('svg', { id: 'map', viewBox: `0 0 ${MAP_W} ${MAP_H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Map of the western Mediterranean' }) as SVGSVGElement;
    const defs = svgEl('defs');
    for (const [id, d] of Object.entries(g.landPaths)) {
      const cp = svgEl('clipPath', { id: 'clip-' + id });
      cp.append(svgEl('path', { d }));
      defs.append(cp);
    }
    this.svg.append(defs);
    this.svg.append(svgEl('rect', { x: -2000, y: -2000, width: MAP_W + 4000, height: MAP_H + 4000, class: 'sea' }));
    // portolan rhumb lines from two compass roses
    const rh = svgEl('g', { class: 'rhumbs' });
    for (const [cx, cy] of [[585, 330], [905, 420]]) {
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        rh.append(svgEl('line', { x1: cx, y1: cy, x2: cx + Math.cos(a) * 1600, y2: cy + Math.sin(a) * 1600, class: i % 4 === 0 ? 'major' : '' }));
      }
      rh.append(svgEl('circle', { cx, cy, r: 26, class: 'rose' }));
      const star = svgEl('path', { d: `M${cx} ${cy - 30} L${cx + 6} ${cy} L${cx} ${cy + 30} L${cx - 6} ${cy} Z M${cx - 30} ${cy} L${cx} ${cy - 6} L${cx + 30} ${cy} L${cx} ${cy + 6} Z`, class: 'rose-star' });
      rh.append(star);
    }
    this.svg.append(rh);
    // land shadow
    for (const d of Object.values(g.landPaths)) this.svg.append(svgEl('path', { d, class: 'land-shadow' }));
    // provinces
    const byLand: Record<string, string[]> = {};
    for (const [id, l] of Object.entries(g.land)) (byLand[l] ??= []).push(id);
    for (const [lid, ids] of Object.entries(byLand)) {
      const grp = svgEl('g', { 'clip-path': `url(#clip-${lid})` });
      for (const id of ids) {
        const p = svgEl('path', { d: g.cells[id], class: 'prov', 'data-id': id }) as SVGPathElement;
        this.cells[id] = p;
        grp.append(p);
      }
      this.svg.append(grp);
    }
    for (const d of Object.values(g.landPaths)) this.svg.append(svgEl('path', { d, class: 'coast' }));
    const lab = svgEl('g', { class: 'labels' });
    for (const [id, [x, y]] of Object.entries(g.center)) {
      const t = svgEl('text', { x, y: y + 3, class: 'plabel' }) as SVGTextElement;
      this.labels[id] = t;
      lab.append(t);
    }
    this.svg.append(lab);
    this.marks = svgEl('g', { class: 'marks' }) as SVGGElement;
    this.svg.append(this.marks);
    host.append(this.svg);
    this.bind();
  }

  private toMap(clientX: number, clientY: number) {
    const r = this.svg.getBoundingClientRect();
    const scale = Math.max(this.vb.w / r.width, this.vb.h / r.height);
    const ox = (r.width * scale - this.vb.w) / 2, oy = (r.height * scale - this.vb.h) / 2;
    return { x: this.vb.x - ox + (clientX - r.left) * scale, y: this.vb.y - oy + (clientY - r.top) * scale, scale };
  }

  private apply() {
    const { x, y, w, h } = this.vb;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    const r = this.svg.getBoundingClientRect();
    const pxPerUnit = r.width ? Math.min(r.width / w, r.height / h) : 1;
    this.svg.classList.toggle('zoom-far', pxPerUnit < 0.42);
    this.svg.classList.toggle('zoom-mid', pxPerUnit < 0.8);
    this.svg.style.setProperty('--k', String(1 / pxPerUnit));
  }

  private clampVb() {
    const v = this.vb;
    v.w = Math.min(Math.max(v.w, 180), MAP_W * 1.1);
    v.h = v.w * (MAP_H / MAP_W);
    v.x = Math.min(Math.max(v.x, -v.w * 0.3), MAP_W - v.w * 0.7);
    v.y = Math.min(Math.max(v.y, -v.h * 0.3), MAP_H - v.h * 0.7);
  }

  zoomBy(f: number, cx?: number, cy?: number) {
    const v = this.vb;
    const px = cx ?? v.x + v.w / 2, py = cy ?? v.y + v.h / 2;
    const nw = v.w * f;
    v.x = px - (px - v.x) * (nw / v.w); v.y = py - (py - v.y) * (nw / v.w);
    v.w = nw;
    this.clampVb(); this.apply();
  }

  focus(ids: string[], pad = 60) {
    const g = getGeo();
    if (!ids.length) return;
    const xs = ids.map(id => g.center[id][0]), ys = ids.map(id => g.center[id][1]);
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    const r = this.svg.getBoundingClientRect();
    const aspect = r.width && r.height ? r.width / r.height : MAP_W / MAP_H;
    let w = Math.max(x1 - x0, (y1 - y0) * aspect, 260);
    this.vb = { x: (x0 + x1) / 2 - w / 2, y: 0, w, h: 0 };
    this.vb.h = w * (MAP_H / MAP_W);
    this.vb.y = (y0 + y1) / 2 - this.vb.h / 2;
    this.clampVb(); this.apply();
  }

  private bind() {
    const svg = this.svg;
    svg.addEventListener('pointerdown', e => {
      svg.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.moved = 0;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const c = this.toMap((a.x + b.x) / 2, (a.y + b.y) / 2);
        this.pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), vb: { ...this.vb }, cx: c.x, cy: c.y };
      }
    });
    svg.addEventListener('pointermove', e => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      this.pointers.set(e.pointerId, cur);
      if (this.pointers.size === 1) {
        const { scale } = this.toMap(0, 0);
        const dx = cur.x - prev.x, dy = cur.y - prev.y;
        this.moved += Math.abs(dx) + Math.abs(dy);
        if (this.moved > 6) { this.vb.x -= dx * scale; this.vb.y -= dy * scale; this.clampVb(); this.apply(); }
      } else if (this.pointers.size === 2 && this.pinchStart) {
        this.moved = 99;
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const f = this.pinchStart.d / Math.max(20, d);
        const st = this.pinchStart;
        const nw = st.vb.w * f;
        this.vb = { x: st.cx - (st.cx - st.vb.x) * (nw / st.vb.w), y: st.cy - (st.cy - st.vb.y) * (nw / st.vb.w), w: nw, h: 0 };
        this.clampVb(); this.apply();
      }
    });
    const up = (e: PointerEvent) => {
      const was = this.pointers.size;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinchStart = null;
      if (was === 1 && this.moved <= 6 && e.type === 'pointerup') {
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const target = hit?.closest?.('[data-id]') as SVGElement | null;
        const id = target?.getAttribute('data-id') ?? null;
        this.select(id);
        this.onSelect(id);
      }
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const c = this.toMap(e.clientX, e.clientY);
      this.zoomBy(e.deltaY > 0 ? 1.12 : 0.89, c.x, c.y);
    }, { passive: false });
    window.addEventListener('resize', () => this.apply());
  }

  select(id: string | null) {
    if (this.selected) this.cells[this.selected]?.classList.remove('selected');
    this.selected = id;
    if (id) {
      const c = this.cells[id];
      c?.classList.add('selected');
      c?.parentNode?.appendChild(c); // bring to front so the outline shows
    }
  }

  render(s: GameState) {
    const g = getGeo();
    for (const [id, p] of Object.entries(s.provinces)) {
      const c = this.cells[id];
      const nat = s.nations[p.owner];
      c.style.fill = nat?.color ?? '#777';
      c.classList.toggle('mine', p.owner === s.player);
      c.classList.toggle('enemy', p.owner !== s.player && atWar(s, s.player, p.owner));
      c.classList.toggle('unrest', p.owner === s.player && p.control < 30);
      const lbl = this.labels[id];
      lbl.textContent = p.name;
      lbl.classList.toggle('cap', nat?.capital === id);
    }
    // mission markers and capitals
    while (this.marks.firstChild) this.marks.removeChild(this.marks.firstChild);
    for (const n of Object.values(s.nations)) {
      if (!n.alive || !s.provinces[n.capital] || s.provinces[n.capital].owner !== n.id) continue;
      const [x, y] = g.center[n.capital];
      this.marks.append(svgEl('path', { d: `M${x} ${y - 21} l2.4 4.8 5.2 .7 -3.8 3.6 .9 5.2 -4.7 -2.5 -4.7 2.5 .9 -5.2 -3.8 -3.6 5.2 -.7 Z`, class: 'capmark' + (n.id === s.player ? ' mine' : '') }));
    }
    const counts: Record<string, number> = {};
    for (const m of s.missions) {
      const prov = s.provinces[m.target] ? m.target : DIPLO_TARGET(s, m.target);
      if (!prov || !g.center[prov]) continue;
      const k = counts[prov] = (counts[prov] ?? 0) + 1;
      const [x, y] = g.center[prov];
      const gEl = svgEl('g', { class: 'mmark k-' + MISSION_INFO[m.kind].role, transform: `translate(${x + 12 + (k - 1) * 20} ${y - 18})` });
      gEl.append(svgEl('circle', { r: 10 }));
      const fo = svgEl('foreignObject', { x: -7, y: -7, width: 14, height: 14 });
      const div = document.createElement('div');
      div.innerHTML = icon(MISSION_INFO[m.kind].icon, 14);
      fo.append(div);
      gEl.append(fo);
      const t = svgEl('text', { x: 9, y: 12, class: 'mturns' });
      t.textContent = String(m.turnsLeft);
      gEl.append(t);
      this.marks.append(gEl);
    }
    this.apply();
    void provsOf;
  }
}

function DIPLO_TARGET(s: GameState, target: string): string | null {
  const n = s.nations[target];
  if (n) return s.provinces[n.capital]?.owner === n.id ? n.capital : Object.values(s.provinces).find(p => p.owner === n.id)?.id ?? null;
  if (target === '' || !n) return s.provinces[s.nations[s.player].capital] ? s.nations[s.player].capital : null;
  return null;
}
