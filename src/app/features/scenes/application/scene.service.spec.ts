import { TestBed } from '@angular/core/testing';

import { LocationRepository } from '@app/features/locations/data-access/location.repository';
import { ItemConfigurationRepository } from '@app/features/items/data-access/item-configuration.repository';
import { NarrativeItemRepository } from '@app/features/items/data-access/narrative-item.repository';
import { NpcRepository } from '@app/features/npcs/data-access/npc.repository';
import { PlayerCharacterRepository } from '@app/features/players/data-access/player-character.repository';
import { InMemoryItemConfigurationRepository } from '@app/features/items/data-access/in-memory-item-configuration.repository';
import { InMemoryLocationRepository } from '@app/features/locations/data-access/in-memory-location.repository';
import { InMemoryNarrativeItemRepository } from '@app/features/items/data-access/in-memory-narrative-item.repository';
import { InMemoryNpcRepository } from '@app/features/npcs/data-access/in-memory-npc.repository';
import { InMemoryPlayerCharacterRepository } from '@app/features/players/data-access/in-memory-player-character.repository';
import { InMemorySceneRepository } from '@app/features/scenes/data-access/in-memory-scene.repository';
import { SceneRepository } from '@app/features/scenes/data-access/scene.repository';
import { SceneService } from '@app/features/scenes/application/scene.service';
import { MonsterRepository } from '@app/features/bestiary/data-access/monster.repository';
import { InMemoryMonsterRepository } from '@app/features/bestiary/data-access/in-memory-monster.repository';

describe('SceneService', () => {
  let service: SceneService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SceneService,
        { provide: SceneRepository, useClass: InMemorySceneRepository },
        { provide: MonsterRepository, useClass: InMemoryMonsterRepository },
        { provide: LocationRepository, useClass: InMemoryLocationRepository },
        { provide: NpcRepository, useClass: InMemoryNpcRepository },
        { provide: PlayerCharacterRepository, useClass: InMemoryPlayerCharacterRepository },
        { provide: NarrativeItemRepository, useClass: InMemoryNarrativeItemRepository },
        { provide: ItemConfigurationRepository, useClass: InMemoryItemConfigurationRepository },
      ],
    });
    service = TestBed.inject(SceneService);
  });

  it('creates and deletes an empty scene', async () => {
    const scene = await service.create('campaign-id', {
      name: 'Campement',
      summary: '',
      locationId: null,
      npcIds: [],
      monsterIds: [],
      itemIds: [],
    });
    await expect(service.list('campaign-id')).resolves.toEqual([scene]);
    await service.delete(scene);
    await expect(service.list('campaign-id')).resolves.toEqual([]);
  });

  it('rejects references from outside the campaign', async () => {
    await expect(
      service.create('campaign-id', {
        name: 'Campement',
        summary: '',
        locationId: 'foreign-location',
        npcIds: [],
        monsterIds: [],
        itemIds: [],
      }),
    ).rejects.toThrow("Le lieu de la scène n'appartient pas à cette campagne.");
  });
});
