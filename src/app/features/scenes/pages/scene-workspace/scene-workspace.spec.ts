import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { JournalEntryService } from '@app/features/journal/application/journal-entry.service';
import { LocationService } from '@app/features/locations/application/location.service';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { NpcService } from '@app/features/npcs/application/npc.service';
import type { Scene } from '@app/features/scenes/domain/scene';
import { SceneService } from '@app/features/scenes/application/scene.service';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';
import { SceneDisplayService } from '@app/features/scenes/application/scene-display.service';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
import { SceneWorkspace } from '@app/features/scenes/pages/scene-workspace/scene-workspace';

describe('SceneWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    systemKey: 'dnd5e',
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
  };
  const scene: Scene = {
    id: 'scene-id',
    campaignId: campaign.id,
    name: 'Audience à la villa',
    summary: 'Wakanga reçoit les aventuriers.',
    locationId: 'location-id',
    npcIds: ['npc-id'],
    itemIds: ['item-id'],
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
  };
  const sceneService = { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const activeSceneService = {
    get: vi.fn(),
    clear: vi.fn(),
    clearIfActive: vi.fn(),
  };
  const displayStore = { state: vi.fn(), setState: vi.fn() };
  const journalEntryService = {
    listByTarget: vi.fn(),
    listForTarget: vi.fn(),
    listGlobal: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    sceneService.list.mockResolvedValue([scene]);
    activeSceneService.get.mockResolvedValue(null);
    activeSceneService.clear.mockResolvedValue(undefined);
    activeSceneService.clearIfActive.mockResolvedValue(false);
    displayStore.state.mockReturnValue({ mode: 'blank' });
    journalEntryService.listForTarget.mockResolvedValue([]);
    const queryParams = new BehaviorSubject({ get: () => null });
    await TestBed.configureTestingModule({
      imports: [SceneWorkspace],
      providers: [
        { provide: CampaignContext, useValue: { campaign: () => campaign, load: () => campaign } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams,
            snapshot: { queryParamMap: { get: () => null } },
          },
        },
        { provide: SceneService, useValue: sceneService },
        { provide: ActiveSceneService, useValue: activeSceneService },
        { provide: SceneDisplayService, useValue: { activate: vi.fn(), build: vi.fn() } },
        { provide: DisplayGateway, useValue: { isDesktop: false } },
        { provide: PlayerDisplayStore, useValue: displayStore },
        { provide: NpcPortraitGateway, useValue: { resolveUrl: vi.fn() } },
        { provide: NpcIdleVideoGateway, useValue: { resolveUrl: vi.fn() } },
        { provide: ItemImageGateway, useValue: { resolveUrl: vi.fn() } },
        {
          provide: LocationService,
          useValue: {
            list: () => Promise.resolve([{ id: 'location-id', name: 'Villa de Wakanga' }]),
          },
        },
        {
          provide: NpcService,
          useValue: { list: () => Promise.resolve([{ id: 'npc-id', name: 'Wakanga' }]) },
        },
        {
          provide: NarrativeItemService,
          useValue: { list: () => Promise.resolve([{ id: 'item-id', name: "Anneau de l'Hiver" }]) },
        },
        { provide: JournalEntryService, useValue: journalEntryService },
        {
          provide: ResourceMentionNavigationService,
          useValue: { listCandidates: () => Promise.resolve([]), open: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  it('lists and opens a scene with its alphabetical resource groups', async () => {
    const fixture = TestBed.createComponent(SceneWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Audience à la villa');
    const entry = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.scene-list__entry',
    );
    entry?.click();
    await renderUntil(fixture, 'Villa de Wakanga');
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Wakanga');
    expect(content).toContain("Anneau de l'Hiver");
  });

  it('deactivates the active scene and restores the default player screen', async () => {
    activeSceneService.get.mockResolvedValue(scene.id);
    const fixture = TestBed.createComponent(SceneWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, scene.name);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.scene-list__entry')
      ?.click();
    await renderUntil(fixture, 'Désactiver la scène');

    const deactivateButton = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ].find((button) => button.textContent?.includes('Désactiver la scène'));
    deactivateButton?.click();

    await vi.waitFor(() => {
      expect(activeSceneService.clear).toHaveBeenCalledWith(campaign.id);
      expect(displayStore.setState).toHaveBeenCalledWith({
        mode: 'scene',
        sceneId: null,
        background: { type: 'default' },
      });
    });
  });
});

async function renderUntil(fixture: ComponentFixture<SceneWorkspace>, text: string): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
