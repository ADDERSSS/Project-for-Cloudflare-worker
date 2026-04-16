-- Bookmarks
CREATE TABLE bookmarks (
  id             TEXT PRIMARY KEY,
  url            TEXT NOT NULL,
  title          TEXT NOT NULL DEFAULT '',
  description    TEXT DEFAULT '',
  favicon_key    TEXT,
  screenshot_key TEXT,
  is_archived    INTEGER DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_bookmarks_created ON bookmarks(created_at DESC);
CREATE INDEX idx_bookmarks_url ON bookmarks(url);

-- Tags
CREATE TABLE tags (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1'
);

-- Many-to-many: bookmark <-> tag
CREATE TABLE bookmark_tags (
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (bookmark_id, tag_id)
);

-- Short links
CREATE TABLE short_links (
  code        TEXT PRIMARY KEY,
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  expires_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Click/visit log (append-only)
CREATE TABLE click_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  short_code  TEXT,
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  clicked_at  TEXT NOT NULL DEFAULT (datetime('now')),
  user_agent  TEXT,
  referer     TEXT,
  country     TEXT
);
CREATE INDEX idx_clicks_bookmark ON click_logs(bookmark_id, clicked_at DESC);
CREATE INDEX idx_clicks_date ON click_logs(clicked_at);

-- Daily stats aggregate (populated by cron)
CREATE TABLE daily_stats (
  date        TEXT NOT NULL,
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  clicks      INTEGER DEFAULT 0,
  PRIMARY KEY (date, bookmark_id)
);
