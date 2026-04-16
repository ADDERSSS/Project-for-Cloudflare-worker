import { Handler } from '../../router';
import { jsonResponse, errorJsonResponse } from '../../utils/response';
import { generateId } from '../../utils/id';
import { isValidUrl } from '../../utils/validators';
import * as db from '../../db/queries';

export const handleBookmarks: Handler = async (req, env, ctx, params) => {
  const url = new URL(req.url);

  // POST /api/bookmarks
  if (req.method === 'POST' && !params.id) {
    const body = await req.json<{ url: string; title: string; description?: string; tagIds?: string[] }>();
    if (!body.url || !isValidUrl(body.url)) return errorJsonResponse('Invalid URL');
    if (!body.title?.trim()) return errorJsonResponse('Title is required');
    const id = generateId();
    await db.createBookmark(env.DB, { id, url: body.url, title: body.title.trim(), description: body.description, tagIds: body.tagIds });

    // Async favicon fetch
    ctx.waitUntil(fetchAndStoreFavicon(env, id, body.url));

    const bookmark = await db.getBookmark(env.DB, id);
    return jsonResponse(bookmark, 201);
  }

  // POST /api/bookmarks/:id/archive
  if (req.method === 'POST' && params.id && url.pathname.endsWith('/archive')) {
    await db.toggleArchive(env.DB, params.id);
    return jsonResponse({ ok: true });
  }

  // GET /api/bookmarks/:id
  if (req.method === 'GET' && params.id) {
    const bookmark = await db.getBookmark(env.DB, params.id);
    if (!bookmark) return errorJsonResponse('Not found', 404);
    return jsonResponse(bookmark);
  }

  // PUT /api/bookmarks/:id
  if (req.method === 'PUT' && params.id) {
    const body = await req.json<{ url?: string; title?: string; description?: string; tagIds?: string[] }>();
    if (body.url && !isValidUrl(body.url)) return errorJsonResponse('Invalid URL');
    await db.updateBookmark(env.DB, params.id, body);
    const bookmark = await db.getBookmark(env.DB, params.id);
    return jsonResponse(bookmark);
  }

  // DELETE /api/bookmarks/:id
  if (req.method === 'DELETE' && params.id) {
    await db.deleteBookmark(env.DB, params.id);
    return jsonResponse({ ok: true });
  }

  // GET /api/bookmarks (list)
  const query = url.searchParams.get('q') || undefined;
  const tag = url.searchParams.get('tag') || undefined;
  const archived = url.searchParams.get('archived') === '1';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const result = await db.listBookmarks(env.DB, { query, tag, archived, page });
  return jsonResponse(result);
};

async function fetchAndStoreFavicon(env: Env, bookmarkId: string, bookmarkUrl: string): Promise<void> {
  try {
    const origin = new URL(bookmarkUrl).origin;
    // Try Google favicon service as a reliable source
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`);
    if (res.ok) {
      const blob = await res.arrayBuffer();
      const key = `favicons/${bookmarkId}.png`;
      await env.ASSETS.put(key, blob, { httpMetadata: { contentType: 'image/png' } });
      await db.updateBookmarkFavicon(env.DB, bookmarkId, key);
    }
  } catch {
    // Favicon fetch is best-effort
  }
}
