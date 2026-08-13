import Database from '@tauri-apps/plugin-sql';

import { createEmptyNpcSheet, type Npc } from '@app/npc/npc';
import { TauriNpcRepository } from '@app/persistence/tauri-npc.repository';

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

  it('normalizes a legacy empty NPC sheet', async () => {
    database.select.mockResolvedValue([{ ...npcRow, sheet_json: '{}', sheet_schema_version: 1 }]);
    const repository = new TauriNpcRepository();

    await expect(repository.listByCampaign('campaign-id')).resolves.toMatchObject([
      {
        sheet: { armorClass: null, traits: [], actions: [] },
        sheetSchemaVersion: 1,
      },
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
      'campaigns/campaign-id/media/npc-portraits/portrait.webp',
      'campaigns/campaign-id/media/npc-idle-videos/portrait.webm',
      JSON.stringify(npc.sheet),
      3,
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
  portraitPath: 'campaigns/campaign-id/media/npc-portraits/portrait.webp',
  idleVideoPath: 'campaigns/campaign-id/media/npc-idle-videos/portrait.webm',
  sheet: { ...createEmptyNpcSheet(), armorClass: 12 },
  sheetSchemaVersion: 3,
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
  portrait_path: 'campaigns/campaign-id/media/npc-portraits/portrait.webp',
  idle_video_path: 'campaigns/campaign-id/media/npc-idle-videos/portrait.webm',
  sheet_json: JSON.stringify({ ...createEmptyNpcSheet(), armorClass: 12 }),
  sheet_schema_version: 3,
  created_at: '2026-08-12T18:30:00.000Z',
  updated_at: '2026-08-12T18:30:00.000Z',
};
