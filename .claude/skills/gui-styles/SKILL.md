---
name: gui-styles
description: Interface rules for Lasting Empires — layout, touch targets, the three menu styles and how to test screens. Use when building or changing any panel, modal, card face or style.
---

# Lasting Empires — GUI rules

## Layout
- One-screen app: top bar (crest, year, resources, Goals, Menu, Skip, End Turn) · map · bottom tabs (Military, Diplomacy, Internal, Economy, Research, People).
- End Turn carries the count of things still open (`todo`, from `attention(S)`), and a deck tab a dot when one of its cards can be played now. Device settings live in `src/ui/settings.ts` (`settings()`, `setSetting`), not in the save; `data-motion="calm"` on `<html>` switches motion off.
- Each bottom tab opens a centred window with tabs (`WIN_TABS`): Cards, Missions, then the area's own tabs. The Cards tab always reads top to bottom: **Get cards** (one shop button per card type: person, action, and in Military troop and improvement) then **Your cards**, grouped by type, identical cards stacked (×N), wide faces with the picture on the left and the words on the right.
- The screens live in modules under `src/ui/` (`state`, `title`, `app`, `windows/*`, `sheets`, `planner`, `endturn`, `prompts`, `modal`). Shared state (`S`, `win`, `sheet`, `pick`…) is declared in `state.ts`; other modules read it by import and change it through its setter (`setWin(...)`), never by assignment.
- Side panels (`#sheet`) are for provinces, realms, missions and the chronicle.
- Modals (`openModal`) are for decisions: card use, mission planner, reveals, battles, drafts, succession.
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
- **Map**: realm colours are washed toward the paper with `wash(hex, k)` in `map.ts` (0.42 for others, 0.12 for the player and the picked realm) so the player's land reads first.
- **Coats of arms**: `armsSvg(id, color)` in `src/ui/banners.ts`; use the `shield(id, color, small)` helper in `src/ui/state.ts`. Great realms have hand-made arms in `ARMS`; every other realm gets arms built from its id hash and colour (always the same). Add arms for a new major realm to `ARMS` rather than drawing letters.

## Sound
- `sfx(name)` from `src/ui/sound.ts` plays one of the effects in `RECIPES`; `buzz()` is the matching touch of haptics. Call them where the thing happens (a card played, a card turned, End Turn), never from the engine.
- Effects are synthesized (noise and tones), under a second, and never loop. A new moment gets a new recipe only if no existing one fits; the palette is paper, wax, quill, coin, drum, bell, lute.
- Sound never carries information alone: whatever it marks is also shown.

## Map
- Province shapes come from `scripts/gen-world.ts` (`npm run gen-world` after editing provinces); never edit `src/data/world.json` by hand. Realm borders (`.realm-edge`) and realm names (`.rlabel`) are drawn by `map.ts` from ownership; `.prov` strokes are hairlines.
- A new map view is an entry in `MAP_MODES`, a case in `fill` and one in `legendFor`.

## Motion
- Windows and pop-ups rise 8px and fade in (`@keyframes rise`, ~180ms). Animate the `translate` property, never `transform`: `#win` is centred with `transform`, and a transform keyframe would knock it off centre.
- `#win.fresh` (added by `openWin` for 500ms) plays the window rise and staggers its cards. Only play entrance motion when a window opens, not on every re-render.
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
