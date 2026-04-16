import { Handler } from '../../router';
import { jsonResponse } from '../../utils/response';
import * as db from '../../db/queries';

export const handleStats: Handler = async (req, env, _ctx, _params) => {
  const url = new URL(req.url);

  // GET /api/stats/overview
  if (url.pathname === '/api/stats/overview') {
    // Try KV cache first
    const cached = await env.CACHE.get('stats:overview');
    if (cached) return jsonResponse(JSON.parse(cached));

    const overview = await db.getStatsOverview(env.DB);
    await env.CACHE.put('stats:overview', JSON.stringify(overview), { expirationTtl: 300 });
    return jsonResponse(overview);
  }

  // GET /api/stats/clicks
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const bookmarkId = url.searchParams.get('bookmark_id') || undefined;
  const clicks = await db.getClickStats(env.DB, { days, bookmarkId });
  return jsonResponse(clicks);
};
