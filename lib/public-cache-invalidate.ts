import { publicCacheKey } from "./cache-keys.ts";

export type InvalidationKind = "publish" | "update" | "delete";

export type InvalidationInput = {
  slug: string;
  kind: InvalidationKind;
  previousSlug?: string;
  // 影响公开页的语言；默认 ["zh", "en"]。zh 路径无前缀，en 加 /en 前缀
  locales?: string[];
};

export type InvalidationPlan = {
  kind: InvalidationKind;
  slug: string;
  keys: string[];
};

const DEFAULT_LOCALES = ["zh", "en"];

function localizedBlogPath(locale: string, slug: string) {
  return locale === "en" ? `/en/blog/${slug}` : `/blog/${slug}`;
}

function localizedBlogIndexPath(locale: string) {
  return locale === "en" ? "/en/blog" : "/blog";
}

// 给定一次影响公开页的内容变更，计算需要失效的边缘缓存键集合
// 当前单一主缓存层是 Cloudflare 边缘 HTML 缓存；该函数返回的 keys
// 与 lib/cache-keys.ts 的 publicCacheKey 保持完全一致
export function buildInvalidationPlan(input: InvalidationInput): InvalidationPlan {
  const locales = input.locales ?? DEFAULT_LOCALES;
  const set = new Set<string>();

  for (const locale of locales) {
    set.add(publicCacheKey(localizedBlogIndexPath(locale)));
    set.add(publicCacheKey(localizedBlogPath(locale, input.slug)));
    if (input.previousSlug) {
      set.add(publicCacheKey(localizedBlogPath(locale, input.previousSlug)));
    }
  }
  return {
    kind: input.kind,
    slug: input.slug,
    keys: Array.from(set),
  };
}
