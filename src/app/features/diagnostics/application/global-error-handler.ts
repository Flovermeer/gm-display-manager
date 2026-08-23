/**
 * But
 * Intercepter les erreurs Angular inattendues au dernier niveau.
 *
 * Responsabilités
 * - conserver le détail technique dans le journal local ;
 * - avertir le MJ sans exposer une erreur interne brute.
 */

import { ErrorHandler, inject, Injectable } from '@angular/core';

import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly log = inject(TechnicalLogService);
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
    this.log.reportError('angular.unhandled', unwrapError(error));
    this.toast.warning(
      'Une erreur inattendue est survenue. Les détails ont été ajoutés au journal technique.',
    );
  }
}

function unwrapError(error: unknown): unknown {
  if (
    typeof error === 'object' &&
    error !== null &&
    'rejection' in error &&
    (error as { rejection?: unknown }).rejection !== undefined
  ) {
    return (error as { rejection: unknown }).rejection;
  }
  return error;
}
