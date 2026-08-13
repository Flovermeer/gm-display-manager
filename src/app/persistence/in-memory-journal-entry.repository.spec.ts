import { createJournalEntry } from '@app/journal/journal-entry';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { InMemoryJournalEntryRepository } from '@app/persistence/in-memory-journal-entry.repository';

describe('InMemoryJournalEntryRepository', () => {
  it('lists target entries from newest to oldest', async () => {
    const repository = new InMemoryJournalEntryRepository();
    const target = { resourceType: 'location', resourceId: 'location-id' } as const;
    const input = {
      inGameDate: '',
      title: '',
      content: createEmptyRichTextDocument(),
    };
    const older = createJournalEntry(
      'campaign-id',
      target,
      { ...input, sessionAt: '2026-08-12T18:00:00.000Z' },
      { createId: () => 'older', now: () => new Date('2026-08-12T18:00:00.000Z') },
    );
    const newer = createJournalEntry(
      'campaign-id',
      target,
      { ...input, sessionAt: '2026-08-13T18:00:00.000Z' },
      { createId: () => 'newer', now: () => new Date('2026-08-13T18:00:00.000Z') },
    );
    await repository.save(older);
    await repository.save(newer);

    expect((await repository.listByTarget('campaign-id', target)).map(({ id }) => id)).toEqual([
      'newer',
      'older',
    ]);
  });
});
