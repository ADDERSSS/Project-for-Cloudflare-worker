import { Handler } from '../../router';
import { jsonResponse, errorJsonResponse } from '../../utils/response';
import { generateId } from '../../utils/id';
import { isValidTagName, isValidHexColor } from '../../utils/validators';
import * as db from '../../db/queries';

export const handleTags: Handler = async (req, env, _ctx, params) => {
  // GET /api/tags
  if (req.method === 'GET') {
    const tags = await db.listTags(env.DB);
    return jsonResponse(tags);
  }

  // POST /api/tags
  if (req.method === 'POST') {
    const body = await req.json<{ name: string; color?: string }>();
    if (!isValidTagName(body.name)) return errorJsonResponse('Invalid tag name');
    if (body.color && !isValidHexColor(body.color)) return errorJsonResponse('Invalid color format');
    const id = generateId();
    await db.createTag(env.DB, { id, name: body.name.trim(), color: body.color });
    await env.CACHE.delete('stats:overview');
    return jsonResponse({ id, name: body.name.trim(), color: body.color || '#6366f1' }, 201);
  }

  // PUT /api/tags/:id
  if (req.method === 'PUT' && params.id) {
    const body = await req.json<{ name?: string; color?: string }>();
    if (body.name !== undefined && !isValidTagName(body.name)) return errorJsonResponse('Invalid tag name');
    if (body.color && !isValidHexColor(body.color)) return errorJsonResponse('Invalid color format');
    await db.updateTag(env.DB, params.id, { name: body.name?.trim(), color: body.color });
    return jsonResponse({ ok: true });
  }

  // DELETE /api/tags/:id
  if (req.method === 'DELETE' && params.id) {
    await db.deleteTag(env.DB, params.id);
    await env.CACHE.delete('stats:overview');
    return jsonResponse({ ok: true });
  }

  return errorJsonResponse('Method not allowed', 405);
};
