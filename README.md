# Service Blueprint Demo

A guided, presentation-ready walkthrough of the Field Service total operating model (TOM). One fictional client, **Meridian Industrial Equipment**, is taken end to end through four beats: Placement, Blueprint, Deviation, and Payoff.

Built with Vite, React, TypeScript, and Tailwind, served as static assets by a Cloudflare Worker. The Worker also serves `POST /api/place`, which holds the placement scoring so the rubric never ships to the browser.

## Run it locally

```bash
npm install
npm run dev        # validates content, then serves app + Worker at http://localhost:5173
```

The dev server runs the real Worker (via `@cloudflare/vite-plugin`), so placement works exactly as it does in production. Access checks are skipped locally.

Other scripts:

| Command | What it does |
|---|---|
| `npm run validate` | Validates every `/content` file against its zod schema, checks cross-references, and confirms the rubric still places Meridian in the deep cell. |
| `npm run build` | Validate, typecheck, build, then fail if any scoring data appears in `dist/client`. |
| `npm test` | Unit tests for placement, the API response shape, the Access guard, and the Markdown export. |
| `npm run deploy` | Build, configure Cloudflare Access, then deploy. See below. |

## Deploy

The repo is connected to the `fsa` Worker in Cloudflare Workers Builds, and `wrangler.toml` already names that Worker, its account, and the `fsa.benvollmer.net` custom domain. `wrangler deploy` runs `npm run build` first (via `[build]` in `wrangler.toml`), so Workers Builds works with no build command set in the dashboard.

**The Worker fails closed.** Until the Access team domain and audience are set, it answers every non-local request with 403, so the demo is never served unprotected. Set them once with the command below; `keep_vars` preserves them across later Workers Builds deploys.

One-time setup:

1. Make sure Cloudflare Zero Trust has a team set up on the account.
2. Create `.env.deploy.local` (git-ignored):

   ```bash
   CLOUDFLARE_API_TOKEN=...   # Workers Scripts Edit, Workers Custom Domains Edit, Access: Apps and Policies Edit
   ACCESS_ALLOWED_EMAILS=ben@example.com,jesse@example.com,brian@example.com
   ```

Then deploy from your machine:

```bash
npm run deploy
```

`scripts/deploy.ts` creates or updates the Access application for the route **before** uploading the Worker, then runs `wrangler deploy` with the Access team domain and audience injected, so the Worker also verifies the Access token on every request (static assets included, via `run_worker_first`). Re-run it whenever the allowlist changes. If you manage Access yourself, set `SKIP_ACCESS_SETUP=1` and add `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` as variables on the Worker in the dashboard.

## Edit the content

All words on screen live in `/content/*.json`. Edit the JSON, run `npm run validate`, and refresh. No component changes needed.

| File | Holds |
|---|---|
| `config.json` | App title, the CRIM expansion string, vocabulary, and the Guided Tour steps with their talk tracks. |
| `client.json` | Meridian's fictional profile and pain points. |
| `grid.json` | Rows, columns, and all 12 cells with depth (`deep`, `contrast`, `coming`) and one-line descriptions. |
| `intake.json` | Placement questions, Meridian's default answers, and the answer presets. |
| `blueprint-profit-center__equipment.json` | The deep cell: tiered jobs, KPIs, question set, baseline process. |
| `blueprint-cost-center__appointment.json` | The contrast cell: summary, focus jobs, KPIs. |
| `deviations.json` | Off-blueprint requests, CRIM types, effort, ongoing burden, "Ask why" prompts, risk levels, punchline. |
| `payoff.json` | Blank-page vs. blueprint comparison, staffing shape, the single RSM reference, the Productization Ladder, and the closing line. |

The schemas are in `shared/schema.ts`. Validation fails with a precise path if something is missing or mistyped.

### Placement scoring (Worker only)

The scoring weights and rationale sentences are in `worker/placement-rubric.json`, imported only by the Worker. Never import anything from `/worker` in `/src`; the build fails if rubric text or weight data reaches `dist/client`. The API returns `{ cell, rationale }` and nothing else.

If you add an intake question or option, add its signals to the rubric too; `npm run validate` flags any gap and re-checks that Meridian's defaults still land the deep cell, and that the presets land the contrast cell and a coming cell.

## Presenting

- **Guided Tour** (default): Next and Back, or the arrow keys (PageUp and PageDown work for clickers). Each step shows a one-line talk track.
- **Explore**: jump anywhere from the sidebar; click grid cells to inspect them.
- The theme toggle is at the bottom of the sidebar. Tuned for 1920×1080 on a shared screen and readable on a laptop.
- Deep links: `/#/placement`, `/#/jobs`, `/#/kpis`, `/#/questions`, `/#/process`, `/#/deviation`, `/#/payoff`.
