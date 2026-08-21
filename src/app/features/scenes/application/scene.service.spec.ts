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
import { ChapterService } from '@app/features/chapters/application/chapter.service';
import { ChapterRepository } from '@app/features/chapters/data-access/chapter.repository';
import { InMemoryChapterRepository } from '@app/features/chapters/data-access/in-memory-chapter.repository';

describe('SceneService', () => {
  let service: SceneService;
  let chapterService: ChapterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SceneService,
        ChapterService,
        { provide: ChapterRepository, useClass: InMemoryChapterRepository },
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
    chapterService = TestBed.inject(ChapterService);
  });

  it('creates and deletes an empty scene', async () => {
    const chapter = await chapterService.create('campaign-id', {
      title: 'Port Nyanzaru',
      summary: '',
      content: { schemaVersion: 1, content: { type: 'doc' } },
    });
    const scene = await service.create('campaign-id', chapter.id, {
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
    const chapter = await chapterService.create('campaign-id', {
      title: 'Port Nyanzaru',
      summary: '',
      content: { schemaVersion: 1, content: { type: 'doc' } },
    });
    await expect(
      service.create('campaign-id', chapter.id, {
        name: 'Campement',
        summary: '',
        locationId: 'foreign-location',
        npcIds: [],
        monsterIds: [],
        itemIds: [],
      }),
    ).rejects.toThrow("Le lieu de la scène n'appartient pas à cette campagne.");
  });

  it('orders scenes inside a chapter and appends a moved scene', async () => {
    const firstChapter = await chapterService.create('campaign-id', {
      title: 'Port Nyanzaru',
      summary: '',
      content: { schemaVersion: 1, content: { type: 'doc' } },
    });
    const secondChapter = await chapterService.create('campaign-id', {
      title: 'La jungle',
      summary: '',
      content: { schemaVersion: 1, content: { type: 'doc' } },
    });
    const first = await service.create('campaign-id', firstChapter.id, {
      name: 'Débarquement',
      summary: '',
      locationId: null,
      npcIds: [],
      monsterIds: [],
      itemIds: [],
    });
    const second = await service.create('campaign-id', firstChapter.id, {
      name: 'Audience',
      summary: '',
      locationId: null,
      npcIds: [],
      monsterIds: [],
      itemIds: [],
    });

    await service.move(second, -1);
    expect(
      (await service.listByChapter('campaign-id', firstChapter.id)).map(({ id }) => id),
    ).toEqual([second.id, first.id]);

    const moved = await service.moveToChapter(first, secondChapter.id);
    expect(moved).toMatchObject({ chapterId: secondChapter.id, position: 0 });
  });
});
