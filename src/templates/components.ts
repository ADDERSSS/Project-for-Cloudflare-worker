import { escapeHtml } from '../utils/html';

function getTrailingDates(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(utcMidnight - offset * 24 * 60 * 60 * 1000);
    result.push(date.toISOString().slice(0, 10));
  }

  return result;
}

function flagEmoji(countryCode: string): string {
  if (!/^[a-z]{2}$/i.test(countryCode)) return '🌍';
  return countryCode
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

export function statsCard(
  label: string,
  value: string,
  icon: string,
  color: string,
  gradientFrom: string,
  gradientTo: string,
  delay: number
): string {
  return `
    <div class="relative overflow-hidden bg-white dark:bg-white/[0.03] rounded-2xl p-5 border border-gray-100 dark:border-white/5 card-hover animate-slide-up stagger-${delay} group">
      <div class="relative z-10 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">${label}</p>
          <p class="text-3xl font-extrabold mt-2 text-gray-900 dark:text-white animate-count-up" x-text="${value}">&mdash;</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
             style="box-shadow: 0 8px 24px -4px ${color}40">
          ${icon}
        </div>
      </div>
      <div class="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-[0.04] dark:opacity-[0.06] bg-gradient-to-br ${gradientFrom} ${gradientTo}"></div>
    </div>`;
}

export function sparkline(points: number[]): string {
  const width = 60;
  const height = 20;
  const padding = 2;
  const safePoints = points.length ? points : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...safePoints, 1);
  const min = Math.min(...safePoints, 0);
  const range = Math.max(max - min, 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const polyline = safePoints
    .map((value, index) => {
      const x = padding + (usableWidth * index) / Math.max(safePoints.length - 1, 1);
      const y = height - padding - ((value - min) / range) * usableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const lastValue = safePoints[safePoints.length - 1] ?? 0;
  const lastX = padding + usableWidth;
  const lastY = height - padding - ((lastValue - min) / range) * usableHeight;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="${width}" y2="0" gradientUnits="userSpaceOnUse">
          <stop stop-color="#60a5fa"></stop>
          <stop offset="1" stop-color="#8b5cf6"></stop>
        </linearGradient>
      </defs>
      <polyline points="${polyline}" stroke="url(#sparklineGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
      <circle cx="${lastX.toFixed(2)}" cy="${lastY.toFixed(2)}" r="2.25" fill="#8b5cf6"></circle>
    </svg>`;
}

export function annualClickHeatmap(rows: Array<{ date: string; clicks: number }>): string {
  const allDates = getTrailingDates(364);
  const countsByDate = new Map(rows.map((row) => [row.date, row.clicks]));
  const values = allDates.map((date) => ({ date, clicks: countsByDate.get(date) ?? 0 }));
  const max = Math.max(...values.map((item) => item.clicks), 0);
  const colors = ['#eef2ff', '#c7d2fe', '#818cf8', '#4f46e5', '#312e81'];
  const cellSize = 10;
  const gap = 2;
  const columns = 52;
  const rowsPerWeek = 7;
  const svgWidth = columns * (cellSize + gap) - gap;
  const svgHeight = rowsPerWeek * (cellSize + gap) - gap;

  const cells = values
    .map((item, index) => {
      const column = Math.floor(index / rowsPerWeek);
      const row = index % rowsPerWeek;
      const x = column * (cellSize + gap);
      const y = row * (cellSize + gap);
      const intensity = max === 0 ? 0 : Math.ceil((item.clicks / max) * 4);
      const fill = colors[Math.min(intensity, colors.length - 1)];

      return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${fill}">
        <title>${item.date}: ${item.clicks} clicks</title>
      </rect>`;
    })
    .join('');

  return `
    <div class="overflow-x-auto">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full min-w-[620px] h-auto">
        ${cells}
      </svg>
    </div>
    <div class="mt-3 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
      <span>过去 52 周</span>
      <span>低 → 高</span>
    </div>`;
}

export function countryBars(rows: Array<{ country: string; clicks: number }>): string {
  if (!rows.length) {
    return `
      <div class="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
        最近 30 天还没有足够的国家访问数据。
      </div>`;
  }

  const max = Math.max(...rows.map((row) => row.clicks), 1);

  return rows
    .map((row) => {
      const percent = Math.max(8, Math.round((row.clicks / max) * 100));
      return `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <span>${flagEmoji(row.country)}</span>
              <span>${escapeHtml(row.country)}</span>
            </span>
            <span class="text-xs font-semibold text-gray-400 dark:text-gray-500">${row.clicks}</span>
          </div>
          <div class="h-2.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500" style="width:${percent}%"></div>
          </div>
        </div>`;
    })
    .join('');
}

export function commandPalette(): string {
  return `
    <div x-data="commandPalette()" x-cloak class="hidden md:block"
         @keydown.window.meta.k.prevent="toggle()"
         @keydown.window.ctrl.k.prevent="toggle()"
         @keydown.escape.window="close()"
         @open-command-palette.window="openPanel()">
      <div x-show="open"
           class="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
           x-transition:enter="transition ease-out duration-200"
           x-transition:enter-start="opacity-0"
           x-transition:enter-end="opacity-100"
           x-transition:leave="transition ease-in duration-150"
           x-transition:leave-start="opacity-100"
           x-transition:leave-end="opacity-0">
        <div @click="close()" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-xl mx-4 glass rounded-3xl border border-white/10 bg-[#0d1020]/90 shadow-2xl shadow-black/40 animate-scale-bounce overflow-hidden">
          <div class="px-5 py-4 border-b border-white/10">
            <input x-ref="commandInput"
                   x-model="q"
                   @input.debounce.150ms="search()"
                   @keydown.arrow-down.prevent="move(1)"
                   @keydown.arrow-up.prevent="move(-1)"
                   @keydown.enter.prevent="executeActive()"
                   type="text"
                   placeholder="搜索书签 / 跳转 / 命令..."
                   class="w-full bg-transparent text-white text-base placeholder:text-white/40 focus:outline-none">
          </div>
          <div class="max-h-[55vh] overflow-y-auto">
            <template x-if="results.length === 0">
              <div class="px-5 py-8 text-sm text-white/55">
                没有匹配结果，按回车会直接新建书签。
              </div>
            </template>
            <ul>
              <template x-for="(item, index) in results" :key="item.id">
                <li>
                  <button type="button"
                          @mousemove="active = index"
                          @click="execute(item)"
                          class="w-full px-5 py-3.5 text-left border-b border-white/5 transition-colors"
                          :class="index === active ? 'bg-white/10' : 'hover:bg-white/5'">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <p class="text-sm font-semibold text-white" x-text="item.label"></p>
                        <p class="text-xs text-white/50 mt-0.5" x-text="item.subtitle"></p>
                      </div>
                      <span class="text-[11px] uppercase tracking-[0.2em] text-white/35" x-text="item.kind"></span>
                    </div>
                  </button>
                </li>
              </template>
            </ul>
          </div>
        </div>
      </div>
    </div>`;
}

export function bookmarkCard(): string {
  return `
    <div class="relative group bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden card-hover animate-slide-up"
         :class="'stagger-' + Math.min((index % 8) + 1, 8)"
         :style="'view-transition-name: bookmark-' + bookmark.id">
      <div class="absolute inset-y-0 left-0 w-[3px] rounded-r-full opacity-60" :style="'background:' + (bookmark.accent_color || '#6366f1')"></div>
      <div class="p-5 pl-6">
        <div class="flex items-start gap-3.5">
          <div class="relative flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 flex items-center justify-center overflow-hidden ring-1 ring-gray-200/50 dark:ring-white/5">
            <template x-if="bookmark.favicon_key">
              <img :src="'/api/assets/' + bookmark.favicon_key" class="w-11 h-11 object-cover rounded-xl" loading="lazy">
            </template>
            <template x-if="!bookmark.favicon_key">
              <svg class="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
            </template>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="text-[15px] font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200"
                    x-text="bookmark.title"></h3>
                <a :href="bookmark.url" target="_blank" rel="noopener"
                   class="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 truncate block mt-1 transition-colors"
                   x-text="hostname(bookmark.url)"></a>
              </div>
              <div x-show="bookmark.sparkline_svg" x-html="bookmark.sparkline_svg"
                   class="shrink-0 rounded-xl bg-gray-50 dark:bg-white/[0.04] px-2 py-1 border border-gray-100 dark:border-white/5"></div>
            </div>
          </div>
        </div>

        <div x-show="bookmark.ai_status === 'done' || bookmark.ai_status === 'pending' || bookmark.ai_status === 'failed'"
             class="mt-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.03] p-3">
          <template x-if="bookmark.ai_status === 'done' && bookmark.ai_summary">
            <div class="flex items-start gap-2.5">
              <span class="mt-0.5 text-amber-500">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2l1.763 4.88L17 8.236l-4 3.285L14.528 17 10 13.86 5.472 17 7 11.52 3 8.236l5.237-1.356L10 2z"/></svg>
              </span>
              <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300" x-text="bookmark.ai_summary"></p>
            </div>
          </template>

          <template x-if="bookmark.ai_status === 'pending'">
            <div class="space-y-2">
              <div class="h-3 rounded-full skeleton"></div>
              <div class="h-3 rounded-full skeleton w-[90%]"></div>
              <div class="h-3 rounded-full skeleton w-[70%]"></div>
            </div>
          </template>

          <template x-if="bookmark.ai_status === 'failed'">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-gray-500 dark:text-gray-400">智能摘要生成失败，可以稍后重试。</p>
              <button @click="retryAiAnalysis(bookmark.id)"
                      class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 transition-colors">
                重试
              </button>
            </div>
          </template>
        </div>

        <p x-show="bookmark.description" class="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2 leading-relaxed" x-text="bookmark.description"></p>

        <div class="flex flex-wrap gap-1.5 mt-3" x-show="bookmark.tags && bookmark.tags.length">
          <template x-for="tag in bookmark.tags" :key="tag.id">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide cursor-pointer hover:scale-105 transition-transform"
                  :style="'background-color:' + tag.color + '15; color:' + tag.color + '; border: 1px solid ' + tag.color + '25'"
                  x-text="tag.name"
                  @click="filterByTag(tag.name)"></span>
          </template>
        </div>

        <div class="flex flex-wrap gap-1.5 mt-2" x-show="visibleSuggestedTags(bookmark).length">
          <template x-for="tagName in visibleSuggestedTags(bookmark)" :key="tagName">
            <button type="button"
                    @click="adoptSuggestedTag(bookmark, tagName)"
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide border border-dashed border-indigo-300/80 dark:border-indigo-400/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
              <span>+ </span><span class="ml-1" x-text="tagName"></span>
            </button>
          </template>
        </div>
      </div>

      <div class="px-5 py-3 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between border-t border-gray-100 dark:border-white/5">
        <span class="text-[11px] font-medium text-gray-400 dark:text-gray-600 tracking-wide"
              x-text="new Date(bookmark.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })"></span>
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button @click="createShortLink(bookmark.id)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all duration-200"
                  title="Generate short link">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          </button>
          <a :href="'/bookmarks/' + bookmark.id + '/edit'"
             class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all duration-200"
             title="Edit">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </a>
          <button @click="deleteBookmark(bookmark.id)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
                  title="Delete">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    </div>`;
}

export function loadingSkeleton(count = 6): string {
  return Array.from({ length: count }, (_, index) => `
    <div class="bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-slide-up stagger-${Math.min(index + 1, 8)}">
      <div class="p-5">
        <div class="flex items-start gap-3.5">
          <div class="w-11 h-11 rounded-xl skeleton"></div>
          <div class="flex-1 space-y-2.5">
            <div class="h-4 w-3/4 skeleton"></div>
            <div class="h-3 w-1/2 skeleton"></div>
          </div>
        </div>
        <div class="space-y-2 mt-4">
          <div class="h-3 rounded-full skeleton"></div>
          <div class="h-3 rounded-full skeleton w-[85%]"></div>
          <div class="h-3 rounded-full skeleton w-[70%]"></div>
        </div>
      </div>
      <div class="px-5 py-3 border-t border-gray-100 dark:border-white/5">
        <div class="h-3 w-20 skeleton"></div>
      </div>
    </div>`
  ).join('');
}

export function emptyState(title: string, description: string, actionHref: string, actionLabel: string): string {
  return `
    <div class="col-span-full flex flex-col items-center justify-center py-20 animate-fade-in">
      <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 flex items-center justify-center mb-5 animate-float">
        <svg class="w-9 h-9 text-indigo-300 dark:text-indigo-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${escapeHtml(title)}</h3>
      <p class="text-sm text-gray-400 dark:text-gray-500 mt-1.5 max-w-xs text-center">${escapeHtml(description)}</p>
      <a href="${escapeHtml(actionHref)}"
         class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300">
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
      <div class="fixed inset-0 bg-black/40 glass" @click="${id} = false"></div>
      <div class="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-7 animate-scale-bounce border border-gray-100 dark:border-gray-800">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">${escapeHtml(title)}</h3>
          <button @click="${id} = false" class="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        ${bodyContent}
      </div>
    </div>`;
}
