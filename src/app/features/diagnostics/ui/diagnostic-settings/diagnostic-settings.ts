import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ApplicationDiagnosticsService } from '@app/features/diagnostics/application/application-diagnostics.service';
import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';
import type { MediaIssue, MediaKind } from '@app/features/diagnostics/domain/diagnostic.models';
import { errorMessage } from '@app/shared/error-message';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';

@Component({
  selector: 'app-diagnostic-settings',
  imports: [ButtonDirective],
  templateUrl: './diagnostic-settings.html',
  styleUrl: './diagnostic-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticSettings {
  private readonly diagnostics = inject(ApplicationDiagnosticsService);
  private readonly log = inject(TechnicalLogService);

  protected readonly isAvailable = this.diagnostics.isAvailable && this.log.isAvailable;
  protected readonly media = this.diagnostics.media;
  protected readonly logError = signal<string | null>(null);

  protected async openLogDirectory(): Promise<void> {
    this.logError.set(null);
    try {
      await this.log.openDirectory();
    } catch (error) {
      this.log.reportError('log.open-directory', error);
      this.logError.set(errorMessage(error, 'Impossible d’ouvrir le dossier des journaux.'));
    }
  }

  protected checkMedia(): void {
    void this.diagnostics.checkMedia();
  }

  protected replaceMedia(issue: MediaIssue): void {
    void this.diagnostics.replaceMedia(issue);
  }

  protected mediaLabel(kind: MediaKind): string {
    return MEDIA_LABELS[kind];
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-BE', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}

const MEDIA_LABELS: Readonly<Record<MediaKind, string>> = {
  'npc-portrait': 'Portrait de PNJ',
  'npc-idle-video': 'Animation de PNJ',
  'player-character-portrait': 'Portrait de PJ',
  'location-image': 'Illustration de lieu',
  'item-image': 'Illustration d’objet',
  'monster-image': 'Illustration de monstre',
};
