# Vinext Notion

> 一个**只保留文章模块**的极简模板项目：把 Notion 当 CMS，文章数据走 Cloudflare D1 + R2 全文索引，部署到 Cloudflare Workers。

它从 [moviebluebook](https://github.com/digwis/moviebluebook) 这个大而全的「电影 + 文章 + VIP 下载 + 管理后台」系统里被抽取出来，**剥离了**所有非文章相关的功能（电影模块、用户认证、邮箱订阅、Turnstile、Cloudflare Images 鉴权下载、admin 面板），只留下：

- 🏠 首页（含文章推荐）
- 📖 文章列表 / 文章详情（中文为主，可选英文翻译）
- ⌨️ 全文搜索（`Cmd/Ctrl + K`，D1 FTS5 + LIKE 兜底）
- 🌗 明暗主题（next-themes）
- 🌍 中英双语（zh 短码为默认，en 加 `/en` 前缀）
- 🖼️ Cloudflare Images 媒体代理 + R2 缓存
- 🗺️ sitemap / robots / SEO 元数据

> 技术栈：Next.js 16 App Router + vinext + Notion SDK + Tailwind v4 + shadcn/ui + Cloudflare D1 (FTS5) + Cloudflare Images + R2

## 快速开始

```bash
# 1) 克隆
git clone https://github.com/digwis/vinext-notion.git
cd vinext-notion

# 2) 安装依赖
npm install

# 3) 准备环境变量
cp .env.example .dev.vars
# 编辑 .dev.vars 填入 Notion Token 与文章 data source id

# 4) 初始化 D1 + 跑 FTS5 schema
npx wrangler d1 create vinext-notion   # 把返回的 database_id 填到 wrangler.jsonc
npx wrangler d1 migrations apply vinext-notion --local

# 5) 启动开发服务器
npm run dev
# → http://localhost:3001
```

## 部署

```bash
# 首次：建 D1 库（远程）+ 应用迁移 + 部署 Worker
npx wrangler d1 create vinext-notion
# 把 wrangler.jsonc 里 d1_databases[0].database_id 改成上一步得到的 id

npm run deploy:remote
```

## Notion 数据源约定

参见 [docs/notion-blog-template.md](docs/notion-blog-template.md)。

简言之：

| 字段        | 类型        | 必填 |
| ----------- | ----------- | ---- |
| `Title`     | title       | ✅   |
| `Slug`      | rich_text   | ✅   |
| `Date`      | date        | ✅   |
| `Published` | checkbox    | ✅   |
| `Cover`     | files       |      |
| `Tags`      | multi_select |     |
| `Description` | rich_text |      |
| `Author`    | rich_text   |      |

## 搜索

- 数据源：Notion published 文章
- 写入：FTS5（`search_index_fts`） + LIKE 兜底
- 边缘缓存：`/api/search` 走 5 分钟 CDN 缓存，stale-while-revalidate 10 分钟
- 重建索引：调用 `lib/search/backfill.ts` 的 `backfillSearch(locale)`

## 与原项目 moviebluebook 的差异

| 模块                | moviebluebook | vinext-notion |
| ------------------- | ------------- | ------------- |
| 首页 + 文章列表     | ✅            | ✅            |
| 文章详情 + Notion 渲染 | ✅         | ✅            |
| 全文搜索            | ✅            | ✅            |
| 中英双语            | ✅            | ✅            |
| 电影模块            | ✅            | ❌            |
| 用户 / 认证 / VIP   | ✅            | ❌            |
| 邮箱订阅 / Turnstile | ✅           | ❌            |
| 管理员后台          | ✅            | ❌            |

## 目录结构

```
vinext-notion/
├── app/                        # Next.js App Router
│   ├── [locale]/
│   │   ├── page.tsx            # 首页（文章推荐）
│   │   ├── blog/
│   │   │   ├── page.tsx        # 文章列表
│   │   │   └── [slug]/page.tsx # 文章详情
│   │   └── layout.tsx          # locale scope layout
│   ├── api/
│   │   ├── search/route.ts            # D1 FTS5 搜索 API
│   │   └── notion/media/[...ref]/     # Notion 媒体代理 + CF Images 转码
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                # 根 → /zh 重定向
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── NotionBlockRenderer.tsx # Notion 块渲染
│   ├── NotionRichText.tsx
│   ├── PublicCoverImage.tsx    # srcset 响应式封面图
│   ├── PublicSiteHeader.tsx
│   ├── PublicSiteFooter.tsx
│   ├── SearchModal.tsx
│   ├── SearchTrigger.tsx       # Cmd/Ctrl + K
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   ├── public/
│   │   ├── PublicSiteHeaderChrome.tsx
│   │   └── PublicLocaleSwitcher.tsx
│   └── ui/                     # shadcn/ui 基础组件
├── lib/
│   ├── env.ts                  # 读 Cloudflare bindings
│   ├── utils.ts                # cn() 等
│   ├── cache-keys.ts           # 边缘缓存键生成
│   ├── public-image.ts         # 响应式 srcSet 拼接
│   ├── public-navigation.ts    # 导航 / footer
│   ├── public-cache-invalidate.ts
│   ├── homepage-content.ts     # 首页数据聚合
│   ├── locale.ts               # cookie 解析
│   ├── locale-actions.ts       # server action: 写 cookie
│   ├── i18n/
│   │   ├── config.ts           # locales, BCP47
│   │   ├── messages.ts         # 字典（zh source of truth, en 必须同构）
│   │   ├── get-messages.ts
│   │   ├── react-i18n.tsx      # I18nProvider
│   │   └── swap-locale.ts      # URL 切语言
│   ├── notion/
│   │   ├── client.ts           # Notion SDK 封装
│   │   ├── config.ts           # 读 env
│   │   ├── posts.ts            # list / get by slug
│   │   ├── post-translations.ts# 翻译库
│   │   ├── blocks.ts           # 深 fetch blocks
│   │   ├── media.ts            # 媒体 URL 解析
│   │   ├── mappers.ts          # page → list item
│   │   └── types.ts
│   └── search/
│       ├── index.ts            # D1 FTS5 索引 / 搜索
│       ├── text.ts             # blocks → 纯文本
│       ├── sync.ts             # 收集 SearchableItem
│       └── backfill.ts         # 重建索引工具
├── migrations/
│   └── 0001_search_index.sql   # FTS5 搜索 schema
├── worker/
│   └── index.ts                # Cloudflare Workers 入口
├── docs/
│   └── notion-blog-template.md # Notion 数据源约定
├── components.json             # shadcn/ui 配置
├── env.d.ts                    # cloudflare:workers 全局类型
├── next.config.ts
├── vite.config.ts
├── wrangler.jsonc              # D1 / R2 / IMAGES 绑定
└── tsconfig.json
```

## License

MIT
