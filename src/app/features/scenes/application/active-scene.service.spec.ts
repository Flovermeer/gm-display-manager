import { TestBed } from '@angular/core/testing';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';

describe('ActiveSceneService', () => {
  let service: ActiveSceneService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ActiveSceneService,
        { provide: AppSettingRepository, useClass: InMemoryAppSettingRepository },
      ],
    });
    service = TestBed.inject(ActiveSceneService);
  });

  it('persists one active scene per campaign and clears only the matching scene', async () => {
    await service.set('campaign-id', 'scene-id');
    await expect(service.get('campaign-id')).resolves.toBe('scene-id');
    await expect(service.clearIfActive('campaign-id', 'other-scene')).resolves.toBe(false);
    await expect(service.get('campaign-id')).resolves.toBe('scene-id');
    await expect(service.clearIfActive('campaign-id', 'scene-id')).resolves.toBe(true);
    await expect(service.get('campaign-id')).resolves.toBeNull();
  });
});
