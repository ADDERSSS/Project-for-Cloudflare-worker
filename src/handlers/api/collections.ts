import { Handler } from '../../router';
import { errorJsonResponse, jsonResponse } from '../../utils/response';
import { generateId } from '../../utils/id';
import * as db from '../../db/queries';

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export const handleCollections: Handler = async (req, env, _ctx, params) => {
  const url = new URL(req.url);
  const origin = url.origin;

  const invalidateCache = (slug: string) => caches.default.delete(new URL(`/c/${slug}`, origin).toString());

  if (req.method === 'GET' && !params.id) {
    const collections = await db.listCollections(env.DB);
    return jsonResponse(collections);
  }

  if (req.method === 'POST' && !params.id) {
    const body = await req.json<{ slug: string; title: string; description?: string; isPublic?: boolean }>();
    const slug = body.slug?.trim().toLowerCase();
    const title = body.title?.trim();

    if (!title) return errorJsonResponse('Title is required');
    if (!slug || !isValidSlug(slug)) return errorJsonResponse('Invalid slug');

    try {
      const id = generateId();
      await db.createCollection(env.DB, {
        id,
        slug,
        title,
        description: body.description?.trim(),
        isPublic: body.isPublic,
      });

      const collection = await db.getCollection(env.DB, id);
      return jsonResponse(collection, 201);
    } catch (error) {
      console.warn('Failed to create collection:', error);
      return errorJsonResponse('Slug already exists', 409);
    }
  }

  if (req.method === 'PUT' && params.id) {
    const existing = await db.getCollection(env.DB, params.id);
    if (!existing) return errorJsonResponse('Not found', 404);

    const body = await req.json<{ slug?: string; title?: string; description?: string | null; isPublic?: boolean }>();

    if (body.slug !== undefined) {
      const slug = body.slug.trim().toLowerCase();
      if (!isValidSlug(slug)) return errorJsonResponse('Invalid slug');
      body.slug = slug;
    }

    if (body.title !== undefined && !body.title.trim()) {
      return errorJsonResponse('Title is required');
    }

    try {
      await db.updateCollection(env.DB, params.id, {
        slug: body.slug,
        title: body.title?.trim(),
        description: body.description === undefined ? undefined : body.description?.trim() || null,
        isPublic: body.isPublic,
      });

      if (existing.is_public === 1) await invalidateCache(existing.slug);

      const updated = await db.getCollection(env.DB, params.id);
      if (updated?.is_public) {
        await invalidateCache(updated.slug);
      }

      return jsonResponse(updated);
    } catch (error) {
      console.warn('Failed to update collection:', error);
      return errorJsonResponse('Slug already exists', 409);
    }
  }

  if (req.method === 'DELETE' && params.id) {
    const existing = await db.getCollection(env.DB, params.id);
    if (!existing) return errorJsonResponse('Not found', 404);

    await db.deleteCollection(env.DB, params.id);
    if (existing.is_public === 1) {
      await invalidateCache(existing.slug);
    }

    return jsonResponse({ ok: true });
  }

  if (req.method === 'POST' && params.id && url.pathname.endsWith('/bookmarks')) {
    const collection = await db.getCollection(env.DB, params.id);
    if (!collection) return errorJsonResponse('Not found', 404);

    const body = await req.json<{ bookmarkIds?: string[] }>().catch(() => ({ bookmarkIds: [] }));
    const bookmarkIds = Array.isArray(body.bookmarkIds)
      ? body.bookmarkIds.map((bookmarkId) => String(bookmarkId)).filter(Boolean)
      : [];

    await db.addBookmarksToCollection(env.DB, params.id, bookmarkIds);
    if (collection.is_public === 1) {
      await invalidateCache(collection.slug);
    }

    const updated = await db.getCollection(env.DB, params.id);
    return jsonResponse(updated);
  }

  if (req.method === 'DELETE' && params.id && params.bookmarkId) {
    const collection = await db.getCollection(env.DB, params.id);
    if (!collection) return errorJsonResponse('Not found', 404);

    await db.removeBookmarkFromCollection(env.DB, params.id, params.bookmarkId);
    if (collection.is_public === 1) {
      await invalidateCache(collection.slug);
    }

    return jsonResponse({ ok: true });
  }

  return errorJsonResponse('Method not allowed', 405);
};
