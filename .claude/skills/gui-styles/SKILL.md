---
name: gui-styles
description: Interface rules for Lasting Empires — layout, touch targets, the three menu styles and how to test screens. Use when building or changing any panel, modal, card face or style.
---

# Lasting Empires — GUI rules

## Layout
- One-screen app: top bar (crest, year, resources, Missions, Chronicle) · map · bottom tabs (Military, Diplomacy, Internal, Economy, Research, End Year).
- Panels (`#sheet`) slide in from the right on wide screens (≥761px) and from the bottom on narrow ones. Each category panel starts with its cards (`cardSection`), then the information and people for that area.
- Modals (`openModal`) are for decisions: card use, mission planner, reveals, battles, drafts, succession.
- Every blocked action stays visible with its reason (`actionRow(..., blocked)`), never silently hidden, unless it can never apply (e.g. coastal-only buildings inland).

## Touch
- Minimum target 40–44px. No hover-only information: anything in a `title` must also be reachable by tapping.
- Map: tap selects (pointer capture + `elementFromPoint`), drag pans, pinch zooms.
- Test at 1180×820 (tablet landscape) and 390×844 (phone). The page must never scroll sideways.

## Menu styles
Three styles, switched from the title screen or the realm panel (`data-style` on `<html>`, saved in localStorage):
- **Chancery** (default, `[data-style="chancery"]`): the realm run by letters. Rag paper with laid lines, iron-gall ink, wax red and lapis initials, IM Fell English + Alegreya. No blurred shadows anywhere: cards get a woodcut hatch drawn inside their own box (padding-right/bottom 7px) and an ink frame on `::before` (`--frame` sets its colour). Pop-ups are deckled letters: the wax seal (`.seal`, added by `openModal`) cracks, then the letter unfolds. Outcomes stamp; End Year is a wax seal.
- **Chart Table** (`:root`, no `data-style`): dark teal lacquer, gold, Almendra display.
- **Heraldic Court** (`[data-style="heraldic"]`): royal purple, bright gold, Grenze Gotisch, banner-cut tabs and chamfered buttons.

Rules:
- All colours come from tokens (`--ink --panel --panel-2 --line --text --muted --gold --gold-2 --heading --sea --bar --float --r`). Never add a literal surface colour; add a token and define it in all three styles.
- Cards keep their vellum faces in every style: they are physical objects on the table. Only the chrome around them changes.
- New fonts must be added to the Google Fonts link in `scripts/build.mjs` with a fallback stack.

## Related skills
- `frontend-design`: use for any new visual direction or a fourth menu style (token plan first, one bold element, no templated defaults).
- `ux-audit`: run Nielsen's heuristics on a changed screen or flow before shipping it.
- `web-design-guidelines`: check changed UI files against the pinned rules (accessibility, focus, touch, animation).

## Testing screens
- `npm run build`, then drive `dist/index.html` with Playwright (preinstalled; `require('playwright')`). Click through prompts, open each tab, screenshot, and check `pageerror` is empty and `document.documentElement.scrollWidth <= innerWidth`.
- Publish the artifact from `dist/lasting-empires.html`; GitHub Pages serves the root `index.html` written by the build.
