import { TestBed } from '@angular/core/testing';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { ChapterService } from '@app/features/chapters/application/chapter.service';
import { SceneService } from '@app/features/scenes/application/scene.service';
import { CampaignMapService } from '@app/features/campaign-map/application/campaign-map.service';

describe('CampaignMapService', () => {
  it('loads the existing campaign structure without a dedicated repository', async () => {
    const chapterService = { list: vi.fn().mockResolvedValue([]) };
    const sceneService = { list: vi.fn().mockResolvedValue([]) };
    TestBed.configureTestingModule({
      providers: [
        CampaignMapService,
        { provide: ChapterService, useValue: chapterService },
        { provide: SceneService, useValue: sceneService },
      ],
    });

    const map = await TestBed.inject(CampaignMapService).load(campaign);

    expect(chapterService.list).toHaveBeenCalledWith(campaign.id);
    expect(sceneService.list).toHaveBeenCalledWith(campaign.id);
    expect(map).toEqual({
      campaignId: campaign.id,
      campaignName: campaign.name,
      chapters: [],
      sceneCount: 0,
    });
  });
});

const campaign: Campaign = {
  id: 'campaign-id',
  name: 'Tomb of Annihilation',
  description: '',
  universeId: 'forgotten-realms',
  createdAt: '2026-08-24T08:00:00.000Z',
  updatedAt: '2026-08-24T08:00:00.000Z',
};
