-- Search index (FTS5)
-- 一行对应一条可搜索内容：locale × type × pageId 决定唯一
-- body 是 title + description + blocks 拼成的纯文本（FTS5 索引字段）
-- 业务字段（title/description/date/tags/cover_image）展示用，不进 FTS5 MATCH，
-- 这样我们可以在不重新解析 Notion 的情况下快速渲染搜索结果

CREATE TABLE IF NOT EXISTS search_index (
  -- 主键维度
  type        TEXT NOT NULL,            -- 'article'
  locale      TEXT NOT NULL,            -- 'zh' | 'en'
  page_id     TEXT NOT NULL,
  -- 展示 / 路由
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  date        TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '[]', -- JSON 字符串（sqlite 不用 JSON1 也能正常存）
  -- FTS5 索引字段
  body        TEXT NOT NULL DEFAULT '',
  -- 索引元数据
  indexed_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (type, locale, page_id)
) STRICT;

CREATE INDEX IF NOT EXISTS search_index_locale_idx ON search_index (locale);
CREATE INDEX IF NOT EXISTS search_index_date_idx ON search_index (date DESC);
CREATE INDEX IF NOT EXISTS search_index_slug_idx ON search_index (locale, slug);

CREATE VIRTUAL TABLE IF NOT EXISTS search_index_fts USING fts5(
  body,
  content='search_index',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 1'
);

-- FTS5 触发器：保持全文索引与主表同步
CREATE TRIGGER IF NOT EXISTS search_index_ai AFTER INSERT ON search_index
BEGIN
  INSERT INTO search_index_fts (rowid, body) VALUES (new.rowid, new.body);
END;

CREATE TRIGGER IF NOT EXISTS search_index_ad AFTER DELETE ON search_index
BEGIN
  INSERT INTO search_index_fts (search_index_fts, rowid, body)
    VALUES ('delete', old.rowid, old.body);
END;

CREATE TRIGGER IF NOT EXISTS search_index_au AFTER UPDATE ON search_index
BEGIN
  INSERT INTO search_index_fts (search_index_fts, rowid, body)
    VALUES ('delete', old.rowid, old.body);
  INSERT INTO search_index_fts (rowid, body) VALUES (new.rowid, new.body);
END;
