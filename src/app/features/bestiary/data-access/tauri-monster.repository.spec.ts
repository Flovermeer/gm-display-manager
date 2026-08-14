import Database from '@tauri-apps/plugin-sql';

import { createEmptyMonsterSheet, type Monster } from '@app/features/bestiary/domain/monster';
import { TauriMonsterRepository } from '@app/features/bestiary/data-access/tauri-monster.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriMonsterRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('loads the campaign selection from the shared catalog', async () => {
    database.select.mockResolvedValue([monsterRow]);
    const repository = new TauriMonsterRepository();

    await expect(repository.listByCampaign('campaign-id')).resolves.toEqual([monster]);
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('campaign_monster'), [
      'campaign-id',
    ]);
  });

  it('persists the canonical sheet then associates it with the campaign', async () => {
    const repository = new TauriMonsterRepository();

    await repository.save(monster);

    expect(database.execute).toHaveBeenNthCalledWith(1, expect.stringContaining('monster('), [
      'monster-id',
      'campaign-id',
      'Atropal',
      'universes/forgotten-realms/media/monsters/atropal.webp',
      JSON.stringify(monster.sheet),
      1,
      monster.createdAt,
      monster.updatedAt,
    ]);
    expect(database.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('campaign_monster'),
      ['campaign-id', 'monster-id'],
    );
  });

  it('removes only the campaign association', async () => {
    const repository = new TauriMonsterRepository();

    await repository.detach('campaign-id', 'monster-id');

    expect(database.execute).toHaveBeenCalledWith(
      'DELETE FROM campaign_monster WHERE campaign_id=$1 AND monster_id=$2',
      ['campaign-id', 'monster-id'],
    );
  });
});

const monster: Monster = {
  id: 'monster-id',
  campaignId: 'campaign-id',
  name: 'Atropal',
  imagePath: 'universes/forgotten-realms/media/monsters/atropal.webp',
  sheet: { ...createEmptyMonsterSheet(), hitPoints: 225 },
  sheetSchemaVersion: 1,
  createdAt: '2026-08-14T12:00:00.000Z',
  updatedAt: '2026-08-14T12:00:00.000Z',
};

const monsterRow = {
  id: 'monster-id',
  campaign_id: 'campaign-id',
  name: 'Atropal',
  image_path: 'universes/forgotten-realms/media/monsters/atropal.webp',
  sheet_json: JSON.stringify(monster.sheet),
  sheet_schema_version: 1,
  created_at: monster.createdAt,
  updated_at: monster.updatedAt,
};
