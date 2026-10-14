use serde::Deserialize;
use sqlx::sqlite::SqlitePool;
use tauri::State;
use tauri_plugin_sql::{DbInstances, DbPool};

const DATABASE_URL: &str = "sqlite:beholders-inn.db";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveLocationInput {
    id: String,
    campaign_id: String,
    parent_location_id: Option<String>,
    name: String,
    summary: String,
    description_json: String,
    image_path: Option<String>,
    image_paths: Vec<String>,
    created_at: String,
    updated_at: String,
    override_snapshot_json: Option<String>,
}

#[tauri::command]
pub async fn save_location_transaction(
    databases: State<'_, DbInstances>,
    input: SaveLocationInput,
) -> Result<(), String> {
    let pool = {
        let instances = databases.0.read().await;
        match instances.get(DATABASE_URL) {
            Some(DbPool::Sqlite(pool)) => pool.clone(),
            None => return Err("La base SQLite n'est pas initialisée.".into()),
        }
    };

    persist_location(&pool, &input)
        .await
        .map_err(|error| error.to_string())
}

async fn persist_location(pool: &SqlitePool, input: &SaveLocationInput) -> Result<(), sqlx::Error> {
    let mut transaction = pool.begin_with("BEGIN IMMEDIATE").await?;

    if let Some(snapshot_json) = &input.override_snapshot_json {
        sqlx::query(
            r#"INSERT INTO campaign_resource_override(
                 campaign_id, resource_type, resource_id, snapshot_json, created_at, updated_at
               ) VALUES ($1,'location',$2,$3,$4,$4)
               ON CONFLICT(campaign_id, resource_type, resource_id) DO UPDATE SET
                 snapshot_json=excluded.snapshot_json, updated_at=excluded.updated_at"#,
        )
        .bind(&input.campaign_id)
        .bind(&input.id)
        .bind(snapshot_json)
        .bind(&input.updated_at)
        .execute(&mut *transaction)
        .await?;
    } else {
        sqlx::query(
            r#"INSERT INTO location(
                 id, universe_id, parent_location_id, name, summary, image_path,
                 created_at, updated_at, source_campaign_id
               ) VALUES ($1,(SELECT universe_id FROM campaign WHERE id=$2),$3,$4,$5,$6,$7,$8,$2)
               ON CONFLICT(id) DO UPDATE SET
                 parent_location_id=excluded.parent_location_id,
                 name=excluded.name, summary=excluded.summary,
                 image_path=excluded.image_path, updated_at=excluded.updated_at
               WHERE location.universe_id=excluded.universe_id
                 AND location.source_campaign_id=excluded.source_campaign_id"#,
        )
        .bind(&input.id)
        .bind(&input.campaign_id)
        .bind(&input.parent_location_id)
        .bind(&input.name)
        .bind(&input.summary)
        .bind(&input.image_path)
        .bind(&input.created_at)
        .bind(&input.updated_at)
        .execute(&mut *transaction)
        .await?;
    }

    sqlx::query(
        r#"INSERT INTO campaign_location(campaign_id, location_id, created_at, description_json)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT(campaign_id, location_id) DO UPDATE SET
             description_json=excluded.description_json"#,
    )
    .bind(&input.campaign_id)
    .bind(&input.id)
    .bind(&input.created_at)
    .bind(&input.description_json)
    .execute(&mut *transaction)
    .await?;

    sqlx::query("DELETE FROM location_image WHERE location_id=$1")
        .bind(&input.id)
        .execute(&mut *transaction)
        .await?;

    for (position, image_path) in input.image_paths.iter().enumerate() {
        sqlx::query(
            r#"INSERT INTO location_image(location_id, image_path, position, created_at)
               VALUES ($1,$2,$3,$4)"#,
        )
        .bind(&input.id)
        .bind(image_path)
        .bind(position as i64)
        .bind(&input.updated_at)
        .execute(&mut *transaction)
        .await?;
    }

    sqlx::query("UPDATE location SET image_path=$2 WHERE id=$1")
        .bind(&input.id)
        .bind(&input.image_path)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    #[test]
    fn saves_a_location_in_one_transaction() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool(true).await;

            persist_location(&pool, &input()).await.unwrap();

            let location_count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM location WHERE id='location-id'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            let image_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM location_image WHERE location_id='location-id'",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(location_count, 1);
            assert_eq!(image_count, 1);
        });
    }

    #[test]
    fn rolls_back_the_whole_location_when_one_write_fails() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool(false).await;

            assert!(persist_location(&pool, &input()).await.is_err());

            let location_count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM location WHERE id='location-id'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(location_count, 0);
        });
    }

    async fn test_pool(with_gallery: bool) -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::raw_sql(
            r#"
            CREATE TABLE campaign(id TEXT PRIMARY KEY, universe_id TEXT NOT NULL);
            CREATE TABLE location(
              id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, parent_location_id TEXT,
              name TEXT NOT NULL, summary TEXT NOT NULL, image_path TEXT,
              created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
              source_campaign_id TEXT, deleted_at TEXT
            );
            CREATE TABLE campaign_location(
              campaign_id TEXT NOT NULL, location_id TEXT NOT NULL, created_at TEXT NOT NULL,
              description_json TEXT NOT NULL,
              PRIMARY KEY(campaign_id, location_id)
            );
            CREATE TABLE campaign_resource_override(
              campaign_id TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL,
              snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
              PRIMARY KEY(campaign_id, resource_type, resource_id)
            );
            INSERT INTO campaign(id, universe_id) VALUES ('campaign-id', 'universe-id');
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();
        if with_gallery {
            sqlx::query(
                r#"CREATE TABLE location_image(
                     location_id TEXT NOT NULL, image_path TEXT NOT NULL,
                     position INTEGER NOT NULL, created_at TEXT NOT NULL
                   )"#,
            )
            .execute(&pool)
            .await
            .unwrap();
        }
        pool
    }

    fn input() -> SaveLocationInput {
        SaveLocationInput {
            id: "location-id".into(),
            campaign_id: "campaign-id".into(),
            parent_location_id: None,
            name: "Port Nyanzaru".into(),
            summary: "Port tropical".into(),
            description_json: r#"{"schemaVersion":1,"content":{"type":"doc"}}"#.into(),
            image_path: Some("locations/port.webp".into()),
            image_paths: vec!["locations/port.webp".into()],
            created_at: "2026-10-14T18:00:00.000Z".into(),
            updated_at: "2026-10-14T18:00:00.000Z".into(),
            override_snapshot_json: None,
        }
    }
}
