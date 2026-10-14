ALTER TABLE scene ADD COLUMN description_json TEXT NOT NULL
    DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'
    CHECK (json_valid(description_json));

ALTER TABLE scene ADD COLUMN description_schema_version INTEGER NOT NULL DEFAULT 1
    CHECK (description_schema_version > 0);
