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
| Events (before Phase 3; now 138 with 62 dated, at least 8 in every half-century) | 77, of which 53 dated: 20 before 1500, 7 in 1500–49, 4 in 1550–99, 6 in 1600–49, 6 in 1650–99, 10 after 1700 | `src/engine/events.ts` |
| Event chains (a choice that comes back) | 0 (now 10) | same |
| Realms with historical rulers | 30 of 216 | `RULERS` in `src/data/nations.ts` |
| Character events | 0 (now 12): people have rarity, traits and a hidden year of death, nothing else | `Character` in `src/types.ts` |
| Battle decisions (before Phase 4, none: battles played themselves; now a reserve, when to send it in, and whether to withdraw) | 0; 3 rounds, 6 land tactics, 4 at sea | `src/engine/battle.ts` |
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
| 1.4 | **Three difficulties**: Gentle, Standard, Hard, chosen when a game or mission starts and shown in the Menu. Levers, all in one table: how much stronger a rival must be to declare war on you (×1.6 / ×1.25 / ×1.0), years between such wars (45 / 30 / 12), years of peace at the start (15 / 10 / 5), mercy for a crown of three provinces or fewer (90% / 70% / 30%), starting treasure (×1.5 / ×1 / ×0.8), rival growth (×0.8 / ×1 / ×1.3; Hard raised to ×1.6 by action 4.13), rival army size (−1 / 0 / +2). | `src/data/difficulty.ts`, `diff()` in `src/engine/core.ts`, read in `src/engine/ai.ts` and `newGame` | `DIFF=0|1|2 npm run sim` runs; Standard gives the same results as before | ☑ |
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
  is right, the spread narrower than the targets of section 3; action 4.13 has since tuned it (78%, 58%, 37%).
- **Checks:** 10 engine checks in about 20 seconds; typecheck, checks, build and a short bot campaign on every push.
- **Goods:** the steward and the six-needs view replace 21 rows of bookkeeping as the first thing the player sees.
- **Code:** the interface is 16 modules, none over 475 lines; saves migrate by numbered steps; a browser smoke test
  visits every screen at both sizes.

## Phase 2 — Feel

Status: **done but for the music** (2.9, waiting for four loops). Actions marked ☑ beside their id are done.

The map is on screen 80% of the time and the game is silent. These two facts decide how the game is judged in its
first minute.

### Map

| Id | Action | Where | Done when |
|---|---|---|---|
| 2.1 ☑ | **Borders that are not straight.** When the world is generated, every inland edge of a province is bent into a gentle wave of 3–9 pieces (up to 12% of the edge's length, never more than 9 map units). The wave is worked out from the edge's two end points alone, so both neighbours get the very same line and no gap opens; edges lying in the sea stay straight. The generator now also makes the split of the Norway–Siberia outline that had been patched into `world.json` by hand, so `npm run gen-world` reproduces the land data exactly. | `wobble`, `wobbleRing` in `scripts/gen-world.ts`, then `npm run gen-world` | Done. `world.json` grew from 486 to 636 KB (see 5.3) |
| 2.2 ☑ | **Two weights of line.** Realm borders 2.3 px ink (1.5 px at far zoom), drawn as one path per landmass from the points two neighbouring cells share, and redrawn only for lands where something changed; province borders inside a realm 0.7 px at 34% opacity; the coast keeps its heavy line. | `.realm-edge`, `edgeD` in `src/ui/map.ts`; `.prov` in `src/styles.css` | Done: a realm reads as one shape at world zoom |
| 2.3 ☑ | **Realm names on the map.** Below 1.3 screen pixels per map unit, province names give way to each realm's name, written once across the largest connected piece of its land, in Cormorant SC, letter-spaced, sized to the land and turned along its longer axis (never steeper than about 50°). Names that would be under 10.5 px on screen are left out until the player zooms in. | `nameRealms`, `REALM_VIEW` in `src/ui/map.ts` | Done: 44 names on a tablet at the opening view |
| 2.4 ☑ | **Paper and ground.** A paper grain lies over the land: one 256 px tile of specks and fibres, made once on the device and repeated (no live filter). Every province that is not open country carries two to five small ink marks, kept on the land and clear of its name: trees, humps, peaks or dunes. They show wherever province names show, and hide for unknown lands. Europe's ground is corrected by hand (67 provinces: the Alps, the Apennines, the Carpathians, the Balkans, Norway; plains that a mine or a salt pan had made into hills; the northern woods). The inside of Iberia is left as it was: thirteen more hills and mountains there made Standard much easier for the three realms the bot plays (see `docs/BALANCE.md`). No marsh: the battle rules have no such ground. | `grainTile`, `TERRAIN_MARKS`, `buildTerrain` in `src/ui/map.ts`; `TERRAIN_OVERRIDES` in `src/data/terrain.ts` | Done. In the test browser, which has no graphics chip, a frame of panning goes from under 17 ms to about 22 ms (grain 2, marks 4). To check on a real tablet: pan above 50 fps |
| 2.5 ☑ | **A watercolour edge for the player's realm.** The border and the coast of the player's land are stroked 12 px wide in the realm's colour at 50% and cut to the realm's own provinces, so a 6 px band runs along the inside of the border. The land itself is washed paler than before (`MINE_WASH` 0.3; others 0.42): the band marks it out, not a darker fill. | `mineBand` in `src/ui/map.ts`; `.mine-band` in `src/styles.css` | Done: seen in all seven map views |
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
| 2.11 ☑ | **A played card travels.** When a task is sent, a small copy of the card flies in 250 ms from the Send button to the province it targets (a realm's capital for a realm), or to the strip of tasks over the map when that province is off screen or under the open window. Nothing waits for it. | `flyCard`, `FLY_MS` in `src/ui/planner.ts`; `.fly-card` in `src/styles.css` | Done: off under reduced motion and the Less motion setting |
| 2.12 ☑ | **Outcomes have weight.** The five outcome levels are told apart without reading: a cross, a dot, one, two or three stars under the title; a torn corner and a crooked card for the worst; a grey seal for the ordinary; a gold frame and one pass of gold leaf for Great; a double gold frame, a laurel and two passes for Exceptional. The closing note follows the level (two falling notes, one note, a rising figure). | `infoCard`, `outcomeLevel`, `stingFor` in `src/ui/prompts.ts`; `.k-info.o-0`…`.o-4` in `src/styles.css` | Done: the level can be told from the mark and the frame alone |
| 2.13 ☑ | **Battles show the armies.** Each side is a row of painted company tiles (the 25 in `art/unit_*.webp`, the enemy's mirrored so the lines face each other) under its coat of arms, its general and one strength bar with the breaking point marked. Each round the tiles that were hit shake and show what they lost; a destroyed company is greyed and crossed out. A tap on a tile names it. The result sounds its own note. | `unitTile`, `showBattle` in `src/ui/prompts.ts` | Done: no line icons left on the battle screen where a painting exists |
| 2.14 ☑ | **Event paintings.** 27 wide scenes open 40 events: Constantinople, the printing press, Columbus, the Cape route, Tordesillas, the Italian Wars, the Reformation, Potosí, Lepanto, the Thirty Years' War, Westphalia, Versailles, the plague, a bad harvest, a revolt, a court visitor, a great artist, tax riots, a golden age, a call to arms, the Armada, the Sack of Rome, the Estates-General, Vienna, the Seven Years' War, the warning before a war and the ultimatum. The steps of a chain share its painting. Prompts in `docs/art-prompts-phase2.md`. | `art/event_*.webp` (480 × 320, about 50 KB each, fetched when the event opens); `EVENT_ART`, `eventArt` in `src/ui/art.ts`; `showEvent` | Done: a check proves every painting named is a file and every event named exists |
| 2.15 ☑ | **Faces for people.** Eighty portraits: sixteen for each of five families of dress (Western, Islamic, East Asian, African, American), in four rows: soldiers, men of affairs, learning and faith, the court. A person's role picks the faces that suit (a diplomat the envoy, a priest the bishop or the friar); among those they take the best one nobody at court wears yet, and keep it for life, through any change of role. A woman's name takes one of the two ladies. The family follows the realm's people (Castile Western, the Ottomans Islamic, Ming East Asian). | `art/face_<family>_<row><col>.webp` (224 px); `faceOf`, `faceImg`, `ROLE_FACES` in `src/ui/art.ts`; `face` on `Character` | Done: a check proves three generals at one court wear three faces |
| 2.16 ☑ | **Six age plates.** The page of an age, shown when it opens and from the year in the top bar, begins with its plate, the name of the age written across the sky. One image for each age. The year flash between years stays as it was. | `art/age_<id>.webp` (960 × 640, about 140 KB each, fetched when shown); `showReveal` in `src/ui/prompts.ts` | Done |
| 2.17 ☑ | **Title art.** The council table behind the title: on a tablet the wide scene fills the left of the screen and the page (name, missions, open game, campaigns) runs down the right; on a phone the tall scene fills the screen, the name stands in its dark upper part and the page comes up from below. The scene is an oil painting, not a woodcut like the rest of the game's art: see the note under the table. | `art/title_wide.webp` (144 KB), `art/title_tall.webp` (109 KB); `showTitle`, `.title-bg` | Done: both under 150 KB |

**The title scene and the house style.** Everything else painted for the game is a hand-coloured woodcut on
parchment; the two title scenes are oil paintings. As key art on the first screen that can stand, and many games
do it, but it is the one place where the game does not look like itself. If it should match, ask for the same
scene with the STYLE block of `docs/art-prompts-phase2.md` and save it under the same two file names: nothing
else changes.

### Navigation and type

| Id | Action | Where | Done when |
|---|---|---|---|
| 2.18 ☑ | **No window on top of a window.** With a deck window open, a card, the task planner, a person and the trade pickers open as a page inside that window, in place of its tabs, with "‹ Back to Military" above. Escape and the device's back button leave the page the way its own Back button would. With no window open they are a dialog, as before. What the game asks (events, battles, choices) may still lie over either. Ending the turn puts an open page away first. | `openPage`, `closePage`, `dismissPage` in `src/ui/modal.ts`; `winPage` in `src/ui/state.ts`; `renderWin` | Done: at most one layer above the map, plus decisions |
| 2.19 ☑ | **Undo.** Sending someone on a task can be taken back from a 6-second strip with an Undo button: the game returns to the save from just before, card and person included. The offer ends when the turn ends or anything else changes the game, and is not made when the game answered at once with something new. Playing an instant card or hiring is not undoable: those show their outcome at once. | `offerUndo`, `clearUndo` in `src/ui/app.ts`; the launch in `src/ui/planner.ts` | Done: a browser check starts a task, undoes it and finds the save as it was |
| 2.20 ☑ | **Swipe between the tabs of a window, and on to the next deck.** A sideways swipe in a window moves one tab; from the last tab it goes on to the next deck's first tab, and back the same way, so one thumb walks through all six decks. A swipe that starts on something that can itself scroll sideways (a table, a row of chips, a slider) is left to it. | `stepTab`, `bindSwipe`, `SWIPE_MIN` in `src/ui/windows/frame.ts` | Done: a browser check walks Military → Diplomacy and back at 390 px |
| 2.21 ☑ | **Fonts in the game, not from the network.** Cormorant SC and EB Garamond ship as `woff2` in `fonts/` (Latin, Latin Extended and Vietnamese subsets: 416 KB, fetched by the browser only as needed), are declared in the page itself and cached by the service worker. The eight families no style uses are gone, and the few direct uses of Alegreya now use EB Garamond. The artifact page, which may not carry files, takes the same two families from Google. | `fonts/`, `scripts/build.mjs`, `src/styles.css` | Done: with Google blocked, both families load |
| 2.22 ☑ | **Text size**: 100%, 115% or 130% in Settings. Every font size in the stylesheet is multiplied by `--ts` (a check fails if one is written without it). The two bars keep their size, having a fixed height; cards in lists grow to hold larger text. A card's name is never under 13 px on a phone (it was 10–12 px). | `--ts` in `src/styles.css`; `TEXT_SIZES`, `applySettings` in `src/ui/settings.ts` | Done: at 130% on 390 px nothing is cut that is not cut at 100% (card text keeps its three-line limit; a tap shows it whole) |
| 2.23 ☑ | **Colour is never the only signal.** A mark stands beside good and bad wherever colour alone told them apart: ✓ and ✕ on messages, ▴ and ▾ in the chronicle and on news cards, ! before warnings (outcomes already had their marks, 2.12). Realm colours: the 374 pairs of neighbouring realms were measured as washed on the map, under normal sight and three forms of colour blindness; 16 realms changed colour (the Teutonic Order, Savoy, Novgorod, Serbia, Bosnia and eleven more). Pairs nearly alike (under 3) fell from 16 to 1, pairs close (under 6) from 48 to 22. | `src/data/nations.ts`; `infoCard`; `src/styles.css` | Done for the ten closest pairs. The relations view still tells stance by colour and legend alone |

## Phase 3 — Story

Status: **done** (November 2026). ☑ beside an id marks a finished action.

Crusader Kings makes stories from people. Lasting Empires already has the people: they only need lives.

### People

| Id | Action | Where | Done when |
|---|---|---|---|
| 3.1 ☑ | **Three new facts about each person**: loyalty (0–100: Devoted from 80, Loyal from 60, Wavering from 35, Disloyal below), one wish (a title, gold, glory, the faith, family, or rest) and, once a quarrel has made one, a rival. Until something changes them they follow from who the person is, with no dice, so old saves need nothing. Loyalty rises with tasks done (+3), victories (+3, +6 for one who wants glory) and favours; it falls with idleness, slights, an unsteady realm and a new monarch (−6). Below 20 a servant may leave. | `loyaltyOf`, `wishOf`, `addLoyalty`, `yearlyCourt` in `src/engine/court.ts`; `charDetail` in `src/ui/modal.ts` | Done: shown on the person's page, with a mark on the card of the disloyal |
| 3.2 ☑ | **Twelve court events**, at most one a year and none in the first three: the general asks for a title after three victories; a purse from abroad reaches a wavering servant; two who cannot share a room; the scholar asks leave to travel (and returns wiser, or takes a chair in Padua); the accounts do not add up; a deathbed, where a trait can be passed on; a match for your general; the artist asks to be free; a sermon against the court; the favourite; a general changes sides in wartime and becomes the enemy's commander; the victor comes home. | `COURT_EVENTS` in `src/engine/court.ts` | Done: `npm test` fires each one and runs every option |
| 3.3 ☑ | **Enemy commanders with names.** Every rival of 8 provinces or more keeps one named general with a trait, appointed without dice from the realm and the year, serving up to 25 years. He leads the armies you meet; the attack warning and the realm's page name him. When you beat him he may fall (12%) or be taken (12%): a prisoner can be ransomed, kept, or freed as a gesture. | `commanderOf`, `commanderFate` in `src/engine/commanders.ts`; `captive_general` in `court.ts` | Done: the attack warning names him |
| 3.4 ☑ | **Reigns have an epitaph.** When a ruler dies, before the heirs: the years, lands won and lost, battles, buildings, new arts and works, and a by-name earned from them (the Brief, the Conqueror, the Unlucky, the Victorious, the Builder, the Wise, the Magnificent, the Pious, the Beloved, the Steadfast, the Troubled). | `reignOf`, `EPITHETS` in `src/engine/court.ts`; `successionCheck` in `turn.ts` | Done: the by-name appears in the Chronicle's Monarchs |

### Events

| Id | Action | Where | Done when |
|---|---|---|---|
| 3.5 ☑ | **Events can return.** An option may set a later event in motion with `later(s, id, min, max, vars)`: it comes due in that window of years carrying what was chosen, fires before any chance event, and is dropped if its condition no longer holds. Stored in the save (`pending`; saves are now version 4). | `later` in `src/engine/eventkit.ts`; `rollEvents` in `src/engine/events.ts` | Done: a check fires one in its year and not before |
| 3.6 ☑ | **Ten chains of three steps**, each later step different for each road taken: the printing house; the pretender; the heretic preacher; the great famine; the bankers' loan; the royal favourite (it begins in the court event); the plague ship; the guild revolt; the border lord; the lost heir. | `CHAIN_EVENTS` in `src/engine/chains.ts` | Done: 30 steps and 128 endings; `npm test` walks every road |
| 3.7 ☑ | **The thin half-centuries filled** to 8 dated events each: the Sack of Rome (1527), the Dutch Revolt (1566, with a debt repaid years later), St Bartholomew (1572), the Armada (1588), the Imjin War (1592, for East Asian realms), the tulip mania (1636), the Fronde (1648), the Royal Society (1660), the Glorious Revolution (1688). | `HISTORY_EVENTS` in `src/engine/annals.ts` | Done: counts are checked in `npm test` (21, 8, 8, 8, 8, 10) |
| 3.8 ☑ | **Each core card answers back.** Adopting any of the eight principles brings its event within five years, once: the captains' petition, the shipwrights, the neighbours' envoys, the great survey, the clergy's objection, the young men who leave, the merchants' convoys, the commons. | `CORE_EVENTS` in `src/engine/annals.ts`; `adoptCore` in `turn.ts` | Done: old audit item 15 closed |
| 3.9 ☑ | **News from abroad.** The 14 scripted turning points of the AI world, and every war declared between realms of 12 provinces or more, reach the court as a dispatch, one a year at most (the rest go only into the annals), with the choice to send an envoy: relations +8 and their armies known for two years. | `dispatch`, `NEWS_EVENTS` in `src/engine/annals.ts`; `worldMoments` in `history.ts`; `aiDiplomacy` in `ai.ts` | Done |
| 3.10 ☑ | **One voice.** The rules for writers are in `docs/WRITING.md` (speak to "you", 60 words or fewer, one concrete detail, no modern words, every option costs something). The 62 new events were written to them, and 50 of the older events were rewritten: every text now has its detail ("a bombard twenty-seven feet long, which sixty oxen can barely move"), options are what a monarch would say, and the later history speaks to "you" instead of about "the King". The old one-step printing press is now the first step of the printing chain, which grants what it granted. `npm test` checks the length of every text it can render. | `docs/WRITING.md`; `src/engine/events.ts`, `chains.ts` | Done: 138 events, none over 60 words |
| 3.13 ☑ | **The rules, in the game.** A Rules tab in the Chronicle, written from the same tables the engine uses (outcome odds by rarity, card rates and hand limits by rank, the difficulty levers, loyalty levels, the steward, the ranking, skip and undo), so it cannot disagree with the game. | `rulesTab` in `src/ui/sheets.ts` | Done: old audit item 22 closed |

### The chronicle

| Id | Action | Where | Done when |
|---|---|---|---|
| 3.11 ☑ | **The history of your realm.** The weighty lines of the log (wars, peaces, unions, ages opened, masterpieces, civil wars, ambitions) are kept apart from the log, which forgets after 120 lines; the 15 heaviest are told reign by reign, each chapter under its ruler and by-name. Shown from the end screen and from the Chronicle's Annals at any time. | `remember`, `historyOf` in `src/engine/chronicle.ts`; `showHistory` in `src/ui/sheets.ts` | Done |
| 3.12 ☑ | **Share it.** The history of the realm becomes one picture, 1080 px wide: the map around the realm as it stands, the title, and a chapter for each reign. It goes to the device's share sheet where there is one and is saved as a file where there is not. | `historyCanvas`, `shareHistory` in `src/ui/share.ts`; the button in `showHistory` | Done in the browser (saved as a file); the share sheet itself is untested until the store builds of 5.1 |

## Phase 4 — Opponents and battles

Status: **done but for one part**. ☑ done, ◐ partly done. Open: the budget of actions for rivals (second half of 4.5).

A mobile player does not need a symmetric AI. They need rivals whose character and plans can be read and acted on.

### Rivals

| Id | Action | Where | Done when |
|---|---|---|---|
| 4.1 ☑ | **Every realm of 5+ provinces has a goal**: a rival's lands. History sets it for the great conquerors, in order (the Ottomans want Byzantium, then Serbia, Karaman, the Mamluks, Hungary; Muscovy wants Novgorod, Kazan, Crimea, Sweden; twelve realms in all); every other realm wants the neighbour it likes least and could swallow, chosen without dice and kept for 25 years. In choosing a war the goal counts three times, and each year a realm likes its goal 2 less. | `goalOf`, `HIST_GOALS`, `yearlyGoals` in `src/engine/rivals.ts`; the war choice in `aiDiplomacy` (`ai.ts`) | Done |
| 4.2 ☑ | **Personality in words.** Each of the five tempers is described on the realm's page by what it really does (an Expansionist goes to war even against those it does not hate and keeps a larger army; a Cautious one almost never starts a war). The realm's goal is shown once the player knows it: by spies, by a successful embassy (which now reports it), by alliance, or because a hostile realm plainly wants the player's own lands. | `TEMPERS`, `goalKnown`, `learnGoal` in `rivals.ts`; `nationSheet` in `src/ui/sheets.ts` | Done |
| 4.3 ☑ | **Attitude with reasons.** One word for how a realm sees you (At war, Your subject, Ally, Friendly, Afraid, Rival, Hostile, Wary, Neutral) over the relations bar, and under it the currents the game really applies: +3 a year from a marriage, −2 a year because it wants your lands or because you are a great power, goodwill and grudges fading, and how near it is to the strength it would want before attacking. The game keeps no record of past incidents, so the list explains what is moving relations now, not every point of the total. | `attitude` in `rivals.ts`; `threatOf` in `ai.ts` | Done |
| 4.4 ☑ | **A warning before the blow.** The first time a realm would declare war on the player, it does not: a dispatch reaches the court ("Portugal gathers on your border", with its strength against what would give it pause), and it waits a year. The player may raise walls on the frontier, send an envoy with gifts, look for an ally, or let it come. If the realm still wants the war a year later, it declares it; if relations or strength have changed, the levies go home. A warning holds for ten years. | `mayStrikePlayer`, `wantsPlayer` in `ai.ts`; `war_warning` in `src/engine/requests.ts` | Done: a check proves no strike without a warning at least a year old |
| 4.5 ◐ | **Rivals act, and it shows.** Each realm keeps a record of its last three deeds (land improved, companies raised, ships launched, companies re-armed, wars declared), readable on its page once spied on, visited by an embassy or allied. Once a year, half the time, a realm does one thing in keeping with its temper: the cautious and the balanced raise low walls on a border, merchants hold a fair, zealots endow a church, expansionists muster. Not done: replacing the yearly dice for development with a budget of actions. That would move every rival's growth, and belongs with a balance pass of its own. | `deed`, `deedsKnown` in `rivals.ts`; `aiFocus`, `aiEconomy` in `ai.ts` | The dice replaced by a budget, with rival growth within 10% |
| 4.6 ☑ | **Rivals ask.** Four requests, each from a realm chosen by how things really stand: an ultimatum for a border province from a stronger neighbour that wants your lands (give it up, ask a season to consider, or refuse and be at war); silver for a friend at war with a realm that threatens you too (two companies raised with it); a joint war proposed by a friend against its goal on your border; a demand to drop an ally from a realm that hates it. | `REQUEST_EVENTS` in `src/engine/requests.ts` | Done: old audit item 13 closed |

### Battles

| Id | Action | Where | Done when |
|---|---|---|---|
| 4.7 ☑ | **Ground matters.** Every province has one of five kinds of ground, worked out from what it yields and where it lies (684 open, 131 woods, 84 hills, 75 mountains, 64 desert; Europe set by hand, see 2.4). Woods: cavalry ×0.6 and fire ×0.85 for both sides. Hills: the attacker's cavalry ×0.6, the defender's fire ×1.2. Mountains: the attacker's cavalry ×0.5, the defender takes ×0.85. Desert: the attacker fights at ×0.9. An army landed from ships meets ×1.3 fire in the first round. Ground counts only in battles the player fights: applied to every war in the world it stopped rival realms from growing (see `docs/BALANCE.md`). The planner, the attack warning and the battle screen say what the ground does in one line. | `TERRAINS`, `terrainOf` in `src/data/terrain.ts`; `ground` in `src/engine/battle.ts` | Done. The ground is drawn on the map and Europe corrected by hand (2.4) |
| 4.8 ☑ | **A reserve.** Before the first round the player may hold one company back by tapping it. It takes no part and no harm, and does not count in the army's strength, until it is sent in: then it joins the line (which steadies an army close to breaking) and strikes at ×1.5 for that round. Left to the general, it goes in for the second round. | `setReserve`, `commitReserve`, `RESERVE_FRESH` in `src/engine/battle.ts`; `showBattle` in `src/ui/prompts.ts` | Done: the battle now waits for the player before each round |
| 4.9 ☑ | **Retreat.** After the first or second round the player may withdraw. The battle is lost, but each company loses 10 strength and no more (a defeat costs 15% and whatever the remaining rounds would have taken), and an attack or raid broken off costs no stability. A province defended and given up is still lost. | `retreat`, `canRetreat`, `RETREAT_COST` in `src/engine/battle.ts` | Done |
| 4.10 ☑ | **The enemy can be read.** A general with a character chooses the tactic that suits him half the time his army can use it: Bold charges or flanks, Cautious holds the line, a Gunner fires volleys or bombards, Cunning flanks, a Siegemaster bombards. The attack warning and the battle screen name the general and his habit, so the player can bring the troops that counter it. The same holds for the player's own generals. | `TRAIT_TACTIC` in `src/data/troops.ts`; `aiPick` in `src/engine/battle.ts` | Done: in 120 trial battles a bold general charges at least 60 times |
| 4.11 ☑ | **Allies fight beside you.** An ally who is in the same war and has troops within a quarter's march lends up to two of its best companies to a conquest or a defence, on top of what your general can command. They wear their realm's colour on the field, take their wounds home, and are announced in the planner and the attack warning. | `alliedHelp`, `ALLY_COMPANIES` in `src/engine/battle.ts` | Done: old audit item 11 closed |
| 4.12 ☑ | **Skip the foregone.** A setting, off by default: a battle whose odds are 80% or more either way is fought without stopping the game and told in one line; it still appears in the year's report. | `quickBattle`, `QUICK_ODDS` in `src/ui/prompts.ts`; `quickBattles` in settings | Done |

### Balance

| Id | Action | Where | Done when |
|---|---|---|---|
| 4.13 ☑ | **Tune the three difficulties** against the targets in section 3. Done with 60 simulated games a level (two runs of 30): top three in 78% on Gentle, 58% on Standard, 37% on Hard. One number changed: on Hard rivals now grow at ×1.6 (was ×1.3). Three variants of Hard were tried; more and earlier wars moved nothing for the bot, faster rivals did. | `src/data/difficulty.ts`; the tables in `docs/BALANCE.md` | Done: all three in their bands |

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
