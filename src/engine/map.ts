import { Delaunay } from 'd3-delaunay';
import { LANDS, PROVINCES, MAP_W, MAP_H, projX, projY, EXTRA_LINKS, REMOVE_LINKS, EXTRA_SEA } from '../data/geo';

export type Pt = [number, number];

export interface MapGeo {
  landPaths: Record<string, string>;   // svg path per landmass
  landRings: Record<string, Pt[]>;
  cells: Record<string, string>;       // svg path per province (unclipped cell or island)
  center: Record<string, Pt>;
  land: Record<string, string>;
  adj: Record<string, string[]>;       // land neighbours
  sea: Record<string, string[]>;       // naval neighbours
  coastal: Record<string, boolean>;
}

function inRing(p: Pt, ring: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const toPath = (pts: Pt[]) => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';

let cached: MapGeo | null = null;

export function getGeo(): MapGeo {
  if (cached) return cached;
  const landRings: Record<string, Pt[]> = {};
  const landPaths: Record<string, string> = {};
  for (const [id, ring] of Object.entries(LANDS)) {
    landRings[id] = ring.map(([lo, la]) => [projX(lo), projY(la)] as Pt);
    landPaths[id] = toPath(landRings[id]);
  }
  const onLand = (p: Pt) => Object.values(landRings).some(r => inRing(p, r));

  const cells: Record<string, string> = {};
  const cellPolys: Record<string, Pt[]> = {};
  const center: Record<string, Pt> = {};
  const land: Record<string, string> = {};
  const adj: Record<string, string[]> = {};
  const coastal: Record<string, boolean> = {};
  for (const p of PROVINCES) { adj[p[0]] = []; center[p[0]] = [projX(p[6]), projY(p[7])]; land[p[0]] = p[5]; }

  const byLand: Record<string, string[]> = {};
  for (const p of PROVINCES) (byLand[p[5]] ??= []).push(p[0]);

  const link = (a: string, b: string) => {
    if (a === b) return;
    if (!adj[a].includes(b)) adj[a].push(b);
    if (!adj[b].includes(a)) adj[b].push(a);
  };

  for (const [lid, ids] of Object.entries(byLand)) {
    const ring = landRings[lid];
    if (ids.length === 1) {
      cells[ids[0]] = landPaths[lid];
      cellPolys[ids[0]] = ring;
      coastal[ids[0]] = true;
      continue;
    }
    const pts = ids.map(id => center[id]);
    const vor = Delaunay.from(pts).voronoi([-60, -60, MAP_W + 60, MAP_H + 60]);
    ids.forEach((id, i) => {
      const poly = (vor.cellPolygon(i) as Pt[]) || [];
      cellPolys[id] = poly;
      cells[id] = toPath(poly);
      // coastal if any vertex or edge sample of the cell lies at sea
      let sea = false;
      for (let k = 0; k < poly.length - 1 && !sea; k++) {
        for (let t = 0; t <= 4; t++) {
          const q: Pt = [poly[k][0] + (poly[k + 1][0] - poly[k][0]) * t / 4, poly[k][1] + (poly[k + 1][1] - poly[k][1]) * t / 4];
          if (q[0] < 0 || q[1] < 0 || q[0] > MAP_W || q[1] > MAP_H) continue;
          if (!inRing(q, ring)) { sea = true; break; }
        }
      }
      coastal[id] = sea;
    });
    ids.forEach((id, i) => {
      for (const j of vor.neighbors(i)) {
        if (j < i) continue;
        const other = ids[j];
        const a = cellPolys[id], b = cellPolys[other];
        const shared = a.filter(p => b.some(q => Math.abs(p[0] - q[0]) < 0.01 && Math.abs(p[1] - q[1]) < 0.01));
        if (shared.length < 2) continue;
        const [s0, s1] = shared;
        let hits = 0;
        for (let t = 0; t <= 10; t++) {
          const q: Pt = [s0[0] + (s1[0] - s0[0]) * t / 10, s0[1] + (s1[1] - s0[1]) * t / 10];
          if (inRing(q, ring)) hits++;
        }
        if (hits >= 2) link(id, other);
      }
    });
  }
  for (const [a, b] of EXTRA_LINKS) link(a, b);
  for (const [a, b] of REMOVE_LINKS) {
    adj[a] = adj[a].filter(x => x !== b);
    adj[b] = adj[b].filter(x => x !== a);
  }

  // naval links: nearby coastal provinces whose straight line runs mostly over water
  const sea: Record<string, string[]> = {};
  const ids = PROVINCES.map(p => p[0]);
  for (const id of ids) sea[id] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j];
    if (!coastal[a] || !coastal[b] || adj[a].includes(b)) continue;
    const [ax, ay] = center[a], [bx, by] = center[b];
    if (Math.hypot(ax - bx, ay - by) > 230) continue;
    let landHits = 0;
    for (let t = 1; t < 20; t++) if (onLand([ax + (bx - ax) * t / 20, ay + (by - ay) * t / 20])) landHits++;
    if (landHits > 8) continue;
    sea[a].push(b); sea[b].push(a);
  }

  for (const [a, b] of EXTRA_SEA) { if (!sea[a].includes(b)) { sea[a].push(b); sea[b].push(a); } }

  cached = { landPaths, landRings, cells, center, land, adj, sea, coastal };
  return cached;
}

export const neighbours = (id: string) => { const g = getGeo(); return [...g.adj[id], ...g.sea[id]]; };
export const isNaval = (a: string, b: string) => getGeo().sea[a].includes(b);
