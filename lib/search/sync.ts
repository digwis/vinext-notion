// lib/search/sync.ts
// 把 Notion 上的文章数据转成 SearchableItem，作为 indexItem / indexItemsBatch 的输入。
//
// 数据流（用于 backfill / 手动重建）：
//   for locale in [zh, en]:
//     posts = getLocalizedPosts(locale)
//     for each post:
//       detail = getLocalizedPostBySlug(locale, post.slug) // 拿到 blocks
//       item = toSearchableItem(locale, 'article', post, detail.blocks)

import { getLocalizedPosts, getLocalizedPostBySlug } from "../notion/posts.ts";
import type { Locale } from "../i18n/config.ts";
import { buildSearchableText } from "./text.ts";
import type { SearchableItem } from "./index.ts";

function toArticleItem(
  locale: Locale,
  post: {
    pageId: string;
    slug: string;
    title: string;
    description: string;
    date: string;
    coverImage: string | null;
    tags: string[];
  },
  blocks: { type: string }[]
): SearchableItem {
  return {
    locale,
    type: "article",
    pageId: post.pageId,
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    coverImage: post.coverImage,
    tags: post.tags,
    searchableText: buildSearchableText({
      title: post.title,
      description: post.description,
      blocks: blocks as never,
    }),
  };
}

/** 拉取某一 locale 下所有已发布文章并转成 SearchableItem[]（含 blocks） */
export async function collectPostItems(
  locale: Locale
): Promise<SearchableItem[]> {
  const posts = await getLocalizedPosts(locale);
  const out: SearchableItem[] = [];
  for (const post of posts) {
    const detail = await getLocalizedPostBySlug(locale, post.slug);
    if (!detail) continue;
    out.push(
      toArticleItem(
        locale,
        {
          pageId: post.pageId,
          slug: post.slug,
          title: post.title,
          description: post.description,
          date: post.date,
          coverImage: post.coverImage,
          tags: post.tags,
        },
        detail.blocks
      )
    );
  }
  return out;
}

/** 拉取某一 locale 下所有文章 */
export async function collectAllItems(
  locale: Locale
): Promise<SearchableItem[]> {
  return collectPostItems(locale);
}
