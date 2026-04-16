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
    // Invalidate stats cache
    ctx.waitUntil(env.CACHE.delete('stats:overview'));

    const bookmark = await db.getBookmark(env.DB, id);
    return jsonResponse(bookmark, 201);
  }

  // POST /api/bookmarks/:id/archive
  if (req.method === 'POST' && params.id && url.pathname.endsWith('/archive')) {
    await db.toggleArchive(env.DB, params.id);
    await env.CACHE.delete('stats:overview');
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
    await env.CACHE.delete('stats:overview');
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
    let blob: ArrayBuffer | null = null;
    let contentType = 'image/png';

    // Strategy 1: Try direct /favicon.ico
    try {
      const directRes = await fetch(`${origin}/favicon.ico`, { redirect: 'follow' });
      if (directRes.ok) {
        const ct = directRes.headers.get('Content-Type') || '';
        if (ct.includes('image')) {
          blob = await directRes.arrayBuffer();
          contentType = ct.split(';')[0].trim();
        }
      }
    } catch {
      // Direct fetch failed, try next strategy
    }

    // Strategy 2: Google favicon service as fallback
    if (!blob) {
      const googleRes = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`);
      if (googleRes.ok) {
        blob = await googleRes.arrayBuffer();
        contentType = 'image/png';
      }
    }

    if (blob && blob.byteLength > 0) {
      const key = `favicons/${bookmarkId}.png`;
      await env.ASSETS.put(key, blob, { httpMetadata: { contentType } });
      await db.updateBookmarkFavicon(env.DB, bookmarkId, key);
    }
  } catch (err) {
    console.warn(`Favicon fetch failed for ${bookmarkUrl}:`, err);
  }
}
