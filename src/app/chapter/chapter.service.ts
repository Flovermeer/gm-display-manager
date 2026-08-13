import { inject, Injectable } from '@angular/core';

import { createChapter, updateChapter, type Chapter, type UpdateChapterInput } from './chapter';
import { ChapterRepository } from './chapter.repository';

@Injectable({ providedIn: 'root' })
export class ChapterService {
  private readonly repository = inject(ChapterRepository);

  list(campaignId: string): Promise<readonly Chapter[]> {
    return this.repository.listByCampaign(campaignId);
  }

  async create(campaignId: string, input: UpdateChapterInput): Promise<Chapter> {
    const chapters = await this.repository.listByCampaign(campaignId);
    const nextPosition = chapters.reduce(
      (position, chapter) => Math.max(position, chapter.position + 1),
      0,
    );
    const chapter = createChapter(campaignId, nextPosition, input);
    await this.repository.save(chapter);
    return chapter;
  }

  async update(chapter: Chapter, input: UpdateChapterInput): Promise<Chapter> {
    const updatedChapter = updateChapter(chapter, input);
    await this.repository.save(updatedChapter);
    return updatedChapter;
  }

  delete(chapter: Chapter): Promise<void> {
    return this.repository.delete(chapter.campaignId, chapter.id);
  }
}
