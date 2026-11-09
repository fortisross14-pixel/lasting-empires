# Balance

Goal: deep but casual. Reasonable decisions grow the realm and usually win; doing nothing does not; conquering everything is possible but unstable.

## Targets and current results

Run with `MODE=<style> SEEDS=5 npm run sim` (15 campaigns per style: Castile, Portugal, Aragon × 5 seeds).

| Style | What the bot does | Target | Result |
|---|---|---|---|
| `reasonable` | Plays its cards, builds, researches, keeps troops home, fights when stronger | Survives ~90%, top 3 most of the time, wins sometimes | Survived 13/15, top 3 in 12, first in 3 |
| `passive` | Ends turns, plays only simple cards | Rarely conquered outright, never near the top | Survived 10/15, average rank 13 |
| `greedy` | Attacks the weakest neighbour whenever at peace | Grows, but pays in stability and happiness | Survived 13/15, top 3 in 10, first in 3 |
| `big` | Starts with 25 provinces | Can hold together, but restless | Happiness 30–46, stability around 0, keeps its land |

Economy for `reasonable` (median treasury and average net income per year):

| Year | 1500 | 1550 | 1600 | 1650 | 1700 | 1750 |
|---|---|---|---|---|---|---|
| Treasury | 128 | 300 | 480 | 355 | 590 | 660 |
| Income | 35 | 60 | 99 | 116 | 155 | 198 |

The bot turns spare gold into nation points by selling offices; a player who sits on gold will see larger treasuries.

World map check (after the expansion to 363 provinces): `reasonable` survived 9/9, top 3 in 9, first in 4; `greedy` 6/6, top 3 in 6, first in 2; `passive` survived 6/6, never top 3. AI realms now develop their land (about 1.2% a province a year), AI prestige settles around 150–250, and unclaimed lands are mostly settled by 1600–1650.

## Levers (where to tune)

- **Income:** `provinceIncome`, `tradeValue` (1 + 0.07 × partner development, capped at 4, each extra route ×0.8), building gold in `src/data/techs.ts`, settlement tiers (`TIERS`), price level (income follows 70% of inflation).
- **Costs:** troop and ship upkeep (follow inflation), building salaries, imports, administration `0.14 × provinces^1.45 × inflation`.
- **Gold sinks:** construction, development, settlements, patronage, festivals, sale of offices (40 × inflation, rising each use in a year, for 2 nation points).
- **Cards:** hand limit per kind = 3 + 1 at 5, 10, 16 and 25 provinces (3 to 7). Yearly rate per kind capped at 2.5.
- **Big realms:** happiness −0.9 per province above 10 (up to −20), on top of foreign culture (−12) and other faiths (−18); administration grows faster than the realm.
- **Battles:** general skill +10% output and −3.5% damage taken per point; trait strength by rarity; only the first 5 companies (6 ships) fight at full strength, the rest at 40%. Battle check (`/tmp` harness in the session): a legendary general with 5 companies beats 6 ordinary ones ~90%, with 4 vs 6 ~30%, with 3 vs 6 never; outdated troops lose even with a genius.
- **AI:** declares war on the player only with 1.5× strength and after the first 10 years; at most one attack on the player a year; rarely presses a player down to 3 provinces, and offers peace when it is winning; army growth and troop upgrades lag the player; conquered AI provinces may rebel back to their old crown (more often in big AI empires), and fallen crowns can return.
- **Score:** half of prestige + 4 per owned development + 2 per development in subjects.
