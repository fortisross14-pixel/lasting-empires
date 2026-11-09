# Lasting Empires

A card-driven grand strategy game for tablets. Lead Castile, Portugal or Aragon from 1453 to 1750, one year per turn.

## Play

```
npm install
npm run build        # writes dist/index.html (standalone) and dist/lasting-empires.html
```

Open `dist/index.html` in any browser. The game saves automatically in the browser.

## How it plays

- **Everything is a card.** Troops, equipment, characters, hand cards (decrees, intrigues, fortunes) and history events.
- **Missions.** Characters carry out missions over several years:
  - *Generals*: conquer or raid enemy provinces with troop cards (up to skill + 3 troops).
  - *Diplomats*: embassies, trade treaties, alliances, royal marriages, peace talks. Each has a success chance, and a hidden twist card may flip.
  - *Administrators*: research, construction, development, tax collection, royal progress.
- **Drafting.** Levy and professional drafts reveal three face-down cards; you keep one.
- **Forging.** Merge cards into better troops: Levy + Long Pikes → Pikemen, Pikemen + Arquebusiers → Tercio, Tercio + Muskets → Tercio Viejo. Two identical troops merge into a veteran (+1 star). Research unlocks recipes.
- **Battles.** Three rounds. Each round both sides play a tactic face-down, then flip. A countered tactic does nothing and its side takes 25% more damage.
- **History deck.** Real events (Fall of Constantinople, Columbus, the Reformation...) come due in time windows, with outcomes that can branch into alternate history.
- **Score.** Prestige + 2 × development at 1750, plus a secret Ambition chosen at the start.

## Code

- `src/data`: map, nations, troops and recipes, research, characters.
- `src/engine`: pure game rules (seeded RNG, no DOM). `turn.ts` runs a year; `ai.ts` runs rival nations.
- `src/ui`: map, cards, panels and modals.
- `scripts/sim.ts`: headless bot that plays full campaigns, for balance and crash testing.

## GitHub Pages

`npm run build` also writes `index.html` at the repo root. In the repo's Settings → Pages, choose **Deploy from a branch**, branch `main`, folder `/ (root)`. Rebuild and commit `index.html` after code changes.
