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


People menu and no hand limit (current): without a hand limit every drawn card is used, so draws were halved (base 0.5 a year per kind, cap 1.4) and March Orders became rare in normal draws (wars grant 3, or 2 when attacked; at peace only 2 are kept). With the old rates the simulated player won 9 of 9; with the old hand limit it won 0 of 6. Now: 9 of 9 survive, top 3 in 7, first in 6 (average rank 7.4 in 1750). Culture lifts late happiness from about 27% to about 50–57%.

1,038 provinces, research by age, hand limit by rank (current): AI realms now develop at 0.14 + 0.025 × √provinces a year (chance of +1 development; Ming about +1 every 2.5 years, a small realm every 5) and every crown's prestige fades 2% a year (was 1.5%). Before: the simulated player won 9 of 9, mostly on prestige (600–900 against 150–200) and on growth no AI matched. Now `reasonable` 9 runs: top 3 in 8, first in 5, often by a narrow margin (Castile 928 against Ming 979); `greedy` top 3 in 2 of 3, first in 2; `passive` survives small and never reaches the top. Hand limits per deck/in all: Small Kingdom 8/22, Kingdom 10/28, Great Kingdom 12/34, Empire 15/40 (lower limits for small realms widened the gap between big and small starts: Portugal fell to 0 of 3 in the top 3).

## Levers (where to tune)

- **Income:** `provinceIncome`, `tradeValue` (1 + 0.07 × partner development, capped at 4, each extra route ×0.8), building gold in `src/data/techs.ts`, settlement tiers (`TIERS`), price level (income follows 70% of inflation).
- **Goods** (`src/engine/trade.ts`, `src/data/goods.ts`): province output 0.5 + 0.15 × development (× 1 + grade with a matching extraction building; side output 0.5 of grain/fish/wood/meat otherwise). Needs a year: food 0.12 × development, cloth 0.02 × development, materials 0.08 per town building, tools 0.2 per extraction building, weapons 0.15 per company, gunpowder 0.25 per gun company or ship, naval stores 0.25 per ship, books & art 0.25 per temple/library/university, luxuries 0.25/0.5/1/1.5 by rank. Prices 1 (grain) to 7 (luxuries) × inflation. Route prices: buy 1.25 + 0.05 × distance (0.9 with a post), sell 0.85 − 0.05 × distance (1.2 with a post), ±0.1 with a trade treaty, 2% per merchant skill point. Warehouses hold max(4, 2 years of use); overflow sells at 0.5. One-off: buildings cost/12 materials, develop 2, settle 3, grow 4, a company 1 weapons (+1 powder for guns, +1 leather for cavalry), a ship 2 naval stores. Routes 3 (+1 per post, +1 Banking, +2 Mercantilism); posts 1 (+1 each Navigation, Banking, Mercantilism).
- **Costs:** troop and ship upkeep (follow inflation), building salaries, goods bought abroad and trade posts, administration `0.14 × provinces^1.45 × inflation`.
- **Gold sinks:** construction, development, settlements, patronage, festivals, sale of offices (40 × inflation, rising each use in a year, for 2 nation points).
- **Research:** `TECHS` in `src/data/techs.ts` (age, cost, plain effects `fx` summed by `techFx`). Costs by age about 20–30, 34–38, 46–53, 53–61, 64–72 points; a scholar makes 2 + skill (+ universities, traits, research effects) a year, so a study takes 2–7 years. Studying a tech before its historical year costs up to +1/40 per year early. No research beyond the current age.
- **Cards:** hand limit by rank (`HAND_LIMITS` in `src/engine/cards.ts`), permanent cards and burdens do not count; over the limit you sell extras for ½ nation point before ending the turn. Six kinds; base 0.5 a year per kind plus buildings, research, monarch, age; capped at 1.4 a year per kind. March Orders weight 0.6 at war, 0.2 at peace.
- **People:** works of art by outcome: happiness +1/+2/+3/+5/+6 fading over 1/2/3/5/8 years (monuments ×1.5), ducats 0/0/2/4/6 a year for 3–5 years, prestige 0/1/2/4/8, free cards 0/0/0/1/2; on show (library 1, university 2, museum 4) pay 1/2/4 a year from the Age of Enlightenment. Church favour: blessed ≥ 50 (+3 happiness for your faith, +1 prestige a year), censured ≤ −40 (−5, 20% stability −1 a year); gift 25 ducats +10 once a year; mission +3 to +40. Embraced cultures 2 + 1 per 12 provinces (+1 from the third age).
- **Big realms:** happiness −0.9 per province above 10 (up to −20), on top of foreign culture (−12) and other faiths (−18); administration grows faster than the realm.
- **Battles:** general skill +10% output and −3.5% damage taken per point; trait strength by rarity; only the first 5 companies (6 ships) fight at full strength, the rest at 40%. Battle check (`/tmp` harness in the session): a legendary general with 5 companies beats 6 ordinary ones ~90%, with 4 vs 6 ~30%, with 3 vs 6 never; outdated troops lose even with a genius.
- **AI:** declares war on the player only with 1.5× strength and after the first 10 years; at most one attack on the player a year; rarely presses a player down to 3 provinces, and offers peace when it is winning; army growth and troop upgrades lag the player; conquered AI provinces may rebel back to their old crown (more often in big AI empires), and fallen crowns can return.
- **Governments and revolutions** (`src/data/governments.ts`, `src/engine/government.ts`): effects use the research keys (`fx`, summed by `techFx`). A revolution raises max(4, 0.6 × your companies + 0.5 × rising provinces) rebel companies from the 40% of provinces farthest by land; their capital is the richest of them on the front line; win by taking it or breaking their army `BREAKS` = 3 times within `REVOLUTION_YEARS` = 12; failure costs 40% of the treasury, 3 cards, 2 stability, 15 prestige. Simulated player: 11 of 11 revolutions won, about 6 years each.
- **AI growth and prestige:** `AI_DEV_BASE`, `AI_DEV_SIZE`, `PRESTIGE_FADE` in `src/engine/ai.ts`.
- **Score:** half of prestige + 4 per owned development + 2 per development in subjects.
