import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

import { ApplicationWindowGateway } from '@app/features/backups/data-access/application-window.gateway';

@Injectable()
export class TauriApplicationWindowGateway extends ApplicationWindowGateway {
  override readonly isPrimaryWindow = getCurrentWebviewWindow().label === 'main';

  override listenForCloseRequest(callback: () => void): Promise<UnlistenFn> {
    return getCurrentWebviewWindow().onCloseRequested((event) => {
      event.preventDefault();
      callback();
    });
  }

  override close(): Promise<void> {
    return invoke('exit_application');
  }
}
