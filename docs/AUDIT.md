# Gameplay audit

> **Done since this audit:** fleets and sea battles (1), peace terms and war score (2), vassals and personal unions (5), religion, culture, art and happiness feeding stability (6). Population stays a derived number by design.

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
