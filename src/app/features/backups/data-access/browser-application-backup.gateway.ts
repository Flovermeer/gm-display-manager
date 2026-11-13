import { Injectable } from '@angular/core';

import { ApplicationBackupGateway } from '@app/features/backups/data-access/application-backup.gateway';
import type {
  BackupCandidate,
  BackupManifest,
  BackupProgressStage,
  BackupStatus,
  RestoreProgressStage,
  RestoreResult,
} from '@app/features/backups/domain/backup.models';

@Injectable()
export class BrowserApplicationBackupGateway extends ApplicationBackupGateway {
  override readonly isAvailable = false;

  override async selectBackupDestination(): Promise<string | null> {
    return null;
  }

  override async selectBackupArchive(): Promise<string | null> {
    return null;
  }

  override async createBackup(
    _destinationPath: string,
    _reportProgress: (stage: BackupProgressStage) => void,
  ): Promise<BackupManifest> {
    throw this.desktopOnlyError();
  }

  override async inspectBackup(_archivePath: string): Promise<BackupManifest> {
    throw this.desktopOnlyError();
  }

  override async createAutomaticBackup(
    _reportProgress: (stage: BackupProgressStage) => void,
  ): Promise<BackupCandidate> {
    throw this.desktopOnlyError();
  }

  override async getBackupStatus(): Promise<BackupStatus> {
    return { hasChanges: false, fingerprint: '' };
  }

  override async checkDatabase(): Promise<void> {
    // Aucune base SQLite à contrôler hors de Tauri.
  }

  override async latestAutomaticBackup(): Promise<BackupCandidate | null> {
    return null;
  }

  override async prepareRestore(
    _archivePath: string,
    _reportProgress: (stage: RestoreProgressStage) => void,
  ): Promise<void> {
    throw this.desktopOnlyError();
  }

  override async takeRestoreResult(): Promise<RestoreResult | null> {
    return null;
  }

  private desktopOnlyError(): Error {
    return new Error(
      'La sauvegarde complète est uniquement disponible dans l’application desktop.',
    );
  }
}
