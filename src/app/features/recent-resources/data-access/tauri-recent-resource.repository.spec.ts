import Database from '@tauri-apps/plugin-sql';

import { TauriRecentResourceRepository } from '@app/features/recent-resources/data-access/tauri-recent-resource.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriRecentResourceRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('maps recent resources ordered by the persisted visit order', async () => {
    database.select.mockResolvedValue([
      {
        campaign_id: 'campaign-id',
        resource_type: 'location',
        resource_id: 'location-id',
        display_name: 'Port Nyanzaru',
        viewed_order: 12,
      },
    ]);

    await expect(new TauriRecentResourceRepository().list('campaign-id')).resolves.toEqual([
      {
        campaignId: 'campaign-id',
        resourceType: 'location',
        resourceId: 'location-id',
        displayName: 'Port Nyanzaru',
        viewedOrder: 12,
      },
    ]);
    expect(database.select).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY viewed_order DESC'),
      ['campaign-id'],
    );
  });

  it('upserts a consultation by campaign, type and resource', async () => {
    await new TauriRecentResourceRepository().save({
      campaignId: 'campaign-id',
      resourceType: 'npc',
      resourceId: 'npc-id',
      displayName: 'Syndra',
      viewedOrder: 4,
    });

    expect(database.execute).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(campaign_id, resource_type, resource_id)'),
      ['campaign-id', 'npc', 'npc-id', 'Syndra', 4],
    );
  });
});
