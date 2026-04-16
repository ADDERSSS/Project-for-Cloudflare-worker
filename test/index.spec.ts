import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import worker from "../src/index";

// Apply DB schema before tests — D1 exec requires separate statements
const TABLES = [
  `CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, url TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', description TEXT DEFAULT '', favicon_key TEXT, screenshot_key TEXT, is_archived INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT DEFAULT '#6366f1')`,
  `CREATE TABLE IF NOT EXISTS bookmark_tags (bookmark_id TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY (bookmark_id, tag_id))`,
  `CREATE TABLE IF NOT EXISTS short_links (code TEXT PRIMARY KEY, bookmark_id TEXT NOT NULL, expires_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS click_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, short_code TEXT, bookmark_id TEXT NOT NULL, clicked_at TEXT NOT NULL DEFAULT (datetime('now')), user_agent TEXT, referer TEXT, country TEXT)`,
  `CREATE TABLE IF NOT EXISTS daily_stats (date TEXT NOT NULL, bookmark_id TEXT NOT NULL, clicks INTEGER DEFAULT 0, PRIMARY KEY (date, bookmark_id))`,
];

beforeAll(async () => {
  for (const sql of TABLES) {
    await env.DB.exec(sql);
  }
});

describe("Auth", () => {
  it("redirects unauthenticated requests to /login", async () => {
    const request = new Request("http://example.com/");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  it("allows access with valid Bearer token", async () => {
    const request = new Request("http://example.com/api/tags", {
      headers: { Authorization: `Bearer ${env.AUTH_TOKEN}` },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
  });

  it("serves login page without auth", async () => {
    const request = new Request("http://example.com/login");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    const text = await response.text();
    expect(text).toContain("LinkMark");
  });

  it("rejects invalid login token", async () => {
    const request = new Request("http://example.com/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "wrong-token" }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("accepts valid login token and sets cookie", async () => {
    const request = new Request("http://example.com/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: env.AUTH_TOKEN }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("auth_token=");
  });
});

describe("Bookmarks API", () => {
  const authHeaders = () => ({
    Authorization: `Bearer ${env.AUTH_TOKEN}`,
    "Content-Type": "application/json",
  });

  it("returns empty bookmark list initially", async () => {
    const request = new Request("http://example.com/api/bookmarks", {
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

  it("creates a bookmark", async () => {
    const request = new Request("http://example.com/api/bookmarks", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ url: "https://example.com", title: "Example" }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(201);
    const data = await response.json() as { id: string; url: string; title: string };
    expect(data.url).toBe("https://example.com");
    expect(data.title).toBe("Example");
    expect(data.id).toBeTruthy();
  });

  it("rejects bookmark with invalid URL", async () => {
    const request = new Request("http://example.com/api/bookmarks", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ url: "not-a-url", title: "Bad" }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
  });

  it("lists bookmarks after creation", async () => {
    // Create a bookmark first within this test
    const createReq = new Request("http://example.com/api/bookmarks", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ url: "https://list-test.com", title: "List Test" }),
    });
    const createCtx = createExecutionContext();
    await worker.fetch(createReq, env, createCtx);
    await waitOnExecutionContext(createCtx);

    const request = new Request("http://example.com/api/bookmarks", {
      headers: authHeaders(),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    const data = await response.json() as { bookmarks: unknown[]; total: number };
    expect(data.total).toBeGreaterThanOrEqual(1);
  });
});

describe("Tags API", () => {
  const authHeaders = () => ({
    Authorization: `Bearer ${env.AUTH_TOKEN}`,
    "Content-Type": "application/json",
  });

  it("creates a tag", async () => {
    const request = new Request("http://example.com/api/tags", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: "test-tag", color: "#ff5733" }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(201);
    const data = await response.json() as { name: string; color: string };
    expect(data.name).toBe("test-tag");
    expect(data.color).toBe("#ff5733");
  });

  it("lists tags after creation", async () => {
    // Create a tag first within this test
    const createReq = new Request("http://example.com/api/tags", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: "list-test-tag" }),
    });
    const createCtx = createExecutionContext();
    await worker.fetch(createReq, env, createCtx);
    await waitOnExecutionContext(createCtx);

    const request = new Request("http://example.com/api/tags", {
      headers: authHeaders(),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const data = await response.json() as unknown[];
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects invalid tag name", async () => {
    const request = new Request("http://example.com/api/tags", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: "", color: "#000000" }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
  });
});

describe("Stats API", () => {
  it("returns stats overview", async () => {
    const request = new Request("http://example.com/api/stats/overview", {
      headers: { Authorization: `Bearer ${env.AUTH_TOKEN}` },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const data = await response.json() as { totalBookmarks: number };
    expect(data).toHaveProperty("totalBookmarks");
    expect(data).toHaveProperty("clicksToday");
    expect(data).toHaveProperty("totalShortLinks");
    expect(data).toHaveProperty("totalTags");
  });
});

describe("Routing", () => {
  it("returns 404 for unknown routes", async () => {
    const request = new Request("http://example.com/nonexistent", {
      headers: { Authorization: `Bearer ${env.AUTH_TOKEN}` },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("returns 404 for unknown short link", async () => {
    const request = new Request("http://example.com/s/nonexistent");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });
});
