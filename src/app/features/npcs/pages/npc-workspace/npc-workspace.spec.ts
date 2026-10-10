import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignService } from '@app/features/campaigns/application/campaign.service';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { createEmptyNpcSheet, type Npc } from '@app/features/npcs/domain/npc';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { JournalEntryService } from '@app/features/journal/application/journal-entry.service';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
import { NpcWorkspace } from '@app/features/npcs/pages/npc-workspace/npc-workspace';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';

describe('NpcWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    universeId: 'forgotten-realms',
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const npc: Npc = {
    id: 'npc-id',
    campaignId: campaign.id,
    provenance: 'campaign',
    name: 'Syndra Silvane',
    status: 'active',
    summary: 'Commanditaire',
    notes: '',
    portraitPath: null,
    idleVideoPath: null,
    sheet: {
      ...createEmptyNpcSheet(),
      size: 'Moyenne',
      creatureType: 'Humanoïde (humain)',
      alignment: 'Neutre bon',
      armorClass: 14,
      hitPoints: 82,
      hitPointFormula: '15d8 + 15',
      speed: '9 m',
      abilities: {
        strength: 10,
        dexterity: 15,
        constitution: 13,
        intelligence: 17,
        wisdom: 16,
        charisma: 18,
      },
      skills: ['Histoire +9', 'Perspicacité +6'],
      languages: ['Commun', 'Draconique'],
      challengeRating: '7',
      experiencePoints: 2900,
      officialDescription: {
        schemaVersion: 1,
        content: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Description canonique.' }] },
          ],
        },
      },
      actions: [
        {
          id: 'action-id',
          name: 'Attaques multiples',
          description: createEmptyRichTextDocument(),
        },
      ],
    },
    sheetSchemaVersion: 3,
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
  const journalEntryService = {
    listForTarget: vi.fn(),
    listGlobal: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const portraitGateway = {
    chooseAndImport: vi.fn(),
    resolveUrl: vi.fn(),
    discard: vi.fn(),
  };
  const idleVideoGateway = {
    chooseAndImport: vi.fn(),
    resolveUrl: vi.fn(),
    discard: vi.fn(),
  };
  const displayGateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };
  const activeSceneService = { clear: vi.fn() };
  const mention = {
    resourceType: 'location' as const,
    resourceId: 'location-id',
    label: 'Auberge du Beholder',
  };
  const mentionNavigation = {
    listCandidates: vi.fn(),
    open: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    campaignService.findById.mockResolvedValue(campaign);
    campaignService.activate.mockResolvedValue(undefined);
    npcService.list.mockResolvedValue([npc]);
    npcService.create.mockResolvedValue(npc);
    npcService.update.mockResolvedValue(npc);
    npcService.delete.mockResolvedValue(undefined);
    journalEntryService.listForTarget.mockResolvedValue([]);
    journalEntryService.listGlobal.mockResolvedValue([]);
    portraitGateway.chooseAndImport.mockResolvedValue(null);
    portraitGateway.resolveUrl.mockResolvedValue('asset://portrait');
    portraitGateway.discard.mockResolvedValue(undefined);
    idleVideoGateway.chooseAndImport.mockResolvedValue(null);
    idleVideoGateway.resolveUrl.mockResolvedValue('asset://video');
    idleVideoGateway.discard.mockResolvedValue(undefined);
    displayGateway.isPlayerDisplayOpen.mockResolvedValue(true);
    displayGateway.sendPlayerDisplayState.mockResolvedValue(undefined);
    activeSceneService.clear.mockResolvedValue(undefined);
    mentionNavigation.listCandidates.mockResolvedValue([mention]);
    mentionNavigation.open.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [NpcWorkspace],
      providers: [
        provideRouter([]),
        { provide: CampaignService, useValue: campaignService },
        {
          provide: CampaignContext,
          useValue: { campaign: () => campaign, load: () => Promise.resolve(campaign) },
        },
        { provide: NpcService, useValue: npcService },
        { provide: JournalEntryService, useValue: journalEntryService },
        {
          provide: ResourceMentionNavigationService,
          useValue: mentionNavigation,
        },
        { provide: NpcPortraitGateway, useValue: portraitGateway },
        { provide: NpcIdleVideoGateway, useValue: idleVideoGateway },
        { provide: DisplayGateway, useValue: displayGateway },
        { provide: ActiveSceneService, useValue: activeSceneService },
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
    expect(element.querySelector('.npc-status-icon[data-status="active"]')?.textContent).toContain(
      'V',
    );
    expect(element.textContent).toContain('Aucun PNJ sélectionné');
  });

  it('shows the expected icon for every NPC status', async () => {
    npcService.list.mockResolvedValue([
      npc,
      { ...npc, id: 'dead-id', name: 'Décédé', status: 'dead' },
      { ...npc, id: 'missing-id', name: 'Disparu', status: 'missing' },
      { ...npc, id: 'retired-id', name: 'Retiré', status: 'retired' },
    ]);
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Décédé');

    const element = fixture.nativeElement as HTMLElement;
    const icon = (status: Npc['status']) =>
      element.querySelector(`.npc-status-icon[data-status="${status}"]`)?.textContent?.trim();
    expect(icon('active')).toBe('V');
    expect(icon('dead')).toBe('💀');
    expect(icon('missing')).toBe('?');
    expect(icon('retired')).toBe('X');
  });

  it('uses the portrait row for the selected NPC overview before sheet and notes', async () => {
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Syndra Silvane');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.npc-list-item')?.click();
    await renderUntil(fixture, 'Fiche PNJ');

    expect(element.querySelector('.entity-title__row .status-badge')?.textContent).toContain(
      'Actif',
    );
    expect(element.querySelector('.npc-overview')?.textContent).toContain('Commanditaire');
    expect(element.querySelector('.npc-overview')?.textContent).toContain('Portrait statique');
    expect(element.querySelector('.stat-block')?.textContent).toContain('14');
    expect(element.querySelector('.stat-block')?.textContent).toContain('82 (15d8 + 15)');
    expect(element.querySelector('.stat-block')?.textContent).toContain('Attaques multiples');
    expect(element.querySelector('.npc-sheet > dl')).toBeNull();
    const sheet = element.querySelector('.npc-character-sheet');
    const description = element.querySelector('.official-description-readonly');
    const notes = element.querySelector('app-journal-entry-list');
    if (!sheet || !description || !notes) throw new Error('NPC sheet sections not found.');
    expect(description.textContent).toContain('Description canonique.');
    expect(sheet.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(description.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
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
    element.querySelector<HTMLButtonElement>('.detail-actions .ui-button--primary')?.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.portrait-action')?.click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector<HTMLImageElement>('.portrait-frame img')?.src).toContain(
        'asset://portrait',
      );
    });
  });

  it('sends a persisted portrait and idle video to the player display', async () => {
    const npcWithPortrait = {
      ...npc,
      portraitPath: 'campaigns/campaign-id/media/npc-portraits/syndra.webp',
      idleVideoPath: 'campaigns/campaign-id/media/npc-idle-videos/syndra.webm',
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
        idleVideoPath: 'asset://video',
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

  it('provides resource mentions to every rendered rich NPC field', async () => {
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Syndra Silvane');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.npc-list-item')?.click();
    await renderUntil(fixture, 'Description canonique.');
    let editors = fixture.debugElement.queryAll(By.directive(RichTextEditor));
    expect(editors.length).toBeGreaterThanOrEqual(2);
    expect(
      editors.every(({ componentInstance }) =>
        (componentInstance as RichTextEditor).mentionCandidates().includes(mention),
      ),
    ).toBe(true);

    element.querySelector<HTMLButtonElement>('.detail-actions .ui-button--primary')?.click();
    fixture.detectChanges();
    editors = fixture.debugElement.queryAll(By.directive(RichTextEditor));
    expect(editors.length).toBeGreaterThanOrEqual(2);
    expect(
      editors.every(({ componentInstance }) =>
        (componentInstance as RichTextEditor).mentionCandidates().includes(mention),
      ),
    ).toBe(true);
  });
});

async function renderUntil(fixture: ComponentFixture<NpcWorkspace>, text: string) {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
