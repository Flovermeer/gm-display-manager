//! Création, inspection et validation des archives de sauvegarde et des snapshots SQLite.

use super::*;

pub(super) fn create_backup_archive(
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

pub(super) fn add_directory_tree(
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

pub(super) fn media_file_options(path: &Path) -> SimpleFileOptions {
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

pub(super) fn add_file(
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

pub(super) fn inspect_backup_archive(archive_path: &Path) -> Result<BackupManifest, String> {
    let file = File::open(archive_path)
        .map_err(|error| format!("Impossible d’ouvrir l’archive : {error}"))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|error| format!("L’archive de sauvegarde est invalide : {error}"))?;
    validate_archive(&mut archive)
}

pub(super) fn validate_archive(archive: &mut ZipArchive<File>) -> Result<BackupManifest, String> {
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

pub(super) fn validate_archive_path(path: &Path) -> Result<(), String> {
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

pub(super) fn validate_snapshot_path(app_data: &Path, snapshot_path: &Path) -> Result<(), String> {
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

pub(super) fn validate_sqlite_file(path: &Path) -> Result<(), String> {
    let mut header = [0_u8; 16];
    File::open(path)
        .and_then(|mut file| file.read_exact(&mut header))
        .map_err(|error| format!("La base SQLite de la sauvegarde est illisible : {error}"))?;
    if &header != b"SQLite format 3\0" {
        return Err("La sauvegarde ne contient pas une base SQLite valide.".into());
    }
    Ok(())
}

pub(super) fn remove_snapshot(app_data: &Path, snapshot_path: &Path) -> Result<(), String> {
    validate_snapshot_path(app_data, snapshot_path)?;
    if snapshot_path.exists() {
        fs::remove_file(snapshot_path).map_err(error_message)?;
    }
    Ok(())
}
