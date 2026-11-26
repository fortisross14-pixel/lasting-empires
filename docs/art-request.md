# The consolidated art request (history plan, phase 5)

Everything the game still lacks a painting for, in seven sheets. You make them in ChatGPT; I slice the sheets,
compress the tiles to `art/<id>.webp` (256 × 256) and wire them in. Until a painting arrives, every item already
shows something: a unit borrows the nearest European painting (`ALIAS` in `src/ui/art.ts`), a card or building its
line icon. So the sheets can come in any order, one at a time.

## Received

All seven sheets are in the game (November 2026): 42 troops and ships, 27 national and specialist cards (four share a painting) and 15 national buildings (shown when a row of the build list is opened). Nothing on this list borrows a painting any more.

## How to make a sheet

1. A new ChatGPT conversation. Attach three tiles we already have, so the style matches:
   `art/unit_knights.webp`, `art/unit_galleon.webp`, `art/card_embassy.webp`.
2. Paste the **STYLE** block from `docs/art-prompts-phase2.md` once.
3. Paste one sheet's prompt below. One prompt gives one image.
4. Check before saving: exactly 4 columns and the number of rows asked, the subjects in the order asked, no writing
   anywhere, the empty tiles plain parchment. If one fails: "Redo it: exactly 4 columns and N rows, same subjects
   in the same order, no text".
5. Save as a PNG under the file name given, and send it in the chat (or put it in `art/incoming/` on main).

Every sheet is **1024 pixels wide, 4 columns of 256 × 256 tiles**, as many rows as it says: 2 rows = 1024 × 512,
3 rows = 1024 × 768, 4 rows = 1024 × 1024. The style is the **unit card tiles**: flat hand-coloured woodcut, one
figure or a small group, three-quarter view, large and centred, plain warm parchment, no scenery, no text.

Order of value if time is short: sheets 1–4 (troops seen in every battle), then 5 (national cards), 6, 7.

---

## Sheet 1 · `units-world.png` · 4 × 4 · the peoples outside Europe

Already written out in `docs/art-prompts-units.md` (15 troops, the last tile blank). Tiles 1–15 become `warriors`,
`elite_warriors`, `slingers`, `spearmen`, `shield_warriors`, `archers`, `sahel_horse`, `azaps`, `janissaries`,
`horse_archers_foot`, `sipahis`, `militia`, `horse_archers`, `rajput_swords`, `war_elephants`.

## Sheet 2 · `units-americas.png` · 4 × 2 · Andean and Mesoamerican

```
Row 1: 1. Inca spearmen: bronze-tipped spears, checkered tunics, quilted cotton armour.
2. Inca mace warriors: star-headed bronze maces, small square shields.
3. Andean slingers whirling woven wool slings.
4. The Inca imperial guard: gold-trimmed tunics, tall feathered headdresses, gold discs.
Row 2: 5. Mexica warriors with obsidian-edged macuahuitl clubs and round feathered shields.
6. Skirmishers hurling darts with spear-throwers (atlatl).
7. A jaguar warrior in a jaguar-skin suit and helmet.
8. An eagle warrior in a feathered suit with a beaked helmet.
```

Tiles become `inca_spearmen`, `mace_warriors`, `andean_slingers`, `inca_guard`, `macuahuitl_warriors`,
`atlatl_skirmishers`, `jaguar_warriors`, `eagle_warriors`.

## Sheet 3 · `units-eastasia.png` · 4 × 3 · Ming China and Japan

```
Row 1: 1. Ming spearmen in red coats and brigandine with long spears.
2. Ranks of Chinese crossbowmen, one loading, one shooting.
3. Ming soldiers with hand cannon on poles, smoke.
4. Ming cavalry in lamellar armour with lances and bows.
Row 2: 5. A bronze Ming cannon on a wooden frame, two gunners.
6. Japanese ashigaru with long yari and conical hats.
7. A samurai in laced armour with a katana.
8. Japanese archers with tall asymmetric yumi bows.
Row 3: 9. Ashigaru firing matchlocks in a line.
10. A mounted samurai with a bow and a banner on his back.
11. Leave plain parchment.
12. Leave plain parchment.
```

Tiles become `ming_spearmen`, `chinese_crossbow`, `early_handgunners`, `chinese_cavalry`, `chinese_artillery`,
`ashigaru`, `samurai`, `yumi_archers`, `teppo_ashigaru`, `mounted_samurai`.

## Sheet 4 · `units-seas.png` · 4 × 3 · Southeast Asia, the ships of the eastern seas, Pike and Shot

```
Row 1: 1. Bornean warriors with spears and long narrow wooden shields.
2. Malay warriors with kris and kampilan swords.
3. Island fighters with blowpipes and javelins.
4. Small bronze swivel guns (lantaka) fired from a wooden stockade.
Row 2: 5. A Malay oared warship with tanja sails (lancaran).
6. A great Javanese trading ship with several masts (jong).
7. A Chinese war junk with battened sails.
8. An Arab dhow with a lateen sail.
Row 3: 9. A pike block with musketeers at its corners (pike and shot).
10. Leave plain parchment.
11. Leave plain parchment.
12. Leave plain parchment.
```

Tiles become `bornean_spearmen`, `malay_swordsmen`, `island_skirmishers`, `lantaka_gunners`, `lancaran`, `jong`,
`junk`, `dhow`, `pike_and_shot`.

## Sheet 5 · `cards-national.png` · 4 × 4 · the national cards (first sixteen)

Same tile style, but a small scene rather than soldiers alone (like `art/card_embassy.webp`).

```
Row 1: 1. Labourers paving a stone road across the Andes (Imperial Road Network).
2. An Inca relay runner (chasqui) with a conch, mountains behind.
3. Villagers carrying stones to a terrace wall (Mit'a labour).
4. Warriors rolling boulders down a mountain pass (Highland Ambush).
Row 2: 5. Round stone storehouses on a hillside (Qollqa).
6. A Mexica warrior receiving a jaguar costume (Jaguar promotion).
7. Porters bringing tribute bundles of cloth and feathers to a scribe.
8. A crowded lakeside market with canoes and goods (Tlatelolco).
Row 3: 9. Youths training with wooden clubs (Warrior training).
10. Floating garden plots on a lake (chinampas).
11. Spanish light horsemen with lances and leather shields (Jinetes).
12. A Spanish commander directing pikes and arquebuses (Gonzalo's reforms).
Row 4: 13. A Spanish tercio square with flags.
14. Ships leaving a Spanish harbour (Royal Expedition).
15. A Chinese examination hall with candidates writing.
16. Grain barges on the Grand Canal.
```

Tiles become `card_imperial_road`, `card_chasqui`, `card_mita_labour`, `card_highland_ambush`,
`card_imperial_storehouses`, `card_jaguar_promotion`, `card_tribute_demands`, `card_tlatelolco`,
`card_warrior_training`, `card_lake_agriculture`, `card_jinetes_card`, `card_gonzalo_reforms`, `card_raise_tercio`,
`card_royal_expedition`, `card_imperial_exam_card`, `card_canal_convoy`. (Eagle Promotion shares the jaguar tile,
Tercio Viejo the tercio tile, Imperial Convoy the expedition tile.)

## Sheet 6 · `cards-national-2.png` · 4 × 3 · the national cards (the rest) and the foreign specialists

```
Row 1: 1. A Chinese arsenal with guns and bundles of arrows (Imperial Workshop).
2. Ming soldiers marching from a gate in the Great Wall (Mobilize the Garrisons / Frontier Defence).
3. Malay ships under monsoon sails, loaded (Monsoon Trade).
4. Island chiefs presenting gifts to a sultan (Maritime Tribute).
Row 2: 5. A guide leading men through a rainforest river (Forest Scouts).
6. A merchant handing a sealed letter to a foreign ruler (Merchant Envoys).
7. A fleet of small oared warships setting out (Naval Expedition).
8. Craftsmen taking apart a foreign gun on a bench (Study Foreign Weapons).
Row 3: 9. Foreign scholars with books arriving at a court (Invite Foreign Scholars).
10. Foreign artisans at a workshop door with tools (Recruit Foreign Artisans).
11. Soldiers inspecting captured armour and weapons after a battle (Study Captured Equipment).
12. Leave plain parchment.
```

Tiles become `card_imperial_workshop`, `card_frontier_defence`, `card_monsoon_trade`, `card_maritime_tribute`,
`card_forest_scouts`, `card_merchant_envoys`, `card_naval_expedition`, `card_foreign_weapons`,
`card_foreign_scholars`, `card_foreign_artisans`, `card_captured_equipment`. (Mobilize the Garrisons shares tile 2.)

## Sheet 7 · `buildings-national.png` · 4 × 4 · the national buildings

A building alone, three-quarter view, on parchment.

```
Row 1: 1. Round Inca stone storehouses (qollqa). 2. A roadside Inca way station (tambo).
3. Stepped agricultural terraces (andenes). 4. Chinampa garden plots with a hut.
Row 2: 5. A Mexica priestly school (calmecac). 6. A tribute warehouse with scribes.
7. A Spanish royal armoury with racks of pikes. 8. The Casa de Contratación in Seville.
Row 3: 9. A Spanish frontier castle. 10. A Ming imperial arsenal.
11. A Chinese examination hall with cells. 12. A porcelain kiln with blue-and-white wares.
Row 4: 13. A Bornean river port on stilts. 14. A Malay trading house with bales.
15. A foundry casting bronze cannon. 16. Leave plain parchment.
```

Tiles become `bld_qollqa`, `bld_tambo`, `bld_andenes`, `bld_chinampa_farms`, `bld_calmecac`, `bld_tribute_centre`,
`bld_royal_armoury`, `bld_casa_contratacion`, `bld_frontier_fortress`, `bld_imperial_arsenal`,
`bld_examination_hall`, `bld_porcelain_kiln`, `bld_river_port`, `bld_trading_house`, `bld_regional_foundry`.
(The build list shows line icons today; these are wired into it when they arrive.)

## What happens when a sheet arrives

I cut it into tiles, save each as `art/<id>.webp`, add the ids to the `ART` set in `src/ui/art.ts` (and take the
borrowed painting out of `ALIAS`), run the checks and push to main.
