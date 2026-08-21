/**
 * But
 * Définit le port de persistance des scènes.
 *
 * Responsabilités
 * - expose le CRUD attendu par SceneService ;
 * - isole les relations SQLite du domaine ;
 */

import type { Scene } from '@app/features/scenes/domain/scene';

export type SceneOrder = Pick<Scene, 'id' | 'campaignId' | 'chapterId' | 'position' | 'updatedAt'>;

export abstract class SceneRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Scene[]>;
  abstract listByChapter(campaignId: string, chapterId: string): Promise<readonly Scene[]>;
  abstract findById(campaignId: string, id: string): Promise<Scene | null>;
  abstract save(scene: Scene): Promise<void>;
  abstract updateOrder(scenes: readonly SceneOrder[]): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
