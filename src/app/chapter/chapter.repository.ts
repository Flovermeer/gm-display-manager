import type { Chapter } from '@app/chapter/chapter';

export type ChapterOrder = Pick<Chapter, 'id' | 'campaignId' | 'position' | 'updatedAt'>;

export abstract class ChapterRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Chapter[]>;
  abstract findById(campaignId: string, id: string): Promise<Chapter | null>;
  abstract save(chapter: Chapter): Promise<void>;
  abstract updateOrder(chapters: readonly ChapterOrder[]): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
