import Database from '@tauri-apps/plugin-sql';

import type { Location } from '@app/features/locations/domain/location';
import { TauriLocationRepository } from '@app/features/locations/data-access/tauri-location.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: { load: vi.fn() },
}));

describe('TauriLocationRepository', () => {
  const database = {
    select: vi.fn(),
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('maps location rows for one campaign', async () => {
    database.select.mockResolvedValue([locationRow]);
    const repository = new TauriLocationRepository();

    await expect(repository.listByCampaign('campaign-id')).resolves.toEqual([location]);
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('campaign_id=$1'), [
      'campaign-id',
    ]);
  });

  it('scopes lookup and soft deletion to the campaign', async () => {
    database.select.mockResolvedValue([]);
    const repository = new TauriLocationRepository();

    await expect(repository.findById('campaign-id', 'location-id')).resolves.toBeNull();
    await repository.delete('campaign-id', 'location-id');

    expect(database.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE location SET deleted_at='),
      ['campaign-id', 'location-id'],
    );
  });

  it('persists hierarchy and illustration metadata', async () => {
    const repository = new TauriLocationRepository();

    await repository.save(location);

    expect(database.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('ON CONFLICT(id)'),
      [
        'location-id',
        'campaign-id',
        'parent-id',
        "Beholder's Inn",
        'Auberge de Port Nyanzaru',
        'campaigns/campaign-id/media/locations/inn.webp',
        '2026-08-12T18:30:00.000Z',
        '2026-08-12T18:30:00.000Z',
      ],
    );
    expect(database.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('campaign_location'),
      ['campaign-id', 'location-id', '2026-08-12T18:30:00.000Z'],
    );
  });
});

const location: Location = {
  id: 'location-id',
  campaignId: 'campaign-id',
  provenance: 'campaign',
  parentLocationId: 'parent-id',
  name: "Beholder's Inn",
  summary: 'Auberge de Port Nyanzaru',
  notes: 'Repère animé.',
  imagePath: 'campaigns/campaign-id/media/locations/inn.webp',
  createdAt: '2026-08-12T18:30:00.000Z',
  updatedAt: '2026-08-12T18:30:00.000Z',
};

const locationRow = {
  id: 'location-id',
  campaign_id: 'campaign-id',
  parent_location_id: 'parent-id',
  name: "Beholder's Inn",
  summary: 'Auberge de Port Nyanzaru',
  notes: 'Repère animé.',
  image_path: 'campaigns/campaign-id/media/locations/inn.webp',
  created_at: '2026-08-12T18:30:00.000Z',
  updated_at: '2026-08-12T18:30:00.000Z',
  source_campaign_id: 'campaign-id',
  override_snapshot: null,
};
