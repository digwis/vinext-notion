import { defaultLocale, isLocale, locales, type Locale } from "./config.ts";

/**
 * 把一个 pathname 的 locale 短码替换成 target。
 * 支持有 locale 前缀（/en/blog）和无 locale 前缀（/、/blog）两种情况。
 * 默认语言（zh）的路径不带 locale 前缀
 */
export function swapLocaleInPathname(
  pathname: string,
  target: Locale
): string {
  const trimmed = pathname.split("?")[0]?.split("#")[0] ?? "/";
  const segments = trimmed.split("/").filter(Boolean);
  if (segments[0] && isLocale(segments[0])) {
    segments.shift();
  }
  if (target !== defaultLocale) {
    segments.unshift(target);
  }
  if (segments.length === 0) return "/";
  return "/" + segments.join("/");
}

/**
 * 给定当前 pathname，列出所有 locale 的等价路径
 * 用于页面头部的语言切换菜单
 */
export function listLocaleVariants(
  pathname: string
): Array<{ locale: Locale; href: string }> {
  return locales.map((locale) => ({
    locale,
    href: swapLocaleInPathname(pathname, locale),
  }));
}
