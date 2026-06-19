"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useI18n } from "@/lib/i18n/react-i18n";
import { useCurrentLocale } from "@/components/public/PublicLocaleSwitcher";

type SearchHit = {
  id: string;
  pageId: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
};

export function SearchModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const locale = useCurrentLocale();
  const { messages } = useI18n();
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const requestRef = React.useRef<AbortController | null>(null);

  // 切换 open 时清空上次的搜索状态
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
    }
  }, [open]);

  // Debounce 搜索：300 ms，避免每个键都请求
  React.useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&locale=${locale}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { results: SearchHit[] };
        setHits(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setHits([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, locale]);

  const onSelect = (hit: SearchHit) => {
    onOpenChange(false);
    const path = locale === "en" ? `/en/blog/${hit.slug}` : `/blog/${hit.slug}`;
    router.push(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={messages.search.placeholder}
      description={messages.search.placeholder}
    >
      <CommandInput
        autoFocus
        value={query}
        onValueChange={setQuery}
        placeholder={messages.search.placeholder}
      />
      <CommandList>
        {!query && (
          <CommandEmpty>{messages.search.openWithShortcut}</CommandEmpty>
        )}
        {query && !isLoading && hits.length === 0 && (
          <CommandEmpty>{messages.search.noResults}</CommandEmpty>
        )}
        {hits.length > 0 && (
          <CommandGroup heading={messages.search.sectionArticles}>
            {hits.map((hit) => (
              <CommandItem
                key={hit.id}
                value={`${hit.title} ${hit.description}`}
                onSelect={() => onSelect(hit)}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{hit.title}</span>
                  {hit.description && (
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {hit.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
