CREATE TABLE location (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    parent_location_id TEXT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    summary TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    image_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaign (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_location_id) REFERENCES location (id) ON DELETE SET NULL,
    CHECK (parent_location_id IS NULL OR parent_location_id <> id)
);

CREATE INDEX location_campaign_name_idx
    ON location (campaign_id, name COLLATE NOCASE);

CREATE INDEX location_parent_idx
    ON location (parent_location_id);
