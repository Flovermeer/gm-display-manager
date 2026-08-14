/**
 * But
 * Définit le port de persistance des lieux.
 *
 * Responsabilités
 * - expose les opérations nécessaires au service ;
 * - isole le domaine de SQLite ;
 */

import type { Location } from '@app/features/locations/domain/location';

export abstract class LocationRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Location[]>;
  abstract findById(campaignId: string, id: string): Promise<Location | null>;
  abstract save(location: Location): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
