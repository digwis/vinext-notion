import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/react-i18n";
import { getMessages } from "@/lib/i18n/get-messages";
import { defaultLocale, htmlLang, type Locale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: {
    default: "Vinext Notion",
    template: "%s · Vinext Notion",
  },
  description:
    "An article-only template built on vinext, Notion CMS, and Cloudflare Workers.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root layout：先不绑定 locale，把它交给 /[locale]/layout
  // 这里给 I18nProvider 一个默认 locale，等 [locale] 重新挂载时再覆盖
  const initialLocale: Locale = defaultLocale;
  return (
    <html
      lang={htmlLang(initialLocale)}
      suppressHydrationWarning
      className="antialiased"
    >
      <body className="min-h-dvh bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider
            initialLocale={initialLocale}
            initialMessages={getMessages(initialLocale)}
          >
            <Suspense>{children}</Suspense>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
