/**
 * But
 * Protège la navigation lorsqu’une page contient des modifications non enregistrées.
 *
 * Responsabilités
 * - définit le contrat commun des pages concernées ;
 * - délègue la décision de sortie à la page active ;
 */

import type { CanDeactivateFn } from '@angular/router';

export interface PendingChangesAware {
  canDeactivate(): boolean | Promise<boolean>;
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesAware> = (component) =>
  component.canDeactivate();
