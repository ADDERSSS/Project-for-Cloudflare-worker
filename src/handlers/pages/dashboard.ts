import { Handler } from '../../router';
import { htmlResponse } from '../../utils/response';
import { layout } from '../../templates/layout';
import { statsCard, bookmarkCard, loadingSkeleton, emptyState } from '../../templates/components';
import { raw } from '../../utils/html';

export const dashboardPage: Handler = async () => {
  const content = `
    <div x-data="dashboard()" x-init="init()">
      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        ${statsCard('Bookmarks', 'stats.totalBookmarks',
          '<svg class="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>',
          'bg-indigo-100 dark:bg-indigo-900/30', 1)}
        ${statsCard('Clicks Today', 'stats.clicksToday',
          '<svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>',
          'bg-emerald-100 dark:bg-emerald-900/30', 2)}
        ${statsCard('Short Links', 'stats.totalShortLinks',
          '<svg class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>',
          'bg-amber-100 dark:bg-amber-900/30', 3)}
        ${statsCard('Tags', 'stats.totalTags',
          '<svg class="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>',
          'bg-pink-100 dark:bg-pink-900/30', 4)}
      </div>

      <!-- Search + Filter Bar -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6 animate-slide-up stagger-5">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" x-model="searchQuery" @input.debounce.300ms="fetchBookmarks()"
                 placeholder="Search bookmarks..."
                 class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
        </div>
        <div class="flex gap-2 flex-wrap">
          <button @click="activeTag = ''; fetchBookmarks()"
                  class="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  :class="!activeTag ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300'">
            All
          </button>
          <template x-for="tag in tags" :key="tag.id">
            <button @click="filterByTag(tag.name)"
                    class="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border"
                    :class="activeTag === tag.name ? 'border-transparent' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'"
                    :style="activeTag === tag.name ? 'background-color:' + tag.color + '20; color:' + tag.color + '; border-color:' + tag.color + '40' : ''"
                    x-text="tag.name"></button>
          </template>
        </div>
      </div>

      <!-- Bookmark Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <!-- Loading skeletons -->
        <template x-if="loading">
          <div class="col-span-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${loadingSkeleton(6)}
          </div>
        </template>

        <!-- Bookmarks -->
        <template x-if="!loading && bookmarks.length > 0">
          <template x-for="(bookmark, index) in bookmarks" :key="bookmark.id">
            ${bookmarkCard()}
          </template>
        </template>

        <!-- Empty state -->
        <template x-if="!loading && bookmarks.length === 0">
          ${emptyState('No bookmarks yet', 'Start by adding your first bookmark', '/bookmarks/new', 'Add Bookmark')}
        </template>
      </div>

      <!-- Pagination -->
      <div x-show="totalPages > 1" class="flex items-center justify-center gap-2 mt-8 animate-fade-in">
        <button @click="page > 1 && (page--, fetchBookmarks())" :disabled="page <= 1"
                class="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-all">
          Prev
        </button>
        <span class="text-sm text-gray-500 dark:text-gray-400" x-text="page + ' / ' + totalPages"></span>
        <button @click="page < totalPages && (page++, fetchBookmarks())" :disabled="page >= totalPages"
                class="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-all">
          Next
        </button>
      </div>
    </div>

    <script>
      function dashboard() {
        return {
          stats: { totalBookmarks: 0, clicksToday: 0, totalShortLinks: 0, totalTags: 0 },
          bookmarks: [],
          tags: [],
          loading: true,
          searchQuery: '',
          activeTag: '',
          page: 1,
          totalPages: 1,

          async init() {
            await Promise.all([this.fetchStats(), this.fetchTags(), this.fetchBookmarks()]);
          },

          async fetchStats() {
            try {
              const res = await fetch('/api/stats/overview');
              this.stats = await res.json();
            } catch {}
          },

          async fetchTags() {
            try {
              const res = await fetch('/api/tags');
              this.tags = await res.json();
            } catch {}
          },

          async fetchBookmarks() {
            this.loading = true;
            try {
              const params = new URLSearchParams({ page: this.page.toString() });
              if (this.searchQuery) params.set('q', this.searchQuery);
              if (this.activeTag) params.set('tag', this.activeTag);
              const res = await fetch('/api/bookmarks?' + params);
              const data = await res.json();
              this.bookmarks = data.bookmarks;
              this.totalPages = Math.ceil(data.total / 20) || 1;
            } catch {} finally {
              this.loading = false;
            }
          },

          filterByTag(name) {
            this.activeTag = this.activeTag === name ? '' : name;
            this.page = 1;
            this.fetchBookmarks();
          },

          async deleteBookmark(id) {
            if (!confirm('Delete this bookmark?')) return;
            try {
              await fetch('/api/bookmarks/' + id, { method: 'DELETE' });
              showToast('Bookmark deleted', 'success');
              this.fetchBookmarks();
              this.fetchStats();
            } catch {
              showToast('Failed to delete', 'error');
            }
          }
        };
      }
    </script>`;

  return htmlResponse(layout({ title: 'Dashboard', content, activePage: 'dashboard' }));
};
