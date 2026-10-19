import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';

import type { Location } from '@app/features/locations/domain/location';
import { TauriLocationRepository } from '@app/features/locations/data-access/tauri-location.repository';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

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
    vi.mocked(invoke).mockResolvedValue(undefined);
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

    expect(invoke).toHaveBeenCalledWith('save_location_transaction', {
      input: {
        id: 'location-id',
        campaignId: 'campaign-id',
        parentLocationId: 'parent-id',
        name: "Beholder's Inn",
        summary: 'Auberge de Port Nyanzaru',
        descriptionJson: JSON.stringify(createEmptyRichTextDocument()),
        hideNameOnPlayerDisplay: false,
        imagePath: 'campaigns/campaign-id/media/locations/inn.webp',
        imagePaths: ['campaigns/campaign-id/media/locations/inn.webp'],
        createdAt: '2026-08-12T18:30:00.000Z',
        updatedAt: '2026-08-12T18:30:00.000Z',
        overrideSnapshotJson: null,
      },
    });
  });
});

const location: Location = {
  id: 'location-id',
  campaignId: 'campaign-id',
  provenance: 'campaign',
  parentLocationId: 'parent-id',
  name: "Beholder's Inn",
  summary: 'Auberge de Port Nyanzaru',
  description: createEmptyRichTextDocument(),
  notes: 'Repère animé.',
  hideNameOnPlayerDisplay: false,
  imagePaths: ['campaigns/campaign-id/media/locations/inn.webp'],
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
  description_json: JSON.stringify(createEmptyRichTextDocument()),
  notes: 'Repère animé.',
  hide_name_on_player_display: 0,
  image_path: 'campaigns/campaign-id/media/locations/inn.webp',
  image_paths_json: '["campaigns/campaign-id/media/locations/inn.webp"]',
  created_at: '2026-08-12T18:30:00.000Z',
  updated_at: '2026-08-12T18:30:00.000Z',
  source_campaign_id: 'campaign-id',
  override_snapshot: null,
};
