import { escapeHtml } from '../utils/html';
import type { BookmarkWithTags, TagRow, TagWithCount } from '../db/queries';

export function statsCard(label: string, value: string, icon: string, color: string, delay: number): string {
  return `
    <div class="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 animate-slide-up stagger-${delay}">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">${label}</p>
          <p class="text-3xl font-bold mt-1 text-gray-900 dark:text-white" x-text="${value}">&mdash;</p>
        </div>
        <div class="w-12 h-12 rounded-xl ${color} flex items-center justify-center">
          ${icon}
        </div>
      </div>
    </div>`;
}

export function bookmarkCard(): string {
  return `
    <div class="group bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden
                hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 hover:-translate-y-1 animate-slide-up"
         :class="'stagger-' + Math.min((index % 6) + 1, 6)">
      <!-- Card Header -->
      <div class="p-5">
        <div class="flex items-start gap-3">
          <!-- Favicon -->
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
            <template x-if="bookmark.favicon_key">
              <img :src="'/api/assets/' + bookmark.favicon_key" class="w-10 h-10 object-cover rounded-lg" loading="lazy">
            </template>
            <template x-if="!bookmark.favicon_key">
              <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
            </template>
          </div>
          <!-- Title + URL -->
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" x-text="bookmark.title"></h3>
            <a :href="bookmark.url" target="_blank" rel="noopener"
               class="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-500 truncate block mt-0.5" x-text="bookmark.url"></a>
          </div>
        </div>
        <!-- Description -->
        <p x-show="bookmark.description" class="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2" x-text="bookmark.description"></p>
        <!-- Tags -->
        <div class="flex flex-wrap gap-1.5 mt-3" x-show="bookmark.tags && bookmark.tags.length">
          <template x-for="tag in bookmark.tags" :key="tag.id">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  :style="'background-color:' + tag.color + '20; color:' + tag.color"
                  x-text="tag.name"
                  @click="filterByTag(tag.name)"></span>
          </template>
        </div>
      </div>
      <!-- Card Footer -->
      <div class="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
        <span class="text-xs text-gray-400" x-text="new Date(bookmark.created_at).toLocaleDateString()"></span>
        <div class="flex items-center gap-2">
          <a :href="'/bookmarks/' + bookmark.id + '/edit'"
             class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </a>
          <button @click="deleteBookmark(bookmark.id)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    </div>`;
}

export function loadingSkeleton(count = 6): string {
  return Array.from({ length: count }, (_, i) => `
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden animate-slide-up stagger-${Math.min(i + 1, 6)}">
      <div class="p-5">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg skeleton"></div>
          <div class="flex-1">
            <div class="h-5 w-3/4 rounded skeleton"></div>
            <div class="h-4 w-1/2 rounded skeleton mt-2"></div>
          </div>
        </div>
        <div class="flex gap-2 mt-3">
          <div class="h-5 w-16 rounded-full skeleton"></div>
          <div class="h-5 w-12 rounded-full skeleton"></div>
        </div>
      </div>
      <div class="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <div class="h-4 w-24 rounded skeleton"></div>
      </div>
    </div>`
  ).join('');
}

export function emptyState(title: string, description: string, actionHref: string, actionLabel: string): string {
  return `
    <div class="col-span-full flex flex-col items-center justify-center py-16 animate-fade-in">
      <div class="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <svg class="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${escapeHtml(title)}</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(description)}</p>
      <a href="${escapeHtml(actionHref)}"
         class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm hover:shadow">
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
      <div class="fixed inset-0 bg-black/50 glass" @click="${id} = false"></div>
      <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${escapeHtml(title)}</h3>
          <button @click="${id} = false" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        ${bodyContent}
      </div>
    </div>`;
}
