"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { CheckIcon, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/react-i18n";
import { listLocaleVariants } from "@/lib/i18n/swap-locale";
import { locales, type Locale } from "@/lib/i18n/config";

/**
 * 返回当前组件树中正在使用的 locale。
 * 不在 I18nProvider 内时会抛错（说明在错误位置使用了依赖 locale 的组件）
 */
export function useCurrentLocale(): Locale {
  const { locale } = useI18n();
  return locale;
}

export function PublicLocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { locale, setLocale, messages } = useI18n();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const variants = React.useMemo(() => listLocaleVariants(pathname), [pathname]);

  const onSelect = (next: Locale) => {
    const variant = variants.find((item) => item.locale === next);
    if (!variant) return;
    // 1) 立即更新 React tree（hero / chrome 立即重渲染）
    setLocale(next);
    // 2) 路由跳到对应 locale 的路径
    router.push(variant.href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={messages.nav.language}
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {locales.map((loc) => {
          const variant = variants.find((item) => item.locale === loc);
          return (
            <DropdownMenuItem
              key={loc}
              onClick={() => onSelect(loc)}
              className="justify-between"
            >
              <span>{messages.locale[loc]}</span>
              {mounted && locale === loc && <CheckIcon className="h-4 w-4 opacity-70" />}
              {variant && (
                <span className="ml-3 text-xs text-muted-foreground">
                  {variant.href}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
