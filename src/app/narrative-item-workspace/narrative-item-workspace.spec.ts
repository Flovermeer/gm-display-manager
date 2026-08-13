import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import type { Campaign } from '../campaign/campaign';
import { CampaignContext } from '../campaign-layout/campaign-context';
import { DisplayGateway } from '../display/display.gateway';
import { JournalEntryService } from '../journal/journal-entry.service';
import { LocationService } from '../location/location.service';
import { ItemImageGateway } from '../media/item-image.gateway';
import { ItemConfigurationService } from '../narrative-item/item-configuration.service';
import type { NarrativeItem } from '../narrative-item/narrative-item';
import { NarrativeItemService } from '../narrative-item/narrative-item.service';
import { NpcService } from '../npc/npc.service';
import { PlayerCharacterService } from '../player-character/player-character.service';
import { createEmptyRichTextDocument } from '../shared/rich-text-editor/rich-text-document';
import { ResourceMentionNavigationService } from '../shared/rich-text-editor/resource-mention-navigation.service';
import { NarrativeItemWorkspace } from './narrative-item-workspace';

describe('NarrativeItemWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    systemKey: 'dnd5e',
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
  };
  const item: NarrativeItem = {
    id: 'item-id',
    campaignId: campaign.id,
    itemTypeId: 'type-id',
    itemRarityId: 'rarity-id',
    owner: { resourceType: 'npc', resourceId: 'npc-id' },
    name: "Anneau de l'Hiver",
    status: 'active',
    attunement: 'required',
    attunementCondition: '',
    summary: 'Un puissant artefact de glace.',
    description: createEmptyRichTextDocument(),
    imagePath: 'campaigns/campaign-id/media/items/item.webp',
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
  };
  const itemService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const configurationService = { ensureDefaults: vi.fn(), list: vi.fn() };
  const npcService = { list: vi.fn() };
  const emptyResourceService = { list: vi.fn() };
  const imageGateway = { chooseAndImport: vi.fn(), resolveUrl: vi.fn(), discard: vi.fn() };
  const displayGateway = {
    isDesktop: false,
    isPlayerDisplayOpen: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };
  const mentionNavigation = { listCandidates: vi.fn(), open: vi.fn() };
  const journalService = {
    listForTarget: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    itemService.list.mockResolvedValue([item]);
    configurationService.ensureDefaults.mockResolvedValue(undefined);
    configurationService.list
      .mockResolvedValueOnce([{ id: 'type-id', name: 'Artefact' }])
      .mockResolvedValueOnce([{ id: 'rarity-id', name: 'Légendaire' }]);
    npcService.list.mockResolvedValue([{ id: 'npc-id', name: 'Artus Cimber' }]);
    emptyResourceService.list.mockResolvedValue([]);
    imageGateway.resolveUrl.mockResolvedValue('asset://item.webp');
    mentionNavigation.listCandidates.mockResolvedValue([]);
    journalService.listForTarget.mockResolvedValue([]);

    await TestBed.configureTestingModule({
      imports: [NarrativeItemWorkspace],
      providers: [
        { provide: CampaignContext, useValue: { campaign: () => campaign, load: () => campaign } },
        { provide: NarrativeItemService, useValue: itemService },
        { provide: ItemConfigurationService, useValue: configurationService },
        { provide: NpcService, useValue: npcService },
        { provide: LocationService, useValue: emptyResourceService },
        { provide: PlayerCharacterService, useValue: emptyResourceService },
        { provide: ItemImageGateway, useValue: imageGateway },
        { provide: DisplayGateway, useValue: displayGateway },
        { provide: ResourceMentionNavigationService, useValue: mentionNavigation },
        { provide: JournalEntryService, useValue: journalService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ resourceId: item.id })),
            snapshot: { queryParamMap: convertToParamMap({ resourceId: item.id }) },
          },
        },
      ],
    }).compileComponents();
  });

  it('shows an item with its configuration and current owner', async () => {
    const fixture = TestBed.createComponent(NarrativeItemWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, "Anneau de l'Hiver");

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Artefact');
    expect(text).toContain('Légendaire');
    expect(text).toContain('Artus Cimber');
    expect(text).toContain('Un puissant artefact de glace.');
    expect(imageGateway.resolveUrl).toHaveBeenCalledWith(item.imagePath);
  });
});

async function renderUntil(
  fixture: ComponentFixture<NarrativeItemWorkspace>,
  text: string,
): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
