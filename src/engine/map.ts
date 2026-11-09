// World geometry, precomputed by scripts/gen-world.ts into src/data/world.json.
import WORLD from '../data/world.json';
import type { ProvinceSeed } from '../data/provinces';

export type Pt = [number, number];

export interface MapGeo {
  W: number; H: number;
  landPaths: Record<string, string>;   // svg path per landmass
  cells: Record<string, string>;       // svg path per province (unclipped cell or island)
  center: Record<string, Pt>;
  land: Record<string, string>;
  adj: Record<string, string[]>;       // land neighbours
  sea: Record<string, string[]>;       // naval neighbours
  coastal: Record<string, boolean>;
  seeds: ProvinceSeed[];
}

interface WorldJson {
  W: number; H: number; lands: string[]; cells: Record<string, string>; center: Record<string, Pt>;
  land: Record<string, number>; adj: Record<string, string[]>; sea: Record<string, string[]>; coastal: Record<string, boolean>;
  seeds: ProvinceSeed[];
}

let cached: MapGeo | null = null;

export function getGeo(): MapGeo {
  if (cached) return cached;
  const w = WORLD as unknown as WorldJson;
  const landPaths: Record<string, string> = {};
  w.lands.forEach((d, i) => { landPaths['l' + i] = d; });
  const land: Record<string, string> = {};
  for (const [id, i] of Object.entries(w.land)) land[id] = 'l' + i;
  cached = { W: w.W, H: w.H, landPaths, cells: w.cells, center: w.center, land, adj: w.adj, sea: w.sea, coastal: w.coastal, seeds: w.seeds };
  return cached;
}

export const neighbours = (id: string) => { const g = getGeo(); return [...g.adj[id], ...g.sea[id]]; };
export const isNaval = (a: string, b: string) => getGeo().sea[a].includes(b);
