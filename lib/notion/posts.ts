import { cache } from "react";
import { listBlockChildrenDeep, type NotionBlockClient } from "./blocks.ts";
import {
  isRenderablePublishedPost,
  mapNotionPageToListItem,
} from "./mappers.ts";
import type { Locale } from "../i18n/config.ts";
import type {
  NotionPageLike,
  NotionPostDetail,
  NotionPostListItem,
  NotionPostTranslation,
  NotionPostTranslationDetail,
} from "./types.ts";

type DataSourceQueryResponse = {
  results?: unknown[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type QueryDataSourceInput = {
  startCursor?: string;
};

export const BLOG_POST_LIST_FILTER_PROPERTIES = [
  "Title",
  "Slug",
  "Description",
  "Date",
  "Author",
  "Tags",
  "Published",
] as const;

export type NotionPostSourceDeps = {
  queryDataSource: (
    input?: QueryDataSourceInput
  ) => Promise<DataSourceQueryResponse>;
  getPageBlocks: (pageId: string) => Promise<NotionPostDetail["blocks"]>;
  editBaseUrl?: string;
};

function normalizePage(input: unknown): NotionPageLike | null {
  if (!input || typeof input !== "object") return null;
  const page = input as NotionPageLike;
  return page.id ? page : null;
}

export function createNotionPostSource(deps: NotionPostSourceDeps) {
  return {
    async listPublishedPosts(): Promise<NotionPostListItem[]> {
      const pages: NotionPageLike[] = [];
      let cursor: string | undefined;

      do {
        const response = await deps.queryDataSource({ startCursor: cursor });
        for (const item of response.results ?? []) {
          const page = normalizePage(item);
          if (page) pages.push(page);
        }

        cursor = response.next_cursor ?? undefined;
        if (!response.has_more) break;
      } while (cursor);

      return pages
        .map((page) =>
          mapNotionPageToListItem(page, { editBaseUrl: deps.editBaseUrl })
        )
        .filter(isRenderablePublishedPost)
        .sort((a, b) => b.date.localeCompare(a.date));
    },

    async getPublishedPostBySlug(slug: string): Promise<NotionPostDetail | null> {
      const posts = await this.listPublishedPosts();
      const post = posts.find((item) => item.slug === slug);
      if (!post) return null;

      return {
        ...post,
        blocks: await deps.getPageBlocks(post.pageId),
      };
    },
  };
}

async function createDefaultSource() {
  const [{ createNotionClient }, { getNotionConfig, hasNotionConfig }] =
    await Promise.all([import("./client.ts"), import("./config.ts")]);
  if (!(await hasNotionConfig())) return null;

  const config = await getNotionConfig();
  const client = createNotionClient(config);

  return createNotionPostSource({
    editBaseUrl: config.editBaseUrl,
    queryDataSource: async ({ startCursor } = {}) =>
      client.dataSources.query({
        data_source_id: config.dataSourceId,
        page_size: 100,
        sorts: [{ property: "Date", direction: "descending" }],
        filter_properties: [...BLOG_POST_LIST_FILTER_PROPERTIES],
        ...(startCursor ? { start_cursor: startCursor } : {}),
      }),
    getPageBlocks: (pageId) =>
      listBlockChildrenDeep(client as NotionBlockClient, pageId),
  });
}

const getDefaultSource = cache(createDefaultSource);

export const getNotionPostsMeta = cache(async () => {
  const source = await getDefaultSource();
  if (!source) return [];
  return source.listPublishedPosts();
});

export const getNotionPostSlugs = cache(async () => {
  const source = await getDefaultSource();
  if (!source) return [];
  const posts = await source.listPublishedPosts();
  return posts.map((post) => post.slug);
});

export const getNotionPostBySlug = cache(async (slug: string) => {
  const source = await getDefaultSource();
  if (!source) return null;
  return source.getPublishedPostBySlug(slug);
});

// ===== locale-aware 导出 =====

// 把文章翻译映射成与主库 list item 相同的形状
function mapTranslationToPostListItem(
  translation: NotionPostTranslation
): NotionPostListItem {
  return {
    pageId: translation.translationPageId,
    slug: translation.slug,
    title: translation.title,
    description: translation.description,
    date: translation.date,
    author: "", // 翻译库无作者信息
    tags: translation.tags,
    coverImage: translation.coverImage,
    published: translation.published,
    editUrl: null,
  };
}

/**
 * 把翻译 post 与源 post 合并，封面图等语言无关字段优先用源文章兜底
 * 纯函数，便于单元测试
 */
export function mergePostTranslationWithSource(
  translation: NotionPostTranslation,
  sourcePost: NotionPostListItem | null
): NotionPostListItem {
  const item = mapTranslationToPostListItem(translation);
  if (!item.coverImage && sourcePost?.coverImage) {
    item.coverImage = sourcePost.coverImage;
  }
  return item;
}

export async function getLocalizedPosts(
  locale: Locale
): Promise<NotionPostListItem[]> {
  if (locale === "zh") return getNotionPostsMeta();
  const { getPostTranslations } = await import("./post-translations.ts");
  const translations = await getPostTranslations(locale);
  if (translations.length === 0) return [];
  // 翻译库可能没有封面，从源文章兜底
  const sourcePosts = await getNotionPostsMeta();
  const sourceByPageId = new Map(sourcePosts.map((p) => [p.pageId, p]));
  return translations.map((translation) =>
    mergePostTranslationWithSource(
      translation,
      translation.sourcePageId
        ? sourceByPageId.get(translation.sourcePageId) ?? null
        : null
    )
  );
}

export async function getLocalizedPostSlugs(locale: Locale): Promise<string[]> {
  if (locale === "zh") return getNotionPostSlugs();
  const { getPostTranslationSlugs } = await import(
    "./post-translations.ts"
  );
  return getPostTranslationSlugs(locale);
}

// 中文 → 走主库；英文 → 走翻译库，把 blocks 接上
export async function getLocalizedPostBySlug(
  locale: Locale,
  slug: string
): Promise<NotionPostDetail | NotionPostTranslationDetail | null> {
  if (locale === "zh") return getNotionPostBySlug(slug);
  const { getPostTranslations, getPostTranslationBySlug } = await import(
    "./post-translations.ts"
  );
  // 1) 先按 en 自己的 slug 找（如果用户在 en 库里直接用 en 的 slug）
  const direct = await getPostTranslationBySlug(locale, slug);
  if (direct) {
    const merged = mergePostTranslationWithSource(
      direct,
      direct.sourcePageId
        ? (await getNotionPostsMeta()).find((p) => p.pageId === direct.sourcePageId) ?? null
        : null
    );
    return { ...merged, blocks: direct.blocks };
  }
  // 2) 否则按 zh pageId 反查：找到原文 page id = slug 对应的 zh post 的 pageId 的 en 翻译
  const zhPost = await getNotionPostBySlug(slug);
  if (!zhPost) return null;
  const all = await getPostTranslations(locale);
  const matched = all.find((t) => t.sourcePageId === zhPost.pageId);
  if (!matched) return null;
  return getPostTranslationBySlug(locale, matched.slug);
}
