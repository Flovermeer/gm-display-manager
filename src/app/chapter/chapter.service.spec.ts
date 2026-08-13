import { TestBed } from '@angular/core/testing';

import { RICH_TEXT_SCHEMA_VERSION } from '@app/shared/rich-text-editor/rich-text-document';
import type { Chapter } from '@app/chapter/chapter';
import { ChapterRepository } from '@app/chapter/chapter.repository';
import { ChapterService } from '@app/chapter/chapter.service';

describe('ChapterService', () => {
  const chapters = [chapter('first-id', 0), chapter('second-id', 1), chapter('third-id', 2)];
  const repository = {
    listByCampaign: vi.fn(),
    findById: vi.fn(),
    save: vi.fn(),
    updateOrder: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.listByCampaign.mockResolvedValue(chapters);
    repository.updateOrder.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [ChapterService, { provide: ChapterRepository, useValue: repository }],
    });
  });

  it('swaps a chapter position with its neighbour', async () => {
    const service = TestBed.inject(ChapterService);

    const moved = await service.move(chapters[1]!, -1);

    expect(moved.position).toBe(0);
    expect(repository.updateOrder).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'second-id', position: 0 }),
      expect.objectContaining({ id: 'first-id', position: 1 }),
    ]);
  });

  it('does nothing when the chapter is already at the requested edge', async () => {
    const service = TestBed.inject(ChapterService);

    await expect(service.move(chapters[0]!, -1)).resolves.toBe(chapters[0]);
    expect(repository.updateOrder).not.toHaveBeenCalled();
  });
});

function chapter(id: string, position: number): Chapter {
  return {
    id,
    campaignId: 'campaign-id',
    title: id,
    summary: '',
    content: {
      schemaVersion: RICH_TEXT_SCHEMA_VERSION,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    position,
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
  };
}
