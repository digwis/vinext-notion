import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import NotionBlockRenderer from "@/components/NotionBlockRenderer";
import { PublicCoverImage } from "@/components/PublicCoverImage";
import { isOptimizableCoverImage } from "@/lib/public-image";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";
import {
  getLocalizedPostBySlug,
  getLocalizedPostSlugs,
} from "@/lib/notion/posts";
import type { Metadata } from "next";

export const revalidate = 120;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const out: Array<{ locale: string; slug: string }> = [];
  const { isLocale, locales } = await import("@/lib/i18n/config");
  for (const locale of locales) {
    if (!isLocale(locale)) continue;
    const slugs = await getLocalizedPostSlugs(locale);
    for (const slug of slugs) {
      out.push({ locale, slug });
    }
  }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) return {};
  const locale: Locale = rawLocale;
  const post = await getLocalizedPostBySlug(locale, slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const messages = getMessages(locale);
  const post = await getLocalizedPostBySlug(locale, slug);
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-10 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{post.date}</span>
          {post.tags[0] && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <Badge variant="secondary">{post.tags[0]}</Badge>
            </>
          )}
        </div>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>
        {post.description && (
          <p className="text-pretty text-lg text-muted-foreground">
            {post.description}
          </p>
        )}
        {post.coverImage && (
          <div className="overflow-hidden rounded-xl border">
            {isOptimizableCoverImage(post.coverImage) ? (
              <PublicCoverImage
                src={post.coverImage}
                alt={post.title}
                sizes="(min-width: 1024px) 768px, 100vw"
                className="h-auto w-full"
                variant="detail"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.coverImage}
                alt={post.title}
                className="h-auto w-full"
                loading="eager"
                decoding="async"
              />
            )}
          </div>
        )}
        {post.tags.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </header>

      <Separator className="my-6" />

      <div className="prose-article">
        <NotionBlockRenderer blocks={post.blocks} />
      </div>

      <Separator className="my-10" />

      <div className="flex items-center justify-between text-sm">
        <Button asChild variant="ghost">
          <Link href={locale === "en" ? "/en/blog" : "/blog"}>
            {messages.blog.backToList}
          </Link>
        </Button>
      </div>
    </article>
  );
}
