import { readFileSync } from 'node:fs';
import { feature } from 'topojson-client';
const topo = JSON.parse(readFileSync('node_modules/world-atlas/land-50m.json', 'utf8'));
const geo: any = feature(topo, topo.objects.land);
console.log(geo.type, geo.features?.length, geo.geometry?.type);
const g = geo.features ? geo.features[0].geometry : geo.geometry;
const list = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
console.log(list.length);
const big = list.map((p:any)=>p[0].length).sort((a:number,b:number)=>b-a).slice(0,5); console.log(big);
