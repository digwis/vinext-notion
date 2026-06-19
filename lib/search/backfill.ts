// 搜索索引全量回填工具。
//
// 调用方通常是：
// 1) 首次上线：跑一次 backfill 索引所有已发布内容
// 2) Notion 内容更新后：再跑一次 backfill 重建索引
// 3) 未来接 webhook 后：webhook 触发单条 indexItem/deleteItem，
//    backfill 退化为 fallback / 定期 cron 校验
//
// 走 D1 FTS5（零运行成本），不再用 Workers AI / Vectorize

import { collectAllItems } from "@/lib/search/sync";
import { indexItemsBatch } from "@/lib/search";
import { locales, type Locale } from "@/lib/i18n/config";

export type BackfillResult = {
  ok: boolean;
  locale: Locale;
  indexed: number;
  failed: number;
  durationMs: number;
  errors: string[];
};

/** 回填指定 locale 的所有已发布内容到 D1 FTS5 search_index */
export async function backfillSearch(
  locale: Locale
): Promise<BackfillResult> {
  if (!locales.includes(locale)) {
    throw new Error(`invalid locale: ${locale}`);
  }
  const start = Date.now();
  const items = await collectAllItems(locale);
  const errors: string[] = [];
  let indexed = 0;
  let failed = 0;

  // indexItemsBatch 内部已经分批 + 串行，这里逐 chunk 跑
  // —— 中途出错时记录但继续，这样一次 backfill 失败不会让所有内容都搜不到
  const BATCH = 50;
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    try {
      await indexItemsBatch(chunk);
      indexed += chunk.length;
    } catch (err) {
      failed += chunk.length;
      errors.push(
        `chunk ${i}-${i + chunk.length}: ${(err as Error)?.message ?? String(err)}`
      );
    }
  }

  const result: BackfillResult = {
    ok: failed === 0,
    locale,
    indexed,
    failed,
    durationMs: Date.now() - start,
    errors: errors.slice(0, 5), // 最多 5 条，避免返回体太大
  };
  console.log(
    JSON.stringify({
      tag: "search_backfill",
      ...result,
    })
  );
  return result;
}
