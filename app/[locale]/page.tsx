import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getHomepageContent } from "@/lib/homepage-content";
import { getMessages } from "@/lib/i18n/get-messages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicCoverImage } from "@/components/PublicCoverImage";
import { isOptimizableCoverImage } from "@/lib/public-image";

export const revalidate = 120;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [content, messages] = await Promise.all([
    getHomepageContent(locale),
    Promise.resolve(getMessages(locale)),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-6 py-16 sm:py-20 lg:py-24">
        <div className="flex flex-col gap-5">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {messages.home.heroTitle}
          </h1>
          <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            {messages.home.heroDesc}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link
                href={locale === "en" ? "/en/blog" : "/blog"}
                className="px-6"
              >
                {messages.home.browseArticles}
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {content.heroHighlights.map((item) => (
                <Badge key={item.label} variant="secondary">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="ml-1 font-medium text-foreground">
                    {item.value}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="border-t border-border/40 py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {messages.home.articlesEyebrow}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {messages.home.articlesTitle}
            </h2>
          </div>
          <Link
            href={locale === "en" ? "/en/blog" : "/blog"}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {messages.home.viewAllArticles}
          </Link>
        </div>

        {content.featuredArticles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            {messages.home.noArticles}
          </p>
        ) : (
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Loading…</p>
            }
          >
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {content.featuredArticles.map((article, index) => (
                <li key={article.href}>
                  <Link
                    href={article.href}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition hover:border-border hover:shadow-md"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                      {article.coverImage ? (
                        isOptimizableCoverImage(article.coverImage) ? (
                          <PublicCoverImage
                            src={article.coverImage}
                            alt={article.title}
                            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            index={index}
                            variant="list"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={article.coverImage}
                            alt={article.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            loading={index < 3 ? "eager" : "lazy"}
                            decoding="async"
                          />
                        )
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          {article.category}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{article.date}</span>
                        {article.tags[0] && (
                          <>
                            <span>·</span>
                            <span>{article.tags[0]}</span>
                          </>
                        )}
                      </div>
                      <h3 className="line-clamp-2 text-base font-semibold tracking-tight">
                        {article.title}
                      </h3>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {article.description}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Suspense>
        )}
      </section>
    </div>
  );
}
