CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE collection_bookmarks (
  collection_id TEXT NOT NULL,
  bookmark_id TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, bookmark_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
);

ALTER TABLE bookmarks ADD COLUMN accent_color TEXT;
