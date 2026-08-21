import { createScene, moveSceneToChapter, updateScene } from '@app/features/scenes/domain/scene';

describe('Scene', () => {
  const now = () => new Date('2026-08-13T12:00:00.000Z');

  it('normalizes a scene and removes duplicated relations', () => {
    expect(
      createScene(
        'campaign-id',
        'chapter-id',
        2,
        {
          name: '  Arrivée au port  ',
          summary: '  Première rencontre  ',
          locationId: '',
          npcIds: ['npc-1', 'npc-1', 'npc-2'],
          monsterIds: ['monster-1', 'monster-1'],
          itemIds: ['item-1', 'item-1'],
        },
        () => 'scene-id',
        now,
      ),
    ).toEqual({
      id: 'scene-id',
      campaignId: 'campaign-id',
      chapterId: 'chapter-id',
      position: 2,
      name: 'Arrivée au port',
      summary: 'Première rencontre',
      locationId: null,
      npcIds: ['npc-1', 'npc-2'],
      monsterIds: ['monster-1'],
      itemIds: ['item-1'],
      createdAt: '2026-08-13T12:00:00.000Z',
      updatedAt: '2026-08-13T12:00:00.000Z',
    });
  });

  it('updates the editable fields and rejects an empty name', () => {
    const scene = createScene(
      'campaign-id',
      'chapter-id',
      0,
      { name: 'Port', summary: '', locationId: null, npcIds: [], monsterIds: [], itemIds: [] },
      () => 'scene-id',
      now,
    );
    expect(
      updateScene(
        scene,
        {
          name: 'Villa',
          summary: 'Audience',
          locationId: 'location-id',
          npcIds: ['npc-id'],
          monsterIds: [],
          itemIds: [],
        },
        () => new Date('2026-08-13T13:00:00.000Z'),
      ),
    ).toMatchObject({
      name: 'Villa',
      locationId: 'location-id',
      updatedAt: '2026-08-13T13:00:00.000Z',
    });
    expect(() =>
      updateScene(scene, {
        name: ' ',
        summary: '',
        locationId: null,
        npcIds: [],
        monsterIds: [],
        itemIds: [],
      }),
    ).toThrow('Scene name is required.');
  });

  it('moves a scene to an ordered position in another chapter', () => {
    const scene = createScene(
      'campaign-id',
      'chapter-1',
      0,
      { name: 'Port', summary: '', locationId: null, npcIds: [], monsterIds: [], itemIds: [] },
      () => 'scene-id',
      now,
    );

    expect(
      moveSceneToChapter(scene, 'chapter-2', 3, () => new Date('2026-08-13T13:00:00.000Z')),
    ).toMatchObject({
      chapterId: 'chapter-2',
      position: 3,
      updatedAt: '2026-08-13T13:00:00.000Z',
    });
  });
});
