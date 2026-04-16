ALTER TABLE bookmarks ADD COLUMN ai_summary TEXT;
ALTER TABLE bookmarks ADD COLUMN ai_tags_suggested TEXT;
ALTER TABLE bookmarks ADD COLUMN ai_status TEXT DEFAULT 'pending';
ALTER TABLE bookmarks ADD COLUMN ai_processed_at TEXT;
