import { CUSTOM_CSS } from './animations';
import { escapeHtml } from '../utils/html';

export function layout(options: { title: string; content: string; activePage?: string }): string {
  const { title, content, activePage = '' } = options;

  const navLink = (href: string, label: string, icon: string, page: string) => {
    const active = activePage === page;
    return `<a href="${href}"
      class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
        }">${icon} ${label}</a>`;
  };

  return `<!DOCTYPE html>
<html lang="zh-CN" x-data="{ darkMode: localStorage.getItem('dark') === 'true', sidebarOpen: false }"
      :class="{ 'dark': darkMode }" x-init="$watch('darkMode', v => localStorage.setItem('dark', v))">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — LinkMark</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = {
    darkMode: 'class',
    theme: { extend: {
      colors: {
        brand: { 50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81' }
      }
    }}
  }</script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js"></script>
  <style>${CUSTOM_CSS}
    [x-cloak] { display: none !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .glass { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  </style>
</head>
<body class="bg-gray-50 dark:bg-gray-950 min-h-screen transition-colors duration-300">

  <!-- Toast Container -->
  <div x-data="toast()" x-on:toast.window="add($event.detail)" class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    <template x-for="t in toasts" :key="t.id">
      <div class="pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-toast-in max-w-sm"
           :class="t.type === 'error' ? 'bg-red-500 text-white' : t.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'"
           x-text="t.message"
           x-init="setTimeout(() => remove(t.id), 3000)">
      </div>
    </template>
  </div>

  <!-- Top Nav Bar -->
  <nav class="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 glass border-b border-gray-200 dark:border-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo + Mobile menu btn -->
        <div class="flex items-center gap-3">
          <button @click="sidebarOpen = !sidebarOpen" class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <a href="/" class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
            </div>
            <span class="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">LinkMark</span>
          </a>
        </div>

        <!-- Desktop Nav -->
        <div class="hidden lg:flex items-center gap-1">
          ${navLink('/', 'Dashboard', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>', 'dashboard')}
          ${navLink('/bookmarks/new', 'Add', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>', 'add')}
          ${navLink('/tags', 'Tags', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>', 'tags')}
          ${navLink('/shortlinks', 'Links', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>', 'shortlinks')}
        </div>

        <!-- Dark mode toggle -->
        <button @click="darkMode = !darkMode"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg x-show="!darkMode" class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          <svg x-show="darkMode" x-cloak class="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        </button>
      </div>
    </div>
  </nav>

  <!-- Mobile Sidebar Overlay -->
  <div x-show="sidebarOpen" x-cloak @click="sidebarOpen = false"
       x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100"
       x-transition:leave="transition ease-in duration-150" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
       class="fixed inset-0 z-30 bg-black/50 lg:hidden"></div>
  <div x-show="sidebarOpen" x-cloak
       x-transition:enter="transition ease-out duration-200" x-transition:enter-start="-translate-x-full" x-transition:enter-end="translate-x-0"
       x-transition:leave="transition ease-in duration-150" x-transition:leave-start="translate-x-0" x-transition:leave-end="-translate-x-full"
       class="fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 shadow-xl lg:hidden p-4 flex flex-col gap-2 pt-20">
    ${navLink('/', 'Dashboard', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>', 'dashboard')}
    ${navLink('/bookmarks/new', 'Add Bookmark', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>', 'add')}
    ${navLink('/tags', 'Tags', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>', 'tags')}
    ${navLink('/shortlinks', 'Short Links', '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>', 'shortlinks')}
  </div>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    ${content}
  </main>

  <!-- Toast helper script -->
  <script>
    function toast() {
      return {
        toasts: [],
        counter: 0,
        add(detail) {
          this.toasts.push({ id: ++this.counter, ...detail });
        },
        remove(id) {
          this.toasts = this.toasts.filter(t => t.id !== id);
        }
      };
    }
    function showToast(message, type = 'info') {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
    }
  </script>
</body>
</html>`;
}
