import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { I18nProvider } from "@/lib/i18n/react-i18n";
import { getMessages } from "@/lib/i18n/get-messages";
import { getLocaleFromCookieHeader } from "@/lib/locale";
import {
  defaultLocale,
  htmlLang,
  isLocale,
  locales,
  type Locale,
} from "@/lib/i18n/config";
import { publicNavigationLinks } from "@/lib/public-navigation";
import { headers } from "next/headers";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  // 1) 取 cookie 中的语言偏好（前端 chrome 切换时写）作为 I18nProvider 的初值
  //    路径上的 locale 仍是权威来源（用于 URL 路由）
  const headerStore = await headers();
  const cookieHeader = headerStore.get("cookie");
  const preferred = getLocaleFromCookieHeader(cookieHeader);
  const initialLocale: Locale = isLocale(preferred)
    ? (preferred as Locale)
    : defaultLocale;

  const messages = getMessages(locale);
  const navigationItems = publicNavigationLinks(locale, messages);

  return (
    <div
      lang={htmlLang(locale)}
      data-locale={locale}
      className="flex min-h-dvh flex-col"
    >
      <I18nProvider initialLocale={initialLocale} initialMessages={messages}>
        <PublicSiteHeader navigationItems={navigationItems} />
        <main className="flex-1">{children}</main>
        <PublicSiteFooter locale={locale} />
      </I18nProvider>
    </div>
  );
}
