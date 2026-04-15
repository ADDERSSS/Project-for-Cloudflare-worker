# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Type

This is a Cloudflare Worker project. Workers run on Cloudflare's edge network using the V8 isolate runtime — not Node.js. Key constraints:

- No Node.js built-ins (`fs`, `path`, `http`, etc.) unless polyfilled via `nodejs_compat` flag
- Use Web APIs: `fetch`, `Request`, `Response`, `URL`, `crypto`, `TextEncoder`, etc.
- Entry point exports a `fetch` handler (and optionally `scheduled`, `queue`, etc.)

## Common Commands

Once the project is initialized, typical commands are:

```bash
# Install dependencies
npm install

# Local dev server (do NOT run via Claude — run manually in your terminal)
npx wrangler dev

# Deploy to Cloudflare
npx wrangler deploy

# Run tests (single pass, no watch)
npx vitest run

# Type check
npx tsc --noEmit

# Lint
npx eslint src
```

## Typical Structure

```
src/
  index.ts        # Worker entry point — exports fetch handler
wrangler.toml     # Cloudflare Worker config (name, routes, bindings, compatibility_date)
tsconfig.json     # Should include "types": ["@cloudflare/workers-types"]
package.json
```

## Key Patterns

**Entry point shape:**
```ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response("Hello World");
  },
};
```

**Environment bindings** (KV, D1, R2, secrets, vars) are typed via an `Env` interface and injected as the second argument to handlers — never use `process.env`.

**`wrangler.toml`** controls bindings, routes, `compatibility_date`, and `compatibility_flags`. The `compatibility_date` should be kept current.

**Durable Objects** require `ctx.waitUntil()` for async work that outlives the response.
