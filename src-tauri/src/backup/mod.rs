mod archive;
mod automatic;
mod restore;

use archive::*;
use automatic::*;
use restore::*;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs::{self, File},
    hash::Hasher,
    io::{self, Read, Write},
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use zip::{write::SimpleFileOptions, CompressionMethod, ZipArchive, ZipWriter};

const ARCHIVE_FORMAT_VERSION: u32 = 1;
const DATABASE_FILE: &str = "beholders-inn.db";
const MANIFEST_FILE: &str = "manifest.json";
const RESTORE_DIRECTORY: &str = ".beholders-inn-restore";
const RESTORE_MARKER: &str = "pending";
const RESTORE_ROLLBACK_MARKER: &str = "rollback-required";
const RESTORE_RESULT: &str = ".beholders-inn-restore-result.json";
const BACKUP_STATE: &str = ".beholders-inn-backup-state.json";
const AUTOMATIC_BACKUP_DIRECTORY: &str = "backups/automatic";
const AUTOMATIC_BACKUP_LIMIT: usize = 10;
const MAX_ARCHIVE_ENTRIES: usize = 100_000;
const MAX_UNCOMPRESSED_SIZE: u64 = 500 * 1024 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BackupManifest {
    format_version: u32,
    app_version: String,
    created_at_unix_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupStatus {
    pub has_changes: bool,
    pub fingerprint: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupCandidate {
    pub archive_path: String,
    pub manifest: BackupManifest,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupState {
    last_backed_up_fingerprint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestoreTransaction {
    original_targets: Vec<String>,
}

#[tauri::command]
pub async fn create_backup(
    app: AppHandle,
    snapshot_path: String,
    archive_path: String,
) -> Result<BackupManifest, String> {
    let app_data = app.path().app_data_dir().map_err(error_message)?;
    let snapshot_path = PathBuf::from(snapshot_path);
    let archive_path = PathBuf::from(archive_path);

    tauri::async_runtime::spawn_blocking(move || {
        if archive_path.starts_with(&app_data) {
            let _ = remove_snapshot(&app_data, &snapshot_path);
            return Err(
                "Choisis un emplacement hors du dossier de données de l’application.".into(),
            );
        }
        let result =
            create_backup_archive(&app_data, &snapshot_path, &archive_path).and_then(|manifest| {
                mark_current_data_as_backed_up(&app_data)?;
                Ok(manifest)
            });
        let _ = remove_snapshot(&app_data, &snapshot_path);
        result
    })
    .await
    .map_err(error_message)?
}

#[tauri::command]
pub async fn create_automatic_backup(
    app: AppHandle,
    snapshot_path: String,
) -> Result<BackupCandidate, String> {
    let app_data = app.path().app_data_dir().map_err(error_message)?;
    let snapshot_path = PathBuf::from(snapshot_path);
    tauri::async_runtime::spawn_blocking(move || {
        let result = create_automatic_backup_archive(&app_data, &snapshot_path);
        let _ = remove_snapshot(&app_data, &snapshot_path);
        result
    })
    .await
    .map_err(error_message)?
}

#[tauri::command]
pub async fn backup_status(app: AppHandle) -> Result<BackupStatus, String> {
    let app_data = app.path().app_data_dir().map_err(error_message)?;
    tauri::async_runtime::spawn_blocking(move || current_backup_status(&app_data))
        .await
        .map_err(error_message)?
}

#[tauri::command]
pub async fn latest_automatic_backup(app: AppHandle) -> Result<Option<BackupCandidate>, String> {
    let app_data = app.path().app_data_dir().map_err(error_message)?;
    tauri::async_runtime::spawn_blocking(move || find_latest_automatic_backup(&app_data))
        .await
        .map_err(error_message)?
}

#[tauri::command]
pub async fn cleanup_backup_snapshot(app: AppHandle, snapshot_path: String) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(error_message)?;
    let snapshot_path = PathBuf::from(snapshot_path);
    tauri::async_runtime::spawn_blocking(move || remove_snapshot(&app_data, &snapshot_path))
        .await
        .map_err(error_message)?
}

#[tauri::command]
pub async fn inspect_backup(archive_path: String) -> Result<BackupManifest, String> {
    tauri::async_runtime::spawn_blocking(move || inspect_backup_archive(Path::new(&archive_path)))
        .await
        .map_err(error_message)?
}

#[tauri::command]
pub async fn prepare_restore(app: AppHandle, archive_path: String) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(error_message)?;
    let archive_path = PathBuf::from(archive_path);
    tauri::async_runtime::spawn_blocking(move || stage_restore_archive(&app_data, &archive_path))
        .await
        .map_err(error_message)??;
    app.restart()
}

#[tauri::command]
pub fn take_restore_result(app: AppHandle) -> Result<Option<RestoreResult>, String> {
    let app_data = app.path().app_data_dir().map_err(error_message)?;
    let result_path = app_data.join(RESTORE_RESULT);
    if !result_path.exists() {
        return Ok(None);
    }

    let contents = fs::read(&result_path).map_err(error_message)?;
    fs::remove_file(result_path).map_err(error_message)?;
    serde_json::from_slice(&contents)
        .map(Some)
        .map_err(error_message)
}

#[tauri::command]
pub fn exit_application(app: AppHandle) {
    app.exit(0);
}

pub fn apply_pending_restore(app_data: &Path) {
    let work_dir = app_data.join(RESTORE_DIRECTORY);
    let marker_path = work_dir.join(RESTORE_MARKER);
    if !marker_path.exists() {
        return;
    }

    let result = read_restore_transaction(&marker_path).and_then(|transaction| {
        if work_dir.join(RESTORE_ROLLBACK_MARKER).exists() {
            rollback_swaps(app_data, &work_dir, &transaction)?;
            remove_path_if_exists(&work_dir)?;
            return Err("Une restauration interrompue a été annulée.".into());
        }
        swap_staged_data(app_data, &work_dir, &transaction)
    });
    let result = match result {
        Ok(()) => RestoreResult {
            success: true,
            message: "La sauvegarde a été restaurée avec succès.".into(),
        },
        Err(error) => {
            let _ = fs::remove_file(&marker_path);
            RestoreResult {
                success: false,
                message: format!("La restauration a échoué : {error}"),
            }
        }
    };

    if let Err(error) = write_restore_result(app_data, &result) {
        eprintln!("unable to persist restore result: {error}");
    }
}

fn temporary_archive_path(archive_path: &Path) -> PathBuf {
    let mut file_name = archive_path.file_name().unwrap_or_default().to_os_string();
    file_name.push(".part");
    archive_path.with_file_name(file_name)
}

fn unix_time_millis() -> Result<u64, String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(error_message)?
        .as_millis() as u64)
}

fn remove_path_if_exists(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    if fs::symlink_metadata(path).map_err(error_message)?.is_dir() {
        fs::remove_dir_all(path).map_err(error_message)
    } else {
        fs::remove_file(path).map_err(error_message)
    }
}

fn error_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_inspects_and_restores_a_complete_archive() {
        let root = test_directory("roundtrip");
        let source = root.join("source");
        let restored = root.join("restored");
        fs::create_dir_all(source.join("campaigns/campaign-1")).unwrap();
        fs::create_dir_all(source.join("universes/universe-1")).unwrap();
        fs::create_dir_all(&restored).unwrap();
        fs::write(source.join("campaigns/campaign-1/portrait.png"), b"image").unwrap();
        fs::write(source.join("universes/universe-1/map.jpg"), b"map").unwrap();
        let snapshot = source.join(".backup-snapshot-test.db");
        write_sqlite_stub(&snapshot);
        let archive = root.join("backup.zip");

        let manifest = create_backup_archive(&source, &snapshot, &archive).unwrap();
        assert_eq!(manifest.format_version, ARCHIVE_FORMAT_VERSION);
        assert_eq!(inspect_backup_archive(&archive).unwrap(), manifest);
        let mut zip = ZipArchive::new(File::open(&archive).unwrap()).unwrap();
        assert_eq!(
            zip.by_name("data/campaigns/campaign-1/portrait.png")
                .unwrap()
                .compression(),
            CompressionMethod::Stored
        );
        assert_eq!(
            zip.by_name("data/beholders-inn.db").unwrap().compression(),
            CompressionMethod::Deflated
        );
        drop(zip);

        stage_restore_archive(&restored, &archive).unwrap();
        apply_pending_restore(&restored);
        assert_eq!(
            fs::read(restored.join("campaigns/campaign-1/portrait.png")).unwrap(),
            b"image"
        );
        assert_eq!(
            fs::read(restored.join("universes/universe-1/map.jpg")).unwrap(),
            b"map"
        );
        assert!(restored.join(DATABASE_FILE).exists());
        let result: RestoreResult =
            serde_json::from_reader(File::open(restored.join(RESTORE_RESULT)).unwrap()).unwrap();
        assert!(result.success);

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_an_archive_without_the_database() {
        let root = test_directory("missing-database");
        fs::create_dir_all(&root).unwrap();
        let archive_path = root.join("invalid.zip");
        let file = File::create(&archive_path).unwrap();
        let mut writer = ZipWriter::new(file);
        writer
            .start_file(MANIFEST_FILE, SimpleFileOptions::default())
            .unwrap();
        writer
            .write_all(br#"{"formatVersion":1,"appVersion":"0.1.0","createdAtUnixMs":1}"#)
            .unwrap();
        writer.finish().unwrap();

        assert!(inspect_backup_archive(&archive_path)
            .unwrap_err()
            .contains("base de données"));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn resumes_an_install_interrupted_between_two_renames() {
        let root = test_directory("resume-install");
        let source = root.join("source");
        let restored = root.join("restored");
        fs::create_dir_all(source.join("campaigns")).unwrap();
        fs::create_dir_all(source.join("universes")).unwrap();
        fs::create_dir_all(restored.join("campaigns")).unwrap();
        fs::create_dir_all(restored.join("universes")).unwrap();
        let snapshot = source.join(".backup-snapshot-test.db");
        write_sqlite_stub_with_marker(&snapshot, b"new");
        write_sqlite_stub_with_marker(&restored.join(DATABASE_FILE), b"old");
        let archive = root.join("backup.zip");
        create_backup_archive(&source, &snapshot, &archive).unwrap();
        stage_restore_archive(&restored, &archive).unwrap();

        let work_dir = restored.join(RESTORE_DIRECTORY);
        let rollback = work_dir.join("rollback");
        fs::create_dir_all(&rollback).unwrap();
        fs::rename(restored.join(DATABASE_FILE), rollback.join(DATABASE_FILE)).unwrap();

        apply_pending_restore(&restored);

        assert!(fs::read(restored.join(DATABASE_FILE))
            .unwrap()
            .ends_with(b"new"));
        let result: RestoreResult =
            serde_json::from_reader(File::open(restored.join(RESTORE_RESULT)).unwrap()).unwrap();
        assert!(result.success);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn completes_a_rollback_interrupted_by_a_second_crash() {
        let root = test_directory("resume-rollback");
        let source = root.join("source");
        let restored = root.join("restored");
        fs::create_dir_all(source.join("campaigns")).unwrap();
        fs::create_dir_all(source.join("universes")).unwrap();
        fs::create_dir_all(restored.join("campaigns")).unwrap();
        fs::create_dir_all(restored.join("universes")).unwrap();
        let snapshot = source.join(".backup-snapshot-test.db");
        write_sqlite_stub_with_marker(&snapshot, b"new");
        write_sqlite_stub_with_marker(&restored.join(DATABASE_FILE), b"old");
        let archive = root.join("backup.zip");
        create_backup_archive(&source, &snapshot, &archive).unwrap();
        stage_restore_archive(&restored, &archive).unwrap();

        let work_dir = restored.join(RESTORE_DIRECTORY);
        let rollback = work_dir.join("rollback");
        fs::create_dir_all(&rollback).unwrap();
        fs::rename(restored.join(DATABASE_FILE), rollback.join(DATABASE_FILE)).unwrap();
        fs::rename(
            work_dir.join("staging/data").join(DATABASE_FILE),
            restored.join(DATABASE_FILE),
        )
        .unwrap();
        File::create(work_dir.join(RESTORE_ROLLBACK_MARKER)).unwrap();

        apply_pending_restore(&restored);

        assert!(fs::read(restored.join(DATABASE_FILE))
            .unwrap()
            .ends_with(b"old"));
        let result: RestoreResult =
            serde_json::from_reader(File::open(restored.join(RESTORE_RESULT)).unwrap()).unwrap();
        assert!(!result.success);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn detects_changes_since_the_last_complete_backup() {
        let root = test_directory("fingerprint");
        fs::create_dir_all(root.join("campaigns")).unwrap();
        fs::create_dir_all(root.join("universes")).unwrap();
        write_sqlite_stub(&root.join(DATABASE_FILE));

        let status = current_backup_status(&root).unwrap();
        assert!(status.has_changes);
        mark_data_as_backed_up_if_unchanged(&root, &status.fingerprint).unwrap();
        assert!(!current_backup_status(&root).unwrap().has_changes);

        fs::write(root.join("campaigns/change.txt"), b"changed").unwrap();
        assert!(current_backup_status(&root).unwrap().has_changes);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn keeps_only_the_ten_newest_automatic_archives() {
        let root = test_directory("rotation");
        fs::create_dir_all(&root).unwrap();
        for index in 0..12 {
            fs::write(
                root.join(format!("beholders-inn-auto-{index:02}.zip")),
                b"archive",
            )
            .unwrap();
        }

        rotate_automatic_backups(&root).unwrap();

        let archives = automatic_backup_paths(&root).unwrap();
        assert_eq!(archives.len(), AUTOMATIC_BACKUP_LIMIT);
        assert!(!root.join("beholders-inn-auto-00.zip").exists());
        assert!(!root.join("beholders-inn-auto-01.zip").exists());
        fs::remove_dir_all(root).unwrap();
    }

    fn test_directory(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "beholders-inn-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    fn write_sqlite_stub(path: &Path) {
        write_sqlite_stub_with_marker(path, &[]);
    }

    fn write_sqlite_stub_with_marker(path: &Path, marker: &[u8]) {
        let mut bytes = Vec::from(*b"SQLite format 3\0");
        bytes.extend_from_slice(&[0_u8; 128]);
        bytes.extend_from_slice(marker);
        fs::write(path, bytes).unwrap();
    }
}
