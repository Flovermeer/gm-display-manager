import { TestBed } from '@angular/core/testing';

import { AppSettingRepository } from '../persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '../persistence/in-memory-app-setting.repository';
import { InMemoryCampaignRepository } from '../persistence/in-memory-campaign.repository';
import { CampaignRepository } from './campaign.repository';
import { CampaignService } from './campaign.service';

describe('CampaignService', () => {
  let service: CampaignService;

  beforeEach(() => {
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
    });

    await expect(service.list()).resolves.toEqual([campaign]);
    await expect(service.findById(campaign.id)).resolves.toEqual(campaign);
    await expect(service.getActiveCampaignId()).resolves.toBe(campaign.id);
  });

  it('activates an existing campaign', async () => {
    const first = await service.createAndActivate({ name: 'Première campagne' });
    const second = await service.createAndActivate({ name: 'Deuxième campagne' });

    await service.activate(first.id);

    await expect(service.getActiveCampaignId()).resolves.toBe(first.id);
    await expect(service.list()).resolves.toHaveLength(2);
    expect(second.id).not.toBe(first.id);
  });
});
