import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { LocationService } from '@app/features/locations/application/location.service';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { SceneService } from '@app/features/scenes/application/scene.service';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';

describe('ResourceMentionNavigationService', () => {
  const router = { navigate: vi.fn() };
  const npcService = { list: vi.fn() };
  const locationService = { list: vi.fn() };
  const characterService = { list: vi.fn() };
  const itemService = { list: vi.fn() };
  const sceneService = { list: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    npcService.list.mockResolvedValue([{ id: 'npc-id', name: 'Syndra' }]);
    locationService.list.mockResolvedValue([{ id: 'location-id', name: 'Port Nyanzaru' }]);
    characterService.list.mockResolvedValue([{ id: 'character-id', name: 'Flore' }]);
    itemService.list.mockResolvedValue([{ id: 'item-id', name: "Anneau de l'Hiver" }]);
    sceneService.list.mockResolvedValue([{ id: 'scene-id', name: 'Audience à la villa' }]);
    router.navigate.mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        ResourceMentionNavigationService,
        { provide: NpcService, useValue: npcService },
        { provide: LocationService, useValue: locationService },
        { provide: PlayerCharacterService, useValue: characterService },
        { provide: NarrativeItemService, useValue: itemService },
        { provide: SceneService, useValue: sceneService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('builds the campaign candidate list and opens a referenced NPC', async () => {
    const service = TestBed.inject(ResourceMentionNavigationService);

    await expect(service.listCandidates('campaign-id')).resolves.toEqual([
      { resourceType: 'player-character', resourceId: 'character-id', label: 'Flore' },
      { resourceType: 'npc', resourceId: 'npc-id', label: 'Syndra' },
      { resourceType: 'location', resourceId: 'location-id', label: 'Port Nyanzaru' },
      { resourceType: 'item', resourceId: 'item-id', label: "Anneau de l'Hiver" },
      { resourceType: 'scene', resourceId: 'scene-id', label: 'Audience à la villa' },
    ]);
    await service.open('campaign-id', {
      resourceType: 'npc',
      resourceId: 'npc-id',
      label: 'Syndra',
    });

    expect(router.navigate).toHaveBeenCalledWith(['/campaigns', 'campaign-id', 'npcs'], {
      queryParams: { resourceId: 'npc-id' },
    });

    await service.open('campaign-id', {
      resourceType: 'item',
      resourceId: 'item-id',
      label: "Anneau de l'Hiver",
    });
    expect(router.navigate).toHaveBeenLastCalledWith(['/campaigns', 'campaign-id', 'items'], {
      queryParams: { resourceId: 'item-id' },
    });
  });
});
