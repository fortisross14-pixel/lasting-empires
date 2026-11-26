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

### M3 — Map attention and search ✅
- [x] **A3.1 Pins** for agenda lines about one place (an army on the march, land held by the enemy, a province close
  to revolt or uneasy): a disc with the tier's mark (! ✦ ▾), urgent in the war colour.
- [x] **A3.2 Camera buttons** at the top right, icons only: Search, Home (the land joined to the capital and its
  frontier, without far colonies), Next danger (armies on the march, occupied land, unrest, then the border with
  enemies; each press moves on, with a count), Next army (garrisons and camps, biggest first), Mission targets.
  A game now opens framed on Home, not on everything the realm owns.
- [x] **A3.3 Search** (the button or `/`): provinces you know, realms, people, accents ignored; words that list
  things (idle, war, unrest, short, agenda) and roles (merchant, general…). Arrows and Enter on a keyboard. Pure
  `search()` in `src/engine/search.ts`, tested.
- [x] **A3.4 Keys and conventions:** / search · H home · T next danger · A next army · G mission targets · Escape goes
  back one step (as before). Written in the Rules tab under "Finding your way". "Selected army" became "Next army":
  the map has no army selection to frame.

### M4 — Try freely: preview and undo ✅
- [x] **A4.1 Preview** on the planner's last step ("If you send them"): what it costs (ducats, manpower, goods), how
  long and the season it ends, who and what is away, whether the card is used up, and what becomes harder (the
  year's last task, no other free person of that role, no companies left at home, your last card of the kind, a
  treasury below zero). It is a dry run of `launchMission` on a copy (`taskPreview` in `src/engine/preview.ts`), so
  it cannot disagree with sending; a test sends a dozen previewed tasks and compares.
- [x] **A4.2 Undo for the season:** a stack of up to 12 steps, cleared at End Turn, behind an Undo button in the top
  bar (Ctrl+Z or U). Undoable: sending a task (unless the game answers at once), moving troops, a workshop order,
  closing a route, recalling a task, selling or discarding cards, disbanding, dismissing. Anything that reveals
  something (drawing or buying cards, an outcome, a question, war) cannot be undone and drops the stack, checked by
  a fingerprint of the game after each step.

### M5 — Less friction in the middle game ✅
- [x] **A5.1 Do it again.** Tasks worth repeating (relations, development, conversion, assimilation, the arts,
  pilgrimages, voyages, patronage) and trade routes cut by war or a fallen realm are remembered (`s.redo`, the
  last 6). When the card and a free person are at hand, the agenda offers "Again: …" or "Reopen: …" (two at most),
  and the planner opens filled in; a cut route goes to the best partner still open. `src/engine/routine.ts`.
- [x] **A5.2 Several at once.** Moving several companies already worked; each garrison now has Select all and Call all
  here (every free company elsewhere marches to it, one step that Undo takes back). Selling several cards already
  worked.
- [x] **A5.3 The chancellor's routines** (per campaign, off by default, Menu → Settings): keep the scholars studying
  (the quickest open study in the card's field), help the current study, reopen cut routes. They play the player's
  own cards through `launchMission`, use the year's tasks, are told at the start of the season and each is an Undo
  step; skip-ahead keeps them going in quiet seasons. Save version 5 (`s.redo`, `s.routines`).
- [x] **A5.4 Measure.** `npm test` plays Venice for ten years with every routine on and prints how many tasks the
  chancellor started (3 in that run: the bot holds few study cards). A clicks-per-year count of a human-style
  player is still to do; the sim's bot does not tap, so it cannot measure it.

### M6 — Decisions that land, and rivals with an aim ✅
- [x] **A6.1 After-action payoff.** Every task ending is wrapped by `withStory` (`src/engine/story.ts`): the realm and the
  task's target are measured before and after, and each result it shows carries the story. On screen (`src/ui/story.ts`):
  the map moves to the place and rings it (with the change in a few words unless the map already floats it), then the
  result opens with "Because you sent Juan Osorio to develop Toledo in Spring 1451." and **What changed** (▴ ▾ ◆, never
  colour alone; "Nothing that can be counted changed" when nothing did), and **See it on the map**. Battles name the
  decision that began them and ring their place when you continue. Tasks now keep when they were sent (`since`).
- [x] **A6.2 The world's ambitions.** Diplomacy → **Ambitions**: the eight greatest realms (and any that wants your
  land), one or two plain lines each: who it seeks, its wars, its empire overseas, whether it is rising. A great power's
  aims are plain; a smaller realm's only when known. A great power that wants your land is a `risk` on the agenda.
  The year's report adds **The world this year** (what the great powers did) with a link to Ambitions.
- [x] **A6.3 Sound:** a quill as a good result's place rings, a knock for a bad one; the palette is unchanged.

### M7 — Campaign arc ✅
- [x] **A7.1 An ambition always in view.** The open game already began with a choice of three ambitions shown in the
  goal bar; now, when one is fulfilled or fails, the next is chosen at once (`offerAmbition` in `src/engine/arc.ts`).
- [x] **A7.2 Turning points.** Every new age asks: keep the ambition, or reach for a grander one: An Empire, First
  Among the Powers, A Realm of Learning, Mistress of the Seas, An Empire Overseas, A Realm of Cities, King of Kings,
  Undying Glory. They are chosen by how far the realm already is (`fit`, shown as "33% of the way"), not by dice.
  Every ambition held is kept with how it ended (`s.ambitions`). Mission games keep their mission as the only goal.
- [x] **A7.3 The chronicle of the reign.** Land won or lost (tasks and battles), treaties, trade posts, studies,
  growing towns and great prestige are kept as moments with their "Because you sent …" (`s.reign`). The end of a game
  opens on **The reign in brief** (the realm then and now, the ambitions ✓ ✕ –, the choices that decided it) with
  **Share the chronicle**; the same section heads the realm's history, and the shared picture carries it. Save
  version 6.
- [x] **A7.4 A different kind of decision.** Diplomatic tasks can be sweetened with a gift (10 / 25 / 50 ducats in
  today's prices for +5 / +10 / +15%): the odds move live as you choose, a gift that would add nothing (odds at their
  cap) is refused with the reason, and the preview counts it. A negotiation table with live acceptance and a route
  choice for explorers remain ideas for later.

### M8 — One visual language and accessibility ✅
- [x] **A8.1 Emphasis levels** (the M8 block at the end of `src/styles.css`, written into the `gui-styles` skill):
  urgent and danger in the war red (`--wax`); actionable in a deep green (`--act`): primary buttons, End Turn, the
  Cards button, what is selected; reference in ink (headings, resource icons, counts, costs); unavailable faded. Red no
  longer marks a plain "go" button or a heading. Playable-card dots on the deck tabs are gold (an opportunity).
- [x] **A8.2 The Military window:** the Army and Wars tabs open on **Decide now** (or **Worth doing now**): the
  military lines of the agenda, large, each a jump. Below, the inventory is reference: a long list of garrisons folds
  to its headers (the capital and any garrison with a selected company stay open).
- [x] **A8.3 Settings:** Interface size (100 / 112 / 125%: windows, dialogs, panels, agenda and camera as a whole),
  Spacing (comfortable / compact), High contrast, and Patterns on the map (wars hatched, allies dotted, subjects ringed,
  as well as coloured). The smoke test runs the largest settings at 390 px with no sideways scroll.
- [x] **A8.4 Title illustration:** toned toward the game's engraved, washed look in CSS (sepia wash, fewer colours,
  engraving lines, a paper edge). A real redraw is briefed with sizes, palette and a prompt in `docs/art-brief.md`.

## What is left

- **A new title painting** (A8.4): the brief is written; the picture needs an artist or an image model and a hand
  retouch. The CSS treatment carries it until then.
- **A clicks-per-year measure** (A5.4): the simulator's bot does not tap, so taps saved by the routines and the agenda
  are not measured; it needs a scripted human-style player in the smoke test.
- **More decision shapes** (A7.4): a negotiation table with live acceptance in diplomacy, and a route choice for
  explorers. The gift is the first of these.
- **Balance with the arc** (M7): measured once against main on 21 campaigns, no change needed; watch it when the score
  formula is next tuned (`docs/BALANCE.md`).
- **The rest of the roadmap** (`docs/ROADMAP.md`): Phase 6, shipping (store wrappers, achievements in Game Center and
  Play Games), was outside this plan.

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
