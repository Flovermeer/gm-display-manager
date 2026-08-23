/**
 * But
 * Produire des événements techniques sobres et exploitables.
 *
 * Responsabilités
 * - normaliser les erreurs sans sérialiser les données métier ;
 * - limiter la taille des entrées et masquer les chemins absolus ;
 * - tolérer une panne du mécanisme de journalisation.
 */

import { inject, Injectable } from '@angular/core';

import { TechnicalLogGateway } from '@app/features/diagnostics/data-access/technical-log.gateway';

const MAX_ENTRY_LENGTH = 4_000;
const ABSOLUTE_PATH = /(?:file:\/\/\/|\b[a-zA-Z]:[\\/])[^\s)'"\]]+/g;

@Injectable({ providedIn: 'root' })
export class TechnicalLogService {
  private readonly gateway = inject(TechnicalLogGateway);

  readonly isAvailable = this.gateway.isAvailable;

  reportError(scope: string, error: unknown): void {
    void this.gateway.error(this.entry(scope, error)).catch(() => undefined);
  }

  reportWarning(scope: string, message: string): void {
    void this.gateway.warning(this.entry(scope, message)).catch(() => undefined);
  }

  reportInfo(scope: string, message: string): void {
    void this.gateway.info(this.entry(scope, message)).catch(() => undefined);
  }

  openDirectory(): Promise<void> {
    return this.gateway.openDirectory();
  }

  private entry(scope: string, value: unknown): string {
    const message = value instanceof Error ? this.errorDetails(value) : String(value);
    return `[${safeScope(scope)}] ${redactPaths(message).slice(0, MAX_ENTRY_LENGTH)}`;
  }

  private errorDetails(error: Error): string {
    return error.stack?.trim() || `${error.name}: ${error.message}`;
  }
}

function safeScope(scope: string): string {
  return scope.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'application';
}

function redactPaths(value: string): string {
  return value.replace(ABSOLUTE_PATH, '<local-path>');
}
