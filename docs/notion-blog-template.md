# Notion 集成（vinext-notion）

本文档说明 vinext-notion 的 Notion 数据源结构。

## 1. 准备

1. 在 [Notion Integrations](https://www.notion.so/my-integrations) 创建一个 Internal Integration
2. 复制 Token（`secret_xxx...`），填到 `.dev.vars` 的 `NOTION_TOKEN`
3. 在 Notion 中建一个 database 作为文章 data source，把 database 与 integration **共享**（Add connections）
4. 打开 database 的 URL，复制 data source id（打开 `https://api.notion.com/v1/data_sources/{DATA_SOURCE_ID}` 返回 JSON 即说明正确）

## 2. 文章 data source 字段约定

| 字段名           | 类型         | 必填 | 说明                                              |
| ---------------- | ------------ | ---- | ------------------------------------------------- |
| `Title`          | title        | ✅   | 文章标题                                          |
| `Slug`           | rich_text    | ✅   | URL 片段，小写字母+连字符，例如 `intro-to-vinext` |
| `Description`    | rich_text    |      | 列表页摘要                                        |
| `Date`           | date         | ✅   | 发布日期（用于排序）                              |
| `Author`         | rich_text    |      | 作者名                                            |
| `Tags`           | multi_select |      | 标签                                              |
| `Cover`          | files        |      | 封面图（支持 external/file）                      |
| `Published`      | checkbox     | ✅   | 发布开关                                          |
| `Status`         | status/select |    | 备选：填 `Published` 表示发布                     |

> **提示**：如果你在主库用 `Cover` property + 外部图床（Unsplash / CDN），就设置成 external，
> 直接拿 URL；如果是 Notion 上传的图，系统会通过 `/api/notion/media/...` 代理并经 Cloudflare Images 转码缓存。

## 3. 翻译库（可选）

如果想做中英双语，额外建一个 Notion database 作为"翻译库"，data source id 填到 `NOTION_POSTS_TRANSLATIONS_DATA_SOURCE_ID`。

| 字段名        | 类型          | 必填 | 说明                                          |
| ------------- | ------------- | ---- | --------------------------------------------- |
| `标题`        | title         | ✅   | 翻译后标题                                    |
| `语言`        | select        | ✅   | `zh` / `zh-CN` / `en` / `en-US` 任一即可       |
| `Slug`        | rich_text     | ✅   | 翻译后 slug（小写）                           |
| `Description` | rich_text     |      | 翻译后描述                                    |
| `Date`        | date          | ✅   | 翻译发布日期                                  |
| `Tags`        | multi_select  |      | 翻译后标签                                    |
| `Cover`       | files         |      | 翻译后封面（缺省时回退到原文封面）            |
| `Published`   | checkbox      | ✅   | 翻译后发布开关                                |
| `原文`        | relation      | ✅   | 关联到主库中对应文章（提供 pageId 回查能力）  |

> URL 路由约定：英文文章走 `/en/blog/<slug>`，slug 既可以由翻译库自己的 `Slug` 决定，也可以由中文原文 slug 决定（按 `原文` 关系自动回查）。

## 4. 重新生成索引

Notion 内容更新后，最简单的方式是重跑一次全量回填：

```bash
# 跑本地脚本（待实现 admin cron）—— 也可以用 Notion webhook 触发增量同步
npx wrangler d1 execute vinext-notion --local --file=migrations/0001_search_index.sql
```

> 实际生产中，**建议**接入 Notion webhook（page.archived / page.contentUpdated），
> 调 `/api/admin/reindex` 之类的接口单条更新。vinext-notion 当前版本只提供了 `lib/search/backfill.ts`，
> 你可以在 Cloudflare Workers 上加一个 cron / 外部触发来跑它。

## 5. 本地预览

```bash
cp .env.example .dev.vars
# 填入 NOTION_TOKEN / NOTION_DATA_SOURCE_ID

npm install
npm run dev
```

打开 [http://localhost:3001](http://localhost:3001)
