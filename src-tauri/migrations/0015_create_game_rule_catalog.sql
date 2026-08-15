CREATE TABLE game_rule_option (
    id TEXT PRIMARY KEY NOT NULL,
    game_system_id TEXT NOT NULL,
    universe_id TEXT,
    category TEXT NOT NULL CHECK (
        category IN ('alignment', 'size', 'creature_type', 'creature_subspecies', 'language')
    ),
    parent_option_id TEXT,
    code TEXT NOT NULL CHECK (length(trim(code)) > 0),
    label TEXT NOT NULL CHECK (length(trim(label)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (game_system_id) REFERENCES game_system(id) ON DELETE CASCADE,
    FOREIGN KEY (universe_id) REFERENCES game_universe(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_option_id) REFERENCES game_rule_option(id) ON DELETE NO ACTION,
    CHECK (category = 'creature_subspecies' OR parent_option_id IS NULL),
    CHECK (category NOT IN ('alignment', 'size') OR universe_id IS NULL)
);

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

INSERT INTO game_rule_option(
    id, game_system_id, universe_id, category, parent_option_id, code, label,
    created_at, updated_at
) VALUES
    ('dnd5e:alignment:lb', 'dnd5e', NULL, 'alignment', NULL, 'LB', 'Loyal bon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:alignment:nb', 'dnd5e', NULL, 'alignment', NULL, 'NB', 'Neutre bon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:alignment:cb', 'dnd5e', NULL, 'alignment', NULL, 'CB', 'Chaotique bon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:alignment:ln', 'dnd5e', NULL, 'alignment', NULL, 'LN', 'Loyal neutre', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:alignment:n', 'dnd5e', NULL, 'alignment', NULL, 'N', 'Neutre', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:alignment:cn', 'dnd5e', NULL, 'alignment', NULL, 'CN', 'Chaotique neutre', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:alignment:lm', 'dnd5e', NULL, 'alignment', NULL, 'LM', 'Loyal mauvais', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:alignment:nm', 'dnd5e', NULL, 'alignment', NULL, 'NM', 'Neutre mauvais', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:alignment:cm', 'dnd5e', NULL, 'alignment', NULL, 'CM', 'Chaotique mauvais', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:size:tp', 'dnd5e', NULL, 'size', NULL, 'TP', 'Très petite', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:size:p', 'dnd5e', NULL, 'size', NULL, 'P', 'Petite', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:size:m', 'dnd5e', NULL, 'size', NULL, 'M', 'Moyenne', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:size:g', 'dnd5e', NULL, 'size', NULL, 'G', 'Grande', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:size:tg', 'dnd5e', NULL, 'size', NULL, 'TG', 'Très grande', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:size:gi', 'dnd5e', NULL, 'size', NULL, 'Gig', 'Gigantesque', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:aberration', 'dnd5e', NULL, 'creature_type', NULL, 'aberration', 'Aberration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:beast', 'dnd5e', NULL, 'creature_type', NULL, 'beast', 'Bête', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:celestial', 'dnd5e', NULL, 'creature_type', NULL, 'celestial', 'Céleste', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:construct', 'dnd5e', NULL, 'creature_type', NULL, 'construct', 'Créature artificielle', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:dragon', 'dnd5e', NULL, 'creature_type', NULL, 'dragon', 'Dragon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:elemental', 'dnd5e', NULL, 'creature_type', NULL, 'elemental', 'Élémentaire', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:fey', 'dnd5e', NULL, 'creature_type', NULL, 'fey', 'Fée', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:fiend', 'dnd5e', NULL, 'creature_type', NULL, 'fiend', 'Fiélon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:giant', 'dnd5e', NULL, 'creature_type', NULL, 'giant', 'Géant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:humanoid', 'dnd5e', NULL, 'creature_type', NULL, 'humanoid', 'Humanoïde', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:monstrosity', 'dnd5e', NULL, 'creature_type', NULL, 'monstrosity', 'Monstruosité', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:ooze', 'dnd5e', NULL, 'creature_type', NULL, 'ooze', 'Vase', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:plant', 'dnd5e', NULL, 'creature_type', NULL, 'plant', 'Plante', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:type:undead', 'dnd5e', NULL, 'creature_type', NULL, 'undead', 'Mort-vivant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:common', 'dnd5e', NULL, 'language', NULL, 'common', 'Commun', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:dwarvish', 'dnd5e', NULL, 'language', NULL, 'dwarvish', 'Nain', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:elvish', 'dnd5e', NULL, 'language', NULL, 'elvish', 'Elfique', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:giant', 'dnd5e', NULL, 'language', NULL, 'giant', 'Géant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:gnomish', 'dnd5e', NULL, 'language', NULL, 'gnomish', 'Gnome', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:goblin', 'dnd5e', NULL, 'language', NULL, 'goblin', 'Gobelin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:halfling', 'dnd5e', NULL, 'language', NULL, 'halfling', 'Halfelin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:orc', 'dnd5e', NULL, 'language', NULL, 'orc', 'Orc', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:abyssal', 'dnd5e', NULL, 'language', NULL, 'abyssal', 'Abyssal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:celestial', 'dnd5e', NULL, 'language', NULL, 'celestial', 'Céleste', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:draconic', 'dnd5e', NULL, 'language', NULL, 'draconic', 'Draconique', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:deep-speech', 'dnd5e', NULL, 'language', NULL, 'deep-speech', 'Profond', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:infernal', 'dnd5e', NULL, 'language', NULL, 'infernal', 'Infernal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:primordial', 'dnd5e', NULL, 'language', NULL, 'primordial', 'Primordial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:sylvan', 'dnd5e', NULL, 'language', NULL, 'sylvan', 'Sylvestre', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dnd5e:language:undercommon', 'dnd5e', NULL, 'language', NULL, 'undercommon', 'Commun des profondeurs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
