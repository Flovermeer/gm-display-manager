CREATE TABLE random_table (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  entries_json TEXT NOT NULL DEFAULT '[]',
  entry_schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE
);

CREATE INDEX random_table_campaign_name_idx
  ON random_table(campaign_id, name COLLATE NOCASE, id);
