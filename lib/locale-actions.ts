"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, type Locale } from "./i18n/config";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "./locale";

/**
 * 切换语言：写 cookie 让下一次请求 `getLocaleFromCookieHeader` 拿到新值。
 * 之后 revalidatePath 强制 RSC 用新 locale 重新渲染
 */
export async function setLocaleCookie(locale: string) {
  if (!isLocale(locale)) {
    throw new Error(`invalid locale: ${locale}`);
  }
  const target = locale as Locale;

  // 1) 写 cookie
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, target, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });

  // 2) revalidate 让 RSC 重新渲染
  revalidatePath("/", "layout");
  return { ok: true } as const;
}
