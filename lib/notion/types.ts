export type NotionFileSource =
  | {
      type: "external";
      url: string;
    }
  | {
      type: "file";
      url: string;
      expiryTime: string | null;
    };

export type NotionPostListItem = {
  pageId: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  coverImage: string | null;
  published: boolean;
  editUrl: string | null;
};

export type NotionPostDetail = NotionPostListItem & {
  blocks: NotionBlock[];
};

export type NotionRichTextPart = {
  plain_text?: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
  type?: string;
  text?: {
    content?: string;
    link?: { url?: string } | null;
  };
  equation?: {
    expression?: string;
  };
};

export type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  children?: NotionBlock[];
  [key: string]: unknown;
};

export type NotionPageLike = {
  id: string;
  last_edited_time?: string;
  cover?: unknown;
  properties?: Record<string, unknown>;
  url?: string;
  public_url?: string | null;
};

// ===== 翻译库类型 =====

// 翻译库一条记录：一篇文章的一种语言版本
// 字段对齐主库的 list item 形状，便于上层复用
export type NotionPostTranslation = {
  translationPageId: string;
  language: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  coverImage: string | null;
  seoTitle: string;
  seoDescription: string;
  published: boolean;
  sourcePageId: string | null;
};

export type NotionPostTranslationDetail = NotionPostTranslation & {
  blocks: NotionBlock[];
};
