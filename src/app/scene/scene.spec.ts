import { createScene, updateScene } from './scene';

describe('Scene', () => {
  const now = () => new Date('2026-08-13T12:00:00.000Z');

  it('normalizes a scene and removes duplicated relations', () => {
    expect(
      createScene(
        'campaign-id',
        {
          name: '  Arrivée au port  ',
          summary: '  Première rencontre  ',
          locationId: '',
          npcIds: ['npc-1', 'npc-1', 'npc-2'],
          itemIds: ['item-1', 'item-1'],
        },
        () => 'scene-id',
        now,
      ),
    ).toEqual({
      id: 'scene-id',
      campaignId: 'campaign-id',
      name: 'Arrivée au port',
      summary: 'Première rencontre',
      locationId: null,
      npcIds: ['npc-1', 'npc-2'],
      itemIds: ['item-1'],
      createdAt: '2026-08-13T12:00:00.000Z',
      updatedAt: '2026-08-13T12:00:00.000Z',
    });
  });

  it('updates the editable fields and rejects an empty name', () => {
    const scene = createScene(
      'campaign-id',
      { name: 'Port', summary: '', locationId: null, npcIds: [], itemIds: [] },
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
          itemIds: [],
        },
        () => new Date('2026-08-13T13:00:00.000Z'),
      ),
    ).toMatchObject({ name: 'Villa', locationId: 'location-id', updatedAt: '2026-08-13T13:00:00.000Z' });
    expect(() =>
      updateScene(scene, { name: ' ', summary: '', locationId: null, npcIds: [], itemIds: [] }),
    ).toThrow('Scene name is required.');
  });
});
