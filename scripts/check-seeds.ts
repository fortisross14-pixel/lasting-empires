// Checks a file of province rows (same format as src/data/provinces.ts) before merging:
// every seed on land, no duplicate ids, no seeds too close together, known goods.
// Run: npx esbuild scripts/check-seeds.ts --bundle --platform=node --outfile=dist/check-seeds.js --log-level=warning && node dist/check-seeds.js <rows.txt>
import { readFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { parseTable, SEEDS_EUROPE, SEEDS_WORLD_EXTRA } from '../src/data/provinces';
import { GOODS } from '../src/data/goods';

type P = [number, number];
const inRing = (p: P, r: P[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
const topo = JSON.parse(readFileSync('node_modules/world-atlas/land-50m.json', 'utf8'));
const g: any = (feature(topo, topo.objects.land) as any).features[0].geometry;
const polys: P[][][] = g.coordinates;
const onLand = (p: P) => polys.some(poly => inRing(p, poly[0]) && !poly.slice(1).some(h => inRing(p, h)));
const rows = parseTable(readFileSync(process.argv[2], 'utf8'));
const replaced = (process.argv.find(a => a.startsWith('--replace-regions=')) ?? '').split('=')[1]?.split(',') ?? [];
const others = process.argv.includes('--alone') ? [] : [...SEEDS_EUROPE(), ...SEEDS_WORLD_EXTRA()].filter(x => !rows.some(r => r.id === x.id) && !replaced.includes(x.region));
let bad = 0;
const ids = new Set<string>();
for (const r of rows) {
  const where = `${r.id} (${r.lon}, ${r.lat})`;
  if (ids.has(r.id)) { console.log('DUPLICATE id', r.id); bad++; } ids.add(r.id);
  if ([r.id, r.name, r.owner, r.good, r.region].some(x => !x) || isNaN(r.lon) || isNaN(r.lat) || isNaN(r.dev) || isNaN(r.fort)) { console.log('MALFORMED', JSON.stringify(r)); bad++; continue; }
  if (!GOODS[r.good]) { console.log('UNKNOWN good', r.good, 'in', r.id); bad++; }
  if (r.dev < 1 || r.dev > 8 || r.fort < 0 || r.fort > 3) { console.log('RANGE dev 1-8, fort 0-3:', r.id); bad++; }
  if (!onLand([r.lon, r.lat])) {
    let near = 99;
    for (let d = 0.05; d <= 1.2 && near === 99; d += 0.05) for (let a = 0; a < 360; a += 20) if (onLand([r.lon + d * Math.cos(a * Math.PI / 180), r.lat + d * Math.sin(a * Math.PI / 180)])) { near = d; break; }
    console.log(`SEA ${where}${near < 99 ? `: land ${near.toFixed(2)}° away (ok if <0.3)` : ': no land within 1.2°'}`);
    if (near >= 0.3) bad++;
  }
  for (const o of [...rows, ...others]) {
    if (o.id === r.id) continue;
    const d = Math.hypot((o.lon - r.lon) * Math.cos(r.lat * Math.PI / 180), o.lat - r.lat);
    if (d < 0.45 && r.id < o.id) { console.log(`CLOSE ${r.id} and ${o.id}: ${d.toFixed(2)}° apart (min 0.45)`); bad++; }
  }
}
const own: Record<string, number> = {}; for (const r of rows) own[r.owner] = (own[r.owner] ?? 0) + 1;
console.log(`${rows.length} rows, ${bad} problems. By owner:`, Object.entries(own).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
