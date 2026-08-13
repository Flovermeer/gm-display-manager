import Database from '@tauri-apps/plugin-sql';

import type { Chapter } from '@app/chapter/chapter';
import { RICH_TEXT_SCHEMA_VERSION } from '@app/shared/rich-text-editor/rich-text-document';
import { TauriChapterRepository } from '@app/persistence/tauri-chapter.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriChapterRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue(undefined);
  });

  it('maps rich chapter content and keeps campaign queries scoped', async () => {
    database.select.mockResolvedValue([chapterRow]);
    const repository = new TauriChapterRepository();

    await expect(repository.listByCampaign('campaign-id')).resolves.toEqual([chapter]);
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('ORDER BY position'), [
      'campaign-id',
    ]);
  });

  it('persists JSON content and its schema version', async () => {
    const repository = new TauriChapterRepository();
    await repository.save(chapter);

    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(id)'), [
      'chapter-id',
      'campaign-id',
      'Le port',
      'Arrivée à Chult',
      JSON.stringify(chapter.content.content),
      1,
      0,
      '2026-08-13T08:00:00.000Z',
      '2026-08-13T08:00:00.000Z',
    ]);
  });

  it('swaps two positions in one scoped update', async () => {
    const repository = new TauriChapterRepository();
    await repository.updateOrder([
      { id: 'second-id', campaignId: 'campaign-id', position: 0, updatedAt: 'now' },
      { id: 'first-id', campaignId: 'campaign-id', position: 1, updatedAt: 'now' },
    ]);

    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('CASE id'), [
      'campaign-id',
      'second-id',
      0,
      'first-id',
      1,
      'now',
    ]);
  });
});

const chapter: Chapter = {
  id: 'chapter-id',
  campaignId: 'campaign-id',
  title: 'Le port',
  summary: 'Arrivée à Chult',
  content: {
    schemaVersion: RICH_TEXT_SCHEMA_VERSION,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  },
  position: 0,
  createdAt: '2026-08-13T08:00:00.000Z',
  updatedAt: '2026-08-13T08:00:00.000Z',
};

const chapterRow = {
  id: 'chapter-id',
  campaign_id: 'campaign-id',
  title: 'Le port',
  summary: 'Arrivée à Chult',
  content_json: JSON.stringify(chapter.content.content),
  content_schema_version: 1,
  position: 0,
  created_at: '2026-08-13T08:00:00.000Z',
  updated_at: '2026-08-13T08:00:00.000Z',
};
