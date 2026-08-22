import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ApplicationBackupService } from '@app/features/backups/application/application-backup.service';
import type { BackupManifest } from '@app/features/backups/domain/backup.models';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';

type RestoreCandidate = Readonly<{ archivePath: string; manifest: BackupManifest }>;
type OperationState = Readonly<{
  kind: 'backup' | 'restore';
  message: string;
  progress: number | null;
  outcome: 'running' | 'success' | 'error';
}>;

@Component({
  selector: 'app-backup-settings',
  imports: [ButtonDirective, Dialog],
  templateUrl: './backup-settings.html',
  styleUrl: './backup-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupSettings {
  private readonly service = inject(ApplicationBackupService);

  protected readonly isAvailable = this.service.isAvailable;
  protected readonly operation = signal<OperationState | null>(null);
  protected readonly restoreCandidate = signal<RestoreCandidate | null>(null);

  protected async createBackup(): Promise<void> {
    const destination = await this.service.selectBackupDestination();
    if (!destination) return;

    this.operation.set({
      kind: 'backup',
      message: 'Préparation de la base SQLite…',
      progress: 20,
      outcome: 'running',
    });
    try {
      await this.service.createBackup(destination, (stage) => {
        this.operation.set(
          stage === 'database'
            ? {
                kind: 'backup',
                message: 'Création d’une copie cohérente de la base SQLite…',
                progress: 25,
                outcome: 'running',
              }
            : {
                kind: 'backup',
                message: 'Archivage de la base et des médias…',
                progress: null,
                outcome: 'running',
              },
        );
      });
      this.operation.set({
        kind: 'backup',
        message: 'La sauvegarde complète a été créée.',
        progress: 100,
        outcome: 'success',
      });
    } catch (error) {
      this.showError('backup', error);
    }
  }

  protected async selectRestoreArchive(): Promise<void> {
    const archivePath = await this.service.selectBackupArchive();
    if (!archivePath) return;

    this.operation.set({
      kind: 'restore',
      message: 'Validation de la sauvegarde…',
      progress: null,
      outcome: 'running',
    });
    try {
      const manifest = await this.service.inspectBackup(archivePath);
      this.operation.set(null);
      this.restoreCandidate.set({ archivePath, manifest });
    } catch (error) {
      this.showError('restore', error);
    }
  }

  protected cancelRestore(): void {
    this.restoreCandidate.set(null);
  }

  protected async confirmRestore(): Promise<void> {
    const candidate = this.restoreCandidate();
    if (!candidate) return;
    this.restoreCandidate.set(null);
    this.operation.set({
      kind: 'restore',
      message: 'Préparation de la restauration…',
      progress: null,
      outcome: 'running',
    });

    try {
      await this.service.prepareRestore(candidate.archivePath, () => {
        this.operation.set({
          kind: 'restore',
          message: 'Préparation terminée. Redémarrage automatique…',
          progress: null,
          outcome: 'running',
        });
      });
    } catch (error) {
      this.showError('restore', error);
    }
  }

  protected closeOperation(): void {
    if (this.operation()?.outcome !== 'running') this.operation.set(null);
  }

  protected formatBackupDate(timestamp: number): string {
    return new Intl.DateTimeFormat('fr-BE', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }

  protected errorTitle(kind: OperationState['kind']): string {
    return kind === 'backup' ? 'Sauvegarde interrompue' : 'Restauration interrompue';
  }

  protected operationTitle(operation: OperationState): string {
    if (operation.outcome === 'error') return this.errorTitle(operation.kind);
    if (operation.outcome === 'success') return 'Sauvegarde terminée';
    return operation.kind === 'backup' ? 'Sauvegarde en cours' : 'Restauration en cours';
  }

  private showError(kind: OperationState['kind'], error: unknown): void {
    this.operation.set({
      kind,
      message: error instanceof Error ? error.message : String(error),
      progress: 0,
      outcome: 'error',
    });
  }
}
