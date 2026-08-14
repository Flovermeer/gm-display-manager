import Database from '@tauri-apps/plugin-sql';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { TauriCampaignRepository } from '@app/features/campaigns/data-access/tauri-campaign.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: vi.fn(),
  },
}));

describe('TauriCampaignRepository', () => {
  const database = {
    select: vi.fn(),
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue(undefined);
  });

  it('maps and sorts campaigns returned by SQLite', async () => {
    database.select.mockResolvedValue([
      {
        id: 'campaign-id',
        name: 'Tomb of Annihilation',
        description: 'Exploration de Chult',
        universe_id: 'forgotten-realms',
        created_at: '2026-08-12T18:30:00.000Z',
        updated_at: '2026-08-12T18:30:00.000Z',
      },
    ]);
    const repository = new TauriCampaignRepository();

    await expect(repository.list()).resolves.toEqual([
      {
        id: 'campaign-id',
        name: 'Tomb of Annihilation',
        description: 'Exploration de Chult',
        universeId: 'forgotten-realms',
        createdAt: '2026-08-12T18:30:00.000Z',
        updatedAt: '2026-08-12T18:30:00.000Z',
      },
    ]);
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('ORDER BY name'));
  });

  it('returns null when a campaign does not exist', async () => {
    database.select.mockResolvedValue([]);
    const repository = new TauriCampaignRepository();

    await expect(repository.findById('missing-id')).resolves.toBeNull();
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [
      'missing-id',
    ]);
  });

  it('saves every campaign field using an upsert', async () => {
    const campaign: Campaign = {
      id: 'campaign-id',
      name: 'Tomb of Annihilation',
      description: 'Exploration de Chult',
      universeId: 'forgotten-realms',
      createdAt: '2026-08-12T18:30:00.000Z',
      updatedAt: '2026-08-12T18:30:00.000Z',
    };
    const repository = new TauriCampaignRepository();

    await repository.save(campaign);

    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(id)'), [
      campaign.id,
      campaign.name,
      campaign.description,
      campaign.universeId,
      campaign.createdAt,
      campaign.updatedAt,
    ]);
  });

  it('deletes a campaign by id', async () => {
    const repository = new TauriCampaignRepository();

    await repository.delete('campaign-id');

    expect(database.execute).toHaveBeenCalledWith('DELETE FROM campaign WHERE id = $1', [
      'campaign-id',
    ]);
  });
});
