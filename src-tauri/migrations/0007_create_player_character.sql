CREATE TABLE player_character (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    player_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'dead', 'retired', 'missing')),
    current_hit_points INTEGER
        CHECK (current_hit_points IS NULL OR current_hit_points >= 0),
    max_hit_points INTEGER
        CHECK (max_hit_points IS NULL OR max_hit_points >= 0),
    sheet_json TEXT NOT NULL DEFAULT '{}'
        CHECK (json_valid(sheet_json)),
    sheet_schema_version INTEGER NOT NULL DEFAULT 1
        CHECK (sheet_schema_version > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaign (id) ON DELETE CASCADE
);

CREATE INDEX player_character_campaign_name_idx
    ON player_character (campaign_id, name COLLATE NOCASE);
