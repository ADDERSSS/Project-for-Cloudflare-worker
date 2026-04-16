import { CUSTOM_CSS } from './animations';

function errorPage(status: number, title: string, message: string, suggestion: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN" x-data="{ darkMode: localStorage.getItem('dark') === 'true' }" :class="{ 'dark': darkMode }">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${status} — LinkMark</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { darkMode: 'class' }</script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js"></script>
  <style>${CUSTOM_CSS}
    [x-cloak] { display: none !important; }
  </style>
</head>
<body class="bg-gray-50 dark:bg-gray-950 min-h-screen flex items-center justify-center transition-colors duration-300">
  <div class="text-center px-4 animate-slide-up">
    <!-- Animated status code -->
    <div class="relative inline-block mb-6">
      <span class="text-[120px] sm:text-[160px] font-black leading-none bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent select-none">
        ${status}
      </span>
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-400/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl -z-10"></div>
    </div>

    <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 animate-slide-up stagger-1">
      ${title}
    </h1>
    <p class="text-gray-500 dark:text-gray-400 mb-2 max-w-md mx-auto animate-slide-up stagger-2">
      ${message}
    </p>
    <p class="text-sm text-gray-400 dark:text-gray-500 mb-8 animate-slide-up stagger-3">
      ${suggestion}
    </p>

    <div class="flex items-center justify-center gap-3 animate-slide-up stagger-4">
      <a href="/"
         class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>
        Back to Dashboard
      </a>
      <button onclick="history.back()"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        Go Back
      </button>
    </div>
  </div>

  <!-- Dark mode toggle in corner -->
  <button @click="darkMode = !darkMode; localStorage.setItem('dark', darkMode)"
          class="fixed bottom-4 right-4 p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all duration-200">
    <svg x-show="!darkMode" class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
    <svg x-show="darkMode" x-cloak class="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
  </button>
</body>
</html>`;
}

export function notFoundPage(): string {
  return errorPage(
    404,
    'Page Not Found',
    'The page you are looking for does not exist or has been moved.',
    'Check the URL or navigate back to the dashboard.'
  );
}

export function serverErrorPage(): string {
  return errorPage(
    500,
    'Something Went Wrong',
    'An unexpected error occurred while processing your request.',
    'Please try again later. If the problem persists, check the server logs.'
  );
}
