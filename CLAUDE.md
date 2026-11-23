# Notes for working on this repo

- Saves and all persistent data (slots, missions done, unlocks, custom missions, settings) go through
  `src/ui/storage.ts` (IndexedDB, localStorage only as fallback). Never call localStorage directly: all the
  owner's games share the fortisross14-pixel.github.io origin and its ~5 MB localStorage is usually full.
  This is the preferred solution for storage. Keys keep the `lasting-empires.` prefix (only those are migrated).
- `initStorage()` is awaited in `src/main.ts` before `boot`. Run `npm test`, `npm run typecheck`, `npm run build` (and `npm run smoke`)
  before committing; the build rewrites the root `index.html` and `sw.js` that GitHub Pages serves, so commit them.
