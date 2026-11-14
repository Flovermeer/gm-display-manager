import { TestBed } from '@angular/core/testing';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { NpcListStateService } from '@app/features/npcs/application/npc-list-state.service';

describe('NpcListStateService', () => {
  let service: NpcListStateService;
  let settings: InMemoryAppSettingRepository;

  beforeEach(() => {
    settings = new InMemoryAppSettingRepository();
    TestBed.configureTestingModule({
      providers: [{ provide: AppSettingRepository, useValue: settings }],
    });
    service = TestBed.inject(NpcListStateService);
  });

  it('persists collapsed groups independently for each campaign', async () => {
    await service.save('campaign-a', new Set(['organization', 'character']));
    await service.save('campaign-b', new Set(['character']));

    await expect(service.load('campaign-a')).resolves.toEqual(
      new Set(['character', 'organization']),
    );
    await expect(service.load('campaign-b')).resolves.toEqual(new Set(['character']));
  });

  it('removes the preference when every group is expanded', async () => {
    await service.save('campaign-a', new Set(['organization']));
    await service.save('campaign-a', new Set());

    await expect(service.load('campaign-a')).resolves.toEqual(new Set());
  });

  it('ignores invalid stored values', async () => {
    await settings.set('campaign.npcs.collapsed.campaign-a', '["organization","monster",3]');
    await settings.set('campaign.npcs.collapsed.campaign-b', '{invalid');

    await expect(service.load('campaign-a')).resolves.toEqual(new Set(['organization']));
    await expect(service.load('campaign-b')).resolves.toEqual(new Set());
  });
});
