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

fn create_backup_archive(
    app_data: &Path,
    snapshot_path: &Path,
    archive_path: &Path,
) -> Result<BackupManifest, String> {
    validate_snapshot_path(app_data, snapshot_path)?;
    validate_sqlite_file(snapshot_path)?;
    let parent = archive_path
        .parent()
        .ok_or_else(|| "Le dossier de destination est invalide.".to_string())?;
    fs::create_dir_all(parent).map_err(error_message)?;
    let temporary_path = temporary_archive_path(archive_path);
    if temporary_path.exists() {
        fs::remove_file(&temporary_path).map_err(error_message)?;
    }

    let manifest = BackupManifest {
        format_version: ARCHIVE_FORMAT_VERSION,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        created_at_unix_ms: unix_time_millis()?,
    };

    let write_result = (|| -> Result<(), String> {
        let file = File::create(&temporary_path).map_err(error_message)?;
        let mut writer = ZipWriter::new(file);
        let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

        writer
            .start_file(MANIFEST_FILE, options)
            .map_err(error_message)?;
        writer
            .write_all(&serde_json::to_vec_pretty(&manifest).map_err(error_message)?)
            .map_err(error_message)?;
        add_file(&mut writer, snapshot_path, "data/beholders-inn.db", options)?;
        add_directory_tree(
            &mut writer,
            &app_data.join("campaigns"),
            "data/campaigns",
            options,
        )?;
        add_directory_tree(
            &mut writer,
            &app_data.join("universes"),
            "data/universes",
            options,
        )?;
        writer.finish().map_err(error_message)?;
        Ok(())
    })();

    if let Err(error) = write_result {
        let _ = fs::remove_file(&temporary_path);
        return Err(error);
    }

    if archive_path.exists() {
        fs::remove_file(archive_path).map_err(error_message)?;
    }
    fs::rename(temporary_path, archive_path).map_err(error_message)?;
    Ok(manifest)
}

fn create_automatic_backup_archive(
    app_data: &Path,
    snapshot_path: &Path,
) -> Result<BackupCandidate, String> {
    let directory = app_data.join(AUTOMATIC_BACKUP_DIRECTORY);
    fs::create_dir_all(&directory).map_err(error_message)?;
    let archive_path = directory.join(format!("beholders-inn-auto-{}.zip", unix_time_millis()?));
    let fingerprint_before = data_fingerprint(app_data)?;
    let manifest = create_backup_archive(app_data, snapshot_path, &archive_path)?;
    if let Err(error) = mark_data_as_backed_up_if_unchanged(app_data, &fingerprint_before) {
        let _ = fs::remove_file(&archive_path);
        return Err(error);
    }
    rotate_automatic_backups(&directory)?;
    Ok(BackupCandidate {
        archive_path: archive_path.to_string_lossy().into_owned(),
        manifest,
    })
}

fn current_backup_status(app_data: &Path) -> Result<BackupStatus, String> {
    let fingerprint = data_fingerprint(app_data)?;
    let state = read_backup_state(app_data)?;
    Ok(BackupStatus {
        has_changes: state.last_backed_up_fingerprint.as_deref() != Some(&fingerprint),
        fingerprint,
    })
}

fn mark_data_as_backed_up_if_unchanged(
    app_data: &Path,
    expected_fingerprint: &str,
) -> Result<(), String> {
    let fingerprint = data_fingerprint(app_data)?;
    if fingerprint != expected_fingerprint {
        return Err(
            "Les données ont changé pendant la sauvegarde. Une nouvelle tentative sera effectuée."
                .into(),
        );
    }
    write_backup_state(
        app_data,
        &BackupState {
            last_backed_up_fingerprint: Some(fingerprint),
        },
    )
}

fn mark_current_data_as_backed_up(app_data: &Path) -> Result<(), String> {
    write_backup_state(
        app_data,
        &BackupState {
            last_backed_up_fingerprint: Some(data_fingerprint(app_data)?),
        },
    )
}

fn find_latest_automatic_backup(app_data: &Path) -> Result<Option<BackupCandidate>, String> {
    let directory = app_data.join(AUTOMATIC_BACKUP_DIRECTORY);
    if !directory.exists() {
        return Ok(None);
    }
    let mut archives = automatic_backup_paths(&directory)?;
    archives.sort_by(|left, right| right.file_name().cmp(&left.file_name()));
    for archive_path in archives {
        if let Ok(manifest) = inspect_backup_archive(&archive_path) {
            return Ok(Some(BackupCandidate {
                archive_path: archive_path.to_string_lossy().into_owned(),
                manifest,
            }));
        }
    }
    Ok(None)
}

fn rotate_automatic_backups(directory: &Path) -> Result<(), String> {
    let mut archives = automatic_backup_paths(directory)?;
    archives.sort_by_key(|path| path.file_name().map(|name| name.to_os_string()));
    let remove_count = archives.len().saturating_sub(AUTOMATIC_BACKUP_LIMIT);
    for archive in archives.into_iter().take(remove_count) {
        fs::remove_file(archive).map_err(error_message)?;
    }
    Ok(())
}

fn automatic_backup_paths(directory: &Path) -> Result<Vec<PathBuf>, String> {
    let entries = fs::read_dir(directory)
        .map_err(error_message)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(error_message)?;
    Ok(entries
        .into_iter()
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension().and_then(|extension| extension.to_str()) == Some("zip")
                && path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.starts_with("beholders-inn-auto-"))
        })
        .collect())
}

fn data_fingerprint(app_data: &Path) -> Result<String, String> {
    let mut hasher = StableHasher::default();
    for relative in [
        Path::new(DATABASE_FILE),
        Path::new("beholders-inn.db-wal"),
        Path::new("campaigns"),
        Path::new("universes"),
    ] {
        fingerprint_path(app_data, relative, &mut hasher)?;
    }
    Ok(format!("{:016x}", hasher.finish()))
}

fn fingerprint_path(
    app_data: &Path,
    relative: &Path,
    hasher: &mut StableHasher,
) -> Result<(), String> {
    let path = app_data.join(relative);
    hasher.write(relative.to_string_lossy().as_bytes());
    if !path.exists() {
        hasher.write_u8(0);
        return Ok(());
    }
    let metadata = fs::symlink_metadata(&path).map_err(error_message)?;
    hasher.write_u8(if metadata.is_dir() { 1 } else { 2 });
    hasher.write_u64(metadata.len());
    if let Ok(modified) = metadata.modified() {
        if let Ok(duration) = modified.duration_since(UNIX_EPOCH) {
            hasher.write_u128(duration.as_nanos());
        }
    }
    if !metadata.is_dir() {
        return Ok(());
    }

    let mut entries = fs::read_dir(&path)
        .map_err(error_message)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(error_message)?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        fingerprint_path(app_data, &relative.join(entry.file_name()), hasher)?;
    }
    Ok(())
}

fn read_backup_state(app_data: &Path) -> Result<BackupState, String> {
    let path = app_data.join(BACKUP_STATE);
    if !path.exists() {
        return Ok(BackupState::default());
    }
    let file = File::open(path).map_err(error_message)?;
    Ok(serde_json::from_reader(file).unwrap_or_default())
}

fn write_backup_state(app_data: &Path, state: &BackupState) -> Result<(), String> {
    fs::create_dir_all(app_data).map_err(error_message)?;
    let path = app_data.join(BACKUP_STATE);
    let temporary_path = app_data.join(format!("{BACKUP_STATE}.part"));
    serde_json::to_writer_pretty(File::create(&temporary_path).map_err(error_message)?, state)
        .map_err(error_message)?;
    if path.exists() {
        fs::remove_file(&path).map_err(error_message)?;
    }
    fs::rename(temporary_path, path).map_err(error_message)
}

#[derive(Default)]
struct StableHasher(u64);

impl Hasher for StableHasher {
    fn finish(&self) -> u64 {
        self.0
    }

    fn write(&mut self, bytes: &[u8]) {
        if self.0 == 0 {
            self.0 = 0xcbf29ce484222325;
        }
        for byte in bytes {
            self.0 ^= u64::from(*byte);
            self.0 = self.0.wrapping_mul(0x100000001b3);
        }
    }
}

fn add_directory_tree(
    writer: &mut ZipWriter<File>,
    source: &Path,
    archive_root: &str,
    options: SimpleFileOptions,
) -> Result<(), String> {
    writer
        .add_directory(format!("{archive_root}/"), options)
        .map_err(error_message)?;
    if !source.exists() {
        return Ok(());
    }

    let mut entries = fs::read_dir(source)
        .map_err(error_message)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(error_message)?;
    entries.sort_by_key(|entry| entry.file_name());

    for entry in entries {
        let path = entry.path();
        let metadata = fs::symlink_metadata(&path).map_err(error_message)?;
        if metadata.file_type().is_symlink() {
            return Err(format!(
                "Le lien symbolique {} ne peut pas être sauvegardé.",
                path.display()
            ));
        }
        let name = format!("{archive_root}/{}", entry.file_name().to_string_lossy());
        if metadata.is_dir() {
            add_directory_tree(writer, &path, &name, options)?;
        } else if metadata.is_file() {
            add_file(writer, &path, &name, media_file_options(&path))?;
        }
    }
    Ok(())
}

fn media_file_options(path: &Path) -> SimpleFileOptions {
    let already_compressed = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "gif" | "jpeg" | "jpg" | "mp3" | "mp4" | "ogg" | "png" | "webm" | "webp"
            )
        });
    SimpleFileOptions::default().compression_method(if already_compressed {
        CompressionMethod::Stored
    } else {
        CompressionMethod::Deflated
    })
}

fn add_file(
    writer: &mut ZipWriter<File>,
    source: &Path,
    archive_name: &str,
    options: SimpleFileOptions,
) -> Result<(), String> {
    writer
        .start_file(archive_name.replace('\\', "/"), options)
        .map_err(error_message)?;
    io::copy(&mut File::open(source).map_err(error_message)?, writer).map_err(error_message)?;
    Ok(())
}

fn inspect_backup_archive(archive_path: &Path) -> Result<BackupManifest, String> {
    let file = File::open(archive_path)
        .map_err(|error| format!("Impossible d’ouvrir l’archive : {error}"))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|error| format!("L’archive de sauvegarde est invalide : {error}"))?;
    validate_archive(&mut archive)
}

fn validate_archive(archive: &mut ZipArchive<File>) -> Result<BackupManifest, String> {
    if archive.len() > MAX_ARCHIVE_ENTRIES {
        return Err("L’archive contient trop de fichiers.".into());
    }

    let mut paths = HashSet::new();
    let mut total_size = 0_u64;
    let mut has_database = false;
    for index in 0..archive.len() {
        let file = archive.by_index(index).map_err(error_message)?;
        let enclosed = file
            .enclosed_name()
            .ok_or_else(|| "L’archive contient un chemin non sécurisé.".to_string())?;
        validate_archive_path(&enclosed)?;
        if !paths.insert(enclosed.clone()) {
            return Err(format!(
                "L’archive contient un chemin en double : {}",
                enclosed.display()
            ));
        }
        if file
            .unix_mode()
            .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("Les liens symboliques ne sont pas acceptés dans une sauvegarde.".into());
        }
        total_size = total_size
            .checked_add(file.size())
            .ok_or_else(|| "La taille de l’archive est invalide.".to_string())?;
        if total_size > MAX_UNCOMPRESSED_SIZE {
            return Err("La sauvegarde dépasse la taille maximale autorisée.".into());
        }
        has_database |= enclosed == Path::new("data/beholders-inn.db") && !file.is_dir();
    }

    if !has_database {
        return Err("La sauvegarde ne contient pas la base de données attendue.".into());
    }

    let manifest: BackupManifest = {
        let mut file = archive
            .by_name(MANIFEST_FILE)
            .map_err(|_| "La sauvegarde ne contient pas de manifeste.".to_string())?;
        serde_json::from_reader(&mut file)
            .map_err(|error| format!("Le manifeste de sauvegarde est invalide : {error}"))?
    };
    if manifest.format_version != ARCHIVE_FORMAT_VERSION {
        return Err(format!(
            "Cette version de sauvegarde ({}) n’est pas prise en charge.",
            manifest.format_version
        ));
    }
    Ok(manifest)
}

fn validate_archive_path(path: &Path) -> Result<(), String> {
    if path == Path::new(MANIFEST_FILE) {
        return Ok(());
    }
    let mut components = path.components();
    if components.next() != Some(Component::Normal("data".as_ref())) {
        return Err(format!(
            "Chemin inattendu dans l’archive : {}",
            path.display()
        ));
    }
    if components.any(|component| !matches!(component, Component::Normal(_))) {
        return Err("L’archive contient un chemin non sécurisé.".into());
    }
    Ok(())
}

fn stage_restore_archive(app_data: &Path, archive_path: &Path) -> Result<(), String> {
    let manifest = inspect_backup_archive(archive_path)?;
    if manifest.format_version != ARCHIVE_FORMAT_VERSION {
        return Err("La version de la sauvegarde n’est pas compatible.".into());
    }

    let work_dir = app_data.join(RESTORE_DIRECTORY);
    remove_path_if_exists(&work_dir)?;
    let staging_dir = work_dir.join("staging");
    fs::create_dir_all(&staging_dir).map_err(error_message)?;

    let extraction_result = (|| -> Result<(), String> {
        let file = File::open(archive_path).map_err(error_message)?;
        let mut archive = ZipArchive::new(file).map_err(error_message)?;
        validate_archive(&mut archive)?;
        for index in 0..archive.len() {
            let mut file = archive.by_index(index).map_err(error_message)?;
            let relative = file
                .enclosed_name()
                .ok_or_else(|| "L’archive contient un chemin non sécurisé.".to_string())?;
            if relative == Path::new(MANIFEST_FILE) {
                continue;
            }
            let destination = staging_dir.join(&relative);
            if file.is_dir() {
                fs::create_dir_all(destination).map_err(error_message)?;
                continue;
            }
            if let Some(parent) = destination.parent() {
                fs::create_dir_all(parent).map_err(error_message)?;
            }
            io::copy(
                &mut file,
                &mut File::create(destination).map_err(error_message)?,
            )
            .map_err(error_message)?;
        }
        validate_sqlite_file(&staging_dir.join("data").join(DATABASE_FILE))?;
        fs::create_dir_all(staging_dir.join("data/campaigns")).map_err(error_message)?;
        fs::create_dir_all(staging_dir.join("data/universes")).map_err(error_message)?;
        let transaction = RestoreTransaction {
            original_targets: [DATABASE_FILE, "campaigns", "universes"]
                .into_iter()
                .filter(|name| app_data.join(name).exists())
                .map(str::to_string)
                .collect(),
        };
        write_restore_transaction(&work_dir.join(RESTORE_MARKER), &transaction)?;
        Ok(())
    })();

    if extraction_result.is_err() {
        let _ = remove_path_if_exists(&work_dir);
    }
    extraction_result
}

fn swap_staged_data(
    app_data: &Path,
    work_dir: &Path,
    transaction: &RestoreTransaction,
) -> Result<(), String> {
    let staging_data = work_dir.join("staging/data");
    let rollback = work_dir.join("rollback");
    fs::create_dir_all(&rollback).map_err(error_message)?;

    let targets = [DATABASE_FILE, "campaigns", "universes"];
    for name in targets {
        let current = app_data.join(name);
        let previous = rollback.join(name);
        let staged = staging_data.join(name);
        if !staged.exists() && current.exists() {
            continue;
        }

        let had_original = transaction
            .original_targets
            .iter()
            .any(|target| target == name);
        let install_result = (|| -> Result<(), String> {
            if had_original && !previous.exists() {
                if !current.exists() {
                    return Err(format!(
                        "Les données précédentes de {name} sont introuvables."
                    ));
                }
                fs::rename(&current, &previous)
                    .map_err(|error| format!("Impossible de préparer {name} : {error}"))?;
            } else if !had_original && current.exists() {
                return Err(format!(
                    "Une donnée inattendue empêche la restauration de {name}."
                ));
            }
            fs::rename(&staged, &current)
                .map_err(|error| format!("Impossible de restaurer {name} : {error}"))
        })();
        if let Err(error) = install_result {
            File::create(work_dir.join(RESTORE_ROLLBACK_MARKER)).map_err(error_message)?;
            return match rollback_swaps(app_data, work_dir, transaction) {
                Ok(()) => {
                    remove_path_if_exists(work_dir)?;
                    Err(format!(
                        "{error} Les données précédentes ont été remises en place."
                    ))
                }
                Err(rollback_error) => Err(format!(
                    "{error} Retour arrière incomplet : {rollback_error}"
                )),
            };
        }
    }

    remove_path_if_exists(work_dir)?;
    Ok(())
}

fn rollback_swaps(
    app_data: &Path,
    work_dir: &Path,
    transaction: &RestoreTransaction,
) -> Result<(), String> {
    let staging_data = work_dir.join("staging/data");
    let rollback = work_dir.join("rollback");
    for name in [DATABASE_FILE, "campaigns", "universes"].into_iter().rev() {
        let current = app_data.join(name);
        let previous = rollback.join(name);
        let staged = staging_data.join(name);
        let had_original = transaction
            .original_targets
            .iter()
            .any(|target| target == name);
        if had_original {
            if previous.exists() {
                remove_path_if_exists(&current)?;
                fs::rename(previous, current).map_err(error_message)?;
            }
        } else if !staged.exists() {
            remove_path_if_exists(&current)?;
        }
    }
    Ok(())
}

fn read_restore_transaction(path: &Path) -> Result<RestoreTransaction, String> {
    serde_json::from_reader(File::open(path).map_err(error_message)?).map_err(error_message)
}

fn write_restore_transaction(path: &Path, transaction: &RestoreTransaction) -> Result<(), String> {
    serde_json::to_writer_pretty(File::create(path).map_err(error_message)?, transaction)
        .map_err(error_message)
}

fn validate_snapshot_path(app_data: &Path, snapshot_path: &Path) -> Result<(), String> {
    if snapshot_path.parent() != Some(app_data)
        || !snapshot_path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.starts_with(".backup-snapshot-") && name.ends_with(".db"))
    {
        return Err("Le chemin du snapshot SQLite est invalide.".into());
    }
    Ok(())
}

fn validate_sqlite_file(path: &Path) -> Result<(), String> {
    let mut header = [0_u8; 16];
    File::open(path)
        .and_then(|mut file| file.read_exact(&mut header))
        .map_err(|error| format!("La base SQLite de la sauvegarde est illisible : {error}"))?;
    if &header != b"SQLite format 3\0" {
        return Err("La sauvegarde ne contient pas une base SQLite valide.".into());
    }
    Ok(())
}

fn remove_snapshot(app_data: &Path, snapshot_path: &Path) -> Result<(), String> {
    validate_snapshot_path(app_data, snapshot_path)?;
    if snapshot_path.exists() {
        fs::remove_file(snapshot_path).map_err(error_message)?;
    }
    Ok(())
}

fn write_restore_result(app_data: &Path, result: &RestoreResult) -> Result<(), String> {
    fs::create_dir_all(app_data).map_err(error_message)?;
    serde_json::to_writer_pretty(
        File::create(app_data.join(RESTORE_RESULT)).map_err(error_message)?,
        result,
    )
    .map_err(error_message)
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
