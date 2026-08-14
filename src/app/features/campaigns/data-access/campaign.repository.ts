/**
 * But
 * Définit le port de persistance des campagnes.
 *
 * Responsabilités
 * - décrit les opérations attendues par la couche application ;
 * - ne dépend d’aucune technologie de stockage ;
 */

import type { Campaign } from '@app/features/campaigns/domain/campaign';

export abstract class CampaignRepository {
  abstract list(): Promise<readonly Campaign[]>;
  abstract findById(id: string): Promise<Campaign | null>;
  abstract save(campaign: Campaign): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
