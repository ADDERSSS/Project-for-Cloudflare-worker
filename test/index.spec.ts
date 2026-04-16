import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';

const TABLES = [
  `CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, url TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', description TEXT DEFAULT '', favicon_key TEXT, screenshot_key TEXT, ai_summary TEXT, ai_tags_suggested TEXT, ai_status TEXT DEFAULT 'pending', ai_processed_at TEXT, accent_color TEXT, is_archived INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT DEFAULT '#6366f1')`,
  `CREATE TABLE IF NOT EXISTS bookmark_tags (bookmark_id TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY (bookmark_id, tag_id))`,
  `CREATE TABLE IF NOT EXISTS short_links (code TEXT PRIMARY KEY, bookmark_id TEXT NOT NULL, expires_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS click_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, short_code TEXT, bookmark_id TEXT NOT NULL, clicked_at TEXT NOT NULL DEFAULT (datetime('now')), user_agent TEXT, referer TEXT, country TEXT)`,
  `CREATE TABLE IF NOT EXISTS daily_stats (date TEXT NOT NULL, bookmark_id TEXT NOT NULL, clicks INTEGER DEFAULT 0, PRIMARY KEY (date, bookmark_id))`,
  `CREATE TABLE IF NOT EXISTS collections (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT, is_public INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS collection_bookmarks (collection_id TEXT NOT NULL, bookmark_id TEXT NOT NULL, position INTEGER DEFAULT 0, PRIMARY KEY (collection_id, bookmark_id))`,
];

const authHeaders = () => ({
  Authorization: `Bearer ${env.AUTH_TOKEN}`,
  'Content-Type': 'application/json',
});

beforeAll(async () => {
  for (const sql of TABLES) {
    await env.DB.exec(sql);
  }

  const externalFetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (url.includes('/favicon.ico') || url.includes('google.com/s2/favicons')) {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    }

    return new Response(
      `<!doctype html>
       <html>
         <head>
           <title>Mock Page</title>
           <meta name="description" content="Mock description for AI summarization tests.">
           <meta name="theme-color" content="#111827">
         </head>
         <body>
           Cloudflare Workers AI testing content for bookmark summarization. This page contains enough text to trigger the AI summary flow.
         </body>
       </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      }
    );
  });

  vi.stubGlobal('fetch', externalFetch);
  (env as unknown as { AI: { run: () => Promise<unknown> } }).AI = {
    run: vi.fn(async () => ({
      response: JSON.stringify({
        summary: '这是一个用于测试的摘要。它验证了异步 AI 工作流。',
        tags: ['testing', 'cloudflare'],
      }),
    })),
  };
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('Auth', () => {
  it('redirects unauthenticated requests to /login', async () => {
    const request = new Request('http://example.com/');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login');
  });

  it('allows access with valid Bearer token', async () => {
    const request = new Request('http://example.com/api/tags', {
      headers: { Authorization: `Bearer ${env.AUTH_TOKEN}` },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
  });

  it('serves login page without auth', async () => {
    const request = new Request('http://example.com/login');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    const text = await response.text();
    expect(text).toContain('LinkMark');
  });

  it('accepts public collection routes without auth', async () => {
    const request = new Request('http://example.com/c/nonexistent');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });
});

describe('Bookmarks API', () => {
  it('returns empty bookmark list initially', async () => {
    const request = new Request('http://example.com/api/bookmarks', {
      headers: authHeaders(),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const data = await response.json() as { bookmarks: unknown[]; total: number };
    expect(data.bookmarks).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('creates a bookmark and enriches it asynchronously', async () => {
    const request = new Request('http://example.com/api/bookmarks', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url: 'https://example.com', title: 'Example' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);
    const created = await response.json() as { id: string };
    expect(created.id).toBeTruthy();

    const fetchRequest = new Request(`http://example.com/api/bookmarks/${created.id}`, {
      headers: authHeaders(),
    });
    const fetchCtx = createExecutionContext();
    const fetchResponse = await worker.fetch(fetchRequest, env, fetchCtx);
    await waitOnExecutionContext(fetchCtx);

    const bookmark = await fetchResponse.json() as {
      ai_status: string;
      ai_summary: string;
      accent_color: string;
      suggested_tags: string[];
    };
    expect(bookmark.ai_status).toBe('done');
    expect(bookmark.ai_summary).toContain('测试');
    expect(bookmark.accent_color).toBeTruthy();
    expect(bookmark.suggested_tags).toContain('testing');
  });

  it('supports manual reanalysis', async () => {
    const createRequest = new Request('http://example.com/api/bookmarks', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url: 'https://workers.cloudflare.com', title: 'Workers' }),
    });
    const createCtx = createExecutionContext();
    const createResponse = await worker.fetch(createRequest, env, createCtx);
    await waitOnExecutionContext(createCtx);
    const created = await createResponse.json() as { id: string };

    await env.DB.prepare(
      `UPDATE bookmarks SET ai_status = 'failed', ai_summary = NULL WHERE id = ?`
    ).bind(created.id).run();

    const request = new Request(`http://example.com/api/bookmarks/${created.id}/reanalyze`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);

    const fetchRequest = new Request(`http://example.com/api/bookmarks/${created.id}`, {
      headers: authHeaders(),
    });
    const fetchCtx = createExecutionContext();
    const fetchResponse = await worker.fetch(fetchRequest, env, fetchCtx);
    await waitOnExecutionContext(fetchCtx);
    const bookmark = await fetchResponse.json() as { ai_status: string };
    expect(bookmark.ai_status).toBe('done');
  });

  it('rejects bookmark with invalid URL', async () => {
    const request = new Request('http://example.com/api/bookmarks', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url: 'not-a-url', title: 'Bad' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
  });
});

describe('Tags API', () => {
  it('creates a tag', async () => {
    const request = new Request('http://example.com/api/tags', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'test-tag', color: '#ff5733' }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(201);
    const data = await response.json() as { name: string; color: string };
    expect(data.name).toBe('test-tag');
    expect(data.color).toBe('#ff5733');
  });

  it('lists tags after creation', async () => {
    const createRequest = new Request('http://example.com/api/tags', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'list-tag' }),
    });
    const createCtx = createExecutionContext();
    await worker.fetch(createRequest, env, createCtx);
    await waitOnExecutionContext(createCtx);

    const request = new Request('http://example.com/api/tags', {
      headers: authHeaders(),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const data = await response.json() as unknown[];
    expect(data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Collections', () => {
  it('creates a public collection and serves it without auth', async () => {
    const bookmarkRequest = new Request('http://example.com/api/bookmarks', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url: 'https://developers.cloudflare.com', title: 'Cloudflare Docs' }),
    });
    const bookmarkCtx = createExecutionContext();
    const bookmarkResponse = await worker.fetch(bookmarkRequest, env, bookmarkCtx);
    await waitOnExecutionContext(bookmarkCtx);
    const bookmark = await bookmarkResponse.json() as { id: string };

    const collectionRequest = new Request('http://example.com/api/collections', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: 'My Reads',
        slug: 'my-reads',
        description: 'A public test collection',
        isPublic: true,
      }),
    });
    const collectionCtx = createExecutionContext();
    const collectionResponse = await worker.fetch(collectionRequest, env, collectionCtx);
    await waitOnExecutionContext(collectionCtx);
    expect(collectionResponse.status).toBe(201);
    const collection = await collectionResponse.json() as { id: string };

    const attachRequest = new Request(`http://example.com/api/collections/${collection.id}/bookmarks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ bookmarkIds: [bookmark.id] }),
    });
    const attachCtx = createExecutionContext();
    const attachResponse = await worker.fetch(attachRequest, env, attachCtx);
    await waitOnExecutionContext(attachCtx);
    expect(attachResponse.status).toBe(200);

    const publicRequest = new Request('http://example.com/c/my-reads');
    const publicCtx = createExecutionContext();
    const publicResponse = await worker.fetch(publicRequest, env, publicCtx);
    await waitOnExecutionContext(publicCtx);
    expect(publicResponse.status).toBe(200);
    const html = await publicResponse.text();
    expect(html).toContain('My Reads');
    expect(html).toContain('Cloudflare Docs');
  });
});

describe('Stats API', () => {
  it('returns stats overview', async () => {
    const request = new Request('http://example.com/api/stats/overview', {
      headers: { Authorization: `Bearer ${env.AUTH_TOKEN}` },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const data = await response.json() as { totalBookmarks: number };
    expect(data).toHaveProperty('totalBookmarks');
    expect(data).toHaveProperty('clicksToday');
    expect(data).toHaveProperty('totalShortLinks');
    expect(data).toHaveProperty('totalTags');
  });
});

describe('Routing', () => {
  it('returns 404 for unknown routes', async () => {
    const request = new Request('http://example.com/nonexistent', {
      headers: { Authorization: `Bearer ${env.AUTH_TOKEN}` },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it('returns 404 for unknown short link', async () => {
    const request = new Request('http://example.com/s/nonexistent');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });
});
