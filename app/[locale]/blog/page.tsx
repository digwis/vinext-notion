import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLocalizedPosts } from "@/lib/notion/posts";
import { getMessages } from "@/lib/i18n/get-messages";
import { PublicCoverImage } from "@/components/PublicCoverImage";
import { isOptimizableCoverImage } from "@/lib/public-image";
import type { Metadata } from "next";

export const revalidate = 120;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) return {};
  const messages = getMessages(rawLocale as Locale);
  return {
    title: messages.blog.indexTitle,
    description: messages.blog.indexDesc,
  };
}

export default async function BlogIndexPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const messages = getMessages(locale);
  const posts = await getLocalizedPosts(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {messages.blog.indexTitle}
        </h1>
        <p className="text-muted-foreground">{messages.blog.indexDesc}</p>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          {messages.blog.empty}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => {
            const href =
              locale === "en" ? `/en/blog/${post.slug}` : `/blog/${post.slug}`;
            return (
              <li key={post.pageId}>
                <Link
                  href={href}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition hover:border-border hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                    {post.coverImage ? (
                      isOptimizableCoverImage(post.coverImage) ? (
                        <PublicCoverImage
                          src={post.coverImage}
                          alt={post.title}
                          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          index={index}
                          variant="list"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading={index < 3 ? "eager" : "lazy"}
                          decoding="async"
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        {post.tags[0] || messages.brand.name}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{post.date}</span>
                      {post.tags[0] && (
                        <>
                          <span>·</span>
                          <span>{post.tags[0]}</span>
                        </>
                      )}
                    </div>
                    <h2 className="line-clamp-2 text-lg font-semibold tracking-tight">
                      {post.title}
                    </h2>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {post.description}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
