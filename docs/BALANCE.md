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

World of 663 provinces (Ming 62, Ottomans 13): the score now weighs growth since 1453 (`prestige/2 + development + 5 × development gained + 2 × subject development`), AI realms develop at one flat pace (about +1 every 5 years, regardless of size), and every crown's prestige fades 1.5% a year. `reasonable` survived 12/12, top 3 in 3, first in 2 — below target; `greedy` top 3 in 3/6; `passive` never top 3. To tune next: AI expansion speed in the bigger world and the growth weight in the score.

Quarterly turns, 702 provinces, civil wars and viceroys (current): `reasonable` survived 9/9, top 3 in 3, first in 2; `greedy` survived 6/6, top 3 in 3, first in 2; `passive` never top 3. AI development about +1 every 8 years per realm; AI prestige settles around 60–130; tribal realms do not settle empty land. Risings: below 25% happiness, about 1–3% a quarter per province, at most one every 6 years per province, local militia always defend. Siege of Constantinople (auto-resolved, 300 runs): start army 0%, with Giustiniani 1%, plus church union 9%, plus Venice and Genoa as allies 47%, plus 3 more companies 94%.

Armies with locations, announced attacks, invasion bases and coalitions (current): `reasonable` 9 runs top 3 in 4, first in 2 (later 6 runs: top 3 in 2, first in 2); `greedy` now meets coalitions (top 3 in 1–2 of 3–6). No AI runaway in a 300-year world run (largest: Ming 63 provinces); coalition wars fired against France and Bornu.

Goods economy (current): `reasonable` 9 runs, all survive, top 3 in 3, first in 1 (the version before goods: top 3 in 1 of 9). Late income 115 against 196 before goods: the simulated player buys and builds clumsily, so a careful player should do better. Trade routes do not use a yearly mission.

## Levers (where to tune)

- **Income:** `provinceIncome`, `tradeValue` (1 + 0.07 × partner development, capped at 4, each extra route ×0.8), building gold in `src/data/techs.ts`, settlement tiers (`TIERS`), price level (income follows 70% of inflation).
- **Goods** (`src/engine/trade.ts`, `src/data/goods.ts`): province output 0.5 + 0.15 × development (× 1 + grade with a matching extraction building; side output 0.5 of grain/fish/wood/meat otherwise). Needs a year: food 0.12 × development, cloth 0.02 × development, materials 0.08 per town building, tools 0.2 per extraction building, weapons 0.15 per company, gunpowder 0.25 per gun company or ship, naval stores 0.25 per ship, books & art 0.25 per temple/library/university, luxuries 0.25/0.5/1/1.5 by rank. Prices 1 (grain) to 7 (luxuries) × inflation. Route prices: buy 1.25 + 0.05 × distance (0.9 with a post), sell 0.85 − 0.05 × distance (1.2 with a post), ±0.1 with a trade treaty, 2% per merchant skill point. Warehouses hold max(4, 2 years of use); overflow sells at 0.5. One-off: buildings cost/12 materials, develop 2, settle 3, grow 4, a company 1 weapons (+1 powder for guns, +1 leather for cavalry), a ship 2 naval stores. Routes 3 (+1 per post, +1 Banking, +2 Mercantilism); posts 1 (+1 each Navigation, Banking, Mercantilism).
- **Costs:** troop and ship upkeep (follow inflation), building salaries, goods bought abroad and trade posts, administration `0.14 × provinces^1.45 × inflation`.
- **Gold sinks:** construction, development, settlements, patronage, festivals, sale of offices (40 × inflation, rising each use in a year, for 2 nation points).
- **Cards:** hand limit per kind = 3 + 1 at 5, 10, 16 and 25 provinces (3 to 7). Yearly rate per kind capped at 2.5.
- **Big realms:** happiness −0.9 per province above 10 (up to −20), on top of foreign culture (−12) and other faiths (−18); administration grows faster than the realm.
- **Battles:** general skill +10% output and −3.5% damage taken per point; trait strength by rarity; only the first 5 companies (6 ships) fight at full strength, the rest at 40%. Battle check (`/tmp` harness in the session): a legendary general with 5 companies beats 6 ordinary ones ~90%, with 4 vs 6 ~30%, with 3 vs 6 never; outdated troops lose even with a genius.
- **AI:** declares war on the player only with 1.5× strength and after the first 10 years; at most one attack on the player a year; rarely presses a player down to 3 provinces, and offers peace when it is winning; army growth and troop upgrades lag the player; conquered AI provinces may rebel back to their old crown (more often in big AI empires), and fallen crowns can return.
- **Score:** half of prestige + 4 per owned development + 2 per development in subjects.
