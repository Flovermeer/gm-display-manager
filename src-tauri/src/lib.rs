use tauri_plugin_sql::{Migration, MigrationKind};

mod backup;
mod diagnostics;

const DATABASE_URL: &str = "sqlite:beholders-inn.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .max_file_size(5_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(DATABASE_URL, migrations())
                .build(),
        )
        .setup(|app| {
            let app_data = tauri::Manager::path(app).app_data_dir()?;
            backup::apply_pending_restore(&app_data);
            if let Err(error) = diagnostics::cleanup_expired_logs(app.handle()) {
                tauri_plugin_log::log::warn!("Unable to clean expired technical logs: {error}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            backup::create_backup,
            backup::create_automatic_backup,
            backup::cleanup_backup_snapshot,
            backup::backup_status,
            backup::latest_automatic_backup,
            backup::inspect_backup,
            backup::prepare_restore,
            backup::take_restore_result,
            backup::exit_application,
            diagnostics::open_log_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_app_setting",
            sql: include_str!("../migrations/0001_create_app_setting.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_campaign",
            sql: include_str!("../migrations/0002_create_campaign.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_npc",
            sql: include_str!("../migrations/0003_create_npc.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_npc_portrait",
            sql: include_str!("../migrations/0004_add_npc_portrait.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_location",
            sql: include_str!("../migrations/0005_create_location.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_npc_idle_video",
            sql: include_str!("../migrations/0006_add_npc_idle_video.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_player_character",
            sql: include_str!("../migrations/0007_create_player_character.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_player_character_portrait",
            sql: include_str!("../migrations/0008_add_player_character_portrait.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "create_chapter",
            sql: include_str!("../migrations/0009_create_chapter.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "create_journal_entry",
            sql: include_str!("../migrations/0010_create_journal_entry.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "create_narrative_item",
            sql: include_str!("../migrations/0011_create_narrative_item.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "create_scene",
            sql: include_str!("../migrations/0012_create_scene.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "create_universe_catalogs",
            sql: include_str!("../migrations/0013_create_universe_catalogs.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "create_monster",
            sql: include_str!("../migrations/0014_create_monster.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "create_game_rule_catalog",
            sql: include_str!("../migrations/0015_create_game_rule_catalog.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "add_campaign_resource_ownership",
            sql: include_str!("../migrations/0016_add_campaign_resource_ownership.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "create_active_combat",
            sql: include_str!("../migrations/0017_create_active_combat.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "create_recent_resource",
            sql: include_str!("../migrations/0018_create_recent_resource.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "create_random_table",
            sql: include_str!("../migrations/0019_create_random_table.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "link_scene_to_chapter",
            sql: include_str!("../migrations/0020_link_scene_to_chapter.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "add_character_rule_catalogs",
            sql: include_str!("../migrations/0021_add_character_rule_catalogs.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "add_campaign_location_description",
            sql: include_str!("../migrations/0022_add_campaign_location_description.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
