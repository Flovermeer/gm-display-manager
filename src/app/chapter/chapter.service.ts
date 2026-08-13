import { inject, Injectable } from '@angular/core';

import { createChapter, updateChapter, type Chapter, type UpdateChapterInput } from '@app/chapter/chapter';
import { ChapterRepository } from '@app/chapter/chapter.repository';

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

  async move(chapter: Chapter, direction: -1 | 1): Promise<Chapter> {
    const chapters = await this.repository.listByCampaign(chapter.campaignId);
    const currentIndex = chapters.findIndex((candidate) => candidate.id === chapter.id);
    const neighbour = chapters[currentIndex + direction];
    if (currentIndex < 0 || !neighbour) return chapter;

    const updatedAt = new Date().toISOString();
    const movedChapter = { ...chapter, position: neighbour.position, updatedAt };
    const movedNeighbour = { ...neighbour, position: chapter.position, updatedAt };
    await this.repository.updateOrder([movedChapter, movedNeighbour]);
    return movedChapter;
  }

  delete(chapter: Chapter): Promise<void> {
    return this.repository.delete(chapter.campaignId, chapter.id);
  }
}
