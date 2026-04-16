import { Handler } from '../../router';
import { htmlResponse } from '../../utils/response';
import { layout } from '../../templates/layout';

export const bookmarkFormPage: Handler = async (req, _env, _ctx, params) => {
  const isEdit = !!params.id;
  const bookmarkId = params.id || '';

  const content = `
    <div x-data="bookmarkForm('${bookmarkId}')" x-init="init()" class="max-w-2xl mx-auto">
      <div class="animate-slide-up">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-6">
          <a href="/" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white" style="view-transition-name: page-title" x-text="isEdit ? 'Edit Bookmark' : 'Add Bookmark'"></h1>
        </div>

        <!-- Form Card -->
        <div class="bg-white/80 dark:bg-white/[0.03] glass rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-200/50 dark:border-white/5 p-6"
             :style="isEdit ? 'view-transition-name: bookmark-' + editId : ''">
          <form @submit.prevent="save()">
            <!-- URL -->
            <div class="mb-5">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL</label>
              <input type="url" x-model="form.url" @blur="autoFetchTitle()" required
                     placeholder="https://example.com"
                     class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
            </div>

            <!-- Title -->
            <div class="mb-5">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
              <div class="relative">
                <input type="text" x-model="form.title" required
                       placeholder="Page title"
                       class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                <span x-show="fetchingTitle" x-cloak class="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg class="animate-spin h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                </span>
              </div>
            </div>

            <!-- Description -->
            <div class="mb-5">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea x-model="form.description" rows="3"
                        placeholder="Optional description..."
                        class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"></textarea>
            </div>

            <!-- Tags -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tags</label>
              <div class="flex flex-wrap gap-2 mb-2">
                <template x-for="tag in allTags" :key="tag.id">
                  <button type="button" @click="toggleTag(tag.id)"
                          class="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-all duration-200"
                          :class="form.tagIds.includes(tag.id) ? 'border-transparent shadow-sm' : 'border-gray-200/80 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-500/30'"
                          :style="form.tagIds.includes(tag.id) ? 'background-color:' + tag.color + '20; color:' + tag.color + '; border-color:' + tag.color : ''"
                          x-text="tag.name"></button>
                </template>
              </div>
              <!-- New tag inline -->
              <div class="flex gap-2">
                <input type="text" x-model="newTagName" placeholder="New tag..."
                       @keydown.enter.prevent="createTag()"
                       class="flex-1 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 dark:border-white/10 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-all">
                <button type="button" @click="createTag()" x-show="newTagName.trim()"
                        class="px-3 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-500/20 transition-colors">
                  Add
                </button>
              </div>
            </div>

            <!-- Submit -->
            <div class="flex items-center gap-3">
              <button type="submit" :disabled="saving"
                      class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50">
                <span x-show="!saving" x-text="isEdit ? 'Update' : 'Save'"></span>
                <span x-show="saving" x-cloak>Saving...</span>
              </button>
              <a href="/" class="px-6 py-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                Cancel
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>

    <script>
      function bookmarkForm(editId) {
        return {
          isEdit: !!editId,
          form: { url: '', title: '', description: '', tagIds: [] },
          allTags: [],
          newTagName: '',
          saving: false,
          fetchingTitle: false,

          async init() {
            const res = await fetch('/api/tags');
            this.allTags = await res.json();
            if (this.isEdit) {
              const bRes = await fetch('/api/bookmarks/' + editId);
              const bookmark = await bRes.json();
              this.form.url = bookmark.url;
              this.form.title = bookmark.title;
              this.form.description = bookmark.description || '';
              this.form.tagIds = bookmark.tags.map(t => t.id);
            }
          },

          toggleTag(id) {
            const idx = this.form.tagIds.indexOf(id);
            if (idx >= 0) this.form.tagIds.splice(idx, 1);
            else this.form.tagIds.push(id);
          },

          async createTag() {
            const name = this.newTagName.trim();
            if (!name) return;
            try {
              const res = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
              });
              const tag = await res.json();
              this.allTags.push(tag);
              this.form.tagIds.push(tag.id);
              this.newTagName = '';
            } catch {
              showToast('Failed to create tag', 'error');
            }
          },

          async autoFetchTitle() {
            if (!this.form.url || this.form.title) return;
            this.fetchingTitle = true;
            try {
              // Try to extract title from the URL - best effort
              const res = await fetch(this.form.url, { method: 'GET', redirect: 'follow' });
              if (!res.ok) return;
              const text = await res.text();
              const match = text.match(/<title[^>]*>([^<]+)<\\/title>/i);
              if (match) this.form.title = match[1].trim();
            } catch {
              // Silently fail - user can type title manually
            } finally {
              this.fetchingTitle = false;
            }
          },

          async save() {
            this.saving = true;
            try {
              const method = this.isEdit ? 'PUT' : 'POST';
              const url = this.isEdit ? '/api/bookmarks/' + editId : '/api/bookmarks';
              const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.form)
              });
              if (res.ok) {
                showToast(this.isEdit ? 'Bookmark updated' : 'Bookmark saved', 'success');
                setTimeout(() => window.location.href = '/', 500);
              } else {
                const err = await res.json();
                showToast(err.error || 'Failed to save', 'error');
              }
            } catch {
              showToast('Network error', 'error');
            } finally {
              this.saving = false;
            }
          }
        };
      }
    </script>`;

  return htmlResponse(layout({
    title: isEdit ? 'Edit Bookmark' : 'Add Bookmark',
    content,
    activePage: 'add',
  }));
};
