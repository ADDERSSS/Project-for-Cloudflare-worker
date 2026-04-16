# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Summary

LinkMark is a personal bookmark manager built on Cloudflare Workers. The current implementation includes:

- bookmark CRUD, search, archive, tags
- short links with KV hot-path redirects and click logging
- Workers AI summaries and suggested tags
- yearly click heatmap, country charts, and per-bookmark sparklines
- public read-only collections at `/c/:slug`
- R2 favicon storage and accent-color extraction

## Runtime Constraints

- Cloudflare Workers runtime, not plain Node.js
- `nodejs_compat` is enabled, but prefer Web APIs first
- use `fetch`, `Request`, `Response`, `URL`, `crypto`, `TextEncoder`, `HTMLRewriter`
- environment bindings come from `env`, never `process.env`

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

Before running `npm run deploy`, handle the remote D1 migration tracking table first:

```bash
npx wrangler d1 execute DB --remote --command "INSERT INTO d1_migrations (name) VALUES ('0001_initial.sql')"
npx wrangler d1 migrations apply DB --remote
```

If the insert fails because the row already exists, continue with the migrations apply step.

Also confirm that Workers AI is enabled on the target Cloudflare account before the first production AI request.

## Project Structure

```text
src/index.ts                          # fetch/scheduled entrypoint
src/router.ts                         # minimal router
src/middleware/auth.ts                # auth + public route whitelist
src/handlers/api/bookmarks.ts         # bookmark CRUD + AI retry + async enrichment
src/handlers/api/collections.ts       # collection CRUD
src/handlers/api/shortlinks.ts        # short link CRUD
src/handlers/api/stats.ts             # stats endpoints
src/handlers/api/tags.ts              # tag CRUD
src/handlers/pages/dashboard.ts       # main dashboard
src/handlers/pages/bookmark-form.ts   # add/edit bookmark page
src/handlers/pages/collection.ts      # public collection page
src/handlers/pages/login.ts           # login page
src/handlers/pages/shortlinks-page.ts # short links page
src/handlers/pages/tags-page.ts       # tags page
src/handlers/redirect.ts              # /s/:code redirect
src/templates/layout.ts               # layout + command palette + toast
src/templates/components.ts           # cards, SVG charts, modals
src/templates/animations.ts           # custom CSS + reduced motion
src/db/queries.ts                     # D1 query layer
src/db/migrations/0001_initial.sql
src/db/migrations/0002_ai.sql
src/db/migrations/0003_collections.sql
src/utils/ai.ts                       # page extraction + Workers AI helpers
src/utils/color.ts                    # accent color fallback
src/cron/aggregate-stats.ts           # daily stats aggregation
src/cron/cleanup.ts                   # expired short link cleanup
test/index.spec.ts                    # integration tests
```

## Implementation Patterns

### Async enrichment

- bookmark creation returns quickly
- favicon fetch, accent color extraction, and AI summarization run inside `ctx.waitUntil()`
- repeated AI work is reduced with KV caching by URL hash

### Public collections

- `/c/:slug` is public and bypasses auth
- collection pages are cached with `caches.default`
- collection cache must be invalidated when collections or included bookmarks change

### Analytics

- redirect reads from KV first
- click logs are append-only in `click_logs`
- cron aggregates into `daily_stats`

### Frontend

- server-rendered HTML, Alpine.js for interaction
- command palette lives in `layout.ts`
- bookmark card UI and SVG charts live in `components.ts`
- keep reduced-motion behavior intact when adding new animations
