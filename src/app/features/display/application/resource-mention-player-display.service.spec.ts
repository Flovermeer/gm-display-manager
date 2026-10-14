import { TestBed } from '@angular/core/testing';

import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { ResourceMentionPlayerDisplayService } from '@app/features/display/application/resource-mention-player-display.service';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import { LocationService } from '@app/features/locations/application/location.service';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';
import { SceneDisplayService } from '@app/features/scenes/application/scene-display.service';
import { SceneService } from '@app/features/scenes/application/scene.service';

describe('ResourceMentionPlayerDisplayService', () => {
  const campaign = { id: 'campaign-id' };
  const displayGateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };
  const displayStore = { state: vi.fn(), setState: vi.fn() };
  const activeScene = { clear: vi.fn() };
  const monsters = { findById: vi.fn() };
  const items = { list: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    displayGateway.isPlayerDisplayOpen.mockResolvedValue(true);
    displayGateway.sendPlayerDisplayState.mockResolvedValue(undefined);
    displayStore.state.mockReturnValue({ mode: 'neutral' });
    activeScene.clear.mockResolvedValue(undefined);
    monsters.findById.mockResolvedValue({
      id: 'monster-id',
      name: 'Atropal',
      imagePath: 'atropal.webp',
    });
    items.list.mockResolvedValue([
      {
        id: 'item-id',
        name: "Anneau de l’Hiver",
        summary: 'Un froid surnaturel.',
        imagePath: 'ring.webp',
      },
    ]);
    TestBed.configureTestingModule({
      providers: [
        ResourceMentionPlayerDisplayService,
        { provide: CampaignContext, useValue: { campaign: () => campaign, load: vi.fn() } },
        { provide: DisplayGateway, useValue: displayGateway },
        { provide: PlayerDisplayStore, useValue: displayStore },
        { provide: ActiveSceneService, useValue: activeScene },
        { provide: SceneDisplayService, useValue: { activate: vi.fn() } },
        { provide: SceneService, useValue: { findById: vi.fn() } },
        { provide: NpcService, useValue: { list: vi.fn() } },
        { provide: NpcPortraitGateway, useValue: { resolveUrl: vi.fn() } },
        { provide: NpcIdleVideoGateway, useValue: { resolveUrl: vi.fn() } },
        { provide: LocationService, useValue: { list: vi.fn() } },
        { provide: LocationImageGateway, useValue: { resolveUrl: vi.fn() } },
        { provide: NarrativeItemService, useValue: items },
        { provide: ItemImageGateway, useValue: { resolveUrl: vi.fn().mockResolvedValue('item://ring') } },
        { provide: MonsterService, useValue: monsters },
        {
          provide: MonsterImageGateway,
          useValue: { resolveUrl: vi.fn().mockResolvedValue('monster://atropal') },
        },
      ],
    });
  });

  it('displays monsters and items as autonomous resources', async () => {
    const service = TestBed.inject(ResourceMentionPlayerDisplayService);
    await service.refreshPlayerDisplayStatus();

    await service.display({
      resourceType: 'monster',
      resourceId: 'monster-id',
      label: 'Atropal',
      playerDisplayAvailable: true,
    });
    expect(displayGateway.sendPlayerDisplayState).toHaveBeenLastCalledWith({
      mode: 'monster',
      monsterId: 'monster-id',
      name: 'Atropal',
      imagePath: 'monster://atropal',
    });

    await service.display({
      resourceType: 'item',
      resourceId: 'item-id',
      label: "Anneau de l’Hiver",
      playerDisplayAvailable: true,
    });
    expect(displayGateway.sendPlayerDisplayState).toHaveBeenLastCalledWith({
      mode: 'item',
      itemId: 'item-id',
      name: "Anneau de l’Hiver",
      summary: 'Un froid surnaturel.',
      imagePath: 'item://ring',
    });
  });

  it('returns an already displayed resource to the neutral screen', async () => {
    displayStore.state.mockReturnValue({
      mode: 'monster',
      monsterId: 'monster-id',
      name: 'Atropal',
      imagePath: 'monster://atropal',
    });
    const service = TestBed.inject(ResourceMentionPlayerDisplayService);
    await service.refreshPlayerDisplayStatus();

    await service.display({
      resourceType: 'monster',
      resourceId: 'monster-id',
      label: 'Atropal',
      playerDisplayAvailable: true,
    });

    expect(activeScene.clear).toHaveBeenCalledWith(campaign.id);
    expect(displayGateway.sendPlayerDisplayState).toHaveBeenLastCalledWith({ mode: 'neutral' });
  });
});
