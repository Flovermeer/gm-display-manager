CREATE TABLE monster (
    id TEXT PRIMARY KEY NOT NULL,
    universe_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    image_path TEXT,
    sheet_json TEXT NOT NULL DEFAULT '{}'
        CHECK (json_valid(sheet_json)),
    sheet_schema_version INTEGER NOT NULL DEFAULT 1
        CHECK (sheet_schema_version > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (universe_id) REFERENCES game_universe(id) ON DELETE CASCADE
);

CREATE INDEX monster_universe_name_idx ON monster(universe_id, name COLLATE NOCASE);

CREATE TABLE campaign_monster (
    campaign_id TEXT NOT NULL,
    monster_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (campaign_id, monster_id),
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (monster_id) REFERENCES monster(id) ON DELETE NO ACTION
);

CREATE INDEX campaign_monster_monster_idx ON campaign_monster(monster_id, campaign_id);

CREATE TABLE scene_monster (
    scene_id TEXT NOT NULL,
    monster_id TEXT NOT NULL,
    PRIMARY KEY (scene_id, monster_id),
    FOREIGN KEY (scene_id) REFERENCES scene(id) ON DELETE CASCADE,
    FOREIGN KEY (monster_id) REFERENCES monster(id) ON DELETE NO ACTION
);

ALTER TABLE journal_entry RENAME TO legacy_journal_entry_v13;

DROP INDEX IF EXISTS journal_entry_campaign_session_idx;
DROP INDEX IF EXISTS journal_entry_npc_idx;
DROP INDEX IF EXISTS journal_entry_location_idx;
DROP INDEX IF EXISTS journal_entry_player_character_idx;
DROP INDEX IF EXISTS journal_entry_item_idx;
DROP INDEX IF EXISTS journal_entry_scene_idx;

CREATE TABLE journal_entry (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    npc_id TEXT,
    location_id TEXT,
    player_character_id TEXT,
    item_id TEXT,
    scene_id TEXT,
    monster_id TEXT,
    session_at TEXT NOT NULL,
    in_game_date TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    content_json TEXT NOT NULL CHECK (json_valid(content_json)),
    content_schema_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (npc_id) REFERENCES npc(id) ON DELETE NO ACTION,
    FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE NO ACTION,
    FOREIGN KEY (player_character_id) REFERENCES player_character(id) ON DELETE NO ACTION,
    FOREIGN KEY (item_id) REFERENCES narrative_item(id) ON DELETE NO ACTION,
    FOREIGN KEY (scene_id) REFERENCES scene(id) ON DELETE NO ACTION,
    FOREIGN KEY (monster_id) REFERENCES monster(id) ON DELETE NO ACTION,
    CHECK (
        (npc_id IS NOT NULL) + (location_id IS NOT NULL) +
        (player_character_id IS NOT NULL) + (item_id IS NOT NULL) +
        (scene_id IS NOT NULL) + (monster_id IS NOT NULL) <= 1
    )
);

INSERT INTO journal_entry (
    id, campaign_id, npc_id, location_id, player_character_id, item_id, scene_id,
    monster_id, session_at, in_game_date, title, content_json,
    content_schema_version, created_at, updated_at
)
SELECT id, campaign_id, npc_id, location_id, player_character_id, item_id, scene_id,
       NULL, session_at, in_game_date, title, content_json,
       content_schema_version, created_at, updated_at
FROM legacy_journal_entry_v13;

DROP TABLE legacy_journal_entry_v13;

CREATE INDEX journal_entry_campaign_session_idx
    ON journal_entry(campaign_id, session_at DESC, created_at DESC);
CREATE INDEX journal_entry_npc_idx ON journal_entry(npc_id, session_at DESC);
CREATE INDEX journal_entry_location_idx ON journal_entry(location_id, session_at DESC);
CREATE INDEX journal_entry_player_character_idx
    ON journal_entry(player_character_id, session_at DESC);
CREATE INDEX journal_entry_item_idx ON journal_entry(item_id, session_at DESC);
CREATE INDEX journal_entry_scene_idx ON journal_entry(scene_id, session_at DESC);
CREATE INDEX journal_entry_monster_idx ON journal_entry(monster_id, session_at DESC);
