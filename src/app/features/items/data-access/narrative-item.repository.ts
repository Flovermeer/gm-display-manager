/**
 * But
 * Définit le port de persistance des objets narratifs.
 *
 * Responsabilités
 * - expose le CRUD et les recherches nécessaires aux validations ;
 */

import type { NarrativeItem } from '@app/features/items/domain/narrative-item';

export abstract class NarrativeItemRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly NarrativeItem[]>;
  abstract findById(campaignId: string, id: string): Promise<NarrativeItem | null>;
  abstract save(item: NarrativeItem): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
  abstract countUsingConfiguration(
    campaignId: string,
    kind: 'type' | 'rarity',
    id: string,
  ): Promise<number>;
}
