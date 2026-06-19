// lib/env.ts - 集中获取 Cloudflare bindings
// 用 cloudflare:workers 模块（workerd 内置）

/// <reference types="@cloudflare/workers-types" />
import { env } from "cloudflare:workers";

export type AppEnv = {
  // D1 数据库（用于 FTS5 搜索索引）
  DB: D1Database;
  // Cloudflare Images（用于优化 Notion 媒体）
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{
          response(): Response;
          contentType(): string;
        }>;
      };
    };
  };
  // R2 桶（用于缓存已转换的 Notion 媒体）
  ASSETS_BUCKET?: R2Bucket;
  // Notion integration token
  NOTION_TOKEN?: string;
  // Notion 文章 data source ID
  NOTION_DATA_SOURCE_ID?: string;
  // Notion 文章翻译 data source ID（可选）
  NOTION_POSTS_TRANSLATIONS_DATA_SOURCE_ID?: string;
  // 可选 Notion API base URL
  NOTION_API_BASE_URL?: string;
  // 可选 Notion 编辑跳转 URL
  NOTION_EDIT_BASE_URL?: string;
};

// 运行时一定有 DB，类型断言保证编译通过
export const workerEnv = env as unknown as AppEnv;
