// Type definitions for D1 query results
export interface BookmarkRow {
  id: string;
  url: string;
  title: string;
  description: string;
  favicon_key: string | null;
  screenshot_key: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  color: string;
}

export interface TagWithCount extends TagRow {
  bookmark_count: number;
}

export interface ShortLinkRow {
  code: string;
  bookmark_id: string;
  expires_at: string | null;
  created_at: string;
}

export interface ClickLogRow {
  id: number;
  short_code: string | null;
  bookmark_id: string;
  clicked_at: string;
  user_agent: string | null;
  referer: string | null;
  country: string | null;
}

export interface DailyStatsRow {
  date: string;
  bookmark_id: string;
  clicks: number;
}

export interface BookmarkWithTags extends BookmarkRow {
  tags: TagRow[];
}

// --- Bookmark queries ---

export async function listBookmarks(
  db: D1Database,
  opts: { query?: string; tag?: string; archived?: boolean; page?: number; pageSize?: number }
): Promise<{ bookmarks: BookmarkWithTags[]; total: number }> {
  const { query, tag, archived = false, page = 1, pageSize = 20 } = opts;
  const conditions: string[] = ['b.is_archived = ?'];
  const params: unknown[] = [archived ? 1 : 0];

  if (query) {
    conditions.push('(b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ?)');
    const like = `%${query}%`;
    params.push(like, like, like);
  }
  if (tag) {
    conditions.push('EXISTS (SELECT 1 FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id AND t.name = ?)');
    params.push(tag);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const countResult = await db.prepare(`SELECT COUNT(*) as total FROM bookmarks b ${where}`).bind(...params).first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const rows = await db.prepare(
    `SELECT b.* FROM bookmarks b ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, pageSize, offset).all<BookmarkRow>();

  const bookmarks: BookmarkWithTags[] = [];
  for (const row of rows.results) {
    const tags = await db.prepare(
      `SELECT t.* FROM tags t JOIN bookmark_tags bt ON t.id = bt.tag_id WHERE bt.bookmark_id = ?`
    ).bind(row.id).all<TagRow>();
    bookmarks.push({ ...row, tags: tags.results });
  }

  return { bookmarks, total };
}

export async function getBookmark(db: D1Database, id: string): Promise<BookmarkWithTags | null> {
  const row = await db.prepare('SELECT * FROM bookmarks WHERE id = ?').bind(id).first<BookmarkRow>();
  if (!row) return null;
  const tags = await db.prepare(
    'SELECT t.* FROM tags t JOIN bookmark_tags bt ON t.id = bt.tag_id WHERE bt.bookmark_id = ?'
  ).bind(id).all<TagRow>();
  return { ...row, tags: tags.results };
}

export async function createBookmark(
  db: D1Database,
  data: { id: string; url: string; title: string; description?: string; tagIds?: string[] }
): Promise<void> {
  await db.prepare(
    'INSERT INTO bookmarks (id, url, title, description) VALUES (?, ?, ?, ?)'
  ).bind(data.id, data.url, data.title, data.description || '').run();

  if (data.tagIds?.length) {
    const stmt = db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)');
    await db.batch(data.tagIds.map((tagId) => stmt.bind(data.id, tagId)));
  }
}

export async function updateBookmark(
  db: D1Database,
  id: string,
  data: { url?: string; title?: string; description?: string; tagIds?: string[] }
): Promise<void> {
  const sets: string[] = ["updated_at = datetime('now')"];
  const params: unknown[] = [];

  if (data.url !== undefined) { sets.push('url = ?'); params.push(data.url); }
  if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }

  params.push(id);
  await db.prepare(`UPDATE bookmarks SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();

  if (data.tagIds !== undefined) {
    await db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?').bind(id).run();
    if (data.tagIds.length) {
      const stmt = db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)');
      await db.batch(data.tagIds.map((tagId) => stmt.bind(id, tagId)));
    }
  }
}

export async function deleteBookmark(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM bookmarks WHERE id = ?').bind(id).run();
}

export async function toggleArchive(db: D1Database, id: string): Promise<void> {
  await db.prepare(
    "UPDATE bookmarks SET is_archived = CASE WHEN is_archived = 0 THEN 1 ELSE 0 END, updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();
}

export async function updateBookmarkFavicon(db: D1Database, id: string, faviconKey: string): Promise<void> {
  await db.prepare("UPDATE bookmarks SET favicon_key = ?, updated_at = datetime('now') WHERE id = ?").bind(faviconKey, id).run();
}

// --- Tag queries ---

export async function listTags(db: D1Database): Promise<TagWithCount[]> {
  return (await db.prepare(
    `SELECT t.*, COUNT(bt.bookmark_id) as bookmark_count
     FROM tags t LEFT JOIN bookmark_tags bt ON t.id = bt.tag_id
     GROUP BY t.id ORDER BY t.name`
  ).all<TagWithCount>()).results;
}

export async function createTag(db: D1Database, data: { id: string; name: string; color?: string }): Promise<void> {
  await db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').bind(data.id, data.name, data.color || '#6366f1').run();
}

export async function updateTag(db: D1Database, id: string, data: { name?: string; color?: string }): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.color !== undefined) { sets.push('color = ?'); params.push(data.color); }
  if (!sets.length) return;
  params.push(id);
  await db.prepare(`UPDATE tags SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function deleteTag(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
}

// --- Short link queries ---

export async function listShortLinks(db: D1Database): Promise<(ShortLinkRow & { bookmark_title: string; bookmark_url: string; click_count: number })[]> {
  return (await db.prepare(
    `SELECT sl.*, b.title as bookmark_title, b.url as bookmark_url,
            (SELECT COUNT(*) FROM click_logs cl WHERE cl.short_code = sl.code) as click_count
     FROM short_links sl JOIN bookmarks b ON sl.bookmark_id = b.id
     ORDER BY sl.created_at DESC`
  ).all<ShortLinkRow & { bookmark_title: string; bookmark_url: string; click_count: number }>()).results;
}

export async function createShortLink(db: D1Database, data: { code: string; bookmarkId: string; expiresAt?: string }): Promise<void> {
  await db.prepare(
    'INSERT INTO short_links (code, bookmark_id, expires_at) VALUES (?, ?, ?)'
  ).bind(data.code, data.bookmarkId, data.expiresAt || null).run();
}

export async function getShortLink(db: D1Database, code: string): Promise<(ShortLinkRow & { url: string }) | null> {
  return db.prepare(
    'SELECT sl.*, b.url FROM short_links sl JOIN bookmarks b ON sl.bookmark_id = b.id WHERE sl.code = ?'
  ).bind(code).first<ShortLinkRow & { url: string }>();
}

export async function deleteShortLink(db: D1Database, code: string): Promise<void> {
  await db.prepare('DELETE FROM short_links WHERE code = ?').bind(code).run();
}

// --- Click log queries ---

export async function logClick(
  db: D1Database,
  data: { shortCode: string | null; bookmarkId: string; userAgent?: string; referer?: string; country?: string }
): Promise<void> {
  await db.prepare(
    'INSERT INTO click_logs (short_code, bookmark_id, user_agent, referer, country) VALUES (?, ?, ?, ?, ?)'
  ).bind(data.shortCode, data.bookmarkId, data.userAgent || null, data.referer || null, data.country || null).run();
}

// --- Stats queries ---

export async function getStatsOverview(db: D1Database): Promise<{
  totalBookmarks: number;
  totalTags: number;
  totalShortLinks: number;
  clicksToday: number;
}> {
  const [bookmarks, tags, shortLinks, clicks] = await db.batch([
    db.prepare('SELECT COUNT(*) as c FROM bookmarks WHERE is_archived = 0'),
    db.prepare('SELECT COUNT(*) as c FROM tags'),
    db.prepare('SELECT COUNT(*) as c FROM short_links'),
    db.prepare("SELECT COUNT(*) as c FROM click_logs WHERE clicked_at >= date('now')"),
  ]);
  return {
    totalBookmarks: (bookmarks.results[0] as { c: number }).c,
    totalTags: (tags.results[0] as { c: number }).c,
    totalShortLinks: (shortLinks.results[0] as { c: number }).c,
    clicksToday: (clicks.results[0] as { c: number }).c,
  };
}

export async function getClickStats(
  db: D1Database,
  opts: { days?: number; bookmarkId?: string }
): Promise<{ date: string; clicks: number }[]> {
  const { days = 30, bookmarkId } = opts;
  let sql = `SELECT date, SUM(clicks) as clicks FROM daily_stats WHERE date >= date('now', '-${days} days')`;
  const params: unknown[] = [];
  if (bookmarkId) {
    sql += ' AND bookmark_id = ?';
    params.push(bookmarkId);
  }
  sql += ' GROUP BY date ORDER BY date';
  return (await db.prepare(sql).bind(...params).all<{ date: string; clicks: number }>()).results;
}

// --- Cron helper queries ---

export async function getExpiredShortLinks(db: D1Database): Promise<ShortLinkRow[]> {
  return (await db.prepare(
    "SELECT * FROM short_links WHERE expires_at IS NOT NULL AND expires_at < datetime('now')"
  ).all<ShortLinkRow>()).results;
}

export async function aggregateClicksForDate(db: D1Database, date: string): Promise<void> {
  await db.prepare(
    `INSERT INTO daily_stats (date, bookmark_id, clicks)
     SELECT date(clicked_at), bookmark_id, COUNT(*)
     FROM click_logs
     WHERE date(clicked_at) = ?
     GROUP BY bookmark_id
     ON CONFLICT(date, bookmark_id) DO UPDATE SET clicks = excluded.clicks`
  ).bind(date).run();
}

export async function purgeOldClickLogs(db: D1Database, daysToKeep = 90): Promise<void> {
  await db.prepare(
    `DELETE FROM click_logs WHERE clicked_at < date('now', '-${daysToKeep} days')`
  ).run();
}
