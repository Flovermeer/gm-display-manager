//! Sauvegardes automatiques : état, empreinte des données, rotation et dernière archive valide.

use super::*;

pub(super) fn create_automatic_backup_archive(
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

pub(super) fn current_backup_status(app_data: &Path) -> Result<BackupStatus, String> {
    let fingerprint = data_fingerprint(app_data)?;
    let state = read_backup_state(app_data)?;
    Ok(BackupStatus {
        has_changes: state.last_backed_up_fingerprint.as_deref() != Some(&fingerprint),
        fingerprint,
    })
}

pub(super) fn mark_data_as_backed_up_if_unchanged(
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

pub(super) fn mark_current_data_as_backed_up(app_data: &Path) -> Result<(), String> {
    write_backup_state(
        app_data,
        &BackupState {
            last_backed_up_fingerprint: Some(data_fingerprint(app_data)?),
        },
    )
}

pub(super) fn find_latest_automatic_backup(
    app_data: &Path,
) -> Result<Option<BackupCandidate>, String> {
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

pub(super) fn rotate_automatic_backups(directory: &Path) -> Result<(), String> {
    let mut archives = automatic_backup_paths(directory)?;
    archives.sort_by_key(|path| path.file_name().map(|name| name.to_os_string()));
    let remove_count = archives.len().saturating_sub(AUTOMATIC_BACKUP_LIMIT);
    for archive in archives.into_iter().take(remove_count) {
        fs::remove_file(archive).map_err(error_message)?;
    }
    Ok(())
}

pub(super) fn automatic_backup_paths(directory: &Path) -> Result<Vec<PathBuf>, String> {
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

pub(super) fn data_fingerprint(app_data: &Path) -> Result<String, String> {
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

pub(super) fn fingerprint_path(
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

pub(super) fn read_backup_state(app_data: &Path) -> Result<BackupState, String> {
    let path = app_data.join(BACKUP_STATE);
    if !path.exists() {
        return Ok(BackupState::default());
    }
    let file = File::open(path).map_err(error_message)?;
    Ok(serde_json::from_reader(file).unwrap_or_default())
}

pub(super) fn write_backup_state(app_data: &Path, state: &BackupState) -> Result<(), String> {
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
pub(super) struct StableHasher(u64);

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
