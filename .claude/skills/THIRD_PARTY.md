# Third-party skills

These skills were copied from public repositories and reviewed before adding. Project skills (`game-design`, `gui-styles`) take precedence where they disagree.

| Skill | Source | Commit | Licence | Changes |
|---|---|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | `2c5958e` | Apache-2.0 (LICENSE.txt included) | None |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) + [web-interface-guidelines `command.md`](https://github.com/vercel-labs/web-interface-guidelines) | `1a2c79d` | MIT | Rules pinned locally in `rules.md` instead of fetched from the web at run time; added a note for this vanilla-DOM project |
| `ux-audit` | [popey/claude-code-skills](https://github.com/popey/claude-code-skills/tree/main/skills/ux-audit) (from bitjaru/styleseed) | `a5a6601` | MIT (code) / CC BY 4.0 (content) | None |
| `game-design-principles` | [popey/claude-code-skills](https://github.com/popey/claude-code-skills/tree/main/skills/game-development/game-design) | `a5a6601` | MIT / CC BY 4.0 | Renamed from `game-design` to avoid clashing with the project skill; description adjusted |
| `web-games` | [popey/claude-code-skills](https://github.com/popey/claude-code-skills/tree/main/skills/game-development/web-games) | `a5a6601` | MIT / CC BY 4.0 | None |

Considered and left out:
- Claude Code Game Studios (`balance-check`, `design-review`, `ux-review`, `playtest-report`): depend on that project's hook scripts, document registry and folder layout, and pre-approve shell commands for scripts that do not exist here.
- UI/UX Pro Max: 3.7 MB of Python scripts and data aimed at web/SaaS products.
- uxui-principles: an index that points to an external install and a paid API.
- webapp-testing (Anthropic): Python Playwright helpers; this project tests with Node Playwright (see `gui-styles`).
