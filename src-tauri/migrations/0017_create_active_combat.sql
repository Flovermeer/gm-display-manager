CREATE TABLE active_combat (
    id TEXT PRIMARY KEY NOT NULL,
    campaign_id TEXT NOT NULL UNIQUE,
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE
);

CREATE TABLE combatant (
    id TEXT PRIMARY KEY NOT NULL,
    combat_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('player-character', 'npc', 'monster')),
    resource_id TEXT NOT NULL,
    display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
    initiative INTEGER NOT NULL DEFAULT 0,
    current_hit_points INTEGER,
    max_hit_points INTEGER,
    added_order INTEGER NOT NULL CHECK (added_order >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (combat_id) REFERENCES active_combat(id) ON DELETE CASCADE,
    CHECK (
        (kind = 'player-character' AND current_hit_points IS NULL AND max_hit_points IS NULL)
        OR
        (kind <> 'player-character'
            AND current_hit_points IS NOT NULL AND max_hit_points IS NOT NULL
            AND current_hit_points >= 0 AND max_hit_points > 0
            AND current_hit_points <= max_hit_points)
    ),
    UNIQUE (combat_id, added_order)
);

CREATE UNIQUE INDEX combatant_unique_character_idx
    ON combatant(combat_id, kind, resource_id)
    WHERE kind IN ('player-character', 'npc');

CREATE INDEX combatant_combat_order_idx
    ON combatant(combat_id, initiative DESC, added_order);
