/**
 * But
 * Orchestre la sauvegarde et la restauration complètes de l’application.
 *
 * Responsabilités
 * - expose le flux desktop à l’interface de configuration ;
 * - relaie le résultat d’une restauration après le redémarrage automatique.
 * - planifie les archives automatiques et contrôle la fermeture de l’application ;
 * - propose une restauration lorsque le contrôle SQLite initial échoue.
 */

import { inject, Injectable, signal } from '@angular/core';
import type { UnlistenFn } from '@tauri-apps/api/event';

import { ApplicationBackupGateway } from '@app/features/backups/data-access/application-backup.gateway';
import { ApplicationWindowGateway } from '@app/features/backups/data-access/application-window.gateway';
import type {
  BackupCandidate,
  BackupManifest,
  BackupProgressStage,
  BackupStatus,
  RestoreProgressStage,
} from '@app/features/backups/domain/backup.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';
import { errorMessage } from '@app/shared/error-message';

const AUTOMATIC_BACKUP_INTERVAL = 30 * 60 * 1_000;

type ClosePromptState = Readonly<{
  isSaving: boolean;
  error: string | null;
}>;

type RecoveryState = Readonly<{
  reason: string;
  candidate: BackupCandidate | null;
  isSelecting: boolean;
  isRestoring: boolean;
  error: string | null;
}>;

@Injectable({ providedIn: 'root' })
export class ApplicationBackupService {
  private readonly gateway = inject(ApplicationBackupGateway);
  private readonly applicationWindow = inject(ApplicationWindowGateway);
  private readonly toast = inject(ToastService);
  private readonly log = inject(TechnicalLogService);
  private closeUnlisten: UnlistenFn | null = null;
  private automaticBackupTimer: number | null = null;
  private automaticBackupPromise: Promise<void> | null = null;
  private manualBackupPromise: Promise<BackupManifest> | null = null;
  private closeRequestInProgress = false;

  readonly isAvailable = this.gateway.isAvailable;
  readonly closePrompt = signal<ClosePromptState | null>(null);
  readonly recovery = signal<RecoveryState | null>(null);

  async initialize(): Promise<void> {
    await this.announceRestoreResult();
    if (!this.isAvailable || !this.applicationWindow.isPrimaryWindow) return;

    try {
      await this.gateway.checkDatabase();
    } catch (error) {
      this.log.reportError('backup.database-check', error);
      const candidate = await this.gateway.latestAutomaticBackup().catch((candidateError) => {
        this.log.reportError('backup.latest-automatic', candidateError);
        return null;
      });
      this.recovery.set({
        reason: errorMessage(error),
        candidate,
        isSelecting: false,
        isRestoring: false,
        error: null,
      });
      return;
    }

    await this.startLifecycle();
  }

  selectBackupDestination(): Promise<string | null> {
    return this.gateway.selectBackupDestination();
  }

  selectBackupArchive(): Promise<string | null> {
    return this.gateway.selectBackupArchive();
  }

  createBackup(
    destinationPath: string,
    reportProgress: (stage: BackupProgressStage) => void,
  ): Promise<BackupManifest> {
    const operation = this.afterAutomaticBackup(() =>
      this.gateway.createBackup(destinationPath, reportProgress),
    ).catch((error) => {
      this.log.reportError('backup.manual', error);
      throw error;
    });
    this.manualBackupPromise = operation;
    void operation.then(
      () => this.clearManualBackup(operation),
      () => this.clearManualBackup(operation),
    );
    return operation;
  }

  inspectBackup(archivePath: string): Promise<BackupManifest> {
    return this.gateway.inspectBackup(archivePath).catch((error) => {
      this.log.reportError('backup.inspect', error);
      throw error;
    });
  }

  prepareRestore(
    archivePath: string,
    reportProgress: (stage: RestoreProgressStage) => void,
  ): Promise<void> {
    return this.prepareRestoreAndRestart(archivePath, reportProgress).catch((error) => {
      this.log.reportError('backup.restore', error);
      throw error;
    });
  }

  async chooseRecoveryArchive(): Promise<void> {
    const recovery = this.recovery();
    if (!recovery || recovery.isRestoring) return;
    this.recovery.set({ ...recovery, isSelecting: true, error: null });
    try {
      const archivePath = await this.gateway.selectBackupArchive();
      if (!archivePath) return;
      const manifest = await this.gateway.inspectBackup(archivePath);
      this.recovery.set({
        ...recovery,
        candidate: { archivePath, manifest },
        isSelecting: false,
        error: null,
      });
    } catch (error) {
      this.log.reportError('backup.recovery-selection', error);
      this.recovery.set({
        ...recovery,
        isSelecting: false,
        error: errorMessage(error),
      });
    } finally {
      const current = this.recovery();
      if (current?.isSelecting) this.recovery.set({ ...current, isSelecting: false });
    }
  }

  async restoreRecoveryCandidate(): Promise<void> {
    const recovery = this.recovery();
    if (!recovery?.candidate || recovery.isRestoring) return;
    this.recovery.set({ ...recovery, isRestoring: true, error: null });
    try {
      await this.prepareRestoreAndRestart(recovery.candidate.archivePath, () => {});
    } catch (error) {
      this.log.reportError('backup.recovery-restore', error);
      this.recovery.set({
        ...recovery,
        isRestoring: false,
        error: errorMessage(error),
      });
    }
  }

  cancelClose(): void {
    if (!this.closePrompt()?.isSaving) this.closePrompt.set(null);
  }

  async saveAndClose(): Promise<void> {
    const prompt = this.closePrompt();
    if (!prompt || prompt.isSaving) return;
    this.closePrompt.set({ isSaving: true, error: null });
    try {
      await this.runAutomaticBackup(true);
      await this.closeApplication();
    } catch (error) {
      this.log.reportError('backup.close-save', error);
      this.closePrompt.set({ isSaving: false, error: errorMessage(error) });
    }
  }

  async quitWithoutBackup(): Promise<void> {
    try {
      await this.closeApplication();
    } catch (error) {
      this.log.reportError('backup.close-without-save', error);
      const message = errorMessage(error);
      const recovery = this.recovery();
      if (recovery) this.recovery.set({ ...recovery, error: message });
      else this.closePrompt.set({ isSaving: false, error: message });
    }
  }

  async announceRestoreResult(): Promise<void> {
    try {
      const result = await this.gateway.takeRestoreResult();
      if (!result) return;
      if (result.success) this.toast.success(result.message);
      else this.toast.warning(result.message);
    } catch (error) {
      this.log.reportError('backup.restore-result', error);
      this.toast.warning(
        'Le résultat de la restauration n’a pas pu être lu. Vérifie les données avant de jouer.',
      );
    }
  }

  private async startLifecycle(): Promise<void> {
    this.closeUnlisten ??= await this.applicationWindow.listenForCloseRequest(() => {
      void this.handleCloseRequest();
    });
    this.automaticBackupTimer ??= window.setInterval(() => {
      void this.runAutomaticBackup(false);
    }, AUTOMATIC_BACKUP_INTERVAL);
  }

  private async handleCloseRequest(): Promise<void> {
    if (this.closePrompt() || this.recovery() || this.closeRequestInProgress) return;
    this.closeRequestInProgress = true;
    try {
      if (this.manualBackupPromise) await this.manualBackupPromise.catch(() => undefined);
      if (this.automaticBackupPromise) await this.automaticBackupPromise.catch(() => undefined);
      let status: BackupStatus;
      try {
        status = await this.gateway.getBackupStatus();
      } catch (error) {
        this.log.reportError('backup.close-status', error);
        this.closePrompt.set({
          isSaving: false,
          error: `Impossible de vérifier la dernière sauvegarde : ${errorMessage(error)}`,
        });
        return;
      }
      if (!status.hasChanges) {
        try {
          await this.closeApplication();
        } catch (error) {
          this.log.reportError('backup.close', error);
          this.closePrompt.set({
            isSaving: false,
            error: `Impossible de fermer l’application : ${errorMessage(error)}`,
          });
        }
        return;
      }
      this.closePrompt.set({ isSaving: false, error: null });
    } finally {
      this.closeRequestInProgress = false;
    }
  }

  private runAutomaticBackup(required: boolean): Promise<void> {
    if (this.automaticBackupPromise) return this.automaticBackupPromise;
    const operation = (async () => {
      if (this.manualBackupPromise) await this.manualBackupPromise;
      const status = await this.gateway.getBackupStatus();
      if (!status.hasChanges) return;
      await this.gateway.createAutomaticBackup(() => {});
    })();
    this.automaticBackupPromise = operation;
    void operation
      .catch((error) => {
        this.log.reportError('backup.automatic', error);
        if (!required) {
          this.toast.warning(`Sauvegarde automatique impossible : ${errorMessage(error)}`);
        }
      })
      .finally(() => {
        if (this.automaticBackupPromise === operation) this.automaticBackupPromise = null;
      });
    return operation;
  }

  private async afterAutomaticBackup<T>(operation: () => Promise<T>): Promise<T> {
    if (this.automaticBackupPromise) await this.automaticBackupPromise;
    return operation();
  }

  private clearManualBackup(operation: Promise<BackupManifest>): void {
    if (this.manualBackupPromise === operation) this.manualBackupPromise = null;
  }

  private async prepareRestoreAndRestart(
    archivePath: string,
    reportProgress: (stage: RestoreProgressStage) => void,
  ): Promise<void> {
    await this.stopCloseInterception();
    try {
      await this.gateway.prepareRestore(archivePath, reportProgress);
    } catch (error) {
      if (!this.recovery()) await this.startLifecycle();
      throw error;
    }
  }

  private async closeApplication(): Promise<void> {
    await this.stopCloseInterception();
    try {
      await this.applicationWindow.close();
    } catch (error) {
      if (!this.recovery()) await this.startLifecycle();
      throw error;
    }
  }

  private async stopCloseInterception(): Promise<void> {
    this.closeUnlisten?.();
    this.closeUnlisten = null;
    if (this.automaticBackupTimer !== null) {
      window.clearInterval(this.automaticBackupTimer);
      this.automaticBackupTimer = null;
    }
  }
}
