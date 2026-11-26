# Art prompts: the soldiers of the rest of the world

Fifteen new troop types, one sheet. They replace the line icons the new troops show now. Same process as before:
paste the STYLE block from `docs/art-prompts-phase2.md` first, then this prompt, then send me the image.

The style must match the **original card tiles** (`art/unit_*.webp`: flat woodcut, one figure or group, plain
parchment behind), not the event scenes.

## `units-world.png`

```
One square image, 1024 × 1024: a grid of exactly 4 columns × 4 rows of square tiles, the same style as the
attached unit tiles: one figure or a small group, three-quarter view, large and centred, on plain warm parchment,
no scenery. In order:
Row 1: 1. Andean warriors with bronze star-headed maces and round shields (Inca levy).
2. An Aztec eagle warrior and a jaguar warrior with obsidian-edged clubs, in quilted cotton armour.
3. Andean slingers whirling slings, stones in a bag.
4. African spearmen with long spears and tall hide shields.
Row 2: 5. African shield warriors in a tight line, tall painted shields.
6. African archers with long bows, quivers on their backs.
7. A Sahel cavalryman in quilted armour on a horse in a quilted caparison, with a lance.
8. Ottoman azaps: light infantry with bows and short spears.
Row 3: 9. Ottoman janissaries in tall white felt caps, with matchlocks and yataghans.
10. Turkish foot archers drawing composite bows.
11. Ottoman sipahis: horsemen with lance and round shield, pointed helmets.
12. Chinese border militia with spears and padded coats.
Row 4: 13. Mongol-style horse archers at the gallop, shooting backwards.
14. Rajput swordsmen with curved talwars and round shields.
15. A war elephant in armour with a howdah and riders.
16. Leave this tile as plain parchment.
```

Tiles 1–15 become: `warriors`, `elite_warriors`, `slingers`, `spearmen`, `shield_warriors`, `archers`,
`sahel_horse`, `azaps`, `janissaries`, `horse_archers_foot`, `sipahis`, `militia`, `horse_archers`, `rajput_swords`,
`war_elephants`.

## Still to paint (November 2026): the troops of the peoples outside Europe

These 15 units have no painting; until they do, each borrows the nearest European painting of its kind (`ALIAS` in
`src/ui/art.ts`). Same format as the set above: `art/unit_<id>.webp`, 256 × 256, hand-coloured woodcut on cream paper.

| id | Unit | Borrows now | Subject to paint |
|---|---|---|---|
| warriors | Warriors | levy | Tribal foot warriors with clubs and hide shields |
| elite_warriors | Elite Warriors | men_at_arms | Veteran warriors in quilted armour, feathered |
| militia | Militia | levy | Town militia with spears and padded coats |
| spearmen | Spearmen | levy | African or Asian spearmen with tall shields |
| shield_warriors | Shield Warriors | men_at_arms | Close ranks of warriors behind big oval shields |
| azaps | Azaps | levy | Ottoman light infantry, bows and short spears, red caps |
| janissaries | Janissaries | arquebusiers | Ottoman janissaries in white börk hats with matchlocks |
| rajput_swords | Rajput Swordsmen | men_at_arms | Rajput swordsmen with talwar and round shields |
| slingers | Slingers | crossbow | Slingers whirling slings |
| archers | Archers | crossbow | Foot archers with recurve bows |
| horse_archers_foot | Archers | crossbow | Steppe archers on foot |
| sahel_horse | Sahel Horse | jinetes | Sahel cavalry in quilted horse armour with lances |
| horse_archers | Horse Archers | jinetes | Steppe horse archers turning to shoot |
| sipahis | Sipahis | knights | Ottoman sipahi cavalry with lance and round shield |
| war_elephants | War Elephants | knights | An armoured war elephant with a howdah |

### The national troops (phase 2 of docs/HISTORY-PLAN.md)

27 more, same format. Each borrows a European painting until it has its own.

| id | Unit | Borrows now | Subject to paint |
|---|---|---|---|
| inca_spearmen | Inca Spearmen | levy | Andean foot with bronze-tipped spears, checkered tunics, cotton armour |
| mace_warriors | Mace Warriors | men_at_arms | Inca warriors with star-headed bronze maces and small shields |
| andean_slingers | Andean Slingers | crossbow | Highland slingers with woven wool slings, mountains behind |
| inca_guard | Inca Imperial Guard | men_at_arms | Elite guard in gold-trimmed tunics, tall feathered headdresses |
| macuahuitl_warriors | Macuahuitl Warriors | men_at_arms | Mexica warriors with obsidian-edged macuahuitl and round chimalli shields |
| atlatl_skirmishers | Atlatl Skirmishers | crossbow | Skirmishers hurling darts with spear-throwers |
| jaguar_warriors | Jaguar Warriors | men_at_arms | Warriors in jaguar-skin suits and helmets |
| eagle_warriors | Eagle Warriors | men_at_arms | Warriors in feathered eagle suits with beaked helmets |
| ming_spearmen | Ming Spearmen | pikemen | Ming infantry with long spears, red coats, brigandine |
| chinese_crossbow | Chinese Crossbowmen | crossbow | Ranks of Chinese crossbowmen loading and shooting |
| early_handgunners | Early Handgunners | arquebusiers | Ming soldiers with hand cannon on poles |
| chinese_cavalry | Chinese Cavalry | jinetes | Ming horsemen with lances and lamellar armour |
| chinese_artillery | Chinese Artillery | bombard | Bronze Ming cannon on a wooden frame, gunners beside it |
| ashigaru | Ashigaru | pikemen | Japanese foot with long yari and conical jingasa hats |
| samurai | Samurai | men_at_arms | Samurai in laced armour with katana and naginata |
| yumi_archers | Yumi Archers | crossbow | Japanese archers with tall asymmetric bows |
| teppo_ashigaru | Teppō Ashigaru | arquebusiers | Ashigaru firing matchlocks in a line |
| mounted_samurai | Mounted Samurai | knights | Mounted samurai with bow and banner on his back |
| bornean_spearmen | Bornean Spearmen | levy | Bornean warriors with spears and long wooden shields |
| malay_swordsmen | Malay Swordsmen | men_at_arms | Malay warriors with kris and kampilan |
| island_skirmishers | Island Skirmishers | crossbow | Island fighters with blowpipes and javelins |
| lantaka_gunners | Lantaka Gunners | field_cannon | Small bronze swivel guns fired from a stockade |
| lancaran | Lancaran | galley | A Malay oared warship with tanja sails |
| jong | Jong | carrack | A great Javanese trading junk with multiple masts |
| junk | Junk | carrack | A Chinese war junk with battened sails |
| dhow | Dhow | caravel | An Arab dhow with a lateen sail |
| pike_and_shot | Pike and Shot | tercio | A mixed formation: a pike block with musketeers at its corners |
