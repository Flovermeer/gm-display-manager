CREATE TABLE campaign (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT NOT NULL DEFAULT '',
    system_key TEXT NOT NULL DEFAULT 'dnd5e' CHECK (length(trim(system_key)) > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX campaign_name_idx ON campaign (name COLLATE NOCASE);
