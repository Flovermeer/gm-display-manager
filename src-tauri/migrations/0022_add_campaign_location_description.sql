ALTER TABLE campaign_location
ADD COLUMN description_json TEXT NOT NULL
    DEFAULT '{"schemaVersion":1,"content":{"type":"doc","content":[{"type":"paragraph"}]}}'
    CHECK (json_valid(description_json));
