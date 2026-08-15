import Database from '@tauri-apps/plugin-sql';

import { TauriUniverseResourceRepository } from '@app/features/game-systems/data-access/tauri-universe-resource.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriUniverseResourceRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('lists canonical resources with their campaign usage', async () => {
    database.select.mockResolvedValue([
      {
        id: 'npc-id',
        universe_id: 'forgotten-realms',
        name: 'Syndra Silvane',
        summary: 'Humanoïde',
        campaign_count: 2,
        deleted_at: null,
      },
    ]);
    const repository = new TauriUniverseResourceRepository();

    await expect(repository.list('forgotten-realms', 'npc')).resolves.toEqual([
      {
        id: 'npc-id',
        universeId: 'forgotten-realms',
        type: 'npc',
        name: 'Syndra Silvane',
        summary: 'Humanoïde',
        campaignCount: 2,
        deletedAt: null,
      },
    ]);
    expect(database.select).toHaveBeenCalledWith(
      expect.stringContaining('resource.source_campaign_id IS NULL'),
      ['forgotten-realms'],
    );
  });

  it('moves only canonical resources from the requested universe to trash', async () => {
    const repository = new TauriUniverseResourceRepository();

    await repository.trash('forgotten-realms', 'monster', 'monster-id');

    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE monster'), [
      'forgotten-realms',
      'monster-id',
    ]);
  });
});
