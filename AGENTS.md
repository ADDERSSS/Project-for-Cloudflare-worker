# AGENTS.md

This file provides guidance to Codex when working in this repository.

## Project Summary

LinkMark is a Cloudflare Workers-based personal bookmark manager with:

- bookmark CRUD, search, archive, and tags
- short links with KV-backed redirect caching
- Workers AI summaries and suggested tags
- analytics widgets on the dashboard
- public collections at `/c/:slug`
- R2 favicon storage and accent-color extraction

## Runtime Constraints

- This is a Cloudflare Worker, not a traditional Node.js server
- `nodejs_compat` is enabled, but Web APIs are still preferred
- use `fetch`, `Request`, `Response`, `URL`, `crypto`, `TextEncoder`, `HTMLRewriter`
- bindings come from the `env` argument, never from `process.env`

## Common Commands

```bash
npm install
npm run cf-typegen
npx wrangler d1 migrations apply DB --local
npm run dev
npm test
npx tsc --noEmit
npm run deploy
```

## Important Deployment Note

Before production deploys, fix the remote D1 migration tracking table first:

```bash
npx wrangler d1 execute DB --remote --command "INSERT INTO d1_migrations (name) VALUES ('0001_initial.sql')"
npx wrangler d1 migrations apply DB --remote
```

If the insert reports that the row already exists, continue with the migration apply step.

Also confirm the target Cloudflare account has Workers AI enabled before the first live AI request.

## Project Structure

```text
src/index.ts                          # Worker entrypoint
src/router.ts                         # lightweight router
src/middleware/auth.ts                # auth + public route whitelist
src/handlers/api/bookmarks.ts         # bookmark CRUD + AI retry + async enrichment
src/handlers/api/collections.ts       # collection CRUD
src/handlers/api/shortlinks.ts        # short link CRUD
src/handlers/api/stats.ts             # stats endpoints
src/handlers/api/tags.ts              # tag CRUD
src/handlers/pages/dashboard.ts       # dashboard page
src/handlers/pages/bookmark-form.ts   # add/edit bookmark page
src/handlers/pages/collection.ts      # public collection page
src/handlers/pages/login.ts           # login page
src/handlers/pages/shortlinks-page.ts # short links page
src/handlers/pages/tags-page.ts       # tags page
src/handlers/redirect.ts              # /s/:code redirect
src/templates/layout.ts               # layout + command palette + toast
src/templates/components.ts           # reusable cards, SVG charts, modals
src/templates/animations.ts           # custom CSS and reduced-motion handling
src/db/queries.ts                     # D1 query layer
src/db/migrations/0001_initial.sql
src/db/migrations/0002_ai.sql
src/db/migrations/0003_collections.sql
src/utils/ai.ts                       # page extraction + Workers AI helpers
src/utils/color.ts                    # accent color helpers
src/cron/aggregate-stats.ts           # daily analytics aggregation
src/cron/cleanup.ts                   # expired short link cleanup
test/index.spec.ts                    # worker integration tests
```

## Implementation Patterns

### Async enrichment

- creating a bookmark should stay responsive
- favicon fetch, accent color extraction, and AI summarization run via `ctx.waitUntil()`
- AI work is cached in KV by URL hash

### Public collections

- `/c/:slug` is public and bypasses auth
- collection pages are cached with `caches.default`
- invalidate collection cache whenever collections or included bookmarks change

### Analytics

- redirects should try KV first
- click data lands in `click_logs`
- cron jobs roll data into `daily_stats`

### Frontend

- HTML is server-rendered
- Alpine.js handles page interactivity
- the command palette lives in `src/templates/layout.ts`
- bookmark card rendering and SVG chart helpers live in `src/templates/components.ts`
- preserve reduced-motion support when adding animations
