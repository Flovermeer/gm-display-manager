use sqlx::sqlite::SqlitePoolOptions;

#[test]
fn character_subspecies_migration_preserves_rules_and_accepts_a_generic_parent() {
    tauri::async_runtime::block_on(async {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("create in-memory database");
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(&pool)
            .await
            .expect("enable foreign keys");

        let migrations = super::migrations();
        for migration in migrations.iter().take(26) {
            sqlx::raw_sql(migration.sql)
                .execute(&pool)
                .await
                .unwrap_or_else(|error| panic!("migration {} failed: {error}", migration.version));
        }

        sqlx::query(
            "INSERT INTO game_rule_option(
                id, game_system_id, universe_id, category, parent_option_id,
                code, label, created_at, updated_at
             ) VALUES ('elf', 'dnd5e', 'dnd5e:generic', 'race', NULL,
                'elf', 'Elfe', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        )
        .execute(&pool)
        .await
        .expect("insert existing species");
        let previous_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM game_rule_option")
            .fetch_one(&pool)
            .await
            .expect("count existing rules");

        let migration = migrations.last().expect("character subspecies migration");
        assert_eq!(migration.version, 27);
        sqlx::raw_sql(migration.sql)
            .execute(&pool)
            .await
            .expect("apply character subspecies migration");

        let migrated_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM game_rule_option")
            .fetch_one(&pool)
            .await
            .expect("count migrated rules");
        assert_eq!(migrated_count, previous_count);

        sqlx::query(
            "INSERT INTO game_rule_option(
                id, game_system_id, universe_id, category, parent_option_id,
                code, label, created_at, updated_at
             ) VALUES ('drow', 'dnd5e', 'forgotten-realms', 'subrace', 'elf',
                'drow', 'Drow', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        )
        .execute(&pool)
        .await
        .expect("attach a specific subspecies to a generic species");

        let parent_id: String =
            sqlx::query_scalar("SELECT parent_option_id FROM game_rule_option WHERE id = 'drow'")
                .fetch_one(&pool)
                .await
                .expect("read inserted subspecies");
        assert_eq!(parent_id, "elf");
    });
}
