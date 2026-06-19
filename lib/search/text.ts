// lib/search/text.ts
// 从 Notion block 树里抽出纯文本，作为搜索索引的输入。
//
// 设计：
// - 深度优先遍历 blocks（含嵌套 children）
// - 只保留有 rich_text 的块类型（paragraph / heading_* / list_item / quote / callout / toggle / code）
// - 块之间用换行分隔，这样长文本被索引后仍保留段落结构
// - 超过 12000 字符截断

import type { NotionBlock, NotionRichTextPart } from "../notion/types.ts";

const MAX_TEXT_CHARS = 12000;

const TEXTUAL_BLOCK_TYPES = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "callout",
  "toggle",
  "code",
  "to_do",
]);

function getBlockRichText(block: NotionBlock): NotionRichTextPart[] {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return [];
  const richText = (payload as { rich_text?: unknown }).rich_text;
  if (!Array.isArray(richText)) return [];
  return richText as NotionRichTextPart[];
}

function blockToText(block: NotionBlock): string {
  if (!TEXTUAL_BLOCK_TYPES.has(block.type)) return "";
  const parts = getBlockRichText(block);
  return parts
    .map((p) => p.plain_text ?? p.text?.content ?? "")
    .join("")
    .trim();
}

/**
 * 把 Notion blocks 树展平成单一纯文本字符串。
 * 嵌套 children 也会被展开（quote 里的 quote，callout 里的 paragraph 等）
 */
export function extractTextFromBlocks(blocks: NotionBlock[]): string {
  const out: string[] = [];
  function visit(list: NotionBlock[] | undefined) {
    if (!list) return;
    for (const block of list) {
      const text = blockToText(block);
      if (text) out.push(text);
      if (block.children?.length) visit(block.children);
    }
  }
  visit(blocks);
  const joined = out.join("\n");
  if (joined.length <= MAX_TEXT_CHARS) return joined;
  return joined.slice(0, MAX_TEXT_CHARS);
}

/**
 * 把可搜索内容拼成"标题 + 描述 + 正文"的统一格式。
 * 标题 / 描述在前（权重自然高于正文），正文在后
 */
export function buildSearchableText(input: {
  title: string;
  description: string;
  blocks: NotionBlock[];
}): string {
  const head = [input.title, input.description]
    .filter((s) => s && s.trim())
    .map((s) => s.trim())
    .join("\n");
  const body = extractTextFromBlocks(input.blocks);
  if (!head) return body;
  if (!body) return head;
  return `${head}\n\n${body}`;
}
