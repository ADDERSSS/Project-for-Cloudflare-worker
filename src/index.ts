import { Router } from './router';
import { requireAuth, createAuthCookie } from './middleware/auth';
import { jsonResponse, htmlResponse, redirectResponse, errorJsonResponse } from './utils/response';
import { notFoundPage, serverErrorPage } from './templates/error-pages';

// Import API handlers
import { handleBookmarks } from './handlers/api/bookmarks';
import { handleTags } from './handlers/api/tags';
import { handleShortlinks } from './handlers/api/shortlinks';
import { handleStats } from './handlers/api/stats';

// Import page handlers
import { loginPage, handleLogin } from './handlers/pages/login';
import { dashboardPage } from './handlers/pages/dashboard';
import { bookmarkFormPage } from './handlers/pages/bookmark-form';
import { tagsPage } from './handlers/pages/tags-page';
import { shortlinksPage } from './handlers/pages/shortlinks-page';

// Import redirect handler
import { handleRedirect } from './handlers/redirect';

// Import cron handlers
import { cleanupExpiredLinks } from './cron/cleanup';
import { aggregateDailyStats } from './cron/aggregate-stats';

const router = new Router();

// --- Public routes ---
router.get('/s/:code', handleRedirect);
router.get('/login', loginPage);
router.post('/api/login', handleLogin);

// --- Pages (auth checked inside each handler) ---
router.get('/', dashboardPage);
router.get('/bookmarks/new', bookmarkFormPage);
router.get('/bookmarks/:id/edit', bookmarkFormPage);
router.get('/tags', tagsPage);
router.get('/shortlinks', shortlinksPage);

// --- API: Bookmarks ---
router.get('/api/bookmarks', handleBookmarks);
router.post('/api/bookmarks', handleBookmarks);
router.get('/api/bookmarks/:id', handleBookmarks);
router.put('/api/bookmarks/:id', handleBookmarks);
router.delete('/api/bookmarks/:id', handleBookmarks);
router.post('/api/bookmarks/:id/archive', handleBookmarks);

// --- API: Tags ---
router.get('/api/tags', handleTags);
router.post('/api/tags', handleTags);
router.put('/api/tags/:id', handleTags);
router.delete('/api/tags/:id', handleTags);

// --- API: Short links ---
router.get('/api/shortlinks', handleShortlinks);
router.post('/api/bookmarks/:bookmarkId/shortlink', handleShortlinks);
router.delete('/api/shortlinks/:code', handleShortlinks);

// --- API: Stats ---
router.get('/api/stats/overview', handleStats);
router.get('/api/stats/clicks', handleStats);

// --- API: Assets (R2) ---
router.get('/api/assets/:key', async (req, env, ctx, params) => {
  const object = await env.ASSETS.get(params.key);
  if (!object) return new Response('Not Found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Public routes — no auth
    if (url.pathname.startsWith('/s/') || url.pathname === '/login' || url.pathname === '/api/login') {
      return router.handle(request, env, ctx);
    }

    // Everything else requires auth
    const authResponse = requireAuth(request, env);
    if (authResponse) return authResponse;

    try {
      const response = await router.handle(request, env, ctx);
      // Replace plain-text 404 from router with styled page for non-API routes
      if (response.status === 404 && !url.pathname.startsWith('/api/')) {
        return htmlResponse(notFoundPage(), 404);
      }
      return response;
    } catch (err) {
      console.error('Unhandled error:', err);
      if (url.pathname.startsWith('/api/')) {
        return errorJsonResponse('Internal Server Error', 500);
      }
      return htmlResponse(serverErrorPage(), 500);
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      Promise.all([
        cleanupExpiredLinks(env),
        aggregateDailyStats(env),
      ])
    );
  },
} satisfies ExportedHandler<Env>;
