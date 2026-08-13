CREATE TABLE scene (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    summary TEXT NOT NULL DEFAULT '',
    location_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE SET NULL
);

CREATE INDEX scene_campaign_name_idx ON scene(campaign_id, name COLLATE NOCASE);

CREATE TABLE scene_npc (
    scene_id TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    PRIMARY KEY (scene_id, npc_id),
    FOREIGN KEY (scene_id) REFERENCES scene(id) ON DELETE CASCADE,
    FOREIGN KEY (npc_id) REFERENCES npc(id) ON DELETE CASCADE
);

CREATE TABLE scene_item (
    scene_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    PRIMARY KEY (scene_id, item_id),
    FOREIGN KEY (scene_id) REFERENCES scene(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES narrative_item(id) ON DELETE CASCADE
);

ALTER TABLE journal_entry RENAME TO journal_entry_v11;

CREATE TABLE journal_entry (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    npc_id TEXT,
    location_id TEXT,
    player_character_id TEXT,
    item_id TEXT,
    scene_id TEXT,
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
    FOREIGN KEY (item_id) REFERENCES narrative_item(id) ON DELETE CASCADE,
    FOREIGN KEY (scene_id) REFERENCES scene(id) ON DELETE CASCADE,
    CHECK (
        (npc_id IS NOT NULL) + (location_id IS NOT NULL) +
        (player_character_id IS NOT NULL) + (item_id IS NOT NULL) +
        (scene_id IS NOT NULL) <= 1
    )
);

INSERT INTO journal_entry (
    id, campaign_id, npc_id, location_id, player_character_id, item_id, scene_id,
    session_at, in_game_date, title, content_json, content_schema_version, created_at, updated_at
)
SELECT id, campaign_id, npc_id, location_id, player_character_id, item_id, NULL,
       session_at, in_game_date, title, content_json, content_schema_version, created_at, updated_at
FROM journal_entry_v11;

DROP TABLE journal_entry_v11;

CREATE INDEX journal_entry_campaign_session_idx
    ON journal_entry (campaign_id, session_at DESC, created_at DESC);
CREATE INDEX journal_entry_npc_idx ON journal_entry (npc_id, session_at DESC);
CREATE INDEX journal_entry_location_idx ON journal_entry (location_id, session_at DESC);
CREATE INDEX journal_entry_player_character_idx
    ON journal_entry (player_character_id, session_at DESC);
CREATE INDEX journal_entry_item_idx ON journal_entry (item_id, session_at DESC);
CREATE INDEX journal_entry_scene_idx ON journal_entry (scene_id, session_at DESC);
