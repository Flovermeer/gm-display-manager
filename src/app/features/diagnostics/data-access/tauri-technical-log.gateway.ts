import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { error, info, warn } from '@tauri-apps/plugin-log';

import { TechnicalLogGateway } from '@app/features/diagnostics/data-access/technical-log.gateway';

@Injectable()
export class TauriTechnicalLogGateway extends TechnicalLogGateway {
  override readonly isAvailable = true;

  override info(message: string): Promise<void> {
    return info(message);
  }

  override warning(message: string): Promise<void> {
    return warn(message);
  }

  override error(message: string): Promise<void> {
    return error(message);
  }

  override openDirectory(): Promise<void> {
    return invoke('open_log_directory');
  }
}
