# LinkMark 周末 TOP 5 实施方案

## Context（背景）

LinkMark 现有 Phase 1–6 骨架完整（D1+KV+R2+Cron + 玻璃拟态 + 10 套 keyframes）。用户希望在**不堆砌**的前提下让项目气质再跃升一档。经过菜单式评估后，确认：

- **优先批次**：TOP 5 周末组合（F5 AI 摘要、F1 Cmd+K、U1+U2 过渡动效、F9+U4 数据可视化、F8+U6 公开合集 + favicon 主色）
- **费用**：仅使用免费额度，跳过 Browser Rendering / Email Workers
- **目标观感**：从"精致小工具"→"边缘原生知识工作站"

五件事按**单位工时观感跃升**排序推进。每条都自带回滚点，互不阻塞。

---

## 任务 1 · Workers AI 智能摘要 + 自动打标签（F5，半天）

### 目标
新建书签 1–3 秒后，卡片上浮现 2–3 句 AI 摘要和 3 个推荐标签；不阻塞入库响应。

### 绑定配置
`wrangler.jsonc` 新增：
```jsonc
"ai": { "binding": "AI" }
```
免费额度：10k neurons/day（llama-3.1-8b-instruct 每次约 20–50 neurons，完全够用）。

### 迁移 `src/db/migrations/0002_ai.sql`
```sql
ALTER TABLE bookmarks ADD COLUMN ai_summary TEXT;
ALTER TABLE bookmarks ADD COLUMN ai_tags_suggested TEXT;  -- JSON array of tag names
ALTER TABLE bookmarks ADD COLUMN ai_status TEXT DEFAULT 'pending';  -- pending|done|failed|skipped
ALTER TABLE bookmarks ADD COLUMN ai_processed_at TEXT;
```

### 新文件 `src/utils/ai.ts`
导出两个函数：
- `extractPageText(url): Promise<string>` — `fetch(url)` 后用 `HTMLRewriter` 抽取 `<title>`、`<meta description>`、正文前 4000 字符
- `summarizeAndTag(text, existingTags[]): Promise<{summary, tags[]}>` — 调 `env.AI.run('@cf/meta/llama-3.1-8b-instruct', {messages: [...]}` 用 system prompt 限定"中文 2-3 句摘要；从现有标签中选最多 3 个最相关，允许新建"

### Handler 改动 `src/handlers/api/bookmarks.ts`
- `createBookmark` 成功后调用 `ctx.waitUntil(runAISummary(env, id))`
- 新接口 `POST /api/bookmarks/:id/reanalyze`（失败重试 / 手动触发）
- 列表接口返回字段加 `ai_summary`、`ai_status`

### UI 改动 `src/templates/components.ts`
`bookmarkCard()` 内：
- 标题下方预留 AI 摘要区：`ai_status === 'done'` 显示摘要 + ✨ 图标；`pending` 显示 shimmer 三行骨架；`failed` 显示"重试"按钮
- 推荐标签用虚线边框与用户已选标签视觉区分，点击可采纳

### 防护
- `extractPageText` 超时 8 秒
- 每次调用后写回 `ai_processed_at`；Cron 不重跑 `ai_status='done'` 的条目
- 缓存：相同 URL hash 结果存 KV `ai:{sha256(url)}`，TTL 30 天

### 验证
1. `wrangler d1 migrations apply DB --local` 应用迁移
2. `npm run dev` → 新建一条书签（例如 `https://developers.cloudflare.com/workers-ai/`）→ 3 秒后刷新看摘要出现
3. `wrangler tail` 确认 `ctx.waitUntil` 正常触发
4. 边界：故意传 404 URL，应 `ai_status='failed'` 且卡片有重试按钮

---

## 任务 2 · Cmd+K 命令面板（F1，2 小时）

### 目标
全局 ⌘K / Ctrl+K 呼出 Spotlight 面板，支持：跳转页面、模糊搜书签、新建书签、切换暗色。

### 文件
`src/templates/components.ts` 新增 `commandPalette()` 组件，在 `src/templates/layout.ts` 根部（`<body>` 末尾，toast 容器之前）挂载。

### 结构
```html
<div x-data="commandPalette()" x-show="open" @keydown.window.meta.k.prevent="toggle()"
     @keydown.window.ctrl.k.prevent="toggle()" @keydown.escape.window="open=false"
     class="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
     x-transition:enter="..." x-transition:leave="...">
  <div @click="open=false" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
  <div class="relative w-full max-w-xl glass rounded-2xl shadow-2xl animate-scale-bounce">
    <input x-model="q" @input.debounce.150ms="search()" placeholder="搜索书签 / 跳转 / 命令..."/>
    <ul>
      <template x-for="(item, i) in results">
        <li :class="{'bg-white/10': i === active}" @click="execute(item)">...</li>
      </template>
    </ul>
  </div>
</div>
```

### Alpine data
- `results` 前段是**静态命令**（"跳到 Dashboard"、"新建书签"、"切换暗色"、"跳到标签"、"跳到短链"、"跳到统计"），后段是 `fetch('/api/bookmarks?q=' + q).then(...)` 的动态结果
- 上下方向键移动 `active`，Enter 执行
- Enter 在空查询时默认"新建书签"

### 列表页提示
Navbar 右侧加一个 ⌘K 徽章（`<kbd>⌘K</kbd>`），强化发现性。

### 验证
- 任意页面按 ⌘K，面板淡入+spring 缩放
- 输入"clo" 应 debounce 150ms 后返回匹配结果
- ↑↓ + Enter 应跳转
- Esc / 点击 backdrop 应关闭
- 移动端隐藏（`hidden md:block`）

---

## 任务 3 · Reduced-motion + View Transitions API（U1 + U2，1 小时）

### U1 · 可访问性
`src/templates/animations.ts` 末尾追加：
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### U2 · View Transitions
`src/templates/layout.ts` 的 `<head>` 加：
```html
<meta name="view-transition" content="same-origin">
<style>
  @view-transition { navigation: auto; }
  ::view-transition-old(root), ::view-transition-new(root) {
    animation-duration: 0.25s;
  }
</style>
```

对关键元素打 name：
- 每张卡片 `style="view-transition-name: bookmark-${id}"`（注意同一页面中 name 必须唯一，所以详情页 ↔ 列表页卡片需 name 对应）
- Navbar logo `view-transition-name: app-logo`
- 主标题 `view-transition-name: page-title`

### 降级
Firefox 未开 flag 时，原生回退到"整体淡入淡出"，不破坏布局。

### 验证
- Chrome：从 `/` 点进 `/bookmarks/:id/edit`，应看到卡片平滑 morph 到表单卡片位置
- Safari：同样生效
- Firefox：不报错，普通跳转
- macOS 设置里打开"减弱动态效果"，所有动画应瞬时完成

---

## 任务 4 · 点击热力图 + Sparkline 迷你折线（F9 + U4，半天）

### Sparkline（U4）
无需新迁移。在 `src/db/queries.ts` 新增：
```ts
export async function getBookmarkSparkline(db, id): Promise<number[]> {
  // 过去 7 天每天点击数，左旧右新
  const rows = await db.prepare(`
    SELECT date, clicks FROM daily_stats
    WHERE bookmark_id = ? AND date >= date('now', '-6 days')
    ORDER BY date
  `).bind(id).all();
  // 补零到 7 位
  return fillMissingDays(rows, 7);
}
```

`src/templates/components.ts` 新 helper `sparkline(points: number[]): string`：
- 服务端直接生成 SVG `<polyline>`（约 30 行）
- 宽 60 × 高 20 像素，渐变色 stroke
- 零 JS 开销

列表接口批量返回 sparkline 数据（LEFT JOIN `daily_stats` 一次查完，避免 N+1）。

### 热力图（F9）
`src/handlers/pages/dashboard.ts` 底部新增"年度点击"模块：

查询：
```ts
SELECT date, SUM(clicks) as c FROM daily_stats
WHERE date >= date('now', '-364 days')
GROUP BY date
```

SVG 渲染：52 列 × 7 行的 `<rect>` 网格，颜色按 5 档分级（`#eef2ff → #312e81`），hover tooltip。

另加"国家分布"柱状图（F9 的一半）：
```ts
SELECT country, COUNT(*) as c FROM click_logs
WHERE clicked_at >= datetime('now', '-30 days')
GROUP BY country ORDER BY c DESC LIMIT 10
```

水平柱状图 + 国旗 emoji（用 Unicode `🇨🇳` 风格，无需字体），省去地图依赖。

### 验证
- 新建几条书签并手动点击短链几次，等待 `aggregate-stats` cron 或本地手动跑一次
- Dashboard 底部应出现 52×7 热力格子 + 国家柱状图
- 每张卡片右上角 7 天 sparkline 显示合理曲线

---

## 任务 5 · 公开只读合集页 + Favicon 主色竖条（F8 + U6，1 天）

### 迁移 `src/db/migrations/0003_collections.sql`
```sql
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE collection_bookmarks (
  collection_id TEXT NOT NULL,
  bookmark_id INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, bookmark_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
);

ALTER TABLE bookmarks ADD COLUMN accent_color TEXT;  -- "#6366f1" or "hsl(210 80% 50%)"
```

### Handler 新文件 `src/handlers/api/collections.ts`
- `GET /api/collections` · `POST /api/collections`
- `PUT /api/collections/:id` · `DELETE /api/collections/:id`
- `POST /api/collections/:id/bookmarks` · `DELETE /api/collections/:id/bookmarks/:bookmarkId`

### Handler 新文件 `src/handlers/pages/collection.ts`
`GET /c/:slug` 公开路由（**需加入 auth middleware 白名单**）：
- 查 `collections WHERE slug=? AND is_public=1`，不存在 404
- 用 Cache API 缓存整页 1 小时：`caches.default.put(request, response.clone())`
- Dashboard 内嵌"创建合集"/"管理合集"入口

### U6 · Favicon 主色提取
**Worker 内没有 `canvas`/`Image` API**，采用双策略：

1. **优先**：拉取 HTML → HTMLRewriter 抽取 `<meta name="theme-color">`
2. **回退**：对域名做 sha256 → 取前 6 字节做 HSL（hue 固定范围，保证与品牌色协调）：
```ts
function domainToAccent(domain: string): string {
  const hash = sha256(domain);
  const h = (parseInt(hash.slice(0, 4), 16) % 360);
  return `hsl(${h} 65% 55%)`;
}
```

在 favicon 异步抓取流程（现有 `ctx.waitUntil`）同一处扩展：尝试提取 theme-color，失败则 hash-fallback，写回 `bookmarks.accent_color`。

### 卡片视觉
`bookmarkCard` 左侧加 3px 竖条 `<div style="background: ${accent_color}"></div>`，暗色模式下保持 60% 不透明度避免刺眼。

### 验证
- 新建书签 3 秒内 accent_color 写入
- 检查 github.com 书签应是黑/白（theme-color），其他域名应为该域一致的颜色
- 创建合集 → 选书签 → 设为 public → 访问 `/c/my-reads` 应无 auth 可见
- 浏览器 disable cookie → 仍可访问公开页

---

## 跨任务的注意事项

- **执行顺序**：严格按 1 → 2 → 3 → 4 → 5 顺序推进。每做完一条 commit 一次。
- **类型生成**：`wrangler.jsonc` 每次加绑定后跑 `npm run cf-typegen` 更新 `worker-configuration.d.ts`
- **迁移应用**：本地 `wrangler d1 migrations apply DB --local`，远端 `--remote`
- **Alpine x-cloak**：新组件初次渲染闪烁，记得加 `x-cloak` 类 + CSS `[x-cloak]{display:none}`
- **Cache 清理**：F8 合集改动时用 `caches.default.delete(cacheKey)`，否则公开页更新不及时

---

## 全局改动清单

| 文件 | 任务 |
|---|---|
| `wrangler.jsonc` | T1（AI 绑定） |
| `src/db/migrations/0002_ai.sql` | T1（新） |
| `src/db/migrations/0003_collections.sql` | T5（新） |
| `src/db/queries.ts` | T1 / T4 / T5 |
| `src/utils/ai.ts` | T1（新） |
| `src/utils/color.ts` | T5（新，域名哈希取色） |
| `src/handlers/api/bookmarks.ts` | T1 |
| `src/handlers/api/collections.ts` | T5（新） |
| `src/handlers/pages/collection.ts` | T5（新） |
| `src/handlers/pages/dashboard.ts` | T4 |
| `src/templates/layout.ts` | T2 / T3 |
| `src/templates/components.ts` | T2 / T4 / T5 |
| `src/templates/animations.ts` | T3 |
| `src/router.ts` | T2 / T5（新增路由） |
| `src/middleware/auth.ts` | T5（`/c/*` 加入白名单） |
| `test/index.spec.ts` | 每任务末尾补测试 |

---

## 端到端验证

做完全部 5 件事后：

```bash
npx tsc --noEmit                             # 类型检查
npm run cf-typegen                           # 绑定类型刷新
wrangler d1 migrations apply DB --local      # 应用两个新迁移
npm test                                     # vitest
npm run dev                                  # 浏览器手动冒烟
```

手动冒烟清单：
- [ ] 新建一条书签 → 3 秒内 AI 摘要 + 主色竖条出现
- [ ] ⌘K 打开面板，输入关键词应有命令 + 书签结果
- [ ] 详情/编辑页跳转应有 View Transition morph
- [ ] Dashboard 底部有热力图 + 国家柱状图，卡片右上角有 sparkline
- [ ] 创建公开合集 → 隐身窗口访问 `/c/slug` 成功
- [ ] macOS 减弱动效 → 所有动画瞬时完成
- [ ] 暗色模式下所有新增元素视觉协调

完成后预期观感：**"设计讲究的个人书签 Worker" → "边缘原生知识工作站"**。
