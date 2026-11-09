// Builds src/data/world.json: land shapes, province cells, neighbours and sea links.
// Run: npx esbuild scripts/gen-world.ts --bundle --platform=node --outfile=dist/gen-world.js && node dist/gen-world.js
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { Delaunay } from 'd3-delaunay';
import pc from 'polygon-clipping';
import { SEEDS_EUROPE, SEEDS_WORLD_EXTRA, type ProvinceSeed } from '../src/data/provinces';

type P = [number, number];
type Poly = P[][]; // outer + holes, lon/lat
function dpRing(r: P[], tol: number): P[] {
  // closed ring: split at the point farthest from the start so both halves are open lines
  let far = 1, fd = -1;
  for (let i = 1; i < r.length - 1; i++) { const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = dp(r.slice(0, far + 1), tol), b = dp(r.slice(far), tol);
  return [...a, ...b.slice(1)];
}
const area = (r: P[]) => Math.abs(r.reduce((a, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return a + x * y2 - x2 * y; }, 0) / 2);
const inRing = (p: P, r: P[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
const inPoly = (p: P, poly: Poly) => inRing(p, poly[0]) && !poly.slice(1).some(h => inRing(p, h));

const S = 10; // map units per degree of longitude
const rad = (d: number) => (d * Math.PI) / 180;
const miller = (lat: number) => (1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * rad(lat))) * 180) / Math.PI;
const LAT_TOP = 76, LAT_BOT = -57;
const YTOP = miller(LAT_TOP);
const proj = ([lon, lat]: P): P => [(lon + 180) * S, (YTOP - miller(Math.max(LAT_BOT, Math.min(LAT_TOP, lat)))) * S];
const W = 360 * S, H = (YTOP - miller(LAT_BOT)) * S;

const topo = JSON.parse(readFileSync('node_modules/world-atlas/land-50m.json', 'utf8'));
const geo: any = feature(topo, topo.objects.land);
let polys: Poly[] = [];
for (const f of geo.features ?? [geo]) {
  const g = f.geometry;
  const list = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const p of list) polys.push(p.map((r: P[]) => r.map(([x, y]) => [x, y] as P)));
}
polys = polys.filter(p => Math.max(...p[0].map(q => q[1])) > -60);

// Cut Africa from Eurasia along Suez and the Red Sea, and across the Strait of Gibraltar.
const AFRICA_MASK: P[] = [
  [-30, -45], [60, -45], [60, 11.5], [43.45, 12.6], [42.5, 14], [40.5, 16.5], [38.5, 20], [36.5, 24], [34.6, 27.4], [33.2, 28.6],
  [32.56, 29.95], [32.35, 30.6], [32.3, 31.35], [32.2, 31.8], [28, 32.4], [25, 32.9], [20, 33.6], [12, 34.2], [11.3, 37.5],
  [9, 37.6], [3, 37.0], [-2, 36.2], [-5.0, 35.97], [-6.0, 35.88], [-12, 35.6], [-30, 36], [-30, -45],
];
const out: Poly[] = [];
for (const p of polys) {
  const xs = p[0].map(q => q[0]), ys = p[0].map(q => q[1]);
  const big = (Math.max(...xs) - Math.min(...xs)) > 40;
  if (!big) { out.push(p); continue; }
  const inter = pc.intersection(p as any, [AFRICA_MASK] as any) as unknown as Poly[];
  const diff = pc.difference(p as any, [AFRICA_MASK] as any) as unknown as Poly[];
  out.push(...inter, ...diff);
}
polys = out;
// Eurasia wraps the date line at Chukotka: keep only its western side
polys = polys.flatMap(p => {
  const xs = p[0].map(q => q[0]);
  if (Math.max(...xs) - Math.min(...xs) < 300) return [p];
  return pc.intersection(p as any, [[[-30, -90], [180, -90], [180, 90], [-30, 90], [-30, -90]]] as any) as unknown as Poly[];
});

// Keep the map between the latitudes the projection shows.
polys = polys.flatMap(p => pc.intersection(p as any, [[[-180, LAT_BOT + 0.5], [180, LAT_BOT + 0.5], [180, LAT_TOP - 0.5], [-180, LAT_TOP - 0.5], [-180, LAT_BOT + 0.5]]] as any) as unknown as Poly[]);
// Simplify (Douglas-Peucker) in degrees.
function dp(pts: P[], tol: number): P[] {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1, bi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > best) { best = d; bi = i; } }
    if (best > tol) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const seeds: ProvinceSeed[] = [...SEEDS_EUROPE(), ...SEEDS_WORLD_EXTRA()];
const ids = new Set<string>();
for (const s of seeds) { if (ids.has(s.id)) throw new Error('duplicate id ' + s.id); ids.add(s.id); }

// fine coastlines in the three focus areas: Europe, North Africa and the Middle East, East Asia
const europe = (lon: number, lat: number) => (lon > -18 && lon < 62 && lat > 10 && lat < 62) || (lon > 95 && lon < 150 && lat > -12 && lat < 50);
polys = polys.map(p => p.map((r, ri) => {
  const fine = r.some(([x, y]) => europe(x, y));
  const tol = fine ? 0.06 : 0.18;
  return dpRing(r, ri ? tol * 2 : tol);
}).filter((r, ri) => r.length >= 4 && (ri === 0 || area(r) > 0.3)) as Poly).filter(p => p.length && p[0].length >= 4);

// assign seeds to land, nudging those that fall in the sea
const owner = new Map<string, number>();
for (const s of seeds) {
  let idx = polys.findIndex(p => inPoly([s.lon, s.lat], p));
  if (idx < 0) {
    search: for (let r = 0.1; r <= 1.2; r += 0.1) for (let a = 0; a < 360; a += 15) {
      const q: P = [s.lon + r * Math.cos(rad(a)), s.lat + r * Math.sin(rad(a))];
      const k = polys.findIndex(p => inPoly(q, p));
      if (k >= 0) { console.warn(`nudged ${s.id} by ${r.toFixed(1)}°`); s.lon = +q[0].toFixed(2); s.lat = +q[1].toFixed(2); idx = k; break search; }
    }
  }
  if (idx < 0) {
    // tiny island lost at this scale: draw a small one so it stays playable
    const ring: P[] = []; for (let a = 0; a <= 360; a += 45) ring.push([s.lon + 0.45 * Math.cos(rad(a)), s.lat + 0.35 * Math.sin(rad(a))]);
    polys.push([ring]); idx = polys.length - 1; console.warn('island drawn for ' + s.id);
  }
  owner.set(s.id, idx);
}
// keep land with seeds, or of a decent size
const used = new Set(owner.values());
const width = (p: Poly) => { const xs = p[0].map(q => q[0]); return Math.max(...xs) - Math.min(...xs); };
const keepIdx = polys.map((p, i) => used.has(i) || (area(p[0]) > 0.8 && width(p) < 120));
const remap = new Map<number, number>();
const lands: Poly[] = [];
polys.forEach((p, i) => { if (keepIdx[i]) { remap.set(i, lands.length); lands.push(p); } });
for (const [k, v] of owner) owner.set(k, remap.get(v)!);

const fmt = (pts: P[]) => 'M' + pts.map(q => { const [x, y] = proj(q); return x.toFixed(1) + ',' + y.toFixed(1); }).join('L') + 'Z';
const fmtXY = (pts: P[]) => 'M' + pts.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join('L') + 'Z';
const landPaths = lands.map(p => p.map(fmt).join(''));
const landXY = lands.map(p => p.map(r => r.map(proj)));
const inPolyXY = (q: P, poly: P[][]) => inRing(q, poly[0]) && !poly.slice(1).some(h => inRing(q, h));

const cells: Record<string, string> = {}, center: Record<string, P> = {}, landOf: Record<string, number> = {};
const adj: Record<string, string[]> = {}, coastal: Record<string, boolean> = {};
for (const s of seeds) { adj[s.id] = []; center[s.id] = proj([s.lon, s.lat]).map(v => +v.toFixed(1)) as P; landOf[s.id] = owner.get(s.id)!; }
const byLand = new Map<number, string[]>();
for (const s of seeds) { const k = owner.get(s.id)!; if (!byLand.has(k)) byLand.set(k, []); byLand.get(k)!.push(s.id); }
for (const [k, list] of byLand) {
  const poly = landXY[k];
  if (list.length === 1) { cells[list[0]] = landPaths[k]; coastal[list[0]] = true; continue; }
  const xs = poly[0].map(q => q[0]), ys = poly[0].map(q => q[1]);
  const vor = Delaunay.from(list.map(id => center[id])).voronoi([Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20]);
  const cps = list.map((_, i) => (vor.cellPolygon(i) ?? []) as P[]);
  list.forEach((id, i) => {
    cells[id] = fmtXY(cps[i]);
    coastal[id] = false;
  });
  // coastal = the coastline passes through the province's cell
  const del = vor.delaunay;
  let hint = 0;
  for (const ring of poly) for (let e = 0; e < ring.length - 1; e++) {
    const [x0, y0] = ring[e], [x1, y1] = ring[e + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3));
    for (let t = 0; t < n; t++) { hint = del.find(x0 + (x1 - x0) * t / n, y0 + (y1 - y0) * t / n, hint); coastal[list[hint]] = true; }
  }
  list.forEach((id, i) => {
    for (const j of vor.neighbors(i)) {
      if (j < i) continue;
      const a = cps[i], b = cps[j];
      const shared = a.filter(p => b.some(q => Math.abs(p[0] - q[0]) < 0.01 && Math.abs(p[1] - q[1]) < 0.01));
      if (shared.length < 2) continue;
      const [s0, s1] = shared; let hits = 0;
      for (let t = 0; t <= 24; t++) if (inPolyXY([s0[0] + (s1[0] - s0[0]) * t / 24, s0[1] + (s1[1] - s0[1]) * t / 24], poly)) hits++;
      if (hits >= 1) { adj[id].push(list[j]); adj[list[j]].push(id); }
    }
  });
}
// sea links between nearby coasts
const sea: Record<string, string[]> = {};
for (const s of seeds) sea[s.id] = [];
const coastIds = seeds.filter(s => coastal[s.id]);
const boxes = landXY.map(p => { const xs = p[0].map(q => q[0]), ys = p[0].map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; });
const onLand = (q: P) => landXY.some((p, i) => q[0] >= boxes[i][0] && q[0] <= boxes[i][2] && q[1] >= boxes[i][1] && q[1] <= boxes[i][3] && inPolyXY(q, p));
const seaOk = (a: ProvinceSeed, b: ProvinceSeed, max = 7) => {
  const [ax, ay] = center[a.id], [bx, by] = center[b.id];
  let land = 0; for (let t = 1; t < 16; t++) if (onLand([ax + (bx - ax) * t / 16, ay + (by - ay) * t / 16])) land++;
  return land <= max;
};
const link = (a: string, b: string) => { if (!sea[a].includes(b)) { sea[a].push(b); sea[b].push(a); } };
const dist = (a: ProvinceSeed, b: ProvinceSeed) => Math.hypot((a.lon - b.lon) * Math.cos(rad((a.lat + b.lat) / 2)), a.lat - b.lat);
for (let i = 0; i < coastIds.length; i++) for (let j = i + 1; j < coastIds.length; j++) {
  const a = coastIds[i], b = coastIds[j];
  if (adj[a.id].includes(b.id) || dist(a, b) > 4) continue;
  if (seaOk(a, b, 5)) link(a.id, b.id);
}
// every coast gets at least two routes to other lands
for (const a of coastIds) {
  const other = coastIds.filter(b => b !== a && landOf[b.id] !== landOf[a.id] && !sea[a.id].includes(b.id)).map(b => [dist(a, b), b] as const).sort((x, y) => x[0] - y[0]);
  const have = sea[a.id].filter(b => landOf[b] !== landOf[a.id]).length;
  const lonely = !adj[a.id].length && sea[a.id].length < 2;
  for (const [d, b] of other.slice(0, lonely ? 2 : Math.max(0, 1 - have))) if (lonely ? d < 26 && seaOk(a, b, 13) : d < 12 && seaOk(a, b)) link(a.id, b.id);
}
for (const id of ['seville', 'bordeaux', 'nantes', 'london', 'hamburg', 'rouen']) if (id in coastal) coastal[id] = true; // river ports
const world = { W: +W.toFixed(1), H: +H.toFixed(1), lands: landPaths, cells, center, land: landOf, adj, sea, coastal, seeds };
writeFileSync('src/data/world.json', JSON.stringify(world));
console.log(`lands ${lands.length}, provinces ${seeds.length}, size ${(JSON.stringify(world).length / 1024).toFixed(0)} KB, map ${W}x${H.toFixed(0)}`);
const isolated = seeds.filter(s => !adj[s.id].length && !sea[s.id].length).map(s => s.id);
if (isolated.length) console.log('isolated:', isolated.join(', '));
const count: Record<string, number> = {}; for (const s of seeds) count[s.owner] = (count[s.owner] ?? 0) + 1;
console.log('castile', count.castile, 'portugal', count.portugal, 'aragon', count.aragon, 'nations', Object.keys(count).length);
