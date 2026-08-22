import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open, save } from '@tauri-apps/plugin-dialog';
import Database from '@tauri-apps/plugin-sql';

import { ApplicationBackupGateway } from '@app/features/backups/data-access/application-backup.gateway';
import type {
  BackupCandidate,
  BackupManifest,
  BackupProgressStage,
  BackupStatus,
  RestoreProgressStage,
  RestoreResult,
} from '@app/features/backups/domain/backup.models';

const DATABASE_URL = 'sqlite:beholders-inn.db';
const BACKUP_FILTER = [{ name: "Sauvegarde Beholder's Inn", extensions: ['zip'] }];

@Injectable()
export class TauriApplicationBackupGateway extends ApplicationBackupGateway {
  override readonly isAvailable = true;

  override async selectBackupDestination(): Promise<string | null> {
    const destination = await save({
      defaultPath: this.defaultBackupName(),
      filters: BACKUP_FILTER,
    });
    if (!destination || destination.toLowerCase().endsWith('.zip')) return destination;
    return `${destination}.zip`;
  }

  override async selectBackupArchive(): Promise<string | null> {
    const selection = await open({
      directory: false,
      multiple: false,
      filters: BACKUP_FILTER,
    });
    return Array.isArray(selection) ? (selection[0] ?? null) : selection;
  }

  override async createBackup(
    destinationPath: string,
    reportProgress: (stage: BackupProgressStage) => void,
  ): Promise<BackupManifest> {
    return this.createSnapshot(
      reportProgress,
      (snapshotPath) =>
        invoke<BackupManifest>('create_backup', {
          snapshotPath,
          archivePath: destinationPath,
        }),
    );
  }

  override createAutomaticBackup(
    reportProgress: (stage: BackupProgressStage) => void,
  ): Promise<BackupCandidate> {
    return this.createSnapshot(reportProgress, (snapshotPath) =>
      invoke<BackupCandidate>('create_automatic_backup', { snapshotPath }),
    );
  }

  override getBackupStatus(): Promise<BackupStatus> {
    return invoke<BackupStatus>('backup_status');
  }

  override async checkDatabase(): Promise<void> {
    const database = await Database.load(DATABASE_URL);
    const rows = await database.select<readonly Record<string, string>[]>('PRAGMA quick_check');
    if (rows.length !== 1 || Object.values(rows[0] ?? {})[0] !== 'ok') {
      throw new Error('Le contrôle d’intégrité de la base SQLite a échoué.');
    }
  }

  override latestAutomaticBackup(): Promise<BackupCandidate | null> {
    return invoke<BackupCandidate | null>('latest_automatic_backup');
  }

  private async createSnapshot<T>(
    reportProgress: (stage: BackupProgressStage) => void,
    archive: (snapshotPath: string) => Promise<T>,
  ): Promise<T> {
    const snapshotPath = await join(
      await appDataDir(),
      `.backup-snapshot-${crypto.randomUUID()}.db`,
    );

    try {
      reportProgress('database');
      const database = await Database.load(DATABASE_URL);
      await database.execute('VACUUM INTO $1', [snapshotPath]);
      reportProgress('archive');
      return await archive(snapshotPath);
    } finally {
      await invoke('cleanup_backup_snapshot', { snapshotPath }).catch(() => undefined);
    }
  }

  override inspectBackup(archivePath: string): Promise<BackupManifest> {
    return invoke<BackupManifest>('inspect_backup', { archivePath });
  }

  override prepareRestore(
    archivePath: string,
    reportProgress: (stage: RestoreProgressStage) => void,
  ): Promise<void> {
    reportProgress('staging');
    return invoke('prepare_restore', { archivePath });
  }

  override takeRestoreResult(): Promise<RestoreResult | null> {
    return invoke<RestoreResult | null>('take_restore_result');
  }

  private defaultBackupName(): string {
    const timestamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
    return `beholders-inn-${timestamp}.zip`;
  }
}
