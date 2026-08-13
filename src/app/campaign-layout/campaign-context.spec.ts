import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import { CampaignContext } from './campaign-context';

describe('CampaignContext', () => {
  it('loads and activates the parent campaign only once for all child pages', async () => {
    const campaign: Campaign = {
      id: 'campaign-id',
      name: 'Tomb of Annihilation',
      description: '',
      systemKey: 'dnd5e',
      createdAt: '2026-08-13T08:00:00.000Z',
      updatedAt: '2026-08-13T08:00:00.000Z',
    };
    const campaignService = {
      findById: vi.fn().mockResolvedValue(campaign),
      activate: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        CampaignContext,
        { provide: CampaignService, useValue: campaignService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => campaign.id } } },
        },
      ],
    });
    const context = TestBed.inject(CampaignContext);

    await expect(Promise.all([context.load(), context.load()])).resolves.toEqual([
      campaign,
      campaign,
    ]);
    expect(context.campaign()).toBe(campaign);
    expect(campaignService.findById).toHaveBeenCalledOnce();
    expect(campaignService.activate).toHaveBeenCalledOnce();
  });
});
