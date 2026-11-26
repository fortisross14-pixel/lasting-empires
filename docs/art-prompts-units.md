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
