/**
 * But
 * Définit le port de persistance de l'historique récent d'une campagne.
 *
 * Responsabilités
 * - conserve l'ordre de consultation des ressources ;
 * - supprime les références devenues invalides.
 */

import type {
  RecentResource,
  RecentResourceType,
} from '@app/features/recent-resources/domain/recent-resource';

export abstract class RecentResourceRepository {
  abstract list(campaignId: string): Promise<readonly RecentResource[]>;
  abstract save(resource: RecentResource): Promise<void>;
  abstract remove(
    campaignId: string,
    resourceType: RecentResourceType,
    resourceId: string,
  ): Promise<void>;
}
