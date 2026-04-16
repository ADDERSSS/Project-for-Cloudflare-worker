# LinkMark

A personal bookmark manager built entirely on **Cloudflare Workers**, showcasing D1 (SQL database), KV (key-value cache), R2 (object storage), and Cron Triggers — all in a single Worker with a polished frontend.

## Features

- **Bookmark Management** — Save, edit, search, tag, and archive bookmarks
- **Short Links** — Generate short redirect URLs with click tracking and KV-cached fast redirects
- **Tag System** — Color-coded tags with a preset palette picker, multi-tag filtering
- **Statistics Dashboard** — Real-time stats cards (bookmarks, clicks, links, tags) with cached aggregation
- **Auto Favicon** — Asynchronously fetches and stores favicons in R2 on bookmark creation
- **Cron Jobs** — Daily cleanup of expired short links and click log aggregation
- **Dark Mode** — System-aware with localStorage persistence and smooth transitions
- **Responsive Design** — Mobile sidebar, adaptive grid layout, glassmorphism navbar

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers (V8 isolate) |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Storage | Cloudflare R2 |
| Scheduling | Cron Triggers |
| Frontend | Inline HTML + Tailwind CSS CDN + Alpine.js CDN |
| Language | TypeScript (strict mode) |
| Testing | Vitest + @cloudflare/vitest-pool-workers |

## Architecture

```
src/
  index.ts                    # Entry point: fetch + scheduled handlers
  router.ts                   # Zero-dependency pattern-matching router (~45 lines)
  middleware/auth.ts           # Bearer token + cookie auth
  handlers/
    api/                      # REST API (bookmarks, tags, shortlinks, stats)
    pages/                    # Server-rendered HTML pages (5 pages)
    redirect.ts               # Short link redirect with KV fast path
  templates/
    layout.ts                 # Base HTML with nav, toast, dark mode
    components.ts             # Reusable UI components (cards, skeletons, modals)
    animations.ts             # Custom CSS keyframes and utilities
    error-pages.ts            # Styled 404/500 error pages
  db/
    queries.ts                # Type-safe D1 query layer
    migrations/0001_initial.sql
  services/                   # Business logic (not yet extracted)
  cron/                       # Scheduled task handlers
  utils/                      # HTML escaping, ID generation, validators
```

## Cloudflare Features Used

### D1 (SQL Database)
6 tables: `bookmarks`, `tags`, `bookmark_tags`, `short_links`, `click_logs`, `daily_stats`. All queries are type-safe with TypeScript interfaces. Supports batch operations for tag assignments.

### KV (Key-Value Store)
- **Short link redirect cache**: `sl:{code}` → `{url, bookmarkId}` for sub-millisecond redirects
- **Stats cache**: `stats:overview` with 5-minute TTL, auto-invalidated on writes

### R2 (Object Storage)
Stores favicons fetched asynchronously via `ctx.waitUntil()`. Served with `Cache-Control` headers.

### Cron Triggers
Runs daily at 03:00 UTC:
1. Cleans up expired short links (D1 + KV sync)
2. Aggregates click logs into `daily_stats`
3. Purges click log details older than 90 days

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)

### Local Development

```bash
# Install dependencies
npm install

# Initialize the local D1 database
npx wrangler d1 execute bookmarks-db --local --file=src/db/migrations/0001_initial.sql

# Start the dev server
npm run dev
```

The app runs at `http://localhost:8787`. Login with the token from `.dev.vars` (default: `dev-token-change-me`).

### Configuration

**`.dev.vars`** (local secrets, not committed):
```
AUTH_TOKEN=your-secret-token
```

**`wrangler.jsonc`** contains all bindings:
- `DB` — D1 database
- `CACHE` — KV namespace
- `ASSETS` — R2 bucket
- `BASE_URL` — Base URL for short links
- Cron: `0 3 * * *`

### Deploy to Cloudflare

```bash
# Create resources
npx wrangler d1 create bookmarks-db
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create bookmark-assets

# Update wrangler.jsonc with the returned IDs

# Set the auth secret
npx wrangler secret put AUTH_TOKEN

# Apply database migrations
npx wrangler d1 migrations apply bookmarks-db --remote

# Deploy
npm run deploy
```

### Commands

| Command | Description |
|---------|------------|
| `npm run dev` | Start local dev server |
| `npm run deploy` | Deploy to Cloudflare |
| `npm test` | Run test suite (15 tests) |
| `npx tsc --noEmit` | Type check |
| `npm run cf-typegen` | Regenerate types from wrangler bindings |

## API Reference

All API endpoints require authentication via `Authorization: Bearer <token>` header or `auth_token` cookie.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Dashboard page |
| `GET` | `/login` | Login page (public) |
| `POST` | `/api/login` | Authenticate (public) |
| `GET` | `/s/:code` | Short link redirect (public) |
| `GET/POST` | `/api/bookmarks` | List / Create bookmarks |
| `GET/PUT/DELETE` | `/api/bookmarks/:id` | Read / Update / Delete bookmark |
| `POST` | `/api/bookmarks/:id/archive` | Toggle archive |
| `GET/POST` | `/api/tags` | List / Create tags |
| `PUT/DELETE` | `/api/tags/:id` | Update / Delete tag |
| `GET` | `/api/shortlinks` | List short links |
| `POST` | `/api/bookmarks/:id/shortlink` | Generate short link |
| `DELETE` | `/api/shortlinks/:code` | Delete short link |
| `GET` | `/api/stats/overview` | Stats overview |
| `GET` | `/api/stats/clicks` | Click trend data |
| `GET` | `/api/assets/:key` | Serve R2 asset |

## Frontend Design

The frontend is server-rendered HTML with client-side interactivity powered by Alpine.js:

- **Glassmorphism navbar** with backdrop blur and saturation
- **Animated stat cards** with gradient icons and colored shadows
- **Staggered entrance animations** using CSS keyframes with spring-like easing
- **Skeleton loading states** with shimmer effect
- **Toast notifications** with icon indicators and slide-in animation
- **Color palette picker** for tags (16 preset colors)
- **Mesh gradient background** for subtle depth
- **Inter font** from Google Fonts for clean typography

## License

MIT
