---
name: game-design
description: Game design rules for Lasting Empires. Use when adding or changing any mechanic (cards, missions, outcomes, economy, AI, events, core cards) so new systems fit the existing design and stay testable.
---

# Lasting Empires — game design rules

## Pillars
1. **Everything is a card.** Every player action is spent from a card. New actions get a card definition in `src/engine/cards.ts` (category, kind, weight function). Never add a free button that bypasses cards, except declaring war and dismissing/disbanding.
2. **People decide quality.** A mission card needs a person of the right role. The person's **rarity** (Common → Legendary) sets the outcome odds (`OUTCOME_ODDS` in `src/data/characters.ts`) and trait strength (`traitMult`). New missions must roll an outcome with `rollOutcome` (or `rollBest` when a core card grants advantage) and scale their result by it. Show the outcome with `outcomeItem` in the reveal.
3. **Surprises are revealed, not hidden.** Results arrive as face-down cards that flip (`push(s, { kind: 'reveal', ... })`). History events are known in advance (timeline) but their outcomes branch.
4. **Middle by default.** Core cards (`src/data/core.ts`) move the realm off the centre of an axis. Every core card has real pros and cons.
5. **Three currencies, kept distinct.** Manpower = 1 per troop or person hired. Nation points = buying cards and core cards. Ducats = upkeep, salaries, imports, construction.

## Where things live
- Data only: `src/data/*` (no logic beyond small pure helpers).
- Rules: `src/engine/*` — pure functions on `GameState`, seeded RNG via `rand(s)`. Never use `Math.random` in the engine (except picking a seed in `newGame`).
- UI: `src/ui/*` — reads state, calls engine functions, never mutates state directly except through engine calls.
- New saved fields must be added to `GameState` in `src/types.ts`, initialised in `newGame`, and filled in by `migrate()` in `src/engine/turn.ts` so old saves keep working.

## Card rates
- Each category draws `1 + bonuses` cards a year; fractions carry over (`cardAccum`). Add bonuses through `cardRates` parts (buildings, research, monarch, cities, goods, core cards) so the breakdown stays visible to the player.
- Hand limit is 6 per category; `addCard` respects it unless forced (burdens).

## Balance workflow
- Run `npm run sim` (headless bot plays 9 full campaigns, 1453–1750). It must finish with no crash.
- Watch: player rank spread, nations alive at the end, gold hoarding, hand sizes, settlement growth, veteran troops.
- Balance is tuned late; prefer adding levers (costs, weights, rates in data files) over hard-coding numbers in logic.

## Checklist for a new mechanic
1. Data in `src/data`, rules in `src/engine`, typed in `src/types.ts`, migration in `migrate()`.
2. A card (or a reason it is not card-driven).
3. Outcome roll scaled by rarity, shown in a reveal.
4. Visible in the right panel (Military, Diplomacy, Internal, Economy, Research) with the reason when blocked.
5. Bot updated in `scripts/sim.ts`; `npm run typecheck` and `npm run sim` pass.
