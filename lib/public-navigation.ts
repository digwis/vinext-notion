import { isLocale, type Locale } from "./i18n/config.ts";
import type { MessagesShape } from "./i18n/messages.ts";

export type PublicSiteSection = "home" | "blog";

export type PublicNavigationItem = {
  label: string;
  href: string;
};

export type PublicNavLink = PublicNavigationItem & {
  section: PublicSiteSection;
};

// 把 /blog/foo, /en/blog/foo 解析成 "blog" 段
// 返回 null 表示不在公共站点范围或与给定 locale 不匹配
export function resolveSectionFromPathname(
  pathname: string,
  locale: Locale
): PublicSiteSection | null {
  const path = (pathname.split("?")[0] || "/").trim();
  const normalized = path.startsWith("/") ? path : `/${path}`;

  // zh locale：只接受无前缀或 /zh/... 路径
  // en locale：只接受 /en 或 /en/... 路径
  if (locale === "zh") {
    if (normalized === "/en" || normalized.startsWith("/en/")) return null;
    // 路径无前缀，直接用
    if (normalized === "/" || normalized === "") return "home";
    if (normalized === "/blog" || normalized.startsWith("/blog/")) return "blog";
    return null;
  } else {
    // en locale：必须有 /en/ 前缀
    if (!(normalized === "/en" || normalized.startsWith("/en/"))) return null;
    let stripped = normalized === "/en" ? "/" : normalized.slice(3) || "/";
    if (stripped === "/" || stripped === "") return "home";
    if (stripped === "/blog" || stripped.startsWith("/blog/")) return "blog";
    return null;
  }
}

export function buildHref(locale: Locale, section: PublicSiteSection) {
  if (section === "home") return locale === "en" ? "/en" : "/";
  return locale === "en" ? `/en/${section}` : `/${section}`;
}

export function publicNavigationLinks(
  locale: Locale,
  messages: MessagesShape
): PublicNavLink[] {
  return [
    { section: "home", label: messages.nav.home, href: buildHref(locale, "home") },
    { section: "blog", label: messages.nav.blog, href: buildHref(locale, "blog") },
  ];
}

export function footerLinks(
  locale: Locale,
  messages: MessagesShape
): PublicNavigationItem[] {
  return publicNavigationLinks(locale, messages);
}

export const siteBrand = {
  name: "Vinext Notion",
};

// 从 URL 推断 locale（用于服务端 fallback）
export function inferLocaleFromPathname(pathname: string): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return "zh";
}

export function isLocaleString(value: string): value is Locale {
  return isLocale(value);
}
