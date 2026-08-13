import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import type { Campaign } from '../campaign/campaign';
import { CampaignContext } from '../campaign-layout/campaign-context';
import { JournalEntryService } from '../journal/journal-entry.service';
import { LocationService } from '../location/location.service';
import { NarrativeItemService } from '../narrative-item/narrative-item.service';
import { NpcService } from '../npc/npc.service';
import type { Scene } from '../scene/scene';
import { SceneService } from '../scene/scene.service';
import { ActiveSceneService } from '../scene/active-scene.service';
import { SceneDisplayService } from '../scene/scene-display.service';
import { DisplayGateway } from '../display/display.gateway';
import { PlayerDisplayStore } from '../display/player-display.store';
import { NpcPortraitGateway } from '../media/npc-portrait.gateway';
import { NpcIdleVideoGateway } from '../media/npc-idle-video.gateway';
import { ItemImageGateway } from '../media/item-image.gateway';
import { ResourceMentionNavigationService } from '../shared/rich-text-editor/resource-mention-navigation.service';
import { SceneWorkspace } from './scene-workspace';

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
    journalEntryService.listForTarget.mockResolvedValue([]);
    const queryParams = new BehaviorSubject({ get: () => null });
    await TestBed.configureTestingModule({
      imports: [SceneWorkspace],
      providers: [
        { provide: CampaignContext, useValue: { campaign: () => campaign, load: () => campaign } },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams, snapshot: { queryParamMap: { get: () => null } } } },
        { provide: SceneService, useValue: sceneService },
        { provide: ActiveSceneService, useValue: { get: () => Promise.resolve(null), clearIfActive: () => Promise.resolve(false) } },
        { provide: SceneDisplayService, useValue: { activate: vi.fn(), build: vi.fn() } },
        { provide: DisplayGateway, useValue: { isDesktop: false } },
        { provide: PlayerDisplayStore, useValue: { state: () => ({ mode: 'blank' }), setState: vi.fn() } },
        { provide: NpcPortraitGateway, useValue: { resolveUrl: vi.fn() } },
        { provide: NpcIdleVideoGateway, useValue: { resolveUrl: vi.fn() } },
        { provide: ItemImageGateway, useValue: { resolveUrl: vi.fn() } },
        { provide: LocationService, useValue: { list: () => Promise.resolve([{ id: 'location-id', name: 'Villa de Wakanga' }]) } },
        { provide: NpcService, useValue: { list: () => Promise.resolve([{ id: 'npc-id', name: 'Wakanga' }]) } },
        { provide: NarrativeItemService, useValue: { list: () => Promise.resolve([{ id: 'item-id', name: "Anneau de l'Hiver" }]) } },
        { provide: JournalEntryService, useValue: journalEntryService },
        { provide: ResourceMentionNavigationService, useValue: { listCandidates: () => Promise.resolve([]), open: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('lists and opens a scene with its alphabetical resource groups', async () => {
    const fixture = TestBed.createComponent(SceneWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Audience à la villa');
    const entry = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.scene-list__entry');
    entry?.click();
    await renderUntil(fixture, 'Villa de Wakanga');
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Wakanga');
    expect(content).toContain("Anneau de l'Hiver");
  });
});

async function renderUntil(fixture: ComponentFixture<SceneWorkspace>, text: string): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
