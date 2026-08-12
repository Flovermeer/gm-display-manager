CREATE TABLE npc (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'dead', 'retired', 'missing')),
    summary TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    sheet_json TEXT NOT NULL DEFAULT '{}'
        CHECK (json_valid(sheet_json)),
    sheet_schema_version INTEGER NOT NULL DEFAULT 1
        CHECK (sheet_schema_version > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaign (id) ON DELETE CASCADE
);

CREATE INDEX npc_campaign_name_idx
    ON npc (campaign_id, name COLLATE NOCASE);
