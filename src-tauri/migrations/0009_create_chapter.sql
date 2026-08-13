CREATE TABLE chapter (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    summary TEXT NOT NULL DEFAULT '',
    content_json TEXT NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'
        CHECK (json_valid(content_json)),
    content_schema_version INTEGER NOT NULL DEFAULT 1
        CHECK (content_schema_version > 0),
    position INTEGER NOT NULL DEFAULT 0
        CHECK (position >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaign (id) ON DELETE CASCADE
);

CREATE INDEX chapter_campaign_position_idx
    ON chapter (campaign_id, position, title COLLATE NOCASE);
