# Lasting Empires — Historical identity, technological evolution and the Imperial Chronicle

The plan of record for the owner's specification of November 2026 ("Historical Identity, Technological Evolution &
Imperial Chronicle"). It follows the specification's own phases. Tick an item in the commit that finishes it.

The rule throughout: an evolution, not a redesign. Cards, people, missions, forging and culture stay as they are; the
upgrade makes what a realm can do follow its history, gives each civilisation its own content, and lets the
Chronicle tell the empire's story.

## Phase 1 — Correct technological eligibility ✅ (this commit)

- [x] **Regional heritage** (`src/data/heritage.ts`): the specification's 14 heritages (Western European,
  Mediterranean, Eastern European, Islamic Middle East, Central Asian steppe, South Asian, East Asian, Japanese,
  Mainland and Maritime Southeast Asian, West and East African, Mesoamerican, Andean). Each is a template of
  **capabilities** a realm has or lacks at the start: iron, European plate harness, horses, war elephants, gunpowder,
  cannon, warships of its own tradition, ocean sailing. Every people (culture) belongs to one; nations that differ from
  their group have overrides (Ming's ocean fleets, Korea's ship guns, Dai Viet's armies of foot, Brunei's and the
  Swahili cities' ocean trade, landlocked realms without warships…). Capabilities are not a ladder of civilisation.
- [x] **Later starts** have their own profiles (`LATER_CAPS`): by 1600 Japan has the matchlock and cannon, the
  steppe and the Sahel have guns, South Asia has cannon; by 1700 more has spread. After the start, nothing spreads by
  the calendar.
- [x] **One eligibility module** (`src/engine/technology.ts`): `capsOf`, `canRecruitUnit`, `canAcquireEquipment`,
  `canForgeRecipe`, `researchBlock`, `fitUnit`/`fitType`/`raise`, `adoptByContact`. Each answer carries its reason.
  What every unit and piece of equipment needs is one table (no Knights without plate and horses; no Arquebusiers
  without gunpowder; no galleon without ocean, cannon and ships).
- [x] **Every path uses it**: class troop cards resolve to the best soldier the realm can field and are never drawn
  when it can field none (Hire Cavalry for the Inca finds no horsemen instead of Jinetes); equipment and ship cards;
  forging (refused before anything is spent); hiring; starting armies and fleets of every realm at every start date;
  later starts; events and cards that hand out troops by name (`raise`: three Men-at-Arms for Castile are the nearest
  the Aztecs can field); rebel and new realms; AI recruiting, AI upgrades and AI shipbuilding; powder use in the goods
  (from each unit's needs, not a list by hand).
- [x] **No more Plate Armour for everyone**: a new game hands it only to a realm that can use it (others get
  Regimental Colours).
- [x] **Research**: technologies state the capabilities they need (Firearms needs gunpowder, Pike Square iron,
  Ocean Navigation warships…). The strangers' studies are the general way to gain a capability: Strangers' Arms
  (gunpowder and cannon), Strangers' Ships (warships and ocean sailing), and two new ones, Strangers' Horses and
  Strangers' Iron. A strangers' study opens only with **contact with a realm that has what it teaches**: a shared
  border, a war or a trade treaty (seeing a coast is not contact). Contact gives the chance to learn, not the mastery.
- [x] **The AI follows the same rules**: its recruiting still uses the date as its stand-in for research, but only
  within its realm's means; a capability spreads to an AI realm after years of contact with a realm that has it
  (gunpowder 8, cannon 12, horses 10, iron 15, warships 10, ocean 20); plate harness and elephants never spread this
  way. Each adoption is written in the realm's record.
- [x] **Saves** (version 7): a running game keeps every company the player raised; equipment cards the realm could
  never use are exchanged for one nation point each; AI armies are fitted to their means.
- [x] **Tests**: every army in the world fits its realm at 1451, 1600 and 1700 and after forty turns of AI
  recruiting; the Inca start without horses, guns, iron or plate, cannot hire cavalry or artillery, cannot forge plate
  (refused without cost); contact opens Strangers' Arms but not Firearms; the study then opens Firearms; Aztec armies
  are their own; Castile keeps its medieval kit; Ming has gunpowder; Brunei has ships; Japan gets guns by 1600, not
  in 1451. Balance: 9 campaigns against main, same survival, top-3 5 → 4, wins 3 → 4 (within the spread).

## Phase 2 — Civilisation content ✅

Done: the data is in `src/data/national.ts`, read by `src/engine/technology.ts` (troop lines, who may study what)
and `src/engine/national.ts` (national cards, the defence bonus, introductions). Each of the five has national troops,
4–5 national technologies (some known at the start), a national building, 5–6 national cards and a national strength
shown on the realm page; Japan and maritime Southeast Asia have their own troop lines too. The Tercio is Castile's
and Aragon's; everyone else with pikes and guns gets Pike and Shot. Research has a National filter. Left for later:
civilisation-specific forge recipes, and distinct content for every smaller realm (they use their heritage lines).

The plan as written:

1. **National units for the five reference civilisations**, reusing existing mechanics: Inca (Andean Levy, Inca
   Spearmen, Andean Slingers, Mace Warriors, Imperial Guard), Aztec (Mexica Levy, Spear and Macuahuitl Warriors, Atlatl
   Skirmishers, Jaguar and Eagle Warriors as elite promotions), Castile (Jinetes, Royal Armoury, the Tercio as a
   national specialisation of a generic Pike-and-Shot formation dated to the 1530s), Ming (Ming Spearmen, Chinese
   Crossbowmen, Early Handgunners, Chinese Cavalry and Artillery), Brunei (Bornean Spearmen, Malay Swordsmen, regional
   skirmishers, lancaran ships, blowpipe auxiliaries as a minor regional option only).
2. **Heritage troop lines** replacing the seven tech-group lines, so East Asia, Japan and Southeast Asia stop using
   European infantry; a generic **Pike and Shot** for everyone with pikes and guns, and the **Tercio** as Spain's.
3. **National technologies** (a National Traditions filter in Research), **national buildings** and **national
   cards** in the existing decks (about 10–15% of a deck's draws), with civilisation-specific forge recipes.
4. **A short historical introduction** for every playable nation, and a national passive modifier for the majors.
5. **Every playable nation** gets at least one distinctive technology, card and unit or building, reusing regional
   content where a smaller realm needs it.

## Phase 3 — Contact and diffusion ✅

Done in `src/engine/diffusion.ts`. Each AI realm knows what its region reaches alone (a study's date plus a lag
from its tech group's distance and its temper, worked out rather than stored) and learns up to six years sooner from
a neighbour, partner or enemy who knows it (`early`, the only thing saved). AI recruiting, re-arming and ships now
wait for the realm's own study of each kind. The player keeps `exposed`: what its contacts know (borders, wars,
treaties) and strange weapons met in battle, with a notice. A study seen is 10% cheaper; one ahead of its time
known nowhere is 10% dearer; a strangers' study with no teacher can be worked out alone at 2.5× (never horses or
elephants). Four specialist cards (Study Foreign Weapons, Invite Foreign Scholars, Recruit Foreign Artisans, Study
Captured Equipment) give a third of a foreign study at once. Forging plate harness takes 2 weapons from the
warehouses. Each study's page says who knows it and shows the whole path of missing studies, each step a link.
Foreigners at court come only through the specialist cards: courtiers carry no people of their own.

The plan as written:

1. Per-nation **known technologies** for the AI (lightweight research in place of the date stand-in), favouring its
   heritage and temper.
2. **Exposure records** for the player (exposed → studied → learned), from trade routes, embassies, battles, captured
   provinces and foreign people at court; a notice when foreign weapons are met.
3. **Research transfer and independent innovation**: studying an exposed innovation at 0.85–1.1× cost, transfer via
   foreign specialists at 0.6–0.8×, independent pioneering at 2–3× with the full prerequisite chain (never for horses).
4. **Foreign specialist cards**: Study Foreign Weapons, Invite Foreign Scholars, Recruit Foreign Artisans, Study
   Captured Equipment.
5. **Materials and supply**: knowing plate is not making it: a workshop and weapons goods required; reuse the goods.
6. Locked technology cards list every missing prerequisite and contact with a link to each; a compact dependency view
   in the technology's page.

## Phase 4 — The Imperial Chronicle ✅

Done. `src/engine/records.ts` keeps the data: the player's realm measured every year (score, rank, prestige,
development, provinces, treasury, income, army, navy, battles, technologies), the 20 leading powers every ten years
and at the start and the end, names and colours of every realm measured (kept when it falls), the player's wars with
their results, and the firsts of its civilisation. A year measured twice replaces itself; seventy years take about
13 KB. `src/ui/chronicle-page.ts` is the full-screen Chronicle, from Menu → The Imperial Chronicle or the realm's
page: Overview, World Powers (sortable, up to five realms compared on any measure, change of place), Economy,
Military (army by type, war archive), Civilisation (tradition, capabilities, firsts), Hall of Fame (honours earned
from real gains, monarchs, generals, the distinguished) and Annals (filterable). Charts (`src/ui/chart.ts`): fine
lines in national colours, one measure each, names at the line ends and a legend, a reading under the pointer.
Rules & Reference is its own entry in the menu. Older saves start their records on the year they are loaded.

The plan as written:

1. **Data first**: a yearly snapshot for every realm (score, rank, prestige, development, provinces, treasury,
   income, army and navy power, battles), a baseline at the start and a final one at the end, no duplicates after a
   reload, kept for realms that fall; a structured permanent archive of events separate from the short log.
2. **A full-screen Chronicle** with Overview, World Powers (sortable, comparable, trends), Economy, Military (army
   composition, war archive), Civilisation (technologies, first contacts, first firearms…), Hall of Fame (monarchs,
   generals, distinguished people, awards from real achievements) and Annals (filterable timeline).
3. **Rules & Reference** as its own entry in the main menu.
4. Charts in the game's own style (parchment, national colours, fine lines); laptop layout first.

## Phase 5 — Validation and balance (next)

1. Verify national content and dates; review regional technologies.
2. Multi-seed simulations across diverse starting nations and full campaign lengths; measure save size and speed.
3. Manual playtests of the five reference civilisations.
4. **The consolidated art request**: sprite sheets by region (Andean, Mesoamerican, East Asian, Southeast Asian
   with ships, Middle Eastern, African and Indian units), national buildings, foundational technology illustrations,
   heritage cards, with exact grid sizes, ids and order (the 15 units already listed in `docs/art-prompts-units.md`
   are part of it).
