# Lasting Empires — Plan: from toolbox to a game that directs desire

Written 25 November 2026 in answer to the playtest review ("What should I do now, what matters most, and what
will happen if I do it?"). It sits beside [ROADMAP.md](ROADMAP.md): the roadmap is the plan of record for the whole
game, and this file orders the review's points into milestones. Tick an action here in the commit that finishes it.

## The diagnosis in one line

The game has the systems; it does not yet **surface the few decisions that matter right now**. Every milestone
below either points the player at a consequential choice, makes that choice cheaper to try, or makes its result
land harder. None of them adds a new simulation (ROADMAP rule 1).

## What already exists (so we build on it, not beside it)

| Review point | What the code has today | Gap |
|---|---|---|
| "What needs me?" | `attention(s)` in `src/engine/pace.ts`: ready cards, idle people, shortages, unrest. End Turn badge counts it; a "Still to do" list (off by default) | No tiers (an invasion and a housekeeping card weigh the same); no threats, debts or occupations; nothing on screen until End Turn; jumps go to a window tab, not to the decision |
| Choose defenders | `showIncoming` prompt when an army marches | Once dismissed it cannot be reopened |
| Undo | `offerUndo` (6-second strip after a task is sent) | No preview before committing; nothing for other actions |
| Sound | `sound.ts` (paper, wax, quill, coin, drum, bell, lute) and `music.ts` | Exists: the review missed it. Only tune coverage (M6) |
| Rival agenda | `goalOf`, `attitude`, `deed`, war warnings in `rivals.ts` | Not visible on the map or in one place |
| Text size | 100 / 115 / 130 % setting | No UI scale, contrast, colour-blind map overlays, density |

## Milestones

### M1 — Empire Agenda and an End Turn that says why ✅
The highest-return change: navigation, pacing, onboarding and perceived intelligence at once.
- [x] **A1.1 Tiers.** Every `Attention` gets a `tier`: `urgent` (this season: an army on the march, a province
  about to rise, an enemy holding your land, a hand over the limit), `opportunity` (a card someone can carry now,
  a free person), `risk` (a rival gathering on the border, low happiness, a shortage, a treasury running dry),
  `long` (research and goals under way: agenda only, never nags).
- [x] **A1.2 New rules** in `attention`: incoming attacks, war warnings, provinces occupied by an enemy, hand over
  the limit, treasury running dry, uneasy provinces (25–35 %). `agenda(s)` adds the long-term lines and sorts.
- [x] **A1.3 Direct jumps.** Each line carries a `jump`: a province (map frames it and opens its panel), a realm,
  a deck tab, the exact card (opens the card's page), or the defence planner for an incoming army (now reopenable,
  with the earlier choice kept and changeable).
- [x] **A1.4 The Agenda panel** over the map: the top five lines, tier mark + title + one line, a tap to go.
  Folds to one pill ("Agenda · 1 urgent"); open by default on wide screens, folded on phones.
- [x] **A1.5 End Turn.** The badge counts urgent things in the war colour, otherwise everything in ink. A new urgent
  thing always stops End Turn once (even with reminders off); the reminder list is grouped by tier.
- [x] **A1.6 Tests** in `scripts/test.ts` for tiers, the new rules and that long-term lines never nag; a smoke step.

### M2 — Title screen: play first, learn second ✅
- [x] **A2.1** Primary actions: **Continue** and **Start a realm** (realm, date, difficulty, length in the picker).
  Secondary, as three tiles under "Learn and challenge": Learn the game · Historic challenges · Test a battle.
- [x] **A2.2** Unlocks became laurels (`laurels()`: course done, historic and wild won), shown on the tiles and the
  missions screen; nothing playable is locked. The "Unlock everything" button is gone with the locks.
- [x] **A2.3** Smoke: a first-time profile (the smoke no longer unlocks anything) reaches a realm game in two taps,
  and no mission shows a lock. A first launch turns the chancellor's notes on.

### M3 — Map attention and search
- [ ] **A3.1 Pins** for agenda items with a place: threat (war colour), opportunity (gold), risk (ink). Reuse
  `setGoalPins`' layer.
- [ ] **A3.2 Camera buttons:** Home (capital and core), Current threat, Selected army, Mission target. Open the
  game framed on home and its frontier, not the sea.
- [ ] **A3.3 Command palette** (`/` or a search button): provinces, realms, people by name; queries "idle",
  "short", "unrest", "war". Pure search in `src/engine/search.ts`, tested.
- [ ] **A3.4 Back/close conventions:** one Back on every page, Escape closes the top layer, a "map" key returns
  to the map; listed in the Rules tab.

### M4 — Try freely: preview and undo
- [ ] **A4.1 Action preview** on the planner's last step: cost, time, who is occupied, outcome odds by rarity,
  what becomes unavailable (yearly task cap, the person, the card).
- [ ] **A4.2 Undo for the season** for deterministic actions (moving troops, workshop orders, sending a task
  before the next reveal): a stack cleared at End Turn, replacing the 6-second strip.

### M5 — Less friction in the middle game
- [ ] **A5.1** Repeat a trade arrangement / renew a route in one tap.
- [ ] **A5.2** Multi-select and bulk assignment (move several companies, send several merchants).
- [ ] **A5.3** Optional automation for chores: the steward exists for goods; extend to routine builds and
  idle researchers assisting the current study (opt-in, listed, reversible).
- [ ] **A5.4** Measure: clicks per in-game year in the sim's scripted player, before and after.

### M6 — Decisions that land, and rivals with an aim
- [ ] **A6.1 After-action payoff:** for battles won, provinces taken, routes opened, studies finished: a map flash on
  the place, a short chronicle card with "Because you …", then the reveal.
- [ ] **A6.2 Rival agenda:** a "The world's ambitions" list (from `goalOf` / `attitude`): "France seeks Lombardy",
  "Portugal is colonising"; one line per great power on the map in the Realms view, and in the agenda as `risk`
  when it touches you.
- [ ] **A6.3 Sound coverage:** quiet cues for agenda open, jump, pin; nothing new in the palette.

### M7 — Campaign arc
- [ ] **A7.1** A personal ambition chosen at the start of an open game (from `AMBITIONS`), always in the goal bar.
- [ ] **A7.2** A mid-game pivot: at the second age, a choice of a new ambition that builds on the realm's state.
- [ ] **A7.3** A final chronicle: an illustrated summary of the reign's decisive choices (from `chronicle.ts`'
  weights), shareable (`share.ts`).
- [ ] **A7.4** More distinct decision shapes: battles (reserve, withdrawal) are one; add a negotiation table in
  diplomacy (offer/ask with live acceptance) and a route choice in exploration, keeping the card as the entry.

### M8 — One visual language and accessibility
- [ ] **A8.1 Emphasis levels:** urgent (war colour, solid), actionable (gold), reference (quiet ink, denser),
  unavailable (folded "not yet" group). Red only for danger and war; primary affirmative buttons in gold/green.
- [ ] **A8.2** Military window: the current decision large, inventory dense and collapsible.
- [ ] **A8.3 Settings:** UI scale, high contrast, colour-blind-safe map overlays (patterns as well as hues),
  compact/comfortable density.
- [ ] **A8.4** Title illustration redrawn toward the engraved/watercolour in-game style (art brief in
  `docs/art-brief.md`).

## Order and why

M1 first: it is the review's own first recommendation and makes every later milestone more visible (pins, palette
and preview all hang off agenda lines). M2 is small and removes the "locked" first impression. M3–M4 make the map
and the planner cheap to use; M5 matters once a realm is large; M6–M7 give the game its story; M8 runs last as one
pass so colours and emphasis are decided once, with all the new screens in place.

## How we know it worked
- Every agenda line jumps to a screen where the action can be taken (smoke test opens each).
- In a fresh Castile 1451 game, the agenda shows at least one opportunity on turn one; an invasion is always urgent.
- Long-term lines never stop End Turn or skip-ahead (`npm test`).
- No sideways scroll and no page error at 390×844 and 1180×820 (`npm run smoke`).
- The map screen stays a map: about 40–50 words with the agenda open (a soft limit; the smoke test fails above 50).
