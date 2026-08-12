import Database from '@tauri-apps/plugin-sql';

import type { Npc } from '../npc/npc';
import { TauriNpcRepository } from './tauri-npc.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: { load: vi.fn() },
}));

describe('TauriNpcRepository', () => {
  const database = {
    select: vi.fn(),
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue(undefined);
  });

  it('maps NPC rows for one campaign', async () => {
    database.select.mockResolvedValue([npcRow]);
    const repository = new TauriNpcRepository();

    await expect(repository.listByCampaign('campaign-id')).resolves.toEqual([npc]);
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('campaign_id = $1'), [
      'campaign-id',
    ]);
  });

  it('scopes lookup and deletion to the campaign', async () => {
    database.select.mockResolvedValue([]);
    const repository = new TauriNpcRepository();

    await expect(repository.findById('campaign-id', 'npc-id')).resolves.toBeNull();
    await repository.delete('campaign-id', 'npc-id');

    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('id = $2'), [
      'campaign-id',
      'npc-id',
    ]);
    expect(database.execute).toHaveBeenCalledWith(
      'DELETE FROM npc WHERE campaign_id = $1 AND id = $2',
      ['campaign-id', 'npc-id'],
    );
  });

  it('serializes the versioned system sheet when saving', async () => {
    const repository = new TauriNpcRepository();

    await repository.save(npc);

    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(id)'), [
      'npc-id',
      'campaign-id',
      'Syndra Silvane',
      'active',
      'Commanditaire',
      'Souffre de la malédiction.',
      '{"armorClass":12}',
      1,
      '2026-08-12T18:30:00.000Z',
      '2026-08-12T18:30:00.000Z',
    ]);
  });
});

const npc: Npc = {
  id: 'npc-id',
  campaignId: 'campaign-id',
  name: 'Syndra Silvane',
  status: 'active',
  summary: 'Commanditaire',
  notes: 'Souffre de la malédiction.',
  sheet: { armorClass: 12 },
  sheetSchemaVersion: 1,
  createdAt: '2026-08-12T18:30:00.000Z',
  updatedAt: '2026-08-12T18:30:00.000Z',
};

const npcRow = {
  id: 'npc-id',
  campaign_id: 'campaign-id',
  name: 'Syndra Silvane',
  status: 'active',
  summary: 'Commanditaire',
  notes: 'Souffre de la malédiction.',
  sheet_json: '{"armorClass":12}',
  sheet_schema_version: 1,
  created_at: '2026-08-12T18:30:00.000Z',
  updated_at: '2026-08-12T18:30:00.000Z',
};
