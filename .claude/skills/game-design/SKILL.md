---
name: game-design
description: Game design rules for Lasting Empires. Use when adding or changing any mechanic (cards, missions, outcomes, economy, AI, events, core cards) so new systems fit the existing design and stay testable.
---

# Lasting Empires — game design rules

## Pillars
1. **Everything is a card.** Every player action is spent from a card. New actions get a card definition in `src/engine/cards.ts` (category, kind, weight function). Never add a free button that bypasses cards, except declaring war, moving troops, setting what a workshop makes, closing a trade route and dismissing/disbanding. Buttons that need a card stay visible and say which card they need.
   - **Card types** (`cardType`): People (hire someone), Actions (missions and orders), and in Military also Troops (by kind: Levy, Infantry, Ranged, Cavalry, Artillery; each hires the best unit of its kind researched, see `UNIT_LINES`) and Improvements (equipment, Drill Sergeant). Elite units come from Forge recipes.
   - **Getting cards:** free draws each quarter, or the Cards tab shop: buy a card of one type with nation points (`buyCard(s, cat, type)`: 3 shown, keep 1; a type with one card in the deck is given straight away).
   - **Permanent cards** (stay after use, the mission costs ducats): only Embassy and Peace Envoy. Everything else is used up.
   - **No hand limit**: identical cards stack. Wars give March Orders (3 to the attacker, 2 to the defender); at peace only 2 are kept.
2. **People decide quality.** A mission card needs a person of the right role. The person's **rarity** (Common → Legendary) sets the outcome odds (`OUTCOME_ODDS` in `src/data/characters.ts`) and trait strength (`traitMult`). New missions must roll an outcome with `rollOutcome` (or `rollBest` when a core card grants advantage) and scale their result by it. Show the outcome with `outcomeItem` in the reveal.
3. **Surprises are revealed, not hidden.** Results arrive as face-down cards that flip (`push(s, { kind: 'reveal', ... })`). History events are known in advance (timeline) but their outcomes branch.
4. **Middle by default.** Core cards (`src/data/core.ts`) move the realm off the centre of an axis. Every core card has real pros and cons.
5. **Three currencies, kept distinct.** Manpower = 1 per troop or person hired. Nation points = buying cards and core cards. Ducats = upkeep, salaries, imports, construction.

## Where things live
- Data only: `src/data/*` (no logic beyond small pure helpers).
- Rules: `src/engine/*` — pure functions on `GameState`, seeded RNG via `rand(s)`. Never use `Math.random` in the engine (except picking a seed in `newGame`).
- UI: `src/ui/*` — reads state, calls engine functions, never mutates state directly except through engine calls.
- New saved fields must be added to `GameState` in `src/types.ts`, initialised in `newGame`, and filled in by `migrate()` in `src/engine/turn.ts` so old saves keep working.

## Systems map
- Navy: `src/engine/navy.ts` (ships live in `s.fleet` / `nation.fleet`; ship cards have kind `ship`; hiring with a general makes an admiral). Sea battles reuse `battle.ts` with `naval: true` and a `follow` step (land attack or land defence).
- Peace and subjects: `src/engine/diplo.ts` (war score from `War.gains*` and `wins*`; terms spend score; `overlord`/`subject` on `Nation`).
- Society: `src/engine/society.ts` (province `culture`/`religion`, `happinessOf`, yearly stability drift; `s.art`, `s.taxBurden`, `s.accepted`).

## Research
- Technologies live in `TECHS` (`src/data/techs.ts`), about 4 per field per age, each with `age`, `cost` and plain effects `fx` (income, army, battle, research, control, happiness, routes, card rates…) added up by `techFx(s, key)`. Prefer a new `fx` key over a one-off `hasTech` check. No research beyond the current age (`missionBlocked`).
- Buildings list their benefits in `gives`; the build screen shows Cost (ducats, materials, time, upkeep) beside Benefit. Unresearched buildings are not offered.

## Card rates
- Six decks: Military, Diplomacy, Internal, Economy, Research, People (`culture`). Each draws `0.5 + bonuses` cards a year (capped at 1.4); fractions carry over (`cardAccum`). Add bonuses through `cardRates` parts (buildings, research, monarch, cities, core cards) so the breakdown stays visible to the player.
- There is no hand limit (`handLimit` returns Infinity; the old limit only for balance tests). The yearly mission cap, army size and building slots are the limits.

## Balance workflow
See `docs/BALANCE.md` for targets, current results and every lever. Run `MODE=reasonable|passive|greedy|big SEEDS=5 npm run sim` and compare against the targets table before and after any change.

- Run `npm run sim` (headless bot plays 9 full campaigns, 1453–1750). It must finish with no crash.
- Watch: player rank spread, nations alive at the end, gold hoarding, hand sizes, settlement growth, veteran troops.
- Balance is tuned late; prefer adding levers (costs, weights, rates in data files) over hard-coding numbers in logic.

## Related skills
- `game-design-principles`: general theory (core loop, player motivation, flow, pacing). Check new mechanics against the 30-second loop and the reward schedules there.
- `web-games`: browser constraints (pause when the tab is hidden, audio after the first tap, small startup payload).

## Checklist for a new mechanic
1. Data in `src/data`, rules in `src/engine`, typed in `src/types.ts`, migration in `migrate()`.
2. A card (or a reason it is not card-driven).
3. Outcome roll scaled by rarity, shown in a reveal.
4. Visible in the right panel (Military, Diplomacy, Internal, Economy, Research) with the reason when blocked.
5. Bot updated in `scripts/sim.ts`; `npm run typecheck` and `npm run sim` pass.
