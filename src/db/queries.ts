export interface BookmarkRow {
  id: string;
  url: string;
  title: string;
  description: string;
  favicon_key: string | null;
  screenshot_key: string | null;
  ai_summary: string | null;
  ai_tags_suggested: string | null;
  ai_status: string | null;
  ai_processed_at: string | null;
  accent_color: string | null;
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
  suggested_tags: string[];
  sparkline: number[];
}

export interface CollectionRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_public: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithBookmarks extends CollectionRow {
  bookmarks: BookmarkWithTags[];
  bookmark_ids: string[];
  bookmark_count: number;
}

export interface CollectionBookmarkRow {
  collection_id: string;
  bookmark_id: string;
  position: number;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

function parseSuggestedTags(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function getTrailingDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(utcMidnight - i * 24 * 60 * 60 * 1000);
    dates.push(date.toISOString().slice(0, 10));
  }

  return dates;
}

function fillMissingDays(rows: Array<{ date: string; clicks: number }>, days: number): number[] {
  const byDate = new Map(rows.map((row) => [row.date, row.clicks]));
  return getTrailingDates(days).map((date) => byDate.get(date) ?? 0);
}

async function hydrateBookmarks(db: D1Database, rows: BookmarkRow[]): Promise<BookmarkWithTags[]> {
  if (!rows.length) return [];

  const bookmarkIds = rows.map((row) => row.id);
  const inClause = placeholders(bookmarkIds.length);

  const [tagRows, sparklineRows] = await Promise.all([
    db.prepare(
      `SELECT bt.bookmark_id, t.id, t.name, t.color
       FROM bookmark_tags bt
       JOIN tags t ON t.id = bt.tag_id
       WHERE bt.bookmark_id IN (${inClause})
       ORDER BY t.name ASC`
    ).bind(...bookmarkIds).all<{ bookmark_id: string; id: string; name: string; color: string }>(),
    db.prepare(
      `SELECT bookmark_id, date, clicks
       FROM daily_stats
       WHERE bookmark_id IN (${inClause}) AND date >= date('now', '-6 days')
       ORDER BY bookmark_id, date`
    ).bind(...bookmarkIds).all<DailyStatsRow>(),
  ]);

  const tagsByBookmark = new Map<string, TagRow[]>();
  for (const row of tagRows.results) {
    const group = tagsByBookmark.get(row.bookmark_id) ?? [];
    group.push({ id: row.id, name: row.name, color: row.color });
    tagsByBookmark.set(row.bookmark_id, group);
  }

  const sparklineByBookmark = new Map<string, Array<{ date: string; clicks: number }>>();
  for (const row of sparklineRows.results) {
    const group = sparklineByBookmark.get(row.bookmark_id) ?? [];
    group.push({ date: row.date, clicks: row.clicks });
    sparklineByBookmark.set(row.bookmark_id, group);
  }

  return rows.map((row) => ({
    ...row,
    tags: tagsByBookmark.get(row.id) ?? [],
    suggested_tags: parseSuggestedTags(row.ai_tags_suggested),
    sparkline: fillMissingDays(sparklineByBookmark.get(row.id) ?? [], 7),
  }));
}

async function getCollectionRelations(
  db: D1Database,
  collectionIds: string[]
): Promise<CollectionBookmarkRow[]> {
  if (!collectionIds.length) return [];

  const relationRows = await db.prepare(
    `SELECT collection_id, bookmark_id, position
     FROM collection_bookmarks
     WHERE collection_id IN (${placeholders(collectionIds.length)})
     ORDER BY collection_id ASC, position ASC`
  ).bind(...collectionIds).all<CollectionBookmarkRow>();

  return relationRows.results;
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
    conditions.push('(b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ? OR b.ai_summary LIKE ?)');
    const like = `%${query}%`;
    params.push(like, like, like, like);
  }

  if (tag) {
    conditions.push(
      'EXISTS (SELECT 1 FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id AND t.name = ?)'
    );
    params.push(tag);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  const countResult = await db.prepare(`SELECT COUNT(*) as total FROM bookmarks b ${whereClause}`)
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const bookmarkRows = await db.prepare(
    `SELECT b.*
     FROM bookmarks b
     ${whereClause}
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, pageSize, offset).all<BookmarkRow>();

  return {
    bookmarks: await hydrateBookmarks(db, bookmarkRows.results),
    total,
  };
}

export async function getBookmark(db: D1Database, id: string): Promise<BookmarkWithTags | null> {
  const row = await db.prepare('SELECT * FROM bookmarks WHERE id = ?').bind(id).first<BookmarkRow>();
  if (!row) return null;
  const bookmarks = await hydrateBookmarks(db, [row]);
  return bookmarks[0] ?? null;
}

export async function createBookmark(
  db: D1Database,
  data: { id: string; url: string; title: string; description?: string; tagIds?: string[] }
): Promise<void> {
  await db.prepare(
    'INSERT INTO bookmarks (id, url, title, description, ai_status) VALUES (?, ?, ?, ?, ?)'
  ).bind(data.id, data.url, data.title, data.description || '', 'pending').run();

  if (data.tagIds?.length) {
    const statement = db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)');
    await db.batch(data.tagIds.map((tagId) => statement.bind(data.id, tagId)));
  }
}

export async function updateBookmark(
  db: D1Database,
  id: string,
  data: { url?: string; title?: string; description?: string; tagIds?: string[] }
): Promise<void> {
  const sets: string[] = ["updated_at = datetime('now')"];
  const params: unknown[] = [];

  if (data.url !== undefined) {
    sets.push('url = ?');
    params.push(data.url);
  }
  if (data.title !== undefined) {
    sets.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push('description = ?');
    params.push(data.description);
  }

  params.push(id);
  await db.prepare(`UPDATE bookmarks SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();

  if (data.tagIds !== undefined) {
    await db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?').bind(id).run();

    if (data.tagIds.length) {
      const statement = db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)');
      await db.batch(data.tagIds.map((tagId) => statement.bind(id, tagId)));
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

export async function updateBookmarkAssetData(
  db: D1Database,
  id: string,
  data: { faviconKey?: string | null; accentColor?: string | null }
): Promise<void> {
  const sets: string[] = ["updated_at = datetime('now')"];
  const params: unknown[] = [];

  if (data.faviconKey !== undefined) {
    sets.push('favicon_key = ?');
    params.push(data.faviconKey);
  }

  if (data.accentColor !== undefined) {
    sets.push('accent_color = ?');
    params.push(data.accentColor);
  }

  params.push(id);
  await db.prepare(`UPDATE bookmarks SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function markBookmarkAiPending(db: D1Database, id: string): Promise<void> {
  await db.prepare(
    "UPDATE bookmarks SET ai_status = 'pending', ai_summary = NULL, ai_tags_suggested = NULL, ai_processed_at = NULL, updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();
}

export async function updateBookmarkAiResult(
  db: D1Database,
  id: string,
  data: { summary?: string | null; suggestedTags?: string[]; status: 'done' | 'failed' | 'skipped'; processedAt?: string }
): Promise<void> {
  const processedAt = data.processedAt ?? new Date().toISOString();

  await db.prepare(
    `UPDATE bookmarks
     SET ai_summary = ?,
         ai_tags_suggested = ?,
         ai_status = ?,
         ai_processed_at = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    data.summary ?? null,
    data.suggestedTags ? JSON.stringify(data.suggestedTags.slice(0, 3)) : null,
    data.status,
    processedAt,
    id
  ).run();
}

export async function getAllTagNames(db: D1Database): Promise<string[]> {
  const rows = await db.prepare('SELECT name FROM tags ORDER BY name ASC').all<{ name: string }>();
  return rows.results.map((row) => row.name);
}

export async function getCollectionSlugsByBookmarkId(db: D1Database, bookmarkId: string): Promise<string[]> {
  const rows = await db.prepare(
    `SELECT c.slug
     FROM collections c
     JOIN collection_bookmarks cb ON cb.collection_id = c.id
     WHERE cb.bookmark_id = ? AND c.is_public = 1`
  ).bind(bookmarkId).all<{ slug: string }>();

  return rows.results.map((row) => row.slug);
}

// --- Tag queries ---

export async function listTags(db: D1Database): Promise<TagWithCount[]> {
  const rows = await db.prepare(
    `SELECT t.*, COUNT(bt.bookmark_id) as bookmark_count
     FROM tags t
     LEFT JOIN bookmark_tags bt ON bt.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.name ASC`
  ).all<TagWithCount>();

  return rows.results;
}

export async function getTagByName(db: D1Database, name: string): Promise<TagRow | null> {
  return db.prepare('SELECT * FROM tags WHERE name = ?').bind(name).first<TagRow>();
}

export async function createTag(db: D1Database, data: { id: string; name: string; color?: string }): Promise<void> {
  await db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)')
    .bind(data.id, data.name, data.color || '#6366f1')
    .run();
}

export async function updateTag(db: D1Database, id: string, data: { name?: string; color?: string }): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    sets.push('name = ?');
    params.push(data.name);
  }
  if (data.color !== undefined) {
    sets.push('color = ?');
    params.push(data.color);
  }

  if (!sets.length) return;

  params.push(id);
  await db.prepare(`UPDATE tags SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function deleteTag(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
}

// --- Short link queries ---

export async function listShortLinks(
  db: D1Database
): Promise<Array<ShortLinkRow & { bookmark_title: string; bookmark_url: string; click_count: number }>> {
  const rows = await db.prepare(
    `SELECT sl.*, b.title as bookmark_title, b.url as bookmark_url,
            (SELECT COUNT(*) FROM click_logs cl WHERE cl.short_code = sl.code) as click_count
     FROM short_links sl
     JOIN bookmarks b ON b.id = sl.bookmark_id
     ORDER BY sl.created_at DESC`
  ).all<ShortLinkRow & { bookmark_title: string; bookmark_url: string; click_count: number }>();

  return rows.results;
}

export async function createShortLink(
  db: D1Database,
  data: { code: string; bookmarkId: string; expiresAt?: string }
): Promise<void> {
  await db.prepare(
    'INSERT INTO short_links (code, bookmark_id, expires_at) VALUES (?, ?, ?)'
  ).bind(data.code, data.bookmarkId, data.expiresAt || null).run();
}

export async function getShortLink(db: D1Database, code: string): Promise<(ShortLinkRow & { url: string }) | null> {
  return db.prepare(
    'SELECT sl.*, b.url FROM short_links sl JOIN bookmarks b ON b.id = sl.bookmark_id WHERE sl.code = ?'
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
): Promise<Array<{ date: string; clicks: number }>> {
  const { days = 30, bookmarkId } = opts;
  let sql = `SELECT date, SUM(clicks) as clicks FROM daily_stats WHERE date >= date('now', '-${days} days')`;
  const params: unknown[] = [];

  if (bookmarkId) {
    sql += ' AND bookmark_id = ?';
    params.push(bookmarkId);
  }

  sql += ' GROUP BY date ORDER BY date';

  const rows = await db.prepare(sql).bind(...params).all<{ date: string; clicks: number }>();
  return rows.results;
}

export async function getBookmarkSparkline(db: D1Database, id: string): Promise<number[]> {
  const rows = await db.prepare(
    `SELECT date, clicks
     FROM daily_stats
     WHERE bookmark_id = ? AND date >= date('now', '-6 days')
     ORDER BY date`
  ).bind(id).all<{ date: string; clicks: number }>();

  return fillMissingDays(rows.results, 7);
}

export async function getAnnualClickHeatmap(
  db: D1Database
): Promise<Array<{ date: string; clicks: number }>> {
  const rows = await db.prepare(
    `SELECT date, SUM(clicks) as clicks
     FROM daily_stats
     WHERE date >= date('now', '-364 days')
     GROUP BY date
     ORDER BY date`
  ).all<{ date: string; clicks: number }>();

  return rows.results;
}

export async function getTopCountries(
  db: D1Database
): Promise<Array<{ country: string; clicks: number }>> {
  const rows = await db.prepare(
    `SELECT country, COUNT(*) as clicks
     FROM click_logs
     WHERE clicked_at >= datetime('now', '-30 days') AND country IS NOT NULL AND country != ''
     GROUP BY country
     ORDER BY clicks DESC, country ASC
     LIMIT 10`
  ).all<{ country: string; clicks: number }>();

  return rows.results;
}

// --- Collection queries ---

export async function listCollections(db: D1Database): Promise<CollectionWithBookmarks[]> {
  const collectionRows = await db.prepare('SELECT * FROM collections ORDER BY updated_at DESC').all<CollectionRow>();
  const collections = collectionRows.results;
  if (!collections.length) return [];

  const relations = await getCollectionRelations(db, collections.map((collection) => collection.id));
  const bookmarkIds = Array.from(new Set(relations.map((relation) => relation.bookmark_id)));

  let bookmarkMap = new Map<string, BookmarkWithTags>();
  if (bookmarkIds.length) {
    const bookmarkRows = await db.prepare(
      `SELECT *
       FROM bookmarks
       WHERE id IN (${placeholders(bookmarkIds.length)})
       ORDER BY created_at DESC`
    ).bind(...bookmarkIds).all<BookmarkRow>();

    bookmarkMap = new Map(
      (await hydrateBookmarks(db, bookmarkRows.results)).map((bookmark) => [bookmark.id, bookmark])
    );
  }

  const relationMap = new Map<string, CollectionBookmarkRow[]>();
  for (const relation of relations) {
    const group = relationMap.get(relation.collection_id) ?? [];
    group.push(relation);
    relationMap.set(relation.collection_id, group);
  }

  return collections.map((collection) => {
    const items = relationMap.get(collection.id) ?? [];
    const bookmarks = items
      .map((item) => bookmarkMap.get(item.bookmark_id))
      .filter((bookmark): bookmark is BookmarkWithTags => Boolean(bookmark));

    return {
      ...collection,
      bookmarks,
      bookmark_ids: items.map((item) => item.bookmark_id),
      bookmark_count: bookmarks.length,
    };
  });
}

export async function getCollection(db: D1Database, id: string): Promise<CollectionWithBookmarks | null> {
  const collections = await listCollections(db);
  return collections.find((collection) => collection.id === id) ?? null;
}

export async function createCollection(
  db: D1Database,
  data: { id: string; slug: string; title: string; description?: string; isPublic?: boolean }
): Promise<void> {
  await db.prepare(
    `INSERT INTO collections (id, slug, title, description, is_public)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(data.id, data.slug, data.title, data.description || null, data.isPublic ? 1 : 0).run();
}

export async function updateCollection(
  db: D1Database,
  id: string,
  data: { slug?: string; title?: string; description?: string | null; isPublic?: boolean }
): Promise<void> {
  const sets: string[] = ["updated_at = datetime('now')"];
  const params: unknown[] = [];

  if (data.slug !== undefined) {
    sets.push('slug = ?');
    params.push(data.slug);
  }
  if (data.title !== undefined) {
    sets.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push('description = ?');
    params.push(data.description);
  }
  if (data.isPublic !== undefined) {
    sets.push('is_public = ?');
    params.push(data.isPublic ? 1 : 0);
  }

  params.push(id);
  await db.prepare(`UPDATE collections SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function deleteCollection(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM collections WHERE id = ?').bind(id).run();
}

export async function addBookmarksToCollection(
  db: D1Database,
  collectionId: string,
  bookmarkIds: string[]
): Promise<void> {
  if (!bookmarkIds.length) return;

  const current = await db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max_position FROM collection_bookmarks WHERE collection_id = ?'
  ).bind(collectionId).first<{ max_position: number }>();
  const startPosition = (current?.max_position ?? -1) + 1;

  const statement = db.prepare(
    `INSERT INTO collection_bookmarks (collection_id, bookmark_id, position)
     VALUES (?, ?, ?)
     ON CONFLICT(collection_id, bookmark_id) DO UPDATE SET position = excluded.position`
  );

  await db.batch(
    bookmarkIds.map((bookmarkId, index) => statement.bind(collectionId, bookmarkId, startPosition + index))
  );

  await db.prepare("UPDATE collections SET updated_at = datetime('now') WHERE id = ?").bind(collectionId).run();
}

export async function removeBookmarkFromCollection(
  db: D1Database,
  collectionId: string,
  bookmarkId: string
): Promise<void> {
  await db.prepare(
    'DELETE FROM collection_bookmarks WHERE collection_id = ? AND bookmark_id = ?'
  ).bind(collectionId, bookmarkId).run();

  await db.prepare("UPDATE collections SET updated_at = datetime('now') WHERE id = ?").bind(collectionId).run();
}

export async function getPublicCollectionBySlug(
  db: D1Database,
  slug: string
): Promise<CollectionWithBookmarks | null> {
  const collection = await db.prepare(
    'SELECT * FROM collections WHERE slug = ? AND is_public = 1'
  ).bind(slug).first<CollectionRow>();

  if (!collection) return null;

  const relations = await getCollectionRelations(db, [collection.id]);
  const bookmarkIds = relations.map((relation) => relation.bookmark_id);
  let bookmarks: BookmarkWithTags[] = [];

  if (bookmarkIds.length) {
    const bookmarkRows = await db.prepare(
      `SELECT * FROM bookmarks WHERE id IN (${placeholders(bookmarkIds.length)})`
    ).bind(...bookmarkIds).all<BookmarkRow>();

    const bookmarkMap = new Map(
      (await hydrateBookmarks(db, bookmarkRows.results)).map((bookmark) => [bookmark.id, bookmark])
    );

    bookmarks = relations
      .map((relation) => bookmarkMap.get(relation.bookmark_id))
      .filter((bookmark): bookmark is BookmarkWithTags => Boolean(bookmark));
  }

  return {
    ...collection,
    bookmarks,
    bookmark_ids: bookmarkIds,
    bookmark_count: bookmarks.length,
  };
}

// --- Cron helper queries ---

export async function getExpiredShortLinks(db: D1Database): Promise<ShortLinkRow[]> {
  const rows = await db.prepare(
    "SELECT * FROM short_links WHERE expires_at IS NOT NULL AND expires_at < datetime('now')"
  ).all<ShortLinkRow>();

  return rows.results;
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
