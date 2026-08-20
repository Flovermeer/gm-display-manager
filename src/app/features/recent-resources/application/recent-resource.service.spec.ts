import { TestBed } from '@angular/core/testing';

import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { ChapterService } from '@app/features/chapters/application/chapter.service';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { LocationService } from '@app/features/locations/application/location.service';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { RecentResourceService } from '@app/features/recent-resources/application/recent-resource.service';
import { RecentResourceRepository } from '@app/features/recent-resources/data-access/recent-resource.repository';
import { SceneService } from '@app/features/scenes/application/scene.service';

describe('RecentResourceService', () => {
  const repository = {
    list: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };
  const emptyService = { list: vi.fn() };
  const npcService = { list: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.list.mockResolvedValue([
      {
        campaignId: 'campaign-id',
        resourceType: 'npc',
        resourceId: 'npc-id',
        displayName: 'Ancien nom',
        viewedOrder: 2,
      },
      {
        campaignId: 'campaign-id',
        resourceType: 'scene',
        resourceId: 'deleted-scene',
        displayName: 'Scène supprimée',
        viewedOrder: 1,
      },
    ]);
    repository.save.mockResolvedValue(undefined);
    repository.remove.mockResolvedValue(undefined);
    emptyService.list.mockResolvedValue([]);
    npcService.list.mockResolvedValue([{ id: 'npc-id', name: 'Syndra' }]);
  });

  it('refreshes labels and purges targets missing from the campaign', async () => {
    TestBed.configureTestingModule({
      providers: [
        RecentResourceService,
        { provide: RecentResourceRepository, useValue: repository },
        { provide: PlayerCharacterService, useValue: emptyService },
        { provide: NpcService, useValue: npcService },
        { provide: MonsterService, useValue: emptyService },
        { provide: LocationService, useValue: emptyService },
        { provide: ChapterService, useValue: emptyService },
        { provide: NarrativeItemService, useValue: emptyService },
        { provide: SceneService, useValue: emptyService },
      ],
    });

    await expect(
      TestBed.inject(RecentResourceService).listAvailable('campaign-id'),
    ).resolves.toEqual([expect.objectContaining({ resourceId: 'npc-id', displayName: 'Syndra' })]);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'npc-id', displayName: 'Syndra' }),
    );
    expect(repository.remove).toHaveBeenCalledWith('campaign-id', 'scene', 'deleted-scene');
  });
});
