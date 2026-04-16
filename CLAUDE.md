# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Type

This is a Cloudflare Worker project. Workers run on Cloudflare's edge network using the V8 isolate runtime — not Node.js. Key constraints:

- No Node.js built-ins (`fs`, `path`, `http`, etc.) unless polyfilled via `nodejs_compat` flag (已启用)
- Use Web APIs: `fetch`, `Request`, `Response`, `URL`, `crypto`, `TextEncoder`, etc.
- Entry point exports a `fetch` handler (and optionally `scheduled`, `queue`, etc.)

## Common Commands

```bash
npm install              # Install dependencies
npm run dev              # Local dev server (run manually in terminal, NOT via Claude)
npm run deploy           # Deploy to Cloudflare
npm test                 # Run tests (vitest, single pass)
npx tsc --noEmit         # Type check
npm run cf-typegen       # Generate types from wrangler.jsonc bindings
```

## Project Structure

```
src/index.ts             # Worker entry point
test/index.spec.ts       # Tests using @cloudflare/vitest-pool-workers
wrangler.jsonc           # Worker config (bindings, compatibility_date, compatibility_flags)
vitest.config.ts         # Vitest config with Cloudflare Workers pool
tsconfig.json
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

**`wrangler.jsonc`** controls bindings, routes, `compatibility_date`, and `compatibility_flags`. The `compatibility_date` should be kept current.

**Durable Objects** require `ctx.waitUntil()` for async work that outlives the response.
