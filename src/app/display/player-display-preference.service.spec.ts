import { TestBed } from '@angular/core/testing';

import { AppSettingRepository } from '../persistence/app-setting.repository';
import type { MonitorDescriptor } from './display.models';
import { PlayerDisplayPreferenceService } from './player-display-preference.service';

class InMemoryAppSettingRepository extends AppSettingRepository {
  readonly values = new Map<string, string>();

  override get(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  override set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }
}

describe('PlayerDisplayPreferenceService', () => {
  let repository: InMemoryAppSettingRepository;
  let service: PlayerDisplayPreferenceService;

  beforeEach(() => {
    repository = new InMemoryAppSettingRepository();
    TestBed.configureTestingModule({
      providers: [
        PlayerDisplayPreferenceService,
        { provide: AppSettingRepository, useValue: repository },
      ],
    });
    service = TestBed.inject(PlayerDisplayPreferenceService);
  });

  it('restores the single monitor matching the stored fingerprint', async () => {
    const monitor = createMonitor({
      id: 'runtime-id',
      fingerprint: 'dell|1920x1080|1',
    });
    await service.savePreferredMonitor(monitor);

    await expect(service.findPreferredMonitor([monitor])).resolves.toEqual(monitor);
  });

  it('does not guess when identical monitors share a fingerprint', async () => {
    const first = createMonitor({
      id: 'left',
      fingerprint: 'dell|1920x1080|1',
    });
    const second = createMonitor({
      id: 'right',
      fingerprint: 'dell|1920x1080|1',
    });
    await service.savePreferredMonitor(first);

    await expect(service.findPreferredMonitor([first, second])).resolves.toBeNull();
  });

  it('returns null when no preference has been stored', async () => {
    await expect(service.findPreferredMonitor([createMonitor()])).resolves.toBeNull();
  });
});

function createMonitor(overrides: Partial<MonitorDescriptor> = {}): MonitorDescriptor {
  return {
    id: 'monitor-id',
    fingerprint: 'monitor|1920x1080|1',
    name: 'Monitor',
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    scaleFactor: 1,
    isPrimary: false,
    ...overrides,
  };
}
