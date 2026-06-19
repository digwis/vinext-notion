// Cloudflare Workers 入口：直接转交给 vinext 的 app router entry
// 这个文件会被 wrangler 部署，自动获得 DB / IMAGES / R2 绑定
import handler from "vinext/server/app-router-entry";
import {
  isImageOptimizationPath,
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from "vinext/server/image-optimization";
import { publicCacheKey, publicApiCacheKeyForUrl } from "../lib/cache-keys.ts";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{
          response(): Response;
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

const PUBLIC_CONTENT_RE = /^\/(?:zh|en)\/blog(?:\/[^/]+)?\/?$/;
const PUBLIC_API_RE = /^\/api\/search\/?$/;

const PUBLIC_HTML_CACHE_CONTROL =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=600";
const PUBLIC_API_CACHE_CONTROL =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

function stripTrailingSlash(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // 注入 pathname 给下游 app/layout 用
    if (!request.headers.has("x-pathname")) {
      const headerBag = new Headers(request.headers);
      headerBag.set("x-pathname", url.pathname);
      request = new Request(request, { headers: headerBag });
    }

    let effectiveRequest = request;
    if (
      request.method === "GET" &&
      (PUBLIC_CONTENT_RE.test(url.pathname) || PUBLIC_API_RE.test(url.pathname))
    ) {
      const canonicalPath = stripTrailingSlash(url.pathname);
      if (canonicalPath !== url.pathname) {
        const rewritten = new URL(request.url);
        rewritten.pathname = canonicalPath;
        effectiveRequest = new Request(rewritten, request);
      }
    }

    // Cloudflare Images 优化
    if (isImageOptimizationPath(url.pathname)) {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(
        request,
        {
          fetchAsset: (path) =>
            env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES!
              .input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          },
        },
        allowedWidths
      );
    }

    // 公开内容页缓存
    const effectiveUrl = new URL(effectiveRequest.url);
    if (
      effectiveRequest.method === "GET" &&
      PUBLIC_CONTENT_RE.test(effectiveUrl.pathname) &&
      !effectiveUrl.searchParams.has("_rsc") &&
      (effectiveRequest.headers.get("accept") ?? "").includes("text/html")
    ) {
      const cache = (caches as CacheStorage & { default: Cache }).default;
      const cacheKey = new Request(publicCacheKey(effectiveUrl.pathname), {
        method: "GET",
      });
      const cached = await cache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
        headers.set("Vary", "Accept-Encoding");
        headers.set("X-Public-Page-Cache", "HIT");
        return new Response(cached.body, { status: cached.status, headers });
      }
      const response = await handler.fetch(effectiveRequest, env, ctx);
      const ctype = response.headers.get("content-type") ?? "";
      if (response.status === 200 && ctype.includes("text/html")) {
        const cloned = response.clone();
        const headers = new Headers(cloned.headers);
        headers.set("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
        headers.set("Vary", "Accept-Encoding");
        headers.set("X-Public-Page-Cache", "MISS");
        const toCache = new Response(cloned.body, {
          status: cloned.status,
          headers,
        });
        ctx.waitUntil(cache.put(cacheKey, toCache));
        return new Response(response.body, {
          status: response.status,
          headers,
        });
      }
      return response;
    }

    // 公开 API 缓存（仅 /api/search）
    if (
      effectiveRequest.method === "GET" &&
      PUBLIC_API_RE.test(effectiveUrl.pathname)
    ) {
      const cache = (caches as CacheStorage & { default: Cache }).default;
      const cacheKey = new Request(publicApiCacheKeyForUrl(effectiveUrl), {
        method: "GET",
      });
      const cached = await cache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set("Cache-Control", PUBLIC_API_CACHE_CONTROL);
        headers.set("Vary", "Accept-Encoding");
        headers.set("X-Public-API-Cache", "HIT");
        return new Response(cached.body, { status: cached.status, headers });
      }
      const response = await handler.fetch(effectiveRequest, env, ctx);
      const ctype = response.headers.get("content-type") ?? "";
      if (response.status === 200 && ctype.includes("application/json")) {
        const cloned = response.clone();
        const headers = new Headers(cloned.headers);
        headers.set("Cache-Control", PUBLIC_API_CACHE_CONTROL);
        headers.set("Vary", "Accept-Encoding");
        headers.set("X-Public-API-Cache", "MISS");
        const toCache = new Response(cloned.body, {
          status: cloned.status,
          headers,
        });
        ctx.waitUntil(cache.put(cacheKey, toCache));
        return new Response(response.body, {
          status: response.status,
          headers,
        });
      }
      return response;
    }

    // 其它全部交给 vinext
    return handler.fetch(effectiveRequest, env, ctx);
  },
};
