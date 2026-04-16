import { CUSTOM_CSS } from './animations';
import { commandPalette } from './components';
import { escapeHtml } from '../utils/html';

export function layout(options: {
  title: string;
  content: string;
  activePage?: string;
  publicPage?: boolean;
}): string {
  const { title, content, activePage = '', publicPage = false } = options;

  const navLink = (href: string, label: string, icon: string, page: string) => {
    const active = activePage === page;
    return `<a href="${href}"
      class="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus-ring
        ${active
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 shadow-sm shadow-indigo-500/10'
          : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200'
        }">
      <span class="transition-transform duration-200 group-hover:scale-110">${icon}</span>
      ${label}</a>`;
  };

  const brand = `
    <div class="flex items-center gap-2.5 group">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300 group-hover:scale-105"
           style="view-transition-name: app-logo">
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
      </div>
      <span class="text-lg font-extrabold gradient-text tracking-tight">LinkMark</span>
    </div>`;

  const fullNavigation = `
    <nav class="sticky top-0 z-40 bg-white/70 dark:bg-[#0a0a0f]/70 glass border-b border-gray-200/60 dark:border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-3">
            <button @click="sidebarOpen = !sidebarOpen" class="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <a href="/" class="flex items-center gap-2.5">${brand}</a>
          </div>

          <div class="hidden lg:flex items-center gap-1 bg-gray-100/60 dark:bg-white/5 p-1 rounded-2xl">
            ${navLink('/', 'Dashboard', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>', 'dashboard')}
            ${navLink('/bookmarks/new', 'Add', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>', 'add')}
            ${navLink('/tags', 'Tags', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>', 'tags')}
            ${navLink('/shortlinks', 'Links', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>', 'shortlinks')}
          </div>

          <div class="flex items-center gap-2">
            <button type="button"
                    @click="$dispatch('open-command-palette')"
                    class="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] text-gray-500 dark:text-gray-300 text-xs font-semibold tracking-wide hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors">
              <span>命令面板</span>
              <kbd class="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-[11px] text-gray-500 dark:text-gray-400">⌘K</kbd>
            </button>
            <button @click="darkMode = !darkMode"
              class="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-300 group">
              <svg x-show="!darkMode" class="w-5 h-5 text-gray-500 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
              <svg x-show="darkMode" x-cloak class="w-5 h-5 text-yellow-400 group-hover:text-yellow-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div x-show="sidebarOpen" x-cloak @click="sidebarOpen = false"
         x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100"
         x-transition:leave="transition ease-in duration-150" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
         class="fixed inset-0 z-30 bg-black/40 glass lg:hidden"></div>
    <div x-show="sidebarOpen" x-cloak
         x-transition:enter="transition ease-out duration-300" x-transition:enter-start="-translate-x-full" x-transition:enter-end="translate-x-0"
         x-transition:leave="transition ease-in duration-200" x-transition:leave-start="translate-x-0" x-transition:leave-end="-translate-x-full"
         class="fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-gray-900 shadow-2xl lg:hidden p-5 flex flex-col gap-1.5 pt-20 border-r border-gray-200 dark:border-gray-800">
      ${navLink('/', 'Dashboard', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>', 'dashboard')}
      ${navLink('/bookmarks/new', 'Add Bookmark', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>', 'add')}
      ${navLink('/tags', 'Tags', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>', 'tags')}
      ${navLink('/shortlinks', 'Short Links', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>', 'shortlinks')}
    </div>`;

  const publicNavigation = `
    <nav class="sticky top-0 z-40 bg-white/80 dark:bg-[#0a0a0f]/80 glass border-b border-gray-200/60 dark:border-white/5">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        ${brand}
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10">
          Public Collection
        </span>
      </div>
    </nav>`;

  return `<!DOCTYPE html>
<html lang="zh-CN"
      x-data="{ darkMode: localStorage.getItem('dark') === 'true', sidebarOpen: false }"
      :class="{ 'dark': darkMode }"
      @toggle-dark-mode.window="darkMode = !darkMode"
      x-init="$watch('darkMode', value => localStorage.setItem('dark', value))">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="view-transition" content="same-origin">
  <title>${escapeHtml(title)} — LinkMark</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = {
    darkMode: 'class',
    theme: { extend: {
      colors: {
        brand: { 50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81' }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }}
  }</script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js"></script>
  <style>
    @view-transition { navigation: auto; }
    ::view-transition-old(root), ::view-transition-new(root) { animation-duration: 0.25s; }
    ${CUSTOM_CSS}
  </style>
</head>
<body class="bg-gray-50 dark:bg-[#0a0a0f] min-h-screen transition-colors duration-500">
  ${publicPage ? publicNavigation : fullNavigation}

  <main class="${publicPage ? 'max-w-5xl' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8 mesh-bg min-h-[calc(100vh-4rem)]">
    ${content}
  </main>

  <footer class="border-t border-gray-200/60 dark:border-white/5 py-6 text-center">
    <p class="text-xs text-gray-400 dark:text-gray-600">
      ${publicPage ? 'LinkMark shared collection powered by Cloudflare Workers' : 'LinkMark — Personal Bookmark Manager built on Cloudflare Workers'}
    </p>
  </footer>

  ${publicPage ? '' : commandPalette()}

  <div x-data="toast()" x-on:toast.window="add($event.detail)"
       class="fixed top-5 right-5 z-[60] flex flex-col gap-2.5 pointer-events-none">
    <template x-for="t in toasts" :key="t.id">
      <div class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium animate-toast-in max-w-sm border"
           :class="t.type === 'error'
             ? 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
             : t.type === 'success'
               ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
               : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'"
           x-init="setTimeout(() => remove(t.id), 3500)">
        <template x-if="t.type === 'success'">
          <svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </template>
        <template x-if="t.type === 'error'">
          <svg class="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </template>
        <span x-text="t.message"></span>
      </div>
    </template>
  </div>

  <script>
    function toast() {
      return {
        toasts: [],
        counter: 0,
        add(detail) { this.toasts.push({ id: ++this.counter, ...detail }); },
        remove(id) { this.toasts = this.toasts.filter(t => t.id !== id); }
      };
    }

    function showToast(message, type = 'info') {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
    }

    function navigateToSection(sectionId) {
      if (window.location.pathname !== '/') {
        window.location.href = '/#' + sectionId;
        return;
      }
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function commandPalette() {
      return {
        open: false,
        q: '',
        results: [],
        active: 0,
        searchToken: 0,

        staticCommands() {
          return [
            {
              id: 'cmd-dashboard',
              kind: 'PAGE',
              label: '跳到 Dashboard',
              subtitle: '返回主工作台',
              action: () => { window.location.href = '/'; }
            },
            {
              id: 'cmd-new',
              kind: 'PAGE',
              label: '新建书签',
              subtitle: '打开新增表单',
              action: () => { window.location.href = '/bookmarks/new'; }
            },
            {
              id: 'cmd-tags',
              kind: 'PAGE',
              label: '跳到标签',
              subtitle: '管理标签色板与命名',
              action: () => { window.location.href = '/tags'; }
            },
            {
              id: 'cmd-shortlinks',
              kind: 'PAGE',
              label: '跳到短链',
              subtitle: '查看短链点击与复制',
              action: () => { window.location.href = '/shortlinks'; }
            },
            {
              id: 'cmd-stats',
              kind: 'PAGE',
              label: '跳到统计',
              subtitle: '滚动到年度点击与国家分布',
              action: () => { navigateToSection('analytics'); }
            },
            {
              id: 'cmd-collections',
              kind: 'PAGE',
              label: '跳到合集',
              subtitle: '创建或管理公开合集',
              action: () => { navigateToSection('collections'); }
            },
            {
              id: 'cmd-theme',
              kind: 'CMD',
              label: '切换暗色模式',
              subtitle: '在浅色与深色之间切换',
              action: () => { window.dispatchEvent(new CustomEvent('toggle-dark-mode')); }
            }
          ];
        },

        openPanel() {
          this.open = true;
          this.q = '';
          this.active = 0;
          this.search();
          this.$nextTick(() => {
            this.$refs.commandInput?.focus();
            this.$refs.commandInput?.select();
          });
        },

        close() {
          this.open = false;
          this.active = 0;
        },

        toggle() {
          if (this.open) this.close();
          else this.openPanel();
        },

        move(delta) {
          if (!this.results.length) return;
          const next = this.active + delta;
          this.active = (next + this.results.length) % this.results.length;
        },

        executeActive() {
          if (!this.results.length) {
            window.location.href = '/bookmarks/new';
            return;
          }
          this.execute(this.results[this.active]);
        },

        execute(item) {
          this.close();
          item.action();
        },

        async search() {
          const token = ++this.searchToken;
          const query = this.q.trim().toLowerCase();
          const staticResults = this.staticCommands().filter((item) => {
            if (!query) return true;
            return item.label.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query);
          });

          if (!query) {
            this.results = staticResults;
            this.active = 0;
            return;
          }

          try {
            const response = await fetch('/api/bookmarks?q=' + encodeURIComponent(this.q.trim()) + '&pageSize=5');
            const data = await response.json();
            if (token !== this.searchToken) return;

            const bookmarkResults = (data.bookmarks || []).map((bookmark) => ({
              id: 'bookmark-' + bookmark.id,
              kind: 'BOOKMARK',
              label: bookmark.title,
              subtitle: bookmark.url,
              action: () => { window.location.href = '/bookmarks/' + bookmark.id + '/edit'; }
            }));

            this.results = [...staticResults, ...bookmarkResults];
            this.active = 0;
          } catch {
            this.results = staticResults;
            this.active = 0;
          }
        }
      };
    }
  </script>
</body>
</html>`;
}
