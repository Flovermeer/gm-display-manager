CREATE TABLE game_system (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX game_system_name_idx ON game_system(name COLLATE NOCASE);

INSERT INTO game_system (id, name, deleted_at, created_at, updated_at)
VALUES ('dnd5e', 'Dungeons & Dragons 5e', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO game_system (id, name, deleted_at, created_at, updated_at)
SELECT DISTINCT system_key, system_key, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM campaign
WHERE system_key <> 'dnd5e';

CREATE TABLE game_universe (
    id TEXT PRIMARY KEY NOT NULL,
    game_system_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (game_system_id) REFERENCES game_system(id) ON DELETE CASCADE,
    UNIQUE (game_system_id, name COLLATE NOCASE)
);

CREATE INDEX game_universe_system_idx ON game_universe(game_system_id, name COLLATE NOCASE);

INSERT INTO game_universe (
    id, game_system_id, name, deleted_at, created_at, updated_at
)
VALUES (
    'forgotten-realms', 'dnd5e', 'Forgotten Realms', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO game_universe (
    id, game_system_id, name, deleted_at, created_at, updated_at
)
SELECT system_key || ':imported-universe', system_key, 'Univers importé', NULL,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM campaign
WHERE system_key <> 'dnd5e'
GROUP BY system_key;

ALTER TABLE campaign ADD COLUMN universe_id TEXT
    REFERENCES game_universe(id) ON DELETE CASCADE;

UPDATE campaign
SET universe_id = CASE
    WHEN system_key = 'dnd5e' THEN 'forgotten-realms'
    ELSE system_key || ':imported-universe'
END;

CREATE INDEX campaign_universe_name_idx
    ON campaign(universe_id, name COLLATE NOCASE);

CREATE TRIGGER campaign_universe_required_on_insert
BEFORE INSERT ON campaign
WHEN NEW.universe_id IS NULL
BEGIN
    SELECT RAISE(ABORT, 'campaign universe is required');
END;

CREATE TRIGGER campaign_universe_required_on_update
BEFORE UPDATE OF universe_id ON campaign
WHEN NEW.universe_id IS NULL
BEGIN
    SELECT RAISE(ABORT, 'campaign universe is required');
END;

CREATE TRIGGER campaign_universe_immutable
BEFORE UPDATE OF universe_id ON campaign
WHEN NEW.universe_id <> OLD.universe_id
BEGIN
    SELECT RAISE(ABORT, 'campaign universe cannot be changed');
END;

DROP TRIGGER IF EXISTS seed_item_configuration_after_campaign_insert;

ALTER TABLE scene_npc RENAME TO legacy_scene_npc;
ALTER TABLE scene_item RENAME TO legacy_scene_item;
ALTER TABLE scene RENAME TO legacy_scene;
ALTER TABLE journal_entry RENAME TO legacy_journal_entry;
ALTER TABLE narrative_item RENAME TO legacy_narrative_item;
ALTER TABLE item_type RENAME TO legacy_item_type;
ALTER TABLE item_rarity RENAME TO legacy_item_rarity;
ALTER TABLE npc RENAME TO legacy_npc;
ALTER TABLE location RENAME TO legacy_location;
ALTER TABLE player_character RENAME TO legacy_player_character;

DROP INDEX IF EXISTS npc_campaign_name_idx;
DROP INDEX IF EXISTS location_campaign_name_idx;
DROP INDEX IF EXISTS location_parent_idx;
DROP INDEX IF EXISTS player_character_campaign_name_idx;
DROP INDEX IF EXISTS narrative_item_campaign_name_idx;
DROP INDEX IF EXISTS narrative_item_type_idx;
DROP INDEX IF EXISTS narrative_item_rarity_idx;
DROP INDEX IF EXISTS scene_campaign_name_idx;
DROP INDEX IF EXISTS journal_entry_campaign_session_idx;
DROP INDEX IF EXISTS journal_entry_npc_idx;
DROP INDEX IF EXISTS journal_entry_location_idx;
DROP INDEX IF EXISTS journal_entry_player_character_idx;
DROP INDEX IF EXISTS journal_entry_item_idx;
DROP INDEX IF EXISTS journal_entry_scene_idx;

CREATE TABLE npc (
    id TEXT PRIMARY KEY NOT NULL,
    universe_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    portrait_path TEXT,
    idle_video_path TEXT,
    sheet_json TEXT NOT NULL DEFAULT '{}'
        CHECK (json_valid(sheet_json)),
    sheet_schema_version INTEGER NOT NULL DEFAULT 1
        CHECK (sheet_schema_version > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (universe_id) REFERENCES game_universe(id) ON DELETE CASCADE
);

CREATE INDEX npc_universe_name_idx ON npc(universe_id, name COLLATE NOCASE);

INSERT INTO npc (
    id, universe_id, name, portrait_path, idle_video_path, sheet_json,
    sheet_schema_version, created_at, updated_at
)
SELECT legacy.id, campaign.universe_id, legacy.name, legacy.portrait_path,
       legacy.idle_video_path, legacy.sheet_json, legacy.sheet_schema_version,
       legacy.created_at, legacy.updated_at
FROM legacy_npc AS legacy
JOIN campaign ON campaign.id = legacy.campaign_id;

CREATE TABLE campaign_npc (
    campaign_id TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'dead', 'retired', 'missing')),
    role_summary TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (campaign_id, npc_id),
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (npc_id) REFERENCES npc(id) ON DELETE NO ACTION
);

CREATE INDEX campaign_npc_name_idx ON campaign_npc(campaign_id, npc_id);

INSERT INTO campaign_npc (
    campaign_id, npc_id, status, role_summary, created_at, updated_at
)
SELECT campaign_id, id, status, summary, created_at, updated_at
FROM legacy_npc;

CREATE TABLE location (
    id TEXT PRIMARY KEY NOT NULL,
    universe_id TEXT NOT NULL,
    parent_location_id TEXT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    summary TEXT NOT NULL DEFAULT '',
    image_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (universe_id) REFERENCES game_universe(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_location_id) REFERENCES location(id) ON DELETE SET NULL,
    CHECK (parent_location_id IS NULL OR parent_location_id <> id)
);

CREATE INDEX location_universe_name_idx ON location(universe_id, name COLLATE NOCASE);
CREATE INDEX location_parent_idx ON location(parent_location_id);

INSERT INTO location (
    id, universe_id, parent_location_id, name, summary, image_path, created_at, updated_at
)
SELECT legacy.id, campaign.universe_id, legacy.parent_location_id, legacy.name,
       legacy.summary, legacy.image_path, legacy.created_at, legacy.updated_at
FROM legacy_location AS legacy
JOIN campaign ON campaign.id = legacy.campaign_id;

CREATE TABLE campaign_location (
    campaign_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (campaign_id, location_id),
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE NO ACTION
);

INSERT INTO campaign_location(campaign_id, location_id, created_at)
SELECT campaign_id, id, created_at FROM legacy_location;

CREATE TABLE player_character (
    id TEXT PRIMARY KEY NOT NULL,
    universe_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    max_hit_points INTEGER
        CHECK (max_hit_points IS NULL OR max_hit_points >= 0),
    portrait_path TEXT,
    sheet_json TEXT NOT NULL DEFAULT '{}'
        CHECK (json_valid(sheet_json)),
    sheet_schema_version INTEGER NOT NULL DEFAULT 1
        CHECK (sheet_schema_version > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (universe_id) REFERENCES game_universe(id) ON DELETE CASCADE
);

CREATE INDEX player_character_universe_name_idx
    ON player_character(universe_id, name COLLATE NOCASE);

INSERT INTO player_character (
    id, universe_id, name, max_hit_points, portrait_path, sheet_json,
    sheet_schema_version, created_at, updated_at
)
SELECT legacy.id, campaign.universe_id, legacy.name, legacy.max_hit_points,
       legacy.portrait_path, legacy.sheet_json, legacy.sheet_schema_version,
       legacy.created_at, legacy.updated_at
FROM legacy_player_character AS legacy
JOIN campaign ON campaign.id = legacy.campaign_id;

CREATE TABLE campaign_player_character (
    campaign_id TEXT NOT NULL,
    player_character_id TEXT NOT NULL,
    player_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'dead', 'retired', 'missing')),
    current_hit_points INTEGER
        CHECK (current_hit_points IS NULL OR current_hit_points >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (campaign_id, player_character_id),
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (player_character_id) REFERENCES player_character(id) ON DELETE NO ACTION
);

INSERT INTO campaign_player_character (
    campaign_id, player_character_id, player_name, status, current_hit_points,
    created_at, updated_at
)
SELECT campaign_id, id, player_name, status, current_hit_points, created_at, updated_at
FROM legacy_player_character;

CREATE TABLE item_type (
    id TEXT PRIMARY KEY NOT NULL,
    universe_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (universe_id) REFERENCES game_universe(id) ON DELETE CASCADE,
    UNIQUE (universe_id, name COLLATE NOCASE)
);

CREATE TABLE item_rarity (
    id TEXT PRIMARY KEY NOT NULL,
    universe_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (universe_id) REFERENCES game_universe(id) ON DELETE CASCADE,
    UNIQUE (universe_id, name COLLATE NOCASE)
);

INSERT INTO item_type(id, universe_id, name, created_at, updated_at)
SELECT MIN(legacy.id), campaign.universe_id, legacy.name,
       MIN(legacy.created_at), MAX(legacy.updated_at)
FROM legacy_item_type AS legacy
JOIN campaign ON campaign.id = legacy.campaign_id
GROUP BY campaign.universe_id, legacy.name COLLATE NOCASE;

INSERT INTO item_rarity(id, universe_id, name, created_at, updated_at)
SELECT MIN(legacy.id), campaign.universe_id, legacy.name,
       MIN(legacy.created_at), MAX(legacy.updated_at)
FROM legacy_item_rarity AS legacy
JOIN campaign ON campaign.id = legacy.campaign_id
GROUP BY campaign.universe_id, legacy.name COLLATE NOCASE;

INSERT OR IGNORE INTO item_type(id, universe_id, name, created_at, updated_at)
SELECT game_universe.id || ':item-type:' || defaults.slug, game_universe.id,
       defaults.name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM game_universe
CROSS JOIN (
    SELECT 'weapon' AS slug, 'Arme' AS name UNION ALL
    SELECT 'armor', 'Armure' UNION ALL
    SELECT 'ring', 'Anneau' UNION ALL
    SELECT 'wondrous-item', 'Objet merveilleux' UNION ALL
    SELECT 'document', 'Document' UNION ALL
    SELECT 'key', 'Clé'
) AS defaults;

INSERT OR IGNORE INTO item_rarity(id, universe_id, name, created_at, updated_at)
SELECT game_universe.id || ':item-rarity:' || defaults.slug, game_universe.id,
       defaults.name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM game_universe
CROSS JOIN (
    SELECT 'common' AS slug, 'Courant' AS name UNION ALL
    SELECT 'uncommon', 'Peu courant' UNION ALL
    SELECT 'rare', 'Rare' UNION ALL
    SELECT 'very-rare', 'Très rare' UNION ALL
    SELECT 'legendary', 'Légendaire' UNION ALL
    SELECT 'artifact', 'Artefact'
) AS defaults;

CREATE TABLE narrative_item (
    id TEXT PRIMARY KEY NOT NULL,
    universe_id TEXT NOT NULL,
    item_type_id TEXT NOT NULL,
    item_rarity_id TEXT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    attunement TEXT NOT NULL DEFAULT 'none'
        CHECK (attunement IN ('none', 'required', 'conditional')),
    attunement_condition TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    description_json TEXT NOT NULL CHECK (json_valid(description_json)),
    description_schema_version INTEGER NOT NULL DEFAULT 1,
    image_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (universe_id) REFERENCES game_universe(id) ON DELETE CASCADE,
    FOREIGN KEY (item_type_id) REFERENCES item_type(id) ON DELETE NO ACTION,
    FOREIGN KEY (item_rarity_id) REFERENCES item_rarity(id) ON DELETE NO ACTION,
    CHECK (attunement = 'conditional' OR length(attunement_condition) = 0)
);

CREATE INDEX narrative_item_universe_name_idx
    ON narrative_item(universe_id, name COLLATE NOCASE);
CREATE INDEX narrative_item_type_idx ON narrative_item(item_type_id);
CREATE INDEX narrative_item_rarity_idx ON narrative_item(item_rarity_id);

INSERT INTO narrative_item (
    id, universe_id, item_type_id, item_rarity_id, name, attunement,
    attunement_condition, summary, description_json, description_schema_version,
    image_path, created_at, updated_at
)
SELECT legacy.id, campaign.universe_id, canonical_type.id, canonical_rarity.id,
       legacy.name, legacy.attunement, legacy.attunement_condition, legacy.summary,
       legacy.description_json, legacy.description_schema_version, legacy.image_path,
       legacy.created_at, legacy.updated_at
FROM legacy_narrative_item AS legacy
JOIN campaign ON campaign.id = legacy.campaign_id
JOIN legacy_item_type AS legacy_type ON legacy_type.id = legacy.item_type_id
JOIN item_type AS canonical_type
  ON canonical_type.universe_id = campaign.universe_id
 AND canonical_type.name = legacy_type.name COLLATE NOCASE
LEFT JOIN legacy_item_rarity AS legacy_rarity ON legacy_rarity.id = legacy.item_rarity_id
LEFT JOIN item_rarity AS canonical_rarity
  ON canonical_rarity.universe_id = campaign.universe_id
 AND canonical_rarity.name = legacy_rarity.name COLLATE NOCASE;

CREATE TABLE campaign_narrative_item (
    campaign_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'lost', 'destroyed', 'retired')),
    owner_npc_id TEXT,
    owner_location_id TEXT,
    owner_player_character_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (campaign_id, item_id),
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES narrative_item(id) ON DELETE NO ACTION,
    FOREIGN KEY (owner_npc_id) REFERENCES npc(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_location_id) REFERENCES location(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_player_character_id) REFERENCES player_character(id) ON DELETE SET NULL,
    CHECK (
        (owner_npc_id IS NOT NULL) +
        (owner_location_id IS NOT NULL) +
        (owner_player_character_id IS NOT NULL) <= 1
    )
);

INSERT INTO campaign_narrative_item (
    campaign_id, item_id, status, owner_npc_id, owner_location_id,
    owner_player_character_id, created_at, updated_at
)
SELECT campaign_id, id, status, owner_npc_id, owner_location_id,
       owner_player_character_id, created_at, updated_at
FROM legacy_narrative_item;

CREATE TABLE scene (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    summary TEXT NOT NULL DEFAULT '',
    location_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE NO ACTION
);

CREATE INDEX scene_campaign_name_idx ON scene(campaign_id, name COLLATE NOCASE);

INSERT INTO scene(id, campaign_id, name, summary, location_id, created_at, updated_at)
SELECT id, campaign_id, name, summary, location_id, created_at, updated_at
FROM legacy_scene;

CREATE TABLE scene_npc (
    scene_id TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    PRIMARY KEY (scene_id, npc_id),
    FOREIGN KEY (scene_id) REFERENCES scene(id) ON DELETE CASCADE,
    FOREIGN KEY (npc_id) REFERENCES npc(id) ON DELETE NO ACTION
);

INSERT INTO scene_npc(scene_id, npc_id)
SELECT scene_id, npc_id FROM legacy_scene_npc;

CREATE TABLE scene_item (
    scene_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    PRIMARY KEY (scene_id, item_id),
    FOREIGN KEY (scene_id) REFERENCES scene(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES narrative_item(id) ON DELETE NO ACTION
);

INSERT INTO scene_item(scene_id, item_id)
SELECT scene_id, item_id FROM legacy_scene_item;

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
    CHECK (
        (npc_id IS NOT NULL) + (location_id IS NOT NULL) +
        (player_character_id IS NOT NULL) + (item_id IS NOT NULL) +
        (scene_id IS NOT NULL) <= 1
    )
);

INSERT INTO journal_entry (
    id, campaign_id, npc_id, location_id, player_character_id, item_id, scene_id,
    session_at, in_game_date, title, content_json, content_schema_version,
    created_at, updated_at
)
SELECT id, campaign_id, npc_id, location_id, player_character_id, item_id, scene_id,
       session_at, in_game_date, title, content_json, content_schema_version,
       created_at, updated_at
FROM legacy_journal_entry;

CREATE INDEX journal_entry_campaign_session_idx
    ON journal_entry(campaign_id, session_at DESC, created_at DESC);
CREATE INDEX journal_entry_npc_idx ON journal_entry(npc_id, session_at DESC);
CREATE INDEX journal_entry_location_idx ON journal_entry(location_id, session_at DESC);
CREATE INDEX journal_entry_player_character_idx
    ON journal_entry(player_character_id, session_at DESC);
CREATE INDEX journal_entry_item_idx ON journal_entry(item_id, session_at DESC);
CREATE INDEX journal_entry_scene_idx ON journal_entry(scene_id, session_at DESC);

DROP TABLE legacy_scene_npc;
DROP TABLE legacy_scene_item;
DROP TABLE legacy_journal_entry;
DROP TABLE legacy_scene;
DROP TABLE legacy_narrative_item;
DROP TABLE legacy_item_type;
DROP TABLE legacy_item_rarity;
DROP TABLE legacy_npc;
DROP TABLE legacy_location;
DROP TABLE legacy_player_character;

CREATE TRIGGER seed_item_configuration_after_universe_insert
AFTER INSERT ON game_universe
BEGIN
    INSERT INTO item_type(id, universe_id, name, created_at, updated_at) VALUES
        (NEW.id || ':item-type:weapon', NEW.id, 'Arme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:armor', NEW.id, 'Armure', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:ring', NEW.id, 'Anneau', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:wondrous-item', NEW.id, 'Objet merveilleux', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:document', NEW.id, 'Document', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:key', NEW.id, 'Clé', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO item_rarity(id, universe_id, name, created_at, updated_at) VALUES
        (NEW.id || ':item-rarity:common', NEW.id, 'Courant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:uncommon', NEW.id, 'Peu courant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:rare', NEW.id, 'Rare', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:very-rare', NEW.id, 'Très rare', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:legendary', NEW.id, 'Légendaire', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:artifact', NEW.id, 'Artefact', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END;
