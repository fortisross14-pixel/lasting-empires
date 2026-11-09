# Lasting Empires — Design Proposal (v0.2)

**Grand strategy-lite, card-driven, touch-first, single player vs AI.**
Alternate real history, nation-focused. Target campaign: 2–3 hours.

---

## 1. Pitch
Lead a nation from **1453 to 1750**. Your deck *is* your state: every
decree, army, treaty and reform is a card. History itself is a deck too —
the great events of the era are coming, face-down, but they won't
necessarily play out the way they did in our world.

## 2. Pillars
1. **Few decisions, heavy ones.** 1–3 meaningful choices per turn.
2. **History as a hidden hand.** Known events, unknown outcomes.
3. **Every nation plays differently.** Unique decks, ambitions, pressures.
4. **Thumbs first.** Tap, drag, long-press. Nothing needs hover or precision.

## 3. Setting & scope
- Map: Europe, Mediterranean, Near East — ~60 large provinces, plus
  off-map **Colonial / Trade regions** (Americas, Indies, Africa coast) as
  abstract slots, not map conquest.
- Playable nations (launch target, 8): Castile, Portugal, France, England,
  Austria, Venice, Ottomans, Muscovy. Minors are AI-only.
- Turn = 5 years → ~60 turns.

## 4. The nation (no pops, no spreadsheets)
| Stat | Meaning |
|---|---|
| **Treasury** | Money to play cards and pay armies |
| **Stability** | Low = revolts, estate demands, lost cards |
| **Might** | Army/navy strength, upkeep cost |
| **Prestige** | Victory points + diplomatic weight |

**Estates** (Nobility, Clergy, Burghers) each have Loyalty and Power.
Each holds a face-down **Demand** card that flips when loyalty drops —
the main domestic surprise engine.

**Leader card**: the current monarch/regime (Able, Weak, Zealot, Reformer…).
Changes every few turns; modifies hand size and adds/removes cards.
Light flavour only — the nation is the protagonist, not a dynasty.

## 5. Turn loop
1. **Income & draw** — refill hand from the national deck.
2. **History step** — the History Deck places 1–2 face-down events
   (on provinces, nations, or global).
3. **Actions** — spend Influence to play cards by dragging onto targets.
4. **Resolution** — wars, plots and events flip and resolve, animated.
5. **AI turns** — rivals do the same, under the same rules.
6. **Era check** — every ~10 turns an Era card changes the rules.

## 6. Cards
- **National deck** (~20 cards at start, built up over the game)
  - Administration: Tax Reform, Census, Centralize
  - Diplomacy: Royal Marriage, Alliance, Subsidy, Claim
  - Military: Levy, Fortify, Fleet, Mercenaries
  - Intrigue: Spy Network, Sabotage, Incite Revolt
  - Economy: Trade Company, Expedition, Manufactory
- **National cards**: each nation has 4–6 unique ones
  (Ottomans: *Janissaries*; Venice: *Arsenal*; Portugal: *Cape Route*).
- **Reforms/Institutions**: permanent upgrades that add, remove or
  improve cards — the progression system.
- Deck thinning matters: bad cards (Debt, Unrest, Pretender) get shuffled
  in by events and must be dealt with.

## 7. History Deck (the alternate-history core)
Real events arrive in **time windows**, face-down, with branching outcomes:

| Event | Window | Possible outcomes |
|---|---|---|
| Fall of Constantinople | 1453 | Falls / holds / a Latin rescue |
| Ocean Voyages | 1480–1510 | Whoever funds it discovers the New World |
| Reformation | 1510–1540 | Germany, England, nowhere, or *your* country |
| Printing Press | 1450–1480 | Spreads fast or slow, boosting Burghers |
| Great Plague return | random | Hits hidden provinces |
| Gunpowder Revolution | ~1500 | Era card: new military cards |

Your cards can **scout** (peek), **delay**, **accelerate** or
**redirect** history. That is where alternate history comes from.

## 8. War (fast and tense)
- Declare war by playing a Claim or Casus Belli card.
- Each round, both sides commit a **face-down battle card**
  (Flank, Hold the Line, Artillery, Retreat), then flip together.
  Rock-paper-scissors with modifiers from Might, terrain and generals.
- War Score fills a bar; **Peace Deal cards** decide what you can take.
- 1–3 rounds per turn; most wars last 1–3 turns.

## 9. AI
- Each AI nation has a **Personality** (Expansionist, Merchant, Zealot,
  Cautious) and 1–2 face-down **Ambitions**, revealed by spies or by its
  actions.
- Utility-scored card play using the same rules engine as the player —
  no cheating, with optional difficulty bonuses.
- Coalitions form against whoever leads in Prestige.

## 10. Winning
- **Prestige** total at 1750, ranked against rivals.
- Secret **Ambition cards** (3 drawn at start, pick 1, others can be
  unlocked): e.g. *"Hold Rome and Vienna"*, *"Own 3 trade regions"*,
  *"Be the Reformation's champion"*.
- Early win: overwhelming hegemony. Loss: collapse (capital lost, or
  Stability at zero for 2 turns).

## 11. Touch UX
- Landscape tablet: map in the centre, hand fan along the bottom, nation
  stats and estates on the left, rivals on the right.
- Drag a card → valid targets glow → drop. Long-press = details.
- Pinch/pan the map. One-tap undo until End Turn.
- Offline PWA with autosave.

## 12. Tech
- **TypeScript**, **PixiJS** (map and cards) + a light DOM overlay for
  menus; built with Vite; shipped as an installable **PWA**.
- Pure, deterministic rules engine (seeded RNG), separate from the UI:
  testable, replayable, shared by the AI.
- All content (cards, events, nations, provinces) is data (JSON/TS),
  so new content needs no new code.

## 13. Roadmap
1. **Prototype** — 1 region (Iberia + Italy, ~15 provinces), 3 nations,
   30 cards, 10 history events, placeholder art. *Question: is the loop fun?*
2. **Vertical slice** — full war system, estates, AI personalities,
   one Era change, ambitions.
3. **Full map & content** — 60 provinces, 8 nations, 150+ cards,
   40+ history events.
4. **Polish** — art, animations, sound, tutorial, difficulty levels,
   scenarios (1453 / 1520 / 1618 starts).
