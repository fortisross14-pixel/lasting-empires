// SVG map with pan, pinch-zoom and tap-to-select.
import { terrainOf } from '../data/terrain';
import type { GameState } from '../types';
import { getGeo } from '../engine/map';
import { atWar, provsOf, population, getRel, hasTreaty } from '../engine/core';
import { provKnown } from '../engine/overseas';
import { happinessOf } from '../engine/society';
import { NO_STATE } from '../data/nations';

export type MapMode = 'political' | 'relations' | 'culture' | 'religion' | 'goods' | 'happiness' | 'population';
export const MAP_MODES: { id: MapMode; name: string; icon: string }[] = [
  { id: 'political', name: 'Realms', icon: 'crown' }, { id: 'relations', name: 'Relations', icon: 'hands' }, { id: 'culture', name: 'Culture', icon: 'scroll' },
  { id: 'religion', name: 'Religion', icon: 'church' }, { id: 'goods', name: 'Raw materials', icon: 'anvil' },
  { id: 'happiness', name: 'Happiness', icon: 'mood' }, { id: 'population', name: 'Population', icon: 'people' },
];
export const RELIGION_COLORS: Record<string, string> = {
  catholic: '#d9c27a', protestant: '#5b8fc9', orthodox: '#9a6ac0', coptic: '#b07a4a', muslim: '#3f9a5a', hindu: '#e08a3a',
  buddhist: '#e0c040', confucian: '#c05050', shinto: '#e06a8a', animist: '#8a7a5a', nahuatl: '#3aa0a0', inti: '#e0a020',
};
/** How a realm stands towards the player, for the relations view: the same words the diplomacy screens use. */
export type Stance = 'mine' | 'subject' | 'ally' | 'friendly' | 'neutral' | 'hostile' | 'war' | 'none';
export const STANCE: Record<Stance, { name: string; color: string }> = {
  mine: { name: 'your realm', color: '#3f5f8f' }, subject: { name: 'your subject', color: '#8fa8cf' }, ally: { name: 'ally', color: '#2e6b34' },
  friendly: { name: 'friendly (30 or more)', color: '#9cc09a' }, neutral: { name: 'neutral', color: '#ddd5c0' },
  hostile: { name: 'hostile (−30 or less)', color: '#e0a070' }, war: { name: 'at war', color: '#b3261e' }, none: { name: 'no state', color: '#cfc6ad' },
};
export function stanceOf(s: GameState, n: string): Stance {
  if (n === s.player) return 'mine';
  if (n === NO_STATE || !s.nations[n]?.alive) return 'none';
  if (atWar(s, s.player, n)) return 'war';
  if (s.nations[n].overlord === s.player) return 'subject';
  if (hasTreaty(s, s.player, n, 'alliance')) return 'ally';
  const rel = getRel(s, s.player, n);
  return rel >= 30 ? 'friendly' : rel <= -30 ? 'hostile' : 'neutral';
}
const hue = (k: string) => { let x = 7; for (const c of k) x = (x * 31 + c.charCodeAt(0)) % 997; return `hsl(${(x * 47) % 360} 42% ${48 + (x % 3) * 8}%)`; };
const ramp = (t: number) => `hsl(${Math.round(4 + t * 116)} 55% ${44 + Math.round(t * 6)}%)`; // red → green
import { MISSION_INFO } from '../engine/missions';
import { icon, iconPath } from './icons';
import { GOODS, RAW } from '../data/goods';

/** Screen pixels per map unit below which the map shows realm names instead of province names. */
const REALM_VIEW = 1.3;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

/** A pale watercolour wash of a realm's colour: mixed toward the paper, so the map reads like an engraved chart. */
const WASH: Record<string, string> = {};
export function wash(hex: string, k: number): string {
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
/** How pale the player's own land is washed (0 the full colour, 1 paper): paler than it was, now that a band of
 *  the full colour runs along the inside of the border (others are at 0.42). */
const MINE_WASH = 0.3;
/** Map units one tile of paper grain covers, and the tile's size in pixels. */
const GRAIN_UNITS = 150, GRAIN_PX = 256;
/** A tile of paper grain: faint dark and light specks and a few fibres, the same every time. */
function grainTile(): string | null {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = GRAIN_PX;
    const x = c.getContext('2d');
    if (!x) return null;
    let seed = 7;
    const r = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const img = x.createImageData(GRAIN_PX, GRAIN_PX);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r(), dark = v < 0.5;
      img.data[i] = dark ? 60 : 255; img.data[i + 1] = dark ? 44 : 250; img.data[i + 2] = dark ? 28 : 235;
      img.data[i + 3] = Math.round(Math.abs(v - 0.5) ** 1.6 * 2 * 52);
    }
    x.putImageData(img, 0, 0);
    x.strokeStyle = 'rgba(70,52,34,.10)'; x.lineWidth = 0.7;
    for (let i = 0; i < 70; i++) { // fibres, drawn twice across the edge so the tile repeats without a seam
      const fx = r() * GRAIN_PX, fy = r() * GRAIN_PX, a = r() * Math.PI, len = 4 + r() * 12;
      for (const [ox, oy] of [[0, 0], [-GRAIN_PX, 0], [0, -GRAIN_PX]]) { x.beginPath(); x.moveTo(fx + ox, fy + oy); x.lineTo(fx + ox + Math.cos(a) * len, fy + oy + Math.sin(a) * len); x.stroke(); }
    }
    return c.toDataURL('image/png');
  } catch { return null; }
}
/** Ink marks for the ground, drawn in a 24-unit box. Only M, L and Q with every point written "x y", so a mark
 *  can be moved and sized by rewriting its numbers. */
const TERRAIN_MARKS: Record<string, string> = {
  forest: 'M7 3 L2.5 13 L11.5 13 L7 3 M7 13 L7 18 M17 8 L13.5 16 L20.5 16 L17 8 M17 16 L17 20',
  hills: 'M1 17 Q7 5 13 17 M10 17 Q16 8 23 17 M5 13 L6.5 16 M15.5 13.5 L17 16',
  mountains: 'M1 20 L9 4 L13.5 12 M11 20 L16.5 9 L23 20 M9 4 L10 11 L8 14 M16.5 9 L17.5 14',
  desert: 'M1 14 Q6.5 7 12 14 Q17.5 7 23 14 M5 19 L5.4 19 M12 18 L12.4 18 M19 19 L19.4 19',
};
/** How far a finger may wander and still be a tap, in screen pixels (all the moves added up). */
const TAP_SLOP = 14;
/** While placing a card: how near a lit province's centre a tap beside it may land, in screen pixels. */
const TAP_REACH = 44;
/** A standing pawn, the army's piece on the map. */
const PIECE_PAWN = 'M-7 2 C-7 -4 -5 -8 -3 -10 A5 5 0 1 1 3 -10 C5 -8 7 -4 7 2 Z';
const hashStr = (t: string) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

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
  /** Realm borders: one heavy line per landmass, over the hairlines between provinces. */
  private edgeEls: Record<string, SVGPathElement> = {};
  private byLand: Record<string, string[]> = {};
  private edgeD: Record<string, string> = {};
  /** The player's realm: a watercolour band along the inside of its border, one per landmass. */
  private mineG: SVGGElement;
  private mineKey = '';
  /** Ink symbols for the ground of each province, drawn once the first game is shown. */
  private terrainG: SVGGElement;
  private ter: Record<string, SVGPathElement> = {};
  private terBuilt = false;
  private fogHoles!: SVGPathElement;
  private fogEl!: SVGRectElement;
  private fogKey = '';
  /** Provinces a goal names: a flag on each, wax while still to take, green when held (goalbar.ts). */
  private goalPins: { id: string; held: boolean }[] = [];
  setGoalPins(pins: { id: string; held: boolean }[]) { this.goalPins = pins; }
  goalPinIds() { return this.goalPins.map(p => p.id); }
  /** The agenda's places: a marked disc on each province a line is about (urgent, opportunity or risk). */
  private agendaPins: { id: string; tier: string }[] = [];
  setAgendaPins(pins: { id: string; tier: string }[]) { this.agendaPins = pins; }
  /** Effects that play over the map for a moment: battles, conquests, numbers that float up (roadmap 5.6–5.8). */
  private fxG!: SVGGElement;
  /** What the provinces looked like at the last draw, to see what has changed since. */
  private before: Map<string, { owner: string; dev: number; blds: number; settle: number }> | null = null;
  private battlesSeen = -1;
  private gameId = '';
  /** Provinces taken lately, with the season their seal fades: id -> season count. */
  private seals = new Map<string, number>();
  private landEl: Record<string, SVGPathElement> = {};
  /** Realm names written across their lands, for the far view. */
  private rlabels: SVGGElement;
  private rsize = new Map<SVGTextElement, number>();
  private owners = '';
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
  /** Where the finger first touched: a tap means the province under it there, not where it lifted. */
  private downAt = { x: 0, y: 0 };
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
    for (const [lid, d] of Object.entries(g.landPaths)) {
      const sh = svgEl('path', { d, class: 'land-shadow', 'fill-rule': 'evenodd' }) as SVGPathElement;
      this.landEl[lid] = sh;
      this.svg.append(sh);
    }
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
    this.byLand = byLand;
    // paper grain over the land: one small tile, made once, repeated
    const tile = grainTile();
    if (tile) {
      const pat = svgEl('pattern', { id: 'grain', patternUnits: 'userSpaceOnUse', width: GRAIN_UNITS, height: GRAIN_UNITS });
      pat.append(svgEl('image', { href: tile, width: GRAIN_UNITS, height: GRAIN_UNITS, preserveAspectRatio: 'none' }));
      defs.append(pat);
      for (const d of Object.values(g.landPaths)) this.svg.append(svgEl('path', { d, class: 'grain', 'fill-rule': 'evenodd' }));
    }
    this.mineG = svgEl('g', { class: 'mine-bands' }) as SVGGElement;
    this.svg.append(this.mineG);
    // the borders between neighbours, cut out of the cells once: the points two cells have in common
    const ring: Record<string, string[]> = {};
    const pts = (id: string) => (ring[id] ??= g.cells[id].replace(/^M|Z$/g, '').split('L'));
    for (const [a, nbs] of Object.entries(g.adj)) for (const b of nbs) {
      if (a >= b) continue;
      const ra = pts(a), inB = new Set(pts(b)), n = ra.length;
      let start = -1;
      for (let i = 0; i < n; i++) if (inB.has(ra[i]) && !inB.has(ra[(i + n - 1) % n])) { start = i; break; }
      if (start < 0) continue;
      const run: string[] = [];
      for (let i = start; run.length < n && inB.has(ra[i % n]); i++) run.push(ra[i % n]);
      if (run.length >= 2) this.edgeD[a + '|' + b] = 'M' + run.join('L');
    }
    for (const [lid, ids] of Object.entries(byLand)) {
      if (ids.length < 2) continue;
      const grp = svgEl('g', { 'clip-path': `url(#clip-${lid})`, class: 'edges' });
      const e = svgEl('path', { class: 'realm-edge' }) as SVGPathElement;
      this.edgeEls[lid] = e;
      grp.append(e);
      this.svg.append(grp);
    }
    for (const d of Object.values(g.landPaths)) this.svg.append(svgEl('path', { d: coastLine(d), class: 'coast', 'fill-rule': 'evenodd' }));
    // fog of war: unexplored land and sea lie under blank parchment; the provinces you know (and the sea around
    // them) are cut out of it, so the shape of the unknown world is not given away
    const fogMask = svgEl('mask', { id: 'fogmask', maskUnits: 'userSpaceOnUse', x: -4000, y: -4000, width: g.W + 8000, height: g.H + 8000 });
    fogMask.append(svgEl('rect', { x: -4000, y: -4000, width: g.W + 8000, height: g.H + 8000, fill: 'white' }));
    this.fogHoles = svgEl('path', { fill: 'black', stroke: 'black', 'stroke-width': 24, 'stroke-linejoin': 'round' }) as SVGPathElement;
    fogMask.append(this.fogHoles);
    defs.append(fogMask);
    this.fogEl = svgEl('rect', { x: -4000, y: -4000, width: g.W + 8000, height: g.H + 8000, class: 'fogcover', mask: 'url(#fogmask)' }) as SVGRectElement;
    this.svg.append(this.fogEl);
    // the ground: one small path of ink marks for each province that is not open country (see buildTerrain)
    this.terrainG = svgEl('g', { class: 'terrain' }) as SVGGElement;
    this.svg.append(this.terrainG);
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
    this.rlabels = svgEl('g', { class: 'rlabels' }) as SVGGElement;
    this.svg.append(this.rlabels);
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
    this.fxG = svgEl('g', { class: 'fx' }) as SVGGElement;
    this.svg.append(this.fxG);
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
    const far = pxPerUnit < REALM_VIEW; // from here out, realm names take over from province names
    this.svg.classList.toggle('realm-view', far);
    for (const [t, fs] of this.rsize) { const px = fs * pxPerUnit; t.classList.toggle('off', !far || px < 10.5 || px > 72); }
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
      this.downAt = { x: e.clientX, y: e.clientY };
      this.moved = 0;
      this.held = false;
      clearTimeout(this.holdTimer);
      if (this.pickMode && e.pointerType === 'touch' && this.pointers.size === 1) {
        const x = e.clientX, y = e.clientY;
        this.holdTimer = window.setTimeout(() => {
          if (this.moved > TAP_SLOP || this.pointers.size !== 1) return;
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
        if (this.moved > TAP_SLOP) clearTimeout(this.holdTimer);
        if (this.moved > TAP_SLOP) { this.vb.x -= dx * scale; this.vb.y -= dy * scale; this.clampVb(); this.apply(); }
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
      if (was === 1 && this.moved <= TAP_SLOP && e.type === 'pointerup') {
        const id = this.idAt(this.downAt.x, this.downAt.y);
        if (this.pickMode) { if (id) this.onPick(id); return; } // choosing where a card goes: a tap is enough
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

  /** The province under a finger: the first one under the point, whatever lies on top of it (a piece, a flag,
   *  a name). While a card is being placed, a tap that lands on no province at all (the sea at a coast) takes the
   *  nearest lit one within reach. */
  private idAt(x: number, y: number): string | null {
    for (const e of document.elementsFromPoint(x, y)) {
      if (!this.svg.contains(e)) continue;
      const id = (e as Element).closest?.('[data-id]')?.getAttribute('data-id');
      if (id) return id; // a province under the finger is the one meant, lit or not (an unlit one says why)
    }
    return this.pickMode ? this.nearestTarget(x, y) : null;
  }
  private nearestTarget(x: number, y: number): string | null {
    const m = this.svg.getScreenCTM(), g = getGeo();
    if (!m) return null;
    let best: string | null = null, bd = TAP_REACH;
    for (const id of this.targets) {
      const c = g.center[id]; if (!c) continue;
      const d = Math.hypot(m.a * c[0] + m.c * c[1] + m.e - x, m.b * c[0] + m.d * c[1] + m.f - y);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }

  /** What changed since the last draw, shown where it happened: a battle, a province taken or lost, land improved,
   *  a building or a town. Nothing plays on the first draw of a game. */
  private effects(s: GameState) {
    const id = `${s.player}|${s.startYear}|${s.seed}`;
    if (id !== this.gameId) { this.gameId = id; this.before = null; this.battlesSeen = -1; this.seals.clear(); }
    const season = s.year * 4 + (s.quarter ?? 0);
    const now = new Map(Object.values(s.provinces).map(p => [p.id, { owner: p.owner, dev: p.dev, blds: p.buildings.length, settle: p.settlement ?? 0 }]));
    const log = s.battleLog ?? [];
    const calm = document.documentElement.dataset.motion === 'calm' || matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (this.before && !this.revealAll) {
      let floats = 0;
      for (const [pid, n] of now) {
        const o = this.before.get(pid);
        if (!o || !(provKnown(s, pid))) continue;
        if (o.owner !== n.owner && (n.owner === s.player || o.owner === s.player)) {
          this.seals.set(pid, season + 1);
          if (!calm) this.cells[pid]?.classList.add('taken');
          setTimeout(() => this.cells[pid]?.classList.remove('taken'), 900);
          this.float(pid, n.owner === s.player ? 'Taken' : 'Lost', n.owner === s.player ? 'good' : 'bad');
        } else if (n.owner === s.player && floats < 5) {
          if (n.dev > o.dev) { this.float(pid, `+${n.dev - o.dev} development`, 'good'); floats++; }
          else if (n.blds > o.blds) { this.float(pid, 'New building', 'good'); floats++; }
          else if (n.settle > o.settle) { this.float(pid, n.settle === 1 ? 'New village' : 'The town grows', 'good'); floats++; }
        }
      }
      for (const r of log.slice(this.battlesSeen < 0 ? log.length : this.battlesSeen)) this.burst(r.province, r.player === 'won' ? 'Won' : r.player === 'lost' ? 'Lost' : '', r.player === 'won' ? 'good' : 'bad');
    }
    this.before = now;
    this.battlesSeen = log.length;
    // seals on land changed hands lately
    for (const [pid, until] of this.seals) {
      if (until < season) { this.seals.delete(pid); continue; }
      const c = getGeo().center[pid];
      if (!c) continue;
      const pin = svgEl('g', { 'data-x': c[0], 'data-y': c[1], class: 'seal-mark' });
      pin.append(svgEl('circle', { r: 9, class: 'sm-wax' }), svgEl('path', { d: 'M-4 -1 L-1 3 L5 -4', class: 'sm-tick' }));
      this.marks.append(pin);
    }
  }
  /** A few words that rise from a province and fade. */
  private float(pid: string, text: string, tone: string) {
    const c = getGeo().center[pid];
    if (!c) return;
    const sc = (0.62 / (this.lastPx || 1)).toFixed(4);
    const g = svgEl('g', { transform: `translate(${c[0]} ${c[1]}) scale(${sc})`, class: 'floater ' + tone });
    const t = svgEl('text', { x: 0, y: -14 }); t.textContent = text;
    g.append(t);
    this.fxG.append(g);
    setTimeout(() => g.remove(), 1700);
  }
  /** Crossed swords on a province where a battle was fought, then who won. */
  private burst(pid: string, result: string, tone: string) {
    const c = getGeo().center[pid];
    if (!c) return;
    const sc = (0.62 / (this.lastPx || 1)).toFixed(4);
    const g = svgEl('g', { transform: `translate(${c[0]} ${c[1]}) scale(${sc})`, class: 'burst ' + tone });
    g.append(svgEl('circle', { r: 20, class: 'bu-ring' }), svgEl('path', { d: 'M-12 -12 L12 12 M12 -12 L-12 12 M-12 -6 L-6 -12 M6 -12 L12 -6', class: 'bu-swords' }));
    if (result) { const t = svgEl('text', { x: 0, y: 36, class: 'bu-t' }); t.textContent = result; g.append(t); }
    this.fxG.append(g);
    setTimeout(() => g.remove(), 2200);
  }

  /** Write each realm's name once across the largest piece of its land, along the land's longer axis. */
  private nameRealms(s: GameState, seen: (id: string) => boolean) {
    const g = getGeo();
    while (this.rlabels.firstChild) this.rlabels.removeChild(this.rlabels.firstChild);
    this.rsize.clear();
    const lands: Record<string, string[]> = {};
    for (const p of Object.values(s.provinces)) if (p.owner !== NO_STATE && s.nations[p.owner]?.alive && seen(p.id)) (lands[p.owner] ??= []).push(p.id);
    for (const [owner, ids] of Object.entries(lands)) {
      // the largest group of provinces that touch each other
      const left = new Set(ids); let best: string[] = [];
      while (left.size) {
        const first = left.values().next().value as string; left.delete(first);
        const comp = [first];
        for (let i = 0; i < comp.length; i++) for (const nb of g.adj[comp[i]]) if (left.has(nb)) { left.delete(nb); comp.push(nb); }
        if (comp.length > best.length) best = comp;
      }
      const cs = best.map(id => g.center[id]);
      const mx = cs.reduce((a, c) => a + c[0], 0) / cs.length, my = cs.reduce((a, c) => a + c[1], 0) / cs.length;
      let sxx = 0, syy = 0, sxy = 0;
      for (const [x, y] of cs) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
      let ang = cs.length > 1 ? 0.5 * Math.atan2(2 * sxy, sxx - syy) : 0;
      ang = Math.max(-0.9, Math.min(0.9, ang)); // never steeper than about 50°: the name must stay easy to read
      const ux = Math.cos(ang), uy = Math.sin(ang);
      // how far the land reaches along the name and across it, with half a province of margin at each end
      let lo = 0, hi = 0, across = 0;
      best.forEach((id, i) => {
        const dx = cs[i][0] - mx, dy = cs[i][1] - my, half = this.size[id] * 0.45;
        lo = Math.min(lo, dx * ux + dy * uy - half); hi = Math.max(hi, dx * ux + dy * uy + half);
        across = Math.max(across, Math.abs(-dx * uy + dy * ux) + half);
      });
      const name = s.nations[owner].name;
      const fs = Math.min(((hi - lo) * 0.82) / (name.length * 0.74), across * 0.7, 80);
      if (fs < 3) continue;
      const cx = mx + ((lo + hi) / 2) * ux, cy = my + ((lo + hi) / 2) * uy;
      const t = svgEl('text', { x: cx.toFixed(1), y: cy.toFixed(1), class: 'rlabel off' + (owner === s.player && !this.revealAll ? ' mine' : ''), 'font-size': fs.toFixed(1), transform: `rotate(${((ang * 180) / Math.PI).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})` }) as SVGTextElement;
      t.textContent = name;
      this.rsize.set(t, fs);
      this.rlabels.append(t);
    }
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
      case 'relations': return STANCE[stanceOf(s, p.owner)].color;
      case 'culture': return hue(p.culture);
      case 'religion': return RELIGION_COLORS[p.religion] ?? hue(p.religion);
      case 'goods': return GOODS[p.good]?.color ?? hue(p.good);
      case 'happiness': return p.owner === s.player || s.nations[p.owner]?.overlord === s.player ? ramp(happinessOf(s, p).value / 100) : '#8a8478';
      case 'population': return popShade(Math.sqrt(population(s, p) / maxPop));
      default: return null;
    }
  }

  /** Two or three small ink marks in every province that is not open ground: trees, humps, peaks or dunes. */
  private buildTerrain(s: GameState) {
    const g = getGeo();
    this.terBuilt = true;
    for (const [id, p] of Object.entries(s.provinces)) {
      const kind = terrainOf(p), c = g.center[id];
      if (kind === 'plains' || !c || !g.cells[id]) continue;
      const ring = g.cells[id].replace(/^M|Z$/g, '').split('L').map(q => q.split(',').map(Number));
      // a cell reaches out into the sea and is cut to the coast when drawn, so a mark must be on the land as well
      const land = this.landEl[g.land[id]];
      const ashore = (x: number, y: number) => { try { return !land?.isPointInFill || land.isPointInFill(new DOMPoint(x, y)); } catch { return true; } };
      const inside = (x: number, y: number) => {
        if (!ashore(x, y)) return false;
        let ok = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i], [xj, yj] = ring[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
        }
        return ok;
      };
      const size = this.size[id], w = Math.max(5.5, Math.min(15, size * 0.23));
      let d = '';
      // above and below the name, a little off the regular so it reads as drawn by hand
      const h = hashStr(id);
      const spots: [number, number][] = [[-0.24, -0.22], [0.22, -0.27], [0.03, 0.25], [-0.3, 0.12], [0.31, 0.1]];
      const n = size > 90 ? 5 : size > 50 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const jx = (((h >> (i * 5)) & 15) / 15 - 0.5) * 0.1, jy = (((h >> (i * 5 + 2)) & 15) / 15 - 0.5) * 0.08;
        const x = c[0] + (spots[i][0] + jx) * size, y = c[1] + (spots[i][1] + jy) * size * 0.62;
        if (!inside(x, y) || !inside(x - w / 2, y) || !inside(x + w / 2, y)) continue;
        const k = w / 24, ox = x - w / 2, oy = y - w / 2;
        d += TERRAIN_MARKS[kind].replace(/(-?[\d.]+) (-?[\d.]+)/g, (_m, a: string, b: string) => `${(ox + +a * k).toFixed(1)} ${(oy + +b * k).toFixed(1)}`);
      }
      if (!d) continue;
      // one element for each province, not one for the world: the browser then skips what is off screen
      const el = svgEl('path', { d, class: 'ter t-' + kind }) as SVGPathElement;
      this.ter[id] = el;
      this.terrainG.append(el);
    }
  }

  /** A band of the realm's colour along the inside of the player's border, like a wash laid against an ink line.
   *  The border is stroked wide and then cut to the realm's own land, so only the inner half is seen. */
  private mineBand(s: GameState) {
    const g = getGeo();
    const mine = this.revealAll ? [] : Object.values(s.provinces).filter(p => p.owner === s.player).map(p => p.id);
    const key = mine.join(',');
    if (key === this.mineKey) return;
    this.mineKey = key;
    const defs = this.svg.querySelector('defs')!;
    defs.querySelectorAll('.clip-mine').forEach(e => e.remove());
    while (this.mineG.firstChild) this.mineG.removeChild(this.mineG.firstChild);
    const lands: Record<string, string[]> = {};
    for (const id of mine) (lands[g.land[id]] ??= []).push(id);
    const own = new Set(mine);
    for (const [lid, ids] of Object.entries(lands)) {
      const cp = svgEl('clipPath', { id: 'clip-mine-' + lid, class: 'clip-mine' });
      cp.append(svgEl('path', { d: ids.map(id => g.cells[id]).join('') }));
      defs.append(cp);
      let d = '';
      for (const a of ids) for (const b of g.adj[a]) if (!own.has(b)) d += this.edgeD[a < b ? a + '|' + b : b + '|' + a] ?? '';
      const grp = svgEl('g', { 'clip-path': `url(#clip-${lid})` });
      // the coast of this land too: cut to the realm's provinces, only its own shore is washed
      grp.append(svgEl('path', { d: d + coastLine(g.landPaths[lid]), class: 'mine-band', 'clip-path': `url(#clip-mine-${lid})`, style: `stroke:${s.nations[s.player].color}` }));
      this.mineG.append(grp);
    }
  }

  render(s: GameState) {
    const g = getGeo();
    if (!this.terBuilt) this.buildTerrain(s);
    this.mineBand(s);
    const dirty = new Set<string>();
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
      dirty.add(g.land[id]);
      c.classList.toggle('fog', !known);
      if (lbl.textContent !== (known ? p.name : '')) { lbl.textContent = known ? p.name : ''; this.shown.delete(id); }
      const ter = this.ter[id];
      if (ter) ter.style.display = known ? '' : 'none';
      const gi = this.gicons[id];
      if (gi) {
        gi.style.display = known && GOODS[p.good] ? '' : 'none';
        if (known && GOODS[p.good]) { const u = gi.lastChild as SVGUseElement; if (u.getAttribute('href') !== '#gi-' + p.good) u.setAttribute('href', '#gi-' + p.good); (gi.firstChild as SVGCircleElement).style.fill = GOODS[p.good].color; }
      }
      if (!known) { c.style.fill = ''; for (const k of ['mine', 'subject', 'enemy', 'unrest', 'native']) c.classList.remove(k); continue; }
      const occupied = this.mode === 'political' && p.occupiedFrom && s.nations[p.occupiedFrom]?.alive && atWar(s, p.owner, p.occupiedFrom);
      c.style.fill = occupied ? `url(#${this.stripes(nat?.color ?? '#777', s.nations[p.occupiedFrom!].color, p.owner + '_' + p.occupiedFrom)})` : this.fill(s, p, maxPop) ?? wash(nat?.color ?? '#777', p.owner === this.picked ? 0.12 : p.owner === s.player && !this.revealAll ? MINE_WASH : 0.42);
      const pol = this.mode === 'political';
      c.classList.toggle('native', p.owner === NO_STATE && pol);
      c.classList.toggle('mine', !this.revealAll && p.owner === s.player);
      c.classList.toggle('picked', (this.revealAll && p.owner === this.picked) || (!!this.realm && p.owner === this.realm));
      c.classList.toggle('subject', pol && nat?.overlord === s.player);
      c.classList.toggle('enemy', pol && p.owner !== s.player && atWar(s, s.player, p.owner));
      c.classList.toggle('unrest', pol && p.owner === s.player && p.control < 30);
      lbl.classList.toggle('cap', nat?.capital === id);
    }
    const seen = (id: string) => this.revealAll || provKnown(s, id);
    // the fog is redrawn only when what is known changes
    const fogKey = this.revealAll ? 'all' : Object.keys(s.provinces).filter(seen).join(',');
    if (fogKey !== this.fogKey) {
      this.fogKey = fogKey;
      this.fogEl.style.display = this.revealAll ? 'none' : '';
      this.fogHoles.setAttribute('d', this.revealAll ? '' : Object.keys(s.provinces).filter(seen).map(id => g.cells[id] ?? '').join(''));
    }
    // realm borders, for the lands where something changed
    for (const lid of dirty) {
      const el = this.edgeEls[lid];
      if (!el) continue;
      let d = '';
      for (const a of this.byLand[lid]) for (const b of g.adj[a]) {
        if (a >= b || s.provinces[a].owner === s.provinces[b].owner || !(seen(a) || seen(b))) continue;
        d += this.edgeD[a + '|' + b] ?? '';
      }
      el.setAttribute('d', d);
    }
    // realm names: written again only when land has changed hands or come into view
    const owners = Object.values(s.provinces).map(p => (seen(p.id) ? p.owner : '')).join(',');
    if (owners !== this.owners) { this.owners = owners; this.nameRealms(s, seen); }
    // mission markers and capitals
    while (this.marks.firstChild) this.marks.removeChild(this.marks.firstChild);
    for (const n of Object.values(s.nations)) {
      if (!n.alive || !s.provinces[n.capital] || s.provinces[n.capital].owner !== n.id || !(this.revealAll || provKnown(s, n.capital))) continue;
      const [x, y] = g.center[n.capital];
      const pin = svgEl('g', { 'data-x': x, 'data-y': y });
      pin.append(svgEl('path', { d: `M0 -21 l2.4 4.8 5.2 .7 -3.8 3.6 .9 5.2 -4.7 -2.5 -4.7 2.5 .9 -5.2 -3.8 -3.6 5.2 -.7 Z`, class: 'capmark' + (n.id === s.player && !this.revealAll ? ' mine' : '') }));
      this.marks.append(pin);
    }
    // the goal: a flag on each province it names
    for (const gp of this.goalPins) {
      const c = g.center[gp.id];
      if (!c) continue;
      const pin = svgEl('g', { 'data-x': c[0], 'data-y': c[1], class: 'goalpin' + (gp.held ? ' held' : '') });
      pin.append(svgEl('path', { d: 'M-1 4 V-26', class: 'gp-pole' }), svgEl('path', { d: 'M0 -26 H15 L11 -20.5 L15 -15 H0 Z', class: 'gp-flag' }));
      this.marks.append(pin);
    }
    // the agenda: a disc with the tier's mark, so the place reads without colour
    for (const ap of this.agendaPins) {
      const c = g.center[ap.id];
      if (!c) continue;
      const pin = svgEl('g', { 'data-x': c[0], 'data-y': c[1], class: 'agpin t-' + ap.tier });
      pin.append(svgEl('circle', { cx: 0, cy: -34, r: 13, class: 'ap-disc' }), svgEl('path', { d: 'M0 -21 V-10', class: 'ap-pole' }));
      const t = svgEl('text', { x: 0, y: -33, class: 'ap-mark' }); t.textContent = ap.tier === 'urgent' ? '!' : ap.tier === 'opportunity' ? '✦' : '▾';
      pin.append(t);
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
      // a standing piece: a pawn under a pennant in the realm's colour, the count on its base
      const gEl = svgEl('g', { class: 'army piece' + (st.mine ? ' mine' : ' foe'), transform: `translate(${st.mine ? -14 : 14} 4)` });
      gEl.append(svgEl('path', { d: PIECE_PAWN, class: 'pc-body', style: `fill:${st.color}` }),
        svgEl('path', { d: 'M0 -22 V-36', class: 'pc-pole' }), svgEl('path', { d: 'M0 -36 H11 L8 -32 L11 -28 H0 Z', class: 'pc-flag', style: `fill:${st.color}` }),
        svgEl('rect', { x: -9, y: 2, width: 18, height: 11, rx: 2, class: 'pc-base' }));
      const t = svgEl('text', { x: 0, y: 11, class: 'army-n' }); t.textContent = String(st.n);
      gEl.append(t);
      pin.append(gEl);
      this.marks.append(pin);
    }
    // tasks travel: a dotted road from the capital to the target, the person's piece on it
    const home = g.center[s.nations[s.player].capital];
    if (home && !this.revealAll) for (const m of s.missions) {
      const prov = s.provinces[m.target] ? m.target : DIPLO_TARGET(s, m.target);
      const to = prov ? g.center[prov] : null;
      if (!to || prov === s.nations[s.player].capital || m.kind === 'route') continue;
      const done = Math.max(0, Math.min(1, (m.total - m.turnsLeft) / Math.max(1, m.total)));
      const mx = (home[0] + to[0]) / 2, my = (home[1] + to[1]) / 2 - Math.hypot(to[0] - home[0], to[1] - home[1]) * 0.18;
      this.marks.append(svgEl('path', { d: `M${home[0]} ${home[1]} Q${mx} ${my} ${to[0]} ${to[1]}`, class: 'route k-' + MISSION_INFO[m.kind].role }));
      const u = done, px = (1 - u) ** 2 * home[0] + 2 * (1 - u) * u * mx + u * u * to[0], py = (1 - u) ** 2 * home[1] + 2 * (1 - u) * u * my + u * u * to[1];
      const pin = svgEl('g', { 'data-x': px.toFixed(1), 'data-y': py.toFixed(1), class: 'traveller' });
      pin.append(svgEl('circle', { r: 7, class: 'tv-c k-' + MISSION_INFO[m.kind].role }));
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
    this.effects(s);
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
  if (mode === 'relations') return (Object.keys(STANCE) as Stance[]).filter(k => k !== 'none').map(k => ({ color: STANCE[k].color, label: STANCE[k].name }));
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
