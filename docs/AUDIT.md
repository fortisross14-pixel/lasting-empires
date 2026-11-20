# Audits

Two audits live here. The **market audit of November 2026** comes first: it compares the game with the leaders of
the genre and is the reason for every action in [ROADMAP.md](ROADMAP.md). The **gameplay audit** below it is older;
its open items have been carried into the roadmap and are marked with their roadmap id.

# Market audit, November 2026

## The question

How does Lasting Empires compare with Europa Universalis, Crusader Kings, Total War and Victoria 3 in storytelling,
fun, depth, mechanics, interface and visuals, and what would bring it to the same table as an indie game?

One decision frames the answer: we are **not** trying to replace those games. The aim is a premium indie game for
tablets and phones that gives some of their depth in a casual, touch-first shape. So each area is judged twice:
against the PC giants (for depth) and against the best premium touch strategy (The Battle of Polytopia, Slay the
Spire, Six Ages, Through the Ages, Suzerain), which is the table we want to sit at.

Method: the code, the design and balance notes, scripted and bot-played campaigns, and the built game driven in a
browser at 1180×820 and 390×844.

## The headline

The first design promised "grand strategy-lite": a campaign of 2–3 hours and one to three heavy decisions a turn.
The game today has 1,038 provinces, 148 realms (216 with the later starts), 21 goods, six decks and quarterly turns:
a campaign from 1451 to 1750 is **1,200 turns**, and in a scripted run 33–43% of them brought no card and no
decision. That is a Paradox-length campaign on a phone, without the pause and speed controls that make that length
bearable on a PC.

The systems are remarkably complete for an indie game. What is missing is not more of them. The work is to **pace**
what exists, make it **feel** premium, give it a **story**, and give the player **opponents** worth reading.

## Scorecard

| Area | Against the PC giants | Against premium touch strategy | Verdict |
|---|---|---|---|
| Storytelling and narrative | Far behind Crusader Kings | Behind Six Ages and Suzerain | The largest content gap |
| Gameplay and fun | A hook of its own (card + person + outcome) | The loop is good, the pacing is not | Fix session length first |
| Difficulty, depth, engagement | Deep systems, shallow opponent | Deeper than most | The AI is the weak point |
| Game mechanics | Broad and uneven | Too broad for a touch screen | Prune and connect, do not add |
| GUI and navigation | Cleaner than Paradox | Decent, but windows stack | A solid base |
| Art, fonts, visuals | Far behind | Behind | The map and the silence are the gaps |

## Findings by area

### 1. Storytelling and narrative
- **People have no lives.** A person has a rarity, traits and a hidden year of death. No loyalty, no wish, no rival,
  no event of their own. Crusader Kings builds its stories from exactly this material, and we already have the people.
- **Events are few and do not remember.** 77 events for 300 years. Of the 53 dated ones, 20 fall before 1500 and
  only 4 in 1550–99. None returns later with the consequence of what you chose.
- **Rivals are anonymous.** Every enemy army is led by the same unnamed general. Only 30 realms have historical rulers.
- **The campaign leaves no story.** The Chronicle is a log and a ranking; nothing sums up a reign or a game.
- **Strengths to build on:** the siege of Constantinople as a playable set piece, the 40 missions, the works of art
  with famous names, the legends (Giustiniani, Henry the Navigator, Prince Eugene).

### 2. Gameplay and fun
- **The hook is real.** A card, the right person, an outcome rolled by their rarity and revealed face-down: none of
  the big games has this, and it reads well on a touch screen.
- **Too many turns carry nothing.** About 0.73 cards arrive per turn across six decks, so a third or more of the
  turns were pure End Turn presses. *(Skip ahead and the things-to-do list, roadmap 1.1–1.3, now address this.)*
- **The right product is already half built.** Mission mode, with a realm, a deadline and a few goals, is the
  60–120 minute game this audience wants. The 300-year open game is the endgame for those who stay.

### 3. Difficulty, depth and engagement
- **The AI does not play the player's game.** It uses no cards, people or buildings; it develops on a dice roll and
  recruits by year. It declared war on the player at most once every 30 years.
- **There was no difficulty to choose.** The only lever was which realm to pick. *(Three levels now exist, roadmap 1.4.)*
- **Personality is invisible.** Five personalities exist, but they only change the chance of war. The player cannot
  tell an expansionist neighbour from a cautious one, so cannot plan around either.
- **Depth is there**, in research, government, culture, religion and trade. It needs an opponent that makes it matter.

### 4. Game mechanics
- **Breadth exceeds what a phone can show.** 21 goods with routes by good, forge recipes, viceroys, church favour,
  cultures, five governments, a navy, colonies. Each is sound; together they are Victoria-sized bookkeeping.
- **Battles are the thinnest part beside Total War:** one tactic a round for three rounds, no ground, no reserve,
  no retreat, no ally at your side.
- **The pillars are right** and are kept: everything is a card, people decide quality, surprises are revealed,
  middle by default, three currencies.

### 5. GUI and navigation
- **Good foundations:** a two-row phone top bar, bottom decks with counts, targets picked on the map, guided
  beginner missions, blocked actions that say why.
- **Windows stack.** The task planner opens as a dialog over a menu window over the map.
- **Nothing told the player what was left to do**, and nothing could be undone. *(The first is now done, roadmap 1.2.)*
- **The interface is one file** of 2,857 lines with shared state, and there were no automated checks: every polish
  pass was a risk. *(Tests and CI now exist, roadmap 1.7–1.8; the split is roadmap 1.12.)*

### 6. Art, fonts and overall visuals
- **The map is the weakest image**, and it is the screen seen most: straight-edged Voronoi cells with flat fills,
  small labels, no terrain.
- **The game is silent.** There is no audio code at all. For a premium game this is the cheapest large gain.
- **The direction is right.** The ink-and-paper style, Cormorant SC with EB Garamond, the hard ink shadows and the
  96 painted tiles on cards, units and roles are consistent and distinctive. Events still use line icons, every
  person of a role shares one face, and battles list units as icon chips.
- **Ten font families are fetched from the network** at start though the one remaining style uses three; a first
  launch offline falls back to system fonts.

## What follows from it

Five phases, in this order: **pace and foundations**, **feel**, **story**, **opponents and battles**, **ship**.
Every action, with its place in the code and its test, is in [ROADMAP.md](ROADMAP.md).

---

# Gameplay audit (earlier)

> **Status, November 2026.** Done since this audit: fleets and sea battles (1), peace terms and war score (2),
> coalitions (4), vassals and personal unions (5), religion, culture, art and happiness (6), the first AI proposals (13),
> every realm playable (16), a tutorial and guided beginner missions (17), the year's report (18), idle reminders (19,
> roadmap 1.2–1.3), targets on the map (20), map views (21), three save slots (24), settings (26, roadmap 1.6),
> an installable offline app, and checks on every push (roadmap 1.7–1.8).
> Carried into the roadmap: AI on the player's rules (3 → 4.1–4.5), character life (8 → 3.1–3.4), more events and
> chains (9 → 3.5–3.7), battle decisions (11 → 4.7–4.11), AI requests (13 → 4.6), core cards with a story (15 → 3.8),
> rules in the game (22 → Phase 3 writing pass), undo (23 → 2.19), save export (24 → 6.4), sound (25 → 2.7–2.10),
> versioned saves (→ 1.14). Population stays a derived number by design.


Based on the code, nine full bot campaigns (`npm run sim`) and play-throughs at tablet and phone sizes. Ordered by impact on the game; effort is a rough guess (S = a day, M = a few days, L = a week or more).

## 1. Systems that are missing

| # | Missing | Why it matters | Effort |
|---|---|---|---|
| 1 | **Fleets and sea battles** | The Land/Sea core card, harbours, corsairs, Lepanto and every overseas mission point at a navy that does not exist. Sea routes are just "takes 1–2 years". | L |
| 2 | **Peace terms and war goals** | Peace is always white peace, and provinces change hands only by siege during the war. There is no war score, no demanding provinces, gold or vassals at the table, and no separate occupation step. Wars end without a decisive moment. | M |
| 3 | **AI that plays by the same rules** | Rival crowns do not use cards, missions, people, research or buildings. They recruit by year, attack on dice and claim overseas lands at random. Asymmetric AI makes the card system feel one-sided, and the player cannot read rivals' intentions. | L |
| 4 | **Coalitions and reputation** | Big realms only get a small relation penalty. Nothing stops a runaway player or AI (one France conquered the whole map in testing), and there is no memory of broken treaties. | M |
| 5 | **Subjects: vassals and personal unions** | The union of Castile and Aragon annexes outright. There is no way to hold a crown without absorbing it, which was the normal way Iberian and Italian crowns grew. | M |
| 6 | **Religion and the Church** | The Reformation, crusades and the Papacy are events only. No faith per province, no papal favour or excommunication, and no religious unrest. | M |
| 7 | **Population that matters** | Population is a number derived from development and buildings. It does not grow, eat, or feed manpower or taxes on its own. | M |
| 8 | **Character life** | People do not age in skill, have no loyalty or ambitions, never fall ill or betray, and have no personal events. The monarch has no consort, heir upbringing or regency. | M |

## 2. Systems that exist but are thin

| # | Gap | Detail | Effort |
|---|---|---|---|
| 9 | **Too few events** | 26 events (about 16 historical) for a 300-turn campaign. After 1600 the history deck is nearly empty and random events repeat. Portugal and Aragon have almost no events of their own. Event chains (choices that come back later) do not exist. | M (content) |
| 10 | **Gold has nothing to buy late** | Every simulated campaign ends with 11,000–47,000 unspent ducats. Hand limits and manpower cap spending. Needs sinks: mercenaries for ducats, buying cards with gold at a bad rate, court patronage, wonders, loans to other crowns. | S |
| 11 | **Battles have one decision per round** | Only the tactic card. No choice of which troops defend, no terrain, no reserves, no retreat, and armies do not move on the map. Allied armies never fight beside yours. | M |
| 12 | **Defence is automatic** | When the AI attacks, your home troops defend whether or not that suits you. There is no way to garrison a border or keep an army in a province. | M |
| 13 | **Diplomacy only goes one way** | The AI rarely asks you for anything: no alliance or marriage proposals, no requests for help beyond allies, no subsidies or demands except tribute. | S |
| 14 | **Overseas is a list** | Lands have no map, no distance on screen, no competition you can see, and colonies never need defending. | M |
| 15 | **Core cards have no story** | Adopting Traditional or Open-minded changes numbers but no event or rival reacts to it. | S |
| 16 | **Only three playable crowns** | France, Venice, Naples, Granada and Morocco exist on the map but cannot be played. | M (per nation) |

## 3. Player experience

Checked against Nielsen's heuristics (the `ux-audit` skill).

| # | Issue | Heuristic | Fix | Effort |
|---|---|---|---|---|
| 17 | **No tutorial** | Help and documentation | A guided first ten years: one card of each kind, explained as you play it. | M |
| 18 | **No end-of-year summary** | Visibility of system status | The year flash shows ducats and cards only. A short report (missions finished, battles, relations that changed, what is due next year) would stop surprises feeling random. | S |
| 19 | **Idle people and unused cards are easy to miss** | Error prevention | Before ending the year, point out free people and playable cards. Badge the tabs that have something to do. | S |
| 20 | **Mission cards do not show targets on the map** | Recognition over recall | When a card is chosen, highlight valid provinces and nations on the map and let the player tap one. | M |
| 21 | **No map modes** | Flexibility and efficiency | Map by relations, control, goods, settlements and wars. | M |
| 22 | **Rules are only in the code** | Help and documentation | A rules page in the Chronicle covering outcomes, rates, control, and how score is counted. | S |
| 23 | **No undo** | User control and freedom | Undo the last card played this year, at least for instants. | S |
| 24 | **One save per device** | User control and freedom | Save slots, and export/import a save as text so a game can move from tablet to phone. | S |
| 25 | **No sound** | Aesthetic and feedback | The Chancery style was designed with quill, stamp, seal and paper sounds. | S |
| 26 | **No settings** | Flexibility | Animation speed, sound, auto-resolve battles, confirm before End Year. | S |

## 4. Balance (from simulation)

- Outcomes swing a lot between runs: the same nation and strategy can rank first or be conquered by 1520.
- Gold piles up (see 10).
- Prestige from missions grows faster for the player than for AI crowns, so the score table is not a real race.
- Stability tends to slide to −3 in long wars and stays there.
- Balance tuning is planned for the end; these are the levers to watch.

## 5. Technical

- No automated tests beyond the bot simulation; no CI on pushes.
- No offline install on GitHub Pages (a web manifest and service worker would make it a home-screen app).
- Saves are migrated field by field; a versioned migration list would be safer as the game grows.

## Suggested next order

1. End-of-year report, idle reminders and tab badges (18, 19).
2. Peace terms and war score (2), then coalitions (4).
3. Event pack: 30–40 more events with chains, including Portugal and Aragon (9).
4. Late-game gold sinks (10).
5. Tutorial (17) and map targeting for cards (20).
6. Fleets and sea battles (1).
7. AI on the card system (3), the largest piece.
