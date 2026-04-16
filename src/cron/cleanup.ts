import * as db from '../db/queries';

export async function cleanupExpiredLinks(env: Env): Promise<void> {
  const expired = await db.getExpiredShortLinks(env.DB);
  for (const link of expired) {
    await env.CACHE.delete(`sl:${link.code}`);
    await db.deleteShortLink(env.DB, link.code);
  }
  console.log(`Cleaned up ${expired.length} expired short links`);
}
