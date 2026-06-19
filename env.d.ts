/// <reference types="@cloudflare/workers-types" />

interface VinextEnv extends Env {
  // D1 binding（用于 FTS5 搜索索引）
  DB: D1Database;
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
  // Cloudflare Images binding（用于优化 Notion 媒体）
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
}

declare module "cloudflare:workers" {
  export const env: VinextEnv;
  export const ctx: ExecutionContext;
}

export {};
