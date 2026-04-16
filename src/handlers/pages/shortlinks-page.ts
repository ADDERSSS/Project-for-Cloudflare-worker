import { Handler } from '../../router';
import { htmlResponse } from '../../utils/response';
import { layout } from '../../templates/layout';

export const shortlinksPage: Handler = async () => {
  const content = `
    <div x-data="shortlinksManager()" x-init="init()">
      <div class="flex items-center justify-between mb-6 animate-slide-up">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white" style="view-transition-name: page-title">Short Links</h1>
      </div>

      <!-- Links Table -->
      <div class="bg-white/80 dark:bg-white/[0.03] glass rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-200/50 dark:border-white/5 overflow-hidden animate-slide-up stagger-1">
        <!-- Loading -->
        <template x-if="loading">
          <div class="p-8 space-y-4">
            <div class="h-12 skeleton rounded-lg"></div>
            <div class="h-12 skeleton rounded-lg"></div>
            <div class="h-12 skeleton rounded-lg"></div>
          </div>
        </template>

        <!-- Table -->
        <template x-if="!loading && links.length > 0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-100 dark:border-white/5">
                  <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Short Link</th>
                  <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Target</th>
                  <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Clicks</th>
                  <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Created</th>
                  <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <template x-for="(link, index) in links" :key="link.code">
                  <tr class="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors animate-slide-up"
                      :class="'stagger-' + Math.min((index % 6) + 1, 6)">
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-2">
                        <code class="text-sm font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg" x-text="'/s/' + link.code"></code>
                        <button @click="copyLink(link.code)"
                                class="p-1 rounded-md text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                title="Copy link">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                        </button>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <div class="max-w-xs">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate" x-text="link.bookmark_title"></p>
                        <p class="text-xs text-gray-400 truncate" x-text="link.bookmark_url"></p>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <span class="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg>
                        <span x-text="link.click_count"></span>
                      </span>
                    </td>
                    <td class="px-5 py-4 text-sm text-gray-500" x-text="new Date(link.created_at).toLocaleDateString()"></td>
                    <td class="px-5 py-4 text-right">
                      <button @click="deleteLink(link.code)"
                              class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Empty state -->
        <template x-if="!loading && links.length === 0">
          <div class="text-center py-16 animate-fade-in">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 flex items-center justify-center mx-auto mb-4 animate-float">
              <svg class="w-8 h-8 text-amber-300 dark:text-amber-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            </div>
            <p class="text-base font-semibold text-gray-900 dark:text-white">No short links yet</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1.5">Generate short links from bookmark cards on the dashboard</p>
          </div>
        </template>
      </div>
    </div>

    <script>
      function shortlinksManager() {
        return {
          links: [],
          loading: true,

          async init() {
            this.loading = true;
            try {
              const res = await fetch('/api/shortlinks');
              this.links = await res.json();
            } catch {} finally { this.loading = false; }
          },

          copyLink(code) {
            const url = window.location.origin + '/s/' + code;
            navigator.clipboard.writeText(url).then(() => {
              showToast('Link copied!', 'success');
            });
          },

          async deleteLink(code) {
            if (!confirm('Delete this short link?')) return;
            try {
              await fetch('/api/shortlinks/' + code, { method: 'DELETE' });
              showToast('Short link deleted', 'success');
              this.init();
            } catch { showToast('Failed to delete', 'error'); }
          }
        };
      }
    </script>`;

  return htmlResponse(layout({ title: 'Short Links', content, activePage: 'shortlinks' }));
};
