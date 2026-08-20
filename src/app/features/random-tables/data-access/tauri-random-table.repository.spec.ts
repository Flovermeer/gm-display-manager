import Database from '@tauri-apps/plugin-sql';

import { TauriRandomTableRepository } from '@app/features/random-tables/data-access/tauri-random-table.repository';
import type { RandomTable } from '@app/features/random-tables/domain/random-table';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriRandomTableRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('maps the versioned entry JSON', async () => {
    database.select.mockResolvedValue([
      {
        id: table.id,
        campaign_id: table.campaignId,
        name: table.name,
        description: table.description,
        entries_json: JSON.stringify(table.entries),
        entry_schema_version: 1,
        created_at: table.createdAt,
        updated_at: table.updatedAt,
      },
    ]);

    await expect(new TauriRandomTableRepository().listByCampaign('campaign-id')).resolves.toEqual([
      table,
    ]);
  });

  it('saves the table and all entries in one statement', async () => {
    await new TauriRandomTableRepository().save(table);

    expect(database.execute).toHaveBeenCalledOnce();
    expect(database.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO random_table'),
      expect.arrayContaining([JSON.stringify(table.entries), 1]),
    );
  });
});

const table: RandomTable = {
  id: 'table-id',
  campaignId: 'campaign-id',
  name: 'Rencontres',
  description: 'Sur la route',
  entries: [{ id: 'entry-id', minimum: 1, maximum: 3, resultText: 'Marchands' }],
  createdAt: '2026-08-20T12:00:00.000Z',
  updatedAt: '2026-08-20T12:00:00.000Z',
};
