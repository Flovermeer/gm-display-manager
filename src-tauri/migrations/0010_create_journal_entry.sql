CREATE TABLE journal_entry (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    npc_id TEXT,
    location_id TEXT,
    player_character_id TEXT,
    session_at TEXT NOT NULL,
    in_game_date TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    content_json TEXT NOT NULL,
    content_schema_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (npc_id) REFERENCES npc(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE,
    FOREIGN KEY (player_character_id) REFERENCES player_character(id) ON DELETE CASCADE,
    CHECK (
        (npc_id IS NOT NULL) +
        (location_id IS NOT NULL) +
        (player_character_id IS NOT NULL) <= 1
    )
);

CREATE INDEX journal_entry_campaign_session_idx
    ON journal_entry (campaign_id, session_at DESC, created_at DESC);

CREATE INDEX journal_entry_npc_idx ON journal_entry (npc_id, session_at DESC);
CREATE INDEX journal_entry_location_idx ON journal_entry (location_id, session_at DESC);
CREATE INDEX journal_entry_player_character_idx
    ON journal_entry (player_character_id, session_at DESC);

UPDATE npc SET notes = '';
UPDATE location SET notes = '';
UPDATE player_character
SET sheet_json = json_set(sheet_json, '$.privateNotes', '')
WHERE json_valid(sheet_json);
