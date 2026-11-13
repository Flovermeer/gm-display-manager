/**
 * But
 * Porte la décision de sortie lorsqu’une page contient des modifications non enregistrées.
 *
 * Responsabilités
 * - ouvre une seule demande de confirmation à la fois ;
 * - transmet la réponse du MJ à la navigation ou à l’action en attente ;
 */

import { signal } from '@angular/core';

export class PendingChangesPrompt {
  private readonly open = signal(false);
  private resolver?: (canLeave: boolean) => void;

  readonly isOpen = this.open.asReadonly();

  request(): false | Promise<boolean> {
    if (this.resolver) return false;
    this.open.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolve(canLeave: boolean): void {
    const resolve = this.resolver;
    this.resolver = undefined;
    this.open.set(false);
    resolve?.(canLeave);
  }
}
