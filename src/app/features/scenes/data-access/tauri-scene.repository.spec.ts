import Database from '@tauri-apps/plugin-sql';

import type { Scene } from '@app/features/scenes/domain/scene';
import { TauriSceneRepository } from '@app/features/scenes/data-access/tauri-scene.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriSceneRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue(undefined);
  });

  it('loads relations and persists the aggregate', async () => {
    database.select
      .mockResolvedValueOnce([sceneRow])
      .mockResolvedValueOnce([{ scene_id: 'scene-id', resource_id: 'npc-id' }])
      .mockResolvedValueOnce([{ scene_id: 'scene-id', resource_id: 'monster-id' }])
      .mockResolvedValueOnce([{ scene_id: 'scene-id', resource_id: 'item-id' }]);
    const repository = new TauriSceneRepository();
    await expect(repository.listByCampaign('campaign-id')).resolves.toEqual([scene]);

    await repository.save(scene);
    expect(database.execute).toHaveBeenCalledWith(
      'INSERT INTO scene_monster (scene_id, monster_id) VALUES ($1, $2)',
      ['scene-id', 'monster-id'],
    );
    expect(database.execute).toHaveBeenCalledWith(
      'INSERT INTO scene_npc (scene_id, npc_id) VALUES ($1, $2)',
      ['scene-id', 'npc-id'],
    );
    expect(database.execute).toHaveBeenCalledWith(
      'INSERT INTO scene_item (scene_id, item_id) VALUES ($1, $2)',
      ['scene-id', 'item-id'],
    );
  });

  it('swaps two positions only inside their chapter', async () => {
    const repository = new TauriSceneRepository();
    await repository.updateOrder([
      { ...scene, position: 1 },
      { ...scene, id: 'second-scene', position: 0 },
    ]);

    expect(database.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE campaign_id = $1 AND chapter_id = $2'),
      expect.arrayContaining(['campaign-id', 'chapter-id', 'scene-id', 'second-scene']),
    );
  });
});

const scene: Scene = {
  id: 'scene-id',
  campaignId: 'campaign-id',
  chapterId: 'chapter-id',
  position: 0,
  name: 'Campement',
  summary: 'Repos nocturne',
  description: { schemaVersion: 1, content: { type: 'doc' } },
  locationId: 'location-id',
  npcIds: ['npc-id'],
  monsterIds: ['monster-id'],
  itemIds: ['item-id'],
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

const sceneRow = {
  id: 'scene-id',
  campaign_id: 'campaign-id',
  chapter_id: 'chapter-id',
  position: 0,
  name: 'Campement',
  summary: 'Repos nocturne',
  description_json: '{"type":"doc"}',
  description_schema_version: 1,
  location_id: 'location-id',
  created_at: '2026-08-13T12:00:00.000Z',
  updated_at: '2026-08-13T12:00:00.000Z',
};
