---
name: gui-styles
description: Interface rules for Lasting Empires — layout, touch targets, the three menu styles and how to test screens. Use when building or changing any panel, modal, card face or style.
---

# Lasting Empires — GUI rules

## Layout
- One-screen app: top bar (crest, year, resources, Goals, Menu, Skip, End Turn) · map · bottom tabs (Military, Diplomacy, Internal, Economy, Research, People).
- End Turn carries the count of things still open (`todo`, from `attention(S)`): `!N` in the war colour when N are urgent, else the plain count in ink. A deck tab shows a dot when one of its cards can be played now.
- The **Empire Agenda** (`src/ui/agenda.ts`, `#agenda`) sits over the map under the strip of wars: up to `AGENDA_MAX` titles by tier (urgent ! · opportunity ✦ · risk ▾ · long-term …), each a jump (`jumpTo`) to where it is done; the reasons are in the full list (`showAgenda`). Open by default on wide screens, folded on phones and in guided missions (`settings().agenda`). On the map it shows titles only and has its own word budget in the smoke test. Device settings live in `src/ui/settings.ts` (`settings()`, `setSetting`), not in the save; `data-motion="calm"` on `<html>` switches motion off.
- Each bottom tab opens a centred window with tabs (`WIN_TABS`): Cards, Missions, then the area's own tabs. The Cards tab always reads top to bottom: **Get cards** (one shop button per card type: person, action, and in Military troop and improvement) then **Your cards**, grouped by type, identical cards stacked (×N), wide faces with the picture on the left and the words on the right.
- The screens live in modules under `src/ui/` (`state`, `title`, `app`, `windows/*`, `sheets`, `planner`, `endturn`, `prompts`, `modal`). Shared state (`S`, `win`, `sheet`, `pick`…) is declared in `state.ts`; other modules read it by import and change it through its setter (`setWin(...)`), never by assignment.
- Side panels (`#sheet`) are for provinces, realms, missions and the chronicle.
- **Never a window on top of a window.** What the player looks through (a card, the task planner, a person, a picker) opens with `openPage` (`src/ui/modal.ts`): a page inside the open deck window with a Back button, or a dialog when no window is open. `closeModal()` closes whichever is showing, so buttons need not know. Give every page a button named Back, Close, Cancel or Keep it: Escape and the device's back button press it.
- Modals (`openModal`) are for what the game asks: events, reveals, battles, drafts, succession, confirmations. They may lie over a window or a page.
- Every blocked action stays visible with its reason (`actionRow(..., blocked)`), never silently hidden, unless it can never apply (e.g. coastal-only buildings inland).

## Touch
- Minimum target 40–44px. No hover-only information: anything in a `title` must also be reachable by tapping.
- Map: tap selects (pointer capture + `elementFromPoint`), drag pans, pinch zooms.
- Test at 1180×820 (tablet landscape) and 390×844 (phone). The page must never scroll sideways.

## Style: Ink & Cartography (style B)
One style, `data-style="chancery"` on `<html>`; its rules are the override block at the end of `src/styles.css` ("Style B").
- **Tokens**: `--ink` #f6f1e6 (paper), `--panel` #fbf8f1, `--card` #fffdf8, `--text` #1b1a17 (ink), `--wax`/`--gold` #b3261e (the one accent), `--sea` #dfe7e3. All colours come from tokens; never add a literal surface colour.
- **Fonts**: Cormorant SC for titles (`--f-display`, `--f-title`), EB Garamond for body (`--f-body`), shipped as `woff2` in `fonts/` and declared by `fonts/fonts.css` (inlined by `scripts/build.mjs`). No third family: a new one must be added to `fonts/` with its licence, to the Google link for the artifact page, and to the service worker list, so think twice.
- **Shades**: no blurred shadows. Depth is a hard ink offset: `--shadow` (3px 3px 0) for buttons and cards, `--shadow-lg` (5px) for windows and modals. Frames are 1.2–1.5px ink lines. Active tab = ink background, paper text. The crimson accent is for the one main action (End Turn, primary buttons, progress), never decoration.
- **Map**: realm colours are washed toward the paper with `wash(hex, k)` in `map.ts` (0.42 for others, `MINE_WASH` 0.3 for the player, 0.12 for the picked realm). The player's land reads first by the band of full colour along the inside of its border (`mineBand`), not by a darker fill.
- **Text size**: write every font size as `calc(Npx * var(--ts, 1))`; a check in `npm test` fails on a bare `font-size: Npx`. The two bars set `--ts: 1` (fixed height). Anything with a fixed height that holds text needs a rule under `:root[data-text]` to let it grow. Test new screens at 130% (`localStorage` setting `text: 1.3`) on 390 px.
- **Colour is never the only signal**: good and bad carry a mark as well (✓ ✕ on messages, ▴ ▾ in lists and on news cards, the outcome marks on outcomes). A new realm colour must stay apart from its neighbours' for colour-blind players: differ in lightness, not only in hue.
- **Coats of arms**: `armsSvg(id, color)` in `src/ui/banners.ts`; use the `shield(id, color, small)` helper in `src/ui/state.ts`. Great realms have hand-made arms in `ARMS`; every other realm gets arms built from its id hash and colour (always the same). Add arms for a new major realm to `ARMS` rather than drawing letters.

## People and pictures
- Faces: `art/face_<family>_<row><col>.webp`, sixteen for each of five families of dress. `faceOf(c, court)` chooses a face once and keeps it on the person (`c.face`); `ROLE_FACES` says which suit each role, `POOL_FAMILY` which family a people wears. Hire cards keep the role paintings (`role_*.webp`).
- Age plates: `art/age_<era id>.webp`, shown by `showReveal` when its title is the name of an age. Title scenes: `art/title_wide.webp` and `title_tall.webp`, set in CSS (`.title-bg`).
- Event paintings: `art/event_<scene>.webp` (480 × 320), named for events in `EVENT_ART` (`src/ui/art.ts`). A new painting is a file and a line there; the prompts that made the set are in `docs/art-prompts-phase2.md`.
- A person's page (`charDetail` in `modal.ts`) uses the wide card (`charCard(c, S, { wide: true })`) so the portrait is never squeezed, then loyalty and wish.
- `src/ui/share.ts` draws on a canvas with the same two fonts and the tokens' colours written out (a canvas cannot read CSS variables): keep `INK`, `PAPER`, `WAX` there in step with the style tokens.

## Sound
- Music is `src/ui/music.ts`: `syncMusic(culture)` is called on every refresh and acts only on a change; `stopMusic()` on the title. A piece is fetched whole with `fetch` and played from a blob, so the service worker can keep it (a media element's own ranged requests are not cacheable). Volume goes through a Web Audio gain, because iOS ignores an element's `volume`. A new piece is two files, `sound/music-<name>.ogg` and `.m4a`, and a line in `MUSIC_TRACKS`.
- `sfx(name)` from `src/ui/sound.ts` plays one of the effects in `RECIPES`; `buzz()` is the matching touch of haptics. Call them where the thing happens (a card played, a card turned, End Turn), never from the engine.
- Effects are synthesized (noise and tones), under a second, and never loop. A new moment gets a new recipe only if no existing one fits; the palette is paper, wax, quill, coin, drum, bell, lute.
- Sound never carries information alone: whatever it marks is also shown.

## Map
- Province shapes come from `scripts/gen-world.ts` (`npm run gen-world` after editing provinces); never edit `src/data/world.json` by hand. Realm borders (`.realm-edge`) and realm names (`.rlabel`) are drawn by `map.ts` from ownership; `.prov` strokes are hairlines.
- A new map view is an entry in `MAP_MODES`, a case in `fill` and one in `legendFor`.
- Ground marks are one small path for each province (`buildTerrain`, shapes in `TERRAIN_MARKS`), shown where province names show. Keep them one element a province: one path for the whole world was three times slower to pan. The paper grain is a pattern fill from a tile made once (`grainTile`); never a live SVG filter.

## Motion
- Windows and pop-ups rise 8px and fade in (`@keyframes rise`, ~180ms). Animate the `translate` property, never `transform`: `#win` is centred with `transform`, and a transform keyframe would knock it off centre.
- `#win.fresh` (added by `openWin` for 500ms) plays the window rise and staggers its cards. Only play entrance motion when a window opens, not on every re-render.
- A sideways swipe in a window moves between its tabs and on to the next deck (`stepTab`, `bindSwipe` in `windows/frame.ts`). Anything in a window that scrolls sideways must do so with `overflow-x: auto`, so the swipe is left to it.
- A task sent flies as a small card to its target (`flyCard` in `planner.ts`); it never delays the game and is off under reduced motion.
- Ink reveals use `@keyframes inkdraw` (clip-path). Keep motion under 300ms, and wrap it all in `@media (prefers-reduced-motion: reduce)` off-switches.

## Phone
- Under 480px the top bar drops labels (icons + numbers), the crest shows only the shield, and End Turn shrinks; nothing may wrap to a second line.
- Windows fill the screen below the top bar; tab rows scroll sideways inside themselves, never the page.
- Test with Playwright `devices['iPhone 13']` (390×844) and 1180×820; check `scrollWidth <= innerWidth` on every screen and that `pageerror` is empty.

## Related skills
- `frontend-design`: use for any new visual direction or a fourth menu style (token plan first, one bold element, no templated defaults).
- `ux-audit`: run Nielsen's heuristics on a changed screen or flow before shipping it.
- `web-design-guidelines`: check changed UI files against the pinned rules (accessibility, focus, touch, animation).

## Testing screens
- `npm run build && npm run smoke`: `scripts/smoke.cjs` drives `dist/index.html` with Playwright (preinstalled; `require('playwright')`) at both sizes through every deck window and tab, the panels, the menu, turns and the battle test. It fails on any page error or sideways scroll and writes screenshots to `docs/screens/` (not in git): look at the ones your change touches. Add a step there for every new screen.
- Publish the artifact from `dist/lasting-empires.html`; GitHub Pages serves the root `index.html` written by the build.
