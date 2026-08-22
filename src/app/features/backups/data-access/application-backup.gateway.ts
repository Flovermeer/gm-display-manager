/**
 * But
 * Isole les dialogues de fichiers et les commandes natives de sauvegarde.
 *
 * Responsabilités
 * - sélectionne les archives sur le poste du MJ ;
 * - crée un snapshot cohérent de SQLite avant l’archivage ;
 * - prépare une restauration appliquée au prochain démarrage.
 */

import type {
  BackupCandidate,
  BackupManifest,
  BackupProgressStage,
  BackupStatus,
  RestoreProgressStage,
  RestoreResult,
} from '@app/features/backups/domain/backup.models';

export abstract class ApplicationBackupGateway {
  abstract readonly isAvailable: boolean;

  abstract selectBackupDestination(): Promise<string | null>;
  abstract selectBackupArchive(): Promise<string | null>;
  abstract createBackup(
    destinationPath: string,
    reportProgress: (stage: BackupProgressStage) => void,
  ): Promise<BackupManifest>;
  abstract createAutomaticBackup(
    reportProgress: (stage: BackupProgressStage) => void,
  ): Promise<BackupCandidate>;
  abstract getBackupStatus(): Promise<BackupStatus>;
  abstract checkDatabase(): Promise<void>;
  abstract latestAutomaticBackup(): Promise<BackupCandidate | null>;
  abstract inspectBackup(archivePath: string): Promise<BackupManifest>;
  abstract prepareRestore(
    archivePath: string,
    reportProgress: (stage: RestoreProgressStage) => void,
  ): Promise<void>;
  abstract takeRestoreResult(): Promise<RestoreResult | null>;
}
