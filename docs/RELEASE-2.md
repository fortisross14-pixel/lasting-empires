# Release 2: thirty new scenarios (plan)

Release 1 has 40 missions: 9 lessons, 20 real, 11 wild. Most real ones start in Europe or with the great empires.
Release 2 adds **30**: 4 lessons, 13 real, 13 wild, spread over the parts of the world Release 1 barely touches
(Southeast Asia, Korea, Persia, the Sahel, the Andes, the Indian Ocean, the Baltic). They are built on what the
history plan added: national troops and cards, knowledge that spreads by contact, the Imperial Chronicle.

## The mix

| | Easy | Medium | Difficult | All |
|---|---|---|---|---|
| Lessons (beginner) | 4 | | | 4 |
| Real | 4 | 5 | 4 | 13 |
| Wild | 2 | 5 | 6 | 13 |

By area (a few count twice): Europe 7, Middle East 5, Africa 5, Asia 9, Americas 7. By start: 1451 ×19,
1600 ×8, 1700 ×3. By length: short (≤ 20 years) 4, medium (21–50) 6, long 20, like Release 1; a few long ones can
be cut to medium if you would rather have quicker games.

## Lessons (4): one new system each

| Id | Realm, years | What it teaches | Goals |
|---|---|---|---|
| `b_monsoon` · **Gifts of the Monsoon** | Brunei, 1451–1466 | National cards: play your own (Monsoon Trade, Merchant Envoys) | 2 trade routes; 1 trade post; play 2 national cards |
| `b_neighbours` · **Learning from Neighbours** | Korea, 1451–1466 | Contact: studies others know are cheaper; specialists | Learn 3 studies; play Invite Foreign Scholars |
| `b_societies` · **The Warrior Societies** | Aztec, 1451–1468 | Promotion cards: Jaguar and Eagle warriors | Field 2 Jaguar or Eagle companies; win 2 battles |
| `b_chronicle` · **The Sultan's Ledger** | Ottomans, 1600–1615 | Reading the Imperial Chronicle: rank, income, rivals | Top 3 by score; income among the top 5; keep Baghdad |

## Real (13)

| Id | Name | Realm, years | Difficulty | Area | The challenge |
|---|---|---|---|---|---|
| `black_army` | The Black Army | Hungary, 1451–1490 | Medium | Europe | Matthias Corvinus: take Vienna and Silesia, hold off the Ottomans at Belgrade |
| `grand_duke_west` | The Grand Duke of the West | Burgundy, 1451–1477 | Difficult | Europe | Join the two halves of Burgundy (Lorraine, Alsace) before the Swiss and France break you |
| `jagiellon` | The Jagiellonian Century | Poland, 1451–1525 | Easy | Europe | Make the Teutonic Order a subject and hold Prussia |
| `askia` | Askia's Empire | Songhai, 1451–1530 | Medium | Africa | Take Timbuktu and Djenné from Mali, rule the Niger bend |
| `manikongo` | The Manikongo's Cross | Kongo, 1451–1540 | Easy | Africa | Meet the Portuguese, learn their arms through contact, trade, keep your crown |
| `shah_abbas` | Shah Abbas | Safavids, 1600–1650 | Medium | Middle East | Retake Tabriz and Baghdad from the Ottomans, take Hormuz |
| `mamluk_twilight` | The Mamluk Twilight | Mamluks, 1451–1520 | Difficult | Middle East | Still rule Cairo and Damascus when the Ottoman storm has passed |
| `malacca_port` | The Port of the World | Malacca, 1451–1515 | Medium | Asia | Run the richest trade of the straits and still hold Malacca when the Portuguese come |
| `tokugawa` | The Tokugawa Peace | Japan, 1600–1640 | Easy | Asia | Unite Japan under one government and keep it at peace |
| `joseon_wall` | Joseon Stands | Korea, 1600–1650 | Difficult | Asia | Stay independent between the Manchu and Japan |
| `triple_alliance` | The Triple Alliance | Aztec, 1451–1519 | Easy | Americas | Bring Tlaxcala and the Purépecha under the alliance before 1519 |
| `mapuche` | The Unconquered | Mapuche, 1600–1700 | Difficult | Americas | No Spanish province south of the Biobío in 1700; learn horses and iron from the enemy |
| `omani_sea` | The Omani Sea | Oman, 1700–1750 | Medium | Middle East / Africa | Take Mombasa and Zanzibar, rule the trade of the Swahili coast |

## Wild (13)

| Id | Name | Realm, years | Difficulty | Area | What if |
|---|---|---|---|---|---|
| `inca_guns` | Thunder of the Andes | Inca, 1451–1530 | Difficult | Americas | The Inca work out iron and gunpowder alone, before any European arrives, and rule the whole Andes |
| `ming_america` | The Ming Find America | Ming, 1451–1560 | Medium | Asia / Americas | The treasure fleets sail east: discover the New World and hold 3 provinces in it |
| `brunei_pacific` | The Sultanate of the Pacific | Brunei, 1600–1700 | Difficult | Asia | Brunei rules the Philippines and the Spice Islands |
| `korea_seas` | The Turtle Ship Navy | Korea, 1600–1680 | Medium | Asia | Korea's fleet among the three strongest in the world, with a province in Japan |
| `timurid_renaissance` | The Timurid Renaissance | Timurids, 1451–1550 | Medium | Middle East | Persia reunited (the Qara Qoyunlu and Aq Qoyunlu lands) and 20 studies known |
| `kongo_brazil` | The Kongo Crosses the Sea | Kongo, 1600–1700 | Difficult | Africa / Americas | Kongo colonises Brazil |
| `vijayanagara` | The City of Victory Endures | Vijayanagara, 1451–1600 | Medium | Asia | The Bahmani gone, the Deccan yours, income among the top 5 |
| `scotland_brave` | Scotland the Brave | Scotland, 1451–1550 | Difficult | Europe | Scotland holds every English province of 1451 |
| `granada_endures` | Granada Endures | Granada, 1451–1550 | Difficult | Europe | Granada survives and takes Seville and Córdoba back |
| `novgorod` | Lord Novgorod the Great | Novgorod, 1451–1520 | Medium | Europe | The merchant republic swallows Muscovy instead |
| `iroquois` | The Longhouse Unbroken | Iroquois, 1700–1800 | Difficult | Americas | No colony left in the Iroquois homeland in 1800 |
| `golden_stool` | The Golden Stool Rules the Coast | Ashanti, 1700–1760 | Easy | Africa | Ashanti rules the Gold Coast and Dahomey and trades with everyone |
| `venice_china` | Marco Polo's Heirs | Venice, 1451–1550 | Easy | Europe / Asia | Venetian trade posts in India and China |

## What the game needs for them

1. **Three new kinds of goal**, each a few lines in `src/engine/missions.ts` (`goalView`):
   `capability` (your people know iron, gunpowder, horses… for Thunder of the Andes, The Unconquered),
   `fields` (n companies of a type, for The Warrior Societies), `battlesWon` (n during the mission).
   Optionally `nationalCards` (play n national cards, for Gifts of the Monsoon).
2. **A release tag**: `release: 2` on each new mission, a "Release 2" chip in the missions screen's filters,
   and a "New" mark on the cards until a mission is played once.
3. **A start tweak where a scenario needs one**: Release 1 hands over ducats and cards (`gold`, `cards`); a few wild
   ones also need a small setup (Ming America starts with two ocean ships, Kongo Brazil with a colonist).
   A `setup?: (s) => void` on the mission, kept short.
4. **Briefs in the game's voice**: every mission's text within the Release 1 length (two to three sentences); no
   mission screen over the word cap.

## Stars (in the game since November 2026)

Every mission but a lesson is won for one, two or three stars: ★ at Gentle, ★★ at Standard, ★★★ at Hard. The best
result is kept on this device and shown on the mission's card and page, with the total on the title screen. Release
2's difficulty targets below are for Standard; each scenario is also checked at Hard, to be sure three stars can be
earned.

## How each one is made and checked

- Data first (`src/data/missions.ts`), in batches of about eight, each batch pushed to main and live.
- Every scenario is played by the bot over several seeds (`MISSION=<id> npm run sim`), to check that it can be won
  and is not won by doing nothing. Targets: lessons almost always won when the hints are followed; easy 60–80% for
  the `reasonable` bot; medium 30–50%; difficult 10–25% (possible, never likely).
- The tests check every new mission: its realm exists in its start year, every province and realm a goal names
  exists, its tags come out as planned, and its text fits.

## After Release 2

Release 3 follows in a few days: more scenarios, and more of them with later start dates (1600, 1700).

## Order of work

1. ✅ The goals (`capability`, `fields`, `battlesWon`, `cardPlayed`, `nationalCards`), the release filter, the New mark and the setup hook.
2. ✅ Batch 1 (8): the four lessons, The Triple Alliance, The Jagiellonian Century, Tokugawa Peace, Marco Polo's Heirs (in the game; difficulty checked by the bot).
3. ✅ Batch 2: the remaining real scenarios (10).
4. ✅ Batch 3: the remaining wild scenarios (12). Changes from the plan: Oman already holds the Swahili ports in 1700, so it takes Pate and must keep them; the Mapuche already know horses and iron, so they must take Chile; the Mamluks and Joseon must still hold their capitals at the deadline (otherwise they would be won on the first day).
5. ✅ A first pass over difficulty from the bot's results (two to four games each at Standard; the bot now goes to
   war for a mission's provinces and works towards its trade posts). The mix as rated: lessons 4; real 2 easy,
   8 medium, 3 difficult; wild 1 easy, 4 medium, 8 difficult. The bot is a weaker conqueror and trader than a
   person, so the ratings lean hard; your own play corrects them.
