# Notes for working on this repo

- Saves and all persistent data (slots, missions done, unlocks, custom missions, settings) go through
  `src/ui/storage.ts` (IndexedDB, localStorage only as fallback). Never call localStorage directly: all the
  owner's games share the fortisross14-pixel.github.io origin and its ~5 MB localStorage is usually full.
  This is the preferred solution for storage. Keys keep the `lasting-empires.` prefix (only those are migrated).
- `initStorage()` is awaited in `src/main.ts` before `boot`. Run `npm test`, `npm run typecheck`, `npm run build` (and `npm run smoke`)
  before committing; the build rewrites the root `index.html` and `sw.js` that GitHub Pages serves, so commit them.
- **Main is the only branch that matters.** Every change ends on `main`; GitHub Pages deploys from Actions
  (`.github/workflows/pages.yml`) on each push to main: it type-checks, tests, builds, then publishes `index.html`,
  `sw.js`, the manifest and `art/`, `fonts/`, `icons/`, `sound/`. A new top-level folder the game loads must be added
  to its "Stage the site" step.
- The owner plays from GitHub Pages only and does not plan a store release: push finished work to `main` without
  asking (no branch is needed) and check that the Pages deploy runs. Skip store, packaging and release work.
