import { escapeHtml } from '../utils/html';
import type { BookmarkWithTags, TagRow, TagWithCount } from '../db/queries';

export function statsCard(label: string, value: string, icon: string, color: string, gradientFrom: string, gradientTo: string, delay: number): string {
  return `
    <div class="relative overflow-hidden bg-white dark:bg-white/[0.03] rounded-2xl p-5 border border-gray-100 dark:border-white/5 card-hover animate-slide-up stagger-${delay} group">
      <div class="relative z-10 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">${label}</p>
          <p class="text-3xl font-extrabold mt-2 text-gray-900 dark:text-white animate-count-up" x-text="${value}">&mdash;</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
             style="box-shadow: 0 8px 24px -4px ${color}40">
          ${icon}
        </div>
      </div>
      <div class="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-[0.04] dark:opacity-[0.06] bg-gradient-to-br ${gradientFrom} ${gradientTo}"></div>
    </div>`;
}

export function bookmarkCard(): string {
  return `
    <div class="group bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden card-hover animate-slide-up"
         :class="'stagger-' + Math.min((index % 8) + 1, 8)">
      <div class="p-5">
        <div class="flex items-start gap-3.5">
          <div class="relative flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 flex items-center justify-center overflow-hidden ring-1 ring-gray-200/50 dark:ring-white/5">
            <template x-if="bookmark.favicon_key">
              <img :src="'/api/assets/' + bookmark.favicon_key" class="w-11 h-11 object-cover rounded-xl" loading="lazy">
            </template>
            <template x-if="!bookmark.favicon_key">
              <svg class="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
            </template>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-[15px] font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" x-text="bookmark.title"></h3>
            <a :href="bookmark.url" target="_blank" rel="noopener"
               class="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 truncate block mt-1 transition-colors" x-text="new URL(bookmark.url).hostname"></a>
          </div>
        </div>
        <p x-show="bookmark.description" class="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2 leading-relaxed" x-text="bookmark.description"></p>
        <div class="flex flex-wrap gap-1.5 mt-3" x-show="bookmark.tags && bookmark.tags.length">
          <template x-for="tag in bookmark.tags" :key="tag.id">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide cursor-pointer hover:scale-105 transition-transform"
                  :style="'background-color:' + tag.color + '15; color:' + tag.color + '; border: 1px solid ' + tag.color + '25'"
                  x-text="tag.name"
                  @click="filterByTag(tag.name)"></span>
          </template>
        </div>
      </div>
      <div class="px-5 py-3 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between border-t border-gray-100 dark:border-white/5">
        <span class="text-[11px] font-medium text-gray-400 dark:text-gray-600 tracking-wide" x-text="new Date(bookmark.created_at).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})"></span>
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button @click="createShortLink(bookmark.id)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all duration-200"
                  title="Generate short link">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          </button>
          <a :href="'/bookmarks/' + bookmark.id + '/edit'"
             class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all duration-200"
             title="Edit">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </a>
          <button @click="deleteBookmark(bookmark.id)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
                  title="Delete">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    </div>`;
}

export function loadingSkeleton(count = 6): string {
  return Array.from({ length: count }, (_, i) => `
    <div class="bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-slide-up stagger-${Math.min(i + 1, 8)}">
      <div class="p-5">
        <div class="flex items-start gap-3.5">
          <div class="w-11 h-11 rounded-xl skeleton"></div>
          <div class="flex-1 space-y-2.5">
            <div class="h-4 w-3/4 skeleton"></div>
            <div class="h-3 w-1/2 skeleton"></div>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <div class="h-5 w-14 rounded-md skeleton"></div>
          <div class="h-5 w-10 rounded-md skeleton"></div>
        </div>
      </div>
      <div class="px-5 py-3 border-t border-gray-100 dark:border-white/5">
        <div class="h-3 w-20 skeleton"></div>
      </div>
    </div>`
  ).join('');
}

export function emptyState(title: string, description: string, actionHref: string, actionLabel: string): string {
  return `
    <div class="col-span-full flex flex-col items-center justify-center py-20 animate-fade-in">
      <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 flex items-center justify-center mb-5 animate-float">
        <svg class="w-9 h-9 text-indigo-300 dark:text-indigo-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${escapeHtml(title)}</h3>
      <p class="text-sm text-gray-400 dark:text-gray-500 mt-1.5 max-w-xs text-center">${escapeHtml(description)}</p>
      <a href="${escapeHtml(actionHref)}"
         class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        ${escapeHtml(actionLabel)}
      </a>
    </div>`;
}

export function modal(id: string, title: string, bodyContent: string): string {
  return `
    <div x-show="${id}" x-cloak
         x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100"
         x-transition:leave="transition ease-in duration-150" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
         class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/40 glass" @click="${id} = false"></div>
      <div class="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-7 animate-scale-bounce border border-gray-100 dark:border-gray-800">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">${escapeHtml(title)}</h3>
          <button @click="${id} = false" class="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        ${bodyContent}
      </div>
    </div>`;
}
