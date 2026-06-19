// /api/notion/media/[...ref]
//
// 反向代理 Notion 的私有 file URL 走我们的域名，
// 顺便用 Cloudflare Images 做按需转换（avif / webp，多宽度），
// 转换后的产物写回 R2，二次访问直接命中 R2。
//
// URL 形态：
//   /api/notion/media/page/<pageId>/cover?v=<last_edited_time>
//   /api/notion/media/page/<pageId>/property/<name>?v=...
//   /api/notion/media/block/<blockId>?v=...
//
// query 参数：
//   - v=...       缓存破坏（与 last_edited_time 联动）
//   - w=<int>     目标宽度
//   - q=<int>     目标质量 40-100
//   - fmt=webp|avif|auto 转换格式（auto 看 Accept 头）

import { NextResponse, type NextRequest } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import {
  isNotionHostedFile,
  isPublicImageUrlAllowed,
  normalizeNotionFileSource,
} from "@/lib/notion/media";
import { workerEnv } from "@/lib/env";
import {
  notionMediaR2KeyForUrl,
  publicMediaCacheKeyForUrl,
  publicMediaVariantForAccept,
  type PublicMediaVariant,
} from "@/lib/cache-keys";
import { hasNotionConfig } from "@/lib/notion/config";

export const runtime = "edge";

type Params = Promise<{ ref?: string[] }>;

const PUBLIC_CACHE_CONTROL = "public, s-maxage=86400, max-age=86400";
const ERROR_CACHE_CONTROL = "public, s-maxage=60, max-age=60";

function errorResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": ERROR_CACHE_CONTROL,
    },
  });
}

function withCacheHeaders(response: Response, variant: PublicMediaVariant) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  headers.set("Vary", "Accept");
  headers.set("x-vinext-media-variant", variant);
  return new Response(response.body, { status: response.status, headers });
}

async function resolveSourceUrl(
  notion: NotionClient,
  ref: string[]
): Promise<string | null> {
  if (ref.length < 2) return null;
  if (ref[0] === "page" && (ref[2] === "cover" || ref[2] === "property")) {
    const pageId = ref[1];
    const page = (await notion.pages.retrieve({ page_id: pageId })) as {
      cover?: unknown;
      properties?: Record<string, unknown>;
    };
    if (ref[2] === "cover") {
      return normalizeNotionFileSource(page.cover)?.url ?? null;
    }
    const name = ref[3];
    if (!name) return null;
    const propertyFile = (page.properties?.[name] as { files?: unknown[] })
      ?.files?.[0];
    return normalizeNotionFileSource(propertyFile)?.url ?? null;
  }
  if (ref[0] === "block") {
    const blockId = ref[1];
    const block = (await notion.blocks.retrieve({ block_id: blockId })) as {
      type?: string;
    };
    if (!block.type) return null;
    const blockAny = block as { [key: string]: unknown };
    const typed = blockAny[block.type] as
      | { external?: { url?: string }; file?: { url?: string } }
      | undefined;
    if (!typed) return null;
    return typed.external?.url ?? typed.file?.url ?? null;
  }
  return null;
}

async function fetchNotionSource(
  url: string,
  notion: NotionClient
): Promise<Response | null> {
  // 1) 如果是 Notion 私有 file URL（type === "file"），走 Notion API
  // 2) 如果是 public external URL（type === "external"），直接 fetch
  // 注意：判断要走 url pattern + 一段缓存，否则会无谓打 Notion
  if (isPublicImageUrlAllowed(url)) {
    return fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
  }
  // Notion hosted files 需要 Bearer token
  const token = workerEnv.NOTION_TOKEN;
  if (!token) return null;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cf: { cacheTtl: 86400, cacheEverything: true },
  });
  return response;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  if (!(await hasNotionConfig())) {
    return errorResponse("notion not configured", 503);
  }
  const { ref = [] } = await params;
  if (ref.length < 2) return errorResponse("not found", 404);

  const env = workerEnv;
  const notion = new NotionClient({
    auth: env.NOTION_TOKEN,
    baseUrl: env.NOTION_API_BASE_URL,
    notionVersion: "2026-03-11",
  });

  const sourceUrl = await resolveSourceUrl(notion, ref);
  if (!sourceUrl) return errorResponse("source not found", 404);

  const variant = publicMediaVariantForAccept(
    request.headers.get("accept") ?? ""
  );
  // 1) 先看 R2 有没有缓存的转换结果
  const r2Key = notionMediaR2KeyForUrl(new URL(request.url), variant);
  if (r2Key && env.ASSETS_BUCKET) {
    const cached = await env.ASSETS_BUCKET.get(r2Key);
    if (cached) {
      const headers = new Headers();
      cached.writeHttpMetadata(headers);
      headers.set("Content-Type", cached.httpMetadata?.contentType ?? "image/webp");
      headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
      headers.set("x-vinext-media-variant", variant);
      return new Response(cached.body, { status: 200, headers });
    }
  }

  // 2) 拿原始 Notion 媒体
  const upstream = await fetchNotionSource(sourceUrl, notion);
  if (!upstream || !upstream.ok || !upstream.body) {
    return errorResponse("upstream error", 502);
  }

  // 3) 如果是 source 模式或没有 IMAGES binding，直接回原始流
  if (variant === "source" || !env.IMAGES) {
    return withCacheHeaders(upstream, "source");
  }

  // 4) 用 Cloudflare Images 转格式
  const width = Number(request.nextUrl.searchParams.get("w") ?? "1200");
  const quality = Number(
    request.nextUrl.searchParams.get("q") ?? (variant === "avif" ? "70" : "80")
  );

  try {
    const cfImages = env.IMAGES as unknown as {
      input(stream: ReadableStream): {
        transform(options: Record<string, unknown>): {
          output(options: { format: string; quality: number }): Promise<{
            response(): Response;
            contentType(): string;
          }>;
        };
      };
    };
    const output = await cfImages
      .input(upstream.body)
      .transform({ width, fit: "contain" })
      .output({ format: variant, quality });
    const transformed = await output.response();

    // 5) 写 R2（fire-and-forget）
    if (r2Key && env.ASSETS_BUCKET) {
      env.ASSETS_BUCKET
        .put(r2Key, transformed.clone().body!, {
          httpMetadata: { contentType: output.contentType() },
        })
        .catch(() => undefined);
    }

    return withCacheHeaders(transformed, variant);
  } catch (error) {
    // 转码失败回落到 source
    return withCacheHeaders(upstream, "source");
  }
}

// 用 Last-Modified 校验
export async function HEAD() {
  return new Response(null, { status: 200, headers: { "Cache-Control": PUBLIC_CACHE_CONTROL } });
}
