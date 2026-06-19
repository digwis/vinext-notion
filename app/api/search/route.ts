// /api/search?q=...&locale=zh
// 返回 D1 FTS5 搜索命中的文章列表
//
// - 使用 lib/search 封装（包含 LIKE 兜底）
// - 走 Cloudflare 边缘缓存：10 分钟内同 query + locale 不再打 Notion / D1
// - locale 必传，缺省时直接返回 400
//
// 注意：CDN 缓存 key 不能把 D1 的 BM25 score 算进来（不稳定），
// 所以我们只缓存命中的 pageId 集合与元数据，score 在每个边缘节点重算

import { NextResponse, type NextRequest } from "next/server";
import { searchItems } from "@/lib/search";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { publicApiCacheKeyForUrl } from "@/lib/cache-keys";

export const runtime = "edge";
// 公开搜索结果：5 分钟边缘缓存，10 分钟 stale-while-revalidate
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const localeParam = url.searchParams.get("locale") ?? "";
  if (!isLocale(localeParam)) {
    return NextResponse.json(
      { error: "missing or invalid locale" },
      { status: 400 }
    );
  }
  const locale: Locale = localeParam as Locale;
  if (!q) {
    return NextResponse.json(
      { results: [], query: q, locale },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  }

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = publicApiCacheKeyForUrl(url);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const hits = await searchItems(q, { locale, type: "article" });
    const response = NextResponse.json(
      { results: hits, query: q, locale },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
    // 异步写缓存，不阻塞返回
    cache.put(cacheKey, response.clone()).catch(() => undefined);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "search backend unavailable", message: String(error) },
      { status: 503 }
    );
  }
}
