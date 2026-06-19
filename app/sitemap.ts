import type { MetadataRoute } from "next";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getLocalizedPosts } from "@/lib/notion/posts";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://vinext-notion.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    if (!isLocale(locale)) continue;
    const l = locale as Locale;
    const base = l === "en" ? `${SITE_URL}/en` : `${SITE_URL}`;
    entries.push({
      url: `${base}/`,
      changeFrequency: "weekly",
      priority: 1.0,
    });
    entries.push({
      url: `${base}/blog`,
      changeFrequency: "daily",
      priority: 0.9,
    });
    const posts = await getLocalizedPosts(l);
    for (const post of posts) {
      entries.push({
        url: `${base}/blog/${post.slug}`,
        lastModified: post.date ? new Date(post.date) : undefined,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }
  return entries;
}
