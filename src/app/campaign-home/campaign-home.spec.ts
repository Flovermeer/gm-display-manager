import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import { CampaignHome } from './campaign-home';

describe('CampaignHome', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: 'Exploration de Chult',
    systemKey: 'dnd5e',
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const campaignService = {
    list: vi.fn(),
    getActiveCampaignId: vi.fn(),
    activate: vi.fn(),
    createAndActivate: vi.fn(),
  };
  const router = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    campaignService.list.mockResolvedValue([campaign]);
    campaignService.getActiveCampaignId.mockResolvedValue(campaign.id);
    campaignService.activate.mockResolvedValue(undefined);
    campaignService.createAndActivate.mockResolvedValue(campaign);
    router.navigate.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [CampaignHome],
      providers: [
        { provide: CampaignService, useValue: campaignService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  it('shows the campaigns and highlights the last opened one', async () => {
    const fixture = TestBed.createComponent(CampaignHome);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Tomb of Annihilation',
      );
    });

    const content = (fixture.nativeElement as HTMLElement).textContent;
    expect(content).toContain('Dernière ouverte');
  });

  it('opens a campaign as soon as its card is clicked', async () => {
    const fixture = TestBed.createComponent(CampaignHome);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.campaign-card'),
      ).toBeTruthy();
    });

    const card = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.campaign-card',
    );
    card?.click();

    await vi.waitFor(() => {
      expect(campaignService.activate).toHaveBeenCalledWith(campaign.id);
      expect(router.navigate).toHaveBeenCalledWith(['/campaigns', campaign.id]);
    });
  });

  it('creates and immediately opens a valid campaign', async () => {
    const fixture = TestBed.createComponent(CampaignHome);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const nameInput = element.querySelector<HTMLInputElement>('#campaign-name');
    const form = element.querySelector<HTMLFormElement>('form');

    if (!nameInput || !form) {
      throw new Error('Campaign form not found.');
    }

    nameInput.value = 'Tomb of Annihilation';
    nameInput.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(campaignService.createAndActivate).toHaveBeenCalledWith({
        name: 'Tomb of Annihilation',
        description: '',
        systemKey: 'dnd5e',
      });
      expect(router.navigate).toHaveBeenCalledWith(['/campaigns', campaign.id]);
    });
  });
});
