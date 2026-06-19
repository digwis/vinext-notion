"use client";

import * as React from "react";
import { messages as allMessages, type MessagesShape } from "./messages";
import { isLocale, type Locale } from "./config";
import { setLocaleCookie } from "@/lib/locale-actions";

type I18nContextValue = {
  locale: Locale;
  messages: MessagesShape;
  /**
   * 立即更新 client-side locale 状态（chrome 立即重渲染）并异步写 cookie。
   * URL 跳转 / SSR 刷新由调用方按需触发
   */
  setLocale: (next: Locale) => void;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  initialMessages,
  children,
}: {
  initialLocale: Locale;
  initialMessages: MessagesShape;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  const messages = React.useMemo<MessagesShape>(
    () => allMessages[locale] ?? initialMessages,
    [locale, initialMessages]
  );

  const setLocale = React.useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setLocaleState((prev) => (prev === next ? prev : next));
    // 异步持久化：cookie 写失败也不阻塞 UI
    setLocaleCookie(next).catch(() => {});
  }, []);

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, messages, setLocale }),
    [locale, messages, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
