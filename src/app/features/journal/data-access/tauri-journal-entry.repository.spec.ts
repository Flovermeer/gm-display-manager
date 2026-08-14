import Database from '@tauri-apps/plugin-sql';

import type { JournalEntry } from '@app/features/journal/domain/journal-entry';
import { TauriJournalEntryRepository } from '@app/features/journal/data-access/tauri-journal-entry.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriJournalEntryRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue(undefined);
  });

  it('loads notes linked to a monster', async () => {
    database.select.mockResolvedValue([monsterEntryRow]);
    const repository = new TauriJournalEntryRepository();

    await expect(
      repository.listByTarget('campaign-id', {
        resourceType: 'monster',
        resourceId: 'monster-id',
      }),
    ).resolves.toEqual([monsterEntry]);
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('monster_id = $2'), [
      'campaign-id',
      'monster-id',
    ]);
  });

  it('persists the monster target without setting another resource column', async () => {
    const repository = new TauriJournalEntryRepository();

    await repository.save(monsterEntry);

    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('monster_id'), [
      'entry-id',
      'campaign-id',
      null,
      null,
      null,
      null,
      null,
      'monster-id',
      monsterEntry.sessionAt,
      '',
      'Combat final',
      JSON.stringify(monsterEntry.content.content),
      1,
      monsterEntry.createdAt,
      monsterEntry.updatedAt,
    ]);
  });
});

const monsterEntry: JournalEntry = {
  id: 'entry-id',
  campaignId: 'campaign-id',
  target: { resourceType: 'monster', resourceId: 'monster-id' },
  sessionAt: '2026-08-14T18:30:00.000Z',
  inGameDate: '',
  title: 'Combat final',
  content: {
    schemaVersion: 1,
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'L’Atropal apparaît.' }] }],
    },
  },
  createdAt: '2026-08-14T18:30:00.000Z',
  updatedAt: '2026-08-14T18:30:00.000Z',
};

const monsterEntryRow = {
  id: monsterEntry.id,
  campaign_id: monsterEntry.campaignId,
  npc_id: null,
  location_id: null,
  player_character_id: null,
  item_id: null,
  scene_id: null,
  monster_id: 'monster-id',
  session_at: monsterEntry.sessionAt,
  in_game_date: monsterEntry.inGameDate,
  title: monsterEntry.title,
  content_json: JSON.stringify(monsterEntry.content.content),
  content_schema_version: 1,
  created_at: monsterEntry.createdAt,
  updated_at: monsterEntry.updatedAt,
};
