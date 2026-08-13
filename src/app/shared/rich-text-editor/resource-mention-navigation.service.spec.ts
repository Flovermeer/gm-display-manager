import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { LocationService } from '../../location/location.service';
import { NpcService } from '../../npc/npc.service';
import { PlayerCharacterService } from '../../player-character/player-character.service';
import { ResourceMentionNavigationService } from './resource-mention-navigation.service';

describe('ResourceMentionNavigationService', () => {
  const router = { navigate: vi.fn() };
  const npcService = { list: vi.fn() };
  const locationService = { list: vi.fn() };
  const characterService = { list: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    npcService.list.mockResolvedValue([{ id: 'npc-id', name: 'Syndra' }]);
    locationService.list.mockResolvedValue([{ id: 'location-id', name: 'Port Nyanzaru' }]);
    characterService.list.mockResolvedValue([{ id: 'character-id', name: 'Flore' }]);
    router.navigate.mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        ResourceMentionNavigationService,
        { provide: NpcService, useValue: npcService },
        { provide: LocationService, useValue: locationService },
        { provide: PlayerCharacterService, useValue: characterService },
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
    ]);
    await service.open('campaign-id', {
      resourceType: 'npc',
      resourceId: 'npc-id',
      label: 'Syndra',
    });

    expect(router.navigate).toHaveBeenCalledWith(['/campaigns', 'campaign-id', 'npcs'], {
      queryParams: { resourceId: 'npc-id' },
    });
  });
});
