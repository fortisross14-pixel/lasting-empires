import { getGeo } from '../src/engine/map';
const g = getGeo();
for (const id of Object.keys(g.adj)) console.log(id.padEnd(12), g.coastal[id] ? 'C' : ' ', g.adj[id].join(','), ' | sea:', g.sea[id].join(','));
