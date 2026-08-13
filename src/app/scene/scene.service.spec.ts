import { TestBed } from '@angular/core/testing';

import { LocationRepository } from '@app/location/location.repository';
import { ItemConfigurationRepository } from '@app/narrative-item/item-configuration.repository';
import { NarrativeItemRepository } from '@app/narrative-item/narrative-item.repository';
import { NpcRepository } from '@app/npc/npc.repository';
import { PlayerCharacterRepository } from '@app/player-character/player-character.repository';
import { InMemoryItemConfigurationRepository } from '@app/persistence/in-memory-item-configuration.repository';
import { InMemoryLocationRepository } from '@app/persistence/in-memory-location.repository';
import { InMemoryNarrativeItemRepository } from '@app/persistence/in-memory-narrative-item.repository';
import { InMemoryNpcRepository } from '@app/persistence/in-memory-npc.repository';
import { InMemoryPlayerCharacterRepository } from '@app/persistence/in-memory-player-character.repository';
import { InMemorySceneRepository } from '@app/persistence/in-memory-scene.repository';
import { SceneRepository } from '@app/scene/scene.repository';
import { SceneService } from '@app/scene/scene.service';

describe('SceneService', () => {
  let service: SceneService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SceneService,
        { provide: SceneRepository, useClass: InMemorySceneRepository },
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
        itemIds: [],
      }),
    ).rejects.toThrow("Le lieu de la scène n'appartient pas à cette campagne.");
  });
});
