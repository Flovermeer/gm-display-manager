CREATE TABLE item_type (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    UNIQUE (campaign_id, name COLLATE NOCASE)
);

CREATE TABLE item_rarity (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    UNIQUE (campaign_id, name COLLATE NOCASE)
);

CREATE TABLE narrative_item (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    item_type_id TEXT NOT NULL,
    item_rarity_id TEXT,
    owner_npc_id TEXT,
    owner_location_id TEXT,
    owner_player_character_id TEXT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'lost', 'destroyed', 'retired')),
    attunement TEXT NOT NULL DEFAULT 'none'
        CHECK (attunement IN ('none', 'required', 'conditional')),
    attunement_condition TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    description_json TEXT NOT NULL,
    description_schema_version INTEGER NOT NULL DEFAULT 1,
    image_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (item_type_id) REFERENCES item_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (item_rarity_id) REFERENCES item_rarity(id) ON DELETE RESTRICT,
    FOREIGN KEY (owner_npc_id) REFERENCES npc(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_location_id) REFERENCES location(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_player_character_id) REFERENCES player_character(id) ON DELETE SET NULL,
    CHECK (
        (owner_npc_id IS NOT NULL) +
        (owner_location_id IS NOT NULL) +
        (owner_player_character_id IS NOT NULL) <= 1
    ),
    CHECK (attunement = 'conditional' OR length(attunement_condition) = 0)
);

CREATE INDEX narrative_item_campaign_name_idx
    ON narrative_item(campaign_id, name COLLATE NOCASE);
CREATE INDEX narrative_item_type_idx ON narrative_item(item_type_id);
CREATE INDEX narrative_item_rarity_idx ON narrative_item(item_rarity_id);

INSERT INTO item_type (id, campaign_id, name, created_at, updated_at)
SELECT campaign.id || ':item-type:' || defaults.slug, campaign.id, defaults.name,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM campaign
CROSS JOIN (
    SELECT 'weapon' AS slug, 'Arme' AS name UNION ALL
    SELECT 'armor', 'Armure' UNION ALL
    SELECT 'ring', 'Anneau' UNION ALL
    SELECT 'wondrous-item', 'Objet merveilleux' UNION ALL
    SELECT 'document', 'Document' UNION ALL
    SELECT 'key', 'Clé'
) AS defaults;

INSERT INTO item_rarity (id, campaign_id, name, created_at, updated_at)
SELECT campaign.id || ':item-rarity:' || defaults.slug, campaign.id, defaults.name,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM campaign
CROSS JOIN (
    SELECT 'common' AS slug, 'Courant' AS name UNION ALL
    SELECT 'uncommon', 'Peu courant' UNION ALL
    SELECT 'rare', 'Rare' UNION ALL
    SELECT 'very-rare', 'Très rare' UNION ALL
    SELECT 'legendary', 'Légendaire' UNION ALL
    SELECT 'artifact', 'Artefact'
) AS defaults;

CREATE TRIGGER seed_item_configuration_after_campaign_insert
AFTER INSERT ON campaign
BEGIN
    INSERT INTO item_type (id, campaign_id, name, created_at, updated_at) VALUES
        (NEW.id || ':item-type:weapon', NEW.id, 'Arme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:armor', NEW.id, 'Armure', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:ring', NEW.id, 'Anneau', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:wondrous-item', NEW.id, 'Objet merveilleux', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:document', NEW.id, 'Document', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-type:key', NEW.id, 'Clé', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO item_rarity (id, campaign_id, name, created_at, updated_at) VALUES
        (NEW.id || ':item-rarity:common', NEW.id, 'Courant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:uncommon', NEW.id, 'Peu courant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:rare', NEW.id, 'Rare', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:very-rare', NEW.id, 'Très rare', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:legendary', NEW.id, 'Légendaire', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (NEW.id || ':item-rarity:artifact', NEW.id, 'Artefact', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END;

ALTER TABLE journal_entry RENAME TO journal_entry_v10;

CREATE TABLE journal_entry (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL,
    npc_id TEXT,
    location_id TEXT,
    player_character_id TEXT,
    item_id TEXT,
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
    CHECK (
        (npc_id IS NOT NULL) +
        (location_id IS NOT NULL) +
        (player_character_id IS NOT NULL) +
        (item_id IS NOT NULL) <= 1
    )
);

INSERT INTO journal_entry (
    id, campaign_id, npc_id, location_id, player_character_id, item_id, session_at,
    in_game_date, title, content_json, content_schema_version, created_at, updated_at
)
SELECT id, campaign_id, npc_id, location_id, player_character_id, NULL, session_at,
       in_game_date, title, content_json, content_schema_version, created_at, updated_at
FROM journal_entry_v10;

DROP TABLE journal_entry_v10;

CREATE INDEX journal_entry_campaign_session_idx
    ON journal_entry (campaign_id, session_at DESC, created_at DESC);
CREATE INDEX journal_entry_npc_idx ON journal_entry (npc_id, session_at DESC);
CREATE INDEX journal_entry_location_idx ON journal_entry (location_id, session_at DESC);
CREATE INDEX journal_entry_player_character_idx
    ON journal_entry (player_character_id, session_at DESC);
CREATE INDEX journal_entry_item_idx ON journal_entry (item_id, session_at DESC);
