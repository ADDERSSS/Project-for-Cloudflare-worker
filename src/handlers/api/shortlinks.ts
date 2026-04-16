import { Handler } from '../../router';
import { jsonResponse, errorJsonResponse } from '../../utils/response';
import { generateShortCode } from '../../utils/id';
import * as db from '../../db/queries';

export const handleShortlinks: Handler = async (req, env, _ctx, params) => {
  const origin = new URL(req.url).origin;

  // GET /api/shortlinks
  if (req.method === 'GET') {
    const links = await db.listShortLinks(env.DB);
    return jsonResponse(links);
  }

  // POST /api/bookmarks/:bookmarkId/shortlink
  if (req.method === 'POST' && params.bookmarkId) {
    const body = await req.json<{ expiresAt?: string }>().catch(() => ({} as { expiresAt?: string }));
    const code = generateShortCode();
    await db.createShortLink(env.DB, { code, bookmarkId: params.bookmarkId, expiresAt: body.expiresAt });

    // Cache in KV for fast redirect
    const bookmark = await db.getBookmark(env.DB, params.bookmarkId);
    if (bookmark) {
      const kvValue = JSON.stringify({ url: bookmark.url, bookmarkId: params.bookmarkId });
      if (body.expiresAt) {
        const ttl = Math.max(60, Math.floor((new Date(body.expiresAt).getTime() - Date.now()) / 1000));
        await env.CACHE.put(`sl:${code}`, kvValue, { expirationTtl: ttl });
      } else {
        await env.CACHE.put(`sl:${code}`, kvValue);
      }
    }

    await env.CACHE.delete('stats:overview');
    return jsonResponse({ code, url: `${origin}/s/${code}` }, 201);
  }

  // DELETE /api/shortlinks/:code
  if (req.method === 'DELETE' && params.code) {
    await db.deleteShortLink(env.DB, params.code);
    await env.CACHE.delete(`sl:${params.code}`);
    await env.CACHE.delete('stats:overview');
    return jsonResponse({ ok: true });
  }

  return errorJsonResponse('Method not allowed', 405);
};
