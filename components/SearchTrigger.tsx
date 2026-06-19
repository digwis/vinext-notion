"use client";

// 顶部"搜索"按钮：点击打开 SearchModal。
// 监听 Cmd/Ctrl + K 快捷键。

import * as React from "react";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SearchModal } from "@/components/SearchModal";
import { useI18n } from "@/lib/i18n/react-i18n";

export function SearchTrigger({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const { messages } = useI18n();

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={`text-muted-foreground h-9 w-full min-w-[180px] justify-between gap-2 px-3 ${className ?? ""}`}
        aria-label={messages.nav.openSearch}
      >
        <span className="flex items-center gap-2">
          <SearchIcon className="h-4 w-4" />
          {messages.nav.search}
        </span>
        <Kbd className="hidden md:inline-flex">⌘K</Kbd>
      </Button>
      <SearchModal open={open} onOpenChange={setOpen} />
    </>
  );
}
