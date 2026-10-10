import { TestBed } from '@angular/core/testing';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { LocationTreeStateService } from '@app/features/locations/application/location-tree-state.service';

describe('LocationTreeStateService', () => {
  let service: LocationTreeStateService;
  let settings: InMemoryAppSettingRepository;

  beforeEach(() => {
    settings = new InMemoryAppSettingRepository();
    TestBed.configureTestingModule({
      providers: [{ provide: AppSettingRepository, useValue: settings }],
    });
    service = TestBed.inject(LocationTreeStateService);
  });

  it('persists collapsed locations independently for each campaign', async () => {
    await service.save('campaign-a', new Set(['location-b', 'location-a']));
    await service.save('campaign-b', new Set(['location-c']));

    await expect(service.load('campaign-a')).resolves.toEqual(
      new Set(['location-a', 'location-b']),
    );
    await expect(service.load('campaign-b')).resolves.toEqual(new Set(['location-c']));
  });

  it('removes the preference when every branch is expanded', async () => {
    await service.save('campaign-a', new Set(['location-a']));
    await service.save('campaign-a', new Set());

    await expect(service.load('campaign-a')).resolves.toEqual(new Set());
  });

  it('ignores an invalid stored preference', async () => {
    await settings.set('campaign.locations.collapsed.campaign-a', '{invalid');

    await expect(service.load('campaign-a')).resolves.toEqual(new Set());
  });
});
