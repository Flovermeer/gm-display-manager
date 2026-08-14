import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignService } from '@app/features/campaigns/application/campaign.service';
import { CampaignHome } from '@app/features/campaigns/pages/campaign-home/campaign-home';
import { GameSystemService } from '@app/features/game-systems/application/game-system.service';

describe('CampaignHome', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: 'Exploration de Chult',
    universeId: 'forgotten-realms',
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const campaignService = {
    list: vi.fn(),
    getActiveCampaignId: vi.fn(),
    activate: vi.fn(),
    createAndActivate: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const router = {
    navigate: vi.fn(),
    createUrlTree: vi.fn(() => ({ toString: () => '/configuration' })),
    serializeUrl: vi.fn(() => '/configuration'),
  };
  const gameSystemService = {
    listSystems: vi.fn(),
    listUniverses: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    campaignService.list.mockResolvedValue([campaign]);
    campaignService.getActiveCampaignId.mockResolvedValue(campaign.id);
    campaignService.activate.mockResolvedValue(undefined);
    campaignService.createAndActivate.mockResolvedValue(campaign);
    campaignService.update.mockResolvedValue(campaign);
    campaignService.delete.mockResolvedValue(undefined);
    router.navigate.mockResolvedValue(true);
    gameSystemService.listSystems.mockResolvedValue([
      {
        id: 'dnd5e',
        name: 'Dungeons & Dragons 5e',
        deletedAt: null,
        createdAt: '2026-08-12T18:30:00.000Z',
        updatedAt: '2026-08-12T18:30:00.000Z',
      },
    ]);
    gameSystemService.listUniverses.mockResolvedValue([
      {
        id: 'forgotten-realms',
        gameSystemId: 'dnd5e',
        name: 'Forgotten Realms',
        deletedAt: null,
        createdAt: '2026-08-12T18:30:00.000Z',
        updatedAt: '2026-08-12T18:30:00.000Z',
      },
    ]);

    await TestBed.configureTestingModule({
      imports: [CampaignHome],
      providers: [
        { provide: CampaignService, useValue: campaignService },
        { provide: GameSystemService, useValue: gameSystemService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();
  });

  it('shows the campaigns and highlights the last opened one', async () => {
    const fixture = TestBed.createComponent(CampaignHome);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tomb of Annihilation');
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
    if (!nameInput) {
      throw new Error('Campaign form not found.');
    }

    nameInput.value = 'Tomb of Annihilation';
    nameInput.dispatchEvent(new Event('input'));
    const component = fixture.componentInstance as unknown as {
      campaignForm: { setValue: (value: Record<string, string>) => void };
      gameSystems: () => readonly unknown[];
      universes: () => readonly unknown[];
      saveCampaign: () => Promise<void>;
    };
    await vi.waitFor(() => {
      expect(component.gameSystems()).toHaveLength(1);
      expect(component.universes()).toHaveLength(1);
    });
    component.campaignForm.setValue({
      name: 'Tomb of Annihilation',
      description: '',
      gameSystemId: 'dnd5e',
      universeId: 'forgotten-realms',
    });
    fixture.detectChanges();
    await component.saveCampaign();

    await renderUntil(fixture, 'Confirmer la création');
    findButton(element, 'Confirmer la création')?.click();

    await vi.waitFor(() => {
      expect(campaignService.createAndActivate).toHaveBeenCalledWith({
        name: 'Tomb of Annihilation',
        description: '',
        universeId: 'forgotten-realms',
        systemName: 'Dungeons & Dragons 5e',
        universeName: 'Forgotten Realms',
      });
      expect(router.navigate).toHaveBeenCalledWith(['/campaigns', campaign.id]);
    });
  });

  it('edits a campaign without opening it', async () => {
    const updatedCampaign = { ...campaign, name: 'Tomb of Annihilation — Chult' };
    campaignService.update.mockResolvedValue(updatedCampaign);
    const fixture = TestBed.createComponent(CampaignHome);
    fixture.detectChanges();
    await renderUntil(fixture, 'Tomb of Annihilation');
    const element = fixture.nativeElement as HTMLElement;

    findButton(element, 'Modifier')?.click();
    await renderUntil(fixture, 'Modifier la campagne');
    const nameInput = element.querySelector<HTMLInputElement>('#campaign-name');
    if (!nameInput) {
      throw new Error('Campaign name field not found.');
    }
    nameInput.value = updatedCampaign.name;
    nameInput.dispatchEvent(new Event('input'));
    element.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(campaignService.update).toHaveBeenCalledWith(campaign, {
        name: updatedCampaign.name,
        description: campaign.description,
        gameSystemId: 'dnd5e',
        universeId: campaign.universeId,
      });
      fixture.detectChanges();
      expect(element.textContent).toContain(updatedCampaign.name);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  it('requires explicit confirmation before deleting a campaign', async () => {
    campaignService.list.mockResolvedValueOnce([campaign]).mockResolvedValueOnce([]);
    campaignService.getActiveCampaignId
      .mockResolvedValueOnce(campaign.id)
      .mockResolvedValueOnce(null);
    const fixture = TestBed.createComponent(CampaignHome);
    fixture.detectChanges();
    await renderUntil(fixture, 'Tomb of Annihilation');
    const element = fixture.nativeElement as HTMLElement;

    findButton(element, 'Supprimer')?.click();
    await renderUntil(fixture, 'Supprimer définitivement');
    expect(campaignService.delete).not.toHaveBeenCalled();

    findButton(element, 'Supprimer définitivement')?.click();

    await vi.waitFor(() => {
      expect(campaignService.delete).toHaveBeenCalledWith(campaign);
      fixture.detectChanges();
      expect(element.textContent).toContain('Aucune campagne');
    });
  });
});

async function renderUntil(fixture: ComponentFixture<CampaignHome>, text: string) {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}

function findButton(element: HTMLElement, text: string): HTMLButtonElement | undefined {
  return [...element.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === text,
  );
}
