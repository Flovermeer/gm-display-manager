/**
 * But
 * Gérer les journaux techniques locaux de l'application desktop.
 *
 * Responsabilités
 * - supprimer les journaux âgés de plus de sept jours ;
 * - ouvrir le dossier de journaux avec l'explorateur Windows.
 */
use std::{
    fs,
    process::Command,
    time::{Duration, SystemTime},
};

use tauri::{AppHandle, Manager};

const LOG_RETENTION: Duration = Duration::from_secs(7 * 24 * 60 * 60);

pub fn cleanup_expired_logs(app: &AppHandle) -> Result<(), String> {
    let directory = app.path().app_log_dir().map_err(error_message)?;
    cleanup_directory(&directory, SystemTime::now())
}

#[tauri::command]
pub fn open_log_directory(app: AppHandle) -> Result<(), String> {
    let directory = app.path().app_log_dir().map_err(error_message)?;
    fs::create_dir_all(&directory).map_err(error_message)?;
    Command::new("explorer.exe")
        .arg(directory)
        .spawn()
        .map(|_| ())
        .map_err(error_message)
}

fn cleanup_directory(directory: &std::path::Path, now: SystemTime) -> Result<(), String> {
    if !directory.exists() {
        return Ok(());
    }

    for entry in fs::read_dir(directory).map_err(error_message)? {
        let entry = entry.map_err(error_message)?;
        let metadata = entry.metadata().map_err(error_message)?;
        if metadata.is_file() && is_expired(metadata.modified().map_err(error_message)?, now) {
            fs::remove_file(entry.path()).map_err(error_message)?;
        }
    }
    Ok(())
}

fn is_expired(modified: SystemTime, now: SystemTime) -> bool {
    now.duration_since(modified)
        .is_ok_and(|age| age > LOG_RETENTION)
}

fn error_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expires_only_logs_older_than_seven_days() {
        let now = SystemTime::UNIX_EPOCH + Duration::from_secs(20 * 24 * 60 * 60);

        assert!(is_expired(
            now - LOG_RETENTION - Duration::from_secs(1),
            now
        ));
        assert!(!is_expired(now - LOG_RETENTION, now));
        assert!(!is_expired(now - Duration::from_secs(1), now));
    }

    #[test]
    fn future_timestamps_are_not_expired() {
        let now = SystemTime::UNIX_EPOCH + Duration::from_secs(1);
        assert!(!is_expired(now + Duration::from_secs(1), now));
    }
}
