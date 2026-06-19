// locale 偏好的读取与存储：cookie。
// cookie 名与 lib/i18n/admin-locale.ts 保持一致（都用 NEXT_LOCALE）
import { defaultLocale, isLocale, type Locale } from "./i18n/config.ts";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

/** 从 cookie header 解析 locale，非法则返回默认语言 */
export function getLocaleFromCookieHeader(
  cookieHeader: string | null | undefined
): Locale {
  if (!cookieHeader) return defaultLocale;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  if (!match) return defaultLocale;
  const value = decodeURIComponent(match.slice(LOCALE_COOKIE.length + 1));
  return isLocale(value) ? value : defaultLocale;
}
