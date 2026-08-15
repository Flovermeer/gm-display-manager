ALTER TABLE npc ADD COLUMN source_campaign_id TEXT
    REFERENCES campaign(id) ON DELETE CASCADE;
ALTER TABLE npc ADD COLUMN deleted_at TEXT;

ALTER TABLE location ADD COLUMN source_campaign_id TEXT
    REFERENCES campaign(id) ON DELETE CASCADE;
ALTER TABLE location ADD COLUMN deleted_at TEXT;

ALTER TABLE player_character ADD COLUMN source_campaign_id TEXT
    REFERENCES campaign(id) ON DELETE CASCADE;
ALTER TABLE player_character ADD COLUMN deleted_at TEXT;

ALTER TABLE narrative_item ADD COLUMN source_campaign_id TEXT
    REFERENCES campaign(id) ON DELETE CASCADE;
ALTER TABLE narrative_item ADD COLUMN deleted_at TEXT;

ALTER TABLE monster ADD COLUMN source_campaign_id TEXT
    REFERENCES campaign(id) ON DELETE CASCADE;
ALTER TABLE monster ADD COLUMN deleted_at TEXT;

UPDATE npc
SET source_campaign_id = (
    SELECT campaign_id FROM campaign_npc
    WHERE campaign_npc.npc_id = npc.id
    ORDER BY campaign_npc.created_at, campaign_npc.campaign_id LIMIT 1
);

UPDATE location
SET source_campaign_id = (
    SELECT campaign_id FROM campaign_location
    WHERE campaign_location.location_id = location.id
    ORDER BY campaign_location.created_at, campaign_location.campaign_id LIMIT 1
);

UPDATE player_character
SET source_campaign_id = (
    SELECT campaign_id FROM campaign_player_character
    WHERE campaign_player_character.player_character_id = player_character.id
    ORDER BY campaign_player_character.created_at, campaign_player_character.campaign_id LIMIT 1
);

UPDATE narrative_item
SET source_campaign_id = (
    SELECT campaign_id FROM campaign_narrative_item
    WHERE campaign_narrative_item.item_id = narrative_item.id
    ORDER BY campaign_narrative_item.created_at, campaign_narrative_item.campaign_id LIMIT 1
);

UPDATE monster
SET source_campaign_id = (
    SELECT campaign_id FROM campaign_monster
    WHERE campaign_monster.monster_id = monster.id
    ORDER BY campaign_monster.created_at, campaign_monster.campaign_id LIMIT 1
);

CREATE INDEX npc_source_campaign_idx ON npc(source_campaign_id, deleted_at);
CREATE INDEX location_source_campaign_idx ON location(source_campaign_id, deleted_at);
CREATE INDEX player_character_source_campaign_idx
    ON player_character(source_campaign_id, deleted_at);
CREATE INDEX narrative_item_source_campaign_idx
    ON narrative_item(source_campaign_id, deleted_at);
CREATE INDEX monster_source_campaign_idx ON monster(source_campaign_id, deleted_at);

CREATE TABLE campaign_resource_override (
    campaign_id TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (
        resource_type IN ('npc', 'location', 'player_character', 'narrative_item', 'monster')
    ),
    resource_id TEXT NOT NULL,
    snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (campaign_id, resource_type, resource_id),
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE
);

CREATE INDEX campaign_resource_override_resource_idx
    ON campaign_resource_override(resource_type, resource_id, campaign_id);
