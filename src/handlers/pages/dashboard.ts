import { Handler } from '../../router';
import { htmlResponse } from '../../utils/response';
import { layout } from '../../templates/layout';
import {
  annualClickHeatmap,
  bookmarkCard,
  countryBars,
  emptyState,
  loadingSkeleton,
  modal,
  statsCard,
} from '../../templates/components';
import * as db from '../../db/queries';

export const dashboardPage: Handler = async (_req, env) => {
  const [heatmapRows, countryRows] = await Promise.all([
    db.getAnnualClickHeatmap(env.DB),
    db.getTopCountries(env.DB),
  ]);

  const collectionModal = modal('showCollectionModal', '管理合集', `
    <form @submit.prevent="saveCollection()" class="space-y-5">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">标题</label>
        <input type="text" x-model="collectionForm.title" @input="handleCollectionTitleInput()"
               class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
               placeholder="例如：每周精选阅读" required>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Slug</label>
        <input type="text" x-model="collectionForm.slug" @input="slugTouched = true"
               class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
               placeholder="my-weekly-reads" required>
        <p class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">仅支持小写字母、数字和连字符。</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述</label>
        <textarea x-model="collectionForm.description" rows="3"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="给这个合集写一句简介"></textarea>
      </div>

      <label class="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03]">
        <div>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">公开只读</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">开启后，任何人都可以访问公开合集页。</p>
        </div>
        <input type="checkbox" x-model="collectionForm.isPublic" class="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
      </label>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">收录书签</label>
          <span class="text-xs text-gray-400 dark:text-gray-500" x-text="collectionForm.bookmarkIds.length + ' selected'"></span>
        </div>
        <div class="max-h-64 overflow-y-auto rounded-2xl border border-gray-200/70 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
          <template x-if="libraryBookmarks.length === 0">
            <div class="px-4 py-6 text-sm text-gray-400 dark:text-gray-500">先创建一些书签，再把它们加入合集。</div>
          </template>
          <template x-for="bookmark in libraryBookmarks" :key="bookmark.id">
            <label class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer">
              <input type="checkbox"
                     :checked="collectionForm.bookmarkIds.includes(bookmark.id)"
                     @change="toggleCollectionBookmark(bookmark.id)"
                     class="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate" x-text="bookmark.title"></p>
                <p class="text-xs text-gray-400 dark:text-gray-500 truncate" x-text="hostname(bookmark.url)"></p>
              </div>
            </label>
          </template>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button type="button" @click="showCollectionModal = false"
                class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
          取消
        </button>
        <button type="submit" :disabled="savingCollection"
                class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
          <span x-show="!savingCollection" x-text="editingCollectionId ? '更新合集' : '创建合集'"></span>
          <span x-show="savingCollection" x-cloak>保存中...</span>
        </button>
      </div>
    </form>
  `);

  const content = `
    <div x-data="dashboard()" x-init="init()">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        ${statsCard('Bookmarks', 'stats.totalBookmarks',
          '<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>',
          '#6366f1', 'from-indigo-500', 'to-blue-500', 1)}
        ${statsCard('Clicks Today', 'stats.clicksToday',
          '<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>',
          '#10b981', 'from-emerald-500', 'to-teal-500', 2)}
        ${statsCard('Short Links', 'stats.totalShortLinks',
          '<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>',
          '#f59e0b', 'from-amber-500', 'to-orange-500', 3)}
        ${statsCard('Tags', 'stats.totalTags',
          '<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>',
          '#ec4899', 'from-pink-500', 'to-rose-500', 4)}
      </div>

      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 animate-slide-up stagger-5">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight" style="view-transition-name: page-title">Knowledge Dashboard</h1>
          <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400">收集、理解、组织并分享你在云边缘上的私人知识库。</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" @click="$dispatch('open-command-palette')"
                  class="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors">
            <span>快速命令</span>
            <kbd class="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-[11px]">⌘K</kbd>
          </button>
          <a href="/bookmarks/new"
             class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            新建书签
          </a>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 mb-6 animate-slide-up stagger-5">
        <div class="relative flex-1">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" x-model="searchQuery" @input.debounce.300ms="fetchBookmarks()"
                 placeholder="搜索标题、域名、描述或 AI 摘要..."
                 class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-white/5 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 dark:focus:border-indigo-500/30 transition-all text-sm">
        </div>
        <div class="flex gap-1.5 flex-wrap">
          <button @click="activeTag = ''; page = 1; fetchBookmarks()"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all duration-200"
                  :class="!activeTag ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20' : 'bg-white dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 border border-gray-200/80 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30'">
            All
          </button>
          <template x-for="tag in tags" :key="tag.id">
            <button @click="filterByTag(tag.name)"
                    class="px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all duration-200 border"
                    :class="activeTag === tag.name ? 'border-transparent shadow-sm' : 'border-gray-200/80 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:border-indigo-300'"
                    :style="activeTag === tag.name ? 'background-color:' + tag.color + '; color: white; box-shadow: 0 4px 12px -2px ' + tag.color + '40' : ''"
                    x-text="tag.name"></button>
          </template>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <template x-if="loading">
          <div class="col-span-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${loadingSkeleton(6)}
          </div>
        </template>

        <template x-if="!loading && bookmarks.length > 0">
          <template x-for="(bookmark, index) in bookmarks" :key="bookmark.id">
            ${bookmarkCard()}
          </template>
        </template>

        <template x-if="!loading && bookmarks.length === 0">
          ${emptyState('还没有书签', '先加入第一条链接，仪表盘就会开始积累你的知识轨迹。', '/bookmarks/new', '添加书签')}
        </template>
      </div>

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

      <section id="analytics" class="mt-14 grid xl:grid-cols-[1.5fr,1fr] gap-4">
        <div class="bg-white/80 dark:bg-white/[0.03] glass rounded-3xl border border-gray-200/60 dark:border-white/5 p-6 animate-slide-up">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">年度点击热力图</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">把短链点击浓度压缩成一整年的工作节律。</p>
            </div>
            <span class="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">52 Weeks</span>
          </div>
          ${annualClickHeatmap(heatmapRows)}
        </div>

        <div class="bg-white/80 dark:bg-white/[0.03] glass rounded-3xl border border-gray-200/60 dark:border-white/5 p-6 animate-slide-up stagger-2">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">国家分布</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">最近 30 天的点击来源概况。</p>
            </div>
            <span class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500 dark:text-sky-300">Top 10</span>
          </div>
          <div class="space-y-4">
            ${countryBars(countryRows)}
          </div>
        </div>
      </section>

      <section id="collections" class="mt-14">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">公开合集</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">把一组书签整理成对外只读的分享页，同时保留你的后台管理体验。</p>
          </div>
          <button type="button" @click="openCreateCollection()"
                  class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors">
            <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            创建合集
          </button>
        </div>

        <div class="grid lg:grid-cols-2 gap-4">
          <template x-if="collectionsLoading">
            <div class="lg:col-span-2 grid lg:grid-cols-2 gap-4">
              <div class="h-48 rounded-3xl skeleton"></div>
              <div class="h-48 rounded-3xl skeleton"></div>
            </div>
          </template>

          <template x-if="!collectionsLoading && collections.length === 0">
            <div class="lg:col-span-2 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 px-6 py-12 text-center">
              <p class="text-base font-semibold text-gray-900 dark:text-white">还没有公开合集</p>
              <p class="text-sm text-gray-400 dark:text-gray-500 mt-1.5">创建一个主题页，把你最想分享的书签挑出来。</p>
            </div>
          </template>

          <template x-for="collection in collections" :key="collection.id">
            <div class="bg-white/80 dark:bg-white/[0.03] glass rounded-3xl border border-gray-200/60 dark:border-white/5 p-5 animate-slide-up">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white" x-text="collection.title"></h3>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          :class="collection.is_public ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'"
                          x-text="collection.is_public ? 'Public' : 'Private'"></span>
                  </div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">/c/<span x-text="collection.slug"></span></p>
                  <p x-show="collection.description" class="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed" x-text="collection.description"></p>
                </div>
                <div class="flex items-center gap-1">
                  <button type="button" @click="openEditCollection(collection)"
                          class="p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button type="button" @click="copyCollectionLink(collection)" :disabled="!collection.is_public"
                          class="p-2 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 disabled:opacity-40 dark:hover:bg-emerald-500/10 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                  </button>
                  <button type="button" @click="deleteCollection(collection.id)"
                          class="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>

              <div class="mt-5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <span x-text="collection.bookmark_count + ' bookmarks'"></span>
                <a x-show="collection.is_public" :href="'/c/' + collection.slug" target="_blank" rel="noopener"
                   class="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-400 transition-colors">
                  查看公开页
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 3h7m0 0v7m0-7L10 14"/></svg>
                </a>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <template x-for="bookmark in collection.bookmarks.slice(0, 6)" :key="bookmark.id">
                  <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300">
                    <span class="w-2 h-2 rounded-full" :style="'background:' + (bookmark.accent_color || '#6366f1')"></span>
                    <span x-text="bookmark.title"></span>
                  </span>
                </template>
              </div>
            </div>
          </template>
        </div>
      </section>

      ${collectionModal}
    </div>

    <script>
      function dashboard() {
        return {
          stats: { totalBookmarks: 0, clicksToday: 0, totalShortLinks: 0, totalTags: 0 },
          bookmarks: [],
          libraryBookmarks: [],
          tags: [],
          collections: [],
          loading: true,
          collectionsLoading: true,
          searchQuery: '',
          activeTag: '',
          page: 1,
          totalPages: 1,
          showCollectionModal: false,
          editingCollectionId: '',
          savingCollection: false,
          slugTouched: false,
          originalCollectionBookmarkIds: [],
          collectionForm: { title: '', slug: '', description: '', isPublic: false, bookmarkIds: [] },

          async init() {
            await Promise.all([
              this.fetchStats(),
              this.fetchTags(),
              this.fetchBookmarks(),
              this.fetchCollections(),
              this.fetchLibraryBookmarks(),
            ]);
          },

          hostname(url) {
            try {
              return new URL(url).hostname.replace(/^www\\./, '');
            } catch {
              return url;
            }
          },

          visibleSuggestedTags(bookmark) {
            const existing = new Set((bookmark.tags || []).map(tag => tag.name.toLowerCase()));
            return (bookmark.suggested_tags || []).filter(tag => !existing.has(tag.toLowerCase()));
          },

          slugify(value) {
            return value
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9\\s-]/g, '')
              .replace(/\\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
          },

          handleCollectionTitleInput() {
            if (!this.slugTouched) {
              this.collectionForm.slug = this.slugify(this.collectionForm.title);
            }
          },

          async fetchStats() {
            try {
              const response = await fetch('/api/stats/overview');
              this.stats = await response.json();
            } catch {}
          },

          async fetchTags() {
            try {
              const response = await fetch('/api/tags');
              this.tags = await response.json();
            } catch {}
          },

          async fetchBookmarks() {
            this.loading = true;
            try {
              const params = new URLSearchParams({ page: this.page.toString() });
              if (this.searchQuery) params.set('q', this.searchQuery);
              if (this.activeTag) params.set('tag', this.activeTag);
              const response = await fetch('/api/bookmarks?' + params);
              const data = await response.json();
              this.bookmarks = data.bookmarks;
              this.totalPages = Math.ceil(data.total / 20) || 1;
            } catch {} finally {
              this.loading = false;
            }
          },

          async fetchLibraryBookmarks() {
            try {
              const response = await fetch('/api/bookmarks?pageSize=100');
              const data = await response.json();
              this.libraryBookmarks = data.bookmarks || [];
            } catch {}
          },

          async fetchCollections() {
            this.collectionsLoading = true;
            try {
              const response = await fetch('/api/collections');
              this.collections = await response.json();
            } catch {} finally {
              this.collectionsLoading = false;
            }
          },

          filterByTag(name) {
            this.activeTag = this.activeTag === name ? '' : name;
            this.page = 1;
            this.fetchBookmarks();
          },

          openCreateCollection() {
            this.editingCollectionId = '';
            this.slugTouched = false;
            this.originalCollectionBookmarkIds = [];
            this.collectionForm = { title: '', slug: '', description: '', isPublic: false, bookmarkIds: [] };
            this.showCollectionModal = true;
          },

          openEditCollection(collection) {
            this.editingCollectionId = collection.id;
            this.slugTouched = true;
            this.originalCollectionBookmarkIds = [...(collection.bookmark_ids || [])];
            this.collectionForm = {
              title: collection.title,
              slug: collection.slug,
              description: collection.description || '',
              isPublic: !!collection.is_public,
              bookmarkIds: [...(collection.bookmark_ids || [])],
            };
            this.showCollectionModal = true;
          },

          toggleCollectionBookmark(bookmarkId) {
            const index = this.collectionForm.bookmarkIds.indexOf(bookmarkId);
            if (index >= 0) this.collectionForm.bookmarkIds.splice(index, 1);
            else this.collectionForm.bookmarkIds.push(bookmarkId);
          },

          async syncCollectionBookmarks(collectionId) {
            const toAdd = this.collectionForm.bookmarkIds.filter(id => !this.originalCollectionBookmarkIds.includes(id));
            const toRemove = this.originalCollectionBookmarkIds.filter(id => !this.collectionForm.bookmarkIds.includes(id));

            if (toAdd.length) {
              await fetch('/api/collections/' + collectionId + '/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookmarkIds: toAdd }),
              });
            }

            for (const bookmarkId of toRemove) {
              await fetch('/api/collections/' + collectionId + '/bookmarks/' + bookmarkId, { method: 'DELETE' });
            }
          },

          async saveCollection() {
            if (!this.collectionForm.title.trim() || !this.collectionForm.slug.trim()) {
              showToast('合集标题和 slug 不能为空', 'error');
              return;
            }

            this.savingCollection = true;
            try {
              if (this.editingCollectionId) {
                const response = await fetch('/api/collections/' + this.editingCollectionId, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: this.collectionForm.title,
                    slug: this.collectionForm.slug,
                    description: this.collectionForm.description,
                    isPublic: this.collectionForm.isPublic,
                  }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || '更新失败');
                }

                await this.syncCollectionBookmarks(this.editingCollectionId);
                showToast('合集已更新', 'success');
              } else {
                const response = await fetch('/api/collections', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: this.collectionForm.title,
                    slug: this.collectionForm.slug,
                    description: this.collectionForm.description,
                    isPublic: this.collectionForm.isPublic,
                  }),
                });

                const collection = await response.json();
                if (!response.ok) {
                  throw new Error(collection.error || '创建失败');
                }

                if (this.collectionForm.bookmarkIds.length) {
                  await fetch('/api/collections/' + collection.id + '/bookmarks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookmarkIds: this.collectionForm.bookmarkIds }),
                  });
                }

                showToast('合集已创建', 'success');
              }

              this.showCollectionModal = false;
              await Promise.all([this.fetchCollections(), this.fetchLibraryBookmarks()]);
            } catch (error) {
              showToast(error.message || '保存合集失败', 'error');
            } finally {
              this.savingCollection = false;
            }
          },

          async copyCollectionLink(collection) {
            if (!collection.is_public) return;
            await navigator.clipboard.writeText(window.location.origin + '/c/' + collection.slug);
            showToast('公开合集链接已复制', 'success');
          },

          async deleteCollection(id) {
            if (!confirm('删除这个合集？')) return;
            try {
              await fetch('/api/collections/' + id, { method: 'DELETE' });
              showToast('合集已删除', 'success');
              this.fetchCollections();
            } catch {
              showToast('删除合集失败', 'error');
            }
          },

          async createShortLink(bookmarkId) {
            try {
              const response = await fetch('/api/bookmarks/' + bookmarkId + '/shortlink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
              });
              if (response.ok) {
                const data = await response.json();
                const fullUrl = window.location.origin + '/s/' + data.code;
                await navigator.clipboard.writeText(fullUrl);
                showToast('短链已复制：/s/' + data.code, 'success');
                this.fetchStats();
              } else {
                showToast('创建短链失败', 'error');
              }
            } catch {
              showToast('创建短链失败', 'error');
            }
          },

          async retryAiAnalysis(bookmarkId) {
            try {
              const response = await fetch('/api/bookmarks/' + bookmarkId + '/reanalyze', { method: 'POST' });
              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '分析失败');
              }
              const bookmark = this.bookmarks.find(item => item.id === bookmarkId);
              if (bookmark) {
                bookmark.ai_status = 'pending';
                bookmark.ai_summary = null;
              }
              showToast('已重新加入智能分析队列', 'success');
            } catch (error) {
              showToast(error.message || '重新分析失败', 'error');
            }
          },

          async adoptSuggestedTag(bookmark, tagName) {
            try {
              let tag = this.tags.find(item => item.name.toLowerCase() === tagName.toLowerCase());

              if (!tag) {
                const createResponse = await fetch('/api/tags', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: tagName }),
                });
                tag = await createResponse.json();
                if (!createResponse.ok) throw new Error(tag.error || '创建标签失败');
                this.tags.push({ ...tag, bookmark_count: 0 });
              }

              const tagIds = Array.from(new Set([...(bookmark.tags || []).map(item => item.id), tag.id]));
              const response = await fetch('/api/bookmarks/' + bookmark.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: bookmark.url,
                  title: bookmark.title,
                  description: bookmark.description,
                  tagIds,
                }),
              });

              const updated = await response.json();
              if (!response.ok) throw new Error(updated.error || '更新书签失败');

              Object.assign(bookmark, updated);
              showToast('已采纳推荐标签', 'success');
              this.fetchTags();
            } catch (error) {
              showToast(error.message || '采纳标签失败', 'error');
            }
          },

          async deleteBookmark(id) {
            if (!confirm('删除这条书签？')) return;
            try {
              await fetch('/api/bookmarks/' + id, { method: 'DELETE' });
              showToast('书签已删除', 'success');
              await Promise.all([
                this.fetchBookmarks(),
                this.fetchStats(),
                this.fetchCollections(),
                this.fetchLibraryBookmarks(),
              ]);
            } catch {
              showToast('删除书签失败', 'error');
            }
          }
        };
      }
    </script>`;

  return htmlResponse(layout({ title: 'Dashboard', content, activePage: 'dashboard' }));
};
