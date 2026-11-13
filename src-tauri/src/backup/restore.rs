//! Restauration transactionnelle : préparation, échange des données et retour arrière.

use super::*;

pub(super) fn stage_restore_archive(app_data: &Path, archive_path: &Path) -> Result<(), String> {
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

pub(super) fn swap_staged_data(
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

pub(super) fn rollback_swaps(
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

pub(super) fn read_restore_transaction(path: &Path) -> Result<RestoreTransaction, String> {
    serde_json::from_reader(File::open(path).map_err(error_message)?).map_err(error_message)
}

pub(super) fn write_restore_transaction(
    path: &Path,
    transaction: &RestoreTransaction,
) -> Result<(), String> {
    serde_json::to_writer_pretty(File::create(path).map_err(error_message)?, transaction)
        .map_err(error_message)
}

pub(super) fn write_restore_result(app_data: &Path, result: &RestoreResult) -> Result<(), String> {
    fs::create_dir_all(app_data).map_err(error_message)?;
    serde_json::to_writer_pretty(
        File::create(app_data.join(RESTORE_RESULT)).map_err(error_message)?,
        result,
    )
    .map_err(error_message)
}
