import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import type { CampaignMap } from '@app/features/campaign-map/domain/campaign-map';
import { CampaignMapService } from '@app/features/campaign-map/application/campaign-map.service';
import { CampaignMapPage } from '@app/features/campaign-map/pages/campaign-map-page/campaign-map-page';

describe('CampaignMapPage', () => {
  it('loads and renders the automatic campaign structure', async () => {
    const service = { load: vi.fn().mockResolvedValue(map) };
    await TestBed.configureTestingModule({
      imports: [CampaignMapPage],
      providers: [
        provideRouter([]),
        { provide: CampaignContext, useValue: { load: () => Promise.resolve(campaign) } },
        { provide: CampaignMapService, useValue: service },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CampaignMapPage);
    fixture.detectChanges();

    await renderUntil(fixture, 'Le port');

    expect(service.load).toHaveBeenCalledWith(campaign);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      '1 chapitre(s) · 0 scène(s)',
    );
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

const map: CampaignMap = {
  campaignId: campaign.id,
  campaignName: campaign.name,
  sceneCount: 0,
  chapters: [{ id: 'chapter-id', title: 'Le port', summary: '', mentions: [], scenes: [] }],
};

async function renderUntil(
  fixture: ComponentFixture<CampaignMapPage>,
  text: string,
): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
