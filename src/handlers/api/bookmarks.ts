import { Handler } from '../../router';
import { sparkline } from '../../templates/components';
import { errorJsonResponse, jsonResponse } from '../../utils/response';
import { generateId } from '../../utils/id';
import { isValidUrl } from '../../utils/validators';
import { extractPageText, extractThemeColor, getCachedAiResult, setCachedAiResult, summarizeAndTag } from '../../utils/ai';
import { resolveAccentColor } from '../../utils/color';
import * as db from '../../db/queries';

function serializeBookmark(bookmark: db.BookmarkWithTags | null) {
  if (!bookmark) return null;
  return {
    ...bookmark,
    sparkline_svg: sparkline(bookmark.sparkline),
  };
}

async function invalidateCollectionCachesForBookmark(env: Env, bookmarkId: string): Promise<void> {
  const slugs = await db.getCollectionSlugsByBookmarkId(env.DB, bookmarkId);
  await Promise.all(
    slugs.map((slug) => caches.default.delete(new URL(`/c/${slug}`, env.BASE_URL).toString()))
  );
}

export const handleBookmarks: Handler = async (req, env, ctx, params) => {
  const url = new URL(req.url);

  if (req.method === 'POST' && !params.id) {
    const body = await req.json<{ url: string; title: string; description?: string; tagIds?: string[] }>();
    if (!body.url || !isValidUrl(body.url)) return errorJsonResponse('Invalid URL');
    if (!body.title?.trim()) return errorJsonResponse('Title is required');

    const id = generateId();
    await db.createBookmark(env.DB, {
      id,
      url: body.url,
      title: body.title.trim(),
      description: body.description,
      tagIds: body.tagIds,
    });

    ctx.waitUntil(fetchAndStoreFavicon(env, id, body.url));
    ctx.waitUntil(runAISummary(env, id));
    ctx.waitUntil(env.CACHE.delete('stats:overview'));

    const bookmark = await db.getBookmark(env.DB, id);
    return jsonResponse(serializeBookmark(bookmark), 201);
  }

  if (req.method === 'POST' && params.id && url.pathname.endsWith('/archive')) {
    await db.toggleArchive(env.DB, params.id);
    await env.CACHE.delete('stats:overview');
    return jsonResponse({ ok: true });
  }

  if (req.method === 'POST' && params.id && url.pathname.endsWith('/reanalyze')) {
    const bookmark = await db.getBookmark(env.DB, params.id);
    if (!bookmark) return errorJsonResponse('Not found', 404);

    await db.markBookmarkAiPending(env.DB, params.id);
    ctx.waitUntil(runAISummary(env, params.id, true));
    return jsonResponse({ ok: true, ai_status: 'pending' });
  }

  if (req.method === 'GET' && params.id) {
    const bookmark = await db.getBookmark(env.DB, params.id);
    if (!bookmark) return errorJsonResponse('Not found', 404);
    return jsonResponse(serializeBookmark(bookmark));
  }

  if (req.method === 'PUT' && params.id) {
    const body = await req.json<{ url?: string; title?: string; description?: string; tagIds?: string[] }>();
    if (body.url && !isValidUrl(body.url)) return errorJsonResponse('Invalid URL');

    const existingBookmark = await db.getBookmark(env.DB, params.id);
    if (!existingBookmark) return errorJsonResponse('Not found', 404);

    await db.updateBookmark(env.DB, params.id, body);

    if (body.url && body.url !== existingBookmark.url) {
      await db.markBookmarkAiPending(env.DB, params.id);
      ctx.waitUntil(fetchAndStoreFavicon(env, params.id, body.url));
      ctx.waitUntil(runAISummary(env, params.id, true));
    }
    ctx.waitUntil(invalidateCollectionCachesForBookmark(env, params.id));

    const bookmark = await db.getBookmark(env.DB, params.id);
    return jsonResponse(serializeBookmark(bookmark));
  }

  if (req.method === 'DELETE' && params.id) {
    const invalidation = invalidateCollectionCachesForBookmark(env, params.id);
    await db.deleteBookmark(env.DB, params.id);
    await invalidation;
    await env.CACHE.delete('stats:overview');
    return jsonResponse({ ok: true });
  }

  const query = url.searchParams.get('q') || undefined;
  const tag = url.searchParams.get('tag') || undefined;
  const archived = url.searchParams.get('archived') === '1';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  const result = await db.listBookmarks(env.DB, {
    query,
    tag,
    archived,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 50) : 20,
  });

  return jsonResponse({
    ...result,
    bookmarks: result.bookmarks.map((bookmark) => serializeBookmark(bookmark)),
  });
};

async function runAISummary(env: Env, bookmarkId: string, force = false): Promise<void> {
  const bookmark = await db.getBookmark(env.DB, bookmarkId);
  if (!bookmark) return;

  if (!force && bookmark.ai_status === 'done') return;

  if (!env.AI) {
    await db.updateBookmarkAiResult(env.DB, bookmarkId, { status: 'skipped', summary: null, suggestedTags: [] });
    return;
  }

  try {
    const cached = await getCachedAiResult(env, bookmark.url);
    if (cached) {
      await db.updateBookmarkAiResult(env.DB, bookmarkId, {
        status: 'done',
        summary: cached.summary,
        suggestedTags: cached.tags,
      });
      return;
    }

    const pageText = await extractPageText(bookmark.url);
    if (pageText.length < 60) {
      await db.updateBookmarkAiResult(env.DB, bookmarkId, { status: 'skipped', summary: null, suggestedTags: [] });
      return;
    }

    const existingTags = await db.getAllTagNames(env.DB);
    const result = await summarizeAndTag(env, pageText, existingTags);
    await setCachedAiResult(env, bookmark.url, result);
    await db.updateBookmarkAiResult(env.DB, bookmarkId, {
      status: 'done',
      summary: result.summary,
      suggestedTags: result.tags,
    });
  } catch (error) {
    console.warn(`AI summarize failed for ${bookmark.url}:`, error);
    await db.updateBookmarkAiResult(env.DB, bookmarkId, { status: 'failed', summary: null, suggestedTags: [] });
  }
}

async function fetchAndStoreFavicon(env: Env, bookmarkId: string, bookmarkUrl: string): Promise<void> {
  try {
    const origin = new URL(bookmarkUrl).origin;
    let blob: ArrayBuffer | null = null;
    let contentType = 'image/png';

    try {
      const directResponse = await fetch(`${origin}/favicon.ico`, { redirect: 'follow' });
      if (directResponse.ok) {
        const responseContentType = directResponse.headers.get('Content-Type') || '';
        if (responseContentType.includes('image')) {
          blob = await directResponse.arrayBuffer();
          contentType = responseContentType.split(';')[0].trim();
        }
      }
    } catch {
      // Fall through to the favicon service.
    }

    if (!blob) {
      const fallbackResponse = await fetch(
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`
      );

      if (fallbackResponse.ok) {
        blob = await fallbackResponse.arrayBuffer();
        contentType = 'image/png';
      }
    }

    let accentColor: string | null = null;

    try {
      const themeColor = await extractThemeColor(bookmarkUrl);
      accentColor = await resolveAccentColor(bookmarkUrl, themeColor);
    } catch {
      accentColor = await resolveAccentColor(bookmarkUrl);
    }

    if (blob && blob.byteLength > 0) {
      const key = `favicons/${bookmarkId}.png`;
      await env.ASSETS.put(key, blob, { httpMetadata: { contentType } });
      await db.updateBookmarkAssetData(env.DB, bookmarkId, { faviconKey: key, accentColor });
      return;
    }

    await db.updateBookmarkAssetData(env.DB, bookmarkId, { accentColor });
  } catch (error) {
    console.warn(`Favicon fetch failed for ${bookmarkUrl}:`, error);
  }
}
