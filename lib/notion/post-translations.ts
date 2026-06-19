import { cache } from "react";
import { listBlockChildrenDeep, type NotionBlockClient } from "./blocks.ts";
import { getNotionPostTranslationConfig } from "./config.ts";
import {
  getDateProperty,
  getRichTextProperty,
  getTagsProperty,
} from "./mappers.ts";
import { coverImageUrlForPage } from "./media.ts";
import { NOTION_LOCALE_MAP, type Locale } from "../i18n/config.ts";
import type {
  NotionBlock,
  NotionPageLike,
  NotionPostTranslation,
  NotionPostTranslationDetail,
} from "./types.ts";

type DataSourceQueryResponse = {
  results?: unknown[];
  has_more?: boolean;
  next_cursor?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function normalizePage(input: unknown): NotionPageLike | null {
  if (!input || typeof input !== "object") return null;
  const page = input as NotionPageLike;
  return page.id ? page : null;
}

function getSelectName(
  properties: Record<string, unknown>,
  key: string
): string {
  const prop = properties[key] as
    | { type?: string; select?: { name?: string } | null }
    | undefined;
  if (!prop || prop.type !== "select") return "";
  return String(prop.select?.name ?? "").trim();
}

function getCheckbox(properties: Record<string, unknown>, key: string): boolean {
  const prop = properties[key] as
    | { type?: string; checkbox?: boolean }
    | undefined;
  if (!prop || prop.type !== "checkbox") return false;
  return Boolean(prop.checkbox);
}

function getRelationFirstId(
  properties: Record<string, unknown>,
  key: string
): string | null {
  const prop = properties[key] as
    | { type?: string; relation?: { id?: string }[] }
    | undefined;
  if (!prop || prop.type !== "relation" || !Array.isArray(prop.relation))
    return null;
  return prop.relation[0]?.id ?? null;
}

export function mapTranslationPageToPost(
  page: NotionPageLike
): NotionPostTranslation | null {
  const properties = isRecord(page.properties) ? page.properties : {};
  const title = getRichTextProperty(properties, "标题");
  const language = getSelectName(properties, "语言");
  const published = getCheckbox(properties, "已发布");
  const slug = getRichTextProperty(properties, "Slug");

  if (!title || !language || !slug) return null;

  return {
    translationPageId: page.id,
    language,
    slug,
    title,
    description: getRichTextProperty(properties, "Description"),
    date: getDateProperty(properties, "Date"),
    tags: getTagsProperty(properties, "Tags"),
    coverImage: coverImageUrlForPage(page, "Cover"),
    seoTitle: getRichTextProperty(properties, "SEO Title"),
    seoDescription: getRichTextProperty(properties, "SEO Description"),
    published,
    sourcePageId: getRelationFirstId(properties, "原文"),
  };
}

function isPublishedPostTranslation(
  item: NotionPostTranslation | null
): item is NotionPostTranslation {
  return item !== null && item.published;
}

export type NotionPostTranslationSourceDeps = {
  queryDataSource: (
    input?: { startCursor?: string }
  ) => Promise<DataSourceQueryResponse>;
  getPageBlocks: (pageId: string) => Promise<NotionBlock[]>;
};

export function createPostTranslationSource(
  deps: NotionPostTranslationSourceDeps
) {
  return {
    async listPublishedTranslations(
      language: readonly string[]
    ): Promise<NotionPostTranslation[]> {
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
        .map(mapTranslationPageToPost)
        .filter(isPublishedPostTranslation)
        .filter((item) => language.includes(item.language))
        .filter(
          (item, idx, arr) =>
            arr.findIndex((m) => m.slug === item.slug) === idx
        )
        .sort((a, b) => b.date.localeCompare(a.date));
    },

    async getTranslationBySlug(
      language: readonly string[],
      slug: string
    ): Promise<NotionPostTranslationDetail | null> {
      const list = await this.listPublishedTranslations(language);
      const item = list.find((m) => m.slug === slug);
      if (!item) return null;
      const blocks = await deps.getPageBlocks(item.translationPageId);
      return { ...item, blocks };
    },
  };
}

const getDefaultPostTranslationSource = cache(async () => {
  const config = await getNotionPostTranslationConfig();
  if (!config) return null;
  const [{ createNotionClient }] = await Promise.all([import("./client.ts")]);
  const client = createNotionClient(config);
  return createPostTranslationSource({
    queryDataSource: async ({ startCursor } = {}) =>
      client.dataSources.query({
        data_source_id: config.dataSourceId,
        page_size: 100,
        sorts: [{ property: "Date", direction: "descending" }],
        ...(startCursor ? { start_cursor: startCursor } : {}),
      }),
    getPageBlocks: (pageId) =>
      listBlockChildrenDeep(client as NotionBlockClient, pageId),
  });
});

export const getPostTranslations = cache(async (locale: Locale) => {
  const language = NOTION_LOCALE_MAP[locale];
  try {
    const source = await getDefaultPostTranslationSource();
    if (!source) return [];
    return source.listPublishedTranslations(language);
  } catch (error) {
    console.error(
      JSON.stringify({
        tag: "notion_post_translations_error",
        locale,
        message: String(error),
      })
    );
    return [];
  }
});

export const getPostTranslationBySlug = cache(
  async (locale: Locale, slug: string) => {
    const language = NOTION_LOCALE_MAP[locale];
    try {
      const source = await getDefaultPostTranslationSource();
      if (!source) return null;
      return source.getTranslationBySlug(language, slug);
    } catch (error) {
      console.error(
        JSON.stringify({
          tag: "notion_post_translations_error",
          locale,
          slug,
          message: String(error),
        })
      );
      return null;
    }
  }
);

export const getPostTranslationSlugs = cache(async (locale: Locale) => {
  const items = await getPostTranslations(locale);
  return items.map((item) => item.slug);
});
