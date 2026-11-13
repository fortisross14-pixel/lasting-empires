// SVG map with pan, pinch-zoom and tap-to-select.
import type { GameState } from '../types';
import { getGeo } from '../engine/map';
import { atWar, provsOf, population } from '../engine/core';
import { provKnown } from '../engine/overseas';
import { happinessOf } from '../engine/society';
import { NO_STATE } from '../data/nations';

export type MapMode = 'political' | 'culture' | 'religion' | 'goods' | 'happiness' | 'population';
export const MAP_MODES: { id: MapMode; name: string; icon: string }[] = [
  { id: 'political', name: 'Realms', icon: 'crown' }, { id: 'culture', name: 'Culture', icon: 'scroll' },
  { id: 'religion', name: 'Religion', icon: 'church' }, { id: 'goods', name: 'Raw materials', icon: 'anvil' },
  { id: 'happiness', name: 'Happiness', icon: 'mood' }, { id: 'population', name: 'Population', icon: 'people' },
];
export const RELIGION_COLORS: Record<string, string> = {
  catholic: '#d9c27a', protestant: '#5b8fc9', orthodox: '#9a6ac0', coptic: '#b07a4a', muslim: '#3f9a5a', hindu: '#e08a3a',
  buddhist: '#e0c040', confucian: '#c05050', shinto: '#e06a8a', animist: '#8a7a5a', nahuatl: '#3aa0a0', inti: '#e0a020',
};
const hue = (k: string) => { let x = 7; for (const c of k) x = (x * 31 + c.charCodeAt(0)) % 997; return `hsl(${(x * 47) % 360} 42% ${48 + (x % 3) * 8}%)`; };
const ramp = (t: number) => `hsl(${Math.round(4 + t * 116)} 55% ${44 + Math.round(t * 6)}%)`; // red → green
import { MISSION_INFO } from '../engine/missions';
import { icon, iconPath } from './icons';
import { GOODS, RAW } from '../data/goods';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

/** A pale watercolour wash of a realm's colour: mixed toward the paper, so the map reads like an engraved chart. */
const WASH: Record<string, string> = {};
function wash(hex: string, k: number): string {
  const key = hex + k;
  if (WASH[key]) return WASH[key];
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16), paper = [0xf6, 0xf1, 0xe6];
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (paper[i] - v) * k));
  return (WASH[key] = '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''));
}

/** The coastline to ink. Skips edges that are not real coast: flat edges where the map data is cut off at the top,
 *  and long closing jumps of outlines that were cut there. Filling still uses the full outline. */
function coastLine(d: string): string {
  let px = 0, py = 0, sx = 0, sy = 0;
  const flatTop = (x: number, y: number) => y < 210 && Math.abs(x - px) > 20 && Math.abs(y - py) < (y < 20 ? 3 : 0.6);
  return d.replace(/([MLZ])(?:(-?[\d.]+),(-?[\d.]+))?/g, (m, c: string, xs?: string, ys?: string) => {
    if (c === 'Z') { const far = Math.hypot(sx - px, sy - py) > 100; px = sx; py = sy; return far ? '' : `L${sx},${sy}`; } // explicit: a Z would close to our inserted M
    const x = +xs!, y = +ys!;
    if (c === 'M') { sx = px = x; sy = py = y; return m; }
    const cut = flatTop(x, y) || Math.hypot(x - px, y - py) > 400;
    px = x; py = y;
    return cut ? `M${xs},${ys}` : m;
  });
}

export class MapView {
  svg: SVGSVGElement;
  W: number; H: number;
  vb = { x: 0, y: 0, w: 1, h: 1 };
  mode: MapMode = 'political';
  revealAll = false;
  picked: string | null = null; // the realm picker shows the whole world
  realm: string | null = null; // a realm whose lands are outlined (its sheet is open)
  private size: Record<string, number> = {};
  private lastPx = 0;
  cells: Record<string, SVGPathElement> = {};
  labels: Record<string, SVGTextElement> = {};
  marks: SVGGElement;
  gicons: Record<string, SVGGElement> = {};
  private settleT = 0;
  private settledW = 0;
  private rect: DOMRect | null = null;
  private shown = new Map<string, boolean>();
  private paint = new Map<string, string>();
  selected: string | null = null;
  onSelect: (id: string | null) => void = () => {};
  /** target picking: hold (touch) or click (mouse) a province to choose it */
  pickMode = false;
  targets = new Set<string>();
  onPick: (id: string) => void = () => {};
  private holdTimer = 0;
  private held = false;
  private pointers = new Map<number, { x: number; y: number }>();
  private moved = 0;
  private pinchStart: { d: number; vb: { x: number; y: number; w: number; h: number }; cx: number; cy: number } | null = null;

  constructor(host: HTMLElement) {
    const g = getGeo();
    this.W = g.W; this.H = g.H;
    this.vb = { x: 0, y: 0, w: g.W, h: g.H };
    this.svg = svgEl('svg', { id: 'map', viewBox: `0 0 ${g.W} ${g.H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Map of the world' }) as SVGSVGElement;
    const defs = svgEl('defs');
    for (const [id, d] of Object.entries(g.landPaths)) {
      const cp = svgEl('clipPath', { id: 'clip-' + id });
      cp.append(svgEl('path', { d, 'clip-rule': 'evenodd' }));
      defs.append(cp);
    }
    this.svg.append(defs);
    this.svg.append(svgEl('rect', { x: -4000, y: -4000, width: g.W + 8000, height: g.H + 8000, class: 'sea' }));
    // portolan rhumb lines from two compass roses
    const rh = svgEl('g', { class: 'rhumbs' });
    for (const [cx, cy] of [[1520, 610], [2560, 1010], [800, 900]]) {
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        rh.append(svgEl('line', { x1: cx, y1: cy, x2: cx + Math.cos(a) * 2600, y2: cy + Math.sin(a) * 2600, class: i % 4 === 0 ? 'major' : '' }));
      }
      rh.append(svgEl('circle', { cx, cy, r: 26, class: 'rose' }));
      const star = svgEl('path', { d: `M${cx} ${cy - 30} L${cx + 6} ${cy} L${cx} ${cy + 30} L${cx - 6} ${cy} Z M${cx - 30} ${cy} L${cx} ${cy - 6} L${cx + 30} ${cy} L${cx} ${cy + 6} Z`, class: 'rose-star' });
      rh.append(star);
    }
    this.svg.append(rh);
    // land shadow
    for (const d of Object.values(g.landPaths)) this.svg.append(svgEl('path', { d, class: 'land-shadow', 'fill-rule': 'evenodd' }));
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
    for (const d of Object.values(g.landPaths)) this.svg.append(svgEl('path', { d: coastLine(d), class: 'coast', 'fill-rule': 'evenodd' }));
    const lab = svgEl('g', { class: 'labels' });
    for (const [id, [x, y]] of Object.entries(g.center)) {
      const t = svgEl('text', { x, y: y + 3, class: 'plabel' }) as SVGTextElement;
      this.labels[id] = t;
      // rough on-map size of the province, used to show labels only where they fit
      const nums = (g.cells[id].match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
      this.size[id] = Math.min(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.6, 160);
      lab.append(t);
    }
    this.svg.append(lab);
    // raw-material icons, shown on the goods map
    for (const g of Object.values(GOODS)) {
      const sym = svgEl('symbol', { id: 'gi-' + g.id, viewBox: '0 0 24 24' });
      sym.append(svgEl('path', { d: iconPath(g.icon), fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      defs.append(sym);
    }
    const gl = svgEl('g', { class: 'goods-icons' });
    for (const [id, [x, y]] of Object.entries(g.center)) {
      const r = Math.max(4, Math.min(6.5, this.size[id] * 0.12));
      const grp = svgEl('g', { class: 'gi', transform: `translate(${x} ${y})` });
      grp.append(svgEl('circle', { r, class: 'gi-bg' }), svgEl('use', { href: '#gi-grain', x: -r * 0.72, y: -r * 0.72, width: r * 1.44, height: r * 1.44, class: 'gi-ic' }));
      this.gicons[id] = grp as SVGGElement;
      gl.append(grp);
    }
    this.svg.append(gl);
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

  /** Move the view now; labels, icons and markers catch up once the view stops changing. */
  private apply(now = false) {
    const { x, y, w, h } = this.vb;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    const zooming = Math.abs(w - this.settledW) / (this.settledW || 1) > 0.01;
    if (zooming) this.svg.classList.add('moving');
    clearTimeout(this.settleT);
    if (now) this.settle(); else this.settleT = window.setTimeout(() => this.settle(), 140);
  }

  /** Once the view rests: label sizes, which labels fit, what is on screen, marker sizes. */
  private settle() {
    const { x, y, w, h } = this.vb;
    this.svg.classList.remove('moving');
    this.settledW = w;
    const r = this.rect ??= this.svg.getBoundingClientRect();
    const pxPerUnit = r.width ? Math.min(r.width / w, r.height / h) : 1;
    this.svg.classList.toggle('zoom-far', pxPerUnit < 0.9);
    this.svg.classList.toggle('zoom-mid', pxPerUnit < 2);
    this.svg.style.setProperty('--k', String(1 / pxPerUnit));
    const sc = (0.62 / pxPerUnit).toFixed(4);
    for (const pin of Array.from(this.marks.querySelectorAll<SVGGElement>('[data-x]'))) pin.setAttribute('transform', `translate(${pin.dataset.x} ${pin.dataset.y}) scale(${sc})`);
    // only what is on screen (with a margin) is drawn
    const g = getGeo();
    const mx = w * 0.15, my = h * 0.15;
    const far = pxPerUnit < 0.9;
    const goods = this.mode === 'goods';
    for (const [id, [cx, cy]] of Object.entries(g.center)) {
      const on = cx > x - mx && cx < x + w + mx && cy > y - my && cy < y + h + my;
      const t = this.labels[id];
      const fits = on && !far && this.size[id] * pxPerUnit > 58 + (t.textContent?.length ?? 6) * 3;
      if (this.shown.get(id) !== fits) { this.shown.set(id, fits); t.classList.toggle('fits', fits); t.classList.toggle('off', !fits); }
      const gi = this.gicons[id];
      if (gi && goods) gi.classList.toggle('off', !on);
    }
    this.lastPx = pxPerUnit;
  }

  private clampVb() {
    const v = this.vb;
    v.w = Math.min(Math.max(v.w, 60), this.W * 1.05);
    v.h = v.w * (this.H / this.W);
    v.x = Math.min(Math.max(v.x, -v.w * 0.3), this.W - v.w * 0.7);
    v.y = Math.min(Math.max(v.y, -v.h * 0.3), this.H - v.h * 0.7);
  }

  zoomBy(f: number, cx?: number, cy?: number) {
    const v = this.vb;
    const px = cx ?? v.x + v.w / 2, py = cy ?? v.y + v.h / 2;
    const nw = v.w * f;
    v.x = px - (px - v.x) * (nw / v.w); v.y = py - (py - v.y) * (nw / v.w);
    v.w = nw;
    this.clampVb(); this.apply();
  }

  focus(ids: string[], pad = 30) {
    const g = getGeo();
    if (!ids.length) return;
    const xs = ids.map(id => g.center[id][0]), ys = ids.map(id => g.center[id][1]);
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    const r = this.svg.getBoundingClientRect();
    const aspect = r.width && r.height ? r.width / r.height : this.W / this.H;
    const w = Math.max(x1 - x0, (y1 - y0) * aspect, 120);
    this.vb = { x: (x0 + x1) / 2 - w / 2, y: 0, w, h: 0 };
    this.vb.h = w * (this.H / this.W);
    this.vb.y = (y0 + y1) / 2 - this.vb.h / 2;
    this.clampVb(); this.apply();
  }

  /** Slide the map so a province is not hidden under a panel that covers the bottom `cover` pixels. */
  reveal(id: string, cover: number) {
    const c = getGeo().center[id];
    const r = this.svg.getBoundingClientRect();
    const m = this.svg.getScreenCTM();
    if (!c || !m || !r.height) return;
    const y = m.b * c[0] + m.d * c[1] + m.f - r.top; // where it sits on screen now
    const visible = r.height - cover;
    if (visible < 60 || y < visible - 24) return;
    this.vb.y += (y - visible / 2) / m.d; // screen pixels back to map units
    this.clampVb(); this.apply();
  }

  private bind() {
    const svg = this.svg;
    svg.addEventListener('pointerdown', e => {
      svg.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.moved = 0;
      this.held = false;
      clearTimeout(this.holdTimer);
      if (this.pickMode && e.pointerType === 'touch' && this.pointers.size === 1) {
        const x = e.clientX, y = e.clientY;
        this.holdTimer = window.setTimeout(() => {
          if (this.moved > 6 || this.pointers.size !== 1) return;
          const id = this.idAt(x, y);
          if (id) { this.held = true; navigator.vibrate?.(30); this.onPick(id); }
        }, 450);
      }
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
        if (this.moved > 6) clearTimeout(this.holdTimer);
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
      clearTimeout(this.holdTimer);
      if (this.held) { this.held = false; return; }
      if (was === 1 && this.moved <= 6 && e.type === 'pointerup') {
        const id = this.idAt(e.clientX, e.clientY);
        if (this.pickMode && e.pointerType !== 'touch') { if (id) this.onPick(id); return; }
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
    window.addEventListener('resize', () => { this.rect = null; this.apply(true); });
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

  /** Diagonal stripes of the occupier's and the old owner's colours, for land taken in a war not yet ended. */
  private stripes(a: string, b: string, key: string): string {
    const id = 'occ_' + key.replace(/[^a-z0-9_]/gi, '');
    if (!this.svg.querySelector('#' + id)) {
      const pat = svgEl('pattern', { id, patternUnits: 'userSpaceOnUse', width: 6, height: 6, patternTransform: 'rotate(45)' });
      pat.append(svgEl('rect', { width: 6, height: 6, fill: b }), svgEl('rect', { width: 3, height: 6, fill: a }));
      this.svg.querySelector('defs')!.append(pat);
    }
    return id;
  }

  private idAt(x: number, y: number): string | null {
    const hit = document.elementFromPoint(x, y);
    const target = hit?.closest?.('[data-id]') as SVGElement | null;
    return target?.getAttribute('data-id') ?? null;
  }

  setPick(on: boolean, targets: Iterable<string> = []) {
    this.pickMode = on;
    this.targets = new Set(on ? targets : []);
    this.svg.classList.toggle('picking', on);
    for (const [id, c] of Object.entries(this.cells)) c.classList.toggle('target', this.targets.has(id));
  }

  setMode(mode: MapMode, s: GameState) { this.mode = mode; this.svg.dataset.mode = mode; this.render(s); }

  private fill(s: GameState, p: GameState['provinces'][string], maxPop: number): string | null {
    switch (this.mode) {
      case 'culture': return hue(p.culture);
      case 'religion': return RELIGION_COLORS[p.religion] ?? hue(p.religion);
      case 'goods': return GOODS[p.good]?.color ?? hue(p.good);
      case 'happiness': return p.owner === s.player || s.nations[p.owner]?.overlord === s.player ? ramp(happinessOf(s, p).value / 100) : '#8a8478';
      case 'population': return popShade(Math.sqrt(population(s, p) / maxPop));
      default: return null;
    }
  }

  render(s: GameState) {
    const g = getGeo();
    let maxPop = 1;
    if (this.mode === 'population') for (const p of Object.values(s.provinces)) maxPop = Math.max(maxPop, population(s, p));
    for (const [id, p] of Object.entries(s.provinces)) {
      const c = this.cells[id];
      const nat = s.nations[p.owner];
      const known = this.revealAll || provKnown(s, id);
      const lbl = this.labels[id];
      const occ = this.mode === 'political' && p.occupiedFrom && s.nations[p.occupiedFrom]?.alive && atWar(s, p.owner, p.occupiedFrom);
      // skip provinces whose look has not changed since the last draw
      const key = `${known ? 1 : 0}|${p.owner}|${p.name}|${occ ? p.occupiedFrom : ''}|${this.mode}|${this.picked}|${this.realm}|${this.revealAll ? 1 : 0}|${p.control < 30 ? 1 : 0}|${this.mode === 'political' ? '' : this.fill(s, p, maxPop)}|${nat?.overlord === s.player ? 1 : 0}|${nat?.capital === id ? 1 : 0}|${p.owner !== s.player && atWar(s, s.player, p.owner) ? 1 : 0}|${p.good}|${nat?.color}`;
      if (this.paint.get(id) === key) continue;
      this.paint.set(id, key);
      c.classList.toggle('fog', !known);
      if (lbl.textContent !== (known ? p.name : '')) { lbl.textContent = known ? p.name : ''; this.shown.delete(id); }
      const gi = this.gicons[id];
      if (gi) {
        gi.style.display = known && GOODS[p.good] ? '' : 'none';
        if (known && GOODS[p.good]) { const u = gi.lastChild as SVGUseElement; if (u.getAttribute('href') !== '#gi-' + p.good) u.setAttribute('href', '#gi-' + p.good); (gi.firstChild as SVGCircleElement).style.fill = GOODS[p.good].color; }
      }
      if (!known) { c.style.fill = ''; for (const k of ['mine', 'subject', 'enemy', 'unrest', 'native']) c.classList.remove(k); continue; }
      const occupied = this.mode === 'political' && p.occupiedFrom && s.nations[p.occupiedFrom]?.alive && atWar(s, p.owner, p.occupiedFrom);
      c.style.fill = occupied ? `url(#${this.stripes(nat?.color ?? '#777', s.nations[p.occupiedFrom!].color, p.owner + '_' + p.occupiedFrom)})` : this.fill(s, p, maxPop) ?? wash(nat?.color ?? '#777', p.owner === s.player || p.owner === this.picked ? 0.12 : 0.42);
      const pol = this.mode === 'political';
      c.classList.toggle('native', p.owner === NO_STATE && pol);
      c.classList.toggle('mine', !this.revealAll && p.owner === s.player);
      c.classList.toggle('picked', (this.revealAll && p.owner === this.picked) || (!!this.realm && p.owner === this.realm));
      c.classList.toggle('subject', pol && nat?.overlord === s.player);
      c.classList.toggle('enemy', pol && p.owner !== s.player && atWar(s, s.player, p.owner));
      c.classList.toggle('unrest', pol && p.owner === s.player && p.control < 30);
      lbl.classList.toggle('cap', nat?.capital === id);
    }
    // mission markers and capitals
    while (this.marks.firstChild) this.marks.removeChild(this.marks.firstChild);
    for (const n of Object.values(s.nations)) {
      if (!n.alive || !s.provinces[n.capital] || s.provinces[n.capital].owner !== n.id || !(this.revealAll || provKnown(s, n.capital))) continue;
      const [x, y] = g.center[n.capital];
      const pin = svgEl('g', { 'data-x': x, 'data-y': y });
      pin.append(svgEl('path', { d: `M0 -21 l2.4 4.8 5.2 .7 -3.8 3.6 .9 5.2 -4.7 -2.5 -4.7 2.5 .9 -5.2 -3.8 -3.6 5.2 -.7 Z`, class: 'capmark' + (n.id === s.player && !this.revealAll ? ' mine' : '') }));
      this.marks.append(pin);
    }
    // your settlements: a small house, bigger for towns and cities, so you can spread them out
    for (const p of Object.values(s.provinces)) {
      if (p.owner !== s.player || !p.settlement || s.nations[s.player].capital === p.id || !g.center[p.id]) continue;
      const [x, y] = g.center[p.id];
      const k = [0, 0.7, 0.9, 1.1, 1.3][p.settlement] ?? 1;
      const pin = svgEl('g', { 'data-x': x, 'data-y': y, class: 'settle s' + p.settlement });
      pin.append(svgEl('path', { d: `M${-6 * k} ${2 * k} V${-4 * k} L0 ${-10 * k} L${6 * k} ${-4 * k} V${2 * k} Z`, class: 'settle-ic' }));
      if (p.settlement >= 3) pin.append(svgEl('path', { d: `M${-2 * k} ${2 * k} V${-3 * k} H${2 * k} V${2 * k}`, class: 'settle-door' }));
      this.marks.append(pin);
    }
    // armies: yours always; others where your spies are watching
    const stacks: Record<string, { n: number; mine: boolean; color: string }> = {};
    const add = (loc: string | undefined, mine: boolean, color: string) => { if (!loc) return; const k = (mine ? 'm:' : 'e:') + loc; (stacks[k] ??= { n: 0, mine, color }).n++; };
    for (const t of s.troops) if (!t.moving && t.mission == null) add(t.loc, true, s.nations[s.player].color);
    for (const n of Object.values(s.nations)) if (n.alive && n.id !== s.player && (n.spiedUntil ?? 0) > s.year) for (const t of n.army) add(t.loc, false, n.color);
    for (const [k, st] of Object.entries(stacks)) {
      const loc = k.slice(2), prov = loc.replace('base:', '');
      if (!g.center[prov]) continue;
      const [x, y] = g.center[prov];
      const pin = svgEl('g', { 'data-x': x, 'data-y': y });
      const gEl = svgEl('g', { class: 'army' + (st.mine ? ' mine' : ' foe'), transform: `translate(${st.mine ? -16 : 16} 6)` });
      gEl.append(svgEl('rect', { x: -11, y: -9, width: 22, height: 18, rx: 2, style: `fill:${st.color}` }));
      const t = svgEl('text', { x: 0, y: 4, class: 'army-n' }); t.textContent = String(st.n);
      gEl.append(t);
      pin.append(gEl);
      this.marks.append(pin);
    }
    const counts: Record<string, number> = {};
    for (const m of s.missions) {
      const prov = s.provinces[m.target] ? m.target : DIPLO_TARGET(s, m.target);
      if (!prov || !g.center[prov]) continue;
      const k = counts[prov] = (counts[prov] ?? 0) + 1;
      const [x, y] = g.center[prov];
      const pin = svgEl('g', { 'data-x': x, 'data-y': y });
      const gEl = svgEl('g', { class: 'mmark k-' + MISSION_INFO[m.kind].role, transform: `translate(${12 + (k - 1) * 20} -18)` });
      pin.append(gEl);
      gEl.append(svgEl('circle', { r: 10 }));
      const fo = svgEl('foreignObject', { x: -7, y: -7, width: 14, height: 14 });
      const div = document.createElement('div');
      div.innerHTML = icon(MISSION_INFO[m.kind].icon, 14);
      fo.append(div);
      gEl.append(fo);
      const t = svgEl('text', { x: 9, y: 12, class: 'mturns' });
      t.textContent = String(m.turnsLeft);
      gEl.append(t);
      this.marks.append(pin);
    }
    this.apply(true);
    void provsOf;
  }
}

export interface LegendItem { color: string; label: string; icon?: string; }

/** What the current map mode shows, for the legend. */
export function legendFor(s: GameState, mode: MapMode): LegendItem[] {
  const count = (f: (p: GameState['provinces'][string]) => string) => {
    const c: Record<string, number> = {};
    for (const p of Object.values(s.provinces)) if (provKnown(s, p.id)) c[f(p)] = (c[f(p)] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  if (mode === 'religion') return count(p => p.religion).map(k => ({ color: RELIGION_COLORS[k] ?? hue(k), label: k }));
  if (mode === 'goods') return RAW.map(k => ({ color: GOODS[k].color, label: k, icon: GOODS[k].icon }));
  if (mode === 'happiness') return [{ color: ramp(0), label: 'angry' }, { color: ramp(0.5), label: 'restless' }, { color: ramp(1), label: 'joyful' }, { color: '#8a8478', label: 'not yours' }];
  if (mode === 'population') return [{ color: popShade(0.1), label: 'few' }, { color: popShade(0.5), label: '' }, { color: popShade(1), label: 'many' }];
  return [];
}
const popShade = (t: number) => `hsl(32 ${30 + t * 40}% ${86 - t * 52}%)`;

function DIPLO_TARGET(s: GameState, target: string): string | null {
  const n = s.nations[target];
  if (n) return s.provinces[n.capital]?.owner === n.id ? n.capital : Object.values(s.provinces).find(p => p.owner === n.id)?.id ?? null;
  if (target === '' || !n) return s.provinces[s.nations[s.player].capital] ? s.nations[s.player].capital : null;
  return null;
}
