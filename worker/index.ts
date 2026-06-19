// Cloudflare Workers 入口：把 vinext 生成的 fetch handler 暴露给 workerd
// vinext 提供 default fetch handler；这里只补一个缺省 404 兜底

import { default as vinextHandler } from "vinext/runtime/handler";
// @ts-ignore - vinext will emit this at build time
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import _vinextConfig from "../vinext.config";

export interface Env {
  DB: D1Database;
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
  ASSETS_BUCKET?: R2Bucket;
  NOTION_TOKEN?: string;
  NOTION_DATA_SOURCE_ID?: string;
  NOTION_POSTS_TRANSLATIONS_DATA_SOURCE_ID?: string;
  NOTION_API_BASE_URL?: string;
  NOTION_EDIT_BASE_URL?: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // 把 env 透传给 vinext（vinext 内部会通过 cloudflare:workers 拿）
    // 见 lib/env.ts 的 getWorkerEnv
    return vinextHandler(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
