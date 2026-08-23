import { Injectable } from '@angular/core';

import { TechnicalLogGateway } from '@app/features/diagnostics/data-access/technical-log.gateway';

@Injectable()
export class BrowserTechnicalLogGateway extends TechnicalLogGateway {
  override readonly isAvailable = false;

  override async info(_message: string): Promise<void> {}
  override async warning(_message: string): Promise<void> {}
  override async error(_message: string): Promise<void> {}
  override async openDirectory(): Promise<void> {}
}
