# Lasting Empires

A card-driven grand strategy game for tablets. Lead any of 148 realms from 1451, when Mehmed II takes the Ottoman throne, to 1750. One turn is one quarter of a year.

## Play

```
npm install
npm run build        # writes dist/index.html (standalone) and dist/lasting-empires.html
```

Open `dist/index.html` in any browser. The core menus (Military, Diplomacy, Internal, Economy, Research) open as a window with tabs: Cards, Missions (pick a person then a mission, or a mission then a person) and the menu's own pages. The game saves automatically in the browser, in one of three campaign slots (continue, replace or delete them from the title screen).

**Install it like an app.** On the GitHub Pages site, use the browser's *Install app* (Chrome/Edge) or *Share → Add to Home Screen* (Safari on iPad/iPhone). It then opens full screen from its own icon and works offline.

## How it plays

- **Everything is a card.** Five kinds: Military, Diplomacy, Internal, Economy, Research. You draw each at a yearly rate (1.0 base, fractions carry over), raised by buildings, research, cities and your monarch. Spend **nation points** to buy more: three are revealed, you keep one.
- **Three currencies.** Manpower (1 per troop or person hired), nation points (buy cards), ducats (troop upkeep, building salaries, imported goods).
- **People** have a rarity: Common, Uncommon, Rare, Epic, Legendary. Rarity sets their skill and how strong their traits are. Roles: general, diplomat, administrator, merchant, researcher. Diplomats can become explorers, generals conquerors, administrators colonists — permanently.
- **Missions** start from a mission card plus a free person of the right role: conquest, raids, embassies, trade routes (with an imported good), alliances, marriages, peace, research, buildings, development, new cities, voyages, colonies, conquistas.
- **Turns are quarters.** Income, manpower and cards come in each quarter; missions are measured in quarters (an embassy 2, a building 6–9, a religious mission 6–18 depending on your administrator). Each AI realm takes its yearly decisions in its own season. At the end of every turn a report shows your missions and the quarter's battles, each played out with its odds.
- **Realm rank.** Small Kingdom (6 missions a year), Kingdom (5+ provinces, 9), Great Kingdom (13+, 12 and one viceroy), Empire (30+, 15 and three viceroys). A viceroy governs the provinces around a seat for you and takes 2 of your yearly missions; a good one raises control, happiness and development, but able viceroys under a weak crown may crown themselves.
- **Civil wars.** Provinces below 25% happiness can rise. If the rebels beat your troops (local militia always help), they hold the province under their own banner — a faith league, a free people of a foreign culture, or a pretender when stability is very low — and unhappy provinces of the same cause next to them may join.
- **Constantinople, 1453.** The siege happens whoever you play. As Byzantium you have two years: hire Giustiniani, accept the union of the churches, find allies, raise troops — and even then it is a fight. As the Sultan it is very likely to fall.
- **The world.** 702 provinces and 148 realms on every continent, with three areas in equal detail: Europe (209 provinces), North Africa and the Middle East (149), East Asia (163). Any realm is playable: pick it on the world map. Each realm starts knowing its own part of the world.
- **Provinces** have a settlement (village → town → city → metropolis) and a countryside, each with its own building slots, plus population, development, control, one culture, one faith, a happiness level and a raw material.
- **Extraction.** Farms, pastures, mines, fisheries (coast only), woodcutters and plantations produce double on a matching raw material: farms on grain or cattle, mines on iron, gold, silver or salt, and so on.
- **Map views.** Realms, culture, religion, raw materials, happiness and population.
- **Ages.** Crusade → Discovery → Reformation → Absolutism → Enlightenment. An age opens when the first realm reaches its research (Ocean Navigation, Absolutism, Enlightened Government) or event (a prince protecting a reformer). No ocean voyages before Discovery. The pioneer gains prestige; if it is you, also nation points, cards and +0.4 cards a year for 25 years. Tap the year to see what opens the next age.
- **Monarchs.** When a ruler dies you choose one of three heirs. Each kind boosts different card rates, and some can act as a general, diplomat, merchant or researcher.
- **Forging, battles, history deck**: as before (Levy + Long Pikes → Pikemen, face-down tactics, branching historical events).
- **Navy.** Ship cards (galleys, caravels, carracks, galleasses, galleons, ships of the line) are fitted out by a general, who becomes an admiral for good. Attacks by sea need ships to carry the troops; enemy fleets intercept with sea battles (broadside, boarding, line of battle, weather gauge).
- **Peace.** Wars keep a score from provinces and battles. The winner spends it on reparations, provinces or vassalage.
- **Subjects.** Vassals pay a quarter of their income, personal unions 40%; both follow you to war and can later be integrated.
- **Happiness.** Each province has a culture and a faith. Happiness comes from faith, culture, arts, taxes, war weariness, food and festivals, and moves stability each year. Internal cards (patronage, religious missions, cultural integration, royal grace, festivals, charters, tolerance) act on it. Religious missions, cultural integration and royal grace go faster with a rarer administrator (legendary 2 years … common 6).
- **Overseas.** Explorers reveal regions of the map (Guinea, the Antilles, the Indies…). Colonists settle unclaimed native lands; conquerors take provinces of native empires. Colonial rivals and land neighbours settle the world too.
- **A world that reacts.** Other crowns offer alliances, marriages and vassalage; events answer how you rule: the new faith spreading, tax riots, plotting vassals, a genius painter, idle fleets, a golden age, petitions from foreign peoples, rival settlers.

## Code

- `src/data`: provinces (`provinces.ts`), generated map (`world.json`), nations, eras, troops and recipes, research, characters.
- `scripts/gen-world.ts`: builds `world.json` from Natural Earth coastlines (`npm run gen-world`) after editing provinces.
- `src/engine`: pure game rules (seeded RNG, no DOM). `turn.ts` runs a year; `ai.ts` runs rival nations.
- `src/ui`: map, cards, panels and modals.
- `scripts/sim.ts`: headless bot that plays full campaigns, for balance and crash testing.

## GitHub Pages

`npm run build` also writes `index.html` at the repo root. In the repo's Settings → Pages, choose **Deploy from a branch**, branch `main`, folder `/ (root)`. Rebuild and commit `index.html` after code changes.
