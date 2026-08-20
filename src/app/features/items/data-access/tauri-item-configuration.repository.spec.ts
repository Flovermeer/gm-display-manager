import Database from '@tauri-apps/plugin-sql';

import { TauriItemConfigurationRepository } from '@app/features/items/data-access/tauri-item-configuration.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriItemConfigurationRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('lists values directly from the selected universe', async () => {
    database.select.mockResolvedValue([
      {
        id: 'type-id',
        universe_id: 'universe-id',
        name: 'Document',
        created_at: '2026-08-20T00:00:00.000Z',
        updated_at: '2026-08-20T00:00:00.000Z',
      },
    ]);
    const repository = new TauriItemConfigurationRepository();

    await expect(repository.list('universe-id', 'type')).resolves.toEqual([
      expect.objectContaining({ id: 'type-id', universeId: 'universe-id', kind: 'type' }),
    ]);
    expect(database.select).toHaveBeenCalledWith(
      expect.stringContaining('config.universe_id = $1'),
      ['universe-id'],
    );
  });

  it('saves a value with its universe identifier', async () => {
    const repository = new TauriItemConfigurationRepository();

    await repository.save({
      id: 'type-id',
      universeId: 'universe-id',
      kind: 'type',
      name: 'Document',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    });

    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('VALUES ($1, $2'), [
      'type-id',
      'universe-id',
      'Document',
      '2026-08-20T00:00:00.000Z',
      '2026-08-20T00:00:00.000Z',
    ]);
  });
});
