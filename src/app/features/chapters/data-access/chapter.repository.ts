/**
 * But
 * Définit le port de persistance des chapitres.
 *
 * Responsabilités
 * - expose la lecture, l’écriture, la suppression et l’ordre ;
 * - garde SQLite hors de la couche application ;
 */

import type { Chapter } from '@app/features/chapters/domain/chapter';

export type ChapterOrder = Pick<Chapter, 'id' | 'campaignId' | 'position' | 'updatedAt'>;

export abstract class ChapterRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Chapter[]>;
  abstract findById(campaignId: string, id: string): Promise<Chapter | null>;
  abstract save(chapter: Chapter): Promise<void>;
  abstract updateOrder(chapters: readonly ChapterOrder[]): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
