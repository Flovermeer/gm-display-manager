import type { Chapter } from '../chapter/chapter';
import { ChapterRepository, type ChapterOrder } from '../chapter/chapter.repository';

export class InMemoryChapterRepository extends ChapterRepository {
  private readonly chapters = new Map<string, Chapter>();

  override listByCampaign(campaignId: string): Promise<readonly Chapter[]> {
    return Promise.resolve(
      [...this.chapters.values()]
        .filter((chapter) => chapter.campaignId === campaignId)
        .sort(
          (left, right) =>
            left.position - right.position ||
            left.title.localeCompare(right.title) ||
            left.id.localeCompare(right.id),
        ),
    );
  }

  override findById(campaignId: string, id: string): Promise<Chapter | null> {
    const chapter = this.chapters.get(id);
    return Promise.resolve(chapter?.campaignId === campaignId ? chapter : null);
  }

  override save(chapter: Chapter): Promise<void> {
    this.chapters.set(chapter.id, chapter);
    return Promise.resolve();
  }

  override updateOrder(chapters: readonly ChapterOrder[]): Promise<void> {
    for (const chapter of chapters) {
      const current = this.chapters.get(chapter.id);
      if (current?.campaignId === chapter.campaignId) {
        this.chapters.set(chapter.id, {
          ...current,
          position: chapter.position,
          updatedAt: chapter.updatedAt,
        });
      }
    }
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const chapter = this.chapters.get(id);
    if (chapter?.campaignId === campaignId) this.chapters.delete(id);
    return Promise.resolve();
  }
}
