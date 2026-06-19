import { cache } from "react";
import { getLocalizedPosts } from "./notion/posts.ts";
import {
  publicNavigationLinks,
  type PublicNavLink,
} from "./public-navigation.ts";
import { defaultLocale, isLocale, type Locale } from "./i18n/config.ts";
import { getMessages } from "./i18n/get-messages.ts";

type HomeNavigationItem = PublicNavLink;

type HomeHeroHighlight = {
  label: string;
  value: string;
};

type HomeFeaturedArticle = {
  category: string;
  title: string;
  description: string;
  href: string;
  date: string;
  tags: string[];
  coverImage: string | null;
};

type HomepageContent = {
  navigationItems: HomeNavigationItem[];
  heroHighlights: HomeHeroHighlight[];
  featuredArticles: HomeFeaturedArticle[];
};

type HomepageContentSourceDeps = {
  getPosts: (locale: Locale) => Promise<
    Awaited<ReturnType<typeof getLocalizedPosts>>
  >;
};

function postHref(locale: Locale, slug: string) {
  return locale === "en" ? `/en/blog/${slug}` : `/blog/${slug}`;
}

export const heroHighlights: HomeHeroHighlight[] = [
  { label: "内容来源", value: "Notion Data Source" },
  { label: "部署目标", value: "Cloudflare Workers + D1" },
  { label: "搜索能力", value: "D1 FTS5 全文索引" },
];

function mapPostToHomepageArticle(
  post: Awaited<ReturnType<typeof getLocalizedPosts>>[number],
  locale: Locale
): HomeFeaturedArticle {
  return {
    category: post.tags[0] || "最新文章",
    title: post.title,
    description: post.description,
    href: postHref(locale, post.slug),
    date: post.date,
    tags: post.tags,
    coverImage: post.coverImage,
  };
}

export function createHomepageContentSource(deps: HomepageContentSourceDeps) {
  return {
    async getHomepageContent(
      localeRaw: string | undefined
    ): Promise<HomepageContent> {
      const locale: Locale = isLocale(localeRaw ?? "") ? (localeRaw as Locale) : defaultLocale;
      const messages = getMessages(locale);
      const posts = await deps.getPosts(locale);

      return {
        navigationItems: publicNavigationLinks(locale, messages),
        heroHighlights,
        featuredArticles: posts
          .slice(0, 6)
          .map((p) => mapPostToHomepageArticle(p, locale)),
      };
    },
  };
}

const defaultHomepageSource = createHomepageContentSource({
  getPosts: getLocalizedPosts,
});

export const getHomepageContent = cache(
  async (locale?: string) => defaultHomepageSource.getHomepageContent(locale)
);
