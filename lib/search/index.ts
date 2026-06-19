// lib/search/index.ts
// D1 (SQLite) FTS5 全文搜索的封装：upsert / delete / query。
//
// 文档唯一键：(type, locale, page_id)
// - type:   "article"
// - locale: "zh" | "en"
// - pageId: Notion page id
//
// 搜索流程（在 searchItems() 内）：
// 1) 把 query 按空格拆 tokens，用 OR 串成 FTS5 query，跑 MATCH + bm25
//    例："AI 协议" → '"AI" OR "协议"'，对 CJK 友好（用户输"协议"能命中）
// 2) 如果 0 命中，降级到 LIKE %q% 扫 title/description/body
//    兜底：兜住 unicode61 拆词不命中的边缘情况
//
// metadata 一并存展示字段（cover_image/date/tags），query 完直接渲染，不回查 Notion

import { workerEnv } from "../env.ts";
import type { Locale } from "../i18n/config.ts";

export type SearchableType = "article";

export type SearchableItem = {
  locale: Locale;
  type: SearchableType;
  pageId: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  coverImage: string | null;
  /** 文章 tags，显示在搜索结果 */
  tags: string[];
  /** 用来编入 FTS5 body 字段的纯文本（title + description + blocks 拼起来） */
  searchableText: string;
};

export type SearchHit = {
  id: string;
  score: number;
  type: SearchableType;
  pageId: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  coverImage: string | null;
  tags: string[];
};

type SearchIndexRow = {
  type: string;
  locale: string;
  page_id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string;
  date: string;
  tags: string;
  rank?: number;
};

function getDb(): D1Database {
  const env = workerEnv;
  if (!env.DB) throw new Error("DB binding not available");
  return env.DB;
}

function buildId(item: Pick<SearchableItem, "locale" | "type" | "pageId">) {
  return `${item.locale}:${item.type}:${item.pageId}`;
}

/**
 * 把用户 query 拆成 FTS5 MATCH 字符串。
 * - 单 token：直接包成 "token"
 * - 多 token：OR 起来，任一命中即可
 * - 内部引号 escape（FTS5 phrase 用双引号）
 * 这样中文 "AI 协议" 拆成 ['AI', '协议']，任一命中即返回，
 * 比默认 AND 模式更符合用户预期（用户不会期望"AI 协议"必须连写）
 */
function buildFtsQuery(query: string): string {
  const tokens = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/"/g, '""'));
  if (tokens.length === 0) return "";
  if (tokens.length === 1) return `"${tokens[0]}"`;
  return tokens.map((t) => `"${t}"`).join(" OR ");
}

function rowToHit(row: SearchIndexRow, score: number): SearchHit {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags);
    if (Array.isArray(parsed)) {
      tags = parsed.filter((s) => typeof s === "string");
    }
  } catch {
    tags = [];
  }
  return {
    id: `${row.locale}:${row.type}:${row.page_id}`,
    score,
    type: row.type as SearchableType,
    pageId: row.page_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    date: row.date,
    coverImage: row.cover_image || null,
    tags,
  };
}

/** 写入或更新一条索引 */
export async function indexItem(item: SearchableItem): Promise<void> {
  const db = getDb();
  await db
    .prepare(
      `DELETE FROM search_index WHERE type = ? AND locale = ? AND page_id = ?`
    )
    .bind(item.type, item.locale, item.pageId)
    .run();
  await db
    .prepare(
      `INSERT INTO search_index
         (type, locale, page_id, slug, title, description, body, tags, cover_image, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      item.type,
      item.locale,
      item.pageId,
      item.slug,
      item.title,
      item.description,
      item.searchableText,
      JSON.stringify(item.tags ?? []),
      item.coverImage ?? "",
      item.date
    )
    .run();
}

/** 批量 upsert（D1 batch API，事务内） */
export async function indexItemsBatch(
  items: SearchableItem[]
): Promise<void> {
  if (items.length === 0) return;
  const db = getDb();
  // D1 单次 batch 上限 10000，我们保守 100
  const BATCH = 100;
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    const stmts: D1PreparedStatement[] = [];
    for (const item of chunk) {
      stmts.push(
        db
          .prepare(
            `DELETE FROM search_index WHERE type = ? AND locale = ? AND page_id = ?`
          )
          .bind(item.type, item.locale, item.pageId)
      );
      stmts.push(
        db
          .prepare(
            `INSERT INTO search_index
               (type, locale, page_id, slug, title, description, body, tags, cover_image, date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            item.type,
            item.locale,
            item.pageId,
            item.slug,
            item.title,
            item.description,
            item.searchableText,
            JSON.stringify(item.tags ?? []),
            item.coverImage ?? "",
            item.date
          )
      );
    }
    await db.batch(stmts);
  }
}

/** 按 (type, locale, page_id) 删除 */
export async function deleteIndexedItem(
  locale: Locale,
  type: SearchableType,
  pageId: string
): Promise<void> {
  const db = getDb();
  await db
    .prepare(
      `DELETE FROM search_index WHERE type = ? AND locale = ? AND page_id = ?`
    )
    .bind(type, locale, pageId)
    .run();
}

/** 清空某个 locale 的所有索引（供重建用） */
export async function clearLocaleIndex(locale: Locale): Promise<number> {
  const db = getDb();
  const result = await db
    .prepare(`DELETE FROM search_index WHERE locale = ?`)
    .bind(locale)
    .run();
  return result.meta?.changes ?? 0;
}

/**
 * 全文搜索：FTS5 MATCH (OR 拆词) + bm25 排序，0 命中时 LIKE 兜底。
 * 必传 locale，自动在 WHERE 上 filter（避免 zh query 命中 en 文档）
 */
export async function searchItems(
  query: string,
  opts: { locale: Locale; topK?: number; type?: SearchableType }
): Promise<SearchHit[]> {
  const { locale, topK = 20, type } = opts;
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = getDb();
  const ftsQuery = buildFtsQuery(trimmed);
  if (!ftsQuery) return [];

  // 1) FTS5 MATCH
  const whereClauses = ["search_index MATCH ?", "locale = ?"];
  const binds: (string | number)[] = [ftsQuery, locale];
  if (type) {
    whereClauses.push("type = ?");
    binds.push(type);
  }
  binds.push(topK);

  const ftsResult = await db
    .prepare(
      `SELECT
         type, locale, page_id, slug, title, description,
         cover_image, date, tags,
         bm25(search_index) AS rank
       FROM search_index
       WHERE ${whereClauses.join(" AND ")}
       ORDER BY rank
       LIMIT ?`
    )
    .bind(...binds)
    .all<SearchIndexRow>();

  const ftsRows = ftsResult.results ?? [];
  if (ftsRows.length > 0) {
    return ftsRows.map((row) => {
      // bm25 越小越相关，score 0-1 之间
      const score = row.rank != null ? 1 / (1 + Math.max(0, row.rank)) : 0.5;
      return rowToHit(row, score);
    });
  }

  // 2) LIKE 兜底：FTS5 0 命中时，扫 title/description/body
  //    对超长 query 用首个 token（避免 %长字符串% 太慢）
  const likeNeedle = trimmed.length > 64 ? trimmed.slice(0, 64) : trimmed;
  const likeWhere = ["locale = ?", "(title LIKE ? OR description LIKE ? OR body LIKE ?)"];
  const likeBinds: (string | number)[] = [locale];
  if (type) {
    likeWhere.push("type = ?");
    likeBinds.push(type);
  }
  const likePattern = `%${likeNeedle}%`;
  likeBinds.push(likePattern, likePattern, likePattern, topK);

  const likeResult = await db
    .prepare(
      `SELECT
         type, locale, page_id, slug, title, description,
         cover_image, date, tags, 0 AS rank
       FROM search_index
       WHERE ${likeWhere.join(" AND ")}
       LIMIT ?`
    )
    .bind(...likeBinds)
    .all<SearchIndexRow>();

  const likeRows = likeResult.results ?? [];
  return likeRows.map((row) => rowToHit(row, 0.3));
}
