import { Handler } from '../../router';
import { htmlResponse } from '../../utils/response';
import { layout } from '../../templates/layout';
import { modal } from '../../templates/components';

export const tagsPage: Handler = async () => {
  const colorPalette = (model: string) => `
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
        <div class="flex flex-wrap gap-2">
          <template x-for="c in ['#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#3b82f6','#6b7280']" :key="c">
            <button type="button" @click="${model} = c"
                    class="w-7 h-7 rounded-full transition-all duration-150 hover:scale-110 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                    :class="${model} === c ? 'ring-2 ring-indigo-500 scale-110' : 'hover:ring-2 hover:ring-gray-300'"
                    :style="'background-color:' + c">
            </button>
          </template>
        </div>`;

  const editModal = modal('showEditModal', 'Edit Tag', `
    <form @submit.prevent="updateTag()">
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
        <input type="text" x-model="editForm.name"
               class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
      </div>
      <div class="mb-4">
        ${colorPalette('editForm.color')}
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" @click="showEditModal = false" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">Save</button>
      </div>
    </form>
  `);

  const content = `
    <div x-data="tagsManager()" x-init="init()">
      <div class="flex items-center justify-between mb-6 animate-slide-up">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white" style="view-transition-name: page-title">Tags</h1>
      </div>

      <!-- Create tag form -->
      <div class="bg-white/80 dark:bg-white/[0.03] glass rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-200/50 dark:border-white/5 p-5 mb-6 animate-slide-up stagger-1">
        <form @submit.prevent="createTag()">
          <div class="flex gap-3 mb-3">
            <input type="text" x-model="newTag.name" placeholder="Tag name..."
                   class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
            <button type="submit"
                    class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
              Add Tag
            </button>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0">Color:</span>
            <div class="flex flex-wrap gap-1.5">
              <template x-for="c in ['#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#3b82f6','#6b7280']" :key="c">
                <button type="button" @click="newTag.color = c"
                        class="w-6 h-6 rounded-full transition-all duration-150 hover:scale-125 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                        :class="newTag.color === c ? 'ring-2 ring-indigo-500 scale-110' : ''"
                        :style="'background-color:' + c">
                </button>
              </template>
            </div>
          </div>
        </form>
      </div>

      <!-- Tags list -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <template x-for="(tag, index) in tags" :key="tag.id">
          <div class="bg-white/80 dark:bg-white/[0.03] glass rounded-2xl border border-gray-200/50 dark:border-white/5 p-4 flex items-center justify-between group card-hover animate-slide-up"
               :class="'stagger-' + Math.min((index % 6) + 1, 6)">
            <div class="flex items-center gap-3">
              <div class="w-4 h-4 rounded-full shadow-sm" :style="'background-color:' + tag.color"></div>
              <span class="font-medium text-gray-900 dark:text-white" x-text="tag.name"></span>
              <span class="text-xs text-gray-400 bg-gray-100/80 dark:bg-white/5 px-2 py-0.5 rounded-full" x-text="tag.bookmark_count + ' bookmarks'"></span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="openEdit(tag)" class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button @click="deleteTag(tag.id)" class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Empty state -->
      <template x-if="!loading && tags.length === 0">
        <div class="text-center py-16 animate-fade-in">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 flex items-center justify-center mx-auto mb-4 animate-float">
            <svg class="w-8 h-8 text-pink-300 dark:text-pink-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
          </div>
          <p class="text-base font-semibold text-gray-900 dark:text-white">No tags yet</p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1.5">Create your first tag above</p>
        </div>
      </template>

      ${editModal}
    </div>

    <script>
      function tagsManager() {
        return {
          tags: [],
          loading: true,
          newTag: { name: '', color: '#6366f1' },
          showEditModal: false,
          editForm: { id: '', name: '', color: '' },

          async init() {
            await this.fetchTags();
          },

          async fetchTags() {
            this.loading = true;
            try {
              const res = await fetch('/api/tags');
              this.tags = await res.json();
            } catch {} finally { this.loading = false; }
          },

          async createTag() {
            if (!this.newTag.name.trim()) return;
            try {
              const res = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.newTag)
              });
              if (res.ok) {
                this.newTag.name = '';
                showToast('Tag created', 'success');
                this.fetchTags();
              }
            } catch { showToast('Failed to create tag', 'error'); }
          },

          openEdit(tag) {
            this.editForm = { id: tag.id, name: tag.name, color: tag.color };
            this.showEditModal = true;
          },

          async updateTag() {
            try {
              await fetch('/api/tags/' + this.editForm.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: this.editForm.name, color: this.editForm.color })
              });
              this.showEditModal = false;
              showToast('Tag updated', 'success');
              this.fetchTags();
            } catch { showToast('Failed to update', 'error'); }
          },

          async deleteTag(id) {
            if (!confirm('Delete this tag?')) return;
            try {
              await fetch('/api/tags/' + id, { method: 'DELETE' });
              showToast('Tag deleted', 'success');
              this.fetchTags();
            } catch { showToast('Failed to delete', 'error'); }
          }
        };
      }
    </script>`;

  return htmlResponse(layout({ title: 'Tags', content, activePage: 'tags' }));
};
