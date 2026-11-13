import { Injectable } from '@angular/core';

import { TechnicalLogGateway } from '@app/features/diagnostics/data-access/technical-log.gateway';

@Injectable()
export class BrowserTechnicalLogGateway extends TechnicalLogGateway {
  override readonly isAvailable = false;

  // Hors de Tauri, aucun journal technique n'est écrit sur disque.
  override async info(_message: string): Promise<void> {
    return;
  }

  override async warning(_message: string): Promise<void> {
    return;
  }

  override async error(_message: string): Promise<void> {
    return;
  }

  override async openDirectory(): Promise<void> {
    return;
  }
}
