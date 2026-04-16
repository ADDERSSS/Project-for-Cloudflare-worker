import { Handler } from '../router';
import { redirectResponse } from '../utils/response';
import * as db from '../db/queries';

export const handleRedirect: Handler = async (req, env, ctx, params) => {
  const code = params.code;

  // Try KV cache first (hot path)
  const cached = await env.CACHE.get(`sl:${code}`);
  if (cached) {
    const { url, bookmarkId } = JSON.parse(cached) as { url: string; bookmarkId: string };
    // Log click asynchronously
    ctx.waitUntil(logClickAsync(env, req, code, bookmarkId));
    return redirectResponse(url);
  }

  // Fall back to D1
  const link = await db.getShortLink(env.DB, code);
  if (!link) return new Response('Short link not found', { status: 404 });

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return new Response('This short link has expired', { status: 410 });
  }

  // Re-populate KV cache
  const kvValue = JSON.stringify({ url: link.url, bookmarkId: link.bookmark_id });
  ctx.waitUntil(env.CACHE.put(`sl:${code}`, kvValue));

  // Log click asynchronously
  ctx.waitUntil(logClickAsync(env, req, code, link.bookmark_id));

  return redirectResponse(link.url);
};

async function logClickAsync(env: Env, req: Request, code: string, bookmarkId: string): Promise<void> {
  try {
    const cfData = (req as unknown as { cf?: { country?: string } }).cf;
    await db.logClick(env.DB, {
      shortCode: code,
      bookmarkId,
      userAgent: req.headers.get('User-Agent') || undefined,
      referer: req.headers.get('Referer') || undefined,
      country: cfData?.country,
    });
    // Invalidate stats cache
    await env.CACHE.delete('stats:overview');
  } catch {
    // Click logging is best-effort
  }
}
