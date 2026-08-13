import type { Chapter } from './chapter';

export abstract class ChapterRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Chapter[]>;
  abstract findById(campaignId: string, id: string): Promise<Chapter | null>;
  abstract save(chapter: Chapter): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
