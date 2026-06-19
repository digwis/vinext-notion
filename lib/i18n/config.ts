// 支持的语言与默认语言。
// URL 用短码（zh/en），Notion 翻译库的语言 select 用 BCP47（zh-CN/en-US）。
// 同一短码在翻译库里可能以多种 select 选项出现，这里列出全部可选项以便匹配

export const locales = ["zh", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh";

// Notion 翻译库「语言」select 选项与短码的映射
// 列表过滤时会按"等于其中任一"来处理
export const NOTION_LOCALE_MAP: Record<Locale, readonly string[]> = {
  zh: ["zh", "zh-CN"],
  en: ["en", "en-US"],
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (value && isLocale(value)) return value;
  return defaultLocale;
}

// HTML lang 属性值
export function htmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en";
}
