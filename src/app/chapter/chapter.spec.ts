import { createEmptyRichTextDocument } from '../shared/rich-text-editor/rich-text-document';
import { createChapter, updateChapter } from './chapter';

describe('chapter', () => {
  it('normalizes editable metadata while preserving rich content', () => {
    const content = createEmptyRichTextDocument();
    const chapter = createChapter(
      'campaign-id',
      2,
      { title: '  Le port  ', summary: '  Arrivée  ', content },
      {
        createId: () => 'chapter-id',
        now: () => new Date('2026-08-13T08:00:00.000Z'),
      },
    );

    expect(chapter).toMatchObject({
      id: 'chapter-id',
      campaignId: 'campaign-id',
      title: 'Le port',
      summary: 'Arrivée',
      content,
      position: 2,
    });

    expect(
      updateChapter(
        chapter,
        { title: '  La jungle ', summary: '', content },
        () => new Date('2026-08-13T09:00:00.000Z'),
      ),
    ).toMatchObject({ title: 'La jungle', updatedAt: '2026-08-13T09:00:00.000Z' });
  });
});
