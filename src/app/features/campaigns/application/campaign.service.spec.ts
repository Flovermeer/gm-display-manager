import { TestBed } from '@angular/core/testing';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { InMemoryCampaignRepository } from '@app/features/campaigns/data-access/in-memory-campaign.repository';
import { CampaignRepository } from '@app/features/campaigns/data-access/campaign.repository';
import { CampaignService } from '@app/features/campaigns/application/campaign.service';

describe('CampaignService', () => {
  let service: CampaignService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        CampaignService,
        { provide: CampaignRepository, useClass: InMemoryCampaignRepository },
        { provide: AppSettingRepository, useClass: InMemoryAppSettingRepository },
      ],
    });
    service = TestBed.inject(CampaignService);
  });

  it('creates, persists and activates a campaign', async () => {
    const campaign = await service.createAndActivate({
      name: ' Tomb of Annihilation ',
      description: ' Exploration de Chult ',
      universeId: 'forgotten-realms',
    });

    await expect(service.list()).resolves.toEqual([campaign]);
    await expect(service.findById(campaign.id)).resolves.toEqual(campaign);
    await expect(service.getActiveCampaignId()).resolves.toBe(campaign.id);
  });

  it('activates an existing campaign', async () => {
    const first = await service.createAndActivate({
      name: 'Première campagne',
      universeId: 'forgotten-realms',
    });
    const second = await service.createAndActivate({
      name: 'Deuxième campagne',
      universeId: 'forgotten-realms',
    });

    await service.activate(first.id);

    await expect(service.getActiveCampaignId()).resolves.toBe(first.id);
    await expect(service.list()).resolves.toHaveLength(2);
    expect(second.id).not.toBe(first.id);
  });

  it('updates a campaign without changing its identity', async () => {
    const campaign = await service.createAndActivate({
      name: 'Tomb',
      universeId: 'forgotten-realms',
    });

    const updated = await service.update(campaign, {
      name: 'Tomb of Annihilation',
      description: 'Exploration de Chult',
    });

    expect(updated.id).toBe(campaign.id);
    await expect(service.findById(campaign.id)).resolves.toEqual(updated);
  });

  it('deletes the campaign and its active preference', async () => {
    const campaign = await service.createAndActivate({
      name: 'Tomb of Annihilation',
      universeId: 'forgotten-realms',
    });

    await service.delete(campaign);

    await expect(service.findById(campaign.id)).resolves.toBeNull();
    await expect(service.getActiveCampaignId()).resolves.toBeNull();
  });
});
