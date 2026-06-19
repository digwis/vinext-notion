"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n/react-i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SearchTrigger } from "@/components/SearchTrigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { PublicLocaleSwitcher } from "@/components/public/PublicLocaleSwitcher";
import { siteBrand, type PublicNavLink } from "@/lib/public-navigation";

type Props = {
  navigationItems: PublicNavLink[];
  /** 当前 pathname（用于高亮活跃 tab） */
  activePath?: string;
};

function isActive(href: string, pathname: string | undefined) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicSiteHeaderChrome({ navigationItems, activePath }: Props) {
  const { messages } = useI18n();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-semibold tracking-tight text-foreground/90"
        >
          {siteBrand.name}
        </Link>

        <nav
          aria-label={messages.nav.ariaLabel}
          className="hidden items-center gap-1 md:flex"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(item.href, activePath)
                  ? "bg-foreground/5 text-foreground"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">
            <SearchTrigger className="min-w-[180px]" />
          </div>
          <PublicLocaleSwitcher />
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={messages.nav.ariaLabel}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border/40 md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            <SearchTrigger className="w-full" />
            <nav
              aria-label={messages.nav.ariaLabel}
              className="flex flex-col gap-1"
            >
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2 py-1.5 text-sm font-medium hover:bg-foreground/5"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
