---
name: gui-styles
description: Interface rules for Lasting Empires — layout, touch targets, the three menu styles and how to test screens. Use when building or changing any panel, modal, card face or style.
---

# Lasting Empires — GUI rules

## Layout
- One-screen app: top bar (crest, year, resources, Missions, Chronicle, End Turn) · map · bottom tabs (Military, Diplomacy, Internal, Economy, Research, People).
- Each bottom tab opens a centred window with tabs (`WIN_TABS`): Cards, Missions, then the area's own tabs. The Cards tab always reads top to bottom: **Get cards** (one shop button per card type: person, action, and in Military troop and improvement) then **Your cards**, grouped by type, identical cards stacked (×N), wide faces with the picture on the left and the words on the right.
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
- **Fonts**: Cormorant SC for titles (`--f-display`, `--f-title`), EB Garamond for body (`--f-body`). New fonts go in the Google Fonts link in `scripts/build.mjs` with a fallback stack.
- **Shades**: no blurred shadows. Depth is a hard ink offset: `--shadow` (3px 3px 0) for buttons and cards, `--shadow-lg` (5px) for windows and modals. Frames are 1.2–1.5px ink lines. Active tab = ink background, paper text. The crimson accent is for the one main action (End Turn, primary buttons, progress), never decoration.
- **Map**: realm colours are washed toward the paper with `wash(hex, k)` in `map.ts` (0.42 for others, 0.12 for the player and the picked realm) so the player's land reads first.
- **Coats of arms**: `armsSvg(id, color)` in `src/ui/banners.ts`; use the `shield(id, color, small)` helper in `app.ts`. Great realms have hand-made arms in `ARMS`; every other realm gets arms built from its id hash and colour (always the same). Add arms for a new major realm to `ARMS` rather than drawing letters.

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
- `npm run build`, then drive `dist/index.html` with Playwright (preinstalled; `require('playwright')`). Click through prompts, open each tab, screenshot, and check `pageerror` is empty and `document.documentElement.scrollWidth <= innerWidth`.
- Publish the artifact from `dist/lasting-empires.html`; GitHub Pages serves the root `index.html` written by the build.
