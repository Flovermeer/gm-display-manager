PRAGMA defer_foreign_keys = ON;

DROP TRIGGER game_rule_option_universe_matches_system_on_insert;
DROP TRIGGER game_rule_option_parent_is_creature_type_on_insert;

ALTER TABLE game_rule_option RENAME TO game_rule_option_legacy;

CREATE TABLE game_rule_option (
    id TEXT PRIMARY KEY NOT NULL,
    game_system_id TEXT NOT NULL,
    universe_id TEXT,
    category TEXT NOT NULL CHECK (
        category IN (
            'alignment',
            'size',
            'creature_type',
            'creature_subspecies',
            'language',
            'race',
            'subrace',
            'class'
        )
    ),
    parent_option_id TEXT,
    code TEXT NOT NULL CHECK (length(trim(code)) > 0),
    label TEXT NOT NULL CHECK (length(trim(label)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (game_system_id) REFERENCES game_system(id) ON DELETE CASCADE,
    FOREIGN KEY (universe_id) REFERENCES game_universe(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_option_id) REFERENCES game_rule_option(id) ON DELETE NO ACTION,
    CHECK (category IN ('creature_subspecies', 'subrace') OR parent_option_id IS NULL),
    CHECK (category NOT IN ('alignment', 'size') OR universe_id IS NULL),
    CHECK (category NOT IN ('race', 'subrace', 'class') OR universe_id IS NOT NULL)
);

INSERT INTO game_rule_option(
    id, game_system_id, universe_id, category, parent_option_id, code, label,
    created_at, updated_at
)
SELECT
    id, game_system_id, universe_id, category, parent_option_id, code, label,
    created_at, updated_at
FROM game_rule_option_legacy;

DROP TABLE game_rule_option_legacy;

CREATE UNIQUE INDEX game_rule_option_scope_code_idx
    ON game_rule_option(
        game_system_id,
        COALESCE(universe_id, ''),
        category,
        code COLLATE NOCASE
    );

CREATE INDEX game_rule_option_catalog_idx
    ON game_rule_option(game_system_id, universe_id, category, label COLLATE NOCASE);

CREATE INDEX game_rule_option_parent_idx
    ON game_rule_option(parent_option_id, label COLLATE NOCASE);

CREATE TRIGGER game_rule_option_universe_matches_system_on_insert
BEFORE INSERT ON game_rule_option
WHEN NEW.universe_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM game_universe
    WHERE id = NEW.universe_id AND game_system_id = NEW.game_system_id
)
BEGIN
    SELECT RAISE(ABORT, 'rule option universe must belong to its game system');
END;

CREATE TRIGGER game_rule_option_parent_is_creature_type_on_insert
BEFORE INSERT ON game_rule_option
WHEN NEW.category = 'creature_subspecies' AND (
    NEW.parent_option_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM game_rule_option AS parent
        WHERE parent.id = NEW.parent_option_id
          AND parent.category = 'creature_type'
          AND parent.game_system_id = NEW.game_system_id
          AND (parent.universe_id IS NULL OR parent.universe_id = NEW.universe_id)
    )
)
BEGIN
    SELECT RAISE(ABORT, 'creature subspecies requires an available creature type');
END;

CREATE TRIGGER game_rule_option_parent_is_race_on_insert
BEFORE INSERT ON game_rule_option
WHEN NEW.category = 'subrace' AND (
    NEW.parent_option_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM game_rule_option AS parent
        WHERE parent.id = NEW.parent_option_id
          AND parent.category = 'race'
          AND parent.game_system_id = NEW.game_system_id
          AND (
              parent.universe_id = NEW.universe_id
              OR parent.universe_id = NEW.game_system_id || ':generic'
          )
    )
)
BEGIN
    SELECT RAISE(ABORT, 'character subspecies requires an available species');
END;
