import { Handler } from '../../router';
import { htmlResponse } from '../../utils/response';
import { layout } from '../../templates/layout';
import { escapeHtml } from '../../utils/html';
import * as db from '../../db/queries';

function publicCollectionCard(bookmark: db.BookmarkWithTags): string {
  const tags = bookmark.tags.length
    ? `<div class="flex flex-wrap gap-1.5 mt-4">
         ${bookmark.tags
           .map(
             (tag) => `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide"
                        style="background-color:${escapeHtml(tag.color)}15; color:${escapeHtml(tag.color)}; border:1px solid ${escapeHtml(tag.color)}25">
                         ${escapeHtml(tag.name)}
                       </span>`
           )
           .join('')}
       </div>`
    : '';

  const aiSummary = bookmark.ai_summary
    ? `<div class="mt-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-white/[0.03] p-3">
         <div class="flex items-start gap-2.5">
           <span class="mt-0.5 text-amber-500">
             <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2l1.763 4.88L17 8.236l-4 3.285L14.528 17 10 13.86 5.472 17 7 11.52 3 8.236l5.237-1.356L10 2z"/></svg>
           </span>
           <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">${escapeHtml(bookmark.ai_summary)}</p>
         </div>
       </div>`
    : '';

  return `
    <article class="relative bg-white/80 dark:bg-white/[0.03] glass rounded-3xl border border-gray-200/60 dark:border-white/5 p-5 overflow-hidden">
      <div class="absolute inset-y-0 left-0 w-[3px] rounded-r-full opacity-60" style="background:${escapeHtml(bookmark.accent_color || '#6366f1')}"></div>
      <div class="pl-2">
        <div class="flex items-start gap-3.5">
          <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 flex items-center justify-center overflow-hidden ring-1 ring-gray-200/50 dark:ring-white/5">
            ${bookmark.favicon_key
              ? `<img src="/api/assets/${escapeHtml(bookmark.favicon_key)}" class="w-11 h-11 object-cover rounded-xl" loading="lazy">`
              : `<svg class="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>`}
          </div>
          <div class="min-w-0 flex-1">
            <a href="${escapeHtml(bookmark.url)}" target="_blank" rel="noopener"
               class="text-[15px] font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block truncate">
              ${escapeHtml(bookmark.title)}
            </a>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">${escapeHtml(new URL(bookmark.url).hostname)}</p>
          </div>
        </div>
        ${aiSummary}
        ${bookmark.description ? `<p class="mt-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">${escapeHtml(bookmark.description)}</p>` : ''}
        ${tags}
      </div>
    </article>`;
}

export const collectionPage: Handler = async (req, env, ctx, params) => {
  const cache = caches.default;
  const cached = await cache.match(req);
  if (cached) return cached;

  const collection = await db.getPublicCollectionBySlug(env.DB, params.slug);
  if (!collection) {
    return htmlResponse(
      layout({
        title: 'Collection Not Found',
        publicPage: true,
        content: `
          <div class="max-w-2xl mx-auto py-20 text-center">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">这个合集不存在</h1>
            <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">它可能还未公开，或者 slug 已经变更。</p>
          </div>`,
      }),
      404
    );
  }

  const content = `
    <section class="max-w-4xl mx-auto">
      <div class="rounded-[2rem] border border-gray-200/70 dark:border-white/5 bg-white/80 dark:bg-white/[0.03] glass p-8">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500 dark:text-indigo-300">Shared Collection</p>
            <h1 class="mt-3 text-4xl font-bold tracking-tight text-gray-900 dark:text-white" style="view-transition-name: page-title">${escapeHtml(collection.title)}</h1>
            <p class="mt-3 text-base leading-relaxed text-gray-500 dark:text-gray-400 max-w-2xl">${escapeHtml(collection.description || '一组来自 LinkMark 的精选书签。')}</p>
          </div>
          <div class="grid grid-cols-2 gap-3 min-w-[220px]">
            <div class="rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 px-4 py-3">
              <p class="text-[11px] uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">Bookmarks</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">${collection.bookmark_count}</p>
            </div>
            <div class="rounded-2xl bg-sky-50 dark:bg-sky-500/10 px-4 py-3">
              <p class="text-[11px] uppercase tracking-[0.18em] text-sky-500 dark:text-sky-300">Updated</p>
              <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(new Date(collection.updated_at).toLocaleDateString('zh-CN'))}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 grid md:grid-cols-2 gap-4">
        ${collection.bookmarks.length
          ? collection.bookmarks.map((bookmark) => publicCollectionCard(bookmark)).join('')
          : `<div class="md:col-span-2 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 px-6 py-14 text-center">
               <p class="text-base font-semibold text-gray-900 dark:text-white">这个合集暂时还没有书签</p>
               <p class="mt-2 text-sm text-gray-400 dark:text-gray-500">稍后再来看看，也许主人正在整理中。</p>
             </div>`}
      </div>
    </section>`;

  const response = htmlResponse(
    layout({
      title: collection.title,
      content,
      publicPage: true,
    })
  );

  response.headers.set('Cache-Control', 'public, max-age=3600');
  ctx.waitUntil(cache.put(req, response.clone()));
  return response;
};
