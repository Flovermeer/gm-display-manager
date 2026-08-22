import { Injectable } from '@angular/core';
import type { UnlistenFn } from '@tauri-apps/api/event';

import { ApplicationWindowGateway } from '@app/features/backups/data-access/application-window.gateway';

@Injectable()
export class BrowserApplicationWindowGateway extends ApplicationWindowGateway {
  override readonly isPrimaryWindow = false;

  override async listenForCloseRequest(_callback: () => void): Promise<UnlistenFn> {
    return () => {};
  }

  override async close(): Promise<void> {}
}
