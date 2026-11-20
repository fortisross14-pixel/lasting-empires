# Lasting Empires — Roadmap

Written November 2026, after the market audit in [AUDIT.md](AUDIT.md). This file is the plan of record:
each action has an id, says what changes, where in the code, and how we know it is done.
Tick an action off here in the same commit that finishes it.

## 1. What we are building

A **premium indie game for tablets and phones** (one price, no ads, no purchases inside the game) that gives
some of the depth of Europa Universalis, Crusader Kings, Total War and Victoria 3 in a casual, touch-first shape.
We do not compete with those games on their ground.

| | The PC giants | Lasting Empires |
|---|---|---|
| Session | 2–6 hours at a desk | 10–20 minutes, one hand, interruptible |
| A full game | 20–60 hours | A mission of 60–120 minutes; an open game of 1–8 hours by choice |
| Depth comes from | Many interlocking simulations | Few decisions with real consequences: a card, a person, an outcome |
| The player reads | Tooltips, ledgers, map modes | The map, a card face, one line of reasons |
| Opponents | Symmetric simulation | Readable rivals with a character and a plan |

Reference games, and what we take from each:

- **Mobile and premium indie:** The Battle of Polytopia (session length, clarity), Slay the Spire (the feel of
  drawing and playing a card), Six Ages and King of Dragon Pass (events that remember what you did), Through the
  Ages (a heavy board game made comfortable on a phone), Suzerain (characters you care about).
- **PC grand strategy:** Europa Universalis IV (the map, missions, diplomacy), Crusader Kings III (people as the
  source of stories), Total War (battles as a spectacle), Victoria 3 (an economy that explains itself).

### Rules for every action below

1. **No new system before Phase 4.** The game already has more systems than a touch screen can show. Phases 1–3
   pace, polish and give a voice to what exists.
2. **Every action must be testable.** Engine changes by `npm test` or `npm run sim`; screens by Playwright at
   1180×820 and 390×844 (see the `gui-styles` skill).
3. **Levers live in data files**, never as numbers inside logic.
4. **The five pillars stay** (see the `game-design` skill): everything is a card, people decide quality, surprises
   are revealed, middle by default, three currencies.

## 2. Where the game stands (measured)

| Fact | Value | Source |
|---|---|---|
| Turns in a 1451–1750 campaign | 1,200 (one turn is a quarter) | `endTurn` in `src/engine/turn.ts` |
| Turns that bring no card and no prompt | 33–43% (Portugal 33%, Venice 43%), up to 5 in a row | scripted run, seed 4242 |
| Cards drawn | about 0.73 a turn | same run |
| Events | 77, of which 53 dated: 20 before 1500, 7 in 1500–49, 4 in 1550–99, 6 in 1600–49, 6 in 1650–99, 10 after 1700 | `src/engine/events.ts` |
| Event chains (a choice that comes back) | 0 | same |
| Realms with historical rulers | 30 of 216 | `RULERS` in `src/data/nations.ts` |
| Character events | 0: people have rarity, traits and a hidden year of death, nothing else | `Character` in `src/types.ts` |
| Battle decisions | 1 a round (a tactic), 3 rounds, 6 land tactics, 4 at sea | `src/engine/battle.ts` |
| AI | 396 lines; no cards, people or buildings; develops on a dice roll; declares war on the player at most once every 30 years | `src/engine/ai.ts` |
| Difficulty levels | none before this roadmap | — |
| Sound | none | no audio code in `src/` |
| Painted art | 96 tiles (58 cards, 13 roles, 25 units); events and people use line icons or one face per role | `art/`, `src/ui/art.ts` |
| Map | 1,038 straight-edged Voronoi cells with flat fills | `scripts/gen-world.ts`, `src/ui/map.ts` |
| Fonts | 10 families fetched from Google at start; the one remaining style uses 3 | `scripts/build.mjs`, `src/styles.css` |
| UI code | one file of 2,857 lines and 232 KB with shared module state (split into 16 modules in Phase 1) | `src/ui/` |
| Automated checks | none before this roadmap (the bot simulation was run by hand) | — |
| Idle reminders, undo, settings, save export | none before this roadmap | — |

## 3. Targets

| Area | Target | How it is measured |
|---|---|---|
| Pace | The player never presses End Turn twice in a row with nothing new | `quietRun` in `npm test` stays 0 when skip-ahead is used |
| Session | A beginner mission 10–15 min; a historic mission 60–120 min; an open game "Reign" 60–90 min | playtest timing (Phase 5) |
| Difficulty | The reasonable bot finishes top 3 in about 80% of games on Gentle, 55–65% on Standard, 30–40% on Hard | `DIFF=0|1|2 npm run sim` |
| Story | At least one event a year on average; 8 or more dated events in every half century; 10 chains | counts in `npm test` |
| Opponents | Every realm of 5+ provinces shows a character and a goal the player can read | nation sheet |
| Feel | Sound on every card, reveal and battle; map borders no longer straight | screens and ears |
| Stability | `npm test` and the simulation pass on every push | GitHub Actions |
| Performance | Start under 2 s and map pan at 50 fps or more on a mid-range phone | Phase 5 device tests |

## 4. Phases at a glance

| Phase | Name | Goal | Size (one developer) |
|---|---|---|---|
| 1 | Pace and foundations | No empty turns, a difficulty to choose, a game length to choose, checks on every push | 4–6 weeks |
| 2 | Feel | The map, sound, motion and navigation of a premium game | 6–8 weeks |
| 3 | Story | People with lives, events that remember, a chronicle worth sharing | 8–10 weeks |
| 4 | Opponents and battles | Rivals with plans the player can read; battles with three real choices | 6–8 weeks |
| 5 | Ship | Store builds, saves that travel, languages, playtests, balance on real data | 4–6 weeks |

Order matters: Phase 1 makes the game comfortable to play for an hour, which every later playtest depends on.
Phase 2 comes before content because sound and the map change how every event and battle is judged.

---

## Phase 1 — Pace and foundations

Status: **done** (November 2026).

| Id | Action | Where | Done when | Status |
|---|---|---|---|---|
| 1.1 | **Skip ahead.** A second button beside End Turn plays quarters until something needs the player, at most 8 at a time. It stops when: a prompt is waiting (event, battle, attack, peace, succession); a card was drawn; a task finished; a war started; the hand is over its limit; the year turned in a year with battles. One line then says what passed ("3 seasons · +62 ducats · 1 Economy card"). | `src/engine/pace.ts` (`stopReasons`), `onSkipAhead` in `src/ui/endturn.ts` | With skip-ahead the scripted run never ends a turn with nothing new; the button is 44 px on a phone | ☑ |
| 1.2 | **Things to do.** Before the turn ends the game lists what is still open, each row opening the right screen: a card in hand that a free person could carry out now (one line per deck; Embassy and Peace Envoy never count, they are always there); a free administrator, merchant, scholar or courtier with nothing to carry while a new card is affordable; a need more than 20% unmet; provinces under 25% happiness. End Turn shows the count. The list appears only for things not shown before, never blocks a second press, and stays silent during the tutorial and guided missions. | `attention()` and `cardHasTarget()` in `src/engine/pace.ts`; `readyToEnd`, `showAttention` in `src/ui/endturn.ts` | Each rule has a check in `npm test`; a setting turns the list off; computing it takes about 2 ms on the largest realms | ☑ |
| 1.3 | **Deck dots.** A bottom tab shows a dot when that deck holds a card that a free person could carry now. | `renderTabs` | Dot appears and clears as people leave and return | ☑ |
| 1.4 | **Three difficulties**: Gentle, Standard, Hard, chosen when a game or mission starts and shown in the Menu. Levers, all in one table: how much stronger a rival must be to declare war on you (×1.6 / ×1.25 / ×1.0), years between such wars (45 / 30 / 12), years of peace at the start (15 / 10 / 5), mercy for a crown of three provinces or fewer (90% / 70% / 30%), starting treasure (×1.5 / ×1 / ×0.8), rival growth (×0.8 / ×1 / ×1.3), rival army size (−1 / 0 / +2). | `src/data/difficulty.ts`, `diff()` in `src/engine/core.ts`, read in `src/engine/ai.ts` and `newGame` | `DIFF=0|1|2 npm run sim` runs; Standard gives the same results as before | ☑ |
| 1.5 | **Game length for the open game**: A reign (40 years, about 160 turns), A century (100 years), The whole age (to the end date). Missions keep their own deadline. | realm picker in `src/ui/title.ts`; `newGame(..., opts)` | The end screen arrives in the chosen year | ☑ |
| 1.6 | **Settings** in the Menu: warn before ending a turn with things to do (on), show the skip-ahead button (on), reduced motion (follows the device, can be forced). Stored per device. Sound and text size join in Phase 2. | `src/ui/settings.ts` | Each setting survives a reload | ☑ |
| 1.7 | **Tests.** `npm test` runs the engine without a browser: same seed gives the same game; a save survives `JSON` and `migrate`; 12 realms × 3 start dates play 40 turns with no error; every beginner mission's cards exist; pace and difficulty rules. | `scripts/test.ts` | Runs in under a minute | ☑ |
| 1.8 | **Checks on every push**: typecheck, tests, build, and one short simulation. | `.github/workflows/ci.yml` | A red cross on a broken push | ☑ |
| 1.9 | **Rules text that contradicts the game.** The tutorial says five kinds of card (there are six). README and the `game-design` skill say both "no hand limit" and describe the hand limit. | `TUTORIAL` in `src/ui/app.ts`, `README.md`, `.claude/skills/game-design/SKILL.md` | One statement of each rule | ☑ |
| 1.10 | **Royal steward for goods.** A switch in Economy → Goods, on by default on Gentle and Standard (off on Hard and in games saved before he existed). Each quarter the steward buys what a need still lacks on the open market at 1.5× the price (before, a shortage only punished), most pressing need first (food, cloth, tools, weapons, gunpowder, materials, naval stores, books, luxuries), up to a purse of 5%, 15% or 30% of what the provinces pay. A shortage reaches the player only when the purse is spent, as one line in Things to do. New workshops already choose the worst shortage (`defaultMake`). | `stewardBudget`, step 4b of `quarterFlow` in `src/engine/trade.ts`; `goodsTab` | A check covers the purse; 9 bot games with him: late income +7%, happiness 77% against 73%, early treasury lower | ☑ |
| 1.11 | **Six needs before 21 goods.** The Goods tab opens on six rows (Food, Clothing, Building, Arms, The fleet, The court), each with a bar (own supply solid, the steward's share hatched), one word (Met, Bought, Running down, Short) and a sentence only when something is wrong; a tap opens that need's goods, and all 21 are one fold further down. | `NEED_GROUPS` in `src/data/goods.ts`; `goodsTab` in `src/ui/windows/economy.ts` | Fits a 390×844 screen without scrolling | ☑ |
| 1.12 | **Split `src/ui/app.ts`**, with no change in behaviour, into 16 modules: `ui/state.ts` (the shared state, saving, small helpers), `ui/title.ts` (title, slots, missions, builder, picker), `ui/app.ts` (the game screen and `refresh`), `ui/windows/` (`frame`, `cards` and one file per deck), `ui/sheets.ts`, `ui/modal.ts`, `ui/planner.ts`, `ui/endturn.ts`, `ui/prompts.ts`. Shared state is imported read-only and changed through setters in `state.ts`. Done by a script on the syntax tree, not by hand. | `src/ui/` | No file over 800 lines (the largest is 475); `npm run smoke` passes at both sizes | ☑ |
| 1.13 | **A smoke test with a real path.** `npm run smoke` drives the built game at 1180×820 and 390×844 through every deck window and tab, the side panels, the menu, a card, turns, skip-ahead, the missions screens and the battle test; it fails on any page error or sideways scroll and writes its screenshots to `docs/screens/` (not kept in git). The 18 stale screenshots in the folder named `undefined/` are removed. | `scripts/smoke.cjs` | No `undefined/` folder; the smoke test passes | ☑ |
| 1.14 | **Saves that can be trusted.** A numbered list replaces field-by-field patching: `MIGRATIONS[n]` moves a save from version n to n+1, `migrate` runs the steps in order and refuses a save from a newer game. `npm run make-save` stores a compressed save of the current version before the version is raised; `npm test` loads every stored save through all later steps and plays it on. | `MIGRATIONS`, `migrate`, `canLoad` in `src/engine/turn.ts`; `scripts/saves/`, `scripts/make-save.ts` | Every stored save loads in `npm test` | ☑ |

### Phase 1 results

- **Pace:** in scripted runs of 400 turns, skip ahead cuts End Turn presses by 16–36% and never passes a card, a
  prompt or a finished task. An open game can now be 160 turns instead of 1,200.
- **Difficulty:** 12 bot games a level finish in the top three 8, 6 and 5 times (Gentle, Standard, Hard). The order
  is right, the spread narrower than the targets of section 3; tuning is action 4.13.
- **Checks:** 10 engine checks in about 20 seconds; typecheck, checks, build and a short bot campaign on every push.
- **Goods:** the steward and the six-needs view replace 21 rows of bookkeeping as the first thing the player sees.
- **Code:** the interface is 16 modules, none over 475 lines; saves migrate by numbered steps; a browser smoke test
  visits every screen at both sizes.

## Phase 2 — Feel

Status: **in progress**. Actions marked ☑ beside their id are done.

The map is on screen 80% of the time and the game is silent. These two facts decide how the game is judged in its
first minute.

### Map

| Id | Action | Where | Done when |
|---|---|---|---|
| 2.1 ☑ | **Borders that are not straight.** When the world is generated, every inland edge of a province is bent into a gentle wave of 3–9 pieces (up to 12% of the edge's length, never more than 9 map units). The wave is worked out from the edge's two end points alone, so both neighbours get the very same line and no gap opens; edges lying in the sea stay straight. The generator now also makes the split of the Norway–Siberia outline that had been patched into `world.json` by hand, so `npm run gen-world` reproduces the land data exactly. | `wobble`, `wobbleRing` in `scripts/gen-world.ts`, then `npm run gen-world` | Done. `world.json` grew from 486 to 636 KB (see 5.3) |
| 2.2 ☑ | **Two weights of line.** Realm borders 2.3 px ink (1.5 px at far zoom), drawn as one path per landmass from the points two neighbouring cells share, and redrawn only for lands where something changed; province borders inside a realm 0.7 px at 34% opacity; the coast keeps its heavy line. | `.realm-edge`, `edgeD` in `src/ui/map.ts`; `.prov` in `src/styles.css` | Done: a realm reads as one shape at world zoom |
| 2.3 ☑ | **Realm names on the map.** Below 1.3 screen pixels per map unit, province names give way to each realm's name, written once across the largest connected piece of its land, in Cormorant SC, letter-spaced, sized to the land and turned along its longer axis (never steeper than about 50°). Names that would be under 10.5 px on screen are left out until the player zooms in. | `nameRealms`, `REALM_VIEW` in `src/ui/map.ts` | Done: 44 names on a tablet at the opening view |
| 2.4 | **Paper and terrain.** One paper-grain texture under the land (a 512 px tile, not a live SVG filter, for speed) and small ink symbols by terrain: hills, mountains, forest, desert, marsh. Terrain is a new field on each province, first derived from its raw material (wood → forest, iron and coal → hills, salt and spices in dry latitudes → desert) and then corrected by hand for the 209 European provinces. | `terrain` in `src/data/provinces.ts`, `src/ui/map.ts` | Terrain visible at near zoom; pan stays above 50 fps |
| 2.5 | **A watercolour edge for the player's realm**: an inner stroke 6 px wide in the realm colour at 50%, so the player's land stands out without a darker fill. | `src/ui/map.ts` | Visible in all six map views |
| 2.6 ☑ | **A relations view**: every realm tinted by how it stands to the player (your realm, your subject, ally, friendly at 30 or more, neutral, hostile at −30 or less, at war), with a legend. | `stanceOf`, `STANCE`, `MAP_MODES` in `src/ui/map.ts` | Done: seventh entry in the map view menu |

### Sound

| Id | Action | Where | Done when |
|---|---|---|---|
| 2.7 ☑ | **A sound module** on Web Audio, unlocked by the first tap, silent when the page is hidden, with a volume in Settings (Off, Soft, Full). The music volume joins with 2.9. | `src/ui/sound.ts`, `sfx` in `Settings` | Done: no audio context exists before the first tap; switched off, a turn creates no audio nodes |
| 2.8 ☑ | **Fourteen effects**, made on the device from noise and tones, so there are no files to load or cache: a card drawn; a card played (paper slide); a card turned over; three outcome stings (great, plain, bad); the wax seal on End Turn; coins; a quill for a treaty; a drum for war; two battle clashes; the year bell; a soft knock for a blocked action. Recorded samples can replace any recipe later without touching the callers. | `RECIPES` in `src/ui/sound.ts`; calls to `sfx(...)` in `endturn.ts`, `prompts.ts`, `planner.ts`, `app.ts`, `sheets.ts`, `windows/` | Done: every one is wired to its moment; the smoke test checks the seal and the card turn are asked for |
| 2.9 | **Four pieces of music**, 60–90 seconds each, looping, chosen by the capital's part of the world: lute and viol (Europe), oud (North Africa and the Middle East), guzheng (East Asia), drums and kora (elsewhere). Loaded after the game starts; under 1.5 MB together; kept by the service worker. | `sound/`, `sw.js` list in `scripts/build.mjs` | Music changes when the capital's region differs |
| 2.10 ☑ | **A touch of haptics** (10 ms) on a card played or turned and on each battle round, where the device allows, with a switch in Settings. | `buzz` in `src/ui/sound.ts` | Done (Android browsers; iOS has no vibration API on the web, so there it waits for the store build of 5.1) |

### Motion and art

| Id | Action | Where | Done when |
|---|---|---|---|
| 2.11 | **A played card travels**: from the hand to the province or realm it targets, 250 ms, then the task appears in the strip over the map. | `openPlanner` in `src/ui/planner.ts`, `src/styles.css` | Off under reduced motion |
| 2.12 | **Outcomes have weight.** The five outcome levels get five treatments on the turned card: a gold sweep and sting for the best, plain ink for the middle, a torn corner and low note for the worst. | `showReveal`, `outcomeItem` | The level can be told without reading |
| 2.13 | **Battles show the armies.** Two facing rows of painted unit tiles (the 25 in `art/unit_*.webp`), strength bars that fall as damage lands, both tactic cards slammed down and turned together. | `showBattle` | No line icons left on the battle screen |
| 2.14 | **Twenty event paintings** for the events every campaign meets: Constantinople, the printing press, Columbus, the Cape route, Tordesillas, the Italian Wars, the Reformation, Potosí, Lepanto, the Thirty Years' War, Westphalia, Versailles, the plague, a bad harvest, a revolt, a court visitor, a great artist, tax riots, a golden age, a call to arms. Same brief as the cards (`docs/art-brief.md`). | `art/event_*.webp`, `art` field of `EventDef` | Those events open with a painting |
| 2.15 | **Faces for people.** Four portraits for each of the 13 roles (52 tiles), chosen by the person's id so the same person always has the same face, in five dress families by culture (Western, Islamic, East Asian, African, American). | `art/face_*.webp`, `src/ui/cards.ts` | Two generals at court look different |
| 2.16 | **Six age plates**: a full-width illustration when an age opens, replacing the plain year flash. | `yearFlash`, `showEra` | Shown once per age |
| 2.17 | **Title art**: one painted scene behind the title in place of three fanned cards. | `showTitle` | Under 150 KB |

### Navigation and type

| Id | Action | Where | Done when |
|---|---|---|---|
| 2.18 | **No window on top of a window.** The task planner becomes a page inside the menu window with a Back button, not a dialog over it. | `openPlanner`, `renderWin` | At most one layer above the map, plus decisions |
| 2.19 ☑ | **Undo.** Sending someone on a task can be taken back from a 6-second strip with an Undo button: the game returns to the save from just before, card and person included. The offer ends when the turn ends or anything else changes the game, and is not made when the game answered at once with something new. Playing an instant card or hiring is not undoable: those show their outcome at once. | `offerUndo`, `clearUndo` in `src/ui/app.ts`; the launch in `src/ui/planner.ts` | Done: a browser check starts a task, undoes it and finds the save as it was |
| 2.20 | **Swipe between the tabs of a window** and between the six decks. | `renderWin` | Works with one thumb at 390 px |
| 2.21 ☑ | **Fonts in the game, not from the network.** Cormorant SC and EB Garamond ship as `woff2` in `fonts/` (Latin, Latin Extended and Vietnamese subsets: 416 KB, fetched by the browser only as needed), are declared in the page itself and cached by the service worker. The eight families no style uses are gone, and the few direct uses of Alegreya now use EB Garamond. The artifact page, which may not carry files, takes the same two families from Google. | `fonts/`, `scripts/build.mjs`, `src/styles.css` | Done: with Google blocked, both families load |
| 2.22 | **Text size**: 100%, 115%, 130% in Settings; card names never under 13 px on a phone (12 px today). | `--k` scale in `src/styles.css` | No clipped text at 130% on 390 px |
| 2.23 | **Colour is never the only signal.** Good and bad outcomes carry an icon as well as a colour; realm colours are checked for the common forms of colour blindness and the 10 closest pairs changed. | `src/data/nations.ts`, `infoCard` | Checked with a simulator |

## Phase 3 — Story

Crusader Kings makes stories from people. Lasting Empires already has the people: they only need lives.

### People

| Id | Action | Where | Done when |
|---|---|---|---|
| 3.1 | **Three new facts about each person**: loyalty (0–100), one wish (a title, gold, glory, the faith, family, or rest) and, sometimes, a rival or a friend at court. Loyalty moves with tasks given, results, pay and events. | `Character` in `src/types.ts`, `genCharacter`, `migrate` | Shown on the person's card |
| 3.2 | **Twelve court events**, at most one a year, each with a choice that changes loyalty or the court: the general asks for a title after three victories; a foreign bribe reaches a disloyal diplomat; two rivals demand you choose; the scholar asks leave to travel (gone 2 years, returns better or not at all); the merchant is caught skimming; deathbed advice (the dying pass one trait to a colleague you choose); a marriage for your general; the artist wants freedom from commissions; a preacher denounces the court; the favourite (one rises, the others resent it); a deserter (a disloyal general joins your enemy and meets you in battle by name); the hero's return (a triumph costs ducats, lifts happiness). | new `src/engine/court.ts`, fired from `rollEvents` | Each fires in a scripted test |
| 3.3 | **Enemy commanders with names.** Every rival of 8+ provinces keeps one named general with a trait, who is the one you meet (today every enemy leader is the same unnamed figure). He can be killed, or captured and ransomed. | `Nation.general`, `genericGeneral` in `src/engine/battle.ts` | The attack warning names him |
| 3.4 | **Reigns have an epitaph.** When a ruler dies, before the heirs: one page with the years, lands won and lost, battles, works, buildings, and a by-name earned from them (the Conqueror for 5+ provinces won, the Builder for 6+ buildings, the Wise for 4+ technologies, the Pious, the Unlucky, the Brief). | `setRuler`, `stats.kings`, `showSuccession` | The by-name appears in the Chronicle |

### Events

| Id | Action | Where | Done when |
|---|---|---|---|
| 3.5 | **Events can return.** An event option may schedule a named follow-up in a window of years (`then: { id, in: [2, 6] }`), stored in the save. | `EventDef` and `rollEvents` in `src/engine/events.ts` | A test plays a chain end to end |
| 3.6 | **Ten chains of three steps**, each second step depending on the first choice: the printing house; the pretender; the heretic preacher; the great famine; the bankers' loan; the royal favourite; the plague ship; the guild revolt; the border lord; the lost heir. | `src/engine/events.ts` | 30 new events; each chain reachable from any realm |
| 3.7 | **Fill the thin half-centuries** to 8 dated events each: 1 more for 1500–49, 4 for 1550–99, 2 for 1600–49, 2 for 1650–99. Candidates not yet in the game: the Sack of Rome (1527), the Council of Trent (1545), the Dutch Revolt (1568), St Bartholomew (1572), the Armada (1588), the Imjin War (1592), the Time of Troubles (1598), the tulip mania (1637), the Fronde (1648), the Glorious Revolution (1688), the Great Northern War (1700). | same | Counts checked in `npm test` |
| 3.8 | **Each core card answers back.** Adopting any of the eight principles brings one event within five years (the merchants ask for a navy after Mercantile; the clergy object after Open-minded). | `adoptCore`, 8 events | Old audit item 15 closed |
| 3.9 | **News from abroad.** The 14 scripted turning points of the AI world and every war between great powers reach the player as one short dispatch a year at most, with the option to send an envoy. | `worldMoments` in `src/engine/history.ts` | The world is seen to move |
| 3.10 | **One voice.** A pass over all event text: addressed to "you", 60 words or fewer, one concrete detail, no modern words. A page of rules for writers. | `docs/WRITING.md`, `src/engine/events.ts` | All events pass the word count in `npm test` |
| 3.13 | **The rules, in the game.** A Rules page in the Chronicle, written from the same tables the engine uses (outcome odds by rarity, card rates, hand limits, difficulty, how the ranking is scored), so it can never disagree with the game. | `chronicleSheet` in `src/ui/sheets.ts` | Old audit item 22 closed |

### The chronicle

| Id | Action | Where | Done when |
|---|---|---|---|
| 3.11 | **The history of your realm.** At the end of a game, 10–15 moments chosen from the log by weight (wars won, rulers, masterpieces, ages opened, disasters), written as a scroll. | `showGameOver`, `chronicleSheet` | Reads as a story, not a log |
| 3.12 | **Share it.** The scroll and the final map render to one image through the device's share sheet. | canvas in `src/ui/` | Works on iOS and Android |

## Phase 4 — Opponents and battles

A mobile player does not need a symmetric AI. They need rivals whose character and plans can be read and acted on.

### Rivals

| Id | Action | Where | Done when |
|---|---|---|---|
| 4.1 | **Every realm of 5+ provinces has a goal**: a named region or a rival's lands, set at the start from its neighbours (historical for the risers: the Ottomans want Constantinople, then the Balkans, then Egypt; Muscovy wants Novgorod and Kazan). War targets on the goal weigh three times more. | `Nation.goal`, `pickTarget` and war choice in `src/engine/ai.ts` | Rivals expand in a recognisable direction |
| 4.2 | **Personality in words.** The five personalities (expansionist, zealot, balanced, merchant, cautious) today only change the chance of war. Show each on the realm's page with what it means, and let an Embassy or Spy Network reveal the goal ("Their eyes are on Granada"). | `nationSheet` | Readable without the manual |
| 4.3 | **Attitude with reasons.** One word for how a realm sees you (friendly, wary, rival, hostile, afraid) and the list behind it (+12 trade treaty, −20 you hold land they claim). | `attitude()` in `src/engine/diplo.ts` | Every number in a relation is explained |
| 4.4 | **A warning before the blow.** When a rival is within 20% of the strength it needs to declare war on you, a dispatch says so a year ahead ("Portugal gathers troops on the border"), with three answers: reinforce, send an envoy, or seek an ally. | war choice in `src/engine/ai.ts` | No war on the player arrives unannounced |
| 4.5 | **Rivals act, not roll.** Replace the yearly dice for development with a budget of actions by rank (2 to 5 a year) spent by personality: a builder adds a real building, a merchant opens a route, a conqueror raises troops. The spy screen shows the last three. | `aiEconomy` | AI growth in the simulation stays within 10% of today's |
| 4.6 | **Rivals ask.** Four requests with a realm behind each: an ultimatum for a province (two quarters to answer, then war); a subsidy against a common enemy; a joint war; a demand to drop an alliance. | 4 events in `src/engine/events.ts` | Old audit item 13 closed |

### Battles

| Id | Action | Where | Done when |
|---|---|---|---|
| 4.7 | **Ground matters.** Each province's terrain (from 2.4) changes the tactics: cavalry charges ×0.6 in forest, hills and marsh; volleys +20% for a defender on hills; a river or strait gives the defender the first round. The battle screen says so before the first choice. | `TACTICS` in `src/data/troops.ts`, `playRound` | Odds shown already include the ground |
| 4.8 | **A reserve.** Before the battle the player holds one company back; it enters in round 2 or 3 at ×1.5 for that round. | `createBattle`, `showBattle` | A second real decision |
| 4.9 | **Retreat.** After round 1 or 2 the player may withdraw: the battle is lost but the companies keep their strength less 15, where a rout destroys them. | `playRound`, `finishBattle` | A third real decision |
| 4.10 | **The enemy can be read.** A named general (3.3) favours the tactic of his trait half the time (Bold charges, Cautious holds), and the screen says who commands. | `prepareRound` | Knowing the man changes the choice |
| 4.11 | **Allies fight beside you.** An ally with troops within a quarter's march sends up to two companies under your general. | `troopsNear`, `landPhase` | Old audit item 11 closed |
| 4.12 | **Skip the foregone.** A setting plays battles at 80% odds or better without stopping, and shows them in the year's report. | `processQueue` | Fewer interruptions late in the game |

### Balance

| Id | Action | Where | Done when |
|---|---|---|---|
| 4.13 | **Tune the three difficulties** against the targets in section 3 with 30 simulated games each, and record the result in `docs/BALANCE.md`. | levers in `src/data/difficulty.ts` | The table matches the targets |

## Phase 5 — Ship

| Id | Action | Where | Done when |
|---|---|---|---|
| 5.1 | **Store builds** for iOS and Android by wrapping the web game (Capacitor), with the right icons, splash and safe areas. | new `app/` folder | Installs from TestFlight and an Android test track |
| 5.2 | **Speed on real devices.** Measure start time and map pan on a 9th-generation iPad and a mid-range Android phone. If pan is under 50 fps with 1,038 SVG shapes, draw the province layer to a canvas at far zoom and keep SVG near. | `src/ui/map.ts` | Targets of section 3 met |
| 5.3 | **A smaller start.** The page is 1.2 MB with the 486 KB world inside. Load the world map as a separate cached file. | `scripts/build.mjs` | First paint under 1 s on a mid-range phone |
| 5.4 | **Saves that travel.** Export and import a campaign as a file through the share sheet; cloud save through the store's own service in the wrapper. | `src/ui/title.ts` | A game moves from phone to tablet |
| 5.5 | **Languages.** Move every text out of the code into tables (`t('key')`), starting with `events.ts` (97 KB of text and rules together). First languages: Spanish, German, French, Brazilian Portuguese, Simplified Chinese, Japanese. Add a serif with CJK coverage. | `src/i18n/` | The game plays through in Spanish with no English left |
| 5.6 | **Ten outside players**, recorded with permission: time to finish the first beginner mission, the turn where they stop, what they tap that does nothing. Target: 70% finish the nine beginner missions. | playtest notes in `docs/` | Findings turned into a short Phase 6 list |
| 5.7 | **Balance on those games**: difficulty, card rates, mission deadlines. | `docs/BALANCE.md` | Targets of section 3 hold for real players |
| 5.8 | **The offer.** One price. The free demo is the nine beginner missions and one historic mission; the purchase opens the rest. Store page: five screenshots, a 30-second trailer, the map as the first image. | store listings | Listings approved |
| 5.9 | **Missions as achievements** in Game Center and Play Games (the 40 missions already are a list of them). | wrapper | Each mission unlocks one |
| 5.10 | **Deploy by action.** GitHub Pages is built by a workflow on `main`, so the built `index.html` no longer lives in the repository. | `.github/workflows/pages.yml` | No built files in commits |

## What we will not do

- Multiplayer, real-time play, or battles in 3D.
- More provinces, realms or start dates. 1,038 provinces and three start dates are already more than a phone needs.
- A population simulation, or more goods.
- A card-playing AI that mirrors the player. Phase 4 makes rivals readable instead, at a fraction of the cost.
- Any new system before Phase 4.

## How this file is kept

- An action is ticked (☑) in the commit that finishes it, with its test.
- When a phase ends, its measured results go into section 2 and `docs/BALANCE.md`.
- New ideas go to the end of the right phase with the next free id; nothing is renumbered.
