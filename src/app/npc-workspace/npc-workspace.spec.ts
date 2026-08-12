import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import { DisplayGateway } from '../display/display.gateway';
import { NpcPortraitGateway } from '../media/npc-portrait.gateway';
import type { Npc } from '../npc/npc';
import { NpcService } from '../npc/npc.service';
import { NpcWorkspace } from './npc-workspace';

describe('NpcWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    systemKey: 'dnd5e',
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const npc: Npc = {
    id: 'npc-id',
    campaignId: campaign.id,
    name: 'Syndra Silvane',
    status: 'active',
    summary: 'Commanditaire',
    notes: '',
    portraitPath: null,
    sheet: {},
    sheetSchemaVersion: 1,
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const campaignService = {
    findById: vi.fn(),
    activate: vi.fn(),
  };
  const npcService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const portraitGateway = {
    chooseAndImport: vi.fn(),
    resolveUrl: vi.fn(),
    discard: vi.fn(),
  };
  const displayGateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    campaignService.findById.mockResolvedValue(campaign);
    campaignService.activate.mockResolvedValue(undefined);
    npcService.list.mockResolvedValue([npc]);
    npcService.create.mockResolvedValue(npc);
    npcService.update.mockResolvedValue(npc);
    npcService.delete.mockResolvedValue(undefined);
    portraitGateway.chooseAndImport.mockResolvedValue(null);
    portraitGateway.resolveUrl.mockResolvedValue('asset://portrait');
    portraitGateway.discard.mockResolvedValue(undefined);
    displayGateway.isPlayerDisplayOpen.mockResolvedValue(true);
    displayGateway.sendPlayerDisplayState.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [NpcWorkspace],
      providers: [
        provideRouter([]),
        { provide: CampaignService, useValue: campaignService },
        { provide: NpcService, useValue: npcService },
        { provide: NpcPortraitGateway, useValue: portraitGateway },
        { provide: DisplayGateway, useValue: displayGateway },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => campaign.id } } },
        },
      ],
    }).compileComponents();
  });

  it('shows the campaign NPC list in read-only mode', async () => {
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();

    await renderUntil(fixture, 'Syndra Silvane');

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.npc-list-item')).toBeTruthy();
    expect(element.textContent).toContain('Aucun PNJ sélectionné');
  });

  it('asks what to do before leaving a dirty form', async () => {
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Syndra Silvane');

    const createButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.create-button',
    );
    createButton?.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#npc-name'),
      ).toBeTruthy();
    });
    const nameInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#npc-name',
    );
    if (!nameInput) {
      throw new Error('NPC name field not found.');
    }
    nameInput.value = 'Nouveau PNJ';
    nameInput.dispatchEvent(new Event('input'));

    const result = fixture.componentInstance.canDeactivate();
    fixture.detectChanges();

    expect(result).toBeInstanceOf(Promise);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Enregistrer et quitter');
    const continueButton = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.dialog button',
      ),
    ].find((button) => button.textContent?.includes('Continuer'));
    continueButton?.click();
    await expect(result).resolves.toBe(false);
  });

  it('previews an imported portrait while editing', async () => {
    portraitGateway.chooseAndImport.mockResolvedValue(
      'campaigns/campaign-id/media/npc-portraits/syndra.webp',
    );
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Syndra Silvane');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.npc-list-item')?.click();
    await renderUntil(fixture, 'Modifier');
    element.querySelector<HTMLButtonElement>('.primary-button')?.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.portrait-action')?.click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector<HTMLImageElement>('.portrait-frame img')?.src).toContain(
        'asset://portrait',
      );
    });
  });

  it('sends a persisted portrait to the player display', async () => {
    const npcWithPortrait = {
      ...npc,
      portraitPath: 'campaigns/campaign-id/media/npc-portraits/syndra.webp',
    };
    npcService.list.mockResolvedValue([npcWithPortrait]);
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Syndra Silvane');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.npc-list-item')?.click();
    await renderUntil(fixture, 'Afficher aux joueurs');
    element.querySelector<HTMLButtonElement>('.display-button')?.click();

    await vi.waitFor(() => {
      expect(displayGateway.sendPlayerDisplayState).toHaveBeenCalledWith({
        mode: 'npc',
        npcId: npc.id,
        name: npc.name,
        portraitPath: 'asset://portrait',
      });
    });
  });

  it('uses the demo portrait when the NPC has no persisted portrait', async () => {
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Syndra Silvane');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.npc-list-item')?.click();
    await renderUntil(fixture, 'Afficher aux joueurs');

    expect(element.querySelector<HTMLImageElement>('.portrait-frame img')?.src).toContain(
      '/demo/innkeeper.svg',
    );
    expect(element.querySelector('.portrait-demo-label')?.textContent).toContain('Démo');

    element.querySelector<HTMLButtonElement>('.display-button')?.click();

    await vi.waitFor(() => {
      expect(displayGateway.sendPlayerDisplayState).toHaveBeenCalledWith({
        mode: 'npc',
        npcId: npc.id,
        name: npc.name,
        portraitPath: '/demo/innkeeper.svg',
      });
    });
  });
});

async function renderUntil(fixture: ComponentFixture<NpcWorkspace>, text: string) {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
