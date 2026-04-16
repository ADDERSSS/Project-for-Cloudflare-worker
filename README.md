# LinkMark

LinkMark 是一个运行在 **Cloudflare Workers** 上的个人书签管理项目。它把 D1、KV、R2、Cron Triggers 和 Workers AI 组合在一个 Worker 里，提供从收藏、整理、分析到公开分享的一整套书签工作流。

## 当前能力

- 书签管理：新增、编辑、删除、搜索、归档、标签筛选
- 异步富化：创建书签后自动抓取 favicon、生成主色竖条
- AI 摘要：后台异步生成中文摘要与推荐标签，失败后支持手动重试
- 命令面板：`⌘K / Ctrl+K` 快速跳转页面、搜索书签、切换暗色模式
- 数据分析：统计卡片、年度点击热力图、国家来源柱状图、书签 7 天 sparkline
- 短链系统：KV 热路径跳转、点击日志、每日聚合
- 公开合集：将一组书签整理成公开只读页面 `/c/:slug`
- 体验细节：暗色模式、Reduced Motion、View Transitions、玻璃拟态 UI

## 技术栈

| 层 | 技术 |
|---|---|
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 |
| Cache | Cloudflare KV |
| Storage | Cloudflare R2 |
| AI | Workers AI |
| Scheduling | Cron Triggers |
| Frontend | SSR HTML + Tailwind CDN + Alpine.js |
| Language | TypeScript |
| Testing | Vitest + `@cloudflare/vitest-pool-workers` |

## 项目结构

```text
src/
  index.ts                        # Worker 入口，挂载页面/API/cron
  router.ts                       # 轻量级路由
  middleware/auth.ts              # Bearer token + cookie 鉴权，公开路由白名单
  handlers/
    api/
      bookmarks.ts                # 书签 CRUD、AI 重分析、异步富化
      collections.ts              # 合集管理 API
      shortlinks.ts               # 短链管理 API
      stats.ts                    # 概览统计与趋势 API
      tags.ts                     # 标签管理 API
    pages/
      dashboard.ts                # 主控制台，含分析区和合集管理
      bookmark-form.ts            # 新建/编辑书签页面
      tags-page.ts                # 标签管理页面
      shortlinks-page.ts          # 短链页面
      collection.ts               # 公开合集页
      login.ts                    # 登录页
    redirect.ts                   # /s/:code 跳转与点击记录
  templates/
    layout.ts                     # 全局布局、导航、命令面板、Toast
    components.ts                 # 书签卡片、图表 SVG、模态框等组件
    animations.ts                 # 自定义动画、Reduced Motion
    error-pages.ts                # 404 / 500 页面
  db/
    queries.ts                    # D1 查询层
    migrations/
      0001_initial.sql            # 基础表结构
      0002_ai.sql                 # AI 摘要字段
      0003_collections.sql        # 合集与 accent color
  cron/
    cleanup.ts                    # 过期短链清理
    aggregate-stats.ts            # 每日点击聚合
  utils/
    ai.ts                         # 页面抽文、AI 调用、AI KV 缓存
    color.ts                      # 域名哈希取色
    html.ts / response.ts         # 基础工具
    id.ts / validators.ts         # ID 和校验工具
test/
  index.spec.ts                   # Worker 集成测试
```

## 数据与绑定

### D1 表

- `bookmarks`
- `tags`
- `bookmark_tags`
- `short_links`
- `click_logs`
- `daily_stats`
- `collections`
- `collection_bookmarks`

### Cloudflare 绑定

`wrangler.jsonc` 中当前使用这些绑定：

- `DB`：D1
- `CACHE`：KV
- `ASSETS`：R2
- `AI`：Workers AI

短链和公开合集缓存失效会基于当前请求域名动态计算，不再依赖固定的 `BASE_URL`。

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 生成绑定类型

```bash
npm run cf-typegen
```

### 3. 初始化本地数据库

```bash
npx wrangler d1 migrations apply DB --local
```

### 4. 启动本地开发

```bash
npm run dev
```

默认地址为 [http://localhost:8787](http://localhost:8787)。

本地登录需要在 `.dev.vars` 里提供：

```dotenv
AUTH_TOKEN=your-secret-token
```

## 验证命令

```bash
npx tsc --noEmit
npm test
```

## 线上部署到 Cloudflare

### 前提

- 已登录 Wrangler：`npx wrangler whoami`
- Cloudflare 账号已启用 Workers AI
- `wrangler.jsonc` 中已填入真实的 D1 / KV / R2 绑定信息
- 已设置远端密钥：`npx wrangler secret put AUTH_TOKEN`

### 首次或历史库升级时的推荐顺序

```bash
npm run cf-typegen
```

远端 D1 目前要特别注意迁移跟踪表问题。部署前先执行：

```bash
npx wrangler d1 execute DB --remote --command "INSERT INTO d1_migrations (name) VALUES ('0001_initial.sql')"
npx wrangler d1 migrations apply DB --remote
```

如果第一条命令提示这条记录已经存在，可以忽略这一步，再继续执行 migrations apply。

然后再部署：

```bash
npm run deploy
```

部署成功后，Worker 会在 Cloudflare 返回的 `workers.dev` 域名上可访问。

## 公开访问说明

- 登录页：`/login`
- 短链跳转：`/s/:code`
- 公开合集：`/c/:slug`

其中 `/c/:slug` 为无鉴权只读页面，并使用 Cache API 做整页缓存。

## API 概览

### 鉴权公开

- `GET /login`
- `POST /api/login`
- `GET /s/:code`
- `GET /c/:slug`

### 需要鉴权

- `GET/POST /api/bookmarks`
- `GET/PUT/DELETE /api/bookmarks/:id`
- `POST /api/bookmarks/:id/archive`
- `POST /api/bookmarks/:id/reanalyze`
- `GET/POST /api/tags`
- `PUT/DELETE /api/tags/:id`
- `GET /api/shortlinks`
- `POST /api/bookmarks/:bookmarkId/shortlink`
- `DELETE /api/shortlinks/:code`
- `GET /api/stats/overview`
- `GET /api/stats/clicks`
- `GET/POST /api/collections`
- `PUT/DELETE /api/collections/:id`
- `POST /api/collections/:id/bookmarks`
- `DELETE /api/collections/:id/bookmarks/:bookmarkId`

## 项目特点

### AI 摘要工作流

1. 书签写入 D1
2. `ctx.waitUntil()` 异步抓取页面文本
3. Workers AI 生成摘要与推荐标签
4. 结果回写 D1，并用 KV 对相同 URL 做 30 天缓存

### 公开合集缓存

- `/c/:slug` 直接使用 `caches.default`
- 合集变更或合集内书签变更时主动清理缓存

### 点击分析

- 短链访问先读 KV
- 命中时直接跳转并异步记日志
- Cron 每天把 `click_logs` 聚合进 `daily_stats`

## 文档说明

- [AGENTS.md](./AGENTS.md)：Codex 协作说明
- [CLAUDE.md](./CLAUDE.md)：Claude Code 协作说明
- [PLAN.md](./PLAN.md)：本轮升级方案记录

## License

MIT
