# Mobile Design Reference (from Google Stitch)

Pulled from the Stitch project **"Seisiun CRM Mobile UI"** (`projects/1567642168459158629`) on 2026-08-15 via the `stitch` MCP connector, so the design intent survives independently of any single chat session.

## Contents

- `design-system-light.md` — "Emerald Slate Light" design system: full color tokens, typography (Hanken Grotesk + JetBrains Mono), spacing, radii, and component guidelines, as YAML front-matter + prose.
- `design-system-dark.md` — "Emerald Slate Performance" (dark) equivalent.
- `screens/*.png` — rendered screenshots of each Stitch screen (mobile, 780px wide reference frames).
- `screens/*.html` — the actual generated HTML/CSS Stitch produced for each screen (ground truth for exact layout, spacing, and markup structure — more reliable than eyeballing the screenshot).

## Screens captured

| File | Stitch title | Notes |
|---|---|---|
| `screens/login.*` | Seisiun CRM - Login (Light) | Sign-in screen |
| `screens/launch.*` | Seisiun CRM - Launch Screen | Splash/loading screen |
| `screens/dashboard.*` | Seisiun CRM - Dashboard (Light) | KPI cards, pipeline summary, recent activity |
| `screens/pipeline.*` | Seisiun CRM - Pipeline (Light) | Deals/kanban-style pipeline view |
| `screens/contacts.*` | Seisiun CRM - Contacts (Light) | Contacts list |

Only 5 screens exist in the Stitch project as of this capture — it does not yet cover every module of the web app (no Leads, Accounts, Tasks, Email, or Settings screens). Treat these as the visual/tonal reference (color, type, spacing, component shapes) to extend consistently to the screens Stitch hasn't designed yet, not as a complete spec.

The `stitch` MCP server is registered in this project's local Claude config (see `claude mcp list`), so a future session can call `list_projects` / `list_screens` / `get_screen` again directly if more up-to-date screens are needed — this snapshot exists so that dependency is optional, since Stitch's asset download URLs are signed/expiring and the live screens can change.
