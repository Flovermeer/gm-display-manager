import { createEmptyRichTextDocument } from '../shared/rich-text-editor/rich-text-document';
import { createJournalEntry, updateJournalEntry } from './journal-entry';

describe('JournalEntry', () => {
  const dependencies = {
    createId: () => 'entry-id',
    now: () => new Date('2026-08-13T10:15:30.000Z'),
  };

  it('creates a resource entry with normalized editable metadata', () => {
    const entry = createJournalEntry(
      'campaign-id',
      { resourceType: 'npc', resourceId: 'npc-id' },
      {
        sessionAt: '2026-08-12T19:30:00.000Z',
        inGameDate: '  12 Ches  ',
        title: '  Rencontre  ',
        content: createEmptyRichTextDocument(),
      },
      dependencies,
    );

    expect(entry).toMatchObject({
      id: 'entry-id',
      campaignId: 'campaign-id',
      target: { resourceType: 'npc', resourceId: 'npc-id' },
      inGameDate: '12 Ches',
      title: 'Rencontre',
      createdAt: '2026-08-13T10:15:30.000Z',
      updatedAt: '2026-08-13T10:15:30.000Z',
    });
  });

  it('updates the same entry without changing its identity or target', () => {
    const entry = createJournalEntry(
      'campaign-id',
      null,
      {
        sessionAt: '2026-08-12T19:30:00.000Z',
        inGameDate: '',
        title: '',
        content: createEmptyRichTextDocument(),
      },
      dependencies,
    );

    const updated = updateJournalEntry(
      entry,
      { ...entry, title: 'Après la partie' },
      () => new Date('2026-08-14T08:00:00.000Z'),
    );

    expect(updated.id).toBe(entry.id);
    expect(updated.target).toBeNull();
    expect(updated.title).toBe('Après la partie');
    expect(updated.updatedAt).toBe('2026-08-14T08:00:00.000Z');
  });
});
