// 界面文案字典。zh 是 source of truth，en 必须与之完全同构。
// 类型由 zh 推导，少一个 key 编译报错

const zh = {
  brand: {
    name: "Vinext Notion",
  },
  nav: {
    home: "首页",
    blog: "文章",
    language: "切换语言",
    search: "搜索",
    openSearch: "打开搜索",
    ariaLabel: "主导航",
  },
  footer: {
    copyright: "© {year} Vinext Notion",
    blog: "文章",
  },
  home: {
    heroTitle: "用 Notion 写文章，用 Cloudflare 把它发到全世界。",
    heroDesc:
      "Vinext Notion 是一个只保留文章模块的极简模板：Notion 当 CMS，Cloudflare Workers 部署，浏览器原生搜索，秒开。",
    browseArticles: "浏览文章",
    articlesEyebrow: "Latest Writing",
    articlesTitle: "精选文章",
    viewAllArticles: "查看全部文章",
    noArticles: "暂时还没有可展示的文章内容。",
  },
  blog: {
    indexTitle: "Articles",
    indexDesc: "关于 Cloudflare、Notion 与全栈开发的笔记。",
    empty: "还没有任何文章。",
    backToList: "返回文章列表",
  },
  search: {
    placeholder: "搜索文章…",
    emptyState: "输入关键词开始搜索",
    noResults: "没有找到结果",
    resultsCount: "条结果",
    sectionArticles: "文章",
    openWithShortcut: "按 Cmd/Ctrl + K 打开",
  },
  theme: {
    toggle: "切换主题",
  },
  locale: {
    zh: "中文",
    en: "English",
  },
} as const;

// 用一个递归类型让 en 必须与 zh 同构（结构层面）
type Messages = typeof zh;
// DeepReadonlyString 把字面量类型收宽为 string，避免 en/zh 字面量不一致触发误报
type DeepReadonlyString<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : DeepReadonlyString<T[K]>;
};

const en: DeepReadonlyString<Messages> = {
  brand: {
    name: "Vinext Notion",
  },
  nav: {
    home: "Home",
    blog: "Articles",
    language: "Switch language",
    search: "Search",
    openSearch: "Open search",
    ariaLabel: "Primary",
  },
  footer: {
    copyright: "© {year} Vinext Notion",
    blog: "Articles",
  },
  home: {
    heroTitle:
      "Write in Notion, ship to the world on Cloudflare.",
    heroDesc:
      "Vinext Notion is a minimal template that keeps only the article module. Notion as the CMS, Cloudflare Workers for hosting, and instant browser-native search.",
    browseArticles: "Browse articles",
    articlesEyebrow: "Latest Writing",
    articlesTitle: "Featured Articles",
    viewAllArticles: "View all articles",
    noArticles: "No articles to show yet.",
  },
  blog: {
    indexTitle: "Articles",
    indexDesc: "Notes on Cloudflare, Notion, and full-stack development.",
    empty: "No posts yet.",
    backToList: "Back to all posts",
  },
  search: {
    placeholder: "Search articles…",
    emptyState: "Type to start searching",
    noResults: "No results found",
    resultsCount: "results",
    sectionArticles: "Articles",
    openWithShortcut: "Press Cmd/Ctrl + K to open",
  },
  theme: {
    toggle: "Toggle theme",
  },
  locale: {
    zh: "中文",
    en: "English",
  },
};

// MessagesShape 收宽到 string 字面量，方便 zh/en 互相赋值
export type MessagesShape = DeepReadonlyString<Messages>;
export const messages: { readonly zh: MessagesShape; readonly en: MessagesShape } = { zh, en };
