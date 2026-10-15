INSERT OR IGNORE INTO game_universe (
    id, game_system_id, name, deleted_at, created_at, updated_at
)
SELECT id || ':generic', id, name || ' (générique)', NULL,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM game_system;
