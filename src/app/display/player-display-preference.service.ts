import { inject, Injectable } from '@angular/core';

import { AppSettingRepository } from '@app/persistence/app-setting.repository';
import type { MonitorDescriptor } from '@app/display/display.models';

const PLAYER_DISPLAY_MONITOR_KEY = 'player_display.monitor_fingerprint';

@Injectable({ providedIn: 'root' })
export class PlayerDisplayPreferenceService {
  private readonly appSettingRepository = inject(AppSettingRepository);

  async findPreferredMonitor(
    monitors: readonly MonitorDescriptor[],
  ): Promise<MonitorDescriptor | null> {
    const fingerprint = await this.appSettingRepository.get(PLAYER_DISPLAY_MONITOR_KEY);

    if (!fingerprint) {
      return null;
    }

    const matches = monitors.filter((monitor) => monitor.fingerprint === fingerprint);
    return matches.length === 1 ? matches[0] : null;
  }

  savePreferredMonitor(monitor: MonitorDescriptor): Promise<void> {
    return this.appSettingRepository.set(PLAYER_DISPLAY_MONITOR_KEY, monitor.fingerprint);
  }
}
