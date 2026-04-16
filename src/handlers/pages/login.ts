import { Handler } from '../../router';
import { htmlResponse, jsonResponse, errorJsonResponse } from '../../utils/response';
import { createAuthCookie } from '../../middleware/auth';
import { CUSTOM_CSS } from '../../templates/animations';

export const loginPage: Handler = async () => {
  const html = `<!DOCTYPE html>
<html lang="zh-CN" x-data="{ darkMode: localStorage.getItem('dark') === 'true' }" :class="{ 'dark': darkMode }">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login — LinkMark</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { darkMode: 'class' }</script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js"></script>
  <style>${CUSTOM_CSS}
    [x-cloak] { display: none !important; }
  </style>
</head>
<body class="bg-gray-50 dark:bg-[#0a0a0f] min-h-screen flex items-center justify-center transition-colors duration-500 mesh-bg">
  <div class="w-full max-w-sm mx-auto px-4" x-data="loginForm()">
    <div class="bg-white/80 dark:bg-white/[0.03] glass rounded-3xl shadow-2xl shadow-indigo-500/5 border border-gray-200/50 dark:border-white/5 p-8 animate-scale-bounce">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mb-5 shadow-xl shadow-indigo-500/30 animate-float">
          <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
          <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient opacity-0 group-hover:opacity-100"></div>
        </div>
        <h1 class="text-2xl font-extrabold gradient-text">LinkMark</h1>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1.5">Enter your access token to continue</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="login()">
        <div class="relative">
          <input type="password" x-model="token" placeholder="Access Token"
                 class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                 :class="error ? 'ring-2 ring-red-500 border-transparent' : ''">
          <p x-show="error" x-cloak class="text-sm text-red-500 mt-2 animate-slide-down" x-text="error"></p>
        </div>
        <button type="submit" :disabled="loading"
                class="w-full mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
          <span x-show="!loading">Sign In</span>
          <span x-show="loading" x-cloak class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            Signing in...
          </span>
        </button>
      </form>
    </div>

    <!-- Dark mode toggle -->
    <div class="flex justify-center mt-4">
      <button @click="darkMode = !darkMode; localStorage.setItem('dark', darkMode)"
              class="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all">
        <svg x-show="!darkMode" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        <svg x-show="darkMode" x-cloak class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
      </button>
    </div>
  </div>

  <script>
    function loginForm() {
      return {
        token: '',
        error: '',
        loading: false,
        async login() {
          this.error = '';
          if (!this.token.trim()) { this.error = 'Please enter your token'; return; }
          this.loading = true;
          try {
            const res = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: this.token })
            });
            if (res.ok) {
              window.location.href = '/';
            } else {
              this.error = 'Invalid token';
            }
          } catch {
            this.error = 'Network error, please try again';
          } finally {
            this.loading = false;
          }
        }
      };
    }
  </script>
</body>
</html>`;
  return htmlResponse(html);
};

export const handleLogin: Handler = async (req, env) => {
  const body = await req.json<{ token: string }>();
  if (body.token === env.AUTH_TOKEN) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createAuthCookie(env.AUTH_TOKEN),
      },
    });
  }
  return errorJsonResponse('Invalid token', 401);
};
