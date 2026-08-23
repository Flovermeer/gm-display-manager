/**
 * But
 * Orchestrer le contrôle léger des médias locaux.
 *
 * Responsabilités
 * - lancer un contrôle automatique dans la fenêtre principale ;
 * - exposer le rapport courant à Configuration ;
 * - remplacer puis revérifier un média défaillant.
 */

import { inject, Injectable, signal } from '@angular/core';

import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';
import { MediaDiagnosticGateway } from '@app/features/diagnostics/data-access/media-diagnostic.gateway';
import type {
  MediaDiagnosticResult,
  MediaIssue,
} from '@app/features/diagnostics/domain/diagnostic.models';
import { errorMessage } from '@app/shared/error-message';

type MediaDiagnosticState = Readonly<{
  isChecking: boolean;
  replacingPath: string | null;
  result: MediaDiagnosticResult | null;
  error: string | null;
}>;

const INITIAL_STATE: MediaDiagnosticState = {
  isChecking: false,
  replacingPath: null,
  result: null,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class ApplicationDiagnosticsService {
  private readonly gateway = inject(MediaDiagnosticGateway);
  private readonly log = inject(TechnicalLogService);

  readonly isAvailable = this.gateway.isAvailable;
  readonly media = signal<MediaDiagnosticState>(INITIAL_STATE);

  async initialize(): Promise<void> {
    if (!this.gateway.isAvailable || !this.gateway.isPrimaryWindow) return;
    await this.checkMedia();
  }

  async checkMedia(): Promise<void> {
    if (!this.gateway.isAvailable || this.media().isChecking) return;
    this.media.update((state) => ({ ...state, isChecking: true, error: null }));
    try {
      const references = await this.gateway.listReferences();
      const statuses = await Promise.all(
        references.map(async (reference) => ({
          reference,
          status: await this.gateway.inspectFile(reference),
        })),
      );
      const issues: MediaIssue[] = statuses.flatMap(({ reference, status }) =>
        status === 'healthy' ? [] : [{ ...reference, reason: status }],
      );
      this.media.update((state) => ({
        ...state,
        isChecking: false,
        result: {
          checkedAt: new Date().toISOString(),
          checkedCount: references.length,
          issues,
        },
      }));
      if (issues.length > 0) {
        this.log.reportWarning('media.check', `${issues.length} média(s) indisponible(s).`);
      } else {
        this.log.reportInfo('media.check', `${references.length} média(s) vérifié(s).`);
      }
    } catch (error) {
      this.log.reportError('media.check', error);
      this.media.update((state) => ({
        ...state,
        isChecking: false,
        error: errorMessage(error, 'Impossible de contrôler les médias locaux.'),
      }));
    }
  }

  async replaceMedia(issue: MediaIssue): Promise<void> {
    if (this.media().replacingPath) return;
    this.media.update((state) => ({ ...state, replacingPath: issue.relativePath, error: null }));
    try {
      if (await this.gateway.replaceFile(issue)) {
        this.log.reportInfo('media.replace', `Média remplacé (${issue.kind}).`);
        await this.checkMedia();
      }
    } catch (error) {
      this.log.reportError('media.replace', error);
      this.media.update((state) => ({
        ...state,
        error: errorMessage(error, 'Impossible de remplacer ce média.'),
      }));
    } finally {
      this.media.update((state) => ({ ...state, replacingPath: null }));
    }
  }
}
